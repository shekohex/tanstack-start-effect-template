import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { AuthEngine, OpaqueTokens, PasswordHasher } from '@app/auth'
import { AppConfig } from '@app/config'
import { makeObservabilityLayer } from '@app/observability'
import { AppHttpApi, AppRpcs } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as HttpRouter from 'effect/unstable/http/HttpRouter'
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder'
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization'
import * as RpcServer from 'effect/unstable/rpc/RpcServer'
import { createServer } from 'node:http'

import { Database, makeDatabaseLayer } from './database.js'
import { AuthHttpHandlersLive } from './identity-http.js'
import { SessionRpcMiddlewareLive } from './identity-rpc.js'
import { IdentityService } from './identity-service.js'
import { InvitationService } from './invitation-service.js'
import { MembershipService } from './membership-service.js'
import { OrganizationHttpHandlersLive } from './organization-http.js'
import { OrganizationService } from './organization-service.js'
import { SystemHttpHandlersLive } from './system-http.js'
import { SystemRpcHandlersLive } from './system-rpc.js'
import { SystemService } from './system-service.js'

const DatabaseLive = Layer.unwrap(
  Effect.map(AppConfig, (config) => makeDatabaseLayer(config.databaseUrl)),
)
const ServerLive = Layer.unwrap(
  Effect.map(AppConfig, (config) =>
    NodeHttpServer.layer(createServer, { host: config.apiHost, port: config.apiPort }),
  ),
)
const CorsLive = Layer.unwrap(
  Effect.map(AppConfig, (config) => HttpRouter.cors({ allowedOrigins: config.allowedOrigins })),
)
const ObservabilityLive = Layer.unwrap(
  Effect.map(AppConfig, (config) =>
    makeObservabilityLayer({
      endpoint: config.otlpEndpoint,
      serviceName: 'app-api',
      serviceVersion: '0.0.0',
    }),
  ),
)
const AuthEngineLive = Layer.unwrap(
  Effect.map(AppConfig, (config) =>
    AuthEngine.layer({
      appName: 'App',
      baseUrl: config.authBaseUrl,
      cookieName: config.authCookieName,
      cookiePrefix: config.authCookiePrefix,
      cookieSecure: config.authCookieSecure,
      secret: config.authSecret,
      sessionDays: config.authSessionDays,
      trustedOrigins: config.allowedOrigins,
    }),
  ),
)

const HttpRoutesLive = HttpApiBuilder.layer(AppHttpApi, { openapiPath: '/openapi.json' }).pipe(
  Layer.provide(SystemHttpHandlersLive),
  Layer.provide(AuthHttpHandlersLive),
  Layer.provide(OrganizationHttpHandlersLive),
)
const RpcRoutesLive = RpcServer.layerHttp({ group: AppRpcs, path: '/rpc' }).pipe(
  Layer.provide(SystemRpcHandlersLive),
  Layer.provide(SessionRpcMiddlewareLive),
  Layer.provide(RpcSerialization.layerJson),
)
const RoutesLive = Layer.mergeAll(HttpRoutesLive, RpcRoutesLive, CorsLive)

const ApiLive = HttpRouter.serve(RoutesLive).pipe(
  Layer.provide(MembershipService.layer),
  Layer.provide(InvitationService.layer),
  Layer.provide(OrganizationService.layer),
  Layer.provide(IdentityService.layer),
  Layer.provide(AuthEngineLive),
  Layer.provide(PasswordHasher.layer),
  Layer.provide(OpaqueTokens.layer),
  Layer.provide(SystemService.layer),
  Layer.provide(Database.layer),
  Layer.provide(DatabaseLive),
  Layer.provide(ServerLive),
  Layer.provide(ObservabilityLive),
  Layer.provide(AppConfig.layer),
)

Layer.launch(ApiLive).pipe(
  Effect.tap(() => Effect.logInfo('Application API stopped')),
  NodeRuntime.runMain,
)
