# Receipt transaction attempt recovery — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: safely edit a pinned receipt request after authoritative rejection, including a prior ambiguous response. A local reset or an absent-key SELECT alone is insufficient: an old request can still arrive later.

## Guarantee and implementation

- `resolve_finance_transaction_attempt` takes the same owner/key advisory transaction lock as transaction creation. If creation already committed, it returns that owner's transaction. Otherwise it records a permanent abandoned-key tombstone.
- Creation rejects a tombstoned key under the same lock. Client edits are enabled only after acknowledged abandonment, with a new durable attempt UUID. The receipt/capture identity, managed image and uploaded storage path stay unchanged.
- SQLite reset is compare-and-swap guarded by owner, draft, original attempt, exact pinned ciphertext and `transaction_id IS NULL`. A replaced/committed attempt cannot be unlocked.
- Offline, timeout, failed resolution or local persistence failure retains the original request. A committed resolution resumes attaching its receipt rather than creating another transaction.
- Tombstones are owner scoped, cannot be inserted/deleted directly by authenticated callers and cascade only when the owning auth user is removed. Do not expire them while delayed requests might still be retried.

## TDD and verification

| Stage | Evidence | Result |
| --- | --- | --- |
| Missing SQL resolution | `3ab6d1e`; `transaction-attempt-sql-red.log` | RED: RPC did not exist |
| SQL fence | `8c591fe`; `transaction-attempt-sql-green.log` | GREEN functional: abandon/retry/fence/committed/owner/privilege/cascade |
| Missing gateway/client | `4addd25`; API/client RED logs | RED: missing method |
| Gateway/client | `3340c44` | GREEN three gateway cases and client transport test |
| Missing native recovery | `82bea77`; `receipt-attempt-native-policy-red.log` | RED missing reset and UI fencing |
| Native recovery source | `eff0f36`; `receipt-attempt-policy-green.log` | GREEN 17 receipt tests, including actual SQLite CAS |
| Retryable conflict code | `040af11` | RED SQLSTATE 40001 is inappropriate for a definitive fence |
| Definitive conflict | `26f8a52`; `transaction-attempt-sqlstate-green.log` | GREEN SQLSTATE 23505; deployed old key now returns 409 |
| Real PostgreSQL race | `transaction-attempt-sqlstate-postgres.log` | PASS both lock orderings, repeated lost-reply resolution and one transaction; isolated tmpfs/no-network PostgreSQL container removed afterward |
| API gates | `transaction-attempt-api-full.log`, `transaction-attempt-api-analyze.log` | 82 tests PASS; analyzer no issues |
| Mobile gates | `receipt-attempt-full-tests.log`, `receipt-attempt-typecheck.log`, `receipt-attempt-lint.log` | 396 PASS, zero failures/skips; typecheck PASS; lint zero errors/24 existing warnings |
| Deployed end-to-end API | `transaction-attempt-deployed-final.log` | PASS real invalid wallet, repeat resolution, old-key 409, fresh create, committed resolution, A/B isolation; synthetic transaction archived |
| Android edited receipt | `receipt-attempt-native-99d18d9/result.json`, `receipt-attempt-native-paced-input-retry.log` | PASS actual invalid-wallet 409, acknowledged fence, edit unlocked, cold restart, changed amount 2234 creates exactly one transaction and one receipt. Old key stays abandoned. Uses a named generated-owner legacy pending-row fixture, not real finances. |
| Recovery action large font | `receipt-recovery-font-current/results.json` | PASS actual screenshots at 150%/200% reviewed: text wraps, action remains readable/reachable by scrolling; no form submission. |

## Deployment and rollback

User explicitly approved separate API/migration deployment after local/PostgreSQL gates; no public APK/GitHub push. Migrations `202610210003` and `202610210004` applied. API image `picket-api:transaction-attempt-20261021` built on VPS from the tracked API source archive, then tagged to the existing service image. Only API was recreated. Previous image retained as `picket-api:before-transaction-attempt-20261021` (image ID `f3a083db06c3af9b1717d546f060aee4df5d7054ef4d5b33e90b3bf101dbc326`). API running, restart count zero, deployed health and owner tests passed.

Deployment source is retained at `/opt/picket/releases/transaction-attempt-20261021`; this separate rollout did not overwrite `/opt/picket/apps/api`. Do not rebuild an older source tree and silently replace the fixed image. A later full deployment must use source containing this increment.

First rollout-preparation command used a Compose label digest rather than Docker's image ID; it failed before tagging/switching anything. Corrected from `docker inspect .Image`. First deployed rejection timed out with SQLSTATE 40001; corrected by the separate `004` migration and rerun PASS, not concealed as an initial pass.

Rollback API by retagging the retained old image and recreating only API. **Keep the SQL fence after any abandonment has been acknowledged.** Reverting creation to an unfenced function then permits an old delayed request to create a duplicate. Local function-backup rollback SQL therefore refuses to run when tombstones exist. Full schema teardown is not an operational rollback plan.

Public APK remains 1.0.3/code 4 ARM64; the new edit recovery UI exists only in follow-up source/QA until a separately authorized release.

Native harness preconditions were corrected without relabelling failed runs: cached owner text did not prove the new callback completed, so bootstrap now also checks the observed native grant expiry; a successful recovery message moved below a long category form, so the same unlocked draft was resumed after cold restart; unpaced ADB whole-string injection truncated synthetic text, so paced input plus readback was used. A setup magic-link verification timed out before UI actions and was retried with a fresh generated grant. No new receipt fixture was created for the final resumed flow.
