# Picket mobile — đặc tả tích hợp AI và dự báo dòng tiền

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày nghiên cứu: **22/10/2026**. Đề xuất, chưa gọi model/benchmark, chưa tạo service hoặc schema. Đọc [kế hoạch tổng](MOBILE_SETTINGS_LEARNING_AI_PLAN_20261022.md), [market research](MOBILE_MARKET_RESEARCH_20261022.md), [learning spec](MOBILE_LEARNING_DIFFERENTIATION_SPEC_20261022.md).

## 1. Quyết định kiến trúc đề xuất

**Không xây chatbot toàn quyền quản lý tiền.** Làm engine facts/forecast có công thức trước, sau đó AI giải thích, tìm bài đã duyệt và phản hồi tình huống. Mobile Expo giữ guest/offline; Dart giữ auth, owner scope, quota, provider adapter và kiểm định output. Không đặt API key trong APK/Expo public env. Không thay backend bằng Python chỉ để gọi LLM.

Đợt đầu benchmark bốn hosted candidates, chọn **một** nếu đạt; không gửi dữ liệu người dùng qua nhiều provider trong runtime để “so câu trả lời”. Khi provider lỗi, fallback template; không tự chuyển provider với retention khác mà chưa thông báo/consent thích hợp. Không cần framework agent nhiều tầng, vector database hay GPU cho MVP.

### Phân công theo nhiệm vụ

| Nhiệm vụ | Bản đầu | AI có được quyết định không? |
| --- | --- | --- |
| Thu/chi, số dư, chuyển ví, refund, nghĩa vụ | Domain code + facts đã kiểm tra | Không tính lại bằng lời hoặc tự sửa ledger |
| Dự báo 7/30 ngày, scenario | Engine F0/F1 + giả định | Không bịa số dư tương lai |
| Chọn bài tiếp theo | Rule theo competency/goal/consent | Có thể diễn giải lý do; ID phải thuộc catalogue đã duyệt |
| Giải thích insight, Money Story | Template trước, LLM tùy chọn | Chỉ từ facts/nguồn cung cấp; không sinh thêm lịch sử |
| Chấm tình huống mở | Rubric cố định, LLM hỗ trợ sau eval | Phải có trích đoạn lập luận và lý do; cho phản hồi/đánh giá lại |
| Nhập bằng ngôn ngữ tự nhiên | Đợt sau, draft cần xác nhận | Không POST giao dịch thay người dùng |
| OCR ảnh hóa đơn | Giữ pipeline ML Kit/PP-OCR hiện tại | Không thay bằng vision API trả phí mặc định |

## 2. So sánh provider, model và giới hạn

Giá dưới đây là USD/triệu token standard, không tính thuế, cache, batch, region, tool, retry hoặc chi phí vận hành; phải kiểm lại khi triển khai. **Không có kết quả thực nghiệm để xếp hạng tiếng Việt.** Năng lực schema không bảo đảm câu trả lời đúng.

