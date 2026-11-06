# Expo Mobile UI refresh

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Reference: the 22 images in `UI_Mau/`. Keep the Picket cream, peach, coral and mauve palette; adopt the reference's clear summaries, grouped lists and contextual actions. Android UI follows Material conventions rather than copying the iOS chrome in the reference.

## Implemented presentation changes

- A shared five-destination navigation bar: Overview, Transactions, Wallets, Budgets and Profile. Existing deep links and providers remain in place. A dedicated Wallets screen exposes existing account detail, create, transfer and reconciliation flows.
- Dashboard: compact greeting, balance with privacy control, monthly income/expense, quick create/transfer, recent transactions and reminders/tools. The month selector and balance privacy preference remain functional. The calendar is available from Transactions.
- Transactions: search, horizontal type chips, period navigation, expandable wallet/category/month filters, expandable tools, calendar with day filtering, and a labeled add FAB. Review Inbox, bulk edits, reconciliation and transfers remain reachable.
- Profile: identity summary, expandable profile editor, preferences and security, grouped tools, grouped data/account actions and an expandable export panel. Sign-out, deletion, guest backups and staff-only administration retain their existing handlers.
- Budgets: common header, month selector, compact progress cards with spent/remaining/limit, and a visible entry to monthly planning. Create/edit use bottom sheets; secondary card actions use a contextual menu. Archive requires confirmation. Existing calculations, split loading, edits, archive, close and rollover requests are retained.
- Capture: Material icons, camera/library actions, simpler instructions and recognition feedback. Production hides OCR timing and internal provider/status names. Uses the existing native camera/photo picker.
- Shared top app bar, icon buttons, menu rows, status notices, chips, buttons and empty states. Form inputs share focus/selection styling. Shared screens avoid keyboard tap dismissal and reserve space for navigation/FABs.
- Technical API names and configuration diagnostics are replaced with user-facing recovery messages. Cached data remains visible; failed writes are not falsely reported as successful.

## Scope boundaries

No API endpoints, database schema, financial rules or server deployments are part of this refresh. Feature-context changes in this refresh are message-copy replacements only. Existing business handlers, request payloads and durable queues are reused.

## Validation

Run mobile typecheck, lint and all mobile tests; build the signed production APK with both `arm64-v8a` and `x86_64`. Inspect the actual APK on Pixel 5 for navigation, text/layout, search/filter/calendar, form entry, profile groups and capture. Record observed device results before marking them verified. Automated policy tests alone do not establish visual quality or full TalkBack compliance.

Completed code checks: 97 mobile tests passed; TypeScript passed; lint has no errors and the same 23 pre-existing warnings. The changed API message test now expects recovery text without exposing API names. Primary foreground/background contrast ratios computed with WCAG relative luminance: white/mauve 5.01:1, ink/cream 11.83:1, muted/cream 5.16:1, ink/peach 9.25:1, income/white 5.07:1, expense/white 5.64:1. This does not substitute for auditing every disabled/pressed state or actual screen-reader use.

## Design constraints

- Minimum 48 dp interactive targets, named icon actions, selected state exposed to screen readers.
- Preserve text scaling, Vietnamese labels, numeric alignment and keyboard scrolling.
- Use the Picket palette through shared tokens; avoid unrelated accent colors and decorative gradients.
- Show meaningful offline/sync feedback without exposing Dart/API/HTTP implementation details.
- Do not add investment, loan or social features merely because they appear in the reference screenshots.

References: [Material app bars](https://m3.material.io/components/app-bars/), [Android touch targets](https://support.google.com/accessibility/android/answer/7101858).

## Building on Windows

`scripts/windows-release.init.gradle` supplies local CMake options for long generated object paths. It also disables RNGH's optional Worklets-runtime sharing for the installed dependency combination, whose native linker cannot resolve the shared-runtime symbols. Normal JS-driven gestures and React Native stack navigation remain available. This is a build compatibility option, not a financial or API change; rerun navigation/scroll smoke tests after building with it.

Use a short drive alias on Windows to keep generated JNI object paths below the platform limit. This does not copy or move the repository. With public production Supabase variables already supplied by the local environment file:

```powershell
subst P: D:\EXE201\Project
Set-Location P:\apps\mobile\android
$env:NODE_ENV = "production"
$env:EXPO_PUBLIC_API_URL = "https://api.51-79-207-154.sslip.io"
$env:EXPO_PUBLIC_OCR_FALLBACK_ENABLED = "true"
npm run release:preflight --prefix ..
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=x86_64,arm64-v8a' --init-script ..\scripts\windows-release.init.gradle --max-workers=2
```

The navigation shell and FAB hide while the keyboard is open. Existing routes are preserved; adding the wallet overview does not rename account detail/create links.

## Pixel 5 device observations

The signed release was installed with `adb install -r`, retaining the signed-in test account and its data. Verified the five main destinations, wallet balances/list and add-wallet navigation, transaction wallet filtering (five entries reduced to two), month/calendar filtering (one October entry), profile summary/preferences, and capture screen. A draft wallet name was typed to inspect focus/keyboard behavior and discarded without saving. The budget create bottom sheet opens and closes without changing data. Screenshots and UI hierarchy captures are in `.artifacts/ui-redesign/`.

This is a UI smoke test, not a claim that every business mutation, OCR accuracy, offline replay, Play Billing or TalkBack flow was retested. No financial records were created, edited or deleted during this UI review. APKs are split by architecture: `picket-ui-mvp-arm64.apk` for typical physical Android phones and `picket-ui-mvp-emulator.apk` for the x86_64 Pixel 5 emulator. Both use the existing release signing configuration and production API address.

Final artifacts: ARM64 60,770,726 bytes (~58 MiB), x86_64 61,838,387 bytes (~59 MiB). Both pass `apksigner verify` with APK Signature Scheme v2. The final x86_64 build was installed successfully. Its compact budget cards, contextual menu, edit sheet and rounded selected navigation indicator were verified on the emulator; edit was dismissed without saving. Typecheck and all 97 mobile tests passed again after the budget UI refinement; lint remains at zero errors and 23 existing warnings.
