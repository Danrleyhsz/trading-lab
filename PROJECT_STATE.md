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

## Account outcome performance (pending review)
- Portfolio V2 increment: read-only position lifecycles derived from actual account fills and funding. Complete flat-to-flat operations have net outcomes after all attributed fees/funding; open lifecycles are excluded from win rate.
- Partial exits, scaling, shorts, reversals and liquidation fees preserve source event IDs. Funding is matched by original settlement time, including later publication; same-timestamp funding uses the book's strict-before-fill rule.
- Missing/invalid provenance produces unavailable metrics. Empty histories have no win rate, performance grade or invented closed trades.
- Fund, legacy evaluations and USD-M evaluations remain separate. Existing snapshots/events are unchanged; projections are cached by append-only ledger version.
- Bounded read-only audit pages and the most recent 20 outcomes per account are available through profiles. The office shows source IDs, fees/funding and genuine equity samples.
- Validation: typecheck and 76-test suite passed locally with the PostgreSQL integration deferred to the CI service; no execution was enabled for development preview.

CI checkpoint: PR #21 completed with 76 tests passing, zero skipped, including PostgreSQL integration, typecheck, build and cloud-container build. PR #20 also passed its complete CI. Desktop profile verification confirmed no invented account, closed operations, memories or win rate in the unconfigured development preview. See docs/DEVELOPMENT_QUEUE.md for the next steps and actual remaining boundaries.

## Ledger restoration integrity (pending review)
- Evaluation wallet identities must match a known roster owner. The runtime rejects stored fills attributed to another wallet/agent and rejects duplicate actual fill IDs even if wrapper event IDs differ.
- Perpetual restore accepts only the supported BTCUSDT instrument; legacy fills cannot masquerade as perpetual records.
- The read-only performance projection reports duplicate fill IDs and non-monotonic execution timestamps as unavailable. It never invents a second execution or reorders a clock rollback into a profitable trade.
- Valid recorded snapshots replay unchanged. This fix rejects inconsistent evidence and does not repair, delete or rewrite historical data.

## Analytical cost-control checkpoint
Prepared a provider-neutral, analysis-only boundary with immutable source/input hashes, durable cost reservations, explicit global/per-agent budgets and actual-usage settlement validation. Provider failures/timeouts and interrupted attempts retain reservations; no paid retries or zero-charge assumptions. Runtime remains disabled with no adapter and zero budget. Read-only status/audit routes require the existing production access control. No paid call, provider account, cloud deployment or paper activation occurred. This increment changes no fund/evaluation balance, risk rule, agent state or historical outcome. See AI_COST_CONTROLS.md for billing-contract limits and unimplemented activation dependencies.

## Cloud runtime readiness increment (pending review)
Added process-local durable-write observations, minimal public liveness/control-plane readiness, authenticated operational diagnosis and actual paper-source/funding/job gates. Source outages remain visible while the panel is available. New mutations/admissions stop during persistence failure or drain; admitted historical tasks finish before PostgreSQL closes, subject to the documented signal grace deadline. Default paper/autonomous/AI activation and deterministic risk are unchanged. Diagnostics do not verify cloud hosting/backups or approve orders. No provider account, deployment or paid AI call occurred. See docs/RUNTIME_READINESS.md.

## Historical laboratory responsiveness increment (pending review)
Walk-forward calculation moved to a single bounded thread in the same online container, preserving exact existing model output and deterministic risk. Source data and optional datasetHash are durably retained before computation; both storage adapters protect loaded evidence while RUNNING and final outcomes. Calculation timeout/crash creates a real failed study without results/orders; restart retains saved evidence as INTERRUPTED. Cloud JavaScript worker execution and development TypeScript execution are verified separately. No cloud provider, deployment, paid AI call, automatic study retry or paper activation occurred. See docs/HISTORICAL_LAB.md.

## Pixel Office V3 audit navigation increment (pending review)
Added authenticated bounded confirmed-event history/detail, source links from activity/memory/closed operations and existing per-account performance pagination. The read model uses only the last saved snapshot and original ledgers/research events; failed writes, missing old sources or conflicting IDs cannot fabricate history. Session-only records are explicitly unconfirmed. Frontend request races, safe text payloads and modal/live-list focus handling are covered. The approved pixel artwork, paper execution, deterministic risk and separate capital remain unchanged. No public study/order, paid AI or cloud deploy was triggered. See docs/OFFICE_AUDIT.md.

## Paper continuation integrity (pending review)
Shared JSON/PostgreSQL guards protect monotonic funding/autonomous progress and original perpetual account/ledger evidence. Restore rejects malformed/future cursors without repair. Known due funding requires its actual matching source row, and a confirmed unchanged boundary cannot charge twice. Closed-candle checkpoints serialize duplicates and retain prior progress on failed writes. Autonomous retrieval rechecks fresh market/funding, halt, study, persistence and runtime admission before consuming a candle. Saved interrupted attempts remain skipped rather than reconstructed into fills. All execution defaults remain off; no cloud/provider/payment or public order was triggered. See docs/PAPER_CONTINUATION.md.
## Living office presence and collaboration (pending review)
Confirmed the original product intent against the current product documentation/user visual reference and researched 13 public repositories with code/asset license distinctions. Added original browser-only stable character views, cancelable cosmetic idle movement, six room inspectors and existing structured-message navigation/temporary new-message indicators. Read-only room navigation does not schedule work or change actual agent state. All work, account, memory, risk and execution evidence remains authoritative in the existing backend. No third-party code/assets/dependencies, paid AI, external provider or deployment were introduced. Full tilemap collision, directional sprites, furniture destinations and recorded task-handoff choreography remain future increments. See docs/OPEN_SOURCE_RESEARCH.md and docs/LIVING_OFFICE_DESIGN.md.
## Pixel Office local paths and furniture (pending review)
Added original bounded browser-only cardinal path planning over conservative room floor/obstacle masks, peer-route reservations, segmented turning/return and cancelation/removal. Six accessible furniture entries open existing views/room inspectors, also available inside room dialogs. Fixed hit-area priority so object clicks are not intercepted by nearby characters; panel close returns to the stable object. No agent status/room/experience/history, financial record, risk rule, storage schema or execution capability changes. Art/atlas and renderer retained. General inter-room/door paths, seating and original directional sprite frames remain future increments; see docs/OFFICE_NAVIGATION.md.
## Recorded office collaboration (pending review)
Added a six-message inline board, original message selection/detail, participant profile access and static current-position links. Actual existing recipients now receive a temporary original-message indicator alongside the sender. Selection pauses cosmetic presence; clear/profile closure preserve keyboard access. Invalid/duplicate/conflicting evidence fails closed. No backend capability, mutation, account/work/status, risk, artwork/renderer or persistence changes. Directional sprites, real seating/meetings and inter-room paths remain pending; see docs/OFFICE_COLLABORATION.md.
