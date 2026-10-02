# Trading Lab — Project State

## Status
Foundation phase. Cloud-first, mobile-managed, paper-trading only.

## Product vision
A persistent AI trading laboratory presented as a top-down pixel-art investment office. Agents research real crypto markets, test hypotheses, debate decisions, execute simulated orders through a realistic paper broker, and build auditable memories from outcomes.

## Non-negotiables
- Real market data; simulated capital and execution in the initial phase.
- No dependency on a developer notebook staying online.
- Historical records are append-only from the product perspective; failures remain visible.
- Visual office state must be driven by backend events, not decorative fake activity.
- Secrets never committed to Git.
- Live-money broker is intentionally absent from the MVP.

## MVP
1. BTC/USDT real market feed.
2. Three initial agents: Research, Quant, Risk/Trader workflow.
3. Virtual wallet and realistic Paper Broker.
4. Trade/event ledger and agent memory.
5. Event gateway via WebSocket.
6. One functional pixel-art office room.
7. Mobile-first monitoring interface.
8. Cost telemetry per agent/task.

## Next milestone
Architecture skeleton + market-data ingestion + paper broker contract + event schema.
