import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";

/**
 * Permission strings must be spelled the way the backend grants them.
 *
 * The gateway seeds dot-separated codes — `licensing.write`, `pki.write`,
 * `identity.write` — and `matches()` in auth-context compares them literally,
 * with wildcards only on a `.` boundary. Eleven of the twelve `Permitted`
 * guards in the app were written with a COLON (`licensing:write`), which
 * matches nothing the backend ever grants.
 *
 * The effect was silent and total: every gated write control was hidden from
 * every administrator, the Platform Owner included, because the owner holds
 * concrete codes rather than `*`. Nothing failed and nothing was logged — the
 * buttons simply were not there, which reads as "not built yet".
 *
 * The shape is asserted rather than a fixed list of codes: the frontend cannot
 * read the platform repository, and a hand-copied list of permissions would
 * drift the first time one is added.
 */

const SRC = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

/** Every permission string the app checks, with the file it came from. */
function permissionStrings(): { code: string; where: string }[] {
  const out: { code: string; where: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
      const src = readFileSync(full, "utf8");
      for (const m of src.matchAll(/permission=(?:"([^"]+)"|\{"([^"]+)"\})/g)) {
        out.push({ code: m[1] ?? m[2]!, where: full.slice(SRC.length + 1) });
      }
      for (const m of src.matchAll(/\bcan\(\s*"([^"]+)"\s*\)/g)) {
        out.push({ code: m[1]!, where: full.slice(SRC.length + 1) });
      }
    }
  };
  walk(SRC);
  return out;
}

describe("permission codes are spelled the way the gateway grants them", () => {
  const found = permissionStrings();

  test("the scan actually found the guards", () => {
    // Without this, every assertion below would pass on an empty list.
    expect(found.length).toBeGreaterThan(8);
  });

  test("every code is dot-separated, never colon-separated", () => {
    const wrong = found.filter((p) => p.code.includes(":"));
    expect(
      wrong.map((p) => `${p.code} in ${p.where}`),
      "permission codes using ':' — the gateway grants '.'",
    ).toEqual([]);
  });

  test("every code matches the gateway's shape", () => {
    // domain.action, or domain.sub.action as in identity.sessions.read.
    const shape = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$|^\*$/;
    const wrong = found.filter((p) => !shape.test(p.code));
    expect(
      wrong.map((p) => `${p.code} in ${p.where}`),
      "permission codes that do not match domain.action",
    ).toEqual([]);
  });

  test("the licensing write guard is the code the gateway seeds", () => {
    // Named explicitly because this is the one the owner would have hit first:
    // migration 0028 seeds 'licensing.write' and the licence detail screen is
    // the only place that gates on it.
    expect(found.map((p) => p.code)).toContain("licensing.write");
    expect(found.map((p) => p.code)).not.toContain("licensing:write");
  });
});

describe("the guard would reject a wrongly spelled code", () => {
  // Mirrors matches() in auth-context. Kept here so this file proves the bug
  // was real rather than asserting a style rule.
  function matches(granted: string, permission: string): boolean {
    if (granted === "*" || granted === permission) return true;
    if (granted.endsWith(".*")) return permission.startsWith(`${granted.slice(0, -2)}.`);
    if (granted.startsWith("*.")) return permission.endsWith(granted.slice(1));
    return false;
  }

  test("a colon-separated request never matches a dot-separated grant", () => {
    expect(matches("licensing.write", "licensing:write")).toBe(false);
    expect(matches("licensing.*", "licensing:write")).toBe(false);
  });

  test("the corrected spelling does match", () => {
    expect(matches("licensing.write", "licensing.write")).toBe(true);
    expect(matches("licensing.*", "licensing.write")).toBe(true);
    expect(matches("*", "licensing.write")).toBe(true);
  });
});
