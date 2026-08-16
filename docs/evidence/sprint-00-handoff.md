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

## 11. Unresolved — requires owner decision

These are contract contradictions, not implementation gaps. Backend work should
not begin until they are settled, because each one changes what gets built.

1. **Deployment target.** `FRONTEND-HANDOFF.md` describes static assets behind
   the platform proxy. The actual config builds a Nitro server bundle with
   **Cloudflare as the default target**, and the build emits `wrangler.json`.
   Static SPA, self-hosted Node/Nitro SSR, and a Cloudflare worker have
   different service users, systemd units, resource budgets, CSP behaviour and
   failure modes. This must be chosen explicitly and proven on Debian.

2. **Admin authentication model.** `API-CONTRACTS.md` specifies
   `Authorization: Bearer <token>` on every management call. `http-adapter.ts`
   sends `credentials: "include"` for HttpOnly cookies. These are different
   security models — cookies additionally require CSRF defence, `SameSite`,
   and Origin validation for destructive operations. One must be authoritative.

3. **Grafana.** The frontend treats Grafana as a delivered surface. The platform
   removed it from scope by owner decision. Either that decision is reversed, or
   the surface stays mock-only, or it is remapped to Prometheus/Alertmanager.
   The design freeze protects the UI from redesign; it does not oblige the
   backend to implement infrastructure that was descoped.
