# Plan implementation checkpoint — updated 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


This is an engineering checkpoint, not final acceptance or a completed P1–P5 release.

## Current continuation status

The latest continuation below supersedes older pending lists in this file.

- Latest continuation (25 October): reminder calendars refresh on rollover and
  foreground; keepsake reloads discard superseded responses and keep owner-tagged
  state in the coordinator and notification screen. Learning save/navigation
  callbacks are serialized, draft hydration is respected and late completion
  cleanup stops after unmount. All 753 mobile tests pass, typecheck/Android JS
  export pass. See REMINDER_ARCHIVE_CHECKPOINT_20261025.md and
  LEARNING_DRAFT_CLEANUP_CHECKPOINT_20261025.md. Native acceptance, independent
  content review, staging/production and actual Play billing/cohort gates remain.

- Latest integrity continuation (25 October): guest planning/refund calculations,
  restored financial collection identities/budgets/payment schedules/calendar dates
  and split allocations are validated. Notification collection excludes deleted
  records, uses the local planning month, prioritizes the nearest 50 notifications,
  preserves date-only calendars and fences duplicate/stale screen operations.
  Learning completion now conditionally clears only the exact completed draft.
  All 742 mobile tests pass; typecheck and Android JS export pass. See
  GUEST_PLANNING_INTEGRITY_CHECKPOINT_20261025.md,
  REMINDER_ARCHIVE_CHECKPOINT_20261025.md and
  LEARNING_DRAFT_CLEANUP_CHECKPOINT_20261025.md for evidence and limits.
  Native/server/provider/content and release gates remain open.

- Product cost decision (25 October): the owner chose free-only for the current
  stage, with paid service and scaling considered after user growth. No current
  paid budget or automatic billing activation is authorized. Keep synthetic-only
  free AI and local encrypted open-answer drafts/rubric. Personal-answer cloud
  grading is deferred to a separately scoped paid/provider/consent/evaluation
  decision; it is not a promise of free cloud grading. This supersedes earlier
  statements that the current cost preference was unanswered. No runtime flags,
  quotas, provider account or production settings changed.

- Open-answer draft continuation (25 October): the development learning preview
  now includes a versioned fictional case, five public rubric criteria and a
  vi/en editor. Answers stay in a separate owner-scoped encrypted cache record;
  no cloud/network call or score is generated. Autosave, explicit retry/clear,
  background/exit flushing, future-version protection and account retirement
  are tested. Exact answer text survives language changes. All **707 mobile
  tests** pass; typecheck/Android JS export pass; lint has 0 errors/24 existing
  warnings. Store coverage: 100% lines / 93.18% branches / 90.48% functions.
  RED `5932649`; see `ASSESSMENT_LOCAL_DRAFT_CHECKPOINT_20261025.md` and
  `.artifacts/mobile-assessment-{tests,types,lint,coverage,export}.log`.
  Provider/budget choice, cloud assessment implementation/consent/evaluation,
  independent content review and native/release acceptance remain open.

- Planning concurrency continuation (25 October): a synchronous operation lock
  prevents rapid duplicate transfers and overlapping planning writes. Both month
  arrows and previously captured navigation callbacks respect the lock. A read
  generation discards responses started before a newer mutation. Owner/month
  lifetime checks prevent late feedback, follow-up reads and stale native-close
  confirmation dispatch; close checks the latest review/history/split readiness.
  Method/transfer/close HTTP dispatch shares the existing owner retirement fence
  and rechecks the current scope when its queued lease actually starts.
  Seven callback-level tests reproduce rapid taps, late reads, changed owners,
  revoked review confirmation, captured navigation, retired owners and queued
  owner changes using real screen code with deterministic adapters. They do not
  claim native rendering or cancellation of requests already sent to the server.
  All **696 mobile tests** pass; typecheck/Android JS export pass; lint has
  0 errors/24 existing warnings. RED `57c153a`, `e1cd265`; evidence
  `.artifacts/mobile-planning-races-{tests,types,lint,export}.log`.
  No production data, schema, billing or release gate was changed. Physical
  device/server race acceptance and the broader product gates remain open.

- Planning/shared-controls continuation (25 October): monthly planning controls,
  method names, close confirmation, transfer status/errors and budget summaries
  now have vi/en copy. Month/money formatting follows the selected language;
  history/split failures use controlled translated messages and keep unavailable
  spending hidden. Transfer input shares the API money cap. While busy, month/
  method/threshold/source/destination controls are disabled. Shared PrimaryAction
  busy text/indicator are translated and announce the actual disabled state;
  ChoiceChip supports a disabled state. Existing month-close prerequisites remain.
  Three additional callback-level restore tests execute the real screen with
  deterministic hooks/picker/filesystem/transport adapters: cancel/reselect,
  changed owner, ambiguous submission and reload-only retry. These are not
  rendered native or device acceptance tests.
  All **689 mobile tests** pass; typecheck/Android JS export pass; lint has
  0 errors/24 existing warnings. RED `5ac55e3`; evidence
  `.artifacts/mobile-planning-{complete-tests,types,lint,export}.log`.
  Independent copy review, remaining product/AI/forecast work, physical Android
  checks and Google Play/cohort/release acceptance remain open. No production
  data/configuration or real billing/staff action was changed.

