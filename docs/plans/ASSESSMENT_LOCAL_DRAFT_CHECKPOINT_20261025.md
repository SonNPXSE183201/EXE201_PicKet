# Open-answer assessment draft — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


This completes the local authoring slice, not cloud grading or release acceptance.

- The existing development-only learning preview includes one versioned fictional
  scenario and five public rubric criteria (up to 20 points each). Both the
  scenario and rubric are explicitly under review. No score or XP is generated.
- Vietnamese/English controls, hints, scenario facts, storage states and rubric
  labels follow the app language. The exact answer, including whitespace, is
  preserved when language changes. The limit is 4,000 UTF-16 code units, matching
  the displayed counter and input/storage checks.
- An owner-scoped `learning-assessment` record uses the existing encrypted SQLite
  cache and retirement fence. It is not placed in finance exports, the quiz draft
  namespace, progress sync or the synthetic Gemini job payload. There is no
  provider/network path in the draft card or storage adapter.
- Saves debounce for 300 ms and flush on blur, background and component exit.
  The UI distinguishes unsaved changes, active saves, acknowledgement and errors.
  Exiting flush is best effort; abrupt process termination or storage failure can
  still lose unacknowledged edits. No native process-death guarantee is claimed.
- Saves and explicit clears serialize per owner. Clearing waits behind dispatched
  saves, cancels delayed saves and prevents an old acknowledgement from restoring
  deleted text. Failed saves/deletion retain the visible answer and expose retry.
- Unreadable, unsupported or future-version drafts block automatic overwrite.
  Only explicit confirmed deletion resets them. Late native confirmation after
  unmount does not clear the former owner's draft. Account retirement removes
  this namespace while preserving other owners and guest data.

## Verification

- All **707 mobile tests** pass. Typecheck and Android JS export pass. Lint:
  0 errors and 24 existing warnings.
- Draft store coverage: 100% lines / 93.18% branches / 90.48% functions.
- Tests cover restart, ordered writes, account/guest isolation, invalid owners,
  length/versions/timestamps, storage failure/retry, runtime language switching,
  autosave/background/exit, clear-versus-save races and stale native dialogs.
- The card tests execute actual component callbacks with deterministic React
  hooks, timers, storage and AppState adapters. They are not native layout,
  keyboard, TalkBack, hardware storage or OS lifecycle acceptance.
- Real SQLite retirement tests include the new namespace. Encryption and owner
  fencing reuse the independently tested common cache implementation.
- RED: `5932649` (missing draft/catalog behavior). Evidence:
  `.artifacts/mobile-assessment-{tests,types,lint,coverage,export}.log`.

## Remaining gates and rollback

Cloud grading still needs a provider/account/budget decision, separate consent,
jobs and output validation, app/provider retention handling, reviewer evaluation,
report/regrade flows and staging acceptance. The existing unpaid synthetic-only
Gemini boundary is unchanged. No real answer, billing, credential, production
configuration or database migration was sent or activated.

Independent content review and physical device acceptance remain pending. Disabling
or removing the preview card hides this slice without deleting drafts. Older
clients ignore the extra cache namespace; any format change must explicitly
migrate versioned drafts rather than overwrite unknown data.
