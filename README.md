# CB67 Control Hub

MISSÃO

Você é responsável EXCLUSIVAMENTE pelo desenvolvimento do FRONTEND da:

CB67 LABS API PLATFORM

e do:

CB67 LABS CONTROL CENTER

O frontend será posteriormente entregue a uma equipe de engenharia composta por Claude Code e Codex, rodando em uma VM Debian 13 on-premises.

Sua responsabilidade termina no frontend.

Você NÃO deverá criar backend, infraestrutura, banco de dados, autenticação real, serviços cloud ou funções serverless.

1. OBJETIVO

Construir um frontend administrativo extremamente completo, profissional, técnico, responsivo e preparado para produção para gerenciamento de uma plataforma central de:

APIs;

SaaS;

provedores de IA;

Google Maps;

licenciamento;

identidades máquina-máquina;

certificados;

PKI;

autenticação;

autorização;

scopes;

rate limits;

quotas;

observabilidade;

segurança;

infraestrutura;

PostgreSQL;

Valkey;

backups;

auditoria;

configurações.

Também construir as interfaces públicas:

site técnico CB67 Labs;

página pública de status;

área visual de documentação técnica.

2. REGRA ABSOLUTA — SOMENTE FRONTEND

Este projeto é:

FRONTEND ONLY

NÃO criar:

Supabase;

banco Supabase;

Lovable Cloud backend;

Firebase;

Vercel Functions;

Edge Functions;

banco de dados;

PostgreSQL;

autenticação real;

OAuth Server;

License Server;

API Gateway;

servidor backend;

secret manager;

Redis;

Valkey;

filas;

cron;

workers;

funções serverless;

webhooks server-side;

APIs intermediárias;

persistência cloud.

Não conectar automaticamente nenhuma infraestrutura externa.

Não ativar Supabase.

Não criar tabelas.

Não criar migrations de banco.

Não criar backend fake escondido em funções cloud.

O projeto deve continuar sendo um frontend puro.

3. DESTINO FINAL

O código será exportado para Git e posteriormente executado em infraestrutura própria:

Debian 13
Proxmox
On-Premises
CB67 Labs

Portanto:

NÃO criar dependência obrigatória da infraestrutura de hospedagem Lovable.

O projeto deve poder ser executado utilizando:

npm install
npm run build

e produzir artefato frontend estático ou arquitetura frontend equivalente compatível com self-hosting.

Claude Code decidirá posteriormente a estratégia definitiva de build/deployment.

4. GITHUB — OBRIGATÓRIO

Ao concluir o projeto, conectar este projeto ao GitHub utilizando a integração oficial disponível no Lovable.

Criar um repositório dedicado.

Nome preferencial:

cb67-control-center-frontend

Se o nome já estiver ocupado, utilizar variação clara e profissional.

Não misturar este código com outro projeto.

O GitHub será a fonte de código entregue posteriormente ao Claude Code e ao Codex.

Depois de conectado:

garantir que todo código esteja sincronizado;

garantir que não existam secrets;

garantir que não exista .env real;

garantir que o projeto compile;

garantir que README esteja completo.

Não renomear/mover automaticamente o repository depois da integração.

5. PRINCÍPIO DE HANDOFF

Claude Code deverá conseguir clonar o repositório e entender o frontend sem consultar esta conversa.

Portanto o repository deve explicar claramente:

o que é o projeto
como executar
como buildar
arquitetura frontend
rotas
componentes
tipos
mocks
contratos esperados da API
variáveis de ambiente
estado atual da integração
o que ainda precisa ser implementado pelo backend

6. STACK FRONTEND

Utilizar stack frontend moderna e comum ao ecossistema do projeto gerado pela Lovable.

Preferência:

React
TypeScript
Vite
Tailwind CSS
componentes acessíveis/reutilizáveis

Se a versão atual do projeto Lovable utilizar stack diferente, não migrar arbitrariamente apenas para obedecer este texto.

Manter:

TypeScript strict quando possível;

componentes pequenos;

separação de responsabilidades;

reusable components;

tipagem forte;

baixo acoplamento;

design tokens;

acessibilidade;

responsividade.

7. PROIBIDO HARDCODE DE BACKEND

Não escrever URLs reais diretamente em dezenas de componentes.

Centralizar configuração.

Esperar posteriormente algo equivalente a:

VITE_CB67_API_BASE_URL
VITE_CB67_LICENSE_BASE_URL
VITE_CB67_STATUS_BASE_URL
VITE_GRAFANA_URL

Criar:

.env.example

SEM valores secretos.

Exemplo exclusivamente ilustrativo:

VITE_CB67_API_BASE_URL=
VITE_CB67_LICENSE_BASE_URL=
VITE_CB67_STATUS_BASE_URL=
VITE_GRAFANA_URL=

Não adicionar:

OPENAI_API_KEY
GEMINI_API_KEY
GOOGLE_MAPS_SERVER_KEY
DATABASE_URL
PRIVATE_KEY

ao frontend.

Esses secrets nunca pertencerão ao navegador.

8. ARQUITETURA DE FRONTEND

Organizar de forma clara.

Estrutura conceitual desejada:

src/
├── app/
├── components/
├── features/
├── pages/
├── layouts/
├── routes/
├── services/
├── api/
├── mocks/
├── hooks/
├── types/
├── schemas/
├── utils/
├── constants/
├── config/
└── assets/

Adaptar à estrutura nativa escolhida sem criar complexidade inútil.

9. SEPARAÇÃO FUNDAMENTAL

O frontend representa três planos distintos:

PUBLIC PLANE
MANAGEMENT PLANE
OBSERVABILITY PLANE

Nunca misturar visualmente as responsabilidades.

10. PUBLIC PLANE

Criar interfaces para:

cb67labs.api.br
docs.cb67labs.api.br
status.cb67labs.api.br

Esses domínios serão configurados posteriormente pelo backend/Caddy.

Não configurar DNS.

Não configurar Cloudflare.

Somente criar as interfaces.

11. MANAGEMENT PLANE

Criar o:

