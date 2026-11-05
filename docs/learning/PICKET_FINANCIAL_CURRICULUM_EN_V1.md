# Picket — Financial education curriculum, English v1

> [Current project status](../PROJECT_STATUS.md). Editorial revision 3, 5 November 2026: a four-stage path with 18 new lessons (13–30); existing lesson IDs and quiz answer ordering are preserved. [Self-review checklist](REVIEW_CHECKLIST_V2_20261105.md).

Editorial translation of the full Vietnamese curriculum, authored 2026-10-23 and extended 2026-11-05. **self-reviewed-pending-owner-approval**. This is not independently approved or publishable content.

Translation locale: `en-US`; translation version: `1`; source locale: `vi-VN`. Lesson IDs intentionally remain identical to the Vietnamese source, including their `.vi.` segment: identify a localized lesson by `(lessonId, locale, version)`, not the ID alone.

`correctIndex` is zero-based. Every choice includes its own explanation. `reviewedAt` is the author self-review date, not independent approval. `citedFigures` lists the source and date behind each regulatory number.

# Stage 1: Foundation

Know your take-home pay, record accurately and give every amount a pocket.

## picket.vi.financial.v1.13 — Gross pay and take-home pay

**Chapter:** chapter-07 · **Stage:** stage-01-foundation · **Competency:** income.gross-to-net  
**Objective:** Read a payslip, separate the deductions and plan from take-home pay.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

The salary in a contract is usually gross pay. The money reaching your account is take-home pay. In between are deductions, such as mandatory insurance and personal income tax if any. A spending plan should start from take-home pay, because that is the money you can actually use.

For employees covered by mandatory insurance, the employee share is usually 10.5% of the contribution salary. It is made up of 8% social insurance, 1.5% health insurance and 1% unemployment insurance. Hanoi Social Security stated these rates on 8 September 2025. The contribution salary can differ from gross pay and has a cap, so check your payslip instead of guessing.

A fictional example: Lan earns a gross salary of 12,000,000 VND, which is also the contribution salary. Insurance is 12,000,000 × 10.5% = 1,260,000 VND. The remainder is 10,740,000 VND. This is below the personal deduction of 15,500,000 VND per month applied from the 2026 tax period, so in this example Lan owes no tax on wages. Take-home pay is 10,740,000 VND.

Bonuses, overtime or wages from several employers can change the calculation. This lesson helps you read a payslip. Actual tax depends on current rules and your own documents.

### Worked example

12,000,000 × 10.5% = 1,260,000 VND insurance; 12,000,000 − 1,260,000 = 10,740,000 VND. This is below the personal deduction, so taxable income in the example is 0.

#### Remember

- Plan from take-home pay, not gross pay.
- The employee share of mandatory insurance is usually 10.5% of the contribution salary.
- Tax on wages arises only when income after insurance exceeds the deductions.

#### Common misconception

Believing the number in the contract is what will arrive in your account each month.

#### Self-check — fictional scenario

Minh has a contribution salary of 16,000,000 VND, no dependants and no other income. Work out the 10.5% insurance deduction and take-home pay.

#### Step-by-step reasoning

1. Insurance: 16,000,000 × 10.5% = 1,680,000 VND.
2. Remainder: 16,000,000 − 1,680,000 = 14,320,000 VND.
3. 14,320,000 VND is below the 15,500,000 VND personal deduction, so no tax arises under these assumptions.

#### Conclusion

Insurance is 1,680,000 VND and take-home pay is 14,320,000 VND under the lesson assumptions.

- `12000000*105/1000 = 1260000`
- `12000000-1260000 = 10740000`
- `16000000*105/1000 = 1680000`
- `16000000-1680000 = 14320000`

### Practice scenarios

**1. Which amount should a monthly budget start from?**

- A. Gross pay in the contract — Gross pay has not had insurance and tax removed, so it is larger than what you can use.
- B. Take-home pay after deductions — Correct: this is the money that actually reaches your account.
- C. Gross pay plus an expected bonus — An unpaid bonus is an assumption, not money you already have.
Answer: **B** (`correctIndex: 1`).

**2. The contribution salary is 10,000,000 VND and the employee share is 10.5%. What is the insurance deduction?**

- A. 1,050,000 VND — Correct: 10,000,000 × 10.5% = 1,050,000 VND.
- B. 105,000 VND — This is 1.05%, one decimal place off.
- C. 10,500,000 VND — This is larger than the salary, so it cannot be the deduction.
Answer: **A** (`correctIndex: 0`).

**3. Your payslip shows a deduction that differs from your own calculation. What should you do?**

- A. Ignore it because the gap is small — The gap may come from the contribution base or another item; find the reason.
- B. Assume your own calculation is always right — The contribution salary can differ from gross pay.
- C. Ask the payroll team and check the contribution salary — Correct: ask the right place and check the base before concluding.
Answer: **C** (`correctIndex: 2`).

### Optional action

If you have a recent payslip, enter take-home pay as planned income in Picket. You do not need to photograph or upload the payslip. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- Employee mandatory insurance share 10.5% = 8% social + 1.5% health + 1% unemployment — source `bhxh-rates`, as of 2025-09-08
- Personal PIT deduction 15,500,000 VND/month from tax period 2026 — source `pit-deduction-2026`, as of 2026-01-01

### Sources

- [Primary reference](https://hanoi.baohiemxahoi.gov.vn/UserControls/Publishing/News/BinhLuan/pFormPrint.aspx?UrlListProcess=/content/tintuc/Lists/News&ItemID=35560&IsTA=False)
- [Primary reference](https://hcc.nghean.gov.vn/tin-tong-hop/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-2448.html)
- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.01 — Moving money between wallets is not another expense

**Chapter:** chapter-01 · **Stage:** stage-01-foundation · **Competency:** cashflow.internal-transfer  
**Objective:** Distinguish transfers between your own wallets from income and spending; explain the scope being viewed.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Your money may be held in several places: cash, a bank account or an electronic wallet. Moving money between places you own changes where you keep it. To understand how much you have spent, ask whether money has left the entire scope you are tracking to pay for something. The name of a bank app's transfer button is not enough to answer this: transferring to a shop is a payment, while transferring to another account of your own may be a wallet transfer.

Consider an illustrative example. Hòa has 600,000 VND in cash and 1,400,000 VND in the bank. Hòa withdraws 200,000 VND without a fee. Cash becomes 800,000 VND and the bank balance becomes 1,200,000 VND. The total is 2,000,000 VND both before and after. Recording the withdrawal as spending, then recording purchases paid in cash, would count spending twice. If the bank charges a further 3,000 VND withdrawal fee, only that 3,000 VND fee is spending in this example; the 200,000 VND has merely changed location.

Scope explains the apparent contradiction. Looking only at the bank wallet, 200,000 VND has indeed left it. Looking at both wallets, the outgoing and incoming sides cancel. A wallet cash-flow report can therefore differ from an overall spending report. You do not need to decide that one is wrong; read its label and check which wallets it includes. A wallet outside the scope also needs a clear note rather than an assumption that every outflow is a purchase.

In Picket, check the source wallet, destination wallet, amount and fee before confirming. Giving money a savings-goal label does not make it disappear either. One real transfer should be recorded once, with linked sides. If you entered separate income and expense records by mistake, check before editing so you do not delete a real purchase made on the same day. You can learn entirely with the example numbers; no real withdrawal or transfer is required to demonstrate understanding. The key is that the same money can move while the total stays unchanged.

### Worked example

600,000 + 1,400,000 = 2,000,000 VND; after the transfer: 800,000 + 1,200,000 = 2,000,000 VND. A 3,000 VND fee, if charged, leaves a total of 1,997,000 VND.

#### Remember

- Identify which wallets are inside the report before adding their balances.
- Moving money between your own wallets changes its location; record any fee separately.
- Check both sides so a cash withdrawal is not counted again as spending.

#### Common misconception

Assuming every amount leaving a bank account is money already spent.

#### Self-check — fictional scenario

An has 900,000 VND in a bank account and 100,000 VND in cash. An withdraws 150,000 VND and pays a separate 5,000 VND fee. Find both balances, the total and the actual expense.

#### Step-by-step reasoning

1. The bank balance becomes 900,000 − 150,000 − 5,000 = 745,000 VND.
2. Cash increases to 100,000 + 150,000 = 250,000 VND.
3. The combined total is 995,000 VND; only the 5,000 VND fee leaves the two-wallet scope.

#### Conclusion

The transfer is 150,000 VND and the expense is 5,000 VND. Do not classify all 155,000 VND as overall spending.

- `600000+1400000 = 2000000`
- `600000+200000 = 800000`
- `1400000-200000 = 1200000`
- `2000000-3000 = 1997000`
- `900000-150000-5000 = 745000`
- `100000+150000 = 250000`
- `745000+250000 = 995000`

### Practice scenarios

**1. You withdraw 200,000 VND without a fee from your bank into your own cash wallet. How much does overall spending increase?**

- A. 200,000 VND — This money has changed location; it has not paid for a purchase.
- B. 0 VND — Correct: the total across both wallets does not decrease.
- C. 400,000 VND — Adding both sides counts the same money twice.
Answer: **B** (`correctIndex: 1`).

**2. Looking only at the bank wallet in the example, has 200,000 VND left that scope?**

- A. No, because wallet transfers always equal zero — The zero-total rule requires both sides to be inside the scope.
- B. Yes, but it is not overall spending — Correct: the bank decreases while cash increases.
- C. It is new income — The bank decreases, so there is no new income.
Answer: **B** (`correctIndex: 1`).

**3. You withdraw 200,000 VND and pay an additional 3,000 VND fee. What is the spending caused by this operation?**

- A. 203,000 VND — 203,000 VND leaves the bank, but includes money moving into cash.
- B. 200,000 VND — You still own the 200,000 VND.
- C. 3,000 VND — Correct: the fee is the part leaving your total assets in this situation.
Answer: **C** (`correctIndex: 2`).

### Optional action

Review an existing wallet transfer or solve the example again; do not make a real transfer. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf)

## picket.vi.financial.v1.02 — Check records before categorizing them

**Chapter:** chapter-01 · **Stage:** stage-01-foundation · **Competency:** cashflow.confirmed-records  
**Objective:** Check amounts and income/expense direction, prevent duplicate records and distinguish missing data from zero spending.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A useful transaction list should reflect what actually happened. Start with the date, amount, wallet and whether money came in or went out. Categories help you find and compare records, but an attractive category name cannot fix a wrong amount. When scanning a receipt, treat the result as a draft to check. A machine may misread separators, the total line or cash tendered by the customer. A landscape photograph is not evidence of a transaction; do not guess an amount from it.

Mai has checked three expenses: lunch at 45,000 VND, transport at 25,000 VND and notebooks at 30,000 VND. They total 100,000 VND. Mai attaches the lunch receipt to that existing transaction; the total remains 100,000 VND, not 145,000 VND. If the photo uploads slowly, a photo-processing status is different from a saved-transaction status. On returning, check which record already exists before saving again. An attachment and an expense are different kinds of information, not two amounts of money.

Categorization should serve your question. A notebook for school may belong under education; the same notebook bought for someone else may be a gift. Do not infer its purpose solely from the shop's name. You can leave an unclear expense for later review and add context when you remember it. When several people share a payment, record your share or use a consistent split rule. Avoid sometimes recording the whole bill and sometimes just your portion without a note.

At the end of a period, compare the list with balances or evidence you still have. If you forgot two days of entries, mark the gap instead of declaring zero spending on those days. An unexplained difference does not automatically become income. It is fine to acknowledge incomplete data and review it when convenient. In Picket, use only confirmed transactions for lessons based on real data; choose an illustrative example if you prefer not to use personal information. Recording should make decisions clearer, rather than produce a perfect table or require you to remember every detail immediately.

### Worked example

45,000 + 25,000 + 30,000 = 100,000 VND; attaching the lunch photo does not create a second 45,000 VND expense.

#### Remember

- Record amount, date, wallet and transaction direction before choosing a category.
- An attached receipt image is not an additional expense.
- A day with missing records is incomplete; it does not automatically mean zero spending.

#### Common misconception

Treating a rescan or screen refresh as a reason to create an identical transaction.

#### Self-check — fictional scenario

Bình recorded lunch costing 40,000 VND and transport costing 30,000 VND. Rescanning the lunch receipt creates a 40,000 VND draft. What is the actual total, and what should be checked before saving?

#### Step-by-step reasoning

1. Add the two known purchases: 40,000 + 30,000 = 70,000 VND.
2. Compare the draft date, amount and wallet with the recorded lunch transaction.
3. If it is the same payment, do not save another transaction; two genuine purchases need distinguishing evidence.

#### Conclusion

The stated total is 70,000 VND. Another image or draft alone does not increase it to 110,000 VND.

- `45000+25000+30000 = 100000`
- `100000+45000 = 145000`
- `40000+30000 = 70000`
- `70000+40000 = 110000`

### Practice scenarios

**1. Mai adds a photo to the lunch transaction already saved. What should the total of the three expenses be?**

- A. 100,000 VND — Correct: an attachment does not create additional spending.
- B. 145,000 VND — You have counted lunch twice.
- C. 55,000 VND — You have removed an actual expense.
Answer: **A** (`correctIndex: 0`).

**2. Tuesday has no record because Mai forgot to enter it. What is the appropriate conclusion?**

- A. There was definitely no spending — Missing entries do not prove nothing happened.
- B. We do not yet know whether there was spending — Correct: keep the insufficient-data state.
- C. Use the highest daily amount that month as a factual entry — An estimate must not become a transaction claimed to have happened.
Answer: **B** (`correctIndex: 1`).

**3. OCR reads 450,000 VND, but the receipt says 45,000 VND. What should you do?**

- A. Keep the machine result because it is objective — OCR can still misread characters.
- B. Save both numbers as separate expenses — Two interpretations of one purchase do not create two expenses.
- C. Check the receipt and correct the draft before confirming — Correct: the draft amount must be checked.
Answer: **C** (`correctIndex: 2`).

### Optional action

Check one transaction or example for its date, wallet, amount and possible duplication. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf)

## picket.vi.financial.v1.14 — Fixed costs, variable costs and annual costs

**Chapter:** chapter-07 · **Stage:** stage-01-foundation · **Competency:** budgeting.fixed-variable-annual  
**Objective:** Sort spending into three groups and convert annual costs into a monthly amount to set aside.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Not every expense behaves the same way. Fixed costs barely change each month, such as rent or internet. Variable costs rise and fall with how you live, such as food and transport. Annual costs arrive once or a few times a year, such as tuition, renewal fees or Tết gifts. Annual costs are easy to forget, then feel like a shock even though they come every year.

A fictional example: Tú pays rent of 3,000,000 VND and internet of 220,000 VND. Fixed costs are 3,220,000 VND. Food averages 2,500,000 VND. Each year Tú has a course fee of 1,200,000 VND and expected Tết gifts of 2,400,000 VND, a total of 3,600,000 VND. Divided over 12 months, Tú needs to set aside 300,000 VND each month. The monthly plan is 3,220,000 + 2,500,000 + 300,000 = 6,020,000 VND.

Variable costs should use an average from real transactions, not a hoped-for number. An annual cost may not be known exactly; record it as an estimate and update it when the real price is known.

When a month with a large cost arrives, the money is already waiting in the pocket you filled gradually. That month you do not need to borrow or cut essentials.

### Worked example

Fixed: 3,000,000 + 220,000 = 3,220,000 VND. Annual: 1,200,000 + 2,400,000 = 3,600,000 VND; 3,600,000 / 12 = 300,000 VND per month. Plan: 3,220,000 + 2,500,000 + 300,000 = 6,020,000 VND.

#### Remember

- Fixed costs rarely change, variable costs fluctuate, annual costs are infrequent but recurring.
- Divide an annual cost by the months remaining to find the monthly amount.
- Use averages from real transactions for variable costs.

#### Common misconception

Treating tuition or Tết gifts as unexpected just because they do not come every month.

#### Self-check — fictional scenario

Language-class tuition of 2,400,000 VND is due in 6 months. A gym membership of 900,000 VND is due in 3 months. How much is needed each month for both?

#### Step-by-step reasoning

1. Tuition: 2,400,000 / 6 = 400,000 VND per month.
2. Gym: 900,000 / 3 = 300,000 VND per month.
3. Together: 400,000 + 300,000 = 700,000 VND per month for the first 3 months.

