import json, re
from pathlib import Path
from study_support import apply_study_support, editorial_metadata, markdown_example, write_app_copy
import curriculum_v2_extension as ext

ROOT=Path(__file__).parent
DATE='2026-10-23'
SOURCES={
'oecd': 'https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf',
'spending':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf',
'bills':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_bill_calendar_tool_2018-11_ADA.pdf',
'cashflow':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf',
'income':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_income_benefits_tool_2018-11_ADA.pdf',
'saving':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf',
'goals':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf',
'priority':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_prioritizing-bills_tool.pdf',
'loans':'https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf',
'adjust':'https://files.consumerfinance.gov/f/documents/cfbp_your-money-your-goals_adjust_cash_flow_tool_2018-11_ADA.pdf',
'emergency':'https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/',
'cost':'https://www.consumerfinance.gov/ask-cfpb/what-is-a-truth-in-lending-disclosure-for-an-auto-loan-en-787/',
'otp':'https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304',
'trial':'https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions',
}
SOURCES['payment-safety']='https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news'
lessons=[]
def Q(prompt, choices, correct, explanations):
    return {'prompt':prompt,'choices':[{'text':c,'explanation':e} for c,e in zip(choices,explanations)],'correctIndex':correct}
def add(n,chapter,title,competency,objective,body,example,checks,questions,action,sources):
    lessons.append({'lessonId':f'picket.vi.financial.v1.{n:02}','chapterId':f'chapter-{chapter:02}','version':1,'locale':'vi-VN','title':title,'competencyId':competency,'objective':objective,'body':body.strip(),'workedExample':{'currency':'VND','description':example,'arithmeticChecks':[{'expression':e,'expected':v} for e,v in checks]},'questions':questions,'optionalAction':{'text':action,'requiresSpending':False,'maySkip':True,'evidence':'self-reported-or-local-review'},'sources':[SOURCES[s] for s in sources],'reviewedAt':DATE,'reviewType':'author-source-and-arithmetic-check','independentReviewedAt':None,'status':'authored-not-independent-review'})

add(1,1,'Chuyển ví không phải chi thêm','cashflow.internal-transfer','Phân biệt chuyển tiền giữa ví của mình với thu nhập và chi tiêu; nêu rõ phạm vi đang xem.', '''
Một số dư có thể nằm ở nhiều nơi: tiền mặt, tài khoản ngân hàng hoặc ví điện tử. Chuyển tiền giữa những nơi bạn sở hữu làm thay đổi chỗ giữ tiền. Để biết mình đã tiêu bao nhiêu, hãy hỏi tiền có rời khỏi toàn bộ phạm vi đang theo dõi để thanh toán một khoản hay chưa. Tên nút chuyển khoản trong ứng dụng ngân hàng chưa đủ cho câu trả lời: chuyển cho cửa hàng là thanh toán, còn chuyển sang tài khoản khác của chính mình có thể là chuyển ví.

Ví dụ minh họa: Hòa có 600.000đ tiền mặt và 1.400.000đ trong ngân hàng. Hòa rút 200.000đ, không mất phí. Sau đó tiền mặt là 800.000đ, ngân hàng còn 1.200.000đ. Tổng trước và sau đều là 2.000.000đ. Nếu ghi lần rút này thành khoản chi rồi lại ghi các lần mua bằng tiền mặt, Hòa sẽ đếm chi tiêu hai lần. Nếu ngân hàng thu thêm 3.000đ phí rút tiền, chỉ 3.000đ phí là khoản chi trong ví dụ; 200.000đ vẫn chỉ đổi nơi giữ.

Phạm vi giúp giải thích điều tưởng như mâu thuẫn. Khi chỉ xem ngân hàng, đúng là có 200.000đ đi ra khỏi ví đó. Khi xem cả hai ví, số tiền này có một phía đi ra và một phía đi vào nên triệt tiêu nhau. Vì thế một báo cáo dòng tiền theo ví có thể khác báo cáo chi tiêu toàn bộ. Không cần chọn một báo cáo là sai; cần đọc nhãn và biết những ví nào đang được cộng. Ví ngoài phạm vi cũng cần được ghi chú rõ thay vì tự coi mọi khoản ra là mua sắm.

Trong Picket, hãy rà ví nguồn, ví đích, số tiền và phí trước khi xác nhận. Việc tạo mục tiêu tiết kiệm bằng nhãn cũng không tự làm tiền biến mất. Một giao dịch chuyển thực tế chỉ nên được ghi một lần theo hai phía liên kết. Nếu lỡ nhập thành thu và chi riêng, hãy kiểm tra trước khi sửa để không xóa khoản mua thật cùng ngày. Bạn có thể học hoàn toàn bằng số liệu minh họa; không cần rút hoặc chuyển tiền thật để chứng minh đã hiểu. Điều cần nhớ là cùng một số tiền có thể đổi vị trí mà tổng tiền không tăng hoặc giảm.
''','600.000 + 1.400.000 = 2.000.000; sau chuyển: 800.000 + 1.200.000 = 2.000.000. Phí 3.000 nếu có làm tổng còn 1.997.000.', [('600000+1400000',2000000),('600000+200000',800000),('1400000-200000',1200000),('2000000-3000',1997000)], [
Q('Rút 200.000đ không phí từ ngân hàng sang tiền mặt của mình. Chi tiêu toàn bộ tăng bao nhiêu?', ['200.000đ','0đ','400.000đ'],1,['Đây là số tiền đổi chỗ, chưa phải mua hàng.','Đúng: tổng hai ví không giảm.','Cộng hai phía làm đếm cùng số tiền hai lần.']),
Q('Chỉ xem ví ngân hàng trong ví dụ, 200.000đ có phải tiền ra khỏi phạm vi đó?', ['Không, vì chuyển ví luôn bằng không','Có, nhưng chưa phải chi tiêu toàn bộ','Là thu nhập mới'],1,['Quy tắc tổng bằng không chỉ áp dụng khi có đủ hai phía trong phạm vi.','Đúng: ví ngân hàng giảm, ví tiền mặt tăng.','Ngân hàng giảm nên không có thu nhập mới.']),
Q('Rút 200.000đ và trả thêm phí 3.000đ. Khoản chi do thao tác này là?', ['203.000đ','200.000đ','3.000đ'],2,['203.000đ là tiền ra khỏi ngân hàng, gồm cả phần chuyển sang tiền mặt.','200.000đ vẫn thuộc sở hữu của bạn.','Đúng: phí là phần rời tổng tài sản trong tình huống.'])], 'Xem một giao dịch chuyển ví có sẵn hoặc giải lại ví dụ, không chuyển tiền thật.', ['oecd'])

