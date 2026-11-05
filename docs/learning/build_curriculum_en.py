"""Local editorial translation; no provider calls or user data."""
import copy
import json
import re
from pathlib import Path
from study_support import apply_study_support, markdown_example, write_app_copy
import curriculum_v2_extension as ext

ROOT = Path(__file__).parent
translations = []

def add(title, objective, body, example, questions, action):
    translations.append(dict(title=title, objective=objective, body=body.strip(), example=example, questions=questions, action=action))

def q(prompt, choices, explanations):
    return dict(prompt=prompt, choices=[dict(text=t, explanation=e) for t,e in zip(choices, explanations)])

add('Moving money between wallets is not another expense',
'Distinguish transfers between your own wallets from income and spending; explain the scope being viewed.', '''
Your money may be held in several places: cash, a bank account or an electronic wallet. Moving money between places you own changes where you keep it. To understand how much you have spent, ask whether money has left the entire scope you are tracking to pay for something. The name of a bank app's transfer button is not enough to answer this: transferring to a shop is a payment, while transferring to another account of your own may be a wallet transfer.

Consider an illustrative example. Hòa has 600,000 VND in cash and 1,400,000 VND in the bank. Hòa withdraws 200,000 VND without a fee. Cash becomes 800,000 VND and the bank balance becomes 1,200,000 VND. The total is 2,000,000 VND both before and after. Recording the withdrawal as spending, then recording purchases paid in cash, would count spending twice. If the bank charges a further 3,000 VND withdrawal fee, only that 3,000 VND fee is spending in this example; the 200,000 VND has merely changed location.

Scope explains the apparent contradiction. Looking only at the bank wallet, 200,000 VND has indeed left it. Looking at both wallets, the outgoing and incoming sides cancel. A wallet cash-flow report can therefore differ from an overall spending report. You do not need to decide that one is wrong; read its label and check which wallets it includes. A wallet outside the scope also needs a clear note rather than an assumption that every outflow is a purchase.

In Picket, check the source wallet, destination wallet, amount and fee before confirming. Giving money a savings-goal label does not make it disappear either. One real transfer should be recorded once, with linked sides. If you entered separate income and expense records by mistake, check before editing so you do not delete a real purchase made on the same day. You can learn entirely with the example numbers; no real withdrawal or transfer is required to demonstrate understanding. The key is that the same money can move while the total stays unchanged.
''','600,000 + 1,400,000 = 2,000,000 VND; after the transfer: 800,000 + 1,200,000 = 2,000,000 VND. A 3,000 VND fee, if charged, leaves a total of 1,997,000 VND.', [
q('You withdraw 200,000 VND without a fee from your bank into your own cash wallet. How much does overall spending increase?', ['200,000 VND','0 VND','400,000 VND'], ['This money has changed location; it has not paid for a purchase.','Correct: the total across both wallets does not decrease.','Adding both sides counts the same money twice.']),
q('Looking only at the bank wallet in the example, has 200,000 VND left that scope?', ['No, because wallet transfers always equal zero','Yes, but it is not overall spending','It is new income'], ['The zero-total rule requires both sides to be inside the scope.','Correct: the bank decreases while cash increases.','The bank decreases, so there is no new income.']),
q('You withdraw 200,000 VND and pay an additional 3,000 VND fee. What is the spending caused by this operation?', ['203,000 VND','200,000 VND','3,000 VND'], ['203,000 VND leaves the bank, but includes money moving into cash.','You still own the 200,000 VND.','Correct: the fee is the part leaving your total assets in this situation.'])],
'Review an existing wallet transfer or solve the example again; do not make a real transfer.')

add('Check records before categorizing them',
'Check amounts and income/expense direction, prevent duplicate records and distinguish missing data from zero spending.', '''
A useful transaction list should reflect what actually happened. Start with the date, amount, wallet and whether money came in or went out. Categories help you find and compare records, but an attractive category name cannot fix a wrong amount. When scanning a receipt, treat the result as a draft to check. A machine may misread separators, the total line or cash tendered by the customer. A landscape photograph is not evidence of a transaction; do not guess an amount from it.

Mai has checked three expenses: lunch at 45,000 VND, transport at 25,000 VND and notebooks at 30,000 VND. They total 100,000 VND. Mai attaches the lunch receipt to that existing transaction; the total remains 100,000 VND, not 145,000 VND. If the photo uploads slowly, a photo-processing status is different from a saved-transaction status. On returning, check which record already exists before saving again. An attachment and an expense are different kinds of information, not two amounts of money.

Categorization should serve your question. A notebook for school may belong under education; the same notebook bought for someone else may be a gift. Do not infer its purpose solely from the shop's name. You can leave an unclear expense for later review and add context when you remember it. When several people share a payment, record your share or use a consistent split rule. Avoid sometimes recording the whole bill and sometimes just your portion without a note.

At the end of a period, compare the list with balances or evidence you still have. If you forgot two days of entries, mark the gap instead of declaring zero spending on those days. An unexplained difference does not automatically become income. It is fine to acknowledge incomplete data and review it when convenient. In Picket, use only confirmed transactions for lessons based on real data; choose an illustrative example if you prefer not to use personal information. Recording should make decisions clearer, rather than produce a perfect table or require you to remember every detail immediately.
''','45,000 + 25,000 + 30,000 = 100,000 VND; attaching the lunch photo does not create a second 45,000 VND expense.', [
q('Mai adds a photo to the lunch transaction already saved. What should the total of the three expenses be?', ['100,000 VND','145,000 VND','55,000 VND'], ['Correct: an attachment does not create additional spending.','You have counted lunch twice.','You have removed an actual expense.']),
q('Tuesday has no record because Mai forgot to enter it. What is the appropriate conclusion?', ['There was definitely no spending','We do not yet know whether there was spending','Use the highest daily amount that month as a factual entry'], ['Missing entries do not prove nothing happened.','Correct: keep the insufficient-data state.','An estimate must not become a transaction claimed to have happened.']),
q('OCR reads 450,000 VND, but the receipt says 45,000 VND. What should you do?', ['Keep the machine result because it is objective','Save both numbers as separate expenses','Check the receipt and correct the draft before confirming'], ['OCR can still misread characters.','Two interpretations of one purchase do not create two expenses.','Correct: the draft amount must be checked.'])],
'Check one transaction or example for its date, wallet, amount and possible duplication.')

