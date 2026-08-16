# CB67 Labs — Provisional API Contracts

**Status: provisional.** These contracts were defined by the frontend to unblock UI work and
must be reviewed by the backend team. Payload shapes are the TypeScript interfaces in
`src/types/index.ts`; that file is the authoritative schema reference.

## Conventions

- Base URL from `VITE_CB67_API_BASE_URL`; no path is hardcoded elsewhere.
- **Session: HttpOnly cookie**, sent with `credentials: "include"`. No bearer
  token, and no token in `localStorage` or `sessionStorage`.
- Responses are JSON objects or arrays; errors use `{ code, message, requestId }`.
- Every response carries a request identifier used for log/audit correlation.
- `range` query parameter accepts `15m | 1h | 6h | 24h | 7d | 30d`.
- Time values are ISO-8601 UTC strings. Sizes are bytes. Durations are seconds unless the
  field name says otherwise.

## Auth

The browser admin plane uses **HttpOnly cookie sessions**, not bearer tokens.

An earlier revision of this document specified `Authorization: Bearer <token>`
while `src/api/http-adapter.ts` sent `credentials: "include"`. Those are
different security models and the backend cannot satisfy both by implication.
The cookie model is authoritative (platform decision D-017); this document was
the side that was wrong.

**Why cookies for a browser admin plane:** the session is unreachable from
JavaScript, so an XSS in the Control Center cannot exfiltrate it. A bearer token
held in JS is readable by any injected script — a poor property for a plane that
issues and revokes licences.

**Machine-to-machine traffic does not use this.** SaaS instances authenticate
with mTLS client certificates. The two planes have different threat models and
deliberately different mechanisms.

| Method | Path           | Returns                      |
| ------ | -------------- | ---------------------------- |
| POST   | `/auth/login`  | `AuthenticatedUser`          |
| GET    | `/auth/me`     | `AuthenticatedUser \| null`  |
| POST   | `/auth/logout` | `204`                        |
| GET    | `/auth/csrf`   | `{ token }` — see CSRF below |

### Cookie attributes the backend must set

| Attribute  | Value    | Reason                              |
| ---------- | -------- | ----------------------------------- |
| `HttpOnly` | always   | JavaScript cannot read the session  |
| `Secure`   | always   | TLS only                            |
| `SameSite` | `Strict` | admin plane has no cross-site flows |
| `Path`     | `/`      | —                                   |

### CSRF — the wire contract

Cookies are attached by the browser automatically, so a cross-origin page can
trigger authenticated requests. The token below closes that hole. This section
is the **normative wire contract** — frontend and backend must not have to guess.

**Token issuance**

```
GET /v1/admin/auth/csrf
200 → { "token": "<opaque string>" }
```

- The token is **session-bound**. A token issued for one session is invalid for
  any other.
- It is returned in the JSON body, never in a JavaScript-readable cookie.
- Issuing is idempotent: repeated calls within a session may return the same
  token or a rotated one; the client always uses the most recent.

**Token presentation**

- Header name: **`X-CSRF-Token`**.
- Required on `POST`, `PUT`, `PATCH`, `DELETE` — **including `/auth/login` and
  `/auth/logout`**. Login CSRF is a real attack: it can log a victim into an
  attacker's account and cause their activity to be recorded there.
- Never sent on `GET`, `HEAD` or `OPTIONS`.

**Failure and rotation**

A CSRF rejection must be distinguishable from every other `403`. The server
returns a stable, contractual code:

```
403 → { "code": "csrf_token_invalid", "message": "...", "requestId": "..." }
```

#### `csrf_token_invalid` is a pre-handler rejection — normative

The client replays a mutation on this code. That replay is only safe if the
rejected request had **no effect whatsoever**, so this is a hard requirement on
the backend, not an implementation detail:

- CSRF validation and `Origin`/`Referer` validation run **before** the operation
  handler, before any authorization-dependent mutation logic, and **before any
  database transaction is opened**.
- A request rejected with `csrf_token_invalid` performs **zero** application
  side effects: no writes, no event publication, no outbound provider call, and
  no success audit record. An audit entry recording the _rejection_ is expected
  and is not a side effect of the operation.
- The server **must never** return `csrf_token_invalid` after partial execution.
  If a CSRF problem is somehow detected mid-operation, it must be reported under
  a different code so the client does not replay.

