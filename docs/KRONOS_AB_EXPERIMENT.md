# KRONOS A/B EXPERIMENT — Claude execution handoff

## Objective

Evaluate whether the open-source Kronos financial K-line foundation model adds measurable out-of-sample value to the existing Trading Lab research stack.

This is an isolated research experiment. It MUST NOT replace the existing strategy, alter XSMOM_FORWARD_V1, submit orders, enable Binance Demo/Testnet, enable autonomous execution, connect live money, or change production deployment.

Baseline repository state for this protocol:
- base branch: main
- base commit: 26d978f535b7f15e8c98c9f7fb3e27594cbfd33d
- PR #72 / XSMOM_FORWARD_V1 is already merged.
- Existing forward tracking must remain unchanged.

## Mandatory repository rules

Before implementation, Claude MUST read:
1. AGENTS.md
2. PROJECT_STATE.md
3. docs/DEVELOPMENT_QUEUE.md
4. README.md
5. this document

Then inspect current git status, recent commits, existing historical-study/data abstractions, tests, package scripts and CI.

Do not merge to main. Work on a new feature branch based on current main and open a draft PR. Do not deploy.

All instructions required to reproduce the experiment must remain in Git. Do not rely on chat context.

## External model

Upstream:
https://github.com/shiyu-coder/Kronos

Initial model:
- NeoQuasar/Kronos-mini
- tokenizer: NeoQuasar/Kronos-Tokenizer-2k
- 4.1M parameters
- context length: 2048

Kronos-small MAY be tested only as a secondary comparison after the mini pipeline is reproducible. Do not introduce Kronos-base or paid compute in the first increment.

Pin exact Python dependencies/versions used by the experiment in repository-controlled dependency files. Record upstream model/revision identifiers and hashes when available. Do not commit downloaded model weights.

## Isolation

Implement Kronos as an offline/analysis-only adapter. It must have no access to:
- paper broker/order submission;
- risk approval mutation;
- Binance authenticated endpoints;
- Testnet/Demo credentials;
- live-money adapters;
- production secrets;
- autonomous execution switches.

Prefer reuse of retained historical datasets already available in Trading Lab. Any new public dataset acquisition must use the project's existing market-data boundaries and must persist source identity, timestamps and evidence hashes.

## Data contract

Input to Kronos:
- timestamp
- open
- high
- low
- close
- volume when available

Never expose future candles to the model.

For every prediction at time t:
- model context ends at or before t;
- forecast is generated before any target candle is read;
- target candles are used only for scoring after prediction;
- all normalization/preprocessing must be fitted using information available at t.

Reject non-finite, duplicated, non-monotonic or incorrectly ordered input.

## Experiment design

Create two strictly comparable paths over identical evaluation windows:

A. BASELINE
Existing Trading Lab strategy/research behavior, unchanged.

B. KRONOS-AUGMENTED
Existing behavior plus a Kronos forecast-derived advisory feature.

Kronos is evidence, not execution authority.

The first implementation MUST NOT silently invent a trading rule from predicted absolute prices. Define a versioned transformation from forecast to an advisory signal, with thresholds declared before evaluation.

At minimum retain:
- model/version/revision;
- input window boundaries;
- forecast horizon;
- source/evidence hash;
- raw forecast;
- derived signal;
- baseline decision;
- augmented decision;
- realized target after the horizon;
- costs/assumptions;
- experiment version.

## Leakage controls

Use chronological train/calibration/evaluation ordering.

No random shuffled train/test split.

Thresholds, transformations or ensemble weights may be selected only on train/calibration data. Freeze them before final evaluation.

Do not tune on the final test period and rerun until profitable.

If multiple configurations are tried, retain all attempts, including failures.

For overlapping forecast horizons, report that observations are dependent and avoid treating each overlap as an independent sample.

## Evaluation

Compare baseline and Kronos-augmented variants on the SAME:
- symbols;
- timestamps;
- candle source;
- capital assumptions;
- fees;
- spread/slippage assumptions;
- funding assumptions when applicable;
- execution timing;
- position/risk constraints.

Report at least:
- net P&L after modeled costs;
- maximum drawdown;
- Sharpe using the repository's documented convention;
- profit factor;
- win rate only where closed-operation evidence supports it;
- number of trades/signals;
- turnover;
- gross vs net result;
- directional forecast accuracy;
- MAE/RMSE or another explicit forecast-error metric;
- coverage / rejected predictions;
- inference time and resource use.

Do not promote forecast accuracy as profitability.

## Required robustness checks

1. Walk-forward / rolling chronological evaluation.
2. Multiple market regimes when retained data permits.
3. Costs increased above baseline assumptions.
4. Kronos disabled control reproduces baseline.
5. Determinism/reproducibility check where sampling permits. Record seeds and sampling parameters.
6. Missing/stale/invalid-data failure tests.
7. Model unavailable/download failure must fail closed and leave baseline intact.
8. Look-ahead/leakage regression tests.
9. Verify no broker/order events are emitted by the experiment.

## First scope

Start small:
- Kronos-mini only;
- BTC first for pipeline validation;
- reuse existing historical data;
- no cloud GPU purchase;
- no new paid service;
- no production deployment.

After the BTC pipeline passes reproducibility/leakage tests, the experiment MAY be extended to the repository's already-declared multicoins universe, without changing that universe after seeing Kronos results.

Do not modify the running 12-week XSMOM_FORWARD_V1 protocol. This experiment is independent historical evidence and must not contaminate the forward test.

## Repository deliverables