add('Needs and wants depend on context',
'Explain a priority using circumstances, timing and alternatives, without judging from an item name.', '''
Needs often relate to daily living, health, education or responsibilities you must meet. Wants tend to have more flexibility. The boundary depends on context, not a fixed label attached to an item. Internet access may support online classes or be an extra entertainment service. A ride-hailing trip may help an injured person travel safely. This lesson therefore does not judge someone as good or bad from a purchase, or require giving up every source of enjoyment.

Try three questions: what happens if I postpone it, when must the need be met, and is there another suitable option? A cheaper option is an alternative only when it actually meets the need. Walking cannot always replace transport on a rainy night or an unsafe route. A cheaper service is not useful if it lacks a feature required for work. A purchase may contain both an essential part and an upgrade; you can explain that distinction rather than choose one label for everything.

In an imaginary situation, Phương has 1,500,000 VND left before the next income payment. Phương plans to keep 900,000 VND for housing and 400,000 VND for food, leaving 200,000 VND. New headphones priced at 350,000 VND would exceed that remainder by 150,000 VND unless something else changes. The calculation does not call Phương undisciplined; it identifies a need to postpone, choose another option or confirm another source of money. If the old headphones are broken and immediately needed for work, the context changes, but the shortfall still needs addressing.

You may choose a flexible allowance for interests that fits your circumstances. No single budget percentage suits everybody. Someone supporting family or facing high health costs may have fewer choices; calling this a personal weakness does not create money. In Picket, priority labels support reflection; they do not block saving a transaction or decide for you. When context is missing, asking for more information is a good answer. Try writing a brief reason for your choice. You can change that reason as responsibilities, health or timing change.
''','1,500,000 − 900,000 − 400,000 = 200,000 VND; 350,000 − 200,000 = a 150,000 VND shortfall for this choice.', [
q('Is a ride-hailing transaction enough to conclude that the trip was a want?', ['Yes, ride-hailing is always unnecessary','No, context and safe alternatives are needed','Yes, because it costs more than a bus'], ['A fixed label ignores health and circumstances.','Correct: the same service can serve different purposes.','A lower price does not guarantee a suitable alternative.']),
q('Phương keeps both planned allocations unchanged. How much is missing for the 350,000 VND headphones?', ['150,000 VND','200,000 VND','350,000 VND'], ['Correct: the 350,000 VND price minus the 200,000 VND remainder.','200,000 VND is what remains before buying.','There is already 200,000 VND, so the entire price is not missing.']),
q('The headphones are broken and needed for work. What is most reasonable?', ['Calling them a need creates more money','Ignore every upcoming obligation','Consider options that meet the work need and recalculate the shortfall'], ['A label does not change the balance.','The consequences of obligations still exist.','Correct: consider both context and ability to pay.'])],
'Choose an example or existing expense and explain why it could be postponed or needs priority.')

add('Plan around the dates money arrives',
'Build an income-and-expense calendar using due dates and separate uncertain income.', '''
A monthly income total does not tell the whole story. Money arriving after rent is due cannot pay it on the day before arrival. Freelancers, small sellers and people receiving support in installments may need to plan around each incoming payment. Begin with money available now, then add income whose date and amount are confirmed. Money merely promised or dependent on unfinished work belongs separately as an assumption, rather than being treated as already in the wallet.

Nam has 1,200,000 VND at the start of the week. Rent of 800,000 VND is due on Wednesday, and food is expected to require 300,000 VND on Friday. A customer has promised 1,000,000 VND on Sunday but has not confirmed it. Before that income, Nam has only 100,000 VND left after the two expenses. An additional 200,000 VND cost on Saturday creates a 100,000 VND shortfall in the scenario with no further income. Placing the promised payment at the start of the week would hide this gap, even though the end-of-week total might appear positive.

A budget in this situation can have a confirmed part and a part conditional on money actually received. Do not divide your best annual income across weeks and assume every week will deliver that amount. Looking across periods can reveal variability, but an average is not a guarantee. If income falls short, review flexible expenses and proactively ask payees about options that really exist. Do not assume a later due date has been agreed. Nor should you omit food or health needs just to make the table look balanced.

In Picket, reviewing the days before the next income payment can help you choose a more suitable limit than a general monthly label. Mark and reconcile paid bills so they are not subtracted again. If the plan needs revision, revise future assumptions; transactions that already happened retain their actual dates. You do not need to disclose your salary to study this lesson: use Nam's example. A useful outcome is knowing which date needs attention, what is confirmed and what must be verified, rather than making irregular income look regular on screen.
''','1,200,000 − 800,000 − 300,000 = 100,000 VND; an additional 200,000 VND expense before income arrives produces −100,000 VND.', [
q('The customer has not confirmed the 1,000,000 VND Sunday payment. How should it be represented?', ['Cash already available on Monday','Assumed income, separate from the actual balance','Guaranteed weekly income'], ['This incorrectly changes both timing and certainty.','Correct: compare scenarios with and without receipt.','One promise does not establish a recurring schedule.']),
q('Before Sunday, Nam spends another 200,000 VND after the two obligations. What is the scenario balance?', ['900,000 VND','100,000 VND','Negative 100,000 VND'], ['This assumes the customer money has already arrived.','100,000 VND was the balance before the extra expense.','Correct: 100,000 VND minus 200,000 VND.']),
q('Monthly income exceeds monthly expenses, yet there is a mid-month shortfall. Why?', ['Income may arrive after payments are needed','Addition does not work for money','Changing categories is enough to create money'], ['Correct: timing matters alongside period totals.','Addition still works; the timeline is also needed.','Changing labels does not create money.'])],
'Review or write down three upcoming payments and the next income date using illustrative data.')

