import {
  createAdapterFactory,
  type CleanedWhere,
  type CustomAdapter,
  type JoinConfig,
} from 'better-auth/adapters'
import type { BetterAuthOptions } from 'better-auth/minimal'
import * as Cause from 'effect/Cause'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Schema from 'effect/Schema'
import * as SqlClient from 'effect/unstable/sql/SqlClient'
import type * as Statement from 'effect/unstable/sql/Statement'

class EffectSqlAdapterError extends Schema.TaggedErrorClass<EffectSqlAdapterError>()(
  'EffectSqlAdapterError',
  {
    message: Schema.String,
    operation: Schema.String,
  },
) {}

type AdapterRuntime = Context.Context<SqlClient.SqlClient>

function runPromiseWithContext<A, E>(
  runtime: AdapterRuntime,
  effect: Effect.Effect<A, E, SqlClient.SqlClient>,
) {
  return Effect.runPromiseExitWith(runtime)(effect).then((exit) =>
    Exit.isSuccess(exit) ? exit.value : Promise.reject(Cause.squash(exit.cause)),
  )
}

function adapterFailure(operation: string, message: string) {
  return EffectSqlAdapterError.make({ message, operation })
}

function assertNoJoins(operation: string, join: JoinConfig | undefined) {
  return join === undefined || Object.keys(join).length === 0
    ? Effect.void
    : Effect.fail(
        adapterFailure(operation, 'Relational joins are not enabled for application auth'),
      )
}

function comparison(sql: SqlClient.SqlClient, condition: CleanedWhere): Statement.Fragment {
  const column = sql(condition.field)
  const value = condition.value
  const insensitive = condition.mode === 'insensitive' && typeof value === 'string'

  switch (condition.operator) {
    case 'eq':
      if (value === null) return sql`${column} IS NULL`
      return insensitive ? sql`LOWER(${column}) = LOWER(${value})` : sql`${column} = ${value}`
    case 'ne':
      if (value === null) return sql`${column} IS NOT NULL`
      return insensitive ? sql`LOWER(${column}) <> LOWER(${value})` : sql`${column} <> ${value}`
    case 'lt':
      return sql`${column} < ${value}`
    case 'lte':
      return sql`${column} <= ${value}`
    case 'gt':
      return sql`${column} > ${value}`
    case 'gte':
      return sql`${column} >= ${value}`
    case 'in':
      return Array.isArray(value) && value.length > 0
        ? sql`${column} IN ${sql.in(value)}`
        : sql`FALSE`
    case 'not_in':
      return Array.isArray(value) && value.length > 0
        ? sql`${column} NOT IN ${sql.in(value)}`
        : sql`TRUE`
    case 'contains': {
      const pattern = `%${String(value)}%`
      return condition.mode === 'insensitive'
        ? sql`LOWER(${column}) LIKE LOWER(${pattern})`
        : sql`${column} LIKE ${pattern}`
    }
    case 'starts_with': {
      const pattern = `${String(value)}%`
      return condition.mode === 'insensitive'
        ? sql`LOWER(${column}) LIKE LOWER(${pattern})`
        : sql`${column} LIKE ${pattern}`
    }
    case 'ends_with': {
      const pattern = `%${String(value)}`
      return condition.mode === 'insensitive'
        ? sql`LOWER(${column}) LIKE LOWER(${pattern})`
        : sql`${column} LIKE ${pattern}`
    }
  }
  return sql`FALSE`
}

function whereClause(sql: SqlClient.SqlClient, conditions: ReadonlyArray<CleanedWhere>) {
  const first = conditions[0]
  if (first === undefined) return sql`TRUE`

  let clause = comparison(sql, first)
  for (const condition of conditions.slice(1)) {
    const next = comparison(sql, condition)
    clause =
      condition.connector === 'OR' ? sql`(${clause} OR ${next})` : sql`(${clause} AND ${next})`
  }
  return clause
}

function selection(sql: SqlClient.SqlClient, fields: ReadonlyArray<string> | undefined) {
  return fields === undefined || fields.length === 0
    ? sql.literal('*')
    : sql.csv(fields.map((field) => sql`${sql(field)}`))
}

