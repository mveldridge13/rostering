# Roster

Ratio-aware rostering for early learning centres: a standalone platform with a public API so Child Care Subsidy (CCS) software and other apps can integrate.

The database is in place. The UI is not connected to it yet, so screens are empty until the API is built (demo data lives in the database seed).

```bash
pnpm install
pnpm db:start   # local Supabase in Docker (first run downloads images)
pnpm db:seed    # demo centre: 4 rooms, 20 staff, 65 children, 5 weeks of rosters
pnpm dev        # web app on http://localhost:3100
pnpm test       # domain rules + database tenancy tests (needs db:start)
pnpm typecheck
pnpm lint
pnpm build
```

## Database

Postgres via Supabase: local in Docker for development, Supabase (Sydney) in production. Browse it in Supabase Studio at http://127.0.0.1:54323 (schema `app`).

- **Schema** is defined in `packages/db/src/schema.ts` with Drizzle. After changing it, run `pnpm db:generate` to write a SQL migration into `supabase/migrations/`, then `pnpm db:reset` to rebuild and reseed the local database.
- **Tenant isolation**: every row belongs to an organisation (`org_id`). The API runs each request inside `withOrg(db, orgId, fn)`, which switches to the `app_user` role so Postgres row-level security hides every other organisation's data. Foreign keys include `org_id`, so rows can't point across organisations either. `packages/db/src/tenancy.test.ts` proves this.
- **Not exposed**: the `app` schema is invisible to Supabase's auto-generated Data API. Only our own API can reach the data.
- **Audit log** is append-only at the database level.
- **Conventions**: times of day are minutes since midnight in the centre's time zone, dates are local calendar dates, money is in cents.

## Layout

pnpm workspaces + Turborepo. Frontend and backend code live in separate packages, and dependencies enforce the boundary: `apps/web` may only depend on the shared packages.

| Path | Tier | What it is |
| --- | --- | --- |
| `apps/web` | Frontend | Next.js UI. No database access, no secrets, no business decisions. |
| `packages/domain` | Shared | Pure rules: NQF ratio coverage per half hour, credential expiry, paid hours and cost. The frontend uses it for live preview; the backend uses it as the authority. No I/O. |
| `apps/api` | Backend | *Planned.* HTTP API (`/v1`), auth, validation. |
| `packages/core` | Backend | *Planned.* Services: rosters, shifts, publishing, imports, permissions, audit log. |
| `packages/db` | Backend | Postgres schema, migrations, tenant-scoped connection, seed data. |
| `packages/contracts` | Shared | *Planned.* API request/response schemas and the typed client the frontend uses. |

Inside `apps/web`:

| Path | What it is |
| --- | --- |
| `src/lib/api.ts` | The only place pages get data from. Returns empty data until it calls the API. |
| `src/components/not-connected.tsx` | Temporary "Not connected" markers showing what each screen still needs from the backend. Remove each as it is wired up. |
| `src/app/(app)/` | Screens: Today, Week roster, Day & ratios, Team, Rooms, Settings. |
| `src/components/roster/` | Roster UI: week grid, shift editor sheet, room timeline, coverage strip. |