add('Emergency funds differ from known future costs',
'Distinguish unexpected events from scheduled costs and choose a reserve goal suited to your circumstances.', '''
Emergency money gives you more options when something unexpected happens, such as essential equipment breaking or income being interrupted. Money for a known cost, such as next term's tuition or an annual renewal, serves a different purpose: preparation for a schedule. Both are useful. Distinguishing them helps avoid feeling that you constantly face emergencies when an annual bill simply was not planned. There is no need for blame when allocated money must be used; look at what actually happened.

Dung has 2,000,000 VND, including 1,200,000 VND allocated to tuition and 800,000 VND to emergencies. Tuition of 1,200,000 VND becomes due; paying it leaves 800,000 VND. If essential study equipment then unexpectedly needs a 500,000 VND repair, 300,000 VND remains. Under this allocation, tuition was not a withdrawal from the emergency reserve. The reserve is not extra money beyond the 2,000,000 VND either; it is part of the existing total. Labeling the same money as belonging to two funds does not let it pay twice.

A suitable reserve depends on needs, dependants, income stability and support you can actually access. A modest starting goal may be more manageable than a large target that makes you give up. This lesson does not require everybody to hold the same number of months of expenses, or promise that reaching a number protects against every disruption. If nothing remains after basic needs, acknowledge that limit. You do not need to borrow simply to create a balance labeled as an emergency fund.

Consider keeping money somewhere whose fees, withdrawal access and availability when needed you understand, rather than chasing a promised return. Do not put all money needed soon into something you do not understand or cannot access in time. In Picket, review goal labels and balances separately to avoid confusion. After using a reserve, rebuild the plan when circumstances allow; do not punish yourself by dropping essential costs. A learning step can simply be listing known costs and unexpected events, without depositing money or buying a financial product.
''','2,000,000 − 1,200,000 = 800,000 VND; 800,000 − 500,000 = 300,000 VND.', [
q('Tuition has a clear date next term. How is it classified in this lesson?', ['An unforeseeable emergency','A scheduled cost to prepare for','New income'], ['A known date and amount can be planned.','Correct: it differs from an unexpected event.','It is money to pay, not money coming in.']),
q('Dung pays tuition and repairs the equipment as in the example. How much remains?', ['300,000 VND','800,000 VND','1,500,000 VND'], ['Correct: both actual expenses have been deducted.','This was the balance before the repair.','This calculation omitted tuition.']),
q('Nothing remains after basic needs. What is the most suitable response?', ['Borrow to make a fund label look good','Treat yourself as a failure','Acknowledge the constraint and revisit the goal when circumstances change'], ['Borrowing adds an obligation; it does not automatically create safety.','Limited resources are not a judgment of character.','Correct: goals should fit real circumstances.'])],
'Separate two examples into scheduled costs and unexpected events; no money transfer is required.')

add('Break a goal into adjustable steps',
'Calculate what is still needed and an amount per period; adjust the deadline when circumstances change.', '''
A clear goal often has an amount, a reason and a date you would like to reach it. It remains an adjustable plan. If prices change or income falls, revising a deadline does not erase the steps already taken. Before calculating, check how much money is genuinely allocated to this goal. Money reserved for rent should not simultaneously count toward buying a computer, unless you deliberately reallocate it and understand the consequences for rent.

Tú wants to set aside 3,000,000 VND for a course after six income periods. There is already 600,000 VND allocated to it. The remaining amount is 2,400,000 VND, or 400,000 VND in each of six equal periods. This division explains the pace; it is not a command to contribute regardless of circumstances. If only 300,000 VND per period is feasible, it takes eight periods to cover the remainder, assuming unchanged prices and no interest. Do not add uncertain future returns merely to make the deadline appear achievable.

When another need takes priority in a period, recalculate using the money actually available. Avoid adding both an intended contribution and the contribution already transferred. Moving money into your own savings wallet is still a wallet transfer across the total scope; a goal expresses what you intend to use it for. If you update a progress bar without corresponding money, distinguish a plan from a data adjustment. A full bar does not prove you can pay when other expenses need the same balance.

In Picket, practice can mean reviewing an existing goal or just solving the example. You do not need to open a real savings product to finish, or prove progress with an account screenshot. An optional reminder may help you revisit a plan, but skipping it does not remove what you have learned. When comparing options, identify what changes: the time, the amount per period or the goal's scope. Avoid concluding that faster completion means better money management; people have different resources and responsibilities. A small step helps when you understand it and can still meet important current needs.
''','(3,000,000 − 600,000) / 6 = 400,000 VND per period; 2,400,000 / 300,000 = 8 periods.', [
q('Tú has 600,000 VND toward a 3,000,000 VND goal. How much is still needed?', ['3,600,000 VND','2,400,000 VND','600,000 VND'], ['This adds rather than subtracts what is already available.','Correct: target minus the money actually allocated.','This is what is available, not what is missing.']),
q('Only 300,000 VND per period can be set aside for the remainder. How many periods are needed under the lesson assumptions?', ['6','10','8'], ['Six periods produce only 1,800,000 VND.','Ten periods divides the whole target and ignores the existing 600,000 VND.','Correct: 2,400,000 divided by 300,000 is eight.']),
q('One period requires spending on medicine. What should happen to the goal?', ['Update the actual amount and recalculate the deadline','Keep fictional progress because it looks better','Skip medicine to preserve progress'], ['Correct: a plan serves your circumstances, not the reverse.','Progress that does not match money makes later decisions harder.','Health needs should not be displaced by progress points.'])],
'Write a fictional goal with money already allocated, the remaining amount and two deadline options.')

