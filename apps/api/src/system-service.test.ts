import { assert, it } from '@effect/vitest'
import { HealthResponse, PongResponse, ReadinessResponse } from '@app/protocol'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { Database } from './database.js'
import { SystemService } from './system-service.js'

const DatabaseTest = Layer.succeed(Database)({
  check: Effect.void,
})

it.effect('serves ping, health, and readiness through an Effect service', () =>
  Effect.gen(function* () {
    const system = yield* SystemService
    const health = yield* system.health
    const pong = yield* system.ping
    const readiness = yield* system.readiness

    assert.instanceOf(health, HealthResponse)
    assert.instanceOf(pong, PongResponse)
    assert.strictEqual(pong.message, 'pong')
    assert.instanceOf(readiness, ReadinessResponse)
  }).pipe(Effect.provide(SystemService.layer), Effect.provide(DatabaseTest)),
)