function makeCustomAdapter(runtime: AdapterRuntime): CustomAdapter {
  const runPromise = <A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>) =>
    runPromiseWithContext(runtime, effect)

  function create<T extends Record<string, unknown>>(input: {
    readonly data: T
    readonly model: string
    readonly select?: string[] | undefined
  }): Promise<T>
  function create(input: {
    readonly data: Record<string, unknown>
    readonly model: string
    readonly select?: string[] | undefined
  }): Promise<Record<string, unknown>> {
    return runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<Record<string, unknown>>`
          INSERT INTO ${sql(input.model)} ${sql.insert(input.data)}
          RETURNING ${selection(sql, input.select)}
        `
        const row = rows[0]
        if (row === undefined) {
          return yield* adapterFailure('create', `Insert into ${input.model} returned no row`)
        }
        return row
      }),
    )
  }

  function findOne<T>(input: {
    readonly join?: JoinConfig | undefined
    readonly model: string
    readonly select?: string[] | undefined
    readonly where: CleanedWhere[]
  }): Promise<T | null>
  function findOne(input: {
    readonly join?: JoinConfig | undefined
    readonly model: string
    readonly select?: string[] | undefined
    readonly where: CleanedWhere[]
  }): Promise<unknown> {
    return runPromise(
      Effect.gen(function* () {
        yield* assertNoJoins('findOne', input.join)
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<Record<string, unknown>>`
          SELECT ${selection(sql, input.select)}
          FROM ${sql(input.model)}
          WHERE ${whereClause(sql, input.where)}
          LIMIT 1
        `
        return rows[0] ?? null
      }),
    )
  }

  function findMany<T>(input: {
    readonly join?: JoinConfig | undefined
    readonly limit: number
    readonly model: string
    readonly offset?: number | undefined
    readonly select?: string[] | undefined
    readonly sortBy?: { readonly direction: 'asc' | 'desc'; readonly field: string } | undefined
    readonly where?: CleanedWhere[] | undefined
  }): Promise<T[]>
  function findMany(input: {
    readonly join?: JoinConfig | undefined
    readonly limit: number
    readonly model: string
    readonly offset?: number | undefined
    readonly select?: string[] | undefined
    readonly sortBy?: { readonly direction: 'asc' | 'desc'; readonly field: string } | undefined
    readonly where?: CleanedWhere[] | undefined
  }): Promise<ReadonlyArray<unknown>> {
    return runPromise(
      Effect.gen(function* () {
        yield* assertNoJoins('findMany', input.join)
        const sql = yield* SqlClient.SqlClient
        const order = input.sortBy
          ? sql`ORDER BY ${sql(input.sortBy.field)} ${sql.literal(input.sortBy.direction)}`
          : sql.literal('')
        return yield* sql<Record<string, unknown>>`
          SELECT ${selection(sql, input.select)}
          FROM ${sql(input.model)}
          WHERE ${whereClause(sql, input.where ?? [])}
          ${order}
          LIMIT ${input.limit}
          OFFSET ${input.offset ?? 0}
        `
      }),
    )
  }

  function update<T>(input: {
    readonly model: string
    readonly update: T
    readonly where: CleanedWhere[]
  }): Promise<T | null>
  function update(input: {
    readonly model: string
    readonly update: Record<string, unknown>
    readonly where: CleanedWhere[]
  }): Promise<unknown> {
    return runPromise(
      Effect.gen(function* () {
        if (input.where.length === 0) return null
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<Record<string, unknown>>`
          UPDATE ${sql(input.model)}
          SET ${sql.update(input.update)}
          WHERE ctid IN (
            SELECT ctid FROM ${sql(input.model)}
            WHERE ${whereClause(sql, input.where)}
            LIMIT 1
          )
          RETURNING *
        `
        return rows[0] ?? null
      }),
    )
  }

  const updateMany: CustomAdapter['updateMany'] = (input) =>
    runPromise(
      Effect.gen(function* () {
        if (input.where.length === 0) return 0
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<Record<string, unknown>>`
          UPDATE ${sql(input.model)}
          SET ${sql.update(input.update)}
          WHERE ${whereClause(sql, input.where)}
          RETURNING 1
        `
        return rows.length
      }),
    )

  const deleteOne: CustomAdapter['delete'] = (input) =>
    runPromise(
      Effect.gen(function* () {
        if (input.where.length === 0) return
        const sql = yield* SqlClient.SqlClient
        yield* sql`
          DELETE FROM ${sql(input.model)}
          WHERE ctid IN (
            SELECT ctid FROM ${sql(input.model)}
            WHERE ${whereClause(sql, input.where)}
            LIMIT 1
          )
        `
      }),
    )

  const deleteMany: CustomAdapter['deleteMany'] = (input) =>
    runPromise(
      Effect.gen(function* () {
        if (input.where.length === 0) return 0
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<Record<string, unknown>>`
          DELETE FROM ${sql(input.model)}
          WHERE ${whereClause(sql, input.where)}
          RETURNING 1
        `
        return rows.length
      }),
    )

  function consumeOne<T>(input: {
    readonly model: string
    readonly where: CleanedWhere[]
  }): Promise<T | null>
  function consumeOne(input: {
    readonly model: string
    readonly where: CleanedWhere[]
  }): Promise<unknown> {
    return runPromise(
      Effect.gen(function* () {
        if (input.where.length === 0) return null
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<Record<string, unknown>>`
          DELETE FROM ${sql(input.model)}
          WHERE ctid IN (
            SELECT ctid FROM ${sql(input.model)}
            WHERE ${whereClause(sql, input.where)}
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          RETURNING *
        `
        return rows[0] ?? null
      }),
    )
  }

  function incrementOne<T>(input: {
    readonly increment: Record<string, number>
    readonly model: string
    readonly set?: Record<string, unknown> | undefined
    readonly where: CleanedWhere[]
  }): Promise<T | null>
  function incrementOne(input: {
    readonly increment: Record<string, number>
    readonly model: string
    readonly set?: Record<string, unknown> | undefined
    readonly where: CleanedWhere[]
  }): Promise<unknown> {
    return runPromise(
      Effect.gen(function* () {
        if (input.where.length === 0) return null
        const sql = yield* SqlClient.SqlClient
        const increments = Object.entries(input.increment).map(
          ([field, delta]) => sql`${sql(field)} = ${sql(field)} + ${delta}`,
        )
        const assignments = input.set
          ? Object.entries(input.set).map(([field, value]) => sql`${sql(field)} = ${value}`)
          : []
        const rows = yield* sql<Record<string, unknown>>`
          UPDATE ${sql(input.model)}
          SET ${sql.csv([...increments, ...assignments])}
          WHERE ctid IN (
            SELECT ctid FROM ${sql(input.model)}
            WHERE ${whereClause(sql, input.where)}
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          RETURNING *
        `
        return rows[0] ?? null
      }),
    )
  }

  const count: CustomAdapter['count'] = (input) =>
    runPromise(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql<{ readonly count: string }>`
          SELECT COUNT(*)::text AS count
          FROM ${sql(input.model)}
          WHERE ${whereClause(sql, input.where ?? [])}
        `
        return Number(rows[0]?.count ?? 0)
      }),
    )

  return {
    count,
    create,
    delete: deleteOne,
    deleteMany,
    consumeOne,
    findMany,
    findOne,
    incrementOne,
    update,
    updateMany,
  }
}