- Admin copy continuation (25 October): staff screen tabs, permission/load states,
  live controlled errors, action confirmations, partner/settings controls,
  paging and summary labels now use vi/en copy. Money/dates use the selected
  locale; OCR day buckets remain calendar dates across timezones. User email,
  partner content, notice text, target IDs and audit action codes are preserved;
  staff checks and literal API confirmation/action tokens remain unchanged.
  All **683 mobile tests** pass; typecheck and Android JS export pass; lint has
  0 errors/24 existing warnings. RED `2ccec6a`; evidence
  `.artifacts/mobile-admin-{complete-tests,types,lint,export}.log`.
  No real staff action, reset email, plan grant or production write was executed.
  Native layout/accessibility and independent language review remain pending.

- Restore continuation (25 October): restore UI and controlled validation/
  recovery messages now have vi/en copy, preserving filenames, passwords and
  the literal `RESTORE` confirmation. Unknown errors are not shown verbatim.
  One prepared-backup runner blocks duplicate submits, retains uncertain
  acknowledgements without claiming unchanged data, and retries only reload
  after a confirmed commit. Raw JSON import dispatch shares the owner fence;
  preparation/results/navigation are guarded against changed/unmounted owners.
  All six finance providers support opt-in strict reload errors; restore now
  reloads bills/subscriptions too and waits for every reload to settle.
  Tests execute real provider refresh code with hook/storage/transport adapters,
  not native UI rendering. All **681 mobile tests** pass; typecheck and Android
  JS export pass; lint has 0 errors/25 preexisting warnings. Runner helper
  coverage: 100% lines/functions, 93.02% branches. RED `b3d7a8e`, `d11edd2`;
  evidence `.artifacts/mobile-restore-{complete-tests,types,lint,coverage,export}.log`.
  Device picker/filesystem and end-to-end server restore/race acceptance remain
  pending; these checks do not certify native execution or all release gates.

- Budget continuation (25 October): budget list/create/edit/archive, month
  controls, progress accessibility labels, asynchronous period/split failures,
  queued notices and confirmations now use vi/en copy. Month and money follow
  the chosen language; stored names are not translated. Create/edit limits share
  the payment parser and API money cap, including rejection of unsafe integers,
  decimals and exponent/prefix inputs. All **671 mobile tests** pass; typecheck
  and Android JS export pass; lint has 0 errors/25 preexisting warnings. Shared
  payment/subscription helper coverage: 100% lines/functions, 95.24% branches.
  RED `9dc686c`; evidence `.artifacts/mobile-budget-{complete-tests,types,lint,coverage,export}.log`.
  Other screens, native accessibility/layout, actual Play billing/cohort and
  broader product gates remain open. Existing user theme changes are preserved
  as unstaged changes; no production configuration or data was changed.

- Recurring expense continuation (25 October): list/create/details now use vi/en
  labels, cadence names, local date/money formatting, accessible field labels,
  archive prompts and controlled errors; reminder text has English singular/
  plural forms. User expense/wallet/category names and notes remain verbatim.
  Creation validates real calendar days, title/note length, supported cadence,
  reminder days 0–365 and the API's 9,000,000,000,000 money cap before dispatch.
  Bills reuse the common payment validator and now enforce that same API cap.
  All **668 mobile tests** pass; typecheck/Android JS export pass; lint has
  0 errors/25 preexisting warnings. Shared payment/subscription helper coverage
  is 100% lines/functions and 94.92% branches. RED `df7454e`; evidence
  `.artifacts/mobile-recurring-{complete-tests,types,lint,coverage,export}.log`.
  This does not include native layout/TalkBack or independent language review.

- Bills continuation (25 October): list/create/details now use vi/en copy for
  labels, status, hints, archive confirmation, live validation and controlled
  errors. List money/date formatting follows the selected language; stored user
  titles remain unchanged. Shared form validation rejects impossible dates and
  unsafe/nonpositive amounts before dispatch. Defaults/editing retain local
  calendar dates rather than slicing UTC; round trips pass in Ho Chi Minh City,
  Los Angeles and Kiritimati. All **664 mobile tests** pass, typecheck and Android
  JS export pass, lint has 0 errors/25 preexisting warnings. Form helper coverage:
  100% lines/functions, 93.55% branches. RED `61ab2e3`; logs
  `.artifacts/mobile-bills-{complete-tests,types,lint,coverage,export}.log`.
  Native layout, TalkBack and independent copy review remain pending; other
  untranslated product surfaces are not marked complete.

- Test discovery continuation: root `npm run test:mobile` now discovers every
  `src/**/*.test.ts` file through the Node runner with the existing tsx loader,
  instead of a hand-maintained directory list. The Expo CI job invokes this same
  entrypoint, and root package script changes now trigger source validation.
  The actual root command passed all **659 tests** locally; hosted Linux CI has
  not been run in this session. Evidence: `.artifacts/mobile-complete-entrypoint-tests.log`.

