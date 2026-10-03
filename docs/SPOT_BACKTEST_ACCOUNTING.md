# Spot SMA historical accounting

New `HistoricalBacktester` calculations record model `SPOT_SMA_NEXT_OPEN_V2`, the actual configuration and total entry/exit fees. This corrects the legacy spot screen used by ResearchEngine and StrategyLab; the separate USD-M walk-forward simulator is unchanged.

## Execution and capital

Two completed candle closes establish a crossover. Its first possible fill uses the following observed candle's open with adverse configured slippage. A signal appearing only at the final close cannot create a position. Positions are long-only spot, one at a time, with entry fees reserved inside available simulated cash. There is no borrowing or leverage. The final open position closes at the last observed close with adverse slippage and an exit fee; this is an explicit window-boundary assumption.

Both entry and exit fees contribute to each closed outcome, winner/loss classification, net P&L and profit factor. The legacy field names `grossProfit` and `grossLoss` remain for compatibility but aggregate positive and negative **net** closed outcomes. Zero outcomes retain the existing non-winning classification. Closed net outcomes reconcile to final equity minus initial capital; `feesPaid` reports the simulated charges, not an invoice.

Drawdown observes available opens/closes and final closing of the position at the window boundary, including costs. It is not an intrabar-high/low stress metric. Execution has no volume-capacity, partial-fill or latency model. This remains an in-sample SMA screen and cannot imply out-of-sample profitability, exchange-equivalent execution or readiness for automatic trading.

## Evidence and compatibility

Invalid configuration, nonpositive/nonfinite prices, malformed OHLC ranges, negative volume, nonmonotonic timestamps and nonfinite calculations fail rather than produce performance. Input candles and configuration are not mutated. Research retains original source/hash/events alongside the versioned result through the existing storage path.

Version/configuration/fees fields are optional solely for retained older records. Restore does not recalculate old P&L, infer costs, assign the new version or rewrite history. The office distinguishes the new model from unversioned old research and labels all outcomes historical simulation. These metrics are never added to fund/evaluation account equity.

No broker, order API, deterministic risk rule, autonomy default, provider or runtime deployment changes. Actual paper proposals still require the mandatory deterministic Risk Engine; historical screening supplies no execution authorization.

## Validation

TEST_ONLY fixtures cover next-open gaps, absence of a next observation, a gross winner becoming a net loss after fees, final-cost drawdown, multiple-trade reconciliation and invalid arithmetic/data. Research tests verify event/result provenance and unchanged legacy restoration. Office tests verify version/cost labels without scheduling work. Fixtures never become production source/work/account records.