add(2,1,'Ghi đúng trước khi phân loại','cashflow.confirmed-records','Kiểm tra số tiền và dấu thu/chi, tránh bản ghi trùng và phân biệt dữ liệu thiếu với chi bằng không.', '''
Một danh sách giao dịch hữu ích cần phản ánh những gì thực sự xảy ra. Bắt đầu bằng ngày, số tiền, ví và loại thu hoặc chi. Danh mục giúp tìm lại và so sánh, nhưng một tên danh mục rất đẹp không sửa được số tiền bị nhập sai. Khi quét hóa đơn, hãy coi kết quả là bản nháp cần đối chiếu. Máy có thể đọc nhầm dấu chấm, dòng tổng hoặc tiền khách đưa. Ảnh phong cảnh không phải bằng chứng cho một giao dịch; không nên đoán số tiền từ ảnh đó.

Mai có ba khoản chi đã kiểm tra: ăn trưa 45.000đ, đi xe 25.000đ và mua vở 30.000đ. Tổng là 100.000đ. Mai lưu ảnh hóa đơn bữa trưa vào chính giao dịch đó; tổng vẫn là 100.000đ, không tăng thành 145.000đ. Nếu ứng dụng tải ảnh chậm, trạng thái ảnh đang xử lý khác với trạng thái giao dịch đã lưu. Khi quay lại, cần xem bản ghi nào đã có trước khi nhấn lưu thêm lần nữa. Một ảnh đính kèm và một khoản chi là hai loại thông tin, không phải hai khoản tiền.

Phân loại nên phục vụ câu hỏi của bạn. Vở dùng đi học có thể thuộc học tập; cùng món vở mua tặng người khác có thể thuộc quà tặng. Đừng chỉ dựa vào tên cửa hàng để kết luận mục đích. Có thể để khoản chưa rõ vào nhóm cần xem lại, rồi bổ sung sau khi nhớ được bối cảnh. Khi nhiều người trả chung, chỉ ghi phần của mình hoặc dùng quy tắc chia khoản nhất quán; tránh lúc ghi cả hóa đơn, lúc ghi phần cá nhân mà không ghi chú.

Cuối một khoảng thời gian, hãy so danh sách với số dư hoặc chứng từ bạn còn giữ. Nếu quên ghi hai ngày, hãy đánh dấu thiếu thông tin thay vì nói hai ngày đó chi bằng không. Một khoản chênh chưa giải thích không tự trở thành thu nhập. Có thể dừng ở mức biết rằng dữ liệu chưa đầy đủ, rồi rà thêm khi thuận tiện. Trong Picket, chỉ dùng khoản đã xác nhận cho bài học lấy dữ liệu thật; bạn có thể chọn ví dụ minh họa nếu không muốn sử dụng thông tin cá nhân. Mục tiêu của ghi chép là làm quyết định rõ hơn, không phải tạo một bảng hoàn hảo hay bắt bạn nhớ mọi chi tiết ngay từ đầu.
''','45.000 + 25.000 + 30.000 = 100.000đ; ảnh bữa trưa đính kèm không tạo khoản chi 45.000đ thứ hai.', [('45000+25000+30000',100000),('100000+45000',145000)], [
Q('Mai thêm ảnh vào giao dịch ăn trưa đã lưu. Tổng ba khoản nên là?', ['100.000đ','145.000đ','55.000đ'],0,['Đúng: đính kèm không tạo thêm chi tiêu.','Bạn đã cộng trùng bữa trưa.','Bạn đã bỏ một khoản chi thực tế.']),
Q('Không có bản ghi vào thứ Ba vì quên nhập. Kết luận phù hợp?', ['Chắc chắn không chi','Chưa biết có chi hay không','Dùng mức cao nhất của tháng làm số thật'],1,['Thiếu bản ghi không chứng minh không phát sinh.','Đúng: cần giữ trạng thái chưa đủ dữ liệu.','Ước lượng không được biến thành giao dịch đã xảy ra.']),
Q('OCR đọc tổng 450.000đ nhưng hóa đơn ghi 45.000đ. Làm gì?', ['Giữ số máy đọc vì máy khách quan','Lưu cả hai số thành hai khoản','Đối chiếu và sửa bản nháp trước khi xác nhận'],2,['OCR vẫn có thể nhận sai ký tự.','Một lần mua không tạo ra hai khoản chỉ vì hai cách đọc.','Đúng: số trên bản nháp phải được kiểm tra.'])], 'Rà một giao dịch hoặc ví dụ về ngày, ví, số tiền và khả năng nhập trùng.', ['spending'])

add(3,2,'Nhu cầu và mong muốn cần bối cảnh','planning.contextual-priorities','Giải thích một ưu tiên bằng hoàn cảnh, thời điểm và phương án thay thế, không phán xét từ tên món hàng.', '''
Nhu cầu thường liên quan đến sinh hoạt, sức khỏe, học tập hoặc trách nhiệm bạn phải đáp ứng. Mong muốn thường có phần lựa chọn linh hoạt hơn. Ranh giới này phụ thuộc hoàn cảnh chứ không nằm cố định trong tên món hàng. Internet có thể phục vụ học trực tuyến hoặc chỉ một dịch vụ giải trí bổ sung. Một chuyến xe công nghệ có thể giúp người đang chấn thương đến nơi an toàn. Vì vậy bài học không gán nhãn con người tốt hay xấu từ khoản chi, cũng không yêu cầu cắt mọi niềm vui.

Hãy thử ba câu hỏi: nếu hoãn thì hậu quả gì, cần đáp ứng trước ngày nào, có cách khác phù hợp không? Phương án rẻ hơn chỉ là lựa chọn khi thực tế đáp ứng được nhu cầu. Đi bộ không luôn thay được phương tiện trong đêm mưa hoặc khi đường không an toàn. Mua gói rẻ hơn cũng không hữu ích nếu thiếu chức năng bạn cần cho công việc. Một khoản có thể gồm phần thiết yếu và phần nâng cấp; bạn được quyền giải thích cách tách thay vì phải chọn một nhãn cho toàn bộ.

Trong tình huống giả lập, Phương còn 1.500.000đ trước kỳ thu nhập. Phương dự kiến dành 900.000đ cho tiền ở và 400.000đ cho thực phẩm. Sau hai khoản, còn 200.000đ. Tai nghe mới giá 350.000đ sẽ vượt phần còn lại 150.000đ nếu không có thay đổi khác. Phép tính không nói Phương là người thiếu kỷ luật; nó cho thấy cần hoãn, đổi phương án hoặc xác nhận thêm nguồn tiền. Nếu tai nghe cũ hỏng và công việc cần dùng ngay, bối cảnh thay đổi nhưng phép tính vẫn phải được giải quyết.

Bạn có thể đặt một khoản linh hoạt cho sở thích theo khả năng riêng. Không có một tỷ lệ ngân sách duy nhất phù hợp mọi người. Người đang phải hỗ trợ gia đình hoặc có chi phí sức khỏe cao có thể có ít lựa chọn hơn; gọi đó là yếu kém không giúp tạo tiền. Trong Picket, nhãn ưu tiên chỉ hỗ trợ suy nghĩ, không khóa lưu giao dịch và không tự quyết định thay bạn. Khi chưa rõ hoàn cảnh, câu trả lời tốt là hỏi thêm. Hãy thử ghi một câu lý do ngắn cho lựa chọn của mình; bạn có thể thay đổi lý do khi trách nhiệm, sức khỏe hoặc thời điểm thay đổi.
''','1.500.000 − 900.000 − 400.000 = 200.000đ; 350.000 − 200.000 = 150.000đ còn thiếu cho lựa chọn này.', [('1500000-900000-400000',200000),('350000-200000',150000)], [
Q('Thấy giao dịch xe công nghệ, có đủ để kết luận đây là mong muốn không?', ['Có, xe công nghệ luôn không cần thiết','Không, cần biết bối cảnh và phương án an toàn','Có, vì giá cao hơn xe buýt'],1,['Nhãn cố định bỏ qua sức khỏe và hoàn cảnh.','Đúng: cùng dịch vụ có mục đích khác nhau.','Giá thấp không đảm bảo phương án thay thế phù hợp.']),
Q('Phương giữ nguyên hai khoản đã dự kiến. Mua tai nghe 350.000đ thì thiếu bao nhiêu?', ['150.000đ','200.000đ','350.000đ'],0,['Đúng: giá 350.000đ trừ phần còn 200.000đ.','200.000đ là phần còn trước mua.','Đã có 200.000đ, không thiếu toàn bộ giá.']),
Q('Tai nghe hỏng, cần cho công việc. Điều nào hợp lý nhất?', ['Nhãn nhu cầu tự tạo thêm tiền','Bỏ qua mọi khoản tới hạn','Đánh giá phương án đáp ứng công việc và tính lại phần thiếu'],2,['Nhãn không thay đổi số dư.','Hậu quả của nghĩa vụ vẫn tồn tại.','Đúng: bối cảnh và khả năng chi trả đều cần được xem.'])], 'Chọn một ví dụ hoặc khoản có sẵn, viết lý do có thể hoãn hay cần ưu tiên.', ['priority'])

