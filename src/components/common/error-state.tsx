import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HttpError, isAuthenticationAttempt } from "@/api/http-adapter";

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
export function describeError(error: unknown): { title: string; detail: string } {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return isAuthenticationAttempt(error.path)
          ? { title: "Usuário ou senha inválidos.", detail: "" }
          : {
              title: "Sessão expirada.",
              detail: "Entre novamente para continuar.",
            };
      case 403:
        return {
          title: "Acesso negado",
          detail: "Sua função não permite esta operação.",
        };
      case 404:
        return { title: "Não encontrado", detail: "O recurso solicitado não existe mais." };
      case 409:
        return {
          title: "Conflito",
          detail: "O recurso foi alterado. Recarregue e tente novamente.",
        };
      case 422:
        return {
          title: "Requisição inválida",
          detail: "Alguns campos foram rejeitados pelo servidor.",
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
