import { useCallback, type PointerEvent } from "react";

/**
 * CB67 Liquid Interface — LIGHT.
 * Writes the pointer position into --px/--py so the `pointer-light` utility can
 * render a specular highlight that follows the cursor across a liquid surface.
 * Purely presentational; no state, no re-render, disabled by reduced motion CSS.
 */
export function usePointerLight() {
  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--px", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--py", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  return { onPointerMove };
}