add('A balance is not automatically money available to allocate',
'Separate the current balance, future obligations and a reserve when interpreting a scenario.', '''
A balance tells you how much money you have within the scope being viewed. It does not automatically tell you how much can be allocated to a new decision. Some upcoming payments have not yet left the wallet. You may also want to keep part of the money for surprises. When reading a number, look for its date, included wallets and expenses already included or still outstanding. If a foreign-currency wallet has no suitable exchange rate, do not add its numeric amount directly to VND.

Vy has 4,000,000 VND in the VND wallets under consideration. Before the next income payment, Vy has confirmed rent of 1,500,000 VND and expected food costs of 700,000 VND. Vy wants to retain 500,000 VND as a reserve. Given these exact inputs, the remainder after obligations and the reserve is 1,300,000 VND. This does not say the bank balance has already fallen to 1,300,000 VND. It distinguishes current money from the portion being considered for a new decision. The reserve is an allocation within the same balance, not spending already completed.

If rent has already been paid and that transaction has already reduced the 4,000,000 VND balance, do not subtract it again. Reconcile the bill's status and the payment record before reviewing the schedule. Likewise, an unconfirmed receipt photo should not automatically create another obligation in addition to an existing record. Moving money between two wallets in scope does not increase the total available to allocate. These rules prevent overly optimistic or pessimistic reports caused by counting something more than once.

The 1,300,000 VND still depends on whether the list is complete. Vy might have omitted transport or have uncertain income. Treat the result as conditional, with things still to check. In Picket, when a schedule is unconfirmed, it is better to acknowledge insufficient data than declare that you are allowed to spend a particular amount. You can change assumptions and view results, but the app does not decide for you. Practice means checking whether one obligation has been paid; it does not require giving bank account information to a new service.
''','4,000,000 − 1,500,000 − 700,000 − 500,000 = 1,300,000 VND under the stated inputs.', [
q('What does 1,300,000 VND mean in the example?', ['The certain bank balance right now','A conditional remainder after the stated allocations','Money just created by the app'], ['The bank has not automatically deducted future expenses and the reserve allocation.','Correct: retain the assumptions and scope when reading the number.','Calculation does not create money.']),
q('Rent already appears in a transaction deducted from the current balance. What happens if the bill is subtracted again?', ['The obligation is counted twice','Accuracy improves','New income is created'], ['Correct: reconcile the payment status.','Double subtraction makes the projection incorrectly low.','There is no new source of income.']),
q('There is a 100 USD wallet and a 4,000,000 VND wallet, but no exchange rate. What should you do?', ['Add them as 4,000,100 VND','Treat USD as zero without explaining','Show them separately and state that cross-currency aggregation is unavailable'], ['Different units cannot be added directly.','Silent omission misrepresents the scope.','Correct: the limit must be visible.'])],
'Review an upcoming payment or example and mark paid/unpaid; do not create a real payment.')

