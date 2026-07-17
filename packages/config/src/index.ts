import * as Config from 'effect/Config'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const appConfig = Config.all({
  allowedOrigins: Config.string('APP_ALLOWED_ORIGINS').pipe(
    Config.withDefault('http://localhost:3000'),
    Config.map((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ),
  apiHost: Config.string('APP_API_HOST').pipe(Config.withDefault('127.0.0.1')),
  apiPort: Config.schema(
    Schema.Int.pipe(Schema.check(Schema.isBetween({ maximum: 65_535, minimum: 1 }))),
    'APP_API_PORT',
  ).pipe(Config.withDefault(4100)),
  authBaseUrl: Config.string('APP_AUTH_BASE_URL').pipe(
    Config.withDefault('http://localhost:3000/api'),
  ),
  authCookieName: Config.string('APP_AUTH_COOKIE_NAME').pipe(Config.withDefault('app_session')),
  authCookiePrefix: Config.string('APP_AUTH_COOKIE_PREFIX').pipe(Config.withDefault('app')),
  authCookieSecure: Config.boolean('APP_AUTH_COOKIE_SECURE').pipe(Config.withDefault(false)),
  authSessionDays: Config.schema(
    Schema.Int.pipe(Schema.check(Schema.isBetween({ maximum: 365, minimum: 1 }))),
    'APP_AUTH_SESSION_DAYS',
  ).pipe(Config.withDefault(30)),
  authSecret: Config.string('APP_AUTH_SECRET').pipe(
    Config.withDefault('app-development-auth-secret-change-me'),
  ),
  databaseUrl: Config.string('APP_DATABASE_URL').pipe(
    Config.withDefault('postgresql://app:app@127.0.0.1:5432/app'),
  ),
  logLevel: Config.literals(['debug', 'info', 'warn', 'error'], 'APP_LOG_LEVEL').pipe(
    Config.withDefault('info'),
  ),
  otlpEndpoint: Config.string('OTEL_EXPORTER_OTLP_ENDPOINT').pipe(
    Config.withDefault(''),
    Config.map((value) => value || undefined),
  ),
})

export class AppConfig extends Context.Service<
  AppConfig,
  {
    readonly allowedOrigins: ReadonlyArray<string>
    readonly apiHost: string
    readonly apiPort: number
    readonly authBaseUrl: string
    readonly authCookieName: string
    readonly authCookiePrefix: string
    readonly authCookieSecure: boolean
    readonly authSessionDays: number
    readonly authSecret: string
    readonly databaseUrl: string
    readonly logLevel: LogLevel
    readonly otlpEndpoint: string | undefined
  }
>()('@app/config/AppConfig') {
  static readonly layer = Layer.effect(
    AppConfig,
    Effect.map(appConfig, (config) => AppConfig.of(config)),
  )
}
