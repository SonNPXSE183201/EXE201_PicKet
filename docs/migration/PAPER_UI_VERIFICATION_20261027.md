# Paper mobile UI — verification, 27 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


This report supersedes the earlier Paper reports' native visual QA limitation. The standalone Android candidate is `1.0.5 (18)`, artifact suffix `home-r4`, built for the x86_64 emulators. It is an internal APK candidate, not a Play Store release.

## Completed behavior

- Home contains balance, recorded weekly spending, up to three active pockets, and three recent transactions. Tracking tools, monthly totals, duplicate quick actions and the receipt calendar have been removed from the feed. Pending work and recovery errors remain visible when needed.
- Saved receipts are accessible through Spending → transaction tools → receipt calendar. Unauthenticated access redirects to sign in.
- Paper has light and dark palettes, stronger light pocket colors, clearer illustrations and real static Nunito weights 400/600/700/800. The floating navbar has five destinations, a raised camera action and no selected-tab dots.
- Pocket creation supports a custom name, registered illustrations and paper colors. Missing expense categories have a creation action. Appearance is encrypted, scoped to its owner and stored on the device; it is not cloud-synced.
- Artwork is registered centrally in `paper-assets.ts`. Adding a file also requires a literal Metro registration and translated labels. Screens consume stable asset IDs.

## Checks

| Check | Result |
| --- | --- |
| Full mobile suite | 887 passed, no failures or skips |
| TypeScript | Passed, including the final artwork sizing change |
| Mobile lint | 0 errors; 27 existing warnings |
| Release APK build | Passed, `assembleRelease`, x86_64 |
| Both APK signatures | Verified with Android apksigner |
| Focused diff whitespace | Passed after removing a blank line's trailing spaces |
| Focused credential/debug logging scan | No matches in the Paper presentation and new pocket/rhythm modules |
| Coverage | Not measured; no coverage threshold is configured in this repository |

Build, test and native screenshots are retained locally under `.artifacts/paper-ui`; APK backups are under `.artifacts/releases`. Production APK SHA-256: `5267a7265a33c58c54e90c4e1134647675272e86a3507dd1aa8d9a63557150d5`.

## Native test evidence

Pixel_5 retains its signed-in session and existing data. Home was inspected in both themes, including long real monetary values and the pocket/recent-transaction section. The final pocket artwork fits below the amount. It is left open in light mode. No financial records were created or edited on Pixel_5.

Picket_QA_35 was tested without a cloud account. A synthetic local category and pocket were created, health artwork and mint color were selected, and the saved pocket remained available after force-stop/relaunch. Receipt-calendar navigation was exercised through transaction tools. At 150% system font size, creation fields stack into one column and the submit control remains reachable by scrolling. Font size was restored to 100%, local mode was exited without deleting its test records, and protected receipt-calendar access returned to sign in.

These checks cover the changed flows. They do not claim a full manual acceptance pass of every mobile feature, Google OAuth, camera OCR, or live financial writes.

## Installation scope

The same candidate is installed with `adb install -r`, using the certificate matching each emulator's existing installation. This preserves application data. Pixel_5 and Picket_QA_35 are the initial validation devices; the remaining emulator rollout is recorded in `.artifacts/paper-ui/emulator-install-results.json`. The connected physical phone is excluded.

All six emulator installations completed successfully with version `1.0.5 (18)`, and the app process remained running after launch:

| Emulator | Result |
| --- | --- |
| Pixel_5 | Installed; signed-in data retained; light mode left open |
| Picket_QA_35 | Installed; focused flows tested; left signed out |
| Picket_Play_Assets_20261024 | Installed and launched |
| Picket_Production_Test | Installed and launched |
| Picket_QA_Disk_Fault_35 | Installed and launched |
| Picket_QA_Expiry | Installed and launched |

The four emulators started for rollout were shut down afterward. Pixel_5 and Picket_QA_35 remain running. No app data was cleared, no existing package was uninstalled, and no Google Play upload or physical-device installation was performed.


## Follow-up: stable Home candidate, stable-r6

Supersedes home-r4 for the Home privacy and refresh behavior. The eye masks only the total balance on Home. The weekly chart, pocket limits and recent transactions retain their values and geometry. The eye updates local display immediately, with preference persistence in the background; a network failure leaves the current screen choice usable but does not claim it was saved remotely.

Background finance refresh previously replaced the weekly plot with loading. Loading now applies only when both account and transaction collections are empty. The plot remains mounted during refresh, retaining its measured width and selected day. Data sync is still enabled; financial values are not frozen. Native sampling across a polling interval recorded 12/12 visible charts with unchanged heading bounds and no loading/privacy placeholder.

Pocket cards now have a consistent compact minimum height, two top cards and a wider lower-right card. The first card no longer creates an oversized wrapping row; artwork has dedicated bottom spacing. Narrow screens and enlarged text retain the single-column fallback.