- Latest owner-lifecycle continuation: attributed capture/receipt/keepsake media
  and queues, native reminders and four owner-scoped secure preferences are now
  included before remote deletion. Remaining cloud media/restore/thumbnail/export
  writers share the owner fence; export filenames are unique. Lost deletion
  responses and session changes no longer automatically reopen data. Recovery
  unmounts private providers, requires exact-owner live verification and refreshes
  lock preferences; known deletion/sign-out failure offers sign-out only. A stale
  A logout cannot erase B after queued sign-in. All **659 mobile tests** pass;
  focused lifecycle helper coverage is 100% lines / 94.62% branches / 100% functions.
  Typecheck/Android JS export pass; lint has 0 errors/25 existing warnings. Live
  local Auth deleted-token/lost-response/device-logout acceptance passes. Unknown
  legacy caches, physical native/server lifecycle acceptance and broader product/
  release gates remain pending. See `OWNER_PRIVACY_LIFECYCLE_CHECKPOINT_20261025.md`.

- Latest keepsake continuation: both attributed keepsake image directories and
  the keepsake/photo-cleanup outboxes are erased behind the common owner fence.
  Image/SQL writers and SDK upload dispatch are fenced; dispatched uploads drain
  before retirement. SQLite and installed-SDK request tests pass. All **647 mobile
  tests** pass; purge coverage is 100% lines / 96.55% branches / 100% functions.
  Typecheck/Android JS export pass; lint has 0 errors/25 existing warnings.
  Notification/lock preferences, unknown legacy images, native/server lifecycle
  acceptance and broader product/release gates remain pending. See
  `KEEPSAKE_RETIREMENT_CHECKPOINT_20261025.md`.

- Latest pending-receipt continuation: draft reads/writes, canonical pin/reset,
  progress and removal now share the durable owner fence. New copied images use
  owner directories; deletion also erases attributable legacy shared UUID files
  and pending rows while preserving another owner, guest, source photos and
  ambiguous/unattributed legacy files. All **642 mobile tests** pass; helper
  coverage is 100% lines / 97.92% branches / 100% functions. Typecheck/Android JS
  export pass; lint has 0 errors/25 existing warnings. Keepsake/preferences
  cleanup, unknown legacy system/shared caches and native acceptance remain
  pending. See `RECEIPT_RETIREMENT_CHECKPOINT_20261025.md`.

- Latest capture continuation: deletion now drains/fences capture file and
  journal writers, erases the exact owned document/cache capture directories,
  then transactionally removes capture/OCR/picker rows before the server call.
  Corrupt records, file/SQL failures, retry and other-owner preservation are
  covered by real SQLite and isolated real-filesystem tests. All **634 mobile
  tests** pass; purge coverage is 94.74% lines / 94.74% branches / 100% functions.
  Typecheck/Android JS export pass; lint has 0 errors/25 existing warnings.
  Receipt/keepsake/notification/lock cleanup, unattributed legacy system caches
  and native acceptance remain pending. See `CAPTURE_RETIREMENT_CHECKPOINT_20261025.md`.

- Latest 25 October continuation: the general financial mutation outbox now
  shares the durable owner fence. Account deletion drains pending writes, then
  transactionally erases owned pending mutations, conflicts and mappings before
  the remote request. Late callbacks and foreign/resolved conflict retries reject.
  Real SQLite tests verify erasure, rollback, owner isolation and write races.
  All **628 mobile tests** pass; queue coverage is 97.92% lines / 88.41% branches /
  97.67% functions. Typecheck/Android JS export pass; lint has 0 errors/25 existing
  warnings. Separate receipt/capture/keepsake data/media, native acceptance and
  broader release gates remain pending. See `OUTBOX_RETIREMENT_CHECKPOINT_20261025.md`.

- 25 October continuation: the common-cache recovery gap after interrupted
  account deletion is implemented. Account providers/navigation wait for the
  retirement check; explicit live server verification must return the exact owner
  before an empty cache can reopen. Deleted users, offline errors, owner changes
  and newer retirement keep it blocked. All **623 mobile tests** pass; focused
  helper coverage is 100% lines / 94.87% branches / 100% functions. Typecheck and
  Android JS export pass; lint has 0 errors/25 existing warnings. Native boundary
  rendering/process-death/deep-link acceptance and separate media/outbox erasure
  remain pending. See `OWNER_CACHE_RECOVERY_CHECKPOINT_20261025.md`.

- Latest privacy continuation: account deletion now retires every owner-scoped
  resource in the common encrypted SQLite cache before the server request,
  superseding the forecast-only screen wiring described below. A durable marker
  blocks reads and late writes after restart; owner queues drain dispatched work
  and reject stale generations. Real SQLite erasure/rollback tests and all
  **614 mobile tests** pass. Focused coverage is 100% lines / 96.49% branches /
  100% functions; typecheck and Android JS export pass; lint has 0 errors and
  25 existing warnings. Separate queues/media cleanup and fresh verified sign-in
  recovery after interrupted deletion remain pending. See
  `OWNER_CACHE_RETIREMENT_CHECKPOINT_20261024.md`; this is not release acceptance.

