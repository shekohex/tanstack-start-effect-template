import { assert, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { OpaqueTokens, PasswordHasher } from './index.js'

layer(Layer.merge(PasswordHasher.layer, OpaqueTokens.layer))((it) => {
  it.effect('hashes passwords and verifies only the original value', () =>
    Effect.gen(function* () {
      const passwords = yield* PasswordHasher
      const passwordHash = yield* passwords.hash('correct horse battery staple')

      assert.isTrue(yield* passwords.verify(passwordHash, 'correct horse battery staple'))
      assert.isFalse(yield* passwords.verify(passwordHash, 'incorrect horse battery staple'))
      assert.notInclude(passwordHash, 'correct horse battery staple')
    }),
  )

  it.effect('creates opaque session values with deterministic digests', () =>
    Effect.gen(function* () {
      const tokens = yield* OpaqueTokens
      const token = yield* tokens.create

      assert.strictEqual(token.hash, tokens.digest(token.value))
      assert.notStrictEqual(token.hash, token.value)
      assert.isAtLeast(token.value.length, 40)
    }),
  )
})
