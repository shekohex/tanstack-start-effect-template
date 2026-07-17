import {
  AppRpcs,
  AuthSessionResponse,
  HealthResponse,
  LogoutResponse,
  ReadinessResponse,
  type LoginWithEmail,
  type RegisterWithEmail,
} from '@app/protocol'
import * as BrowserSocket from '@effect/platform-browser/BrowserSocket'
import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as RpcClient from 'effect/unstable/rpc/RpcClient'
import type * as RpcClientError from 'effect/unstable/rpc/RpcClientError'
import type * as RpcGroup from 'effect/unstable/rpc/RpcGroup'
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization'

export type AppClientOptions = {
  readonly baseUrl: string
  readonly fetch?: typeof globalThis.fetch
}

export class AppClientHttpError extends Error {
  readonly body: unknown
  readonly status: number

  constructor(status: number, body: unknown) {
    super(`Application API returned ${status}`)
    this.name = 'AppClientHttpError'
    this.status = status
    this.body = body
  }
}

export function createAppClient(options: AppClientOptions) {
  const fetchImplementation = options.fetch ?? globalThis.fetch
  const baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`

  async function requestJson<S extends Schema.ConstraintDecoder<unknown>>(
    path: string,
    schema: S,
    init?: RequestInit,
  ): Promise<S['Type']> {
    const headers = new Headers(init?.headers)
    if (init?.body !== undefined) headers.set('content-type', 'application/json')
    const response = await fetchImplementation(new URL(path.replace(/^\//, ''), baseUrl), {
      credentials: 'include',
      ...init,
      headers,
    })
    const body: unknown = await response.json()
    if (!response.ok) throw new AppClientHttpError(response.status, body)
    return Schema.decodeUnknownPromise(schema)(body)
  }

  return {
    health: () => requestJson('/healthz', HealthResponse),
    login: (input: LoginWithEmail) =>
      requestJson('/auth/login', AuthSessionResponse, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    logout: () => requestJson('/auth/logout', LogoutResponse, { method: 'POST' }),
    readiness: () => requestJson('/readyz', ReadinessResponse),
    register: (input: RegisterWithEmail) =>
      requestJson('/auth/register', AuthSessionResponse, {
        body: JSON.stringify(input),
        method: 'POST',
      }),
    session: () => requestJson('/auth/session', AuthSessionResponse),
  }
}

export class AppRpcClient extends Context.Service<
  AppRpcClient,
  RpcClient.RpcClient<RpcGroup.Rpcs<typeof AppRpcs>, RpcClientError.RpcClientError>
>()('@app/client/AppRpcClient') {
  static readonly layer = Layer.effect(AppRpcClient)(RpcClient.make(AppRpcs))
}

export function makeBrowserRpcClientLayer(url: string) {
  return AppRpcClient.layer.pipe(
    Layer.provide(RpcClient.layerProtocolSocket()),
    Layer.provide(BrowserSocket.layerWebSocket(url)),
    Layer.provide(RpcSerialization.layerJson),
  )
}
