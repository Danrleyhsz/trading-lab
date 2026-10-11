import test from 'node:test';
import assert from 'node:assert/strict';
import type { MarketSnapshot } from '../src/domain/market-snapshot.js';
test('market snapshot shape supports derivatives intelligence', () => {
  const s: MarketSnapshot = {
    symbol: 'BTCUSDT',
    price: 100,
    bid: 99.9,
    ask: 100.1,
    spread: 0.2,
    spreadBps: 20,
    fundingRate: 0.0001,
    openInterest: 123,
    timestamp: 1,
  };
  assert.ok(Math.abs(s.ask - s.bid - s.spread) < 1e-9);
  assert.ok(s.openInterest! > 0);
});