add(4,2,'Lập kế hoạch theo ngày tiền về','planning.irregular-income','Lập lịch thu chi có xét ngày đến hạn và tách khoản thu chưa chắc chắn.', '''
Tổng thu nhập trong tháng không kể hết câu chuyện. Một khoản tiền đến sau ngày trả tiền nhà không giúp thanh toán đúng hạn vào hôm trước. Người làm tự do, bán hàng nhỏ hoặc nhận tiền hỗ trợ theo đợt có thể cần lập kế hoạch theo từng kỳ tiền về. Hãy bắt đầu từ số tiền hiện có, rồi thêm những khoản thu đã xác nhận ngày và số tiền. Các khoản mới được hứa hoặc phụ thuộc công việc chưa hoàn tất nên để riêng như giả định, không coi đã nằm trong ví.

Nam có 1.200.000đ đầu tuần. Ngày thứ tư phải trả 800.000đ tiền phòng, ngày thứ sáu dự kiến cần 300.000đ cho thực phẩm. Một khách hàng hứa trả 1.000.000đ vào chủ nhật nhưng chưa xác nhận. Trước khoản thu đó, Nam chỉ còn 100.000đ sau hai khoản chi. Nếu phát sinh thêm chi phí 200.000đ vào thứ bảy thì thiếu 100.000đ trong kịch bản không nhận thêm tiền. Đưa khoản hứa trả vào đầu tuần sẽ che mất khoảng thiếu này dù tổng cuối tuần trông có vẻ dư.

Ngân sách trong hoàn cảnh đó có thể gồm phần chắc chắn và phần tùy tiền thực nhận. Đừng tự chia thu nhập tốt nhất năm cho các tuần rồi coi tuần nào cũng có mức đó. Có thể nhìn nhiều kỳ để nhận ra biến động, nhưng số trung bình không phải lời bảo đảm. Khi tiền về ít hơn dự kiến, hãy rà các khoản linh hoạt và chủ động hỏi bên nhận thanh toán về lựa chọn có thật. Không tự coi việc dời hạn là đã được đồng ý; cũng không bỏ nhu cầu ăn uống hoặc sức khỏe chỉ để làm bảng cân đối đẹp.

Trong Picket, xem lịch các ngày trước kỳ thu nhập tiếp theo giúp bạn đặt hạn mức phù hợp hơn một nhãn tháng chung chung. Hóa đơn đã trả phải được đánh dấu và đối chiếu để không trừ lần nữa. Nếu cần sửa kế hoạch, sửa giả định của tương lai; giao dịch đã xảy ra vẫn giữ đúng ngày thực tế. Bạn không cần tiết lộ mức lương để học bài này: có thể dùng ví dụ của Nam. Kết quả tốt là biết ngày nào cần chú ý, khoản nào chắc chắn và câu hỏi nào phải xác minh, chứ không phải buộc thu nhập thất thường trở nên đều đặn trên màn hình.
''','1.200.000 − 800.000 − 300.000 = 100.000đ; thêm chi 200.000đ trước tiền về tạo mức −100.000đ.', [('1200000-800000-300000',100000),('100000-200000',-100000)], [
Q('Khách chưa xác nhận trả 1.000.000đ chủ nhật. Nên biểu diễn thế nào?', ['Tiền mặt đã có từ thứ hai','Khoản thu giả định, tách khỏi số dư thực','Thu nhập chắc chắn mỗi tuần'],1,['Ngày và độ chắc chắn bị thay đổi sai.','Đúng: có thể so kịch bản nhận và chưa nhận.','Một lời hứa không chứng minh lịch lặp lại.']),
Q('Trước chủ nhật, Nam chi thêm 200.000đ sau hai nghĩa vụ. Số dư kịch bản là?', ['900.000đ','100.000đ','Âm 100.000đ'],2,['Con số này giả định tiền khách đã về.','100.000đ là trước chi bổ sung.','Đúng: 100.000đ trừ 200.000đ.']),
Q('Tháng có tổng thu lớn hơn tổng chi nhưng vẫn hụt giữa tháng. Vì sao?', ['Ngày thu có thể sau ngày cần trả','Phép cộng không áp dụng được cho tiền','Chỉ cần đổi danh mục là đủ tiền'],0,['Đúng: lịch dòng tiền quan trọng bên cạnh tổng kỳ.','Phép cộng vẫn đúng, cần thêm trục thời gian.','Đổi nhãn không tạo tiền.'])], 'Xem hoặc viết lịch ba khoản tới hạn và khoản thu tiếp theo bằng dữ liệu minh họa.', ['cashflow','income'])

add(5,3,'Quỹ dự phòng khác khoản đã biết trước','resilience.emergency-vs-planned','Phân biệt sự cố chưa dự kiến với chi phí theo lịch và chọn mục tiêu dự phòng phù hợp hoàn cảnh.', '''
Tiền dự phòng giúp bạn có thêm lựa chọn khi gặp một việc bất ngờ. Ví dụ có thể là đồ dùng thiết yếu hỏng hoặc gián đoạn thu nhập. Tiền dành cho khoản biết trước, như học phí kỳ tới hay phí gia hạn hàng năm, có vai trò khác: đó là chuẩn bị theo lịch. Hai loại đều có ích. Phân biệt chúng giúp bạn không nghĩ rằng mình liên tục gặp sự cố khi thực ra một khoản thường niên chưa được đưa vào kế hoạch. Không cần phán xét khi phải dùng tiền đã dành; hãy nhìn điều gì thực sự xảy ra.

Dung có 2.000.000đ, gồm 1.200.000đ dành cho học phí và 800.000đ dự phòng. Học phí đến hạn là 1.200.000đ, trả xong Dung còn 800.000đ. Nếu ngay sau đó thiết bị học tập cần sửa bất ngờ 500.000đ, Dung còn 300.000đ. Việc trả học phí không phải một lần rút quỹ dự phòng theo cách phân chia này. Số tiền dự phòng cũng không phải số tiền có thêm ngoài 2.000.000đ; đó là một phần của tổng đang có. Gắn nhãn cùng một khoản vào hai quỹ không khiến nó phục vụ đồng thời hai lần thanh toán.

Mức dự phòng phù hợp phụ thuộc nhu cầu, người phụ thuộc, độ ổn định thu nhập và những hỗ trợ thực sự có thể tiếp cận. Một mục tiêu khởi đầu nhỏ có thể dễ thực hiện hơn một con số lớn khiến bạn bỏ cuộc. Bài này không yêu cầu mọi người giữ một số tháng giống nhau và không hứa rằng đạt một mức nào đó sẽ an toàn trước mọi biến cố. Nếu hiện chưa còn tiền sau nhu cầu cơ bản, hãy nhận diện giới hạn đó; không cần vay tiền chỉ để tạo số dư mang tên dự phòng.

Hãy cân nhắc nơi giữ tiền mà bạn hiểu phí, khả năng rút và mức độ tiếp cận khi cần, thay vì chạy theo một mức sinh lời được hứa. Không đưa toàn bộ tiền cần sớm vào lựa chọn mà bạn không hiểu hoặc không rút được đúng lúc. Trong Picket, bạn có thể xem nhãn mục tiêu và số dư riêng để tránh nhầm. Sau một lần dùng dự phòng, chỉ lập lại kế hoạch khi có điều kiện; không cần tự phạt bằng việc bỏ chi phí thiết yếu. Một bước học có thể chỉ là liệt kê khoản biết trước và việc bất ngờ, không yêu cầu gửi tiền hay mua sản phẩm tài chính.
''','2.000.000 − 1.200.000 = 800.000đ; 800.000 − 500.000 = 300.000đ.', [('2000000-1200000',800000),('800000-500000',300000)], [
Q('Học phí có lịch rõ kỳ tới nên được xem là gì trong bài?', ['Sự cố không thể dự kiến','Khoản cần chuẩn bị theo lịch','Thu nhập mới'],1,['Đã biết ngày và số tiền nên có thể lập kế hoạch.','Đúng: khác sự cố chưa dự kiến.','Đây là tiền phải trả, không phải thu.']),
Q('Dung trả học phí và sửa thiết bị như ví dụ. Còn bao nhiêu?', ['300.000đ','800.000đ','1.500.000đ'],0,['Đúng: đã trừ đủ cả hai khoản thực tế.','Đây là số trước khi sửa thiết bị.','Đã bỏ qua học phí trong phép tính.']),
Q('Hiện không dư sau nhu cầu cơ bản. Lựa chọn nào phù hợp nhất?', ['Vay để đạt một nhãn quỹ đẹp','Coi mình thất bại','Ghi nhận giới hạn và xem lại mục tiêu khi điều kiện đổi'],2,['Vay làm phát sinh nghĩa vụ, không tự tạo an toàn.','Thiếu nguồn lực không phải đánh giá phẩm chất.','Đúng: mục tiêu cần phù hợp hoàn cảnh thực tế.'])], 'Tách hai ví dụ thành khoản có lịch và sự cố bất ngờ; chưa cần chuyển tiền.', ['emergency'])

