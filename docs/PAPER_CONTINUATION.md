# Paper continuation integrity

This increment retains the existing cloud single-writer snapshot architecture, separate USD-M evaluation accounts and default-disabled autonomous execution. It strengthens continuation of the same recorded book; it does not enable a hosted trader or migrate the fund.

## Progress and history

JSON (development only) and PostgreSQL share a continuation guard. A previously saved perpetual book cannot disappear; its funding cursor cannot decrease, and its optional autonomous cursor cannot disappear/decrease. Cursors are positive safe integers; autonomous progress is an hourly candle opening timestamp. Account owner, initial endowment, creation time and original ledger prefix cannot change or disappear. Equal cursors remain valid for quote/control/other-state writes. New legacy snapshots without a perpetual book remain valid. There is no repair, cursor reset, reseeding or history inference.

Restore additionally rejects a funding cursor more than the existing quote tolerance of five seconds in the future, or an autonomous candle that is not yet closed relative to the runtime clock. A clock rollback may therefore prevent startup until the clock is corrected; it cannot silently rewind persisted progress. The initial funding cursor remains the account book's original creation cutoff, not proof that a settlement occurred at that time. This increment does not create missing historical funding or prove every original source row.

Checkpoint calls serialize with book mutations, require an hourly closed candle strictly after the current cursor and block after a failed book save until successful synchronization recovers persistence. Concurrent calls for the same candle have one successful commit. Failed persistence keeps the previous in-memory cursor and publishes no paper outcome.

## Known funding boundary

When a previously announced funding boundary is due and the cursor is still before it, synchronization requires an actual source row within one second of that expected timestamp. A later settlement outside that window cannot stand in for the missing row or skip it. Existing input validation still requires supported instrument, finite rate/positive settlement mark, strictly increasing timestamps after the cursor and no settlement beyond the quote mark time.

The due-boundary coverage check uses the actual cursor at or after the expected time. The former one-second subtraction could incorrectly treat a book created immediately before the boundary as already caught up. The one-second window now applies only to matching a supplied source row. If a row arrives slightly before the announced time and the source still announces that same past boundary, readiness conservatively waits for the next announcement; it does not invent another payment. Once the cursor covers the expected time, an unchanged announced boundary can be synchronized without requiring/charging its row again.

Invalid, incomplete or failed-save reconciliation changes no committed cash, cursor, mark, ledger or published payment. Successful recovery applies the original returned rows once. Historical signed position uses the existing strict-before-settlement fill rule and actual settlement mark/rate; no funding schedule is synthesized. Unknown boundaries and undocumented source gaps remain limitations of the public source and retained creation cutoff.

## Autonomous recovery

The cycle checks actual book market/funding readiness, halt and persistence state before requesting signal data and again after that asynchronous wait. It also rechecks study eligibility. The root runtime supplies its control-plane admission gate so startup, drain or global persistence failure stops a not-yet-checkpointed signal after retrieval. Already admitted work retains the existing shutdown/drain rules and deterministic risk on every proposed order; these gates never approve an order.

Source failure before checkpoint leaves that candle available for a later deterministic retry, with no decision, observation or fill inferred from the failure. Restored books begin without a current quote and require synchronization before evaluation. A restored saved candle is not processed again.

The existing at-most-once attempt policy remains: the cursor is saved before decision-evidence persistence and execution. Interruption after that save can skip an unexecuted or partially executed attempt. The cursor is **not** proof of a decision, risk approval, completed operation or fill. No automatic retry of a saved attempt, exactly-once workflow claim or fabricated recovery event is added. Atomic decision/execution completion would require a separately reviewed design.

## Validation and limits

Fixture-only tests cover cursor regressions/removal/malformed/future timestamps, immutable account/ledger evidence in both guards, failed writes/recovery, duplicate checkpoints, known missing funding, unchanged announced boundaries, repeated restart, source failure, stale market/funding/study, halt/drain gates and interruption after checkpoint. The PostgreSQL integration adds actual durable book/ledger/checkpoint preservation, rejected rollback/owner rewrite, a later valid write and restoration with no current quote. No synthetic fixture enters product data.

No public study/order, paper/autonomous activation, private exchange key, paid AI call, cloud account, provisioning or deployment is involved. Production still requires protected HTTPS, PostgreSQL and approved provider access; cloud backups/alerts/restore remain externally unverified. Approved office artwork and account performance projections are unchanged. Architectural changes remain drafts until reviewed.