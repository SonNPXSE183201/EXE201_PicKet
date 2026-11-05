"""Curriculum extension v2 (2026-11-05): four-stage path and 18 new lessons.

Each new lesson is authored once with its Vietnamese (primary) and English
text side by side, sharing arithmetic checks, answer keys, sources and cited
figures. build_curriculum.py and build_curriculum_en.py read this module, so a
future lesson is added by appending one more ``lesson(...)`` call and placing
its ID in ``STAGE_ORDER``. Existing lesson IDs 01-12 and their answer keys are
defined in the original builders and must never change.
"""

EXTENSION_DATE = '2026-11-05'
REVIEW_STATUS = 'self-reviewed-pending-owner-approval'
REVIEW_TYPE = 'author-self-review-checklist-v2-not-independent'

# Sources opened and read on EXTENSION_DATE. Registry IDs are stable keys.
NEW_SOURCES = {
    'oecd-core-2016': ('https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf',
        'G20/OECD INFE Core Competencies Framework on Financial Literacy for Adults (July 2016): emergency savings, compound interest, inflation, diversification, scams, taxes. Competency framing only.'),
    'bhxh-rates': ('https://hanoi.baohiemxahoi.gov.vn/UserControls/Publishing/News/BinhLuan/pFormPrint.aspx?UrlListProcess=/content/tintuc/Lists/News&ItemID=35560&IsTA=False',
        'BHXH Ha Noi, 08/09/2025: employee share 10.5% (8% social insurance, 1.5% health, 1% unemployment). Contribution base and caps vary; example uses a base below the cap.'),
    'pit-law-2025': ('https://pbgdpl.cantho.gov.vn/tu-ngay-0172026-nhieu-diem-moi-cua-luat-thue-thu-nhap-ca-nhan-can-luu-y',
        'Can Tho legal-education portal: PIT Law 2025 effective 01/07/2026; 5-bracket monthly schedule 5/10/20/30/35% at 10/30/60/100 million VND; deductions 15.5m/6.2m. Statute text itself not opened.'),
    'pit-deduction-2026': ('https://hcc.nghean.gov.vn/tin-tong-hop/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-2448.html',
        'Nghe An public-service portal: Resolution 110/2025/UBTVQH15 adopted 17/10/2025, effective 01/01/2026, applies from tax period 2026: 15.5m VND/month taxpayer, 6.2m VND/month per dependant.'),
    'civil-interest-cap': ('https://baochinhphu.vn/huong-dan-ap-dung-phap-luat-ve-lai-suat-trong-giao-dich-dan-su-102248799.htm',
        'Government e-newspaper, 04/12/2018: Civil Code 2015 Article 468 caps agreed civil-loan interest at 20%/year unless another law provides otherwise; excess is void.'),
    'sbv-security': ('https://sbv.gov.vn/en/w/sbv624798',
        'State Bank of Vietnam, 31/03/2025: never share OTP/password/card data even with bank staff; banks stop sending links by SMS/email from 01/01/2025; official app stores only; do not grant Accessibility permission.'),
    'account-rental': ('https://xaydungchinhsach.chinhphu.vn/khuyen-cao-hoc-sinh-sinh-vien-khong-mo-tai-khoan-ngan-hang-de-cho-thue-cho-muon-ban-lai-119260310141959148.htm',
        'Police warning via Chinhphu.vn, 10/03/2026: do not open bank accounts to rent, lend or sell; do not hand over cards, OTP or SIM; may lead to administrative or criminal liability.'),
    'ssc-warning': ('https://xaydungchinhsach.chinhphu.vn/canh-bao-rui-ro-khi-tham-gia-san-giao-dich-chung-khoan-truc-tuyen-119220630163102206.htm',
        'State Securities Commission via Chinhphu.vn, 30/06/2022: be very cautious with offers of high returns; securities companies in Vietnam must be licensed; unregulated platforms are at the investor\'s own risk.'),
    'insurance-free-look': ('https://thoibaotaichinhvietnam.vn/nen-su-dung-dac-quyen-21-ngay-khi-mua-bao-hiem-nhan-tho-123293.html',
        'Ministry of Finance newspaper, 13/03/2023: Insurance Business Law 08/2022/QH15 Article 35 gives 21 days after receiving a life or health contract with a term over 1 year to reconsider.'),
    'consumer-law-2023': ('https://pbgdpl.cantho.gov.vn/bao-ve-tot-hon-quyen-loi-nguoi-tieu-dung',
        'Can Tho legal-education portal: Consumer Protection Law 2023 effective 01/07/2024; bans misleading information, harassment and coercion; refunds/exchanges when goods do not match commitments.'),
    'deposit-insurance-2026': ('https://vnba.org.vn/vi/han-muc-chi-tra-tien-bao-hiem-tien-gui-tang-len-350-trieu-dong-tu-ngay-13-7-2026-22749.htm',
        'Vietnam Banks Association, 17/07/2026: Circular 05/2026/TT-NHNN sets the deposit-insurance payout limit at 350m VND per person per participating institution (principal and interest) from 13/07/2026, replacing 125m VND (Decision 32/2021/QD-TTg). Circular text itself not opened.'),
}

STAGES = [
    {'stageId': 'stage-01-foundation', 'order': 1,
     'vi': ('Nền tảng', 'Biết tiền thực nhận, ghi chép đúng và chia tiền vào từng túi.'),
     'en': ('Foundation', 'Know your take-home pay, record accurately and give every amount a pocket.')},
    {'stageId': 'stage-02-stability', 'order': 2,
     'vi': ('Ổn định', 'Đặt mục tiêu, dựng quỹ dự phòng, đọc số dư và hiểu thuế từ tiền lương.'),
     'en': ('Stability', 'Set goals, build an emergency fund, read balances and understand tax on wages.')},
    {'stageId': 'stage-03-protection', 'order': 3,
     'vi': ('Bảo vệ', 'Hiểu chi phí vay, tránh lừa đảo, đọc hợp đồng bảo hiểm và dùng quyền người tiêu dùng.'),
     'en': ('Protection', 'Understand borrowing costs, avoid scams, read insurance contracts and use consumer rights.')},
    {'stageId': 'stage-04-growth', 'order': 4,
     'vi': ('Phát triển', 'Hiểu lãi kép, tiền gửi, lạm phát, rủi ro và cách rà soát định kỳ.'),
     'en': ('Growth', 'Understand compounding, deposits, inflation, risk and periodic reviews.')},
]

# Display/learning order. Numbers are the lesson suffix (picket.vi.financial.v1.NN).
STAGE_ORDER = {
    'stage-01-foundation': [13, 1, 2, 14, 3, 15, 4],
    'stage-02-stability': [16, 6, 5, 17, 7, 8, 18],
    'stage-03-protection': [9, 10, 19, 20, 11, 21, 23, 12, 25],
    'stage-04-growth': [26, 27, 24, 28, 29, 22, 30],
}

NEW_LESSONS = []


def lesson(n, stage, chapter, competency, sources, checks, correct, support_checks, vi, en, figures=()):
    NEW_LESSONS.append(dict(n=n, stage=stage, chapter=chapter, competency=competency, sources=sources,
                            checks=checks, correct=correct, support_checks=support_checks, vi=vi, en=en,
                            figures=list(figures)))


def fig(claim, source_id, as_of):
    """A dated, language-neutral figure with exactly one supporting source."""
    return {'claim': claim, 'sourceId': source_id, 'asOf': as_of}


# ---------------------------------------------------------------- Stage 1
lesson(13, 'stage-01-foundation', 7, 'income.gross-to-net', ['bhxh-rates', 'pit-deduction-2026', 'oecd-core-2016'],
    [('12000000*105/1000', 1260000), ('12000000-1260000', 10740000)], [1, 0, 2],
    [('16000000*105/1000', 1680000), ('16000000-1680000', 14320000)],
    figures=[fig('Employee mandatory insurance share 10.5% = 8% social + 1.5% health + 1% unemployment', 'bhxh-rates', '2025-09-08'),
             fig('Personal PIT deduction 15,500,000 VND/month from tax period 2026', 'pit-deduction-2026', '2026-01-01')],
    vi=dict(title='Lương gộp và tiền thực nhận',
        objective='Đọc phiếu lương, tách các khoản trừ và lập kế hoạch từ tiền thực nhận.',
        body='''
Lương ghi trong hợp đồng thường là lương gộp. Tiền về tài khoản là tiền thực nhận. Ở giữa là các khoản trừ, như bảo hiểm bắt buộc và thuế thu nhập cá nhân nếu có. Kế hoạch chi tiêu nên bắt đầu từ tiền thực nhận, vì đó là số bạn thật sự dùng được.

Với người lao động thuộc diện đóng bảo hiểm bắt buộc, phần người lao động đóng thường là 10,5% tiền lương làm căn cứ đóng. Trong đó có 8% bảo hiểm xã hội, 1,5% bảo hiểm y tế và 1% bảo hiểm thất nghiệp. Bảo hiểm xã hội Hà Nội nêu các tỷ lệ này ngày 8/9/2025. Lương làm căn cứ đóng có thể khác lương gộp và có mức trần, nên hãy xem phiếu lương thay vì tự đoán.

Ví dụ hư cấu: Lan có lương gộp 12.000.000đ, cũng là lương đóng bảo hiểm. Khoản bảo hiểm là 12.000.000 × 10,5% = 1.260.000đ. Phần còn lại là 10.740.000đ. Số này thấp hơn mức giảm trừ bản thân 15.500.000đ mỗi tháng áp dụng từ kỳ tính thuế 2026, nên trong ví dụ Lan chưa phát sinh thuế từ tiền lương. Tiền thực nhận là 10.740.000đ.

Thưởng, làm thêm giờ hoặc nhận lương từ nhiều nơi có thể làm phép tính khác. Bài này giúp bạn đọc phiếu lương. Số thuế thật phụ thuộc quy định hiện hành và chứng từ của bạn.
''',
        example='12.000.000 × 10,5% = 1.260.000đ bảo hiểm; 12.000.000 − 1.260.000 = 10.740.000đ. Số này thấp hơn mức giảm trừ bản thân nên thu nhập tính thuế trong ví dụ bằng 0.',
        questions=[
            ('Nên lập ngân sách tháng dựa trên số nào?', ['Lương gộp trong hợp đồng', 'Tiền thực nhận sau các khoản trừ', 'Lương gộp cộng thưởng dự kiến'],
             ['Lương gộp chưa trừ bảo hiểm và thuế nên lớn hơn số tiền bạn dùng được.', 'Đúng: đây là số tiền thực sự về tài khoản.', 'Thưởng chưa nhận là giả định, không nên tính như tiền đã có.']),
            ('Lương đóng bảo hiểm 10.000.000đ, phần người lao động 10,5%. Khoản trừ bảo hiểm là bao nhiêu?', ['1.050.000đ', '105.000đ', '10.500.000đ'],
             ['Đúng: 10.000.000 × 10,5% = 1.050.000đ.', 'Đây là 1,05%, sai một chữ số thập phân.', 'Số này lớn hơn cả tiền lương, không thể là khoản trừ.']),
            ('Phiếu lương ghi khoản trừ khác với phép tính của bạn. Nên làm gì?', ['Bỏ qua vì chênh lệch nhỏ', 'Coi phép tính của mình luôn đúng', 'Hỏi bộ phận trả lương và đối chiếu lương làm căn cứ đóng'],
             ['Chênh lệch có thể do căn cứ đóng hoặc khoản khác; cần hiểu lý do.', 'Lương làm căn cứ đóng có thể khác lương gộp.', 'Đúng: hỏi đúng nơi và đối chiếu căn cứ trước khi kết luận.']),
        ],
        action='Nếu có phiếu lương gần nhất, ghi tiền thực nhận làm thu nhập kế hoạch trong Picket. Không cần chụp hay tải phiếu lương lên.',
        support=dict(keyTakeaways=['Lập kế hoạch từ tiền thực nhận, không từ lương gộp.', 'Phần bảo hiểm bắt buộc người lao động đóng thường là 10,5% lương làm căn cứ đóng.', 'Thuế từ tiền lương chỉ phát sinh khi thu nhập sau bảo hiểm vượt các khoản giảm trừ.'],
            misconception='Nghĩ rằng con số trong hợp đồng là số tiền sẽ về tài khoản mỗi tháng.',
            practicePrompt='Minh có lương đóng bảo hiểm 16.000.000đ, không có người phụ thuộc và không có thu nhập khác. Tính khoản bảo hiểm 10,5% và tiền thực nhận.',
            solutionSteps=['Bảo hiểm: 16.000.000 × 10,5% = 1.680.000đ.', 'Còn lại: 16.000.000 − 1.680.000 = 14.320.000đ.', 'Số 14.320.000đ thấp hơn mức giảm trừ bản thân 15.500.000đ nên chưa phát sinh thuế trong giả định này.'],
            answer='Khoản bảo hiểm là 1.680.000đ và tiền thực nhận là 14.320.000đ trong giả định của bài.')),
    en=dict(title='Gross pay and take-home pay',
        objective='Read a payslip, separate the deductions and plan from take-home pay.',
        body='''
The salary in a contract is usually gross pay. The money reaching your account is take-home pay. In between are deductions, such as mandatory insurance and personal income tax if any. A spending plan should start from take-home pay, because that is the money you can actually use.

For employees covered by mandatory insurance, the employee share is usually 10.5% of the contribution salary. It is made up of 8% social insurance, 1.5% health insurance and 1% unemployment insurance. Hanoi Social Security stated these rates on 8 September 2025. The contribution salary can differ from gross pay and has a cap, so check your payslip instead of guessing.

A fictional example: Lan earns a gross salary of 12,000,000 VND, which is also the contribution salary. Insurance is 12,000,000 × 10.5% = 1,260,000 VND. The remainder is 10,740,000 VND. This is below the personal deduction of 15,500,000 VND per month applied from the 2026 tax period, so in this example Lan owes no tax on wages. Take-home pay is 10,740,000 VND.

Bonuses, overtime or wages from several employers can change the calculation. This lesson helps you read a payslip. Actual tax depends on current rules and your own documents.
''',
        example='12,000,000 × 10.5% = 1,260,000 VND insurance; 12,000,000 − 1,260,000 = 10,740,000 VND. This is below the personal deduction, so taxable income in the example is 0.',
        questions=[
            ('Which amount should a monthly budget start from?', ['Gross pay in the contract', 'Take-home pay after deductions', 'Gross pay plus an expected bonus'],
             ['Gross pay has not had insurance and tax removed, so it is larger than what you can use.', 'Correct: this is the money that actually reaches your account.', 'An unpaid bonus is an assumption, not money you already have.']),
            ('The contribution salary is 10,000,000 VND and the employee share is 10.5%. What is the insurance deduction?', ['1,050,000 VND', '105,000 VND', '10,500,000 VND'],
             ['Correct: 10,000,000 × 10.5% = 1,050,000 VND.', 'This is 1.05%, one decimal place off.', 'This is larger than the salary, so it cannot be the deduction.']),
            ('Your payslip shows a deduction that differs from your own calculation. What should you do?', ['Ignore it because the gap is small', 'Assume your own calculation is always right', 'Ask the payroll team and check the contribution salary'],
             ['The gap may come from the contribution base or another item; find the reason.', 'The contribution salary can differ from gross pay.', 'Correct: ask the right place and check the base before concluding.']),
        ],
        action='If you have a recent payslip, enter take-home pay as planned income in Picket. You do not need to photograph or upload the payslip.',
        support=dict(keyTakeaways=['Plan from take-home pay, not gross pay.', 'The employee share of mandatory insurance is usually 10.5% of the contribution salary.', 'Tax on wages arises only when income after insurance exceeds the deductions.'],
            misconception='Believing the number in the contract is what will arrive in your account each month.',
            practicePrompt='Minh has a contribution salary of 16,000,000 VND, no dependants and no other income. Work out the 10.5% insurance deduction and take-home pay.',
            solutionSteps=['Insurance: 16,000,000 × 10.5% = 1,680,000 VND.', 'Remainder: 16,000,000 − 1,680,000 = 14,320,000 VND.', '14,320,000 VND is below the 15,500,000 VND personal deduction, so no tax arises under these assumptions.'],
            answer='Insurance is 1,680,000 VND and take-home pay is 14,320,000 VND under the lesson assumptions.')))

lesson(14, 'stage-01-foundation', 7, 'budgeting.fixed-variable-annual', ['spending', 'bills', 'saving'],
    [('3000000+220000', 3220000), ('1200000+2400000', 3600000), ('3600000/12', 300000), ('3220000+2500000+300000', 6020000)], [1, 0, 2],
    [('2400000/6', 400000), ('900000/3', 300000), ('400000+300000', 700000)],
    vi=dict(title='Chi cố định, chi biến đổi và khoản theo năm',
        objective='Chia chi tiêu thành ba nhóm và quy khoản theo năm về mức dành mỗi tháng.',
        body='''
Không phải khoản chi nào cũng giống nhau. Chi cố định gần như không đổi mỗi tháng, như tiền phòng hay internet. Chi biến đổi lên xuống theo cách bạn sống, như ăn uống và đi lại. Khoản theo năm chỉ đến một hoặc vài lần mỗi năm, như học phí, phí gia hạn hay quà Tết. Khoản theo năm hay bị quên, rồi xuất hiện như một cú sốc dù năm nào cũng có.

Ví dụ hư cấu: Tú trả tiền phòng 3.000.000đ và internet 220.000đ. Chi cố định là 3.220.000đ. Ăn uống trung bình 2.500.000đ. Mỗi năm Tú có phí khóa học 1.200.000đ và quà Tết dự kiến 2.400.000đ, tổng 3.600.000đ. Chia cho 12 tháng, Tú cần dành 300.000đ mỗi tháng. Kế hoạch tháng là 3.220.000 + 2.500.000 + 300.000 = 6.020.000đ.

Chi biến đổi nên dùng số trung bình từ giao dịch thật, không phải con số mong muốn. Khoản theo năm có thể chưa biết chính xác; hãy ghi là ước tính và sửa khi có giá thật.

Khi tháng có khoản lớn đến, tiền đã có sẵn trong túi dành dần. Tháng đó không cần vay hay cắt nhu cầu thiết yếu.
''',
        example='Cố định: 3.000.000 + 220.000 = 3.220.000đ. Theo năm: 1.200.000 + 2.400.000 = 3.600.000đ; 3.600.000 / 12 = 300.000đ/tháng. Kế hoạch: 3.220.000 + 2.500.000 + 300.000 = 6.020.000đ.',
        questions=[
            ('Tiền điện mỗi tháng dao động 300.000–500.000đ. Khoản này thuộc nhóm nào?', ['Cố định tuyệt đối', 'Định kỳ nhưng biến đổi', 'Khoản theo năm'],
             ['Số tiền thay đổi mỗi tháng nên không cố định tuyệt đối.', 'Đúng: đến hằng tháng nhưng số tiền thay đổi.', 'Khoản này đến mỗi tháng, không phải mỗi năm.']),
            ('Một khoản 1.800.000đ đến hạn mỗi năm. Dành đều trong 12 tháng thì mỗi tháng là bao nhiêu?', ['150.000đ', '180.000đ', '1.800.000đ'],
             ['Đúng: 1.800.000 / 12 = 150.000đ.', 'Đây là chia cho 10, không phải 12.', 'Đây là cả khoản năm, không phải phần mỗi tháng.']),
            ('Tháng có Tết, chi tăng mạnh. Cách ghi nhận phù hợp là gì?', ['Coi là bất ngờ dù năm nào cũng có', 'Bỏ ra khỏi sổ để tháng trông gọn', 'Đưa vào kế hoạch năm và dành dần từ trước'],
             ['Khoản lặp lại hằng năm có thể dự kiến được.', 'Bỏ khỏi sổ làm số liệu sai.', 'Đúng: biết trước thì dành dần trước.']),
        ],
        action='Trong Picket, thêm một khoản theo năm vào mục Hóa đơn với ngày đến hạn, rồi tạo một túi ngân sách nhỏ cho phần dành mỗi tháng.',
        support=dict(keyTakeaways=['Chi cố định ít đổi, chi biến đổi lên xuống, khoản theo năm đến thưa nhưng lặp lại.', 'Chia khoản theo năm cho số tháng còn lại để biết mức dành mỗi tháng.', 'Dùng số trung bình từ giao dịch thật cho chi biến đổi.'],
            misconception='Coi học phí hay quà Tết là chi phí bất ngờ chỉ vì không đến mỗi tháng.',
            practicePrompt='Học phí ngoại ngữ 2.400.000đ đến hạn sau 6 tháng. Phí thành viên phòng tập 900.000đ đến hạn sau 3 tháng. Mỗi tháng cần dành bao nhiêu cho cả hai?',
            solutionSteps=['Học phí: 2.400.000 / 6 = 400.000đ mỗi tháng.', 'Phòng tập: 900.000 / 3 = 300.000đ mỗi tháng.', 'Cộng lại: 400.000 + 300.000 = 700.000đ mỗi tháng trong 3 tháng đầu.'],
            answer='Ba tháng đầu cần dành 700.000đ mỗi tháng; sau khi trả phí phòng tập, chỉ còn 400.000đ cho học phí.')),
    en=dict(title='Fixed costs, variable costs and annual costs',
        objective='Sort spending into three groups and convert annual costs into a monthly amount to set aside.',
        body='''
Not every expense behaves the same way. Fixed costs barely change each month, such as rent or internet. Variable costs rise and fall with how you live, such as food and transport. Annual costs arrive once or a few times a year, such as tuition, renewal fees or Tết gifts. Annual costs are easy to forget, then feel like a shock even though they come every year.

A fictional example: Tú pays rent of 3,000,000 VND and internet of 220,000 VND. Fixed costs are 3,220,000 VND. Food averages 2,500,000 VND. Each year Tú has a course fee of 1,200,000 VND and expected Tết gifts of 2,400,000 VND, a total of 3,600,000 VND. Divided over 12 months, Tú needs to set aside 300,000 VND each month. The monthly plan is 3,220,000 + 2,500,000 + 300,000 = 6,020,000 VND.

Variable costs should use an average from real transactions, not a hoped-for number. An annual cost may not be known exactly; record it as an estimate and update it when the real price is known.

When a month with a large cost arrives, the money is already waiting in the pocket you filled gradually. That month you do not need to borrow or cut essentials.
''',
        example='Fixed: 3,000,000 + 220,000 = 3,220,000 VND. Annual: 1,200,000 + 2,400,000 = 3,600,000 VND; 3,600,000 / 12 = 300,000 VND per month. Plan: 3,220,000 + 2,500,000 + 300,000 = 6,020,000 VND.',
        questions=[
            ('Electricity varies between 300,000–500,000 VND each month. Which group is it?', ['Strictly fixed', 'Recurring but variable', 'Annual cost'],
             ['The amount changes each month, so it is not strictly fixed.', 'Correct: it comes monthly but the amount varies.', 'It comes every month, not once a year.']),
            ('A 1,800,000 VND cost is due each year. Setting aside evenly over 12 months, how much is that per month?', ['150,000 VND', '180,000 VND', '1,800,000 VND'],
             ['Correct: 1,800,000 / 12 = 150,000 VND.', 'This divides by 10, not 12.', 'This is the whole annual amount, not the monthly part.']),
            ('Spending jumps in the month of Tết. How should it be handled?', ['Treat it as a surprise even though it happens every year', 'Leave it out of the records so the month looks tidy', 'Put it in the annual plan and set money aside beforehand'],
             ['A cost that repeats every year can be anticipated.', 'Leaving it out makes the records wrong.', 'Correct: if you know it is coming, set aside in advance.']),
        ],
        action='In Picket, add one annual cost under Bills with its due date, then create a small budget pocket for the monthly amount.',
        support=dict(keyTakeaways=['Fixed costs rarely change, variable costs fluctuate, annual costs are infrequent but recurring.', 'Divide an annual cost by the months remaining to find the monthly amount.', 'Use averages from real transactions for variable costs.'],
            misconception='Treating tuition or Tết gifts as unexpected just because they do not come every month.',
            practicePrompt='Language-class tuition of 2,400,000 VND is due in 6 months. A gym membership of 900,000 VND is due in 3 months. How much is needed each month for both?',
            solutionSteps=['Tuition: 2,400,000 / 6 = 400,000 VND per month.', 'Gym: 900,000 / 3 = 300,000 VND per month.', 'Together: 400,000 + 300,000 = 700,000 VND per month for the first 3 months.'],
            answer='Set aside 700,000 VND per month for the first three months; after the gym fee is paid, only 400,000 VND for tuition remains.')))

