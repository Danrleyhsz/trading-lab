# Pixel Office recorded audit navigation

The approved six-room pixel scene and sprites remain unchanged. This increment adds a read-only History panel and a source-event viewer, with per-account operation pages available from financial cards and agent profiles. No action in these views submits a trade, runs research, changes agent state, approves risk or calls AI.

## Confirmed records and original attribution

GET /audit/events returns at most 25 records by default (maximum 100), with optional original-ID `before` cursor, exact event `type` and explicitly attributed `accountId`. GET /audit/events/:id returns one original event. Both retain the existing production API authentication. Unsupported filters, invalid limits/cursors and claimed query fields are rejected. No POST audit submission exists.

The source is the last successfully saved snapshot held by the single runtime writer, or the actual restored snapshot on startup. The writer publishes that snapshot to the read model only after save resolves. A pending/failed write cannot make its event appear in this audit. Queries do not call PostgreSQL load while a writer transaction is running. The read model collects existing root domain events, legacy/perpetual ledgers and original research-run events, deduplicating identical IDs and rejecting conflicting copies. It caches by immutable snapshot identity; response objects are cloned.

Lists order by original occurredAt descending, with ID ascending for a stable tie. This is display ordering, not fill/funding economic chronology or a claim that clocks never roll back. Performance continues to use its unchanged recorded-ledger economic ordering and integrity rules. Pagination is a fresh view of the latest confirmed snapshot; it is not a frozen export or a database snapshot token. Late records can appear on a later refresh. No receipt index, ledger rewrite or synthetic cursor event is created.

Coverage is RECORDED_EVENTS_ONLY. High-frequency market quotes/source status are not persisted as a complete historical feed by this runtime. Legacy activity/memory references may lack an original retained event; the viewer reports missing evidence and never reconstructs it from a counter, room, summary or source ID. Storage/source failure reports unavailable evidence, excluding raw backend errors.

## Interface behavior

- History navigation offers exact type filters, refresh and older pages; empty/unavailable history stays explicit.
- Session activities are clickable. The viewer first requests the confirmed original; a 404 for an event actually received in this browser may show that exact received record, explicitly unconfirmed/possibly temporary. Authentication or other failures do not use that fallback.
- Agent activity/memory and closed-operation fill/funding IDs link to their original events. A missing original does not produce imagined work or execution.
- Account operation pages use the existing bounded performance APIs with the actual account identity/instrument. Fund, legacy evaluation and USD-M evaluation remain separate; no account totals are combined. Open operations remain outside win rate. Existing API availability/projection semantics remain unchanged.
- Original payloads appear as text in an optional expandable section; there is no HTML rendering of source summaries. These are protected audit data, not instructions or execution authority.
- Request versions prevent earlier filters/event/account responses and closed dialogs from overwriting newer selection. Keyboard focus survives live event list replacement; closing a detail returns to its opener or a control inside the parent modal if periodic refresh replaced that opener. Native dialog Escape remains available.
- Mobile navigation fits seven sections; controls have 44px targets, long IDs wrap, original payloads scroll, and the approved scene remains horizontally explorable.

The read projection is bounded in response size by record count, but scans/sorts an existing in-memory snapshot when it changes and can include a large original payload. It is not an indexed normalized PostgreSQL journal, complete market history or externally verified audit export. The additional retained snapshot/cache needs memory headroom during real cloud sizing. Production remains 100% online; no provider account/deploy is introduced.

## Verification

Tests cover original records, timestamp ties/cursors/filters, duplicates/conflicts, unpublished snapshot exclusion, restored legacy evidence, authentication, malformed evidence and no audit mutation path. UI checks cover safe text payloads, empty history, event/account paging, no fund mixing, stale-response races, received-only404 versus expired access, close cancellation, live keyboard focus and replacement of a parent opener. Browser QA uses the actual isolated development state without adding events/fills/studies solely for screenshots. Detailed nonempty audit scenarios use clearly marked test fixtures only.

Existing deterministic risk, paper-only execution, independent evaluation endowments and default-disabled autonomy/AI remain mandatory. Cloud provisioning, backups/alerts/restore and any paid analytical provider remain dependent on specifically approved access/account/budget. Draft architectural changes still require review before merge.
