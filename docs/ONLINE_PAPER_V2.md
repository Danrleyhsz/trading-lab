# Online Paper V2 package

This is an integrated, unmerged increment stacked on the prior feature PRs. Production is cloud-only. Local executions are development verification, not the proposed runtime.

## Delivered code

- Backtesting: SMA, breakout and mean-reversion candidates share the same closed-candle signal function as the new autonomous cycle. Complete historical trade outcomes include entry/exit fees and actual funding; results remain simulations.
- Market Data V3: coherent public USD-M bid/ask, mark, index and funding quote; exchange timestamps; bounded funding-history pagination; stale/crossed/wrong-instrument rejection; polling with exponential retry. No synthetic fallback quotes. The legacy spot feed is retained for legacy account valuation.
- Risk V2: existing deterministic risk plus fresh-market checks, 1x initial margin, 10% peak drawdown, 5% loss from the first observed equity of the UTC day, halt control, and configured maintenance/liquidation stress. Strict position reductions can pass halted/loss controls; they still pass valid-order/fresh-market checks.
- New perpetual Paper evaluation wallets: distinct instrument/account IDs, explicit independent endowments, audited proposals/decisions/fills, actual funding settlement prices, sampled marks/equity and modeled liquidation fees. Funding publication delays block further execution around a known settlement boundary. Historical positions at settlement are reconstructed from fill times, not from the current quantity.
- Autonomous V2: disabled by default. An explicit completed V2 study must pass at least three test folds/ten complete trades, positive aggregate out-of-sample P&L, no modeled liquidations and <=15% per-fold drawdown; evidence must be recent. This is eligibility for the independent Nova evaluation wallet, never fund approval. The decision, input dataset/hash and original source event are retained. The processed candle cursor is saved before execution; a restart may skip an interrupted attempt but cannot duplicate that candle.
- PostgreSQL: transactional JSONB state plus immutable event rows, append-only history checks and a session-level single-writer lock. The integration is a durable single-runtime design, not a distributed execution cluster or a fully normalized reporting schema. Legacy JSON import refuses to overwrite an existing DB. Production requires PostgreSQL and verified TLS; JSON remains development-only.
- Dashboard: separate legacy/fund/perpetual account cards, P&L, fees, settled funding, sampled drawdown, margin and stale valuation warnings; study list/detail and a pause/resume control. Agent profiles expose their perpetual evaluation metrics separately.
- Cloud preparation: reproducible dependency lock, compiled non-root container, health checks, shutdown draining, production access-code requirement, HttpOnly/Secure session cookies, same-origin mutation controls, CI with PostgreSQL and Docker build.

## Execution identity and limits

Original accounts/ledgers are not converted into perp contracts or reassigned. The fund remains the original separate portfolio. New perp execution is evaluation-only until a reviewed fund migration; evaluation capital never belongs to the fund. Legacy manual execution is opt-in with LEGACY_PAPER_EXECUTION_ENABLED and defaults off. Legacy APIs that accepted alleged client backtests/risk/agent work return 410; use server-owned research/studies. No AI costs or LLM approvals exist in this package.

The perpetual model uses configured 1% maintenance and 0.5% liquidation fee; these are not exchange-tier parity. Runtime liquidation observes polled quotes and cannot reconstruct unobserved intrapoll extremes. Equity samples retain the most recent 1440 minute buckets; maximum observed drawdown retains its running peak history. Empty/corrupt sources never create substitute funding rates. Missing historical fills are never reconstructed from counters. Historical-study P&L is never copied to account P&L.

## Validation and remaining external work

Unit/API tests cover isolation, durable-write failure, funding/restart/deduplication, reducing exits, liquidation, source validation, authentication, strategy outcomes, autonomous gating/cursor and financial display. The real PostgreSQL integration and cloud image are tested in GitHub CI. Public-source smoke verified coherent USD-M book/mark timestamps and actual funding rows without submitting orders.

No cloud resources, real secrets, production balances or external accounts were provisioned. Browser visual review remains pending in this environment. Provider selection, managed DB/backup configuration, actual deployment and monitoring alerts still require external account access and review.
