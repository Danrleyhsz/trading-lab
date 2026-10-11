import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BinanceMarketPanorama,
  PANORAMA_STREAMS,
  openInterestCandles,
} from '../src/infrastructure/binance-market-panorama.js';
import { pilotTimeline } from '../src/application/pilot-timeline.js';
import { PerpetualPaperBook } from '../src/application/perpetual-paper-book.js';
import { EventBus } from '../src/application/event-bus.js';
import type { DomainEvent } from '../src/domain/events.js';

const HOUR = 3600000;
let clock = Date.UTC(2026, 9, 5, 12, 30);
const now = () => clock;
const frame = (data: unknown) => JSON.stringify({ stream: 'x', data });

test('panorama parses public frames and ignores malformed, foreign or crossed data', () => {
  const p = new BinanceMarketPanorama(
    async () => {
      throw Error('TEST_ONLY no REST');
    },
    now,
    () => {
      throw Error('no socket');
    },
  );
  p.frame('u', 'not json');
  p.frame('u', frame({ e: '24hrMiniTicker', s: 'FOOUSDT', c: '1', o: '1' }));
  p.frame(
    'u',
    frame({ e: '24hrMiniTicker', E: clock, s: 'ETHUSDT', c: '2750', o: '2500', h: '2800', l: '2490', q: '1000' }),
  );
  p.frame(
    'u',
    frame({ e: 'kline', s: 'BTCUSDT', k: { i: '1h', t: clock - HOUR, o: '1', h: '2', l: '0.5', c: '1.5' } }),
  );
  p.frame(PANORAMA_STREAMS[1], frame({ e: 'kline', s: 'BTCUSDT', k: { i: '1m', t: clock - 60000, v: '10', V: '7' } }));
  p.frame('u', frame({ e: 'forceOrder', E: clock, o: { S: 'SELL', ap: '100000', z: '0.5', T: clock } }));
  p.frame('u', frame({ e: 'forceOrder', E: clock, o: { S: 'BUY', ap: '100000', z: '0.2', T: clock } }));
  p.frame('u', frame({ e: 'depthUpdate', s: 'BTCUSDT', E: clock, b: [['101', '1']], a: [['100', '1']] }));
  let s = p.snapshot();
  assert.deepEqual(Object.keys(s.tickers), ['ETHUSDT']);
  assert.equal(s.tickers.ETHUSDT.change24h.toFixed(6), '0.100000');
  assert.deepEqual(s.candles.BTCUSDT, [{ t: clock - HOUR, o: 1, h: 2, l: 0.5, c: 1.5 }]);
  assert.deepEqual(s.flow, [{ t: clock - 60000, buy: 7, sell: 3 }]);
  assert.equal(s.liquidations.longs, 50000, 'a SELL liquidation closes a long');
  assert.equal(s.liquidations.shorts, 20000);
  assert.equal(s.book, null, 'a crossed book is rejected');
  assert.equal(s.liquidations.hourly.length, 24);
  p.frame('u', frame({ e: 'depthUpdate', s: 'BTCUSDT', E: clock, b: [['99', '1']], a: [['100', '2']] }));
  s = p.snapshot();
  assert.deepEqual(s.book!.asks, [[100, 2]]);
  clock += 11000;
  assert.equal(p.snapshot().book, null, 'stale depth is not shown');
  assert.equal(s.scope, 'PUBLIC_MARKET_CONTEXT_ONLY');
});