CB67 LABS CONTROL CENTER

Destino conceitual:

admin.cb67labs.api.br

IMPORTANTE:

a existência da interface NÃO significa que ela será pública.

A equipe backend posteriormente restringirá acesso por:

WireGuard
HTTPS
mTLS
autenticação
RBAC

O frontend não deve tentar substituir essas proteções.

12. OBSERVABILITY PLANE

Grafana será serviço independente.

Destino futuro:

grafana.cb67labs.api.br

O Control Center poderá:

mostrar resumos obtidos futuramente pela API;

fornecer botão/atalho para Grafana;

apresentar status de observabilidade.

NÃO implementar Grafana dentro do frontend.

NÃO implementar Prometheus dentro do frontend.

NÃO chamar Prometheus diretamente do browser.

13. IDENTIDADE VISUAL

Criar produto visual próprio:

CB67 LABS

Não utilizar branding de:

Lovable;

Supabase;

Vercel;

OpenAI;

Anthropic;

Claude;

ChatGPT;

Firebase;

Upstash;

qualquer ferramenta de IA usada na criação.

É permitido mostrar nomes dos providers:

OpenAI
Google Gemini
Google Maps

quando eles representarem serviços efetivamente administrados pela plataforma.

Isso não deve parecer co-branding.

14. DESIGN

O Control Center deve parecer uma ferramenta profissional de:

Platform Engineering
SRE
Cybersecurity
API Management
Infrastructure Operations

Não criar aparência de ERP comercial.

Não criar dashboard colorido infantil.

Não exagerar em gradients.

Não exagerar em glassmorphism.

Não criar dezenas de cores.

Preferir:

interface técnica;

excelente densidade de informação;

tipografia clara;

hierarquia visual forte;

cards úteis;

tabelas avançadas;

gráficos;

status badges;

command/action drawers;

filtros;

busca;

drill-down;

dark mode;

light mode;

responsividade.

15. LAYOUT PRINCIPAL

Desktop:

┌──────────────────────────────────────────────────────────────┐
│ CB67 LABS SEARCH ALERTS USER │
├──────────────┬───────────────────────────────────────────────┤
│ │ │
│ Navigation │ Main Content │
│ │ │
│ │ │
│ │ │
└──────────────┴───────────────────────────────────────────────┘

Sidebar colapsável.

Topbar.

Breadcrumb.

Global Search.

Notification Center.

Profile menu.

Environment indicator.

16. ENVIRONMENT INDICATOR

Toda tela administrativa deve deixar explícito o ambiente.

Exemplo:

PRODUCTION
STAGING
DEVELOPMENT

Ações destrutivas em Production deverão visualmente exigir maior atenção.

Isso é UX.

A segurança real será implementada posteriormente pelo backend.

17. NAVEGAÇÃO

Criar a seguinte estrutura:

Overview

Infrastructure
├── Hosts
├── CPU & Memory
├── Storage
├── Network
└── Services

SaaS
├── Applications
├── Instances
├── Clients
├── Environments
└── Usage

APIs
├── Endpoints
├── Requests
├── Errors
├── Latency
├── Quotas
└── Rate Limits

Providers
├── OpenAI
├── Gemini
└── Google Maps

Licensing
├── Overview
├── Products
├── Customers
├── Licenses
├── Installations
├── Leases
├── Plans
├── Features
└── Revocations

Identity & Access
├── Administrators
├── Roles
├── Permissions
├── Machine Clients
├── Scopes
└── Sessions

PKI
├── Certificates
├── Expiration
├── Rotation
└── Revocation

Security
├── Overview
├── Authentication
├── Authorization
├── Failed Attempts
├── Firewall
├── Security Events
└── Sessions

Observability
├── Overview
├── Metrics
├── Logs
├── Alerts
└── Grafana

Database
├── Health
├── Connections
├── Performance
└── Growth

Backups
├── Jobs
├── History
├── Checksums
└── Restore Tests

Audit

Settings

18. OVERVIEW

Criar dashboard executivo técnico.

Cards principais:

Platform Status
API Requests
Requests/sec
p95
p99
Error Rate
Active SaaS
Active Licenses
Authentication Failures
Rate Limited Requests

Status dos providers:

OpenAI
Gemini
Google Maps

Status da infraestrutura:

API Server
PostgreSQL
Valkey
Prometheus
Grafana
License Service

19. OVERVIEW — EXEMPLO VISUAL

Algo nesta lógica:

CB67 LABS CONTROL CENTER ● HEALTHY

API REQUESTS RPS P95 ERROR RATE
1,283,921 428 87 ms 0.04%

ACTIVE SAAS LICENSES 401 403 429
17 124 13 5 31

PROVIDERS
OpenAI ● HEALTHY 910 ms p95
Gemini ● HEALTHY 620 ms p95
Google Maps ● HEALTHY 180 ms p95

INFRASTRUCTURE
CPU 31%
RAM 47%
Storage 28%
PostgreSQL Healthy
Valkey Healthy

Usar dados mockados claramente identificados como mocks no código.

Não escrever "MOCK" na UI final.

20. GRÁFICOS DO OVERVIEW

Criar visualizações para:

Requests over time
Latency p50/p95/p99
HTTP status distribution
Provider latency
Errors over time
Requests by SaaS
Licenses by status
CPU
RAM
Storage

Os componentes devem receber dados tipados.

Não acoplar os gráficos diretamente aos mocks.

21. SAAS / APPLICATIONS

Tabela:

Name
Environment
Status
Instances
API Client
License
Requests
Error Rate
p95
Last Seen

Filtros:

Environment
Status
Provider
License status

Busca.

Paginação.

Ordenação.

22. SAAS DETAIL

Página detalhada por sistema.

Exemplo:

TERERÉ MONEY

Environment:
PRODUCTION

Status:
ACTIVE

API Identity:
terere-prod-001

Certificate:
VALID

Certificate Expiration:
...

Allowed APIs:
AI Generate
AI Embeddings
Maps Geocode

Blocked:
Maps Routes

Cards:

