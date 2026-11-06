# Camera-first capture and splash — Android code 15

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


The owner reports automatic old-draft/image hydration on entry, delayed processing
feedback after capture, the Expo grid placeholder at startup, and rejection of an
upside-down library image on code 14. ADB confirms code 14. The latest assisted
rejection at 14:05 ICT completed in 2,515ms with a table crop, so it is not accepted
as an orientation/performance success merely because the SDK returned text.

## Changes and validation

- Capture opens camera before journal/image hydration, including when the route
  gains focus again. `Mở bản nháp` explicitly restores the existing encrypted
  draft. Owner changes invalidate work; an image/picker cancellation retains the
  durable old draft. Background orphan cleanup runs after work, outside entry.
- Show processing before the image preview and launch native OCR concurrently
  with encrypted image persistence. A complete draft cannot be handed off until
  both finish. Storage failures keep financial fields unavailable; no plaintext
  durable image or silent overwriting of old drafts is introduced.
- Camera keeps original JPEG bytes using Expo Camera skipProcessing; the native
  OCR session normalizes EXIF orientation. No manual rotate action is added.
- If full-resolution text is confidently upright, missing thumbnail direction
  alone does not reject it. Explicit non-upright text remains rejected.
- If the payable total is absent and at least two observed VAT summary labels
  establish a bounded band, read that band once and merge only a parsed amount.
  Existing subtotal + tax arithmetic guard still applies; no total is guessed.
  There is at most one summary crop plus one product-table crop, inside the
  existing budget; full-image OCR is not repeated.
- Explicit expo-splash-screen configuration uses existing Picket artwork, contain
  resize, 200dp image width and cream background. Native generated splash theme,
  images and Activity registration are brought in line with the installed plugin.
  This removes the default grid and stretched window-background bitmap.
- Aggregate-only metrics report persistence/recognition timings and eligibility
  flags, never image/text/account/key content.

RED checkpoints: deb0982f, fd4ea86f, d322811b. Behavioral component tests cover
camera entry, explicit restore, immediate feedback/concurrent work and refocus;
core tests cover summary bounds, checked total recovery and missing direction.
Final mobile suite before packaging: 844/844 PASS; focused metric follow-up PASS;
lint 0 errors / 27 existing warnings; TypeScript PASS.

The owner explicitly requests the newest signed APK on landing production.
Build and verify code 15 APK/AAB, keep immutable release backups, then update only
production APK links/metadata while preserving the existing live page design and
previous downloads. Physical code-15 inverted accuracy and camera/splash acceptance
remain pending; do not claim them from unit tests or code-13/14 measurements.

## Release and landing production

Signed code-15 ARM64 APK/AAB build PASS (4m10s). Final APK signature verifies
and matches the previous landing APK certificate. The installed Google Play
certificate differs, so the Redmi should update via Internal testing rather than
replacing its Play installation with this direct APK. Packaged splash pixels
match the generated Picket artwork; compiled splash theme references that image.
APK/AAB JavaScript bytes match. Release APK points to production HTTPS API and
contains no QA loopback endpoints. It is non-debuggable and has no forbidden
installer/overlay permissions.

APK: 71,415,044 bytes; SHA-256
`611837a4969d8477c77fdcb29fe0acfc98d7350100a29f51c2615e7d70fba737`.
Landing metadata/build PASS; 10/10 landing tests PASS. Production now serves
`picket-1.0.4-15-20261026-611837a4-arm64.apk`. Full HTTPS re-download SHA-256 and
size match; attachment MIME, 206 byte ranges, old APK availability, login and API
health PASS. Live markup/design was retained, with only download links, checksum,
size/date metadata changed. Previous download and rollback metadata remain;
no application container was restarted. Local APK/AAB backups and backup manifest
are preserved; generated/diagnostic payloads are not committed.

The code-15 Play upload and physical Redmi acceptance are still tracked separately.
Publishing the requested APK does not establish all OCR/photo accuracy cases.
