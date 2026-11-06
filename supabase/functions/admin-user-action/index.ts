import { json } from "../_shared/auth.ts";

// Retired. Privileged actions now run through Dart API with fresh role, MFA,
// reason, idempotency and transactional audit checks. Never retain a bypass.
Deno.serve(() => json({ error: "Administrative endpoint retired" }, 410));
