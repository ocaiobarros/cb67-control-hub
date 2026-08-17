import { describe, expect, test } from "bun:test";
import { api, chooseAdapterKind, isMockMode, mockRefusedInProduction } from "./client";

/**
 * Production must never serve invented data.
 *
 * The first version of this rule keyed only on VITE_CB67_ENVIRONMENT ===
 * "production", and BOTH of that variable's failure modes point the wrong way:
 * it defaults to "development", and a typo like "prod" does not match. A
 * production build with the variable missing or misspelled would therefore have
 * shipped fabricated quota usage, error rates and licence counts — reachable by
 * forgetting one environment variable, with nothing on screen to say so.
 *
 * The authority is now Vite's own import.meta.env.PROD, which the bundler sets
 * for every `vite build` and which nobody can forget. The declared environment
 * is a second gate, not the only one.
 */
describe("adapter selection fails closed", () => {
  test("nothing reaches the mock without asking for it", () => {
    // The property that actually makes this safe. Two earlier versions detected
    // production and refused there, and both failed open: the flag defaulted to
    // true, the environment defaulted to "development", and a `--mode
    // development` artifact deployed to production has PROD=false. Every
    // default pointed at invented data.
    for (const isProd of [true, false]) {
      for (const environment of ["", "development", "staging", "prod", "production"]) {
        expect(`${isProd}/${environment}: ${chooseAdapterKind(isProd, environment, false)}`).toBe(
          `${isProd}/${environment}: http`,
        );
      }
    }
  });

  test("a production BUILD refuses the mock, whatever the variables say", () => {
    // This is the case that was open: a production build whose custom variables
    // were never set.
    expect(chooseAdapterKind(true, "development", true)).toBe("http");
    expect(chooseAdapterKind(true, "", true)).toBe("http");
    expect(chooseAdapterKind(true, "prod", true)).toBe("http");
    expect(chooseAdapterKind(true, "production", true)).toBe("http");
  });

  test("a declared production environment refuses it too", () => {
    // For a build that is not Vite-production but is deployed as production.
    expect(chooseAdapterKind(false, "production", true)).toBe("http");
  });

  test("a misspelled environment in a non-production build is not silently trusted", () => {
    // "prod" is not "production". In a development build that is harmless and
    // visible; the protection that matters is the build flag above.
    expect(chooseAdapterKind(false, "prod", true)).toBe("mock");
  });

  test("development honours the flag in both directions", () => {
    expect(chooseAdapterKind(false, "development", true)).toBe("mock");
    expect(chooseAdapterKind(false, "development", false)).toBe("http");
  });

  test("staging keeps its mocks unless built for production", () => {
    expect(chooseAdapterKind(false, "staging", true)).toBe("mock");
    expect(chooseAdapterKind(true, "staging", true)).toBe("http");
  });

  test("every combination that could ship to an operator resolves to http", () => {
    // Exhaustive over the build flag, so no combination is left to inspection.
    for (const environment of ["", "production", "prod", "staging", "development", "PRODUCTION"]) {
      for (const useMock of [true, false]) {
        expect(`${environment}/${useMock}: ${chooseAdapterKind(true, environment, useMock)}`).toBe(
          `${environment}/${useMock}: http`,
        );
      }
    }
  });
});

describe("this build", () => {
  test("does not use the mock", () => {
    expect(api.kind).toBe("http");
    expect(isMockMode).toBe(false);
  });

  test("is not a production build asking for mocks", () => {
    expect(mockRefusedInProduction).toBe(false);
  });
});
