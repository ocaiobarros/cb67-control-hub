import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { describeError } from "@/components/common/error-state";

/**
 * All administrative operations funnel through here so feedback is uniform.
 * The mock adapter only acknowledges the request; enforcement is backend work.
 */
export function useAdminAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: string; resourceId: string; payload?: Record<string, unknown> }) =>
      api.performAction(input),
    onSuccess: (result, variables) => {
      toast.success(`${variables.action} enviada`, { description: result.message });
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      const { title, detail } = describeError(error);
      toast.error(title, { description: detail });
    },
  });
}