#### Conclusion

Set aside 700,000 VND per month for the first three months; after the gym fee is paid, only 400,000 VND for tuition remains.

- `3000000+220000 = 3220000`
- `1200000+2400000 = 3600000`
- `3600000/12 = 300000`
- `3220000+2500000+300000 = 6020000`
- `2400000/6 = 400000`
- `900000/3 = 300000`
- `400000+300000 = 700000`

### Practice scenarios

**1. Electricity varies between 300,000–500,000 VND each month. Which group is it?**

- A. Strictly fixed — The amount changes each month, so it is not strictly fixed.
- B. Recurring but variable — Correct: it comes monthly but the amount varies.
- C. Annual cost — It comes every month, not once a year.
Answer: **B** (`correctIndex: 1`).

**2. A 1,800,000 VND cost is due each year. Setting aside evenly over 12 months, how much is that per month?**

- A. 150,000 VND — Correct: 1,800,000 / 12 = 150,000 VND.
- B. 180,000 VND — This divides by 10, not 12.
- C. 1,800,000 VND — This is the whole annual amount, not the monthly part.
Answer: **A** (`correctIndex: 0`).

**3. Spending jumps in the month of Tết. How should it be handled?**

- A. Treat it as a surprise even though it happens every year — A cost that repeats every year can be anticipated.
- B. Leave it out of the records so the month looks tidy — Leaving it out makes the records wrong.
- C. Put it in the annual plan and set money aside beforehand — Correct: if you know it is coming, set aside in advance.
Answer: **C** (`correctIndex: 2`).

### Optional action

In Picket, add one annual cost under Bills with its due date, then create a small budget pocket for the monthly amount. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_bill_calendar_tool_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.03 — Needs and wants depend on context

**Chapter:** chapter-02 · **Stage:** stage-01-foundation · **Competency:** planning.contextual-priorities  
**Objective:** Explain a priority using circumstances, timing and alternatives, without judging from an item name.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Needs often relate to daily living, health, education or responsibilities you must meet. Wants tend to have more flexibility. The boundary depends on context, not a fixed label attached to an item. Internet access may support online classes or be an extra entertainment service. A ride-hailing trip may help an injured person travel safely. This lesson therefore does not judge someone as good or bad from a purchase, or require giving up every source of enjoyment.

Try three questions: what happens if I postpone it, when must the need be met, and is there another suitable option? A cheaper option is an alternative only when it actually meets the need. Walking cannot always replace transport on a rainy night or an unsafe route. A cheaper service is not useful if it lacks a feature required for work. A purchase may contain both an essential part and an upgrade; you can explain that distinction rather than choose one label for everything.

In an imaginary situation, Phương has 1,500,000 VND left before the next income payment. Phương plans to keep 900,000 VND for housing and 400,000 VND for food, leaving 200,000 VND. New headphones priced at 350,000 VND would exceed that remainder by 150,000 VND unless something else changes. The calculation does not call Phương undisciplined; it identifies a need to postpone, choose another option or confirm another source of money. If the old headphones are broken and immediately needed for work, the context changes, but the shortfall still needs addressing.

You may choose a flexible allowance for interests that fits your circumstances. No single budget percentage suits everybody. Someone supporting family or facing high health costs may have fewer choices; calling this a personal weakness does not create money. In Picket, priority labels support reflection; they do not block saving a transaction or decide for you. When context is missing, asking for more information is a good answer. Try writing a brief reason for your choice. You can change that reason as responsibilities, health or timing change.

### Worked example

1,500,000 − 900,000 − 400,000 = 200,000 VND; 350,000 − 200,000 = a 150,000 VND shortfall for this choice.

#### Remember

- Classify needs and wants using purpose, circumstances and timing.
- One item can serve several purposes; a merchant name alone is not enough.
- Compare options with the stated resources and priorities rather than judging a person by a category.

#### Common misconception

Assuming a product is always a want for everyone.

#### Self-check — fictional scenario

Chi has 150,000 VND. A 100,000 VND connection plan is needed for an online exam tomorrow; a 60,000 VND entertainment plan can wait until next week. Suggest an affordable option and explain the context.

#### Step-by-step reasoning

1. In this case, the exam connection has a specific deadline and is difficult to postpone.
2. After paying for that connection, Chi has 150,000 − 100,000 = 50,000 VND left.
3. Both plans cost 160,000 VND, exceeding the available money by 10,000 VND; entertainment can wait without assuming new income.

#### Conclusion

One option supported by the facts is to buy the exam connection and postpone entertainment. This is not a universal ban on entertainment.

- `1500000-900000-400000 = 200000`
- `350000-200000 = 150000`
- `150000-100000 = 50000`
- `100000+60000 = 160000`
- `160000-150000 = 10000`

### Practice scenarios

**1. Is a ride-hailing transaction enough to conclude that the trip was a want?**

- A. Yes, ride-hailing is always unnecessary — A fixed label ignores health and circumstances.
- B. No, context and safe alternatives are needed — Correct: the same service can serve different purposes.
- C. Yes, because it costs more than a bus — A lower price does not guarantee a suitable alternative.
Answer: **B** (`correctIndex: 1`).

**2. Phương keeps both planned allocations unchanged. How much is missing for the 350,000 VND headphones?**

- A. 150,000 VND — Correct: the 350,000 VND price minus the 200,000 VND remainder.
- B. 200,000 VND — 200,000 VND is what remains before buying.
- C. 350,000 VND — There is already 200,000 VND, so the entire price is not missing.
Answer: **A** (`correctIndex: 0`).

**3. The headphones are broken and needed for work. What is most reasonable?**

- A. Calling them a need creates more money — A label does not change the balance.
- B. Ignore every upcoming obligation — The consequences of obligations still exist.
- C. Consider options that meet the work need and recalculate the shortfall — Correct: consider both context and ability to pay.
Answer: **C** (`correctIndex: 2`).

### Optional action

Choose an example or existing expense and explain why it could be postponed or needs priority. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_prioritizing-bills_tool.pdf)

## picket.vi.financial.v1.15 — Pocket budgeting: every amount has a job

**Chapter:** chapter-07 · **Stage:** stage-01-foundation · **Competency:** budgeting.pocket-allocation  
**Objective:** Allocate all take-home pay to pockets and adjust between pockets without breaking the total.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A pocket budget starts with one question: what jobs will this month's money do? You divide take-home pay into pockets such as housing, food, transport, bills, emergencies and annual costs. When the pockets add up to take-home pay, every amount has a job. Money without a job is easy to spend without noticing.

A fictional example: Hưng takes home 10,000,000 VND. Hưng allocates housing 3,500,000 VND, food 2,800,000 VND, transport 700,000 VND, bills 600,000 VND, emergencies 1,000,000 VND and annual costs 300,000 VND. The total is 8,900,000 VND. That leaves 1,100,000 VND without a job, so Hưng puts it in a flexible pocket. Mid-month, food runs over by 400,000 VND. Hưng moves 400,000 VND from the flexible pocket to food. The flexible pocket has 700,000 VND left. The total money is unchanged; only the plan was adjusted on purpose.

There is no single split that suits everyone. Someone raising children, repaying debt or earning irregularly will divide money differently. What matters is that the pockets never exceed the money you actually have.

Moving money between pockets is not failure. It is how a plan keeps up with life.

### Worked example

Pockets: 3,500,000 + 2,800,000 + 700,000 + 600,000 + 1,000,000 + 300,000 = 8,900,000 VND. Unassigned: 10,000,000 − 8,900,000 = 1,100,000 VND. After the move: 1,100,000 − 400,000 = 700,000 VND.

#### Remember

- Allocate all take-home pay to pockets so nothing drifts.
- Moving between pockets keeps the total unchanged.
- The right split depends on your own circumstances.

#### Common misconception

Thinking that moving money between pockets means the budget has failed.

#### Self-check — fictional scenario

Take-home pay is 9,000,000 VND. Housing 3,000,000 VND, food 2,500,000 VND, transport 800,000 VND and emergencies 700,000 VND are allocated. The rest goes 1,200,000 VND to a study goal and the remainder to a flexible pocket. Check what is unassigned.

#### Step-by-step reasoning

1. Allocated: 3,000,000 + 2,500,000 + 800,000 + 700,000 = 7,000,000 VND.
2. Left: 9,000,000 − 7,000,000 = 2,000,000 VND.
3. After allocating: 2,000,000 − 1,200,000 − 800,000 = 0 VND.

#### Conclusion

The flexible pocket receives 800,000 VND and nothing is left unassigned.

- `3500000+2800000+700000+600000+1000000+300000 = 8900000`
- `10000000-8900000 = 1100000`
- `1100000-400000 = 700000`
- `3000000+2500000+800000+700000 = 7000000`
- `9000000-7000000 = 2000000`
- `2000000-1200000-800000 = 0`

### Practice scenarios

**1. Take-home pay is 8,000,000 VND and 7,400,000 VND is in pockets. How much has no job yet?**

- A. 600,000 VND — Correct: 8,000,000 − 7,400,000 = 600,000 VND.
- B. 7,400,000 VND — This is the allocated part, not the remainder.
- C. 0 VND — Some money still has no pocket.
Answer: **A** (`correctIndex: 0`).

**2. The food pocket is over by 200,000 VND. What is the consistent fix?**

- A. Delete the extra transaction so it matches — Deleting a real transaction makes the records wrong.
- B. Move 200,000 VND from a flexible pocket and note why — Correct: the total stays the same and the plan changes on purpose.
- C. Raise income on paper — Income does not grow because a number is edited.
Answer: **B** (`correctIndex: 1`).

**3. Is there one mandatory split that everyone must use?**

- A. Yes, everyone must follow the same ratios — Everyone's circumstances differ.
- B. No; the split depends on circumstances, but pockets must match the money you have — Correct: the core rule is that pockets do not exceed real money.
- C. Yes, if an app suggests it — A suggestion is a starting point, not a rule.
Answer: **B** (`correctIndex: 1`).

### Optional action

Open your budget pockets in Picket and check whether their total exceeds expected take-home pay. You may just look without editing. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_spending_tracker_2018-11_ADA.pdf)
- [Primary reference](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf)

## picket.vi.financial.v1.04 — Plan around the dates money arrives

**Chapter:** chapter-02 · **Stage:** stage-01-foundation · **Competency:** planning.irregular-income  
**Objective:** Build an income-and-expense calendar using due dates and separate uncertain income.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A monthly income total does not tell the whole story. Money arriving after rent is due cannot pay it on the day before arrival. Freelancers, small sellers and people receiving support in installments may need to plan around each incoming payment. Begin with money available now, then add income whose date and amount are confirmed. Money merely promised or dependent on unfinished work belongs separately as an assumption, rather than being treated as already in the wallet.

Nam has 1,200,000 VND at the start of the week. Rent of 800,000 VND is due on Wednesday, and food is expected to require 300,000 VND on Friday. A customer has promised 1,000,000 VND on Sunday but has not confirmed it. Before that income, Nam has only 100,000 VND left after the two expenses. An additional 200,000 VND cost on Saturday creates a 100,000 VND shortfall in the scenario with no further income. Placing the promised payment at the start of the week would hide this gap, even though the end-of-week total might appear positive.

A budget in this situation can have a confirmed part and a part conditional on money actually received. Do not divide your best annual income across weeks and assume every week will deliver that amount. Looking across periods can reveal variability, but an average is not a guarantee. If income falls short, review flexible expenses and proactively ask payees about options that really exist. Do not assume a later due date has been agreed. Nor should you omit food or health needs just to make the table look balanced.

In Picket, reviewing the days before the next income payment can help you choose a more suitable limit than a general monthly label. Mark and reconcile paid bills so they are not subtracted again. If the plan needs revision, revise future assumptions; transactions that already happened retain their actual dates. You do not need to disclose your salary to study this lesson: use Nam's example. A useful outcome is knowing which date needs attention, what is confirmed and what must be verified, rather than making irregular income look regular on screen.

### Worked example

1,200,000 − 800,000 − 300,000 = 100,000 VND; an additional 200,000 VND expense before income arrives produces −100,000 VND.

#### Remember

- Place income and obligations on a timeline rather than relying only on monthly totals.
- Money expected after a due date does not remove the earlier shortfall.
- Change a real schedule only after the external change is confirmed.

#### Common misconception

Believing a positive month-end balance means every earlier payment is affordable.

#### Self-check — fictional scenario

Dũng has 150,000 VND on day 5. A 200,000 VND bill is due on day 7, while 500,000 VND of income is expected on day 10. With no other flows, identify the shortfall and what still needs verification.

#### Step-by-step reasoning

1. Before the income, the day-7 calculation is 150,000 − 200,000 = −50,000 VND.
2. If the income arrives on day 10, the later calculation is −50,000 + 500,000 = 450,000 VND.
3. A positive ending value does not remove the earlier gap; verify the income date and any actual arrangement with the relevant party.

#### Conclusion

The day-7 shortfall is 50,000 VND. A Picket schedule makes it visible; it does not move a due date or create money.

- `1200000-800000-300000 = 100000`
- `100000-200000 = -100000`
- `150000-200000 = -50000`
- `-50000+500000 = 450000`

### Practice scenarios

**1. The customer has not confirmed the 1,000,000 VND Sunday payment. How should it be represented?**

- A. Cash already available on Monday — This incorrectly changes both timing and certainty.
- B. Assumed income, separate from the actual balance — Correct: compare scenarios with and without receipt.
- C. Guaranteed weekly income — One promise does not establish a recurring schedule.
Answer: **B** (`correctIndex: 1`).

**2. Before Sunday, Nam spends another 200,000 VND after the two obligations. What is the scenario balance?**

- A. 900,000 VND — This assumes the customer money has already arrived.
- B. 100,000 VND — 100,000 VND was the balance before the extra expense.
- C. Negative 100,000 VND — Correct: 100,000 VND minus 200,000 VND.
Answer: **C** (`correctIndex: 2`).

**3. Monthly income exceeds monthly expenses, yet there is a mid-month shortfall. Why?**

- A. Income may arrive after payments are needed — Correct: timing matters alongside period totals.
- B. Addition does not work for money — Addition still works; the timeline is also needed.
- C. Changing categories is enough to create money — Changing labels does not create money.
Answer: **A** (`correctIndex: 0`).

### Optional action

Review or write down three upcoming payments and the next income date using illustrative data. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_income_benefits_tool_2018-11_ADA.pdf)

# Stage 2: Stability

Set goals, build an emergency fund, read balances and understand tax on wages.

## picket.vi.financial.v1.16 — Write clear goals and put them in order

**Chapter:** chapter-08 · **Stage:** stage-02-stability · **Competency:** goals.specific-and-prioritised  
**Objective:** Write goals with an amount, a deadline and a way to track them; prioritise when money cannot cover all of them.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

"Save more" is a wish. A clearer goal answers: how much, for what, by when, and how will you track it? A goal also needs to be realistic for your current income. Otherwise it is easy to give up after a few weeks.

When there are several goals, put them in order. Many people first build a small emergency reserve and keep essential bills paid on time. Optional large purchases come after that. This is a common ordering, not a mandatory rule.

A fictional example: Ngọc has 1,500,000 VND left each month. Ngọc wants 6,000,000 VND for emergencies and 9,000,000 VND for a computer, both within 12 months. The emergency goal needs 6,000,000 / 12 = 500,000 VND per month. The computer needs 9,000,000 / 12 = 750,000 VND per month. The total is 1,250,000 VND. Ngọc has 250,000 VND left for other things. If the monthly surplus falls, Ngọc keeps the emergency amount first and moves the computer deadline.

Writing goals down shows conflicts early. Changing a deadline when circumstances change is normal.

### Worked example

6,000,000 / 12 = 500,000 VND; 9,000,000 / 12 = 750,000 VND; 500,000 + 750,000 = 1,250,000 VND; 1,500,000 − 1,250,000 = 250,000 VND left.

#### Remember

- A clear goal has an amount, purpose, deadline and tracking method.
- Add up the monthly amounts for all goals to spot conflicts.
- When money is short, move deadlines or shrink goals rather than borrowing.

#### Common misconception

Believing that changing a goal deadline means you have failed.

#### Self-check — fictional scenario

A goal of 4,800,000 VND in 8 months. How much is needed per month? If only 400,000 VND per month is possible, how many months are needed?

