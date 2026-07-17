import { AppConfig } from '@app/config'
import { AppHttpApi } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as HttpServerRequest from 'effect/unstable/http/HttpServerRequest'
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder'

import { IdentityService } from './identity-service.js'
import { OrganizationService } from './organization-service.js'

export const OrganizationHttpHandlersLive = HttpApiBuilder.group(
  AppHttpApi,
  'organizations',
  Effect.fn('OrganizationHttpHandlersLive')(function* (handlers) {
    const config = yield* AppConfig
    const identity = yield* IdentityService
    const organizations = yield* OrganizationService

    const authenticatedSession = Effect.fn('authenticatedOrganizationSession')(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      return yield* identity.requireSession(request.cookies[config.authCookieName])
    })

    return handlers
      .handle('list', () =>
        Effect.gen(function* () {
          const session = yield* authenticatedSession()
          return yield* organizations.list(session)
        }),
      )
      .handle('create', ({ payload }) =>
        Effect.gen(function* () {
          const session = yield* authenticatedSession()
          return yield* organizations.create(session, payload)
        }),
      )
  }),
)
