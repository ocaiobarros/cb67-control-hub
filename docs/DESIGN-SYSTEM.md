# CB67 Labs — Design System

The interface is an operations console rendered in the **CB67 Liquid Interface**
design language: dense and quiet where data lives, translucent and luminous where
chrome lives. Monospaced for identifiers, never decorative.

All colour, radius, shadow, blur and motion values are semantic tokens declared in
`src/styles.css`. Components never hardcode colour utilities, blur values, shadows
or durations.

Companion documents: `LIQUID-MATERIAL.md` (material), `MOTION-SYSTEM.md`
(motion), `DESIGN-AUDIT.md` (redesign rationale).

## Five fundamentals

1. **Liquid material** — one material, five liquid grades, two solid grades.
2. **Depth** — five levels: canvas → chrome → content → floating → overlay/modal.
3. **Light** — an atmospheric canvas gradient, optical rims, pointer-tracked
   specular highlights, lit convex control faces.
4. **Continuity** — chrome persists across routes; content resolves in place.
5. **Motion** — explains state, never decorates.

## Tokens

Declared in `src/styles.css` as `oklch()` values with complete light and dark
themes.

- **Canvas**: `--canvas`, `--canvas-elevated`, `--atmos-1..3` (background field).
- **Surfaces**: `--surface`, `--surface-solid`, `--surface-raised`,
  `--surface-muted`, `--surface-overlay`, `--surface-nav`.
- **Text**: `--text-primary`, `--text-secondary`, `--text-tertiary` — exposed as
  `text-foreground`, `text-muted-foreground`, `text-text-tertiary`.
- **Accent**: `--accent` (technical cyan-blue), `--accent-soft`, `--tint-accent`.
- **Status**: `--success`, `--warning`, `--danger`, `--info`, `--neutral` —
  exposed as `text-ok`, `bg-crit`, `border-warn`, etc.
- **Material**: `--glass-fill*`, `--glass-border*`, `--glass-inner-light`,
  `--glass-specular`, `--glass-blur-sm|md|lg`, `--glass-saturation`, `--scrim`.
- **Depth**: `--depth-1..4`, `--depth-modal` — exposed as `shadow-depth-1..4`,
  `shadow-modal`.
- **Motion**: `--motion-*` durations and `--ease-*` curves — exposed as
  `ease-standard`, `ease-enter`, `ease-exit`, `ease-spring`.
- **Charts**: `--chart-1` … `--chart-5`, consumed only through
  `src/components/charts/chart-panel.tsx`.

## Geometry

One continuous radius scale, named by role: `--radius-control-sm` (6px) →
`control` (10px) → `card` (14px) → `panel` (18px) → `floating` (22px) → `modal`
(24px), plus `--radius-pill`. Mapped to `rounded-sm` … `rounded-3xl`.

## Material utilities

`liquid-subtle`, `liquid-nav`, `liquid-floating`, `liquid-overlay`,
`liquid-modal`, `panel`, `solid-critical`, plus the light utilities `edge-light`
and `pointer-light`. Data always sits on `panel`; liquid material is chrome,
tiles and overlays only.

## Typography

| Utility | Use |
| --- | --- |
| `text-display` | Public plane hero headlines |
| `text-page-title` | One per page, via `PageHeader` |
| `text-section-title` | Uppercase tracked section labels |
| `text-metric` | Metric values, tabular figures |
| `text-caption` | Hints and metadata |
| `mono-xs` | Identifiers, request IDs, fingerprints, environment badges |
| `tabular` | Any numeric column |

Fonts: IBM Plex Sans and IBM Plex Mono, loaded via `<link>` in
`src/routes/__root.tsx`.

## Status semantics

Status is rendered exclusively by `StatusBadge`, which maps a domain value to one
of four tones so meaning stays consistent across sections. Critical dots carry
`status-pulse`; every badge pairs the tone with a text label so colour is never
the only signal.

| Tone | Meaning | Examples |
| --- | --- | --- |
| `ok` | Nominal | `healthy`, `active`, `verified`, `passed`, `allowed` |
| `warn` | Attention, not yet failing | `degraded`, `grace`, `pending`, `expiring`, `throttled` |
| `crit` | Failing or blocked | `unavailable`, `revoked`, `failed`, `denied`, `critical` |
| `info` | Neutral state | `maintenance`, `disabled`, `info`, `staging` |

## Layout rules

- One `PageHeader` per page: title, one-sentence purpose, optional actions and
  status meta.
- Summary metrics first (`MetricCard` / `UsageCard`), then charts, then tables.
- Tables use `DataTable`: client-side sort, search, column visibility, pagination.
- Long text never truncates identifiers; identifiers use `IdentifierCell` with
  copy support.
- Secrets are never displayed — `MaskedSecret` renders a placeholder only.
- Full-height layouts use `min-h-dvh`, never `min-h-screen`.

## Accessibility

- Every filter group is a labelled `role="group"` with `aria-pressed` buttons.
- Selects and icon-only buttons carry `aria-label`.
- Charts are decorative companions to a table or metric, never the only
  representation.
- Destructive actions require `ConfirmActionDialog` on a `solid-critical`
  surface, which states consequences explicitly.
- Focus is always visible: a 2px `--focus-ring` outline with offset, never
  removed by a material.
- `prefers-reduced-motion` is honoured globally.