add('Scenarios ask questions; they do not predict with certainty',
'Compare two scenarios using consistent assumptions and explain why missing data prevents confident forecasting.', '''
A scenario asks how money changes if specified things happen. A forecast tries to estimate what may happen using particular data and a method. Both have limits, but the terms should not be interchangeable merely to sound certain. Entering the price of something you might buy and viewing the difference is first a conditional calculation. It proves neither that you will buy it nor that every other future income and expense is known.

An has 2,000,000 VND. Over seven days, An confirms income of 1,000,000 VND and obligations of 1,500,000 VND. With no other transactions, the closing balance is 1,500,000 VND. Buying an item for 600,000 VND during the period, with everything else unchanged, leaves 900,000 VND. The difference is 600,000 VND. This does not assert that An will have exactly 900,000 VND next week. If income arrives late or expenses are missing, reality differs. Daily balances also matter, not just the final day.

Sparse records can create a misleading story. Three days without entries do not mean three days of zero spending. Tracking only one wallet also leaves other wallets unknown. A complex model cannot turn those gaps into facts by itself. Useful responses include asking how complete records are, showing the last synchronization time and allowing known schedules to be corrected. Low and high numbers produced by changing assumptions are scenarios; do not call them validated confidence probabilities without appropriate measurement and calibration.

In Picket, trying a choice should not create an actual transaction or edit a real budget. Use the appropriate recording flow only when you actively confirm something that happened. With limited history, illustrative data can still explain the calculation without inventing a date when money will run out. You can defer a conclusion and add inputs later. Good practice is to state the condition before the result: if the schedule is correct and nothing else occurs, what remains? That sentence helps you test a decision and identify what is still unknown.
''','Without purchase: 2,000,000 + 1,000,000 − 1,500,000 = 1,500,000 VND. With purchase: 1,500,000 − 600,000 = 900,000 VND.', [
q('Two options differ only by a 600,000 VND purchase. What is the closing-balance difference?', ['600,000 VND','900,000 VND','1,500,000 VND'], ['Correct: all other assumptions remain unchanged.','This is the remainder in the purchase option.','This is the remainder without the purchase.']),
q('Three days have no entries. Can spending be concluded to be zero?', ['Yes, because the chart is blank','Not yet','Yes, if AI sounds confident'], ['A blank chart may mean records are missing.','Correct: recording coverage needs to be understood.','Confident wording is not evidence.']),
q('What should changing a price on a scenario screen do to actual transactions?', ['Automatically create an expense','Edit the budget to fit the result','Leave them unchanged; simulate until a separate confirmation action'], ['Trying an option is not an actual purchase.','Silent changes undermine the plan.','Correct: simulation and factual recording are separate steps.'])],
'Solve two illustrative scenarios and name one thing that could change the result.')

add('Look beyond a small installment to total cost',
'Calculate total payments including fees; distinguish an advertised rate from the full cost in the example.', '''
A loan involves more than principal. Understand the money actually received, payment schedule, interest and any fees that may arise. A small installment does not by itself prove a loan is cheaper. To compare choices, understand the usable amount, number of payments, dates and conditions. If information is missing, the appropriate answer may be that comparison is not yet possible, rather than choosing the lowest percentage on an advertisement.

In fictional contract A, Linh receives 3,000,000 VND and makes three payments of 1,080,000 VND. There is also a 60,000 VND fee paid separately at the start. Total payments are 3,300,000 VND, or 300,000 VND above the amount received. Fictional contract B also provides the full 3,000,000 VND, requires three payments of 1,110,000 VND and has no other fees: the total is 3,330,000 VND. Under those exact conditions, A costs 30,000 VND less in total payments. This is arithmetic, not a lender recommendation or a conclusion about the legality of any product.

Check whether a fee is deducted from the initial proceeds or paid separately. The usable amount may differ even when both are called a 3,000,000 VND loan. Also check late fees, early-repayment conditions and bundled services. Do not infer an annual rate through simple division when payment dates and outstanding principal change across periods. Nor should a foreign financial indicator be attached to a calculation that does not meet its definition. Here we calculate only the total amounts explicitly stated.

For a real decision, you need contract information applicable in Vietnam and may consult an appropriately qualified person about unclear terms. The international sources support thinking about costs; they do not replace Vietnamese law or create legal rights or deadlines here. You do not need to enter an actual loan or apply to complete the lesson. In Picket, distinguish simulations from existing obligations and record a real schedule only after checking. If pressured to sign with unanswered questions, pausing to verify helps preserve your choice.
''','A: 3 × 1,080,000 + 60,000 = 3,300,000 VND, with a cost of 300,000 VND. B: 3 × 1,110,000 = 3,330,000 VND; difference: 30,000 VND.', [
q('What is the total amount paid for A in the example?', ['3,240,000 VND','3,300,000 VND','3,060,000 VND'], ['This omits the separate 60,000 VND fee.','Correct: add all three installments and the fee.','This omits most installment payments.']),
q('You know only the advertised rates of two contracts. Can you choose the cheaper one?', ['Not yet; you need the schedule, money received and fees','Yes; always choose the smaller number','Yes; choose the promise of fast disbursement'], ['Correct: one indicator does not show all payments.','Fees and calculation methods can differ.','Speed does not establish cost.']),
q('The CFPB source discusses US TILA disclosures. How should this be used in a Vietnam-focused lesson?', ['Treat it as Vietnamese law','Promise every Vietnamese contract has the same form','Use only cost concepts and check applicable terms and law separately'], ['Foreign sources do not become Vietnamese law.','There is no evidence for this claim.','Correct: distinguish concepts from each jurisdiction’s legal requirements.'])],
'Compare two fictional payment tables and write a question about an unspecified fee; do not apply for a loan.')

