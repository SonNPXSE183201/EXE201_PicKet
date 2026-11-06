# Real recovery redirect, cold Android bootstrap — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Environment: `Picket_QA_35`, Android 35, `emulator-5556`, isolated `com.picket.mobile.qa`; generated QA A only. No real-user password, session or data was changed.

The harness `.artifacts/native-cold-recovery-callback.py` requests a real Supabase recovery link for the generated user, consumes it through the real HTTPS verification endpoint and keeps the returned custom-scheme token fragment only in RAM. It force-stops the QA app, verifies no QA PID exists, then dispatches the exact real redirect explicitly to the QA package.

Result: **PASS** in `cold-recovery-ime-safe-native.log` and the corresponding `cold-recovery-*/result.json`:

- Real server redirect had `type=recovery` and the expected reset-password destination.
- Cold bootstrap opened **Đặt mật khẩu mới**, not Dashboard.
- Native password update completed and the real auth server accepted the generated credential for the expected QA owner.
- Link tokens/passwords were not written to the report or result JSON. Masked field XML contains only masked input text; no credential values were printed.
- Original Android hardware-keyboard/IME setting restored at harness exit.

The first run reached the correct recovery form but fixture entry hit the IME-covered confirmation field. It failed input readback and did not submit a password update. That invalid input attempt is retained in `cold-recovery-native.log`; it is not called a product regression. The corrected full run disabled the soft IME only for this hardware-keyboard harness and then restored the previous setting.

This proves the actual Supabase **recovery** callback branch. It does **not** prove a Google OAuth provider consent round-trip, PKCE code callback, a callback replay attack matrix, or every auth/onboarding font/keyboard case. Those claims remain separate.