lesson(15, 'stage-01-foundation', 7, 'budgeting.pocket-allocation', ['cashflow', 'spending', 'oecd'],
    [('3500000+2800000+700000+600000+1000000+300000', 8900000), ('10000000-8900000', 1100000), ('1100000-400000', 700000)], [0, 1, 1],
    [('3000000+2500000+800000+700000', 7000000), ('9000000-7000000', 2000000), ('2000000-1200000-800000', 0)],
    vi=dict(title='Chia tiền vào túi: mỗi đồng có một việc',
        objective='Phân bổ toàn bộ tiền thực nhận vào các túi và điều chỉnh giữa các túi mà không làm sai tổng.',
        body='''
Ngân sách theo túi bắt đầu bằng một câu hỏi: tiền tháng này sẽ làm những việc gì? Bạn chia tiền thực nhận vào từng túi như nhà ở, ăn uống, đi lại, hóa đơn, dự phòng và khoản theo năm. Khi tổng các túi bằng tiền thực nhận, mỗi đồng đã có một việc. Phần chưa giao việc dễ bị tiêu mà không ai để ý.

Ví dụ hư cấu: Hưng thực nhận 10.000.000đ. Hưng chia nhà ở 3.500.000đ, ăn uống 2.800.000đ, đi lại 700.000đ, hóa đơn 600.000đ, dự phòng 1.000.000đ và khoản theo năm 300.000đ. Tổng là 8.900.000đ. Còn 1.100.000đ chưa có việc, nên Hưng đặt vào túi linh hoạt. Giữa tháng, ăn uống vượt 400.000đ. Hưng chuyển 400.000đ từ túi linh hoạt sang túi ăn uống. Túi linh hoạt còn 700.000đ. Tổng tiền không đổi; chỉ kế hoạch được sửa có chủ ý.

Không có một tỷ lệ chia túi đúng cho mọi người. Người nuôi con, người trả nợ hay người có thu nhập không đều sẽ cần cách chia khác. Điều quan trọng là tổng các túi không vượt số tiền thật sự có.

Chuyển giữa các túi không phải thất bại. Đó là cách kế hoạch theo kịp cuộc sống.
''',
        example='Tổng túi: 3.500.000 + 2.800.000 + 700.000 + 600.000 + 1.000.000 + 300.000 = 8.900.000đ. Chưa giao việc: 10.000.000 − 8.900.000 = 1.100.000đ. Sau khi chuyển: 1.100.000 − 400.000 = 700.000đ.',
        questions=[
            ('Thực nhận 8.000.000đ, đã chia 7.400.000đ vào các túi. Phần chưa giao việc là bao nhiêu?', ['600.000đ', '7.400.000đ', '0đ'],
             ['Đúng: 8.000.000 − 7.400.000 = 600.000đ.', 'Đây là phần đã chia, không phải phần còn lại.', 'Vẫn còn tiền chưa có túi.']),
            ('Túi ăn uống vượt 200.000đ. Cách xử lý nhất quán là gì?', ['Xóa giao dịch vượt cho khớp', 'Chuyển 200.000đ từ một túi linh hoạt và ghi lý do', 'Tăng thu nhập trên giấy'],
             ['Xóa giao dịch thật làm sổ sai.', 'Đúng: tổng giữ nguyên, kế hoạch được sửa có chủ ý.', 'Thu nhập không tăng chỉ vì sửa con số.']),
            ('Có một tỷ lệ chia túi bắt buộc cho mọi người không?', ['Có, ai cũng phải theo cùng tỷ lệ', 'Không, cách chia tùy hoàn cảnh; tổng các túi phải khớp tiền thực có', 'Có, nếu ứng dụng gợi ý'],
             ['Hoàn cảnh mỗi người khác nhau.', 'Đúng: điều kiện cốt lõi là tổng các túi không vượt tiền thật.', 'Gợi ý chỉ là điểm bắt đầu, không phải quy định.']),
        ],
        action='Mở các túi ngân sách trong Picket và kiểm tra tổng hạn mức có vượt tiền thực nhận dự kiến không. Có thể chỉ xem mà không sửa.',
        support=dict(keyTakeaways=['Chia toàn bộ tiền thực nhận vào túi để không còn phần trôi nổi.', 'Chuyển giữa các túi giữ nguyên tổng tiền.', 'Tỷ lệ chia phụ thuộc hoàn cảnh riêng.'],
            misconception='Nghĩ rằng chuyển tiền giữa các túi nghĩa là ngân sách đã hỏng.',
            practicePrompt='Thực nhận 9.000.000đ. Đã chia nhà ở 3.000.000đ, ăn uống 2.500.000đ, đi lại 800.000đ, dự phòng 700.000đ. Phần còn lại được chia 1.200.000đ cho mục tiêu học và phần còn lại cho túi linh hoạt. Kiểm tra phần chưa giao việc.',
            solutionSteps=['Đã chia: 3.000.000 + 2.500.000 + 800.000 + 700.000 = 7.000.000đ.', 'Còn: 9.000.000 − 7.000.000 = 2.000.000đ.', 'Sau khi chia: 2.000.000 − 1.200.000 − 800.000 = 0đ.'],
            answer='Túi linh hoạt nhận 800.000đ và phần chưa giao việc bằng 0đ.')),
    en=dict(title='Pocket budgeting: every amount has a job',
        objective='Allocate all take-home pay to pockets and adjust between pockets without breaking the total.',
        body='''
A pocket budget starts with one question: what jobs will this month's money do? You divide take-home pay into pockets such as housing, food, transport, bills, emergencies and annual costs. When the pockets add up to take-home pay, every amount has a job. Money without a job is easy to spend without noticing.

A fictional example: Hưng takes home 10,000,000 VND. Hưng allocates housing 3,500,000 VND, food 2,800,000 VND, transport 700,000 VND, bills 600,000 VND, emergencies 1,000,000 VND and annual costs 300,000 VND. The total is 8,900,000 VND. That leaves 1,100,000 VND without a job, so Hưng puts it in a flexible pocket. Mid-month, food runs over by 400,000 VND. Hưng moves 400,000 VND from the flexible pocket to food. The flexible pocket has 700,000 VND left. The total money is unchanged; only the plan was adjusted on purpose.

There is no single split that suits everyone. Someone raising children, repaying debt or earning irregularly will divide money differently. What matters is that the pockets never exceed the money you actually have.

Moving money between pockets is not failure. It is how a plan keeps up with life.
''',
        example='Pockets: 3,500,000 + 2,800,000 + 700,000 + 600,000 + 1,000,000 + 300,000 = 8,900,000 VND. Unassigned: 10,000,000 − 8,900,000 = 1,100,000 VND. After the move: 1,100,000 − 400,000 = 700,000 VND.',
        questions=[
            ('Take-home pay is 8,000,000 VND and 7,400,000 VND is in pockets. How much has no job yet?', ['600,000 VND', '7,400,000 VND', '0 VND'],
             ['Correct: 8,000,000 − 7,400,000 = 600,000 VND.', 'This is the allocated part, not the remainder.', 'Some money still has no pocket.']),
            ('The food pocket is over by 200,000 VND. What is the consistent fix?', ['Delete the extra transaction so it matches', 'Move 200,000 VND from a flexible pocket and note why', 'Raise income on paper'],
             ['Deleting a real transaction makes the records wrong.', 'Correct: the total stays the same and the plan changes on purpose.', 'Income does not grow because a number is edited.']),
            ('Is there one mandatory split that everyone must use?', ['Yes, everyone must follow the same ratios', 'No; the split depends on circumstances, but pockets must match the money you have', 'Yes, if an app suggests it'],
             ['Everyone\'s circumstances differ.', 'Correct: the core rule is that pockets do not exceed real money.', 'A suggestion is a starting point, not a rule.']),
        ],
        action='Open your budget pockets in Picket and check whether their total exceeds expected take-home pay. You may just look without editing.',
        support=dict(keyTakeaways=['Allocate all take-home pay to pockets so nothing drifts.', 'Moving between pockets keeps the total unchanged.', 'The right split depends on your own circumstances.'],
            misconception='Thinking that moving money between pockets means the budget has failed.',
            practicePrompt='Take-home pay is 9,000,000 VND. Housing 3,000,000 VND, food 2,500,000 VND, transport 800,000 VND and emergencies 700,000 VND are allocated. The rest goes 1,200,000 VND to a study goal and the remainder to a flexible pocket. Check what is unassigned.',
            solutionSteps=['Allocated: 3,000,000 + 2,500,000 + 800,000 + 700,000 = 7,000,000 VND.', 'Left: 9,000,000 − 7,000,000 = 2,000,000 VND.', 'After allocating: 2,000,000 − 1,200,000 − 800,000 = 0 VND.'],
            answer='The flexible pocket receives 800,000 VND and nothing is left unassigned.')))

# ---------------------------------------------------------------- Stage 2
lesson(16, 'stage-02-stability', 8, 'goals.specific-and-prioritised', ['goals', 'saving', 'oecd-core-2016'],
    [('6000000/12', 500000), ('9000000/12', 750000), ('500000+750000', 1250000), ('1500000-1250000', 250000)], [1, 1, 0],
    [('4800000/8', 600000), ('4800000/400000', 12)],
    vi=dict(title='Viết mục tiêu rõ ràng và xếp thứ tự',
        objective='Viết mục tiêu có số tiền, thời hạn và cách theo dõi; xếp thứ tự khi tiền không đủ cho tất cả.',
        body='''
"Tiết kiệm nhiều hơn" là một mong muốn. Một mục tiêu rõ hơn trả lời được: bao nhiêu tiền, để làm gì, đến khi nào và theo dõi bằng cách nào. Mục tiêu cũng cần thực tế với thu nhập hiện tại. Nếu không, bạn dễ bỏ cuộc sau vài tuần.

Khi có nhiều mục tiêu, hãy xếp thứ tự. Nhiều người đặt trước một khoản dự phòng nhỏ và việc trả đúng hạn các hóa đơn thiết yếu. Sau đó mới đến các món mua lớn tùy chọn. Đây là cách sắp xếp phổ biến, không phải quy tắc bắt buộc.

Ví dụ hư cấu: Ngọc dư 1.500.000đ mỗi tháng. Ngọc muốn có 6.000.000đ dự phòng và 9.000.000đ mua máy tính, cả hai trong 12 tháng. Dự phòng cần 6.000.000 / 12 = 500.000đ mỗi tháng. Máy tính cần 9.000.000 / 12 = 750.000đ mỗi tháng. Tổng là 1.250.000đ. Ngọc còn 250.000đ cho việc khác. Nếu số dư hằng tháng giảm, Ngọc giữ phần dự phòng trước và dời hạn mục tiêu máy tính.

Viết mục tiêu ra giúp bạn thấy xung đột sớm. Sửa thời hạn khi hoàn cảnh đổi là điều bình thường.
''',
        example='6.000.000 / 12 = 500.000đ; 9.000.000 / 12 = 750.000đ; 500.000 + 750.000 = 1.250.000đ; 1.500.000 − 1.250.000 = 250.000đ còn lại.',
        questions=[
            ('Mục tiêu nào rõ ràng nhất?', ['Tiết kiệm nhiều hơn', 'Dành 3.000.000đ cho khóa học trong 10 tháng, xem lại mỗi tháng', 'Sau này mua một món gì đó'],
             ['Không có số tiền hay thời hạn.', 'Đúng: có số tiền, mục đích, thời hạn và cách theo dõi.', 'Không đo được tiến độ.']),
            ('Hai mục tiêu cần 400.000đ và 700.000đ mỗi tháng; bạn dư 900.000đ. Điều nào đúng?', ['Đủ cho cả hai', 'Thiếu 200.000đ, cần dời hạn hoặc giảm một mục tiêu', 'Thiếu 1.100.000đ'],
             ['400.000 + 700.000 = 1.100.000đ, lớn hơn 900.000đ.', 'Đúng: 1.100.000 − 900.000 = 200.000đ.', '1.100.000đ là tổng cần, không phải phần thiếu.']),
            ('Trước một món mua lớn tùy chọn, ưu tiên nào thường hợp lý?', ['Một khoản dự phòng nhỏ và trả đúng hạn hóa đơn thiết yếu', 'Món mua lớn vì giá có thể tăng', 'Vay thêm để làm cả hai cùng lúc'],
             ['Đúng: giảm rủi ro trễ hạn và có đệm cho việc bất ngờ.', 'Giá có thể tăng không làm món đó thành thiết yếu.', 'Vay thêm tạo nghĩa vụ mới và chi phí lãi.']),
        ],
        action='Trong Picket, viết lại một mục tiêu có số tiền và thời hạn, rồi tạo một túi để theo dõi. Có thể chỉ viết ra giấy nếu chưa muốn tạo túi.',
        support=dict(keyTakeaways=['Mục tiêu rõ có số tiền, mục đích, thời hạn và cách theo dõi.', 'Cộng mức góp của mọi mục tiêu để thấy xung đột.', 'Khi thiếu tiền, dời hạn hoặc giảm mục tiêu thay vì vay thêm.'],
            misconception='Nghĩ rằng đổi thời hạn mục tiêu nghĩa là đã thất bại.',
            practicePrompt='Mục tiêu 4.800.000đ trong 8 tháng. Mỗi tháng cần bao nhiêu? Nếu chỉ dành được 400.000đ mỗi tháng thì cần mấy tháng?',
            solutionSteps=['Mức góp theo kế hoạch: 4.800.000 / 8 = 600.000đ mỗi tháng.', 'Với 400.000đ mỗi tháng: 4.800.000 / 400.000 = 12 tháng.', 'Thời hạn đổi từ 8 lên 12 tháng; số tiền mục tiêu giữ nguyên.'],
            answer='Cần 600.000đ mỗi tháng trong 8 tháng, hoặc 12 tháng nếu chỉ góp 400.000đ.')),
    en=dict(title='Write clear goals and put them in order',
        objective='Write goals with an amount, a deadline and a way to track them; prioritise when money cannot cover all of them.',
        body='''
"Save more" is a wish. A clearer goal answers: how much, for what, by when, and how will you track it? A goal also needs to be realistic for your current income. Otherwise it is easy to give up after a few weeks.

When there are several goals, put them in order. Many people first build a small emergency reserve and keep essential bills paid on time. Optional large purchases come after that. This is a common ordering, not a mandatory rule.

A fictional example: Ngọc has 1,500,000 VND left each month. Ngọc wants 6,000,000 VND for emergencies and 9,000,000 VND for a computer, both within 12 months. The emergency goal needs 6,000,000 / 12 = 500,000 VND per month. The computer needs 9,000,000 / 12 = 750,000 VND per month. The total is 1,250,000 VND. Ngọc has 250,000 VND left for other things. If the monthly surplus falls, Ngọc keeps the emergency amount first and moves the computer deadline.

Writing goals down shows conflicts early. Changing a deadline when circumstances change is normal.
''',
        example='6,000,000 / 12 = 500,000 VND; 9,000,000 / 12 = 750,000 VND; 500,000 + 750,000 = 1,250,000 VND; 1,500,000 − 1,250,000 = 250,000 VND left.',
        questions=[
            ('Which goal is clearest?', ['Save more', 'Set aside 3,000,000 VND for a course in 10 months, reviewing monthly', 'Buy something someday'],
             ['There is no amount or deadline.', 'Correct: it has an amount, purpose, deadline and a way to track.', 'Progress cannot be measured.']),
            ('Two goals need 400,000 VND and 700,000 VND per month; you have 900,000 VND spare. What is true?', ['Enough for both', 'Short by 200,000 VND; move a deadline or reduce a goal', 'Short by 1,100,000 VND'],
             ['400,000 + 700,000 = 1,100,000 VND, which is more than 900,000 VND.', 'Correct: 1,100,000 − 900,000 = 200,000 VND.', '1,100,000 VND is the total needed, not the shortfall.']),
            ('Before an optional large purchase, which priority is usually sensible?', ['A small emergency reserve and paying essential bills on time', 'The large purchase because prices may rise', 'Borrow more to do both at once'],
             ['Correct: it lowers the risk of late payments and gives a buffer for surprises.', 'A possible price rise does not make an item essential.', 'Borrowing more creates a new obligation and interest cost.']),
        ],
        action='In Picket, rewrite one goal with an amount and a deadline, then create a pocket to track it. You can write it on paper if you do not want a pocket yet.',
        support=dict(keyTakeaways=['A clear goal has an amount, purpose, deadline and tracking method.', 'Add up the monthly amounts for all goals to spot conflicts.', 'When money is short, move deadlines or shrink goals rather than borrowing.'],
            misconception='Believing that changing a goal deadline means you have failed.',
            practicePrompt='A goal of 4,800,000 VND in 8 months. How much is needed per month? If only 400,000 VND per month is possible, how many months are needed?',
            solutionSteps=['Planned amount: 4,800,000 / 8 = 600,000 VND per month.', 'At 400,000 VND per month: 4,800,000 / 400,000 = 12 months.', 'The deadline moves from 8 to 12 months; the goal amount stays the same.'],
            answer='600,000 VND per month for 8 months, or 12 months at 400,000 VND.')))

