# Notification keepsake source — TDD evidence

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Date: 2026-10-17. Journey: as a signed-in user, I want a cloud keepsake deadline to remain in the Android reminder schedule when I update reminders from the Notifications screen.

| Guarantee | Evidence | Result |
| --- | --- | --- |
| Signed-in reminders load the merged cloud/local collection | `npx tsx --test src/features/notifications/keepsake-source.test.ts` initially failed because `keepsake-source` did not exist; the same command passed 2/2 after implementation | PASS |
| Guest reminders continue to use only device data | `keepsake-source.test.ts` guest case | PASS |
| Change compiles with the mobile app | `npm run typecheck --prefix apps/mobile` | PASS |
| Mobile regression suites include the new test | `npm run test:mobile`: 65/65 tests passed | PASS |
| Release build contains the change | `gradlew.bat :app:assembleRelease -PreactNativeArchitectures=x86_64` | PASS |
| Native scheduling keeps the cloud keepsake deadline | Pixel 5: temporary cloud keepsake with warranty 2026-10-25 produced an Expo alarm for 2026-10-18 09:00 alongside the bill alarm for 2026-10-21 09:00 | PASS |
| Cleanup is scoped | Archiving the temporary keepsake removed only its alarm; disabling reminders removed the remaining bill alarm. The fixture was archived and reminders were left disabled. | PASS |

Known gaps: this verifies metadata-only cloud keepsakes and native alarm scheduling. Offline media upload/retry, multi-device cache, Android process death during upload, and storage cleanup retry remain outside this slice.
