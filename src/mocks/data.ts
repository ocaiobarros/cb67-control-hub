/**
 * MOCK CATALOG — fictitious data only. See docs/MOCK-CATALOG.md.
 * Every export here is consumed exclusively by src/mocks/adapter.ts.
 * Deleting this directory plus the MockAdapter wiring in src/api/client.ts
 * removes all fake data from the application.
 */
import type {
  Administrator,
  AdminSession,
  Alert,
  ApiEndpoint,
  ApiErrorGroup,
  ApiRequestRecord,
  Application,
  AuditEvent,
  BackupJob,
  BackupRun,
  Certificate,
  ChangelogEntry,
  CredentialMetadata,
  Customer,
  DatabaseHealth,
  FirewallState,
  Host,
  Incident,
  Installation,
  Instance,
  LatencyBreakdown,
  Lease,
  License,
  LicenseFeature,
  LicensePlan,
  LicenseProduct,
  LogEntry,
  MachineClient,
  MetricPoint,
  Permission,
  Provider,
  ProviderProject,
  PublicServiceStatus,
  QuotaRecord,
  RateLimitRule,
  RestoreTest,
  Revocation,
  Role,
  ScopeDefinition,
  SecurityEvent,
  ServiceHealth,
  TimeRange,
} from "@/types";

/** Deterministic pseudo-random generator so mock screens are stable between renders. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const RANGE_POINTS: Record<TimeRange, { count: number; stepMs: number }> = {
  "15m": { count: 15, stepMs: 60_000 },
  "1h": { count: 24, stepMs: 150_000 },
  "6h": { count: 36, stepMs: 600_000 },
  "24h": { count: 24, stepMs: 3_600_000 },
  "7d": { count: 28, stepMs: 21_600_000 },
  "30d": { count: 30, stepMs: 86_400_000 },
};

export function buildSeries(
  range: TimeRange,
  seriesSpec: Record<string, { base: number; spread: number; decimals?: number }>,
  seed = 7,
): MetricPoint[] {
  const { count, stepMs } = RANGE_POINTS[range];
  const rand = seeded(seed);
  const end = Date.UTC(2026, 7, 16, 14, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(end - (count - 1 - i) * stepMs).toISOString();
    const point: MetricPoint = { t };
    for (const [key, cfg] of Object.entries(seriesSpec)) {
      const wave = Math.sin((i / count) * Math.PI * 2) * cfg.spread * 0.5;
      const noise = (rand() - 0.5) * cfg.spread;
      const value = cfg.base + wave + noise;
      point[key] = Number(Math.max(0, value).toFixed(cfg.decimals ?? 0));
    }
    return point;
  });
}

const iso = (daysFromNow: number, hour = 12) =>
  new Date(Date.UTC(2026, 7, 16 + daysFromNow, hour, 15, 0)).toISOString();

/* ------------------------------------------------------------------ SaaS */

export const MockApplications: Application[] = [
  {
    id: "app-terere",
    name: "Tereré Money",
    code: "terere-money",
    environment: "production",
    status: "active",
    instances: 4,
    apiClientId: "terere-prod-001",
    licenseStatus: "active",
    requests30d: 482913,
    errorRate: 0.04,
    p95Ms: 87,
    lastSeen: iso(0, 13),
    certificateStatus: "active",
    certificateExpiresAt: iso(46),
    allowedServices: ["ai.generate", "ai.embeddings", "maps.geocode", "license.validate"],
    blockedServices: ["maps.routes", "admin.*"],
    monthlyQuota: 600000,
    quotaUsed: 482913,
    rateLimited: 31,
    errors30d: 193,
    p99Ms: 164,
  },
  {
    id: "app-glp",
    name: "Distribuidora GLP",
    code: "distribuidora-glp",
    environment: "production",
    status: "active",
    instances: 2,
    apiClientId: "glp-prod-004",
    licenseStatus: "active",
    requests30d: 214508,
    errorRate: 0.11,
    p95Ms: 132,
    lastSeen: iso(0, 12),
    certificateStatus: "active",
    certificateExpiresAt: iso(11),
    allowedServices: ["maps.geocode", "maps.routes", "license.validate"],
    blockedServices: ["ai.generate", "admin.*"],
    monthlyQuota: 300000,
    quotaUsed: 214508,
    rateLimited: 78,
    errors30d: 236,
    p99Ms: 289,
  },
  {
    id: "app-barber",
    name: "AppBarber",
    code: "appbarber",
    environment: "production",
    status: "active",
    instances: 6,
    apiClientId: "barber-prod-002",
    licenseStatus: "grace",
    requests30d: 98422,
    errorRate: 0.32,
    p95Ms: 210,
    lastSeen: iso(0, 11),
    certificateStatus: "active",
    certificateExpiresAt: iso(5),
    allowedServices: ["ai.generate", "maps.geocode", "license.validate"],
    blockedServices: ["ai.embeddings", "maps.routes"],
    monthlyQuota: 120000,
    quotaUsed: 98422,
    rateLimited: 214,
    errors30d: 315,
    p99Ms: 402,
  },
  {
    id: "app-frota",
    name: "Frota Control",
    code: "frota-control",
    environment: "staging",
    status: "active",
    instances: 1,
    apiClientId: "frota-stg-001",
    licenseStatus: "pending",
    requests30d: 12904,
    errorRate: 0.86,
    p95Ms: 245,
    lastSeen: iso(-1, 9),
    certificateStatus: "active",
    certificateExpiresAt: iso(112),
    allowedServices: ["maps.routes", "license.validate"],
    blockedServices: ["ai.generate", "ai.embeddings"],
    monthlyQuota: 50000,
    quotaUsed: 12904,
    rateLimited: 12,
    errors30d: 111,
    p99Ms: 512,
  },
  {
    id: "app-agenda",
    name: "Agenda Clínica",
    code: "agenda-clinica",
    environment: "production",
    status: "suspended",
    instances: 0,
    apiClientId: "agenda-prod-007",
    licenseStatus: "suspended",
    requests30d: 4210,
    errorRate: 2.4,
    p95Ms: 320,
    lastSeen: iso(-9, 16),
    certificateStatus: "expired",
    certificateExpiresAt: iso(-3),
    allowedServices: ["license.validate"],
    blockedServices: ["ai.generate", "maps.geocode", "maps.routes"],
    monthlyQuota: 80000,
    quotaUsed: 4210,
    rateLimited: 0,
    errors30d: 101,
    p99Ms: 780,
  },
  {
    id: "app-labs-internal",
    name: "Labs Internal Tools",
    code: "labs-internal",
    environment: "development",
    status: "active",
    instances: 2,
    apiClientId: "labs-dev-010",
    licenseStatus: "active",
    requests30d: 30188,
    errorRate: 0.19,
    p95Ms: 74,
    lastSeen: iso(0, 10),
    certificateStatus: "active",
    certificateExpiresAt: iso(203),
    allowedServices: ["ai.generate", "ai.embeddings", "maps.geocode", "license.validate"],
    blockedServices: ["admin.*"],
    monthlyQuota: 100000,
    quotaUsed: 30188,
    rateLimited: 3,
    errors30d: 57,
    p99Ms: 141,
  },
];

