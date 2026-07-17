import { Session, SessionId, User, UserId } from '@app/domain'
import { isAPIError } from 'better-auth/api'
import { betterAuth } from 'better-auth/minimal'
import * as Array from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import { randomUUID } from 'node:crypto'

import { makeEffectSqlAdapter } from './effect-sql-adapter.js'
import { PasswordHasher } from './password-hasher.js'

export interface AuthEngineOptions {
  readonly appName: string
  readonly baseUrl: string
  readonly cookieName: string
  readonly cookiePrefix: string
  readonly cookieSecure: boolean
  readonly secret: string
  readonly sessionDays: number
  readonly trustedOrigins: ReadonlyArray<string>
}

export interface EmailRegistration {
  readonly displayName: string
  readonly email: string
  readonly password: string
}

export interface EmailLogin {
  readonly email: string
  readonly password: string
}

export interface AuthSessionResult {
  readonly session: Session
  readonly user: User
}

export interface IssuedAuthSession extends AuthSessionResult {
  readonly setCookies: ReadonlyArray<string>
}

export class AuthEmailAlreadyRegistered extends Schema.TaggedErrorClass<AuthEmailAlreadyRegistered>()(
  'AuthEmailAlreadyRegistered',
  { message: Schema.String },
) {}

export class AuthInvalidCredentials extends Schema.TaggedErrorClass<AuthInvalidCredentials>()(
  'AuthInvalidCredentials',
  { message: Schema.String },
) {}

export class AuthInvalidInput extends Schema.TaggedErrorClass<AuthInvalidInput>()(
  'AuthInvalidInput',
  {
    field: Schema.String,
    message: Schema.String,
  },
) {}

export class AuthUnauthenticated extends Schema.TaggedErrorClass<AuthUnauthenticated>()(
  'AuthUnauthenticated',
  { message: Schema.String },
) {}

export class AuthPersistenceFailed extends Schema.TaggedErrorClass<AuthPersistenceFailed>()(
  'AuthPersistenceFailed',
  {
    cause: Schema.Defect(),
    operation: Schema.String,
  },
) {}

export type AuthEngineError =
  | AuthEmailAlreadyRegistered
  | AuthInvalidCredentials
  | AuthInvalidInput
  | AuthPersistenceFailed
  | AuthUnauthenticated

const BetterAuthUser = Schema.Struct({
  createdAt: Schema.Date,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  id: UserId,
  name: Schema.String,
})

const BetterAuthSession = Schema.Struct({
  createdAt: Schema.Date,
  expiresAt: Schema.Date,
  id: SessionId,
  updatedAt: Schema.Date,
  userId: UserId,
})

const BetterAuthSessionResult = Schema.Struct({
  session: BetterAuthSession,
  user: BetterAuthUser,
})

const BetterAuthErrorBody = Schema.Struct({ code: Schema.String })

const decodeSessionResult = Schema.decodeUnknownEffect(BetterAuthSessionResult)
const decodeBetterAuthErrorBody = Schema.decodeUnknownOption(BetterAuthErrorBody)

function authErrorCode(cause: unknown): Option.Option<string> {
  return isAPIError(cause)
    ? decodeBetterAuthErrorBody(cause.body).pipe(Option.map((body) => body.code))
    : Option.none()
}

function persistenceError(operation: string, cause: unknown) {
  return AuthPersistenceFailed.make({ cause, operation })
}

function registerError(
  cause: unknown,
): AuthEmailAlreadyRegistered | AuthInvalidInput | AuthPersistenceFailed {
  return Option.match(authErrorCode(cause), {
    onNone: () => persistenceError('register', cause),
    onSome: (code) =>
      Match.value(code).pipe(
        Match.when(Match.is('USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'), () =>
          AuthEmailAlreadyRegistered.make({
            message: 'An account already exists for this email address',
          }),
        ),
        Match.when('INVALID_EMAIL', () =>
          AuthInvalidInput.make({ field: 'email', message: 'Email address is invalid' }),
        ),
        Match.when(Match.is('PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG'), () =>
          AuthInvalidInput.make({ field: 'password', message: 'Password length is invalid' }),
        ),
        Match.orElse(() => persistenceError('register', cause)),
      ),
  })
}

