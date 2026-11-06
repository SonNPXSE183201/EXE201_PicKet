# Automatic OCR orientation and retry UI — Android code 11

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


26 October 2026. The owner reports code 10 still rejects the same VAT invoice.
A local diagnostic reproduced the picker JPEG quality-80 step (106 OCR lines),
unlike the earlier source-image-only check (109 lines). The compressed result
included a table-border stroke before the tax label. RED `15590070`, GREEN
`c0157219` trim only vertical border strokes at label boundaries and retain exact
label meaning plus the existing three-cell arithmetic checks. Both local photo
results now pass eligibility and preserve total through text reparse. Dates and
complete product details remain unaccepted; no private text/photos are committed.

The owner requested hiding transaction inputs when capture/recognition fails.
RED `245364e3`, GREEN `f469bb62` render actual screen JSX with native primitives
stubbed: invalid/recognizing states have no review inputs or handoff, while valid
receipts have the three fields and handoff. Error alert precedes retry actions.
Existing eligibility policy files were included as the screen's required source
rather than leaving the new tracked UI dependent on an untracked module.

The owner then requested removing manual rotation entirely. Inspection of
rn-mlkit-ocr 0.3.1 found local-file decoding used BitmapFactory followed by
InputImage.fromBitmap(bitmap, 0), discarding EXIF orientation. The adapter now
uses the installed Expo image-manipulator loader to render a lossless PNG at each
candidate angle before native OCR. This loader uses the existing image-loader
service (Glide), which handles source image orientation. No dependency was added.

RED `e0e765f8`, GREEN `8c891747`: sequential 0/90/180/270 attempts stop at the first
eligible receipt and never merge evidence across angles. Each temporary cache
image is deleted and native manipulation references released; the original stays
unchanged. If all orientations fail eligibility, the best unreadable result stays
unaccepted. Failed native attempts may recover at another angle. The picker now
preserves source quality instead of another quality-80 JPEG compression.
The rotate handler/button is removed; interrupted-picker lifecycle checks remain.

Validation: 804/804 mobile tests, lint and typecheck PASS. Source build uses the
current working tree with unrelated pre-existing local edits preserved. Worst-case
recognition can take four sequential OCR passes; device latency/memory and rotated
photo acceptance require Redmi testing. Full receipt accuracy is not claimed.

Android bundleRelease PASS in 1m39s; jarsigner: `jar verified`. ARM64 artifact:
`.artifacts/releases/picket-1.0.4-11-google-play.aab`, 48,138,612 bytes.
SHA-256: `c77e1ff1e2b333dfc08f629dbe133d4ce24c556388da3ea1d22ab826ce198185`.
Manifest confirms code 11 with no install-packages/system-alert-window permission.
Bundled source map confirms automatic orientations, original-quality picker,
conditional review form and no manual rotate button. Backup manifest is updated.

MCP deployed Internal at approximately 01:28 ICT on 26 October 2026. Live
`get_releases` confirms version 1.0.4, code 11, status `completed`, rollout 100%.
Production remains empty. Deployment receipt: `.artifacts/ocr-code11-play-deploy.json`.
Build/deployment logs are local in `.artifacts/ocr-code8-diagnostic/`. Temporary
P: mapping and local diagnostic emulator were stopped/removed after use.
Redmi acceptance of these changes remains pending after updating to code 11.
