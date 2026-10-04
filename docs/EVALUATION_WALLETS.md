# Independent virtual wallets before execution

EVALUATION_WALLETS_ENABLED defaults absent/false. An explicitly approved true value requires positive finite EVALUATION_PAPER_CAPITAL and initializes one existing USD-M evaluation wallet for each of the eight known agents. These are internal paper records, not exchange accounts or transfers from the fund. Initial allocation is not profit, experience, a fill or completed work.

The existing restore/ensure logic preserves wallet IDs, initial allocations, timestamps, ledger and risk state. Changing the configured capital does not top up or reset existing wallets. The existing initial awaited PostgreSQL snapshot save precedes serving; failed save prevents startup. No new store, schema or provisioning API exists.

All first-launch execution flags remain false: PAPER_EVALUATION_ENABLED, PERPETUAL_PAPER_ENABLED, AUTONOMOUS_PERPETUAL_ENABLED and LEGACY_PAPER_EXECUTION_ENABLED. Wallet creation grants no execution/risk/AI authority. First-launch configuration validates allocation but still rejects execution activation. Finance and agent profiles already read these wallets; source quotes may produce actual valuation samples, not trades.

This increment prepares allocation only. Do not change cloud variables until this release is reviewed and the virtual amount is chosen. After approved allocation, verify eight owners/IDs, unchanged fund equity, confirmed writes and disabled execution before any further study/risk/paper acceptance. Restart and compare original allocations/ledger; backups and restore remain independent acceptance.