#### Step-by-step reasoning

1. Planned amount: 4,800,000 / 8 = 600,000 VND per month.
2. At 400,000 VND per month: 4,800,000 / 400,000 = 12 months.
3. The deadline moves from 8 to 12 months; the goal amount stays the same.

#### Conclusion

600,000 VND per month for 8 months, or 12 months at 400,000 VND.

- `6000000/12 = 500000`
- `9000000/12 = 750000`
- `500000+750000 = 1250000`
- `1500000-1250000 = 250000`
- `4800000/8 = 600000`
- `4800000/400000 = 12`

### Practice scenarios

**1. Which goal is clearest?**

- A. Save more — There is no amount or deadline.
- B. Set aside 3,000,000 VND for a course in 10 months, reviewing monthly — Correct: it has an amount, purpose, deadline and a way to track.
- C. Buy something someday — Progress cannot be measured.
Answer: **B** (`correctIndex: 1`).

**2. Two goals need 400,000 VND and 700,000 VND per month; you have 900,000 VND spare. What is true?**

- A. Enough for both — 400,000 + 700,000 = 1,100,000 VND, which is more than 900,000 VND.
- B. Short by 200,000 VND; move a deadline or reduce a goal — Correct: 1,100,000 − 900,000 = 200,000 VND.
- C. Short by 1,100,000 VND — 1,100,000 VND is the total needed, not the shortfall.
Answer: **B** (`correctIndex: 1`).

**3. Before an optional large purchase, which priority is usually sensible?**

- A. A small emergency reserve and paying essential bills on time — Correct: it lowers the risk of late payments and gives a buffer for surprises.
- B. The large purchase because prices may rise — A possible price rise does not make an item essential.
- C. Borrow more to do both at once — Borrowing more creates a new obligation and interest cost.
Answer: **A** (`correctIndex: 0`).

### Optional action

In Picket, rewrite one goal with an amount and a deadline, then create a pocket to track it. You can write it on paper if you do not want a pocket yet. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)
- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.06 — Break a goal into adjustable steps

**Chapter:** chapter-03 · **Stage:** stage-02-stability · **Competency:** saving.realistic-goal  
**Objective:** Calculate what is still needed and an amount per period; adjust the deadline when circumstances change.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A clear goal often has an amount, a reason and a date you would like to reach it. It remains an adjustable plan. If prices change or income falls, revising a deadline does not erase the steps already taken. Before calculating, check how much money is genuinely allocated to this goal. Money reserved for rent should not simultaneously count toward buying a computer, unless you deliberately reallocate it and understand the consequences for rent.

Tú wants to set aside 3,000,000 VND for a course after six income periods. There is already 600,000 VND allocated to it. The remaining amount is 2,400,000 VND, or 400,000 VND in each of six equal periods. This division explains the pace; it is not a command to contribute regardless of circumstances. If only 300,000 VND per period is feasible, it takes eight periods to cover the remainder, assuming unchanged prices and no interest. Do not add uncertain future returns merely to make the deadline appear achievable.

When another need takes priority in a period, recalculate using the money actually available. Avoid adding both an intended contribution and the contribution already transferred. Moving money into your own savings wallet is still a wallet transfer across the total scope; a goal expresses what you intend to use it for. If you update a progress bar without corresponding money, distinguish a plan from a data adjustment. A full bar does not prove you can pay when other expenses need the same balance.

In Picket, practice can mean reviewing an existing goal or just solving the example. You do not need to open a real savings product to finish, or prove progress with an account screenshot. An optional reminder may help you revisit a plan, but skipping it does not remove what you have learned. When comparing options, identify what changes: the time, the amount per period or the goal's scope. Avoid concluding that faster completion means better money management; people have different resources and responsibilities. A small step helps when you understand it and can still meet important current needs.

### Worked example

(3,000,000 − 600,000) / 6 = 400,000 VND per period; 2,400,000 / 300,000 = 8 periods.

#### Remember

- Describe a goal using the remaining amount and a reviewable deadline.
- Recalculate from actual progress when income or priorities change.
- Changing the deadline or goal size is an option, not a personal failure.

#### Common misconception

Insisting on an old contribution even when it would leave essential costs uncovered.

#### Self-check — fictional scenario

Khoa wants 900,000 VND, already has 300,000 VND and planned to add 100,000 VND weekly for 6 weeks. The first two contributions were 100,000 and 40,000 VND. With 4 weeks left, only 80,000 VND per week is affordable. Does the old plan still fit?

#### Step-by-step reasoning

1. After two weeks, the amount held is 300,000 + 100,000 + 40,000 = 440,000 VND.
2. The remaining 460,000 VND would require 115,000 VND each week over the next 4 weeks.
3. That exceeds the stated 80,000 VND capacity; consider a later date, smaller goal or another feasible option instead of inventing the difference.

#### Conclusion

The original plan no longer fits. Six more weeks at 80,000 VND would add 480,000 VND before other costs; that is a scenario to consider, not a promise.

- `3000000-600000 = 2400000`
- `2400000/6 = 400000`
- `2400000/300000 = 8`
- `300000+100000+40000 = 440000`
- `900000-440000 = 460000`
- `460000/4 = 115000`
- `6*80000 = 480000`

### Practice scenarios

**1. Tú has 600,000 VND toward a 3,000,000 VND goal. How much is still needed?**

- A. 3,600,000 VND — This adds rather than subtracts what is already available.
- B. 2,400,000 VND — Correct: target minus the money actually allocated.
- C. 600,000 VND — This is what is available, not what is missing.
Answer: **B** (`correctIndex: 1`).

**2. Only 300,000 VND per period can be set aside for the remainder. How many periods are needed under the lesson assumptions?**

- A. 6 — Six periods produce only 1,800,000 VND.
- B. 10 — Ten periods divides the whole target and ignores the existing 600,000 VND.
- C. 8 — Correct: 2,400,000 divided by 300,000 is eight.
Answer: **C** (`correctIndex: 2`).

**3. One period requires spending on medicine. What should happen to the goal?**

- A. Update the actual amount and recalculate the deadline — Correct: a plan serves your circumstances, not the reverse.
- B. Keep fictional progress because it looks better — Progress that does not match money makes later decisions harder.
- C. Skip medicine to preserve progress — Health needs should not be displaced by progress points.
Answer: **A** (`correctIndex: 0`).

### Optional action

Write a fictional goal with money already allocated, the remaining amount and two deadline options. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf)

## picket.vi.financial.v1.05 — Emergency funds differ from known future costs

**Chapter:** chapter-03 · **Stage:** stage-02-stability · **Competency:** resilience.emergency-vs-planned  
**Objective:** Distinguish unexpected events from scheduled costs and choose a reserve goal suited to your circumstances.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Emergency money gives you more options when something unexpected happens, such as essential equipment breaking or income being interrupted. Money for a known cost, such as next term's tuition or an annual renewal, serves a different purpose: preparation for a schedule. Both are useful. Distinguishing them helps avoid feeling that you constantly face emergencies when an annual bill simply was not planned. There is no need for blame when allocated money must be used; look at what actually happened.

Dung has 2,000,000 VND, including 1,200,000 VND allocated to tuition and 800,000 VND to emergencies. Tuition of 1,200,000 VND becomes due; paying it leaves 800,000 VND. If essential study equipment then unexpectedly needs a 500,000 VND repair, 300,000 VND remains. Under this allocation, tuition was not a withdrawal from the emergency reserve. The reserve is not extra money beyond the 2,000,000 VND either; it is part of the existing total. Labeling the same money as belonging to two funds does not let it pay twice.

A suitable reserve depends on needs, dependants, income stability and support you can actually access. A modest starting goal may be more manageable than a large target that makes you give up. This lesson does not require everybody to hold the same number of months of expenses, or promise that reaching a number protects against every disruption. If nothing remains after basic needs, acknowledge that limit. You do not need to borrow simply to create a balance labeled as an emergency fund.

Consider keeping money somewhere whose fees, withdrawal access and availability when needed you understand, rather than chasing a promised return. Do not put all money needed soon into something you do not understand or cannot access in time. In Picket, review goal labels and balances separately to avoid confusion. After using a reserve, rebuild the plan when circumstances allow; do not punish yourself by dropping essential costs. A learning step can simply be listing known costs and unexpected events, without depositing money or buying a financial product.

### Worked example

2,000,000 − 1,200,000 = 800,000 VND; 800,000 − 500,000 = 300,000 VND.

#### Remember

- Separate known future costs from unexpected expenses.
- An appropriate reserve depends on circumstances; the examples are not mandatory targets.
- An earmark helps tracking but does not move money or guarantee a balance.

#### Common misconception

Treating every large cost as an emergency, or treating a reserve label as new money.

#### Self-check — fictional scenario

Hà expects a 240,000 VND vehicle service in 4 weeks. A separate unexpected-expense reserve held 90,000 VND before an unplanned repair used 40,000 VND. Separate the purposes and calculate the remaining amounts.

#### Step-by-step reasoning

1. The known service cost gives an even target of 240,000 ÷ 4 = 60,000 VND per week under the stated assumption.
2. The unexpected repair leaves 90,000 − 40,000 = 50,000 VND in the reserve.
3. The purposes differ; neither label creates income, and contributions should not be forced beyond actual capacity.

#### Conclusion

The service target is 60,000 VND weekly if feasible, and the unexpected-expense reserve has 50,000 VND left. Adjust the plan when real income changes.

- `2000000-1200000 = 800000`
- `800000-500000 = 300000`
- `240000/4 = 60000`
- `90000-40000 = 50000`

### Practice scenarios

**1. Tuition has a clear date next term. How is it classified in this lesson?**

- A. An unforeseeable emergency — A known date and amount can be planned.
- B. A scheduled cost to prepare for — Correct: it differs from an unexpected event.
- C. New income — It is money to pay, not money coming in.
Answer: **B** (`correctIndex: 1`).

**2. Dung pays tuition and repairs the equipment as in the example. How much remains?**

- A. 300,000 VND — Correct: both actual expenses have been deducted.
- B. 800,000 VND — This was the balance before the repair.
- C. 1,500,000 VND — This calculation omitted tuition.
Answer: **A** (`correctIndex: 0`).

**3. Nothing remains after basic needs. What is the most suitable response?**

- A. Borrow to make a fund label look good — Borrowing adds an obligation; it does not automatically create safety.
- B. Treat yourself as a failure — Limited resources are not a judgment of character.
- C. Acknowledge the constraint and revisit the goal when circumstances change — Correct: goals should fit real circumstances.
Answer: **C** (`correctIndex: 2`).

### Optional action

Separate two examples into scheduled costs and unexpected events; no money transfer is required. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)

## picket.vi.financial.v1.17 — Build an emergency fund in milestones

**Chapter:** chapter-08 · **Stage:** stage-02-stability · **Competency:** resilience.emergency-fund-sizing  
**Objective:** Work out monthly essential costs, choose a milestone that suits your situation and calculate how long it takes.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

An emergency fund helps you cope with lost income or an urgent cost without borrowing. A clear way to size it is in months of essential costs. Essential costs are what you still have to pay if income stops: housing, basic food, transport, bills and minimum debt payments.

There is no number of months that fits everyone. People with irregular income, dependants or work in a volatile sector often need a bigger buffer. You can begin with a small milestone, then raise it gradually.

A fictional example: Quân's essential costs are housing 2,500,000 VND, food 2,000,000 VND, transport 500,000 VND and bills 500,000 VND. The total is 5,500,000 VND per month. Quân's first milestone is 1 month of essentials, which is 5,500,000 VND. The next is 3 months, which is 16,500,000 VND. Setting aside 1,100,000 VND per month, Quân needs 5 months to reach the first milestone.

Keep the fund somewhere you can withdraw from when needed, whose fees you understand, and separate from everyday spending money. After using the fund, record the expense correctly and plan to refill it gradually.

### Worked example

5,500,000 VND = 2,500,000 + 2,000,000 + 500,000 + 500,000. 3-month milestone: 5,500,000 × 3 = 16,500,000 VND. Time to first milestone: 5,500,000 / 1,100,000 = 5 months.

#### Remember

- Measure an emergency fund in months of essential costs.
- The right number of months depends on income stability and dependants.
- Start with a small milestone and refill after using it.

#### Common misconception

Thinking a fund is only worth starting if it is large from day one.

#### Self-check — fictional scenario

Essential costs are 6,000,000 VND per month. The first milestone is 2 months. There is already 3,000,000 VND and 1,500,000 VND is added each month. How long until the milestone?

#### Step-by-step reasoning

1. Milestone: 6,000,000 × 2 = 12,000,000 VND.
2. Still needed: 12,000,000 − 3,000,000 = 9,000,000 VND.
3. Time: 9,000,000 / 1,500,000 = 6 months.

#### Conclusion

The milestone is 12,000,000 VND and takes 6 more months at 1,500,000 VND per month.

- `2500000+2000000+500000+500000 = 5500000`
- `5500000*3 = 16500000`
- `5500000/1100000 = 5`
- `6000000*2 = 12000000`
- `(12000000-3000000)/1500000 = 6`

### Practice scenarios

**1. Essential costs are 4,000,000 VND per month and the milestone is 3 months. What is the fund target?**

- A. 4,000,000 VND — This is only 1 month.
- B. 12,000,000 VND — Correct: 4,000,000 × 3 = 12,000,000 VND.
- C. 7,000,000 VND — This adds 3 million instead of multiplying by 3 months.
Answer: **B** (`correctIndex: 1`).

**2. Which feature matters most for where an emergency fund is kept?**

- A. The highest promised return — Promises of high returns often come with risk or limited access.
- B. Hard to withdraw so you will not spend it — If you cannot withdraw in an urgent situation, the fund does not work.
- C. Available when needed, fees understood and separate from daily spending — Correct: it must be ready when needed and not mixed with spending.
Answer: **C** (`correctIndex: 2`).

**3. You just used 1,000,000 VND from the fund to repair the motorbike you ride to work. What next?**

- A. Record the real expense, then plan to refill gradually — Correct: this is exactly the kind of moment the fund exists for.
- B. Hide the withdrawal so the fund looks untouched — Hiding the numbers makes the plan wrong.
- C. Treat the fund as failed and give up — Using the fund for an urgent need is its purpose.
Answer: **A** (`correctIndex: 0`).

### Optional action

In Picket, add up your essential pockets to find one month of essential costs, then set a first milestone for your emergency pocket. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)
- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.07 — A balance is not automatically money available to allocate

**Chapter:** chapter-04 · **Stage:** stage-02-stability · **Competency:** forecast.obligations-and-scope  
**Objective:** Separate the current balance, future obligations and a reserve when interpreting a scenario.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A balance tells you how much money you have within the scope being viewed. It does not automatically tell you how much can be allocated to a new decision. Some upcoming payments have not yet left the wallet. You may also want to keep part of the money for surprises. When reading a number, look for its date, included wallets and expenses already included or still outstanding. If a foreign-currency wallet has no suitable exchange rate, do not add its numeric amount directly to VND.

Vy has 4,000,000 VND in the VND wallets under consideration. Before the next income payment, Vy has confirmed rent of 1,500,000 VND and expected food costs of 700,000 VND. Vy wants to retain 500,000 VND as a reserve. Given these exact inputs, the remainder after obligations and the reserve is 1,300,000 VND. This does not say the bank balance has already fallen to 1,300,000 VND. It distinguishes current money from the portion being considered for a new decision. The reserve is an allocation within the same balance, not spending already completed.

If rent has already been paid and that transaction has already reduced the 4,000,000 VND balance, do not subtract it again. Reconcile the bill's status and the payment record before reviewing the schedule. Likewise, an unconfirmed receipt photo should not automatically create another obligation in addition to an existing record. Moving money between two wallets in scope does not increase the total available to allocate. These rules prevent overly optimistic or pessimistic reports caused by counting something more than once.

The 1,300,000 VND still depends on whether the list is complete. Vy might have omitted transport or have uncertain income. Treat the result as conditional, with things still to check. In Picket, when a schedule is unconfirmed, it is better to acknowledge insufficient data than declare that you are allowed to spend a particular amount. You can change assumptions and view results, but the app does not decide for you. Practice means checking whether one obligation has been paid; it does not require giving bank account information to a new service.

### Worked example

4,000,000 − 1,500,000 − 700,000 − 500,000 = 1,300,000 VND under the stated inputs.

