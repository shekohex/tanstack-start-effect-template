import { HealthResponse, PongResponse, ReadinessResponse, ServiceUnavailable } from '@app/protocol'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { Database } from './database.js'

const version = '0.0.0'

export class SystemService extends Context.Service<
  SystemService,
  {
    readonly health: Effect.Effect<HealthResponse>
    readonly ping: Effect.Effect<PongResponse>
    readonly readiness: Effect.Effect<ReadinessResponse, ServiceUnavailable>
  }
>()('@app/api/SystemService') {
  static readonly layer = Layer.effect(
    SystemService,
    Effect.gen(function* () {
      const database = yield* Database

      const health = Effect.succeed(
        HealthResponse.make({
          service: 'app-api',
          status: 'ok',
          version,
        }),
      )

      const ping = Effect.succeed(
        PongResponse.make({
          message: 'pong',
          service: 'app-api',
        }),
      )

      const readiness = database.check.pipe(
        Effect.as(
          ReadinessResponse.make({
            checks: { database: 'ok' },
            service: 'app-api',
            status: 'ready',
            version,
          }),
        ),
        Effect.mapError(() =>
          ServiceUnavailable.make({
            check: 'database',
            message: 'Database readiness check failed',
            retryable: true,
            service: 'app-api',
          }),
        ),
      )

      return SystemService.of({ health, ping, readiness })
    }),
  )
}