lesson(17, 'stage-02-stability', 8, 'resilience.emergency-fund-sizing', ['emergency', 'oecd-core-2016', 'cashflow'],
    [('2500000+2000000+500000+500000', 5500000), ('5500000*3', 16500000), ('5500000/1100000', 5)], [1, 2, 0],
    [('6000000*2', 12000000), ('(12000000-3000000)/1500000', 6)],
    vi=dict(title='Xây quỹ dự phòng theo từng mốc',
        objective='Tính chi thiết yếu mỗi tháng, chọn mốc dự phòng theo hoàn cảnh và tính thời gian đạt mốc.',
        body='''
Quỹ dự phòng giúp bạn đối phó khi mất thu nhập hoặc gặp việc gấp mà không phải vay. Cách tính dễ hiểu là đo bằng số tháng chi thiết yếu. Chi thiết yếu gồm những khoản bạn vẫn phải trả nếu thu nhập dừng lại: nhà ở, ăn uống cơ bản, đi lại, hóa đơn và khoản trả nợ tối thiểu.

Không có số tháng đúng cho mọi người. Người có thu nhập không đều, có người phụ thuộc hoặc làm trong ngành dễ biến động thường cần đệm lớn hơn. Bạn có thể bắt đầu bằng một mốc nhỏ, rồi nâng dần.

Ví dụ hư cấu: Quân có chi thiết yếu gồm nhà ở 2.500.000đ, ăn uống 2.000.000đ, đi lại 500.000đ và hóa đơn 500.000đ. Tổng là 5.500.000đ mỗi tháng. Mốc đầu của Quân là 1 tháng chi thiết yếu, tức 5.500.000đ. Mốc sau là 3 tháng, tức 16.500.000đ. Nếu dành 1.100.000đ mỗi tháng, Quân cần 5 tháng để đạt mốc đầu.

Quỹ dự phòng nên ở nơi rút được khi cần, bạn hiểu rõ phí và tách khỏi tiền tiêu hằng ngày. Khi đã dùng quỹ, hãy ghi đúng khoản chi rồi lên kế hoạch bù dần.
''',
        example='5.500.000đ = 2.500.000 + 2.000.000 + 500.000 + 500.000. Mốc 3 tháng: 5.500.000 × 3 = 16.500.000đ. Thời gian đạt mốc đầu: 5.500.000 / 1.100.000 = 5 tháng.',
        questions=[
            ('Chi thiết yếu 4.000.000đ mỗi tháng, chọn mốc 3 tháng. Mục tiêu quỹ là bao nhiêu?', ['4.000.000đ', '12.000.000đ', '7.000.000đ'],
             ['Đây chỉ là 1 tháng.', 'Đúng: 4.000.000 × 3 = 12.000.000đ.', 'Đây là cộng 3 triệu, không phải nhân 3 tháng.']),
            ('Nơi giữ quỹ dự phòng nên ưu tiên đặc điểm nào?', ['Lợi nhuận hứa hẹn cao nhất', 'Khó rút để khỏi tiêu', 'Rút được khi cần, hiểu rõ phí và tách khỏi tiền tiêu hằng ngày'],
             ['Lời hứa lợi nhuận cao thường đi kèm rủi ro hoặc khó rút.', 'Khi có việc gấp mà không rút được thì quỹ mất tác dụng.', 'Đúng: quỹ cần sẵn sàng khi cần và không lẫn với chi tiêu.']),
            ('Vừa dùng 1.000.000đ từ quỹ để sửa xe đi làm. Bước tiếp theo là gì?', ['Ghi khoản chi thật, rồi lên kế hoạch bù dần', 'Giấu khoản rút để quỹ trông còn nguyên', 'Coi quỹ đã thất bại và bỏ luôn'],
             ['Đúng: quỹ được tạo ra để dùng đúng lúc như thế này.', 'Che số liệu làm kế hoạch sai.', 'Dùng quỹ cho việc gấp là đúng mục đích.']),
        ],
        action='Trong Picket, cộng các túi chi thiết yếu để biết chi thiết yếu một tháng, rồi đặt mốc đầu cho túi dự phòng.',
        support=dict(keyTakeaways=['Đo quỹ dự phòng bằng số tháng chi thiết yếu.', 'Số tháng phù hợp tùy độ ổn định thu nhập và người phụ thuộc.', 'Bắt đầu bằng mốc nhỏ và bù lại sau khi dùng.'],
            misconception='Nghĩ rằng phải có ngay một quỹ thật lớn thì mới đáng bắt đầu.',
            practicePrompt='Chi thiết yếu 6.000.000đ mỗi tháng. Mốc đầu là 2 tháng. Đã có 3.000.000đ và dành thêm 1.500.000đ mỗi tháng. Bao lâu thì đạt mốc?',
            solutionSteps=['Mốc: 6.000.000 × 2 = 12.000.000đ.', 'Còn thiếu: 12.000.000 − 3.000.000 = 9.000.000đ.', 'Thời gian: 9.000.000 / 1.500.000 = 6 tháng.'],
            answer='Mốc là 12.000.000đ và cần thêm 6 tháng nếu giữ mức góp 1.500.000đ.')),
    en=dict(title='Build an emergency fund in milestones',
        objective='Work out monthly essential costs, choose a milestone that suits your situation and calculate how long it takes.',
        body='''
An emergency fund helps you cope with lost income or an urgent cost without borrowing. A clear way to size it is in months of essential costs. Essential costs are what you still have to pay if income stops: housing, basic food, transport, bills and minimum debt payments.

There is no number of months that fits everyone. People with irregular income, dependants or work in a volatile sector often need a bigger buffer. You can begin with a small milestone, then raise it gradually.

A fictional example: Quân's essential costs are housing 2,500,000 VND, food 2,000,000 VND, transport 500,000 VND and bills 500,000 VND. The total is 5,500,000 VND per month. Quân's first milestone is 1 month of essentials, which is 5,500,000 VND. The next is 3 months, which is 16,500,000 VND. Setting aside 1,100,000 VND per month, Quân needs 5 months to reach the first milestone.

Keep the fund somewhere you can withdraw from when needed, whose fees you understand, and separate from everyday spending money. After using the fund, record the expense correctly and plan to refill it gradually.
''',
        example='5,500,000 VND = 2,500,000 + 2,000,000 + 500,000 + 500,000. 3-month milestone: 5,500,000 × 3 = 16,500,000 VND. Time to first milestone: 5,500,000 / 1,100,000 = 5 months.',
        questions=[
            ('Essential costs are 4,000,000 VND per month and the milestone is 3 months. What is the fund target?', ['4,000,000 VND', '12,000,000 VND', '7,000,000 VND'],
             ['This is only 1 month.', 'Correct: 4,000,000 × 3 = 12,000,000 VND.', 'This adds 3 million instead of multiplying by 3 months.']),
            ('Which feature matters most for where an emergency fund is kept?', ['The highest promised return', 'Hard to withdraw so you will not spend it', 'Available when needed, fees understood and separate from daily spending'],
             ['Promises of high returns often come with risk or limited access.', 'If you cannot withdraw in an urgent situation, the fund does not work.', 'Correct: it must be ready when needed and not mixed with spending.']),
            ('You just used 1,000,000 VND from the fund to repair the motorbike you ride to work. What next?', ['Record the real expense, then plan to refill gradually', 'Hide the withdrawal so the fund looks untouched', 'Treat the fund as failed and give up'],
             ['Correct: this is exactly the kind of moment the fund exists for.', 'Hiding the numbers makes the plan wrong.', 'Using the fund for an urgent need is its purpose.']),
        ],
        action='In Picket, add up your essential pockets to find one month of essential costs, then set a first milestone for your emergency pocket.',
        support=dict(keyTakeaways=['Measure an emergency fund in months of essential costs.', 'The right number of months depends on income stability and dependants.', 'Start with a small milestone and refill after using it.'],
            misconception='Thinking a fund is only worth starting if it is large from day one.',
            practicePrompt='Essential costs are 6,000,000 VND per month. The first milestone is 2 months. There is already 3,000,000 VND and 1,500,000 VND is added each month. How long until the milestone?',
            solutionSteps=['Milestone: 6,000,000 × 2 = 12,000,000 VND.', 'Still needed: 12,000,000 − 3,000,000 = 9,000,000 VND.', 'Time: 9,000,000 / 1,500,000 = 6 months.'],
            answer='The milestone is 12,000,000 VND and takes 6 more months at 1,500,000 VND per month.')))

lesson(18, 'stage-02-stability', 9, 'tax.pit-on-wages-2026', ['pit-deduction-2026', 'pit-law-2025', 'bhxh-rates'],
    [('30000000*105/1000', 3150000), ('15500000+6200000', 21700000), ('30000000-3150000-21700000', 5150000), ('5150000*5/100', 257500), ('30000000-3150000-257500', 26592500), ('10000000*5/100+15000000*10/100', 2000000)], [1, 2, 0],
    [('40000000*105/1000', 4200000), ('40000000-4200000-15500000', 20300000), ('10000000*5/100', 500000), ('(20300000-10000000)*10/100', 1030000), ('500000+1030000', 1530000), ('40000000-4200000-1530000', 34270000)],
    figures=[fig('Personal deduction 15,500,000 VND/month and 6,200,000 VND/month per dependant; Resolution 110/2025/UBTVQH15 adopted 2025-10-17, applies from tax period 2026', 'pit-deduction-2026', '2026-01-01'),
             fig('Monthly 5-bracket schedule: to 10m 5%; 10-30m 10%; 30-60m 20%; 60-100m 30%; over 100m 35%; PIT Law 2025 effective 2026-07-01', 'pit-law-2025', '2026-07-01'),
             fig('Employee mandatory insurance share 10.5%', 'bhxh-rates', '2025-09-08')],
    vi=dict(title='Thuế thu nhập cá nhân từ tiền lương: giảm trừ và biểu lũy tiến',
        objective='Tính thu nhập tính thuế từ tiền lương và áp dụng biểu lũy tiến từng phần trong một ví dụ đơn giản.',
        body='''
Thuế thu nhập cá nhân từ tiền lương không tính trên toàn bộ lương gộp. Trước hết, lấy thu nhập chịu thuế trừ bảo hiểm bắt buộc. Sau đó trừ giảm trừ gia cảnh. Phần còn lại là thu nhập tính thuế.

Theo Nghị quyết 110/2025/UBTVQH15 thông qua ngày 17/10/2025, từ kỳ tính thuế 2026, mức giảm trừ cho bản thân là 15.500.000đ mỗi tháng. Mỗi người phụ thuộc đã đăng ký được giảm trừ 6.200.000đ mỗi tháng. Luật Thuế thu nhập cá nhân 2025 có hiệu lực từ 1/7/2026. Luật dùng biểu 5 bậc tính theo tháng. Đến 10 triệu đồng chịu 5%; trên 10 đến 30 triệu chịu 10%; trên 30 đến 60 triệu chịu 20%; trên 60 đến 100 triệu chịu 30%; trên 100 triệu chịu 35%. Lũy tiến từng phần nghĩa là mỗi phần thu nhập chỉ chịu thuế suất của bậc chứa phần đó.

Ví dụ hư cấu: Hải có lương 30.000.000đ, cũng là lương đóng bảo hiểm, và 1 người phụ thuộc. Bảo hiểm là 30.000.000 × 10,5% = 3.150.000đ. Giảm trừ là 15.500.000 + 6.200.000 = 21.700.000đ. Thu nhập tính thuế là 5.150.000đ, nằm trong bậc 5%. Thuế là 257.500đ. Tiền thực nhận là 26.592.500đ.

Bài chỉ giải thích cách tính cơ bản. Thưởng, thu nhập từ nhiều nơi và quyết toán năm có quy định riêng. Hãy hỏi bộ phận trả lương hoặc cơ quan thuế khi cần số chính xác.
''',
        example='Bảo hiểm: 30.000.000 × 10,5% = 3.150.000đ. Giảm trừ: 15.500.000 + 6.200.000 = 21.700.000đ. Tính thuế: 30.000.000 − 3.150.000 − 21.700.000 = 5.150.000đ. Thuế: 5.150.000 × 5% = 257.500đ. Thực nhận: 30.000.000 − 3.150.000 − 257.500 = 26.592.500đ.',
        questions=[
            ('Thu nhập tính thuế 25.000.000đ mỗi tháng theo biểu 5 bậc. Thuế là bao nhiêu?', ['2.500.000đ', '2.000.000đ', '1.250.000đ'],
             ['Đây là áp 10% cho toàn bộ, sai cách lũy tiến từng phần.', 'Đúng: 10.000.000 × 5% + 15.000.000 × 10% = 500.000 + 1.500.000.', 'Đây là áp 5% cho toàn bộ.']),
            ('Từ kỳ tính thuế 2026, mức giảm trừ cho bản thân mỗi tháng là bao nhiêu?', ['11.000.000đ', '6.200.000đ', '15.500.000đ'],
             ['Đây là mức trước kỳ tính thuế 2026.', 'Đây là mức cho mỗi người phụ thuộc.', 'Đúng: theo Nghị quyết 110/2025/UBTVQH15.']),
            ('Thu nhập tính thuế đã vượt sang bậc 10%. Điều nào đúng?', ['Chỉ phần trên 10.000.000đ chịu 10%; 10.000.000đ đầu chịu 5%', 'Toàn bộ thu nhập chịu 10%', 'Không phải nộp thuế'],
             ['Đúng: đây là ý nghĩa của lũy tiến từng phần.', 'Thuế suất bậc cao chỉ áp cho phần nằm trong bậc đó.', 'Có thu nhập tính thuế dương thì có thuế.']),
        ],
        action='Nếu có phiếu lương, đối chiếu dòng giảm trừ và thuế với cách tính trong bài. Câu hỏi cụ thể hãy gửi bộ phận trả lương. Không cần nhập phiếu lương vào Picket.',
        support=dict(keyTakeaways=['Thu nhập tính thuế = thu nhập chịu thuế − bảo hiểm bắt buộc − giảm trừ gia cảnh.', 'Từ kỳ tính thuế 2026: 15.500.000đ cho bản thân, 6.200.000đ cho mỗi người phụ thuộc mỗi tháng.', 'Lũy tiến từng phần: mỗi phần chỉ chịu thuế suất của bậc chứa nó.'],
            misconception='Nghĩ rằng lên bậc thuế cao hơn thì toàn bộ thu nhập bị tính thuế suất cao hơn.',
            practicePrompt='Lương 40.000.000đ, cũng là lương đóng bảo hiểm, không có người phụ thuộc. Tính bảo hiểm, thu nhập tính thuế, thuế và tiền thực nhận.',
            solutionSteps=['Bảo hiểm: 40.000.000 × 10,5% = 4.200.000đ.', 'Tính thuế: 40.000.000 − 4.200.000 − 15.500.000 = 20.300.000đ.', 'Bậc 1: 10.000.000 × 5% = 500.000đ; bậc 2: 10.300.000 × 10% = 1.030.000đ; tổng 1.530.000đ.', 'Thực nhận: 40.000.000 − 4.200.000 − 1.530.000 = 34.270.000đ.'],
            answer='Thuế là 1.530.000đ và tiền thực nhận là 34.270.000đ trong giả định của bài.')),
    en=dict(title='Personal income tax on wages: deductions and progressive brackets',
        objective='Work out taxable income from wages and apply the progressive brackets in a simple example.',
        body='''
Personal income tax on wages is not charged on the whole gross salary. First, take assessable income and subtract mandatory insurance. Then subtract the family deductions. What remains is taxable income.

Under Resolution 110/2025/UBTVQH15 adopted on 17 October 2025, from the 2026 tax period the personal deduction is 15,500,000 VND per month. Each registered dependant adds a deduction of 6,200,000 VND per month. The Personal Income Tax Law 2025 takes effect on 1 July 2026. It uses a 5-bracket monthly schedule. Up to 10 million VND is taxed at 5%; over 10 up to 30 million at 10%; over 30 up to 60 million at 20%; over 60 up to 100 million at 30%; over 100 million at 35%. Progressive by portion means each part of income is taxed only at the rate of the bracket it falls in.

A fictional example: Hải earns 30,000,000 VND, which is also the contribution salary, and has 1 dependant. Insurance is 30,000,000 × 10.5% = 3,150,000 VND. Deductions are 15,500,000 + 6,200,000 = 21,700,000 VND. Taxable income is 5,150,000 VND, inside the 5% bracket. Tax is 257,500 VND. Take-home pay is 26,592,500 VND.

This lesson only explains the basic method. Bonuses, income from several sources and the annual finalisation have their own rules. Ask your payroll team or the tax authority when you need an exact figure.
''',
        example='Insurance: 30,000,000 × 10.5% = 3,150,000 VND. Deductions: 15,500,000 + 6,200,000 = 21,700,000 VND. Taxable: 30,000,000 − 3,150,000 − 21,700,000 = 5,150,000 VND. Tax: 5,150,000 × 5% = 257,500 VND. Take-home: 30,000,000 − 3,150,000 − 257,500 = 26,592,500 VND.',
        questions=[
            ('Taxable income is 25,000,000 VND per month under the 5-bracket schedule. What is the tax?', ['2,500,000 VND', '2,000,000 VND', '1,250,000 VND'],
             ['This applies 10% to everything, which ignores progressive portions.', 'Correct: 10,000,000 × 5% + 15,000,000 × 10% = 500,000 + 1,500,000.', 'This applies 5% to everything.']),
            ('From the 2026 tax period, what is the monthly personal deduction?', ['11,000,000 VND', '6,200,000 VND', '15,500,000 VND'],
             ['This was the amount before the 2026 tax period.', 'This is the amount per dependant.', 'Correct: under Resolution 110/2025/UBTVQH15.']),
            ('Taxable income has moved into the 10% bracket. What is true?', ['Only the part above 10,000,000 VND is taxed at 10%; the first 10,000,000 VND at 5%', 'All income is taxed at 10%', 'No tax is due'],
             ['Correct: this is what progressive by portion means.', 'A higher bracket rate applies only to the part inside that bracket.', 'Positive taxable income means tax is due.']),
        ],
        action='If you have a payslip, compare its deduction and tax lines with the method in this lesson. Send specific questions to your payroll team. You do not need to enter the payslip into Picket.',
        support=dict(keyTakeaways=['Taxable income = assessable income − mandatory insurance − family deductions.', 'From the 2026 tax period: 15,500,000 VND for yourself and 6,200,000 VND per dependant each month.', 'Progressive by portion: each part is taxed only at its own bracket rate.'],
            misconception='Believing that moving into a higher bracket taxes all income at the higher rate.',
            practicePrompt='A salary of 40,000,000 VND, also the contribution salary, with no dependants. Work out insurance, taxable income, tax and take-home pay.',
            solutionSteps=['Insurance: 40,000,000 × 10.5% = 4,200,000 VND.', 'Taxable: 40,000,000 − 4,200,000 − 15,500,000 = 20,300,000 VND.', 'Bracket 1: 10,000,000 × 5% = 500,000 VND; bracket 2: 10,300,000 × 10% = 1,030,000 VND; total 1,530,000 VND.', 'Take-home: 40,000,000 − 4,200,000 − 1,530,000 = 34,270,000 VND.'],
            answer='Tax is 1,530,000 VND and take-home pay is 34,270,000 VND under the lesson assumptions.')))