add('Payment timing matters as much as the total',
'Identify a shortfall before income arrives and check conditions before rescheduling or borrowing to cover it.', '''
After understanding total cost, place every payment on a calendar alongside income and living needs. A contract with a lower total can still create pressure if its dates do not match when money is available. That does not automatically make another option better; it adds a criterion to check. A positive end-of-month balance does not ensure enough money every day. With project-based income in particular, the date a customer promises and the date money arrives can differ.

Bình begins with 900,000 VND. A contractual payment of 700,000 VND is due on the tenth. Before the fifteenth, 300,000 VND is needed for essentials. Income of 1,200,000 VND is expected on the fifteenth. Before it arrives, the calculation is 900,000 − 700,000 − 300,000 = negative 100,000 VND. After the full payment arrives, with nothing else changing, the balance is 1,100,000 VND. Looking only at the closing amount hides the earlier 100,000 VND gap. Changing a date in an app does not change the contract's due date.

If a gap appears, verify the income date and ask the relevant parties about real options before the deadline. Any schedule change needs confirmation, including its fees and consequences. Paying an extension fee does not necessarily reduce principal; read how that contract allocates payments. New borrowing to cover an old installment can add obligations, so consider the combined schedule rather than just the urgent payment. This lesson neither selects a loan product nor advises abandoning essential needs to pay at any cost.

In Picket, reminders help you remember; completion should correspond to a real, confirmed payment. If that amount already appears in a transaction, do not enter it again from a reminder. You may note unclear information and return later. When an alert appears, you should be able to inspect its calculation and scope instead of accepting an absolute conclusion. Practice only requires marking a shortfall date in the example and considering a question to verify. No contract number, identity document or actual payment is needed to learn how to read the schedule.
''','Before income: 900,000 − 700,000 − 300,000 = −100,000 VND. After income: −100,000 + 1,200,000 = 1,100,000 VND.', [
q('Before the fifteenth, how much is Bình short under the example?', ['Nothing, because the closing balance is positive','100,000 VND','1,100,000 VND'], ['Money not yet received cannot meet earlier needs.','Correct: the inputs produce a negative 100,000 VND balance.','1,100,000 VND is the amount after income arrives.']),
q('Bình changes a reminder date in Picket. Does the contract deadline automatically change?', ['Yes','Yes, if notifications are disabled','No; the relevant party must confirm it'], ['The app does not change the agreement with the lender.','Disabling reminders does not change obligations.','Correct: verify actual changes and their conditions.']),
q('Does paying an extension fee definitely reduce principal?', ['No; check the contract’s allocation of payments','It definitely reduces principal by the fee amount','It definitely clears the debt'], ['Correct: fees and principal may be different amounts.','There is not enough information for that conclusion.','An extension does not mean the obligation disappears.'])],
'Mark the gap in a fictional schedule and write a question about the payment date or fees.')

add('Pause before an OTP request',
'Recognize suspicious requests for transfers or secrets and verify independently through official channels.', '''
Knowing your name or order details does not prove someone is entitled to ask you to operate an account. An impersonator may use correct information to create urgency: verify now, claim a refund or avoid being locked out. Pause when a story pushes you to skip checks. A brand name in a message or a familiar logo is not sufficient evidence of authenticity. This lesson focuses on handling requests; it does not require you to recognize every trick by appearance.

In an entirely fictional example, a caller offers Hà a 250,000 VND refund but demands a 50,000 VND transfer first and asks Hà to read out an OTP. Hà has 1,000,000 VND. Sending 50,000 VND leaves 950,000 VND, not 1,200,000 VND, because the promised 250,000 VND refund has not arrived. No calculation establishes the caller's trustworthiness. The safe response in this situation is to stop and independently open the known official app or support channel to check. Do not simply follow a link or callback number provided by the caller.

Do not give callers or message senders OTPs, passwords or login details. Use an authentication code only for an action you initiated on a verified official channel, after understanding what you are authorizing. Do not install an app, grant device-control access or scan an unfamiliar code under refund instructions. If you have acted and suspect fraud, stop the transaction, contact the bank through its official channel for protective steps, preserve evidence and report to the police. Recovery of the money cannot be guaranteed.

Picket practice uses simulated situations. The app does not need a bank OTP, card photo or password to assess an answer. Do not enter a real code into a learning field or share screenshots containing secrets. For an urgent request, ask who initiated contact, what you are authorizing and how to verify independently. Pausing to ask is not a mistake. If you have been deceived, focus on protection and support; do not let embarrassment delay contacting an organization that can respond.
''','1,000,000 − 50,000 = 950,000 VND; the promised 250,000 VND is not received income. Only assuming both receipt and transfer gives 1,200,000 VND; that assumption cannot establish trust.', [
q('A caller knows your order details and demands an OTP for a refund. What should you do?', ['Read the code because they know the details','Stop and verify independently through an official channel','Read only half the code'], ['Knowing details does not establish identity or access rights.','Correct: do not share secrets at a caller’s request.','This still exposes information and is not safe verification.']),
q('Hà transfers 50,000 VND and the refund has not arrived. What remains from 1,000,000 VND?', ['950,000 VND','1,200,000 VND','1,250,000 VND'], ['Correct: record only money actually paid out.','This treats a promise as money received.','This adds money not received and omits the actual transfer.']),
q('You clicked a link and suspect information was exposed. What is an appropriate response?', ['Wait because reporting feels embarrassing','Transfer more money to recover it','Stop, contact the bank officially, preserve evidence and report'], ['Delay can increase risk.','A recovery promise may be another part of the deception.','Correct: prioritize protection; recovery is not guaranteed.'])],
'Read the scenario and name an independent verification channel; never use a real OTP or suspicious link.')

