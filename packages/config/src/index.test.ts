import { assert, it } from '@effect/vitest'
import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'

import { AppConfig } from './index.js'

it.effect('provides deterministic development defaults', () =>
  Effect.gen(function* () {
    const config = yield* AppConfig
    assert.strictEqual(config.apiPort, 4100)
    assert.strictEqual(config.authCookiePrefix, 'app')
    assert.deepStrictEqual(config.allowedOrigins, ['http://localhost:3000'])
  }).pipe(
    Effect.provide(AppConfig.layer),
    Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromUnknown({})),
  ),
)