Final checks: 890/890 mobile tests, TypeScript passed, Android release build passed. Regression checks were observed failing before the chart/privacy fix, then passed. APK SHA-256: `930c133cbff057bff63232ee736e9f7f32b17e1cb2e9f2660cd509dc250ceaf0`. Screenshots under `.artifacts/paper-ui/focused/stable-final-*` show both themes and the hidden-total state with visible weekly chart and pocket amounts. Pixel_5 data and session were preserved; QA remains signed out. No backend or database changes.

Final native follow-up: selected the previous weekday, backgrounded and resumed Pixel_5, and confirmed selection and chart remained visible while total balance was hidden. Repeated eye toggles preserved the chart. Pixel_5 is left in light mode with total shown. Final lint: 0 errors, 27 existing warnings.

Stable-r6 rollout completed: Pixel_5, Picket_QA_35 and all four remaining AVDs updated successfully. The four rollout AVDs passed version and process-launch checks and were shut down afterward. Results: `.artifacts/paper-ui/all-avds-install-stable-r6.log`. No app data was cleared.


## Additional acceptance pass

Closed the remaining presentation checks in the design document on the installed stable-r6 APK:

- QA display at 360dp (990px at density 440), font scale 150%: inspected Home, pocket creation and the keyboard-open name field. The form stacks vertically, scrolls to its final action and responds to Android Back without saving an unintended budget.
- QA display at approximately 430dp (1182px): inspected transaction entry and capture permission state. The capture screen hides the navigation dock and retains accessible close, gallery and manual-entry actions. Manual entry opens the regular transaction form, with the no-wallet guidance and create-wallet action visible. No transaction was saved.
- Restored QA physical size 1080x2340, font scale 100%, and signed-out state. Local synthetic test data was retained. Pixel_5 was not modified during this pass.
- No new application defect was observed in this additional pass, so the already verified stable-r6 APK remains the delivered build on all six AVDs. No rebuild or repeat rollout was necessary.

Evidence: `.artifacts/paper-ui/focused/audit-360-sheet-bottom.png`, `audit-360-keyboard.png`, `audit-430-camera-permission.png`, `audit-430-manual-entry.png`, and `audit-final-signed-out.png`. Only these inspected states are claimed: this does not establish live Google sign-in, physical-camera OCR quality or production financial-write acceptance.


## Functional acceptance and gallery fix: gallery-r7

Found and reproduced a real remaining defect: selecting a receipt from the gallery silently stopped before opening the Android photo picker. The capture route requested broad media-library permission even though the APK does not declare it. The system photo picker grants access to the selected URI without that permission (Expo ImagePicker usage: https://docs.expo.dev/versions/latest/sdk/imagepicker/). Removed that unnecessary gate while retaining camera permission checks. Picker-opening failures now show an alert instead of a message hidden behind the camera screen.

Regression test failed before the fix and passed afterward. Final mobile suite: 891/891 passed; typecheck passed; lint 0 errors, 27 existing warnings; release build passed. APK backup: `picket-1.0.5-18-gallery-r7.apk` plus the corresponding existing-debug-key variant. Production SHA-256: `0f81ced9152c28f16f688040a9cd321c04a26788750fd653ab13a4f3f906d688`.

Native functional evidence on Picket_QA_35 (local synthetic data only):

- Created QA-Wallet, opening balance 0. Created QA-Expense for 12,000 VND; edited it to 15,000 VND. Home balance and weekly spending both reflected 15,000. Soft-deleting it returned the balance to 0.
- Reproduced and fixed gallery opening. Selecting a non-receipt screenshot produced a recoverable not-a-receipt message.
- Selected `vn-receipt-synthetic.png` from Downloads using the system picker. Local OCR extracted merchant CUA HANG ANH DAO, 1 May 2026, and 250,000 VND, matching the fixture. The sample has no itemized products; no product list was invented.
- Continued to the regular transaction confirmation form, saved with its receipt, reopened the transaction/image and verified the calendar marks 1 May as containing a receipt. These are guest/local operations and do not establish cloud financial-write acceptance.
- Google OAuth opened the official accounts.google.com sign-in form for the configured provider. Canceling returned to Picket. Completing Google authentication remains unverified because QA has no Google account; a request for the user to sign in directly is pending. No credentials were read or entered by the agent, and Pixel_5's real session was preserved.

Evidence files are local under `.artifacts/paper-ui/focused/qa-transaction-edited.png`, `qa-balance-after-edit.png`, `qa-balance-after-delete.png`, `qa-ocr-synthetic-fields-r7.png`, `qa-ocr-saved-r7.png`, `qa-ocr-reopened-r7.png`, `qa-calendar-receipt-r7.png`, and `oauth-provider-stage.png`.

Gallery-r7 rollout completed on all six emulators: QA installed and functionally tested first; Play_Assets, Production_Test, Disk_Fault, Expiry and Pixel_5 subsequently passed install/version/process checks. Logs: `.artifacts/paper-ui/all-avds-install-gallery-r7.log`. QA is signed out. Pixel_5 retains the real session/data. No physical phone or Play Store release was touched. The only outstanding acceptance item from this pass is successful Google authentication with a user-supplied test account; OAuth provider launch and cancellation have passed.
