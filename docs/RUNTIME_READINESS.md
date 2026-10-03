# Cloud runtime diagnostics and controlled shutdown

This increment prepares an observable single-writer cloud runtime without deploying or provisioning a service. Runtime remains exclusively paper. Independent evaluation capital, deterministic order risk and default-disabled autonomous/AI execution are unchanged.

## Health endpoints
- GET /health retains its existing storage-health contract for compatibility.
- GET /health/live is a minimal unauthenticated process-response check. It reports only ok and PAPER_TRADING. A failed market source does not turn it into an exchange-health claim.
- GET /health/ready is a minimal unauthenticated control-plane readiness check: 200 only after the first successful durable write and the listener enters SERVING. Startup, shutdown, unavailable storage, a failed write or detected clock rollback return 503. Production also requires the already-enforced PostgreSQL, protected access and HTTPS configuration. It exposes no database URL, access code, job detail or holdings.
- GET /runtime/readiness uses the existing authenticated API access and returns detailed read-only diagnostics. It remains inspectable when execution is blocked.

Use liveness to identify an unresponsive process and readiness to stop admission while storage/startup/shutdown blocks control-plane operations. Market-source availability is a separate diagnostic: the office can remain available to display a source outage. A positive control-plane readiness response is not permission to submit an order.

## Actual observations and paper gates
The tracker records writes queued in this process, confirmed durable-write timestamps and failed-write timestamps. It starts with no claimed successful write on every restart. A later successful write clears the current failure flag while retaining the last observed failure time. These are process-local observations, not a synthetic persistent uptime history.

Storage availability is the existing PostgreSQL connection/lock state plus write outcomes; it is not a fresh SELECT probe, replication/backups check or provider-host verification. Database availability may change before the next driver error/write result. Diagnostics explicitly retain this limitation.

Spot timestamps are labeled local receipt time and use the legacy 60-second bound. USD-M quote freshness uses the existing 15-second exchange/receipt checks with the 5-second future tolerance. Source failures, uninitialized/stale book quotes, failed book persistence and funding reconciliation can block perpetual submissions. The book exposes its original funding cursor/expected-time gate directly; its existing one-second settlement tolerance remains unchanged.

New-exposure readiness also requires existing independent accounts and an unhalted book. A halt does not remove reducing submissions: every actual reduction still goes through deterministic risk. Autonomous readiness additionally requires explicit activation, the real Nova account, an eligible retained study and an idle cycle. Last-attempt failures, actual active jobs and interrupted studies remain visible. These diagnostics never approve an order, infer a career result or activate paper/AI work.

POST mutations require a ready control plane. Login remains available so an operator can inspect private diagnostics during a storage outage. GET reads continue to report available state, with unavailable market/execution gates visible. The office access panel shows the diagnosis and actual block reasons. A stale/missing/partial diagnosis is cleared; newer source failures cannot be overwritten by an older response. The displayed diagnosis expires after 15 seconds, and supported browsers bound read requests with a 10-second abort timeout.

## Shutdown and historical work
On SIGTERM/SIGINT, the runtime enters DRAINING before closing Fastify. New HTTP mutations, research admission and historical-study admission are stopped. New autonomous decisions are not started during drain. Already admitted requests, market callbacks and studies may finish their existing work through the same risk/persistence paths.

Historical-study drain tracks the initial queued write as well as the active source/simulation/final write. It waits for the admitted task before closing PostgreSQL. Initial-write failures create no accepted study or synthetic source work. Final-write failures remain visible and do not escape as unhandled promises. The database closes only after the tracked task and queued snapshot writes finish.

Signal shutdown has a fixed 30-second grace deadline. If it expires, the process exits with failure. Any durable QUEUED/RUNNING study still restores as INTERRUPTED under the existing rule. A force-kill by the provider can interrupt work earlier. No completion, source result or fill is inferred. Synchronous historical simulation can delay the JavaScript timer until it yields; this deadline is not a hard CPU interruption mechanism. Historical worker/process isolation remains future work.

Single-writer deployments still require stop/drain/recreate, with planned downtime. No rolling/multi-replica availability or 24/7 hosting is claimed. Configure health alerts, graceful termination, backups and a restore drill with the selected provider after accounts/budget are approved.

## Verification
Tests exercise startup/write success/failure/recovery, clock rollback, production prerequisites, default-disabled gates, source freshness/failure, real book funding/halts, autonomous eligibility, minimal public/private diagnostics, mutation admission and historical drain races/failures. Office tests cover expired/partial diagnoses and stale-response races. Test fixtures do not create production activity or call paid providers.

Pending dependencies: architectural review of the stacked drafts; actual cloud/database account, protected origin, external health alerts, backups and deployment/restore verification. This increment creates no account, paid AI request, private exchange connection or public deployment.
