import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/layout/public-shell";
import { AppLink } from "@/components/common/app-link";
import { platformMeta } from "@/config/env";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — CB67 Labs API Platform" },
      {
        name: "description",
        content:
          "How to integrate with the CB67 Labs API platform: authentication, scopes, versioning, rate limits, quotas and licensing leases.",
      },
      { property: "og:title", content: "Documentation — CB67 Labs API Platform" },
      {
        property: "og:description",
        content: "Authentication, scopes, versioning, rate limits, quotas and licensing integration.",
      },
    ],
  }),
  component: DocsPage,
});

const SECTIONS = [
  {
    id: "authentication",
    title: "Authentication",
    body: "Clients authenticate with the OAuth 2.0 client-credentials grant and receive a short-lived bearer token. Service-to-service traffic inside the platform additionally presents a client certificate issued by the internal PKI. Credentials are issued per application and per environment; they are never shared across environments.",
    points: [
      "POST /oauth/token with client_id and client_secret returns an access token.",
      "Tokens are short-lived; clients must refresh before expiry rather than on failure.",
      "mTLS is required for internal callers and optional for external integrations.",
    ],
  },
  {
    id: "scopes",
    title: "Scopes and authorization",
    body: "Every endpoint declares the scope it requires. Scopes are granted to a client explicitly; there is no implicit inheritance. Authorization is enforced server-side on every request, independently of any client-side check.",
    points: [
      "Scopes follow the domain:action shape, for example licensing:read.",
      "A missing scope returns 403 with a stable error code, never a redirect.",
      "Scope grants are audited with the operator identity that issued them.",
    ],
  },
  {
    id: "versioning",
    title: "Versioning",
    body: "APIs are versioned in the path. A breaking change ships as a new version; additive changes are made in place. Deprecated versions remain available for the announced window and emit a deprecation header.",
    points: [
      "Path form: /v1/resource.",
      "Deprecation is announced in the changelog before the header appears.",
      "Clients should treat unknown response fields as forward-compatible.",
    ],
  },
  {
    id: "limits",
    title: "Rate limits and quotas",
    body: "Rate limits protect the platform per unit of time; quotas govern monthly consumption per client. Both are enforced at the gateway and reported back through response headers.",
    points: [
      "429 responses include Retry-After and the applicable limit window.",
      "Quota consumption is reported monthly and resets on the billing boundary.",
      "Limits are policy, not configuration: changes are made by platform operators.",
    ],
  },
  {
    id: "licensing",
    title: "Licensing and leases",
    body: "Licensed software validates entitlement by requesting a signed lease. Leases are short-lived and cached locally so an installation keeps working during a network outage until the grace period expires.",
    points: [
      "A lease is signed by the platform signing key and verified offline by the client.",
      "Revocation invalidates future leases; existing leases expire naturally.",
      "Installations report a heartbeat so operators can see fleet state.",
    ],
  },
  {
    id: "errors",
    title: "Errors",
    body: "Errors use conventional HTTP status codes with a stable machine-readable code and a human-readable message. Error payloads never include internal identifiers, stack traces or infrastructure details.",
    points: [
      "4xx indicates a client problem; the request should not be retried unchanged.",
      "5xx indicates a platform problem and may be retried with backoff.",
      "Every response carries a request identifier for correlation with support.",
    ],
  },
];

function DocsPage() {
  return (
    <PublicShell>
      <div className="space-y-10">
        <header className="space-y-3 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Integration reference for the CB67 Labs API platform, published on{" "}
            <code className="mono-xs">{platformMeta.docsDomain}</code>. Endpoint-level reference is generated
            from the platform specification and is not duplicated here.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Documentation sections" className="lg:sticky lg:top-6 lg:self-start">
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
              <h2 className="text-sm font-semibold">Operating the platform</h2>
              <p className="text-sm text-muted-foreground">
                Operators manage applications, clients, licensing and certificates from the Control Center.
              </p>
              <AppLink to="/login" className="text-sm text-primary hover:underline">
                Open the Control Center
              </AppLink>
            </section>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
