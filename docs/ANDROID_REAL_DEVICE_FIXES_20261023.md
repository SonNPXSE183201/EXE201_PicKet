# Android device fixes — 23 October 2026

<!-- project-status-link -->
> Đồng bộ tài liệu 01/11/2026: [Trạng thái hiện hành](PROJECT_STATUS.md). Nội dung sửa lỗi và phiên bản dưới đây là checkpoint lịch sử; không dùng làm trạng thái release hiện hành.

## Target and current evidence

User device: Redmi 7, MIUI Global 11.0.2, Android 10 / SDK 29. ADB serial is
available locally. Installed app initially reports 1.0.4 / code 6. Do not clear
app data or uninstall it to bypass signature checks.

Old release cleanup removed 12 obsolete APK/AAB/tar files (906.8 MiB). Retained
the code 6 Play bundle, 1.0.4 production APKs and current landing archive.

## Work tracking

| Request | Current implementation/evidence | Remaining acceptance |
| --- | --- | --- |
| Biometric crash | Android <30 uses strong biometric without unsupported device-credential combination; SDK policy tests pass | Reproduce old crash and test fingerprint/cancel/resume on Redmi 7 |
| Reject non-receipt images | Reparse OCR evidence, require merchant/total and item or date; disable fields/attachment/continue; guard transaction submission too | Real landscape, blurred receipt, receipt corpus and offline device checks; heuristic is not a visual authenticity classifier |
| Google opens Gmail | Select a browser supporting Custom Tabs, fail clearly if none | Real Google consent/callback on device and Supabase redirect settings |
| Cannot select/save wallet | Explicit first-wallet CTA; onboarding refreshes account cache | Reproduce existing default-wallet and all transaction creation failures; no blanket claim of resolution |
| Opening balance | Reload accounts after completing onboarding | New-account server transaction and existing-wallet onboarding branches still require validation |
| Transfer location | Remove Home/history shortcuts; retain wallet transfer entry | Device navigation check |
| Background receipt upload | Not implemented in this increment | Owner-scoped durable worker, retry, resume, visible status and cancellation; must not introduce duplicate financial writes |
| Brighter palette | Separate mobile palette used by 52 TSX files; brighter background, darker text, clearer accent; text/button contrast test passes | Real-device visual acceptance; dark/system theme remains separate work |
| Camera sound | `shutterSound: false` in native CameraView capture | MIUI/device behavior verification |
| Advanced OCR | Label states network requirement; invalid images cannot upload | Verify production worker, result population, retry and background lifecycle |
| Hide search/filter | Toggle preserves current query/filter values | Budget drill-down device check |
| Due bills on calendar | Pending/overdue bills marked `!`; selecting day lists due bills | Local date boundaries and device check |
| Resume receipt via Transactions tab | Owner-scoped capture-journal check routes to capture if unfinished | Device navigation, unreadable journal, owner switch |
| Recurring costs entry | Added to Home reminder group | Device check |

## Automated verification

- Full mobile suite: 422/422 tests passed including receipt corpus eligibility
  and light palette contrast.
- TypeScript: passed after runtime changes.
- ESLint: no errors; latest uncached run reports 25 warnings in existing code.
- RED: new eligibility and biometric policy tests failed on missing modules.
- GREEN: 4 eligibility tests, 2 biometric SDK tests pass after implementation.
- No financial transactions or production database migrations were performed.
- Native build and real-device acceptance are recorded separately when completed.
- ARM64 APK native build passed in 4m27s before palette changes; full Play bundle
  subsequently passed in 5m59s with the complete change set.
- Delivered bundle: `.artifacts/releases/picket-1.0.4-7-google-play.aab`,
  108,921,059 bytes, SHA-256
  `A6714292017DD26E749457BC42012BE94E8049DD6058112F93775D1719606D90`.
  Signature verified; merged manifest has code 7 and 31 permissions, with no
  APK installer/overlay permission. Bundled JS contains production API and new
  mobile palette; APK self-update module is absent from JS/DEX.
- Installed code 6 came from `com.android.vending`. Its signing certificate differs
  from the local upload key, so do not uninstall or clear data to install local APK.
- MIUI denies ADB input injection (`INJECT_EVENTS`); user was asked to enable USB
  debugging security settings or operate the biometric switch manually.
- Mi Browser handles ordinary HTTPS links on this device; Chrome is installed.

## Follow-on plan

Source: [Settings/Learning/AI plan](plans/MOBILE_SETTINGS_LEARNING_AI_PLAN_20261022.md).
User authorized implementation after the Android bug fixes. Start with SET-01–03;
do not claim Learning/AI complete from settings scaffolding or synthetic tests.
AI provider budget, staging and human content review still need concrete inputs
before paid integration or publishing learning content.

SET-01 inventory at this checkpoint: 45 route TSX files, 52 TSX files importing
the shared palette, 21 TSX files using fixed Vietnamese formatters/locale. Mobile
semantic palette must be separate from the shared web export. Preference order:
device override → account default → system. Theme/locale changes must preserve
drafts, selected filters and owner isolation. Defaults remain Vietnamese/light
until explicit settings are implemented and validated.