add(6,3,'Chia mục tiêu thành bước có thể đổi','saving.realistic-goal','Tính phần còn thiếu và mức dành theo kỳ, biết điều chỉnh thời hạn khi hoàn cảnh đổi.', '''
Một mục tiêu rõ thường có số tiền, lý do và thời điểm bạn muốn đạt. Nó vẫn là kế hoạch có thể sửa. Nếu giá thay đổi hoặc thu nhập giảm, điều chỉnh thời hạn không xóa đi những bước đã làm. Trước khi tính, hãy kiểm tra đã có bao nhiêu tiền thực sự dành cho mục tiêu này. Một khoản đã để cho tiền nhà không nên đồng thời được tính là tiền mua máy tính, trừ khi bạn chủ động đổi phân bổ và hiểu hậu quả cho tiền nhà.

Tú muốn dành 3.000.000đ cho một khóa học sau sáu kỳ thu nhập. Tú đã có 600.000đ cho mục tiêu đó. Còn thiếu 2.400.000đ; nếu chia đều sáu kỳ thì mỗi kỳ là 400.000đ. Đây là phép chia để hiểu nhịp độ, không phải mệnh lệnh phải dành đủ bất kể hoàn cảnh. Nếu thực tế chỉ có thể dành 300.000đ mỗi kỳ, tám kỳ mới đủ phần còn thiếu theo giả định giá không đổi và không có lãi. Không cần tự thêm lợi nhuận tương lai chưa chắc chắn để làm thời hạn trông đạt được.

Khi một kỳ phải ưu tiên nhu cầu khác, hãy tính lại trên số thực có, tránh vừa cộng khoản dự định vừa cộng khoản đã chuyển. Tiền vào ví tiết kiệm của chính mình vẫn là chuyển ví ở phạm vi tổng; mục tiêu thể hiện bạn muốn dùng tiền vào việc gì. Nếu chỉ cập nhật thanh tiến độ mà không có tiền tương ứng, cần ghi rõ đó là ghi nhận kế hoạch hay điều chỉnh dữ liệu. Một thanh đầy không chứng minh bạn đủ tiền thanh toán khi các khoản khác cùng cần đến số dư đó.

Trong Picket, có thể chọn thực hành xem lại mục tiêu có sẵn hoặc chỉ giải ví dụ. Không cần mở một khoản tiết kiệm thật để hoàn thành bài, không cần chứng minh bằng ảnh tài khoản. Một lời nhắc tự chọn có thể giúp bạn quay lại kế hoạch, nhưng bỏ qua không làm mất kiến thức đã học. Khi so hai phương án, hãy ghi rõ điều đang đổi: thời gian, số tiền mỗi kỳ hoặc phạm vi mục tiêu. Tránh kết luận rằng ai hoàn thành nhanh hơn là quản lý tiền giỏi hơn; nguồn lực và trách nhiệm của mỗi người khác nhau. Bước nhỏ có ích khi bạn hiểu được nó và vẫn đáp ứng các nhu cầu quan trọng hiện tại.
''','(3.000.000 − 600.000) / 6 = 400.000đ/kỳ; 2.400.000 / 300.000 = 8 kỳ.', [('3000000-600000',2400000),('2400000/6',400000),('2400000/300000',8)], [
Q('Tú đã có 600.000đ, mục tiêu 3.000.000đ. Còn thiếu?', ['3.600.000đ','2.400.000đ','600.000đ'],1,['Đã cộng thay vì trừ phần có sẵn.','Đúng: mục tiêu trừ tiền thực đã dành.','Đây là số có, không phải phần thiếu.']),
Q('Chỉ dành được 300.000đ mỗi kỳ cho phần thiếu. Cần mấy kỳ theo giả định bài?', ['6','10','8'],2,['Sáu kỳ chỉ tạo 1.800.000đ.','Mười kỳ là chia toàn bộ mục tiêu, bỏ qua 600.000đ đã có.','Đúng: 2.400.000 chia 300.000 bằng tám.']),
Q('Một kỳ cần dùng tiền cho thuốc. Nên làm gì với mục tiêu?', ['Cập nhật số thực và tính lại thời hạn','Giữ tiến độ giả cho đẹp','Bỏ thuốc để không đứt tiến độ'],0,['Đúng: kế hoạch phục vụ hoàn cảnh, không ngược lại.','Tiến độ không khớp tiền làm quyết định sau khó hơn.','Nhu cầu sức khỏe không nên bị thay thế bằng điểm tiến độ.'])], 'Viết một mục tiêu giả lập với số đã có, phần thiếu và hai lựa chọn thời hạn.', ['saving','goals'])

add(7,4,'Số dư chưa phải tiền có thể dành ra','forecast.obligations-and-scope','Tách số dư hiện tại, nghĩa vụ tương lai và mức dự phòng khi xem một kịch bản.', '''
Số dư trả lời bạn đang có bao nhiêu tiền trong phạm vi được xem. Nó không tự trả lời bao nhiêu tiền có thể dành cho một quyết định mới. Có những khoản chưa trừ khỏi ví nhưng sắp cần thanh toán. Bạn cũng có thể muốn giữ một phần để xử lý bất ngờ. Khi đọc một con số, hãy tìm mốc thời gian, những ví được tính và các khoản đã hoặc chưa nằm trong đó. Nếu một ví ngoại tệ chưa có tỷ giá phù hợp, đừng cộng thẳng số của nó với số VND.

Vy có 4.000.000đ trong các ví VND đang xem. Trước kỳ thu tiếp theo, Vy đã xác nhận tiền phòng 1.500.000đ và chi thực phẩm dự kiến 700.000đ. Vy muốn giữ 500.000đ làm khoảng dự phòng. Theo đúng các đầu vào đó, phần còn sau nghĩa vụ và phần dành lại là 1.300.000đ. Phép tính không nói số dư ngân hàng hiện đã giảm xuống 1.300.000đ. Nó phân biệt tiền hiện có với phần đang được cân nhắc cho quyết định mới. Khoản dự phòng là phân bổ của cùng số dư, không phải một khoản chi đã thực hiện.

Nếu tiền phòng đã trả và giao dịch đó đã trừ vào số dư 4.000.000đ, bạn không nên trừ nó lần nữa. Cần đối chiếu trạng thái hóa đơn và bản ghi thanh toán trước khi xem lịch. Tương tự, ảnh hóa đơn chưa xác nhận không được tự tạo một nghĩa vụ mới ngoài khoản đã ghi. Chuyển giữa hai ví trong phạm vi không tăng tổng tiền để dành. Các quy tắc này giúp tránh một báo cáo quá lạc quan hoặc quá bi quan vì đếm cùng khoản nhiều lần.

Con số 1.300.000đ vẫn phụ thuộc vào danh sách đã đủ chưa. Vy có thể quên chi phí đi lại hoặc có một khoản thu chưa chắc chắn. Hãy xem kết quả như một câu trả lời có điều kiện, kèm điều cần kiểm tra thêm. Trong Picket, khi chưa xác nhận lịch, tốt hơn là nói chưa đủ dữ liệu thay vì khẳng định bạn được phép tiêu một mức cụ thể. Bạn có thể tự chọn thay đổi giả định và xem kết quả, nhưng ứng dụng không quyết định thay bạn. Thực hành của bài là rà một nghĩa vụ và hỏi nó đã trả hay chưa; không cần cung cấp thông tin tài khoản ngân hàng cho bất kỳ dịch vụ mới nào.
''','4.000.000 − 1.500.000 − 700.000 − 500.000 = 1.300.000đ theo đầu vào đã nêu.', [('4000000-1500000-700000-500000',1300000)], [
Q('1.300.000đ trong ví dụ có ý nghĩa gì?', ['Số dư ngân hàng chắc chắn ngay lúc này','Phần còn có điều kiện sau các khoản đã nêu','Tiền ứng dụng vừa tạo thêm'],1,['Ngân hàng chưa tự trừ các khoản tương lai và phân bổ dự phòng.','Đúng: cần giữ nguyên giả định và phạm vi để đọc số.','Tính toán không tạo thêm tiền.']),
Q('Tiền phòng đã nằm trong giao dịch trừ số dư hiện tại. Trừ thêm hóa đơn đó gây gì?', ['Đếm nghĩa vụ hai lần','Tăng độ chính xác','Tạo thu nhập mới'],0,['Đúng: cần đối chiếu trạng thái thanh toán.','Trừ trùng làm dự kiến thấp sai.','Không có nguồn thu mới nào.']),
Q('Có ví 100 USD và ví 4.000.000 VND nhưng chưa có tỷ giá. Nên?', ['Cộng thành 4.000.100 VND','Coi USD bằng không mà không báo','Hiển thị riêng và nói rõ chưa tổng hợp chéo tiền tệ'],2,['Khác đơn vị nên không cộng trực tiếp.','Bỏ âm thầm làm người dùng hiểu sai phạm vi.','Đúng: giới hạn phải hiện rõ.'])], 'Rà một khoản tới hạn hoặc ví dụ để đánh dấu đã trả/chưa trả, không tạo thanh toán thật.', ['bills'])