Why this is stated so strictly: the admin plane performs destructive operations
such as licence revocation. If a partially-executed request returned this code,
the client's single retry would apply the operation twice. The strict
pre-handler guarantee is what makes automatic replay acceptable here.

Independently retryable sensitive operations should additionally accept an
**idempotency key**, so correctness does not rest on this guarantee alone. CSRF
retry itself relies on the pre-handler rule above.

Backend integration tests must prove the guarantee once the backend exists: a
request rejected with `csrf_token_invalid` leaves no row, no event and no audit
success entry behind.

- **Only** a `403` carrying `code: "csrf_token_invalid"` is retried. The client
  re-fetches the token once and replays the request once. It does not loop.
- **Every other `403` surfaces immediately and is never replayed** — insufficient
  role, missing permission, suspended administrator, policy denial, admin-network
  restriction and origin rejection all fall here. Replaying a denied privileged
  operation would corrupt the audit trail, and without server-side idempotency
  guarantees it is unsafe.
- A `403` whose body cannot be parsed is treated as an authorization denial, not
  as CSRF. Ambiguity resolves toward _not_ retrying.
- Rotation on privilege change is permitted; the retry path absorbs it.
- Multiple tabs: the token is session-bound rather than tab-bound, so tabs share
  it. A stale tab recovers through the same single retry.

**Fail closed**

If the token cannot be obtained — endpoint unreachable, non-2xx, invalid JSON,
missing/empty/non-string token, or a token beyond the accepted length — the
client raises `CsrfError` and **the mutation is never sent**. A security
prerequisite that cannot be met stops the request; it is not silently skipped.

**Login bootstrap and session rotation**

Login requires a CSRF token, but before login there is no authenticated session.
The sequence is therefore:

1. `GET /auth/csrf` establishes (or reuses) a **pre-authentication session
   cookie** and returns a token bound to it.
2. `POST /auth/login` carries that pre-authentication token in `X-CSRF-Token`.
3. On success the server **rotates the session identifier** — defeating session
   fixation — and **invalidates the pre-authentication CSRF token**.
4. The client's cached token is therefore stale by design; the next mutation
   obtains a fresh token bound to the authenticated session.
5. `POST /auth/logout` likewise requires a token, and the client clears its
   cached token afterwards so a subsequent session cannot inherit it.

**Origin validation**

The server validates `Origin` (falling back to `Referer`) on every mutation and
rejects any value outside the configured admin origin. The token and the origin
check are independent controls; both must pass.

**Client state**

The token is held **in memory only** — never `localStorage`, `sessionStorage`,
or a readable cookie — and is cleared on logout so a new session cannot reuse it.

**Also required server-side:** absolute and idle session expiry, and a new
session identifier on privilege change (session fixation).

Implemented in `src/api/http-adapter.ts`; behaviour covered by
`src/api/http-adapter.test.ts` (25 tests, weighted toward failure paths: nine
fail-closed cases each asserting zero mutation attempts; six covering 403
classification, including that an authorization 403 is _not_ retried; plus
concurrency de-duplication, body preservation across retry, and cache clearing
on login and logout).

**Frontend guards are UX only.** Authorization is enforced by the backend and
never by the client.

## Overview and search

| Method | Path               | Returns            |
| ------ | ------------------ | ------------------ |
| GET    | `/overview?range=` | `OverviewSnapshot` |
| GET    | `/search?q=`       | `SearchResult[]`   |

## Infrastructure

| Method | Path                                       | Returns                           |
| ------ | ------------------------------------------ | --------------------------------- |
| GET    | `/infrastructure/hosts`                    | `Host[]`                          |
| GET    | `/infrastructure/services`                 | `ServiceHealth[]`                 |
| GET    | `/infrastructure/metrics/resources?range=` | `MetricPoint[]` (`cpu`, `memory`) |
| GET    | `/infrastructure/metrics/network?range=`   | `MetricPoint[]` (`rx`, `tx`)      |
| GET    | `/infrastructure/storage`                  | `MetricPoint[]`                   |

## SaaS and identity

| Method | Path                             | Returns             |
| ------ | -------------------------------- | ------------------- |
| GET    | `/saas/applications`             | `Application[]`     |
| GET    | `/saas/applications/{id}`        | `Application`       |
| GET    | `/saas/instances?applicationId=` | `Instance[]`        |
| GET    | `/identity/machine-clients`      | `MachineClient[]`   |
| GET    | `/identity/scopes`               | `ScopeDefinition[]` |
| GET    | `/identity/administrators`       | `Administrator[]`   |
| GET    | `/identity/roles`                | `Role[]`            |
| GET    | `/identity/permissions`          | `Permission[]`      |
| GET    | `/identity/sessions`             | `AdminSession[]`    |

