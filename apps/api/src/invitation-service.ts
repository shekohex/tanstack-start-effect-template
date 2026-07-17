import { OpaqueTokens, type AuthenticatedSession } from '@app/auth'
import {
  EventId,
  InvitationId,
  Membership,
  MembershipId,
  Organization,
  OrganizationAccess,
  OrganizationId,
  OrganizationInvitation,
  OrganizationMember,
  User,
  UserId,
} from '@app/domain'
import { canAccessOrganization, canInviteMember } from '@app/permissions'
import {
  EmailInvitationCreated,
  IdentityPersistenceFailed,
  InvitationAlreadyPending,
  InvitationEmailMismatch,
  InvitationUnavailable,
  OrganizationMembersResponse,
  PermissionDenied,
  type CreateEmailInvitation,
} from '@app/protocol'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { randomUUID } from 'node:crypto'

const ActorRow = Schema.Struct({
  organizationId: OrganizationId,
  role: Schema.Literals(['owner', 'admin', 'member']),
  status: Schema.Literals(['active', 'suspended', 'removed']),
  userId: UserId,
})
const InvitationRow = Schema.Struct({
  createdAt: Schema.String,
  email: Schema.String,
  expiresAt: Schema.String,
  id: InvitationId,
  organizationCreatedAt: Schema.String,
  organizationDisplayName: Schema.String,
  organizationId: OrganizationId,
  organizationSlug: Schema.String,
  role: Schema.Literals(['admin', 'member']),
})
const MemberRow = Schema.Struct({
  email: Schema.String,
  emailVerified: Schema.Boolean,
  membershipCreatedAt: Schema.String,
  membershipId: MembershipId,
  membershipRole: Schema.Literals(['owner', 'admin', 'member']),
  membershipStatus: Schema.Literals(['active', 'suspended', 'removed']),
  organizationId: OrganizationId,
  userCreatedAt: Schema.String,
  userDisplayName: Schema.String,
  userId: UserId,
})

const decodeActorRows = Schema.decodeUnknownEffect(Schema.Array(ActorRow))
const decodeInvitationRows = Schema.decodeUnknownEffect(Schema.Array(InvitationRow))
const decodeMemberRows = Schema.decodeUnknownEffect(Schema.Array(MemberRow))

const persistenceFailure = () =>
  IdentityPersistenceFailed.make({
    message: 'Application could not persist invitation state',
    retryable: true,
  })

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function toMember(row: typeof MemberRow.Type): OrganizationMember {
  return OrganizationMember.make({
    membership: Membership.make({
      createdAt: row.membershipCreatedAt,
      id: row.membershipId,
      organizationId: row.organizationId,
      role: row.membershipRole,
      status: row.membershipStatus,
      userId: row.userId,
    }),
    user: User.make({
      createdAt: row.userCreatedAt,
      displayName: row.userDisplayName,
      email: row.email,
      emailVerified: row.emailVerified,
      id: row.userId,
    }),
  })
}

export class InvitationService extends Context.Service<
  InvitationService,
  {
    readonly acceptEmail: (
      session: AuthenticatedSession,
      token: string,
    ) => Effect.Effect<
      OrganizationAccess,
      InvitationUnavailable | InvitationEmailMismatch | IdentityPersistenceFailed
    >
    readonly createEmail: (
      session: AuthenticatedSession,
      input: CreateEmailInvitation,
    ) => Effect.Effect<
      EmailInvitationCreated,
      PermissionDenied | InvitationAlreadyPending | IdentityPersistenceFailed
    >
    readonly listMembers: (
      session: AuthenticatedSession,
      organizationId: OrganizationId,
    ) => Effect.Effect<OrganizationMembersResponse, PermissionDenied | IdentityPersistenceFailed>
    readonly revoke: (
      session: AuthenticatedSession,
      organizationId: OrganizationId,
      invitationId: InvitationId,
    ) => Effect.Effect<
      OrganizationInvitation,
      PermissionDenied | InvitationUnavailable | IdentityPersistenceFailed
    >
  }
