# Kiểm thử 8 luồng Android — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md). Báo cáo này ghi phạm vi thực chạy, không tuyên bố tất cả 8 luồng đã hoàn thiện.

Follow-up phiên offline: [OFFLINE_SESSION_RECOVERY_TDD.md](OFFLINE_SESSION_RECOVERY_TDD.md) ghi bản sửa bootstrap/deadline, Android cold-start offline với client clock +2 giờ và queue 321 ₫→reconnect một bản ghi. Natural server expiry chưa nghiệm thu. Bộ mobile mới nhất 144/144, không thay thế các giới hạn trong bảng bằng chứng cũ.

## Môi trường an toàn

- Emulator `emulator-5554`, bản QA riêng `com.picket.mobile.qa`, cùng source Expo. Hai tài khoản tạm A/B, không đăng xuất hoặc sửa dữ liệu Google ở package chính `com.picket.mobile`.
- Proxy chỉ bind `127.0.0.1:18080`, Android kết nối bằng adb reverse. API/Supabase production thật nhưng fixture chỉ thuộc hai user QA. Service key chỉ dùng trong RAM để tạo/dọn user; không đưa vào APK, source hoặc report.
- APK QA có manifest/package/network config riêng trong `.artifacts`, chỉ cho cleartext loopback, không dùng để phát hành. Kiểm tra bundle thực chứa URL QA trước ca fault injection; bản build ban đầu còn cache endpoint production không được tính là bằng chứng fault injection.
- Airplane mode không ngăn loopback adb reverse. Các ca offline QA đã ngắt reverse khi cần đảm bảo không có đường tới API; không dùng riêng biểu tượng airplane làm bằng chứng.

## Kết quả từng luồng

| Luồng | Bằng chứng đạt | Giới hạn còn lại |
|---|---|---|
| 1. Mất response đối soát | Android submit; server trả 200/tạo adjustment; proxy đóng socket trước khi giao response; force-stop/restart; retry snapshot cùng request ID; server `replayed=true`, cùng reconciliation ID, chỉ một adjustment 123 ₫ | Đạt ca chính trên QA Android + server thật, không chỉ unit. Không phải test tải/chaos nhiều lần |
| 2. Bulk archive lỗi một phần | Chọn 2 fixture; proxy trả 409 authoritative cho FAIL, OK tới server và archive thành công; Android báo 1/2 và giữ chọn đúng FAIL. Bỏ fault, retry báo 1/1, chỉ FAIL được gửi lại | 409 là fault do proxy tiêm, không phải một version conflict tự phát ở DB. Chưa bao phủ mọi validation error |
| 3. Conflict | Seed một mutation JSON cũ vào DB **QA**, một API session độc lập cập nhật version server. Replay nhận 409, vào conflict; UI giữ server bỏ local, server giữ V3. Lần hai sửa payload thành expectedVersion 4 + title QA_LOCAL_MERGED qua editor Android; PATCH 200, server có title mới | Một Android + một API session mô phỏng thiết bị thứ hai; chưa hai emulator/điện thoại cùng edit bằng UI. Seed queue không thay thế thao tác offline edit từ form |
| 4. Hai tài khoản/offline | A sign-out khi mất mạng; login B khi có mạng; B force-stop/restart offline vẫn đúng tên B, số dư 1.000.000 ₫, 0 giao dịch. Follow-up: A có mutation 7.654 ₫ chưa gửi→logout offline→B restart offline→quay lại A đồng bộ đúng một bản ghi; B vẫn 0 và queue A rỗng. Xem `OFFLINE_ACCOUNT_QUEUE_ACCEPTANCE.md` | Token hết hạn thực sự chưa chạy; chưa pending media/ảnh A–B hoặc đổi owner khi request đang chạy |
| 5. Queue legacy/WAL | Sao lưu DB QA trước seed; JSON owned row được app đọc/migrate thành `enc-v1:`, mutation giữ lại khi reverse bị ngắt; SQLite mode `wal`; reconnect đưa stale mutation vào conflict thay vì làm mất | Chưa đầy đủ schema cổ không có user_id/entity_key; chưa lỗi disk-full/native storage recovery. Không fill ổ emulator hoặc phá queue tài khoản thật |
| 6. >100 giao dịch | Tạo 105 khoản QA PAGE, tổng 15.960 ₫. API pages offset 0/100. Android tìm thấy QA PAGE 089 (nằm page 2 API), 189 ₫; tìm 000/104 đúng 100/204 ₫. Dashboard trước fixture duplicate: 902.929 ₫, chi tháng 17.194 ₫, khớp 1.000.000−80.000+123−1.234−15.960 | Chưa mọi tổ hợp filter/wallet/insights và selected bulk >100; không nâng cả ma trận lên verified |
| 7. Chốt tháng cloud | Fixture Sept expense 100.000 split 60/40, refund 20.000, budget transfer 100.000. Android bật checklist+rollover và xác nhận đóng. API Sept expense 80.000, Oct limits 852.000/668.000, carry 352.000/368.000. PATCH vào giao dịch tháng đóng bị business conflict; close Aug rollover vào Sept đóng cũng bị conflict | Hai nhánh từ chối được gọi qua API, chưa cả hai qua UI; không đóng kỳ thật của user |
| 8. Review Inbox | Phát hiện chậm/CPU cao với >100 dòng; sửa selector. APK QA mới hiển thị Cần phân loại và hai QA DUPLICATE 555 ₫ với Nghi trùng. Follow-up: receipt QA reviewRequired→mở/sửa/xác nhận→Back tự cập nhật Inbox và API mất mạng/retry đạt, xem `REVIEW_RECEIPT_INBOX_TDD.md` | Chưa trọn ma trận edit→resolve→các màn cập nhật, owner switch/font/TalkBack section mới; danh sách review hóa đơn cần mạng |

