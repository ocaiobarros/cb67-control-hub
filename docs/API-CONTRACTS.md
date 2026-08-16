# CB67 Labs — Provisional API Contracts

**Status: provisional.** These contracts were defined by the frontend to unblock UI work and
must be reviewed by the backend team. Payload shapes are the TypeScript interfaces in
`src/types/index.ts`; that file is the authoritative schema reference.

## Conventions

- Base URL from `VITE_CB67_API_BASE_URL`; no path is hardcoded elsewhere.
- `Authorization: Bearer <token>` on every management call.
- Responses are JSON objects or arrays; errors use `{ code, message, requestId }`.
- Every response carries a request identifier used for log/audit correlation.
- `range` query parameter accepts `15m | 1h | 6h | 24h | 7d | 30d`.
- Time values are ISO-8601 UTC strings. Sizes are bytes. Durations are seconds unless the
  field name says otherwise.

## Auth

| Method | Path | Returns |
| --- | --- | --- |
| POST | `/auth/login` | `AuthenticatedUser` |
| GET | `/auth/me` | `AuthenticatedUser \| null` |
| POST | `/auth/logout` | `204` |

## Overview and search

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/overview?range=` | `OverviewSnapshot` |
| GET | `/search?q=` | `SearchResult[]` |

## Infrastructure

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/infrastructure/hosts` | `Host[]` |
| GET | `/infrastructure/services` | `ServiceHealth[]` |
| GET | `/infrastructure/metrics/resources?range=` | `MetricPoint[]` (`cpu`, `memory`) |
| GET | `/infrastructure/metrics/network?range=` | `MetricPoint[]` (`rx`, `tx`) |
| GET | `/infrastructure/storage` | `MetricPoint[]` |

## SaaS and identity

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/saas/applications` | `Application[]` |
| GET | `/saas/applications/{id}` | `Application` |
| GET | `/saas/instances?applicationId=` | `Instance[]` |
| GET | `/identity/machine-clients` | `MachineClient[]` |
| GET | `/identity/scopes` | `ScopeDefinition[]` |
| GET | `/identity/administrators` | `Administrator[]` |
| GET | `/identity/roles` | `Role[]` |
| GET | `/identity/permissions` | `Permission[]` |
| GET | `/identity/sessions` | `AdminSession[]` |

## APIs

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/apis/endpoints` | `ApiEndpoint[]` |
| GET | `/apis/requests` | `ApiRequestRecord[]` |
| GET | `/apis/errors` | `ApiErrorGroup[]` |
| GET | `/apis/latency?range=` | `{ breakdown: LatencyBreakdown[]; series: MetricPoint[] }` |
| GET | `/apis/rate-limits` | `RateLimitRule[]` |
| GET | `/apis/quotas` | `QuotaRecord[]` |

## Providers

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/providers` | `Provider[]` |
| GET | `/providers/projects?providerId=` | `ProviderProject[]` |
| GET | `/providers/credentials?providerId=` | `CredentialMetadata[]` (metadata only, never secrets) |
| GET | `/providers/{id}/metrics?range=` | `MetricPoint[]` |

## Licensing

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/licensing/overview` | `LicensingOverview` |
| GET | `/licensing/products` | `LicenseProduct[]` |
| GET | `/licensing/customers` | `Customer[]` |
| GET | `/licensing/licenses` | `License[]` |
| GET | `/licensing/licenses/{id}` | `License` |
| GET | `/licensing/installations` | `Installation[]` |
| GET | `/licensing/leases` | `Lease[]` |
| GET | `/licensing/plans` | `LicensePlan[]` |
| GET | `/licensing/features` | `LicenseFeature[]` |
| GET | `/licensing/revocations` | `Revocation[]` |

## PKI and security

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/pki/certificates` | `Certificate[]` |
| GET | `/pki/certificates/{id}` | `Certificate` |
| GET | `/security/overview?range=` | `SecurityOverview` |
| GET | `/security/events` | `SecurityEvent[]` |
| GET | `/security/firewall` | `FirewallState` |

## Observability, database, backups, audit

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/observability/logs` | `LogEntry[]` |
| GET | `/observability/alerts` | `Alert[]` |
| GET | `/observability/metrics/{key}?range=` | `MetricPoint[]` |
| GET | `/database/health` | `DatabaseHealth` |
| GET | `/database/metrics?range=` | `MetricPoint[]` (`connections`, `queries`, `locks`) |
| GET | `/backups/jobs` | `BackupJob[]` |
| GET | `/backups/runs` | `BackupRun[]` |
| GET | `/backups/restore-tests` | `RestoreTest[]` |
| GET | `/audit/events` | `AuditEvent[]` |

## Public plane (unauthenticated)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/public/status` | `{ services: PublicServiceStatus[]; incidents: Incident[] }` |
| GET | `/public/changelog` | `ChangelogEntry[]` |

These two endpoints must not expose customer names, license keys, internal hostnames or
identifiers.

## Administrative actions

```
POST /actions
{ "action": "credential.rotate", "resourceId": "app_1", "payload": { } }
->  { "accepted": true, "message": "…" }
```

Action identifiers currently emitted by the UI include:
`credential.rotate`, `access.suspend`, `ratelimit.reset`, `provider.credential.rotate`,
`license.revoke`, `certificate.revoke`, `certificate.reissue`, `crl.publish`,
`session.revoke`, `alert.acknowledge`, `backup.run`, `backup.verify`.

The backend must authorize each action against the operator's role, record it in the audit
trail and reject anything it does not recognise. The frontend treats the response as an
acknowledgement, not as proof of completion.

## Pagination

Mock endpoints return full collections and the UI paginates client-side. When server-side
pagination is introduced, add `page`/`pageSize` and return
`{ items, page, pageSize, total }`; only `http-adapter.ts` and `DataTable` internals change.
