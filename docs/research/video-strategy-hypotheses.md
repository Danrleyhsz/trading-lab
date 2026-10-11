# Video Strategy Hypotheses

> Status: research only. Nothing in this document is a validated trading edge.
> Source: strategy/indicator videos reviewed on 2026-10-06.
> Rule for agents: DO NOT promote any hypothesis below to production, live trading, or a "validated strategy" without reproducible backtests, out-of-sample/walk-forward validation, fees/slippage and robustness checks.

## Purpose

Preserve the useful technical ideas extracted from the reviewed videos so future agents (including Claude) can implement experiments without relying on the original videos or on visual interpretation alone.

The correct workflow is:

1. Translate each idea into deterministic, testable rules.
2. Test each hypothesis independently first.
3. Establish a baseline.
4. Only then test combinations.
5. Reject results that depend on narrow parameter choices or fail out-of-sample.
6. Never infer profitability from screenshots or examples shown by a content creator.

## Research priority

1. VWAP
2. Statistical support/resistance
3. Percentage deviation from moving average
4. Automatic Fibonacci retracement
5. Flag/continuation pattern detector
6. Calendar effects

Priority reflects usefulness/testability for the current crypto research environment, not proven profitability.

---

## H01 - Automatic Fibonacci Retracement

### Observed concept

Automatically identify a relevant swing high and swing low, then derive Fibonacci retracement levels.

Levels explicitly observed:

- 0%
- 23.6%
- 38.2%
- 50%
- 61.8%

The video also changed a "Period" parameter. Changing this window materially changed the selected structure and therefore the Fibonacci levels.

### Research implementation

Do not hard-code a visually convenient period. Parameterize swing detection.

Candidate variables:

- lookback / period
- swing-high algorithm
- swing-low algorithm
- minimum impulse size
- ATR-normalized impulse threshold
- trend direction
- retracement level touched
- touch tolerance
- confirmation rule after touch
- stop placement
- target / exit rule
- maximum bars after impulse

Candidate retracement levels should at least include 0.236, 0.382, 0.50 and 0.618.

### Questions to test

- Does any retracement level outperform a baseline?
- Does performance depend on trend regime?
- Is 0.50 useful even though it is not a Fibonacci ratio?
- Does confluence with VWAP or statistical support/resistance improve results?
- How sensitive are results to swing-detection parameters?

### Main risk

Strong overfitting risk from selecting a lookback after visually inspecting the chart.

---

## H02 - Percentage Deviation From Moving Average

### Observed configuration

The video showed an oscillator measuring price displacement from a moving average.

Observed settings:

- HO Period: 25
- HO Type: MMS
- Upper % Level: +3
- Lower % Level: -3

Interpret "MMS" according to the original platform/indicator implementation before reproducing it. Do not silently assume an MA type if the mapping is uncertain.

### Core formula

A generic implementation can start from:

```
deviation_pct = ((price - moving_average) / moving_average) * 100
```

The +3% and -3% levels are video parameters, not validated crypto thresholds.

### Parameter space

Test, at minimum:

- MA periods: 10, 20, 25, 50 and additional values justified by the experiment
- deviation thresholds: 1%, 1.5%, 2%, 2.5%, 3%, 4%
- MA type where applicable
- close vs typical price
- long and short independently
- trend-filtered vs unfiltered
- volatility-normalized variants

Crypto assets have materially different volatility. A fixed 3% threshold should be compared against ATR/realized-volatility-normalized thresholds.

### Hypotheses

Mean reversion:
- extreme negative deviation may precede reversion toward the mean
- extreme positive deviation may precede reversion toward the mean

Trend continuation must also be tested as a competing explanation. An extreme deviation can represent momentum rather than exhaustion.

---

## H03 - VWAP

### Observed concept

VWAP was a central indicator in the reviewed material. The examples emphasized price displacement from and interaction with VWAP.

The video evidence does not justify a simplistic rule such as "touch VWAP = buy".

