# Analytical AI boundary and cost controls

This increment prepares a provider-neutral analytical boundary. No production AI adapter, SDK, API call, paid retry or external account is installed. Runtime constructs the disabled policy with no provider, zero budgets and zero permitted calls. AI_PROVIDER_API_KEY remains an unused placeholder. Setting an environment key cannot activate this component.

## Authority and evidence
The internal application service accepts a known agent, an idempotency key, a question and server-owned evidence with a source identifier. It retains the complete input, a SHA-256 evidence digest and a canonical input digest. A future research caller must select actual retained research/study evidence; a client-supplied statement is not proof of work. No public analysis-submission endpoint exists.

The provider receives advisory instructions and a copy of the input. The boundary supplies no broker, risk, strategy-validation, agent-career or memory capability. Responses remain untrusted analytical text in the AI audit. They do not create fills, approvals, strategy success, agent experience or memories. Prompt instructions alone are not the security boundary: execution capabilities are absent.

## Explicit budgets
All amounts are integer micro-US dollars, independent of simulated fund and evaluation capital. A future adapter requires explicit positive global and per-agent daily cost and request caps, input/output token caps and a timeout. Constructor configuration is copied; provider pricing is pinned with provider, model, currency and pricing version. No current commercial price is assumed.

Before any provider call, the service durably appends a RESERVED record for the ceiling cost. Calls serialize to prevent simultaneous overspending. Integer arithmetic rounds each token category upward; overflowing prices fail closed. The adapter must count input locally, use the pinned model, enforce the output cap including reasoning tokens, report all billable token usage, avoid automatic retries and support cancellation. This contract supports only versioned text-token ceiling billing. Tools, image/audio charges, uncapped reasoning, background polling and other billing categories need a separate reviewed contract; they must not be hidden in an adapter.

A valid response appends SETTLED with the original provider request ID, model, actual reported input/output counts and a usage-priced ceiling. That figure is not an invoice and is not invented provider spend. Cache discounts or lower billed amounts are not guessed. Duplicate provider request IDs, unknown extra billing fields, model changes or over-cap usage cannot create a valid settlement.

Provider errors, invalid responses and timeouts retain the full reservation. UNRESOLVED records contain a fixed reason, without copying provider exception text or secrets. A failed reservation write makes no call. A failed settlement write leaves the original reservation held and blocks further calls in that process. Restart preserves any unresolved reservation, including a crash after reservation but before the actual call. The service cannot prove that such a call was free or unattempted.

Outstanding reservations count against both cost and request caps on every subsequent day. Completed usage belongs to the UTC day of its reservation; this is the documented internal authorization accounting rule, not provider invoice timing. Clock rollback blocks new work. Reusing a completed idempotency key returns its stored result without a call; changing its evidence or question is rejected. Outstanding attempts are never automatically retried. There is no manual release/reconciliation endpoint yet. Any future reconciliation must preserve the original audit and use verifiable provider evidence.

## Persistence and diagnostics
StoredState.aiLedger is an optional append-only array, compatible with old snapshots. JSON development storage and PostgreSQL reject deletion, changes to a previous record, forged settlement amounts, missing attribution and invalid evidence hashes. PostgreSQL retains these records in its transactional snapshot with an append guard; this increment does not introduce a normalized AI billing table or separate immutable AI event rows.

Authenticated GET /ai/status reports actual configuration, budget counters, held reservations and whether persistence blocked this component. GET /ai/analyses/:id exposes recorded reservation/outcome detail or 404. No provider connection health is claimed: providerConfigured means only that an adapter was supplied. Production continues to have no adapter. No user interface pretends that an LLM is working.

## Verification and next dependencies
Tests use explicitly synthetic provider/price/evidence fixtures, with no network calls. They cover default-off behavior, durable ordering, budgets, simultaneous requests, idempotency, timeouts, unknown charges, failed writes, restart/midnight, clock rollback, input limits, malformed usage, immutable evidence and read-only audit routes.

Next: select and review an adapter's billing/cancellation contract, approve a real model/budget, provision actual credentials and wire server-retained research inputs. Those steps are not performed by this increment. Public deployment also remains dependent on an approved cloud/database account. Paper risk and execution remain deterministic and independent of this boundary.