### Chi tiết đối soát thật

- Request ID: `645138be-383d-47ca-8163-33fbd95e2537`.
- Reconciliation ID: `5ed3e539-5ab9-409b-9961-6752e9ce4f6e`.
- Adjustment ID: `637254a7-ba7b-43eb-98fb-0fd3d3025415`, amount 123.
- `reconciliation-events.json` lưu cả `replayed=false,responseDropped=true` và retry `replayed=true`. Đã đối chiếu bằng session user A qua RLS; service role không có SELECT bảng này nên không tự cấp thêm quyền.
- Request đầu tiên ngày 18/10 bị 400 (trước ghi). Chuyển fixture ngày 17/10 thì đạt. Máy Việt Nam đã ngày 18 nhưng server UTC còn ngày 17; lệch kiểm tra ngày cần tái hiện/định nghĩa timezone trước khi sửa BE. Không đổi clock hay policy production để qua test.

## Sửa Review Inbox theo TDD

Trước: mỗi dòng duyệt toàn bộ lịch sử, normalize locale tên lặp lại: O(n²). Khi test, UI thường kẹt ở loading và thao tác chậm, CPU app khoảng 121% ở một lần đo.

Sau: normalize một lần mỗi dòng, nhóm theo ví/kind/amount/title, sort timestamp trong nhóm và so hàng xóm dưới 24h. Giữ input order, ưu tiên chưa phân loại; không đổi nghiệp vụ/backend. O(n log n) ở trường hợp xấu nhất. Không kết luận đây là nguyên nhân duy nhất của mọi loading race.

- RED `npm run test:transactions --prefix apps/mobile`: test mới thiếu module selector, fail import có chủ đích.
- GREEN target 26/26. Test bao phủ ưu tiên, không sai wallet/kind/amount, biên đúng 24h, thứ tự, không sửa input, 1000 records chỉ normalize 1000 lần.
- `npm run test:mobile`: 128/128, không skip/fail.
- `npm run typecheck --prefix apps/mobile`: PASS.
- `npm run lint --prefix apps/mobile`: 0 lỗi, 24 cảnh báo cũ (hai warning test mới đã sửa).
- Coverage selector: 100% line/function, 93.75% branch, lệnh `node --experimental-test-coverage --import ./apps/mobile/node_modules/tsx/dist/loader.mjs --test apps/mobile/src/features/transactions/review-inbox.test.ts` tại root.
- APK QA build PASS 1m03s; native Review Inbox hiển thị được danh sách/duplicate, sau tải CPU app khoảng 2% ở lần đo. Đây là smoke observation, không phải benchmark thống kê.
- Đã đọc lại source và scan mẫu console.log/secret trong file sửa: không có kết quả. Không phải security audit. Không commit checkpoint do dirty worktree lớn có sẵn/chưa có yêu cầu commit đợt này; bằng chứng RED/GREEN ghi tại đây.

