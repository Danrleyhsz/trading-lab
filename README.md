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