- AI: the synthetic-case vertical slice now has server-only HTTP worker/executable,
  opt-in Compose profile, enqueue/poll/delete API, mobile vi/en consent and approved
  explanations. Real local Auth/RLS/worker acceptance covers concurrent same-key
  retry, wrong owner, revoke/completion race, deletion and atomic per-owner quota.
  Results hide after 24 hours; database Cron prunes outputs and 30-day metadata
  independently of worker uptime. Provider input remains fixed synthetic only.
  Same-owner token refresh preserves work; remote deletion/revocation/expiry is
  rechecked on foreground and periodically. No production activation or human
  quality acceptance is claimed.
- Learning: cloud review/practice API, owner merge, server-due-date filtering and
  monotonic weekly completion are implemented. Review grants no extra XP; repeated
  practice sync grants once. Derived learning milestones have no cash/plan value.
  Local API/Auth/RLS concurrent activity acceptance passes. Publication gates stay
  closed until independent content review.
- Schedules: reviewed per-row device/cloud/omit reconciliation is implemented,
  with revalidation of both copies and an encrypted local recovery copy. A
  reproduced local revision rollback bug is fixed; stale editors remain stale.
  Wallet assignment now survives mobile storage/outbox, API and SQL. Verified
  scenarios include only selected-wallet schedules and block active unassigned
  schedules. Server validation rejects foreign, archived, missing and different-
  currency wallets; a composite owner/wallet FK enforces ownership. Wallet
  replacement during restore clears assignment instead of blocking restore.
- Settlement continuation: explicit one-to-one full-payment links are stored in
  encrypted owner-scoped device storage. The vi/en review verifies included
  transaction/version, signed amount, currency and selected wallet before
  excluding an occurrence. It supports unlinking, clearing and paged review;
  transfers, duplicate payment use and changed evidence reject. No transaction
  is edited. Snapshot invalidation also clears an adopted cloud opening.
  Manual reviewed cloud sync is now implemented with owner-scoped API/RLS,
  optimistic whole-document replacement, durable keyed retry and encrypted local
  recovery before adopting cloud. Both copies must remain unchanged since review.
  Server evidence checks include the owned schedule/wallet, recurrence day, signed
  amount, currency, transaction version and deletion state. Pending ambiguous writes
  block local editing until resolved; no automatic resend or merge occurs.
  Partial/combined payments remain unsupported. A payment must also match the
  occurrence's wallet. Cloud activation and native acceptance remain gated.
- Ledger facts: an authenticated, no-store snapshot RPC/API now reads owner-scoped wallets and transactions at one database origin. The preview requires explicit wallet selection and no pending device mutations before adopting an opening assumption. It links included transactions and discards snapshots on background, queue changes, timeout or session change. Local Auth/RLS/API acceptance passes; migration remains local and the preview gate stays off. Manual settlement sync and offline backtest tooling are implemented; manual F0 capture is now available in development; forecast-record deletion retirement is verified in code; broader device-cache lifecycle, reviewed F1 capture and real-panel forecast acceptance remain pending.
- Weekly Money Story: a local vi/en template now summarizes only confirmed
  selected-wallet records from UTC Monday through snapshot time. Income,
  expenses, refunds and scope transfers stay separate. Amounts hide by default
  and on background; sources open as transactions. Unknown/missing records are
  explicit, including empty weeks. No AI call, financial write, automatic sharing
  or affordability claim. The development route is linked from the learning hub
  behind the existing cloud gate. Native/privacy interaction QA remains pending.
- Forecast evaluation: the offline runner now joins frozen ledger facts, wallet-
  scoped schedules, verified settlement links and the existing F0/F1 engines.
  A 28-day adapter requires explicit scope-bound day completeness and reviewed
  expense classifications; missing records are never inferred as zero spending.
  Future features, repeated windows and cross-split subject/family leakage reject.
  Missing truth excludes a horizon; F1 abstains without sufficient history.
  Grouped and paired metrics stay separate by currency, horizon, cohort and split.
  A local CLI writes reproducible synthetic reports without uploads or overwrites.
  A development-only manual F0 collector now stores a versioned forecast at its
  actual source instant, without retaining the full ledger or wallet names.
  Signed closing balances require explicit confirmation after each UTC day closes;
  corrections preserve history and predictions remain frozen. Encrypted owner-
  scoped storage, 50-case capacity, stale-version checks and privacy hiding are
  implemented, including offline inspection and vi/en controls. This does not
  activate F1 or establish accuracy on real users. Forecast-record retirement
  is integrated before account deletion, with durable fencing and no repeated
  server deletion after a sign-out failure. Broader device-cache/media lifecycle,
  reviewed F1 collection, an authorized panel and calibration remain gates;
  the preview must remain off for users until native lifecycle QA passes.
