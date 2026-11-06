# Owner privacy lifecycle continuation — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


This supersedes earlier statements that an unconfirmed deletion automatically
resumes local use, and earlier lists of pending attributed media/preference
cleanup. It is an engineering checkpoint, not complete P1–P5/release acceptance.

## Completed local path

Before sending account deletion, the app commits the durable owner fence and
drains guarded operations, then erases that owner's:

- Common encrypted resource cache and financial mutation/conflict/mapping rows.
- Capture encrypted images/decrypted previews, draft/OCR/picker journal rows.
- Pending receipt rows, current owner image directory and attributable legacy
  shared images/temp files. Ambiguous/unattributed legacy files are preserved.
- Keepsake local/cloud image directories and keepsake/photo-cleanup outboxes.
- Scheduled/presented native notifications and four scoped secure-store keys:
  reminders, read IDs, budget delivery ledger and device-lock preference. The
  retired owner's in-memory budget acknowledgements are also forgotten.

Other owners/guest data, shared appearance and encryption keys, auth storage until
explicit device sign-out, original photos and already-exported files are retained.
The minimal owner-ID tombstone is deliberately retained to reject stale writes.
Deletion is logical erasure, not a forensic secure-wipe claim.

All enumerated native writers use the common owner queue. This includes receipt,
OCR and backup-restore upload/commit dispatch and thumbnail temporary-file work.
Dispatched guarded requests drain before retirement; later dispatch rejects.
New export-file writes are fenced and use UUID names, preventing accidental
cross-export overwrite. Existing exports are not erased. An in-flight server
operation is not claimed canceled or globally transactionally rolled back.

## Deletion outcomes and recovery

- A local cleanup failure prevents the remote request and moves the UI to the
  recovery boundary with an explicit partial-cleanup message.
- A lost/failed server acknowledgement keeps local data fenced. It never
  automatically reopens local storage: the server may actually have deleted the
  account. The old financial providers/navigation unmount behind recovery.
- Only an exact-owner live Auth verification can reopen local access. The lock
  preference is refreshed before data providers remount, so erased preferences
  are not misrepresented by stale component state.
- Confirmed deletion followed by device sign-out failure hides financial
  providers and offers sign-out only, without resending account deletion.
- Owner changes leave the original owner fenced. Device sign-out checks the
  captured owner against the SDK's persisted record inside the app auth queue;
  a stale A logout queued behind B sign-in cannot erase/sign out B.

## Verification

- All **659 mobile tests pass**. Mobile typecheck and Android JS export pass.
  Lint: 0 errors, 25 existing warnings. API/Dart code was not changed.
- Focused preference/deletion-flow/logout coverage: **100% lines / 94.62%
  branches / 100% functions**. Earlier media-helper coverage and real SQLite/
  isolated real-filesystem cases are recorded in the capture/receipt/keepsake
  checkpoints. These percentages do not claim rendered native UI coverage.
- Installed SDK tests cover stale-owner logout and guarded upload drainage.
- A live local Supabase Auth acceptance created an isolated synthetic user,
  verified recovery, hard-deleted it, simulated losing the deletion response,
  confirmed the fence remained closed and the old token could not recover, then
  completed owner-bound device logout. The fixture was removed; no production
  calls or credential logging were used.
- Evidence: `.artifacts/mobile-owner-privacy-final-{tests,types,lint,coverage,export}.log`
  and `.artifacts/cache-recovery-lost-response-local-auth.log`.
- Relevant RED checkpoints: `f6370fa` (preferences), `12cded6` (lost response),
  `760194d` (stale-owner logout), `4e77550` (lock refresh), `02fa39a` (write-surface
  inventory). Each captured failures before its corresponding implementation.

## Remaining acceptance and broader work

Physical Android/Expo filesystem, SecureStore, OS notification scheduling,
TalkBack, background/process-death/deep-link and account-switch acceptance remain
pending. Source wiring checks are not substituted for those tests. Media/server
deletion races and lost-request-response behavior still need end-to-end server
acceptance; guarded client dispatch alone is not a server-side write fence.

Older unattributed system picker/manipulator caches and unreferenced shared
legacy images cannot safely be assigned to one account and are excluded from
selective erasure. No whole shared directory or encryption key is deleted to
guess ownership. User-exported/source files remain intentionally outside it.

Other untranslated product surfaces, partial/combined settlement support,
reviewed F1 collection/real-panel forecasting acceptance, independent content/AI
review, cloud grading provider/budget choice and Google Play purchase/cohort/
store/native gates remain in the main checkpoint. No production activation or
complete handover is claimed.