Requests
Errors
429
p95
p99
Monthly quota
Quota consumption

Tabs:

Overview
Instances
API Access
Providers
Licensing
Metrics
Security
Audit

23. INSTANCES

Exibir:

installation_id
hostname lógico
environment
version
status
last_seen
license
certificate

Não inventar IP público obrigatório.

24. MACHINE CLIENTS

Tabela:

Client ID
Application
Environment
Certificate
Scopes
Status
Created
Last Seen

Estados:

ACTIVE
DISABLED
REVOKED
EXPIRED

Ações visuais:

View
Disable
Revoke
Rotate Certificate
Manage Scopes
Manage Limits
Activity

Essas ações utilizam mocks agora.

Não implementar segurança apenas no frontend.

25. SCOPES

Criar interface clara.

Exemplo:

AI
☑ ai.generate
☑ ai.embeddings

Maps
☑ maps.geocode
☐ maps.routes

Licensing
☑ license.validate

Administration
☐ admin.*

A UI deve deixar evidente:

default deny

26. APIs — ENDPOINTS

Tabela:

Method
Path
Version
Scope
Status
Requests
p95
Error Rate

Exemplo:

POST /v1/ai/generate
POST /v1/ai/embeddings
POST /v1/maps/geocode
POST /v1/maps/routes
POST /v1/licenses/lease
GET /v1/health

Os endpoints são contratos visuais iniciais.

Backend poderá ajustá-los posteriormente.

27. API REQUESTS

Tela operacional com:

timestamp
request_id
client
SaaS
method
endpoint
provider
status
latency

Filtros avançados.

Busca por Request ID.

Drawer de detalhes.

Nunca mostrar:

Authorization header
API key
private key
password
raw credential

28. API ERRORS

Agrupar:

4xx
401
403
404
409
422
429
5xx
timeouts
provider errors

Mostrar:

count
rate
trend
first seen
last seen
affected clients
affected endpoints

29. LATENCY

Mostrar:

p50
p90
p95
p99
max

Separar:

CB67 internal latency
provider latency
overall latency

30. RATE LIMITS

Tela operacional:

Application
API
RPS
RPM
Daily
Current Usage
429
Headroom
Status

Permitir modal/drawer visual para edição futura.

Não persistir de verdade.

31. QUOTAS

Rate limit e quota são conceitos diferentes.

Mostrar separadamente.

Exemplo:

Rate Limit
100 req/min

Monthly Quota
100,000 requests

Used
72,391

Remaining
27,609

Progress bars.

Forecast visual.

32. PROVIDERS OVERVIEW

Cards:

OpenAI
Gemini
Google Maps

Cada um mostrando:

status
requests
errors
429
p95
configured projects
credentials count
last successful request

33. OPENAI

Tela específica:

Projects
Mappings
Usage
Models
Errors
Latency
Credentials Metadata

Nunca mostrar chave real.

Credencial:

Configured
Last rotated
Last used
Status

34. GEMINI

Mostrar relação:

SaaS
Google Project
Credential Alias
Status
Requests
429
Quota Usage

Exemplo:

Tereré Money
gemini-terere
gemini-terere-prod
ACTIVE

Não incluir lógica de rotação entre contas para contornar quotas.

35. GOOGLE MAPS

Separar visualmente:

Client-side APIs
Server-side APIs

Mostrar:

Projects
API Restrictions
Applications
Requests
Quota
Errors
Latency

Nunca expor server-side API keys.

36. CREDENTIAL UX

O painel pode mostrar:

Credential Alias
Provider
Application
Environment
Created
Last Rotated
Last Used
Status

Campo secreto:

••••••••••••••••

Nunca colocar credenciais reais nos mocks.

Não criar botão "Reveal Secret".

Depois da criação, secrets devem ser considerados não recuperáveis visualmente.

37. LICENSING OVERVIEW

Dashboard:

Active
Suspended
Expired
Revoked
Grace Mode
Expiring Soon

Gráficos:

Licenses by product
Licenses by plan
Expiration timeline
Activations over time

38. PRODUCTS

Tabela:

Product
Code
Versions
Plans
Active Licenses
Status

39. CUSTOMERS

Tabela:

Customer
Products
Licenses
Installations
Status
Created

Não usar informações pessoais excessivas nos mocks.

40. LICENSES

Tabela:

License
Customer
Product
Plan
Status
Starts
Expires
Installations
Last Validation

Estados:

PENDING
ACTIVE
SUSPENDED
EXPIRED
REVOKED

41. LICENSE DETAIL

Exemplo visual:

CB67-TERERE-0000182

Product
Tereré Money

Customer
Cliente XYZ

Plan
Professional

Status
ACTIVE

Valid From
...

Expires
...

Installations
1 / 2

Features:

Dashboard AI
Bank Import
OpenAI
Gemini
External API

Ações visuais:

Renew
Suspend
Reactivate
Revoke
Change Plan
Manage Features
View Installations
Audit

Ações destrutivas com confirmation dialog forte.

Mocks apenas.

42. INSTALLATIONS

Mostrar:

Installation ID
License
Product
Version
Status
Last Seen
Lease
Grace

43. LEASES

Tabela:

Lease ID
License
Installation
Issued
Expires
Status
Key ID

Status:

VALID
EXPIRED
REVOKED
GRACE

Não mostrar assinatura criptográfica inteira por padrão.

44. PLANS

Interface para:

Free
Starter
Professional
Enterprise

Estes nomes são mocks de interface.

Permitir que backend posteriormente forneça planos reais.

Não hardcodar regras comerciais profundamente nos componentes.

45. FEATURES

Feature entitlement editor.

Exemplo:

Feature
Code
Description
Products
Plans
Status

46. REVOCATIONS

Tela:

Type
Object
Reason
Actor
Created
Status

Pode incluir:

license
installation
client
certificate

47. IDENTITY & ACCESS

Criar área específica.

Tabs:

Administrators
Roles
Permissions
Machine Clients
Scopes
Sessions

48. ADMINISTRATORS

Tabela:

Name
Role
Status
Last Login
Sessions
Created

