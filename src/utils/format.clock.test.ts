import { describe, expect, test } from "bun:test";
import { daysUntil, formatRelative } from "./format";

/**
 * Relative time is relative to NOW.
 *
 * The default was a fixed instant written when the mock data was — 16 August
 * 2026, 14:00 UTC — so every relative time in the application was measured
 * against a day that had already passed and drifted further every day after.
 * An action taken a minute ago rendered as "amanhã" in the audit timeline.
 *
 * Nothing caught it because nothing looked at a clock: the existing tests pass
 * an explicit `now`, and the mocks are generated around the same frozen instant
 * so they agreed with it. It took a screenshot of the real console.
 *
 * These tests deliberately call the functions WITHOUT a `now`, which is how
 * every screen calls them.
 */
describe("the default clock is the present", () => {
  test("something that just happened is not a day away", () => {
    const aMomentAgo = new Date(Date.now() - 5_000).toISOString();
    const rendered = formatRelative(aMomentAgo);
    expect(rendered).not.toContain("amanhã");
    expect(rendered).not.toContain("ontem");
    // Portuguese relative formatting of a few seconds: "há 5 segundos" or
    // "agora". Either is right; a day in any direction is not.
    expect(`${aMomentAgo} -> ${rendered}`).toMatch(/segundo|agora/);
  });

  test("an hour ago reads as an hour ago", () => {
    const anHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    expect(formatRelative(anHourAgo)).toMatch(/hora/);
  });

  test("a week ahead reads as ahead, not behind", () => {
    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const rendered = formatRelative(nextWeek);
    expect(`${nextWeek} -> ${rendered}`).toMatch(/em /);
  });

  test("daysUntil counts from today", () => {
    const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString();
    // Allowing a day either side for the boundary; the point is that it is ten
    // and not some number anchored to a date in the past.
    expect(daysUntil(inTenDays)).toBeGreaterThanOrEqual(9);
    expect(daysUntil(inTenDays)).toBeLessThanOrEqual(10);
  });

  test("a fixed clock can still be supplied, for tests that need one", () => {
    const at = new Date("2026-01-10T00:00:00Z");
    expect(formatRelative("2026-01-09T00:00:00Z", at)).toMatch(/ontem|1 dia/);
    expect(daysUntil("2026-01-20T00:00:00Z", at)).toBe(10);
  });
});