# ---------------------------------------------------------------- Stage 3
lesson(19, 'stage-03-protection', 10, 'borrowing.rate-conversion', ['civil-interest-cap', 'cost', 'otp'],
    [('3000*2', 6000), ('6000*30', 180000), ('180000*100/2000000', 9), ('9*12', 108)], [1, 2, 0],
    [('5400000-5000000', 400000), ('400000/2', 200000), ('200000*100/5000000', 4), ('4*12', 48)],
    figures=[fig('Civil Code 2015 Article 468: agreed civil-loan interest may not exceed 20%/year unless another law provides otherwise', 'civil-interest-cap', '2018-12-04')],
    vi=dict(title='Quy đổi lãi suất để so sánh và nhận diện vay nặng lãi',
        objective='Quy đổi chi phí vay theo ngày, tháng về cùng một đơn vị năm và nhận ra dấu hiệu vay nặng lãi.',
        body='''
Lời mời vay có thể nêu chi phí theo ngày, theo tháng hoặc theo năm. Con số theo ngày trông rất nhỏ. Muốn so sánh, hãy quy về cùng một đơn vị, thường là phần trăm mỗi năm. Cách quy đổi đơn giản là nhân tỷ lệ tháng với 12, hoặc dùng 12 tháng 30 ngày. Phép tính này chưa gồm lãi kép, nên chi phí thật có thể còn cao hơn.

Ví dụ hư cấu: một ứng dụng quảng cáo "chỉ 3.000đ mỗi ngày cho mỗi 1.000.000đ". Mai vay 2.000.000đ, nên chi phí là 6.000đ mỗi ngày. Sau 30 ngày, Mai trả 180.000đ tiền chi phí. So với 2.000.000đ, đó là 9% mỗi tháng. Quy đổi đơn giản ra năm là 9 × 12 = 108%.

Bộ luật Dân sự 2015, Điều 468, quy định lãi suất thỏa thuận trong vay dân sự không vượt quá 20% mỗi năm, trừ trường hợp luật khác có quy định khác. Chi phí quy đổi cao hơn nhiều lần mức này là tín hiệu cần dừng lại và tìm hiểu kỹ.

Các dấu hiệu khác cần cảnh giác: đòi chuyển phí trước khi giải ngân, đòi quyền truy cập danh bạ, hối thúc ký ngay, hoặc không có hợp đồng rõ ràng. Trước khi vay, hãy đọc tổng số phải trả, lịch trả và mọi loại phí.
''',
        example='3.000 × 2 = 6.000đ/ngày; 6.000 × 30 = 180.000đ/tháng; 180.000 / 2.000.000 = 9%/tháng; 9 × 12 = 108%/năm theo cách quy đổi đơn giản.',
        questions=[
            ('Lãi 2% mỗi tháng, quy đổi đơn giản ra năm là bao nhiêu?', ['2%', '24%', '12%'],
             ['Đây vẫn là tỷ lệ một tháng.', 'Đúng: 2 × 12 = 24%.', 'Đây là nhân 6, không phải 12.']),
            ('Một lời mời vay yêu cầu chuyển "phí hồ sơ" trước khi giải ngân. Phản ứng an toàn là gì?', ['Chuyển phí cho nhanh', 'Gửi ảnh căn cước để được duyệt nhanh', 'Dừng, không chuyển tiền trước và kiểm tra bên cho vay qua kênh chính thức'],
             ['Chuyển tiền trước cho bên chưa xác minh có thể mất luôn khoản đó.', 'Gửi giấy tờ cho bên chưa xác minh làm tăng rủi ro bị lạm dụng.', 'Đúng: xác minh trước, không chuyển tiền theo áp lực.']),
            ('Khoản A: vay 1.000.000đ, trả 1.050.000đ sau 1 tháng. Khoản B: vay 1.000.000đ, trả 1.100.000đ sau 2 tháng. So sánh nào đúng?', ['Cùng 5% mỗi tháng, nhưng tổng tiền lãi của B lớn hơn', 'A rẻ hơn mỗi tháng', 'B rẻ hơn mỗi tháng'],
             ['Đúng: A 50.000đ/1 tháng, B 100.000đ/2 tháng; cùng 5% mỗi tháng.', 'Mỗi tháng hai khoản như nhau.', 'Mỗi tháng hai khoản như nhau, B chỉ kéo dài hơn.']),
        ],
        action='Nếu bạn đang có khoản vay, thêm lịch trả vào mục Hóa đơn của Picket và ghi tổng phải trả trong ghi chú. Không cần đăng ký hay so sánh sản phẩm vay thật.',
        support=dict(keyTakeaways=['Quy chi phí vay về cùng một đơn vị năm trước khi so sánh.', 'Phí theo ngày nhỏ có thể tương đương chi phí năm rất cao.', 'Đòi phí trước, đòi danh bạ hoặc hối thúc là dấu hiệu cần dừng lại.'],
            misconception='Nghĩ rằng 3.000đ mỗi ngày là rẻ vì con số nhỏ.',
            practicePrompt='Vay 5.000.000đ, sau 2 tháng phải trả 5.400.000đ. Tính chi phí, tỷ lệ mỗi tháng và quy đổi đơn giản ra năm.',
            solutionSteps=['Chi phí: 5.400.000 − 5.000.000 = 400.000đ.', 'Mỗi tháng: 400.000 / 2 = 200.000đ, tức 200.000 / 5.000.000 = 4%.', 'Quy đổi đơn giản: 4 × 12 = 48% mỗi năm.'],
            answer='Chi phí 400.000đ, tương đương 4% mỗi tháng hay khoảng 48% mỗi năm theo cách quy đổi đơn giản.')),
    en=dict(title='Convert interest rates to compare, and spot predatory lending',
        objective='Convert daily or monthly borrowing costs into the same yearly unit and recognise signs of predatory lending.',
        body='''
Loan offers may state costs per day, per month or per year. A daily number looks very small. To compare, convert to the same unit, usually percent per year. A simple conversion multiplies a monthly rate by 12, or uses 12 months of 30 days. This calculation ignores compounding, so the true cost may be even higher.

A fictional example: an app advertises "only 3,000 VND per day for each 1,000,000 VND". Mai borrows 2,000,000 VND, so the cost is 6,000 VND per day. After 30 days, Mai pays 180,000 VND in charges. Compared with 2,000,000 VND, that is 9% per month. The simple yearly conversion is 9 × 12 = 108%.

Vietnam's Civil Code 2015, Article 468, says agreed interest in civil loans may not exceed 20% per year, unless another law provides otherwise. A converted cost many times above this level is a signal to stop and look closely.

Other warning signs: demands for a fee before the money is released, requests for access to your contacts, pressure to sign immediately, or no clear contract. Before borrowing, read the total amount repayable, the schedule and every fee.
''',
        example='3,000 × 2 = 6,000 VND per day; 6,000 × 30 = 180,000 VND per month; 180,000 / 2,000,000 = 9% per month; 9 × 12 = 108% per year by simple conversion.',
        questions=[
            ('Interest is 2% per month. What is the simple yearly conversion?', ['2%', '24%', '12%'],
             ['This is still the monthly rate.', 'Correct: 2 × 12 = 24%.', 'This multiplies by 6, not 12.']),
            ('A loan offer asks you to transfer an "application fee" before the money is released. What is the safe response?', ['Pay the fee to speed things up', 'Send a photo of your ID card for faster approval', 'Stop, do not pay in advance, and check the lender through an official channel'],
             ['Paying an unverified party in advance can mean losing that money.', 'Sending documents to an unverified party increases the risk of misuse.', 'Correct: verify first and do not transfer money under pressure.']),
            ('Loan A: borrow 1,000,000 VND, repay 1,050,000 VND after 1 month. Loan B: borrow 1,000,000 VND, repay 1,100,000 VND after 2 months. Which comparison is right?', ['Both cost 5% per month, but B has more total interest', 'A is cheaper per month', 'B is cheaper per month'],
             ['Correct: A costs 50,000 VND over 1 month, B costs 100,000 VND over 2 months; both 5% per month.', 'Per month the two are the same.', 'Per month the two are the same; B just lasts longer.']),
        ],
        action='If you already have a loan, add its repayment schedule under Bills in Picket and note the total repayable. You do not need to apply for or compare real loan products.',
        support=dict(keyTakeaways=['Convert borrowing costs to the same yearly unit before comparing.', 'A small daily fee can equal a very high yearly cost.', 'Upfront fees, contact-list access or pressure are signs to stop.'],
            misconception='Thinking 3,000 VND per day is cheap because the number is small.',
            practicePrompt='Borrow 5,000,000 VND and repay 5,400,000 VND after 2 months. Find the cost, the monthly rate and the simple yearly conversion.',
            solutionSteps=['Cost: 5,400,000 − 5,000,000 = 400,000 VND.', 'Per month: 400,000 / 2 = 200,000 VND, or 200,000 / 5,000,000 = 4%.', 'Simple conversion: 4 × 12 = 48% per year.'],
            answer='The cost is 400,000 VND, equal to 4% per month or about 48% per year by simple conversion.')))

lesson(20, 'stage-03-protection', 10, 'borrowing.multiple-debts', ['priority', 'loans', 'oecd-core-2016'],
    [('200000+500000+100000', 800000), ('1300000-800000', 500000), ('200000+500000', 700000), ('4000000*25/1000', 100000)], [0, 1, 2],
    [('300000+100000', 400000), ('700000-400000', 300000), ('100000+300000', 400000), ('800000-400000', 400000)],
    vi=dict(title='Khi có nhiều khoản nợ: giữ hạn tối thiểu, dồn phần dư',
        objective='Lập danh sách nợ, trả tối thiểu đúng hạn cho mọi khoản và chọn một cách dồn phần dư.',
        body='''
Khi có nhiều khoản nợ, hãy lập một danh sách: dư nợ, lãi suất, khoản trả tối thiểu và ngày đến hạn. Bước đầu tiên là trả đủ khoản tối thiểu của mọi khoản đúng hạn. Trễ hạn thường kéo theo phí phạt, lãi quá hạn và ảnh hưởng đến lịch sử tín dụng.

Phần tiền còn dư sau các khoản tối thiểu có thể dồn vào một khoản mục tiêu. Có hai cách phổ biến. Cách lãi cao trước dồn vào khoản có lãi suất cao nhất, thường giúp trả ít lãi hơn. Cách số dư nhỏ trước dồn vào khoản nhỏ nhất, giúp sớm xóa được một khoản và giữ động lực. Cách nào cũng được, miễn bạn duy trì được.

Ví dụ hư cấu: Khoa có thẻ A dư nợ 4.000.000đ, lãi 2,5% mỗi tháng, tối thiểu 200.000đ. Khoản B dư nợ 6.000.000đ, lãi 1% mỗi tháng, tối thiểu 500.000đ. Khoản C dư nợ 1.000.000đ, lãi 1,5% mỗi tháng, tối thiểu 100.000đ. Tổng tối thiểu là 800.000đ. Khoa có 1.300.000đ mỗi tháng, nên dư 500.000đ. Theo cách lãi cao trước, Khoa trả thẻ A 700.000đ. Lãi tháng đầu của thẻ A khoảng 100.000đ.

Chỉ trả tối thiểu thẻ tín dụng thì phần dư nợ còn lại vẫn có thể bị tính lãi. Vay khoản mới để trả khoản cũ cần đọc kỹ tổng chi phí trước.
''',
        example='Tối thiểu: 200.000 + 500.000 + 100.000 = 800.000đ. Dư: 1.300.000 − 800.000 = 500.000đ. Trả thẻ A: 200.000 + 500.000 = 700.000đ. Lãi tháng đầu thẻ A: 4.000.000 × 2,5% = 100.000đ.',
        questions=[
            ('Tổng tối thiểu 900.000đ, bạn có 1.200.000đ. Phần có thể dồn thêm là bao nhiêu?', ['300.000đ', '1.200.000đ', '900.000đ'],
             ['Đúng: 1.200.000 − 900.000 = 300.000đ.', 'Đây là toàn bộ tiền, chưa trừ các khoản tối thiểu.', 'Đây là phần tối thiểu, không phải phần dư.']),
            ('Cách lãi cao trước dồn phần dư vào đâu?', ['Khoản có số dư nhỏ nhất', 'Khoản có lãi suất cao nhất, sau khi đã trả tối thiểu mọi khoản', 'Khoản có tên quen nhất'],
             ['Đó là cách số dư nhỏ trước.', 'Đúng: giữ hạn mọi khoản rồi dồn vào khoản lãi cao nhất.', 'Tên quen không liên quan đến chi phí.']),
            ('Chỉ trả tối thiểu thẻ tín dụng mỗi tháng thì sao?', ['Không còn bị tính lãi', 'Nợ tự xóa sau 12 tháng', 'Dư nợ còn lại có thể tiếp tục bị tính lãi theo điều khoản thẻ'],
             ['Trả tối thiểu tránh trễ hạn nhưng không xóa lãi trên phần còn lại.', 'Không có cơ chế tự xóa nợ như vậy.', 'Đúng: cần đọc điều khoản thẻ để biết cách tính.']),
        ],
        action='Thêm từng khoản trả nợ vào mục Hóa đơn của Picket với ngày đến hạn và số tối thiểu. Nếu muốn, tạo một túi "trả thêm" cho phần dư.',
        support=dict(keyTakeaways=['Lập danh sách nợ gồm dư nợ, lãi suất, khoản tối thiểu và ngày đến hạn.', 'Trả đủ tối thiểu mọi khoản trước, rồi mới dồn phần dư.', 'Lãi cao trước thường tiết kiệm lãi; số dư nhỏ trước giúp giữ động lực.'],
            misconception='Dồn hết tiền vào một khoản và để các khoản khác trễ hạn.',
            practicePrompt='Khoản X dư nợ 3.000.000đ, lãi 2% mỗi tháng, tối thiểu 300.000đ. Khoản Y dư nợ 800.000đ, lãi 1% mỗi tháng, tối thiểu 100.000đ. Có 700.000đ. Theo cách số dư nhỏ trước, trả Y bao nhiêu và Y còn bao nhiêu? Bỏ qua lãi phát sinh để đơn giản.',
            solutionSteps=['Tối thiểu: 300.000 + 100.000 = 400.000đ.', 'Phần dư: 700.000 − 400.000 = 300.000đ.', 'Trả Y: 100.000 + 300.000 = 400.000đ; Y còn 800.000 − 400.000 = 400.000đ.'],
            answer='Trả X 300.000đ và Y 400.000đ; Y còn 400.000đ, chưa tính lãi phát sinh.')),
    en=dict(title='Several debts: keep minimums on time, focus the extra',
        objective='List your debts, pay every minimum on time and choose one way to direct the extra.',
        body='''
With several debts, make a list: balance, interest rate, minimum payment and due date. The first step is to pay every minimum in full and on time. Late payments usually bring penalty fees, overdue interest and harm to your credit history.

Money left after the minimums can go to one target debt. There are two common methods. Highest-rate first directs the extra to the debt with the highest interest rate, which usually means paying less interest. Smallest-balance first directs it to the smallest debt, which clears one debt sooner and keeps motivation up. Either works, as long as you can stick with it.

A fictional example: Khoa has card A with a balance of 4,000,000 VND, 2.5% interest per month and a minimum of 200,000 VND. Loan B has a balance of 6,000,000 VND, 1% interest per month and a minimum of 500,000 VND. Loan C has a balance of 1,000,000 VND, 1.5% interest per month and a minimum of 100,000 VND. Total minimums are 800,000 VND. Khoa has 1,300,000 VND per month, so 500,000 VND is extra. Using highest-rate first, Khoa pays card A 700,000 VND. First-month interest on card A is about 100,000 VND.

Paying only the minimum on a credit card means the remaining balance may still be charged interest. Taking a new loan to pay an old one requires reading the total cost carefully first.
''',
        example='Minimums: 200,000 + 500,000 + 100,000 = 800,000 VND. Extra: 1,300,000 − 800,000 = 500,000 VND. Card A payment: 200,000 + 500,000 = 700,000 VND. First-month interest on card A: 4,000,000 × 2.5% = 100,000 VND.',
        questions=[
            ('Minimums total 900,000 VND and you have 1,200,000 VND. How much extra can you direct?', ['300,000 VND', '1,200,000 VND', '900,000 VND'],
             ['Correct: 1,200,000 − 900,000 = 300,000 VND.', 'This is all the money before minimums.', 'This is the minimum total, not the extra.']),
            ('Where does highest-rate first send the extra money?', ['The debt with the smallest balance', 'The debt with the highest interest rate, after all minimums are paid', 'The debt with the most familiar name'],
             ['That is smallest-balance first.', 'Correct: keep every debt current, then target the highest rate.', 'A familiar name has nothing to do with cost.']),
            ('What happens if you pay only the credit-card minimum each month?', ['No more interest is charged', 'The debt is erased after 12 months', 'The remaining balance may keep being charged interest under the card terms'],
             ['Paying the minimum avoids lateness but does not remove interest on the rest.', 'There is no such automatic write-off.', 'Correct: read the card terms to see how interest is charged.']),
        ],
        action='Add each debt payment under Bills in Picket with its due date and minimum. If you like, create an "extra payment" pocket for the surplus.',
        support=dict(keyTakeaways=['List each debt with balance, rate, minimum and due date.', 'Pay every minimum first, then direct the extra.', 'Highest-rate first usually saves interest; smallest-balance first helps motivation.'],
            misconception='Putting all money into one debt and letting the others fall behind.',
            practicePrompt='Debt X has a 3,000,000 VND balance, 2% per month and a 300,000 VND minimum. Debt Y has an 800,000 VND balance, 1% per month and a 100,000 VND minimum. You have 700,000 VND. Using smallest-balance first, how much goes to Y and what remains on Y? Ignore new interest for simplicity.',
            solutionSteps=['Minimums: 300,000 + 100,000 = 400,000 VND.', 'Extra: 700,000 − 400,000 = 300,000 VND.', 'Pay Y: 100,000 + 300,000 = 400,000 VND; Y has 800,000 − 400,000 = 400,000 VND left.'],
            answer='Pay X 300,000 VND and Y 400,000 VND; Y has 400,000 VND left before new interest.')))

