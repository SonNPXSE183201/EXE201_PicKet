# Bounded auth transport and real token expiry — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


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

The SDK integration test additionally accepts a B session after the timed-out A logout in the same Node client. That passing Node branch does not override the unresolved native observation. Legacy photo migration and other roadmap areas retain their own acceptance status. No push or public landing APK update is included in this increment. The separately approved API archive-retry deployment is recorded in its own report and does not fix this auth issue.

## Follow-up: isolated transport experiment

- Routed only the configured auth origin/path through the already installed `expo/fetch` transport; non-auth networking is unchanged. Added two tests proving transport selection and that an auth failure is not replayed through a second fetch implementation. No dependency was added.
- Latest focused tests: **10/10**; full mobile suite **254/254**; typecheck PASS; lint 0 errors/23 existing warnings. QA release build PASS. These results supersede the earlier counts above, not the native acceptance status.
- Minimal native branches passed in the same process: A online → server ban while offline → offline logout → B online; also with an offline cold restart and with an extra reconnect/offline cycle.
- The complete scenario, including cached photo and queued transaction across restarts, **still failed** at immediate B sign-in. Host preflight accepted the same generated QA credentials with HTTP 200. The sanitized QA-only probe reported `AuthRetryableFetchError / 0 / Authentication request was interrupted. Please try again.` This is the wrapper's request deadline/cancellation error; it does not establish whether connectivity, transport, body consumption or request contention caused the stall.
- Do not describe the isolated Expo transport experiment as a proven fix. No manual session purge or fabricated success was added. The source probe was removed, and a clean QA APK was rebuilt/installed before the subsequent bulk test. The full A–B–A matrix remains OPEN.

Follow-up rerun: the complete harness again failed at immediate B sign-in after changing the QA API endpoint to the emulator host alias (rather than localhost via ADB forwarding, which can remain reachable with Wi-Fi disabled). This rules out treating that harness correction alone as the auth fix. A was unbanned and Wi-Fi/data restored in `finally`; a cold-start login to QA A then passed. No full A–B–A result artifact was written on failure. Later notification work increased the complete mobile suite to 259/259; that does not change this unresolved auth observation.
