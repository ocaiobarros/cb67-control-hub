# CB67 Labs — Design System

The interface is an operations console: dense, quiet, monospaced where identifiers appear, and
never decorative. All color, radius and shadow values are semantic tokens declared in
`src/styles.css`. Components must not hardcode color utilities.

## Tokens

Defined in `src/styles.css` as `oklch()` values with a dark and a light theme:

- Surfaces: `--background`, `--card`, `--popover`, `--sidebar`, `--muted`, `--border`.
- Text: `--foreground`, `--muted-foreground`, `--accent-foreground`.
- Brand: `--primary` (cyan-leaning technical accent) and `--accent`.
- Status: `--ok`, `--warn`, `--crit`, `--info` — exposed as `text-ok`, `bg-crit`, etc.
- Charts: `--chart-1` … `--chart-5`, consumed only through `src/components/charts/chart-panel.tsx`.

Utility classes provided by the stylesheet: `.panel` (bordered surface), `.mono-xs`
(small monospace for identifiers), `.tabular` (tabular figures for numbers).

## Status semantics

Status is rendered exclusively by `StatusBadge`, which maps a domain value to one of four
tones so meaning stays consistent across sections:

| Tone | Meaning | Examples |
| --- | --- | --- |
| `ok` | Nominal | `healthy`, `active`, `verified`, `passed`, `allowed` |
| `warn` | Attention, not yet failing | `degraded`, `grace`, `pending`, `expiring`, `throttled` |
| `crit` | Failing or blocked | `unavailable`, `revoked`, `failed`, `denied`, `critical` |
| `info` | Neutral state | `maintenance`, `disabled`, `info`, `staging` |

## Layout rules

- One `PageHeader` per page: title, one-sentence purpose, optional actions and status meta.
- Summary metrics first (`MetricCard` / `UsageCard`), then charts, then tables.
- Tables use `DataTable`: client-side sort, search, column visibility and pagination.
- Long text never truncates identifiers; identifiers use `IdentifierCell` with copy support.
- Secrets are never displayed — `MaskedSecret` renders a placeholder only.

## Typography and density

- Page titles are `text-lg`/`text-2xl` semibold; section titles are uppercase `text-sm`.
- Body copy is `text-sm`; metadata and identifiers are `mono-xs`.
- Tables default to dense rows for inventory surfaces.

## Accessibility

- Every filter group is a labelled `role="group"` with `aria-pressed` buttons.
- Selects and icon-only buttons carry `aria-label`.
- Charts are decorative companions to a table or metric, never the only representation.
- Destructive actions require `ConfirmActionDialog`, which states consequences explicitly.