export const MockInstances: Instance[] = [
  {
    id: "ins-1",
    applicationId: "app-terere",
    installationId: "INST-9F31A2",
    hostLabel: "terere-node-a",
    environment: "production",
    version: "3.4.1",
    status: "active",
    lastSeen: iso(0, 13),
    licenseId: "CB67-TERERE-0000182",
    certificateStatus: "active",
  },
  {
    id: "ins-2",
    applicationId: "app-terere",
    installationId: "INST-7C20B4",
    hostLabel: "terere-node-b",
    environment: "production",
    version: "3.4.1",
    status: "active",
    lastSeen: iso(0, 13),
    licenseId: "CB67-TERERE-0000182",
    certificateStatus: "active",
  },
  {
    id: "ins-3",
    applicationId: "app-glp",
    installationId: "INST-11D8E7",
    hostLabel: "glp-edge-1",
    environment: "production",
    version: "2.1.9",
    status: "active",
    lastSeen: iso(0, 12),
    licenseId: "CB67-GLP-0000044",
    certificateStatus: "active",
  },
  {
    id: "ins-4",
    applicationId: "app-barber",
    installationId: "INST-33AA10",
    hostLabel: "barber-pos-12",
    environment: "production",
    version: "1.8.0",
    status: "grace",
    lastSeen: iso(0, 8),
    licenseId: "CB67-BARBER-0000311",
    certificateStatus: "active",
  },
  {
    id: "ins-5",
    applicationId: "app-agenda",
    installationId: "INST-51BC93",
    hostLabel: "agenda-main",
    environment: "production",
    version: "1.2.4",
    status: "suspended",
    lastSeen: iso(-9, 16),
    licenseId: "CB67-AGENDA-0000090",
    certificateStatus: "expired",
  },
  {
    id: "ins-6",
    applicationId: "app-frota",
    installationId: "INST-88E4C1",
    hostLabel: "frota-stg",
    environment: "staging",
    version: "0.9.3-rc2",
    status: "pending",
    lastSeen: iso(-1, 9),
    licenseId: "CB67-FROTA-0000005",
    certificateStatus: "active",
  },
];

export const MockMachineClients: MachineClient[] = [
  {
    id: "mc-1",
    clientId: "terere-prod-001",
    applicationId: "app-terere",
    applicationName: "Tereré Money",
    environment: "production",
    certificateStatus: "active",
    scopes: ["ai.generate", "ai.embeddings", "maps.geocode", "license.validate"],
    status: "active",
    createdAt: iso(-420),
    lastSeen: iso(0, 13),
  },
  {
    id: "mc-2",
    clientId: "glp-prod-004",
    applicationId: "app-glp",
    applicationName: "Distribuidora GLP",
    environment: "production",
    certificateStatus: "active",
    scopes: ["maps.geocode", "maps.routes", "license.validate"],
    status: "active",
    createdAt: iso(-310),
    lastSeen: iso(0, 12),
  },
  {
    id: "mc-3",
    clientId: "barber-prod-002",
    applicationId: "app-barber",
    applicationName: "AppBarber",
    environment: "production",
    certificateStatus: "active",
    scopes: ["ai.generate", "maps.geocode", "license.validate"],
    status: "active",
    createdAt: iso(-260),
    lastSeen: iso(0, 11),
  },
  {
    id: "mc-4",
    clientId: "agenda-prod-007",
    applicationId: "app-agenda",
    applicationName: "Agenda Clínica",
    environment: "production",
    certificateStatus: "expired",
    scopes: ["license.validate"],
    status: "disabled",
    createdAt: iso(-190),
    lastSeen: iso(-9, 16),
  },
  {
    id: "mc-5",
    clientId: "legacy-import-003",
    applicationId: "app-labs-internal",
    applicationName: "Labs Internal Tools",
    environment: "development",
    certificateStatus: "revoked",
    scopes: [],
    status: "revoked",
    createdAt: iso(-540),
    lastSeen: iso(-64, 4),
  },
  {
    id: "mc-6",
    clientId: "frota-stg-001",
    applicationId: "app-frota",
    applicationName: "Frota Control",
    environment: "staging",
    certificateStatus: "active",
    scopes: ["maps.routes", "license.validate"],
    status: "active",
    createdAt: iso(-40),
    lastSeen: iso(-1, 9),
  },
];

export const MockScopes: ScopeDefinition[] = [
  { group: "AI", scope: "ai.generate", description: "Geração de texto através do gateway de IA." },
  { group: "AI", scope: "ai.embeddings", description: "Geração de embeddings." },
  { group: "Maps", scope: "maps.geocode", description: "Geocodificação de endereços." },
  { group: "Maps", scope: "maps.routes", description: "Cálculo de rotas e matriz de distâncias." },
  {
    group: "Licensing",
    scope: "license.validate",
    description: "Validação de licença e renovação de lease.",
  },
  {
    group: "Administration",
    scope: "admin.*",
    description: "Acesso total ao plano de gerenciamento. Nunca concedido a clientes SaaS.",
  },
];

/* ------------------------------------------------------------------ APIs */

export const MockEndpoints: ApiEndpoint[] = [
  {
    id: "ep-1",
    method: "POST",
    path: "/v1/ai/generate",
    version: "v1",
    scope: "ai.generate",
    status: "healthy",
    requests24h: 41288,
    p95Ms: 910,
    errorRate: 0.12,
  },
  {
    id: "ep-2",
    method: "POST",
    path: "/v1/ai/embeddings",
    version: "v1",
    scope: "ai.embeddings",
    status: "healthy",
    requests24h: 18422,
    p95Ms: 320,
    errorRate: 0.05,
  },
  {
    id: "ep-3",
    method: "POST",
    path: "/v1/maps/geocode",
    version: "v1",
    scope: "maps.geocode",
    status: "healthy",
    requests24h: 29011,
    p95Ms: 180,
    errorRate: 0.03,
  },
  {
    id: "ep-4",
    method: "POST",
    path: "/v1/maps/routes",
    version: "v1",
    scope: "maps.routes",
    status: "degraded",
    requests24h: 8123,
    p95Ms: 640,
    errorRate: 1.42,
  },
  {
    id: "ep-5",
    method: "POST",
    path: "/v1/licenses/lease",
    version: "v1",
    scope: "license.validate",
    status: "healthy",
    requests24h: 12988,
    p95Ms: 44,
    errorRate: 0.01,
  },
  {
    id: "ep-6",
    method: "GET",
    path: "/v1/health",
    version: "v1",
    scope: "public",
    status: "healthy",
    requests24h: 86400,
    p95Ms: 6,
    errorRate: 0,
  },
];

const REQUEST_SEED = seeded(42);
const requestClients = MockMachineClients.slice(0, 4);
export const MockApiRequests: ApiRequestRecord[] = Array.from({ length: 120 }, (_, i) => {
  const client = requestClients[i % requestClients.length]!;
  const endpoint = MockEndpoints[i % MockEndpoints.length]!;
  const r = REQUEST_SEED();
  const status = r > 0.94 ? 500 : r > 0.9 ? 429 : r > 0.86 ? 403 : r > 0.82 ? 401 : 200;
  const provider = endpoint.path.includes("/ai/")
    ? i % 2 === 0
      ? "OpenAI"
      : "Gemini"
    : endpoint.path.includes("/maps/")
      ? "Google Maps"
      : null;
  return {
    id: `req-${i}`,
    timestamp: new Date(Date.UTC(2026, 7, 16, 13, 59, 0) - i * 37_000).toISOString(),
    requestId: `req_${(0x1a2b3c + i * 7919).toString(16).toUpperCase()}`,
    clientId: client.clientId,
    applicationName: client.applicationName,
    method: endpoint.method,
    endpoint: endpoint.path,
    provider,
    status,
    latencyMs: Math.round(40 + r * 900),
    providerLatencyMs: provider ? Math.round(30 + r * 700) : null,
  };
});

