# Interrupted account deletion recovery — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


This continuation closes the common-cache recovery gap from the 24 October
checkpoint. It does not complete separate media/outbox erasure or native release
acceptance.

Later continuation: `OWNER_PRIVACY_LIFECYCLE_CHECKPOINT_20261025.md` additionally
keeps all unconfirmed outcomes fenced and unmounts private providers immediately;
it supersedes automatic-resume behavior described in older checkpoints.

- Account data providers and navigation remain unmounted while an owner's
  durable cache-retirement state is checked. Guest/anonymous data are independent.
- A retired owner sees vi/en recovery controls. An explicit verification calls
  the installed Supabase SDK's `getUser(capturedAccessToken)` and accepts only
  that exact server-returned owner. Cached session/JWT claims never reopen data.
- A missing/deleted user, network/storage error, changed session or newer
  retirement keeps recovery blocked. Recovery drains through the owner's queue,
  leaves erased data empty and invalidates stale work queued during verification.
- Navigation readiness now follows the permitted nested Stack. Warm intents can
  pause again after an earlier mount and keep only the newest pending intent.
- SDK request tests use a synthetic intercepted Auth endpoint; no user credentials
  or production mutations were used. Current documentation and installed SDK
  source confirm that explicit-token `getUser` requests `/auth/v1/user`.
  Reference: https://supabase.com/docs/reference/javascript/auth-getuser
- RED `5aeac46` failed live-verification lifecycle cases; RED `880d493` failed
  SDK identity, deleted-account and boundary wiring cases. A navigation pause
  test also failed before its implementation, and a status-error recovery test
  caught an early return that skipped verification.
- All **623 mobile tests pass**. Focused lifecycle/verification helper coverage:
  **100% lines / 94.87% branches / 100% functions**. Typecheck passes. Lint has
  0 errors and 25 existing warnings. Android JS export passes; the final
  verification-order adjustment is additionally covered by typecheck and tests.
- Logs: `.artifacts/mobile-recovery-all-tests.log`, `mobile-recovery-types.log`,
  `mobile-recovery-lint.log`, `mobile-recovery-coverage.log`,
  `mobile-recovery-export.log`.

Additional local Auth acceptance passed against the running local Supabase stack:
an admin-created synthetic user signed in and recovered its retired cache; after
hard deletion, the same captured access token could not recover the cache and
the retirement marker remained set. The synthetic user was removed in cleanup.
No production calls or credential logging were involved. The executed script is
`.artifacts/cache-recovery-local-auth.ts`; this supplements the intercepted SDK
tests above and does not substitute for native device acceptance.

The native boundary currently has static wiring/localization checks, not a
rendered device test. Physical Android process-death, TalkBack, deep-link and
owner-switch acceptance still require a device. Confirmed remote deletion still
must not be retried because device sign-out failed. Separate draft/file/outbox
cleanup, other untranslated screens, cloud grading provider/budget/content
review, forecasting panel work and Google Play acceptance remain pending.
