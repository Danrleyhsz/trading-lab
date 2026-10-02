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
