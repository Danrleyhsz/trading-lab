# Pre-declared research protocol: MULTI_DAY_TREND_V1

Declared 2026-10-04, before any study with this candidate set was executed. The set name, candidates, windows and pass criteria below are fixed. A changed idea gets a new set name and a new declaration. This document is never edited to fit an outcome.

## Context: what has already failed

| Study | Candidate set | Windows (bars/train/test) | OOS folds | Closed trades | OOS net P&L (sim. 10 000 USDT) | Screen |
|---|---|---|---|---|---|---|
| d0c3bbe7 | SHORT_HORIZON_V1 | 1000/400/100 | 6 | 44 | −131.51 | rejected: P&L |
| 81b94121 | SHORT_HORIZON_V1 | 3000/1200/300 | 6 | 97 | −286.67 | rejected: P&L |

Both are preserved as failures. SHORT_HORIZON_V1 (SMA 10/30, 20/60, 5/20; 30-bar breakout; 30-bar z-score mean reversion) is not re-run with other windows.

## Hypothesis

On BTCUSDT USD-M, hourly signals with 5–60 bar look-backs trade too often for their edge. Each round trip costs about 0.13% of notional (0.055% fee plus 1 bp slippage per side), before funding. The 3000-bar study closed 97 trades, so costs alone took a material share of the loss.

A trend signal with a multi-day look-back trades an order of magnitude less. Published work on time-series momentum in futures and in crypto assets reports persistence at multi-day to multi-week horizons. That is a prior, not evidence for this market and period. This protocol tests whether such a signal survives the same costs, funding and walk-forward discipline as the failed set.

## Fixed candidates (`MULTI_DAY_TREND_V1`)

All candidates use the unchanged simulator, costs and sizing: fee 0.00055, slippage 1 bp, position fraction 0.1, 1x, maintenance 1%, liquidation fee 0.5%, simulated capital 10 000.

1. SMA crossover 48/240 (2 days / 10 days of hourly closes).
2. SMA crossover 72/480 (3 days / 20 days).
3. Breakout over the prior 480 bars (20-day high/low channel), holding until the opposite break.

As before, each fold selects one candidate by training net P&L only.

## Fixed run

- Request: `{"bars":5000,"trainBars":1500,"testBars":500,"candidateSet":"MULTI_DAY_TREND_V1"}`. This is about 208 days of closed hourly candles, seven non-overlapping 500-bar OOS folds, and no excluded tail.
- It is executed **once**, only after this protocol is merged into the deployed release and the owner approves.
- Before the POST, the study list is checked for an existing request with these exact parameters. An uncertain response is resolved by reading the list, never by a second POST.

## Pass criteria (unchanged)

The existing `INDEPENDENT_PAPER_SCREEN_V1` applies without modification:
- at least 3 folds and 10 closed trades;
- positive, reconciled OOS P&L;
- zero modeled liquidations;
- per-fold drawdown of 15% or less;
- recorded dataset hash, exact windows and recent evidence.

A low-turnover set can fail the 10-trade minimum. That outcome is recorded as a rejection, and the minimum is not lowered.

## Known limitations, stated before the run

- **Overlap.** The newest ~125 days of the 208-day window overlap data already seen through two aggregate SHORT_HORIZON_V1 results. No multi-day parameter was tuned on those results, but the choice to look at longer horizons was made after seeing them.
- **Selection.** Picking 3 candidates per fold is a mild multiple-comparison risk.
- **Fidelity.** Sampled marks and the simplified margin model are not exchange parity.
- **Scope.** A pass does not certify future performance. It only qualifies the study for review as the explicit study ID of a bounded independent paper pilot, which still requires off-provider backups, external alerts and a reviewed continuous launch phase.

## Outcome handling

- **Rejected:** keep the study and stop this family. No shorter or longer variants are searched to obtain a pass.
- **Eligible:** do not auto-select the study. The owner reviews the source evidence, fold breakdown, turnover and funding before any configuration change.
