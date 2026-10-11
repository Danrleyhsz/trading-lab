import test from 'node:test';
import assert from 'node:assert/strict';
import { compact } from '../scripts/estudos/pool-completo.js';

const H = 3600000,
  T0 = Date.UTC(2024, 0, 1);
test('compact: grade horária da primeira à última vela, buracos viram vela parada com volume zero e funding sem marca usa a abertura', () => {
  const raw = [0, 1, 3, 4].map((i) => ({ timestamp: T0 + i * H, open: 10 + i, close: 11 + i, volume: 5 })),
    s = compact('XXXUSDT', raw, [
      { timestamp: T0 + H + 5, rate: 0.0001, markPrice: 0 },
      { timestamp: T0 + 4 * H + 9, rate: 0.0002, markPrice: 15.5 },
      { timestamp: T0 - H, rate: 1, markPrice: 1 },
      { timestamp: T0 + 9 * H, rate: 1, markPrice: 1 },
    ]);
  assert.equal(s.count, 5);
  assert.equal(s.first, T0);
  assert.equal(s.filled, 1);
  // A hora 2 (faltando) repete o último fechamento nas duas pontas e tem volume zero.
  assert.deepEqual([s.o[2], s.c[2], s.v[2]], [12, 12, 0]);
  // Funding fora da vida da moeda sai; sem preço de marcação usa a abertura da vela da hora (hora 1: 11).
  assert.equal(s.funding.length, 2);
  assert.deepEqual(s.funding[0], [T0 + H + 5, 0.0001, 11]);
  assert.equal(s.fundingMarkFilled, 1);
  assert.equal(s.sha256.length, 64);
  // Sem velas: série vazia, sem erro.
  assert.equal(compact('YYYUSDT', [], []).count, 0);
});
