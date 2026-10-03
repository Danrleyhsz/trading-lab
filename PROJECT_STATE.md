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

## Evidence Research Engine (pending review)
- On-demand /research/run retrieves actual BTC spot hourly history and a separately labeled public USD-M context snapshot. The unfinished candle is excluded; invalid, stale, non-contiguous or non-finite data is rejected without fallback fabrication.
- Satoshi measures observed spot momentum, Flux spread/funding/open interest, Vega realized hourly log-return volatility, and Oracle a documented descriptive regime heuristic. These are deterministic backend analyses, not LLM conversations or confidence claims.
- Atlas sends a sourced SMA hypothesis to Euler. Euler uses the existing historical backtester. Positive screens, rejected hypotheses and source failures are preserved with source data, SHA-256 evidence hash and original research/backtest events.
- Research and strategies survive restart. List responses expose compact recent summaries; details retain full evidence. Research submits no paper orders and never moves capital automatically to the fund.
- The office can request a real research run and inspect its recorded result. Specialist movement is driven by actual task phases; no decorative chatter or artificial work delays were added.
- Paper execution status now starts at the actual approved order submission and returns to IDLE after its fill; the risk reviewer also returns to idle. Failed office stream delivery cannot abort domain execution.
- Validation: typecheck, 38 tests and JavaScript syntax passed. A development smoke test against public Binance endpoints obtained 99 closed candles, four specialist findings and a REJECTED screen with zero execution events. This is development verification, not a production-cloud deployment. Browser visual review is still pending.
- Backtest screening still uses V1 and does not imply out-of-sample validation. Backtesting V2 is the next milestone.

### Backtesting V2 — linear perpetual increment
- Added server-owned asynchronous USD-M studies with real trade/mark/funding inputs and retained evidence.
- Added signed historical simulation, fees, funding, conservative margin stress/liquidation and walk-forward SMA parameter selection.
- No automatic strategy validation or account order execution from these studies.
- Legacy realtime Paper execution remains unchanged pending Market Data V3 / Autonomous Paper V2; old studies remain legacy.
- Full exchange tier parity, extra strategy families and browser study controls are not yet implemented.
- Public-data smoke: 300 aligned bars, 37 funding records, four out-of-sample folds; no broker events or persistent product account changes.

## Online Paper V2 package (pending architectural review)
- Market Data V3, three historical strategy families, gated autonomous perpetual evaluation, Risk V2, PostgreSQL adapter, financial/study UI and cloud container preparation are integrated on a feature branch.
- Production requires PostgreSQL, verified TLS and protected HTTPS access. Runtime remains single-writer; actual provider provisioning, backups and deployment are pending external account choice.
- Perpetual evaluation accounts use new explicit identities; legacy accounts/fund and old history are not converted. New automatic execution targets only the independent Nova evaluation account and defaults off.
- See docs/ONLINE_PAPER_V2.md for implementation boundaries and docs/CLOUD_DEPLOYMENT.md for the cloud handoff. Browser visual review remains pending.

## Pixel Office art direction (pending review)
- The primary screen now uses a detailed six-room pixel-art scene and eight neutral character sprites based on the approved visual reference. Asset art contains no people working, financial figures, trade charts or UI labels; all operational text/data is rendered from backend projections.
- Room placement and travel come only from actual registry/state events. Available agents are explicitly idle; no decorative work or chatter is introduced.
- Read-only market session traces use observed quotes only. Spot, USD-M quotes, fund capital, independent evaluation balances and historical studies remain distinct.
- Profiles, research/study/risk controls and protected access remain functional through the existing APIs. Mobile uses a scrollable map and an accessible roster/profile panel.
- Source failures hide current USD-M prices; in-flight older snapshots cannot override a newer stream failure. Assets are served as binary PNGs from an explicit allowlist.
- Browser review completed at desktop and 390px mobile width, including agent profile and roster navigation. No production cloud deployment is implied.
