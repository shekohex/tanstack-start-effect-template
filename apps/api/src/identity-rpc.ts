import { AppConfig } from '@app/config'
import { CurrentRpcSession, SessionRpcMiddleware } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Cookies from 'effect/unstable/http/Cookies'

import { IdentityService } from './identity-service.js'

export const SessionRpcMiddlewareLive = Layer.effect(
  SessionRpcMiddleware,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const identity = yield* IdentityService

    return SessionRpcMiddleware.of((effect, options) =>
      Effect.gen(function* () {
        const cookies = Cookies.parseHeader(options.headers.cookie ?? '')
        const session = yield* identity.requireSession(cookies[config.authCookieName])
        return yield* Effect.provideService(effect, CurrentRpcSession, session)
      }),
    )
  }),
)