#### Remember

- Distinguish the displayed balance from money already planned for obligations and essentials.
- Use the same wallet scope and currency when calculating unallocated money.
- Mark paid obligations so they are not subtracted a second time.

#### Common misconception

Assuming the entire displayed balance is available for a new purchase.

#### Self-check — fictional scenario

Lan has 1,200,000 VND in the selected wallets. Before the next income, Lan has allocated 800,000 VND to rent, 250,000 VND to living costs and 100,000 VND to a chosen reserve. Under these assumptions, what remains unallocated?

#### Step-by-step reasoning

1. The planned allocations total 800,000 + 250,000 + 100,000 = 1,150,000 VND.
2. The stated unallocated amount is 1,200,000 − 1,150,000 = 50,000 VND.
3. Check what is paid, missing or outside the scope; this calculation is not a certain assessment of a real person’s affordability.

#### Conclusion

There is 50,000 VND unallocated in this example. A 1,200,000 VND balance does not mean that the full amount is free to spend.

- `4000000-1500000-700000-500000 = 1300000`
- `800000+250000+100000 = 1150000`
- `1200000-1150000 = 50000`

### Practice scenarios

**1. What does 1,300,000 VND mean in the example?**

- A. The certain bank balance right now — The bank has not automatically deducted future expenses and the reserve allocation.
- B. A conditional remainder after the stated allocations — Correct: retain the assumptions and scope when reading the number.
- C. Money just created by the app — Calculation does not create money.
Answer: **B** (`correctIndex: 1`).

**2. Rent already appears in a transaction deducted from the current balance. What happens if the bill is subtracted again?**

- A. The obligation is counted twice — Correct: reconcile the payment status.
- B. Accuracy improves — Double subtraction makes the projection incorrectly low.
- C. New income is created — There is no new source of income.
Answer: **A** (`correctIndex: 0`).

**3. There is a 100 USD wallet and a 4,000,000 VND wallet, but no exchange rate. What should you do?**

- A. Add them as 4,000,100 VND — Different units cannot be added directly.
- B. Treat USD as zero without explaining — Silent omission misrepresents the scope.
- C. Show them separately and state that cross-currency aggregation is unavailable — Correct: the limit must be visible.
Answer: **C** (`correctIndex: 2`).

### Optional action

Review an upcoming payment or example and mark paid/unpaid; do not create a real payment. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_bill_calendar_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.08 — Scenarios ask questions; they do not predict with certainty

**Chapter:** chapter-04 · **Stage:** stage-02-stability · **Competency:** forecast.scenario-and-coverage  
**Objective:** Compare two scenarios using consistent assumptions and explain why missing data prevents confident forecasting.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A scenario asks how money changes if specified things happen. A forecast tries to estimate what may happen using particular data and a method. Both have limits, but the terms should not be interchangeable merely to sound certain. Entering the price of something you might buy and viewing the difference is first a conditional calculation. It proves neither that you will buy it nor that every other future income and expense is known.

An has 2,000,000 VND. Over seven days, An confirms income of 1,000,000 VND and obligations of 1,500,000 VND. With no other transactions, the closing balance is 1,500,000 VND. Buying an item for 600,000 VND during the period, with everything else unchanged, leaves 900,000 VND. The difference is 600,000 VND. This does not assert that An will have exactly 900,000 VND next week. If income arrives late or expenses are missing, reality differs. Daily balances also matter, not just the final day.

Sparse records can create a misleading story. Three days without entries do not mean three days of zero spending. Tracking only one wallet also leaves other wallets unknown. A complex model cannot turn those gaps into facts by itself. Useful responses include asking how complete records are, showing the last synchronization time and allowing known schedules to be corrected. Low and high numbers produced by changing assumptions are scenarios; do not call them validated confidence probabilities without appropriate measurement and calibration.

In Picket, trying a choice should not create an actual transaction or edit a real budget. Use the appropriate recording flow only when you actively confirm something that happened. With limited history, illustrative data can still explain the calculation without inventing a date when money will run out. You can defer a conclusion and add inputs later. Good practice is to state the condition before the result: if the schedule is correct and nothing else occurs, what remains? That sentence helps you test a decision and identify what is still unknown.

### Worked example

Without purchase: 2,000,000 + 1,000,000 − 1,500,000 = 1,500,000 VND. With purchase: 1,500,000 − 600,000 = 900,000 VND.

#### Remember

- Separate confirmed facts from assumptions when building a scenario.
- Compare options over the same time window, wallet scope and currency.
- A simulated result is neither a promise nor an executed transaction.

#### Common misconception

Choosing the most optimistic scenario and treating uncertain income as money already held.

#### Self-check — fictional scenario

Minh has 400,000 VND and a confirmed upcoming 150,000 VND payment. Minh is considering a 300,000 VND item and might receive another 200,000 VND at an uncertain time. Compare the purchase without and with that assumed income.

#### Step-by-step reasoning

1. After the confirmed payment, the facts give 400,000 − 150,000 = 250,000 VND.
2. Buying before any extra income gives a scenario balance of 250,000 − 300,000 = −50,000 VND.
3. Assuming 200,000 VND arrives in time gives 150,000 VND; label that assumption rather than removing the base-case warning.

#### Conclusion

The base case has a 50,000 VND shortfall if the item is bought. The 150,000 VND result belongs only to the timely-income scenario and is not guaranteed.

- `2000000+1000000-1500000 = 1500000`
- `1500000-600000 = 900000`
- `1500000-900000 = 600000`
- `400000-150000 = 250000`
- `250000-300000 = -50000`
- `-50000+200000 = 150000`

### Practice scenarios

**1. Two options differ only by a 600,000 VND purchase. What is the closing-balance difference?**

- A. 600,000 VND — Correct: all other assumptions remain unchanged.
- B. 900,000 VND — This is the remainder in the purchase option.
- C. 1,500,000 VND — This is the remainder without the purchase.
Answer: **A** (`correctIndex: 0`).

**2. Three days have no entries. Can spending be concluded to be zero?**

- A. Yes, because the chart is blank — A blank chart may mean records are missing.
- B. Not yet — Correct: recording coverage needs to be understood.
- C. Yes, if AI sounds confident — Confident wording is not evidence.
Answer: **B** (`correctIndex: 1`).

**3. What should changing a price on a scenario screen do to actual transactions?**

- A. Automatically create an expense — Trying an option is not an actual purchase.
- B. Edit the budget to fit the result — Silent changes undermine the plan.
- C. Leave them unchanged; simulate until a separate confirmation action — Correct: simulation and factual recording are separate steps.
Answer: **C** (`correctIndex: 2`).

### Optional action

Solve two illustrative scenarios and name one thing that could change the result. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfbp_your-money-your-goals_adjust_cash_flow_tool_2018-11_ADA.pdf)
- [Primary reference](https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/01/financial-competence-framework-for-adults-in-the-european-union_614b8b97/510f133c-en.pdf)

## picket.vi.financial.v1.18 — Personal income tax on wages: deductions and progressive brackets

**Chapter:** chapter-09 · **Stage:** stage-02-stability · **Competency:** tax.pit-on-wages-2026  
**Objective:** Work out taxable income from wages and apply the progressive brackets in a simple example.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Personal income tax on wages is not charged on the whole gross salary. First, take assessable income and subtract mandatory insurance. Then subtract the family deductions. What remains is taxable income.

Under Resolution 110/2025/UBTVQH15 adopted on 17 October 2025, from the 2026 tax period the personal deduction is 15,500,000 VND per month. Each registered dependant adds a deduction of 6,200,000 VND per month. The Personal Income Tax Law 2025 takes effect on 1 July 2026. It uses a 5-bracket monthly schedule. Up to 10 million VND is taxed at 5%; over 10 up to 30 million at 10%; over 30 up to 60 million at 20%; over 60 up to 100 million at 30%; over 100 million at 35%. Progressive by portion means each part of income is taxed only at the rate of the bracket it falls in.

A fictional example: Hải earns 30,000,000 VND, which is also the contribution salary, and has 1 dependant. Insurance is 30,000,000 × 10.5% = 3,150,000 VND. Deductions are 15,500,000 + 6,200,000 = 21,700,000 VND. Taxable income is 5,150,000 VND, inside the 5% bracket. Tax is 257,500 VND. Take-home pay is 26,592,500 VND.

This lesson only explains the basic method. Bonuses, income from several sources and the annual finalisation have their own rules. Ask your payroll team or the tax authority when you need an exact figure.

### Worked example

Insurance: 30,000,000 × 10.5% = 3,150,000 VND. Deductions: 15,500,000 + 6,200,000 = 21,700,000 VND. Taxable: 30,000,000 − 3,150,000 − 21,700,000 = 5,150,000 VND. Tax: 5,150,000 × 5% = 257,500 VND. Take-home: 30,000,000 − 3,150,000 − 257,500 = 26,592,500 VND.

#### Remember

- Taxable income = assessable income − mandatory insurance − family deductions.
- From the 2026 tax period: 15,500,000 VND for yourself and 6,200,000 VND per dependant each month.
- Progressive by portion: each part is taxed only at its own bracket rate.

#### Common misconception

Believing that moving into a higher bracket taxes all income at the higher rate.

#### Self-check — fictional scenario

A salary of 40,000,000 VND, also the contribution salary, with no dependants. Work out insurance, taxable income, tax and take-home pay.

#### Step-by-step reasoning

1. Insurance: 40,000,000 × 10.5% = 4,200,000 VND.
2. Taxable: 40,000,000 − 4,200,000 − 15,500,000 = 20,300,000 VND.
3. Bracket 1: 10,000,000 × 5% = 500,000 VND; bracket 2: 10,300,000 × 10% = 1,030,000 VND; total 1,530,000 VND.
4. Take-home: 40,000,000 − 4,200,000 − 1,530,000 = 34,270,000 VND.

#### Conclusion

Tax is 1,530,000 VND and take-home pay is 34,270,000 VND under the lesson assumptions.

- `30000000*105/1000 = 3150000`
- `15500000+6200000 = 21700000`
- `30000000-3150000-21700000 = 5150000`
- `5150000*5/100 = 257500`
- `30000000-3150000-257500 = 26592500`
- `10000000*5/100+15000000*10/100 = 2000000`
- `40000000*105/1000 = 4200000`
- `40000000-4200000-15500000 = 20300000`
- `10000000*5/100 = 500000`
- `(20300000-10000000)*10/100 = 1030000`
- `500000+1030000 = 1530000`
- `40000000-4200000-1530000 = 34270000`

### Practice scenarios

**1. Taxable income is 25,000,000 VND per month under the 5-bracket schedule. What is the tax?**

- A. 2,500,000 VND — This applies 10% to everything, which ignores progressive portions.
- B. 2,000,000 VND — Correct: 10,000,000 × 5% + 15,000,000 × 10% = 500,000 + 1,500,000.
- C. 1,250,000 VND — This applies 5% to everything.
Answer: **B** (`correctIndex: 1`).

**2. From the 2026 tax period, what is the monthly personal deduction?**

- A. 11,000,000 VND — This was the amount before the 2026 tax period.
- B. 6,200,000 VND — This is the amount per dependant.
- C. 15,500,000 VND — Correct: under Resolution 110/2025/UBTVQH15.
Answer: **C** (`correctIndex: 2`).

**3. Taxable income has moved into the 10% bracket. What is true?**

- A. Only the part above 10,000,000 VND is taxed at 10%; the first 10,000,000 VND at 5% — Correct: this is what progressive by portion means.
- B. All income is taxed at 10% — A higher bracket rate applies only to the part inside that bracket.
- C. No tax is due — Positive taxable income means tax is due.
Answer: **A** (`correctIndex: 0`).

### Optional action

If you have a payslip, compare its deduction and tax lines with the method in this lesson. Send specific questions to your payroll team. You do not need to enter the payslip into Picket. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- Personal deduction 15,500,000 VND/month and 6,200,000 VND/month per dependant; Resolution 110/2025/UBTVQH15 adopted 2025-10-17, applies from tax period 2026 — source `pit-deduction-2026`, as of 2026-01-01
- Monthly 5-bracket schedule: to 10m 5%; 10-30m 10%; 30-60m 20%; 60-100m 30%; over 100m 35%; PIT Law 2025 effective 2026-07-01 — source `pit-law-2025`, as of 2026-07-01
- Employee mandatory insurance share 10.5% — source `bhxh-rates`, as of 2025-09-08

### Sources

