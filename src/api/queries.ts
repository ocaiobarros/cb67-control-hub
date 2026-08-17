import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import type { Provider, TimeRange } from "@/types";

/**
 * Query catalogue. Components use these options with useQuery/useSuspenseQuery;
 * nothing else in the app touches the adapter directly.
 */
export const q = {
  overview: (range: TimeRange) =>
    queryOptions({ queryKey: ["overview", range], queryFn: () => api.getOverview(range) }),
  search: (query: string) =>
    queryOptions({
      queryKey: ["search", query],
      queryFn: () => api.globalSearch(query),
      enabled: query.trim().length > 1,
    }),

  hosts: () => queryOptions({ queryKey: ["hosts"], queryFn: () => api.listHosts() }),
  services: () => queryOptions({ queryKey: ["services"], queryFn: () => api.listServices() }),
  resourceSeries: (range: TimeRange) =>
    queryOptions({ queryKey: ["resources", range], queryFn: () => api.getResourceSeries(range) }),
  networkSeries: (range: TimeRange) =>
    queryOptions({ queryKey: ["network", range], queryFn: () => api.getNetworkSeries(range) }),
  storageBreakdown: () =>
    queryOptions({ queryKey: ["storage"], queryFn: () => api.getStorageBreakdown() }),

  applications: () =>
    queryOptions({ queryKey: ["applications"], queryFn: () => api.listApplications() }),
  application: (id: string) =>
    queryOptions({ queryKey: ["application", id], queryFn: () => api.getApplication(id) }),
  instances: (applicationId?: string) =>
    queryOptions({
      queryKey: ["instances", applicationId ?? "all"],
      queryFn: () => api.listInstances(applicationId),
    }),
  machineClients: () =>
    queryOptions({ queryKey: ["machine-clients"], queryFn: () => api.listMachineClients() }),
  scopeDefinitions: () =>
    queryOptions({ queryKey: ["scopes"], queryFn: () => api.listScopeDefinitions() }),

  endpoints: () => queryOptions({ queryKey: ["endpoints"], queryFn: () => api.listEndpoints() }),
  requests: () => queryOptions({ queryKey: ["requests"], queryFn: () => api.listRequests() }),
  apiErrors: () =>
    queryOptions({ queryKey: ["api-errors"], queryFn: () => api.listApiErrorGroups() }),
  latency: (range: TimeRange) =>
    queryOptions({ queryKey: ["latency", range], queryFn: () => api.getLatency(range) }),
  rateLimits: () =>
    queryOptions({ queryKey: ["rate-limits"], queryFn: () => api.listRateLimits() }),
  quotas: () => queryOptions({ queryKey: ["quotas"], queryFn: () => api.listQuotas() }),

  providers: () => queryOptions({ queryKey: ["providers"], queryFn: () => api.listProviders() }),
  providerProjects: (providerId?: Provider["id"]) =>
    queryOptions({
      queryKey: ["provider-projects", providerId ?? "all"],
      queryFn: () => api.listProviderProjects(providerId),
    }),
  credentials: (providerId?: Provider["id"]) =>
    queryOptions({
      queryKey: ["credentials", providerId ?? "all"],
      queryFn: () => api.listCredentials(providerId),
    }),
  providerSeries: (providerId: Provider["id"], range: TimeRange) =>
    queryOptions({
      queryKey: ["provider-series", providerId, range],
      queryFn: () => api.getProviderSeries(providerId, range),
    }),

  licensingOverview: () =>
    queryOptions({ queryKey: ["licensing-overview"], queryFn: () => api.getLicensingOverview() }),
  products: () => queryOptions({ queryKey: ["products"], queryFn: () => api.listProducts() }),
  customers: () => queryOptions({ queryKey: ["customers"], queryFn: () => api.listCustomers() }),
  licenses: () => queryOptions({ queryKey: ["licenses"], queryFn: () => api.listLicenses() }),
  license: (id: string) =>
    queryOptions({ queryKey: ["license", id], queryFn: () => api.getLicense(id) }),
  installations: () =>
    queryOptions({ queryKey: ["installations"], queryFn: () => api.listInstallations() }),
  leases: () => queryOptions({ queryKey: ["leases"], queryFn: () => api.listLeases() }),
  plans: () => queryOptions({ queryKey: ["plans"], queryFn: () => api.listPlans() }),
  features: () => queryOptions({ queryKey: ["features"], queryFn: () => api.listFeatures() }),
  revocations: () =>
    queryOptions({ queryKey: ["revocations"], queryFn: () => api.listRevocations() }),

  administrators: () =>
    queryOptions({ queryKey: ["administrators"], queryFn: () => api.listAdministrators() }),
  roles: () => queryOptions({ queryKey: ["roles"], queryFn: () => api.listRoles() }),
  permissions: () =>
    queryOptions({ queryKey: ["permissions"], queryFn: () => api.listPermissions() }),
  sessions: () => queryOptions({ queryKey: ["sessions"], queryFn: () => api.listSessions() }),

  certificates: () =>
    queryOptions({ queryKey: ["certificates"], queryFn: () => api.listCertificates() }),
  certificate: (id: string) =>
    queryOptions({ queryKey: ["certificate", id], queryFn: () => api.getCertificate(id) }),

  securityOverview: (range: TimeRange) =>
    queryOptions({
      queryKey: ["security-overview", range],
      queryFn: () => api.getSecurityOverview(range),
    }),
  securityEvents: () =>
    queryOptions({ queryKey: ["security-events"], queryFn: () => api.listSecurityEvents() }),
  firewall: () => queryOptions({ queryKey: ["firewall"], queryFn: () => api.getFirewallState() }),

  logs: () => queryOptions({ queryKey: ["logs"], queryFn: () => api.listLogs() }),
  alerts: () => queryOptions({ queryKey: ["alerts"], queryFn: () => api.listAlerts() }),
  metricSeries: (key: string, range: TimeRange) =>
    queryOptions({
      queryKey: ["metric", key, range],
      queryFn: () => api.getMetricSeries(key, range),
    }),

  databaseHealth: () =>
    queryOptions({ queryKey: ["database-health"], queryFn: () => api.getDatabaseHealth() }),
  databaseSeries: (range: TimeRange) =>
    queryOptions({
      queryKey: ["database-series", range],
      queryFn: () => api.getDatabaseSeries(range),
    }),

  backupJobs: () =>
    queryOptions({ queryKey: ["backup-jobs"], queryFn: () => api.listBackupJobs() }),
  backupRuns: () =>
    queryOptions({ queryKey: ["backup-runs"], queryFn: () => api.listBackupRuns() }),
  restoreTests: () =>
    queryOptions({ queryKey: ["restore-tests"], queryFn: () => api.listRestoreTests() }),

  auditEvents: (resource?: string) =>
    queryOptions({
      // The resource is part of the key: two records must not share one cached
      // trail.
      queryKey: ["audit", resource ?? "all"],
      queryFn: () => api.listAuditEvents(resource),
    }),

  publicStatus: () =>
    queryOptions({ queryKey: ["public-status"], queryFn: () => api.getPublicStatus() }),
  changelog: () => queryOptions({ queryKey: ["changelog"], queryFn: () => api.getChangelog() }),
};
