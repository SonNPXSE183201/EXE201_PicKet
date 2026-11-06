# Forecast evaluation checkpoint — 24 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


This delivers offline evaluation code and synthetic verification. It does **not**
establish forecast quality on real users, activate F1, or complete release acceptance.

## Implemented

`variable-history.ts` derives the 28 closed UTC days before a frozen origin from
an authenticated-ledger-shaped snapshot. The caller must explicitly supply the
pending-mutation count, wallet/currency scope, day-completeness attestations and
expense classifications. Zero transactions alone never imply complete zero
spending. Unclassified expenses make their day incomplete. Reviews must follow
the latest supplied transaction version and cannot come from the future.
Scheduled and one-off expenses are excluded from the variable baseline; income,
refunds and transfers never reduce gross variable spending.

`forecast-backtest.ts` reuses the existing ledger, wallet scope, recurrence,
settlement, F0 arithmetic, F1 trailing-median and evaluation functions. Every
origin is frozen at UTC day start. Schedule/link capture times and reviews must
be known by that origin; snapshots containing later versions are unusable.
Observed closing balances are evaluated only after their days close and before
the declared `observationCutoff`. This field is a dataset cutoff, not execution
time. Incomplete or missing truth excludes the whole horizon without zero filling.

The runner supports whole-week rolling origins and 7/30-day horizons. Subjects
and scenario families cannot cross development/validation/holdout splits;
duplicate windows cannot inflate sample counts. Currency minor units, horizons,
cohorts and splits remain separate. It reports median/worst MAE, missed/false
low-balance days and minimum-day error. Minimum-day ties use the first minimum,
as in the existing evaluator. F0/F1 improvement uses only paired eligible origins;
missing F1 and zero-error baselines never manufacture an improvement ratio.

## Reproduce

From `apps/mobile`, use the installed toolchain:

```powershell
npx --no-install tsx scripts/forecast-backtest.ts --synthetic --output ../../.artifacts/forecast-backtest-new.json
npx --no-install tsx scripts/forecast-backtest.ts --input path/to/dataset.json --output path/to/new-report.json
```

Choose an existing output directory and a new `.json` filename. The CLI refuses
overwrites and an output equal to its input, accepts at most 10 MiB of input,
and limits datasets to 500 origins. It does not make network calls or log input
contents. Input types are exported as `BacktestDataset` and `BacktestOrigin`.

The built-in synthetic panel has 14 origins: weekly repeats, both horizons,
one-off costs, refunds, separate USD/VND scopes, insufficient reviewed history and
incomplete truth. Twelve origins evaluate; two are excluded; two evaluated origins
abstain from F1. Linear synthetic spending deliberately produces exact F1 results
in eligible cases. That is an arithmetic fixture, **not** evidence of predictive
accuracy or a reason to select a model. The report always says
`promotionDecision: "not-evaluated"` and records its synthetic source.

## Evidence and remaining gates

- History adapter RED `1ab6832`, GREEN `644758b`; backtest RED `bb080de`.
- Full mobile suite: 586 passed. Focused changed-domain coverage: 97.83% lines,
  89.76% branches, 100% functions. Logs: `.artifacts/mobile-backtest-tests.log`
  and `.artifacts/forecast-backtest-coverage.log`.
- Native UI, Play purchases and production migrations were not exercised by this
  offline tool. Existing feature gates remain unchanged.

Caller-supplied timestamps, completeness flags and an
`authorized-observations` reference are annotations, not independent proof of
complete finances or permission to use data. A real benchmark still needs an
authorized longitudinal panel with immutable snapshots captured before outcomes,
reviewed classifications/completeness, preassigned cohorts and a locked holdout.
Current mutable ledger rows cannot reconstruct older versions. A production
snapshot collector and review UI are not claimed here. Real-panel acceptance,
calibration and independent review remain pending; overlapping windows are
correlated and cannot be treated as independent participants.
