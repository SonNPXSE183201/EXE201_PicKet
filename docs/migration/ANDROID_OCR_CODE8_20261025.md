# OCR candidate — Android 1.0.4 / code 8

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Built 25 October 2026 from the current local working tree after `f5f93bd7`.
Uploaded to Google Play Internal testing on 25 October 2026; device acceptance
is still pending. This is not a public production release.

- Artifact: `.artifacts/releases/picket-1.0.4-8-google-play.aab`
- Size: 48,136,748 bytes; ARM64 only (the connected Redmi supports ARM64).
- SHA-256: `608b6da69735d3d3380d201fb9d51398a43c1a6709bc3949537ceea5e3b94423`
- Gradle `:app:bundleRelease`: successful in 7m42s; jarsigner reports `jar verified`.
  The Android signing certificate is self-signed, with no timestamp.
- Merged manifest: `com.picket.mobile`, versionName `1.0.4`, versionCode `8`;
  no `REQUEST_INSTALL_PACKAGES` or `SYSTEM_ALERT_WINDOW` permission.
- Generated source map confirms the table-layout parser, OCR-date-first policy
  and Play update adapter are present; sideload update adapter is absent.

## Purpose and acceptance

The connected Redmi still runs Play code 7 and currently rejects another genuine
receipt attempt. That observed failure is not a regression result for this AAB.
Candidate code 8 includes the split-column total, table product, written-date,
merchant-heading and purchase-date calendar changes described in
`REDMI7_ACCEPTANCE_20261025.md`. Source validation: 786 mobile tests passed,
typecheck and commit-hook lint passed before the build.

Upload to Internal testing, update the existing Play installation, verify footer
code 8, then re-test the same receipt plus a long multi-item receipt. Check exact
merchant, date, total and each item; save only reviewed test data. Do not uninstall
the Play app or install an upload-key APK over its different signing certificate.
## Internal release verification

The initial MCP upload timed out. A fresh writable MCP session with a longer
HTTP timeout deployed version code 8 successfully at approximately 23:48 ICT.
A subsequent live `get_releases` read confirmed Internal status `completed`,
version code `8`, version name `1.0.4`, rollout 100%. Production remains empty;
alpha remains the code 6 draft. Local receipts are
`.artifacts/ocr-code8-play-deploy.json` and
`.artifacts/ocr-code8-deploy-retry.log`.

The local Google Play MCP configuration had `--read-only`; it was removed in
response to the user's request to enable publishing. Chrome and Edge are already
installed; publishing used MCP directly. No purchase or phone data change was
performed. Update the existing installation through Google Play before device QA.

## Local build cleanup

The signed final AAB is recorded in the local backup manifest. The cleanup preview
stopped on an unsigned intermediary AAB. ZIP payload comparison (excluding
META-INF signatures) confirmed equality with the signed backup. Automatic approval
review then rejected deleting that generated intermediary file as blocked by
policy; no alternate deletion route was attempted. Generated native build/cache
directories remain and should be cleaned after resolving that refusal. Build and
signature logs are local `.artifacts/ocr-code8-{prebuild,bundle,signature}.log`.
