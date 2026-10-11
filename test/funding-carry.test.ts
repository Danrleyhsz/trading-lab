import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateFundingCarry, type CarryConfig, type CarryMarket } from '../src/domain/funding-carry.js';

const H = 3600000,
  T0 = Date.UTC(2024, 0, 1);
const cfg: CarryConfig = {
  rebalanceHours: 24,
  signalHours: 24,
  maxPositions: 2,
  positionFraction: 0.1,
  entryMinimumFunding: 0.0003,
  exitFunding: 0,
  minimumCashToShortNotional: 0.5,
  spotFeeRate: 0.001,
  perpFeeRate: 0.00055,
  slippageBps: 0,
  maintenanceRate: 0.01,
  initialCapital: 10000,
};
/** Mercado com preço `price(i)` igual à vista e no perpétuo e funding a cada 8 h com taxa `rate(ts)`. */
function market(
  hours: number,
  price: (i: number) => number,
  rate: (ts: number) => number,
  fundingFrom = -24,
): CarryMarket {
  const candles = Array.from({ length: hours }, (_, i) => {
    const o = price(Math.max(0, i - 1)),
      c = price(i);
    return { timestamp: T0 + i * H, open: o, high: Math.max(o, c), low: Math.min(o, c), close: c, volume: 1 };
  });
  const funding = [];
  for (let h = fundingFrom; h < hours; h += 8)
    funding.push({ timestamp: T0 + h * H, rate: rate(T0 + h * H), markPrice: price(Math.max(0, h)) });
  return { spot: candles, perp: structuredClone(candles), funding };
}

test('preço parado e funding positivo: o lucro é o funding recebido menos as taxas, e a entrada só usa funding já liquidado', () => {
  const r = simulateFundingCarry(
    {
      AAA: market(
        200,
        () => 100,
        () => 0.0002,
      ),
    },
    cfg,
  );
  assert.equal(r.entries, 1);
  assert.equal(r.decisions[0].opened[0], 'AAA');
  assert.ok(Math.abs(r.decisions[0].signals.AAA - 0.0006) < 1e-12, '3 liquidações nas 24 h antes do fechamento');
  assert.ok(r.fundingReceived > 0);
  assert.ok(
    Math.abs(r.netPnl - (r.fundingReceived - r.feesPaid)) < 1e-9,
    'sem variação de preço, a diferença de preços não dá resultado',
  );
  assert.ok(Math.abs(r.basisPnl) < 1e-9);
  // Funding de 0,02% sobre 1 000 de nocional por liquidação, a partir da abertura da vela 1.
  const settlementsHeld = Math.floor((200 - 1) / 8);
  assert.ok(Math.abs(r.fundingReceived - settlementsHeld * 1000 * 0.0002) < 1e-6);
});

test('alta forte do preço: à vista e perpétuo se anulam e o patrimônio fica estável', () => {
  const r = simulateFundingCarry(
    {
      AAA: market(
        200,
        (i) => 100 * 1.003 ** i,
        () => 0.0002,
      ),
    },
    cfg,
  );
  assert.ok(r.maxDrawdown < 0.005, 'a alta não derruba o patrimônio');
  assert.equal(r.liquidatedAt, null);
  assert.ok(r.minimumMarginRatio! > 0.5);
});

test('funding vira negativo: a moeda sai na decisão seguinte; abaixo do mínimo, nada entra', () => {
  const flip = T0 + 60 * H;
  const r = simulateFundingCarry(
    {
      AAA: market(
        200,
        () => 100,
        (ts) => (ts < flip ? 0.0002 : -0.0001),
      ),
    },
    cfg,
  );
  assert.equal(r.entries, 1);
  assert.equal(r.exits, 1);
  assert.ok(r.decisions.some((d) => d.closed.includes('AAA')));
  const none = simulateFundingCarry(
    {
      AAA: market(
        200,
        () => 100,
        () => 0.00005,
      ),
    },
    cfg,
  );
  assert.equal(none.entries, 0);
  assert.equal(none.netPnl, 0);
});

test('limite de carteira e ranking: entram as de maior funding, até o máximo', () => {
  const r = simulateFundingCarry(
    {
      AAA: market(
        100,
        () => 100,
        () => 0.0002,
      ),
      BBB: market(
        100,
        () => 50,
        () => 0.0005,
      ),
      CCC: market(
        100,
        () => 10,
        () => 0.0003,
      ),
    },
    cfg,
  );
  assert.deepEqual(r.decisions[0].opened, ['BBB', 'CCC']);
  assert.equal(r.entries, 2);
});

test('margem: a regra recusa entrar quando o caixa ficaria abaixo do mínimo e registra liquidação no pior caso', () => {
  const tight = simulateFundingCarry(
    {
      AAA: market(
        50,
        () => 100,
        () => 0.0002,
      ),
    },
    { ...cfg, positionFraction: 0.5, maxPositions: 2, minimumCashToShortNotional: 1.1 },
  );
  assert.equal(tight.entries, 0);
  const squeeze = simulateFundingCarry(
    {
      AAA: market(
        100,
        (i) => (i < 30 ? 100 : 2000),
        () => 0.0002,
      ),
    },
    { ...cfg, positionFraction: 0.5, maxPositions: 1, minimumCashToShortNotional: 0 },
  );
  assert.notEqual(squeeze.liquidatedAt, null);
});

test('dados desalinhados são recusados', () => {
  const a = market(
      50,
      () => 100,
      () => 0.0002,
    ),
    b = market(
      49,
      () => 100,
      () => 0.0002,
    );
  assert.throws(() => simulateFundingCarry({ AAA: a, BBB: b }, cfg), /unaligned/);
});
