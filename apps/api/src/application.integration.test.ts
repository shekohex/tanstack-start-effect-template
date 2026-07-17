import { assert, layer } from '@effect/vitest'
import * as PgClient from '@effect/sql-pg/PgClient'
import { AuthEngine, OpaqueTokens, PasswordHasher } from '@app/auth'
import { CreateEmailInvitation, CreateOrganization, UpdateOrganization } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Layer from 'effect/Layer'
import * as Redacted from 'effect/Redacted'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { randomUUID } from 'node:crypto'

import { InvitationService } from './invitation-service.js'
import { MembershipService } from './membership-service.js'
import { OrganizationService } from './organization-service.js'

const databaseUrl = process.env.APP_DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:5432/app'
const DatabaseLive = PgClient.layer({
  applicationName: 'app-integration',
  url: Redacted.make(databaseUrl),
})
const AuthEngineLive = AuthEngine.layer({
  appName: 'App',
  baseUrl: 'http://localhost:3000/api',
  cookieName: 'app_session',
  cookiePrefix: 'app',
  cookieSecure: false,
  secret: 'app-integration-auth-secret-at-least-32-characters',
  sessionDays: 30,
  trustedOrigins: ['http://localhost:3000'],
})
const ServiceLayers = Layer.mergeAll(
  AuthEngineLive,
  InvitationService.layer,
  MembershipService.layer,
  OrganizationService.layer,
).pipe(Layer.provide(PasswordHasher.layer), Layer.provide(OpaqueTokens.layer))
const ServicesLive = Layer.merge(DatabaseLive, ServiceLayers.pipe(Layer.provide(DatabaseLive)))

function requestHeaders() {
  return new Headers({ origin: 'http://localhost:3000', 'user-agent': 'App integration test' })
}

layer(ServicesLive, { excludeTestServices: true })((it) => {
  it.effect('keeps organization and membership mutations tenant-safe and auditable', () =>
    Effect.gen(function* () {
      const identifier = randomUUID().slice(0, 8)
      const auth = yield* AuthEngine
      const invitations = yield* InvitationService
      const memberships = yield* MembershipService
      const organizations = yield* OrganizationService
      const sql = yield* SqlClient.SqlClient

      const owner = yield* auth.register(
        {
          displayName: `Integration Owner ${identifier}`,
          email: `integration-owner-${identifier}@example.com`,
          password: 'correct-horse-battery',
        },
        requestHeaders(),
      )
      const ownerSession = { sessionId: owner.session.id, userId: owner.user.id }
      const firstOrganization = yield* organizations.create(
        ownerSession,
        CreateOrganization.make({
          displayName: `Integration First ${identifier}`,
          slug: `integration-first-${identifier}`,
        }),
      )
      const secondOrganization = yield* organizations.create(
        ownerSession,
        CreateOrganization.make({
          displayName: `Integration Second ${identifier}`,
          slug: `integration-second-${identifier}`,
        }),
      )

      const ownerOrganizations = yield* organizations.list(ownerSession)
      assert.strictEqual(ownerOrganizations.organizations.length, 2)
      yield* organizations.update(
        ownerSession,
        UpdateOrganization.make({
          displayName: `Updated First ${identifier}`,
          organizationId: firstOrganization.organization.id,
          slug: `updated-first-${identifier}`,
        }),
      )

      const member = yield* auth.register(
        {
          displayName: `Integration Member ${identifier}`,
          email: `integration-member-${identifier}@example.com`,
          password: 'correct-horse-battery',
        },
        requestHeaders(),
      )
      const memberSession = { sessionId: member.session.id, userId: member.user.id }
      const invitation = yield* invitations.createEmail(
        ownerSession,
        CreateEmailInvitation.make({
          email: member.user.email,
          organizationId: firstOrganization.organization.id,
          role: 'member',
        }),
      )
      const memberAccess = yield* invitations.acceptEmail(memberSession, invitation.token)

      const crossTenant = yield* invitations
        .listMembers(memberSession, secondOrganization.organization.id)
        .pipe(Effect.flip)
      assert.strictEqual(crossTenant._tag, 'PermissionDenied')

      yield* memberships.changeStatus(
        ownerSession,
        firstOrganization.organization.id,
        memberAccess.membership.id,
        'suspended',
      )
      const deniedWhileSuspended = yield* invitations
        .listMembers(memberSession, firstOrganization.organization.id)
        .pipe(Effect.flip)
      assert.strictEqual(deniedWhileSuspended._tag, 'PermissionDenied')
      yield* memberships.changeStatus(
        ownerSession,
        firstOrganization.organization.id,
        memberAccess.membership.id,
        'active',
      )
      yield* memberships.changeRole(
        ownerSession,
        firstOrganization.organization.id,
        memberAccess.membership.id,
        'admin',
      )

      const transferRace = yield* Effect.all(
        [
          Effect.exit(
            memberships.transferOwnership(
              ownerSession,
              firstOrganization.organization.id,
              memberAccess.membership.id,
            ),
          ),
          Effect.exit(
            memberships.transferOwnership(
              ownerSession,
              firstOrganization.organization.id,
              memberAccess.membership.id,
            ),
          ),
        ],
        { concurrency: 'unbounded' },
      )
      assert.strictEqual(transferRace.filter(Exit.isSuccess).length, 1)
      assert.strictEqual(transferRace.filter(Exit.isFailure).length, 1)

      yield* memberships.transferOwnership(
        memberSession,
        firstOrganization.organization.id,
        firstOrganization.membership.id,
      )
      const removed = yield* memberships.remove(
        ownerSession,
        firstOrganization.organization.id,
        memberAccess.membership.id,
      )
      assert.strictEqual(removed.membership.status, 'removed')

      const eventRows = yield* sql<{ readonly type: string }>`
        SELECT type FROM domain_events
        WHERE organization_id = ${firstOrganization.organization.id}
      `
      assert.includeMembers(
        eventRows.map((row) => row.type),
        [
          'organization.created',
          'organization.updated',
          'invitation.created',
          'membership.created',
          'membership.role_changed',
          'membership.status_changed',
          'membership.removed',
          'organization.ownership_transferred',
        ],
      )
    }),
  )
})