| Ứng viên | Giá input / output | Lý do đưa vào benchmark | Điều kiện chưa thể bỏ qua |
| --- | ---: | --- | --- |
| [OpenAI GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) | 0,10 / 0,50 | Structured outputs/function calling, chi phí phù hợp tác vụ ngắn | Kiểm quyền truy cập, latency và chất lượng thực. [API data policy](https://developers.openai.com/api/docs/guides/your-data): mặc định không training; abuse monitoring có thể giữ tới 30 ngày với ngoại lệ; ZDR cần điều kiện/approval. `store:false` không đồng nghĩa ZDR. |
| [Claude Haiku 5.5](https://platform.claude.com/docs/en/about-claude/pricing) | 0,10 / 0,50 với prompt ≤100k | Đối chứng cùng dải chi phí; có [schema constrained output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | Giá prompt dài khác. [Retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) có ngoại lệ và ZDR riêng; không lấy điều khoản consumer làm hợp đồng API. |
| [Gemini 3.5 Flash-Lite paid](https://ai.google.dev/gemini-api/docs/pricing) | 0,30 / 2,50, gồm thinking output | Đối chứng Google với REST/structured output | [Terms](https://ai.google.dev/gemini-api/terms) không cho API clients hướng tới **hoặc có khả năng được người dưới 18 tuổi truy cập**. Chọn khách hàng 18+ trên giấy chưa tự đủ; cần kiểm audience thực và điều khoản. Paid không dùng cải thiện sản phẩm ≠ không lưu dữ liệu. |
| [Mistral Small 4 `mistral-small-2603`](https://docs.mistral.ai/models/mistral-small-4-0-26-03) | 0,15 / 0,60 | Model có fixed ID, schema/tool support; challenger khác hệ sinh thái | Kiểm [training preference](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training), commercial DPA và [ZDR approval](https://docs.mistral.ai/admin/monitor-comply/zero-data-retention). Không giả định mọi paid account đều tự opt-out. |

**Cập nhật so với master plan cũ:** không dùng Gemini 3.1 Flash-Lite làm mặc định cho dự án mới; [deprecation guidance](https://ai.google.dev/gemini-api/docs/deprecations) cần được rà tại thời điểm chọn model. Các ứng viên rẻ khác đã xuất hiện, nên “OpenAI chính/Gemini đối chứng” chỉ còn là shortlist ban đầu, chưa là ADR chốt.

Self-host challenger: [Qwen3-8B first-party card](https://huggingface.co/Qwen/Qwen3-8B) có Apache 2.0 và ví dụ phục vụ qua endpoint tương thích OpenAI; [vLLM structured outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/) cung cấp grammar/schema ở serving layer. Ưu điểm kiểm soát hạ tầng; đổi lại phải quản lý chất lượng, tải, patch, quantization và GPU/CPU. Không coi 8B tự động rẻ hơn hosted khi pilot ít request. Cloud GPU tự thuê vẫn là xử lý bên hạ tầng thứ ba. Chưa có cấu hình RAM/latency Picket đã đo.

Backend Dart dùng HTTP adapter nhỏ, DTO riêng của mỗi provider sau interface chung; không giả định tất cả hỗ trợ cùng request JSON vì cùng trả schema. [Google libraries](https://ai.google.dev/gemini-api/docs/libraries) lưu ý package Dart cũ không còn là lựa chọn được duy trì tích cực; không thêm SDK mobile cũ để giải quyết backend. Pin fixed model/version nếu có, lưu model thực trả về, regression trước đổi alias/version.

## 3. Facts pipeline và contract đầu ra

```text
Expo: yêu cầu rõ mục đích + phạm vi + consent
  → Dart: auth/owner/entitlement/consent/quota
  → tạo snapshot facts có version và quality
  → rule/template hoặc provider adapter
  → schema + semantic + evidence validator
  → kiểm consent/owner/snapshot lại trước lưu/trả
  → Expo: giải thích + nguồn + giới hạn + thao tác do user chọn
```

Facts phải có `factId`, loại, giá trị chuẩn, currency/unit, kỳ, phạm vi ví, provenance reference, `dataAsOf`, quality flags, snapshot version. Client không được tự gửi tổng số rồi yêu cầu backend tin là facts đã xác minh; server đọc dữ liệu thuộc owner. Guest local dùng engine trên máy; không tự upload dữ liệu guest sang AI cloud.

Provider chỉ nhận aggregate cần thiết; không email, tên đầy đủ, đường dẫn storage, raw receipt image/text, note merchant, bank ID hoặc toàn bộ ledger mặc định. Nếu cần câu hỏi tự luận, cảnh báo không nhập secret/thông tin người khác; giới hạn độ dài, không log raw trong monitoring. Mọi user text/receipt content là dữ liệu không tin cậy, không chỉ dẫn cho tool.

Output đề xuất v1 (ví dụ thiết kế, không phải response API đã tồn tại):

```json
{
  "kind": "forecast_explanation",
  "summaryTemplate": "Điểm thấp nhất trong kịch bản là {{fact:min_balance}}.",
  "factRefs": ["min_balance", "rent_due"],
  "assumptionIds": ["daily_variable_spend"],
  "limitations": ["unrecorded_cash_spending"],
  "suggestions": [{"actionId": "review_schedule", "reasonFactRefs": ["rent_due"]}],
  "lessonIds": ["EDU07"]
}
```

Backend gắn `outputId`, `snapshotId`, `dataAsOf`, model/prompt/content/consent versions. Với số tiền/ngày, ưu tiên placeholder/fact reference và renderer nội bộ thay vì model tự viết literal. Validator: mọi ref tồn tại/đúng owner/scope; lesson/action thuộc whitelist; không có numeric claim ngoài facts; câu mô tả không đảo chiều/chắc chắn hóa giả định. Schema hợp lệ nhưng diễn giải sai vẫn fail. Phần free text cần eval và guardrails; placeholder không giải quyết hết ngữ nghĩa.

Không stream phần tài chính chưa validate lên UI. Khi fail/timeout/refusal: template cùng facts và nút thử lại; không hiển thị nửa câu hoặc đổi engine kết quả theo model.

Retrieval bản đầu: tag/rule từ 12 bài đã duyệt, không web search trực tiếp. Khi nội dung lớn mới đánh giá lexical/vector retrieval với corpus/version/allowlist; AI không viện dẫn URL bịa. Không cần embedding mọi giao dịch.

## 4. API và dữ liệu đề xuất

URL dưới đây minh họa resource mới; khi triển khai **theo prefix/envelope/error/idempotency hiện có của Dart**, không tạo API v2 chỉ để đổi style. Owner lấy từ session, không lấy `userId` tùy ý trong body.

| Resource | Hành vi đề xuất | Gate |
| --- | --- | --- |
| `GET /learning-content` | Manifest bài đã xuất bản theo locale/version, ETag | Public nội dung hoặc auth theo policy; không lộ draft |
| `POST /learning-events` | Append events đã validate; idempotency key | Owner isolation; trả ack để merge, không tin XP client |
| `GET /learning-progress` | Snapshot và sync cursor | Không nhận owner khác; paginate nếu cần |
| `POST /forecast-snapshots` | Tính snapshot phạm vi/giả định được xác nhận | `201` + Location; multi-currency chưa hỗ trợ báo rõ |
| `POST /ai-jobs` | Tạo job giải thích/assessment gắn snapshot | `202` + Location; reserve quota atomic |
| `GET /ai-jobs/{id}` | Pending/running/completed/failed/cancelled/expired | Owner check mọi lần; `404` nếu không được nhìn thấy |
| `DELETE /ai-jobs/{id}` | Yêu cầu hủy/xóa theo semantics retention | Idempotent; request đã chạy bên provider có giới hạn hủy |
| `PATCH /ai-consents` | Version và từng purpose, đồng ý/thu hồi | Re-auth nếu chính sách yêu cầu; audit không raw finance |
| `POST /ai-output-reports` | Báo sai/harmful + output reference | Không tự đính toàn bộ chat/ledger vào report |

`401` hết auth, `409` snapshot stale/idempotency payload mismatch, `422` thiếu dữ liệu/ngữ nghĩa sai, `429` hạn mức với Retry-After khi có ý nghĩa, `503` provider unavailable. Mã lỗi ổn định cho vi/en; không trả stack/provider secret. New fields additive, contract fixtures TS/Dart, client cũ không buộc hiểu learning.

Các nhóm bảng mới đề xuất: published content metadata, learning events/progress, scheduled cashflows/settlements, forecast snapshots, AI consents/jobs/usage ledger/output reports. Migration phải có RLS/constraint/index/retention và rollback policy; không viết SQL owner cleanup thành migration mở quyền rộng.

### Job lifecycle và quota

`queued → running → completed | failed | cancelled | expired`; state transition atomic. Unique theo owner + idempotency key + payload hash. Reservation trừ phần khả dụng trước gọi; commit khi đạt điều kiện tính phí đã công bố, release khi hủy/chưa gọi hoặc lỗi hợp lệ. Provider timeout không chứng minh chưa tính token: usage nội bộ và hóa đơn provider cần reconciliation, không release vô hạn khiến vượt cost cap.

Hai request cùng lúc không vượt cap; crash sau provider response có thể khiến trả lại kết quả từ job, không gọi lại tự động. Retry giới hạn, backoff/jitter, deadline toàn job; không retry lỗi auth/validation. Cache key gồm owner, snapshot, purpose, locale, prompt/model/content version và consent version; không dùng cache chung chứa dữ liệu cá nhân.

Thu hồi consent: chặn job mới, đánh dấu job pending/running không được giao output, xóa cache/output theo policy, yêu cầu xóa provider nơi API/contract hỗ trợ. Không hứa thu hồi request đã gửi được ngay khỏi mọi abuse log của provider. Kiểm consent lại **sau** inference để tránh race. Logout/owner switch không hiển thị job trước đó; replay offline không tự gửi câu hỏi cũ sau khi login.

Retention đề xuất để chủ dự án duyệt: facts tính lại khi được, snapshot tối thiểu phục vụ giải thích/backtest theo consent riêng; raw prompt/response không log mặc định, chat history opt-in và có xóa. Chốt thời hạn cụ thể, backup retention và processor contract trước production; “chưa chốt” là gate chứ không coi đã xong.

## 5. Forecast engine — dữ liệu trước mô hình

F0 = lịch thu/chi đã biết + giả định do user xem; F1 = F0 + ước lượng chi biến đổi từ lịch sử đủ chất lượng; F2 = challenger thống kê/ML chỉ khi chứng minh lợi ích. Không đủ dữ liệu thì F0/scenario hoặc abstain; không ép model dự đoán.

Đầu vào chuẩn: opening balance + date/time, selected wallet IDs, currency, timezone, recurring income/obligations, settlement links, excluded one-offs, completeness signals và pending local riêng. Ngày không có ghi chép **không mặc định chi 0**. Tách expected amount và actual payment; split không là tiền ra lần hai; receipt gắn transaction không là record tiền thứ hai.

Vấn đề source phải xử lý trước: `Bill` thiếu nguồn ví/currency; chưa có lịch income recurring tương đương; transaction chưa có enum chất lượng posted/confirmed đầy đủ. Thêm adapter/provenance và field tương thích, không viết engine dựa vào field tưởng đã có.

`B(d) = B0 + thu còn dự kiến trong phạm vi đến d − nghĩa vụ chưa thanh toán đến d − chi biến đổi chưa nằm trong nghĩa vụ đến d`.

Không cộng VND/USD nếu chưa có FX policy; transfer nội bộ triệt tiêu trong tổng phạm vi, một phía ngoài phạm vi vẫn là dòng vào/ra. Mục tiêu dự phòng “earmark” không trừ ledger lần hai; trình bày khả dụng sau earmark riêng. Future refund chưa chắc chắn không coi là lương.

Bảng ví dụ đầy đủ ở bài B của [learning spec](MOBILE_LEARNING_DIFFERENTIATION_SPEC_20261022.md): khi mua 800.000đ ngày 24/10, số dư scenario thấp nhất -100.000đ ngày 27 dù cuối kỳ dương. Engine phải khớp từng ngày; LLM không được biến kết quả đó thành “bạn chắc chắn hết tiền” vì dữ liệu/giờ thanh toán vẫn có thể thiếu.

### Baseline và challenger thị trường

| Engine | Cách sử dụng cho Picket | Quyết định |
| --- | --- | --- |
| Scheduled-only | Dòng tiền lịch đã xác nhận; phần chưa biết hiện rõ | F0 bắt buộc, dùng được offline |
| Trailing mean/median, seasonal-naive | Ước lượng phần biến đổi sau loại recurring/one-offs; chọn window bằng backtest | F1 thử trước, không cần GPU |
| [Chronos-2](https://github.com/amazon-science/chronos-forecasting), [model card](https://huggingface.co/amazon/chronos-2) | Quantile/covariate, Apache 2.0; Python serving nội bộ nếu thật sự thắng | Challenger sau, không thay Dart chính |
| [TimesFM 2.5 checkpoint](https://huggingface.co/google/timesfm-2.5-200m-pytorch) | Apache 2.0, pin version/license | Challenger thứ hai khi đủ dữ liệu |
| [TimesFM 3.0 / repo hiện hành](https://github.com/google-research/timesfm) | Weights tải về có hạn chế non-commercial/non-production; production thương mại qua dịch vụ được phép là chuyện riêng | **Không self-host weights 3.0 làm production Picket** chỉ vì bản cũ Apache |

Không dùng thành tích benchmark công khai để quảng cáo độ chính xác cho tài chính cá nhân thưa dữ liệu. Ngưỡng 28/84 ngày trong master plan là heuristic để thử, không bảo đảm đủ lịch sử. Tết, mùa học phí, thu nhập thất thường và thiếu tiền mặt cần cohort/test riêng; không gắn “confidence 80%” lên dải kịch bản chưa calibration.

### Thiết kế đánh giá forecast

- Split theo người và thời gian; freeze features được biết tại origin. Không dùng sửa lịch lương/bill sau ngày dự báo làm dữ liệu đầu vào cũ.
- Rolling origins theo tuần, horizons 7/30 ngày; tập baseline/challenger giống nhau, selection trên validation, final holdout không tuning.
- Dữ liệu synthetic kiểm công thức/edge cases trước; dữ liệu thực chỉ với quyền sử dụng rõ và snapshot as-of. Chưa có real panel thì chưa nghiệm thu chất lượng dự báo thực tế.
- Đo MAE số dư VND theo horizon, lỗi ngày thấp nhất, missed/false low-balance alert; quantile loss/coverage/width nếu có quantile. Tránh MAPE với chuỗi nhiều zero. Báo median và worst cohorts, không chỉ pooled mean.
- Gate challenger đề xuất: cải thiện ≥10% median MAE so baseline và không làm tăng lỗi cảnh báo nghiêm trọng ở cohort dễ tổn thương; ngưỡng là lựa chọn nội bộ phải xem lại theo dữ liệu, không chuẩn khoa học. Nếu không đủ sample/khác biệt không ổn định, giữ baseline.

## 6. Bộ benchmark AI thực tế phải chạy trước chọn provider

Hai tầng để tránh tốn tiền cho khả năng chưa cần:

**Launch suite 240 case**: 60 giải thích facts, 40 dự báo/giả định, 40 đánh giá tình huống theo rubric, 40 safety/privacy/injection, 30 thiếu dữ liệu/refusal/locale, 30 điều hướng/retrieval bài. Đây là số lượng dự kiến, dataset chưa được tạo. Hai reviewer chấm độc lập, xử lý bất đồng; không cho model tự chấm mình làm bằng chứng duy nhất.

**Mở rộng nhập ngôn ngữ tự nhiên: thêm 400 case**, chỉ khi triển khai draft entry: “25k”, “1tr2”, dấu chấm/phẩy, không dấu, nhiều giao dịch, phủ định, ngày tương đối/timezone, chuyển ví/refund, thiếu ví/số tiền, note độc hại. Mong đợi clarification thay vì đoán khi thiếu. Tính amount/date exact match và category macro-F1; không bắt runtime thêm tính năng này chỉ để dùng benchmark.

Tách 60% development / 20% validation / 20% blind holdout theo **scenario family**, không chia paraphrase cùng ví dụ qua hai tập. Mỗi case có nguồn synthetic/consented, expected facts, forbidden claims, rubric, version, severity. Benchmark cùng prompt mục tiêu, budget/context hợp lý cho từng provider; lưu token/thinking/retry thực.

| Gate | Yêu cầu để pilot |
| --- | --- |
| Tính tiền | Engine fixtures đúng 100%; mọi numeric claim hiển thị khớp facts; lỗi critical chặn release |
| Quyền riêng tư | Không lộ owner/secret hoặc làm theo injection trong tập đối kháng; bất kỳ lỗi critical phải sửa và chạy lại |
| Grounding | Không dẫn fact/lesson/nguồn không tồn tại; phát hiện thiếu dữ liệu thay vì khẳng định |
| Assessment | Báo agreement người–AI và lỗi theo mức; không gọi grading đáng tin nếu reviewer còn bất đồng lớn |
| Availability | Schema/refusal/truncation/lỗi có fallback, không treo luồng ghi chép |
| UX/latency | Mục tiêu p95 ≤8 giây cho tác vụ ngắn, timeout UX 12 giây để trả template; điều chỉnh theo thiết bị/mạng thử thật |

Zero lỗi trong test **không chứng minh rủi ro bằng 0 ngoài đời**. Scorecard sau hard gates: grounding/semantic 40%, tiếng Việt/rubric 20%, latency/reliability 15%, cost/request thành công 15%, integration/ops 10%; privacy/terms là gate không được “bù điểm” bằng rẻ. Nếu không ứng viên nào đạt, phát hành template/no-AI thay vì hạ gate.

## 7. Chi phí và kiểm soát

Workload minh họa giữ nguyên để so: 1.000 người × 20 request/tháng × 3.000 input + 600 output = 60M input + 12M output. Theo giá bảng: **Luna 12 USD; Haiku 12 USD; Gemini 48 USD; Mistral 16,20 USD**. Đây là phép tính token giả định, không đo usage thật; model tokenization/thinking khác nhau, chưa gồm retry, taxes, observability, backend, nhân sự và hạ tầng. Không dùng giá subscription Google AI Pro/ChatGPT làm credit API.

Pilot đề xuất 30 người × 10 request/tuần × 4 tuần = 1.200 request: lần lượt 0,72 / 0,72 / 2,88 / 0,972 USD theo cùng giả định. Khi benchmark 4 provider và retry phải cộng riêng; cảnh báo nhỏ không có nghĩa tổng dự án rẻ vì công content/eval/ops còn lớn.

Đề xuất hard cap backend **20 USD/tháng cho pilot**, cần chủ dự án duyệt và lập account hợp lệ; không bật thanh toán trong lượt nghiên cứu. Quota: per-user/day, token input/output trần theo purpose, max concurrent jobs, monthly global reserve và kill switch. Cap phải kiểm trước request atomic, không chỉ alert trên dashboard. Dự trù overhead/giá tối đa cho reservation; gần cap trả template. Không hứa tuyệt đối không vượt một xu nếu provider report usage trễ/khác dự kiến; chặn sớm có buffer và reconciliation.

Chưa fine-tune, chưa agent có công cụ chuyển tiền, chưa web search có phí, chưa model vision mới. Context ngắn theo task; không gửi lại toàn history mỗi lượt. Cache factual templates/lesson metadata, không lấy câu trả lời user khác để tiết kiệm tiền.

## 8. Backlog kỹ thuật và nghiệm thu

| Ticket bổ sung | Kết quả phải có | Điều kiện trước |
| --- | --- | --- |
| AI-R01 | ADR provider shortlist, commercial data/region/age check | Nguồn hiện hành và account access; chưa production key |
| AI-R02 | Dataset 240 case + rubric/holdout, runner report token/cost | Người duyệt nội dung và ngân sách eval |
| FIN-R01 | Provenance/quality adapter, schedule income/bill currency/wallet | Contract/schema inventory |
| FIN-R02 | F0/F1 local/Dart parity và bảng bài B | Shared golden fixtures; không đổi financial semantics cũ |
| AI-R03 | Dart provider adapter, schema/semantic validator/template | Eval shortlist; secret server-side |
| AI-R04 | Jobs/quota/idempotency/reconciliation/RLS | Staging tách production |
| AI-R05 | Consent/revoke/delete/owner-switch integration | Processor retention chính thức, test race |
| AI-R06 | Mobile explanation sheet/report/accessibility/vi-en | Theme/i18n foundation và facts engine |
| AI-R07 | ARM64 regression, load/fault tests, opt-in rollout | Gate eval, quota, privacy đều đạt |

Bắt buộc test: hai request tranh quota; timeout trước/sau provider tính phí; process crash sau response; revoke khi running; app offline rồi owner đổi; JWT hết hạn; stale snapshot sau xóa giao dịch; RLS chặn user khác; content/model version đổi; bill đã trả nhưng schedule còn; clock lệch; output schema đúng nhưng sai nghĩa; injection trong note. Kiểm thử không tạo thật chuyển tiền hay gọi API trả phí vô hạn.

## 9. Release, kill switch và điều chưa giải quyết

Tách flags learning/contextual-cards/scenario/AI/assessment. Có thể tắt AI mà learning/ledger vẫn chạy; lỗi forecast tắt forecast, không ẩn số dư thật. Mở internal staging → opt-in nhỏ → review incident/cost/learning → mở rộng. Không tự đưa gói AI vào paywall trước nghiệm thu Play Billing; giữ các ca thiết bị thật còn thiếu ở trạng thái đúng.

Chưa chốt: audience/age enforcement, người duyệt giáo dục, quyền model/account, processor retention/region, staging, dữ liệu forecast có consent, chất lượng tiếng Việt, target latency thật và ngân sách. Đây là prerequisite để tích hợp runtime, **không phải lý do bịa kết quả benchmark**. Phần được hoàn thành ở đợt này là nghiên cứu và đặc tả tích hợp; code, paid evaluation và production chưa được thực hiện.