Não criar contas reais.

Mocks.

49. RBAC

Criar editor visual de papéis.

Exemplos de roles visuais:

Platform Owner
Platform Administrator
Security Auditor
Operations
Read Only

Não presumir que esses nomes serão definitivos.

Backend poderá fornecê-los.

50. PERMISSIONS

Matriz visual.

Exemplo:

                 Owner Admin Security Ops ReadOnly

SaaS Read ✓ ✓ ✓ ✓ ✓
SaaS Write ✓ ✓ - ✓ -
License Revoke ✓ ✓ - - -
PKI Revoke ✓ - ✓ - -
Audit Read ✓ ✓ ✓ ✓ ✓

Responsiva.

51. SESSIONS

Tela:

Administrator
Device
Source
Created
Last Activity
Expires
Status

Ação:

Terminate

Somente UI/mocks.

52. PKI OVERVIEW

Cards:

Valid Certificates
Expiring <30d
Expiring <14d
Expiring <7d
Revoked

53. CERTIFICATES

Tabela:

Subject
Serial
Client
Type
Issued
Expires
Status

Filtros.

54. CERTIFICATE DETAIL

Mostrar:

Subject
Issuer
Serial
Fingerprint
Validity
Client Mapping
Status

Nunca exibir private key.

Ações:

Rotate
Revoke

Mocks apenas.

55. CERTIFICATE EXPIRATION

Timeline/calendário/lista:

< 7 days
< 14 days
< 30 days

> 30 days

Prioridade visual clara.

56. SECURITY CENTER

Dashboard dedicado.

Cards:

mTLS Rejected
Invalid Tokens
401
403
Rate Limited
Revoked Certificate Attempts
Admin Login Failures
Suspicious Clients

57. SECURITY EVENTS

Tabela:

Time
Severity
Category
Client
Source
Event
Decision
Request ID

Severidades:

INFO
LOW
MEDIUM
HIGH
CRITICAL

Filtros.

58. AUTHENTICATION

Gráficos:

Successful authentications
Failed authentications
mTLS failures
Token failures
Failures by client
Failures over time

59. AUTHORIZATION

Mostrar:

allowed
denied
scope failures
policy failures

60. FIREWALL

Somente visão administrativa.

NÃO construir editor direto de nftables neste frontend inicial.

Mostrar:

Firewall Status
Policy
Last Reload
Rules Count
Recent Blocks

Pode haver botão:

View Details

mas não editar regras arbitrariamente pelo browser.

61. OBSERVABILITY OVERVIEW

Resumo:

RPS
p95
p99
Error Rate
CPU
RAM
Disk
PostgreSQL
Valkey
Providers

Botão:

Open Grafana

URL via configuração.

62. METRICS

Criar componentes de gráficos reutilizáveis.

Visualizações:

API Throughput
Latency
Status Codes
CPU
Memory
Disk
Network
Database
Providers
Licensing
Authentication

Não implementar query PromQL diretamente no frontend como requisito obrigatório.

Backend/Grafana decidirão integração definitiva.

63. LOGS

Criar visualizador frontend preparado para API agregadora futura.

Campos:

timestamp
service
level
request_id
client
message

Filtros.

Busca.

Não simular terminal.

Não permitir execução de comandos.

64. ALERTS

Tabela/cards:

Severity
Alert
Source
State
Started
Duration

Estados:

FIRING
ACKNOWLEDGED
RESOLVED

UI apenas.

65. DATABASE HEALTH

Dashboard:

Status
Connections
Transactions/sec
Queries/sec
Locks
Deadlocks
Cache Hit
Database Size

66. DATABASE PERFORMANCE

Gráficos:

Connections
Query Rate
Latency
Locks
Deadlocks
Growth

Não criar SQL console.

Não permitir executar SQL pelo browser.

67. BACKUPS

Dashboard:

Last Backup
Backup Status
Size
Checksum Status
Last Restore Test

68. BACKUP JOBS

Tabela:

Job
Type
Target
Schedule
Last Run
Duration
Status

Não criar cron real.

69. BACKUP HISTORY

Tabela:

Timestamp
Type
Size
Checksum
Duration
Status

70. RESTORE TESTS

Tela:

Test
Backup
Started
Finished
Duration
Result
RPO
RTO

RPO/RTO devem vir futuramente do backend.

Mocks apenas.

71. AUDIT LOG

Tela de alta importância.

Campos:

timestamp
actor
actor_type
action
resource
resource_id
result
source
request_id

Exemplos:

administrator revoked machine client
administrator changed scopes
system renewed license lease
machine client authentication failed

Filtros avançados.

72. AUDIT DETAIL

Drawer ou page detail.

Mostrar:

Who
What
When
Where
Resource
Result
Correlation ID

Nunca mostrar secret anterior/novo.

73. SETTINGS

Separar:

General
Platform
Domains
Providers
Security
Licensing
Observability
Notifications
Appearance

Somente configurações visuais/mockadas inicialmente.

74. PUBLIC TECHNICAL SITE

Criar visual para:

cb67labs.api.br

Conteúdo:

CB67 Labs
API Platform

Developer Infrastructure
Secure API Services
Licensing Infrastructure
AI Gateway
Maps Services
Developer Documentation
Service Status
Technical Contact

Não transformar em site comercial.

75. SITE TÉCNICO

Design elegante e simples.

Hero:

CB67 Labs API Platform
Infrastructure for CB67 Labs software.

Cards:

API Gateway
License Service
AI Services
Maps Services
Developer Resources

76. PUBLIC STATUS

Página:

CB67 LABS PLATFORM STATUS

Mostrar exclusivamente status sanitizado.

Exemplo:

API Gateway Operational
Licensing Operational
AI Services Operational
Maps Services Operational

Pode possuir histórico visual de incidentes mockados.

Nunca mostrar:

private IP
database version
filesystem
hostnames
internal ports
Prometheus
Valkey address

77. DOCS FRONTEND

Criar shell visual para documentação.

Sidebar:

Introduction
Authentication
API Overview
Errors
Rate Limits
AI API
Maps API
Licensing
Changelog