add(8,4,'Kịch bản giúp hỏi, không đoán chắc tương lai','forecast.scenario-and-coverage','So hai kịch bản cùng giả định và giải thích vì sao thiếu dữ liệu không cho phép khẳng định dự báo.', '''
Một kịch bản trả lời câu hỏi nếu những điều này xảy ra thì số tiền sẽ thay đổi thế nào. Dự báo cố gắng ước lượng điều có thể xảy ra từ dữ liệu và phương pháp cụ thể. Cả hai đều có giới hạn, nhưng không nên dùng hai tên thay nhau để tạo cảm giác chắc chắn. Khi bạn nhập giá một món định mua rồi xem chênh lệch, đó trước hết là phép tính có điều kiện. Nó không chứng minh người dùng sẽ thật sự mua, cũng không chứng minh mọi khoản thu chi khác đã được biết.

An có 2.000.000đ. Trong bảy ngày, An xác nhận một khoản thu 1.000.000đ và nghĩa vụ 1.500.000đ. Nếu không có khoản nào khác, cuối kỳ còn 1.500.000đ. Nếu mua món đồ 600.000đ trong kỳ với các điều kiện giữ nguyên, còn 900.000đ. Chênh lệch giữa hai phương án là 600.000đ. Đây không phải khẳng định An sẽ có chính xác 900.000đ tuần tới. Nếu khoản thu đến chậm hoặc còn chi chưa nhập, kết quả thực tế khác; cần xem thêm số dư theo từng ngày chứ không chỉ ngày cuối.

Dữ liệu thưa dễ làm câu chuyện sai. Không ghi giao dịch vào ba ngày không có nghĩa là ba ngày đều chi bằng không. Nếu chỉ theo dõi một ví, báo cáo cũng không biết mọi khoản ở ví khác. Một mô hình phức tạp không tự lấp được khoảng trống này bằng sự thật. Cách hữu ích là hỏi mức độ ghi đủ, nêu mốc đồng bộ và cho phép bạn sửa lịch đã biết. Các khoảng thấp và cao do đổi giả định chỉ là các kịch bản; không gọi là xác suất tin cậy đã kiểm chứng nếu chưa đo và hiệu chuẩn trên dữ liệu phù hợp.

Trong Picket, thử một lựa chọn không nên tự tạo giao dịch hoặc sửa ngân sách thật. Chỉ khi bạn chủ động xác nhận một sự việc đã xảy ra mới dùng luồng ghi chép tương ứng. Khi thiếu lịch sử, bài vẫn dùng số minh họa để giải thích công thức mà không bịa một ngày hết tiền. Bạn có thể chọn chưa kết luận và bổ sung đầu vào sau. Thực hành tốt là nói được câu điều kiện trước con số: nếu lịch đúng và không còn khoản nào khác, kết quả là bao nhiêu. Câu đó giúp bạn kiểm tra quyết định và nhìn ra điều còn chưa biết.
''','Không mua: 2.000.000 + 1.000.000 − 1.500.000 = 1.500.000đ. Mua: 1.500.000 − 600.000 = 900.000đ.', [('2000000+1000000-1500000',1500000),('1500000-600000',900000),('1500000-900000',600000)], [
Q('So hai phương án chỉ khác giá món đồ 600.000đ. Chênh lệch cuối kỳ?', ['600.000đ','900.000đ','1.500.000đ'],0,['Đúng: các giả định khác giữ nguyên.','Đây là số còn của phương án mua.','Đây là số còn của phương án không mua.']),
Q('Ba ngày không ghi dữ liệu. Có thể kết luận chi tiêu bằng không?', ['Có vì biểu đồ trống','Chưa thể kết luận','Có nếu AI trả lời tự tin'],1,['Biểu đồ trống có thể do chưa nhập.','Đúng: cần biết độ phủ ghi chép.','Độ tự tin của lời văn không thay bằng chứng.']),
Q('Thử giá trên màn hình kịch bản nên làm gì với giao dịch thật?', ['Tạo khoản chi tự động','Sửa ngân sách để vừa kết quả','Giữ nguyên, chỉ mô phỏng cho tới thao tác xác nhận riêng'],2,['Thử phương án chưa phải mua thật.','Điều chỉnh âm thầm làm mất ý nghĩa kế hoạch.','Đúng: thử nghiệm và ghi nhận thực tế là hai bước khác nhau.'])], 'Giải hai kịch bản minh họa và viết một điều có thể khiến kết quả khác.', ['adjust','oecd'])

add(9,5,'Nhìn tổng chi phí trước khoản trả nhỏ','borrowing.total-cost','Tính tổng phải trả từ lịch và phí; phân biệt lãi suất quảng cáo với toàn bộ chi phí của ví dụ.', '''
Một khoản vay không chỉ có tiền gốc. Bạn cần biết số tiền thực nhận, lịch trả, tổng lãi và các loại phí có thể phát sinh. Một mức trả từng kỳ nhỏ không tự chứng minh khoản vay rẻ hơn. Muốn so hai lựa chọn cần cùng hiểu số tiền được sử dụng, số kỳ, thời điểm và điều kiện. Nếu thông tin chưa đủ, câu trả lời đúng có thể là chưa so được, thay vì chọn mức phần trăm nhìn thấp nhất trên một dòng quảng cáo.

Trong hợp đồng giả lập A, Linh nhận 3.000.000đ và trả ba kỳ, mỗi kỳ 1.080.000đ. Có thêm phí 60.000đ trả riêng lúc bắt đầu. Tổng tiền trả là 3.300.000đ; phần vượt tiền nhận là 300.000đ. Hợp đồng giả lập B cũng cho nhận đủ 3.000.000đ, trả ba kỳ 1.110.000đ và không có phí khác: tổng 3.330.000đ. Theo đúng các điều kiện đã cho, A thấp hơn 30.000đ về tổng số tiền. Đây là so sánh số học, không phải giới thiệu bên cho vay hay kết luận tính hợp pháp của bất kỳ sản phẩm nào.

Đọc kỹ phí có được khấu trừ ngay khỏi tiền nhận hay trả riêng. Hai cách có thể làm số tiền thực dùng khác nhau dù cùng gọi là vay 3.000.000đ. Kiểm tra thêm phí trả chậm, điều kiện trả trước và khoản dịch vụ kèm theo. Đừng tự suy ra lãi suất năm từ phép chia đơn giản khi lịch trả và số dư gốc thay đổi theo kỳ. Cũng không nên gắn tên một chỉ số nước ngoài vào một phép tính chưa đúng định nghĩa. Trong bài này chúng ta chỉ tính tổng các khoản tiền đã được nêu rõ.

Trước quyết định thật, bạn cần thông tin hợp đồng áp dụng tại Việt Nam và có thể hỏi người có chuyên môn phù hợp nếu điều khoản khó hiểu. Nguồn quốc tế ở cuối bài hỗ trợ cách nhìn chi phí, không thay thế luật Việt Nam và không tạo quyền hay thời hạn pháp lý ở đây. Bạn không cần nhập khoản vay thật hoặc bấm đăng ký để hoàn thành. Trong Picket, hãy phân biệt dữ liệu mô phỏng với nghĩa vụ đã có; chỉ ghi lịch thật khi đã kiểm tra. Nếu bị thúc ép ký khi còn câu hỏi chưa được trả lời, việc dừng để xác minh giúp giữ quyền chủ động của bạn.
''','A: 3 × 1.080.000 + 60.000 = 3.300.000đ, chi phí 300.000đ. B: 3 × 1.110.000 = 3.330.000đ; chênh 30.000đ.', [('3*1080000+60000',3300000),('3300000-3000000',300000),('3*1110000',3330000),('3330000-3300000',30000)], [
Q('Tổng phải trả của A theo ví dụ?', ['3.240.000đ','3.300.000đ','3.060.000đ'],1,['Đã bỏ phí trả riêng 60.000đ.','Đúng: cộng ba kỳ và phí.','Đã bỏ phần lớn các khoản trả theo kỳ.']),
Q('Chỉ biết lãi suất quảng cáo của hai hợp đồng. Đã chọn được rẻ hơn chưa?', ['Chưa, cần lịch, tiền thực nhận và phí','Rồi, cứ chọn số nhỏ','Rồi, chọn bên hứa giải ngân nhanh'],0,['Đúng: một chỉ số chưa thể hiện toàn bộ tiền phải trả.','Phí và cách tính có thể khác.','Tốc độ không cho biết chi phí.']),
Q('Nguồn CFPB nói về công bố TILA tại Mỹ. Áp dụng thế nào trong bài Việt Nam?', ['Coi đó là luật Việt Nam','Hứa mọi hợp đồng Việt Nam cùng biểu mẫu','Chỉ tham khảo khái niệm chi phí, kiểm điều khoản và luật áp dụng riêng'],2,['Nguồn nước ngoài không trở thành luật Việt Nam.','Chưa có bằng chứng cho kết luận đó.','Đúng: phân biệt khái niệm với yêu cầu pháp lý từng nơi.'])], 'So hai bảng tiền giả lập; ghi một câu hỏi về phí còn thiếu, không đăng ký vay.', ['cost','loans'])