### Experiments

Test VWAP in at least three distinct roles.

#### A. Trend/regime filter

- price above VWAP favors long candidates
- price below VWAP favors short candidates

Treat this as a hypothesis, not a rule.

#### B. Mean reversion

Measure distance from VWAP and test whether extreme displacement predicts reversion.

Candidate features:

- raw percentage distance
- ATR-normalized distance
- realized-volatility-normalized distance
- bars since last VWAP interaction
- volume regime

#### C. Dynamic support/resistance and retest

Detect:

1. cross/break
2. displacement
3. retest
4. rejection/acceptance
5. subsequent return

Session anchoring must be explicit. For 24/7 crypto, test sensible session definitions and anchored variants rather than assuming an equity-market convention transfers directly.

---

## H04 - Statistical Support and Resistance

### Observed concept

The video used automatically detected support/resistance zones and displayed statistics including:

- Retests
- Breakouts
- Held (%)

This is particularly useful because it turns a subjective chart line into measurable features.

### Proposed zone features

For every detected zone, record:

- price bounds / zone width
- creation timestamp
- age
- number of touches/retests
- number of successful holds
- number of breakouts
- hold rate
- breakout rate
- reaction magnitude after each touch
- volume at/around the zone
- time spent in the zone
- current distance from zone
- ATR-normalized distance
- prior role: support/resistance
- support/resistance flip after breakout

Example conceptual statistic:

```
hold_rate = successful_holds / eligible_retests
```

The exact definition of an eligible retest and successful hold MUST be specified before testing to avoid hindsight bias.

### Important safeguards

A zone must be constructed using information available at that historical timestamp. Never let future pivots retroactively improve an old zone during backtest.

Test zone strength statistically instead of assuming "more touches = stronger".

---

## H05 - Flag / Continuation Pattern

### Observed concept

The material showed an impulsive move ("flagpole"), followed by a smaller consolidation/channel ("flag"), then a breakout. The example used breakout entry logic, structural stop placement and a target related to the flagpole magnitude.

### Need for deterministic detection

Do not implement this from visual resemblance.

Candidate features:

- minimum impulse return
- impulse duration
- impulse relative to ATR
- flag duration
- correction depth as % of impulse
- channel/regression slope
- range contraction
- volatility contraction
- volume behavior
- breakout distance
- breakout close confirmation
- retest after breakout
- invalidation point

### Exit experiments

Compare:

- fixed R multiple
- measured-move / flagpole projection
- ATR target
- trailing stop
- opposing structure
- time stop

Bull and bear flags must be tested independently.

---

## H06 - Calendar / Time Effects

### Observed material

One video associated market movement with a religious/calendar event (including Yom Kippur). The video is not evidence of causality and this claim must NOT be encoded as a trading rule.

### Useful research abstraction

The broader, testable idea is market seasonality / calendar effects.

Potential variables:

- hour of day
- day of week
- weekend vs weekday
- UTC daily close/open windows
- weekly/monthly boundaries
- major US market sessions
- scheduled macro events when a reliable point-in-time dataset exists
- derivatives expiry/funding windows when data exists
- holidays/calendar events only when there is a defensible research question

Use multiple-testing correction or other safeguards when scanning many calendar categories. Avoid post-hoc storytelling.

---

# Combination Experiments

Do not start here. First establish independent results for H01-H06.

## C01 - Trend pullback confluence

Candidate structure:

```
trend regime
AND price aligned with VWAP regime
AND retracement into Fibonacci 0.50/0.618 region
AND overlap with statistically significant support/resistance zone
AND confirmation trigger
```

Purpose: test whether confluence improves risk-adjusted results relative to each component and a simpler baseline.

## C02 - Mean reversion confluence

Candidate structure:

```
extreme VWAP displacement
AND extreme MA percentage deviation
AND nearby statistical support/resistance
AND volatility/regime filter
```

Do not require all conditions by default. Compare incremental feature value and signal frequency.

