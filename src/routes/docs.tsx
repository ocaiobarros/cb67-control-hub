import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/layout/public-shell";
import { AppLink } from "@/components/common/app-link";
import { platformMeta } from "@/config/env";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentação — CB67 Labs API Platform" },
      {
        name: "description",
        content:
          "Como integrar com a plataforma de API da CB67 Labs: autenticação, escopos, versionamento, limites de taxa, cotas e leases de licenciamento.",
      },
      { property: "og:title", content: "Documentação — CB67 Labs API Platform" },
      {
        property: "og:description",
        content: "Autenticação, escopos, versionamento, limites de taxa, cotas e integração de licenciamento.",
      },
    ],
  }),
  component: DocsPage,
});

const SECTIONS = [
  {
    id: "authentication",
    title: "Autenticação",
    body: "Os clientes se autenticam com o grant de client-credentials do OAuth 2.0 e recebem um bearer token de curta duração. O tráfego serviço a serviço dentro da plataforma também apresenta um certificado de cliente emitido pela PKI interna. As credenciais são emitidas por aplicação e por ambiente; nunca são compartilhadas entre ambientes.",
    points: [
      "POST /oauth/token com client_id e client_secret retorna um access token.",
      "Os tokens são de curta duração; os clientes devem renová-los antes da expiração, e não somente em caso de falha.",
      "mTLS é obrigatório para chamadores internos e opcional para integrações externas.",
    ],
  },
  {
    id: "scopes",
    title: "Escopos e autorização",
    body: "Cada endpoint declara o escopo que exige. Os escopos são concedidos a um cliente explicitamente; não há herança implícita. A autorização é aplicada no servidor a cada requisição, independentemente de qualquer verificação no cliente.",
    points: [
      "Os escopos seguem o formato domínio:ação, por exemplo licensing:read.",
      "Um escopo ausente retorna 403 com um código de erro estável, nunca um redirecionamento.",
      "As concessões de escopo são auditadas com a identidade do operador que as emitiu.",
    ],
  },
  {
    id: "versioning",
    title: "Versionamento",
    body: "As APIs são versionadas no caminho. Uma mudança incompatível é lançada como uma nova versão; mudanças aditivas são feitas na versão existente. Versões descontinuadas permanecem disponíveis pela janela anunciada e emitem um header de descontinuação.",
    points: [
      "Formato do caminho: /v1/recurso.",
      "A descontinuação é anunciada no changelog antes de o header aparecer.",
      "Os clientes devem tratar campos de resposta desconhecidos como compatíveis com versões futuras.",
    ],
  },
  {
    id: "limits",
    title: "Limites de taxa e cotas",
    body: "Os limites de taxa protegem a plataforma por unidade de tempo; as cotas regem o consumo mensal por cliente. Ambos são aplicados no gateway e reportados por meio dos headers de resposta.",
    points: [
      "Respostas 429 incluem Retry-After e a janela de limite aplicável.",
      "O consumo de cota é reportado mensalmente e reinicia no marco de faturamento.",
      "Limites são política, não configuração: mudanças são feitas por operadores da plataforma.",
    ],
  },
  {
    id: "licensing",
    title: "Licenciamento e leases",
    body: "O software licenciado valida o direito de uso solicitando um lease assinado. Os leases são de curta duração e armazenados localmente, para que uma instalação continue funcionando durante uma queda de rede até o fim do período de carência.",
    points: [
      "Um lease é assinado pela chave de assinatura da plataforma e verificado offline pelo cliente.",
      "A revogação invalida leases futuros; leases existentes expiram naturalmente.",
      "As instalações reportam um heartbeat para que operadores vejam o estado da frota.",
    ],
  },
  {
    id: "errors",
    title: "Erros",
    body: "Os erros usam códigos de status HTTP convencionais, com um código estável legível por máquina e uma mensagem legível por humanos. Os payloads de erro nunca incluem identificadores internos, stack traces ou detalhes de infraestrutura.",
    points: [
      "4xx indica um problema do cliente; a requisição não deve ser repetida sem alterações.",
      "5xx indica um problema da plataforma e pode ser repetido com backoff.",
      "Toda resposta carrega um identificador de requisição para correlação com o suporte.",
    ],
  },
];

function DocsPage() {
  return (
    <PublicShell>
      <div className="space-y-10">
        <header className="space-y-3 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Documentação</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Referência de integração para a plataforma de API da CB67 Labs, publicada em{" "}
            <code className="mono-xs">{platformMeta.docsDomain}</code>. A referência em nível de endpoint é gerada
            a partir da especificação da plataforma e não é duplicada aqui.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Seções da documentação" className="lg:sticky lg:top-6 lg:self-start">
            <ul className="space-y-1">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.body}</p>
                <ul className="space-y-1.5">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2 text-sm">
                      <span aria-hidden className="text-primary">
                        —
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="panel space-y-2 p-5">
              <h2 className="text-sm font-semibold">Operando a plataforma</h2>
              <p className="text-sm text-muted-foreground">
                Operadores gerenciam aplicações, clientes, licenciamento e certificados a partir do Control Center.
              </p>
              <AppLink to="/login" className="text-sm text-primary hover:underline">
                Abrir o Control Center
              </AppLink>
            </section>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
