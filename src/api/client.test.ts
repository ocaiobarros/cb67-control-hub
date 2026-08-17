import { describe, expect, test } from "bun:test";
import { api, chooseAdapterKind, isMockMode, mockRefusedInProduction } from "./client";

/**
 * Production must never serve invented data.
 *
 * VITE_USE_MOCK_API defaults to TRUE, so a production build with the variable
 * missing or misspelled would have selected the mock adapter and shown an
 * operator fabricated quota usage, error rates and licence counts with nothing
 * on screen to indicate it. That is worse than an outage, because an outage is
 * visible.
 *
 * The rule is tested as a pure function. Testing it by reloading the module
 * graph did not work: `env` is read once at load and cached, so the second case
 * reused the first one's environment and passed for the wrong reason.
 */
describe("adapter selection", () => {
  test("production refuses the mock however the flag is set", () => {
    expect(chooseAdapterKind("production", true)).toBe("http");
    expect(chooseAdapterKind("production", false)).toBe("http");
  });

  test("the dangerous default is covered", () => {
    // An unset VITE_USE_MOCK_API arrives here as `true`. A production deploy
    // that simply forgot the variable would have looked perfectly healthy while
    // showing numbers nobody measured.
    expect(chooseAdapterKind("production", true)).toBe("http");
  });

  test("development honours the flag in both directions", () => {
    expect(chooseAdapterKind("development", true)).toBe("mock");
    expect(chooseAdapterKind("development", false)).toBe("http");
  });

  test("staging is deliberately not protected", () => {
    // Only "production" is. A staging environment that wants mocks is a
    // legitimate arrangement, and saying so makes it a choice rather than an
    // oversight.
    expect(chooseAdapterKind("staging", true)).toBe("mock");
  });

  test("an unrecognised environment is treated as non-production", () => {
    // Conservative in the direction that matters: an unknown environment is not
    // silently granted production's protection, so a typo in the variable is
    // visible in development rather than hidden.
    expect(chooseAdapterKind("prod", true)).toBe("mock");
  });
});

describe("this build", () => {
  test("does not use the mock", () => {
    // The deployed build is production. If this ever fails, the Control Center
    // is showing invented data to an operator.
    expect(api.kind).toBe("http");
    expect(isMockMode).toBe(false);
  });

  test("does not have a production build asking for mocks", () => {
    expect(mockRefusedInProduction).toBe(false);
  });
});
