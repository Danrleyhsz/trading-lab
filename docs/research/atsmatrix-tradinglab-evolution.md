# ATS-MATRIX research -> TradingLab evolution plan

Status: research/design only  
Target: TradingLab paper-trading and agent-evaluation architecture  
Source inspiration: public ATS-MATRIX repositories by anyel1to  
Rule: do not copy presentation claims as verified capabilities. Preserve TradingLab architecture and identity.

## 1. Why this document exists

Public ATS-MATRIX projects contain useful ideas for multi-agent observability, routing, validation and visual control planes. Several public repositories explicitly describe their dashboards/telemetry as simulations or reference interfaces rather than production agent backends. TradingLab already has backend state, persistence, market adapters, research/study machinery, paper accounts and risk-oriented runtime controls. Therefore the goal is not to replace TradingLab with ATS-MATRIX. The goal is to adapt selected concepts to real TradingLab events.

## 2. Concepts worth adopting

### A. Decision pipeline / second reader
Represent important agent decisions as an explicit lifecycle:

TRADER -> RISK -> VALIDATOR -> PAPER EXECUTION -> AUDIT

A trader proposes an action. Risk checks exposure and limits. Validator independently checks that the evidence and market snapshot support the proposal. Paper execution acts only after required gates pass. Audit persists the complete receipt.

No component may treat UI state as authorization.

### B. Decision receipt
Every evaluated trade should be traceable with a durable receipt containing at minimum:
- decision/run id and agent id
- strategy/study/version provenance
- symbol, venue and market timestamp
- input snapshot identifiers
- proposed side, size, entry, stop and target when applicable
- rationale as structured reason codes plus optional explanation
- risk checks and outcomes
- validator checks and outcomes
- execution/rejection outcome
- latency per stage
- realized result when closed
- software/backend commit or fingerprint where available

Never persist credentials or provider secrets in receipts.

### C. Real telemetry, not decorative telemetry
Expose measurements from actual backend events:
- decisions proposed/accepted/rejected
- risk blocks by reason
- validation disagreements
- stage latency and total decision latency
- agent throughput
- stale-data rejection count
- paper order outcomes
- drawdown and risk-limit events
- provider/data-source failures

The office UI may visualize these metrics, but must not generate fake values when the backend has no observation. Unknown should remain unknown.

### D. Stress Lab
Create deterministic/reproducible adverse scenarios for the paper environment:
- abrupt BTC/ETH move
- volatility spike
- spread widening
- abnormal slippage
- stale/delayed market data
- missing candle
- market-data provider outage
- Binance/Bybit disagreement
- repeated stop sequence
- maximum-loss/drawdown boundary
- malformed/partial market snapshot
- duplicate/out-of-order events

Suggested metrics:
- shocks attempted/survived
- worst slippage
- max drawdown
- risk violations
- kill-switch activations
- incorrect executions
- correctly rejected actions
- recovery time
- stale-data blocks
- validator disagreement rate

A scenario is not "survived" merely because PnL is positive. Survival means invariants and risk controls remained intact.

### E. Handoff telemetry
For multi-agent collaboration, record bounded stage packets rather than blindly copying full transcripts. Track:
- sender/receiver
- intent
- required inputs
- budget/deadline if applicable
- success/stop condition
- output/evidence references
- latency
- failure reason

This is conceptual guidance, not a requirement to rewrite existing TradingLab messaging if current abstractions already provide equivalent provenance.

## 3. What NOT to import

Do not:
- replace the modular TradingLab backend with a monolithic HTML demo
- fabricate live-looking telemetry
- infer production capability from marketing/demo screens
- expose API/provider keys in browser inputs or localStorage
- send exchange secrets to the frontend
- add real-money execution as part of this work
- weaken existing APP_ACCESS_TOKEN/origin/read-only controls
- implement visual ornament before backend events exist
- copy code unless license compatibility and attribution obligations are verified

## 4. Proposed implementation phases

### Phase 0 - repository audit
Before editing:
1. inspect current main and recent history
2. identify existing decision, risk, event, paper execution, audit and provenance abstractions
3. map reusable components
4. run existing tests
5. report baseline
Do not implement until duplication risks are understood.

### Phase 1 - Decision Receipt schema
Add the smallest durable schema/adapters necessary to represent the real lifecycle. Prefer extending existing domain events/stores over creating parallel systems.

Acceptance:
- receipt is generated from real backend events
- deterministic IDs/provenance
- no secret material
- tests cover accepted and rejected decisions

### Phase 2 - Validator gate
Introduce independent validation before new paper exposure where architecture permits.

Validator should check, at minimum:
- freshness/completeness of market data
- strategy/study eligibility
- consistency of proposed parameters
- risk gate result
- relevant source/evidence references
- duplicate/replayed decision protection

Fail closed for missing mandatory evidence.

### Phase 3 - Stress Lab engine
Implement deterministic fixtures first. Every scenario must be seedable/replayable and produce machine-readable results.

Acceptance:
- baseline scenario
- adverse scenarios listed above
- invariant/risk assertions
- no external side effects
- reproducible report

### Phase 4 - Telemetry API
Aggregate real receipts/events into read-only telemetry. Respect current authentication model. Avoid returning internal secrets, raw credentials, or unnecessary sensitive configuration.

### Phase 5 - Office visualization
Only after backend telemetry is real:
- decision pipeline view
- agent handoffs
- risk blocks
- validator disagreements
- stress-test scoreboard
- stage latency
- decision trace drill-down

Keep current TradingLab pixel-art identity. ATS-MATRIX is reference material, not the visual target.

## 5. Security requirements

Because a future TradingLab version may connect user-owned exchange accounts:
- exchange credentials must remain server-side and encrypted/secret-managed
- frontend receives only minimum derived state
- tenant/account authorization must be enforced server-side
- rate limiting must be production-grade
- mutating routes and WebSockets require explicit authorization
- logs and receipts redact secrets
- stress tests must never reach real execution adapters
- paper/live execution boundaries must be explicit and fail closed
- CSP/security headers should be hardened before sensitive integrations

No real Binance keys are required for this plan.

## 6. Evaluation criteria

This work is successful if it improves correctness and observability, not merely appearance.

Measure:
- percent of decisions with complete receipts
- percent rejected for valid risk/data reasons
- validator disagreement rate
- false acceptance discovered by replay
- p50/p95 stage latency
- recovery after injected faults
- invariant violations (target: zero)
- reproducibility of stress runs

## 7. Public reference notes

Repositories reviewed as research references include:
- ATSMATRIX-AGENT-RING: routing/worker contract; README states the floor is currently simulated and production agent backend is not wired there.
- ATSMATRIX-AGENT-COMPOUND: pixel operations-floor concept; inspected JS contains simulated agent movement/events/metrics.
- ATSMATRIX-HORIZON: multi-agent research/market-oriented visual surface.
- atsmatrix-agent-visualizeR--ANYEL1TO: visual multi-agent/Gemini-oriented surface.

Treat repository-specific claims according to their own documentation and actual code. Do not convert demo values into TradingLab requirements.

## 8. Instructions for Claude/Codex

Read this document after the repository's canonical project/state/agent instructions.

Then:
1. inspect before modifying
2. produce a gap map: existing -> reusable -> missing
3. propose the minimum compatible implementation sequence
4. preserve current architecture
5. do not merge to main automatically
6. do not enable real-money execution
7. do not introduce credentials
8. tests are mandatory for each backend capability
9. distinguish backend truth from UI representation
10. stop and report if a proposed change conflicts with existing safety/runtime invariants

Recommended first deliverable: audit + gap map only. Do not build all phases in one pass.
