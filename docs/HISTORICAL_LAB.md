# Bounded historical laboratory

Historical USD-M studies now calculate in one isolated Node worker thread in the same cloud container. The main runtime remains responsible for public data loading, durable evidence, actual agent events, task admission and final persistence. No external queue, cloud account or separate service is introduced. This increment is pending review and does not provision hosting.

## Evidence and deterministic output

The existing study request remains `{bars, trainBars, testBars}`, with the existing server-owned five candidates and fixed model assumptions. Source loading must return exactly the requested count. The actual aligned trade/mark candles, funding records and dataset SHA-256 are saved while RUNNING before calculation starts. Failure to save evidence prevents calculation. Loaded evidence and admitted identity/request cannot be removed or rewritten in either the development JSON adapter or PostgreSQL, including before completion. Terminal outcomes remain immutable. Older records without the optional new hash remain readable; no old evidence is invented or recalculated on restore.

The worker receives a cloned dataset/configuration only. It calls the unchanged walk-forward simulator and deterministic RiskEngine. Training/OOS selection, fees, funding, mark stress, liquidation assumptions, audit entries, fold boundaries and numeric outputs remain identical. It has no supplied broker, account, persistence, event-bus, AI or agent-state capability. It cannot promote a study into paper execution. The parent verifies source hash/model/execution identity and keeps `automaticPaperApproval: false`.

Compiled worker environment and inherited runtime arguments are empty; the development worker receives only TSX_DISABLE_CACHE=1 to prevent loader file caches: database/access/provider environment variables are not copied. This is trusted internal code isolation, not an OS security sandbox; the Node thread still runs under the container's user and shares its CPU/process resources.

## Fixed resource and admission bounds

- One active calculation; overlapping calls are rejected. Existing study/research admission and single-writer database lock remain in force.
- At most 5,000 trade/mark bars, 5,000 funding records and five candidate configurations; training 100–3,000 bars and testing 50–1,000 bars. Dataset continuity/provenance validators remain mandatory.
- A 15-second parent timer covers worker startup and calculation. On expiry, failure, invalid reply or a normal result, the parent joins worker termination before releasing calculation admission or returning the outcome. There is no automatic calculation retry or partial-result acceptance.
- V8 worker limits: 128 MiB old generation, 16 MiB young generation and 4 MiB stack. These are V8 heap/stack limits, not a container-wide RSS limit or an external-memory guarantee. Configure container memory with additional headroom after real provider measurements.

The calculation timer excludes public-data loading and database writes. Fetches retain their existing per-request timeout and bounded pagination. The 30-second runtime signal grace still covers overall shutdown. A blocked database/source or provider force-kill can leave a durable RUNNING study; on restart it becomes INTERRUPTED, retaining any already saved inputs/hash and without a result. The parent timer remains schedulable while historical calculation runs, but OS scheduling, serialization, other synchronous work and worker termination can affect elapsed time. No hard real-time SLA or uninterrupted hosting is claimed.

Worker timeout/crash/invalid output produces FAILED with no simulation result, retains source evidence and records the actual BACKTEST_FAILED event. Source failures retain their existing failure semantics. Final persistence failures remain observable through the readiness tracker; a completion that did not become durable is not inferred on restart. Deterministic paper risk, independent evaluation endowments and default-disabled autonomous/AI operation are unchanged.

## Cloud and development compatibility

Compiled cloud code runs the JavaScript worker directly and does not require the development tsx loader. Development TypeScript execution registers the existing tsx loader only inside its worker. No dependency is added. CI runs the normal suite with PostgreSQL, builds the application, then exercises historical calculation/audit/drain tests from compiled JavaScript without `--import tsx`, and builds the cloud image.

Tests cover full result parity, original funding/risk audit, snapshot isolation, admission/reuse, bounds, invalid data, worker failure/exit/timeout, a 5,000-bar calculation with active parent timers, evidence-before-calculation, failed evidence persistence, durable interruption and final-write drain. JSON/SQL guards reject running-study evidence changes; the PostgreSQL integration checks actual transaction rejection and restart retention. All price/funding inputs in tests are explicitly synthetic fixtures, never production events.

Remaining work: reviewed cloud provisioning/restore/alerts, larger or parallel study scheduling if later required, and actual continuous-paper hosted observations. The current module preserves responsiveness within one container; it does not claim faster strategy profits, distributed acceleration, 24/7 hosting or deployment. No public study/order was triggered to validate this change.
