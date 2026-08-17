import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { NAVIGATION } from "./navigation";

/**
 * Route parity between the menu and the router.
 *
 * The owner signed in and found administrative pages returning 404. The router
 * was complete — all 72 static routes rendered at the origin — and the MENU was
 * not: two entries, "Ambientes" (/saas/environments) and "Uso" (/saas/usage),
 * pointed at pages that had never existed, appeared in no route file and in no
 * line of docs/ROUTES.md.
 *
 * The inventory here is DERIVED from the generated router, never hand-written.
 * A hand-written list drifts the moment someone adds or removes a page, which is
 * the same failure one level up.
 *
 * This fails when a menu entry has no route, and when a route pattern the menu
 * relies on disappears from the build.
 */

const GENERATED = new URL("../routeTree.gen.ts", import.meta.url).pathname;

/** Route patterns the router knows, with `$param` segments preserved. */
function routerPatterns(): string[] {
  const src = readFileSync(GENERATED, "utf8");
  const found = new Set<string>();
  // The generated file lists every full path as a key of FileRoutesByFullPath.
  for (const m of src.matchAll(/'(\/[A-Za-z0-9/_$.-]*)':\s*typeof/g)) found.add(m[1]!);
  for (const m of src.matchAll(/path:\s*'([^']+)'/g)) {
    if (m[1]!.startsWith("/")) found.add(m[1]!);
  }
  return [...found]
    .map((p) => p.replace(/\/_admin/g, ""))
    .filter((p) => p.startsWith("/"))
    .map(normalise);
}

/** Index routes are spelled with and without a trailing slash; both resolve. */
function normalise(path: string): string {
  const withoutQuery = path.split("?")[0]!.split("#")[0]!;
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
}

/**
 * A link the app may legitimately hold.
 *
 * Splitting on "/" and dropping empty segments made "//overview" equivalent to
 * "/overview" — a malformed link the checker would have waved through while the
 * router treats it as a different path. Shapes are rejected before matching so
 * the guard is about what the router will actually see.
 */
function wellFormed(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes("//")) return false;
  if (path.includes("://")) return false;
  if (/\s/.test(path)) return false;
  return true;
}

/** True when a concrete path is served by a pattern, dynamic segments included. */
function resolves(path: string, patterns: string[]): boolean {
  if (!wellFormed(path)) return false;
  const target = normalise(path).split("/").filter(Boolean);
  return patterns.some((pattern) => {
    const parts = pattern.split("/").filter(Boolean);
    if (parts.length !== target.length) return false;
    return parts.every((part, i) => part.startsWith("$") || part === target[i]);
  });
}

/** Every path the menu offers, flattened. */
function navigationPaths(): { label: string; to: string }[] {
  const out: { label: string; to: string }[] = [];
  for (const group of NAVIGATION) {
    if (group.to) out.push({ label: group.label, to: group.to });
    for (const item of group.items ?? []) out.push({ label: item.label, to: item.to });
  }
  return out;
}

describe("the menu never offers a destination the router cannot reach", () => {
  const patterns = routerPatterns();

  test("the router inventory was actually derived", () => {
    // A parse that silently found nothing would make every assertion below pass
    // for the wrong reason.
    expect(patterns.length).toBeGreaterThan(50);
    expect(patterns).toContain("/overview");
    expect(patterns).toContain("/identity/administrators");
  });

  test("every menu entry resolves to a route", () => {
    const broken = navigationPaths().filter((entry) => !resolves(entry.to, patterns));
    expect(
      broken.map((b) => `${b.label} -> ${b.to}`),
      "menu entries with no matching route",
    ).toEqual([]);
  });

  test("the two entries that caused the reported 404s are gone", () => {
    const paths = navigationPaths().map((n) => n.to);
    expect(paths).not.toContain("/saas/environments");
    expect(paths).not.toContain("/saas/usage");
  });

  test("concrete paths for dynamic routes resolve", () => {
    // The menu links to /providers/openai, which the router serves through
    // /providers/$providerId. A checker that compared only literal strings
    // would call these broken and hide the two that genuinely were.
    for (const path of ["/providers/openai", "/providers/gemini", "/providers/google-maps"]) {
      expect(`${path}: ${resolves(path, patterns)}`).toBe(`${path}: true`);
    }
  });

  test("a path the router does not serve is reported as broken", () => {
    // Proves the checker can fail. Without this the suite could pass because the
    // matcher accepts everything.
    expect(resolves("/saas/environments", patterns)).toBe(false);
    expect(resolves("/this/does/not/exist", patterns)).toBe(false);
  });

  test("a malformed link is rejected rather than normalised into a valid one", () => {
    // "//overview" is not "/overview" to the router, and a checker that treats
    // them as equal would pass a link that leads nowhere.
    expect(resolves("//overview", patterns)).toBe(false);
    expect(resolves("overview", patterns)).toBe(false);
    expect(resolves("/over view", patterns)).toBe(false);
    expect(resolves("https://example.test/overview", patterns)).toBe(false);
  });

  test("no menu entry is a bare fragment or an external link", () => {
    for (const entry of navigationPaths()) {
      expect(`${entry.label}: ${entry.to.startsWith("/")}`).toBe(`${entry.label}: true`);
      expect(`${entry.label}: ${entry.to.includes("://")}`).toBe(`${entry.label}: false`);
    }
  });
});

describe("no link anywhere in the app leads outside the router", () => {
  const patterns = routerPatterns();

  /** Every internal `to=` in the app, not only the sidebar. */
  function everyInternalLink(): { link: string; where: string }[] {
    const out: { link: string; where: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const src = readFileSync(full, "utf8");
        for (const m of src.matchAll(/to=(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
          const link = m[1] ?? m[2]!;
          if (link.startsWith("/")) out.push({ link, where: full });
        }
        for (const m of src.matchAll(/to:\s*"(\/[^"]*)"/g)) {
          out.push({ link: m[1]!, where: full });
        }
      }
    };
    walk(new URL("..", import.meta.url).pathname.replace(/\/$/, ""));
    return out;
  }

  test("breadcrumbs, cards, the command palette and empty-state links all resolve", () => {
    // The menu was checked above, but it is not the only thing that navigates.
    // A card linking to a page that does not exist is the same defect one click
    // further in, and nothing was watching for it.
    const links = everyInternalLink();
    expect(links.length).toBeGreaterThan(20);
    const broken = links.filter((l) => !resolves(l.link, patterns));
    expect(
      broken.map((b) => `${b.link} in ${b.where.split("/src/")[1]}`),
      "internal links with no matching route",
    ).toEqual([]);
  });
});
