import type { AuthenticatedSession } from '@app/auth'
import {
  EventId,
  Membership,
  MembershipId,
  Organization,
  OrganizationAccess,
  OrganizationId,
  UserId,
} from '@app/domain'
import { canUpdateOrganization } from '@app/permissions'
import {
  CreateOrganization,
  IdentityPersistenceFailed,
  InvalidIdentityInput,
  OrganizationListResponse,
  OrganizationSlugUnavailable,
  PermissionDenied,
  UpdateOrganization,
} from '@app/protocol'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { randomUUID } from 'node:crypto'

const OrganizationAccessRow = Schema.Struct({
  membershipCreatedAt: Schema.String,
  membershipId: MembershipId,
  membershipRole: Schema.Literals(['owner', 'admin', 'member']),
  membershipStatus: Schema.Literals(['active', 'suspended', 'removed']),
  organizationCreatedAt: Schema.String,
  organizationDisplayName: Schema.String,
  organizationId: OrganizationId,
  organizationSlug: Schema.String,
  userId: UserId,
})

const ActorRow = Schema.Struct({
  organizationId: OrganizationId,
  role: Schema.Literals(['owner', 'admin', 'member']),
  status: Schema.Literals(['active', 'suspended', 'removed']),
  userId: UserId,
})

const decodeAccessRows = Schema.decodeUnknownEffect(Schema.Array(OrganizationAccessRow))
const decodeActorRows = Schema.decodeUnknownEffect(Schema.Array(ActorRow))

const persistenceFailure = () =>
  IdentityPersistenceFailed.make({
    message: 'Application could not persist organization state',
    retryable: true,
  })

function toAccess(row: typeof OrganizationAccessRow.Type): OrganizationAccess {
  return OrganizationAccess.make({
    membership: Membership.make({
      createdAt: row.membershipCreatedAt,
      id: row.membershipId,
      organizationId: row.organizationId,
      role: row.membershipRole,
      status: row.membershipStatus,
      userId: row.userId,
    }),
    organization: Organization.make({
      createdAt: row.organizationCreatedAt,
      displayName: row.organizationDisplayName,
      id: row.organizationId,
      slug: row.organizationSlug,
    }),
  })
}

export class OrganizationService extends Context.Service<
  OrganizationService,
  {
    readonly create: (
      session: AuthenticatedSession,
      input: CreateOrganization,
    ) => Effect.Effect<
      OrganizationAccess,
      InvalidIdentityInput | OrganizationSlugUnavailable | IdentityPersistenceFailed
    >
    readonly list: (
      session: AuthenticatedSession,
    ) => Effect.Effect<OrganizationListResponse, IdentityPersistenceFailed>
    readonly update: (
      session: AuthenticatedSession,
      input: UpdateOrganization,
    ) => Effect.Effect<
      Organization,
      | PermissionDenied
      | InvalidIdentityInput
      | OrganizationSlugUnavailable
      | IdentityPersistenceFailed
    >
  }