function loginError(cause: unknown): AuthInvalidCredentials | AuthPersistenceFailed {
  return Option.match(authErrorCode(cause), {
    onNone: () => persistenceError('login', cause),
    onSome: (code) =>
      Match.value(code).pipe(
        Match.when(
          Match.is('INVALID_EMAIL_OR_PASSWORD', 'INVALID_PASSWORD', 'USER_NOT_FOUND'),
          () => AuthInvalidCredentials.make({ message: 'Email or password is incorrect' }),
        ),
        Match.orElse(() => persistenceError('login', cause)),
      ),
  })
}

function cookieRequestHeaders(setCookies: ReadonlyArray<string>) {
  const cookie = Array.flatMap(setCookies, (value) =>
    Option.fromUndefinedOr(value.split(';', 1)[0]).pipe(Option.toArray),
  ).join('; ')
  return new Headers({ cookie })
}

function toSessionResult(value: typeof BetterAuthSessionResult.Type): AuthSessionResult {
  return {
    session: Session.make({
      createdAt: value.session.createdAt.toISOString(),
      expiresAt: value.session.expiresAt.toISOString(),
      id: value.session.id,
      lastSeenAt: value.session.updatedAt.toISOString(),
      userId: value.session.userId,
    }),
    user: User.make({
      createdAt: value.user.createdAt.toISOString(),
      displayName: value.user.name,
      email: value.user.email,
      emailVerified: value.user.emailVerified,
      id: value.user.id,
    }),
  }
}

function prefixedId(model: string) {
  const prefix = Match.value(model).pipe(
    Match.when('user', () => 'usr'),
    Match.when('session', () => 'ses'),
    Match.when('account', () => 'acc'),
    Match.when('verification', () => 'ver'),
    Match.orElse(() => 'auth'),
  )
  return `${prefix}_${randomUUID()}`
}

export class AuthEngine extends Context.Service<
  AuthEngine,
  {
    readonly getSession: (
      headers: Headers,
    ) => Effect.Effect<AuthSessionResult, AuthPersistenceFailed | AuthUnauthenticated>
    readonly login: (
      input: EmailLogin,
      headers: Headers,
    ) => Effect.Effect<IssuedAuthSession, AuthInvalidCredentials | AuthPersistenceFailed>
    readonly logout: (
      headers: Headers,
    ) => Effect.Effect<ReadonlyArray<string>, AuthPersistenceFailed>
    readonly register: (
      input: EmailRegistration,
      headers: Headers,
    ) => Effect.Effect<
      IssuedAuthSession,
      AuthEmailAlreadyRegistered | AuthInvalidInput | AuthPersistenceFailed
    >
  }