export const MockApiErrorGroups: ApiErrorGroup[] = [
  {
    id: "err-401",
    statusClass: "4xx",
    status: "401 Unauthorized",
    count: 13,
    ratePerMin: 0.4,
    trend: -12,
    firstSeen: iso(-6, 8),
    lastSeen: iso(0, 13),
    affectedClients: 2,
    affectedEndpoints: ["/v1/ai/generate", "/v1/licenses/lease"],
  },
  {
    id: "err-403",
    statusClass: "4xx",
    status: "403 Forbidden",
    count: 5,
    ratePerMin: 0.1,
    trend: 4,
    firstSeen: iso(-3, 9),
    lastSeen: iso(0, 12),
    affectedClients: 1,
    affectedEndpoints: ["/v1/maps/routes"],
  },
  {
    id: "err-404",
    statusClass: "4xx",
    status: "404 Not Found",
    count: 22,
    ratePerMin: 0.6,
    trend: 0,
    firstSeen: iso(-12, 7),
    lastSeen: iso(0, 11),
    affectedClients: 3,
    affectedEndpoints: ["/v1/ai/embeddings"],
  },
  {
    id: "err-409",
    statusClass: "4xx",
    status: "409 Conflict",
    count: 3,
    ratePerMin: 0.05,
    trend: -50,
    firstSeen: iso(-2, 15),
    lastSeen: iso(-1, 10),
    affectedClients: 1,
    affectedEndpoints: ["/v1/licenses/lease"],
  },
  {
    id: "err-422",
    statusClass: "4xx",
    status: "422 Unprocessable",
    count: 41,
    ratePerMin: 1.1,
    trend: 18,
    firstSeen: iso(-20, 6),
    lastSeen: iso(0, 13),
    affectedClients: 4,
    affectedEndpoints: ["/v1/ai/generate", "/v1/maps/geocode"],
  },
  {
    id: "err-429",
    statusClass: "4xx",
    status: "429 Too Many Requests",
    count: 338,
    ratePerMin: 9.2,
    trend: 27,
    firstSeen: iso(-30, 0),
    lastSeen: iso(0, 13),
    affectedClients: 4,
    affectedEndpoints: ["/v1/ai/generate", "/v1/maps/geocode", "/v1/maps/routes"],
  },
  {
    id: "err-5xx",
    statusClass: "5xx",
    status: "502 Bad Gateway",
    count: 9,
    ratePerMin: 0.2,
    trend: -30,
    firstSeen: iso(-4, 3),
    lastSeen: iso(0, 5),
    affectedClients: 2,
    affectedEndpoints: ["/v1/ai/generate"],
  },
  {
    id: "err-timeout",
    statusClass: "timeout",
    status: "Upstream timeout",
    count: 17,
    ratePerMin: 0.4,
    trend: 61,
    firstSeen: iso(-5, 2),
    lastSeen: iso(0, 9),
    affectedClients: 2,
    affectedEndpoints: ["/v1/maps/routes"],
  },
  {
    id: "err-provider",
    statusClass: "provider",
    status: "Provider rejected request",
    count: 28,
    ratePerMin: 0.7,
    trend: 8,
    firstSeen: iso(-10, 1),
    lastSeen: iso(0, 10),
    affectedClients: 3,
    affectedEndpoints: ["/v1/ai/generate", "/v1/ai/embeddings"],
  },
];

export const MockLatency: LatencyBreakdown[] = [
  { scope: "overall", p50: 62, p90: 74, p95: 87, p99: 164, max: 1820 },
  { scope: "internal", p50: 11, p90: 18, p95: 24, p99: 41, max: 260 },
  { scope: "provider", p50: 48, p90: 61, p95: 71, p99: 138, max: 1610 },
];

export const MockRateLimits: RateLimitRule[] = MockApplications.slice(0, 5).map((app, i) => ({
  id: `rl-${i}`,
  applicationName: app.name,
  api: ["Geração de IA", "Geocodificação de Mapas", "Embeddings de IA", "Rotas de Mapas", "Validação de Licença"][i]!,
  rps: [20, 15, 10, 8, 30][i]!,
  rpm: [1200, 900, 600, 480, 1800][i]!,
  daily: [200000, 120000, 80000, 40000, 300000][i]!,
  currentUsage: [864, 712, 240, 431, 190][i]!,
  rateLimited: app.rateLimited,
  headroom: [28, 21, 60, 10, 89][i]!,
  status: (["healthy", "healthy", "healthy", "degraded", "healthy"] as const)[i]!,
}));

export const MockQuotas: QuotaRecord[] = MockApplications.slice(0, 5).map((app, i) => ({
  id: `q-${i}`,
  applicationName: app.name,
  api: ["Geração de IA", "Geocodificação de Mapas", "Embeddings de IA", "Rotas de Mapas", "Validação de Licença"][i]!,
  rateLimitPerMin: [1200, 900, 600, 480, 1800][i]!,
  monthlyQuota: app.monthlyQuota,
  used: app.quotaUsed,
  forecast: Math.round(app.quotaUsed * 1.28),
  resetsAt: iso(15, 0),
}));

/* ------------------------------------------------------------------ Providers */

export const MockProviders: Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    status: "healthy",
    requests24h: 41288,
    errors24h: 52,
    rateLimited24h: 118,
    p95Ms: 910,
    projects: 4,
    credentials: 4,
    lastSuccessAt: iso(0, 13),
  },
  {
    id: "gemini",
    name: "Google Gemini",
    status: "degraded",
    requests24h: 18422,
    errors24h: 210,
    rateLimited24h: 402,
    p95Ms: 620,
    projects: 3,
    credentials: 3,
    lastSuccessAt: iso(0, 13),
  },
  {
    id: "google-maps",
    name: "Google Maps",
    status: "healthy",
    requests24h: 37134,
    errors24h: 41,
    rateLimited24h: 63,
    p95Ms: 180,
    projects: 3,
    credentials: 5,
    lastSuccessAt: iso(0, 13),
  },
];

