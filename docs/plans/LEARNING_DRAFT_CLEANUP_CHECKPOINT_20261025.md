# Learning draft completion cleanup — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


The learning preview now conditionally clears the exact quiz draft submitted for completion/review. Owner-serialized cleanup checks lesson, version and every answer after earlier queued writes settle. A different or newer draft is preserved; absent drafts are no-ops; unknown schemas still fail without writes. Snapshot input is validated and copied at dispatch. Existing explicit clear remains available.

RED a08c067c; 52 learning tests and all 742 mobile tests pass. Typecheck and Android JavaScript export pass. Evidence: .artifacts/learning-draft-cleanup-{focused,tests,types,export}.log. Tests verify the storage queue contract; no native lesson-navigation acceptance is claimed. The curriculum remains an unpublished development preview, pending independent review. No paid service or personal-answer cloud grading was enabled.

## Learning screen save lifetime continuation
The development learning session synchronously serializes completion/review saves. Navigation, retry and answer controls expose disabled state while saving and captured callbacks also respect the synchronous lock. Lesson selection waits for draft hydration. An unmounted session stops follow-up enqueue/completion UI feedback and conditional draft cleanup after an awaited completion; an already-dispatched persistence operation is not cancelled. Existing conditional draft matching remains.

RED 0f6b3795 reproduces duplicate saves, navigation during persistence and late cleanup. Four real screen callback tests with hook/transport adapters cover those cases plus hydration ordering. All 753 mobile tests and 56 learning tests pass; typecheck and Android JS export pass. Evidence: .artifacts/learning-screen-races-{tests,focused,types,export}.log. No native rendering/TalkBack, published curriculum or full product completion is claimed.

## Learning storage recovery continuation
The development learning screen has a vi/en retry-loading action for storage failures. It serializes recovery reads, validates progress and stored draft before clearing the error, and hydrates only if the initial draft never loaded. Already-hydrated answers/submission state are retained; recovery itself never re-enqueues completion or clears drafts. Persistent failures leave the error/retry state. Existing autosave may resume after successful validation for an unsubmitted draft. RED c8bfa74c reproduces missing recovery. All 756 mobile tests and 59 learning tests pass; typecheck and Android JS export pass. Evidence: .artifacts/learning-storage-retry-{tests,focused,types,export}.log. Unknown schemas are not reset. These are deterministic callback tests, not native UI acceptance or curriculum publication.

## Learning read ordering continuation
Initial hydration, progress subscriptions and recovery reads share a progress-read generation; superseded snapshots cannot overwrite newer progress. Save start/result retire older progress reads. Due-review refreshes use their own per-effect generation, so a late older refresh cannot restore a completed review; superseded subscription errors cannot hide a newer successful load. Draft hydration validation is retained independently of whether its progress snapshot is superseded.

RED a107caee reproduces initial-progress regression and stale review resurrection. Three callback regressions cover those cases and a late subscription error. All 759 mobile tests and 62 learning tests pass; typecheck and Android JS export pass. Evidence: .artifacts/learning-read-races-{tests,focused,types,export}.log. These changes order local screen callbacks, not network/server revisions or native lifecycle acceptance. Curriculum publication and broader release gates remain closed.