## Bằng chứng

`.artifacts/roadmap-qa/`: `reconciliation-events.json`, `reconcile-replayed.xml`, `bulk-events.json`, `bulk-partial-result.xml`, `bulk-retry-result.xml`, `conflict-server-v3-ready.xml`, `conflict-keep-server.xml`, `conflict-edited-exact.xml`, `planning-closed-result.xml`, `account-b-offline-home.xml`, `account-b-offline-transactions.xml`, `page2-item-089.xml`, `page-dashboard-ready.xml`, `review-optimized-ready.xml`, `review-duplicate-final.xml`, `review-fixed.png`, `mobile-regression.log`, `mobile-lint.log`. Queue snapshots chỉ chứa dữ liệu tài khoản QA.

## Bước còn phải làm

1. Token thật hết hạn + queue/media pending A–B; không chỉ đổi tài khoản sạch.
2. Schema queue cổ + disk-full trên môi trường cô lập có thể kiểm soát, rollback và WAL crash recovery.
3. Hai Android UI cùng sửa (hiện chỉ Android + API session), full merge UX thay vì bắt người dùng sửa JSON.
4. Review Inbox đã nhận receipt reviewRequired và resolve trên Inbox (follow-up); còn ma trận các màn khác và regression dữ liệu lớn.
5. Toàn bộ filter/insights >100 và các nhánh Planning từ chối qua UI.
6. Rebuild ARM64 trước demo điện thoại; APK QA tuyệt đối không phát hành.

Chưa commit/push/deploy API hay đẩy migration trong increment này. Chưa đánh dấu hoàn tất cả 8 luồng từ các ca đạt một phần.

## Kết thúc increment

- Đã purge dữ liệu và xóa hai Auth user QA A/B sau kiểm thử; fixture test không còn trên cloud. Chỉ xóa dữ liệu tạm tạo trong đợt này, có thể tạo lại bằng harness; không thể undo các bản ghi đó bằng app sau purge.
- Đã dừng proxy loopback, bỏ adb reverse và force-stop app QA. Package QA/source harness còn trên máy cho lần kiểm thử sau, nhưng session QA đã bị xóa phía server. Không dùng APK QA để demo.
- Bản production đầu sau test cài thành công nhưng cold start phát hiện crash realtime: `cannot add postgres_changes callbacks ... after subscribe()`. Không coi bản này đạt chỉ từ install.
- Đã sửa tên channel riêng từng lần subscribe (Supabase cache topic, remove bất đồng bộ), callback/timer không chạy sau cleanup. RED test mới thiếu hàm tên channel; GREEN sync 25/25 với fake channel cache chứng minh remount không lấy channel đã subscribe. Test này không thay thế toàn bộ Supabase SDK integration.
- Bộ mobile cuối 129/129, typecheck PASS, lint 0 lỗi/24 cảnh báo. Coverage `finance-realtime-policy.ts`: 95.65% line, 94.12% branch, 100% function. Source adapter callback cleanup được review, chưa có mock integration test riêng.
- APK cuối x86_64 build PASS 56s, xác nhận bundle có URL production và không có `http://localhost:18080`, apksigner verify PASS, cài cập nhật thành công; mở app giữ process và phiên đăng nhập, tiếp tục smoke cold start.
- APK `.artifacts/ui-redesign/picket-completion-emulator.apk`; SHA256 `53F3767F2CC5BD6481079A5D646569923039C215A8FA93AE449CEC6888BDE6E9`.
- Đã trở về app chính; bằng chứng kết thúc `final-production.xml`. ARM64 chưa build lại increment này.
