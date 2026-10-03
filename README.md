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

## Pixel Office recorded audit navigation
The office now opens original recorded events, filters/pages confirmed history and browses closed operations per account. Session-received events remain separate from the last saved history. Missing evidence and empty accounts remain explicit. Original fill/funding/source IDs are preserved; queries cannot change agents, approve risk or execute paper orders. See docs/OFFICE_AUDIT.md.

## Continuous paper recovery preparation
Shared durable continuation guards now reject cursor rollback and perpetual ledger/account rewrites; known funding boundaries require their actual settlement before advancing. Autonomous signals recheck book/runtime gates after source retrieval. Saved interrupted attempts retain the existing at-most-once policy, without claiming a completed decision or fill. Execution remains disabled by default. See docs/PAPER_CONTINUATION.md.
## Living office research and interaction
The office now retains stable character views, permits explicitly cosmetic idle presence, opens the six rooms and presents actual structured agent messages with original participants. Presence never grants work, experience, memory or P&L. Reduced motion and pause are respected. Current movement uses authored room-local collision masks and reserved routes; directional sprites and general inter-room paths remain pending. See [13-project research/adoption matrix](docs/OPEN_SOURCE_RESEARCH.md) and [living office design](docs/LIVING_OFFICE_DESIGN.md). Production remains cloud-only; no provider or deployment was created.
## Local office paths and interactive furniture
Characters now plan bounded routes inside authored safe floor areas, avoid occupied peer footprints and turn on return, without changing backend work or room. Six furniture entries open existing laboratory views and remain accessible through room dialogs on mobile. Original scene/atlas and DOM renderer are retained; general inter-room paths and directional sprite frames remain pending. See [navigation scope and limits](docs/OFFICE_NAVIGATION.md).
## Office communication highlights
The scene includes a six-message board over the existing received structured-message feed. Selecting an original message identifies sender/recipients, shows original ID/time/summary, and connects their current rendered positions with static lines. Cosmetic presence pauses during selection; clearing restores the existing pause preference. New recent messages mark actual available sender and recipient views; history/recovery is never replayed as live speech. See docs/OFFICE_COLLABORATION.md for evidence and coverage limits.

## Recorded office room transitions
Matching new streamed room changes can now animate through two verified reversible passages: Research ↔ Quant (shelf detour) and Trading ↔ Lounge. Actual room/status appears immediately; snapshots/history never replay travel. Owned animations and sampled route reservations cancel on newer state, occupancy, focus/motion gates and disconnect. Other doors and original directional frames remain pending. See [scope, limits and verification](docs/OFFICE_TRANSITIONS.md).