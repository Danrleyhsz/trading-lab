import test from 'node:test';
import assert from 'node:assert/strict';
import { GENESIS, type Quote } from '../scripts/estudos/tendencia-ao-vivo-lib.js';
import { DCA_LIVE, dcaHash, emptyState, monthsBetween, sma, step, verifyDcaLedger, type DcaLedger, type DcaRunRecord } from '../scripts/estudos/dca-ao-vivo-lib.js';

const book = (mid: number): Quote => ({ mid, bids: [[mid - 1, 1e6]], asks: [[mid + 1, 1e6]] });
const quotes = { BTCUSDT: book(100_000), ETHUSDT: book(4_000) };
const closes = { BTCUSDT: 100_000, ETHUSDT: 4_000 };
const above = { BTCUSDT: 90_000, ETHUSDT: 3_000 };
const below = { BTCUSDT: 110_000, ETHUSDT: 5_000 };

test('simples: aporta 50 por moeda e compra tudo contra o livro, com taxa', () => {
  const r = step('DCA_SIMPLES', emptyState(), true, quotes, closes, below);
  assert.equal(r.invested, 100);
  assert.equal(r.orders.length, 2);
  for (const o of r.orders) assert.ok(Math.abs(o.notional + o.fee - DCA_LIVE.monthlyPerSymbol) < 1e-9);
  assert.ok(Math.abs(r.cash.BTCUSDT) < 1e-9 && Math.abs(r.cash.ETHUSDT) < 1e-9);
  assert.equal(r.orders[0].avgPrice, 100_001); // paga a oferta de venda
  assert.ok(r.equity < 100 && r.equity > 99.8); // perde só taxa e spread
});

test('pausa: guarda o caixa abaixo da SMA200 e compra tudo quando volta acima', () => {
  let s = step('DCA_PAUSA_SMA200', emptyState(), true, quotes, closes, below);
  assert.equal(s.orders.length, 0);
  assert.deepEqual(s.held.map((h) => h.reason), ['BELOW_SMA200', 'BELOW_SMA200']);
  s = step('DCA_PAUSA_SMA200', s, true, quotes, closes, below);
  assert.equal(s.cash.BTCUSDT, 100);
  s = step('DCA_PAUSA_SMA200', s, false, quotes, closes, above);
  assert.equal(s.invested, 200);
  assert.ok(Math.abs(s.orders[0].notional + s.orders[0].fee - 100) < 1e-9);
});

test('pausa nunca compra sem média calculada', () => {
  const r = step('DCA_PAUSA_SMA200', emptyState(), true, quotes, closes, { BTCUSDT: NaN, ETHUSDT: NaN });
  assert.equal(r.orders.length, 0);
});

test('sem livro, o caixa fica guardado e registrado', () => {
  const r = step('DCA_SIMPLES', emptyState(), true, {}, closes, below);
  assert.deepEqual(r.held.map((h) => h.reason), ['NO_BOOK', 'NO_BOOK']);
  assert.equal(r.equity, 100);
});

test('auxiliares: média e meses entre datas', () => {
  assert.equal(sma([1, 2, 3, 4], 2), 3.5);
  assert.ok(Number.isNaN(sma([1], 2)));
  assert.equal(monthsBetween('2026-11', '2027-01'), 2);
});

test('cadeia de hashes detecta edição de rodada passada', () => {
  const ledger: DcaLedger = { protocol: DCA_LIVE.version, runs: [] };
  let prev = GENESIS;
  for (const month of ['2026-10', '2026-11']) {
    const accounts = { DCA_SIMPLES: step('DCA_SIMPLES', emptyState(), true, quotes, closes, below), DCA_PAUSA_SMA200: step('DCA_PAUSA_SMA200', emptyState(), true, quotes, closes, below) };
    const body: Omit<DcaRunRecord, 'hash'> = { n: ledger.runs.length + 1, runAt: month + '-01T01:00:00Z', month, contributed: true, missedMonths: 0, closes, sma200: below, accounts, prevHash: prev };
    const hash = dcaHash(body);
    ledger.runs.push({ ...body, hash });
    prev = hash;
  }
  assert.deepEqual(verifyDcaLedger(ledger), { ok: true, brokenAt: null });
  ledger.runs[0].accounts.DCA_SIMPLES.invested = 1;
  assert.deepEqual(verifyDcaLedger(ledger), { ok: false, brokenAt: 0 });
});
