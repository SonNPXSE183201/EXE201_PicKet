# Receipt detail and orientation follow-up — Android code 12

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


26 October 2026. Owner reports code 11 reads the invoice total but no usable
product detail, and a 180-degree capture fills incorrect fields. Redmi code 11
was confirmed by ADB. These are unresolved native acceptance failures for code 11.

## Changes and evidence

- RED `ea2f03e2`, GREEN `1b548ca0`: evaluate all four orientations instead of
  accepting the first minimally eligible result. Rank structured table rows,
  invoice labels and VAT summary evidence above plausible isolated values. Tied
  evidence with conflicting totals fails for a retake. Do not merge fields from
  different orientations. All temporary images/native references are released.
- The VAT parser recognizes centered `Tên hàng hoá, dịch vụ` headings, optional
  unit/tax columns, skewed rows and wrapped product names. Column boundaries use
  adjacent header edges; matching uses relative row offsets. Ambiguous duplicate
  cells and inconsistent arithmetic remain excluded. Explicit table receipts no
  longer turn unrelated footer/reference lines into products.
- RED `b7c9912c` / `a31c2322`, GREEN `1b548ca0`: refine an identified table region
  with a second local native OCR pass. Retain full image width; only replace the
  table region when it gives more valid items and preserves the full-image total.
  RED `115fc43d`, GREEN `99a4c58f` preserve additional glyph margins at crop edges.
- Where exactly one cell is unreadable, calculate quantity from an integer
  total/unit-price ratio, or unit price from observed quantity/total, only when
  arithmetic is consistent within the existing one-unit rounding allowance.
  Confidence 0.55 and a review notice identify these calculated fields. Missing
  quantity and unit price together cannot yield an item. Zero-price rows require
  explicit quantity evidence. Shared item-money parsing preserves zero values.
- RED `ec5b0fd1`, GREEN `1b548ca0`: show each item's name, quantity, unit price
  and total on the capture review screen before saving, with calculated-value
  warnings. Keep invalid-image form hiding and manual-rotation removal.

## Native diagnostic limits

Private photos/recognized text remain only in ignored local artifacts; no cloud
OCR or receipt write was used. A separate Android 35 emulator ran the same bundled
ML Kit 16.0.1 at 0/90/180/270 degrees. It confirmed that multiple angles can produce
plausible text with differing totals, so first-eligible selection is insufficient.
The table-band pass matching the final full-width 950..1900 region recovered six
paid product rows, with checked arithmetic and correct invoice total. The same
candidate set selected the correct total when mapped to both normal and inverted
inputs. Six rows survive raw-text reparse. This is a local native model plus
parser/orchestrator diagnostic, not full Expo/Redmi end-to-end acceptance.

Two zero-price invoice rows and a reliable purchase date remain unreadable in
this diagnostic; no values are fabricated for them. Inferred-field confidence is
kept in structured draft items; raw-text-only reparse does not encode that marker.
Worst-case scan now processes all four angles, plus table refinement when found;
phone latency/memory and exact photo accuracy need device regression.

Validation: 817/817 mobile tests, lint and typecheck PASS. Build uses the current
working tree with unrelated existing edits preserved.

## Internal release

Gradle bundleRelease PASS in 1m38s; jarsigner: `jar verified`. ARM64 AAB backup:
`.artifacts/releases/picket-1.0.4-12-google-play.aab`, 48,144,985 bytes.
SHA-256: `7be72e4ad7bc600d8a333c4ed02783e059a1319f6e22ade059634b2949ddd356`.
Manifest confirms code 12 without install-packages/system-alert-window permission.
Source map confirms orientation ranking, table margins/refinement and detail UI.
Backup manifest is updated; temporary P: mapping removed and emulator stopped.

MCP deployed around 02:13 ICT on 26 October 2026. Live `get_releases` confirms
Internal version 1.0.4 / code 12, status `completed`, rollout 100%. Production
remains empty. Receipt: `.artifacts/ocr-code12-play-deploy.json`; build/deployment
logs are local in `.artifacts/ocr-code8-diagnostic/`.
Redmi acceptance remains pending for normal/inverted photos and product details.