Conteúdo inicialmente placeholder estruturado.

Não inventar contratos finais além dos exemplos fornecidos neste prompt.

Backend produzirá OpenAPI definitiva.

78. LOGIN

Criar tela de login do Control Center.

Campos:

Username / Email
Password

Visualmente também demonstrar estado:

Secure Management Access

NÃO implementar autenticação real.

Não armazenar senha.

Não utilizar localStorage como autenticação de produção.

Criar apenas arquitetura frontend preparada para integração posterior.

79. AUTH MOCK

Para desenvolvimento frontend, criar mock explícito em camada isolada.

Por exemplo:

src/mocks/

Nunca espalhar:

if (password === "admin")

pela aplicação.

Não incluir credencial real ou padrão.

80. ROUTE GUARDS

Criar estrutura frontend de:

PublicRoute
ProtectedRoute
PermissionGuard

mas documentar claramente:

FRONTEND GUARDS ARE UX ONLY

Segurança real será feita pelo backend.

Nunca assumir que esconder botão é autorização.

81. PERMISSION-AWARE UI

Componentes de ação deverão poder receber permissões.

Exemplo conceitual:

can("license.revoke")
can("client.rotate")
can("security.read")

Não hardcodar usuário admin.

82. API CLIENT LAYER

Criar uma única camada responsável pela comunicação futura com backend.

Exemplo conceitual:

src/api/client.ts
src/api/endpoints/

Não fazer fetch() arbitrário em dezenas de componentes.

83. API ADAPTER

A aplicação deverá poder alternar entre:

MockAdapter
HttpAdapter

Durante Lovable:

MockAdapter

Após handoff:

HttpAdapter

Claude Code fará a integração real.

84. MOCK MODE

Definir configuração equivalente a:

VITE_USE_MOCK_API=true

A implementação específica poderá variar.

O requisito é:

mocks isolados;

facilmente removíveis;

mesmos tipos/interfaces do adapter HTTP;

componentes indiferentes à origem dos dados.

85. NÃO UTILIZAR JSON MOCK DIRETAMENTE NOS COMPONENTES

Proibido:

Dashboard.tsx
const fakeData = [...]

se isso tornar o handoff difícil.

Preferir:

component
↓
service/hook
↓
adapter
↓
mock

Depois:

component
↓
service/hook
↓
adapter
↓
real API

86. TYPES

Criar tipos TypeScript claros para entidades principais:

Application
Instance
MachineClient
ApiEndpoint
ApiRequest
ApiError
Provider
ProviderProject
License
LicensePlan
LicenseFeature
Installation
Lease
Certificate
Administrator
Role
Permission
Session
SecurityEvent
AuditEvent
MetricSeries
Alert
Backup
RestoreTest
ServiceHealth

87. STATUS TYPES

Evitar strings soltas por todo o projeto.

Centralizar estados.

Exemplos conceituais:

active
disabled
revoked
expired
healthy
degraded
unavailable
pending
suspended

88. VALIDATION

Formulários deverão ter:

client-side schema validation
clear errors
field descriptions
disabled/loading states

A validação frontend não substitui backend validation.

89. DATA TABLE

Criar componente reutilizável com:

sorting
filtering
pagination
search
column visibility
loading state
empty state
error state

Responsivo.

90. DANGEROUS ACTIONS

Ações como:

Revoke License
Revoke Certificate
Disable Client
Terminate Session

devem possuir:

confirmation modal;

identificação clara do objeto;

warning;

loading;

success/error feedback.

Para ações críticas, permitir padrão de confirmação digitada no futuro.

91. TOASTS / FEEDBACK

Padronizar:

Success
Warning
Error
Information

Não criar dezenas de padrões diferentes.

92. LOADING

Toda tela data-driven deverá possuir:

skeleton
loading
empty
error
success

Não deixar telas pulando visualmente.

93. ERROR BOUNDARY

Criar tratamento visual global apropriado.

Não mostrar stack trace ao usuário.

94. 404

Criar página 404 técnica consistente.

95. 403

Criar página:

Access Denied

Preparada para backend retornar autorização insuficiente.

96. SERVICE UNAVAILABLE

Criar estado visual para backend indisponível.

Não mostrar erro bruto de fetch.

97. RESPONSIVIDADE

O principal alvo é:

desktop administrativo

mas funcionar corretamente em:

laptop
tablet
mobile

Em mobile:

sidebar vira drawer;

tabelas possuem estratégia responsiva;

ações continuam utilizáveis;

gráficos não transbordam;

cards refluem corretamente.

98. ACCESSIBILITY

Aplicar:

HTML semântico;

labels;

keyboard navigation;

focus visible;

aria quando necessário;

contraste adequado;

não depender somente de cor para representar estado.

99. DARK / LIGHT MODE

Suportar:

System
Dark
Light

Sem componentes quebrados entre temas.

100. DESIGN SYSTEM

Criar tokens consistentes:

spacing
radius
typography
surface
border
status
shadow

Não espalhar valores arbitrários.

101. ICONS

Utilizar biblioteca consistente.

Não usar emojis como ícones principais administrativos.

102. CHARTS

Utilizar biblioteca de gráficos já adequada à stack.

Componentes devem suportar:

time range
tooltip
legend
empty data
loading

Não criar gráficos meramente decorativos.

103. TIME RANGE

Dashboards devem permitir visualmente:

15m
1h
6h
24h
7d
30d

Mocks podem responder a esses filtros.

104. GLOBAL SEARCH

Preparar busca global sobre entidades:

SaaS
client
license
installation
certificate
request ID

Dados mockados.

105. COMMAND PALETTE

Adicionar command palette se fizer sentido para produtividade.

Exemplo:

Search Application
Open License
Open Client
Open Security

Não implementar comandos destrutivos silenciosos.

106. BREADCRUMBS

Todas as páginas profundas devem possuir contexto.

Exemplo:

SaaS > Tereré Money > API Access

107. COPY BUTTONS

Campos técnicos como:

client ID
license ID
request ID
certificate serial