- Languages: profile controls, controlled profile messages, app update phases,
  installer permissions and installed-version footer now use vi/en resources.
  New/edit transaction, transfer, refund, category splits and bulk-edit forms now
  localize visible copy, accessibility labels, duplicate/archive/delete dialogs,
  controlled receipt validation messages and date/money displays. Structured
  notices rerender their language and formatted money after a locale change;
  user-entered descriptions, merchant names and notes remain untouched.
  Account new/edit and category list/new/edit now translate controlled labels,
  validation, archive/delete dialogs and accessibility copy without translating
  saved names or enum values. Notification settings, reminder labels and private
  native notification copy also support vi/en. Each delivery captures its locale;
  locale changes do not resend acknowledged budget warnings or request permission.
  Account deletion also has vi/en controlled copy and explicit local-retirement,
  remote-unconfirmed and confirmed-deletion/sign-out-retry states.
  Other untranslated product screens/errors still require migration.
- User confirmed **no testing group or Android acceptance device is ready**.
  Real Play purchase cycles, physical-device/TalkBack checks and the 12-person
  closed-test period are external acceptance blockers, not passed tests.
- Latest suites: **604 mobile tests and 140 API tests passed**, `dart analyze` clean; server build and standalone
  learning-worker compilation passed. Android JS export passed. Previous cashflow
  coverage: **98.85% lines / 89.06% branches / 97.77% functions**. Eleven local SQL
  suites passed. Mobile typecheck passed; lint has no errors and 25 pre-existing
  warnings. Logs: `.artifacts/mobile-observation-deletion-tests.log`, `api-settlement-tests.log`,
  `mobile-observation-deletion-export.log`, `forecast-observation-deletion-coverage.log`. Earlier counts below
  are historical.

Live observation continuation (24 October): RED `ad2ca5c`. Captures reuse F0,
verified ledger openings and settlement resolution, retain the real capture time
and never relabel a partial first day as midnight. Missing/unfinished UTC days
cannot become numeric error metrics. Duplicate capture/retry, owner isolation,
persistence failure, correction history, stale deletion, capacity and corrupt-
prediction tests pass. Capture/store coverage is 100% lines / 87.33% branches /
98.59% functions. The native screen has source guards and vi/en copy tests; no
physical-device acceptance is claimed. See
`FORECAST_OBSERVATION_CHECKPOINT_20261024.md`. Retirement of this resource before account deletion was subsequently added in
RED `beb4fde` and its accompanying implementation; queued/in-flight writes cannot
resurrect it, and confirmed server deletion is not retried after sign-out failure.
Latest focused capture/store/deletion-flow coverage: 100% lines / 88.89% branches /
100% functions. This does not establish a comprehensive purge of all older local
cache/media classes. Native acceptance and broader lifecycle review remain gates.

Forecast evaluation continuation (24 October): adapter RED `1ab6832`, GREEN
`644758b`; backtest RED `bb080de`. The offline CLI exercises 14 synthetic origins,
excludes two incomplete horizons and abstains from F1 on two insufficient-history
origins. Focused changed-domain coverage is 97.83% lines / 89.76% branches /
100% functions. See `FORECAST_BACKTEST_READINESS_20261024.md` for contracts,
reproduction and remaining real-panel gates. No financial data was uploaded and
no provider, production configuration or feature gate was changed.

Settlement cloud continuation (24 October): backend contract RED `deb76d6`,
mobile durable/review protocol RED `7654933`. GET/PUT `/v1/cashflow-settlements`
uses only the caller JWT and no-store responses. Lost-response retries reuse a
persisted payload/key; an older acknowledged write returns current cloud data plus
its original applied revision and never resurrects removed links. Definite upstream
rejections release the write barrier; ambiguous outcomes preserve it. Review,
replacement and recovery UI support vi/en; reviews hide on background and local
adoption clears the old usable view until reload. This is manual sync, not an
automatic merge. Core settlement coverage is 96.55% lines / 95.42% branches /
93.88% functions (imported generic API client excluded from this focused metric).
Local real HTTP/Auth/RLS acceptance passes concurrent same-key requests, revision
conflict, foreign-owner references, no-store and non-resurrection. Synthetic users
were deleted and the owned API process was stopped. All 11 local SQL suites pass,
including weekly/month-end recurrence checks. Migration
`20261024110501_cashflow_settlement_sync.sql` was applied and recorded locally;
no production schema or data was changed. Manual cloud sync remains behind the
existing preview gate; physical-device/privacy interaction acceptance is pending.

Reconciliation continuation (24 October): vi/en controlled UI, dates, money and
structured success/refresh notices now rerender on locale changes without changing
saved requests or user-supplied names/reasons. RED `58660fd`, GREEN `1238ed9`.
Guest replay regressions were reproduced in RED `4726a8f`: zero-adjustment retries
advanced versions, could undo a later reconciliation, accepted ID conflicts and
could recreate deleted adjustments. Completed-request receipts now persist in the
same encrypted finance state as each write and survive backup/restore, including
zero differences. Exact replay returns the original result after durable commit;
changed payloads reject. Damaged/duplicate receipts, invalid calendar dates,
deleted evidence and unsafe differences reject before mutation. Old backups remain
readable; legacy adjustment IDs without a receipt require review rather than an
unverified success. Historical zero-adjustment writes cannot be reconstructed from
old backups that did not record them. No production database changes were made.
Full mobile suite: 561 passed; focused reconciliation suite: 40 passed, 92.86% lines /
87.50% branches / 90.64% functions including imported modules. Receipt validation:
100% lines/functions, 96% branches. Native device acceptance remains pending.

