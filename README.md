# Trading Lab

Cloud-first AI quantitative trading laboratory with a pixel-art virtual investment office.

**Current mode: PAPER TRADING ONLY.** Market data may be real; capital and execution are simulated.

## Vision
Trading Lab combines real crypto-market observation, specialized AI agents, quantitative research, realistic paper execution, persistent memory and an event-driven pixel office. The office is the main interface and character activity must correspond to actual backend state.

## MVP flow
BTC/USDT live data -> agent research -> quantitative validation -> risk review -> simulated order/fill -> virtual P&L -> audit/memory -> pixel-office visualization.

The project is designed to run in cloud infrastructure and be manageable from a phone. No essential runtime component should depend on a personal notebook remaining online.

## Documents
- [Project state](PROJECT_STATE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Product specification](docs/PRODUCT.md)
- [Security baseline](docs/SECURITY.md)
- [Agent development rules](AGENTS.md)

## Repository policy
Secrets never belong in Git. The initial product has no live-money broker. Development uses feature branches and pull requests rather than unreviewed architectural changes directly on main.

## Online Paper V2
See [implemented package and limits](docs/ONLINE_PAPER_V2.md) and [cloud deployment handoff](docs/CLOUD_DEPLOYMENT.md). Feature code is pending review; no cloud deployment is implied. Production runs from the compiled cloud container with PostgreSQL and protected HTTPS access, not from a developer computer.

## Analytical AI preparation (disabled)
A provider-neutral advisory boundary now reserves an explicit independent USD budget durably before a potential call. Global/per-agent cost and request caps, pinned pricing versions, input/output caps, timeout and idempotency are mandatory for an enabled adapter. Unknown charges remain held across restart and UTC-day boundaries; failed persistence fails closed. Actual provider-reported usage can produce a usage-priced ceiling, never a claimed invoice. The online runtime exposes read-only AI status/audit and supplies no provider; default budgets are zero. No LLM work, paid call, agent experience, approval or trading history is fabricated. See docs/AI_COST_CONTROLS.md.

## Runtime readiness and shutdown preparation
Minimal /health/live and /health/ready endpoints now distinguish process response from control-plane readiness. Authenticated /runtime/readiness reports actual write outcomes, quote/funding gates, independent accounts, admitted jobs and disabled AI/autonomous configuration. The access panel displays recorded block reasons and expires old diagnostics. New mutations stop on storage failure or shutdown; admitted historical tasks drain before the database closes. Signal shutdown has a 30-second grace deadline, retaining existing interrupted-study restore behavior. This is cloud preparation, not a hosted service or backup verification. See docs/RUNTIME_READINESS.md.

## Bounded historical calculations
Historical studies now retain source data/hash durably before calculating in a bounded internal worker. The unchanged deterministic simulator preserves all funding/risk/OOS audit output; timeout/crash produces a retained failure rather than a partial result. Runtime/data adapters stay in the cloud container; no broker/AI/account capabilities are passed to the worker. No automatic retry, activation, service provisioning or deployment is added. See docs/HISTORICAL_LAB.md for resource bounds and remaining operational limits.