add('Trials, renewals and a pause before buying',
'Identify renewal dates, verify cancellation status and compare conditional purchase choices without judging interests.', '''
A free trial may become a paid subscription unless you cancel according to the agreed terms. Before starting, look for the post-trial price, billing cycle, renewal date and actual cancellation method. A free label does not explain every condition. You can choose not to sign up if you do not understand. Similarly, removing an app icon from your phone does not prove a subscription is canceled. Check its status where the subscription is managed and retain confirmation when available.

In a fictional example, Yến pays 79,000 VND monthly for service A and 49,000 VND for service B, totaling 128,000 VND per month. If both prices stay unchanged, both remain active for twelve months and there are no other fees, the total is 1,536,000 VND. Yến is also considering a 450,000 VND item expected to be used six times. Dividing price by anticipated uses gives 75,000 VND per use, but does not prove all six uses will happen. The numbers expose scale and assumptions; they do not decide for Yến.

A self-chosen pause before a flexible purchase may allow time to compare plans, read conditions and reconsider the need. You can note the item and return at a time you choose. This is a reflection technique, not a guaranteed legal cancellation period, and it should not be rigidly imposed on medicine or urgent needs. Buying or not buying after the pause can both be reasonable, depending on circumstances. You do not need a streak of avoiding purchases to prove money-management knowledge.

In Picket, flagging a recurring expense for review does not cancel an external service. To cancel, use the official channel and confirm the outcome before editing the future schedule. A payment already charged still needs an accurate record; an unapproved refund request is not received money. Renewal reminders should be opt-in and avoid duplicates. Practice can simply mean reviewing the examples or writing a question about trial conditions. No subscription, purchase or card information is required to finish; the aim is to make your choices clear.
''','79,000 + 49,000 = 128,000 VND per month; 128,000 × 12 = 1,536,000 VND per year under the assumptions; 450,000 / 6 = 75,000 VND per anticipated use.', [
q('Does deleting the app from your phone prove the subscription is canceled?', ['Yes, it always cancels automatically','No; check the status where the subscription is managed','Yes, if the app is not opened'], ['Deleting an app and canceling a subscription are different actions.','Correct: confirm at the official management channel.','Not using it does not automatically change billing terms.']),
q('Both subscriptions retain their prices for 12 months as in the example. What is the total?', ['128,000 VND','1,536,000 VND','450,000 VND'], ['This is the one-month total.','Correct: 128,000 multiplied by twelve.','This is the other item’s price, not the two subscriptions.']),
q('Picket flags service B for review. Can charges already be considered stopped?', ['Yes, as soon as it is flagged','Yes, after any one-day pause','Not yet; cancel and confirm through the provider or management channel'], ['A Picket note does not control an external service.','A self-chosen pause does not change the contract.','Correct: update the schedule only once the actual result is known.'])],
'Review the price and renewal date of an example or existing subscription; you may skip and should not sign up for another one.')