export const MockProviderProjects: ProviderProject[] = [
  {
    id: "pp-1",
    providerId: "openai",
    applicationName: "Tereré Money",
    environment: "production",
    project: "openai-terere",
    credentialAlias: "openai-terere-prod",
    status: "active",
    requests24h: 21044,
    rateLimited24h: 41,
    quotaUsage: 62,
  },
  {
    id: "pp-2",
    providerId: "openai",
    applicationName: "AppBarber",
    environment: "production",
    project: "openai-barber",
    credentialAlias: "openai-barber-prod",
    status: "active",
    requests24h: 9042,
    rateLimited24h: 63,
    quotaUsage: 81,
  },
  {
    id: "pp-3",
    providerId: "openai",
    applicationName: "Labs Internal Tools",
    environment: "development",
    project: "openai-labs",
    credentialAlias: "openai-labs-dev",
    status: "active",
    requests24h: 1220,
    rateLimited24h: 0,
    quotaUsage: 12,
  },
  {
    id: "pp-4",
    providerId: "gemini",
    applicationName: "Tereré Money",
    environment: "production",
    project: "gemini-terere",
    credentialAlias: "gemini-terere-prod",
    status: "active",
    requests24h: 11402,
    rateLimited24h: 288,
    quotaUsage: 91,
  },
  {
    id: "pp-5",
    providerId: "gemini",
    applicationName: "Labs Internal Tools",
    environment: "development",
    project: "gemini-labs",
    credentialAlias: "gemini-labs-dev",
    status: "active",
    requests24h: 902,
    rateLimited24h: 4,
    quotaUsage: 8,
  },
  {
    id: "pp-6",
    providerId: "gemini",
    applicationName: "Agenda Clínica",
    environment: "production",
    project: "gemini-agenda",
    credentialAlias: "gemini-agenda-prod",
    status: "disabled",
    requests24h: 0,
    rateLimited24h: 0,
    quotaUsage: 0,
  },
  {
    id: "pp-7",
    providerId: "google-maps",
    applicationName: "Distribuidora GLP",
    environment: "production",
    project: "maps-glp",
    credentialAlias: "maps-glp-server",
    status: "active",
    requests24h: 19811,
    rateLimited24h: 52,
    quotaUsage: 74,
  },
  {
    id: "pp-8",
    providerId: "google-maps",
    applicationName: "Tereré Money",
    environment: "production",
    project: "maps-terere",
    credentialAlias: "maps-terere-server",
    status: "active",
    requests24h: 12488,
    rateLimited24h: 11,
    quotaUsage: 38,
  },
  {
    id: "pp-9",
    providerId: "google-maps",
    applicationName: "Frota Control",
    environment: "staging",
    project: "maps-frota",
    credentialAlias: "maps-frota-stg",
    status: "pending",
    requests24h: 812,
    rateLimited24h: 0,
    quotaUsage: 4,
  },
];

export const MockCredentials: CredentialMetadata[] = MockProviderProjects.map((p, i) => ({
  id: `cred-${i}`,
  alias: p.credentialAlias,
  providerId: p.providerId,
  applicationName: p.applicationName,
  environment: p.environment,
  createdAt: iso(-320 + i * 20),
  lastRotatedAt: iso(-60 + i * 5),
  lastUsedAt: p.status === "active" ? iso(0, 13) : iso(-9, 16),
  status: p.status,
}));

/* ------------------------------------------------------------------ Licensing */

export const MockProducts: LicenseProduct[] = [
  {
    id: "prod-1",
    name: "Tereré Money",
    code: "TERERE",
    versions: ["3.4", "3.3", "3.2"],
    plans: ["Starter", "Professional", "Enterprise"],
    activeLicenses: 62,
    status: "active",
  },
  {
    id: "prod-2",
    name: "Distribuidora GLP",
    code: "GLP",
    versions: ["2.1", "2.0"],
    plans: ["Professional", "Enterprise"],
    activeLicenses: 28,
    status: "active",
  },
  {
    id: "prod-3",
    name: "AppBarber",
    code: "BARBER",
    versions: ["1.8", "1.7"],
    plans: ["Free", "Starter", "Professional"],
    activeLicenses: 31,
    status: "active",
  },
  {
    id: "prod-4",
    name: "Frota Control",
    code: "FROTA",
    versions: ["0.9"],
    plans: ["Starter"],
    activeLicenses: 3,
    status: "pending",
  },
];

export const MockCustomers: Customer[] = [
  {
    id: "cus-1",
    name: "Cliente XYZ",
    products: ["Tereré Money"],
    licenses: 3,
    installations: 5,
    status: "active",
    createdAt: iso(-620),
  },
  {
    id: "cus-2",
    name: "Comercial Alfa",
    products: ["Distribuidora GLP", "Frota Control"],
    licenses: 4,
    installations: 6,
    status: "active",
    createdAt: iso(-480),
  },
  {
    id: "cus-3",
    name: "Rede Beta",
    products: ["AppBarber"],
    licenses: 9,
    installations: 14,
    status: "active",
    createdAt: iso(-390),
  },
  {
    id: "cus-4",
    name: "Grupo Delta",
    products: ["Tereré Money", "AppBarber"],
    licenses: 2,
    installations: 2,
    status: "suspended",
    createdAt: iso(-240),
  },
  {
    id: "cus-5",
    name: "Clínica Ômega",
    products: ["Agenda Clínica"],
    licenses: 1,
    installations: 1,
    status: "expired",
    createdAt: iso(-150),
  },
];

export const MockLicenses: License[] = [
  {
    id: "lic-1",
    key: "CB67-TERERE-0000182",
    customerName: "Cliente XYZ",
    productName: "Tereré Money",
    plan: "Professional",
    status: "active",
    startsAt: iso(-180),
    expiresAt: iso(185),
    installations: 1,
    maxInstallations: 2,
    lastValidationAt: iso(0, 13),
    features: ["Painel de IA", "Importação Bancária", "OpenAI", "Gemini", "API Externa"],
  },
  {
    id: "lic-2",
    key: "CB67-GLP-0000044",
    customerName: "Comercial Alfa",
    productName: "Distribuidora GLP",
    plan: "Enterprise",
    status: "active",
    startsAt: iso(-300),
    expiresAt: iso(65),
    installations: 2,
    maxInstallations: 5,
    lastValidationAt: iso(0, 12),
    features: ["Roteamento", "Relatórios de Frota", "API Externa"],
  },
  {
    id: "lic-3",
    key: "CB67-BARBER-0000311",
    customerName: "Rede Beta",
    productName: "AppBarber",
    plan: "Starter",
    status: "grace",
    startsAt: iso(-90),
    expiresAt: iso(-2),
    installations: 6,
    maxInstallations: 6,
    lastValidationAt: iso(0, 8),
    features: ["Agendamento", "Painel de IA"],
  },
  {
    id: "lic-4",
    key: "CB67-AGENDA-0000090",
    customerName: "Clínica Ômega",
    productName: "Agenda Clínica",
    plan: "Starter",
    status: "suspended",
    startsAt: iso(-420),
    expiresAt: iso(-30),
    installations: 1,
    maxInstallations: 1,
    lastValidationAt: iso(-9, 16),
    features: ["Agendamento"],
  },
  {
    id: "lic-5",
    key: "CB67-FROTA-0000005",
    customerName: "Comercial Alfa",
    productName: "Frota Control",
    plan: "Starter",
    status: "pending",
    startsAt: iso(-3),
    expiresAt: iso(362),
    installations: 1,
    maxInstallations: 3,
    lastValidationAt: iso(-1, 9),
    features: ["Roteamento"],
  },
  {
    id: "lic-6",
    key: "CB67-TERERE-0000104",
    customerName: "Grupo Delta",
    productName: "Tereré Money",
    plan: "Free",
    status: "revoked",
    startsAt: iso(-560),
    expiresAt: iso(-200),
    installations: 0,
    maxInstallations: 1,
    lastValidationAt: iso(-201, 4),
    features: [],
  },
  {
    id: "lic-7",
    key: "CB67-BARBER-0000298",
    customerName: "Rede Beta",
    productName: "AppBarber",
    plan: "Professional",
    status: "expired",
    startsAt: iso(-740),
    expiresAt: iso(-14),
    installations: 2,
    maxInstallations: 4,
    lastValidationAt: iso(-14, 22),
    features: ["Agendamento", "Painel de IA", "API Externa"],
  },
];

