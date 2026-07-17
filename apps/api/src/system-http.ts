import { AppHttpApi } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as HttpApiBuilder from 'effect/unstable/httpapi/HttpApiBuilder'

import { SystemService } from './system-service.js'

export const SystemHttpHandlersLive = HttpApiBuilder.group(
  AppHttpApi,
  'system',
  Effect.fn('SystemHttpHandlersLive')(function* (handlers) {
    const system = yield* SystemService

    return handlers
      .handle('health', () => system.health)
      .handle('readiness', () => system.readiness)
  }),
)
