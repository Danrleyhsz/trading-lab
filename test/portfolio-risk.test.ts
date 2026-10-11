import test from 'node:test';
import assert from 'node:assert/strict';
import { Portfolio } from '../src/domain/portfolio.js';
import { RiskEngine } from '../src/domain/risk.js';
import { PaperBroker } from '../src/domain/broker.js';
import { EventBus } from '../src/application/event-bus.js';
import { TradingService } from '../src/application/trading-service.js';
test('risk rejects oversized position', () => {
  const p = new Portfolio(10000);
  const d = new RiskEngine().evaluate(
    { symbol: 'BTCUSDT', side: 'BUY', quantity: 1, referencePrice: 5000 },
    p.snapshot(),
  );
  assert.equal(d.approved, false);
  assert.ok(d.reasons.includes('POSITION_LIMIT'));
});
test('approved paper trade updates portfolio and emits auditable events', async () => {
  const p = new Portfolio(10000),
    bus = new EventBus(),
    types: string[] = [];
  bus.subscribe((e) => types.push(e.type));
  const s = new TradingService(new PaperBroker(0, 0), p, new RiskEngine(), bus);
  const r = await s.propose({ symbol: 'BTCUSDT', side: 'BUY', quantity: 0.01, referencePrice: 50000 });
  assert.equal(r.status, 'filled');
  assert.equal(p.snapshot().positions[0]?.quantity, 0.01);
  assert.deepEqual(types, ['TRADE_PROPOSED', 'RISK_APPROVED', 'PAPER_ORDER_SUBMITTED', 'PAPER_FILL']);
});
test('closing long realizes pnl', async () => {
  const p = new Portfolio(10000),
    b = new PaperBroker(0, 0);
  p.applyFill(await b.submit({ symbol: 'BTCUSDT', side: 'BUY', quantity: 1, referencePrice: 100 }));
  p.applyFill(await b.submit({ symbol: 'BTCUSDT', side: 'SELL', quantity: 1, referencePrice: 110 }));
  assert.equal(p.snapshot().realizedPnl, 10);
  assert.equal(p.snapshot().equity, 10010);
});
