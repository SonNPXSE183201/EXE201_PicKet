# Picket Nomad implementation — 26 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Scope and behavior

Mobile implementation of `PICKET-DESIGN.md`, using the existing appearance provider,
SecureStore preferences, theme adapter and components. No new runtime dependencies.
Web, landing, Google Play releases, financial data and backend configuration are unchanged.

- Nomad has complete independent light/dark tokens. Rose and Ocean remain selectable;
  Ocean's existing values are explicitly registered independently of Rose. All palettes
  have the same semantic contract for actions, text, financial values, controls, focus,
  overlays, charts and status surfaces. New palettes register data in one registry.
- Production route `/appearance` is accessible from Profile. Display mode and palette
  are separate radio groups, with selected markers and sample previews. A failed save
  retains the active selection; repeated selections are guarded during persistence.
- Settings persist locally before the provider changes. Language and unrelated settings
  are preserved. Theme switching does not remount navigation or call financial/OCR APIs.
- A new installation defaults to Nomad/system. First migration checks the existing local
  mode marker and known SQLite file existence without opening databases. Existing
  installations with no stored appearance preserve account defaults or Rose. Existing
  appearance settings are never rewritten by migration. Unknown palette IDs are retained
  while Nomad is rendered as fallback; corrupt/future schema settings remain protected.
- Overview uses one balance panel with monthly income/expense and two visible scan/add
  actions. Money calculations, multi-currency behavior, privacy and receipt date logic
  are preserved. Buttons support wrapping at large font scales; calendar copy is shorter.
- Shared components use contrast-safe link text independently of sand button fill,
  explicit on-primary text, control borders, status colors and dark overlays. Native
  keyboard mode and navigation background follow the selected display mode.
- Custom category swatches and receipt photos remain original content, not recolored
  when a palette changes. Native OS/payment dialogs can follow OS styling.

## Verification

RED checkpoint: `a2784d86`. Tests specify Nomad registration/contrast, new versus existing
installation migration, preserved unknown IDs and safe storage failures. UI behavior tests
cover resolved account selection, busy controls, non-overlapping writes and failed saves.
The primary-action regression test now checks the retained action label plus translated
processing accessibility feedback, matching the design's loading-state requirement.

Final mobile suite: **863/863 PASS**. Focused theme/settings/shared-UI checks: **122/122
PASS**. Typecheck PASS; lint has zero errors and 27 existing warnings. Final Android
release-mode build PASS in 1m45s, reusing existing caches. All **301 mapped application
source contents** match the packaged bundle (line-ending normalization only).
Logs and checksums are recorded in `.artifacts/nomad-theme/`, especially
`tests-verified.log`, `semantic-final.log`, `typecheck-verified.log`, `lint-verified.log`,
`build-verified.log`, `bundle-verification.json` and `device-verification.json`.

An x86_64 release-mode build is used only on `Picket_Production_Test` / `emulator-5554`.
Its version remains 1.0.4 (17); it is not a new production artifact and must not be
published over the signed phone release 17. Existing phone release backups are preserved.

Android emulator checks use Wi-Fi/mobile data disabled:

- Upgrade retains the existing Rose appearance until the user selects Nomad.
- Nomad light/dark and palette selection work without network access.
- Force-stop/reopen retains Nomad dark. System mode follows OS light/dark; fixed modes
  remain fixed when OS appearance changes.
- Overview, accounts, transactions, budgets and profile render in dark mode. Appearance
  is also checked at 200% font scale; font scale is restored after checks.
- Screenshots and UI hierarchy evidence are local ignored artifacts. No screenshot,
  receipt or user data was sent to an external service for these checks.
- Physical Redmi was not installed, force-stopped or modified. No production deploy
  or GitHub push was performed. Physical device performance and full screen-reader
  acceptance remain release checks; no whole-product completion is claimed.

Pre-existing working-tree edits are retained. Validation applies to the current combined
working tree; unrelated local changes are not reset or automatically included in commits.

## Rollback and next release

Before publishing, allocate a new version code, build signed phone APK/AAB with the correct
update channels and repeat release verification. Keep old palette IDs and preference
storage keys. Rollback keeps Nomad IDs intact; a prior app can render its supported
fallback without deleting user preferences or finance data. No database migration is needed.
