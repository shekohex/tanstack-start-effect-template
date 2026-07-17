import { AppRpcs, CurrentRpcSession } from '@app/protocol'
import * as Effect from 'effect/Effect'

import { InvitationService } from './invitation-service.js'
import { MembershipService } from './membership-service.js'
import { OrganizationService } from './organization-service.js'
import { SystemService } from './system-service.js'

export const SystemRpcHandlersLive = AppRpcs.toLayer(
  Effect.gen(function* () {
    const system = yield* SystemService
    const invitations = yield* InvitationService
    const memberships = yield* MembershipService
    const organizations = yield* OrganizationService

    return AppRpcs.of({
      'system.health': () => system.health,
      'system.ping': () => system.ping,
      'system.readiness': () => system.readiness,
      'organization.list': () =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* organizations.list(session)
        }),
      'organization.create': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* organizations.create(session, payload)
        }),
      'organization.update': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* organizations.update(session, payload)
        }),
      'invitation.createEmail': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* invitations.createEmail(session, payload)
        }),
      'invitation.acceptEmail': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* invitations.acceptEmail(session, payload.token)
        }),
      'invitation.revoke': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* invitations.revoke(session, payload.organizationId, payload.invitationId)
        }),
      'membership.list': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* invitations.listMembers(session, payload.organizationId)
        }),
      'membership.changeRole': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* memberships.changeRole(
            session,
            payload.organizationId,
            payload.membershipId,
            payload.role,
          )
        }),
      'membership.changeStatus': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* memberships.changeStatus(
            session,
            payload.organizationId,
            payload.membershipId,
            payload.status,
          )
        }),
      'membership.remove': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* memberships.remove(session, payload.organizationId, payload.membershipId)
        }),
      'organization.transferOwnership': (payload) =>
        Effect.gen(function* () {
          const session = yield* CurrentRpcSession
          return yield* memberships.transferOwnership(
            session,
            payload.organizationId,
            payload.membershipId,
          )
        }),
    })
  }),
)