>()('@app/api/InvitationService') {
  static readonly layer = Layer.effect(
    InvitationService,
    Effect.gen(function* () {
      const opaqueTokens = yield* OpaqueTokens
      const sql = yield* SqlClient.SqlClient

      const actorFor = Effect.fn('InvitationService.actorFor')(function* (
        session: AuthenticatedSession,
        organizationId: OrganizationId,
      ) {
        const rows = yield* sql`
          SELECT organization_id AS "organizationId", role, status, user_id AS "userId"
          FROM memberships
          WHERE user_id = ${session.userId} AND organization_id = ${organizationId}
          LIMIT 1
        `
        const actors = yield* decodeActorRows(rows)
        const actor = actors[0]
        if (actor === undefined) {
          return yield* PermissionDenied.make({
            action: 'organization.read',
            message: 'Organization membership is required',
          })
        }
        return actor
      })

      const createEmail = Effect.fn('InvitationService.createEmail')(
        function* (session: AuthenticatedSession, input: CreateEmailInvitation) {
          const actor = yield* actorFor(session, input.organizationId)
          if (!canInviteMember(actor)) {
            return yield* PermissionDenied.make({
              action: 'invitation.create',
              message: 'Organization owner or admin authority is required',
            })
          }

          const email = normalizeEmail(input.email)
          const token = yield* opaqueTokens.create
          const invitationId = InvitationId.make(`inv_${randomUUID()}`)

          return yield* sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`
                UPDATE invitations SET revoked_at = now()
                WHERE organization_id = ${input.organizationId}
                  AND email = ${email}
                  AND accepted_at IS NULL
                  AND revoked_at IS NULL
                  AND expires_at <= now()
              `
              const rows = yield* sql`
                INSERT INTO invitations (
                  id, organization_id, email, role, token_hash, created_by_user_id, expires_at
                ) VALUES (
                  ${invitationId}, ${input.organizationId}, ${email}, ${input.role},
                  ${token.hash}, ${session.userId}, now() + interval '7 days'
                )
                ON CONFLICT DO NOTHING
                RETURNING created_at::text AS "createdAt", expires_at::text AS "expiresAt"
              `
              const created = yield* Schema.decodeUnknownEffect(
                Schema.Array(Schema.Struct({ createdAt: Schema.String, expiresAt: Schema.String })),
              )(rows)
              const invitation = created[0]
              if (invitation === undefined) {
                return yield* InvitationAlreadyPending.make({
                  email,
                  organizationId: input.organizationId,
                })
              }

              const metadata = JSON.stringify({ email, role: input.role })
              yield* sql`
                INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, metadata)
                VALUES (
                  ${`aud_${randomUUID()}`}, ${input.organizationId}, ${session.userId},
                  'invitation.created', 'invitation', ${invitationId}, ${metadata}::jsonb
                )
              `
              yield* sql`
                INSERT INTO domain_events (id, organization_id, type, actor_user_id, aggregate_type, aggregate_id, payload)
                VALUES (
                  ${EventId.make(`evt_${randomUUID()}`)}, ${input.organizationId},
                  'invitation.created', ${session.userId}, 'invitation', ${invitationId}, ${metadata}::jsonb
                )
              `

              return EmailInvitationCreated.make({
                invitation: OrganizationInvitation.make({
                  createdAt: invitation.createdAt,
                  email,
                  expiresAt: invitation.expiresAt,
                  id: invitationId,
                  organizationId: input.organizationId,
                  role: input.role,
                  status: 'pending',
                }),
                token: token.value,
              })
            }),
          )
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const revoke = Effect.fn('InvitationService.revoke')(
        function* (
          session: AuthenticatedSession,
          organizationId: OrganizationId,
          invitationId: InvitationId,
        ) {
          const actor = yield* actorFor(session, organizationId)
          if (!canInviteMember(actor)) {
            return yield* PermissionDenied.make({
              action: 'invitation.revoke',
              message: 'Organization owner or admin authority is required',
            })
          }

          return yield* sql.withTransaction(
            Effect.gen(function* () {
              const rows = yield* sql`
                UPDATE invitations SET revoked_at = now()
                WHERE id = ${invitationId}
                  AND organization_id = ${organizationId}
                  AND accepted_at IS NULL
                  AND revoked_at IS NULL
                RETURNING id, organization_id AS "organizationId", email, role,
                  created_at::text AS "createdAt", expires_at::text AS "expiresAt"
              `
              const invitations = yield* Schema.decodeUnknownEffect(
                Schema.Array(
                  Schema.Struct({
                    createdAt: Schema.String,
                    email: Schema.String,
                    expiresAt: Schema.String,
                    id: InvitationId,
                    organizationId: OrganizationId,
                    role: Schema.Literals(['admin', 'member']),
                  }),
                ),
              )(rows)
              const invitation = invitations[0]
              if (invitation === undefined) {
                return yield* InvitationUnavailable.make({
                  message: 'Invitation is unavailable or already used',
                })
              }

              const metadata = JSON.stringify({ email: invitation.email, role: invitation.role })
              yield* sql`
                INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, metadata)
                VALUES (
                  ${`aud_${randomUUID()}`}, ${organizationId}, ${session.userId},
                  'invitation.revoked', 'invitation', ${invitationId}, ${metadata}::jsonb
                )
              `
              yield* sql`
                INSERT INTO domain_events (id, organization_id, type, actor_user_id, aggregate_type, aggregate_id, payload)
                VALUES (
                  ${EventId.make(`evt_${randomUUID()}`)}, ${organizationId},
                  'invitation.revoked', ${session.userId}, 'invitation', ${invitationId}, ${metadata}::jsonb
                )
              `

              return OrganizationInvitation.make({
                ...invitation,
                status: 'revoked',
              })
            }),
          )
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const acceptEmail = Effect.fn('InvitationService.acceptEmail')(
        function* (session: AuthenticatedSession, token: string) {
          return yield* sql.withTransaction(
            Effect.gen(function* () {
              const rows = yield* sql`
                SELECT
                  invitation.id,
                  invitation.organization_id AS "organizationId",
                  invitation.email,
                  invitation.role,
                  invitation.created_at::text AS "createdAt",
                  invitation.expires_at::text AS "expiresAt",
                  organization.slug AS "organizationSlug",
                  organization.display_name AS "organizationDisplayName",
                  organization.created_at::text AS "organizationCreatedAt"
                FROM invitations AS invitation
                JOIN organizations AS organization ON organization.id = invitation.organization_id
                WHERE invitation.token_hash = ${opaqueTokens.digest(token)}
                  AND invitation.accepted_at IS NULL
                  AND invitation.revoked_at IS NULL
                  AND invitation.expires_at > now()
                  AND organization.deleted_at IS NULL
                FOR UPDATE
              `
              const invitations = yield* decodeInvitationRows(rows)
              const invitation = invitations[0]
              if (invitation === undefined) {
                return yield* InvitationUnavailable.make({
                  message: 'Invitation is invalid, expired, revoked, or already used',
                })
              }

              const userRows = yield* sql`
                SELECT email FROM users WHERE id = ${session.userId} LIMIT 1
              `
              const users = yield* Schema.decodeUnknownEffect(
                Schema.Array(Schema.Struct({ email: Schema.String })),
              )(userRows)
              const user = users[0]
              if (user === undefined) return yield* persistenceFailure()
              if (user.email !== invitation.email) {
                return yield* InvitationEmailMismatch.make({
                  message: 'Sign in with the email address that received this invitation',
                })
              }

              const membershipId = MembershipId.make(`mem_${randomUUID()}`)
              const membershipRows = yield* sql`
                INSERT INTO memberships (id, organization_id, user_id, role, status)
                VALUES (
                  ${membershipId}, ${invitation.organizationId}, ${session.userId},
                  ${invitation.role}, 'active'
                )
                ON CONFLICT DO NOTHING
                RETURNING created_at::text AS "createdAt"
              `
              const memberships = yield* Schema.decodeUnknownEffect(
                Schema.Array(Schema.Struct({ createdAt: Schema.String })),
              )(membershipRows)
              const membership = memberships[0]
              if (membership === undefined) {
                return yield* InvitationUnavailable.make({
                  message: 'This account is already an organization member',
                })
              }

              yield* sql`
                UPDATE invitations
                SET accepted_at = now(), accepted_by_user_id = ${session.userId}
                WHERE id = ${invitation.id}
              `
              const metadata = JSON.stringify({ role: invitation.role })
              yield* sql`
                INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, metadata)
                VALUES (
                  ${`aud_${randomUUID()}`}, ${invitation.organizationId}, ${session.userId},
                  'invitation.accepted', 'invitation', ${invitation.id}, ${metadata}::jsonb
                )
              `
              yield* sql`
                INSERT INTO domain_events (id, organization_id, type, actor_user_id, aggregate_type, aggregate_id, payload)
                VALUES (
                  ${EventId.make(`evt_${randomUUID()}`)}, ${invitation.organizationId},
                  'membership.created', ${session.userId}, 'membership', ${membershipId}, ${metadata}::jsonb
                )
              `

              return OrganizationAccess.make({
                membership: Membership.make({
                  createdAt: membership.createdAt,
                  id: membershipId,
                  organizationId: invitation.organizationId,
                  role: invitation.role,
                  status: 'active',
                  userId: session.userId,
                }),
                organization: Organization.make({
                  createdAt: invitation.organizationCreatedAt,
                  displayName: invitation.organizationDisplayName,
                  id: invitation.organizationId,
                  slug: invitation.organizationSlug,
                }),
              })
            }),
          )
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const listMembers = Effect.fn('InvitationService.listMembers')(
        function* (session: AuthenticatedSession, organizationId: OrganizationId) {
          const actor = yield* actorFor(session, organizationId)
          if (!canAccessOrganization(actor, organizationId)) {
            return yield* PermissionDenied.make({
              action: 'membership.list',
              message: 'Active organization membership is required',
            })
          }

          const rows = yield* sql`
            SELECT
              user_account.id AS "userId",
              user_account.email,
              user_account.display_name AS "userDisplayName",
              user_account.email_verified AS "emailVerified",
              user_account.created_at::text AS "userCreatedAt",
              membership.id AS "membershipId",
              membership.role AS "membershipRole",
              membership.status AS "membershipStatus",
              membership.created_at::text AS "membershipCreatedAt",
              membership.organization_id AS "organizationId"
            FROM memberships AS membership
            JOIN users AS user_account ON user_account.id = membership.user_id
            WHERE membership.organization_id = ${organizationId}
            ORDER BY user_account.display_name, user_account.id
          `
          const members = yield* decodeMemberRows(rows)
          return OrganizationMembersResponse.make({ members: members.map(toMember) })
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      return InvitationService.of({ acceptEmail, createEmail, listMembers, revoke })
    }),
  )
}
