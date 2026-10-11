import test from 'node:test';
import assert from 'node:assert/strict';
import { RiskEngine, isReducing } from '../src/domain/risk.js';
import { PerpetualRiskEngine } from '../src/domain/perpetual-risk.js';
import { PERPETUAL_INSTRUMENT, type PerpetualQuote } from '../src/domain/perpetual-market.js';
import type { PortfolioSnapshot } from '../src/domain/portfolio.js';
const now = 1700000000000;
const quote: PerpetualQuote = {
  instrument: PERPETUAL_INSTRUMENT,
  symbol: 'BTCUSDT',
  bid: 100,
  ask: 100,
  markPrice: 100,
  indexPrice: 100,
  fundingRate: 0.01,
  nextFundingTime: now + 28800000,
  bookTime: now,
  markTime: now,
  receivedAt: now,
};
// Posição atual em BTCUSDT (0 = sem posição, negativa = vendida) e a ordem; `reducing` é a resposta esperada para "reduz a posição?".
const cases: { name: string; position: number; side: 'BUY' | 'SELL'; quantity: number; reducing: boolean }[] = [
  { name: 'sem posição, comprar', position: 0, side: 'BUY', quantity: 1, reducing: false },
  { name: 'sem posição, vender', position: 0, side: 'SELL', quantity: 1, reducing: false },
  { name: 'comprado, aumentar', position: 2, side: 'BUY', quantity: 1, reducing: false },
  { name: 'comprado, reduzir', position: 2, side: 'SELL', quantity: 1, reducing: true },
  { name: 'comprado, zerar', position: 2, side: 'SELL', quantity: 2, reducing: true },
  { name: 'comprado, inverter de lado', position: 2, side: 'SELL', quantity: 3, reducing: false },
  { name: 'vendido, aumentar', position: -2, side: 'SELL', quantity: 1, reducing: false },
  { name: 'vendido, reduzir', position: -2, side: 'BUY', quantity: 1, reducing: true },
  { name: 'vendido, zerar', position: -2, side: 'BUY', quantity: 2, reducing: true },
  { name: 'vendido, inverter de lado', position: -2, side: 'BUY', quantity: 3, reducing: false },
];
// Equity de 600 sobre 1000 de capital: abaixo do limite de perda, então só uma ordem que reduz posição passa. Com o kill switch
// ligado no motor de perpétuos, o mesmo vale lá. Assim `approved` de cada motor é exatamente a resposta de "reduz?".
const portfolio = (position: number, symbol = 'BTCUSDT'): PortfolioSnapshot => ({
  initialCash: 1000,
  cash: 600,
  equity: 600,
  realizedPnl: 0,
  unrealizedPnl: 0,
  positions: position === 0 ? [] : [{ symbol, quantity: position, averageEntry: 100, realizedPnl: 0 }],
});
const controls = { halted: true, peakEquity: 1000, dailyStartEquity: 1000 };
test('both risk engines agree on whether an order reduces the position: none, increase, reduce, flatten, flip', () => {
  const spot = new RiskEngine(),
    perpetual = new PerpetualRiskEngine();
  for (const c of cases) {
    const order = { symbol: 'BTCUSDT', side: c.side, quantity: c.quantity, referencePrice: 100 },
      book = portfolio(c.position);
    assert.equal(
      isReducing(c.position, c.position + (c.side === 'BUY' ? c.quantity : -c.quantity)),
      c.reducing,
      c.name + ' (helper)',
    );
    const a = spot.evaluate(order, book),
      b = perpetual.evaluate(order, book, quote, controls, now);
    assert.equal(a.approved, c.reducing, c.name + ' (RiskEngine)');
    assert.equal(b.approved, c.reducing, c.name + ' (PerpetualRiskEngine)');
    if (c.reducing) {
      assert.deepEqual(a.reasons, []);
      assert.deepEqual(b.reasons, []);
    } else {
      assert.ok(a.reasons.includes('LOSS_LIMIT'), c.name);
      assert.ok(b.reasons.includes('KILL_SWITCH') && b.reasons.includes('LOSS_LIMIT'), c.name);
    }
  }
});
test('a position in another symbol, or a leftover flat one, never makes an order a reduction', () => {
  const spot = new RiskEngine(),
    perpetual = new PerpetualRiskEngine(),
    order = { symbol: 'BTCUSDT', side: 'SELL' as const, quantity: 1, referencePrice: 100 };
  for (const book of [
    portfolio(2, 'ETHUSDT'),
    { ...portfolio(0), positions: [{ symbol: 'BTCUSDT', quantity: 0, averageEntry: 100, realizedPnl: 0 }] },
  ]) {
    assert.equal(spot.evaluate(order, book).approved, false);
    assert.equal(perpetual.evaluate(order, book, quote, controls, now).approved, false);
  }
  assert.equal(isReducing(0, -1), false);
});