Claude must commit:
1. implementation code;
2. pinned dependency/environment setup;
3. a one-command or clearly documented reproducible runner;
4. unit/integration tests;
5. leakage regression tests;
6. fixtures small enough for CI where necessary;
7. experiment configuration files;
8. README/runbook with exact commands;
9. machine-readable results (JSON/CSV as appropriate);
10. human-readable report;
11. provenance/model/source metadata;
12. failures and rejected runs, not only successful runs.

Large model weights and large raw datasets must NOT be committed. Document deterministic acquisition/cache paths and verify hashes/identities.

## Suggested repository layout

Adapt to existing architecture rather than forcing this layout:

- experiments/kronos/
  - README.md
  - configs/
  - scripts/
  - results/
- src/.../kronos adapter at the appropriate existing analysis boundary
- tests/... corresponding to the existing test organization

Do not create a parallel trading engine.

## Acceptance criteria

The draft PR is ready for review only if:
- existing test suite still passes;
- new Kronos tests pass;
- baseline behavior is unchanged with Kronos disabled;
- no order/broker mutation is reachable from Kronos code;
- leakage tests pass;
- a small reproducible BTC experiment completes;
- results include costs and baseline comparison;
- exact commands are documented in Git;
- no secret/model weight/large accidental artifact is committed;
- CI status is reported truthfully.

A profitable result is NOT an acceptance criterion.

## Stop conditions

Stop and document instead of improvising if:
- required historical evidence is missing;
- source chronology cannot be guaranteed;
- model dependency cannot be installed reproducibly;
- memory/runtime requirements exceed existing approved resources;
- integration would require enabling execution, Testnet, paid AI or a new paid service;
- a required change would alter XSMOM_FORWARD_V1.

## Claude final report format

At completion, write a repository report containing:
- branch and commit SHA;
- files changed;
- exact commands executed;
- tests and CI results;
- dataset/source period and hashes;
- Kronos model/revision;
- baseline metrics;
- augmented metrics;
- delta;
- robustness results;
- known limitations;
- whether Kronos showed incremental value;
- recommendation: reject, continue research, or prepare a separate reviewed next experiment.

Do not merge or deploy. Await human review.


## Multi-model comparison extension

Run the experiment as four strictly comparable arms, using identical evaluation windows, symbols, candle source, capital, fees, spread/slippage, funding assumptions, execution timing, risk constraints and frozen scoring rules:

A. TRADINGLAB-BASELINE — existing research behavior unchanged.

B. KRONOS-ORIGINAL — upstream shiyu-coder/Kronos, beginning with Kronos-mini as already specified above.

C. KRONOS-BTC-FINETUNED — evaluate the open-source BTC/USDT fine-tuned Kronos candidate from Liucong-JunZi/Kronos-Btc-finetune, specifically the 1h/4h variants when compatible with the retained Trading Lab data. Treat this as an external research artifact: inspect its code, training/evaluation assumptions, license, weights provenance and potential leakage before use. Pin the exact repository commit/model revision actually tested. If provenance, licensing, chronology or reproducibility cannot be established, mark this arm rejected/unavailable rather than improvising.

D. CRYPTOMAMBA — evaluate MShahabSepehri/CryptoMamba as a crypto-specific candidate. Inspect and pin the exact upstream commit, dependencies, data preprocessing and model configuration. Its published/default BTC daily setup must NOT be presented as evidence for 1h/4h performance. Any adaptation to Trading Lab timeframes must be versioned, calibrated only on pre-test data and reported separately from upstream/default behavior.

### Fair-comparison requirements

- No model may receive candles or derived information unavailable to the other arm at prediction time.
- Use a shared canonical OHLCV/evaluation dataset wherever model input contracts permit.
- Do not alter the final test interval, cost model or Trading Lab universe after seeing any model result.
- Model-specific calibration is allowed only on chronological train/calibration periods and must be frozen before final evaluation.
- Record all failed configurations and rejected predictions.
- Compare both forecast quality and trading utility; lower forecast error alone is not a win.
- Keep raw model forecasts separate from the versioned rule that maps forecasts into advisory trading signals.
- No model gets order authority. All four arms remain offline historical research only.

### Required comparison output

Produce one consolidated machine-readable comparison plus a human-readable table containing, for every valid arm and timeframe: net P&L after costs, max drawdown, Sharpe, profit factor, win rate where supported, trades/signals, turnover, gross vs net result, directional accuracy, forecast error, coverage/rejections, inference time and resource use.

Also report pairwise deltas versus TRADINGLAB-BASELINE and rank candidates separately by: (1) risk-adjusted trading result, (2) drawdown, (3) robustness across walk-forward windows/regimes, and (4) compute/resource cost. Do not collapse these into a single opaque score.

### Staged execution

First prove the shared pipeline and leakage controls with BTC and the smallest practical model/configuration. Then run the comparable 1h/4h arms supported by the retained dataset. A model that cannot validly support a timeframe must be marked N/A; do not fabricate an adaptation merely to fill the table.

Only after the BTC comparison is reproducible may a candidate extend to the repository's pre-declared multicoins universe. The universe must remain frozen before results are inspected.

### Updated decision rule

The purpose is model selection, not confirmation of Kronos. The final report must recommend one of: keep baseline only; continue research on Kronos original; continue research on Kronos BTC fine-tune; continue research on CryptoMamba; or continue more than one candidate because evidence is inconclusive. A profitable result by itself is insufficient. Prefer evidence that survives costs, walk-forward testing, regime changes and leakage checks.

The existing XSMOM_FORWARD_V1 12-week forward protocol remains untouched and independent from this multi-model historical experiment.
