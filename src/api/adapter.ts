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
export interface MfaChallenge {
  readonly mfaRequired: true;
  readonly expiresAt: string;
}

export type LoginResult = AuthenticatedUser | MfaChallenge;

export interface MfaStatus {
  enabled: boolean;
  /** Empty until the factor is activated. */
  enrolledAt: string;
  recoveryCodesLeft: number;
  /** A secret is staged but no code has confirmed it yet. */
  pendingEnrolment: boolean;
}

export interface MfaEnrolment {
  /** For an authenticator that takes a typed key rather than a scan. */
  secret: string;
  uri: string;
  /** An inline PNG. Empty if it could not be rendered; secret and uri still work. */
  qrDataUri: string;
  recoveryCodes: string[];
}

/** Narrows a login result to the second-factor case. */
export function isMfaChallenge(result: LoginResult): result is MfaChallenge {
  return (result as MfaChallenge).mfaRequired === true;
}

export interface PlatformAdapter {
  readonly kind: "mock" | "http";

  /**
   * Returns the authenticated user, or a challenge when a second factor is
   * enrolled. The union is deliberate: a caller cannot treat a half-finished
   * login as a finished one without first narrowing the type.
   */
  login(input: { username: string; password: string }): Promise<LoginResult>;
  /** Completes a login that stopped at the second factor. */
  verifyMfa(input: { code: string }): Promise<AuthenticatedUser>;

  /** Whether the signed-in administrator has a second factor. Never the secret. */
  getMfaStatus(): Promise<MfaStatus>;
  /**
   * Starts enrolment: a secret, an inline QR, and the recovery codes.
   *
   * The recovery codes are returned HERE AND NOWHERE ELSE. They are stored
   * hashed, so a screen that loses them cannot ask for them again.
   */
  beginMfaEnrolment(): Promise<MfaEnrolment>;
  /** Activates the factor once a code proves the authenticator is configured. */
  confirmMfaEnrolment(input: { code: string }): Promise<MfaStatus>;
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

  /** Narrowed to one resource when given: the trail is bounded, so an
   *  unfiltered fetch eventually stops containing an older record's history. */
  listAuditEvents(resource?: string): Promise<AuditEvent[]>;

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
    /** Set by creations, so the caller can open what it just made. */
  }): Promise<{ accepted: boolean; message: string; resourceId?: string }>;
}
