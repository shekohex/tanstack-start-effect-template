import type { AuthenticatedSession } from '@app/auth'
import {
  EventId,
  Membership,
  MembershipId,
  OrganizationId,
  OrganizationMember,
  User,
  UserId,
  type OrganizationRole,
} from '@app/domain'
import {
  canChangeMembershipRole,
  canChangeMembershipStatus,
  canRemoveMembership,
  canTransferOwnership,
} from '@app/permissions'
import {
  IdentityPersistenceFailed,
  MembershipNotFound,
  OwnerInvariantViolation,
  PermissionDenied,
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
const decodeMemberRows = Schema.decodeUnknownEffect(Schema.Array(MemberRow))

const persistenceFailure = () =>
  IdentityPersistenceFailed.make({
    message: 'Application could not persist membership state',
    retryable: true,
  })

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

export class MembershipService extends Context.Service<
  MembershipService,
  {
    readonly changeRole: (
      session: AuthenticatedSession,
      organizationId: OrganizationId,
      membershipId: string,
      role: Exclude<OrganizationRole, 'owner'>,
    ) => Effect.Effect<
      OrganizationMember,
      PermissionDenied | MembershipNotFound | OwnerInvariantViolation | IdentityPersistenceFailed
    >
    readonly changeStatus: (
      session: AuthenticatedSession,
      organizationId: OrganizationId,
      membershipId: string,
      status: 'active' | 'suspended',
    ) => Effect.Effect<
      OrganizationMember,
      PermissionDenied | MembershipNotFound | OwnerInvariantViolation | IdentityPersistenceFailed
    >
    readonly remove: (
      session: AuthenticatedSession,
      organizationId: OrganizationId,
      membershipId: string,
    ) => Effect.Effect<
      OrganizationMember,
      PermissionDenied | MembershipNotFound | OwnerInvariantViolation | IdentityPersistenceFailed
    >
    readonly transferOwnership: (
      session: AuthenticatedSession,
      organizationId: OrganizationId,
      membershipId: string,
    ) => Effect.Effect<
      OrganizationMember,
      PermissionDenied | MembershipNotFound | OwnerInvariantViolation | IdentityPersistenceFailed
    >
  }
>()('@app/api/MembershipService') {
  static readonly layer = Layer.effect(
    MembershipService,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const actorFor = Effect.fn('MembershipService.actorFor')(function* (
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
            action: 'membership.manage',
            message: 'Organization membership is required',
          })
        }
        return actor
      })

      const memberFor = Effect.fn('MembershipService.memberFor')(function* (
        organizationId: OrganizationId,
        membershipId: string,
      ) {
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
          WHERE membership.organization_id = ${organizationId} AND membership.id = ${membershipId}
          LIMIT 1
        `
        const members = yield* decodeMemberRows(rows)
        const member = members[0]
        if (member === undefined) return yield* MembershipNotFound.make({ membershipId })
        return member
      })

      const recordMutation = Effect.fn('MembershipService.recordMutation')(function* (
        session: AuthenticatedSession,
        organizationId: OrganizationId,
        actorUserId: UserId,
        type: string,
        membershipId: string,
        metadata: string,
      ) {
        yield* sql`
          INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, metadata)
          VALUES (
            ${`aud_${randomUUID()}`}, ${organizationId}, ${actorUserId}, ${type},
            'membership', ${membershipId}, ${metadata}::jsonb
          )
        `
        yield* sql`
          INSERT INTO domain_events (id, organization_id, type, actor_user_id, aggregate_type, aggregate_id, payload)
          VALUES (
            ${EventId.make(`evt_${randomUUID()}`)}, ${organizationId}, ${type}, ${actorUserId},
            'membership', ${membershipId}, ${metadata}::jsonb
          )
        `
        yield* Effect.annotateCurrentSpan({ sessionId: session.sessionId })
      })

      const changeRole = Effect.fn('MembershipService.changeRole')(
        function* (
          session: AuthenticatedSession,
          organizationId: OrganizationId,
          membershipId: string,
          role: Exclude<OrganizationRole, 'owner'>,
        ) {
          const actor = yield* actorFor(session, organizationId)
          const target = yield* memberFor(organizationId, membershipId)
          if (target.membershipRole === 'owner') {
            return yield* OwnerInvariantViolation.make({
              message: 'Ownership must be transferred through the ownership flow',
            })
          }
          if (
            !canChangeMembershipRole(
              actor,
              {
                organizationId: target.organizationId,
                role: target.membershipRole,
                status: target.membershipStatus,
                userId: target.userId,
              },
              role,
            )
          ) {
            return yield* PermissionDenied.make({
              action: 'membership.changeRole',
              message: 'You cannot change this membership role',
            })
          }

          yield* sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`
                UPDATE memberships SET role = ${role}, updated_at = now()
                WHERE id = ${membershipId} AND organization_id = ${organizationId}
              `
              yield* recordMutation(
                session,
                organizationId,
                actor.userId,
                'membership.role_changed',
                membershipId,
                JSON.stringify({ from: target.membershipRole, to: role }),
              )
            }),
          )
          return toMember({ ...target, membershipRole: role })
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const changeStatus = Effect.fn('MembershipService.changeStatus')(
        function* (
          session: AuthenticatedSession,
          organizationId: OrganizationId,
          membershipId: string,
          status: 'active' | 'suspended',
        ) {
          const actor = yield* actorFor(session, organizationId)
          const target = yield* memberFor(organizationId, membershipId)
          if (
            !canChangeMembershipStatus(
              actor,
              {
                organizationId: target.organizationId,
                role: target.membershipRole,
                status: target.membershipStatus,
                userId: target.userId,
              },
              status,
            )
          ) {
            return yield* PermissionDenied.make({
              action: 'membership.changeStatus',
              message: 'You cannot change this membership status',
            })
          }
          yield* sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`
                UPDATE memberships SET status = ${status}, updated_at = now()
                WHERE id = ${membershipId} AND organization_id = ${organizationId}
              `
              yield* recordMutation(
                session,
                organizationId,
                actor.userId,
                'membership.status_changed',
                membershipId,
                JSON.stringify({ from: target.membershipStatus, to: status }),
              )
            }),
          )
          return toMember({ ...target, membershipStatus: status })
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const remove = Effect.fn('MembershipService.remove')(
        function* (
          session: AuthenticatedSession,
          organizationId: OrganizationId,
          membershipId: string,
        ) {
          const actor = yield* actorFor(session, organizationId)
          const target = yield* memberFor(organizationId, membershipId)
          if (target.membershipRole === 'owner') {
            return yield* OwnerInvariantViolation.make({
              message: 'An organization owner must transfer ownership before removal',
            })
          }
          if (
            !canRemoveMembership(actor, {
              organizationId: target.organizationId,
              role: target.membershipRole,
              status: target.membershipStatus,
              userId: target.userId,
            })
          ) {
            return yield* PermissionDenied.make({
              action: 'membership.remove',
              message: 'You cannot remove this organization member',
            })
          }
          yield* sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`
                UPDATE memberships
                SET status = 'removed', removed_at = now(), updated_at = now()
                WHERE id = ${membershipId} AND organization_id = ${organizationId}
              `
              yield* recordMutation(
                session,
                organizationId,
                actor.userId,
                'membership.removed',
                membershipId,
                JSON.stringify({ previousRole: target.membershipRole }),
              )
            }),
          )
          return toMember({ ...target, membershipStatus: 'removed' })
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const transferOwnership = Effect.fn('MembershipService.transferOwnership')(
        function* (
          session: AuthenticatedSession,
          organizationId: OrganizationId,
          membershipId: string,
        ) {
          return yield* sql.withTransaction(
            Effect.gen(function* () {
              yield* sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`
              const actor = yield* actorFor(session, organizationId)
              const target = yield* memberFor(organizationId, membershipId)
              if (
                !canTransferOwnership(actor, {
                  organizationId: target.organizationId,
                  role: target.membershipRole,
                  status: target.membershipStatus,
                  userId: target.userId,
                })
              ) {
                return yield* PermissionDenied.make({
                  action: 'organization.transferOwnership',
                  message: 'Ownership can only transfer to another active member',
                })
              }

              yield* sql`
                UPDATE memberships SET role = 'owner', updated_at = now()
                WHERE id = ${membershipId} AND organization_id = ${organizationId}
              `
              yield* sql`
                UPDATE memberships SET role = 'admin', updated_at = now()
                WHERE organization_id = ${organizationId} AND user_id = ${actor.userId} AND role = 'owner'
              `
              yield* recordMutation(
                session,
                organizationId,
                actor.userId,
                'organization.ownership_transferred',
                membershipId,
                JSON.stringify({ fromUserId: actor.userId, toUserId: target.userId }),
              )
              return toMember({ ...target, membershipRole: 'owner' })
            }),
          )
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      return MembershipService.of({ changeRole, changeStatus, remove, transferOwnership })
    }),
  )
}
