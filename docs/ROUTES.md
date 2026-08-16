# CB67 Labs — Route Map

File-based routing (TanStack Router). Files live in `src/routes/`; dots map to slashes.
`_admin` is a pathless layout: it applies the operator shell and does not appear in URLs.

## Public plane

| URL          | File            |
| ------------ | --------------- |
| `/`          | `index.tsx`     |
| `/docs`      | `docs.tsx`      |
| `/status`    | `status.tsx`    |
| `/changelog` | `changelog.tsx` |
| `/login`     | `login.tsx`     |

## Management plane (`_admin` layout)

| URL                         | File                                  |
| --------------------------- | ------------------------------------- |
| `/overview`                 | `_admin.overview.tsx`                 |
| `/infrastructure/hosts`     | `_admin.infrastructure.hosts.tsx`     |
| `/infrastructure/compute`   | `_admin.infrastructure.compute.tsx`   |
| `/infrastructure/storage`   | `_admin.infrastructure.storage.tsx`   |
| `/infrastructure/network`   | `_admin.infrastructure.network.tsx`   |
| `/infrastructure/services`  | `_admin.infrastructure.services.tsx`  |
| `/saas/applications`        | `_admin.saas.applications.index.tsx`  |
| `/saas/applications/$id`    | `_admin.saas.applications.$id.tsx`    |
| `/saas/instances`           | `_admin.saas.instances.tsx`           |
| `/saas/clients`             | `_admin.saas.clients.tsx`             |
| `/apis/endpoints`           | `_admin.apis.endpoints.tsx`           |
| `/apis/requests`            | `_admin.apis.requests.tsx`            |
| `/apis/errors`              | `_admin.apis.errors.tsx`              |
| `/apis/latency`             | `_admin.apis.latency.tsx`             |
| `/apis/quotas`              | `_admin.apis.quotas.tsx`              |
| `/apis/rate-limits`         | `_admin.apis.rate-limits.tsx`         |
| `/providers`                | `_admin.providers.index.tsx`          |
| `/providers/$providerId`    | `_admin.providers.$providerId.tsx`    |
| `/licensing`                | `_admin.licensing.index.tsx`          |
| `/licensing/products`       | `_admin.licensing.products.tsx`       |
| `/licensing/customers`      | `_admin.licensing.customers.tsx`      |
| `/licensing/licenses`       | `_admin.licensing.licenses.index.tsx` |
| `/licensing/licenses/$id`   | `_admin.licensing.licenses.$id.tsx`   |
| `/licensing/installations`  | `_admin.licensing.installations.tsx`  |
| `/licensing/leases`         | `_admin.licensing.leases.tsx`         |
| `/licensing/plans`          | `_admin.licensing.plans.tsx`          |
| `/licensing/features`       | `_admin.licensing.features.tsx`       |
| `/licensing/revocations`    | `_admin.licensing.revocations.tsx`    |
| `/identity/administrators`  | `_admin.identity.administrators.tsx`  |
| `/identity/roles`           | `_admin.identity.roles.tsx`           |
| `/identity/permissions`     | `_admin.identity.permissions.tsx`     |
| `/identity/machine-clients` | `_admin.identity.machine-clients.tsx` |
| `/identity/scopes`          | `_admin.identity.scopes.tsx`          |
| `/identity/sessions`        | `_admin.identity.sessions.tsx`        |
| `/pki/certificates`         | `_admin.pki.certificates.index.tsx`   |
| `/pki/certificates/$id`     | `_admin.pki.certificates.$id.tsx`     |
| `/pki/expiration`           | `_admin.pki.expiration.tsx`           |
| `/pki/rotation`             | `_admin.pki.rotation.tsx`             |
| `/pki/revocation`           | `_admin.pki.revocation.tsx`           |
| `/security`                 | `_admin.security.index.tsx`           |
| `/security/authentication`  | `_admin.security.authentication.tsx`  |
| `/security/authorization`   | `_admin.security.authorization.tsx`   |
| `/security/failed-attempts` | `_admin.security.failed-attempts.tsx` |
| `/security/firewall`        | `_admin.security.firewall.tsx`        |
| `/security/events`          | `_admin.security.events.tsx`          |
| `/security/sessions`        | `_admin.security.sessions.tsx`        |
| `/observability`            | `_admin.observability.index.tsx`      |
| `/observability/metrics`    | `_admin.observability.metrics.tsx`    |
| `/observability/logs`       | `_admin.observability.logs.tsx`       |
| `/observability/alerts`     | `_admin.observability.alerts.tsx`     |
| `/observability/grafana`    | `_admin.observability.grafana.tsx`    |
| `/database/health`          | `_admin.database.health.tsx`          |
| `/database/connections`     | `_admin.database.connections.tsx`     |
| `/database/performance`     | `_admin.database.performance.tsx`     |
| `/database/growth`          | `_admin.database.growth.tsx`          |
| `/backups`                  | `_admin.backups.index.tsx`            |
| `/backups/jobs`             | `_admin.backups.jobs.tsx`             |
| `/backups/history`          | `_admin.backups.history.tsx`          |
| `/backups/checksums`        | `_admin.backups.checksums.tsx`        |
| `/backups/restore-tests`    | `_admin.backups.restore-tests.tsx`    |
| `/audit`                    | `_admin.audit.tsx`                    |
| `/settings`                 | `_admin.settings.tsx`                 |

## Adding a page

1. Create `src/routes/_admin.<section>.<page>.tsx` with a matching
   `createFileRoute("/_admin/<section>/<page>")` and a `head()` with unique title/description.
2. Register the link in `src/config/navigation.ts` — the sidebar, breadcrumbs and command
   palette all read from that single model.
3. Bind data through `src/api/queries.ts`; never call the adapter directly from a component.