podem possuir copy button.

Nunca para secrets inexistentes.

108. DATE/TIME

Criar camada de formatação.

Não espalhar new Date().toLocaleString() arbitrariamente.

Preparar para timezone configurável.

109. NUMBERS

Formatar corretamente:

1,283,921 requests
87 ms
0.04%
14 / 100 connections

Preparar internacionalização futura sem torná-la requisito complexo agora.

110. SEM DADOS REAIS

Todos os dados nesta fase são fictícios.

Utilizar nomes demonstrativos como:

Tereré Money
Distribuidora GLP
AppBarber

e entidades genéricas adicionais.

Nunca utilizar:

CPF real;

e-mail real;

API key;

senha;

token;

endereço;

IP externo real;

private key.

111. SEGURANÇA DO FRONTEND

Proibido armazenar no repository:

API keys
JWT reais
certificados privados
secrets
senhas
provider credentials
database credentials

Executar busca no código antes do handoff para verificar vazamentos óbvios.

112. DEPENDÊNCIAS

Não adicionar pacote para problema que pode ser resolvido facilmente sem dependência.

Antes de adicionar biblioteca importante:

verificar se já existe equivalente no projeto.

Manter dependency tree razoável.

113. QUALIDADE TYPESCRIPT

Corrigir:

TypeScript errors
obvious lint errors
unused imports
broken routes
broken components

Não encerrar com erros ignorados.

114. BUILD

Antes de declarar conclusão:

executar o build disponível no projeto.

Objetivo:

EXIT CODE 0

Se falhar:

corrigir.

Não declarar "pronto" com build quebrado.

115. README

Criar README.md completo para Claude Code e Codex.

Incluir:

Project
Purpose
Architecture
Requirements
Install
Development
Build
Directory Structure
Routes
Mock Mode
API Adapter
Environment Variables
Security Notes
Backend Handoff
Known Limitations

116. FRONTEND-HANDOFF.md

Criar:

docs/FRONTEND-HANDOFF.md

Esse arquivo deverá ser específico para a equipe backend.

Explicar:

o que Lovable implementou
o que é mock
o que ainda não existe
onde está API client
como desligar mocks
quais endpoints a UI espera
quais tipos existem
quais componentes precisam de dados reais
como funciona auth mock
onde backend deve integrar autenticação
onde backend deve integrar RBAC
onde métricas serão conectadas

117. API-CONTRACTS.md

Criar:

docs/API-CONTRACTS.md

Documentar as necessidades do frontend.

Para cada operação:

screen
operation
method sugerido
path sugerido
request shape
response shape
errors esperados
permission necessária

IMPORTANTE:

Marcar claramente:

PROVISIONAL FRONTEND CONTRACT
BACKEND TEAM MAY REFINE

Não afirmar que endpoints mockados já existem.

118. FRONTEND-ROUTES.md

Criar:

docs/FRONTEND-ROUTES.md

Listar todas as rotas.

Exemplo conceitual:

/login
/overview
/infrastructure
/saas
/saas/:id
/apis
/providers
/licensing
/identity
/pki
/security
/observability
/database
/backups
/audit
/settings
/status
/docs

Usar as rotas realmente implementadas.

119. BACKEND-INTEGRATION-CHECKLIST.md

Criar checklist para Claude Code.

Exemplo:

[ ] Configure API base URL
[ ] Replace MockAdapter with HttpAdapter
[ ] Integrate login
[ ] Integrate session
[ ] Integrate CSRF strategy if applicable
[ ] Integrate authorization
[ ] Integrate SaaS APIs
[ ] Integrate licensing APIs
[ ] Integrate provider APIs
[ ] Integrate PKI APIs
[ ] Integrate security events
[ ] Integrate metrics
[ ] Integrate audit
[ ] Integrate backup status
[ ] Test 401
[ ] Test 403
[ ] Test 429
[ ] Test 5xx
[ ] Disable mock mode in production

120. SECURITY-NOTES.md

Criar:

docs/SECURITY-NOTES.md

Explicar explicitamente:

This repository is frontend only.

Frontend route guards are not authorization.

Frontend permission checks are not security boundaries.

No provider secret belongs in this application.

Management Plane must be protected server-side.

Authentication, authorization, mTLS and VPN enforcement are backend/infrastructure responsibilities.

121. MOCK CATALOG

Criar documentação dos mocks.

Exemplo:

MockApplications
MockClients
MockLicenses
MockCertificates
MockProviders
MockMetrics
MockSecurityEvents
MockAuditEvents

Isso permitirá que Claude encontre e remova facilmente.

122. NÃO CONFUNDIR OBSERVABILIDADE COM ADMINISTRAÇÃO

Control Center:

opera
administra
configura
consulta
audita

Grafana:

analisa profundamente métricas
dashboards
timeseries

Não tentar substituir completamente Grafana.

123. NÃO CRIAR SECRET MANAGEMENT NO BROWSER

O frontend poderá possuir páginas de metadata de credenciais.

Nunca criar UI que faça download ou revele persistentemente private secrets existentes.

A criação/rotação real será desenhada pelo backend.

124. PUBLIC VS PRIVATE

O projeto deve possuir separação visual clara entre interfaces públicas e administrativas.

Mas compreender:

React route != network security

Claude/Codex implementarão depois:

Caddy
WireGuard
mTLS
RBAC
nftables

125. PÁGINAS PÚBLICAS NÃO DEVEM IMPORTAR BUNDLE ADMINISTRATIVO DESNECESSÁRIO

Quando a arquitetura permitir facilmente, utilizar code splitting/lazy loading.

Evitar carregar todo Control Center para mostrar somente /status.

126. PERFORMANCE

Evitar:

bundles gigantes sem necessidade;

gráficos renderizando milhares de pontos;

rerenders globais;

tabelas sem paginação;

dependências redundantes.

Usar lazy loading onde fizer sentido.

127. TELEMETRIA FRONTEND

Criar abstração para futura telemetria de frontend.

NÃO enviar dados para SaaS externo nesta fase.