lesson(21, 'stage-03-protection', 11, 'safety.common-scam-scripts', ['sbv-security', 'account-rental', 'otp', 'payment-safety'],
    [('200000+2000000', 2200000), ('2200000-260000', 1940000), ('1940000+5000000', 6940000)], [1, 0, 2],
    [('35000000-30000000', 5000000)],
    figures=[fig('SBV: never share OTP/passwords even with bank staff; banks stop sending links in SMS/email from 2025-01-01; do not grant Accessibility permission', 'sbv-security', '2025-03-31'),
             fig('Police warning: renting, lending or selling bank accounts may lead to administrative or criminal liability', 'account-rental', '2026-03-10')],
    vi=dict(title='Nhận diện các kịch bản lừa đảo phổ biến',
        objective='Nhận ra các kịch bản lừa đảo thường gặp và chọn hành động an toàn theo khuyến cáo chính thức.',
        body='''
Kẻ lừa đảo thường dùng vài kịch bản lặp lại. Giả danh cơ quan hoặc ngân hàng để đòi chuyển tiền "xác minh". Mời "việc nhẹ lương cao" hoặc "làm nhiệm vụ", cho rút ít tiền lúc đầu rồi đòi nạp số lớn. Hỏi mua, thuê hoặc mượn tài khoản ngân hàng. Gửi đường link hay ứng dụng lạ rồi xin quyền điều khiển máy.

Ngân hàng Nhà nước khuyến cáo ngày 31/3/2025: không cung cấp mật khẩu, mã OTP hay thông tin thẻ cho bất kỳ ai, kể cả nhân viên ngân hàng. Từ 1/1/2025, ngân hàng không gửi tin nhắn hay email chứa đường link. Chỉ cài ứng dụng từ kho chính thức và không cấp quyền Trợ năng cho ứng dụng lạ. Ngày 10/3/2026, lực lượng Công an khuyến cáo không mở tài khoản để cho thuê, cho mượn hay bán lại; người làm vậy có thể bị xử phạt hoặc truy cứu trách nhiệm.

Ví dụ hư cấu về "nhiệm vụ": Vi nạp 200.000đ và nhận lại 260.000đ. Sau đó Vi được yêu cầu nạp 2.000.000đ để "mở khóa hoa hồng". Nếu tài khoản bị chặn lúc này, Vi đã nạp 2.200.000đ, nhận về 260.000đ, mất 1.940.000đ. Nếu nạp tiếp 5.000.000đ, khoản mất là 6.940.000đ. Lần rút đầu chỉ là mồi.

Khi nghi ngờ: dừng lại, không chuyển thêm, liên hệ ngân hàng qua kênh chính thức, giữ bằng chứng và trình báo cơ quan công an.
''',
        example='Đã nạp: 200.000 + 2.000.000 = 2.200.000đ. Mất sau khi trừ tiền nhận về: 2.200.000 − 260.000 = 1.940.000đ. Nếu nạp tiếp: 1.940.000 + 5.000.000 = 6.940.000đ.',
        questions=[
            ('Tin nhắn xưng ngân hàng chứa đường link yêu cầu cập nhật thông tin. Theo khuyến cáo, nên làm gì?', ['Bấm link vì có logo ngân hàng', 'Không bấm; tự mở ứng dụng chính thức hoặc gọi số tổng đài in trên thẻ', 'Trả lời tin nhắn kèm mã OTP'],
             ['Logo dễ bị giả mạo; ngân hàng đã ngừng gửi link qua tin nhắn.', 'Đúng: tự đi qua kênh chính thức bạn đã biết.', 'Không gửi OTP cho bất kỳ ai.']),
            ('Người lạ trả 500.000đ mỗi tháng để "mượn" tài khoản ngân hàng của bạn. Điều nào đúng?', ['Tài khoản có thể bị dùng cho lừa đảo hoặc rửa tiền; bạn có thể bị xử phạt hoặc truy cứu', 'Đây là thu nhập thụ động an toàn', 'Hợp pháp nếu chỉ cho mượn một tháng'],
             ['Đúng: Công an đã cảnh báo rõ rủi ro này.', 'Rủi ro pháp lý và tài chính rơi vào chủ tài khoản.', 'Thời gian ngắn không làm hành vi trở nên an toàn.']),
            ('Một ứng dụng tải từ link lạ đòi cấp quyền Trợ năng. Nên làm gì?', ['Cấp quyền để ứng dụng chạy', 'Cấp rồi tắt sau', 'Từ chối, gỡ ứng dụng và báo ngân hàng nếu đã nhập thông tin'],
             ['Quyền này có thể cho ứng dụng đọc và điều khiển màn hình.', 'Chỉ vài giây cũng đủ để lấy thông tin.', 'Đúng: theo khuyến cáo của Ngân hàng Nhà nước.']),
        ],
        action='Xem lại danh sách giao dịch trong Picket tuần này để tìm khoản chuyển bạn không nhận ra. Nếu có, liên hệ ngân hàng qua số tổng đài chính thức.',
        support=dict(keyTakeaways=['Không đưa OTP, mật khẩu hay thông tin thẻ cho ai, kể cả người xưng nhân viên ngân hàng.', 'Lần rút được tiền đầu tiên không chứng minh mô hình là thật.', 'Không cho thuê, cho mượn hay bán tài khoản ngân hàng.'],
            misconception='Nghĩ rằng người gọi biết đúng tên và số tài khoản thì chắc là người thật.',
            practicePrompt='Hùng có 35.000.000đ. Một người gọi xưng cơ quan chức năng yêu cầu chuyển 30.000.000đ vào "tài khoản tạm giữ" để xác minh. Nếu chuyển, Hùng còn bao nhiêu và có gì bảo đảm sẽ nhận lại?',
            solutionSteps=['Nếu chuyển: 35.000.000 − 30.000.000 = 5.000.000đ còn lại.', 'Lời hứa trả lại không phải tiền đã nhận; số được bảo đảm là 0đ.', 'Hành động an toàn: dừng, không chuyển, tự liên hệ cơ quan qua kênh chính thức và trình báo.'],
            answer='Hùng chỉ còn 5.000.000đ và không có gì bảo đảm nhận lại; cần dừng và xác minh trực tiếp.')),
    en=dict(title='Recognise common scam scripts',
        objective='Recognise common scam scripts and choose safe actions in line with official warnings.',
        body='''
Scammers tend to reuse a few scripts. They pose as an authority or a bank and demand a transfer for "verification". They offer "easy, well-paid work" or "tasks", let you withdraw a little at first, then demand a large deposit. They ask to buy, rent or borrow your bank account. They send an unknown link or app, then ask for control of your phone.

The State Bank of Vietnam advised on 31 March 2025: do not give your password, OTP or card details to anyone, including bank staff. From 1 January 2025, banks do not send text messages or emails containing links. Install apps only from official stores and do not grant Accessibility permission to unknown apps. On 10 March 2026, the police warned against opening accounts to rent out, lend or sell; people who do so may face penalties or prosecution.

A fictional "task" example: Vi deposits 200,000 VND and gets 260,000 VND back. Vi is then asked to deposit 2,000,000 VND to "unlock commission". If the account is blocked at this point, Vi has deposited 2,200,000 VND, received 260,000 VND and lost 1,940,000 VND. Depositing another 5,000,000 VND would make the loss 6,940,000 VND. The first withdrawal was only bait.

When in doubt: stop, do not send more, contact your bank through an official channel, keep evidence and report to the police.
''',
        example='Deposited: 200,000 + 2,000,000 = 2,200,000 VND. Loss after money received: 2,200,000 − 260,000 = 1,940,000 VND. If more is deposited: 1,940,000 + 5,000,000 = 6,940,000 VND.',
        questions=[
            ('A text message claiming to be your bank contains a link asking you to update details. What should you do?', ['Tap the link because it shows the bank logo', 'Do not tap; open the official app yourself or call the number printed on your card', 'Reply with your OTP'],
             ['Logos are easy to fake, and banks have stopped sending links by text.', 'Correct: go through an official channel you already know.', 'Never send an OTP to anyone.']),
            ('A stranger offers 500,000 VND per month to "borrow" your bank account. What is true?', ['The account may be used for fraud or money laundering, and you may face penalties or prosecution', 'It is safe passive income', 'It is legal if only lent for one month'],
             ['Correct: the police have clearly warned about this risk.', 'The legal and financial risk falls on the account holder.', 'A short period does not make it safe.']),
            ('An app installed from an unknown link asks for Accessibility permission. What should you do?', ['Grant it so the app works', 'Grant it and turn it off later', 'Refuse, uninstall it and tell your bank if you entered any details'],
             ['This permission can let an app read and control your screen.', 'A few seconds can be enough to capture information.', 'Correct: this follows the State Bank of Vietnam\'s advice.']),
        ],
        action='Review this week\'s transactions in Picket for any transfer you do not recognise. If you find one, contact your bank through its official hotline.',
        support=dict(keyTakeaways=['Never give an OTP, password or card details to anyone, even someone claiming to be bank staff.', 'A first successful withdrawal does not prove a scheme is real.', 'Do not rent out, lend or sell your bank account.'],
            misconception='Believing a caller who knows your name and account number must be genuine.',
            practicePrompt='Hùng has 35,000,000 VND. A caller claiming to be an authority demands 30,000,000 VND be moved to a "holding account" for verification. If Hùng transfers it, how much remains and what guarantees its return?',
            solutionSteps=['If transferred: 35,000,000 − 30,000,000 = 5,000,000 VND remains.', 'A promise of return is not money received; the guaranteed amount is 0 VND.', 'Safe action: stop, do not transfer, contact the authority yourself through an official channel and report it.'],
            answer='Hùng would keep only 5,000,000 VND with no guarantee of return; stop and verify directly.')))

lesson(23, 'stage-03-protection', 12, 'protection.insurance-basics', ['insurance-free-look', 'oecd-core-2016'],
    [('10000000*20/100', 2000000), ('10000000-2000000', 8000000), ('6000000/12', 500000), ('6000000*15', 90000000)], [0, 1, 2],
    [('4800000/12', 400000), ('4800000*10', 48000000)],
    figures=[fig('Insurance Business Law 08/2022/QH15 Article 35: 21-day free-look for life/health contracts with a term over 1 year', 'insurance-free-look', '2023-03-13')],
    vi=dict(title='Bảo hiểm cơ bản: đọc quyền lợi, loại trừ và phí',
        objective='Hiểu bảo hiểm chuyển một phần rủi ro, đọc các điều khoản chính và tính phần mình tự trả.',
        body='''
Bảo hiểm là cách chuyển một phần rủi ro tài chính sang công ty bảo hiểm, đổi lại bạn đóng phí. Bảo hiểm hữu ích nhất với những rủi ro bạn khó tự gánh, như chi phí điều trị lớn. Nó không phải cách làm giàu và khác với gửi tiết kiệm.

Trước khi ký, hãy đọc: quyền lợi được chi trả, số tiền bảo hiểm, các điều khoản loại trừ, thời gian chờ, tỷ lệ đồng chi trả, lịch đóng phí và điều gì xảy ra nếu dừng đóng sớm. Nếu người tư vấn mô tả hợp đồng như "gửi tiết kiệm lãi cao", hãy hỏi lại: đây là hợp đồng bảo hiểm, vậy giá trị hoàn lại nếu dừng sớm là bao nhiêu?

Ví dụ hư cấu: một hợp đồng sức khỏe có đồng chi trả 20%. Chi phí điều trị hợp lệ là 10.000.000đ. Bạn tự trả 2.000.000đ, bảo hiểm trả 8.000.000đ nếu khoản đó nằm trong phạm vi. Nếu phí năm là 6.000.000đ, bạn cần dành 500.000đ mỗi tháng. Đóng trong 15 năm, tổng phí là 90.000.000đ.

Luật Kinh doanh bảo hiểm 2022, Điều 35, cho bên mua hợp đồng bảo hiểm nhân thọ hoặc sức khỏe có thời hạn trên 1 năm 21 ngày cân nhắc kể từ khi nhận hợp đồng. Hãy dùng thời gian này để đọc kỹ. Mua theo nhu cầu, không theo áp lực.
''',
        example='Bạn trả: 10.000.000 × 20% = 2.000.000đ; bảo hiểm trả: 10.000.000 − 2.000.000 = 8.000.000đ. Phí: 6.000.000 / 12 = 500.000đ/tháng; 6.000.000 × 15 = 90.000.000đ tổng phí.',
        questions=[
            ('Hợp đồng có đồng chi trả 30%, chi phí hợp lệ 5.000.000đ. Phần bạn tự trả là bao nhiêu?', ['1.500.000đ', '3.500.000đ', '5.000.000đ'],
             ['Đúng: 5.000.000 × 30% = 1.500.000đ.', 'Đây là phần bảo hiểm trả.', 'Đây là toàn bộ chi phí.']),
            ('Thời gian cân nhắc 21 ngày theo Luật Kinh doanh bảo hiểm 2022 áp dụng cho loại hợp đồng nào?', ['Mọi hợp đồng, kể cả bảo hiểm xe 1 năm', 'Hợp đồng bảo hiểm nhân thọ hoặc sức khỏe có thời hạn trên 1 năm', 'Chỉ hợp đồng mua trực tuyến'],
             ['Quy định này không áp cho mọi loại hợp đồng.', 'Đúng: theo Điều 35 Luật Kinh doanh bảo hiểm 2022.', 'Kênh mua không quyết định quyền này.']),
            ('Người tư vấn nói hợp đồng là "gửi tiết kiệm lãi cao". Nên làm gì?', ['Ký ngay vì lãi cao', 'Gửi ảnh căn cước trước để giữ suất', 'Đọc kỹ: đây là bảo hiểm; hỏi quyền lợi, phí và giá trị hoàn lại nếu dừng sớm'],
             ['Ký vội khi chưa hiểu sản phẩm là rủi ro.', 'Không cần gửi giấy tờ để "giữ suất".', 'Đúng: phân biệt bảo hiểm với tiền gửi trước khi quyết định.']),
        ],
        action='Nếu đang có hợp đồng bảo hiểm, thêm ngày đóng phí vào mục Hóa đơn của Picket và tạo một túi cho phí năm chia 12.',
        support=dict(keyTakeaways=['Bảo hiểm chuyển một phần rủi ro, không phải công cụ làm giàu.', 'Đọc quyền lợi, loại trừ, thời gian chờ, đồng chi trả và giá trị hoàn lại.', 'Hợp đồng nhân thọ, sức khỏe trên 1 năm có 21 ngày cân nhắc.'],
            misconception='Coi hợp đồng bảo hiểm có yếu tố đầu tư giống hệt sổ tiết kiệm.',
            practicePrompt='Phí bảo hiểm 4.800.000đ mỗi năm, đóng một lần. Mỗi tháng cần dành bao nhiêu? Đóng 10 năm thì tổng phí là bao nhiêu?',
            solutionSteps=['Mỗi tháng: 4.800.000 / 12 = 400.000đ.', 'Tổng 10 năm: 4.800.000 × 10 = 48.000.000đ.', 'So tổng phí với quyền lợi thực sự cần để quyết định có phù hợp không.'],
            answer='Dành 400.000đ mỗi tháng; tổng phí 10 năm là 48.000.000đ.')),
    en=dict(title='Insurance basics: read benefits, exclusions and premiums',
        objective='Understand that insurance transfers part of a risk, read the key terms and work out the share you pay yourself.',
        body='''
Insurance moves part of a financial risk to an insurer in exchange for a premium. It is most useful for risks you would struggle to carry alone, such as large medical bills. It is not a way to get rich, and it is different from a savings deposit.

Before signing, read: the benefits paid, the sum insured, the exclusions, waiting periods, the co-payment rate, the premium schedule and what happens if you stop paying early. If an adviser describes a policy as "a high-interest savings deposit", ask again: this is an insurance contract, so what is the surrender value if I stop early?

A fictional example: a health policy has a 20% co-payment. Eligible treatment costs 10,000,000 VND. You pay 2,000,000 VND yourself and the insurer pays 8,000,000 VND if the cost is covered. If the annual premium is 6,000,000 VND, you need to set aside 500,000 VND per month. Paid for 15 years, total premiums are 90,000,000 VND.

Vietnam's Insurance Business Law 2022, Article 35, gives buyers of life or health contracts with a term over 1 year 21 days to reconsider after receiving the contract. Use this time to read carefully. Buy for a need, not under pressure.
''',
        example='You pay: 10,000,000 × 20% = 2,000,000 VND; insurer pays: 10,000,000 − 2,000,000 = 8,000,000 VND. Premium: 6,000,000 / 12 = 500,000 VND per month; 6,000,000 × 15 = 90,000,000 VND in total.',
        questions=[
            ('A policy has a 30% co-payment and the eligible cost is 5,000,000 VND. How much do you pay yourself?', ['1,500,000 VND', '3,500,000 VND', '5,000,000 VND'],
             ['Correct: 5,000,000 × 30% = 1,500,000 VND.', 'This is the insurer\'s share.', 'This is the whole cost.']),
            ('Which contracts get the 21-day reconsideration period under the Insurance Business Law 2022?', ['Every contract, including 1-year vehicle cover', 'Life or health contracts with a term over 1 year', 'Only contracts bought online'],
             ['The rule does not apply to every type of contract.', 'Correct: under Article 35 of the Insurance Business Law 2022.', 'The sales channel does not decide this right.']),
            ('An adviser says the policy is "a high-interest savings deposit". What should you do?', ['Sign now because the interest is high', 'Send an ID photo first to hold a place', 'Read carefully: it is insurance; ask about benefits, premiums and the surrender value if you stop early'],
             ['Signing before you understand the product is risky.', 'You do not need to send documents to "hold a place".', 'Correct: tell insurance and deposits apart before deciding.']),
        ],
        action='If you have an insurance policy, add its premium date under Bills in Picket and create a pocket for the annual premium divided by 12.',
        support=dict(keyTakeaways=['Insurance transfers part of a risk; it is not a wealth-building tool.', 'Read benefits, exclusions, waiting periods, co-payment and surrender value.', 'Life and health contracts over 1 year have a 21-day reconsideration period.'],
            misconception='Treating an investment-linked insurance policy as identical to a savings account.',
            practicePrompt='A premium of 4,800,000 VND per year is paid once a year. How much should be set aside each month? What are total premiums over 10 years?',
            solutionSteps=['Per month: 4,800,000 / 12 = 400,000 VND.', 'Total over 10 years: 4,800,000 × 10 = 48,000,000 VND.', 'Compare total premiums with the benefits you actually need before deciding it fits.'],
            answer='Set aside 400,000 VND per month; total premiums over 10 years are 48,000,000 VND.')))

lesson(25, 'stage-03-protection', 12, 'consumer.rights-and-complaints', ['consumer-law-2023', 'payment-safety', 'trial'],
    [('650000+30000', 680000), ('680000-650000', 30000)], [0, 1, 2],
    [('240000+360000+20000', 620000), ('620000-360000', 260000)],
    figures=[fig('Consumer Protection Law 2023 effective 2024-07-01; bans misleading information, harassment and coercion', 'consumer-law-2023', '2024-07-01')],
    vi=dict(title='Quyền người tiêu dùng và khiếu nại có chứng từ',
        objective='Biết các quyền cơ bản của người tiêu dùng và các bước khiếu nại có chứng từ.',
        body='''
Luật Bảo vệ quyền lợi người tiêu dùng 2023 có hiệu lực từ 1/7/2024. Người bán không được đưa thông tin sai hoặc gây nhầm lẫn về hàng hóa và điều kiện giao dịch. Người bán không được làm phiền bằng cách liên tục chào mời trái ý muốn, hay ép mua. Khi hàng không đúng như đã đăng ký, quảng cáo hoặc cam kết, người tiêu dùng có quyền yêu cầu đổi hoặc hoàn tiền theo quy định.

Khiếu nại hiệu quả cần chứng từ. Hãy giữ hóa đơn, ảnh sản phẩm, ảnh mô tả lúc mua và tin nhắn với người bán. Liên hệ người bán trước, nêu rõ vấn đề và điều bạn yêu cầu. Nếu không được giải quyết, có thể chuyển tới sàn thương mại điện tử, tổ chức bảo vệ người tiêu dùng hoặc cơ quan quản lý. Với thanh toán qua thẻ hay ví, hãy hỏi đơn vị thanh toán qua kênh chính thức.

Ví dụ hư cấu: Thảo mua tai nghe 650.000đ, phí giao 30.000đ, tổng 680.000đ. Hàng giao sai mẫu. Nếu người bán chỉ hoàn giá hàng, Thảo nhận 650.000đ và vẫn mất 30.000đ phí giao. Thảo chỉ ghi khoản hoàn vào sổ khi tiền thực sự về.

Cẩn thận với người lạ nhắn tin hứa "hỗ trợ hoàn tiền" rồi đòi phí hay OTP. Kênh khiếu nại chính thức không cần mã OTP của bạn.
''',
        example='Đã trả: 650.000 + 30.000 = 680.000đ. Nếu chỉ hoàn giá hàng, phần không được hoàn: 680.000 − 650.000 = 30.000đ.',
        questions=[
            ('Hàng nhận khác mô tả đã quảng cáo. Bước đầu hợp lý là gì?', ['Lưu chứng từ, ảnh và liên hệ người bán với yêu cầu cụ thể', 'Đăng thông tin cá nhân của người bán lên mạng', 'Chuyển phí cho người lạ hứa hỗ trợ hoàn tiền'],
             ['Đúng: có chứng từ và yêu cầu rõ ràng giúp giải quyết nhanh hơn.', 'Hành vi này có thể gây rắc rối pháp lý cho chính bạn.', 'Đây là kịch bản lừa đảo thường gặp.']),
            ('Người bán đồng ý hoàn 650.000đ nhưng tiền chưa về. Trong Picket nên làm gì?', ['Ghi khoản thu ngay', 'Chờ tiền về rồi mới ghi khoản hoàn; có thể ghi chú là đang chờ', 'Xóa giao dịch mua cũ'],
             ['Lời hứa chưa phải tiền đã nhận.', 'Đúng: chỉ ghi khi tiền thực sự về.', 'Giao dịch mua đã xảy ra và vẫn cần lưu.']),
            ('Người bán gọi điện chào mời nhiều lần dù bạn đã từ chối. Theo bài, đây là gì?', ['Hành vi bình thường luôn được phép', 'Chỉ sai nếu gọi vào ban đêm', 'Hành vi bị cấm khi liên tục làm phiền trái ý muốn người tiêu dùng'],
             ['Luật 2023 cấm làm phiền trái ý muốn.', 'Luật không chỉ giới hạn theo giờ gọi.', 'Đúng: đây là một trong các hành vi bị cấm.']),
        ],
        action='Khi mua hàng, đính kèm ảnh hóa đơn vào giao dịch trong Picket để có chứng từ nếu cần khiếu nại sau này.',
        support=dict(keyTakeaways=['Hàng không đúng cam kết có thể được đổi hoặc hoàn theo quy định.', 'Giữ hóa đơn, ảnh và tin nhắn trước khi khiếu nại.', 'Liên hệ người bán trước, rồi mới đến sàn, tổ chức bảo vệ người tiêu dùng hay cơ quan quản lý.'],
            misconception='Nghĩ rằng phải trả phí cho người "hỗ trợ" thì mới được hoàn tiền.',
            practicePrompt='Mua hai món 240.000đ và 360.000đ, phí giao 20.000đ. Trả lại món 360.000đ và được hoàn đúng 360.000đ. Chi tiêu thực sau cùng là bao nhiêu?',
            solutionSteps=['Đã trả: 240.000 + 360.000 + 20.000 = 620.000đ.', 'Khoản hoàn đã về: 360.000đ.', 'Chi thực: 620.000 − 360.000 = 260.000đ.'],
            answer='Chi tiêu thực là 260.000đ, gồm món giữ lại và phí giao.')),
    en=dict(title='Consumer rights and evidence-based complaints',
        objective='Know basic consumer rights and the steps of a complaint backed by evidence.',
        body='''
Vietnam's Consumer Protection Law 2023 took effect on 1 July 2024. Sellers must not give false or misleading information about goods or transaction terms. Sellers must not harass you with repeated unwanted offers, or force you to buy. When goods do not match what was registered, advertised or promised, consumers may request an exchange or refund under the rules.

An effective complaint needs evidence. Keep the receipt, photos of the product, screenshots of the listing and your messages with the seller. Contact the seller first, describe the problem and state what you want. If it is not resolved, you can escalate to the e-commerce platform, a consumer protection organisation or the regulator. For card or e-wallet payments, ask the payment provider through its official channel.

A fictional example: Thảo buys headphones for 650,000 VND plus 30,000 VND delivery, 680,000 VND in total. The wrong model arrives. If the seller refunds only the item price, Thảo receives 650,000 VND and still loses the 30,000 VND delivery fee. Thảo records the refund only when the money actually arrives.

Be careful with strangers who message you offering "refund help" and then ask for a fee or OTP. Official complaint channels do not need your OTP.
''',
        example='Paid: 650,000 + 30,000 = 680,000 VND. If only the item price is refunded, the unrefunded part is 680,000 − 650,000 = 30,000 VND.',
        questions=[
            ('The goods differ from the advertised description. What is a sensible first step?', ['Keep the receipt and photos and contact the seller with a specific request', 'Post the seller\'s personal details online', 'Pay a fee to a stranger promising refund help'],
             ['Correct: evidence and a clear request make resolution faster.', 'This could create legal trouble for you.', 'This is a common scam script.']),
            ('The seller agrees to refund 650,000 VND but the money has not arrived. What should you do in Picket?', ['Record the income now', 'Wait for the money before recording the refund; you may add a note that it is pending', 'Delete the original purchase'],
             ['A promise is not money received.', 'Correct: record it only when the money actually arrives.', 'The purchase happened and should stay recorded.']),
            ('A seller keeps calling with offers after you have refused. According to the lesson, what is this?', ['Normal behaviour that is always allowed', 'Only wrong if the calls are at night', 'A prohibited practice when it repeatedly disturbs consumers against their wishes'],
             ['The 2023 law bans unwanted harassment.', 'The law is not limited to call times.', 'Correct: this is one of the prohibited practices.']),
        ],
        action='When you buy something, attach a photo of the receipt to the transaction in Picket so you have evidence if you need to complain later.',
        support=dict(keyTakeaways=['Goods that do not match the promise may be exchanged or refunded under the rules.', 'Keep receipts, photos and messages before complaining.', 'Contact the seller first, then the platform, a consumer organisation or the regulator.'],
            misconception='Believing you must pay a "helper" a fee to get a refund.',
            practicePrompt='You buy two items for 240,000 VND and 360,000 VND with 20,000 VND delivery. You return the 360,000 VND item and receive exactly 360,000 VND back. What is your final real spending?',
            solutionSteps=['Paid: 240,000 + 360,000 + 20,000 = 620,000 VND.', 'Refund received: 360,000 VND.', 'Real spending: 620,000 − 360,000 = 260,000 VND.'],
            answer='Real spending is 260,000 VND, covering the item you kept and delivery.')))