export function makeEffectSqlAdapter(runtime: AdapterRuntime) {
  return (options: BetterAuthOptions) =>
    createAdapterFactory({
      adapter: () => makeCustomAdapter(runtime),
      config: {
        adapterId: 'effect-sql',
        adapterName: 'Effect SQL',
        supportsArrays: true,
        supportsBooleans: true,
        supportsDates: true,
        supportsJSON: true,
        supportsNumericIds: false,
        supportsUUIDs: false,
        transaction: (callback) =>
          runPromiseWithContext(
            runtime,
            Effect.gen(function* () {
              const sql = yield* SqlClient.SqlClient
              return yield* sql.withTransaction(
                Effect.gen(function* () {
                  const transactionRuntime = yield* Effect.context<SqlClient.SqlClient>()
                  const transactionAdapter = createAdapterFactory({
                    adapter: () => makeCustomAdapter(transactionRuntime),
                    config: {
                      adapterId: 'effect-sql-transaction',
                      supportsArrays: true,
                      supportsBooleans: true,
                      supportsDates: true,
                      supportsJSON: true,
                      supportsNumericIds: false,
                      supportsUUIDs: false,
                      transaction: false,
                    },
                  })(options)
                  return yield* Effect.tryPromise({
                    try: () => callback(transactionAdapter),
                    catch: (cause) => cause,
                  })
                }),
              )
            }),
          ),
      },
    })(options)
}
