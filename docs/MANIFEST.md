# CB67 Labs Frontend — Delivery Manifest

## Scope

Frontend only. Two planes delivered in one application:

- **Public plane** — platform landing, documentation, status, changelog.
- **Management plane** — CB67 Labs Control Center for platform operators.
- **Observability plane** — surfaced inside the Control Center, with deep-dive links to Grafana.

Explicitly out of scope: backend services, database schema, migrations, authentication
implementation, secret storage, infrastructure automation.

## Stack

React 19 · TypeScript (strict, `exactOptionalPropertyTypes`) · Vite 7 · TanStack Router ·
TanStack Query · Tailwind CSS v4 · shadcn/ui · Recharts · Lucide · Sonner.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Configuration | `src/config/` | Environment variables, navigation model |
| Domain model | `src/types/` | Every entity the platform exposes |
| Data contract | `src/api/` | Adapter interface, HTTP adapter, query catalogue |
| Mock engine | `src/mocks/` | Deterministic seeded data for all states |
| Auth UX | `src/features/auth/` | Session context and UX-only guards |
| Theme | `src/features/theme/` | Dark/light preference |
| Primitives | `src/components/common/`, `src/components/charts/` | Tables, metrics, charts, dialogs |
| Shell | `src/components/layout/` | Sidebar, topbar, command palette, public chrome |
| Routes | `src/routes/` | One file per page, each with its own metadata |

## Documentation

| Document | Contents |
| --- | --- |
| `docs/FRONTEND-HANDOFF.md` | How the frontend is built, boundaries, how to go live |
| `docs/API-CONTRACTS.md` | Provisional endpoint and payload contracts |
| `docs/ENVIRONMENT.md` | Every environment variable and example configurations |
| `docs/DESIGN-SYSTEM.md` | Tokens, status semantics, layout and accessibility rules |
| `docs/LIQUID-MATERIAL.md` | CB67 Liquid material grades, composition order and rules |
| `docs/MOTION-SYSTEM.md` | Duration/easing scale, motion vocabulary, reduced motion |
| `docs/DESIGN-AUDIT.md` | Pre-redesign findings and the decisions taken |
| `docs/ROUTES.md` | Complete route map and how to add a page |
| `docs/MANIFEST.md` | This delivery manifest |

## Guarantees

- No backend code, no SQL, no secrets in the repository.
- No hardcoded backend URLs; all reads go through `src/config/env.ts`.
- Every screen renders without a backend (`VITE_USE_MOCK_API=true`).
- Loading, empty and error states exist on every data surface.
- Every route defines unique metadata for the browser and social previews.
- TypeScript passes with the project's strict configuration.

## Verification

```
bun install
bun run dev        # http://localhost:8080
bunx tsgo --noEmit # type check
```

## Handoff expectations for Claude Code / Codex

1. Treat `src/types/index.ts` and `docs/API-CONTRACTS.md` as the negotiation surface.
2. Implement the backend, then flip `VITE_USE_MOCK_API=false`.
3. Keep the mock adapter working — it is the frontend test harness.
4. Enforce authentication, RBAC, rate limits, quotas and auditing server-side. Nothing in
   this repository is a security control.