## C03 - Trend continuation

Candidate structure:

```
strong impulse
AND deterministic flag pattern
AND structure breakout
AND optional VWAP/trend alignment
AND optional volume confirmation
```

Compare breakout entry vs breakout-and-retest entry.

---

# Backtest Requirements

Every experiment derived from this document should report, where applicable:

- symbols/assets tested
- exchange/data source
- market type: spot/futures
- timeframe
- date range
- number of trades
- long/short split
- win rate
- average win
- average loss
- expectancy
- profit factor
- net PnL/return
- max drawdown
- Sharpe/Sortino when appropriate
- exposure
- average holding time
- fee assumptions
- slippage assumptions
- funding impact for perpetual futures where applicable

## Validation

Required before calling a strategy promising/validated:

- in-sample vs out-of-sample separation
- walk-forward analysis where appropriate
- parameter sensitivity / stability
- multiple assets
- multiple market regimes
- realistic fees
- realistic slippage
- no look-ahead bias
- no future leakage in swing/zone/pattern detection
- benchmark against simple baselines
- sufficient sample size

A strategy that works only at one exact parameter combination should be considered fragile until proven otherwise.

---

# Suggested Experiment Architecture

Keep these concepts as research modules/features rather than immediately wiring them into execution.

Suggested conceptual separation:

```
research/
  features/
    vwap
    ma_deviation
    fibonacci
    support_resistance
    chart_patterns
    calendar
  hypotheses/
  backtests/
  reports/
```

This path is illustrative. Before creating code, inspect the existing repository architecture and follow its conventions instead of forcing this directory structure.

Each experiment should have:

- hypothesis ID
- implementation/version
- parameter set
- dataset fingerprint/version
- run timestamp
- deterministic seed where relevant
- metrics
- artifacts/results
- conclusion: rejected / inconclusive / candidate for further validation

---

# Agent Instructions

When Claude or another coding agent reads this document:

1. Inspect the current repository and existing experiment/backtest architecture first.
2. Do not rewrite existing architecture just to match this document.
3. Do not implement all hypotheses at once.
4. Prefer small, independently testable modules.
5. Preserve reproducibility.
6. Never label social-media/video claims as facts.
7. Separate observed video settings from parameters introduced for experimentation.
8. Document any assumption required because a video was ambiguous.
9. Do not connect real money or enable live execution as part of this research.
10. Return experiment evidence, not screenshots selected by eye.
11. If an existing feature already implements one of these ideas, audit/reuse it rather than creating a duplicate.
12. Do not merge to main automatically.

# Current Recommended Order

Start with:

1. VWAP feature + standalone experiment
2. statistical support/resistance
3. MA percentage deviation
4. automatic Fibonacci
5. deterministic flag detector
6. calendar-effect research

After standalone validation, test C01-C03 only if the underlying components show enough evidence to justify combination tests.

# Research Note

The reviewed videos are idea sources only. Their displayed examples may be cherry-picked and do not constitute evidence of an edge. The goal of TradingLab is to convert those ideas into falsifiable hypotheses and let historical/out-of-sample evidence decide whether they survive.

---

# Addendum 2026-10-10 - ICT / Smart Money Concepts video (H07-H11)

Source: Reels "Entenda esses 5 conceitos de ICT" (@trading.de.livro, 2026-10-09), an advertisement for the book *A Mente Institucional*. Idea source only.

Concepts converted into deterministic, falsifiable rules (all thresholds introduced by the protocol, none come from the video):

- H07 Order Block
- H08 Liquidity Sweep
- H09 Displacement (momentum and FVG retrace)
- H10 Inverted Fair Value Gap
- H11 Internal Range Liquidity

Full rules, grid (23 configurations, 78 cumulative trials) and the added random-entry placebo criterion: `docs/PROTOCOLO_HIPOTESES_ICT.md` (VIDEO_HYPOTHESES_V2_ICT).
