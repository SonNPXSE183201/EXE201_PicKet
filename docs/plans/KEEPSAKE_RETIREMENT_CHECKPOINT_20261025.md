# Keepsake retirement — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Account deletion additionally validates and erases the exact owned `keepsakes`
and `keepsake-cloud-cache` directories, then transactionally deletes the owner's
keepsake outbox and photo-cleanup journal. Payloads/photo references are not
decoded or followed during erasure. Original photos, another owner and guest
directories are preserved. File failures retain rows; SQL rollback/retry is
idempotent and stops remote account deletion until cleanup succeeds.

Native photo read/write leaves and every SQL mutation now use the common owner
fence. Photo leases precede the owner queue; internal SQL callbacks do not call
photo/cache operations while holding the queue. The cloud display adapter no
longer creates directories outside that fence. SDK uploads also hold the owner
fence through their request, so dispatched uploads drain before retirement and
later upload requests cannot start. This does not claim cancellation of an
already dispatched server operation or remote orphan-free deletion after every
possible lost network response; server/native lifecycle acceptance remains open.

RED `a0a7481` captured failing attributed erasure, failure handling and native
wiring cases. All **647 mobile tests pass**. SQLite tests cover both tables,
other-owner/guest retention, corrupt metadata, rollback and repeated erasure;
an installed SDK/intercepted-request test proves upload drainage and rejection
of subsequent dispatch. Purge helper coverage: **100% lines / 96.55% branches /
100% functions**. Typecheck and Android JS export pass; lint has 0 errors and
25 existing warnings. Logs: `.artifacts/mobile-keepsake-retirement-`
`{tests,types,lint,coverage,export}.log`.

Physical-device/Expo filesystem and lifecycle interaction acceptance is not
established. Owner notification/device-lock preferences and older unattributed
system/shared legacy images remain outside this increment. Product localization,
content review, forecasting panel and Google Play gates in the main checkpoint
are still open; no production activation is included.
