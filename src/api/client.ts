import { env } from "@/config/env";
import { mockAdapter } from "@/mocks/adapter";
import { httpAdapter } from "./http-adapter";
import type { PlatformAdapter } from "./adapter";

/**
 * Single entry point for every backend interaction.
 *
 * Mock mode is controlled by VITE_USE_MOCK_API, which DEFAULTS TO TRUE — a
 * sensible default for someone running the app alone, and a dangerous one in
 * production: a missing or misspelled variable in a production build would have
 * served invented figures to an operator with nothing on screen to say so.
 * Quota usage, error rates and licence counts would all have looked real.
 *
 * So production refuses the mock outright, whatever the flag says. The
 * environment is the authority, not a boolean someone can forget to set.
 *
 * What happens when the real API is then unreachable is a CONTROLLED failure:
 * httpAdapter refuses every call and the screens render their error state. That
 * is the right outcome — an operator who can see the platform is unreachable
 * can act on it; one reading fabricated numbers cannot.
 *
 * The rule itself lives in chooseAdapterKind, as a pure function of the two
 * inputs that decide it.
 */

/**
 * The rule, as a pure function of the two inputs that decide it.
 *
 * Separated from the module so it can be tested against every combination.
 * Testing it through the module meant reloading a graph whose `env` is read once
 * at load and cached, so the second case in a suite silently reused the first
 * one's environment — a test that could not fail for the right reason.
 */
export function chooseAdapterKind(
  isProductionBuild: boolean,
  environment: string,
  useMockApi: boolean,
): "http" | "mock" {
  // Two independent reasons to refuse, because either alone fails open.
  //
  // `isProductionBuild` is Vite's own import.meta.env.PROD: true for every
  // `vite build`, set by the bundler, impossible to forget. This is the one that
  // matters. An earlier version keyed only on VITE_CB67_ENVIRONMENT ===
  // "production", and both of that variable's failure modes point the wrong way
  // — it DEFAULTS to "development", and a typo like "prod" does not match. A
  // production build with the variable missing or misspelled would have shipped
  // fabricated data, reachable by forgetting one environment variable.
  //
  // The declared environment stays as a second gate, for a build that is not
  // Vite-production but is deployed as production anyway.
  if (isProductionBuild) return "http";
  if (environment === "production") return "http";
  return useMockApi ? "mock" : "http";
}

function selectAdapter(): PlatformAdapter {
  return chooseAdapterKind(import.meta.env.PROD, env.environment, env.useMockApi) === "mock"
    ? mockAdapter
    : httpAdapter;
}

/**
 * True when this build asked for mock data AND is running in production.
 *
 * Surfaced rather than quietly corrected: a production build requesting mocks is
 * a deployment mistake, and the operator should be told the configuration is
 * wrong even though the platform is right to ignore it.
 */
export const mockRefusedInProduction =
  (import.meta.env.PROD || env.environment === "production") && env.useMockApi;

export const api: PlatformAdapter = selectAdapter();

export const isMockMode = api.kind === "mock";
