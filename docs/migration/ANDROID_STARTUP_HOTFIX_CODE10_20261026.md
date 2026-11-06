# Guest startup crash hotfix — Android code 10

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


26 October 2026. Redmi updated through Play to code 9; ADB crash buffer records
`TypeError: Cannot read property 'items' of null` in `ReminderCoordinator` at
00:49 ICT. Both optional-chain owner values were undefined on a guest cold start,
so their equality incorrectly selected `loadedKeepsakes!.items` while null.

RED `0de4280b` executes the actual coordinator through its existing hook harness
and reproduces the exception with absent session/cache. GREEN `600c7852` requires
both session and loaded state before comparing owners. Existing owner-switch,
signout, repeated guest render and keepsake-response race tests remain covered.
Full mobile: 793/793 PASS; lint and typecheck PASS.

Code 10 includes this guard and the code 9 VAT OCR changes. It does not erase or
migrate phone data. Local diagnostic logs are ignored under
`.artifacts/ocr-code8-diagnostic/`. No real receipt content is committed.

Build PASS in 1m37s; jarsigner reports `jar verified`. Artifact:
`.artifacts/releases/picket-1.0.4-10-google-play.aab`, 48,138,084 bytes, ARM64.
SHA-256: `c8cba2a11d9c8c33fcae4132ad4c6cbc3c21948bc2a2ceb9f53f3ff6624b7ae4`.
Manifest confirms code 10 with no install-packages or system-alert-window
permission. Generated source map confirms the null/session guard is bundled.
The existing generated Play native project was reused; only versionCode changed
alongside app.json. No prebuild or new native dependency was needed.

MCP deployed code 10 to Internal around 00:57 ICT. Live `get_releases` confirmed
version 1.0.4, code 10, status `completed`, rollout 100%. Production remains empty.
Receipt: `.artifacts/ocr-code10-play-deploy.json`. Backup manifest includes the AAB.
The temporary P: mapping was removed after build.

The owner reports code 10 opens normally on both initial and repeat launch.
ADB independently confirms Redmi is running version 1.0.4 / code 10. These two
reported launch attempts pass startup regression; this is not a long-run stability
or full-product acceptance result. Receipt review regression remains required.
Unreadable OCR dates and incomplete product extraction remain open.
