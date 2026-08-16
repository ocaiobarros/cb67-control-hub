# EVIDENCE — Sprint 0, Handoff & Security

Date: 2026-08-16 · Branch: `sprint/00-handoff`

This file exists because commit messages are not a durable test report. Every
claim below was produced by an executed command, and exit codes are recorded.

Sanitized for a public repository: no addresses, paths to secrets, key
fingerprints, or host identifiers. The unsanitized record is held privately on
the platform host.

---

## 1. Toolchain

| Tool | Version    | How obtained         |
| ---- | ---------- | -------------------- |
| Node | `v20.20.2` | pre-installed        |
| bun  | `1.3.14`   | `npm install -g bun` |
| git  | `2.47.3`   | Debian               |

**Why bun came from the npm registry rather than `curl … | bash`:** piping a
remote script into a shell executes unreviewed code as root. Installing the
published package is auditable and uses the dependency resolution the project
already trusts.

## 2. Frontend baseline — as delivered, before any change

| Step      | Command                         | Exit  | Result                       |
| --------- | ------------------------------- | ----- | ---------------------------- |
| Install   | `bun install --frozen-lockfile` | **0** | 407 packages                 |
| Typecheck | `bunx tsc --noEmit`             | **0** | clean                        |
| Build     | `bun run build`                 | **0** | ~973 ms                      |
| Lint      | `bun run lint`                  | **1** | **283 errors + 11 warnings** |

No `typecheck` script exists in `package.json`. One was **not invented** —
`tsc --noEmit` was run against the project's own `tsconfig.json` (strict,
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).

All 283 lint errors were `prettier/prettier`. The 11 warnings are
`react-refresh/only-export-components`.

## 3. Formatting

`bun run format`, then re-verified: lint **0 errors**, typecheck exit **0**,
build exit **0**.

`AGENTS.md` was reformatted by Prettier (blank lines inserted inside the
`LOVABLE:BEGIN/END` markers). It was reverted and added to `.prettierignore` so
this cannot recur — that file is Lovable-owned.

**Acknowledged as operationally aggressive.** Formatting 88 files in one commit
enlarges the merge-conflict surface against a Lovable-synchronised branch. It
was isolated in its own commit and no history was rewritten, but broad
normalisation should not be repeated without explicit coordination.

## 4. Localization completion

Lovable exhausted its credits mid-localization, leaving English on the surfaces
operators reach when something fails.

| Surface              | Was                                   | Now                                                      |
| -------------------- | ------------------------------------- | -------------------------------------------------------- |
| 404 page             | "Page not found" / "Go home"          | "Página não encontrada" / "Voltar para o início"         |
| Root error boundary  | "This page didn't load" / "Try again" | Reuses the pt-BR copy already in `src/lib/error-page.ts` |
| `AccessDenied` (403) | entirely English                      | fully pt-BR                                              |

`error-state.tsx` was already complete in pt-BR for 401/403/404/409/422/429/502/503.

### Date presentation

Specification asks `dd/MM/yyyy`. Code used `dateStyle: "medium"`:

| Helper           | Before                         | After               |
| ---------------- | ------------------------------ | ------------------- |
| `formatDate`     | `16 de ago. de 2026`           | `16/08/2026`        |
| `formatDateTime` | `16 de ago. de 2026, 14:30:00` | `16/08/2026, 14:30` |

Transport timestamps are untouched — presentation only.

### Two locale leaks that bypassed the formatting layer

- `calendar.tsx` called `toLocaleString("default", …)`. `"default"` follows the
  **browser** locale, so months rendered as `Aug` instead of `ago.` for any
  visitor whose browser is not Portuguese.
- `chart.tsx` tooltips called bare `toLocaleString()`, which the header comment
  in `format.ts` explicitly forbids.

### Verification method

A scanner was run over the **compiled client bundle**, not only the source,
because source-level regexes miss strings assembled at build time.

Result: **0 candidate English UI phrases** in the built output.

## 5. Regression introduced during localization, and its fix

The first `chart.tsx` fix used `formatNumber(Number(item.value))`. Recharts
tooltip values may be strings, so this rendered **`NaN`** for legitimate
non-numeric values.

This was a real regression, found in independent review, not by the author.

Replaced with a guarded formatter that localises genuine numbers and passes
everything else through unchanged. Verified across the full value matrix:

| Input                       | Output     |
| --------------------------- | ---------- |
| `1234`                      | `1.234`    |
| `12.5`                      | `12,5`     |
| `0`                         | `0`        |
| `"1234"`                    | `1.234`    |
| `"42.5"`                    | `42,5`     |
| `"N/A"`                     | `N/A`      |
| `"ativo"`                   | `ativo`    |
| `NaN`                       | `NaN`      |
| `Infinity`                  | `Infinity` |
| `null` / `undefined` / `""` | `""`       |