export const MockInstallations: Installation[] = MockInstances.map((ins, i) => ({
  id: `inst-${i}`,
  installationId: ins.installationId,
  licenseKey: ins.licenseId,
  productName: MockApplications.find((a) => a.id === ins.applicationId)?.name ?? "Unknown",
  version: ins.version,
  status: ins.status,
  lastSeen: ins.lastSeen,
  leaseId: `LEASE-${1000 + i}`,
  graceUntil: ins.status === "grace" ? iso(3) : null,
}));

export const MockLeases: Lease[] = MockInstallations.map((inst, i) => ({
  id: `lease-${i}`,
  leaseId: inst.leaseId,
  licenseKey: inst.licenseKey,
  installationId: inst.installationId,
  issuedAt: iso(-1, 13),
  expiresAt: iso(6, 13),
  status: (["valid", "valid", "valid", "grace", "revoked", "expired"] as const)[i % 6]!,
  keyId: `kid-2026-0${(i % 3) + 1}`,
}));

export const MockPlans: LicensePlan[] = [
  {
    id: "plan-free",
    name: "Free",
    code: "FREE",
    maxInstallations: 1,
    features: ["Agendamento"],
    activeLicenses: 12,
    status: "active",
  },
  {
    id: "plan-starter",
    name: "Starter",
    code: "STARTER",
    maxInstallations: 2,
    features: ["Agendamento", "Roteamento"],
    activeLicenses: 44,
    status: "active",
  },
  {
    id: "plan-pro",
    name: "Professional",
    code: "PRO",
    maxInstallations: 5,
    features: ["Agendamento", "Painel de IA", "Importação Bancária", "API Externa"],
    activeLicenses: 51,
    status: "active",
  },
  {
    id: "plan-ent",
    name: "Enterprise",
    code: "ENT",
    maxInstallations: 25,
    features: ["Agendamento", "Painel de IA", "Importação Bancária", "API Externa", "OpenAI", "Gemini"],
    activeLicenses: 17,
    status: "active",
  },
];

export const MockFeatures: LicenseFeature[] = [
  {
    id: "f-1",
    name: "Painel de IA",
    code: "dashboard_ai",
    description: "Insights gerados por IA dentro do painel do produto.",
    products: ["Tereré Money", "AppBarber"],
    plans: ["Professional", "Enterprise"],
    status: "active",
  },
  {
    id: "f-2",
    name: "Importação Bancária",
    code: "bank_import",
    description: "Pipeline de importação de extratos.",
    products: ["Tereré Money"],
    plans: ["Professional", "Enterprise"],
    status: "active",
  },
  {
    id: "f-3",
    name: "Roteamento",
    code: "routing",
    description: "Otimização de rotas através do serviço de Maps.",
    products: ["Distribuidora GLP", "Frota Control"],
    plans: ["Starter", "Professional", "Enterprise"],
    status: "active",
  },
  {
    id: "f-4",
    name: "API Externa",
    code: "external_api",
    description: "API de integração de saída para sistemas de clientes.",
    products: ["Tereré Money", "Distribuidora GLP", "AppBarber"],
    plans: ["Professional", "Enterprise"],
    status: "active",
  },
  {
    id: "f-5",
    name: "Agendamento",
    code: "scheduling",
    description: "Módulo de agendamento de compromissos.",
    products: ["AppBarber", "Agenda Clínica"],
    plans: ["Free", "Starter", "Professional"],
    status: "disabled",
  },
];

export const MockRevocations: Revocation[] = [
  {
    id: "rev-1",
    type: "license",
    object: "CB67-TERERE-0000104",
    reason: "Contrato encerrado",
    actor: "c.moura",
    createdAt: iso(-200, 10),
    status: "revoked",
  },
  {
    id: "rev-2",
    type: "certificate",
    object: "legacy-import-003",
    reason: "Suspeita de comprometimento de chave",
    actor: "security.auditor",
    createdAt: iso(-64, 5),
    status: "revoked",
  },
  {
    id: "rev-3",
    type: "client",
    object: "agenda-prod-007",
    reason: "Licença suspensa",
    actor: "system",
    createdAt: iso(-9, 17),
    status: "revoked",
  },
  {
    id: "rev-4",
    type: "installation",
    object: "INST-51BC93",
    reason: "Instalação substituída",
    actor: "ops.team",
    createdAt: iso(-8, 9),
    status: "pending",
  },
];

/* ------------------------------------------------------------------ IAM */

export const MockAdministrators: Administrator[] = [
  {
    id: "adm-1",
    name: "c.moura",
    role: "Proprietário da Plataforma",
    status: "active",
    lastLoginAt: iso(0, 9),
    sessions: 1,
    createdAt: iso(-800),
  },
  {
    id: "adm-2",
    name: "ops.team",
    role: "Operações",
    status: "active",
    lastLoginAt: iso(0, 7),
    sessions: 2,
    createdAt: iso(-500),
  },
  {
    id: "adm-3",
    name: "security.auditor",
    role: "Auditor de Segurança",
    status: "active",
    lastLoginAt: iso(-1, 18),
    sessions: 0,
    createdAt: iso(-410),
  },
  {
    id: "adm-4",
    name: "reader.support",
    role: "Somente Leitura",
    status: "disabled",
    lastLoginAt: iso(-42, 11),
    sessions: 0,
    createdAt: iso(-260),
  },
];

export const MockRoles: Role[] = [
  {
    id: "role-owner",
    name: "Proprietário da Plataforma",
    code: "owner",
    description: "Acesso irrestrito ao plano de gerenciamento.",
    administrators: 1,
    permissions: ["*"],
  },
  {
    id: "role-admin",
    name: "Administrador da Plataforma",
    code: "admin",
    description: "Opera SaaS, APIs, licenciamento e provedores.",
    administrators: 0,
    permissions: ["saas.*", "api.*", "license.*", "provider.*", "audit.read"],
  },
  {
    id: "role-security",
    name: "Auditor de Segurança",
    code: "security",
    description: "Lê superfícies de segurança, PKI e auditoria; pode revogar certificados.",
    administrators: 1,
    permissions: ["security.*", "pki.*", "audit.read"],
  },
  {
    id: "role-ops",
    name: "Operações",
    code: "ops",
    description: "Tarefas operacionais do dia a dia sem direitos de revogação.",
    administrators: 1,
    permissions: ["saas.*", "api.read", "observability.*", "audit.read"],
  },
  {
    id: "role-readonly",
    name: "Somente Leitura",
    code: "readonly",
    description: "Acesso de leitura a todas as superfícies não sensíveis.",
    administrators: 1,
    permissions: ["*.read"],
  },
];

