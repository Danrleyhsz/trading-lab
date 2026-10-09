# FREQTRADE / FREQAI TECHNICAL AUDIT — Claude handoff

## Goal
Audit Freqtrade and FreqAI as crypto-trading references for TradingLab. Identify reusable ideas/components and evidence-backed improvements. Do not replace TradingLab wholesale and do not integrate anything merely because Freqtrade implements it.

## Safety and isolation
This is research only. Do NOT enable real orders, Binance Demo/Testnet, authenticated trading endpoints, production secrets, paid AI/services, autonomous execution, or deployment. Do NOT modify XSMOM_FORWARD_V1 or contaminate its 12-week forward tracking.

## Before work
Read AGENTS.md, PROJECT_STATE.md, docs/DEVELOPMENT_QUEUE.md, README.md and current architecture/tests. Inspect current main and recent relevant PRs. All conclusions and reproduction instructions must live in Git, not chat.

## Upstream scope
Audit official Freqtrade and its FreqAI subsystem. Pin exact upstream repository commit/version and documentation version used. Verify license and dependency implications. Do not copy code unless license compatibility and attribution requirements are explicitly reviewed.

## Questions to answer
Compare TradingLab vs Freqtrade/FreqAI in:
- historical data ingestion and candle integrity;
- feature engineering;
- labels/targets and prediction horizons;
- chronological training/calibration/evaluation;
- walk-forward and retraining;
- leakage/look-ahead protections;
- backtest execution semantics;
- fees, spread, slippage and funding;
- position sizing and risk controls;
- hyperparameter/strategy optimization and overfitting controls;
- model lifecycle, stale-model handling and failure modes;
- experiment provenance/reproducibility;
- reporting/metrics;
- dry-run/paper architecture;
- exchange adapters and separation between signal and execution;
- observability, tests and CI.

## Required output
Create a capability matrix with: TradingLab current behavior, Freqtrade/FreqAI behavior, evidence/source, gap, expected benefit, integration complexity, risk, recommendation.

Classify each candidate as:
1. ADOPT — clear value and fits architecture;
2. ADAPT — useful concept but implement in TradingLab-native form;
3. STUDY — promising but evidence insufficient;
4. REJECT — duplication, incompatibility, leakage/overfit risk, excessive complexity or no measurable benefit.

## Priority investigation
Pay special attention to FreqAI mechanisms for feature pipelines, chronological retraining, model expiration/staleness, outlier/data-quality handling, backtesting of retraining behavior, prediction confidence and reproducible model/data identifiers.

Also inspect Freqtrade's backtest assumptions and optimization workflow. Explicitly identify any places where using Freqtrade defaults would make comparison with TradingLab unfair.

## Validation
Do not claim improvement from architecture inspection alone. For any recommendation that could change strategy results, define a controlled A/B experiment using identical TradingLab data, periods, capital, fees, slippage, funding, execution timing and risk constraints.

No final-test tuning. Freeze parameters before evaluation. Retain failed experiments.

## Relationship to model experiment
The Kronos/Kronos-BTC/CryptoMamba experiment is separate. This audit may recommend infrastructure or methodology useful to those models, but must not change their final test data after results are seen.

## Deliverables
Commit:
- docs/FREQTRADE_FREQAI_AUDIT.md with findings and capability matrix;
- a prioritized integration backlog;
- architecture notes showing where each accepted concept would enter TradingLab;
- exact upstream versions/commits and source references;
- proposed A/B tests for material changes;
- risks, licensing notes and rejected ideas.

Implementation is NOT automatically authorized by this audit. If a small non-invasive proof-of-concept is necessary to validate a claim, keep it offline, isolated, tested and clearly marked experimental.

## Final recommendation
End with a ranked list of the highest-value concepts to adopt/adapt, estimated complexity, expected measurable benefit, required validation, and a recommendation for the smallest next implementation.

Do not merge or deploy. Await human review.
