import * as PgClient from '@effect/sql-pg/PgClient'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Redacted from 'effect/Redacted'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import type * as SqlError from 'effect/unstable/sql/SqlError'

export function makeDatabaseLayer(databaseUrl: string) {
  return PgClient.layer({
    applicationName: 'app-api',
    url: Redacted.make(databaseUrl),
  })
}

export class Database extends Context.Service<
  Database,
  {
    readonly check: Effect.Effect<void, SqlError.SqlError>
  }
>()('@app/api/Database') {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      return Database.of({
        check: sql`SELECT 1`.pipe(Effect.asVoid),
      })
    }),
  )
}
