# Security Baseline

- Never commit credentials, tokens or private keys.
- Use managed secret stores and environment variables.
- Paper trading is the only execution mode in MVP.
- Market-data credentials, if required, are read-only.
- Keep auditable trade and decision records.
- Apply per-agent AI budgets and rate limits.
- Validate external market data.
- Keep broker adapters isolated from agent reasoning.
- Any future real-money phase requires a separate design review and external risk controls.

## Independent-account execution controls
Evaluation account creation/execution is opt-in. No transfer from the fund exists. Public order payloads cannot select an owner, forge a risk approval or provide a market reference price. Routing must use the account endpoint. Orders are checked against fresh public-market data, strict payload validation and account-specific deterministic risk. The legacy order endpoint targets only the paper fund. No live-money adapter or private exchange credentials are introduced.
