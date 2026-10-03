# Development continuation queue

## Verified checkpoint
- Current head: 035cad2, feat/paper-performance-audit.
- PR #20: pixel office art direction, stacked on #19. CI passed (typecheck, full tests with PostgreSQL, build and container).
- PR #21: ledger-derived account outcome audit and finance/profile increment, stacked on #20. CI passed with 76 tests, zero failures and zero skips, plus typecheck/build/container.
- PRs #13–#21 are reviewable drafts; main remains untouched. Do not merge architecture changes without review.
- Browser review completed for desktop scene/profile and 390px mobile roster/map navigation. Generated assets and prompts/direction are documented in VISUAL_ASSETS.md.
- The user approved independent evaluation endowments and linear USDT perpetual paper simulation. Runtime must be 100% online; the isolated local preview is development verification only.
- The user authorized continued improvements while absent, including routine decisions. Preserve all product/security rules. They have no contracted cloud provider or database account.

## Next concrete work

1. Review account outcome edge cases and frontend audit accessibility. Do not infer performance from old counters or unrecorded fills. Preserve the difference between closed-operation results and marked account equity.
2. Prepare an analytical AI provider boundary and hard per-agent/global cost controls. Default it off. Retain evidence hashes, actual provider usage and model/pricing version. Unknown usage or failed persistence must not silently free an outstanding cost reservation. No repeated paid retries by default. Do not use account balances as an AI budget.
3. An LLM can provide a sourced analytical result; it cannot approve orders, edit risk rules, forge strategy validation or mutate actual fill/funding histories. Any actual execution continues through deterministic code and explicit independent paper accounts.
4. Improve cloud readiness diagnostics, source freshness, graceful shutdown, bounded background jobs and recoverable source failures. Retain the single-writer PostgreSQL lock and deterministic paper gates. Prepare provider configuration without provisioning accounts or enabling payment.
5. Extend accelerated historical studies with recorded real datasets and reviewed assumptions; maintain train/OOS ordering, funding provenance and failed-study history.
6. Strengthen continuous autonomous paper readiness with restart/funding/cursor evidence. No fund promotion or automatic activation. Hosted execution requires actual reviewed deployment and provider access.
7. Continue Pixel Office V3 over the approved artwork: backend-driven desk indicators, readable recorded event detail, agent audit navigation, observed equity/market charts and mobile accessibility. Never fill blank screens with imaginary ETH quotes, orders, work or profits.

## Existing boundaries

- PostgreSQL currently stores transactional snapshots plus immutable event rows with an advisory single-writer lock. This is not a multi-replica normalized portfolio ledger.
- Public quotes are sampled; liquidation/margin assumptions do not reproduce every exchange tier or intrapoll path.
- Portfolio V2 outcomes are read-only recorded-ledger projections, not a career score or audited real-money statement.
- No actual AI provider is connected; deterministic research roles are not advertised as LLM work.
- No cloud infrastructure has been provisioned. Budget/provider proposal and deployment handoff exist separately.
- No private exchange key, live broker or real-money connection exists.
- Review relevant repo docs and current Git/CI state before each increment. Avoid overwriting user work. Keep substantive increments on feature branches with draft PRs, tests and validated CI.

## Restore integrity increment
PR #22 will be the next reviewable increment: evaluation owner/account matching, unique actual fill IDs, supported perpetual symbol and unavailable outcome metrics after non-monotonic execution timestamps. No historical auto-repair, reseeding or invented fill is allowed. Validate current branch/PR/CI state before continuing.

## 2026-10-03 analytical AI increment
- PR #22 integrity checks were verified green before beginning; branch feat/ai-analysis-cost-controls stacks on fix/paper-ledger-attribution. Main remains unchanged.
- Baseline locally: typecheck passed; 78 tests passed, PostgreSQL integration skipped locally and passed in prior CI.
- Prepared disabled advisory AI boundary with durable reservations, independent global/per-agent caps, pinned price/input evidence, immutable history, read-only diagnostics and no paid retry.
- No provider adapter, external account, real price configuration, credential access, paid call or deployment was introduced.
- Next concrete increment: cloud readiness diagnostics (storage/source freshness/default-disabled autonomous gates), then bounded historical work and Pixel Office V3 audit/accessibility indicators. Connect actual paid AI only after specific provider/budget approval and adapter review.
- Do not infer that held reservations mean provider charges occurred; they explicitly represent unresolved maximum cost. Do not release them without verifiable evidence and a reviewed append-only reconciliation design.

Validation before opening the analytical increment: typecheck/build passed; full local suite passed 90 tests with the PostgreSQL test skipped locally. The focused analytical/storage checks also passed. The forthcoming draft PR CI must run all 91 tests with PostgreSQL plus the container build; do not claim CI completion until its result is checked.

### Verified analytical checkpoint
PR #23: https://github.com/Danrleyhsz/trading-lab/pull/23 (draft, stacked on #22). Code commit acdabe7 passed CI run 37093860927: 91 tests, zero failures/skips, typecheck, build and container build. An isolated loopback development smoke check confirmed healthy PAPER_TRADING mode, AI disabled, providerConfigured false, zero budget, zero AI records and executionAuthority false. No call was made. Main is still 90ebf7553492a031e2203a5fdeac17c97cde914f. Next: authenticated cloud readiness diagnostics; no external account or deployment prerequisite is available yet.
