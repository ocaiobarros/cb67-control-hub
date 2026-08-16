# CB67 Motion System

Motion in an operations console exists to explain state, not to entertain. Every
animation here answers one of three questions: _where did this come from_, _what
just changed_, or _did my input register_. Anything else is removed.

All durations and curves are tokens in `src/styles.css`.

## Duration scale

| Token                 | Value | Used for                                        |
| --------------------- | ----- | ----------------------------------------------- |
| `--motion-instant`    | 80ms  | Press compression, hover tint                   |
| `--motion-fast`       | 150ms | Control state changes, focus rings              |
| `--motion-standard`   | 240ms | Surface transitions, nav pills, theme crossfade |
| `--motion-emphasized` | 380ms | Content reveal, overlay entry, pointer light    |
| `--motion-slow`       | 620ms | Progress fills, large value transitions         |

Nothing in the product animates longer than 620ms. An operator waiting on an
animation is an operator being slowed down.

## Easing

| Token                  | Curve                              | Character                               |
| ---------------------- | ---------------------------------- | --------------------------------------- |
| `--ease-std`           | `cubic-bezier(0.32, 0.72, 0, 1)`   | Default. Fast start, long settle.       |
| `--ease-in-liquid`     | `cubic-bezier(0.16, 1, 0.3, 1)`    | Entering elements — decelerates hard.   |
| `--ease-out-liquid`    | `cubic-bezier(0.4, 0, 0.7, 0.2)`   | Leaving elements — accelerates away.    |
| `--ease-spring-liquid` | `cubic-bezier(0.34, 1.42, 0.5, 1)` | Values settling; a single 4% overshoot. |

Exposed to Tailwind as `ease-standard`, `ease-enter`, `ease-exit`, `ease-spring`.

## The motion vocabulary

| Utility         | Behaviour                   | Applied to                                                         |
| --------------- | --------------------------- | ------------------------------------------------------------------ |
| `press`         | Scales to 0.975 while held  | Every button, select trigger, segmented control                    |
| `lift`          | −2px, depth 1 → 3 on hover  | Metric tiles, interactive cards                                    |
| `content-enter` | 8px rise + fade, 380ms      | Page content keyed on pathname, page headers, expanding nav groups |
| `value-settle`  | 4px rise + fade with spring | Metric values when the number changes                              |
| `status-pulse`  | 2.6s expanding ring         | Critical status dots only                                          |
| `shimmer`       | 1.8s tonal sweep            | Skeletons while data loads                                         |

Overlays (dialog, popover, select, dropdown, sheet, command palette) enter with
fade + 98% scale on `ease-enter` and exit faster on the reverse — they grow out
of the surface that triggered them rather than appearing.

## Continuity

- Route changes re-key `<main>`, so content resolves upward while the chrome
  stays fixed. Navigation never blinks.
- The active navigation pill keeps its tint, rim and leading marker across
  routes, so the eye tracks one object instead of re-finding it.
- The topbar earns blur, tint and depth once content scrolls beneath it; the
  material reacts to context instead of switching on.
- Theme switching runs a 240ms crossfade scoped to colour, border and shadow
  (`html.theme-transition`), then removes itself — transform and opacity are
  untouched so nothing shifts position.

## Prohibited

- Bounce, elastic or overshoot beyond the single 4% settle.
- Anything that moves, pulses or spins while a human is reading data.
- Animated chart entry on dashboards that auto-refresh.
- Motion as the sole indicator of state — colour, label and icon carry it.

## Reduced motion

`prefers-reduced-motion: reduce` collapses all durations to 1ms, stops
iteration on looping animations, and neutralises `lift` / `press` transforms.
Every state change remains visible; only the travel is removed.