Não adicionar analytics proprietário.

Deixar integração desabilitada/abstrata.

128. TESTES

Se a stack atual suportar sem introduzir complexidade excessiva, criar testes para componentes críticos.

Prioridades:

routing
permission-aware UI
status rendering
destructive action confirmation
API adapter
mock adapter
forms

129. EMPTY STATES

Criar empty states profissionais.

Exemplo:

No licenses found.
No security events in this period.
No certificates expiring soon.

Não exibir páginas vazias.

130. ERROR STATES

Criar estados para:

401
403
404
409
422
429
500
502
503
network unavailable
timeout

Frontend deve explicar adequadamente sem expor detalhes internos.

131. HTTP 429

Criar UX específica para:

Rate limit exceeded

Mostrar:

retry later

quando backend fornecer informação apropriada.

Não criar retry infinito.

132. REQUEST DETAIL

Não exibir corpo integral sensível por padrão.

Preparar UI para metadata.

Exemplo:

Request ID
Client
Endpoint
Provider
Status
Latency
Timestamp

133. AUDIT IMMUTABILITY UX

Audit log deve parecer append-only.

Não criar:

Edit Audit
Delete Audit

na interface.

134. LICENSE STATE UX

Estados devem possuir representação consistente:

ACTIVE
SUSPENDED
EXPIRED
REVOKED
PENDING

Evitar cores contraditórias entre telas.

135. PROVIDER STATE UX

Estados:

HEALTHY
DEGRADED
UNAVAILABLE
DISABLED

136. PLATFORM HEALTH

Estados:

HEALTHY
DEGRADED
CRITICAL
MAINTENANCE

137. SECURITY SEVERITY

Padronizar:

INFO
LOW
MEDIUM
HIGH
CRITICAL

138. FORM DESIGN

Usar forms compactos e técnicos.

Campos possuem:

label
description
validation
error
help

Não depender somente de placeholder.

139. DRAWERS

Usar drawers para inspeção rápida de:

request
certificate
client
security event
audit event
alert

Usar páginas completas quando objeto possuir muita informação.

140. CONFIRMATION DIALOG

Exemplo:

Revoke certificate?

Certificate:
terere-prod-001

Serial:
3F72A1

This action may immediately prevent the client from authenticating.

Cancel
Revoke Certificate

Somente UI.

141. ACTIVITY TIMELINE

Adicionar timeline reutilizável para:

License
Client
Certificate
SaaS

142. AUDIT CROSS-LINK

Quando possível, ações administrativas devem possuir placeholder para:

View Audit Event

143. PROVIDER MAPPING

Tela para relação:

Application
Environment
Provider
Project
Credential Alias
Status

Nunca secret.

144. CONFIGURAÇÃO DE API POR SAAS

Página:

API Access

Mostrar:

Allowed Services
Scopes
Rate Limits
Quota
Provider Mapping
Client Certificate

145. CUSTO

Preparar campo visual opcional:

Estimated Usage Cost

somente quando backend fornecer informação confiável futuramente.

Mocks podem demonstrar a área.

Deixar claro na tipagem/comentários que custo é estimativa proveniente de backend.

146. STATUS PAGE

Página pública deve ser completamente independente de autenticação.

Mostrar somente dados sanitizados.

Preparar componentes:

ServiceStatus
Incident
Maintenance
History

147. INCIDENT UI

Criar status:

Investigating
Identified
Monitoring
Resolved

Mocks.

148. TECHNICAL DOCUMENTATION

Criar layout estilo documentação técnica:

left navigation
main document
right TOC quando aplicável
code block
copy
endpoint badge

Não escrever centenas de páginas fictícias.

Apenas estrutura suficiente para backend posteriormente preencher OpenAPI/documentação real.

149. CHANGELOG

Página pública/técnica:

Version
Date
Changes

Mocks.

150. FOOTER

Site técnico:

CB67 Labs
Technical Infrastructure

Sem:

Made with Lovable
Powered by AI
Powered by Supabase

151. BRAND CLEANLINESS

Antes da conclusão, pesquisar no repository por referências indevidas a:

Lovable
Supabase
Firebase
Vercel
Upstash
ChatGPT
OpenAI
Claude
Anthropic
AI generated

ATENÇÃO:

OpenAI pode existir legitimamente nas telas de Providers.

Não remover referências funcionais legítimas ao provider OpenAI.

Remover somente branding/development residue.

152. NÃO MODIFICAR COPYRIGHT DE DEPENDÊNCIAS

Não remover notices/licenças exigidas legalmente por dependências open-source.

A limpeza de branding refere-se à interface e código próprio.

153. GITIGNORE

Garantir .gitignore adequado.

No mínimo evitar commit de:

node_modules
dist
.env
.env.local
*.log

adaptando ao projeto real.

154. ENV EXAMPLE

Commitar:

.env.example

Não commitar:

.env

com valores reais.

155. PACKAGE LOCK

Manter lockfile apropriado ao gerenciador utilizado.

Não misturar:

npm
pnpm
yarn
bun

sem necessidade.

Documentar no README qual foi utilizado.

156. HUSKS / GIT HOOKS

Não adicionar ferramenta pesada de Git hooks apenas por moda.

Priorizar projeto simples de entregar.

157. CI

Se for simples e apropriado, criar workflow GitHub para:

install
typecheck
lint
test
build

SEM deployment.

O repository não deverá publicar automaticamente nada na Internet.

Nenhum secret de produção.

158. SEM DEPLOYMENT LOVABLE

A entrega requerida é:

SOURCE CODE IN GIT

Não precisamos do frontend hospedado permanentemente na Lovable.

Não criar dependência operacional de preview Lovable.

159. HANDOFF PARA CLAUDE + CODEX

Ao final, considerar que outra equipe receberá:

git clone <repository>

e precisará continuar imediatamente.

O repository deve estar organizado para isso.

160. ARQUIVO MACHINE-READABLE

Criar:

docs/frontend-manifest.json

Com estrutura válida contendo, no mínimo:

