import {
  AuthEmailAlreadyRegistered,
  AuthEngine,
  AuthInvalidCredentials,
  AuthInvalidInput,
  AuthPersistenceFailed,
  type AuthSessionResult,
  type AuthenticatedSession,
} from '@app/auth'
import { AppConfig } from '@app/config'
import {
  AuthenticationFailed,
  AuthSessionResponse,
  EmailAlreadyRegistered,
  IdentityPersistenceFailed,
  InvalidIdentityInput,
  type LoginWithEmail,
  type RegisterWithEmail,
  Unauthenticated,
} from '@app/protocol'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

type IssuedAuthSession = {
  readonly response: AuthSessionResponse
  readonly setCookies: ReadonlyArray<string>
}

const persistenceFailure = () =>
  IdentityPersistenceFailed.make({
    message: 'Application could not persist identity state',
    retryable: true,
  })

function sessionResponse(result: AuthSessionResult): AuthSessionResponse {
  return AuthSessionResponse.make({ session: result.session, user: result.user })
}

function sessionHeaders(cookieName: string, token: string) {
  return new Headers({ cookie: `${cookieName}=${token}` })
}

const mapPersistenceError = <A, E, R>(effect: Effect.Effect<A, E | AuthPersistenceFailed, R>) =>
  Effect.catchTag(effect, 'AuthPersistenceFailed', () => persistenceFailure())

export class IdentityService extends Context.Service<
  IdentityService,
  {
    readonly getSession: (
      token: string,
    ) => Effect.Effect<AuthSessionResponse, Unauthenticated | IdentityPersistenceFailed>
    readonly login: (
      input: LoginWithEmail,
      headers: Headers,
    ) => Effect.Effect<IssuedAuthSession, AuthenticationFailed | IdentityPersistenceFailed>
    readonly logout: (
      token: string | undefined,
    ) => Effect.Effect<ReadonlyArray<string>, IdentityPersistenceFailed>
    readonly register: (
      input: RegisterWithEmail,
      headers: Headers,
    ) => Effect.Effect<
      IssuedAuthSession,
      EmailAlreadyRegistered | IdentityPersistenceFailed | InvalidIdentityInput
    >
    readonly requireSession: (
      token: string | undefined,
    ) => Effect.Effect<AuthenticatedSession, Unauthenticated | IdentityPersistenceFailed>
  }
>()('@app/api/IdentityService') {
  static readonly layer = Layer.effect(
    IdentityService,
    Effect.gen(function* () {
      const auth = yield* AuthEngine
      const config = yield* AppConfig

      const getSession = Effect.fn('IdentityService.getSession')(function* (token: string) {
        const result = yield* auth.getSession(sessionHeaders(config.authCookieName, token)).pipe(
          Effect.catchTag('AuthUnauthenticated', () =>
            Unauthenticated.make({ message: 'A valid session is required' }),
          ),
          mapPersistenceError,
        )
        return sessionResponse(result)
      })

      const requireSession = Effect.fn('IdentityService.requireSession')(function* (
        token: string | undefined,
      ) {
        if (token === undefined) {
          return yield* Unauthenticated.make({ message: 'A valid session is required' })
        }
        const response = yield* getSession(token)
        return {
          sessionId: response.session.id,
          userId: response.user.id,
        }
      })

      const register = Effect.fn('IdentityService.register')(function* (
        input: RegisterWithEmail,
        headers: Headers,
      ) {
        const issued = yield* auth.register(input, headers).pipe(
          Effect.catchTag('AuthEmailAlreadyRegistered', (error: AuthEmailAlreadyRegistered) =>
            EmailAlreadyRegistered.make({ message: error.message }),
          ),
          Effect.catchTag('AuthInvalidInput', (error: AuthInvalidInput) =>
            InvalidIdentityInput.make({ field: error.field, message: error.message }),
          ),
          mapPersistenceError,
        )

        return {
          response: sessionResponse(issued),
          setCookies: issued.setCookies,
        }
      })

      const login = Effect.fn('IdentityService.login')(function* (
        input: LoginWithEmail,
        headers: Headers,
      ) {
        const issued = yield* auth.login(input, headers).pipe(
          Effect.catchTag('AuthInvalidCredentials', (_error: AuthInvalidCredentials) =>
            AuthenticationFailed.make({ message: 'Email or password is incorrect' }),
          ),
          mapPersistenceError,
        )
        return {
          response: sessionResponse(issued),
          setCookies: issued.setCookies,
        }
      })

      const logout = Effect.fn('IdentityService.logout')(function* (token: string | undefined) {
        if (token === undefined) return []
        const headers = sessionHeaders(config.authCookieName, token)
        return yield* auth.logout(headers).pipe(mapPersistenceError)
      })

      return IdentityService.of({ getSession, login, logout, register, requireSession })
    }),
  )
}