>()('@app/api/OrganizationService') {
  static readonly layer = Layer.effect(
    OrganizationService,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const list = Effect.fn('OrganizationService.list')(
        function* (session: AuthenticatedSession) {
          const rows = yield* sql`
            SELECT
              organization.id AS "organizationId",
              organization.slug AS "organizationSlug",
              organization.display_name AS "organizationDisplayName",
              organization.created_at::text AS "organizationCreatedAt",
              membership.id AS "membershipId",
              membership.role AS "membershipRole",
              membership.status AS "membershipStatus",
              membership.created_at::text AS "membershipCreatedAt",
              membership.user_id AS "userId"
            FROM memberships AS membership
            JOIN organizations AS organization ON organization.id = membership.organization_id
            WHERE membership.user_id = ${session.userId}
              AND membership.status = 'active'
              AND organization.deleted_at IS NULL
            ORDER BY organization.display_name, organization.id
          `
          const decoded = yield* decodeAccessRows(rows)
          return OrganizationListResponse.make({ organizations: decoded.map(toAccess) })
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const create = Effect.fn('OrganizationService.create')(
        function* (session: AuthenticatedSession, input: CreateOrganization) {
          const displayName = input.displayName.trim()
          const slug = input.slug.trim().toLowerCase()
          if (displayName.length === 0) {
            return yield* InvalidIdentityInput.make({
              field: 'displayName',
              message: 'Organization name cannot be empty',
            })
          }

          const organizationId = OrganizationId.make(`org_${randomUUID()}`)
          const membershipId = MembershipId.make(`mem_${randomUUID()}`)

          return yield* sql.withTransaction(
            Effect.gen(function* () {
              const organizations = yield* sql`
                INSERT INTO organizations (id, slug, display_name, created_by_user_id)
                VALUES (${organizationId}, ${slug}, ${displayName}, ${session.userId})
                ON CONFLICT DO NOTHING
                RETURNING created_at::text AS "createdAt"
              `
              const createdOrganizations = yield* Schema.decodeUnknownEffect(
                Schema.Array(Schema.Struct({ createdAt: Schema.String })),
              )(organizations)
              const organization = createdOrganizations[0]
              if (organization === undefined) {
                return yield* OrganizationSlugUnavailable.make({ slug })
              }

              const memberships = yield* sql`
                INSERT INTO memberships (id, organization_id, user_id, role, status)
                VALUES (${membershipId}, ${organizationId}, ${session.userId}, 'owner', 'active')
                RETURNING created_at::text AS "createdAt"
              `
              const createdMemberships = yield* Schema.decodeUnknownEffect(
                Schema.Array(Schema.Struct({ createdAt: Schema.String })),
              )(memberships)
              const membership = createdMemberships[0]
              if (membership === undefined) return yield* persistenceFailure()

              yield* sql`
                INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, metadata)
                VALUES (
                  ${`aud_${randomUUID()}`}, ${organizationId}, ${session.userId},
                  'organization.created', 'organization', ${organizationId},
                  ${JSON.stringify({ displayName, slug })}::jsonb
                )
              `
              yield* sql`
                INSERT INTO domain_events (id, organization_id, type, actor_user_id, aggregate_type, aggregate_id, payload)
                VALUES (
                  ${EventId.make(`evt_${randomUUID()}`)}, ${organizationId}, 'organization.created',
                  ${session.userId}, 'organization', ${organizationId},
                  ${JSON.stringify({ displayName, slug })}::jsonb
                )
              `

              return OrganizationAccess.make({
                membership: Membership.make({
                  createdAt: membership.createdAt,
                  id: membershipId,
                  organizationId,
                  role: 'owner',
                  status: 'active',
                  userId: session.userId,
                }),
                organization: Organization.make({
                  createdAt: organization.createdAt,
                  displayName,
                  id: organizationId,
                  slug,
                }),
              })
            }),
          )
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      const update = Effect.fn('OrganizationService.update')(
        function* (session: AuthenticatedSession, input: UpdateOrganization) {
          const actorRows = yield* sql`
            SELECT organization_id AS "organizationId", role, status, user_id AS "userId"
            FROM memberships
            WHERE user_id = ${session.userId} AND organization_id = ${input.organizationId}
            LIMIT 1
          `
          const actors = yield* decodeActorRows(actorRows)
          const actor = actors[0]
          if (actor === undefined || !canUpdateOrganization({ ...actor, userId: session.userId })) {
            return yield* PermissionDenied.make({
              action: 'organization.update',
              message: 'Active organization owner authority is required',
            })
          }

          const displayName = input.displayName.trim()
          const slug = input.slug.trim().toLowerCase()
          if (displayName.length === 0) {
            return yield* InvalidIdentityInput.make({
              field: 'displayName',
              message: 'Organization name cannot be empty',
            })
          }

          return yield* sql.withTransaction(
            Effect.gen(function* () {
              const rows = yield* sql`
                UPDATE organizations
                SET display_name = ${displayName}, slug = ${slug}, updated_at = now()
                WHERE id = ${input.organizationId}
                  AND deleted_at IS NULL
                  AND NOT EXISTS (
                    SELECT 1 FROM organizations AS conflicting
                    WHERE conflicting.slug = ${slug} AND conflicting.id <> ${input.organizationId}
                  )
                RETURNING created_at::text AS "createdAt"
              `
              const updated = yield* Schema.decodeUnknownEffect(
                Schema.Array(Schema.Struct({ createdAt: Schema.String })),
              )(rows)
              const organization = updated[0]
              if (organization === undefined) {
                return yield* OrganizationSlugUnavailable.make({ slug })
              }

              const metadata = JSON.stringify({ displayName, slug })
              yield* sql`
                INSERT INTO audit_events (id, organization_id, actor_user_id, action, target_type, target_id, metadata)
                VALUES (
                  ${`aud_${randomUUID()}`}, ${input.organizationId}, ${session.userId},
                  'organization.updated', 'organization', ${input.organizationId}, ${metadata}::jsonb
                )
              `
              yield* sql`
                INSERT INTO domain_events (id, organization_id, type, actor_user_id, aggregate_type, aggregate_id, payload)
                VALUES (
                  ${EventId.make(`evt_${randomUUID()}`)}, ${input.organizationId},
                  'organization.updated', ${session.userId}, 'organization', ${input.organizationId},
                  ${metadata}::jsonb
                )
              `

              return Organization.make({
                createdAt: organization.createdAt,
                displayName,
                id: input.organizationId,
                slug,
              })
            }),
          )
        },
        Effect.catchTag(['SqlError', 'SchemaError'], () => persistenceFailure()),
      )

      return OrganizationService.of({ create, list, update })
    }),
  )
}
