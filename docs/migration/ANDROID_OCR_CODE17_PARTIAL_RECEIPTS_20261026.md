# Partial invoices and compact scan UI — code 17

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


The owner confirms code 15 clips splash corners, has unwanted draft/advisory UI,
and still rejects inverted multi-item invoices. Two live Redmi traces isolate the
failure: 14:56 ICT recognition 8,849ms/persistence 9,123ms; 14:58 recognition
3,548ms/persistence 10,421ms. Both have amount=false, merchant/date=true, five
items, one full read, one summary crop and one table crop; neither exhausts the
OCR budget. Therefore this observed rejection is missing-total eligibility, not
proof that rotation failed. Storage time is distinct from native recognition.

## Changes

- Preserve a partial invoice for manual total review only when OCR evidence has
  an explicit invoice heading, merchant/date, strict table headers and at least
  two arithmetically coherent positive item rows. Typed fields never supply this
  proof; blank/unrelated images remain rejected. Handoff still requires a valid
  positive amount and durable image. No financial record is created automatically.
- An observed VAT total can also be verified by the independent final-row sum of
  at least two complete tax-rate columns, each with three observed row cells.
  This permits recovery from a damaged base/tax cell without guessing a total.
  Extra/ambiguous amounts and inconsistent/incomplete cross-column sums still
  fail. Component conflicts lower confidence and require review; raw-text total
  reparse remains stable. Existing primary subtotal-plus-tax checks remain.
- Permit exactly one full-text-directed rotation correction if thumbnail direction
  is wrong. The native image session accepts at most two selections and the
  orchestrator at most two full reads, within the original budget. There is no
  four-angle recognition loop. A single explicit payable label may locate a
  summary retry; it does not itself authorize a financial value.
- Remove the draft-opening action and automatic restore logic. Retain encrypted
  journal persistence/transaction completion safeguards. Remove repeated advisory
  paragraphs; preserve concise actionable errors and compact uncertain-price tags.
- Render existing splash artwork at 128dp inside the 288dp canvas so the square
  fits Android's 192dp circular mask, including its corners. Reference:
  https://developer.android.com/develop/ui/views/launch/splash-screen
- Direct APKs use the existing verified native update flow; Play bundles exclude
  it and use the Play adapter. Commit plugin registration, Metro selection and
  adapter together so the build channels reproduce from tracked source.

RED: ec7c0fc4, a854646c. Final mobile suite: 853/853 PASS; lint 0 errors / 27
existing warnings; TypeScript PASS. Obsolete source assertions requiring automatic
restore were removed; journal corruption/owner/completion unit tests remain.
Native build and artifact/live checks follow packaging.

Local code-16 direct APK packaging passed 846 mobile tests and six native update
verification tests but was not published: the owner's new requests are combined
in code 17. Landing production remains code 15 until this release is verified.
Do not claim physical code-17 OCR/splash/UI or whole-product acceptance before
assisted tests. Publish signed APK to landing and Play AAB only to Internal.

## Artifact and production verification

Direct APK build PASS in 2m08s; Play AAB build PASS in 2m15s. Nine native tests
pass (6 update-verification, 3 OCR decode bounds). Both signed archives verify.
APK source map includes the direct adapter, native updater and installer
permission; Play AAB includes the Play adapter, omits the updater and installer
permission. The five capture/OCR source contents match between channels. Splash
pixels match generated artwork and all nontransparent pixels fit the circle mask.

APK 71,159,756 bytes, SHA-256
`e7b32d350946ddd5cc960d4327fd6fac0591fba7ea58d9ff0014797766676412`.
AAB 48,252,640 bytes, SHA-256
`eeb4f1251c66ec46d9bba965069df8e31745a3d6978a4b3aad060052d29b8f9c`.
Production landing now serves
`picket-1.0.4-17-20261026-e7b32d35-arm64.apk`. Full HTTPS download checksum/size,
MIME, 206 ranges, prior immutable APK availability, login/API health PASS.
Landing build and 10 landing tests PASS; live design was retained. Release JSON
checked with the actual updater policy: older direct install -> available,
code-17 direct -> current, Play install -> play-store. No containers restarted.
Local signed backups/manifest retained. APK-15 direct users need one manual
landing update to enter the repaired APK-17 updater; Play users remain on Play.

Play Internal upload and physical code-17 acceptance are tracked independently.

Play upload completed successfully; a separate live track read confirms Internal
status `completed`, version code 17, rollout 100%. Production has no release.
The owner has been asked to update through Play and repeat the inverted multi-item
receipt test without saving a transaction. Physical acceptance remains pending;
the prior code-15 failure must not be treated as a code-17 result.