>()('@app/auth/AuthEngine') {
  static layer(options: AuthEngineOptions) {
    return Layer.effect(
      AuthEngine,
      Effect.gen(function* () {
        const passwordHasher = yield* PasswordHasher
        const sqlContext = yield* Effect.context<SqlClient.SqlClient>()
        const auth = betterAuth({
          account: {
            accountLinking: {
              disableImplicitLinking: true,
              enabled: true,
            },
            fields: {
              accessToken: 'access_token',
              accessTokenExpiresAt: 'access_token_expires_at',
              accountId: 'account_id',
              createdAt: 'created_at',
              idToken: 'id_token',
              providerId: 'provider_id',
              refreshToken: 'refresh_token',
              refreshTokenExpiresAt: 'refresh_token_expires_at',
              updatedAt: 'updated_at',
              userId: 'user_id',
            },
            modelName: 'auth_accounts',
          },
          advanced: {
            cookiePrefix: options.cookiePrefix,
            cookies: {
              session_token: {
                attributes: {
                  httpOnly: true,
                  sameSite: 'lax',
                  secure: options.cookieSecure,
                },
                name: options.cookieName,
              },
            },
            database: {
              generateId: ({ model }) => prefixedId(model),
            },
          },
          appName: options.appName,
          basePath: '/auth/better',
          baseURL: options.baseUrl,
          database: makeEffectSqlAdapter(sqlContext),
          emailAndPassword: {
            autoSignIn: true,
            enabled: true,
            maxPasswordLength: 128,
            minPasswordLength: 12,
            password: {
              hash: (password) => Effect.runPromise(passwordHasher.hash(password)),
              verify: ({ hash, password }) =>
                Effect.runPromise(passwordHasher.verify(hash, password)),
            },
          },
          rateLimit: {
            enabled: true,
            fields: {
              count: 'count',
              key: 'key',
              lastRequest: 'last_request',
            },
            modelName: 'auth_rate_limits',
            storage: 'database',
          },
          secret: options.secret,
          session: {
            cookieCache: { enabled: false },
            expiresIn: options.sessionDays * 24 * 60 * 60,
            fields: {
              createdAt: 'created_at',
              expiresAt: 'expires_at',
              ipAddress: 'ip_address',
              token: 'token',
              updatedAt: 'updated_at',
              userAgent: 'user_agent',
              userId: 'user_id',
            },
            modelName: 'auth_sessions',
          },
          telemetry: { enabled: false },
          trustedOrigins: [...options.trustedOrigins],
          user: {
            fields: {
              createdAt: 'created_at',
              emailVerified: 'email_verified',
              image: 'image_url',
              name: 'display_name',
              updatedAt: 'updated_at',
            },
            modelName: 'users',
          },
          verification: {
            fields: {
              createdAt: 'created_at',
              expiresAt: 'expires_at',
              identifier: 'identifier',
              updatedAt: 'updated_at',
              value: 'value',
            },
            modelName: 'auth_verifications',
          },
        })

        const getSession = Effect.fn('AuthEngine.getSession')(function* (headers: Headers) {
          const result = yield* Effect.tryPromise({
            try: () => auth.api.getSession({ headers }),
            catch: (cause) => persistenceError('getSession', cause),
          })
          const sessionResult = yield* Option.match(Option.fromNullOr(result), {
            onNone: () =>
              Effect.fail(AuthUnauthenticated.make({ message: 'A valid session is required' })),
            onSome: Effect.succeed,
          })
          const decoded = yield* decodeSessionResult(sessionResult).pipe(
            Effect.mapError((cause) =>
              AuthPersistenceFailed.make({ cause, operation: 'getSession' }),
            ),
          )
          return toSessionResult(decoded)
        })

        const issuedSession = Effect.fn('AuthEngine.issuedSession')(function* (
          setCookies: ReadonlyArray<string>,
        ) {
          const session = yield* getSession(cookieRequestHeaders(setCookies)).pipe(
            Effect.catchTag('AuthUnauthenticated', (cause) =>
              Effect.fail(persistenceError('issuedSession', cause)),
            ),
          )
          return { ...session, setCookies }
        })

        const register = Effect.fn('AuthEngine.register')(function* (
          input: EmailRegistration,
          headers: Headers,
        ) {
          const result = yield* Effect.tryPromise({
            try: () =>
              auth.api.signUpEmail({
                body: {
                  email: input.email,
                  name: input.displayName,
                  password: input.password,
                },
                headers,
                returnHeaders: true,
              }),
            catch: registerError,
          })
          return yield* issuedSession(result.headers.getSetCookie())
        })

        const login = Effect.fn('AuthEngine.login')(function* (
          input: EmailLogin,
          headers: Headers,
        ) {
          const result = yield* Effect.tryPromise({
            try: () =>
              auth.api.signInEmail({
                body: input,
                headers,
                returnHeaders: true,
              }),
            catch: loginError,
          })
          return yield* issuedSession(result.headers.getSetCookie())
        })

        const logout = Effect.fn('AuthEngine.logout')(function* (headers: Headers) {
          const result = yield* Effect.tryPromise({
            try: () => auth.api.signOut({ headers, returnHeaders: true }),
            catch: (cause) => persistenceError('logout', cause),
          })
          return result.headers.getSetCookie()
        })

        return AuthEngine.of({ getSession, login, logout, register })
      }),
    )
  }
}
