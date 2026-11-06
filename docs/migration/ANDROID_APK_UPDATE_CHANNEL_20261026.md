# Direct APK update channel — code 16

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


The owner asks where direct-APK users can update. Inspection found that the
code-15 landing APK was built with PICKET_PLAY_BUILD=1 and therefore had the
Play-only update adapter and no native direct installer module. That packaging
choice was incorrect for direct distribution; do not claim APK-15 in-app update
works. Its manual landing download path remains usable with the same signer.

Code 16 is a direct-channel APK: build with PICKET_PLAY_BUILD=0, include the
existing PicketAppUpdates native module, and allow its install permission. The
existing Profile update controller reads the HTTPS landing release.json, compares
versionCode/package/ABI/SDK, downloads to its own cache, verifies size/hash/archive
identity/signing, and opens the system installer after user action. No silent
installation, billing-provider change, or extra cloud service is introduced.

The config plugin now removes its previous installer-permission blocker when
switching generated native files back to direct APK, and reinstates it for Play.
The JS bundle task declares the channel as an input so switching modes does not
reuse a stale Play/direct bundle. Red 9152396d covers the manifest round trip;
mobile suite 846/846 PASS, lint 0 errors/27 existing warnings, typecheck PASS.
Final native/artifact/production evidence follows verification.

Channels remain distinct: landing APK signatures match earlier landing APKs;
Google Play signs installed Play packages with a different certificate. Users
already on Play update via Play; APK users update through the landing channel.
Never advise uninstalling an existing install to cross channels without addressing
its data. Physical code-15 camera/splash/inverted acceptance remains pending.

Release workflow: configure native manifest for the desired channel before its
Gradle build (Expo prebuild with the same flag applies the config plugin). The
manual generated-file switch used here removes only the plugin's installer
permission blocker for direct packaging; restore the Play blocker after building.
Verify direct APK manifest/native-module/JS adapter and signer before publishing.
Only the direct APK needs this code-16 packaging repair; Internal Play code 15
already uses its correct channel and its verified OCR/UI changes are unchanged.

Superseded local code-16 packaging by published direct APK 17 after the owner
requested additional OCR/UI repairs. See ANDROID_OCR_CODE17_PARTIAL_RECEIPTS_20261026.md.
Production metadata and the bundled update policy verify older direct versions
see code 17, current sees current, and Play installs route to Play. Native updater,
permission, direct adapter and same landing signer are verified in APK 17.
