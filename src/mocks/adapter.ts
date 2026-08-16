import type { PlatformAdapter } from "@/api/adapter";
import type { AuthenticatedUser, Provider, TimeRange } from "@/types";
import * as M from "./data";

/**
 * MockAdapter — development only. Contains no real credentials and performs no
 * network I/O. Remove together with src/mocks once HttpAdapter is wired.
 */

const delay = <T>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const MOCK_SESSION_KEY = "cb67.mock-session";

/**
 * Mock identity. Frontend auth is UX only; the backend owns authentication.
 * Any non-empty credential pair is accepted in mock mode by design — no
 * password is ever stored or compared against a constant.
 */
const mockUser: AuthenticatedUser = {
  id: "adm-1",
  name: "c.moura",
  email: "c.moura@cb67labs.api.br",
  role: "Proprietário da Plataforma",
  permissions: ["*"],
};

function readSession(): AuthenticatedUser | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(MOCK_SESSION_KEY) ? mockUser : null;
}

export const mockAdapter: PlatformAdapter = {
  kind: "mock",

  async login({ username, password }) {
    if (!username.trim() || !password.trim()) {
      throw new Error("Usuário e senha são obrigatórios.");
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(MOCK_SESSION_KEY, "1");
    }
    return delay({ ...mockUser, name: username }, 500);
  },
  async verifyMfa({ code }) {
    // The mock has no second factor enrolled, so this is only reachable if a
    // caller invents a challenge. Refusing keeps the mock honest rather than
    // rubber-stamping any code.
    if (!code.trim()) {
      throw new Error("Código obrigatório.");
    }
    throw new Error("O modo mock não possui segundo fator cadastrado.");
  },
  async currentUser() {
    return readSession();
  },
  async logout() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(MOCK_SESSION_KEY);
  },

  async getOverview(range: TimeRange) {
    return delay({
      platformHealth: "degraded" as const,
      requests: 1_283_921,
      rps: 428,
      p95: 87,
      p99: 164,
      errorRate: 0.04,
      activeSaas: 17,
      activeLicenses: 124,
      authFailures: 13,
      rateLimited: 31,
      statusCounts: [
        { code: "401", value: 13 },
        { code: "403", value: 5 },
        { code: "429", value: 31 },
        { code: "5xx", value: 9 },
      ],
      providers: M.MockProviders,
      services: M.MockServices,
      resources: { cpu: 31, memory: 47, storage: 28 },
      charts: {
        requests: M.MockCharts.requests(range),
        latency: M.MockCharts.latency(range),
        errors: M.MockCharts.errors(range),
        requestsBySaas: M.MockRequestsBySaas,
        licensesByStatus: M.MockLicensesByStatus,
        providerLatency: M.MockCharts.providerLatency(range),
        resources: M.MockCharts.resources(range),
      },
    });
  },

  async globalSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [
      ...M.MockApplications.map((a) => ({
        id: a.id,
        kind: "application" as const,
        label: a.name,
        detail: `${a.environment} · ${a.apiClientId}`,
        to: `/saas/${a.id}`,
      })),
      ...M.MockMachineClients.map((c) => ({
        id: c.id,
        kind: "client" as const,
        label: c.clientId,
        detail: `${c.applicationName} · ${c.status}`,
        to: `/identity/machine-clients`,
      })),
      ...M.MockLicenses.map((l) => ({
        id: l.id,
        kind: "license" as const,
        label: l.key,
        detail: `${l.customerName} · ${l.status}`,
        to: `/licensing/licenses/${l.id}`,
      })),
      ...M.MockInstallations.map((i) => ({
        id: i.id,
        kind: "installation" as const,
        label: i.installationId,
        detail: `${i.productName} · ${i.version}`,
        to: `/licensing/installations`,
      })),
      ...M.MockCertificates.map((c) => ({
        id: c.id,
        kind: "certificate" as const,
        label: c.serial,
        detail: c.subject,
        to: `/pki/certificates/${c.id}`,
      })),
      ...M.MockApiRequests.slice(0, 30).map((r) => ({
        id: r.id,
        kind: "request" as const,
        label: r.requestId,
        detail: `${r.endpoint} · ${r.status}`,
        to: `/apis/requests`,
      })),
    ];
    return delay(
      results.filter((r) => `${r.label} ${r.detail}`.toLowerCase().includes(q)).slice(0, 12),
      120,
    );
  },

  async listHosts() {
    return delay(M.MockHosts);
  },
  async listServices() {
    return delay(M.MockServices);
  },
  async getResourceSeries(range) {
    return delay(M.MockCharts.resources(range));
  },
  async getNetworkSeries(range) {
    return delay(M.MockCharts.network(range));
  },
  async getStorageBreakdown() {
    return delay(M.MockStorageBreakdown);
  },

  async listApplications() {
    return delay(M.MockApplications);
  },
  async getApplication(id) {
    const app = M.MockApplications.find((a) => a.id === id);
    if (!app) throw new Error("Application not found");
    return delay(app);
  },
  async listInstances(applicationId) {
    return delay(
      applicationId
        ? M.MockInstances.filter((i) => i.applicationId === applicationId)
        : M.MockInstances,
    );
  },
  async listMachineClients() {
    return delay(M.MockMachineClients);
  },
  async listScopeDefinitions() {
    return delay(M.MockScopes);
  },

  async listEndpoints() {
    return delay(M.MockEndpoints);
  },
  async listRequests() {
    return delay(M.MockApiRequests);
  },
  async listApiErrorGroups() {
    return delay(M.MockApiErrorGroups);
  },
  async getLatency(range) {
    return delay({ breakdown: M.MockLatency, series: M.MockCharts.latency(range) });
  },
  async listRateLimits() {
    return delay(M.MockRateLimits);
  },
  async listQuotas() {
    return delay(M.MockQuotas);
  },

  async listProviders() {
    return delay(M.MockProviders);
  },
  async listProviderProjects(providerId) {
    return delay(
      providerId
        ? M.MockProviderProjects.filter((p) => p.providerId === providerId)
        : M.MockProviderProjects,
    );
  },
  async listCredentials(providerId) {
    return delay(
      providerId ? M.MockCredentials.filter((c) => c.providerId === providerId) : M.MockCredentials,
    );
  },
  async getProviderSeries(providerId: Provider["id"], range) {
    const key = providerId === "google-maps" ? "maps" : providerId;
    const points = M.MockCharts.providerLatency(range).map((p) => ({
      t: p.t,
      latency: p[key] as number,
    }));
    return delay(points);
  },

  async getLicensingOverview() {
    return delay({
      active: 124,
      suspended: 4,
      expired: 19,
      revoked: 7,
      grace: 6,
      expiringSoon: 8,
      byProduct: M.MockLicensesByProduct,
      byPlan: M.MockLicensesByPlan,
      expirationTimeline: M.MockExpirationTimeline,
      activations: M.MockActivations,
    });
  },
  async listProducts() {
    return delay(M.MockProducts);
  },
  async listCustomers() {
    return delay(M.MockCustomers);
  },
  async listLicenses() {
    return delay(M.MockLicenses);
  },
  async getLicense(id) {
    const license = M.MockLicenses.find((l) => l.id === id || l.key === id);
    if (!license) throw new Error("License not found");
    return delay(license);
  },
  async listInstallations() {
    return delay(M.MockInstallations);
  },
  async listLeases() {
    return delay(M.MockLeases);
  },
  async listPlans() {
    return delay(M.MockPlans);
  },
  async listFeatures() {
    return delay(M.MockFeatures);
  },
  async listRevocations() {
    return delay(M.MockRevocations);
  },

  async listAdministrators() {
    return delay(M.MockAdministrators);
  },
  async listRoles() {
    return delay(M.MockRoles);
  },
  async listPermissions() {
    return delay(M.MockPermissions);
  },
  async listSessions() {
    return delay(M.MockSessions);
  },

  async listCertificates() {
    return delay(M.MockCertificates);
  },
  async getCertificate(id) {
    const cert = M.MockCertificates.find((c) => c.id === id || c.serial === id);
    if (!cert) throw new Error("Certificate not found");
    return delay(cert);
  },

  async getSecurityOverview(range) {
    return delay({
      mtlsRejected: 42,
      invalidTokens: 118,
      unauthorized: 13,
      forbidden: 5,
      rateLimited: 338,
      revokedCertAttempts: 2,
      adminLoginFailures: 4,
      suspiciousClients: 1,
      authChart: M.MockCharts.auth(range),
      authorizationChart: M.MockCharts.authorization(range),
    });
  },
  async listSecurityEvents() {
    return delay(M.MockSecurityEvents);
  },
  async getFirewallState() {
    return delay(M.MockFirewall);
  },

  async listLogs() {
    return delay(M.MockLogs);
  },
  async listAlerts() {
    return delay(M.MockAlerts);
  },
  async getMetricSeries(key, range) {
    switch (key) {
      case "throughput":
        return delay(M.MockCharts.requests(range));
      case "latency":
        return delay(M.MockCharts.latency(range));
      case "errors":
        return delay(M.MockCharts.errors(range));
      case "resources":
        return delay(M.MockCharts.resources(range));
      case "network":
        return delay(M.MockCharts.network(range));
      case "database":
        return delay(M.MockCharts.database(range));
      case "auth":
        return delay(M.MockCharts.auth(range));
      case "providers":
        return delay(M.MockCharts.providerLatency(range));
      case "security":
        return delay(M.MockCharts.security(range));
      default:
        return delay([]);
    }
  },

  async getDatabaseHealth() {
    return delay(M.MockDatabaseHealth);
  },
  async getDatabaseSeries(range) {
    return delay(M.MockCharts.database(range));
  },

  async listBackupJobs() {
    return delay(M.MockBackupJobs);
  },
  async listBackupRuns() {
    return delay(M.MockBackupRuns);
  },
  async listRestoreTests() {
    return delay(M.MockRestoreTests);
  },

  async listAuditEvents() {
    return delay(M.MockAuditEvents);
  },

  async getPublicStatus() {
    return delay({ services: M.MockPublicStatus, incidents: M.MockIncidents });
  },
  async getChangelog() {
    return delay(M.MockChangelog);
  },

  async performAction({ action, resourceId }) {
    return delay(
      {
        accepted: true,
        message: `${action} aceito para ${resourceId}. Aplicação no backend pendente.`,
      },
      600,
    );
  },
};
