# VAT OCR regression — Android 1.0.4 / code 9

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Built 26 October 2026 from the current working tree after `c1627de5`.
Unrelated existing local changes remain; this is not a clean-HEAD build.

- Artifact: `.artifacts/releases/picket-1.0.4-9-google-play.aab`, ARM64 only.
- Size: 48,138,127 bytes.
- SHA-256: `5e08ffb0670c38f065a00694489d7a850a3c6c198877ef6d86d62fecaaf5db1f`.
- Gradle bundleRelease: PASS, 6m43s; jarsigner: `jar verified`.
- Manifest: package `com.picket.mobile`, versionCode 9; no install-packages or
  system-alert-window permission. Source map includes VAT summary and Play adapter.
- Source validation: 791/791 mobile tests, lint, typecheck PASS.
- RED `03793c10`, GREEN `35c6d6a6`; details in `REDMI7_ACCEPTANCE_20261025.md`.

The code 8 rejection was reproduced using 109 native OCR lines from the owner's
photo, entirely locally. Code 9 resolves the skewed VAT summary only when its
subtotal, tax and payable cells are unambiguous and arithmetically consistent.
The total and eligibility survive raw-text re-parsing. The same photo still
has unreadable date text and incomplete product extraction. This is not full
OCR acceptance; the review flow must warn about the fallback date and all fields
must be checked before saving.

MCP deployed code 9 to Internal at approximately 00:40 ICT on 26 October 2026.
A live `get_releases` read confirmed code 9, version name 1.0.4, status
`completed`, rollout 100%. Production remains empty; alpha remains code 6 draft.
The local deployment receipt is `.artifacts/ocr-code9-play-deploy.json`.

Device acceptance remains pending; do not
uninstall Picket or replace the Play-signed app with a locally signed APK.
Build, signature and deployment logs are in `.artifacts/ocr-code8-diagnostic/`.
The temporary P: mapping was removed; the diagnostic emulator is stopped.
