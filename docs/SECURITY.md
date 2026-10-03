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

## Internal historical calculation boundary
The bounded historical worker receives trusted cloned source/configuration data with no inherited environment or runtime arguments (development sets only its loader cache-disable flag). No database/access/provider secrets, execution APIs, broker, agent registry or AI adapter are passed to it. Running-study source/hash and admitted request/identity are immutable in JSON and PostgreSQL; worker failures reveal fixed reasons without stack/environment details. Internal worker code is not an OS sandbox and retains the container user's capabilities; do not accept arbitrary uploaded worker code or module URLs through product APIs. Deterministic historical risk and actual paper risk remain mandatory. See HISTORICAL_LAB.md.

## Read-only audit access
The new audit list/detail routes remain behind existing production API authentication; only minimal health routes are public. Strict bounded queries reject arbitrary claimed records/filters. Only confirmed snapshots supply recorded history; conflicts/malformed evidence fail closed with fixed errors. Source text/JSON is inserted with textContent, never interpreted as HTML or instructions. Received-only fallback is limited to an actual session record after a 404; access failures cannot display it. No audit mutation, risk bypass, paid AI call or private exchange capability exists. See OFFICE_AUDIT.md.

## Continuation and recovery controls
Both stores reject rollback/removal of saved perpetual progress and rewrite/deletion of perpetual account identity/endowment/ledger prefixes. Restore fails on malformed/future cursors rather than resetting them. A known due funding record cannot be replaced with a later timestamp to bypass reconciliation. Runtime admission and book gates are rechecked after signal retrieval; no recovery cursor authorizes risk or proves an execution. No activation, repair endpoint, private exchange credential or paid capability is added. See PAPER_CONTINUATION.md.
## Cosmetic presence and collaboration boundary
The browser presence controller cannot submit work, approve risk, execute paper orders or append history. Room actions only open existing views; existing explicit controls retain server authentication/admission/risk checks. Communication IDs, known participants, kinds and dates are validated before presentation, and content renders through textContent. Initial history is not replayed as current speech; malformed/access-failed responses clear communications rather than fabricate them. Original artwork is retained: no third-party code/asset import or license-sensitive dependency was added. Cosmetic walking never counts as work, meeting, memory, experience or profit.
## Navigation and furniture controls
Geometry/path reservations are confined to the browser; they cannot alter agent registry, history, memory, risk or account state. Unknown rooms/off-grid geometry produce no path, and search/active-view work is bounded. Furniture IDs are selected from the static known catalog and map only to existing read-only view navigation; they do not execute tools, accept scripts or submit tasks. The new static JS file joins the explicit allowlist; arbitrary paths remain forbidden. Existing explicit paper/research actions retain server safeguards and default-disabled execution/paid AI.
## Recorded communication highlights
Collaboration reads the existing authenticated message endpoint only. Last-window IDs/known participants/kinds/dates are checked, duplicate IDs/recipients and observed field rewrites fail closed; source text renders through textContent. Invalid/access-failed reads clear details, selection, lines and speech. SVG uses only finite visible participant coordinates and has no pointer/execution capability. Test-only nonempty browser scenarios are isolated from the actual preview/backend and carry an explicit fixture banner; no test record is uploaded to a product API. This is not a durable acknowledgement or authorization mechanism.

## Browser room transitions
The explicit static allowlist serves transitions.js. Its geometry/animation director has no network, broker, risk, AI or store capability. Matching fresh events may project movement only; invalid/unknown/blocked inputs and stale callbacks fail closed. Presentation reservations do not approve work or trades. QA route overlays remain separate loopback fixtures with no product mutation/provider access; production protections/default-disabled execution are unchanged.

## Workstations — 2026-10-03

Workstation geometry/art/monitors remain read-only browser presentation. Source text uses textContent, unknown rooms do not get seats, and original event links require matching state identity/time/room/status/reason. Monitors cannot schedule research, approve risk, submit orders, mutate memory or call AI. The new script and PNG are explicit static allowlist entries. See OFFICE_WORKSTATIONS.md.