test('gráficos ao vivo: spot e perpétuo separados pelo stream, 1m e 1h, frescor e variação de 24 h só com dados completos', () => {
  clock = Date.UTC(2026, 9, 5, 12, 30);
  const MIN = 60000;
  const p = new BinanceMarketPanorama(
    async () => {
      throw Error('TEST_ONLY no REST');
    },
    now,
    () => {
      throw Error('no socket');
    },
  );
  const k = (i: string, t: number, o: number, c: number) => ({
    i,
    t,
    o: String(o),
    h: String(Math.max(o, c) + 1),
    l: String(Math.min(o, c) - 1),
    c: String(c),
    v: '5',
    V: '3',
  });
  p.frame(PANORAMA_STREAMS[0], frame({ e: 'kline', s: 'BTCUSDT', k: k('1m', clock - MIN, 100, 101) }));
  p.frame(PANORAMA_STREAMS[1], frame({ e: 'kline', s: 'BTCUSDT', k: k('1m', clock - MIN, 200, 199) }));
  p.frame(PANORAMA_STREAMS[0], frame({ e: 'kline', s: 'ETHUSDT', k: k('1m', clock - MIN, 10, 11) }));
  p.frame(PANORAMA_STREAMS[0], frame({ e: 'kline', s: 'SOLUSDT', k: k('1m', clock - MIN, 1, 2) }));
  assert.equal(p.chart('BTCUSDT', '1m')!.last, 101, 'spot BTC vem do stream spot');
  assert.equal(p.chart('BTCPERP', '1m')!.last, 199, 'o mesmo símbolo no fstream é o perpétuo');
  assert.equal(p.chart('BTCPERP', '1m')!.market, 'BINANCE_USDM');
  assert.equal(p.chart('ETHUSDT', '1m')!.candles[0].v, 5);
  assert.deepEqual(p.snapshot().flow, [{ t: clock - MIN, buy: 3, sell: 2 }], 'só o 1m do perpétuo alimenta o fluxo');
  assert.equal(p.chart('SOLUSDT', '1m'), null, 'símbolo fora da lista');
  assert.equal(p.chart('BTCUSDT', '5m'), null, 'intervalo fora da lista');
  assert.equal(p.chart('BTCUSDT', '1m')!.fresh, true);
  clock += 91000;
  assert.equal(p.chart('BTCUSDT', '1m')!.fresh, false, 'sem dado novo em 90 s a tela deixa de parecer ao vivo');
  // Atualização do candle aberto substitui o mesmo horário; não duplica.
  p.frame(PANORAMA_STREAMS[1], frame({ e: 'kline', s: 'BTCUSDT', k: k('1m', clock - 91000 - MIN, 200, 205) }));
  assert.deepEqual(
    p.chart('BTCPERP', '1m')!.candles.map((c) => c.c),
    [205],
  );
  for (let i = 0; i < 23; i++)
    p.frame(
      PANORAMA_STREAMS[1],
      frame({ e: 'kline', s: 'BTCUSDT', k: k('1h', Date.UTC(2026, 9, 4, 14 + i), 1000 + i, 1001 + i) }),
    );
  assert.equal(p.chart('BTCPERP', '1m')!.change24h, null, 'com 23 velas de 1 h não há variação de 24 h');
  p.frame(PANORAMA_STREAMS[1], frame({ e: 'kline', s: 'BTCUSDT', k: k('1h', Date.UTC(2026, 9, 5, 13), 1023, 1024) }));
  const perp = p.chart('BTCPERP', '1m')!;
  assert.equal(perp.change24h!.toFixed(4), (205 / 1000 - 1).toFixed(4));
  assert.equal(perp.high24h, 1025);
  assert.equal(perp.low24h, 999);
  assert.deepEqual(Object.keys(p.snapshot().candles), ['BTCPERP'], 'o panorama leva só os candles de 1 h');
  for (let i = 0; i < 60; i++)
    p.frame(
      PANORAMA_STREAMS[0],
      frame({ e: 'kline', s: 'BTCUSDT', k: k('1h', Date.UTC(2026, 9, 1) + i * HOUR, 1, 2) }),
    );
  assert.equal(p.snapshot().candles.BTCUSDT.length, 48, 'janela de 1 h limitada a 48 velas');
});

test('candles do open interest: um por hora com abertura, máxima, mínima e fechamento dos pontos de 5 minutos', () => {
  const base = Date.UTC(2026, 9, 5, 10);
  const pts = [0, 5, 10, 55]
    .map((m, i) => ({ t: base + m * 60000, usd: [100, 130, 90, 120][i] }))
    .concat([
      { t: base + HOUR, usd: 121 },
      { t: base + HOUR + 5 * 60000, usd: 119 },
    ]);
  assert.deepEqual(openInterestCandles(pts), [
    { t: base, o: 100, h: 130, l: 90, c: 120 },
    { t: base + HOUR, o: 121, h: 121, l: 119, c: 119 },
  ]);
  const many = Array.from({ length: 30 * 12 }, (_, i) => ({ t: base + i * 5 * 60000, usd: i }));
  assert.equal(openInterestCandles(many).length, 24);
});

