import { AppConfig } from '@app/config'
import { LogoutResponse, AppHttpApi, Unauthenticated } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as Cookies from 'effect/unstable/http/Cookies'
import * as HttpEffect from 'effect/unstable/http/HttpEffect'
import * as HttpServerRequest from 'effect/unstable/http/HttpServerRequest'
import * as HttpServerResponse from 'effect/unstable/http/HttpServerResponse'
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder'

import { IdentityService } from './identity-service.js'

function webHeaders(request: HttpServerRequest.HttpServerRequest) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.append(name, value)
  }
  return headers
}

function responseCookie(
  cookie: Cookies.Cookie,
): readonly [string, string, Cookies.Cookie['options']] {
  return [cookie.name, cookie.value, cookie.options]
}

const setAuthCookies = Effect.fn('setAuthCookies')(function* (cookies: ReadonlyArray<string>) {
  if (cookies.length === 0) return
  const parsed = Cookies.fromSetCookie(cookies)
  const entries = Object.values(parsed.cookies).map(responseCookie)
  yield* HttpEffect.appendPreResponseHandler((_request, response) =>
    Effect.succeed(HttpServerResponse.setCookiesUnsafe(response, entries)),
  )
})

export const AuthHttpHandlersLive = HttpApiBuilder.group(
  AppHttpApi,
  'auth',
  Effect.fn('AuthHttpHandlersLive')(function* (handlers) {
    const config = yield* AppConfig
    const identity = yield* IdentityService

    return handlers
      .handle('register', ({ payload }) =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const issued = yield* identity.register(payload, webHeaders(request))
          yield* setAuthCookies(issued.setCookies)
          return issued.response
        }),
      )
      .handle('login', ({ payload }) =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const issued = yield* identity.login(payload, webHeaders(request))
          yield* setAuthCookies(issued.setCookies)
          return issued.response
        }),
      )
      .handle('session', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const token = request.cookies[config.authCookieName]
          if (token === undefined) {
            return yield* Unauthenticated.make({ message: 'A valid session is required' })
          }
          return yield* identity.getSession(token)
        }),
      )
      .handle('logout', () =>
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const cookies = yield* identity.logout(request.cookies[config.authCookieName])
          yield* setAuthCookies(cookies)
          return LogoutResponse.make({ loggedOut: true })
        }),
      )
  }),
)
