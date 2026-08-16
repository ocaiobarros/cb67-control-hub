# CB67 Liquid Interface — Final Visual Acceptance Gate

Scope: visual, interaction and motion acceptance only. No routes, contracts,
scopes, permissions, mock structure or backend were touched.

Method: automated browser sweep (Chromium, mock session) over every route in
`docs/ROUTES.md` — 134 route/theme captures — plus targeted interaction,
responsive and reduced-motion passes. Typecheck and production build run after
the last refinement.

## 1. Surface acceptance — Control Center

| Section                                                                                                       | Light | Dark | Notes                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------------------------------------------------- |
| Overview                                                                                                      | PASS  | PASS | Provider latency corrected to a time-series read; donut legend legible in both themes |
| Infrastructure (hosts, compute, storage, network)                                                             | PASS  | PASS | Node tables and utilisation charts hold contrast at 13% border opacity                |
| SaaS (applications, detail, instances, clients)                                                               | PASS  | PASS | Detail tabs, credential panels, rotation modal verified                               |
| APIs (endpoints, requests, errors, latency, rate limits, quotas)                                              | PASS  | PASS | Method/status badges keep tone separation on glass                                    |
| Providers (index, detail)                                                                                     | PASS  | PASS |                                                                                       |
| Licensing (index, products, plans, customers, licences, detail, installations, leases, features, revocations) | PASS  | PASS | Status ladder active/grace/suspended/pending/revoked/expired all distinguishable      |
| Identity & Access (administrators, roles, permissions, scopes, sessions, machine clients)                     | PASS  | PASS | Permission matrix readable at tablet width                                            |
| PKI (certificates, detail, expiration, rotation, revocation)                                                  | PASS  | PASS | Fingerprint mono blocks aligned                                                       |
| Security (index, authentication, authorization, events, failed attempts, firewall, sessions)                  | PASS  | PASS | Critical surfaces use `crit` tone, not raw red fills                                  |
| Observability (index, metrics, logs, alerts, grafana)                                                         | PASS  | PASS | Log level chips and correlation IDs legible                                           |
| Database (health, connections, performance, growth)                                                           | PASS  | PASS |                                                                                       |
| Backups (index, jobs, history, checksums, restore tests)                                                      | PASS  | PASS |                                                                                       |
| Audit                                                                                                         | PASS  | PASS |                                                                                       |
| Settings                                                                                                      | PASS  | PASS |                                                                                       |

## 2. Surface acceptance — Public plane

`/`, `/login`, `/docs`, `/status`, `/changelog` — PASS in both themes. Public
chrome uses the same material grades as the Control Center, at lower density.

## 3. Component acceptance

Sidebar, nested navigation and selection marker, mobile drawer, topbar,
scroll-adaptive chrome, global search button, command palette, buttons and icon
buttons, segmented time-range control, tabs, inputs, selects, dropdown menus,
popovers, tooltips, dialogs, destructive confirmation dialogs, sheets, toasts,
alerts, table search, column visibility, sorting, pagination, theme switch —
all PASS. No component still renders the stock Shadcn material.

State coverage: loading (skeleton shimmer), empty, error, and populated states
verified on tables and chart panels.

## 4. Motion acceptance

PASS. Route reveal (keyed content enter), sidebar and drawer choreography,
selected-navigation transition, modal and popover entrance/exit, tooltip fade,
button press compression, card hover depth, status transitions, chart
introduction and metric value settle all resolve on the documented easing and
duration scale in `docs/MOTION-SYSTEM.md`.

Chart animation now runs through a single motion hook so Recharts honours the
reduced-motion preference instead of animating unconditionally.

## 5. Liquid material acceptance

PASS across the eight grades: canvas, content surface, elevated content,
navigation glass, floating glass, overlay, modal, critical surface. Hierarchy
holds without any surface collapsing into its neighbour.

## 6. Pointer / optical acceptance

PASS. Pointer-reactive illumination and specular highlight track the cursor on
metric and glass cards, edge light defines rims on raised surfaces, and hover
depth shift stays subtle. All optical effects are suppressed under reduced
motion.

## 7. Theme audit

Light mode: no washed glass, no grey-on-grey body copy, no vanishing borders,
no flat white plane, no heavy shadows, charts contrast-checked. Border grades
raised to 13% / 22%, secondary and tertiary text darkened, chart strokes
deepened, and the content plane given a faint cool body.

Dark mode: no pure black, no indistinguishable surfaces, no excessive glow, no
neon/cyberpunk read, charts legible.

## 8. Performance

PASS. Blur is applied only on the defined material grades, never nested;
shadows are token-driven; gradients are static; pointer tracking writes two CSS
custom properties without React state; animations are transform/opacity only.

## 9. Reduced motion

PASS. `prefers-reduced-motion: reduce` removes decorative animation (content
reveal, value settle, status pulse, shimmer) and collapses transitions to a
near-instant tonal change, so feedback survives without movement.

## 10. Responsive

PASS at large desktop (1920), notebook (1440), tablet (834) and mobile (390).
Tables reflow, the sidebar becomes a drawer, and headers wrap without clipping.

## 11. Regression

- Routes changed: NO
- API contracts changed: NO
- Scopes changed: NO
- Permissions changed: NO
- Mock adapter changed structurally: NO
- Backend added: NO
- Localisation added: NO (English retained, as instructed)

## 12. Quality gates

- Typecheck: PASS (no diagnostics)
- Production build: PASS
- Browser validation: PASS (no console errors, no page errors across the sweep)

---

**CB67 LIQUID INTERFACE — FINAL VISUAL ACCEPTANCE: PASS**
