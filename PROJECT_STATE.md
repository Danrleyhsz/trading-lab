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

## Pixel Office V2 increment
- Six rooms project the actual backend room of each agent.
- Agent profiles read role, status, transition-based experience, memories and structured messages from existing read-only endpoints.
- Equity and P&L come from the paper portfolio; market ticks come from the public market feed.
- Session event feed, reconnect and stale snapshot warnings are available.
- Runtime remains cloud-first: local execution is only a development/test preview, never the required production host.
- Baseline at 90ebf75: typecheck and 17 tests passed. Office increment: typecheck and 19 tests passed.
- Experience currently counts state transitions. It does not yet measure a career, accuracy or individual P&L.
- Browser visual validation remains pending in this environment (in-app localhost access blocked; Chrome unavailable).

## Agent profiles and career evidence increment (pending review)
- GET /agents/:id/profile combines existing state, per-agent memories and structured messages with event-linked activity history.
- Future AGENT_STATE_CHANGED events are preserved with their original IDs and timestamps. Older transitions are explicitly marked as lacking detailed history; no history is synthesized.
- Agent messages and activity survive restart in the current JSON state format; older snapshots remain readable. Writes are serialized to avoid temporary-file collisions.
- Experience remains the legacy transition count. Evidence counts are descriptive, not win-rate, performance ratings or completed-work claims. Backtest P&L is never promoted to individual trading P&L.
- Agent-specific financial metrics remain unavailable until an attributed paper-trade ledger exists.
- UI profile uses the read-only endpoint and does not let stale snapshots override newer room or market events.
- Validation: typecheck, 23 tests, and JavaScript syntax passed. Browser visual validation is still pending.
- This remains cloud-first; a single runtime writer and a durable cloud volume are required for the current JSON adapter until the PostgreSQL milestone. This increment does not provision or deploy cloud infrastructure.

## Independent paper accounts (approved capital model, implementation pending review)
- Evaluation wallets receive explicitly configured virtual capital independently of the fund. They are never added to or subtracted from fund equity.
- PAPER_EVALUATION_ENABLED defaults to false; EVALUATION_PAPER_CAPITAL must be configured and positive to create evaluation wallets. Existing wallets are preserved rather than reseeded when configuration changes. Disabled evaluation execution is rejected even for restored accounts.
- /paper/orders remains fund-only. /paper/accounts/:id/orders explicitly selects the account. Caller-supplied routing, agent, approval and reference price fields are rejected. Market price must be current.
- The book assigns account, owner, proposal and optional strategy IDs and retains original proposal/risk/order/fill events. Snapshots persist initial endowments and ledgers; replay restores positions, fees and realized results. Legacy snapshots get no invented old fills.
- The Risk Engine rejects invalid numeric orders and evaluates cumulative projected positions. Requests are serialized per account to prevent concurrent approvals from ignoring prior fills.
- Office and profiles separate evaluation wallets from the fund. Net P&L includes execution fees. Win rate and maximum drawdown remain unavailable without complete outcome/time-series data.
- The infrastructure is still cloud-first. The JSON adapter still requires one runtime writer and a durable cloud volume; PostgreSQL migration remains on the roadmap. No production deployment or real-money adapter was added.

## Expanded roster (definitions, pending review)
- Satoshi: Bitcoin price research; Flux: market microstructure; Vega: realized volatility; Oracle: market regimes.
- They start IDLE with zero transitions and no invented messages, memories, fills or historical activity. Existing agent counters and reasons survive hydration.
- Configured independent evaluation accounts can cover the expanded roster without changing fund capital.
- Specialization is a role definition, not a claim that a task ran. Real specialist work is the next Research Engine increment.
