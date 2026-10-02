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