Cloud assessment research (24 October): the user requested research, not provider
activation. The decision document `ASSESSMENT_CLOUD_PRIVACY_RESEARCH_20261024.md`
compares Standard paid/non-Contributor with the existing unpaid synthetic lane,
records provider retention and proposes separate consent/jobs, output validation
and synthetic reviewer gates. No real answer submission, billing, credentials or
production configuration was changed. Provider/budget selection remains pending.

Management localization RED `20dd415`, GREEN `b181a04`; notification localization
RED `d2eacd6`, GREEN `245de11`. The focused suite has 99.47% lines / 93.24% branches /
96.50% functions including imported resources. Generic native copy avoids exposing
merchant, amount or account data. These checks do not establish device acceptance.

Transaction localization RED `c78b7a2`, GREEN `396a772`: runtime language switching,
colon-containing keys, count interpolation and structured money notices pass.
AST checks cover all six forms and reject untranslated visible JSX, accessibility
attributes, dynamic copy, dialogs and raw controlled-message rendering. This is
source/runtime-copy evidence, not native screen or TalkBack acceptance. The
notice renderer has 100% line/function and 93.33% branch coverage; the focused
suite reports 99.66% lines / 91.51% branches / 95.52% functions including imported
resource/formatter code. Existing theme/Android/OCR working changes were retained
outside the localization commit. Other product screen/error/notification strings
remain a release gate.

Settlement evidence (24 October): full suite `.artifacts/mobile-settlements-tests.log`
passes 535 tests; typecheck and staged-file lint pass. Full lint has zero errors
and 25 existing warnings. Android JS export passes
`.artifacts/mobile-settlements-export.log`. Cashflow domain coverage is 98.63%
lines / 88.01% branches / 97.55% functions; settlement resolver has 100% lines /
96.77% branches and storage has 100% lines / 92.11% branches. This coverage does
not establish native UI or device acceptance. RED checkpoints: `11e83b2` (missing
settlement verification), `463dbb5` (missing durable owner store). GREEN checkpoint:
`010c75d` (verified resolver, durable store and preview integration).

Wallet/story continuation: RED `210b58f` reproduced dropped mobile wallet scope,
rejected API fields and missing SQL column. Wallet implementation `2b0edbd` and
the corrected remote-revision fixture `aef7b6a` pass the final suite; the first
extra outbox fixture incorrectly kept reporting revision zero after its write,
and was corrected without weakening the revision guard. Real local HTTP/Auth/RLS
acceptance passes including a foreign-wallet write and concurrent same-key replay.
Weekly template RED `8ed4b93`, GREEN `e505935`; UTC boundaries, future/deleted rows,
empty weeks, refunds and neutral internal transfers pass. No device acceptance
is inferred from coverage or export.

The earlier ten 24-October local migrations were already applied and their SQL suites
pass. Their local migration-history rows were repaired to reflect that verified
state; `supabase migration up --local` now reports no pending changes. Production
migration history and financial data were not changed.

Still required before full P1–P5 completion: remaining screen/error/notification
localization; production entry/device settings acceptance; financial-fact completeness,
settlement cloud sync and real backtests; assessment/report/regrade and
personal-data-compatible provider decision; independent lesson/AI evaluation;
staging/production deployment review; device/billing/pilot acceptance. The free
Gemini synthetic boundary must not be widened to personal text or real finance
to make these items appear complete.

## Previous checkpoint snapshot

- AI continuation: explicit owner-scoped consent GET/PUT API, default-off consent, monotonic consent generations, local PostgreSQL queue with atomic daily caps (3 per owner / 100 global), request-key replay and mismatch protection. Service-only claim/dispatch/finalize RPCs recheck consent and active account. Revocation clears results and cancels work under the same owner lock as dispatch/finalize. Dispatched/expired jobs cannot invoke the provider again. Dart worker orchestration passes timeout/uncertain acknowledgement/invalid case/output tests. **Still pending:** HTTP worker gateway/executable, enqueue/poll/history deletion API, mobile consent UI, retention, real concurrency acceptance and deployment. No AI production activation occurred.

- Latest full checks: **505 mobile tests and 119 Dart API tests passed**. Mobile typecheck passes; lint has **0 errors / 25 existing warnings**; `dart analyze` has no issues. Android Kotlin/manifest integration passed in **3m36s**. This is not a new released APK or device acceptance.
- Learning: persistent 7/30-day review queue and quiz/save UI, preserved original/cloud completion dates, no duplicate review XP, weekly anchor refresh on resume.
- Settings: authentication UI/errors/accessibility labels now have vi/en resources. Finance backup/restore retains optional account appearance. Guest restore retains appearance, per-wallet currency and legitimate negative opening balances; malformed values reject before replacement.
- Cashflow: F0 schedule/purchase preview; experimental shared TypeScript/Dart F1 trailing median; explicit confirmed-ledger provenance adapter; aligned 7/30-day error metrics. Real-history calibration/backtests and production facts integration remain pending.
- Schedule sync: normalized owner/RLS storage, optimistic document revision, stable-key replay, PUT/DELETE/GET API and shared client. Durable encrypted mobile outbox resumes after login/foreground, preserves concurrent local edits and blocks first-link conflicts. Local API/Auth/RLS/concurrent-retry acceptance passed. Gate: `EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED=false` until the matching migration/API is deployed and reviewed.
- Google Play: one shared native connection and foreground authoritative refresh; restore reports verification failures. Sandbox billing/device acceptance remains pending. Gemini now rejects incomplete/blocked candidates; synthetic-only live VI/EN smoke passed after the fix.
- New migrations from this continuation are **local only**: appearance backup, per-wallet backup currency and cashflow schedules. Remote production ledger rows were not changed. The API test users were disposable and removed.