add(10,5,'Lịch trả quan trọng như tổng tiền','borrowing.repayment-timing','Nhận ra thiếu hụt trước ngày thu nhập và kiểm tra điều kiện trước khi đổi lịch hoặc vay bù.', '''
Sau khi hiểu tổng chi phí, hãy đặt từng khoản trả lên lịch cùng thu nhập và nhu cầu sinh hoạt. Một hợp đồng có tổng thấp hơn vẫn có thể gây áp lực nếu các kỳ trả không phù hợp ngày bạn có tiền. Điều này không tự khiến một lựa chọn khác tốt hơn; nó cho bạn thêm tiêu chí cần kiểm tra. Số dư cuối tháng dương không bảo đảm mọi ngày trong tháng đều đủ tiền. Đặc biệt với thu nhập theo dự án, ngày khách hứa trả và ngày tiền thực về có thể khác nhau.

Bình có 900.000đ đầu kỳ. Ngày mười phải trả một khoản theo hợp đồng 700.000đ. Trước ngày mười lăm, Bình cần 300.000đ cho nhu cầu thiết yếu. Thu nhập 1.200.000đ dự kiến về ngày mười lăm. Trước ngày thu, phép tính là 900.000 − 700.000 − 300.000 = âm 100.000đ. Đến khi tiền về đủ và không có khoản khác, còn 1.100.000đ. Chỉ nhìn số cuối kỳ sẽ bỏ qua thiếu hụt 100.000đ trước đó. Đổi ngày trên ứng dụng không tự đổi ngày đến hạn trong hợp đồng.

Nếu thấy khoảng thiếu, hãy xác minh ngày thu và hỏi bên liên quan về lựa chọn thực tế trước hạn. Mọi thay đổi lịch cần được xác nhận, gồm phí và ảnh hưởng của nó. Trả một khoản phí gia hạn không nhất thiết làm giảm tiền gốc; phải đọc cách ghi nhận của chính hợp đồng. Vay mới để bù kỳ cũ có thể thêm nghĩa vụ, nên cần nhìn lịch tổng của tất cả khoản chứ không chỉ một kỳ đang gấp. Bài học không chọn sản phẩm vay hoặc khuyên bỏ một khoản thiết yếu để trả bằng mọi giá.

Trong Picket, lịch nhắc chỉ giúp nhớ; dấu hoàn thành phải khớp một khoản thanh toán thật đã được xác nhận. Nếu số tiền đã nằm trong giao dịch, đừng nhập thêm lần nữa từ lời nhắc. Có thể dùng ghi chú cho điều chưa rõ và quay lại sau. Khi nhận cảnh báo, bạn được quyền xem công thức và phạm vi thay vì chấp nhận một câu kết luận tuyệt đối. Thực hành bài này chỉ yêu cầu đánh dấu một ngày thiếu trong ví dụ và nghĩ một câu hỏi cần xác minh. Không cần cung cấp số hợp đồng, giấy tờ cá nhân hay thực hiện khoản trả thật để học được cách đọc lịch.
''','Trước thu: 900.000 − 700.000 − 300.000 = −100.000đ. Sau thu: −100.000 + 1.200.000 = 1.100.000đ.', [('900000-700000-300000',-100000),('-100000+1200000',1100000)], [
Q('Trước ngày mười lăm, Bình thiếu bao nhiêu theo ví dụ?', ['Không thiếu vì cuối kỳ dương','100.000đ','1.100.000đ'],1,['Tiền chưa về không trả được nhu cầu đến trước.','Đúng: đầu vào cho mức âm 100.000đ.','1.100.000đ là số sau khoản thu.']),
Q('Bình sửa ngày nhắc trong Picket. Hạn hợp đồng có tự đổi không?', ['Có','Có nếu tắt thông báo','Không, phải được bên liên quan xác nhận'],2,['Ứng dụng không sửa thỏa thuận với bên cho vay.','Tắt nhắc không đổi nghĩa vụ.','Đúng: cần xác nhận thay đổi và điều kiện thực tế.']),
Q('Đóng phí gia hạn có chắc giảm tiền gốc không?', ['Không, cần đọc cách phân bổ trong hợp đồng','Chắc chắn giảm đủ bằng phí','Chắc chắn xóa nợ'],0,['Đúng: phí và gốc có thể là hai khoản khác nhau.','Không có dữ kiện để khẳng định.','Gia hạn không có nghĩa xóa nghĩa vụ.'])], 'Đánh dấu khoảng thiếu trong lịch giả lập và viết câu hỏi về ngày trả hoặc phí.', ['cashflow','income','loans'])

