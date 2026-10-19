import { defineConfig } from "drizzle-kit"

// Migrations are generated as SQL into Supabase's migrations folder so the
// Supabase CLI applies them locally (`pnpm db:reset`) and in production.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "../../supabase/migrations",
  casing: "snake_case",
  schemaFilter: ["app"],
  entities: { roles: { provider: "supabase", include: ["app_user"] } },
  migrations: { prefix: "supabase" },
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" },
})
