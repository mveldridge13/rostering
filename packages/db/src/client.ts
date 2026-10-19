import { sql } from "drizzle-orm"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"

export type Database = PostgresJsDatabase<typeof schema>
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

/** Local Supabase (`pnpm db:start`). Production sets DATABASE_URL. */
export const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

export function createDb(url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL) {
  const client = postgres(url, { prepare: false })
  const db = drizzle({ client, schema, casing: "snake_case" })
  return { db, close: () => client.end() }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Run `fn` in a transaction scoped to one organisation. Inside it the
 * connection acts as `app_user`, so row-level security limits every query to
 * that organisation's rows, and inserts for any other organisation fail.
 *
 * All request handling must go through this. Using `db` directly bypasses
 * tenant isolation and is only for migrations, seeding and admin jobs.
 */
export async function withOrg<T>(db: Database, orgId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  if (!UUID.test(orgId)) throw new Error(`Invalid organisation id: ${orgId}`)
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role app_user`)
    await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`)
    return fn(tx)
  })
}
