# Architecture

## Principles
Cloud-first, event-driven, auditable, provider-adapter based, paper-first.

## Logical components
- **Market Data Adapter**: exchange WebSocket/REST ingestion and normalized market events.
- **Agent Engine**: role-based research, quantitative analysis, trading proposals and risk review.
- **Memory Engine**: strategy, trade, regime, failure, experience and research memories.
- **Paper Broker**: virtual balances, orders, fills, fees, spread, slippage, latency, funding and liquidation rules.
- **Portfolio Engine**: career capital per agent and separate fund capital.
- **Event Gateway**: publishes domain events to the office UI.
- **Pixel Office**: visual state machine driven only by domain events.
- **Persistence**: PostgreSQL for durable state; Redis may be introduced for ephemeral coordination.
- **Object Storage**: reports/artifacts when needed.

## Initial deployment direction
- Source control: GitHub
- Development: GitHub Codespaces
- Runtime: cloud container platform
- Database: managed PostgreSQL
- Frontend: web/PWA optimized for mobile
- AI: provider adapters with budget/rate controls

## Boundary
There is no LiveBroker implementation in the MVP. A future live adapter must remain isolated behind a broker interface and require external controls.

## Event examples
MARKET_TICK, SIGNAL_CREATED, RESEARCH_STARTED, BACKTEST_STARTED, BACKTEST_COMPLETED, TRADE_PROPOSED, RISK_APPROVED, RISK_REJECTED, PAPER_ORDER_SUBMITTED, PAPER_FILL, POSITION_CLOSED, MEMORY_CREATED, AGENT_STATE_CHANGED.

## Agent profile projection and current durability
Agent profiles are read-only projections over registry state, memory, structured messages and the agent activity journal. The journal stores original AGENT_STATE_CHANGED event IDs and payload snapshots; it never reconstructs past events from a counter. The JSON state adapter accepts optional agentMessages and agentActivity collections for backward compatibility and serializes writes within one process. Domain events schedule a snapshot after the synchronous collaboration action completes. Errors are logged; this is not a transactional event store. Production requires a durable cloud volume and a single runtime writer until PostgreSQL replaces this adapter. No cloud deployment is introduced by this increment.

## Independent paper-capital model
Evaluation accounts have their own configured virtual endowments, separate positions and event ledgers. Those balances are not fund assets. Account creation is opt-in and requires positive EVALUATION_PAPER_CAPITAL. Initial capital is retained on restore, even if configuration changes. Historical trades lacking attribution are not assigned to an agent by inference.

The fund-only /paper/orders API is preserved. Evaluation orders require an explicit account path. Account owner and proposal attribution are assigned in deterministic backend code; reference price comes from a fresh public-market tick. Fund strategies, when specified, must already be validated. Every account uses the deterministic Risk Engine and PaperBroker. Same-account proposals are serialized. Original domain events are retained and fills are replayed on restart. This is a single-writer JSON-backed step toward PostgreSQL, not a distributed transactional ledger.

## Evidence Research Engine
Research consumes public BTC spot hourly candles and a distinct USD-M derivatives snapshot. The sources are not treated as interchangeable instruments. It retains the dataset, its hash and original domain events for audit. Satoshi measures observed momentum, Flux derivatives context, Vega realized volatility and Oracle a documented regime heuristic; these are descriptive deterministic analyses, not LLM-generated chatter or forecasts.

Atlas submits a sourced SMA hypothesis to Euler's historical backtester. Failed queries and rejected hypotheses remain visible. A passed in-sample screen does not imply out-of-sample evidence, trading success or automatic fund eligibility. No paper order is submitted by a research task. The run endpoint accepts only supported symbol/limit fields; clients cannot upload alleged candles, profits or backtest results into this path. Runs are bounded and do not overlap within a runtime. Dataset and strategy state join the existing single-writer snapshot until PostgreSQL.

## Linear perpetual historical studies V2

`POST /backtests/v2/studies` accepts only `{bars, trainBars, testBars}` (defaults 1000/400/100), returns 202, and starts one bounded public-data study. Read its ID with `GET /backtests/v2/studies/:id`; summaries use `GET /backtests/v2/studies`. Jobs retain original USD-M trade/mark candles, actual funding timestamps and settlement marks, dataset SHA-256, configuration and every simulation proposal/decision/fill/funding entry. Pending jobs restore as INTERRUPTED. Source failures remain FAILED without fabricated results.

Instrument: BINANCE_USDM:BTCUSDT, linear USDT perpetual, offline historical simulation only. This does not relabel the legacy spot SMA studies or switch the existing real-time PaperBroker to derivatives. No study promotes itself into account execution or fund approval.

The first V2 candidates are SMA 10/30, 20/60 and 5/20. Training net P&L selects the candidate before each nonoverlapping test window. Prior candles provide warmup; each fold starts flat, carries out-of-sample equity and closes at its boundary. Unused trailing bars are reported. Further strategy families remain future work.

Signals use prior completed candles and execute at the next open with adverse slippage. Entry and exit fees are charged. Funding applies `-signed quantity × actual settlement mark × rate`. Records within one second of an hour boundary apply to carried positions before the open; original timestamps are preserved. Other settlements apply before the hourly stress test. This ordering is a model assumption, not a claim about intrabar chronology.

Cross-margin stress uses the adverse hourly mark extreme, 1% maintenance margin and 0.5% liquidation fee as explicit study assumptions. Liquidation uses the adverse trade extreme plus configured slippage. These are not Binance tiered margin rules. The model has no leverage above 1×, uses 10% notional per position, retains bankruptcy deficits and includes final closing costs in drawdown. Every entry and exit passes the deterministic RiskEngine. Strict reductions without reversal remain eligible after loss limits; invalid orders remain rejected.

Data endpoints and field definitions: [official Binance USD-M market data documentation](https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/market-data). Only public klines, markPriceKlines and fundingRate are queried. No API keys or private brackets.

Production remains cloud-only. Local tests are development validation. Deployment, PostgreSQL and uninterrupted cloud jobs are not supplied by this increment.

## Online Paper V2 runtime and durability
See [Online Paper V2](ONLINE_PAPER_V2.md). The USD-M market adapter, historical simulator, deterministic risk, Paper account book, persistence and browser UI remain separate modules. Book mutations stage a cloned state, persist it and only then publish committed paper outcomes. PostgreSQL snapshots/event rows commit in one transaction; per-book actions and global snapshot writes are serialized. The advisory lock enforces a single cloud writer. Root domain events preserve actual source IDs and autonomous signal datasets. Final research/study evidence and ledger prefixes cannot be rewritten through the PostgreSQL adapter.

The new perpetual runtime is isolated from the original fund/legacy book; an automatic fund migration is deliberately absent. A future multi-replica design requires a new transactional execution architecture and review.
