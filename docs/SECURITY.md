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

## Protected online runtime
Production refuses to start without PostgreSQL and an access code of at least 32 characters. APIs and the event stream require a bearer code or an eight-hour HMAC-protected HttpOnly/Secure/SameSite session. Browser mutations and event-stream origins are checked against PUBLIC_ORIGIN. Real codes/DB URLs belong only in the cloud secret manager; the office never stores them in localStorage or source. Alleged client agent-work and strategy-result endpoints are disabled. Perpetual execution and autonomous evaluation default off; deterministic risk is mandatory even for liquidation/reducing exits. The fund is not an autonomous perpetual target.

## AI spending boundary
Default runtime has no AI provider and permits zero calls. Adding an environment key does not enable AI. An enabled internal adapter must use explicit pinned pricing and hard token/request/cost caps; a durable reservation precedes the call. Provider failure/timeout does not prove zero charge and never triggers a paid retry. Persistence failure blocks further analytical calls in that process. Provider text has no broker, risk, history, memory or strategy-validation authority. Audit data is served only through existing authenticated API access. Raw provider errors and credentials are excluded from the audit. See AI_COST_CONTROLS.md for the adapter contract and pending activation review.

## Runtime diagnostics and drain
Only the exact minimal /health/live and /health/ready routes join the existing public /health exception. Detailed /runtime/readiness continues to require API authentication. It excludes credentials, URLs and raw job exception text. Login remains possible during storage failure so the operator can inspect read-only diagnostics. New mutations require a ready control plane; production storage/access/HTTPS prerequisites remain mandatory. Shutdown prevents new admission and drains admitted historical work before database close. No health flag authorizes risk, starts a paid call or connects real money. See RUNTIME_READINESS.md.
