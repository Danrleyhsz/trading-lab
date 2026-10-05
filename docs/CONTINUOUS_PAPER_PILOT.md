# Continuous paper pilot (phase `CONTINUOUS_PAPER_PILOT`)

Declared 2026-10-04, before activation. Paper only: simulated fills against real Binance USD-M quotes in the independent `evaluation:nova:usdm` account (endowment 1 000 USDT). The fund, the other seven accounts, real money, exchange credentials and paid AI are out of scope.

## Why this study, and what it is not

Study `d674cb32-2ba0-4f9a-854e-9c1d4f656592` (`MULTI_DAY_TREND_V1`, one pre-declared run) passed `INDEPENDENT_PAPER_SCREEN_V1` without any threshold change. Its out-of-sample result was +22.97 USDT on 10 000 simulated capital: 7 folds, 21 trades, all fold drawdowns ≤ 1.34%, no liquidations.

That evidence is weak, and the owner was told so before choosing to proceed:
- without its single best trade the result would be −163;
- it trailed passive BTC exposure over the same window;
- the last three folds lost.

The pilot exists to collect clean forward evidence. It is **not** a claim of a profitable strategy.

## What runs

The cycle evaluates each closed hourly candle with the configuration of the study's last fold. At the time of declaration that configuration is a 480-bar breakout. It sizes new positions at 10% of equity, 1x. Every order goes through the unchanged deterministic risk engine (20% position, 10% drawdown and 5% daily loss limits, kill switch).

A durable cursor is saved before execution, so a restart never repeats a candle.

## Pre-declared stop rules (enforced in code)

| Rule | Effect |
|---|---|
| Nova equity ≤ 97% of the 1 000 endowment (`PILOT_MAX_LOSS`, default 0.03, must stay below the 10% risk limit) | Close the open position through risk, halt new exposure (persisted), emit `AUTONOMOUS_PILOT_STOPPED` / `PILOT_LOSS_LIMIT`. The hourly monitor emails the owner because `halted` is set. |
| Study no longer eligible (the screen's 7-day evidence age expires around 2026-10-11 20:00 UTC, or any check fails) | Close the open position through risk and open nothing new. Emit `STUDY_NOT_ELIGIBLE`. This makes the pilot about one week long. Continuing requires a new reviewed decision. |
| Deployed commit ≠ `CONTINUOUS_RELEASE_COMMIT` (Render's `RENDER_GIT_COMMIT`) | The cycle stays disabled with reason `RELEASE_NOT_APPROVED`. The service keeps serving; nothing crashes. |
| A failed attempt (for example source HTTP 418) | Retry only after 5 minutes. Cycle errors no longer mark the market source unavailable. The monitor alerts on `autonomousLastAttemptFailed`. |

## Activation (owner's final approval required)

1. Deploy this release as usual (inert: the phase stays `CONTROLLED_PAPER` and autonomy stays `false`).
2. In Render → Environment set:
   - `CLOUD_LAUNCH_PHASE=CONTINUOUS_PAPER_PILOT`
   - `AUTONOMOUS_PERPETUAL_ENABLED=true`
   - `AUTONOMOUS_STUDY_ID=d674cb32-2ba0-4f9a-854e-9c1d4f656592`
   - `CONTINUOUS_RELEASE_COMMIT=<the exact deployed SHA>`

   Then save and deploy. The launcher refuses any other combination: autonomy outside this phase, a missing or non-UUID study, a missing pin, an invalid loss limit, or legacy/AI capabilities.
3. Verify `/paper/perpetual/preflight` shows `release.releasePinned: true` and `activationReady: true`, and `/runtime/readiness` shows `paper.autonomous.ready`.
4. Verify the first `AUTONOMOUS_DECISION` within about an hour, plus its cursor and ledger.

## Rollback

Set `CLOUD_LAUNCH_PHASE=CONTROLLED_PAPER` and `AUTONOMOUS_PERPETUAL_ENABLED=false`, remove `AUTONOMOUS_STUDY_ID`, and deploy. An open position stays in the ledger and can be reduced through the normal risk-checked order route. Nothing is deleted or rewritten.

## Team participation (advisory)

Each hourly pilot decision is published to the team as structured agent messages, visible in the office's agent communication panels:
- **Satoshi:** 24h and 7d momentum.
- **Vega:** daily realized volatility, 24h vs 7d.
- **Flux:** funding rate, spread and last settled funding.
- **Oracle:** regime relative to the 240-hour average.
- **Nova:** the execution plan from the screened study's signal.
- **Sentinel:** the deterministic risk decision on every pilot order.

Researcher findings are **advisory context only** (`advisoryOnly: true`). They are computed from the same closed candles and live quote, but they do not change the decision, because no combined rule has been tested. A failing briefing can never block a decision.

## Accelerated team drill (TEST_ONLY)

`STUDY_FILE=<full study JSON> HOURS=336 REPORT_PATH=drill.json npm run team-drill` replays recorded real candles hour by hour. It uses the production cycle, paper book, risk engine and team briefing, entirely in memory. There is no database, no exchange and no production access. Study eligibility is stubbed, because the live screen remains the authority.

Results on 2026-10-04 with study d674cb32's own dataset:

| Window | Decisions | Messages per researcher | Sentinel reviews | Fills | Funding settlements | Failures |
|---|---|---|---|---|---|---|
| 14 days (2026-09-20 → 10-04) | 337 | 337 each | 1 (approved) | 1 | 40 | 0 |
| 125 days (2026-06-01 → 10-04) | 3 001 | 3 001 each | 7 (approved) | 7 | 374 | 0 |

The drill's equity is **not performance evidence**: the replay overlaps the study's own training and test data. It proves the team pipeline, nothing about edge.
