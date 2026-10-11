import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  backtestPerpetual,
  validatePerpetualDataset,
  type PerpetualDataset,
} from '../src/domain/perpetual-backtest.js';
import { RiskEngine } from '../src/domain/risk.js';
const cfg = {
  initialCapital: 1000,
  feeRate: 0.001,
  slippageBps: 0,
  maintenanceRate: 0.01,
  liquidationFeeRate: 0.005,
  positionFraction: 0.1,
  fastPeriod: 1,
  slowPeriod: 2,
};
const dataset = (prices: number[]): PerpetualDataset => {
  const candles = prices.map((close, i) => ({
    timestamp: i * 3600000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  return { instrument: 'BINANCE_USDM:BTCUSDT', trade: candles, mark: structuredClone(candles), funding: [] };
};
test('linear simulation charges both fees and original funding settlement, without broker events', () => {
  const data = dataset([100, 110, 120, 120]);
  data.funding = [{ timestamp: 10800001, rate: 0.01, markPrice: 120 }];
  const result = backtestPerpetual(data, cfg);
  assert.ok(Math.abs(result.netPnl - -1.2) < 1e-9);
  assert.equal(result.feesPaid, 0.2);
  assert.equal(result.fundingCashDelta, -1);
  assert.equal(result.execution, 'HISTORICAL_SIMULATION');
  assert.equal(result.audit.find((e) => e.kind === 'FUNDING')!.timestamp, 10800001);
});
test('shorts receive positive funding and pay both transaction fees', () => {
  const data = dataset([120, 110, 100, 100]);
  data.funding = [{ timestamp: 10800001, rate: 0.01, markPrice: 100 }];
  const result = backtestPerpetual(data, cfg);
  assert.ok(Math.abs(result.netPnl - 0.8) < 1e-9);
  assert.equal(result.fundingCashDelta, 1);
});
test('only prior completed closes influence an open proposal', () => {
  const a = dataset([100, 110, 120, 120]),
    b = structuredClone(a);
  b.trade[2].close = 1;
  b.trade[2].low = 1;
  const first = (d: PerpetualDataset) => backtestPerpetual(d, cfg).audit.find((e) => e.kind === 'PROPOSAL');
  assert.deepEqual(first(a), first(b));
});
test('rejects candle gaps and duplicate funding rather than filling missing observations', () => {
  const a = dataset([100, 110, 120]);
  a.mark[1].timestamp++;
  assert.throws(() => validatePerpetualDataset(a));
  const b = dataset([100, 110, 120]);
  b.funding = [
    { timestamp: 1, rate: 0.01, markPrice: 100 },
    { timestamp: 1, rate: 0.01, markPrice: 100 },
  ];
  assert.throws(() => validatePerpetualDataset(b));
});
test('risk permits a strictly reducing exit after loss, but rejects reversal and new exposure', () => {
  const portfolio = {
    initialCash: 1000,
    cash: -10,
    equity: -10,
    realizedPnl: 0,
    unrealizedPnl: 0,
    positions: [{ symbol: 'BTCUSDT', quantity: 1, averageEntry: 100, realizedPnl: 0 }],
  };
  const risk = new RiskEngine();
  assert.equal(
    risk.evaluate({ symbol: 'BTCUSDT', side: 'SELL', quantity: 1, referencePrice: 100 }, portfolio).approved,
    true,
  );
  assert.equal(
    risk.evaluate({ symbol: 'BTCUSDT', side: 'SELL', quantity: 2, referencePrice: 100 }, portfolio).approved,
    false,
  );
});
test('conservative mark stress liquidates through an approved risk proposal and retains deficit', () => {
  const data = dataset([120, 110, 100, 100]);
  data.mark[3].high = 2000;
  data.trade[3].high = 2000;
  // Short position exposed to an extreme adverse mark.
  data.trade[0].close = 120;
  data.trade[0].open = 120;
  data.trade[0].high = 120;
  data.trade[0].low = 120;
  data.trade[1].close = 110;
  const result = backtestPerpetual(data, cfg);
  assert.equal(result.liquidations, 1);
  assert.ok(result.finalEquity < 0);
  assert.ok(result.audit.some((e) => e.kind === 'PROPOSAL' && e.approved));
});