const ROLE_CODES = ["owner", "admin", "security", "ops", "readonly"];
export const MockPermissions: Permission[] = [
  { code: "saas.read", label: "Leitura de SaaS", allow: [1, 1, 1, 1, 1] },
  { code: "saas.write", label: "Escrita de SaaS", allow: [1, 1, 0, 1, 0] },
  { code: "api.write", label: "Configuração de API", allow: [1, 1, 0, 0, 0] },
  { code: "license.read", label: "Leitura de licença", allow: [1, 1, 1, 1, 1] },
  { code: "license.revoke", label: "Revogação de licença", allow: [1, 1, 0, 0, 0] },
  { code: "client.rotate", label: "Rotação de certificado do cliente", allow: [1, 1, 1, 0, 0] },
  { code: "pki.revoke", label: "Revogação de PKI", allow: [1, 0, 1, 0, 0] },
  { code: "security.read", label: "Leitura de segurança", allow: [1, 1, 1, 1, 1] },
  { code: "session.terminate", label: "Encerrar sessões", allow: [1, 1, 1, 0, 0] },
  { code: "audit.read", label: "Leitura de auditoria", allow: [1, 1, 1, 1, 1] },
  { code: "settings.write", label: "Escrita de configurações", allow: [1, 1, 0, 0, 0] },
].map((p, i) => ({
  id: `perm-${i}`,
  code: p.code,
  label: p.label,
  roles: Object.fromEntries(ROLE_CODES.map((code, idx) => [code, Boolean(p.allow[idx])])),
}));

export const MockSessions: AdminSession[] = [
  {
    id: "sess-1",
    administrator: "c.moura",
    device: "Workstation · Linux",
    source: "vpn-gateway",
    createdAt: iso(0, 9),
    lastActivityAt: iso(0, 13),
    expiresAt: iso(0, 21),
    status: "active",
  },
  {
    id: "sess-2",
    administrator: "ops.team",
    device: "Laptop · macOS",
    source: "vpn-gateway",
    createdAt: iso(0, 7),
    lastActivityAt: iso(0, 12),
    expiresAt: iso(0, 19),
    status: "active",
  },
  {
    id: "sess-3",
    administrator: "ops.team",
    device: "Tablet",
    source: "vpn-gateway",
    createdAt: iso(-1, 15),
    lastActivityAt: iso(-1, 16),
    expiresAt: iso(-1, 23),
    status: "expired",
  },
];

/* ------------------------------------------------------------------ PKI */

export const MockCertificates: Certificate[] = [
  {
    id: "cert-1",
    subject: "CN=terere-prod-001,O=CB67 Labs",
    serial: "3F72A1",
    clientId: "terere-prod-001",
    type: "client",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "A1:4C:9E:22:70:BB:03:F1:88:2D:5A:6C:19:E0:77:34",
    issuedAt: iso(-319),
    expiresAt: iso(46),
    status: "active",
  },
  {
    id: "cert-2",
    subject: "CN=glp-prod-004,O=CB67 Labs",
    serial: "8B20C4",
    clientId: "glp-prod-004",
    type: "client",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "77:2B:0D:5F:AA:19:64:C3:0E:71:9B:22:44:8C:15:D0",
    issuedAt: iso(-354),
    expiresAt: iso(11),
    status: "active",
  },
  {
    id: "cert-3",
    subject: "CN=barber-prod-002,O=CB67 Labs",
    serial: "C910FE",
    clientId: "barber-prod-002",
    type: "client",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "2E:81:B7:34:C5:60:D9:1A:F3:07:5B:88:29:44:66:AC",
    issuedAt: iso(-360),
    expiresAt: iso(5),
    status: "active",
  },
  {
    id: "cert-4",
    subject: "CN=agenda-prod-007,O=CB67 Labs",
    serial: "5D33A0",
    clientId: "agenda-prod-007",
    type: "client",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "9F:00:C2:71:3E:5A:B8:47:12:DD:60:99:71:03:2C:41",
    issuedAt: iso(-368),
    expiresAt: iso(-3),
    status: "expired",
  },
  {
    id: "cert-5",
    subject: "CN=legacy-import-003,O=CB67 Labs",
    serial: "A0B1C2",
    clientId: "legacy-import-003",
    type: "client",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "44:1A:9C:F0:23:7B:65:D8:90:E1:32:57:AB:CD:04:19",
    issuedAt: iso(-540),
    expiresAt: iso(-30),
    status: "revoked",
  },
  {
    id: "cert-6",
    subject: "CN=api.cb67labs.api.br,O=CB67 Labs",
    serial: "11FFAA",
    clientId: "gateway",
    type: "server",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "63:D2:41:0A:8E:57:19:B4:2C:F0:76:35:AA:11:88:5E",
    issuedAt: iso(-70),
    expiresAt: iso(25),
    status: "active",
  },
  {
    id: "cert-7",
    subject: "CN=CB67 Labs Issuing CA",
    serial: "000001",
    clientId: "pki",
    type: "intermediate",
    issuer: "CN=CB67 Labs Root CA",
    fingerprint: "0B:12:73:9A:CC:41:6F:D5:23:80:17:EE:52:A9:31:70",
    issuedAt: iso(-1200),
    expiresAt: iso(1600),
    status: "active",
  },
  {
    id: "cert-8",
    subject: "CN=frota-stg-001,O=CB67 Labs",
    serial: "7C4419",
    clientId: "frota-stg-001",
    type: "client",
    issuer: "CN=CB67 Labs Issuing CA",
    fingerprint: "5A:73:16:BD:04:E8:2F:91:6C:38:AA:47:19:D0:52:83",
    issuedAt: iso(-40),
    expiresAt: iso(112),
    status: "active",
  },
];

/* ------------------------------------------------------------------ Security */

const SECURITY_CATEGORIES = [
  "authentication",
  "authorization",
  "rate-limit",
  "certificate",
  "admin",
];
export const MockSecurityEvents: SecurityEvent[] = Array.from({ length: 60 }, (_, i) => {
  const rand = seeded(900 + i)();
  const severity = (["info", "low", "medium", "high", "critical"] as const)[
    rand > 0.95 ? 4 : rand > 0.85 ? 3 : rand > 0.6 ? 2 : rand > 0.3 ? 1 : 0
  ]!;
  const client = MockMachineClients[i % MockMachineClients.length]!;
  return {
    id: `sec-${i}`,
    timestamp: new Date(Date.UTC(2026, 7, 16, 13, 50, 0) - i * 611_000).toISOString(),
    severity,
    category: SECURITY_CATEGORIES[i % SECURITY_CATEGORIES.length]!,
    clientId: client.clientId,
    source: i % 3 === 0 ? "api-gateway" : i % 3 === 1 ? "license-service" : "admin-plane",
    event: [
      "Handshake mTLS rejeitado",
      "Token bearer inválido",
      "Escopo não concedido para o endpoint",
      "Limite de taxa excedido",
      "Certificado revogado apresentado",
      "Falha de login do administrador",
    ][i % 6]!,
    decision: i % 4 === 0 ? "allowed" : "denied",
    requestId: `req_${(0x5f2c11 + i * 4231).toString(16).toUpperCase()}`,
  };
});

