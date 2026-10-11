import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketTriggers, percentileRank, readingFrom, TRIGGER_POLICY } from '../src/application/market-triggers.js';
import { AgentMessageBus } from '../src/domain/agent-messages.js';
import { MemoryStore } from '../src/domain/memory.js';

test('percentil conta empates pela metade e não inventa valor sem amostras', () => {
  assert.equal(percentileRank([1, 2, 3, 4], 5), 100);
  assert.equal(percentileRank([1, 2, 3, 4], 0), 0);
  assert.equal(percentileRank([1, 1, 1, 1], 1), 50);
  assert.ok(Number.isNaN(percentileRank([], 1)));
});

test('alerta só depois de 24 h de amostras, só fora de P5–P95 e no máximo uma vez a cada 6 h', () => {
  let clock = 0,
    funding = 0.0001;
  const messages = new AgentMessageBus(),
    memories = new MemoryStore();
  const t = new MarketTriggers(
    () => ({ funding, oiChange1h: null, liquidations1h: null, takerDelta1h: null, priceChange1h: null }),
    messages,
    memories,
    () => clock,
  );
  const step = () => {
    clock += TRIGGER_POLICY.sampleMinutes * 60000;
    return t.sample();
  };
  funding = 0.009;
  assert.deepEqual(step(), [], 'sem histórico não há alerta, mesmo com valor extremo');
  for (let i = 0; i < TRIGGER_POLICY.minimumSamples; i++) {
    funding = 0.0001 + (i % 10) * 0.00001;
    step();
  }
  funding = 0.0001;
  assert.deepEqual(step(), [], 'valor normal não dispara');
  funding = 0.002;
  assert.deepEqual(step(), ['funding']);
  const m = messages.list().at(-1)!;
  assert.equal(m.from, 'flux');
  assert.deepEqual(m.to, ['atlas', 'euler']);
  assert.equal(m.context.advisoryOnly, true);
  assert.match(m.summary, /acima do percentil 95/);
  assert.deepEqual(step(), [], 'mesmo lado dentro de 6 h não repete');
  assert.equal(memories.query({ kind: 'OBSERVATION' }).length, 1);
  assert.equal(t.status().ready, true);
});

test('leitura usa a última hora completa e só dados recebidos', () => {
  const r = readingFrom(
    {
      openInterest: { history: [{ usd: 100 }, { usd: 110 }] },
      liquidations: {
        hourly: [
          { longs: 1, shorts: 2 },
          { longs: 5, shorts: 5 },
          { longs: 99, shorts: 0 },
        ],
      },
      flow: Array.from({ length: 60 }, () => ({ buy: 2, sell: 1 })),
      candles: { BTCUSDT: [{ c: 100 }, { c: 102 }, { c: 999 }] },
    },
    0.0003,
  );
  assert.equal(r.liquidations1h, 10, 'a hora em andamento fica de fora');
  assert.ok(Math.abs(r.oiChange1h! - 0.1) < 1e-12);
  assert.equal(r.takerDelta1h, 60);
  assert.ok(Math.abs(r.priceChange1h! - 0.02) < 1e-12);
  assert.equal(r.funding, 0.0003);
  assert.equal(
    readingFrom({ openInterest: null, liquidations: { hourly: [] }, flow: [], candles: {} }, null).oiChange1h,
    null,
  );
});
