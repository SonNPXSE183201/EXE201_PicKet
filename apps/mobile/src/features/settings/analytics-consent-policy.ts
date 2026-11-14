export type ConsentDecision = "yes" | "no" | null;

/** Stored value → decision. Anything other than an explicit yes/no means "not asked yet". */
export function parseConsent(value: string | null | undefined): ConsentDecision {
  return value === "yes" || value === "no" ? value : null;
}

/** The first-run choice is required only for a signed-in account that has not answered yet. */
export function consentNeedsPrompt(signedIn: boolean, loading: boolean, decision: ConsentDecision): boolean {
  return signedIn && !loading && decision === null;
}