The sections below retain earlier checkpoint history; use this current status and the continuation notes for the latest evidence. Google Play remote setup evidence is tracked separately in `docs/google-play/RELEASE_READINESS_20261024.md`.

## Implemented and checked

- Mobile semantic theme style factories, extensible rose/ocean palettes and central language registry. Normal text contrast fixtures cover every registered scheme in both modes.
- Device preferences persist locally; optional account defaults resolve below device overrides. New API optional fields preserve older request payloads. Supabase migration is local only; remote schema was inspected read-only using MCP.
- Original 12-lesson VI curriculum and full English translation, 36 quiz questions and per-choice explanations. Arithmetic/source/identity checks are documented in `docs/learning`. Publication metadata remains authored, not independently reviewed.
- Development learning route: hub, lesson, quiz feedback, encrypted owner-specific progress and draft persistence, replay-safe lesson XP, needs/wants tap exercise. Weekly practice has an encrypted, owner-specific store and an optional completion/skip UI; review intervals have domain tests. Neither is a complete cloud-synced product flow.
- F0 explicit occurrence forecast and separate purchase scenario; weekly/monthly/once recurrence with leap-year clamping. TypeScript and Dart use `packages/finance-fixtures/cashflow-v1.json`. No ledger writes or calibrated prediction claim.

## Evidence

- Latest mobile full suite (24 October): 505 passed, zero failures.
- Settings suite: 13 passed. Learning suite: 20 passed. Additional currency/timezone and billing-readiness tests are included in the full suite.
- Latest API suite: 106 passed. `dart analyze`: no issues.
- Mobile TypeScript: passed. ESLint: zero errors, 25 existing warnings.
- Android ARM64 QA native debug build succeeded (24 October), package `com.picket.mobile.qa`, version 1.0.4-qa (7). MIUI rejected USB installation (`INSTALL_FAILED_USER_RESTRICTED`); APK copied to device Downloads. No successful device execution claimed.
- Android production Hermes export: `.artifacts/plan-continuation-export` succeeded. This is not a native APK/AAB or device acceptance.
- Local Supabase migrations applied; transaction test `supabase/tests/appearance-preferences.sql` confirmed account-default round trip and owner isolation, then rolled back synthetic test data.
- Remote Supabase `qyokoyopodjtvfyunyde` MCP OAuth authenticated. No remote schema changes or production financial mutations made.

## Remaining plan gates

- Full mobile string/formatter/notification and semantic-color migration, production settings entry, backup integration and complete account preference sync UX.
- Learning cloud attempts/progress/XP authority is implemented and tested locally, including replay/concurrency and authenticated Dart API integration. Migration remains local; published curriculum and cloud enable flags remain off. Remaining: spaced review UX, accessibility/device QA and actual content/language review.
- Cashflow schedule CRUD/storage/API and UI, quality adapter, F1/backtest, provenance and complete scenario acceptance.
- AI consent/quota/jobs/revocation/delete/assessment eval and the full evaluation set. Synthetic-only live provider smoke passed in Vietnamese and English, returning only approved explanation IDs; this is not a full quality evaluation. User-authorized key remains only in the ignored backend environment file.
- New native build and ARM64 cold-start/owner/offline/TalkBack/font regression; actual opt-in pilot and release decision.

The local migration rollback can restore the previous `current_profile` function and remove only the three optional appearance columns after checking no deployed client depends on them. Financial rows need no rollback for this increment. Never delete user data to test owner isolation.

## Google Play configuration audit — 24 October

- Remote Edge Functions currently contain only `delete-account` and `admin-user-action`; `verify-purchase` and `play-notifications` are absent.
- Remote secrets list contains only Supabase defaults; no Google Play credential/RTDN configuration is present.
- `play_purchases` and `record_play_purchase` exist remotely (metadata read only).
- Located the user’s service-account JSON in Downloads. Google OAuth returned 200; Android Publisher subscription-list request returned 204 with no product body. This does not prove that the four products, RTDN, or sandbox purchases are ready.
- Automatic approval rejected uploading that credential to Supabase (“blocked by policy”). No secret was uploaded. The owner must add `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` using the Supabase Dashboard; never paste the private key into chat or commit it.
- New-purchase readiness defaults off in the backend/mobile changes; existing purchase verification/restore remains available. No real purchase was initiated.