- [Primary reference](https://hcc.nghean.gov.vn/tin-tong-hop/nghi-quyet-110-2025-ubtvqh15-dieu-chinh-muc-giam-tru-gia-canh-cua-thue-thu-nhap-ca-nhan-2448.html)
- [Primary reference](https://pbgdpl.cantho.gov.vn/tu-ngay-0172026-nhieu-diem-moi-cua-luat-thue-thu-nhap-ca-nhan-can-luu-y)
- [Primary reference](https://hanoi.baohiemxahoi.gov.vn/UserControls/Publishing/News/BinhLuan/pFormPrint.aspx?UrlListProcess=/content/tintuc/Lists/News&ItemID=35560&IsTA=False)

# Stage 3: Protection

Understand borrowing costs, avoid scams, read insurance contracts and use consumer rights.

## picket.vi.financial.v1.09 — Look beyond a small installment to total cost

**Chapter:** chapter-05 · **Stage:** stage-03-protection · **Competency:** borrowing.total-cost  
**Objective:** Calculate total payments including fees; distinguish an advertised rate from the full cost in the example.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A loan involves more than principal. Understand the money actually received, payment schedule, interest and any fees that may arise. A small installment does not by itself prove a loan is cheaper. To compare choices, understand the usable amount, number of payments, dates and conditions. If information is missing, the appropriate answer may be that comparison is not yet possible, rather than choosing the lowest percentage on an advertisement.

In fictional contract A, Linh receives 3,000,000 VND and makes three payments of 1,080,000 VND. There is also a 60,000 VND fee paid separately at the start. Total payments are 3,300,000 VND, or 300,000 VND above the amount received. Fictional contract B also provides the full 3,000,000 VND, requires three payments of 1,110,000 VND and has no other fees: the total is 3,330,000 VND. Under those exact conditions, A costs 30,000 VND less in total payments. This is arithmetic, not a lender recommendation or a conclusion about the legality of any product.

Check whether a fee is deducted from the initial proceeds or paid separately. The usable amount may differ even when both are called a 3,000,000 VND loan. Also check late fees, early-repayment conditions and bundled services. Do not infer an annual rate through simple division when payment dates and outstanding principal change across periods. Nor should a foreign financial indicator be attached to a calculation that does not meet its definition. Here we calculate only the total amounts explicitly stated.

For a real decision, you need contract information applicable in Vietnam and may consult an appropriately qualified person about unclear terms. The international sources support thinking about costs; they do not replace Vietnamese law or create legal rights or deadlines here. You do not need to enter an actual loan or apply to complete the lesson. In Picket, distinguish simulations from existing obligations and record a real schedule only after checking. If pressured to sign with unanswered questions, pausing to verify helps preserve your choice.

### Worked example

A: 3 × 1,080,000 + 60,000 = 3,300,000 VND, with a cost of 300,000 VND. B: 3 × 1,110,000 = 3,330,000 VND; difference: 30,000 VND.

#### Remember

- Compare total payments, term, actual proceeds and known fees before comparing instalment size.
- A smaller instalment can come with more instalments and a higher total.
- A simple total-cost calculation is not an annual interest rate or legal conclusion.

#### Common misconception

Assuming the smallest instalment is automatically the cheapest option.

#### Self-check — fictional scenario

Two fictional contracts each provide the full 2,000,000 VND. A requires two 1,050,000 VND instalments and a separate 30,000 VND fee. B requires three 720,000 VND instalments and no other fee. Compare the totals and identify what else needs checking.

#### Step-by-step reasoning

1. A totals 2 × 1,050,000 + 30,000 = 2,130,000 VND, exceeding the proceeds by 130,000 VND.
2. B totals 3 × 720,000 = 2,160,000 VND, which is 30,000 VND more despite smaller instalments.
3. The terms and timing still differ; check late-payment and early-repayment conditions and do not infer an APR from these totals.

#### Conclusion

A has a 30,000 VND lower total under the stated fees. This is arithmetic for fictional contracts, not a recommendation of a loan.

- `3*1080000+60000 = 3300000`
- `3300000-3000000 = 300000`
- `3*1110000 = 3330000`
- `3330000-3300000 = 30000`
- `2*1050000+30000 = 2130000`
- `2130000-2000000 = 130000`
- `3*720000 = 2160000`
- `2160000-2130000 = 30000`

### Practice scenarios

**1. What is the total amount paid for A in the example?**

- A. 3,240,000 VND — This omits the separate 60,000 VND fee.
- B. 3,300,000 VND — Correct: add all three installments and the fee.
- C. 3,060,000 VND — This omits most installment payments.
Answer: **B** (`correctIndex: 1`).

**2. You know only the advertised rates of two contracts. Can you choose the cheaper one?**

- A. Not yet; you need the schedule, money received and fees — Correct: one indicator does not show all payments.
- B. Yes; always choose the smaller number — Fees and calculation methods can differ.
- C. Yes; choose the promise of fast disbursement — Speed does not establish cost.
Answer: **A** (`correctIndex: 0`).

**3. The CFPB source discusses US TILA disclosures. How should this be used in a Vietnam-focused lesson?**

- A. Treat it as Vietnamese law — Foreign sources do not become Vietnamese law.
- B. Promise every Vietnamese contract has the same form — There is no evidence for this claim.
- C. Use only cost concepts and check applicable terms and law separately — Correct: distinguish concepts from each jurisdiction’s legal requirements.
Answer: **C** (`correctIndex: 2`).

### Optional action

Compare two fictional payment tables and write a question about an unspecified fee; do not apply for a loan. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.consumerfinance.gov/ask-cfpb/what-is-a-truth-in-lending-disclosure-for-an-auto-loan-en-787/)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.10 — Payment timing matters as much as the total

**Chapter:** chapter-05 · **Stage:** stage-03-protection · **Competency:** borrowing.repayment-timing  
**Objective:** Identify a shortfall before income arrives and check conditions before rescheduling or borrowing to cover it.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

After understanding total cost, place every payment on a calendar alongside income and living needs. A contract with a lower total can still create pressure if its dates do not match when money is available. That does not automatically make another option better; it adds a criterion to check. A positive end-of-month balance does not ensure enough money every day. With project-based income in particular, the date a customer promises and the date money arrives can differ.

Bình begins with 900,000 VND. A contractual payment of 700,000 VND is due on the tenth. Before the fifteenth, 300,000 VND is needed for essentials. Income of 1,200,000 VND is expected on the fifteenth. Before it arrives, the calculation is 900,000 − 700,000 − 300,000 = negative 100,000 VND. After the full payment arrives, with nothing else changing, the balance is 1,100,000 VND. Looking only at the closing amount hides the earlier 100,000 VND gap. Changing a date in an app does not change the contract's due date.

If a gap appears, verify the income date and ask the relevant parties about real options before the deadline. Any schedule change needs confirmation, including its fees and consequences. Paying an extension fee does not necessarily reduce principal; read how that contract allocates payments. New borrowing to cover an old installment can add obligations, so consider the combined schedule rather than just the urgent payment. This lesson neither selects a loan product nor advises abandoning essential needs to pay at any cost.

In Picket, reminders help you remember; completion should correspond to a real, confirmed payment. If that amount already appears in a transaction, do not enter it again from a reminder. You may note unclear information and return later. When an alert appears, you should be able to inspect its calculation and scope instead of accepting an absolute conclusion. Practice only requires marking a shortfall date in the example and considering a question to verify. No contract number, identity document or actual payment is needed to learn how to read the schedule.

### Worked example

Before income: 900,000 − 700,000 − 300,000 = −100,000 VND. After income: −100,000 + 1,200,000 = 1,100,000 VND.

#### Remember

- Read repayment and income dates alongside total cost.
- Identify a pre-due-date shortfall separately even if the ending balance is positive.
- A schedule change is real only when the relevant party agrees and the terms are confirmed.

#### Common misconception

Believing an edited date in an app changes an external repayment obligation.

#### Self-check — fictional scenario

Nam has 120,000 VND. A 200,000 VND repayment is due on day 18, income of 500,000 VND is expected on day 25 and living costs of 100,000 VND on day 27. Identify the gap and two checks needed before changing the schedule.

#### Step-by-step reasoning

1. The day-18 shortfall is 200,000 − 120,000 = 80,000 VND.
2. If every later assumption holds, the ending value is 120,000 − 200,000 + 500,000 − 100,000 = 320,000 VND.
3. Verify the income date and ask through the official channel about feasible arrangements, fees and conditions; update only after confirmation rather than automatically borrowing again.

#### Conclusion

The projected ending value is 320,000 VND, but the earlier shortfall is still 80,000 VND. Picket does not negotiate or extend obligations for you.

- `900000-700000-300000 = -100000`
- `-100000+1200000 = 1100000`
- `200000-120000 = 80000`
- `120000-200000+500000-100000 = 320000`

### Practice scenarios

**1. Before the fifteenth, how much is Bình short under the example?**

- A. Nothing, because the closing balance is positive — Money not yet received cannot meet earlier needs.
- B. 100,000 VND — Correct: the inputs produce a negative 100,000 VND balance.
- C. 1,100,000 VND — 1,100,000 VND is the amount after income arrives.
Answer: **B** (`correctIndex: 1`).

**2. Bình changes a reminder date in Picket. Does the contract deadline automatically change?**

- A. Yes — The app does not change the agreement with the lender.
- B. Yes, if notifications are disabled — Disabling reminders does not change obligations.
- C. No; the relevant party must confirm it — Correct: verify actual changes and their conditions.
Answer: **C** (`correctIndex: 2`).

**3. Does paying an extension fee definitely reduce principal?**

- A. No; check the contract’s allocation of payments — Correct: fees and principal may be different amounts.
- B. It definitely reduces principal by the fee amount — There is not enough information for that conclusion.
- C. It definitely clears the debt — An extension does not mean the obligation disappears.
Answer: **A** (`correctIndex: 0`).

### Optional action

Mark the gap in a fictional schedule and write a question about the payment date or fees. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_income_benefits_tool_2018-11_ADA.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.19 — Convert interest rates to compare, and spot predatory lending

**Chapter:** chapter-10 · **Stage:** stage-03-protection · **Competency:** borrowing.rate-conversion  
**Objective:** Convert daily or monthly borrowing costs into the same yearly unit and recognise signs of predatory lending.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Loan offers may state costs per day, per month or per year. A daily number looks very small. To compare, convert to the same unit, usually percent per year. A simple conversion multiplies a monthly rate by 12, or uses 12 months of 30 days. This calculation ignores compounding, so the true cost may be even higher.

A fictional example: an app advertises "only 3,000 VND per day for each 1,000,000 VND". Mai borrows 2,000,000 VND, so the cost is 6,000 VND per day. After 30 days, Mai pays 180,000 VND in charges. Compared with 2,000,000 VND, that is 9% per month. The simple yearly conversion is 9 × 12 = 108%.

Vietnam's Civil Code 2015, Article 468, says agreed interest in civil loans may not exceed 20% per year, unless another law provides otherwise. A converted cost many times above this level is a signal to stop and look closely.

Other warning signs: demands for a fee before the money is released, requests for access to your contacts, pressure to sign immediately, or no clear contract. Before borrowing, read the total amount repayable, the schedule and every fee.

### Worked example

3,000 × 2 = 6,000 VND per day; 6,000 × 30 = 180,000 VND per month; 180,000 / 2,000,000 = 9% per month; 9 × 12 = 108% per year by simple conversion.

#### Remember

- Convert borrowing costs to the same yearly unit before comparing.
- A small daily fee can equal a very high yearly cost.
- Upfront fees, contact-list access or pressure are signs to stop.

#### Common misconception

Thinking 3,000 VND per day is cheap because the number is small.

#### Self-check — fictional scenario

Borrow 5,000,000 VND and repay 5,400,000 VND after 2 months. Find the cost, the monthly rate and the simple yearly conversion.

#### Step-by-step reasoning

1. Cost: 5,400,000 − 5,000,000 = 400,000 VND.
2. Per month: 400,000 / 2 = 200,000 VND, or 200,000 / 5,000,000 = 4%.
3. Simple conversion: 4 × 12 = 48% per year.

#### Conclusion

The cost is 400,000 VND, equal to 4% per month or about 48% per year by simple conversion.

- `3000*2 = 6000`
- `6000*30 = 180000`
- `180000*100/2000000 = 9`
- `9*12 = 108`
- `5400000-5000000 = 400000`
- `400000/2 = 200000`
- `200000*100/5000000 = 4`
- `4*12 = 48`

### Practice scenarios

**1. Interest is 2% per month. What is the simple yearly conversion?**

- A. 2% — This is still the monthly rate.
- B. 24% — Correct: 2 × 12 = 24%.
- C. 12% — This multiplies by 6, not 12.
Answer: **B** (`correctIndex: 1`).

**2. A loan offer asks you to transfer an "application fee" before the money is released. What is the safe response?**

- A. Pay the fee to speed things up — Paying an unverified party in advance can mean losing that money.
- B. Send a photo of your ID card for faster approval — Sending documents to an unverified party increases the risk of misuse.
- C. Stop, do not pay in advance, and check the lender through an official channel — Correct: verify first and do not transfer money under pressure.
Answer: **C** (`correctIndex: 2`).

**3. Loan A: borrow 1,000,000 VND, repay 1,050,000 VND after 1 month. Loan B: borrow 1,000,000 VND, repay 1,100,000 VND after 2 months. Which comparison is right?**

- A. Both cost 5% per month, but B has more total interest — Correct: A costs 50,000 VND over 1 month, B costs 100,000 VND over 2 months; both 5% per month.
- B. A is cheaper per month — Per month the two are the same.
- C. B is cheaper per month — Per month the two are the same; B just lasts longer.
Answer: **A** (`correctIndex: 0`).

### Optional action

If you already have a loan, add its repayment schedule under Bills in Picket and note the total repayable. You do not need to apply for or compare real loan products. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- Civil Code 2015 Article 468: agreed civil-loan interest may not exceed 20%/year unless another law provides otherwise — source `civil-interest-cap`, as of 2018-12-04

### Sources

- [Primary reference](https://baochinhphu.vn/huong-dan-ap-dung-phap-luat-ve-lai-suat-trong-giao-dich-dan-su-102248799.htm)
- [Primary reference](https://www.consumerfinance.gov/ask-cfpb/what-is-a-truth-in-lending-disclosure-for-an-auto-loan-en-787/)
- [Primary reference](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)

## picket.vi.financial.v1.20 — Several debts: keep minimums on time, focus the extra

**Chapter:** chapter-10 · **Stage:** stage-03-protection · **Competency:** borrowing.multiple-debts  
**Objective:** List your debts, pay every minimum on time and choose one way to direct the extra.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

With several debts, make a list: balance, interest rate, minimum payment and due date. The first step is to pay every minimum in full and on time. Late payments usually bring penalty fees, overdue interest and harm to your credit history.

Money left after the minimums can go to one target debt. There are two common methods. Highest-rate first directs the extra to the debt with the highest interest rate, which usually means paying less interest. Smallest-balance first directs it to the smallest debt, which clears one debt sooner and keeps motivation up. Either works, as long as you can stick with it.

A fictional example: Khoa has card A with a balance of 4,000,000 VND, 2.5% interest per month and a minimum of 200,000 VND. Loan B has a balance of 6,000,000 VND, 1% interest per month and a minimum of 500,000 VND. Loan C has a balance of 1,000,000 VND, 1.5% interest per month and a minimum of 100,000 VND. Total minimums are 800,000 VND. Khoa has 1,300,000 VND per month, so 500,000 VND is extra. Using highest-rate first, Khoa pays card A 700,000 VND. First-month interest on card A is about 100,000 VND.

Paying only the minimum on a credit card means the remaining balance may still be charged interest. Taking a new loan to pay an old one requires reading the total cost carefully first.

### Worked example

Minimums: 200,000 + 500,000 + 100,000 = 800,000 VND. Extra: 1,300,000 − 800,000 = 500,000 VND. Card A payment: 200,000 + 500,000 = 700,000 VND. First-month interest on card A: 4,000,000 × 2.5% = 100,000 VND.

#### Remember

- List each debt with balance, rate, minimum and due date.
- Pay every minimum first, then direct the extra.
- Highest-rate first usually saves interest; smallest-balance first helps motivation.

#### Common misconception

Putting all money into one debt and letting the others fall behind.

#### Self-check — fictional scenario

Debt X has a 3,000,000 VND balance, 2% per month and a 300,000 VND minimum. Debt Y has an 800,000 VND balance, 1% per month and a 100,000 VND minimum. You have 700,000 VND. Using smallest-balance first, how much goes to Y and what remains on Y? Ignore new interest for simplicity.

#### Step-by-step reasoning

1. Minimums: 300,000 + 100,000 = 400,000 VND.
2. Extra: 700,000 − 400,000 = 300,000 VND.
3. Pay Y: 100,000 + 300,000 = 400,000 VND; Y has 800,000 − 400,000 = 400,000 VND left.

#### Conclusion

Pay X 300,000 VND and Y 400,000 VND; Y has 400,000 VND left before new interest.

- `200000+500000+100000 = 800000`
- `1300000-800000 = 500000`
- `200000+500000 = 700000`
- `4000000*25/1000 = 100000`
- `300000+100000 = 400000`
- `700000-400000 = 300000`
- `100000+300000 = 400000`
- `800000-400000 = 400000`

### Practice scenarios

**1. Minimums total 900,000 VND and you have 1,200,000 VND. How much extra can you direct?**

- A. 300,000 VND — Correct: 1,200,000 − 900,000 = 300,000 VND.
- B. 1,200,000 VND — This is all the money before minimums.
- C. 900,000 VND — This is the minimum total, not the extra.
Answer: **A** (`correctIndex: 0`).

**2. Where does highest-rate first send the extra money?**

- A. The debt with the smallest balance — That is smallest-balance first.
- B. The debt with the highest interest rate, after all minimums are paid — Correct: keep every debt current, then target the highest rate.
- C. The debt with the most familiar name — A familiar name has nothing to do with cost.
Answer: **B** (`correctIndex: 1`).

**3. What happens if you pay only the credit-card minimum each month?**

- A. No more interest is charged — Paying the minimum avoids lateness but does not remove interest on the rest.
- B. The debt is erased after 12 months — There is no such automatic write-off.
- C. The remaining balance may keep being charged interest under the card terms — Correct: read the card terms to see how interest is charged.
Answer: **C** (`correctIndex: 2`).

### Optional action

Add each debt payment under Bills in Picket with its due date and minimum. If you like, create an "extra payment" pocket for the surplus. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_prioritizing-bills_tool.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf)
- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.11 — Pause before an OTP request

**Chapter:** chapter-06 · **Stage:** stage-03-protection · **Competency:** safety.otp-and-phishing  
**Objective:** Recognize suspicious requests for transfers or secrets and verify independently through official channels.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Knowing your name or order details does not prove someone is entitled to ask you to operate an account. An impersonator may use correct information to create urgency: verify now, claim a refund or avoid being locked out. Pause when a story pushes you to skip checks. A brand name in a message or a familiar logo is not sufficient evidence of authenticity. This lesson focuses on handling requests; it does not require you to recognize every trick by appearance.

In an entirely fictional example, a caller offers Hà a 250,000 VND refund but demands a 50,000 VND transfer first and asks Hà to read out an OTP. Hà has 1,000,000 VND. Sending 50,000 VND leaves 950,000 VND, not 1,200,000 VND, because the promised 250,000 VND refund has not arrived. No calculation establishes the caller's trustworthiness. The safe response in this situation is to stop and independently open the known official app or support channel to check. Do not simply follow a link or callback number provided by the caller.

Do not give callers or message senders OTPs, passwords or login details. Use an authentication code only for an action you initiated on a verified official channel, after understanding what you are authorizing. Do not install an app, grant device-control access or scan an unfamiliar code under refund instructions. If you have acted and suspect fraud, stop the transaction, contact the bank through its official channel for protective steps, preserve evidence and report to the police. Recovery of the money cannot be guaranteed.

Picket practice uses simulated situations. The app does not need a bank OTP, card photo or password to assess an answer. Do not enter a real code into a learning field or share screenshots containing secrets. For an urgent request, ask who initiated contact, what you are authorizing and how to verify independently. Pausing to ask is not a mistake. If you have been deceived, focus on protection and support; do not let embarrassment delay contacting an organization that can respond.

### Worked example

1,000,000 − 50,000 = 950,000 VND; the promised 250,000 VND is not received income. Only assuming both receipt and transfer gives 1,200,000 VND; that assumption cannot establish trust.

#### Remember

- Knowing order details does not prove a caller is a genuine employee.
- Do not share an OTP, password or remote-control access in response to an unexpected refund request.
- Stop and independently find an official verification channel; preserve relevant evidence if fraud is suspected.

#### Common misconception

Trusting every instruction because the caller knows the product name and amount.

#### Self-check — fictional scenario

A caller promises a 350,000 VND refund, names the correct item and asks for an OTP and a remote-control app to receive it. You have not taken those steps. Give three safer actions and explain why the promised refund is not yet recorded income.

#### Step-by-step reasoning

1. Stop the process; do not share the OTP, enter secrets through an unfamiliar link or grant remote-control access.
2. Use an official app or contact channel you identify independently to verify the request, not only contact details supplied by the caller.
3. Preserve relevant communications; if information was exposed or an unfamiliar transaction appears, promptly contact the official bank or competent channel for guidance without assuming recovery is guaranteed.

#### Conclusion

The 350,000 VND is only the caller’s promise. Without a confirmed receipt of money, it is not actual income.

- `1000000-50000 = 950000`
- `1000000-50000+250000 = 1200000`

### Practice scenarios

**1. A caller knows your order details and demands an OTP for a refund. What should you do?**

- A. Read the code because they know the details — Knowing details does not establish identity or access rights.
- B. Stop and verify independently through an official channel — Correct: do not share secrets at a caller’s request.
- C. Read only half the code — This still exposes information and is not safe verification.
Answer: **B** (`correctIndex: 1`).

**2. Hà transfers 50,000 VND and the refund has not arrived. What remains from 1,000,000 VND?**

- A. 950,000 VND — Correct: record only money actually paid out.
- B. 1,200,000 VND — This treats a promise as money received.
- C. 1,250,000 VND — This adds money not received and omits the actual transfer.
Answer: **A** (`correctIndex: 0`).

**3. You clicked a link and suspect information was exposed. What is an appropriate response?**

- A. Wait because reporting feels embarrassing — Delay can increase risk.
- B. Transfer more money to recover it — A recovery promise may be another part of the deception.
- C. Stop, contact the bank officially, preserve evidence and report — Correct: prioritize protection; recovery is not guaranteed.
Answer: **C** (`correctIndex: 2`).

### Optional action

Read the scenario and name an independent verification channel; never use a real OTP or suspicious link. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)
- [Primary reference](https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news)

## picket.vi.financial.v1.21 — Recognise common scam scripts

**Chapter:** chapter-11 · **Stage:** stage-03-protection · **Competency:** safety.common-scam-scripts  
**Objective:** Recognise common scam scripts and choose safe actions in line with official warnings.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Scammers tend to reuse a few scripts. They pose as an authority or a bank and demand a transfer for "verification". They offer "easy, well-paid work" or "tasks", let you withdraw a little at first, then demand a large deposit. They ask to buy, rent or borrow your bank account. They send an unknown link or app, then ask for control of your phone.

The State Bank of Vietnam advised on 31 March 2025: do not give your password, OTP or card details to anyone, including bank staff. From 1 January 2025, banks do not send text messages or emails containing links. Install apps only from official stores and do not grant Accessibility permission to unknown apps. On 10 March 2026, the police warned against opening accounts to rent out, lend or sell; people who do so may face penalties or prosecution.

A fictional "task" example: Vi deposits 200,000 VND and gets 260,000 VND back. Vi is then asked to deposit 2,000,000 VND to "unlock commission". If the account is blocked at this point, Vi has deposited 2,200,000 VND, received 260,000 VND and lost 1,940,000 VND. Depositing another 5,000,000 VND would make the loss 6,940,000 VND. The first withdrawal was only bait.

When in doubt: stop, do not send more, contact your bank through an official channel, keep evidence and report to the police.

### Worked example

Deposited: 200,000 + 2,000,000 = 2,200,000 VND. Loss after money received: 2,200,000 − 260,000 = 1,940,000 VND. If more is deposited: 1,940,000 + 5,000,000 = 6,940,000 VND.

#### Remember

- Never give an OTP, password or card details to anyone, even someone claiming to be bank staff.
- A first successful withdrawal does not prove a scheme is real.
- Do not rent out, lend or sell your bank account.

#### Common misconception

Believing a caller who knows your name and account number must be genuine.

#### Self-check — fictional scenario

Hùng has 35,000,000 VND. A caller claiming to be an authority demands 30,000,000 VND be moved to a "holding account" for verification. If Hùng transfers it, how much remains and what guarantees its return?

#### Step-by-step reasoning

1. If transferred: 35,000,000 − 30,000,000 = 5,000,000 VND remains.
2. A promise of return is not money received; the guaranteed amount is 0 VND.
3. Safe action: stop, do not transfer, contact the authority yourself through an official channel and report it.

#### Conclusion

Hùng would keep only 5,000,000 VND with no guarantee of return; stop and verify directly.

- `200000+2000000 = 2200000`
- `2200000-260000 = 1940000`
- `1940000+5000000 = 6940000`
- `35000000-30000000 = 5000000`

### Practice scenarios

**1. A text message claiming to be your bank contains a link asking you to update details. What should you do?**

- A. Tap the link because it shows the bank logo — Logos are easy to fake, and banks have stopped sending links by text.
- B. Do not tap; open the official app yourself or call the number printed on your card — Correct: go through an official channel you already know.
- C. Reply with your OTP — Never send an OTP to anyone.
Answer: **B** (`correctIndex: 1`).

**2. A stranger offers 500,000 VND per month to "borrow" your bank account. What is true?**

- A. The account may be used for fraud or money laundering, and you may face penalties or prosecution — Correct: the police have clearly warned about this risk.
- B. It is safe passive income — The legal and financial risk falls on the account holder.
- C. It is legal if only lent for one month — A short period does not make it safe.
Answer: **A** (`correctIndex: 0`).

**3. An app installed from an unknown link asks for Accessibility permission. What should you do?**

- A. Grant it so the app works — This permission can let an app read and control your screen.
- B. Grant it and turn it off later — A few seconds can be enough to capture information.
- C. Refuse, uninstall it and tell your bank if you entered any details — Correct: this follows the State Bank of Vietnam's advice.
Answer: **C** (`correctIndex: 2`).

### Optional action

Review this week's transactions in Picket for any transfer you do not recognise. If you find one, contact your bank through its official hotline. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- SBV: never share OTP/passwords even with bank staff; banks stop sending links in SMS/email from 2025-01-01; do not grant Accessibility permission — source `sbv-security`, as of 2025-03-31
- Police warning: renting, lending or selling bank accounts may lead to administrative or criminal liability — source `account-rental`, as of 2026-03-10

### Sources

- [Primary reference](https://sbv.gov.vn/en/w/sbv624798)
- [Primary reference](https://xaydungchinhsach.chinhphu.vn/khuyen-cao-hoc-sinh-sinh-vien-khong-mo-tai-khoan-ngan-hang-de-cho-thue-cho-muon-ban-lai-119260310141959148.htm)
- [Primary reference](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)
- [Primary reference](https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news)

## picket.vi.financial.v1.23 — Insurance basics: read benefits, exclusions and premiums

**Chapter:** chapter-12 · **Stage:** stage-03-protection · **Competency:** protection.insurance-basics  
**Objective:** Understand that insurance transfers part of a risk, read the key terms and work out the share you pay yourself.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Insurance moves part of a financial risk to an insurer in exchange for a premium. It is most useful for risks you would struggle to carry alone, such as large medical bills. It is not a way to get rich, and it is different from a savings deposit.

Before signing, read: the benefits paid, the sum insured, the exclusions, waiting periods, the co-payment rate, the premium schedule and what happens if you stop paying early. If an adviser describes a policy as "a high-interest savings deposit", ask again: this is an insurance contract, so what is the surrender value if I stop early?

A fictional example: a health policy has a 20% co-payment. Eligible treatment costs 10,000,000 VND. You pay 2,000,000 VND yourself and the insurer pays 8,000,000 VND if the cost is covered. If the annual premium is 6,000,000 VND, you need to set aside 500,000 VND per month. Paid for 15 years, total premiums are 90,000,000 VND.

Vietnam's Insurance Business Law 2022, Article 35, gives buyers of life or health contracts with a term over 1 year 21 days to reconsider after receiving the contract. Use this time to read carefully. Buy for a need, not under pressure.

### Worked example

You pay: 10,000,000 × 20% = 2,000,000 VND; insurer pays: 10,000,000 − 2,000,000 = 8,000,000 VND. Premium: 6,000,000 / 12 = 500,000 VND per month; 6,000,000 × 15 = 90,000,000 VND in total.

#### Remember

- Insurance transfers part of a risk; it is not a wealth-building tool.
- Read benefits, exclusions, waiting periods, co-payment and surrender value.
- Life and health contracts over 1 year have a 21-day reconsideration period.

#### Common misconception

Treating an investment-linked insurance policy as identical to a savings account.

#### Self-check — fictional scenario

A premium of 4,800,000 VND per year is paid once a year. How much should be set aside each month? What are total premiums over 10 years?

#### Step-by-step reasoning

1. Per month: 4,800,000 / 12 = 400,000 VND.
2. Total over 10 years: 4,800,000 × 10 = 48,000,000 VND.
3. Compare total premiums with the benefits you actually need before deciding it fits.

#### Conclusion

Set aside 400,000 VND per month; total premiums over 10 years are 48,000,000 VND.

- `10000000*20/100 = 2000000`
- `10000000-2000000 = 8000000`
- `6000000/12 = 500000`
- `6000000*15 = 90000000`
- `4800000/12 = 400000`
- `4800000*10 = 48000000`

### Practice scenarios

**1. A policy has a 30% co-payment and the eligible cost is 5,000,000 VND. How much do you pay yourself?**

- A. 1,500,000 VND — Correct: 5,000,000 × 30% = 1,500,000 VND.
- B. 3,500,000 VND — This is the insurer's share.
- C. 5,000,000 VND — This is the whole cost.
Answer: **A** (`correctIndex: 0`).

**2. Which contracts get the 21-day reconsideration period under the Insurance Business Law 2022?**

- A. Every contract, including 1-year vehicle cover — The rule does not apply to every type of contract.
- B. Life or health contracts with a term over 1 year — Correct: under Article 35 of the Insurance Business Law 2022.
- C. Only contracts bought online — The sales channel does not decide this right.
Answer: **B** (`correctIndex: 1`).

**3. An adviser says the policy is "a high-interest savings deposit". What should you do?**

- A. Sign now because the interest is high — Signing before you understand the product is risky.
- B. Send an ID photo first to hold a place — You do not need to send documents to "hold a place".
- C. Read carefully: it is insurance; ask about benefits, premiums and the surrender value if you stop early — Correct: tell insurance and deposits apart before deciding.
Answer: **C** (`correctIndex: 2`).

### Optional action

If you have an insurance policy, add its premium date under Bills in Picket and create a pocket for the annual premium divided by 12. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- Insurance Business Law 08/2022/QH15 Article 35: 21-day free-look for life/health contracts with a term over 1 year — source `insurance-free-look`, as of 2023-03-13

### Sources

- [Primary reference](https://thoibaotaichinhvietnam.vn/nen-su-dung-dac-quyen-21-ngay-khi-mua-bao-hiem-nhan-tho-123293.html)
- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.12 — Trials, renewals and a pause before buying

**Chapter:** chapter-06 · **Stage:** stage-03-protection · **Competency:** safety.renewals-and-deliberate-buying  
**Objective:** Identify renewal dates, verify cancellation status and compare conditional purchase choices without judging interests.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A free trial may become a paid subscription unless you cancel according to the agreed terms. Before starting, look for the post-trial price, billing cycle, renewal date and actual cancellation method. A free label does not explain every condition. You can choose not to sign up if you do not understand. Similarly, removing an app icon from your phone does not prove a subscription is canceled. Check its status where the subscription is managed and retain confirmation when available.

In a fictional example, Yến pays 79,000 VND monthly for service A and 49,000 VND for service B, totaling 128,000 VND per month. If both prices stay unchanged, both remain active for twelve months and there are no other fees, the total is 1,536,000 VND. Yến is also considering a 450,000 VND item expected to be used six times. Dividing price by anticipated uses gives 75,000 VND per use, but does not prove all six uses will happen. The numbers expose scale and assumptions; they do not decide for Yến.

A self-chosen pause before a flexible purchase may allow time to compare plans, read conditions and reconsider the need. You can note the item and return at a time you choose. This is a reflection technique, not a guaranteed legal cancellation period, and it should not be rigidly imposed on medicine or urgent needs. Buying or not buying after the pause can both be reasonable, depending on circumstances. You do not need a streak of avoiding purchases to prove money-management knowledge.

In Picket, flagging a recurring expense for review does not cancel an external service. To cancel, use the official channel and confirm the outcome before editing the future schedule. A payment already charged still needs an accurate record; an unapproved refund request is not received money. Renewal reminders should be opt-in and avoid duplicates. Practice can simply mean reviewing the examples or writing a question about trial conditions. No subscription, purchase or card information is required to finish; the aim is to make your choices clear.

### Worked example

79,000 + 49,000 = 128,000 VND per month; 128,000 × 12 = 1,536,000 VND per year under the assumptions; 450,000 / 6 = 75,000 VND per anticipated use.

#### Remember

- Check the post-trial price, next charge date and cancellation method before deciding.
- Deleting an app or flagging a service in Picket does not cancel an external subscription.
- Compare costs over the same period and state price and duration assumptions.

#### Common misconception

Assuming an unused or uninstalled service can no longer charge.

#### Self-check — fictional scenario

One plan will cost 59,000 VND monthly after its trial; another currently costs 89,000 VND monthly. If both prices stay unchanged for 12 months, what is the total? With a self-chosen monthly limit of 120,000 VND, what should be reviewed before renewal?

#### Step-by-step reasoning

1. Together they cost 59,000 + 89,000 = 148,000 VND monthly, which is 28,000 VND above the chosen limit.
2. Keeping both for 12 unchanged-price months totals 148,000 × 12 = 1,776,000 VND; price changes or mid-period cancellation change that assumption.
3. Review use, terms and the official cancellation process; confirm the result before changing the schedule and do not subscribe just to practise.

#### Conclusion

The assumed total is 148,000 VND per month and 1,776,000 VND for 12 months. A Picket reminder does not prove that charging has stopped.

- `79000+49000 = 128000`
- `128000*12 = 1536000`
- `450000/6 = 75000`
- `59000+89000 = 148000`
- `148000-120000 = 28000`
- `148000*12 = 1776000`

### Practice scenarios

**1. Does deleting the app from your phone prove the subscription is canceled?**

- A. Yes, it always cancels automatically — Deleting an app and canceling a subscription are different actions.
- B. No; check the status where the subscription is managed — Correct: confirm at the official management channel.
- C. Yes, if the app is not opened — Not using it does not automatically change billing terms.
Answer: **B** (`correctIndex: 1`).

**2. Both subscriptions retain their prices for 12 months as in the example. What is the total?**

- A. 128,000 VND — This is the one-month total.
- B. 1,536,000 VND — Correct: 128,000 multiplied by twelve.
- C. 450,000 VND — This is the other item’s price, not the two subscriptions.
Answer: **B** (`correctIndex: 1`).

**3. Picket flags service B for review. Can charges already be considered stopped?**

- A. Yes, as soon as it is flagged — A Picket note does not control an external service.
- B. Yes, after any one-day pause — A self-chosen pause does not change the contract.
- C. Not yet; cancel and confirm through the provider or management channel — Correct: update the schedule only once the actual result is known.
Answer: **C** (`correctIndex: 2`).

### Optional action

Review the price and renewal date of an example or existing subscription; you may skip and should not sign up for another one. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions)

## picket.vi.financial.v1.25 — Consumer rights and evidence-based complaints

**Chapter:** chapter-12 · **Stage:** stage-03-protection · **Competency:** consumer.rights-and-complaints  
**Objective:** Know basic consumer rights and the steps of a complaint backed by evidence.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Vietnam's Consumer Protection Law 2023 took effect on 1 July 2024. Sellers must not give false or misleading information about goods or transaction terms. Sellers must not harass you with repeated unwanted offers, or force you to buy. When goods do not match what was registered, advertised or promised, consumers may request an exchange or refund under the rules.

An effective complaint needs evidence. Keep the receipt, photos of the product, screenshots of the listing and your messages with the seller. Contact the seller first, describe the problem and state what you want. If it is not resolved, you can escalate to the e-commerce platform, a consumer protection organisation or the regulator. For card or e-wallet payments, ask the payment provider through its official channel.

A fictional example: Thảo buys headphones for 650,000 VND plus 30,000 VND delivery, 680,000 VND in total. The wrong model arrives. If the seller refunds only the item price, Thảo receives 650,000 VND and still loses the 30,000 VND delivery fee. Thảo records the refund only when the money actually arrives.

Be careful with strangers who message you offering "refund help" and then ask for a fee or OTP. Official complaint channels do not need your OTP.

### Worked example

Paid: 650,000 + 30,000 = 680,000 VND. If only the item price is refunded, the unrefunded part is 680,000 − 650,000 = 30,000 VND.

#### Remember

- Goods that do not match the promise may be exchanged or refunded under the rules.
- Keep receipts, photos and messages before complaining.
- Contact the seller first, then the platform, a consumer organisation or the regulator.

#### Common misconception

Believing you must pay a "helper" a fee to get a refund.

#### Self-check — fictional scenario

You buy two items for 240,000 VND and 360,000 VND with 20,000 VND delivery. You return the 360,000 VND item and receive exactly 360,000 VND back. What is your final real spending?

#### Step-by-step reasoning

1. Paid: 240,000 + 360,000 + 20,000 = 620,000 VND.
2. Refund received: 360,000 VND.
3. Real spending: 620,000 − 360,000 = 260,000 VND.

#### Conclusion

Real spending is 260,000 VND, covering the item you kept and delivery.

- `650000+30000 = 680000`
- `680000-650000 = 30000`
- `240000+360000+20000 = 620000`
- `620000-360000 = 260000`

### Practice scenarios

**1. The goods differ from the advertised description. What is a sensible first step?**

- A. Keep the receipt and photos and contact the seller with a specific request — Correct: evidence and a clear request make resolution faster.
- B. Post the seller's personal details online — This could create legal trouble for you.
- C. Pay a fee to a stranger promising refund help — This is a common scam script.
Answer: **A** (`correctIndex: 0`).

**2. The seller agrees to refund 650,000 VND but the money has not arrived. What should you do in Picket?**

- A. Record the income now — A promise is not money received.
- B. Wait for the money before recording the refund; you may add a note that it is pending — Correct: record it only when the money actually arrives.
- C. Delete the original purchase — The purchase happened and should stay recorded.
Answer: **B** (`correctIndex: 1`).

**3. A seller keeps calling with offers after you have refused. According to the lesson, what is this?**

- A. Normal behaviour that is always allowed — The 2023 law bans unwanted harassment.
- B. Only wrong if the calls are at night — The law is not limited to call times.
- C. A prohibited practice when it repeatedly disturbs consumers against their wishes — Correct: this is one of the prohibited practices.
Answer: **C** (`correctIndex: 2`).

### Optional action

When you buy something, attach a photo of the receipt to the transaction in Picket so you have evidence if you need to complain later. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- Consumer Protection Law 2023 effective 2024-07-01; bans misleading information, harassment and coercion — source `consumer-law-2023`, as of 2024-07-01

### Sources

- [Primary reference](https://pbgdpl.cantho.gov.vn/bao-ve-tot-hon-quyen-loi-nguoi-tieu-dung)
- [Primary reference](https://vcc.gov.vn/default.aspx?category_id=9343771e-96be-48b5-a35d-b8ea9bc1aa93&do=detail&id=04a6bd22-786c-4d56-983c-923cce86ec7c&page=news)
- [Primary reference](https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions)

# Stage 4: Growth

Understand compounding, deposits, inflation, risk and periodic reviews.

## picket.vi.financial.v1.26 — Compound interest: interest that earns interest

**Chapter:** chapter-13 · **Stage:** stage-04-growth · **Competency:** saving.compound-interest  
**Objective:** Tell simple and compound interest apart and calculate a balance over several compounding periods.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Simple interest is calculated only on the original principal. Compound interest is calculated on the principal plus interest already added. Over time the gap between the two grows. That is why starting early and staying consistent often matters more than one large contribution.

A fictional example: Phúc has 10,000,000 VND at an assumed rate of 6% per year, compounded once a year. In year one, interest is 600,000 VND and the balance becomes 10,600,000 VND. In year two, interest is calculated on 10,600,000 VND, so it is 636,000 VND and the balance becomes 11,236,000 VND. With simple interest, after 2 years Phúc would have 11,200,000 VND. The 36,000 VND difference is interest earned on interest. Over many years the difference becomes much larger.

Compounding also works in reverse with debt. An unpaid balance with interest added on top grows faster over time.

The rate in this lesson is an assumption for practising the calculation, not a promise of returns. Real rates depend on the product, term and timing, and can change.

### Worked example

Year 1: 10,000,000 × 6% = 600,000 VND. Year 2: 10,600,000 × 6% = 636,000 VND; 10,600,000 + 636,000 = 11,236,000 VND. Simple: 10,000,000 + 2 × 600,000 = 11,200,000 VND. Difference: 36,000 VND.

#### Remember

- Compound interest earns interest on interest already added.
- Time and consistency make compounding more visible.
- With debt, compounding makes the amount owed grow faster.

#### Common misconception

Thinking compound interest differs so little from simple interest that it does not matter.

#### Self-check — fictional scenario

20,000,000 VND at an assumed 5% per year, compounded yearly. Find the balance after 3 years.

#### Step-by-step reasoning

1. Year 1: 20,000,000 × 105% = 21,000,000 VND.
2. Year 2: 21,000,000 × 105% = 22,050,000 VND.
3. Year 3: 22,050,000 × 105% = 23,152,500 VND.

#### Conclusion

After 3 years the balance is 23,152,500 VND under the lesson assumptions.

- `10000000*6/100 = 600000`
- `10600000*6/100 = 636000`
- `10600000+636000 = 11236000`
- `10000000+2*600000 = 11200000`
- `11236000-11200000 = 36000`
- `20000000*105/100 = 21000000`
- `21000000*105/100 = 22050000`
- `22050000*105/100 = 23152500`

### Practice scenarios

**1. 5,000,000 VND at an assumed 10% per year, compounded yearly. How much after 2 years?**

- A. 6,000,000 VND — This is simple interest: 5,000,000 + 2 × 500,000.
- B. 6,050,000 VND — Correct: 5,500,000 × 110% = 6,050,000 VND.
- C. 5,500,000 VND — This is only after 1 year.
Answer: **B** (`correctIndex: 1`).

**2. How does compound interest differ from simple interest?**

- A. Interest is also earned on interest already added to the principal — Correct: that is the definition of compounding.
- B. Interest is always double — There is no doubling rule.
- C. There is no risk — How interest is calculated does not remove product risk.
Answer: **A** (`correctIndex: 0`).

**3. An unpaid card balance has interest added to it. How does compounding affect it?**

- A. It does not affect the debt — Added interest changes the balance.
- B. It makes the debt shrink — Without payments the debt does not shrink.
- C. It makes the debt grow faster over time — Correct: compounding works against you as a borrower.
Answer: **C** (`correctIndex: 2`).

### Optional action

Create a savings-goal pocket in Picket with a regular monthly amount; check it after each month to see what has built up. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf)

## picket.vi.financial.v1.27 — Term deposits and early withdrawal

**Chapter:** chapter-13 · **Stage:** stage-04-growth · **Competency:** saving.term-deposits  
**Objective:** Calculate interest held to maturity, understand the cost of early withdrawal and match the term to when you may need the money.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Term deposits usually pay a higher rate than demand deposits, in exchange for your commitment to leave the money until the term ends. If you withdraw early, interest is usually much lower than if you hold to maturity. The exact rate is set by each institution's terms, so read them before depositing.

A fictional example: Trang deposits 50,000,000 VND for a 12-month term at an assumed 5% per year. Held to maturity, interest is 2,500,000 VND. If Trang needs the money after 6 months and the terms give an early-withdrawal rate of 0.5% per year, interest is only 50,000,000 × 0.5% × 6/12 = 125,000 VND. Trang gives up 2,375,000 VND compared with holding to maturity. The principal is still there, but the interest falls sharply.

So the term should match when you might need the money. An emergency fund that must be reachable quickly should not sit entirely in one long-term deposit. Some people split money into several deposits with different maturity dates so one part is always maturing soon.

Before depositing, read: the rate, the term, early-withdrawal conditions and what happens at maturity, such as automatic renewal. This lesson does not suggest any specific institution or product.

### Worked example

Held to maturity: 50,000,000 × 5% = 2,500,000 VND. Withdrawn after 6 months: 50,000,000 × 0.5% × 6/12 = 125,000 VND. Given up: 2,500,000 − 125,000 = 2,375,000 VND.

#### Remember

- Interest held to maturity = principal × annual rate × time in years.
- Early withdrawal usually cuts interest sharply.
- Match the term to when you may need the money.

#### Common misconception

Believing early withdrawal still earns the full rate for the time already deposited.

#### Self-check — fictional scenario

A deposit of 24,000,000 VND for 12 months at an assumed 4.8% per year. Calculate interest held to maturity, and after 3 months with an early-withdrawal rate of 0.2% per year.

#### Step-by-step reasoning

1. Held to maturity: 24,000,000 × 4.8% = 1,152,000 VND.
2. Withdrawn after 3 months: 24,000,000 × 0.2% × 3/12 = 12,000 VND.
3. Comparison: early withdrawal earns only a tiny part of the maturity interest.

#### Conclusion

Holding to maturity earns 1,152,000 VND; withdrawing after 3 months earns only 12,000 VND under the assumptions.

- `50000000*5/100 = 2500000`
- `50000000*5/1000*6/12 = 125000`
- `2500000-125000 = 2375000`
- `24000000*48/1000 = 1152000`
- `24000000*2/1000*3/12 = 12000`

### Practice scenarios

**1. You deposit 30,000,000 VND for 12 months at an assumed 6% per year and hold to maturity. How much interest?**

- A. 1,800,000 VND — Correct: 30,000,000 × 6% = 1,800,000 VND.
- B. 180,000 VND — This is 0.6%, one digit off.
- C. 6,000,000 VND — This is 20%, not 6%.
Answer: **A** (`correctIndex: 0`).

**2. Why not keep an entire emergency fund in one long-term deposit?**

- A. Because deposits always lose principal — Early withdrawal usually affects interest, not principal.
- B. Early withdrawal may earn only a low rate under the terms — Correct: an emergency fund must be reachable with little loss.
- C. Because long terms are prohibited — There is no such rule.
Answer: **B** (`correctIndex: 1`).

**3. What should you read before making a term deposit?**

- A. The colour of the card — This does not affect your money.
- B. How many other people deposited — Popularity does not replace the terms.
- C. The rate, term, early-withdrawal conditions and what happens at maturity — Correct: these terms decide what you receive.
Answer: **C** (`correctIndex: 2`).

### Optional action

If you have a term deposit, add its maturity date under Bills in Picket as a reminder to decide before that day. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Primary reference](https://vnba.org.vn/vi/han-muc-chi-tra-tien-bao-hiem-tien-gui-tang-len-350-trieu-dong-tu-ngay-13-7-2026-22749.htm)
- [Primary reference](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/)

## picket.vi.financial.v1.24 — Deposit insurance: the limit and what is not a deposit

**Chapter:** chapter-13 · **Stage:** stage-04-growth · **Competency:** saving.deposit-insurance  
**Objective:** Understand the current deposit-insurance limit and tell deposits apart from other products sold at banks.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Deposit Insurance of Vietnam pays depositors when a participating institution becomes subject to an insurance payout. The amount paid has a limit. Under Circular 05/2026/TT-NHNN, from 13 July 2026, the limit is 350,000,000 VND for all insured deposits of one person at one institution, including principal and interest. Before that, the limit was 125,000,000 VND under Decision 32/2021/QĐ-TTg. The new limit is 225,000,000 VND higher.

The part above the limit is not erased immediately; it is handled through the institution's asset-resolution process. So people with large balances at one place should know which part is within the limit.

A fictional example: Châu has 400,000,000 VND principal and 20,000,000 VND interest at one institution, 420,000,000 VND in total. The part within the limit is 350,000,000 VND. The excess is 70,000,000 VND.

Not every product sold at a bank counter is a deposit. Fund certificates, bonds and insurance contracts work differently. When offered a product with "a higher rate than savings", the first question is: is this a deposit? Read the documents before signing.

### Worked example

Total: 400,000,000 + 20,000,000 = 420,000,000 VND. Above the limit: 420,000,000 − 350,000,000 = 70,000,000 VND. Limit increase: 350,000,000 − 125,000,000 = 225,000,000 VND.

#### Remember

- From 13 July 2026 the limit is 350,000,000 VND per person per institution, principal and interest.
- Amounts above the limit are handled through the institution's asset resolution.
- Investment or insurance products sold at banks are not deposits.

#### Common misconception

Believing everything bought at a bank counter is covered by deposit insurance.

#### Self-check — fictional scenario

You hold 200,000,000 VND at institution A and 380,000,000 VND (including interest) at institution B. Is either above the 350,000,000 VND limit, and by how much?

#### Step-by-step reasoning

1. A: 200,000,000 VND is below 350,000,000 VND, so it is within the limit.
2. B: 380,000,000 − 350,000,000 = 30,000,000 VND above the limit.
3. Together 200,000,000 + 380,000,000 = 580,000,000 VND, but the limit applies to each institution separately.

#### Conclusion

A is within the limit; B is 30,000,000 VND above it.

- `400000000+20000000 = 420000000`
- `420000000-350000000 = 70000000`
- `350000000-125000000 = 225000000`
- `380000000-350000000 = 30000000`
- `200000000+380000000 = 580000000`

### Practice scenarios

**1. From 13 July 2026, what is the maximum for one person at one institution?**

- A. 125,000,000 VND — This was the old limit before 13 July 2026.
- B. 350,000,000 VND — Correct: under Circular 05/2026/TT-NHNN.
- C. No limit — Deposit insurance has a limit.
Answer: **B** (`correctIndex: 1`).

**2. You have 300,000,000 VND principal and 10,000,000 VND interest at a participating institution. Is this within the limit?**

- A. Yes, the 310,000,000 VND total is below 350,000,000 VND — Correct: the limit counts both principal and interest.
- B. No, because interest does not count — The limit includes principal and interest.
- C. Only 125,000,000 VND is insured — This is the old limit.
Answer: **A** (`correctIndex: 0`).

**3. A product at a bank counter promises more than savings. What should the first question be?**

- A. What gift comes with it? — A gift does not change what the product is.
- B. How many people have bought it? — Popularity does not prove the product suits you.
- C. Is this a deposit, or an investment or insurance product? — Correct: the product type decides its protections and risks.
Answer: **C** (`correctIndex: 2`).

### Optional action

In Picket, name each wallet after the institution that holds it so you can see the total at each place. You do not need to enter account numbers. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- Deposit-insurance payout limit 350,000,000 VND per person per participating institution (principal + interest) from 2026-07-13 under Circular 05/2026/TT-NHNN; previously 125,000,000 VND — source `deposit-insurance-2026`, as of 2026-07-13

### Sources

- [Primary reference](https://vnba.org.vn/vi/han-muc-chi-tra-tien-bao-hiem-tien-gui-tang-len-350-trieu-dong-tu-ngay-13-7-2026-22749.htm)
- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.28 — Inflation and purchasing power

**Chapter:** chapter-14 · **Stage:** stage-04-growth · **Competency:** investing.inflation-real-return  
**Objective:** Explain how inflation reduces purchasing power and estimate real return by approximate subtraction.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Inflation is when prices in general rise over time. The same amount of money buys fewer goods. So when judging interest, compare it with how fast prices rise. Real return is approximately the nominal rate minus the inflation rate.

A fictional example with assumed rates: a basket of goods costs 1,000,000 VND today and its price rises 4% over 1 year to 1,040,000 VND. If you deposit 1,000,000 VND at 5%, after 1 year you have 1,050,000 VND, enough for the basket with 10,000 VND left. Purchasing power rose about 1%. If the rate is only 3%, you have 1,030,000 VND, 10,000 VND short of the same basket. The amount grew, but purchasing power fell.

Holding all money as cash for many years while prices rise also erodes purchasing power, even though the number stays the same. Still, money for near-term spending and the emergency fund needs to be safe and easy to reach; that is a deliberate trade-off.

Budgets need updating too. If food prices rise, last year's food pocket limit may no longer be enough.

### Worked example

Basket: 1,000,000 × 104% = 1,040,000 VND. At 5%: 1,000,000 × 105% = 1,050,000 VND, 10,000 VND left. At 3%: 1,000,000 × 103% = 1,030,000 VND, 10,000 VND short.

#### Remember

- Inflation means the same money buys less.
- Real return is roughly the nominal rate minus inflation.
- Update budget limits when prices change.

#### Common misconception

Believing an unchanged amount of money means unchanged value.

#### Self-check — fictional scenario

Tuition is 20,000,000 VND now and assumed to rise 5% per year. What will it be after 2 years?

#### Step-by-step reasoning

1. Year 1: 20,000,000 × 105% = 21,000,000 VND.
2. Year 2: 21,000,000 × 105% = 22,050,000 VND.
3. A savings goal for tuition should use the 2-year figure.

#### Conclusion

After 2 years tuition is about 22,050,000 VND under the assumption.

- `1000000*104/100 = 1040000`
- `1000000*105/100 = 1050000`
- `1050000-1040000 = 10000`
- `1000000*103/100 = 1030000`
- `1040000-1030000 = 10000`
- `20000000*105/100 = 21000000`
- `21000000*105/100 = 22050000`

### Practice scenarios

**1. The interest rate is 6% per year and assumed inflation is 4%. What is the approximate real return?**

- A. 10% — This adds instead of subtracting.
- B. 2% — Correct: 6% − 4% ≈ 2%.
- C. 6% — This is the nominal rate before rising prices.
Answer: **B** (`correctIndex: 1`).

**2. A 500,000 VND basket rises in price by 10%. How much is needed next year?**

- A. 550,000 VND — Correct: 500,000 × 110% = 550,000 VND.
- B. 510,000 VND — This is a 2% rise.
- C. 600,000 VND — This is a 20% rise.
Answer: **A** (`correctIndex: 0`).

**3. What happens if all money is held as cash for years while prices rise?**

- A. Purchasing power certainly rises — Rising prices mean the same money buys less.
- B. Nothing changes — Inflation does affect purchasing power.
- C. Purchasing power may fall even though the amount stays the same — Correct: the number stays the same but buys less.
Answer: **C** (`correctIndex: 2`).

### Optional action

Compare one budget pocket in Picket with the same period last year. If prices have risen, adjust the limit to real spending. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)

## picket.vi.financial.v1.29 — Risk, return and diversification

**Chapter:** chapter-14 · **Stage:** stage-04-growth · **Competency:** investing.risk-and-diversification  
**Objective:** Explain the link between risk and return, the role of diversification and time horizon, without suggesting any specific product.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Higher potential return usually comes with higher risk. Risk here means the value can rise and fall sharply, including falling below what you put in. No legal investment offers high returns with no risk at all.

Time horizon matters. Money needed in the next few months should be somewhere stable and easy to withdraw. Money for goals many years away can tolerate more ups and downs, if you understand the risk. Before thinking about investing, many people complete their emergency fund and reduce high-interest debt.

Diversification means not putting everything in one place. A fictional example: you have 10,000,000 VND. Approach A puts it all into one asset; if that asset falls 40%, 6,000,000 VND remains. Approach B splits it into 5 equal parts of 2,000,000 VND. One part falls 40% to 1,200,000 VND, and four parts stay flat. The total is 9,200,000 VND. Diversification limits the damage from one asset, but does not remove risk when the whole market falls.

Fees also reduce returns: a 2% annual fee on 10,000,000 VND is 200,000 VND. Vietnam's State Securities Commission advises caution with offers of high returns and checking whether a firm is licensed. This lesson is not investment advice.

### Worked example

Approach A: 10,000,000 × 60% = 6,000,000 VND. Approach B: 10,000,000 / 5 = 2,000,000 VND each; 2,000,000 × 60% = 1,200,000 VND; 1,200,000 + 4 × 2,000,000 = 9,200,000 VND. Fee: 10,000,000 × 2% = 200,000 VND.

#### Remember

- Higher potential return comes with higher risk.
- Your time horizon decides how much fluctuation you can accept.
- Diversification limits damage from one asset but does not remove all risk.

#### Common misconception

Believing diversification guarantees you will never lose money.

#### Self-check — fictional scenario

12,000,000 VND is split equally across 4 assets. One falls 30%, one rises 10% and two stay flat. What is the total?

#### Step-by-step reasoning

1. Each part: 12,000,000 / 4 = 3,000,000 VND.
2. Fallen part: 3,000,000 × 70% = 2,100,000 VND; risen part: 3,000,000 × 110% = 3,300,000 VND.
3. Total: 2,100,000 + 3,300,000 + 2 × 3,000,000 = 11,400,000 VND.

#### Conclusion

The total is 11,400,000 VND, 600,000 VND below the start.

- `10000000*60/100 = 6000000`
- `10000000/5 = 2000000`
- `2000000*60/100 = 1200000`
- `1200000+4*2000000 = 9200000`
- `10000000*2/100 = 200000`
- `9000000/3*50/100+2*9000000/3 = 7500000`
- `12000000/4 = 3000000`
- `3000000*70/100 = 2100000`
- `3000000*110/100 = 3300000`
- `2100000+3300000+2*3000000 = 11400000`

### Practice scenarios

**1. What usually comes with higher potential return?**

- A. Higher risk of price swings — Correct: this is the risk-return relationship.
- B. A state guarantee — Investment products do not carry a state guarantee of returns.
- C. No fees — Fees are not directly tied to potential return.
Answer: **A** (`correctIndex: 0`).

**2. How should money needed in the next 6 months be kept?**

- A. In a highly volatile asset to grow quickly — It could fall just when you need it.
- B. Somewhere stable that you can withdraw from when needed — Correct: a short horizon puts stability first.
- C. With an acquaintance who will invest it for you — Responsibility and risk are unclear.
Answer: **B** (`correctIndex: 1`).

**3. 9,000,000 VND is split equally across 3 assets; one falls 50% and the other two stay flat. What is the total?**

- A. 4,500,000 VND — This is if all 9,000,000 VND fell 50%.
- B. 9,000,000 VND — This ignores the fall.
- C. 7,500,000 VND — Correct: 1,500,000 + 3,000,000 + 3,000,000 = 7,500,000 VND.
Answer: **C** (`correctIndex: 2`).

### Optional action

You do not need to invest to finish this lesson. In Picket, check your emergency pocket and any high-interest debts before considering any investment. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Primary reference](https://xaydungchinhsach.chinhphu.vn/canh-bao-rui-ro-khi-tham-gia-san-giao-dich-chung-khoan-truc-tuyen-119220630163102206.htm)

## picket.vi.financial.v1.22 — Spot suspicious investment offers

**Chapter:** chapter-14 · **Stage:** stage-04-growth · **Competency:** investing.fraud-red-flags  
**Objective:** Recognise the signs of fraudulent investment offers and know how to check before sending money.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

Fraudulent investment offers tend to share a few signs. They promise high, fixed returns, even "no risk". They push you to join now. They pay commission for bringing in others. They use platforms or apps with unclear licensing. They let you withdraw small amounts at first, then demand an extra "fee" or "tax" before a large withdrawal.

Vietnam's State Securities Commission advised on 30 June 2022: be very cautious with offers of high interest or returns. Securities companies operating in Vietnam must be licensed by the Commission. Trading on unregulated platforms is at the investor's own risk.

A fictional example: a group promises 3% per week. By simple conversion, 3 × 52 = 156% per year, which is abnormally high. Suppose 100 people each put in 10,000,000 VND, a total of 1,000,000,000 VND. If the group pays "returns" of 2.5% per week out of that same money, it pays out 25,000,000 VND each week. Without newcomers, the pool runs dry after 40 weeks. Such schemes live on money from people who join later.

Before sending money: wait at least a day, look up the firm yourself on the regulator's official site, and never give anyone your OTP or password. If you have already sent money, stop paying in, keep evidence, tell your bank and report to the police.

### Worked example

3 × 52 = 156% per year. Total in: 100 × 10,000,000 = 1,000,000,000 VND. Weekly "returns": 1,000,000,000 × 2.5% = 25,000,000 VND. Pool exhausted: 1,000,000,000 / 25,000,000 = 40 weeks.

#### Remember

- High, fixed promised returns and pressure are warning signs.
- Check licensing on the regulator's official site.
- Being asked to pay more before withdrawing is a clear fraud sign.

#### Common misconception

Believing a first successful withdrawal proves the platform is real.

#### Self-check — fictional scenario

You deposit 5,000,000 VND. The app shows a "profit" of 1,500,000 VND. You manage to withdraw 500,000 VND. How much real money has come back and how much is still outside?

#### Step-by-step reasoning

1. Money back in your account: 500,000 VND.
2. Still outside: 5,000,000 − 500,000 = 4,500,000 VND.
3. The displayed 5,000,000 + 1,500,000 = 6,500,000 VND is not money you hold.

#### Conclusion

Only 500,000 VND has come back; 4,500,000 VND is still outside and the 6,500,000 VND figure is only a display.

- `3*52 = 156`
- `100*10000000 = 1000000000`
- `1000000000*25/1000 = 25000000`
- `1000000000/25000000 = 40`
- `5000000-500000 = 4500000`
- `5000000+1500000 = 6500000`

### Practice scenarios

**1. A chat group promises 3% per week and some people have withdrawn money. What is a sensible conclusion?**

- A. A few withdrawals do not prove the scheme is legal; check licensing — Correct: small early withdrawals are often bait.
- B. It is certainly safe — Promises and a few withdrawals are not evidence of safety.
- C. Invite more people to earn commission — Inviting others may pull them into losses.
Answer: **A** (`correctIndex: 0`).

**2. A platform demands a new "tax fee" before you can withdraw. What should you do?**

- A. Pay it to get your money back — This is a common way to extract more money.
- B. Stop paying in, keep evidence, tell your bank and report to the police — Correct: stop transferring and report to the authorities.
- C. Borrow from relatives to pay it — Borrowing more makes the loss bigger.
Answer: **B** (`correctIndex: 1`).

**3. 3% per week, converted simply to a year (52 weeks), is how much?**

- A. 36% — This multiplies by 12, which is for monthly rates.
- B. 3% — This is still the weekly rate.
- C. 156% — Correct: 3 × 52 = 156%.
Answer: **C** (`correctIndex: 2`).

### Optional action

In Picket, record income only when money actually reaches your account. A "profit" figure shown in someone else's app is not income. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Dated figures and sources

- State Securities Commission: be very cautious with offers of high returns; securities companies in Vietnam must be licensed — source `ssc-warning`, as of 2022-06-30

### Sources

- [Primary reference](https://xaydungchinhsach.chinhphu.vn/canh-bao-rui-ro-khi-tham-gia-san-giao-dich-chung-khoan-truc-tuyen-119220630163102206.htm)
- [Primary reference](https://sbv.gov.vn/en/w/sbv624798)
- [Primary reference](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304)

## picket.vi.financial.v1.30 — Periodic financial review

**Chapter:** chapter-14 · **Stage:** stage-04-growth · **Competency:** planning.periodic-review  
**Objective:** Calculate three simple indicators for a financial review and know when to update your plan.  
**Status:** self-reviewed-pending-owner-approval · locale: en-US · translationVersion: 1

A financial plan needs regular review, because income, prices and goals all change. A review each quarter or each year can use three simple numbers.

The first is net worth: total assets minus total debts. The second is the savings rate: the amount set aside divided by take-home pay. The third is emergency months: the emergency fund divided by monthly essential costs. These numbers do not grade you. They show whether the trend is improving or needs adjusting.

A fictional example: Hà has 25,000,000 VND in wallets, 40,000,000 VND in deposits and a motorbike estimated at 15,000,000 VND. Total assets are 80,000,000 VND. Hà owes 12,000,000 VND, so net worth is 68,000,000 VND. Hà sets aside 1,800,000 VND from 12,000,000 VND take-home pay, a savings rate of 15%. An emergency fund of 18,000,000 VND against essential costs of 6,000,000 VND is 3 months.

Besides the regular schedule, review after a big change: a new job, moving home, marriage, a child or lower income. Then revisit the budget, emergency fund, insurance, debts and the order of your goals.

### Worked example

Assets: 25,000,000 + 40,000,000 + 15,000,000 = 80,000,000 VND. Net worth: 80,000,000 − 12,000,000 = 68,000,000 VND. Savings rate: 1,800,000 / 12,000,000 = 15%. Emergency: 18,000,000 / 6,000,000 = 3 months.

#### Remember

- Net worth = total assets − total debts.
- Savings rate = amount set aside / take-home pay.
- Emergency months = emergency fund / monthly essential costs.

#### Common misconception

Treating these indicators as a personal grade rather than a way to track trends.

#### Self-check — fictional scenario

Assets are 30,000,000 VND in deposits and 20,000,000 VND in cash; debts are 8,000,000 VND. The emergency fund is 10,000,000 VND and essential costs are 5,000,000 VND. 2,400,000 VND is set aside from 16,000,000 VND take-home pay. Calculate the three indicators.

#### Step-by-step reasoning

1. Assets: 30,000,000 + 20,000,000 = 50,000,000 VND; net worth: 50,000,000 − 8,000,000 = 42,000,000 VND.
2. Emergency: 10,000,000 / 5,000,000 = 2 months.
3. Savings rate: 2,400,000 / 16,000,000 = 15%.

#### Conclusion

Net worth 42,000,000 VND, 2 emergency months and a 15% savings rate.

- `25000000+40000000+15000000 = 80000000`
- `80000000-12000000 = 68000000`
- `1800000*100/12000000 = 15`
- `18000000/6000000 = 3`
- `30000000+20000000 = 50000000`
- `50000000-8000000 = 42000000`
- `10000000/5000000 = 2`
- `2400000*100/16000000 = 15`

### Practice scenarios

**1. Assets are 50,000,000 VND and debts 20,000,000 VND. What is net worth?**

- A. 70,000,000 VND — This adds debts instead of subtracting.
- B. 30,000,000 VND — Correct: 50,000,000 − 20,000,000 = 30,000,000 VND.
- C. 20,000,000 VND — This is total debt.
Answer: **B** (`correctIndex: 1`).

**2. Take-home pay is 10,000,000 VND and 1,000,000 VND is set aside. What is the savings rate?**

- A. 10% — Correct: 1,000,000 / 10,000,000 = 10%.
- B. 1% — The division is off by one digit.
- C. 100% — This would mean saving everything.
Answer: **A** (`correctIndex: 0`).

**3. After a big change such as a new job or a child, what should you do?**

- A. Keep the old plan unchanged — New circumstances may make the old plan unsuitable.
- B. Delete all old data — Old data helps you compare trends.
- C. Review the budget, emergency fund, insurance and goals — Correct: update the plan for the new circumstances.
Answer: **C** (`correctIndex: 2`).

### Optional action

Pick one day each quarter to open Picket, look at the total of your budget pockets, upcoming Bills and goal progress; write down the three numbers from this lesson. You may skip. No spending, financial-product signup, OTP or submission to AI is required.

### Sources

- [Primary reference](https://www.g20.utoronto.ca/2016/Core-Competencies-Framework-Adults.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf)
- [Primary reference](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf)

## Translation consistency checks

- 30 translated bodies, 90 questions and 270 choice explanations; 179 arithmetic checks passed.
- IDs, chapter/stage/competency IDs, version, correct answer positions, source URLs, cited figures, currencies and arithmetic expressions/results match the Vietnamese source exactly.
- Every numeric token in each body matches the Vietnamese body in order (English "13 July 2026" dates are normalised to d/m/yyyy before comparing).
- Source VI files were not modified; regeneration writes only EN artifacts.
- Independent financial, language and safety review and learner pilot remain outstanding.
