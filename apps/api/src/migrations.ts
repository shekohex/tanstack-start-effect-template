import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { PgMigrator } from '@effect/sql-pg'
import { AppConfig } from '@app/config'
import { Effect, Layer } from 'effect'
import { SqlClient } from 'effect/unstable/sql/SqlClient'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { makeDatabaseLayer } from './database.js'

type SqlMigration = {
  readonly checksum: string
  readonly id: number
  readonly name: string
  readonly sql: string
}

type MigrationRow = {
  readonly checksum: string | null
  readonly migration_id: number
  readonly name: string
}

const migrationsDirectory = fileURLToPath(new URL('../../../deploy/migrations', import.meta.url))

const loadMigrations = Effect.fn('loadMigrations')(function* () {
  const fileNames = yield* Effect.tryPromise({
    try: () => fs.readdir(migrationsDirectory),
    catch: (cause) =>
      new PgMigrator.MigrationError({
        cause,
        kind: 'ImportError',
        message: `Unable to read ${migrationsDirectory}`,
      }),
  })

  const migrations = yield* Effect.forEach(
    fileNames.filter((fileName) => fileName.endsWith('.sql')).sort(),
    Effect.fn(function* (fileName): Effect.fn.Return<SqlMigration, PgMigrator.MigrationError> {
      const match = /^(\d+)_([a-z0-9_]+)\.sql$/.exec(fileName)
      const idText = match?.[1]
      const name = match?.[2]

      if (idText === undefined || name === undefined) {
        return yield* new PgMigrator.MigrationError({
          kind: 'ImportError',
          message: `Invalid migration file name: ${fileName}`,
        })
      }

      const sql = yield* Effect.tryPromise({
        try: () => fs.readFile(path.join(migrationsDirectory, fileName), 'utf8'),
        catch: (cause) =>
          new PgMigrator.MigrationError({
            cause,
            kind: 'ImportError',
            message: `Unable to read migration ${fileName}`,
          }),
      })

      return {
        checksum: createHash('sha256').update(sql).digest('hex'),
        id: Number.parseInt(idText, 10),
        name,
        sql,
      }
    }),
  )

  const ids = new Set<number>()
  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      return yield* new PgMigrator.MigrationError({
        kind: 'Duplicates',
        message: `Duplicate migration id ${migration.id}`,
      })
    }
    ids.add(migration.id)
  }

  return migrations
})

const validateChecksums = Effect.fn('validateChecksums')(function* (
  migrations: readonly SqlMigration[],
) {
  const sql = yield* SqlClient
  const table = yield* sql<{ exists: boolean }>`
    SELECT to_regclass('app_schema_migrations') IS NOT NULL AS exists
  `

  if (table[0]?.exists !== true) return

  const checksumColumn = yield* sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'app_schema_migrations'
        AND column_name = 'checksum'
    ) AS exists
  `

  if (checksumColumn[0]?.exists !== true) return

  const applied = yield* sql<MigrationRow>`
    SELECT migration_id, name, checksum
    FROM app_schema_migrations
    ORDER BY migration_id
  `
  const available = new Map(migrations.map((migration) => [migration.id, migration]))

  for (const row of applied) {
    const migration = available.get(row.migration_id)
    if (migration === undefined || migration.name !== row.name) {
      return yield* new PgMigrator.MigrationError({
        kind: 'BadState',
        message: `Applied migration ${row.migration_id}_${row.name} is missing or renamed`,
      })
    }
    if (row.checksum !== migration.checksum) {
      return yield* new PgMigrator.MigrationError({
        kind: 'BadState',
        message: `Applied migration ${row.migration_id}_${row.name} was modified`,
      })
    }
  }
})

const migrate = Effect.fn('migrate')(function* () {
  const migrations = yield* loadMigrations()
  yield* validateChecksums(migrations)
  const sql = yield* SqlClient
  const applied = yield* sql.withTransaction(
    Effect.gen(function* () {
      yield* sql.unsafe(`
        CREATE TABLE IF NOT EXISTS app_schema_migrations (
          migration_id integer PRIMARY KEY,
          created_at timestamptz NOT NULL DEFAULT now(),
          name text NOT NULL,
          checksum text
        )
      `)
      yield* sql`LOCK TABLE app_schema_migrations IN ACCESS EXCLUSIVE MODE`
      yield* sql.unsafe('ALTER TABLE app_schema_migrations ADD COLUMN IF NOT EXISTS checksum text')

      const existing = yield* sql<MigrationRow>`
        SELECT migration_id, name, checksum
        FROM app_schema_migrations
        ORDER BY migration_id
      `
      const existingById = new Map(existing.map((migration) => [migration.migration_id, migration]))
      const newlyApplied: Array<readonly [number, string]> = []

      for (const migration of migrations) {
        const current = existingById.get(migration.id)
        if (current !== undefined) {
          yield* sql.unsafe(
            'UPDATE app_schema_migrations SET checksum = $1 WHERE migration_id = $2 AND checksum IS NULL',
            [migration.checksum, migration.id],
          )
          continue
        }

        yield* sql.unsafe(migration.sql)
        yield* sql.unsafe(
          `INSERT INTO app_schema_migrations (migration_id, name, checksum)
           VALUES ($1, $2, $3)`,
          [migration.id, migration.name, migration.checksum],
        )
        newlyApplied.push([migration.id, migration.name])
      }

      yield* sql.unsafe('ALTER TABLE app_schema_migrations ALTER COLUMN checksum SET NOT NULL')
      return newlyApplied
    }),
  )

  yield* Effect.logInfo('Database migrations complete', { applied })
})

const status = Effect.fn('migrationStatus')(function* () {
  const migrations = yield* loadMigrations()
  yield* validateChecksums(migrations)
  const sql = yield* SqlClient
  const applied = yield* sql<MigrationRow>`
    SELECT migration_id, name, checksum
    FROM app_schema_migrations
    ORDER BY migration_id
  `

  yield* Effect.logInfo('Database migration status', {
    applied: applied.length,
    available: migrations.length,
  })
})

const command = process.argv[2]
const program = command === 'status' ? status() : migrate()
const DatabaseLive = Layer.unwrap(
  Effect.map(AppConfig, (config) => makeDatabaseLayer(config.databaseUrl)),
)
const RuntimeLive = Layer.mergeAll(DatabaseLive, NodeServices.layer).pipe(
  Layer.provide(AppConfig.layer),
)

program.pipe(Effect.provide(RuntimeLive), NodeRuntime.runMain)
