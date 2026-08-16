# CB67 Liquid Interface — Design Audit

Audit of the pre-redesign interface and the decisions taken in the Product
Experience Redesign. Functionality, routes, contracts and mocks were not
touched; every change is presentation-layer.

## Findings — before

| # | Finding | Severity | Consequence |
| --- | --- | --- | --- |
| 1 | Default shadcn/new-york look: flat cards, `shadow`, `rounded-xl`, generic slate palette | High | Indistinguishable from any template dashboard; no product identity |
| 2 | Single depth level — everything sat on the same plane | High | No hierarchy between chrome, content and overlays; overlays felt pasted on |
| 3 | No material concept; `bg-card` opaque everywhere, chrome identical to content | High | Sidebar, topbar and dialogs read as more content instead of as chrome |
| 4 | Light theme was near-white with grey text; dark theme was flat graphite | Medium | Light mode looked unfinished; dark mode looked lifeless |
| 5 | Motion limited to `transition-colors` plus default shadcn zoom | Medium | No feedback on press, no continuity across routes, state changes unexplained |
| 6 | Typography had no scale — ad-hoc `text-lg` / `text-2xl` / uppercase `text-xs` per page | Medium | Inconsistent page titles, section labels and metric values |
| 7 | Radii mixed `rounded-md`, `-lg`, `-xl` arbitrarily | Low | Optically inconsistent corners between adjacent elements |
| 8 | Web fonts declared (`IBM Plex`) but never loaded | High | The product rendered in a system fallback font everywhere |
| 9 | `min-h-screen` on full-height layouts | Low | Mobile viewport clipping under browser chrome |
| 10 | Metric values re-rendered with no transition on refresh | Low | Numbers changed silently; operators could miss updates |
| 11 | Status dots identical for nominal and critical states | Low | Critical state had no attentional weight |
| 12 | Chart tooltips used flat popover styling with no elevation | Low | Tooltips merged into the chart surface |

## Decisions

**Material (1, 2, 3).** Introduced one material system with five liquid grades
and two solid grades, layered over a depth scale of four elevations plus a modal
level. Chrome and overlays are liquid; the reading plane stays solid. See
`LIQUID-MATERIAL.md`.

**Light (4).** Both themes were rebuilt in `oklch` around a luminous canvas with
a three-point atmospheric gradient on `body::before`, and a signature optical rim
(`edge-light`) plus a pointer-tracked specular highlight on premium surfaces.
Light mode gained warmth and controlled diffusion; dark mode gained layered
graphite and luminous edges. Both were checked for AA contrast on body text,
secondary text and status tones.

**Motion (5, 10, 11).** Added a token-driven duration and easing scale and a
small motion vocabulary — `press`, `lift`, `content-enter`, `value-settle`,
`status-pulse`, `shimmer`. Route changes reveal content upward while chrome holds
still; metric values settle with a single spring; critical status pulses. See
`MOTION-SYSTEM.md`.

**Typography (6, 8).** IBM Plex Sans / Mono are now loaded from the root route
head. Added a purpose-named type scale — `text-display`, `text-page-title`,
`text-section-title`, `text-metric`, `text-caption`, `mono-xs` — replacing
per-page ad-hoc sizes.

**Geometry (7).** One continuous radius scale, named by role:
control-sm → control → card → panel → floating → modal, plus `pill`.

**Detail (9, 12).** All full-height layouts moved to `min-h-dvh`. Chart tooltips
now use a solid elevated surface with depth-4 shadow.

## Not changed, deliberately

- Routes, navigation model, data contracts, mock adapter, query catalogue.
- Table density and column sets — the inventory surfaces stay dense on purpose.
- Status semantics: the tone map in `status-badge.tsx` is unchanged.
- The rule that status is never colour-only; dot plus label was already correct.

## Verification

- `bunx tsgo --noEmit` clean.
- Both themes captured and reviewed on `/overview` and `/login` at 1280px.
- `backdrop-filter` written unprefixed only; opaque fallback verified via
  `@supports not`.
- Reduced-motion path collapses all animation while preserving state changes.
