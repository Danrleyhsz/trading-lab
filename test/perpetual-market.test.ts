import test from 'node:test';
import assert from 'node:assert/strict';
import { BinancePerpetualMarket } from '../src/infrastructure/binance-perpetual-market.js';
import { perpetualDirection } from '../src/domain/perpetual-signals.js';
import { backtestPerpetual } from '../src/domain/perpetual-backtest.js';
const now = 1700000000000;
test('USD-M quote parser rejects stale/crossed/wrong instruments and retains true exchange times', async () => {
  let mode = 'valid';
  const request: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    return new Response(
      JSON.stringify(
        path.endsWith('bookTicker')
          ? {
              symbol: mode === 'wrong' ? 'ETHUSDT' : 'BTCUSDT',
              bidPrice: '100',
              askPrice: mode === 'crossed' ? '99' : '101',
              time: mode === 'stale' ? now - 20000 : now,
            }
          : {
              symbol: 'BTCUSDT',
              markPrice: '100.5',
              indexPrice: '100',
              lastFundingRate: '0.001',
              nextFundingTime: now + 28800000,
              time: now,
            },
      ),
    );
  };
  const market = new BinancePerpetualMarket(request, () => now);
  const quote = await market.quote();
  assert.equal(quote.bookTime, now);
  assert.equal(quote.markPrice, 100.5);
  assert.equal(quote.bid, 100);
  for (mode of ['stale', 'crossed', 'wrong']) await assert.rejects(market.quote());
});
test('funding source rejects missing settlement marks instead of synthesizing a payment price', async () => {
  const market = new BinancePerpetualMarket(
    async () => new Response(JSON.stringify([{ symbol: 'BTCUSDT', fundingTime: now, fundingRate: '0.001' }])),
    () => now,
  );
  await assert.rejects(market.funding(now - 1, now + 1), /invalid funding history/);
});
test('strategy families use only preceding closed candles and include both sides of fees in outcomes', () => {
  const cfg = {
    initialCapital: 1000,
    feeRate: 0.001,
    slippageBps: 0,
    maintenanceRate: 0.01,
    liquidationFeeRate: 0.005,
    positionFraction: 0.1,
    fastPeriod: 2,
    slowPeriod: 5,
  };
  const trade = Array.from({ length: 25 }, (_, i) => ({
    timestamp: i * 3600000,
    open: 100 + i,
    high: 100 + i,
    low: 100 + i,
    close: 100 + i,
    volume: 1,
  }));
  for (const strategy of ['SMA', 'BREAKOUT', 'MEAN_REVERSION'] as const) {
    const result = backtestPerpetual(
      { instrument: 'BINANCE_USDM:BTCUSDT', trade, mark: trade, funding: [] },
      { ...cfg, strategy },
    );
    assert.ok(Math.abs(result.tradeOutcomes.reduce((sum, n) => sum + n, 0) - result.netPnl) < 1e-8);
    assert.equal(result.trades, result.wins + result.losses);
  }
  assert.equal(perpetualDirection(trade.slice(0, 5), { ...cfg, strategy: 'SMA' }), 1);
  assert.equal(perpetualDirection(trade.slice(0, 5), { ...cfg, strategy: 'MEAN_REVERSION' }), 0);
});