add(11,6,'Dừng một nhịp trước yêu cầu OTP','safety.otp-and-phishing','Nhận ra yêu cầu chuyển tiền hoặc chia sẻ bí mật đáng ngờ và xác minh qua kênh chính thức độc lập.', '''
Một người biết tên hoặc chi tiết đơn hàng của bạn chưa chắc là người có quyền yêu cầu thao tác tài khoản. Kẻ giả mạo có thể dùng thông tin đúng để kể một câu chuyện gấp: phải xác minh ngay, nhận hoàn tiền hoặc tránh bị khóa. Khi câu chuyện thúc bạn bỏ bước kiểm tra, hãy dừng. Việc xuất hiện tên thương hiệu trên tin nhắn hay một logo quen không đủ để chứng minh kênh đó thật. Bài này tập trung vào cách xử lý yêu cầu, không yêu cầu bạn phân biệt mọi thủ thuật bằng mắt.

Ví dụ hoàn toàn giả lập: một người gọi nói hoàn 250.000đ cho Hà nhưng yêu cầu Hà chuyển trước 50.000đ và đọc mã OTP. Hà đang có 1.000.000đ. Nếu chuyển 50.000đ, số dư còn 950.000đ, chứ chưa thành 1.200.000đ vì khoản hoàn 250.000đ chỉ là lời hứa. Không có phép tính nào xác nhận người gọi đáng tin. Cách an toàn trong tình huống là ngừng thao tác, tự mở ứng dụng hoặc kênh chăm sóc chính thức mà Hà biết để kiểm tra. Không dùng ngay đường liên kết hay số gọi lại do người đó cung cấp.

Không gửi OTP, mật khẩu hay thông tin đăng nhập cho người gọi hoặc người nhắn tin. Mã xác thực chỉ nên được dùng trong thao tác do chính bạn chủ động thực hiện ở kênh chính thức đã kiểm tra, sau khi hiểu nội dung đang xác nhận. Không cài ứng dụng, cấp quyền điều khiển thiết bị hoặc quét mã lạ theo chỉ dẫn hoàn tiền. Nếu đã thao tác và nghi bị lừa, dừng giao dịch; liên hệ ngân hàng qua kênh chính thức để được hướng dẫn bảo vệ tài khoản, giữ bằng chứng và trình báo cơ quan Công an. Không bảo đảm tiền chắc chắn được lấy lại.

Trong Picket, bài thực hành dùng tình huống mô phỏng. Ứng dụng không cần OTP ngân hàng, ảnh thẻ hoặc mật khẩu để chấm câu trả lời. Không nhập một mã thật vào ô học tập và không gửi ảnh màn hình chứa bí mật. Khi nhận yêu cầu khẩn, có thể tự hỏi: ai khởi đầu liên hệ, tôi đang xác nhận điều gì, có thể xác minh độc lập bằng cách nào? Việc dừng để hỏi không phải lỗi của bạn. Nếu đã mắc bẫy, tập trung các bước bảo vệ và hỗ trợ; đừng để xấu hổ làm chậm việc báo cho đơn vị có khả năng xử lý.
''','1.000.000 − 50.000 = 950.000đ; 250.000đ được hứa chưa phải thu nhập đã nhận. Giả định nhận và chuyển mới cho 1.200.000đ, không dùng để đánh giá độ tin cậy.', [('1000000-50000',950000),('1000000-50000+250000',1200000)], [
Q('Người gọi biết đúng đơn hàng và đòi OTP để hoàn tiền. Nên?', ['Đọc mã vì họ biết thông tin','Dừng và xác minh bằng kênh chính thức độc lập','Chỉ đọc nửa mã'],1,['Biết thông tin không chứng minh danh tính và quyền truy cập.','Đúng: không chia sẻ bí mật theo yêu cầu người gọi.','Vẫn làm lộ thông tin, không tạo cách xác minh an toàn.']),
Q('Hà chuyển 50.000đ, khoản hoàn chưa về. Số dư từ 1.000.000đ còn?', ['950.000đ','1.200.000đ','1.250.000đ'],0,['Đúng: chỉ ghi tiền thực đã ra.','Đã tính khoản hứa như tiền nhận thật.','Vừa cộng tiền chưa về vừa bỏ khoản đã chuyển.']),
Q('Đã bấm liên kết và nghi lộ thông tin. Phản ứng phù hợp?', ['Chờ vì báo sẽ xấu hổ','Chuyển thêm tiền để lấy lại','Dừng, liên hệ ngân hàng chính thức, giữ bằng chứng và trình báo'],2,['Chậm xử lý có thể làm tăng rủi ro.','Lời hứa lấy lại tiền có thể tiếp tục là bẫy.','Đúng: ưu tiên bảo vệ; không có bảo đảm thu hồi.'])], 'Đọc kịch bản và viết kênh xác minh độc lập; tuyệt đối không dùng OTP hoặc liên kết lạ thật.', ['otp','payment-safety'])

add(12,6,'Dùng thử và khoảng chờ trước khi mua','safety.renewals-and-deliberate-buying','Nhận diện ngày gia hạn, kiểm trạng thái hủy và so quyết định mua có điều kiện mà không phán xét sở thích.', '''
Dùng thử miễn phí có thể chuyển thành gói trả tiền nếu bạn không hủy theo điều kiện đã đồng ý. Trước khi bắt đầu, hãy tìm giá sau dùng thử, chu kỳ, ngày gia hạn và cách hủy thực tế. Một nhãn miễn phí không nói hết các điều kiện. Nếu chưa hiểu, bạn có thể chưa đăng ký. Tương tự, xóa biểu tượng ứng dụng khỏi điện thoại không tự chứng minh một gói đăng ký đã hủy; cần xem trạng thái tại nơi quản lý gói và giữ xác nhận nếu có.

Ví dụ giả lập: Yến đang trả 79.000đ mỗi tháng cho dịch vụ A và 49.000đ cho dịch vụ B. Tổng theo tháng là 128.000đ. Nếu cả hai giữ nguyên giá, hoạt động đủ mười hai tháng và không có phí khác, tổng là 1.536.000đ. Yến cũng đang xem một món đồ giá 450.000đ, dự kiến dùng sáu lần. Giá chia số lần là 75.000đ mỗi lần theo dự định đó; chưa chứng minh Yến chắc chắn dùng đủ sáu lần. Các con số giúp nhìn quy mô và giả định, không tự ra quyết định thay Yến.

Một khoảng chờ tự chọn trước món mua linh hoạt có thể cho bạn thời gian so với kế hoạch, đọc điều kiện và xem nhu cầu còn phù hợp không. Có thể ghi lại món định mua rồi quay lại vào thời điểm bạn chọn. Đây là mẹo suy nghĩ, không phải thời hạn pháp lý được bảo đảm, cũng không áp dụng cứng cho thuốc hay nhu cầu cấp thiết. Hết khoảng chờ, mua hoặc không mua đều có thể hợp lý tùy điều kiện. Không cần giữ một chuỗi ngày nhịn mua để chứng minh bạn biết quản lý tiền.

Trong Picket, đánh dấu một khoản định kỳ cần xem lại không có nghĩa dịch vụ bên ngoài đã hủy. Nếu muốn hủy thật, hãy tự thực hiện ở kênh chính thức và xác nhận kết quả trước khi sửa lịch tương lai. Một khoản đã bị thu vẫn là sự việc cần ghi đúng; yêu cầu hoàn tiền chưa được duyệt không nên ghi là tiền đã về. Nhắc trước gia hạn chỉ bật khi bạn chọn và cần tránh nhắc trùng. Thực hành bài này có thể chỉ là rà hai ví dụ hoặc viết câu hỏi về điều kiện dùng thử. Không cần đăng ký gói, mua món đồ hay cung cấp thẻ để hoàn thành bài; mục tiêu là giữ lựa chọn của bạn rõ ràng.
''','79.000 + 49.000 = 128.000đ/tháng; 128.000 × 12 = 1.536.000đ/năm theo giả định; 450.000 / 6 = 75.000đ/lần dự kiến.', [('79000+49000',128000),('128000*12',1536000),('450000/6',75000)], [
Q('Xóa ứng dụng khỏi điện thoại có đủ chứng minh gói đã hủy?', ['Có, luôn tự hủy','Không, cần kiểm trạng thái nơi quản lý đăng ký','Có nếu không mở app'],1,['Xóa app và hủy đăng ký là hai thao tác khác nhau.','Đúng: cần xác nhận tại kênh quản lý chính thức.','Không sử dụng không tự thay điều kiện thanh toán.']),
Q('Hai gói giữ nguyên giá trong 12 tháng như ví dụ. Tổng?', ['128.000đ','1.536.000đ','450.000đ'],1,['Đây là tổng một tháng.','Đúng: 128.000 nhân mười hai.','Đây là giá món đồ khác, không phải hai gói.']),
Q('Picket đánh dấu cần xem lại gói B. Có thể coi đã ngừng tính phí chưa?', ['Có ngay khi đánh dấu','Có sau một ngày chờ bất kỳ','Chưa, phải hủy và xác nhận ở nhà cung cấp/kênh quản lý'],2,['Ghi chú trong Picket không điều khiển dịch vụ bên ngoài.','Khoảng chờ tự chọn không làm thay đổi hợp đồng.','Đúng: chỉ cập nhật lịch khi biết kết quả thực tế.'])], 'Rà giá/ngày gia hạn trên một ví dụ hoặc gói có sẵn; có thể bỏ qua, không đăng ký thêm.', ['trial'])

ALL_SOURCES={**SOURCES, **{k:v[0] for k,v in ext.NEW_SOURCES.items()}}

def add_extension_lessons():
    """Append the v2 lessons (13-30) authored in curriculum_v2_extension.py."""
    for item in ext.NEW_LESSONS:
        v=item['vi']
        questions=[Q(prompt,choices,correct,explanations) for (prompt,choices,explanations),correct in zip(v['questions'],item['correct'])]
        lesson={'lessonId':ext.lesson_id(item['n']),'chapterId':f"chapter-{item['chapter']:02}",'version':1,'locale':'vi-VN','title':v['title'],'competencyId':item['competency'],'objective':v['objective'],'body':v['body'].strip(),'workedExample':{'currency':'VND','description':v['example'],'arithmeticChecks':[{'expression':e,'expected':x} for e,x in item['checks']]},'questions':questions,'optionalAction':{'text':v['action'],'requiresSpending':False,'maySkip':True,'evidence':'self-reported-or-local-review'},'sources':[ALL_SOURCES[k] for k in item['sources']],'reviewedAt':DATE,'reviewType':'author-source-and-arithmetic-check','independentReviewedAt':None,'status':'authored-not-independent-review'}
        if item['figures']:
            lesson['citedFigures']=[dict(f) for f in item['figures']]
        lessons.append(lesson)

