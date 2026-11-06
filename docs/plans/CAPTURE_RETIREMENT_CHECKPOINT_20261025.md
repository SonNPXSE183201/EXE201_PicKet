# Attributed capture erasure — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Account deletion now additionally erases the selected owner's encrypted capture
directory and decrypted preview directory, then transactionally removes capture
drafts, OCR intents and picker interruption markers. All absolute directory
targets are validated against the app's exact document/cache roots before any
file is touched. Other owners, guest data and source/exported photos are outside
the deletion targets. Missing directories and repeated erasure are idempotent.

Capture image persistence/restoration, draft/OCR I/O and picker recovery use the
common durable owner fence. The fence drains dispatched file/SQL writes before
raw erasure and rejects late writes after restart. Photo leases are acquired
before the owner queue, preserving orphan-cleanup ordering without nesting the
owner queue. Corrupt payloads do not need decoding to erase rows. Image deletion
failure retains row references; SQL failure rolls back rows and prevents the
remote account deletion request. All three tables are initialized even on an
install that has never used a camera or fallback OCR.

RED `30e5e66` captured failing image/journal erasure and native integration tests.
All **634 mobile tests pass**. Real SQLite tests cover all three tables,
transaction rollback and owner isolation. A real filesystem test under an
isolated workspace temporary directory verifies attributed erasure and retention
of another owner's, guest and original-source files. Picker late-write fencing
is exercised separately. Pure purge helper coverage: **94.74% lines /
94.74% branches / 100% functions**. Typecheck and Android JS export pass; lint:
0 errors, 25 existing warnings. Evidence: `.artifacts/mobile-capture-retirement-`
`{tests,types,lint,coverage,export}.log`.

This is not physical Android/Expo filesystem or process-death acceptance. The
shared receipt draft directory, keepsake storage, notification/lock preferences
and older unattributed system picker/manipulator cache files are not covered by
this increment. No claim of forensic secure wiping or complete app-data erasure
is made. Broader release gates remain in the main implementation checkpoint.