MONTHS = {m: i for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'], 1)}

def normalize_dates(text):
    """Turn '13 July 2026' into '13/7/2026' so numeric parity matches Vietnamese d/m/yyyy."""
    return re.sub(r'\b(\d{1,2}) (' + '|'.join(MONTHS) + r') (\d{4})\b', lambda m: f"{m.group(1)}/{MONTHS[m.group(2)]}/{m.group(3)}", text)

def numbers(text):
    return [re.sub('[.,]', '', n.rstrip('.,')) for n in re.findall(r'[0-9][0-9.,]*', normalize_dates(text))]

def translation_map():
    """Old lessons map by their original position; v2 lessons come from the extension module."""
    tmap = {ext.lesson_id(i + 1): t for i, t in enumerate(translations)}
    for item in ext.NEW_LESSONS:
        e = item['en']
        tmap[ext.lesson_id(item['n'])] = dict(title=e['title'], objective=e['objective'], body=e['body'].strip(), example=e['example'],
            questions=[q(prompt, choices, explanations) for prompt, choices, explanations in e['questions']], action=e['action'])
    return tmap

def main():
    source_path=ROOT/'PICKET_FINANCIAL_CURRICULUM_VI_V1.json'
    source_bytes=source_path.read_bytes()
    vi=json.loads(source_bytes)
    en=copy.deepcopy(vi)
    tmap=translation_map()
    assert len(translations)==12 and len(tmap)==len(vi['lessons'])==30
    status=ext.REVIEW_STATUS
    en.update(locale='en-US',curriculumId='picket.financial.en.v1',translationLocale='en-US',translationVersion=1,translationStatus=status,translationSource='PICKET_FINANCIAL_CURRICULUM_VI_V1.json',translationSourceLocale='vi-VN',translationAuthoredAt='2026-10-23',translationExtendedAt=ext.EXTENSION_DATE,translationIndependentReviewedAt=None)
    en['reviewedAtSemantics']='Author self-review date against REVIEW_CHECKLIST_V2_20261105.md; neither independent translation nor financial-content approval.'
    en['publicationGate']['required']=['Owner approval of the v2 self-review checklist (docs/learning/REVIEW_CHECKLIST_V2_20261105.md)','Independent financial-content review','Vietnamese-context legal/safety review for borrowing, tax, insurance and digital safety','Re-verification of dated figures (tax, deposit insurance, social insurance) before each release','Independent English translation and terminology review against the Vietnamese source','Accessibility and pilot comprehension review','Android large-font/TalkBack/offline checks']
    en['sourceUse']='Source concepts inform objectives. Scenarios and calculations originate in the Vietnamese Picket curriculum. This is an original English editorial translation, not an official translation or endorsement of source organizations. No US/EU legal rights are imported into Vietnam.'
    en['stages']=ext.stages_for('en')
    assert [s['stageId'] for s in en['stages']]==[s['stageId'] for s in vi['stages']]
    assert [s['lessonIds'] for s in en['stages']]==[s['lessonIds'] for s in vi['stages']]
    count=0
    for original,l in zip(vi['lessons'],en['lessons']):
        t=tmap[l['lessonId']]
        l.update(locale='en-US',title=t['title'],objective=t['objective'],body=t['body'],translationLocale='en-US',translationVersion=1,translationStatus=status,translationSourceLocale='vi-VN',translationIndependentReviewedAt=None)
        l['workedExample']['description']=t['example']
        l['optionalAction']['text']=t['action']
        questions=copy.deepcopy(t['questions'])
        for old,new in zip(original['questions'],questions):
            new['correctIndex']=old['correctIndex']
            assert len(new['choices'])==3
        l['questions']=questions
        for key in ['lessonId','chapterId','stageId','version','competencyId','sources','reviewedAt','status','independentReviewedAt']:
            assert original[key]==l[key],(key,l['lessonId'])
        assert original.get('citedFigures')==l.get('citedFigures')
        assert l['workedExample']['arithmeticChecks']==original['workedExample']['arithmeticChecks']
        assert l['workedExample']['currency']==original['workedExample']['currency']=='VND'
        assert [x['correctIndex'] for x in l['questions']]==[x['correctIndex'] for x in original['questions']]
        assert len(l['questions'])==3
        for c in l['workedExample']['arithmeticChecks']:
            assert re.fullmatch('[0-9+*/(). -]+',c['expression'])
            assert eval(c['expression'],{'__builtins__':{}},{})==c['expected']
            count+=1
        assert not re.findall(r'\{\{[^}]+\}\}',l['body'])
        assert numbers(original['body'])==numbers(l['body']), ('body numeric sequence',l['lessonId'],numbers(original['body']),numbers(l['body']))
    apply_study_support(en['lessons'], 'en', append_checks=False, extra_entries=ext.support_entries())
    assert en['publicationGate']['publishable'] is False
    assert source_path.read_bytes()==source_bytes
    question_count=sum(len(l['questions']) for l in en['lessons'])
    (ROOT/'PICKET_FINANCIAL_CURRICULUM_EN_V1.json').write_text(json.dumps(en,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    write_app_copy(en, 'en')
    lines=['# Picket — Financial education curriculum, English v1','',f'Editorial translation of the full Vietnamese curriculum, authored 2026-10-23 and extended {ext.EXTENSION_DATE}. **{status}**. This is not independently approved or publishable content.','','Translation locale: `en-US`; translation version: `1`; source locale: `vi-VN`. Lesson IDs intentionally remain identical to the Vietnamese source, including their `.vi.` segment: identify a localized lesson by `(lessonId, locale, version)`, not the ID alone.','','`correctIndex` is zero-based. Every choice includes its own explanation. `reviewedAt` is the author self-review date, not independent approval. `citedFigures` lists the source and date behind each regulatory number.','']
    lines[2:2] = ['> [Current project status](../PROJECT_STATUS.md). Editorial revision 3, 5 November 2026: a four-stage path with 18 new lessons (13–30); existing lesson IDs and quiz answer ordering are preserved. [Self-review checklist](REVIEW_CHECKLIST_V2_20261105.md).', '']
    stage_titles={s['stageId']:s for s in en['stages']}
    current=None
    for l in en['lessons']:
        if l['stageId']!=current:
            current=l['stageId']; st=stage_titles[current]
            lines += [f"# Stage {st['order']}: {st['title']}",'',st['summary'],'']
        lines += [f"## {l['lessonId']} — {l['title']}",'',f"**Chapter:** {l['chapterId']} · **Stage:** {l['stageId']} · **Competency:** {l['competencyId']}  ",f"**Objective:** {l['objective']}  ",f"**Status:** {status} · locale: en-US · translationVersion: 1",'',l['body'],'','### Worked example','',markdown_example(l['workedExample']['description'], 'en'),'']
        lines += [f"- `{c['expression']} = {c['expected']}`" for c in l['workedExample']['arithmeticChecks']]
        lines += ['','### Practice scenarios','']
        for i,qv in enumerate(l['questions'],1):
            lines += [f"**{i}. {qv['prompt']}**",'']+[f"- {chr(65+j)}. {c['text']} — {c['explanation']}" for j,c in enumerate(qv['choices'])]+[f"Answer: **{chr(65+qv['correctIndex'])}** (`correctIndex: {qv['correctIndex']}`).",'']
        lines += ['### Optional action','',l['optionalAction']['text']+' You may skip. No spending, financial-product signup, OTP or submission to AI is required.','']
        if l.get('citedFigures'):
            lines += ['### Dated figures and sources','']+[f"- {f['claim']} — source `{f['sourceId']}`, as of {f['asOf']}" for f in l['citedFigures']]+['']
        lines += ['### Sources','']+[f'- [Primary reference]({u})' for u in l['sources']]+['']
    lines += ['## Translation consistency checks','',f"- {len(en['lessons'])} translated bodies, {question_count} questions and {question_count*3} choice explanations; {count} arithmetic checks passed.",'- IDs, chapter/stage/competency IDs, version, correct answer positions, source URLs, cited figures, currencies and arithmetic expressions/results match the Vietnamese source exactly.','- Every numeric token in each body matches the Vietnamese body in order (English "13 July 2026" dates are normalised to d/m/yyyy before comparing).','- Source VI files were not modified; regeneration writes only EN artifacts.','- Independent financial, language and safety review and learner pilot remain outstanding.','']
    (ROOT/'PICKET_FINANCIAL_CURRICULUM_EN_V1.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps(dict(lessons=len(en['lessons']),questions=question_count,explanations=question_count*3,arithmeticChecks=count,reviewStatus=en['status'],publishable=False)))

if __name__=='__main__':
    main()
