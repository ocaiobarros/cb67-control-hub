# CB67 Labs — Frontend Handoff

This repository contains **only the frontend** of the CB67 Labs API Platform (public plane)
and the CB67 Labs Control Center (management plane). There is no backend code here, no
database, no migrations and no server-side business logic. Everything the interface shows
comes from a provisional data contract that the backend team owns.

Target deployment: **Debian 13 on Proxmox, on-premises**, served as static assets behind the
platform reverse proxy.

## What is implemented

- Public plane: landing page (`/`), documentation (`/docs`), status (`/status`), changelog (`/changelog`).
- Operator sign-in (`/login`) — UX only, no credential validation in the frontend.
- Control Center (`/_admin/*`) covering Overview, Infrastructure, SaaS, APIs, Providers,
  Licensing, Identity & Access, PKI, Security, Observability, Database, Backups, Audit, Settings.
- A deterministic mock data layer so every screen renders realistic states (healthy, degraded,
  expiring, revoked, throttled, failed) without a backend.

## Architecture in one paragraph

Components never call `fetch`. They consume TanStack Query options from `src/api/queries.ts`,
which call a single `PlatformAdapter` (`src/api/adapter.ts`). Two implementations exist:
`src/mocks/adapter.ts` (default) and `src/api/http-adapter.ts` (inactive, ready for the real
backend). Switching is one environment variable — no component changes.

```
route/component  ->  q.<query>()  ->  PlatformAdapter  ->  MockAdapter | HttpAdapter
```

## Going live

1. Implement the endpoints in `docs/API-CONTRACTS.md`.
2. Set `VITE_USE_MOCK_API=false` and `VITE_CB67_API_BASE_URL=https://…`.
3. Reconcile response shapes with `src/types/index.ts`; adjust `http-adapter.ts` mapping only.

## Non-negotiable boundaries

- **No backend in this repo.** No ORM, no SQL, no secrets, no server-side auth.
- **No hardcoded backend addresses.** All URLs come from `src/config/env.ts`.
- **Frontend guards are UX only.** `ProtectedRoute`, `PermissionGuard` and `Permitted` hide
  controls; the backend must enforce authentication, RBAC and every destructive action.
- **Destructive actions are requests, not executions.** They funnel through
  `useAdminAction()` → `adapter.performAction()` and must be authorized, audited and applied
  server-side.
- **No customer data on the public plane.** `/status` and `/changelog` publish state only.

## Where to change what

| Need | File |
| --- | --- |
| Add a backend call | `src/api/adapter.ts`, `src/api/http-adapter.ts`, `src/api/queries.ts` |
| Change a domain shape | `src/types/index.ts` |
| Add a page | `src/routes/_admin.<section>.<page>.tsx` + `src/config/navigation.ts` |
| Change tokens/theme | `src/styles.css` |
| Change runtime config | `src/config/env.ts` (env vars only) |
| Adjust mock scenarios | `src/mocks/data.ts` |

## Known gaps for the backend team

- Per-consumer database connection counters are illustrative (`/database/connections`).
- Database growth trend is derived from current size; a real series is needed.
- Grafana dashboard slugs must match the provisioned dashboards.
- `performAction` accepts every request in mock mode; real authorization is pending.
