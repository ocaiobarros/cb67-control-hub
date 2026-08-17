/**
 * Single source of truth for runtime configuration.
 * Never read import.meta.env outside this file.
 */

const raw = import.meta.env as Record<string, string | undefined>;

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  apiBaseUrl: raw["VITE_CB67_API_BASE_URL"] ?? "",
  licenseBaseUrl: raw["VITE_CB67_LICENSE_BASE_URL"] ?? "",
  statusBaseUrl: raw["VITE_CB67_STATUS_BASE_URL"] ?? "",
  prometheusUrl: raw["VITE_PROMETHEUS_URL"] ?? "",
  alertmanagerUrl: raw["VITE_ALERTMANAGER_URL"] ?? "",
  /** Mock mode stays on until the backend exposes the contracts in docs/API-CONTRACTS.md. */
  /**
   * Mock data is OPT-IN. Defaults to false.
   *
   * It defaulted to true, which meant a build that simply forgot the variable
   * served fabricated quota usage, error rates and licence counts. Detecting
   * production and refusing there was not enough: an artifact built with
   * `--mode development` and deployed to production has PROD=false, the
   * environment defaulting to "development", and the flag defaulting to true —
   * every default pointing at invented data.
   *
   * A default that fails towards fiction is the wrong default whatever guards
   * sit above it. Asking for mocks is now an explicit act.
   */
  useMockApi: flag(raw["VITE_USE_MOCK_API"], false),
  environment: (raw["VITE_CB67_ENVIRONMENT"] ?? "development") as
    "production" | "staging" | "development",
  telemetryEnabled: flag(raw["VITE_CB67_TELEMETRY_ENABLED"], false),
} as const;

export const platformMeta = {
  name: "CB67 Labs",
  productName: "CB67 Labs Control Center",
  publicDomain: "cb67labs.api.br",
  docsDomain: "docs.cb67labs.api.br",
  statusDomain: "status.cb67labs.api.br",
  adminDomain: "admin.cb67labs.api.br",
  prometheusDomain: "prometheus.cb67labs.api.br",
  alertmanagerDomain: "alertmanager.cb67labs.api.br",
} as const;
