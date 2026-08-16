# CB67 Liquid Material

The single material the CB67 Liquid Interface is built from. It is a physical
description, not a visual effect: every surface is either *liquid* (translucent,
reacts to what is behind and to light) or *solid* (a reading plane).

Everything below is implemented as tokens and `@utility` classes in
`src/styles.css`. Components never compose blur, alpha or shadow by hand.

## Composition order

A liquid surface is always assembled in this order. Skipping a step is what makes
glass look cheap.

```text
1. backdrop-filter: blur()        refraction — the surface bends what is behind it
2. saturate(165%)                 vitality  — colour survives the blur
3. translucent fill               body      — the material has substance
4. inner light (inset top 1px)    thickness — the surface has an edge, not an outline
5. optical border                 boundary  — 1px, low-contrast, never a hard stroke
6. specular highlight             light     — diagonal rim + optional pointer highlight
7. depth shadow                   position  — where the surface sits in the stack
```

## The five material grades

| Utility | Blur | Where it is used |
| --- | --- | --- |
| `liquid-subtle` | 10px | Chips, quiet controls, glass buttons, inline chrome |
| `liquid-nav` | 34px | Sidebar and topbar — the structural chrome |
| `liquid-floating` | 20px | Metric tiles, segmented controls, filter bars |
| `liquid-overlay` | 20px | Popovers, dropdowns, selects, tooltips |
| `liquid-modal` | 34px | Dialogs, command palette, drawers, sign-in |

Plus two non-liquid grades:

| Utility | Purpose |
| --- | --- |
| `panel` | The content plane. Opaque, high contrast, holds tables and charts. |
| `solid-critical` | Destructive confirmations. Never translucent, never ambiguous. |

## Light behaviour

- `edge-light` — the signature CB67 rim: a diagonal gradient masked to a 1px
  border, brighter at the top-left, specular at the bottom-right. Applied to
  liquid surfaces that matter.
- `pointer-light` — a 340px specular highlight tracking the cursor, written by
  `usePointerLight()` into `--px` / `--py`. Reserved for metric tiles and hero
  surfaces; never on dense table rows.
- Filled buttons carry a top-half white gradient (a lit convex face) instead of
  a flat colour block.

## Rules

1. **Data is never read through glass.** Tables, logs, charts and long copy sit
   on `panel`. Liquid material is chrome, tiles and overlays only.
2. **No stacked translucency.** A liquid surface never sits directly on another
   liquid surface — one of the two becomes solid.
3. **Blur costs GPU.** Grades are fixed at three blur radii so the compositor
   reuses them; do not invent intermediate values.
4. **Legibility outranks the material.** If contrast drops below AA, the fill
   moves to `--glass-fill-strong` or the surface becomes `panel`.
5. **Status colour is never carried by the material** — it is carried by
   `StatusBadge`, which pairs a tone with a dot and a text label.

## Fallbacks and accessibility

- Browsers without `backdrop-filter` get opaque surfaces automatically: a
  `@supports not` block rewrites the glass tokens to solid values.
- Only the standard `backdrop-filter` property is written; vendor prefixes are
  added by the build. Hand-writing `-webkit-backdrop-filter` would drop the
  effect in Chrome production builds.
- `prefers-reduced-motion` removes decorative animation but keeps every material
  and every state change.