# ---------------------------------------------------------------- Stage 4
lesson(26, 'stage-04-growth', 13, 'saving.compound-interest', ['oecd-core-2016', 'saving'],
    [('10000000*6/100', 600000), ('10600000*6/100', 636000), ('10600000+636000', 11236000), ('10000000+2*600000', 11200000), ('11236000-11200000', 36000)], [1, 0, 2],
    [('20000000*105/100', 21000000), ('21000000*105/100', 22050000), ('22050000*105/100', 23152500)],
    vi=dict(title='Lãi kép: tiền lãi cũng sinh lãi',
        objective='Phân biệt lãi đơn với lãi kép và tính số dư qua nhiều kỳ ghép lãi.',
        body='''
Lãi đơn chỉ tính trên tiền gốc ban đầu. Lãi kép tính trên cả tiền gốc và phần lãi đã được cộng vào. Theo thời gian, khoảng cách giữa hai cách tính lớn dần. Vì vậy, bắt đầu sớm và duy trì đều đặn thường quan trọng hơn một lần góp lớn.

Ví dụ hư cấu: Phúc có 10.000.000đ, lãi suất giả định 6% mỗi năm, ghép lãi mỗi năm một lần. Năm thứ nhất, lãi là 600.000đ, số dư thành 10.600.000đ. Năm thứ hai, lãi tính trên 10.600.000đ nên là 636.000đ, số dư thành 11.236.000đ. Nếu là lãi đơn, sau 2 năm Phúc có 11.200.000đ. Chênh lệch 36.000đ đến từ lãi của tiền lãi. Sau nhiều năm, chênh lệch này lớn hơn nhiều.

Lãi kép cũng tác động theo chiều ngược lại với nợ. Dư nợ không trả và lãi cộng dồn khiến nợ tăng nhanh hơn theo thời gian.

Lãi suất trong bài là giả định để học cách tính, không phải lời hứa về lợi nhuận. Lãi suất thật phụ thuộc sản phẩm, kỳ hạn và thời điểm, và có thể thay đổi.
''',
        example='Năm 1: 10.000.000 × 6% = 600.000đ. Năm 2: 10.600.000 × 6% = 636.000đ; 10.600.000 + 636.000 = 11.236.000đ. Lãi đơn: 10.000.000 + 2 × 600.000 = 11.200.000đ. Chênh lệch: 36.000đ.',
        questions=[
            ('5.000.000đ, lãi giả định 10% mỗi năm, ghép lãi hằng năm. Sau 2 năm có bao nhiêu?', ['6.000.000đ', '6.050.000đ', '5.500.000đ'],
             ['Đây là lãi đơn: 5.000.000 + 2 × 500.000.', 'Đúng: 5.500.000 × 110% = 6.050.000đ.', 'Đây mới là sau 1 năm.']),
            ('Lãi kép khác lãi đơn ở điểm nào?', ['Lãi được tính cả trên phần lãi đã cộng vào gốc', 'Lãi luôn cao gấp đôi', 'Không có rủi ro'],
             ['Đúng: đó là định nghĩa của lãi kép.', 'Không có quy tắc gấp đôi.', 'Cách tính lãi không loại bỏ rủi ro của sản phẩm.']),
            ('Dư nợ thẻ không trả và lãi được cộng dồn. Lãi kép tác động thế nào?', ['Không ảnh hưởng đến nợ', 'Làm nợ giảm dần', 'Làm nợ tăng nhanh hơn theo thời gian'],
             ['Lãi cộng dồn làm dư nợ thay đổi.', 'Không trả thì nợ không giảm.', 'Đúng: lãi kép bất lợi khi bạn là người đi vay.']),
        ],
        action='Tạo một túi tiết kiệm mục tiêu trong Picket với mức góp đều mỗi tháng; xem lại sau mỗi tháng để thấy số tích lũy.',
        support=dict(keyTakeaways=['Lãi kép tính lãi trên cả lãi đã cộng vào gốc.', 'Thời gian và sự đều đặn làm lãi kép rõ rệt hơn.', 'Với nợ, lãi kép làm số phải trả tăng nhanh hơn.'],
            misconception='Nghĩ rằng lãi kép chỉ khác lãi đơn một chút nên không đáng quan tâm.',
            practicePrompt='20.000.000đ, lãi giả định 5% mỗi năm, ghép lãi hằng năm. Tính số dư sau 3 năm.',
            solutionSteps=['Năm 1: 20.000.000 × 105% = 21.000.000đ.', 'Năm 2: 21.000.000 × 105% = 22.050.000đ.', 'Năm 3: 22.050.000 × 105% = 23.152.500đ.'],
            answer='Sau 3 năm số dư là 23.152.500đ theo giả định của bài.')),
    en=dict(title='Compound interest: interest that earns interest',
        objective='Tell simple and compound interest apart and calculate a balance over several compounding periods.',
        body='''
Simple interest is calculated only on the original principal. Compound interest is calculated on the principal plus interest already added. Over time the gap between the two grows. That is why starting early and staying consistent often matters more than one large contribution.

A fictional example: Phúc has 10,000,000 VND at an assumed rate of 6% per year, compounded once a year. In year one, interest is 600,000 VND and the balance becomes 10,600,000 VND. In year two, interest is calculated on 10,600,000 VND, so it is 636,000 VND and the balance becomes 11,236,000 VND. With simple interest, after 2 years Phúc would have 11,200,000 VND. The 36,000 VND difference is interest earned on interest. Over many years the difference becomes much larger.

Compounding also works in reverse with debt. An unpaid balance with interest added on top grows faster over time.

The rate in this lesson is an assumption for practising the calculation, not a promise of returns. Real rates depend on the product, term and timing, and can change.
''',
        example='Year 1: 10,000,000 × 6% = 600,000 VND. Year 2: 10,600,000 × 6% = 636,000 VND; 10,600,000 + 636,000 = 11,236,000 VND. Simple: 10,000,000 + 2 × 600,000 = 11,200,000 VND. Difference: 36,000 VND.',
        questions=[
            ('5,000,000 VND at an assumed 10% per year, compounded yearly. How much after 2 years?', ['6,000,000 VND', '6,050,000 VND', '5,500,000 VND'],
             ['This is simple interest: 5,000,000 + 2 × 500,000.', 'Correct: 5,500,000 × 110% = 6,050,000 VND.', 'This is only after 1 year.']),
            ('How does compound interest differ from simple interest?', ['Interest is also earned on interest already added to the principal', 'Interest is always double', 'There is no risk'],
             ['Correct: that is the definition of compounding.', 'There is no doubling rule.', 'How interest is calculated does not remove product risk.']),
            ('An unpaid card balance has interest added to it. How does compounding affect it?', ['It does not affect the debt', 'It makes the debt shrink', 'It makes the debt grow faster over time'],
             ['Added interest changes the balance.', 'Without payments the debt does not shrink.', 'Correct: compounding works against you as a borrower.']),
        ],
        action='Create a savings-goal pocket in Picket with a regular monthly amount; check it after each month to see what has built up.',
        support=dict(keyTakeaways=['Compound interest earns interest on interest already added.', 'Time and consistency make compounding more visible.', 'With debt, compounding makes the amount owed grow faster.'],
            misconception='Thinking compound interest differs so little from simple interest that it does not matter.',
            practicePrompt='20,000,000 VND at an assumed 5% per year, compounded yearly. Find the balance after 3 years.',
            solutionSteps=['Year 1: 20,000,000 × 105% = 21,000,000 VND.', 'Year 2: 21,000,000 × 105% = 22,050,000 VND.', 'Year 3: 22,050,000 × 105% = 23,152,500 VND.'],
            answer='After 3 years the balance is 23,152,500 VND under the lesson assumptions.')))

lesson(27, 'stage-04-growth', 13, 'saving.term-deposits', ['oecd-core-2016', 'deposit-insurance-2026', 'emergency'],
    [('50000000*5/100', 2500000), ('50000000*5/1000*6/12', 125000), ('2500000-125000', 2375000)], [0, 1, 2],
    [('24000000*48/1000', 1152000), ('24000000*2/1000*3/12', 12000)],
    vi=dict(title='Tiền gửi có kỳ hạn và rút trước hạn',
        objective='Tính tiền lãi khi giữ đến hạn, hiểu chi phí rút trước hạn và chọn kỳ hạn theo lúc cần tiền.',
        body='''
Tiền gửi có kỳ hạn thường có lãi suất cao hơn tiền gửi không kỳ hạn, đổi lại bạn cam kết để tiền đến hết kỳ hạn. Nếu rút trước hạn, tiền lãi thường thấp hơn nhiều so với khi giữ đến hạn. Mức cụ thể do điều khoản của từng tổ chức quy định, nên cần đọc trước khi gửi.

Ví dụ hư cấu: Trang gửi 50.000.000đ, kỳ hạn 12 tháng, lãi suất giả định 5% mỗi năm. Giữ đến hạn, tiền lãi là 2.500.000đ. Nếu cần tiền sau 6 tháng và điều khoản cho lãi rút trước hạn 0,5% mỗi năm, tiền lãi chỉ là 50.000.000 × 0,5% × 6/12 = 125.000đ. Trang bỏ lỡ 2.375.000đ so với giữ đến hạn. Tiền gốc vẫn còn, nhưng phần lãi giảm mạnh.

Vì vậy, kỳ hạn nên khớp với lúc bạn có thể cần tiền. Quỹ dự phòng cần rút nhanh không nên nằm hết trong một khoản kỳ hạn dài. Một số người chia tiền thành nhiều khoản có ngày đáo hạn khác nhau để luôn có một phần sắp đến hạn.

Trước khi gửi, hãy đọc: lãi suất, kỳ hạn, điều kiện rút trước hạn và điều gì xảy ra khi đến hạn, ví dụ tự động gửi tiếp. Bài này không gợi ý tổ chức hay sản phẩm cụ thể nào.
''',
        example='Giữ đến hạn: 50.000.000 × 5% = 2.500.000đ. Rút sau 6 tháng: 50.000.000 × 0,5% × 6/12 = 125.000đ. Bỏ lỡ: 2.500.000 − 125.000 = 2.375.000đ.',
        questions=[
            ('Gửi 30.000.000đ kỳ hạn 12 tháng, lãi giả định 6% mỗi năm, giữ đến hạn. Tiền lãi là bao nhiêu?', ['1.800.000đ', '180.000đ', '6.000.000đ'],
             ['Đúng: 30.000.000 × 6% = 1.800.000đ.', 'Đây là 0,6%, sai một chữ số.', 'Đây là 20%, không phải 6%.']),
            ('Vì sao không nên để toàn bộ quỹ dự phòng trong một khoản kỳ hạn dài?', ['Vì tiền gửi luôn mất gốc', 'Rút trước hạn có thể chỉ được lãi thấp theo điều khoản', 'Vì kỳ hạn dài bị cấm'],
             ['Rút trước hạn thường ảnh hưởng tiền lãi, không phải mất gốc.', 'Đúng: quỹ dự phòng cần rút được khi cần mà ít thiệt.', 'Không có quy định như vậy.']),
            ('Thông tin nào cần đọc trước khi gửi có kỳ hạn?', ['Màu của thẻ', 'Số người đã gửi', 'Lãi suất, kỳ hạn, điều kiện rút trước hạn và cách xử lý khi đến hạn'],
             ['Không ảnh hưởng đến tiền của bạn.', 'Mức phổ biến không thay cho điều khoản.', 'Đúng: đây là các điều khoản quyết định tiền bạn nhận.']),
        ],
        action='Nếu có khoản tiền gửi kỳ hạn, thêm ngày đáo hạn vào mục Hóa đơn của Picket như một lời nhắc để quyết định trước ngày đó.',
        support=dict(keyTakeaways=['Tiền lãi khi giữ đến hạn = gốc × lãi suất năm × thời gian tính theo năm.', 'Rút trước hạn thường làm tiền lãi giảm mạnh.', 'Chọn kỳ hạn khớp với lúc có thể cần tiền.'],
            misconception='Nghĩ rằng rút trước hạn vẫn được hưởng đủ lãi theo tỷ lệ thời gian đã gửi.',
            practicePrompt='Gửi 24.000.000đ kỳ hạn 12 tháng, lãi giả định 4,8% mỗi năm. Tính tiền lãi khi giữ đến hạn, và khi rút sau 3 tháng với lãi rút trước hạn 0,2% mỗi năm.',
            solutionSteps=['Giữ đến hạn: 24.000.000 × 4,8% = 1.152.000đ.', 'Rút sau 3 tháng: 24.000.000 × 0,2% × 3/12 = 12.000đ.', 'So sánh: rút sớm chỉ nhận một phần rất nhỏ của tiền lãi đến hạn.'],
            answer='Giữ đến hạn được 1.152.000đ tiền lãi; rút sau 3 tháng chỉ được 12.000đ theo giả định.')),
    en=dict(title='Term deposits and early withdrawal',
        objective='Calculate interest held to maturity, understand the cost of early withdrawal and match the term to when you may need the money.',
        body='''
Term deposits usually pay a higher rate than demand deposits, in exchange for your commitment to leave the money until the term ends. If you withdraw early, interest is usually much lower than if you hold to maturity. The exact rate is set by each institution's terms, so read them before depositing.

A fictional example: Trang deposits 50,000,000 VND for a 12-month term at an assumed 5% per year. Held to maturity, interest is 2,500,000 VND. If Trang needs the money after 6 months and the terms give an early-withdrawal rate of 0.5% per year, interest is only 50,000,000 × 0.5% × 6/12 = 125,000 VND. Trang gives up 2,375,000 VND compared with holding to maturity. The principal is still there, but the interest falls sharply.

So the term should match when you might need the money. An emergency fund that must be reachable quickly should not sit entirely in one long-term deposit. Some people split money into several deposits with different maturity dates so one part is always maturing soon.

Before depositing, read: the rate, the term, early-withdrawal conditions and what happens at maturity, such as automatic renewal. This lesson does not suggest any specific institution or product.
''',
        example='Held to maturity: 50,000,000 × 5% = 2,500,000 VND. Withdrawn after 6 months: 50,000,000 × 0.5% × 6/12 = 125,000 VND. Given up: 2,500,000 − 125,000 = 2,375,000 VND.',
        questions=[
            ('You deposit 30,000,000 VND for 12 months at an assumed 6% per year and hold to maturity. How much interest?', ['1,800,000 VND', '180,000 VND', '6,000,000 VND'],
             ['Correct: 30,000,000 × 6% = 1,800,000 VND.', 'This is 0.6%, one digit off.', 'This is 20%, not 6%.']),
            ('Why not keep an entire emergency fund in one long-term deposit?', ['Because deposits always lose principal', 'Early withdrawal may earn only a low rate under the terms', 'Because long terms are prohibited'],
             ['Early withdrawal usually affects interest, not principal.', 'Correct: an emergency fund must be reachable with little loss.', 'There is no such rule.']),
            ('What should you read before making a term deposit?', ['The colour of the card', 'How many other people deposited', 'The rate, term, early-withdrawal conditions and what happens at maturity'],
             ['This does not affect your money.', 'Popularity does not replace the terms.', 'Correct: these terms decide what you receive.']),
        ],
        action='If you have a term deposit, add its maturity date under Bills in Picket as a reminder to decide before that day.',
        support=dict(keyTakeaways=['Interest held to maturity = principal × annual rate × time in years.', 'Early withdrawal usually cuts interest sharply.', 'Match the term to when you may need the money.'],
            misconception='Believing early withdrawal still earns the full rate for the time already deposited.',
            practicePrompt='A deposit of 24,000,000 VND for 12 months at an assumed 4.8% per year. Calculate interest held to maturity, and after 3 months with an early-withdrawal rate of 0.2% per year.',
            solutionSteps=['Held to maturity: 24,000,000 × 4.8% = 1,152,000 VND.', 'Withdrawn after 3 months: 24,000,000 × 0.2% × 3/12 = 12,000 VND.', 'Comparison: early withdrawal earns only a tiny part of the maturity interest.'],
            answer='Holding to maturity earns 1,152,000 VND; withdrawing after 3 months earns only 12,000 VND under the assumptions.')))

