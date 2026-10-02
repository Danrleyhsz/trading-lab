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
