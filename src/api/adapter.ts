import type {
  Administrator,
  AdminSession,
  Alert,
  ApiEndpoint,
  ApiErrorGroup,
  ApiRequestRecord,
  Application,
  AuditEvent,
  AuthenticatedUser,
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
  LicensingOverview,
  LogEntry,
  MachineClient,
  MetricPoint,
  OverviewSnapshot,
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
  SearchResult,
  SecurityEvent,
  SecurityOverview,
  ServiceHealth,
  TimeRange,
} from "@/types";

/**
 * PROVISIONAL FRONTEND CONTRACT — see docs/API-CONTRACTS.md.
 * Both MockAdapter and HttpAdapter implement this interface, so components and
 * hooks are indifferent to the data origin.
 */
export interface PlatformAdapter {
  readonly kind: "mock" | "http";

  login(input: { username: string; password: string }): Promise<AuthenticatedUser>;
  currentUser(): Promise<AuthenticatedUser | null>;
  logout(): Promise<void>;

  getOverview(range: TimeRange): Promise<OverviewSnapshot>;
  globalSearch(query: string): Promise<SearchResult[]>;

  listHosts(): Promise<Host[]>;
  listServices(): Promise<ServiceHealth[]>;
  getResourceSeries(range: TimeRange): Promise<MetricPoint[]>;
  getNetworkSeries(range: TimeRange): Promise<MetricPoint[]>;
  getStorageBreakdown(): Promise<MetricPoint[]>;

  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application>;
  listInstances(applicationId?: string): Promise<Instance[]>;
  listMachineClients(): Promise<MachineClient[]>;
  listScopeDefinitions(): Promise<ScopeDefinition[]>;

  listEndpoints(): Promise<ApiEndpoint[]>;
  listRequests(): Promise<ApiRequestRecord[]>;
  listApiErrorGroups(): Promise<ApiErrorGroup[]>;
  getLatency(range: TimeRange): Promise<{
    breakdown: LatencyBreakdown[];
    series: MetricPoint[];
  }>;
  listRateLimits(): Promise<RateLimitRule[]>;
  listQuotas(): Promise<QuotaRecord[]>;

  listProviders(): Promise<Provider[]>;
  listProviderProjects(providerId?: Provider["id"]): Promise<ProviderProject[]>;
  listCredentials(providerId?: Provider["id"]): Promise<CredentialMetadata[]>;
  getProviderSeries(providerId: Provider["id"], range: TimeRange): Promise<MetricPoint[]>;

  getLicensingOverview(): Promise<LicensingOverview>;
  listProducts(): Promise<LicenseProduct[]>;
  listCustomers(): Promise<Customer[]>;
  listLicenses(): Promise<License[]>;
  getLicense(id: string): Promise<License>;
  listInstallations(): Promise<Installation[]>;
  listLeases(): Promise<Lease[]>;
  listPlans(): Promise<LicensePlan[]>;
  listFeatures(): Promise<LicenseFeature[]>;
  listRevocations(): Promise<Revocation[]>;

  listAdministrators(): Promise<Administrator[]>;
  listRoles(): Promise<Role[]>;
  listPermissions(): Promise<Permission[]>;
  listSessions(): Promise<AdminSession[]>;

  listCertificates(): Promise<Certificate[]>;
  getCertificate(id: string): Promise<Certificate>;

  getSecurityOverview(range: TimeRange): Promise<SecurityOverview>;
  listSecurityEvents(): Promise<SecurityEvent[]>;
  getFirewallState(): Promise<FirewallState>;

  listLogs(): Promise<LogEntry[]>;
  listAlerts(): Promise<Alert[]>;
  getMetricSeries(key: string, range: TimeRange): Promise<MetricPoint[]>;

  getDatabaseHealth(): Promise<DatabaseHealth>;
  getDatabaseSeries(range: TimeRange): Promise<MetricPoint[]>;

  listBackupJobs(): Promise<BackupJob[]>;
  listBackupRuns(): Promise<BackupRun[]>;
  listRestoreTests(): Promise<RestoreTest[]>;

  listAuditEvents(): Promise<AuditEvent[]>;

  getPublicStatus(): Promise<{ services: PublicServiceStatus[]; incidents: Incident[] }>;
  getChangelog(): Promise<ChangelogEntry[]>;

  /**
   * Destructive administrative operations. The mock adapter only echoes success;
   * the backend owns authorization, auditing and propagation.
   */
  performAction(input: {
    action: string;
    resourceId: string;
    payload?: Record<string, unknown>;
  }): Promise<{ accepted: boolean; message: string }>;
}
