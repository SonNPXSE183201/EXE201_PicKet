# Expo profile sign-out — 2026-10-15

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Journey: an authenticated Android user can cancel sign-out, or confirm it and return to the auth gate without deleting local drafts or queued mutations. The same Google account can sign in again.

| Check | Evidence |
| --- | --- |
| RED | `npm run test:auth --prefix apps/mobile`: 1/5 failed because Profile had no confirmed sign-out action. |
| GREEN | Same command: 5/5 passed after adding the Profile action. |
| Android E2E | Release x86_64 APK on `Picket_Production_Test`: cancel kept the Google session; confirm returned to auth gate; force-stop/relaunch stayed signed out; Google OAuth returned to dashboard. |
| Quality gates | Release Gradle build, root `npm test`, `npm run lint`, `npm run typecheck`, APK v2 signature and `git diff --check` passed. |

The automated regression test checks the Profile wiring; Android E2E checks the actual Supabase session transition. Coverage percentage was not collected because this repository has no mobile coverage command. No production finance records were created or modified. No checkpoint commits were made because the project owner previously asked not to commit without instruction.
