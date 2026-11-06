# Pending receipt media retirement — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Deletion now additionally erases one owner's pending receipt rows and attributed
images before the remote account request. New images live in an owner directory,
including copies left by interrupted metadata writes. Legacy shared images/temp
files are selected only by valid owned UUID identities; another owner's IDs or
image references protect ambiguous shared files. Unknown legacy files and source
photos are preserved rather than guessing their owner.

All public receipt draft reads, saves, canonical request pinning, attempt reset,
progress and removal use the common owner fence. Internal readbacks stay raw
inside that fence to avoid nested-queue deadlocks. A save captures its previous
handoff before queueing. Removal reads the actual owned row and deletes an owned
image before its row; a stale caller cannot supply an arbitrary deletion path.
Draft loading and reuse reject photo references outside their UUID/owner app
namespace. Existing idempotency/pinning SQL and remote-progress preservation are
unchanged. Image failures retain attribution rows; SQL failures remain retryable.

RED `4a8d679` captured failed erasure, failure and native wiring tests. All
**642 mobile tests pass**. Purge/path helper coverage: **100% lines / 97.92%
branches / 100% functions**. Real SQLite and isolated real-filesystem tests cover
legacy/current folders, ambiguous references, corrupt payloads, original photos,
other owners/guest retention, rollback, retry and encoded-space file roots.
Typecheck and Android JS export pass; lint: 0 errors, 25 existing warnings.
Logs: `.artifacts/mobile-receipt-retirement-{tests,types,lint,coverage,export}.log`.

This does not establish physical Android/Expo bridge, process-death or TalkBack
acceptance. Orphaned legacy shared files without recoverable ownership, old
system picker caches, keepsake storage and notification/device-lock preferences
remain outside this increment. Do not claim forensic wiping or full release
acceptance. Other product/content/release gates remain in the main checkpoint.
