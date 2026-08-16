# CB67 Labs — Frontend Handoff

This repository contains **only the frontend** of the CB67 Labs API Platform (public plane)
and the CB67 Labs Control Center (management plane). There is no backend code here, no
database, no migrations and no server-side business logic. Everything the interface shows
comes from a provisional data contract that the backend team owns.

## Deployment target

**Self-hosted Node/Nitro SSR on Debian 13, behind the platform reverse proxy.**

An earlier revision of this document said "static assets". That was inaccurate:
the build produces a **Nitro server bundle** with a TanStack Start server entry
(`src/server.ts`), and Nitro's default preset in this configuration is
**Cloudflare** — which emitted `wrangler.json` and would have shipped a
Cloudflare worker into a platform whose whole premise is self-hosting.

Build with:

```
NITRO_PRESET=node-server bun run build
node .output/server/index.mjs
```

Verified on Debian 13: `nitro.json` reports `"preset": "node-server"`, no
`wrangler.json` or `.wrangler/` is emitted, the server serves `200` on `/`,
`/status`, `/docs` and `/overview`, returns a correct `404` on unknown routes,
renders real server-side HTML in `pt-BR`, makes zero external font requests, and
occupies roughly **84 MiB RSS**.

It runs as a systemd service under a dedicated non-root user with `MemoryMax`
and `CPUQuota`, bound to loopback behind the reverse proxy. It is a long-running
process, not a static directory — that difference determines its service user,
resource budget, patch surface and failure modes.

Verified on the platform host: service active and enabled, HTTP 200 on `/` and
`/observability/prometheus`, correct 404 on removed routes, survives `restart`,
and after `kill -9` systemd restarts it automatically and it serves 200 again.
Resident memory ~25 MiB against a 256 MiB cap.

**Still owed by the deployment sprint**, and not claimed here: reverse-proxy
routing and upstream timeouts, health/readiness endpoints, log retention policy,
reboot recovery proof, rollback to a previous build artifact, and a pinned
runtime decision.

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

| Need                  | File                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| Add a backend call    | `src/api/adapter.ts`, `src/api/http-adapter.ts`, `src/api/queries.ts` |
| Change a domain shape | `src/types/index.ts`                                                  |
| Add a page            | `src/routes/_admin.<section>.<page>.tsx` + `src/config/navigation.ts` |
| Change tokens/theme   | `src/styles.css`                                                      |
| Change runtime config | `src/config/env.ts` (env vars only)                                   |
| Adjust mock scenarios | `src/mocks/data.ts`                                                   |

## Known gaps for the backend team

- Per-consumer database connection counters are illustrative (`/database/connections`).
- Database growth trend is derived from current size; a real series is needed.
- ~~Grafana dashboard slugs must match the provisioned dashboards.~~ **Obsolete** —
  Grafana is not deployed (D-010). The observability surface is fed by Prometheus
  and Alertmanager (D-018), so there are no dashboard slugs to match.
- `performAction` accepts every request in mock mode; real authorization is pending.

## Localization

```
default_locale: pt-BR
locale: pt-BR
```

The UI is fully localised to Brazilian Portuguese. Error surfaces, destructive
dialogs, toasts and accessibility labels are included — not just page copy.

Date and number formatting lives in `src/utils/format.ts` (`dd/MM/yyyy`,
`dd/MM/yyyy HH:mm`). Adding a `toLocaleString()` call elsewhere reintroduces
browser-locale drift and should be rejected in review.

Known exception: `src/components/ui/calendar.tsx` passes `"pt-BR"` explicitly to
`toLocaleString`/`toLocaleDateString` because react-day-picker hands it `Date`
objects. Explicit locale, so no drift — but it is outside the shared layer and
is documented rather than hidden.
