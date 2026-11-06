# Bills offline refresh — 2026-10-17

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## User journey

Người dùng tạo hóa đơn khi mất mạng, đóng/mở lại ứng dụng, rồi khôi phục mạng. Hàng đợi phải giữ thay đổi, gửi lên server đúng một lần và màn Hóa đơn phải tự bỏ lỗi kết nối cũ sau lần refresh thành công.

## Evidence

| Guarantee | Evidence | Result |
| --- | --- | --- |
| Offline bill create survives force-stop | Pixel 5 emulator, `TEST_Codex_Offline_20261017`, dashboard showed `1 thay đổi đang chờ đồng bộ` after relaunch | Pass |
| Queue flush creates one bill | Restored network, pending banner disappeared; Bills list showed exactly one matching TEST record next to the pre-existing bill | Pass |
| Test data is cleaned up | Archived only the matching TEST bill; list returned to the pre-existing bill | Pass |
| All finance slices refresh after sync/foreground | `npx tsx --test src/core/sync/refresh-finance-slices.test.ts`: RED, missing implementation; GREEN, 1/1 | Pass |
| Stale Bills connection error clears without manual refresh | Rebuilt and installed x86_64 release APK; refreshed Bills offline to show error, enabled network, backgrounded/resumed app; error disappeared automatically | Pass |

`npm run test:mobile` passed 63/63 tests; `npm run typecheck` passed; Expo lint had 0 errors and 25 existing warnings. `release:preflight` and Android `:app:assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon` passed. APK was installed with `adb install -r`, preserving the Google session.

This run did not measure project-wide coverage, perform a Google Play purchase, verify camera hardware, or validate a second physical device. The test bill was soft-archived, not purged from server history. No existing account record was edited.