## APIs

| Method | Path                   | Returns                                                    |
| ------ | ---------------------- | ---------------------------------------------------------- |
| GET    | `/apis/endpoints`      | `ApiEndpoint[]`                                            |
| GET    | `/apis/requests`       | `ApiRequestRecord[]`                                       |
| GET    | `/apis/errors`         | `ApiErrorGroup[]`                                          |
| GET    | `/apis/latency?range=` | `{ breakdown: LatencyBreakdown[]; series: MetricPoint[] }` |
| GET    | `/apis/rate-limits`    | `RateLimitRule[]`                                          |
| GET    | `/apis/quotas`         | `QuotaRecord[]`                                            |

## Providers

| Method | Path                                 | Returns                                               |
| ------ | ------------------------------------ | ----------------------------------------------------- |
| GET    | `/providers`                         | `Provider[]`                                          |
| GET    | `/providers/projects?providerId=`    | `ProviderProject[]`                                   |
| GET    | `/providers/credentials?providerId=` | `CredentialMetadata[]` (metadata only, never secrets) |
| GET    | `/providers/{id}/metrics?range=`     | `MetricPoint[]`                                       |

## Licensing

| Method | Path                       | Returns             |
| ------ | -------------------------- | ------------------- |
| GET    | `/licensing/overview`      | `LicensingOverview` |
| GET    | `/licensing/products`      | `LicenseProduct[]`  |
| GET    | `/licensing/customers`     | `Customer[]`        |
| GET    | `/licensing/licenses`      | `License[]`         |
| GET    | `/licensing/licenses/{id}` | `License`           |
| GET    | `/licensing/installations` | `Installation[]`    |
| GET    | `/licensing/leases`        | `Lease[]`           |
| GET    | `/licensing/plans`         | `LicensePlan[]`     |
| GET    | `/licensing/features`      | `LicenseFeature[]`  |
| GET    | `/licensing/revocations`   | `Revocation[]`      |

## PKI and security

| Method | Path                        | Returns            |
| ------ | --------------------------- | ------------------ |
| GET    | `/pki/certificates`         | `Certificate[]`    |
| GET    | `/pki/certificates/{id}`    | `Certificate`      |
| GET    | `/security/overview?range=` | `SecurityOverview` |
| GET    | `/security/events`          | `SecurityEvent[]`  |
| GET    | `/security/firewall`        | `FirewallState`    |

## Observability, database, backups, audit

| Method | Path                                  | Returns                                             |
| ------ | ------------------------------------- | --------------------------------------------------- |
| GET    | `/observability/logs`                 | `LogEntry[]`                                        |
| GET    | `/observability/alerts`               | `Alert[]`                                           |
| GET    | `/observability/metrics/{key}?range=` | `MetricPoint[]`                                     |
| GET    | `/database/health`                    | `DatabaseHealth`                                    |
| GET    | `/database/metrics?range=`            | `MetricPoint[]` (`connections`, `queries`, `locks`) |
| GET    | `/backups/jobs`                       | `BackupJob[]`                                       |
| GET    | `/backups/runs`                       | `BackupRun[]`                                       |
| GET    | `/backups/restore-tests`              | `RestoreTest[]`                                     |
| GET    | `/audit/events`                       | `AuditEvent[]`                                      |

## Public plane (unauthenticated)

| Method | Path                | Returns                                                      |
| ------ | ------------------- | ------------------------------------------------------------ |
| GET    | `/public/status`    | `{ services: PublicServiceStatus[]; incidents: Incident[] }` |
| GET    | `/public/changelog` | `ChangelogEntry[]`                                           |

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

## Identity — `role` is a display field

`Administrator.role` and `AuthenticatedUser.role` carry a **single** role code,
but an administrator may hold several roles. The value is chosen
deterministically: the role granting the most permissions, ties broken
alphabetically.

Permission count is not privilege rank, so this is a **display** role, not an
authoritative one. **Effective authorization is always the union of every role's
permissions**, which is what `permissions[]` contains and what the backend
enforces. Never derive an access decision from `role`.

A future revision may expose `roles[]`, designate an explicit primary role, or
constrain administrators to one role. Until then, treat `role` as a label.
