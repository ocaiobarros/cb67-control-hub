/**
 * Domain types for the CB67 Labs Control Center frontend.
 *
 * HANDOFF CONTRACT: these types are the shape the UI consumes. The mock adapter
 * and the future HTTP adapter (src/api/http-adapter.ts) must both satisfy them.
 * If the backend returns different field names, map them inside the adapter —
 * never inside components.
 */

export type Environment = "production" | "staging" | "development";

export type EntityStatus =
  "active" | "disabled" | "revoked" | "expired" | "pending" | "suspended" | "grace";

export type HealthStatus = "healthy" | "degraded" | "unavailable" | "disabled" | "maintenance";

/**
 * Health as reported by a component whose behaviour is MEASURED rather than
 * declared.
 *
 * `unknown` is not a hedge: it is the accurate answer for something configured
 * but never observed. The API broker does not exist, so no request has crossed
 * any endpoint — "healthy" would assert a measurement never taken and
 * "unavailable" a failure never seen.
 *
 * Deliberately a SEPARATE type rather than a sixth member of HealthStatus. That
 * union is shared by infrastructure, providers, certificates, the database and
 * more; widening it would oblige every one of those domains to answer a
 * question only this one asked. Whether to widen it is the frontend contract
 * owner's decision; this type is what the API domain uses in the meantime.
 */
export type ObservedHealthStatus = HealthStatus | "unknown";

export type PlatformHealth = "healthy" | "degraded" | "critical" | "maintenance";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type TimeRange = "15m" | "1h" | "6h" | "24h" | "7d" | "30d";

export interface Paged<T> {
  rows: T[];
  total: number;
}

/**
 * A point on a time series.
 *
 * Series values are nullable because an interval in which nothing happened has
 * no measurement: an hour that served no request has no mean latency, and
 * plotting 0 would put a point on the chart at 0 ms. Charts and tooltips must
 * handle the gap rather than be handed a number that was never taken.
 */
export interface MetricPoint {
  t: string;
  [series: string]: number | string | null;
}

export interface MetricSeries {
  key: string;
  label: string;
  points: MetricPoint[];
}

export interface KeyValue {
  label: string;
  value: string;
}

/* ---------- SaaS ---------- */

export interface Application {
  id: string;
  name: string;
  code: string;
  environment: Environment;
  status: EntityStatus;
  instances: number;
  apiClientId: string;
  licenseStatus: EntityStatus;
  requests30d: number;
  /** Null when no request was measured. See ApiEndpoint.errorRate. */
  errorRate: number | null;
  /** Null when there is no sample, or the quantile is beyond the histogram. */
  p95Ms: number | null;
  /** Null when never seen. */
  lastSeen: string | null;
  certificateStatus: EntityStatus;
  /** Null until PKI issues a certificate. */
  certificateExpiresAt: string | null;
  allowedServices: string[];
  blockedServices: string[];
  monthlyQuota: number;
  quotaUsed: number;
  rateLimited: number;
  errors30d: number;
  /** Null when there is no sample, or the quantile is beyond the histogram. */
  p99Ms: number | null;
}

export interface Instance {
  id: string;
  applicationId: string;
  installationId: string;
  hostLabel: string;
  environment: Environment;
  version: string;
  status: EntityStatus;
  /** Null when never seen. */
  lastSeen: string | null;
  licenseId: string;
  certificateStatus: EntityStatus;
}

export interface MachineClient {
  id: string;
  clientId: string;
  applicationId: string;
  applicationName: string;
  environment: Environment;
  certificateStatus: EntityStatus;
  scopes: string[];
  status: EntityStatus;
  createdAt: string;
  /** Null when never seen. */
  lastSeen: string | null;
}

export interface ScopeDefinition {
  group: string;
  scope: string;
  description: string;
}

/* ---------- APIs ---------- */

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  version: string;
  scope: string;
  /** May be "unknown": see ObservedHealthStatus. */
  status: ObservedHealthStatus;
  /** A count: zero requests really is zero. */
  requests24h: number;
  /**
   * Null when there is no sample, and ALSO when the sample exists but the
   * quantile falls beyond the largest histogram bucket. 0 would say
   * "instantaneous"; null says "not measured".
   */
  p95Ms: number | null;
  /** Null when no request was measured — a rate over nothing is undefined. */
  errorRate: number | null;
}

export interface ApiRequestRecord {
  id: string;
  timestamp: string;
  requestId: string;
  clientId: string;
  applicationName: string;
  method: string;
  endpoint: string;
  provider: string | null;
  status: number;
  latencyMs: number;
  providerLatencyMs: number | null;
}

