# Guest planning integrity checkpoint — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Completed this increment:
- Guest budget spending now shares refund/split calculation with the overview, excludes deleted rows, and uses exact integer proportional refund rounding.
- Transfers reject negative source limits, invalid limits and destination overflow. Rollover rejects invalid or excessive limits.
- Guest month close derives current live totals rather than trusting totals captured by a screen, validates metadata and rejects unsafe totals. Exact next-month UTC midnight is permitted.
- Month-close review is invalidated when ledger, allocations, budgets or limits reload. An older native confirmation cannot reuse a newer review. Deleted transactions are excluded from displayed month totals.

Validation: 716/716 mobile tests passed; focused 16/16 tests passed again after the translated review hint; mobile typecheck passed; lint has 0 errors and 24 existing warnings; Android JavaScript export passed. RED commits ff14e30 and 30bc401 preserve reproduction.

Limits: client review fencing does not establish an atomic server revision contract. Existing currency/month-key conventions and historical closes are unchanged. Native device acceptance, Google Play sandbox cycles and the required tester cohort remain outstanding. This is not final release acceptance. No production writes or paid services were activated.

## Backup validation continuation
Planning restore now rejects unsupported methods, malformed month keys, negative/fractional/over-cap period limits, mismatched close months, unsafe totals and invalid close metadata. Negative net expense remains valid for refunds. Historical totals are validated, not recomputed or rewritten. Existing empty and older compatible backups continue to pass.

Evidence: RED ba2c9c6; 33 export/restore tests and all 718 mobile tests pass. Typecheck passes; lint has 0 errors and 24 existing warnings. This data-only validator change does not establish native picker/filesystem acceptance or complete the remaining product/release gates. Logs: .artifacts/backup-planning-{tests,types,lint}.log.

## Backup identity continuation
All six financial collections now reject duplicate IDs before restore. IDs remain scoped to their own collection; no imported record is silently merged or discarded. RED 5190fc2c reproduced four previously accepted duplicate collections. The full mobile run passed 722 tests; an additional wallet/transaction compatibility test was then added and the 38-test export/restore suite passed. Typecheck passed. This is collection identity validation, not comprehensive validation of every backup field or native restore acceptance.

## Backup allocation continuation
Restore validates split arrays, transaction ownership, existing category references, positive bounded integer amounts and globally unique split IDs. Live split totals use integer arithmetic and cannot exceed the transaction amount; deleted splits remain preserved and excluded from live totals. Partial allocations and empty arrays remain compatible. RED f11d47e6 reproduces malformed acceptance. All 725 mobile tests passed; the 40-test export suite passed again after a TypeScript narrowing correction, and typecheck passed. This does not certify all backup fields, native restoration or full release acceptance. Evidence: .artifacts/backup-splits-{tests,focused,types}.log.

## Backup budget continuation
Restore now validates budget category references, nonnegative bounded integer limits, integer alert thresholds 1–100, boolean active state, string names and optional three-letter currency codes. Zero limits and inactive budgets remain valid; no existing records are rewritten. RED b183e073 reproduces invalid acceptance. All 727 mobile tests and 42 export/restore tests pass; typecheck passes. Evidence: .artifacts/backup-budgets-{tests,focused,types}.log. Native/device, server and release gates remain outstanding.

## Backup payment schedule continuation
Restored bills now validate title, positive bounded integer amount, parseable due timestamp and supported status. Recurring expenses additionally validate supported cadence (including legacy custom), cycleMonths 1–120, alertDays 0–365, active/note fields and wallet/category references. No schedule is rewritten or reminder dispatched during validation. RED 9f5d9b7f reproduces invalid acceptance. All 729 mobile tests and 44 export tests pass; typecheck passes. Evidence: .artifacts/backup-payments-{tests,focused,types}.log. Parseable timestamps retain the existing date semantics; this is not a full strict-calendar, bill-payment-link or native reminder acceptance claim.

## Backup schedule calendar continuation
Bill and recurring-expense dates now require a real ISO calendar day and valid clock, rejecting impossible dates that Date.parse silently normalizes and ambiguous locale strings. Valid leap days, fractional ISO seconds, timezone offsets and legacy local ISO timestamps remain unchanged. Transaction/close timestamp validation is not changed by this increment. RED 162db43f; all 731 mobile tests and 46 export tests pass; typecheck passes. Evidence: .artifacts/backup-calendar-{tests,focused,types}.log. This does not replace native reminder/timezone acceptance or remaining product/release work.