lesson(24, 'stage-04-growth', 13, 'saving.deposit-insurance', ['deposit-insurance-2026', 'oecd-core-2016'],
    [('400000000+20000000', 420000000), ('420000000-350000000', 70000000), ('350000000-125000000', 225000000)], [1, 0, 2],
    [('380000000-350000000', 30000000), ('200000000+380000000', 580000000)],
    figures=[fig('Deposit-insurance payout limit 350,000,000 VND per person per participating institution (principal + interest) from 2026-07-13 under Circular 05/2026/TT-NHNN; previously 125,000,000 VND', 'deposit-insurance-2026', '2026-07-13')],
    vi=dict(title='Bảo hiểm tiền gửi: hạn mức và những gì không phải tiền gửi',
        objective='Hiểu hạn mức bảo hiểm tiền gửi hiện hành và phân biệt tiền gửi với sản phẩm khác bán tại ngân hàng.',
        body='''
Bảo hiểm tiền gửi Việt Nam trả tiền cho người gửi khi một tổ chức tham gia bảo hiểm tiền gửi phát sinh nghĩa vụ trả tiền bảo hiểm. Số tiền trả có hạn mức. Theo Thông tư 05/2026/TT-NHNN, từ ngày 13/7/2026, hạn mức là 350.000.000đ cho tất cả tiền gửi được bảo hiểm của một người tại một tổ chức, gồm cả gốc và lãi. Trước đó, hạn mức là 125.000.000đ theo Quyết định 32/2021/QĐ-TTg. Mức mới cao hơn 225.000.000đ.

Phần vượt hạn mức không bị xóa ngay, nhưng được xử lý theo quá trình xử lý tài sản của tổ chức đó. Vì vậy, người có số dư lớn tại một nơi nên biết phần nào nằm trong hạn mức.

Ví dụ hư cấu: Châu có 400.000.000đ gốc và 20.000.000đ lãi tại một tổ chức, tổng 420.000.000đ. Phần trong hạn mức là 350.000.000đ. Phần vượt là 70.000.000đ.

Không phải mọi sản phẩm bán tại quầy ngân hàng đều là tiền gửi. Chứng chỉ quỹ, trái phiếu hay hợp đồng bảo hiểm có cơ chế khác. Khi được mời một sản phẩm "lãi cao hơn tiết kiệm", câu hỏi đầu tiên là: đây có phải tiền gửi không? Hãy đọc chứng từ trước khi ký.
''',
        example='Tổng: 400.000.000 + 20.000.000 = 420.000.000đ. Vượt hạn mức: 420.000.000 − 350.000.000 = 70.000.000đ. Hạn mức tăng: 350.000.000 − 125.000.000 = 225.000.000đ.',
        questions=[
            ('Từ ngày 13/7/2026, hạn mức tối đa cho một người tại một tổ chức là bao nhiêu?', ['125.000.000đ', '350.000.000đ', 'Không giới hạn'],
             ['Đây là hạn mức cũ trước ngày 13/7/2026.', 'Đúng: theo Thông tư 05/2026/TT-NHNN.', 'Bảo hiểm tiền gửi có hạn mức.']),
            ('Có 300.000.000đ gốc và 10.000.000đ lãi tại một tổ chức tham gia bảo hiểm tiền gửi. Số này có nằm trong hạn mức không?', ['Có, tổng 310.000.000đ thấp hơn 350.000.000đ', 'Không, vì lãi không được tính', 'Chỉ 125.000.000đ được bảo hiểm'],
             ['Đúng: hạn mức tính cả gốc và lãi.', 'Hạn mức gồm cả gốc và lãi.', 'Đây là hạn mức cũ.']),
            ('Một sản phẩm tại quầy ngân hàng hứa lãi cao hơn tiết kiệm. Câu hỏi đầu tiên nên là gì?', ['Có quà tặng gì?', 'Bao nhiêu người đã mua?', 'Đây có phải tiền gửi không, hay là sản phẩm đầu tư hoặc bảo hiểm?'],
             ['Quà tặng không thay đổi bản chất sản phẩm.', 'Số người mua không chứng minh sản phẩm phù hợp.', 'Đúng: loại sản phẩm quyết định quyền lợi và rủi ro.']),
        ],
        action='Trong Picket, đặt tên ví theo tổ chức giữ tiền để thấy tổng số dư ở mỗi nơi. Không cần nhập số tài khoản.',
        support=dict(keyTakeaways=['Từ 13/7/2026, hạn mức là 350.000.000đ cho một người tại một tổ chức, gồm gốc và lãi.', 'Phần vượt hạn mức được xử lý theo quá trình xử lý tài sản của tổ chức.', 'Sản phẩm đầu tư hay bảo hiểm bán tại ngân hàng không phải tiền gửi.'],
            misconception='Nghĩ rằng mọi thứ mua ở quầy ngân hàng đều được bảo hiểm tiền gửi.',
            practicePrompt='Có 200.000.000đ ở tổ chức A và 380.000.000đ (đã gồm lãi) ở tổ chức B. Mỗi nơi có vượt hạn mức 350.000.000đ không, vượt bao nhiêu?',
            solutionSteps=['A: 200.000.000đ thấp hơn 350.000.000đ nên nằm trong hạn mức.', 'B: 380.000.000 − 350.000.000 = 30.000.000đ vượt hạn mức.', 'Tổng hai nơi 200.000.000 + 380.000.000 = 580.000.000đ, nhưng hạn mức tính riêng cho từng tổ chức.'],
            answer='A nằm trong hạn mức; B vượt 30.000.000đ.')),
    en=dict(title='Deposit insurance: the limit and what is not a deposit',
        objective='Understand the current deposit-insurance limit and tell deposits apart from other products sold at banks.',
        body='''
Deposit Insurance of Vietnam pays depositors when a participating institution becomes subject to an insurance payout. The amount paid has a limit. Under Circular 05/2026/TT-NHNN, from 13 July 2026, the limit is 350,000,000 VND for all insured deposits of one person at one institution, including principal and interest. Before that, the limit was 125,000,000 VND under Decision 32/2021/QĐ-TTg. The new limit is 225,000,000 VND higher.

The part above the limit is not erased immediately; it is handled through the institution's asset-resolution process. So people with large balances at one place should know which part is within the limit.

A fictional example: Châu has 400,000,000 VND principal and 20,000,000 VND interest at one institution, 420,000,000 VND in total. The part within the limit is 350,000,000 VND. The excess is 70,000,000 VND.

Not every product sold at a bank counter is a deposit. Fund certificates, bonds and insurance contracts work differently. When offered a product with "a higher rate than savings", the first question is: is this a deposit? Read the documents before signing.
''',
        example='Total: 400,000,000 + 20,000,000 = 420,000,000 VND. Above the limit: 420,000,000 − 350,000,000 = 70,000,000 VND. Limit increase: 350,000,000 − 125,000,000 = 225,000,000 VND.',
        questions=[
            ('From 13 July 2026, what is the maximum for one person at one institution?', ['125,000,000 VND', '350,000,000 VND', 'No limit'],
             ['This was the old limit before 13 July 2026.', 'Correct: under Circular 05/2026/TT-NHNN.', 'Deposit insurance has a limit.']),
            ('You have 300,000,000 VND principal and 10,000,000 VND interest at a participating institution. Is this within the limit?', ['Yes, the 310,000,000 VND total is below 350,000,000 VND', 'No, because interest does not count', 'Only 125,000,000 VND is insured'],
             ['Correct: the limit counts both principal and interest.', 'The limit includes principal and interest.', 'This is the old limit.']),
            ('A product at a bank counter promises more than savings. What should the first question be?', ['What gift comes with it?', 'How many people have bought it?', 'Is this a deposit, or an investment or insurance product?'],
             ['A gift does not change what the product is.', 'Popularity does not prove the product suits you.', 'Correct: the product type decides its protections and risks.']),
        ],
        action='In Picket, name each wallet after the institution that holds it so you can see the total at each place. You do not need to enter account numbers.',
        support=dict(keyTakeaways=['From 13 July 2026 the limit is 350,000,000 VND per person per institution, principal and interest.', 'Amounts above the limit are handled through the institution\'s asset resolution.', 'Investment or insurance products sold at banks are not deposits.'],
            misconception='Believing everything bought at a bank counter is covered by deposit insurance.',
            practicePrompt='You hold 200,000,000 VND at institution A and 380,000,000 VND (including interest) at institution B. Is either above the 350,000,000 VND limit, and by how much?',
            solutionSteps=['A: 200,000,000 VND is below 350,000,000 VND, so it is within the limit.', 'B: 380,000,000 − 350,000,000 = 30,000,000 VND above the limit.', 'Together 200,000,000 + 380,000,000 = 580,000,000 VND, but the limit applies to each institution separately.'],
            answer='A is within the limit; B is 30,000,000 VND above it.')))

lesson(28, 'stage-04-growth', 14, 'investing.inflation-real-return', ['oecd-core-2016'],
    [('1000000*104/100', 1040000), ('1000000*105/100', 1050000), ('1050000-1040000', 10000), ('1000000*103/100', 1030000), ('1040000-1030000', 10000)], [1, 0, 2],
    [('20000000*105/100', 21000000), ('21000000*105/100', 22050000)],
    vi=dict(title='Lạm phát và sức mua',
        objective='Giải thích lạm phát làm giảm sức mua và ước tính lợi suất thực bằng phép trừ gần đúng.',
        body='''
Lạm phát là khi giá cả nói chung tăng lên theo thời gian. Cùng một số tiền sẽ mua được ít hàng hơn. Vì vậy, khi đánh giá tiền lãi, hãy so với mức tăng giá. Lợi suất thực xấp xỉ bằng lãi suất danh nghĩa trừ tỷ lệ lạm phát.

Ví dụ hư cấu với các tỷ lệ giả định: một giỏ hàng hôm nay giá 1.000.000đ và tăng giá 4% sau 1 năm, thành 1.040.000đ. Nếu bạn gửi 1.000.000đ với lãi 5%, sau 1 năm có 1.050.000đ, đủ mua giỏ hàng và dư 10.000đ. Sức mua tăng khoảng 1%. Nếu lãi chỉ 3%, bạn có 1.030.000đ, thiếu 10.000đ để mua cùng giỏ hàng. Số tiền tăng lên nhưng sức mua giảm.

Giữ toàn bộ tiền mặt nhiều năm khi giá tăng cũng làm sức mua giảm, dù con số không đổi. Tuy vậy, tiền cho chi tiêu gần và quỹ dự phòng vẫn cần ở nơi an toàn, dễ rút; đó là đánh đổi có chủ ý.

Ngân sách cũng cần cập nhật. Nếu giá thực phẩm tăng, hạn mức túi ăn uống năm ngoái có thể không còn đủ.
''',
        example='Giỏ hàng: 1.000.000 × 104% = 1.040.000đ. Lãi 5%: 1.000.000 × 105% = 1.050.000đ, dư 10.000đ. Lãi 3%: 1.000.000 × 103% = 1.030.000đ, thiếu 10.000đ.',
        questions=[
            ('Lãi suất 6% mỗi năm, lạm phát giả định 4%. Lợi suất thực xấp xỉ là bao nhiêu?', ['10%', '2%', '6%'],
             ['Đây là cộng thay vì trừ.', 'Đúng: 6% − 4% ≈ 2%.', 'Đây là lãi danh nghĩa, chưa xét giá tăng.']),
            ('Giỏ hàng 500.000đ, giá tăng 10%. Năm sau cần bao nhiêu?', ['550.000đ', '510.000đ', '600.000đ'],
             ['Đúng: 500.000 × 110% = 550.000đ.', 'Đây là tăng 2%.', 'Đây là tăng 20%.']),
            ('Giữ toàn bộ tiền mặt nhiều năm khi giá tăng thì sao?', ['Sức mua chắc chắn tăng', 'Không ảnh hưởng gì', 'Sức mua có thể giảm dù số tiền không đổi'],
             ['Giá tăng làm cùng số tiền mua được ít hơn.', 'Lạm phát có ảnh hưởng đến sức mua.', 'Đúng: con số giữ nguyên nhưng mua được ít hơn.']),
        ],
        action='So sánh một túi ngân sách trong Picket với cùng kỳ năm trước. Nếu giá đã tăng, điều chỉnh hạn mức theo số chi thật.',
        support=dict(keyTakeaways=['Lạm phát làm cùng số tiền mua được ít hơn.', 'Lợi suất thực xấp xỉ lãi danh nghĩa trừ lạm phát.', 'Cập nhật hạn mức ngân sách khi giá thay đổi.'],
            misconception='Nghĩ rằng số tiền không đổi nghĩa là giá trị không đổi.',
            practicePrompt='Học phí hiện là 20.000.000đ và tăng giả định 5% mỗi năm. Sau 2 năm học phí là bao nhiêu?',
            solutionSteps=['Năm 1: 20.000.000 × 105% = 21.000.000đ.', 'Năm 2: 21.000.000 × 105% = 22.050.000đ.', 'Mục tiêu tiết kiệm cho học phí nên dùng con số sau 2 năm.'],
            answer='Sau 2 năm học phí khoảng 22.050.000đ theo giả định.')),
    en=dict(title='Inflation and purchasing power',
        objective='Explain how inflation reduces purchasing power and estimate real return by approximate subtraction.',
        body='''
Inflation is when prices in general rise over time. The same amount of money buys fewer goods. So when judging interest, compare it with how fast prices rise. Real return is approximately the nominal rate minus the inflation rate.

A fictional example with assumed rates: a basket of goods costs 1,000,000 VND today and its price rises 4% over 1 year to 1,040,000 VND. If you deposit 1,000,000 VND at 5%, after 1 year you have 1,050,000 VND, enough for the basket with 10,000 VND left. Purchasing power rose about 1%. If the rate is only 3%, you have 1,030,000 VND, 10,000 VND short of the same basket. The amount grew, but purchasing power fell.

Holding all money as cash for many years while prices rise also erodes purchasing power, even though the number stays the same. Still, money for near-term spending and the emergency fund needs to be safe and easy to reach; that is a deliberate trade-off.

Budgets need updating too. If food prices rise, last year's food pocket limit may no longer be enough.
''',
        example='Basket: 1,000,000 × 104% = 1,040,000 VND. At 5%: 1,000,000 × 105% = 1,050,000 VND, 10,000 VND left. At 3%: 1,000,000 × 103% = 1,030,000 VND, 10,000 VND short.',
        questions=[
            ('The interest rate is 6% per year and assumed inflation is 4%. What is the approximate real return?', ['10%', '2%', '6%'],
             ['This adds instead of subtracting.', 'Correct: 6% − 4% ≈ 2%.', 'This is the nominal rate before rising prices.']),
            ('A 500,000 VND basket rises in price by 10%. How much is needed next year?', ['550,000 VND', '510,000 VND', '600,000 VND'],
             ['Correct: 500,000 × 110% = 550,000 VND.', 'This is a 2% rise.', 'This is a 20% rise.']),
            ('What happens if all money is held as cash for years while prices rise?', ['Purchasing power certainly rises', 'Nothing changes', 'Purchasing power may fall even though the amount stays the same'],
             ['Rising prices mean the same money buys less.', 'Inflation does affect purchasing power.', 'Correct: the number stays the same but buys less.']),
        ],
        action='Compare one budget pocket in Picket with the same period last year. If prices have risen, adjust the limit to real spending.',
        support=dict(keyTakeaways=['Inflation means the same money buys less.', 'Real return is roughly the nominal rate minus inflation.', 'Update budget limits when prices change.'],
            misconception='Believing an unchanged amount of money means unchanged value.',
            practicePrompt='Tuition is 20,000,000 VND now and assumed to rise 5% per year. What will it be after 2 years?',
            solutionSteps=['Year 1: 20,000,000 × 105% = 21,000,000 VND.', 'Year 2: 21,000,000 × 105% = 22,050,000 VND.', 'A savings goal for tuition should use the 2-year figure.'],
            answer='After 2 years tuition is about 22,050,000 VND under the assumption.')))

lesson(29, 'stage-04-growth', 14, 'investing.risk-and-diversification', ['oecd-core-2016', 'ssc-warning'],
    [('10000000*60/100', 6000000), ('10000000/5', 2000000), ('2000000*60/100', 1200000), ('1200000+4*2000000', 9200000), ('10000000*2/100', 200000), ('9000000/3*50/100+2*9000000/3', 7500000)], [0, 1, 2],
    [('12000000/4', 3000000), ('3000000*70/100', 2100000), ('3000000*110/100', 3300000), ('2100000+3300000+2*3000000', 11400000)],
    vi=dict(title='Rủi ro, lợi nhuận và đa dạng hóa',
        objective='Giải thích quan hệ rủi ro và lợi nhuận, vai trò của đa dạng hóa và thời hạn sử dụng tiền, không gợi ý sản phẩm cụ thể.',
        body='''
Lợi nhuận tiềm năng cao hơn thường đi kèm rủi ro cao hơn. Rủi ro ở đây là giá trị có thể lên xuống mạnh, kể cả giảm dưới số tiền bỏ ra. Không có khoản đầu tư hợp pháp nào vừa lợi nhuận cao vừa không có rủi ro.

Thời hạn sử dụng tiền rất quan trọng. Tiền cần dùng trong vài tháng tới nên ở nơi ổn định và dễ rút. Tiền cho mục tiêu nhiều năm có thể chịu dao động nhiều hơn, nếu bạn hiểu rủi ro. Trước khi nghĩ đến đầu tư, nhiều người hoàn thành quỹ dự phòng và giảm các khoản nợ lãi cao.

Đa dạng hóa nghĩa là không dồn hết vào một chỗ. Ví dụ hư cấu: có 10.000.000đ. Cách A dồn hết vào một tài sản; tài sản đó giảm 40% thì còn 6.000.000đ. Cách B chia đều 5 phần, mỗi phần 2.000.000đ. Một phần giảm 40% còn 1.200.000đ, bốn phần đứng yên. Tổng còn 9.200.000đ. Đa dạng hóa giảm thiệt hại từ một tài sản, nhưng không loại bỏ rủi ro khi cả thị trường cùng giảm.

Phí cũng làm giảm lợi nhuận: phí 2% mỗi năm trên 10.000.000đ là 200.000đ. Ủy ban Chứng khoán Nhà nước khuyến cáo thận trọng với lời mời lợi nhuận cao và kiểm tra tổ chức có được cấp phép không. Bài này không phải lời khuyên đầu tư.
''',
        example='Cách A: 10.000.000 × 60% = 6.000.000đ. Cách B: 10.000.000 / 5 = 2.000.000đ mỗi phần; 2.000.000 × 60% = 1.200.000đ; 1.200.000 + 4 × 2.000.000 = 9.200.000đ. Phí: 10.000.000 × 2% = 200.000đ.',
        questions=[
            ('Lợi nhuận tiềm năng cao hơn thường đi kèm điều gì?', ['Rủi ro dao động cao hơn', 'Bảo đảm của nhà nước', 'Không mất phí'],
             ['Đúng: đây là quan hệ rủi ro và lợi nhuận.', 'Sản phẩm đầu tư không được nhà nước bảo đảm lợi nhuận.', 'Phí không liên quan trực tiếp đến lợi nhuận tiềm năng.']),
            ('Tiền cần dùng trong 6 tháng tới nên được giữ thế nào?', ['Đặt vào tài sản biến động mạnh để tăng nhanh', 'Giữ ở nơi ổn định và rút được khi cần', 'Đưa người quen giữ hộ để đầu tư'],
             ['Có thể giảm đúng lúc cần dùng.', 'Đúng: thời hạn ngắn cần ưu tiên ổn định.', 'Không rõ trách nhiệm và rủi ro.']),
            ('Chia 9.000.000đ đều cho 3 tài sản; một tài sản giảm 50%, hai tài sản còn lại đứng yên. Tổng còn bao nhiêu?', ['4.500.000đ', '9.000.000đ', '7.500.000đ'],
             ['Đây là khi cả 9.000.000đ cùng giảm 50%.', 'Đã bỏ qua phần giảm.', 'Đúng: 1.500.000 + 3.000.000 + 3.000.000 = 7.500.000đ.']),
        ],
        action='Không cần đầu tư để hoàn thành bài. Trong Picket, kiểm tra túi dự phòng và các khoản nợ lãi cao trước khi cân nhắc bất kỳ khoản đầu tư nào.',
        support=dict(keyTakeaways=['Lợi nhuận tiềm năng cao hơn đi kèm rủi ro cao hơn.', 'Thời hạn dùng tiền quyết định mức dao động có thể chịu.', 'Đa dạng hóa giảm thiệt hại từ một tài sản nhưng không xóa mọi rủi ro.'],
            misconception='Nghĩ rằng đa dạng hóa bảo đảm không bao giờ lỗ.',
            practicePrompt='Chia 12.000.000đ đều cho 4 tài sản. Một phần giảm 30%, một phần tăng 10%, hai phần đứng yên. Tổng còn bao nhiêu?',
            solutionSteps=['Mỗi phần: 12.000.000 / 4 = 3.000.000đ.', 'Phần giảm: 3.000.000 × 70% = 2.100.000đ; phần tăng: 3.000.000 × 110% = 3.300.000đ.', 'Tổng: 2.100.000 + 3.300.000 + 2 × 3.000.000 = 11.400.000đ.'],
            answer='Tổng còn 11.400.000đ, giảm 600.000đ so với ban đầu.')),
    en=dict(title='Risk, return and diversification',
        objective='Explain the link between risk and return, the role of diversification and time horizon, without suggesting any specific product.',
        body='''
Higher potential return usually comes with higher risk. Risk here means the value can rise and fall sharply, including falling below what you put in. No legal investment offers high returns with no risk at all.

Time horizon matters. Money needed in the next few months should be somewhere stable and easy to withdraw. Money for goals many years away can tolerate more ups and downs, if you understand the risk. Before thinking about investing, many people complete their emergency fund and reduce high-interest debt.

Diversification means not putting everything in one place. A fictional example: you have 10,000,000 VND. Approach A puts it all into one asset; if that asset falls 40%, 6,000,000 VND remains. Approach B splits it into 5 equal parts of 2,000,000 VND. One part falls 40% to 1,200,000 VND, and four parts stay flat. The total is 9,200,000 VND. Diversification limits the damage from one asset, but does not remove risk when the whole market falls.

Fees also reduce returns: a 2% annual fee on 10,000,000 VND is 200,000 VND. Vietnam's State Securities Commission advises caution with offers of high returns and checking whether a firm is licensed. This lesson is not investment advice.
''',
        example='Approach A: 10,000,000 × 60% = 6,000,000 VND. Approach B: 10,000,000 / 5 = 2,000,000 VND each; 2,000,000 × 60% = 1,200,000 VND; 1,200,000 + 4 × 2,000,000 = 9,200,000 VND. Fee: 10,000,000 × 2% = 200,000 VND.',
        questions=[
            ('What usually comes with higher potential return?', ['Higher risk of price swings', 'A state guarantee', 'No fees'],
             ['Correct: this is the risk-return relationship.', 'Investment products do not carry a state guarantee of returns.', 'Fees are not directly tied to potential return.']),
            ('How should money needed in the next 6 months be kept?', ['In a highly volatile asset to grow quickly', 'Somewhere stable that you can withdraw from when needed', 'With an acquaintance who will invest it for you'],
             ['It could fall just when you need it.', 'Correct: a short horizon puts stability first.', 'Responsibility and risk are unclear.']),
            ('9,000,000 VND is split equally across 3 assets; one falls 50% and the other two stay flat. What is the total?', ['4,500,000 VND', '9,000,000 VND', '7,500,000 VND'],
             ['This is if all 9,000,000 VND fell 50%.', 'This ignores the fall.', 'Correct: 1,500,000 + 3,000,000 + 3,000,000 = 7,500,000 VND.']),
        ],
        action='You do not need to invest to finish this lesson. In Picket, check your emergency pocket and any high-interest debts before considering any investment.',
        support=dict(keyTakeaways=['Higher potential return comes with higher risk.', 'Your time horizon decides how much fluctuation you can accept.', 'Diversification limits damage from one asset but does not remove all risk.'],
            misconception='Believing diversification guarantees you will never lose money.',
            practicePrompt='12,000,000 VND is split equally across 4 assets. One falls 30%, one rises 10% and two stay flat. What is the total?',
            solutionSteps=['Each part: 12,000,000 / 4 = 3,000,000 VND.', 'Fallen part: 3,000,000 × 70% = 2,100,000 VND; risen part: 3,000,000 × 110% = 3,300,000 VND.', 'Total: 2,100,000 + 3,300,000 + 2 × 3,000,000 = 11,400,000 VND.'],
            answer='The total is 11,400,000 VND, 600,000 VND below the start.')))

