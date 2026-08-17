import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HttpError, errorCode, isAuthenticationAttempt } from "@/api/http-adapter";
import { AccessSessionExpiredError } from "@/api/access-session";

/**
 * Copy for a 401, which the backend uses for several unrelated situations.
 *
 * The contractual error code is consulted first. Classifying on the path alone
 * told an operator who mistyped their TOTP code that their username or password
 * was wrong — after the password step had already succeeded, which makes the
 * message not merely unhelpful but false.
 */
function describeUnauthorized(error: HttpError): { title: string; detail: string } {
  switch (errorCode(error.body)) {
    case "mfa_code_invalid":
      return {
        title: "Código de verificação inválido.",
        detail: "Confira o código do autenticador e tente novamente.",
      };
    case "mfa_challenge_expired":
      return {
        title: "Verificação em duas etapas expirada.",
        detail: "Entre novamente para recomeçar.",
      };
    default:
      break;
  }
  return isAuthenticationAttempt(error.path)
    ? { title: "Usuário ou senha inválidos.", detail: "" }
    : { title: "Sessão expirada.", detail: "Entre novamente para continuar." };
}

/**
 * Maps transport failures to operator-facing copy. Raw fetch errors and stack
 * traces are never surfaced to the user.
 *
 * On 401 the status alone is not enough. A rejected password and an ended
 * session are the same code and completely different situations, and reporting
 * both as "session expired" told an operator who mistyped their password to log
 * in again — which is what they were already trying to do. The request path
 * separates them.
 */
/**
 * The gateway's own explanation, when it wrote one for the operator.
 *
 * Used only for the statuses that mean "you asked for something impossible"
 * (400, 409, 422). For 401, 403 and 5xx the curated text stays: those messages
 * are about the session or the server, where a backend string is either less
 * useful than the app's own or says more than an error should.
 */
function serverMessage(error: HttpError): string | null {
  // The adapter carries the body as raw TEXT, not as parsed JSON, so this has
  // to parse it. Reading it as an object returned null for every error and the
  // gateway's explanation was replaced by a generic sentence on every screen —
  // which is how a licence rejected for a real, stated reason showed up as
  // "alguns campos foram rejeitados".
  let body: unknown = error.body;
  if (typeof body === "string") {
    const text = body.trim();
    if (text === "") return null;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON. A raw error page is not something to show an operator.
      return null;
    }
  }
  if (typeof body !== "object" || body === null) return null;
  const message = (body as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  return trimmed === "" ? null : trimmed;
}

export function describeError(error: unknown): { title: string; detail: string } {
  // Checked before HttpError: an intercepted request never produced an HTTP
  // status the app can see, and reporting it as a connectivity failure sent the
  // operator to look at the server when they only had to sign in again.
  if (error instanceof AccessSessionExpiredError) {
    return {
      title: "Sessão do Cloudflare Access expirada.",
      detail: "Redirecionando para autenticação.",
    };
  }
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return describeUnauthorized(error);
      case 403:
        return {
          title: "Acesso negado",
          detail: "Sua função não permite esta operação.",
        };
      case 404:
        return { title: "Não encontrado", detail: "O recurso solicitado não existe mais." };
      case 400:
        return {
          title: "Requisição inválida",
          detail: serverMessage(error) ?? "Os dados enviados não foram aceitos.",
        };
      case 409:
        return {
          title: "Conflito",
          detail: serverMessage(error) ?? "O recurso foi alterado. Recarregue e tente novamente.",
        };
      case 422:
        return {
          title: "Requisição inválida",
          // The gateway answers a rejected write with the sentence the operator
          // needs — which plan belongs to another product, which code is
          // already taken. Replacing it with "alguns campos foram rejeitados"
          // discarded the only part that said what to change.
          detail: serverMessage(error) ?? "Alguns campos foram rejeitados pelo servidor.",
        };
      case 429:
        return {
          title: "Limite de taxa excedido",
          detail: "Muitas requisições. Aguarde um momento antes de tentar novamente.",
        };
      case 502:
      case 503:
        return {
          title: "Serviço indisponível",
          detail: "A API de gestão não está acessível no momento.",
        };
      default:
        return { title: "Falha na requisição", detail: "A API de gestão retornou um erro." };
    }
  }
  return {
    title: "Dados indisponíveis",
    detail:
      "Não foi possível acessar a API de gestão. Verifique a conectividade e tente novamente.",
  };
}

/**
 * Renders an error as a single operator-facing line, for places with one slot
 * rather than a title and a body — the login form, for instance.
 *
 * Some titles are labels ("Acesso negado") and some are complete sentences
 * ("Sessão expirada."). Joining both with ": " produced "Sessão expirada.:
 * Entre novamente para continuar."
 */
export function formatError(error: unknown): string {
  const { title, detail } = describeError(error);
  if (!detail) return title;
  return /[.!?]$/.test(title) ? `${title} ${detail}` : `${title}: ${detail}`;
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, detail } = describeError(error);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-crit/30 bg-crit/5 px-6 py-8 text-center"
    >
      <AlertTriangle className="size-6 text-crit" aria-hidden />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{detail}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
