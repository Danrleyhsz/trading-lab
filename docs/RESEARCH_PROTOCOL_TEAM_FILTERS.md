# Team filter hypotheses (`TEAM_*_V1`)

Declared on 2026-10-05. Each researcher's pilot briefing becomes a testable rule. A rule can only **veto** opening or reversing a position, never force one, so an existing position is still closed by the base signal.

## Sets

Each set is a single candidate on top of the pilot's signal (BREAKOUT, 480 hours, 10% sizing):

| Set | Rule |
|---|---|
| `BREAKOUT_480_CONTROL_V1` | No filter (control) |
| `TEAM_ORACLE_REGIME_V1` | Long only above, short only below, the **720-hour (30-day)** average |
| `TEAM_VEGA_VOLATILITY_V1` | No new exposure while 24h daily volatility exceeds 1.5× the 7-day level |
| `TEAM_SATOSHI_MOMENTUM_V1` | Entry direction must match the sign of the 24h change |
| `TEAM_COMBINED_V1` | All three |

**Why 720 hours for Oracle.** Oracle's briefing uses the 240-hour average. But a 480-hour breakout is, by definition, above every price of the last 480 hours. It is therefore always above a 240-hour average, so that filter could never veto. Found while testing, before any run.

**Flux's funding rule is not included.** The signal function only receives closed candles, not the live funding quote, so the backtest could not reproduce it faithfully.

## Acceptance (per hypothesis)

The hypothesis is accepted only if all of the following hold:

1. It is run in production with the same request as the pilot study: `{"bars":5000,"trainBars":1500,"testBars":500,"candidateSet":"<set>"}`.
2. It passes `INDEPENDENT_PAPER_SCREEN_V1` unchanged.
3. Its out-of-sample net P&L beats `BREAKOUT_480_CONTROL_V1` **run on the same dataset**.

An accepted rule may be considered for a **new** pilot after the current one ends. It is never added to a running pilot.

## First offline replay (TEST_ONLY, not paper eligibility)

`npx tsx src/team-filter-replay.ts` was run on the recorded dataset of study `d674cb32` (5 000 hours to 2026-10-04, 7 out-of-sample folds). The report is saved in `outputs/trading-lab-team-filters-offline.json`.

| Set | OOS net P&L (USDT on 10 000) | Trades | Losing folds | Screen |
|---|---|---|---|---|
| Control | +83.60 | 8 | 4 | fails: fewer than 10 trades |
| Oracle regime | +172.23 | 3 | 1 | fails: fewer than 10 trades |
| Vega volatility | +151.95 | 7 | 3 | fails: fewer than 10 trades |
| Satoshi momentum | +83.60 | 8 | 4 | fails; identical to the control (a breakout already has positive 24h momentum) |
| Combined | +172.23 | 3 | 1 | fails: fewer than 10 trades |

**Reading:**
- Oracle's and Vega's filters avoided losing entries in this sample, but 3–8 trades over seven months is not evidence.
- Satoshi's rule is redundant with a breakout.
- No hypothesis is eligible. Nothing changes in the running pilot.
