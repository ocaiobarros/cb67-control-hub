/**
 * Presentation-only localisation for status enums.
 *
 * DESIGN / CONTRACT NOTE: the values returned by the API and mock adapters are
 * never changed — this map exists purely so the UI can render pt-BR copy while
 * the underlying contract keeps its technical enum values ("active", "healthy",
 * "revoked", ...). Adding another locale means adding a sibling map here.
 */
export const STATUS_LABELS_PT_BR: Record<string, string> = {
  // Platform / service health
  healthy: "Saudável",
  degraded: "Degradado",
  critical: "Crítico",
  unavailable: "Indisponível",
  maintenance: "Manutenção",
  operational: "Operacional",
  monitoring: "Em monitoramento",
  identified: "Identificado",
  investigating: "Em investigação",

  // Lifecycle
  pending: "Pendente",
  active: "Ativa",
  enabled: "Ativo",
  inactive: "Inativa",
  suspended: "Suspensa",
  expired: "Expirada",
  revoked: "Revogada",
  disabled: "Desativado",
  draft: "Rascunho",
  grace: "Carência",
  retired: "Descontinuado",
  provisioning: "Provisionando",
  running: "Em execução",
  stopped: "Parado",
  scheduled: "Agendado",

  // Certificates
  valid: "Válido",
  expiring: "Próximo da expiração",
  verified: "Verificado",

  // Results
  success: "Sucesso",
  failure: "Falha",
  failed: "Falhou",
  error: "Erro",
  allowed: "Permitido",
  denied: "Negado",
  passed: "Aprovado",
  partial: "Parcial",
  warn: "Atenção",
  warning: "Atenção",
  info: "Informação",
  debug: "Depuração",
  unknown: "Desconhecido",

  // Alerts
  firing: "Disparado",
  acknowledged: "Reconhecido",
  resolved: "Resolvido",
  silenced: "Silenciado",

  // Severities
  low: "Baixa",
  medium: "Média",
  high: "Alta",

  // Environments / misc
  production: "Produção",
  staging: "Homologação",
  development: "Desenvolvimento",
  online: "Online",
  offline: "Offline",
};

/** Returns the pt-BR display label for a technical status value. */
export function statusLabel(status: string): string {
  return STATUS_LABELS_PT_BR[status.toLowerCase()] ?? status;
}
