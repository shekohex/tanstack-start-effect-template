import { hash, verify } from 'argon2'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

export class PasswordHashError extends Schema.TaggedErrorClass<PasswordHashError>()(
  'PasswordHashError',
  { message: Schema.String },
) {}

export class PasswordHasher extends Context.Service<
  PasswordHasher,
  {
    readonly hash: (password: string) => Effect.Effect<string, PasswordHashError>
    readonly verify: (
      passwordHash: string,
      password: string,
    ) => Effect.Effect<boolean, PasswordHashError>
  }
>()('@app/auth/PasswordHasher') {
  static readonly layer = Layer.succeed(PasswordHasher)({
    hash: Effect.fn('PasswordHasher.hash')(function* (password) {
      return yield* Effect.tryPromise({
        try: () => hash(password, { type: 2 }),
        catch: () => PasswordHashError.make({ message: 'Unable to secure the supplied password' }),
      })
    }),
    verify: Effect.fn('PasswordHasher.verify')(function* (passwordHash, password) {
      return yield* Effect.tryPromise({
        try: () => verify(passwordHash, password),
        catch: () => PasswordHashError.make({ message: 'Unable to verify the supplied password' }),
      })
    }),
  })
}