lesson(22, 'stage-04-growth', 14, 'investing.fraud-red-flags', ['ssc-warning', 'sbv-security', 'otp'],
    [('3*52', 156), ('100*10000000', 1000000000), ('1000000000*25/1000', 25000000), ('1000000000/25000000', 40)], [0, 1, 2],
    [('5000000-500000', 4500000), ('5000000+1500000', 6500000)],
    figures=[fig('State Securities Commission: be very cautious with offers of high returns; securities companies in Vietnam must be licensed', 'ssc-warning', '2022-06-30')],
    vi=dict(title='Nhận diện lời mời đầu tư đáng ngờ',
        objective='Nhận ra các dấu hiệu của lời mời đầu tư lừa đảo và biết cách kiểm tra trước khi chuyển tiền.',
        body='''
Lời mời đầu tư lừa đảo thường có vài dấu hiệu chung. Cam kết lợi nhuận cao và cố định, thậm chí "không rủi ro". Hối thúc tham gia ngay. Trả hoa hồng khi rủ thêm người. Dùng sàn hoặc ứng dụng không rõ cấp phép. Cho rút tiền nhỏ lúc đầu, rồi đòi nạp thêm "phí" hay "thuế" mới cho rút số lớn.

Ủy ban Chứng khoán Nhà nước khuyến cáo ngày 30/6/2022: cần hết sức thận trọng với lời mời lãi suất, lợi nhuận cao. Công ty chứng khoán hoạt động tại Việt Nam phải được Ủy ban cấp phép. Giao dịch trên nền tảng không được quản lý thì nhà đầu tư tự chịu rủi ro.

Ví dụ hư cấu: một nhóm hứa 3% mỗi tuần. Quy đổi đơn giản, 3 × 52 = 156% mỗi năm, cao bất thường. Giả sử 100 người, mỗi người góp 10.000.000đ, tổng 1.000.000.000đ. Nếu nhóm trả "lãi" 2,5% mỗi tuần từ chính tiền góp, mỗi tuần mất 25.000.000đ. Không có người mới, quỹ cạn sau 40 tuần. Mô hình như vậy sống nhờ tiền của người đến sau.

Trước khi chuyển tiền: chờ ít nhất một ngày, tự tìm tên tổ chức trên trang chính thức của cơ quan quản lý và không gửi OTP hay mật khẩu cho ai. Nếu đã chuyển, hãy dừng nạp thêm, giữ bằng chứng, báo ngân hàng và trình báo công an.
''',
        example='3 × 52 = 156%/năm. Tổng góp: 100 × 10.000.000 = 1.000.000.000đ. "Lãi" mỗi tuần: 1.000.000.000 × 2,5% = 25.000.000đ. Cạn quỹ: 1.000.000.000 / 25.000.000 = 40 tuần.',
        questions=[
            ('Nhóm chat hứa 3% mỗi tuần và đã có người rút được tiền. Kết luận nào hợp lý?', ['Rút được vài lần không chứng minh mô hình hợp pháp; cần kiểm tra cấp phép', 'Chắc chắn an toàn', 'Nên rủ thêm người để có hoa hồng'],
             ['Đúng: lần rút nhỏ ban đầu thường là mồi.', 'Lời hứa và vài lần rút không phải bằng chứng an toàn.', 'Rủ thêm người có thể kéo người khác vào thiệt hại.']),
            ('Sàn yêu cầu nạp thêm "phí thuế" mới cho rút tiền. Nên làm gì?', ['Nạp để lấy lại tiền', 'Dừng nạp, giữ bằng chứng, báo ngân hàng và trình báo công an', 'Vay người thân để nạp'],
             ['Đây là cách thường dùng để lấy thêm tiền.', 'Đúng: ngừng chuyển tiền và báo cơ quan chức năng.', 'Vay thêm làm thiệt hại lớn hơn.']),
            ('3% mỗi tuần, quy đổi đơn giản ra năm (52 tuần) là bao nhiêu?', ['36%', '3%', '156%'],
             ['Đây là nhân 12, dùng cho tỷ lệ tháng.', 'Đây vẫn là tỷ lệ một tuần.', 'Đúng: 3 × 52 = 156%.']),
        ],
        action='Trong Picket, chỉ ghi thu nhập khi tiền thực sự về tài khoản của bạn. Con số "lợi nhuận" hiển thị trên ứng dụng của bên khác không phải thu nhập.',
        support=dict(keyTakeaways=['Cam kết lợi nhuận cao, cố định và hối thúc là dấu hiệu cảnh báo.', 'Kiểm tra cấp phép trên trang chính thức của cơ quan quản lý.', 'Đòi nạp thêm để được rút tiền là dấu hiệu lừa đảo rõ ràng.'],
            misconception='Nghĩ rằng rút được tiền lần đầu chứng tỏ nền tảng là thật.',
            practicePrompt='Bạn nạp 5.000.000đ. Ứng dụng hiển thị "lãi" 1.500.000đ. Bạn rút về được 500.000đ. Tiền thật đã về là bao nhiêu và bao nhiêu vẫn nằm ngoài?',
            solutionSteps=['Tiền đã về tài khoản: 500.000đ.', 'Tiền vẫn nằm ngoài: 5.000.000 − 500.000 = 4.500.000đ.', 'Con số hiển thị 5.000.000 + 1.500.000 = 6.500.000đ không phải tiền bạn đang có.'],
            answer='Chỉ 500.000đ đã về; 4.500.000đ vẫn nằm ngoài và con số 6.500.000đ chỉ là hiển thị.')),
    en=dict(title='Spot suspicious investment offers',
        objective='Recognise the signs of fraudulent investment offers and know how to check before sending money.',
        body='''
Fraudulent investment offers tend to share a few signs. They promise high, fixed returns, even "no risk". They push you to join now. They pay commission for bringing in others. They use platforms or apps with unclear licensing. They let you withdraw small amounts at first, then demand an extra "fee" or "tax" before a large withdrawal.

Vietnam's State Securities Commission advised on 30 June 2022: be very cautious with offers of high interest or returns. Securities companies operating in Vietnam must be licensed by the Commission. Trading on unregulated platforms is at the investor's own risk.

A fictional example: a group promises 3% per week. By simple conversion, 3 × 52 = 156% per year, which is abnormally high. Suppose 100 people each put in 10,000,000 VND, a total of 1,000,000,000 VND. If the group pays "returns" of 2.5% per week out of that same money, it pays out 25,000,000 VND each week. Without newcomers, the pool runs dry after 40 weeks. Such schemes live on money from people who join later.

Before sending money: wait at least a day, look up the firm yourself on the regulator's official site, and never give anyone your OTP or password. If you have already sent money, stop paying in, keep evidence, tell your bank and report to the police.
''',
        example='3 × 52 = 156% per year. Total in: 100 × 10,000,000 = 1,000,000,000 VND. Weekly "returns": 1,000,000,000 × 2.5% = 25,000,000 VND. Pool exhausted: 1,000,000,000 / 25,000,000 = 40 weeks.',
        questions=[
            ('A chat group promises 3% per week and some people have withdrawn money. What is a sensible conclusion?', ['A few withdrawals do not prove the scheme is legal; check licensing', 'It is certainly safe', 'Invite more people to earn commission'],
             ['Correct: small early withdrawals are often bait.', 'Promises and a few withdrawals are not evidence of safety.', 'Inviting others may pull them into losses.']),
            ('A platform demands a new "tax fee" before you can withdraw. What should you do?', ['Pay it to get your money back', 'Stop paying in, keep evidence, tell your bank and report to the police', 'Borrow from relatives to pay it'],
             ['This is a common way to extract more money.', 'Correct: stop transferring and report to the authorities.', 'Borrowing more makes the loss bigger.']),
            ('3% per week, converted simply to a year (52 weeks), is how much?', ['36%', '3%', '156%'],
             ['This multiplies by 12, which is for monthly rates.', 'This is still the weekly rate.', 'Correct: 3 × 52 = 156%.']),
        ],
        action='In Picket, record income only when money actually reaches your account. A "profit" figure shown in someone else\'s app is not income.',
        support=dict(keyTakeaways=['High, fixed promised returns and pressure are warning signs.', 'Check licensing on the regulator\'s official site.', 'Being asked to pay more before withdrawing is a clear fraud sign.'],
            misconception='Believing a first successful withdrawal proves the platform is real.',
            practicePrompt='You deposit 5,000,000 VND. The app shows a "profit" of 1,500,000 VND. You manage to withdraw 500,000 VND. How much real money has come back and how much is still outside?',
            solutionSteps=['Money back in your account: 500,000 VND.', 'Still outside: 5,000,000 − 500,000 = 4,500,000 VND.', 'The displayed 5,000,000 + 1,500,000 = 6,500,000 VND is not money you hold.'],
            answer='Only 500,000 VND has come back; 4,500,000 VND is still outside and the 6,500,000 VND figure is only a display.')))

lesson(30, 'stage-04-growth', 14, 'planning.periodic-review', ['oecd-core-2016', 'goals', 'cashflow'],
    [('25000000+40000000+15000000', 80000000), ('80000000-12000000', 68000000), ('1800000*100/12000000', 15), ('18000000/6000000', 3)], [1, 0, 2],
    [('30000000+20000000', 50000000), ('50000000-8000000', 42000000), ('10000000/5000000', 2), ('2400000*100/16000000', 15)],
    vi=dict(title='Rà soát tài chính định kỳ',
        objective='Tính ba chỉ số đơn giản để rà soát tài chính và biết khi nào cần cập nhật kế hoạch.',
        body='''
Kế hoạch tài chính cần được xem lại, vì thu nhập, giá cả và mục tiêu đều thay đổi. Một lần rà soát mỗi quý hoặc mỗi năm có thể dùng ba con số đơn giản.

Thứ nhất là giá trị ròng: tổng tài sản trừ tổng nợ. Thứ hai là tỷ lệ tiết kiệm: phần để dành chia cho tiền thực nhận. Thứ ba là số tháng dự phòng: quỹ dự phòng chia cho chi thiết yếu mỗi tháng. Ba con số này không chấm điểm bạn. Chúng cho biết xu hướng đang tốt lên hay cần điều chỉnh.

Ví dụ hư cấu: Hà có tiền trong ví 25.000.000đ, tiền gửi 40.000.000đ và xe máy ước tính 15.000.000đ. Tổng tài sản là 80.000.000đ. Hà nợ 12.000.000đ, nên giá trị ròng là 68.000.000đ. Hà để dành 1.800.000đ trên 12.000.000đ thực nhận, tỷ lệ tiết kiệm 15%. Quỹ dự phòng 18.000.000đ trên chi thiết yếu 6.000.000đ là 3 tháng.

Ngoài lịch định kỳ, hãy rà soát khi có thay đổi lớn: đổi việc, chuyển nhà, kết hôn, có con hoặc thu nhập giảm. Khi đó, xem lại ngân sách, quỹ dự phòng, bảo hiểm, nợ và thứ tự mục tiêu.
''',
        example='Tài sản: 25.000.000 + 40.000.000 + 15.000.000 = 80.000.000đ. Giá trị ròng: 80.000.000 − 12.000.000 = 68.000.000đ. Tỷ lệ tiết kiệm: 1.800.000 / 12.000.000 = 15%. Dự phòng: 18.000.000 / 6.000.000 = 3 tháng.',
        questions=[
            ('Tài sản 50.000.000đ, nợ 20.000.000đ. Giá trị ròng là bao nhiêu?', ['70.000.000đ', '30.000.000đ', '20.000.000đ'],
             ['Đây là cộng nợ thay vì trừ.', 'Đúng: 50.000.000 − 20.000.000 = 30.000.000đ.', 'Đây là tổng nợ.']),
            ('Thực nhận 10.000.000đ, để dành 1.000.000đ. Tỷ lệ tiết kiệm là bao nhiêu?', ['10%', '1%', '100%'],
             ['Đúng: 1.000.000 / 10.000.000 = 10%.', 'Đã chia sai một chữ số.', 'Đây là khi để dành toàn bộ.']),
            ('Sau một thay đổi lớn như đổi việc hay có con, nên làm gì?', ['Giữ nguyên kế hoạch cũ', 'Xóa toàn bộ dữ liệu cũ', 'Rà lại ngân sách, quỹ dự phòng, bảo hiểm và mục tiêu'],
             ['Hoàn cảnh mới có thể làm kế hoạch cũ không còn phù hợp.', 'Dữ liệu cũ giúp so sánh xu hướng.', 'Đúng: cập nhật kế hoạch theo hoàn cảnh mới.']),
        ],
        action='Chọn một ngày mỗi quý để mở Picket, xem tổng các túi ngân sách, danh sách Hóa đơn sắp đến hạn và tiến độ mục tiêu; ghi lại ba con số trong bài.',
        support=dict(keyTakeaways=['Giá trị ròng = tổng tài sản − tổng nợ.', 'Tỷ lệ tiết kiệm = phần để dành / tiền thực nhận.', 'Số tháng dự phòng = quỹ dự phòng / chi thiết yếu mỗi tháng.'],
            misconception='Coi các chỉ số này là điểm đánh giá bản thân thay vì công cụ theo dõi xu hướng.',
            practicePrompt='Tài sản gồm 30.000.000đ tiền gửi và 20.000.000đ tiền mặt; nợ 8.000.000đ. Quỹ dự phòng 10.000.000đ, chi thiết yếu 5.000.000đ. Để dành 2.400.000đ trên 16.000.000đ thực nhận. Tính ba chỉ số.',
            solutionSteps=['Tài sản: 30.000.000 + 20.000.000 = 50.000.000đ; giá trị ròng: 50.000.000 − 8.000.000 = 42.000.000đ.', 'Dự phòng: 10.000.000 / 5.000.000 = 2 tháng.', 'Tỷ lệ tiết kiệm: 2.400.000 / 16.000.000 = 15%.'],
            answer='Giá trị ròng 42.000.000đ, dự phòng 2 tháng, tỷ lệ tiết kiệm 15%.')),
    en=dict(title='Periodic financial review',
        objective='Calculate three simple indicators for a financial review and know when to update your plan.',
        body='''
A financial plan needs regular review, because income, prices and goals all change. A review each quarter or each year can use three simple numbers.

The first is net worth: total assets minus total debts. The second is the savings rate: the amount set aside divided by take-home pay. The third is emergency months: the emergency fund divided by monthly essential costs. These numbers do not grade you. They show whether the trend is improving or needs adjusting.

A fictional example: Hà has 25,000,000 VND in wallets, 40,000,000 VND in deposits and a motorbike estimated at 15,000,000 VND. Total assets are 80,000,000 VND. Hà owes 12,000,000 VND, so net worth is 68,000,000 VND. Hà sets aside 1,800,000 VND from 12,000,000 VND take-home pay, a savings rate of 15%. An emergency fund of 18,000,000 VND against essential costs of 6,000,000 VND is 3 months.

Besides the regular schedule, review after a big change: a new job, moving home, marriage, a child or lower income. Then revisit the budget, emergency fund, insurance, debts and the order of your goals.
''',
        example='Assets: 25,000,000 + 40,000,000 + 15,000,000 = 80,000,000 VND. Net worth: 80,000,000 − 12,000,000 = 68,000,000 VND. Savings rate: 1,800,000 / 12,000,000 = 15%. Emergency: 18,000,000 / 6,000,000 = 3 months.',
        questions=[
            ('Assets are 50,000,000 VND and debts 20,000,000 VND. What is net worth?', ['70,000,000 VND', '30,000,000 VND', '20,000,000 VND'],
             ['This adds debts instead of subtracting.', 'Correct: 50,000,000 − 20,000,000 = 30,000,000 VND.', 'This is total debt.']),
            ('Take-home pay is 10,000,000 VND and 1,000,000 VND is set aside. What is the savings rate?', ['10%', '1%', '100%'],
             ['Correct: 1,000,000 / 10,000,000 = 10%.', 'The division is off by one digit.', 'This would mean saving everything.']),
            ('After a big change such as a new job or a child, what should you do?', ['Keep the old plan unchanged', 'Delete all old data', 'Review the budget, emergency fund, insurance and goals'],
             ['New circumstances may make the old plan unsuitable.', 'Old data helps you compare trends.', 'Correct: update the plan for the new circumstances.']),
        ],
        action='Pick one day each quarter to open Picket, look at the total of your budget pockets, upcoming Bills and goal progress; write down the three numbers from this lesson.',
        support=dict(keyTakeaways=['Net worth = total assets − total debts.', 'Savings rate = amount set aside / take-home pay.', 'Emergency months = emergency fund / monthly essential costs.'],
            misconception='Treating these indicators as a personal grade rather than a way to track trends.',
            practicePrompt='Assets are 30,000,000 VND in deposits and 20,000,000 VND in cash; debts are 8,000,000 VND. The emergency fund is 10,000,000 VND and essential costs are 5,000,000 VND. 2,400,000 VND is set aside from 16,000,000 VND take-home pay. Calculate the three indicators.',
            solutionSteps=['Assets: 30,000,000 + 20,000,000 = 50,000,000 VND; net worth: 50,000,000 − 8,000,000 = 42,000,000 VND.', 'Emergency: 10,000,000 / 5,000,000 = 2 months.', 'Savings rate: 2,400,000 / 16,000,000 = 15%.'],
            answer='Net worth 42,000,000 VND, 2 emergency months and a 15% savings rate.')))


def lesson_id(n):
    return f'picket.vi.financial.v1.{n:02}'


def stage_of(n):
    for stage, numbers in STAGE_ORDER.items():
        if n in numbers:
            return stage
    raise KeyError(n)


def ordered_ids():
    return [lesson_id(n) for stage in STAGES for n in STAGE_ORDER[stage['stageId']]]


def support_entries():
    """Study-support entries in the same shape as study_support.v1.json."""
    return [{'lessonId': lesson_id(l['n']),
             'vi': {'synthetic': True, **l['vi']['support']},
             'en': {'synthetic': True, **l['en']['support']},
             'arithmeticChecks': [{'expression': e, 'expected': v} for e, v in l['support_checks']]}
            for l in NEW_LESSONS]


def stages_for(locale):
    out = []
    for stage in STAGES:
        title, summary = stage[locale]
        out.append({'stageId': stage['stageId'], 'order': stage['order'], 'title': title, 'summary': summary,
                    'lessonIds': [lesson_id(n) for n in STAGE_ORDER[stage['stageId']]]})
    return out


def _self_check():
    numbers = sorted(n for ns in STAGE_ORDER.values() for n in ns)
    assert numbers == list(range(1, 31)), numbers
    assert sorted(l['n'] for l in NEW_LESSONS) == list(range(13, 31))
    for l in NEW_LESSONS:
        assert l['stage'] == stage_of(l['n']), l['n']
        assert len(l['correct']) == 3
        for loc in ('vi', 'en'):
            assert len(l[loc]['questions']) == 3
            for prompt, choices, explanations in l[loc]['questions']:
                assert len(choices) == 3 and len(explanations) == 3
        for f in l['figures']:
            assert f['sourceId'] in l['sources'], (l['n'], f)


_self_check()
