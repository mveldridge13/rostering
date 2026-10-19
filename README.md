# Wattle Roster

Ratio-aware rostering for early learning centres, designed to sit alongside (or embed inside) a centre's Child Care Subsidy (CCS) software.

This is the UI foundation. All data is mock data. There is no backend or persistence yet.

```bash
pnpm dev
```

## Layout

| Path | What it is |
| --- | --- |
| `src/lib/domain/types.ts` | Domain model (centres, rooms, educators, credentials, shifts, attendance forecasts). This is the contract the engine API should produce. |
| `src/lib/domain/compliance.ts` | Pure rules: ratio coverage per half hour, credential expiry, paid hours and cost. Shared by the server and the client. |
| `src/lib/api.ts` | Data access boundary. Pages only read through here; swap the mock for the real engine API. |
| `src/lib/mock/data.ts` | Sample centre with four rooms, 20 staff, and two deliberate leave-driven ratio gaps. |
| `src/app/(app)/` | Screens: Today, Week roster, Day & ratios, Educators, Rooms, Settings. |
| `src/components/roster/` | Roster UI: week grid, shift editor sheet, room timeline, coverage strip. |