def finalize_lessons():
    """Attach stages, apply the v2 self-review status and order lessons by stage."""
    order=ext.ordered_ids()
    assert sorted(order)==sorted(l['lessonId'] for l in lessons)
    for l in lessons:
        l['stageId']=ext.stage_of(int(l['lessonId'][-2:]))
        l['reviewedAt']=ext.EXTENSION_DATE
        l['reviewType']=ext.REVIEW_TYPE
        l['status']=ext.REVIEW_STATUS
    lessons.sort(key=lambda l: order.index(l['lessonId']))

def source_registry():
    old=[{'id':k,'url':v,'accessedAt':DATE,'validation':'Opened and read as primary source; educational concepts only.'} for k,v in SOURCES.items()]
    new=[{'id':k,'url':url,'accessedAt':ext.EXTENSION_DATE,'validation':note} for k,(url,note) in ext.NEW_SOURCES.items()]
    return old+new

if __name__=='__main__':
    add_extension_lessons()
    apply_study_support(lessons, 'vi', extra_entries=ext.support_entries())
    finalize_lessons()
    registry=source_registry()
    registry_ids={r['id'] for r in registry}
    stages=ext.stages_for('vi')
    stage_ids={s['stageId'] for s in stages}
    for l in lessons:
        for check in l['workedExample']['arithmeticChecks']:
            assert re.fullmatch(r'[0-9+*/(). -]+',check['expression'])
            assert eval(check['expression'],{'__builtins__':{}},{})==check['expected'], (l['lessonId'],check)
        assert len(l['questions'])==3
        assert all(len(q['choices'])==3 and 0<=q['correctIndex']<3 and all(c['explanation'] for c in q['choices']) for q in l['questions'])
        assert l['stageId'] in stage_ids
        assert all(f['sourceId'] in registry_ids and re.fullmatch(r'\d{4}-\d{2}-\d{2}',f['asOf']) for f in l.get('citedFigures',[]))
    assert len(lessons)==30
    question_count=sum(len(l['questions']) for l in lessons)
    payload={'schemaVersion':1,'curriculumId':'picket.financial.vi.v1','locale':'vi-VN','authoredAt':DATE,'status':ext.REVIEW_STATUS,'reviewedAtSemantics':'Author self-review date against REVIEW_CHECKLIST_V2_20261105.md, not external or independent approval.','audience':'Adults 18+, original educational examples; no individualized financial advice.','sourceUse':'Source concepts inform the objectives. All scenarios, arithmetic, explanations and Picket interactions are original; no quotations, no imported US/EU legal rights.','publicationGate':{'publishable':False,'required':['Owner approval of the v2 self-review checklist (docs/learning/REVIEW_CHECKLIST_V2_20261105.md)','Independent financial-content review','Vietnamese editorial and accessibility review','Vietnam-relevant legal/safety review for borrowing, tax, insurance and digital safety','Re-verification of dated figures (tax, deposit insurance, social insurance) before each release','Pilot comprehension and Android font/TalkBack/offline checks','Approved English translation before claiming bilingual curriculum']},'stages':stages,'sourceRegistry':registry,'lessons':lessons}
    p=ROOT/'PICKET_FINANCIAL_CURRICULUM_VI_V1.json'
    editorial_metadata(payload)
    p.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    write_app_copy(payload, 'vi')
    lines=['# Picket — Giáo trình tài chính tiếng Việt v1','',f'Biên soạn ngày {DATE}; mở rộng và tự rà soát ngày {ext.EXTENSION_DATE}. **{ext.REVIEW_STATUS}**: chưa được người độc lập duyệt; chưa đủ điều kiện phát hành nội dung published.','', f'{len(lessons)} bài / {len(stages)} giai đoạn, dành cho người lớn từ 18 tuổi. Nội dung và tình huống VND do Picket biên soạn mới, không sao chép giáo trình nguồn. Nguồn quốc tế chỉ dùng cho khái niệm, không áp dụng quyền hoặc luật nước ngoài cho Việt Nam. Không khẳng định nguồn đã duyệt hoặc chứng thực Picket.','', 'JSON cùng tên là dữ liệu chuẩn của bản này. `correctIndex` bắt đầu từ 0; `reviewedAt` chỉ là ngày tác giả tự rà soát, không phải ngày phê duyệt độc lập. `workedExample.arithmeticChecks` là dữ liệu kiểm tra số học, không thực thi biểu thức trong ứng dụng. `citedFigures` ghi nguồn và ngày cho từng con số quy định.','', '## Cửa kiểm duyệt trước phát hành','', *['- '+x for x in payload['publicationGate']['required']], '', 'Thời lượng 3–5 phút chỉ là mục tiêu UX, chưa có đo thử. Số từ dưới đây đếm theo khoảng trắng tiếng Việt, không tương đương số từ vựng ngôn ngữ học.','']
    lines[2:2] = ['> [Trạng thái hiện hành](../PROJECT_STATUS.md). Bản biên tập 3 ngày 05/11/2026: lộ trình 4 giai đoạn, thêm 18 bài (13–30); giữ ID và đáp án quiz của 12 bài cũ. [Checklist tự rà soát](REVIEW_CHECKLIST_V2_20261105.md).', '']
    stage_titles={s['stageId']:s for s in stages}
    current=None
    for l in lessons:
        if l['stageId']!=current:
            current=l['stageId']; st=stage_titles[current]
            lines += [f"# Giai đoạn {st['order']}: {st['title']}",'',st['summary'],'']
        lines += [f"## {l['lessonId']} — Chương {l['chapterId'][-2:]}: {l['title']}",'',f"**Năng lực:** {l['competencyId']}  ",f"**Mục tiêu:** {l['objective']}  ",f"**Trạng thái:** {l['status']} · reviewedAt: {l['reviewedAt']} · {len(l['body'].split())} đơn vị cách trắng trong thân bài",'',l['body'],'','### Ví dụ và số học','',markdown_example(l['workedExample']['description'], 'vi'),'']
        for check in l['workedExample']['arithmeticChecks']: lines += [f"- `{check['expression']} = {check['expected']}`"]
        lines += ['','### Tình huống thực hành','']
        for i,q in enumerate(l['questions'],1):
            lines += [f"**{i}. {q['prompt']}**",'']
            for j,c in enumerate(q['choices']): lines += [f"- {chr(65+j)}. {c['text']} — {c['explanation']}"]
            lines += [f"Đáp án: **{chr(65+q['correctIndex'])}** (`correctIndex: {q['correctIndex']}`).",'']
        lines += ['### Hành động tự chọn','',l['optionalAction']['text']+' Có thể bỏ qua; không cần chi tiền, mở sản phẩm, cung cấp OTP hoặc gửi dữ liệu cho AI.','']
        if l.get('citedFigures'):
            lines += ['### Số liệu có nguồn và ngày','']+[f"- {f['claim']} — nguồn `{f['sourceId']}`, mốc {f['asOf']}" for f in l['citedFigures']]+['']
        lines += ['### Nguồn đã đọc','']+[f'- [Nguồn tham khảo]({u})' for u in l['sources']]+['']
    lines += ['## Kiểm tra bản biên soạn','',f'- Đủ {len(lessons)} bài, {question_count} câu hỏi, {question_count*3} lựa chọn có lời giải riêng.',f"- {sum(len(l['workedExample']['arithmeticChecks']) for l in lessons)} phép tính được chạy và so giá trị mong đợi bằng script đi kèm.",'- Tất cả ID duy nhất; mọi chỉ số đáp án thuộc 0–2.',f'- Nguồn bài 1–12 được mở đọc ngày {DATE}; nguồn mới của bài 13–30 được mở đọc ngày {ext.EXTENSION_DATE}. URL được lưu để kiểm tra lại trước phát hành.','- Chưa có người duyệt độc lập, người học pilot, nghiệm thu nội dung tiếng Anh hoặc xác nhận hiệu quả giáo dục thực tế.','']
    (ROOT/'PICKET_FINANCIAL_CURRICULUM_VI_V1.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps({'lessons':len(lessons),'questions':question_count,'explanations':question_count*3,'checks':sum(len(l['workedExample']['arithmeticChecks']) for l in lessons),'bodyWordCounts':[len(l['body'].split()) for l in lessons]},ensure_ascii=False))
