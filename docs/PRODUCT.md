# Product Specification

## Experience
The office is the primary interface. Users see agents move between work areas according to real system state, inspect their work, open agent profiles, positions, strategies, memories and performance.

## Initial agent roles
- **Atlas** — research coordination
- **Euler** — quantitative research/backtests
- **Nova** — paper trader
- **Sentinel** — risk review

The MVP may activate only the minimum subset needed for an end-to-end workflow before expanding the roster.

## Capital model
**Career capital** measures each agent's virtual performance independently.
**Fund capital** is a separate collective virtual portfolio affected only by approved strategies.

## Memory
Structured memory types: StrategyMemory, TradeMemory, MarketRegimeMemory, FailureMemory, AgentExperience and ResearchMemory.

## Visual truth rule
Walking, desk activity, meetings and speech/status bubbles are projections of backend events. Cosmetic idle animation may run locally without consuming AI tokens, but it must never imply a trade/research event that did not occur.

## Success criteria for MVP
A user on a phone can open the office, see a live BTC market feed, observe an agent workflow, inspect a simulated trade from proposal through risk review to fill/close, and audit the resulting P&L and memory.

## Current career evidence
The agent profile exposes actual memories, sent/received messages and state-transition events. State-transition experience is retained for compatibility and is labeled as such. It is not a measure of profitability or a completed research count. Detailed activity history begins when this journal is enabled; missing historical details remain visible as a coverage gap. Financial performance per agent is unavailable until paper fills have explicit account/agent attribution. Negative memories remain visible.

## Evaluation wallets and fund
Agent evaluation wallets have independent virtual starting capital. Their equity is shown alongside, never summed into, fund equity. Agent financial P&L is derived only from attributed evaluation fills and current marks; net P&L includes fees. The official fund remains a separate paper portfolio. Creating wallets does not mean an agent has performed research or traded.

## Expanded research roles
Satoshi studies Bitcoin price history, Flux observes market microstructure/derivatives context, Vega measures realized volatility and Oracle classifies market regimes. All begin idle. A specialization label does not imply executed research, accumulated experience or financial performance. Actual work must retain its input evidence and results.

## Research controls
Run research requests actual public market evidence, records measurements and performs a historical SMA screen. The office reports the recorded outcome. It does not add paper fills, change fund capital or fabricate activity. Source errors and negative results are retained. Current regime labels are descriptive heuristics, not predictive certainty. In-sample results are explicitly historical simulations.

## Online Paper V2 controls
The office adds a sourced USD-M market panel, recorded historical study list/detail and independent account financial cards. Users can pause new perpetual paper exposure; risk still evaluates reducing exits. Automatic evaluation is configured in the cloud and defaults off. Legacy fund equity, independent evaluation equity and historical-study P&L remain separate. Login uses a configured access code without storing it in the browser. Unavailable sources and stale valuations remain visible.

## Analytical AI readiness
AI status and retained audit records distinguish disabled configuration, actual reported usage and unknown-cost reservations. No production adapter or automatic paid research is enabled. Future responses are advisory data and cannot approve execution, validate strategies or manufacture agent achievements. AI budgets are explicit USD spending limits, independent of paper endowments. A real provider, budget and reviewed billing contract remain required before activation.

## Operational diagnosis
The access panel now shows actual service phase, confirmed writes, market availability, paper block reasons, active research/study state and AI configuration. Missing, partial or expired diagnoses become unavailable instead of implying a running task or healthy deployment. An available panel does not approve an order; deterministic risk still reviews each paper submission. New-exposure halts preserve risk-checked reducing orders. Online hosting and backups remain externally unverified until a real provider account and deployment exist.

## Historical study failure visibility
A historical study uses recorded source data saved before calculation. A calculation timeout, worker failure or unavailable source stays visible as a failed study with no claimed partial profit or paper operation. Restarted unfinished studies retain saved evidence and report interruption. This improves panel/market responsiveness during calculation; it does not change financial model assumptions or activate autonomous execution. The approved pixel scene continues to reflect actual backend task state only.

## Recorded history and source navigation
History filters and earlier pages open preserved backend events. Clicking a session activity, agent source or operation fill/funding opens the original ID and payload with explicit confirmed/unconfirmed/missing coverage. Account pages keep fund/evaluations separate and exclude open positions from win rate. Empty history remains empty. Queries do not change rooms, experience, memory, risk or execution. Mobile and keyboard navigation preserve the approved scene; source payloads render as text. See OFFICE_AUDIT.md.

## Paper continuation evidence
Restart retains original processed-candle/funding progress and separate account history. Missing expected funding and stale/paused/unavailable service state stop the pending signal before checkpoint. A saved cursor means an attempt was consumed, not that an agent finished work or an operation filled. Source failures and interrupted attempts never populate the office with assumed decisions, memory or profit. Automatic paper execution continues to default off. See PAPER_CONTINUATION.md.