12/12 cases pass.

## 6. External runtime dependency removed

The document head loaded **Google Fonts** from `fonts.googleapis.com` and
`fonts.gstatic.com`.

On a self-hosted admin plane this is two problems: a third-party runtime
dependency the platform does not control, and a request to Google on **every
page view by every operator**.

Replaced with `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono` —
the same typefaces and the same weights (Sans 400/500/600/700, Mono 400/500/600),
served locally. No visual change, so the design freeze is respected.

Verified: **78 font files emitted** into the build output, and **zero**
references to `fonts.googleapis.com` or `fonts.gstatic.com` remain in it.

## 7. Secret audit — this repository is public

Scanned working tree **and full history across all reachable refs** for private
key markers (`BEGIN … PRIVATE KEY`), provider credential shapes (`sk-`, `AIza`,
`gh[pous]_`, `AKIA`, `xox…`, JWT), and secret-shaped filenames ever added in any
commit.

**Result: nothing found.** Re-scanned immediately before push.

### Control deficiency — stated, not glossed

The scan is regex-based. It has no entropy detection and no verified-provider
checks, so it is a reasonable first pass and **not** an adequate continuing
control for a public repository.

Remediated here:

- `.env`, `.env.*` now git-ignored (`!.env.example` preserved). This matters
  because **Vite inlines `VITE_*` values into the browser bundle at build time**.

Still outstanding, and recorded rather than hidden:

- No dedicated secret scanner (entropy + provider verification)
- No CI or pre-push enforcement gate
- No scan of ignored build output for compiled-in environment values

## 8. Deploy key

Validated without ever printing, logging or copying private key material:

- Directory `0700`, private key `0600`, public key `0644`
- Public key derived from the private key with `ssh-keygen -yf`; fingerprints
  compared and identical
- `ssh -T git@github.com` returned a repository-scoped greeting naming this
  repository — confirming a deploy key rather than a user key
- Write access proven by pushing a **branch**, never `main`. No force push.

### Outstanding

- GitHub host-key provenance not documented — having a `known_hosts` entry is
  not proof it was checked against GitHub's published fingerprints
- The key uses the default identity filename, so it may be offered
  unintentionally to other SSH hosts. A dedicated filename plus a host alias
  with `IdentitiesOnly yes` would prevent that
- No recorded owner for key rotation and revocation

## 9. Dependency audit

`bun audit`: **5 high-severity advisories** — `brace-expansion` (×2),
`nanoid`, `js-yaml` (×2).

Reach analysis, because severity without reach is not actionable:

| Package           | Path                                                                                   | Classification   |
| ----------------- | -------------------------------------------------------------------------------------- | ---------------- |
| `brace-expansion` | `eslint › … › minimatch`, `typescript-eslint › … › minimatch`                          | dev only         |
| `nanoid`          | `vite › postcss`                                                                       | build only       |
| `js-yaml`         | `eslint › @eslint/eslintrc`, `@tanstack/react-start › start-plugin-core › xmlbuilder2` | dev / build only |

**None appears in the shipped client bundle** — verified by searching the built
assets: 0 files for each.

These remain real supply-chain exposure for the build pipeline and should be
resolved, but they are not runtime exposure for users of the admin plane. Not
updated in this sprint: `bun update` across a beta Nitro and a Lovable-specific
Vite integration is a change that deserves its own verification pass rather than
being bundled into a handoff commit.

## 10. Final state

| Check               | Exit                             |
| ------------------- | -------------------------------- |
| `bun run lint`      | **0** (11 non-blocking warnings) |
| `bunx tsc --noEmit` | **0**                            |
| `bun run build`     | **0**                            |

## 11. Contract contradictions — raised, decided, implemented

These were found during the handoff and were genuine conflicts between what the
documentation promised and what the code did. All three are now resolved by
owner decision **and implemented**, not merely documented.

### 11.1 Deployment target — RESOLVED

**Was:** `FRONTEND-HANDOFF.md` described static assets behind the platform
proxy, while the build produced a Nitro server bundle with **Cloudflare as the
default preset**, emitting `wrangler.json`.

**Now:** self-hosted Node/Nitro SSR. `build:selfhosted` sets
`NITRO_PRESET=node-server`; `nitro.json` reports `node-server` and no Cloudflare
artifacts are emitted. Runs as a hardened systemd service under a dedicated
non-root user, bound to loopback behind the reverse proxy.

Verified: HTTP 200 on `/` and `/observability/prometheus`, correct 404 on the
removed route, service survives `restart`, and after `kill -9` systemd restarts
it automatically and it serves 200 again. Memory ~25 MiB against a 256 MiB cap.