export interface ApiErrorGroup {
  id: string;
  statusClass: "4xx" | "5xx" | "timeout" | "provider";
  status: string;
  count: number;
  /** Null when the observed span is shorter than a minute: no rate to derive. */
  ratePerMin: number | null;
  /** Null when the previous hour had none — change from zero is undefined. */
  trend: number | null;
  firstSeen: string;
  /** Null when never seen. */
  lastSeen: string | null;
  affectedClients: number;
  affectedEndpoints: string[];
}

/**
 * Every percentile is nullable. A quantile over an empty sample has no value,
 * and one beyond the largest histogram bucket is censored rather than capped at
 * the bound. `max` is null until the broker records it; it is not inferred.
 */
export interface LatencyBreakdown {
  scope: "overall" | "internal" | "provider";
  p50: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
  max: number | null;
}

export interface RateLimitRule {
  id: string;
  applicationName: string;
  api: string;
  rps: number;
  rpm: number;
  daily: number;
  currentUsage: number;
  rateLimited: number;
  headroom: number;
  /** May be "unknown" for a limit that has never been exercised. */
  status: ObservedHealthStatus;
}

export interface QuotaRecord {
  id: string;
  applicationName: string;
  api: string;
  /**
   * Null when the application has no wildcard rate-limit rule. 0 would be a
   * concrete limit permitting nothing, rather than the absence of one.
   */
  rateLimitPerMin: number | null;
  monthlyQuota: number;
  used: number;
  /**
   * Null while the period is too young to project from, and null when nothing
   * has been consumed. 0 would assert a forecast of no usage, which is a
   * different statement from declining to forecast.
   */
  forecast: number | null;
  resetsAt: string;
}

/* ---------- Providers ---------- */

export interface Provider {
  id: "openai" | "gemini" | "google-maps";
  name: string;
  /** May be "unknown" for a provider that has never been called. */
  status: ObservedHealthStatus;
  requests24h: number;
  errors24h: number;
  rateLimited24h: number;
  /** Null when nothing was measured, or the quantile is beyond the histogram. */
  p95Ms: number | null;
  projects: number;
  credentials: number;
  /** Empty when no call has ever succeeded. */
  /** Null when no call has ever succeeded — not an empty string, which is NaN. */
  lastSuccessAt: string | null;
}

export interface ProviderProject {
  id: string;
  providerId: Provider["id"];
  applicationName: string;
  environment: Environment;
  project: string;
  credentialAlias: string;
  status: EntityStatus;
  requests24h: number;
  rateLimited24h: number;
  /**
   * Percentage of the provider's own monthly allowance. Null when we do not
   * know that allowance, and null when nothing has been consumed — a percentage
   * of an unknown denominator is not a percentage.
   */
  quotaUsage: number | null;
}

export interface CredentialMetadata {
  id: string;
  alias: string;
  providerId: Provider["id"];
  applicationName: string;
  environment: Environment;
  createdAt: string;
  /** Null when it has not happened. */
  lastRotatedAt: string | null;
  lastUsedAt: string | null;
  status: EntityStatus;
}

/* ---------- Licensing ---------- */

export interface LicenseProduct {
  id: string;
  name: string;
  code: string;
  versions: string[];
  plans: string[];
  activeLicenses: number;
  status: EntityStatus;
}

export interface Customer {
  id: string;
  name: string;
  products: string[];
  licenses: number;
  installations: number;
  status: EntityStatus;
  createdAt: string;
}

export interface License {
  id: string;
  key: string;
  customerName: string;
  productName: string;
  plan: string;
  status: EntityStatus;
  startsAt: string;
  expiresAt: string;
  installations: number;
  maxInstallations: number;
  lastValidationAt: string;
  features: string[];
}

export interface Installation {
  id: string;
  installationId: string;
  licenseKey: string;
  productName: string;
  version: string;
  status: EntityStatus;
  /** Null when never seen. */
  lastSeen: string | null;
  leaseId: string;
  graceUntil: string | null;
}

export interface Lease {
  id: string;
  leaseId: string;
  licenseKey: string;
  installationId: string;
  issuedAt: string;
  expiresAt: string;
  status: "valid" | "expired" | "revoked" | "grace";
  keyId: string;
}

export interface LicensePlan {
  id: string;
  name: string;
  code: string;
  maxInstallations: number;
  features: string[];
  activeLicenses: number;
  status: EntityStatus;
}

export interface LicenseFeature {
  id: string;
  name: string;
  code: string;
  description: string;
  products: string[];
  plans: string[];
  status: EntityStatus;
}

export interface Revocation {
  id: string;
  type: "license" | "installation" | "client" | "certificate";
  object: string;
  reason: string;
  actor: string;
  createdAt: string;
  status: EntityStatus;
}

/* ---------- Identity & Access ---------- */

export interface Administrator {
  id: string;
  name: string;
  role: string;
  status: EntityStatus;
  /** Null when the administrator has never signed in. */
  lastLoginAt: string | null;
  sessions: number;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  administrators: number;
  permissions: string[];
}