test('panorama REST honours 418 Retry-After and every stream reconnects independently', async () => {
  const calls: string[] = [];
  const sockets: { url: string; listeners: Record<string, Function[]>; terminated: boolean }[] = [];
  const p = new BinanceMarketPanorama(
    async (url) => {
      calls.push(String(url));
      return new Response('banned', { status: 418, headers: { 'retry-after': '600' } });
    },
    now,
    (url) => {
      const s = {
        url,
        listeners: {} as Record<string, Function[]>,
        terminated: false,
        on(e: string, l: Function) {
          (this.listeners[e] ??= []).push(l);
          return this;
        },
        terminate() {
          this.terminated = true;
        },
      };
      sockets.push(s);
      return s as any;
    },
  );
  await p.start();
  try {
    assert.deepEqual(
      sockets.map((s) => s.url),
      [...PANORAMA_STREAMS],
    );
    assert.equal(calls.length, 1, 'after the first 418 every other seed waits instead of hammering the API');
    assert.match(p.snapshot().errors.join(' '), /418|paused/);
  } finally {
    await p.stop();
  }
  assert.ok(sockets.every((s) => s.terminated));
});

test('hourly equity points are kept for eight days and the daily baseline is exposed', async () => {
  clock = Date.UTC(2026, 9, 5, 0, 0, 30);
  const book = new PerpetualPaperBook(new EventBus(), undefined, now);
  book.ensureEvaluation('nova', 1000);
  const quote = (price: number) => ({
    instrument: 'BINANCE_USDM:BTCUSDT' as const,
    symbol: 'BTCUSDT' as const,
    bid: price,
    ask: price + 0.1,
    markPrice: price,
    indexPrice: price,
    fundingRate: 0,
    nextFundingTime: clock + 30 * 86400000,
    bookTime: clock,
    markTime: clock,
    receivedAt: clock,
  });
  for (let i = 0; i < 200; i++) {
    await book.synchronize(quote(100), [], async () => {});
    clock += HOUR;
  }
  const nova = book.list()[0] as any;
  assert.equal(nova.hourly.length, 192);
  assert.ok(nova.hourly.every((h: any, i: number) => i === 0 || h.timestamp - nova.hourly[i - 1].timestamp === HOUR));
  assert.equal(nova.daily.startEquity, 1000);
  assert.match(nova.daily.date, /^2026-10-/);
});

test('pilot timeline returns only recorded decisions, fills, funding and equity inside the window', () => {
  const t = Date.UTC(2026, 9, 10);
  const ev = (type: string, at: number, payload: unknown): DomainEvent => ({
    id: type + at,
    type: type as never,
    occurredAt: new Date(at).toISOString(),
    payload,
  });
  const events = [
    ev('AUTONOMOUS_DECISION', t - HOUR, {
      accountId: 'a',
      candleTimestamp: t - 2 * HOUR,
      direction: 1,
      studyId: 's',
      signalDataset: { trade: new Array(500) },
    }),
    ev('AUTONOMOUS_DECISION', t - 9 * 86400000, { accountId: 'a', candleTimestamp: 1, direction: 0 }),
    ev('AUTONOMOUS_DECISION', t, { accountId: 'other', candleTimestamp: t, direction: 0 }),
  ];
  const ledger = [
    ev('PAPER_FILL', t - HOUR, { fill: { side: 'BUY', quantity: 0.01, fillPrice: 100000, fee: 0.5 } }),
    ev('FUNDING_SETTLED', t - 30 * 60000, { cashDelta: -0.1 }),
  ];
  const r = pilotTimeline({
    accountId: 'a',
    events,
    ledger,
    hourly: [
      { timestamp: t - 8 * 86400000, equity: 1 },
      { timestamp: t - HOUR, equity: 1001 },
    ],
    initialCash: 1000,
    now: t,
    days: 7,
  });
  assert.equal(r.decisions.length, 1);
  assert.equal(r.decisions[0].direction, 1);
  assert.equal((r.decisions[0] as any).signalDataset, undefined, 'heavy datasets stay out');
  assert.deepEqual(
    r.fills.map((f) => f.side),
    ['BUY'],
  );
  assert.equal(r.funding[0].cashDelta, -0.1);
  assert.deepEqual(r.equity, [{ timestamp: t - HOUR, equity: 1001 }]);
});
