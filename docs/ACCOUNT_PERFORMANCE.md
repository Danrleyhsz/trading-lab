# Account outcome performance

This is a read-only Portfolio V2 increment over existing append-only ledgers. It creates no fills, memories or domain events and changes no endowment or broker/risk decision.

A completed operation is one symbol's position lifecycle from flat to flat. Scaling and partial exits stay in the same lifecycle. A reversal completes the old lifecycle and opens another; the reversal's single recorded transaction fee is split in proportion to the quantity closing and opening. Unrealized price P&L is excluded from realized outcomes and win rate.

Net outcome = actual realized price P&L minus allocated recorded fees plus recorded funding cash delta. Liquidation fees already included in actual fills stay included. Long/short funding is assigned by the original settlement timestamp, including late publication. Funding at exactly a fill timestamp precedes that fill, consistent with the account book's strict-before-settlement exposure rule.

Wins/losses use net outcomes after costs; values within 1e-8 USDT count as breakeven. Win rate is wins / completed operations, including breakeven in the denominator. No completed operations means null win rate, even when an open position has positive unrealized P&L. Invalid/duplicate/unattributed evidence returns unavailable metrics and no synthetic result.

Coverage RECORDED_LEDGER_ONLY explicitly limits these metrics to recorded fills. Legacy gaps are not reconstructed from old transition counters. Career experience remains its documented transition count and is not upgraded into a performance rating.

## Read-only APIs

- GET /paper/accounts/:id/performance — legacy fund/evaluation, explicitly selected account.
- GET /paper/perpetual/accounts/:id/performance — independent USD-M evaluation only.
- Optional limit 1–100 (default 25), and before equal to the original last fill-event ID of a row returned on the previous page.
- Closed operations are newest first. Summary covers the recorded ledger; nextCursor is null at the end. Unsupported queries/unknown cursors return 400; unknown account returns 404.
- Account lists include compact metrics without full histories. Agent profiles include at most 20 recent completed outcomes per owned evaluation account, with event IDs. The fund is excluded from agent performance.
- Source ledgers remain available via existing /events endpoints. No outcome is written back into the historical ledger.

Append-only version caching avoids sorting an unchanged ledger on each price update. Read responses are cloned, so caller changes cannot modify cached projections. Open position valuation/drawdown continue to use existing account book snapshots, not these closed-operation statistics.

## Office

Profiles show account-level completed operations, opening/closing times, gross/net price result, fees, funding and source IDs. The finance panel charts only persisted equity observations, at their actual timestamps. Sample coverage is up to the existing 1440 minute bins; no pre-creation history or smooth synthetic candles are inserted.

These features do not authorize autonomous fund trading, establish exchange liquidation parity, provision cloud services or call an AI provider.