### 11.2 Admin authentication — RESOLVED

**Was:** `API-CONTRACTS.md` mandated `Authorization: Bearer`, while the adapter
sent `credentials: "include"` for HttpOnly cookies.

**Now:** HttpOnly cookie sessions with a fully specified CSRF wire contract.

Two defects were found in the first CSRF implementation by independent review,
and both were real:

**Defect 1 — it failed open.** Token acquisition returned `null` on network
failure, non-2xx, invalid JSON or a missing token, and the mutation was then
sent _without_ a CSRF header. A security prerequisite that cannot be met must
stop the request, not be silently skipped. Now `fetchCsrfToken()` throws
`CsrfError` on every one of those conditions, plus a non-string token and a
token beyond 512 characters, and the mutation is never dispatched.

**Defect 2 — every 403 was treated as CSRF rotation.** The client blindly
refreshed and replayed on any 403, so an _authorization_ denial — insufficient
role, suspended administrator, policy or origin rejection — was replayed too.
That corrupts the audit trail and, without server-side idempotency guarantees,
is unsafe. Now the contract defines `code: "csrf_token_invalid"`, and only a 403
carrying exactly that code is retried. An unparseable 403 body resolves toward
_not_ retrying.

**Login bootstrap** is now specified rather than left to interpretation:
`GET /auth/csrf` establishes a pre-authentication session and returns a token
bound to it; login carries that token; on success the server rotates the session
identifier (defeating fixation) and invalidates the pre-authentication token.

**23 tests, all passing.** Coverage is deliberately weighted toward failure
paths, because those are the security-relevant ones:

| Group              | Cases                                                                                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fail closed        | token endpoint 500 / 401 / 404, invalid JSON, missing token, empty token, non-string token, oversized token, network failure — **9 cases, each asserting zero mutation attempts**                                                               |
| Recovery           | a failed token fetch does not poison the next attempt                                                                                                                                                                                           |
| 403 classification | CSRF-coded 403 retries once · **authorization 403 not retried** · unparseable 403 not retried · unrelated code not retried · persistent CSRF 403 capped at two attempts · 403 on GET not retried                                                |
| Lifecycle          | GET never fetches a token · all four mutating verbs carry it · cached across mutations · **concurrent mutations de-duplicate to one token fetch** · request body survives a retry · logout clears the cache · credentials sent on every request |

The suite immediately earned its place: while restructuring the implementation I
dropped the cache lookup, and the concurrency and caching tests failed on the
next run rather than the defect reaching review.

### 11.3 Grafana — RESOLVED

**Was:** the frontend implemented a full Grafana integration — route, page,
navigation entry, settings row, environment variable, mock service and dashboard
slugs — while platform scope had removed Grafana.

An intermediate commit corrected only the _documentation_, which independent
review correctly rejected: the UI still implemented Grafana while the docs
claimed otherwise. That is the fictitious-capability problem, just relocated.

**Now remapped in code:** the route is `/observability/prometheus`, the page
presents Prometheus and Alertmanager with reference **PromQL expressions** that
deep-link into the Prometheus expression browser, `env` exposes
`prometheusUrl`/`alertmanagerUrl` instead of `grafanaUrl`, navigation and
settings are updated, and the mock service list reports Alertmanager.

No reference to Grafana remains in `src/` except one comment explaining why the
queries exist. The old route now correctly returns **404**.

## 12. Build isolation

Independent review noted that building on the platform host as root — with a
GitHub write key present and platform credentials on the same machine — is a
supply-chain exposure that "not in the client bundle" does not address.

A dedicated unprivileged build account now owns the source tree and runs the
build. Verified:

| Check                                     | Result                |
| ----------------------------------------- | --------------------- |
| Build account reads the GitHub deploy key | **Permission denied** |
| Build account reads a platform credential | **Permission denied** |
| Build account lists the secrets directory | **Permission denied** |
| Full build as that account                | exit 0                |
| Test suite as that account                | 8/8 pass              |

A compromised build dependency therefore cannot reach the deploy key or platform
credentials.

## 13. Known-open items

- Dependency advisories (5 high, all dev/build-time, none in the client bundle)
  are **not yet remediated**. Isolation reduces their blast radius; it does not
  patch them. Upgrading across a beta Nitro and a Lovable-specific Vite
  integration warrants its own verification pass.
- No entropy-aware or provider-verifying secret scanner; no CI or pre-push
  enforcement gate; no scan of ignored build output.
- GitHub host-key provenance not documented against published fingerprints.
- Deploy key uses the default identity filename and has no recorded rotation
  owner.
- 11 `react-refresh/only-export-components` warnings remain, inherent to
  exporting variants alongside components; not addressed during a design freeze.