project
version
frontend_only
mock_mode
routes
environment_variables
api_domains_expected
major_features
integration_status
known_limitations

Não incluir secret.

161. INTEGRATION STATUS

No manifest e documentação, deixar explícito:

frontend: implemented
backend: not implemented
authentication: mocked
authorization: UI prepared
API integration: mocked
licensing API: mocked
metrics API: mocked
provider APIs: mocked
GitHub: synchronized
production deployment: not performed

Usar estado real ao final.

162. COMENTÁRIOS

Não adicionar comentários explicando código óbvio.

Adicionar comentários apenas onde houver contrato ou consideração importante de handoff.

163. SEM DEAD CODE

Após concluir:

remover:

páginas abandonadas;

componentes inutilizados;

imports mortos;

rotas quebradas;

protótipos descartados.

164. SEM PLACEHOLDER VISUAL FEIO

Não entregar:

TODO
Coming Soon
Lorem ipsum

em telas principais.

Quando backend ainda não existir, a UI deve trabalhar com mocks convincentes.

Documentação técnica pode sinalizar funcionalidades ainda não conectadas.

165. DADOS MOCK REALISTAS

Mocks devem demonstrar:

healthy
degraded
error
expired
revoked
empty
loading
rate limited

Isso permitirá que Claude teste todos os estados visuais posteriormente.

166. STORYBOOK

Não instalar Storybook automaticamente.

Somente se já fizer parte da stack ou trouxer benefício claro sem aumentar excessivamente o projeto.

167. COMPATIBILIDADE

O projeto será executado inicialmente em navegador moderno.

Priorizar:

Chrome
Edge
Firefox
Safari

sem depender de comportamento experimental desnecessário.

168. RESULTADO VISUAL ESPERADO

O produto deve transmitir:

infraestrutura séria
segurança
controle
observabilidade
confiabilidade
engenharia

e não:

template SaaS genérico
admin dashboard comprado
ERP
site de marketing

169. CRITÉRIO DE ACEITE DE CADA PÁGINA

Cada página deve possuir, quando aplicável:

title
description/context
navigation
loading
empty
error
success
responsive layout
accessible controls
typed data
mock integration

170. CRITÉRIO DE ACEITE GLOBAL

Antes de finalizar, validar:

[ ] Frontend only
[ ] No Supabase
[ ] No Firebase
[ ] No Vercel dependency
[ ] No Lovable backend dependency
[ ] No provider secrets
[ ] No database
[ ] No serverless functions
[ ] Mock API isolated
[ ] HTTP API adapter prepared
[ ] TypeScript clean
[ ] Routes functional
[ ] Responsive
[ ] Dark mode
[ ] Light mode
[ ] Public technical site
[ ] Public status page
[ ] Docs frontend
[ ] Control Center complete
[ ] SaaS management UI
[ ] API management UI
[ ] Provider UI
[ ] Licensing UI
[ ] IAM/RBAC UI
[ ] PKI UI
[ ] Security Center
[ ] Observability UI
[ ] Database observability UI
[ ] Backups UI
[ ] Audit UI
[ ] Settings UI
[ ] README complete
[ ] FRONTEND-HANDOFF.md
[ ] API-CONTRACTS.md
[ ] FRONTEND-ROUTES.md
[ ] SECURITY-NOTES.md
[ ] frontend-manifest.json
[ ] .env.example
[ ] .gitignore
[ ] Git repository synchronized
[ ] Production build succeeds

171. NÃO DECLARAR SUCESSO SEM BUILD

Executar o comando de build apropriado do projeto.

O objetivo é:

EXIT CODE 0

Resolver erros antes da entrega.

172. ENTREGA FINAL

Ao terminar, apresentar:

PROJECT
CB67 Labs Control Center Frontend

STATUS
READY FOR BACKEND HANDOFF

FRONTEND
COMPLETE

BACKEND
NOT IMPLEMENTED BY DESIGN

DATABASE
NONE

SUPABASE
NOT USED

CLOUD BACKEND
NOT USED

MOCK API
ENABLED FOR DEVELOPMENT

HTTP API ADAPTER
PREPARED

BUILD
PASS

GITHUB
SYNCHRONIZED

Apresentar também:

Repository
Branch
Last commit
Build command
Mock mode location
API adapter location
Environment file
Handoff documentation
Known limitations

Não afirmar que qualquer item está concluído se não tiver sido realmente verificado.

173. IMPORTANTE PARA A PRÓXIMA EQUIPE

O Claude Code será responsável posteriormente por:

backend Go
PostgreSQL
Valkey
Caddy
WireGuard
mTLS
OAuth/AuthN/AuthZ
RBAC enforcement
License Server
PKI
provider integrations
OpenAI
Gemini
Google Maps
Prometheus
Grafana
nftables
systemd
backup
deployment

O Codex será responsável por:

Scrum gates
code review
architecture review
security review
quality review
release acceptance

Portanto não tente antecipar essas implementações utilizando serviços Lovable.

Sua obrigação é entregar para esses agentes um frontend de altíssima qualidade com contratos limpos.

174. REGRA FINAL

A arquitetura de handoff deve ser:

                    LOVABLE
                       │
                       │ UI / UX
                       │ React / TypeScript
                       │ Components
                       │ Routes
                       │ Mocks
                       │ Contracts
                       ▼
               GITHUB REPOSITORY
                       │
                       │ git clone
                       ▼
                 DEBIAN 13 VM
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        CLAUDE CODE            CODEX
      Engineering Team      Scrum Master
             │              Independent QA
             └─────────┬─────────┘
                       ▼
                 REAL BACKEND
                       │
                 CB67 PLATFORM

Não transformar a Lovable em backend.

Não implementar infraestrutura cloud.

Não criar banco.

Não criar autenticação proprietária hospedada.

Não inserir secrets.

Crie o frontend.

Teste o frontend.

Documente o frontend.

Sincronize no GitHub.

Entregue um repository limpo e imediatamente utilizável pela equipe Claude Code + Codex.

EXECUTE.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/59fd7e61-4e5d-4e28-abb3-eabfa4867f44).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
