# Wattle Roster

Ratio-aware rostering for early learning centres: a standalone platform with a public API so Child Care Subsidy (CCS) software and other apps can integrate.

The UI still runs on mock data. The backend (database, services, API) is being built next.

```bash
pnpm install
pnpm dev        # web app on http://localhost:3100
pnpm test       # domain rule tests
pnpm typecheck
pnpm lint
pnpm build
```

## Layout

pnpm workspaces + Turborepo. Frontend and backend code live in separate packages, and dependencies enforce the boundary: `apps/web` may only depend on the shared packages.

| Path | Tier | What it is |
| --- | --- | --- |
| `apps/web` | Frontend | Next.js UI. No database access, no secrets, no business decisions. |
| `packages/domain` | Shared | Pure rules: NQF ratio coverage per half hour, credential expiry, paid hours and cost. The frontend uses it for live preview; the backend uses it as the authority. No I/O. |
| `apps/api` | Backend | *Planned.* HTTP API (`/v1`), auth, validation. |
| `packages/core` | Backend | *Planned.* Services: rosters, shifts, publishing, imports, permissions, audit log. |
| `packages/db` | Backend | *Planned.* Postgres schema and migrations (Supabase). |
| `packages/contracts` | Shared | *Planned.* API request/response schemas and the typed client the frontend uses. |

Inside `apps/web`:

| Path | What it is |
| --- | --- |
| `src/lib/api.ts` | The only place pages get data from. It will switch from mock data to the typed API client. |
| `src/lib/mock/data.ts` | Temporary sample centre (four rooms, 20 staff, two leave-driven ratio gaps). Becomes database seed data, then is removed from the frontend. |
| `src/app/(app)/` | Screens: Today, Week roster, Day & ratios, Team, Rooms, Settings. |
| `src/components/roster/` | Roster UI: week grid, shift editor sheet, room timeline, coverage strip. |
