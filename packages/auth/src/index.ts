import type { SessionId, UserId } from '@app/domain'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { createHash, randomBytes } from 'node:crypto'

export * from './auth-engine.js'
export * from './password-hasher.js'

export type AuthenticatedSession = {
  readonly sessionId: SessionId
  readonly userId: UserId
}

export type OpaqueToken = {
  readonly hash: string
  readonly value: string
}

export class OpaqueTokens extends Context.Service<
  OpaqueTokens,
  {
    readonly create: Effect.Effect<OpaqueToken>
    readonly digest: (value: string) => string
  }
>()('@app/auth/OpaqueTokens') {
  static readonly layer = Layer.succeed(OpaqueTokens)({
    create: Effect.sync(() => {
      const value = randomBytes(32).toString('base64url')
      return { hash: digestOpaqueToken(value), value }
    }),
    digest: digestOpaqueToken,
  })
}

export function digestOpaqueToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
