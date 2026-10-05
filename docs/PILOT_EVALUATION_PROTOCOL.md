# Pilot evaluation protocol (`PILOT_EVALUATION_V1`)

Declared on 2026-10-05, while the continuous paper pilot had made only "stay flat" decisions and no pilot trade. The criteria below are fixed before any outcome is known. Changing them needs a new version, not an edit.

## What is measured

The pilot starts at the first recorded `AUTONOMOUS_DECISION` on `evaluation:nova:usdm`. Fills before that moment (the controlled-paper acceptance trades) are excluded.

| Metric | Definition |
|---|---|
| Pilot P&L | Account equity now minus equity at the last recorded point before the first decision |
| Decisions | Count and direction (long / short / flat) of every hourly decision |
| Closed trades | Round trips opened after the start, from the account ledger |
| Costs | Fees and funding from fills and settlements after the start |
| Max drawdown | Maximum observed by the paper book |
| Flat benchmark | 0 USDT |
| Same-exposure buy and hold | Start equity × 10% (the study's position size) × BTC return from the first decision's last closed candle to the current mark |

## Verdict, in order

1. **STOPPED_BY_LOSS_LIMIT:** the pilot loss limit (3%) stopped it.
2. **IN_PROGRESS:** the cycle is still enabled and the study is still eligible. The report shows a *provisional* verdict.
3. **INSUFFICIENT_EVIDENCE:** fewer than **3 closed trades**.
4. **OUTPERFORMED:** P&L above zero and above same-exposure buy and hold.
5. **POSITIVE_BELOW_BENCHMARK:** P&L above zero but not above buy and hold.
6. **UNDERPERFORMED:** P&L zero or negative.

## Pre-declared next step

| Verdict | Next step |
|---|---|
| STOPPED_BY_LOSS_LIMIT | End the strategy and record the lesson. No new pilot with the same study. |
| INSUFFICIENT_EVIDENCE (expected for a 480-hour breakout over one week) | Do not extend automatically. Re-run the screen on fresh data, including the team filter sets (RESEARCH_PROTOCOL_TEAM_FILTERS.md). Start another pilot only with an eligible study. |
| OUTPERFORMED | Candidate for a second, longer (30-day) paper pilot with the study re-screened on fresh data. Still no real money. |
| POSITIVE_BELOW_BENCHMARK / UNDERPERFORMED | End the strategy and record the lesson. |

`GET /paper/perpetual/pilot/report` computes all of this from recorded data. The office shows it in **Relatórios**.