export const MockFirewall: FirewallState = {
  status: "healthy",
  policy: "negação padrão (entrada), lista de permissões por interface",
  lastReloadAt: iso(-2, 3),
  rulesCount: 84,
  recentBlocks: 1932,
};

/* ------------------------------------------------------------------ Infra / Observability */

export const MockHosts: Host[] = [
  {
    id: "host-1",
    name: "cb67-api-01",
    role: "API Gateway",
    environment: "production",
    cpu: 31,
    memory: 47,
    storage: 28,
    status: "healthy",
    uptime: "62d 4h",
  },
  {
    id: "host-2",
    name: "cb67-db-01",
    role: "PostgreSQL",
    environment: "production",
    cpu: 44,
    memory: 61,
    storage: 52,
    status: "healthy",
    uptime: "62d 4h",
  },
  {
    id: "host-3",
    name: "cb67-cache-01",
    role: "Valkey",
    environment: "production",
    cpu: 12,
    memory: 33,
    storage: 9,
    status: "healthy",
    uptime: "41d 19h",
  },
  {
    id: "host-4",
    name: "cb67-obs-01",
    role: "Observability",
    environment: "production",
    cpu: 58,
    memory: 72,
    storage: 66,
    status: "degraded",
    uptime: "18d 2h",
  },
  {
    id: "host-5",
    name: "cb67-stg-01",
    role: "Staging",
    environment: "staging",
    cpu: 8,
    memory: 22,
    storage: 14,
    status: "healthy",
    uptime: "7d 11h",
  },
];

export const MockServices: ServiceHealth[] = [
  {
    id: "svc-api",
    name: "API Server",
    status: "healthy",
    detail: "6 workers · 428 rps",
    uptime: "99.98%",
  },
  {
    id: "svc-pg",
    name: "PostgreSQL",
    status: "healthy",
    detail: "14/100 connections",
    uptime: "99.99%",
  },
  { id: "svc-valkey", name: "Valkey", status: "healthy", detail: "hit ratio 97%", uptime: "99.97%" },
  {
    id: "svc-prom",
    name: "Prometheus",
    status: "degraded",
    detail: "scrape backlog",
    uptime: "99.51%",
  },
  { id: "svc-grafana", name: "Grafana", status: "healthy", detail: "9 dashboards", uptime: "99.9%" },
  {
    id: "svc-license",
    name: "License Service",
    status: "healthy",
    detail: "12,988 leases/24h",
    uptime: "99.99%",
  },
];

export const MockLogs: LogEntry[] = Array.from({ length: 80 }, (_, i) => {
  const level = (["info", "info", "warn", "error", "debug"] as const)[i % 5]!;
  const client = MockMachineClients[i % MockMachineClients.length]!;
  return {
    id: `log-${i}`,
    timestamp: new Date(Date.UTC(2026, 7, 16, 13, 58, 0) - i * 43_000).toISOString(),
    service: ["api-gateway", "license-service", "ai-router", "maps-router"][i % 4]!,
    level,
    requestId: `req_${(0x2c91aa + i * 3313).toString(16).toUpperCase()}`,
    clientId: client.clientId,
    message: [
      "requisição concluída",
      "lease renovado",
      "nova tentativa do provedor agendada",
      "bucket de limite de taxa esgotado",
      "latência upstream acima do limite",
    ][i % 5]!,
  };
});

export const MockAlerts: Alert[] = [
  {
    id: "al-1",
    severity: "high",
    name: "Taxa de erro do Gemini acima de 1%",
    source: "ai-router",
    state: "firing",
    startedAt: iso(0, 11),
    duration: "2h 14m",
  },
  {
    id: "al-2",
    severity: "medium",
    name: "Certificado expirando em 5 dias",
    source: "pki",
    state: "acknowledged",
    startedAt: iso(-1, 8),
    duration: "1d 5h",
  },
  {
    id: "al-3",
    severity: "critical",
    name: "Fila de scrape do Prometheus",
    source: "observability",
    state: "firing",
    startedAt: iso(0, 6),
    duration: "7h 32m",
  },
  {
    id: "al-4",
    severity: "low",
    name: "Duração do backup acima do normal",
    source: "backups",
    state: "resolved",
    startedAt: iso(-3, 2),
    duration: "48m",
  },
];

/* ------------------------------------------------------------------ Database / Backups */

export const MockDatabaseHealth: DatabaseHealth = {
  status: "healthy",
  connections: 14,
  maxConnections: 100,
  transactionsPerSec: 312,
  queriesPerSec: 1284,
  locks: 3,
  deadlocks: 0,
  cacheHitRatio: 99.2,
  sizeBytes: 48_318_382_080,
};

export const MockBackupJobs: BackupJob[] = [
  {
    id: "bj-1",
    name: "postgres-full-nightly",
    type: "full",
    target: "cb67-backup-vol",
    schedule: "0 2 * * *",
    lastRunAt: iso(0, 2),
    durationSec: 742,
    status: "healthy",
  },
  {
    id: "bj-2",
    name: "postgres-wal-archive",
    type: "wal",
    target: "cb67-backup-vol",
    schedule: "continuous",
    lastRunAt: iso(0, 13),
    durationSec: 4,
    status: "healthy",
  },
  {
    id: "bj-3",
    name: "config-incremental",
    type: "incremental",
    target: "cb67-backup-vol",
    schedule: "0 */6 * * *",
    lastRunAt: iso(0, 12),
    durationSec: 61,
    status: "degraded",
  },
];

export const MockBackupRuns: BackupRun[] = Array.from({ length: 18 }, (_, i) => ({
  id: `br-${i}`,
  timestamp: iso(-i, 2),
  type: (["full", "incremental", "wal"] as const)[i % 3]!,
  sizeBytes: 12_000_000_000 - i * 120_000_000,
  checksum: i === 4 ? "failed" : i === 0 ? "pending" : "verified",
  durationSec: 700 + i * 11,
  status: i === 4 ? "unavailable" : i === 7 ? "degraded" : "healthy",
}));

export const MockRestoreTests: RestoreTest[] = [
  {
    id: "rt-1",
    name: "monthly-restore-drill",
    backup: "postgres-full-nightly · 2026-08-10",
    startedAt: iso(-6, 3),
    finishedAt: iso(-6, 4),
    durationSec: 3480,
    result: "passed",
    rpoMinutes: 5,
    rtoMinutes: 58,
  },
  {
    id: "rt-2",
    name: "quarterly-dr-drill",
    backup: "postgres-full-nightly · 2026-07-01",
    startedAt: iso(-46, 3),
    finishedAt: iso(-46, 5),
    durationSec: 6120,
    result: "failed",
    rpoMinutes: 12,
    rtoMinutes: 102,
  },
];

/* ------------------------------------------------------------------ Audit */