export interface Permission {
  id: string;
  code: string;
  label: string;
  roles: Record<string, boolean>;
}

export interface AdminSession {
  id: string;
  administrator: string;
  device: string;
  source: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  status: EntityStatus;
}

/* ---------- PKI ---------- */

export interface Certificate {
  id: string;
  subject: string;
  serial: string;
  clientId: string;
  type: "client" | "server" | "intermediate";
  issuer: string;
  fingerprint: string;
  issuedAt: string;
  expiresAt: string;
  status: EntityStatus;
}

/* ---------- Security ---------- */

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: Severity;
  category: string;
  clientId: string;
  source: string;
  event: string;
  decision: "allowed" | "denied";
  requestId: string;
}

export interface FirewallState {
  status: HealthStatus;
  policy: string;
  lastReloadAt: string;
  rulesCount: number;
  recentBlocks: number;
}

/* ---------- Observability / Infra ---------- */

export interface ServiceHealth {
  id: string;
  name: string;
  status: HealthStatus;
  detail: string;
  uptime: string;
}

export interface Host {
  id: string;
  name: string;
  role: string;
  environment: Environment;
  cpu: number;
  memory: number;
  storage: number;
  status: HealthStatus;
  uptime: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: "debug" | "info" | "warn" | "error";
  requestId: string;
  clientId: string;
  message: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  name: string;
  source: string;
  state: "firing" | "acknowledged" | "resolved";
  startedAt: string;
  duration: string;
}

/* ---------- Database / Backups ---------- */

export interface DatabaseHealth {
  status: HealthStatus;
  connections: number;
  maxConnections: number;
  transactionsPerSec: number;
  queriesPerSec: number;
  locks: number;
  deadlocks: number;
  cacheHitRatio: number;
  sizeBytes: number;
}

export interface BackupJob {
  id: string;
  name: string;
  type: "full" | "incremental" | "wal";
  target: string;
  schedule: string;
  lastRunAt: string;
  durationSec: number;
  status: HealthStatus;
}

export interface BackupRun {
  id: string;
  timestamp: string;
  type: BackupJob["type"];
  sizeBytes: number;
  checksum: "verified" | "failed" | "pending";
  durationSec: number;
  status: HealthStatus;
}

export interface RestoreTest {
  id: string;
  name: string;
  backup: string;
  startedAt: string;
  finishedAt: string;
  durationSec: number;
  result: "passed" | "failed";
  rpoMinutes: number;
  rtoMinutes: number;
}

/* ---------- Audit ---------- */

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorType: "administrator" | "machine" | "system";
  action: string;
  resource: string;
  resourceId: string;
  result: "success" | "denied" | "failure";
  source: string;
  requestId: string;
}

/* ---------- Aggregates ---------- */

export interface OverviewSnapshot {
  platformHealth: PlatformHealth;
  /** Counts. Zero traffic really is zero. */
  requests: number;
  rps: number;
  /** Measurements over that traffic. Null when there was none. */
  p95: number | null;
  p99: number | null;
  errorRate: number | null;
  activeSaas: number;
  activeLicenses: number;
  authFailures: number;
  rateLimited: number;
  statusCounts: { code: string; value: number }[];
  providers: Provider[];
  services: ServiceHealth[];
  /**
   * Null until something collects host metrics. "0% CPU" is a measurement, and
   * none has been taken — an idle-looking gauge would be an invented reading.
   */
  resources: { cpu: number; memory: number; storage: number } | null;
  charts: {
    requests: MetricPoint[];
    latency: MetricPoint[];
    errors: MetricPoint[];
    requestsBySaas: MetricPoint[];
    licensesByStatus: MetricPoint[];
    providerLatency: MetricPoint[];
    resources: MetricPoint[];
  };
}

export interface SecurityOverview {
  mtlsRejected: number;
  invalidTokens: number;
  unauthorized: number;
  forbidden: number;
  rateLimited: number;
  revokedCertAttempts: number;
  adminLoginFailures: number;
  suspiciousClients: number;
  authChart: MetricPoint[];
  authorizationChart: MetricPoint[];
}

export interface LicensingOverview {
  active: number;
  suspended: number;
  expired: number;
  revoked: number;
  grace: number;
  expiringSoon: number;
  byProduct: MetricPoint[];
  byPlan: MetricPoint[];
  expirationTimeline: MetricPoint[];
  activations: MetricPoint[];
}

export interface PublicServiceStatus {
  id: string;
  name: string;
  status: HealthStatus;
  description: string;
}

export interface Incident {
  id: string;
  title: string;
  state: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: string;
  updates: { at: string; state: Incident["state"]; message: string }[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface SearchResult {
  id: string;
  kind: "application" | "client" | "license" | "installation" | "certificate" | "request";
  label: string;
  detail: string;
  to: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}