## Coding continuation — 24 October (current; supersedes earlier partial statuses)

- Learning: original completion timestamps now persist; verified cloud dates fill legacy undated rows. Owner-scoped 7/30-day due reviews survive restart, serialize concurrent taps and never grant duplicate lesson XP. Preview includes review entry/quiz/save and updates due tasks on resume. Weekly practice refreshes its Monday anchor on resume and while foregrounded. Still no claim of content review/publication or cloud review-event sync.
- Cashflow: experimental F1 trailing median has matching TypeScript/Dart implementations and shared fixtures. Only 28 explicitly complete days before the origin are eligible; missing/incomplete days cause abstention. Future records cannot affect estimation. This is a candidate baseline, not a backtest result or real-data quality acceptance.
- Cashflow preview: encrypted owner-scoped schedule runtime plus create/edit/delete, enable/disable, recurrence, optional end date, 7/30-day F0 and separate purchase scenario. Stale calculation hides after inputs change. Opening balance is supplied explicitly and no ledger writes occur. Production entry, API schedule sync, settlement UI and quality adapter remain pending.
- Billing: one shared native Play Billing connection. Owned purchases reverify against the backend on login/resume and periodically in foreground, with in-memory 12-hour throttling after success. Owner/session cleanup aborts refresh; failed verification grants no tier. This mitigates stale `verified_at` on an active device without weakening the server's 24-hour gate. Actual Play sandbox purchase/renewal tests remain pending; no product activation or release was performed in this continuation.
- Validation: mobile full suite **484/484 passed**, mobile typecheck passed; lint **0 errors / 25 existing warnings**. API **96/96 passed**, `dart analyze`: no issues. Native UI/TalkBack/device validation has not been performed for these increments.
- TDD evidence: review runtime tests initially failed with missing methods; the attempted separate RED commit was rejected by the existing typecheck pre-commit hook, which was respected. Green review implementation committed as `91cdaa8`. F1 RED/GREEN checkpoints: `c1dd755`, `13a0fec`, `828f1bf`. Scenario form runtime RED checkpoint: `88c0454`. Billing refresh helper tests were added together with its first implementation, so they are regression evidence, not a claimed RED/GREEN cycle.
- Current Google Play deployment/configuration evidence is in `docs/google-play/RELEASE_READINESS_20261024.md`. The earlier audit above predates the deployed verification/RTDN functions, the owner's manual secret setup and subsequent store metadata submission; do not treat that old audit as current remote state.

Remaining plan gates still include complete vi/en migration and settings/backup integration, schedule API/quality/provenance/backtests, AI consent/quota/jobs/revocation/assessment and evaluation, independent human content review, native device acceptance, actual Play billing acceptance and the real opt-in pilot. These are not marked complete by the passing unit tests.

## Schedule and backup integration evidence — 24 October

- Backup SQL RED/GREEN: `fd126c7`, `66b7828`, `caa4290`; per-wallet currency RED/GREEN: `a71418a`, `17c5576`, `d9c0d22`. Local SQL tests cover round trip, missing optional fields, explicit null, invalid type rollback, other-owner isolation and legacy currency fallback. Rollback restores the preceding load/save function definitions; retain the optional preference columns and user values.
- Gemini completion-status RED/GREEN: `d253ee1`, `db2fa38`; 4 regression cases rejected blocked/truncated/missing completion statuses. The live adapter still accepts only predefined synthetic scenarios and whitelisted explanation IDs. No real finance or user text was sent to Gemini.
- Authentication resource RED/GREEN: `344918a`, `0fd6485`; validation coverage includes sign-in/sign-up/reset/verification and mapped callback errors. No claim that every remaining product screen is fully translated.
- Forecast provenance/evaluation: `f409d19`, `03556f5`, `c67ea55`, `16a1392`. Metrics reject missing/misaligned truth and mixed currencies; they do not select a production model from synthetic results.
- Schedule API/outbox RED/GREEN: `619efda`, `2dcb48e`, `71aec99`, `4c29a4c`, `e373a2d`. Live local tests use the built Dart API plus Supabase Auth/RLS: concurrent same-key retry, stale-version conflict, payload mismatch, ownership, deletion, old retry after deletion, invalid date, no-store and anonymous rejection. Outbox tests additionally cover restart, network failure, concurrent local edits, bounded resume batches, invalid acknowledgment and owner cancellation. A lost-response/other-device revision bug was reproduced and fixed before the green checkpoint.
- Latest cashflow coverage before the final replay regression addition: **99.08% lines / 84.70% branches / 86.87% functions**, recorded in `.artifacts/cashflow-coverage.log`. Native integration log: `.artifacts/android-plan-compile.log`; Android JS export and Dart build logs are in `.artifacts`.

Still not complete: all remaining screen/error/notification translations; production settings entry and full device settings acceptance; schedule conflict reconciliation UI, settlement links and runtime confirmed-ledger metadata; complete real-data backtests; AI consent/quota/jobs/revocation/assessment and the full evaluation set; independent content review, real Play billing cycles, native device QA and the opt-in pilot. These pending items are not converted into passed acceptance by the local tests.
