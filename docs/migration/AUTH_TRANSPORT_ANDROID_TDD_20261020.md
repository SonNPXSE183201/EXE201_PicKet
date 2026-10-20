# Bounded auth transport and real token expiry — 2026-10-20

## Journeys

- A signed-in user with a fresh token signs out while offline without leaving the interface busy indefinitely. SDK session removal must remain authoritative; the app must not delete another owner's queue or image cache.
- A naturally expired server token must fail, and a refreshed token must work without manipulating device time.
- The revoked-account Android A–B–A exercise remains a separate acceptance criterion.

## Observed defect and change

The native revocation harness remained on a disabled sign-out button for more than three minutes offline. Earlier attempts navigated to login too early; a later semantic wait reproduced the stalled sign-out rather than treating it as a missing Email field.

The installed Supabase client supports `global.fetch`. The new wrapper applies a 10-second request/body deadline only to the configured project's `/auth/v1/` path. Other origins and storage requests retain their original fetch behavior. Caller cancellation, including Request-input signals, is forwarded. Aborting also rejects the deadline race if a transport ignores AbortSignal. No fabricated HTTP 401, manual token deletion or secondary token snapshot is introduced.

The installed SDK removes a fresh local session and emits SIGNED_OUT even when logout transport fails; it still returns that transport error. This does **not** establish expired-offline logout: the SDK may attempt refresh before its removal path, with its own retry budget.

## TDD and verification

- RED: `npx tsx --test src/features/auth/auth-fetch.test.ts` failed because the newly exercised transport module did not exist. The RED checkpoint attempt was blocked by the existing lint hook's missing-import error; hooks were not bypassed.
- GREEN: eight focused tests passed, including a real installed-SDK session/storage/event integration test, stalled body, ignored abort, pre-aborted caller, Request cancellation, empty response, successful JSON and unrelated origin/storage behavior.
- Full mobile suite: **252/252 PASS**.
- `npm run typecheck`: PASS.
- `npm run lint`: **0 errors, 23 existing warnings**.
- Focused Node coverage: **100% lines, 96.55% branches, 85.71% functions**.
- QA x86_64 release build: PASS, 45 seconds; installed with existing QA data preserved. This is not a public ARM64 release.
- Production code diff contains no logging, credential constants or privileged keys. This targeted scan is not a full security audit.
- GREEN checkpoint: `2b915b5`.

## Real server expiry evidence

`real-server-expiry-results.json` records a dedicated generated QA owner's real 3600-second TTL. Initial API request: 200. After natural expiry: old token 401. Refresh: 200. Fresh-token API request: 200. No clock manipulation. The dedicated owner was purged after completion. Tokens stayed in process memory; only timing/status evidence was recorded.

This is API integration acceptance, not proof of the native expired-offline account-switch matrix.

## Pending native acceptance

The updated APK reached login after A's offline sign-out while A was banned on the server. However, B's immediate in-process sign-in showed a generic auth error. The generated B credentials were independently accepted by the server (password grant HTTP 200), and B's native sign-in passed after force-stopping/reopening the app. A temporary QA-only, credential-free probe identified `AuthRetryableFetchError`, status 0, during this failure; the probe was removed from source afterwards. This establishes a transport failure, not its underlying cause. The full revoked-account A–B–A scenario therefore remains **OPEN**, particularly immediate sign-in after offline logout. Pending media requests/connection reuse are investigation candidates only, not confirmed causes.

The SDK integration test additionally accepts a B session after the timed-out A logout in the same Node client. That passing Node branch does not override the unresolved native observation. Legacy photo migration and other roadmap areas retain their own acceptance status. No VPS API deployment, push or public landing APK update is included in this increment.
