import { ApiError } from "@picket/api-client";

export type MutationFailureDecision = "retry" | "conflict";

export function decideMutationFailure(
  error: unknown,
  attempts: number,
): MutationFailureDecision {
  if (!(error instanceof ApiError)) return "retry";
  if ([400, 403, 404, 409, 410, 422].includes(error.status)) return "conflict";
  if (error.status >= 500 && attempts >= 4) return "conflict";
  return "retry";
}

export function mutationFailureReason(error: unknown) {
  return error instanceof ApiError ? `api_${error.status}` : "unknown_failure";
}