export const MockAuditEvents: AuditEvent[] = Array.from({ length: 70 }, (_, i) => {
  const template = [
    {
      actor: "c.moura",
      actorType: "administrator" as const,
      action: "machine_client.revoke",
      resource: "machine_client",
      resourceId: "legacy-import-003",
      result: "success" as const,
    },
    {
      actor: "security.auditor",
      actorType: "administrator" as const,
      action: "machine_client.scopes.update",
      resource: "machine_client",
      resourceId: "barber-prod-002",
      result: "success" as const,
    },
    {
      actor: "system",
      actorType: "system" as const,
      action: "license.lease.renew",
      resource: "license",
      resourceId: "CB67-TERERE-0000182",
      result: "success" as const,
    },
    {
      actor: "glp-prod-004",
      actorType: "machine" as const,
      action: "client.authenticate",
      resource: "machine_client",
      resourceId: "glp-prod-004",
      result: "failure" as const,
    },
    {
      actor: "ops.team",
      actorType: "administrator" as const,
      action: "license.suspend",
      resource: "license",
      resourceId: "CB67-AGENDA-0000090",
      result: "success" as const,
    },
    {
      actor: "reader.support",
      actorType: "administrator" as const,
      action: "certificate.revoke",
      resource: "certificate",
      resourceId: "5D33A0",
      result: "denied" as const,
    },
  ][i % 6]!;
  return {
    id: `aud-${i}`,
    timestamp: new Date(Date.UTC(2026, 7, 16, 13, 40, 0) - i * 1_811_000).toISOString(),
    source: i % 2 === 0 ? "admin-plane" : "api-gateway",
    requestId: `req_${(0x77aa10 + i * 5171).toString(16).toUpperCase()}`,
    ...template,
  };
});

/* ------------------------------------------------------------------ Public */

export const MockPublicStatus: PublicServiceStatus[] = [
  {
    id: "ps-1",
    name: "Gateway de APIs",
    status: "healthy",
    description: "Autenticação, roteamento e limitação de taxa.",
  },
  {
    id: "ps-2",
    name: "Licenciamento",
    status: "healthy",
    description: "Validação de licença e emissão de lease.",
  },
  {
    id: "ps-3",
    name: "Serviços de IA",
    status: "degraded",
    description: "Latência elevada em um provedor upstream.",
  },
  {
    id: "ps-4",
    name: "Serviços de Mapas",
    status: "healthy",
    description: "Serviços de geocodificação e roteamento.",
  },
  {
    id: "ps-5",
    name: "Documentação Técnica",
    status: "healthy",
    description: "Documentação técnica pública.",
  },
];

export const MockIncidents: Incident[] = [
  {
    id: "inc-1",
    title: "Latência elevada nos serviços de IA",
    state: "monitoring",
    startedAt: iso(0, 11),
    updates: [
      { at: iso(0, 13), state: "monitoring", message: "Latência de volta ao normal. Em monitoramento." },
      {
        at: iso(0, 12),
        state: "identified",
        message: "Degradação do provedor upstream identificada. Tráfego rebalanceado.",
      },
      { at: iso(0, 11), state: "investigating", message: "Investigando tempos de resposta elevados." },
    ],
  },
  {
    id: "inc-2",
    title: "Manutenção programada — atualização menor do banco de dados",
    state: "resolved",
    startedAt: iso(-12, 3),
    updates: [
      { at: iso(-12, 4), state: "resolved", message: "Manutenção concluída sem impacto." },
      { at: iso(-12, 3), state: "investigating", message: "Janela de manutenção iniciada." },
    ],
  },
];

export const MockChangelog: ChangelogEntry[] = [
  {
    version: "2026.08.1",
    date: "2026-08-12",
    changes: [
      "Previsão de cota por aplicação na superfície de cotas.",
      "Metadados de rotação de chave de lease expostos nas instalações.",
    ],
  },
  {
    version: "2026.07.2",
    date: "2026-07-24",
    changes: ["Endpoint de rotas do Maps adicionado ao catálogo de API.", "Linha do tempo de expiração de certificados."],
  },
  {
    version: "2026.07.1",
    date: "2026-07-03",
    changes: ["Página de status pública inicial.", "Modelo de autorização baseado em escopo publicado."],
  },
];

export const MockCharts = {
  requests: (range: TimeRange) => buildSeries(range, { requests: { base: 1600, spread: 700 } }, 3),
  latency: (range: TimeRange) =>
    buildSeries(
      range,
      {
        p50: { base: 62, spread: 18 },
        p95: { base: 87, spread: 30 },
        p99: { base: 164, spread: 60 },
      },
      11,
    ),
  errors: (range: TimeRange) =>
    buildSeries(range, { errors4xx: { base: 22, spread: 14 }, errors5xx: { base: 3, spread: 4 } }, 5),
  providerLatency: (range: TimeRange) =>
    buildSeries(
      range,
      {
        openai: { base: 910, spread: 200 },
        gemini: { base: 620, spread: 260 },
        maps: { base: 180, spread: 60 },
      },
      17,
    ),
  resources: (range: TimeRange) =>
    buildSeries(
      range,
      { cpu: { base: 31, spread: 14 }, memory: { base: 47, spread: 10 }, storage: { base: 28, spread: 3 } },
      23,
    ),
  network: (range: TimeRange) =>
    buildSeries(range, { rx: { base: 220, spread: 90 }, tx: { base: 180, spread: 70 } }, 29),
  database: (range: TimeRange) =>
    buildSeries(
      range,
      {
        connections: { base: 14, spread: 8 },
        queries: { base: 1284, spread: 400 },
        locks: { base: 3, spread: 3 },
      },
      31,
    ),
  auth: (range: TimeRange) =>
    buildSeries(
      range,
      { success: { base: 940, spread: 220 }, failed: { base: 18, spread: 16 }, mtls: { base: 4, spread: 5 } },
      37,
    ),
  authorization: (range: TimeRange) =>
    buildSeries(
      range,
      { allowed: { base: 1500, spread: 320 }, denied: { base: 26, spread: 18 } },
      41,
    ),
  security: (range: TimeRange) =>
    buildSeries(range, { events: { base: 40, spread: 30 } }, 43),
};

export const MockRequestsBySaas: MetricPoint[] = MockApplications.map((a) => ({
  t: a.name,
  value: a.requests30d,
}));

export const MockStatusDistribution: MetricPoint[] = [
  { t: "2xx", value: 1_268_402 },
  { t: "4xx", value: 14_902 },
  { t: "5xx", value: 617 },
];

export const MockLicensesByStatus: MetricPoint[] = [
  { t: "Active", value: 124 },
  { t: "Grace", value: 6 },
  { t: "Suspended", value: 4 },
  { t: "Expired", value: 19 },
  { t: "Revoked", value: 7 },
];

export const MockLicensesByProduct: MetricPoint[] = MockProducts.map((p) => ({
  t: p.name,
  value: p.activeLicenses,
}));

export const MockLicensesByPlan: MetricPoint[] = MockPlans.map((p) => ({
  t: p.name,
  value: p.activeLicenses,
}));

export const MockExpirationTimeline: MetricPoint[] = [
  { t: "< 7d", value: 3 },
  { t: "< 14d", value: 5 },
  { t: "< 30d", value: 11 },
  { t: "< 90d", value: 26 },
  { t: "> 90d", value: 79 },
];

export const MockActivations: MetricPoint[] = buildSeries(
  "30d",
  { activations: { base: 7, spread: 6 } },
  53,
);

export const MockStorageBreakdown: MetricPoint[] = [
  { t: "Banco de dados", value: 46 },
  { t: "Backups", value: 31 },
  { t: "Logs", value: 14 },
  { t: "Sistema", value: 9 },
];
