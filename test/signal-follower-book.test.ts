import test from 'node:test';
import assert from 'node:assert/strict';
import type { Candle } from '../src/domain/backtest.js';
import { SignalFollowerBook, type MarketWindow } from '../src/application/signal-follower-book.js';
import { BinanceSignalWindow } from '../src/infrastructure/binance-signal-window.js';
import { assertAppendOnly } from '../src/infrastructure/append-only.js';

// TEST_ONLY: mensagens reais do canal e velas sintéticas; nada aqui é gravado como dado de mercado.
const entry = (symbol = 'AIOTUSDT') => `🔥🔥🔥🥷 09:51 | ${symbol} | PREÇO ATUAL: 0.0615
🟡 CONVICÇÃO BOA
Retração: 0.0602 – 0.0612 | Defesa: 0.0600
Parcial 1: 0.0638 🚀
Parcial 2: 0.0668 🚀
Alvo 1: 0.0675 🔥
VOLATILIDADE: EXTREMA
RISCO: ALTO`;
const PHASE2 = `🔥 ANÁLISE — SEGUNDA FASE | 09:54 | AIOT
PREÇO DE ENTRADA: 0.0608 ✅
PREÇO DA LEITURA ATUAL: 0.0678
Suporte atual: 0.0621
Possível alvo 2: 0.0715
Possível alvo 3: 0.0741`;
const RECEIVED = Date.UTC(2026, 9, 24, 12, 55); // 09:55 em Brasília
const MIN = 60000;
const bar = (t: number, open: number, high: number, low: number): Candle => ({ timestamp: t, open, high, low, close: open, volume: 1 });
/** Entra, P1, P2, alvo 1 nos quatro minutos depois do início pedido. */
const winning = (start: number) => [
  bar(start + MIN, 0.0615, 0.0616, 0.0611),
  bar(start + 2 * MIN, 0.062, 0.0636, 0.062),
  bar(start + 3 * MIN, 0.064, 0.0667, 0.0635),
  bar(start + 4 * MIN, 0.0665, 0.068, 0.066),
];
/** Entra e fica parado dentro da operação. */
const flat = (start: number) => [bar(start + MIN, 0.0615, 0.0616, 0.0611), bar(start + 2 * MIN, 0.062, 0.0625, 0.0615)];
const market = (series: (start: number) => Candle[], failFutures = false): MarketWindow => ({
  async candles(sleeve, _symbol, start) {
    if (failFutures && sleeve === 'futures') throw new Error('symbol not listed on USD-M');
    return series(start);
  },
  async funding() {
    return [];
  },
});

test('desligado: não aceita mensagens', () => {
  const book = new SignalFollowerBook(market(winning));
  assert.throws(() => book.add(entry()), /disabled/);
});

test('guarda entrada, Segunda Fase ligada ao pai e mensagem inválida com motivo', () => {
  const book = new SignalFollowerBook(market(winning), [], true, 10000, () => RECEIVED);
  const parent = book.add(entry());
  const child = book.add(PHASE2);
  const bad = book.add('mensagem qualquer sem formato');
  assert.equal(parent.kind, 'ENTRY');
  assert.equal(child.kind, 'PHASE2');
  assert.equal(child.parentId, parent.id);
  assert.equal(bad.kind, 'REJECTED_PARSE');
  assert.ok(bad.reason);
  assert.equal(book.list().length, 3);
});

test('relatório refaz o sinal com velas reais por carteira e variante', async () => {
  const book = new SignalFollowerBook(market(winning), [], true, 10000, () => RECEIVED + 10 * MIN);
  book.add(entry());
  const report = await book.report();
  assert.equal(report.scope, 'SIGNAL_FOLLOWER_PAPER_ONLY');
  assert.equal(report.variants.length, 4);
  const spot = report.variants.find((v) => v.sleeve === 'spot' && v.runnerFraction === 0)!;
  assert.equal(spot.capital, 7500);
  assert.equal(spot.signals[0]!.status, 'CLOSED');
  assert.ok(spot.signals[0]!.r > 2.5 && spot.signals[0]!.r < 3.1, `R ${spot.signals[0]!.r}`); // 3,10R menos taxas
  assert.equal(spot.summary.closed, 1);
  assert.equal(spot.summary.wins, 1);
  const futures = report.variants.find((v) => v.sleeve === 'futures' && v.runnerFraction === 0)!;
  assert.equal(futures.signals[0]!.leverage, 15);
});

test('T10: 4º sinal com 3 abertos é rejeitado pelo limite de risco', async () => {
  const book = new SignalFollowerBook(market(flat), [], true, 10000, () => RECEIVED + 10 * MIN);
  for (const s of ['AAAUSDT', 'BBBUSDT', 'CCCUSDT', 'DDDUSDT']) book.add(entry(s));
  const spot = (await book.report()).variants.find((v) => v.sleeve === 'spot' && v.runnerFraction === 0)!;
  assert.deepEqual(
    spot.signals.map((s) => s.status),
    ['OPEN', 'OPEN', 'OPEN', 'RISK_MAX_OPEN'],
  );
});

test('falta de dados vira DATA_MISSING, nunca resultado inventado', async () => {
  const book = new SignalFollowerBook(market(winning, true), [], true, 10000, () => RECEIVED + 10 * MIN);
  book.add(entry());
  const futures = (await book.report()).variants.find((v) => v.sleeve === 'futures')!;
  assert.equal(futures.signals[0]!.status, 'DATA_MISSING');
  assert.equal(futures.signals[0]!.pnl, 0);
});

test('Segunda Fase entra no relatório como entrada nova filtrada por RR', async () => {
  const book = new SignalFollowerBook(market(winning), [], true, 10000, () => RECEIVED + 10 * MIN);
  book.add(entry());
  book.add(PHASE2);
  const spot = (await book.report()).variants.find((v) => v.sleeve === 'spot' && v.runnerFraction === 0)!;
  const p2 = spot.signals.find((s) => s.phase === 2)!;
  assert.equal(p2.status, 'SKIPPED_LOW_RR');
});

test('mensagens do Seguidor só crescem no estado salvo', () => {
  const book = new SignalFollowerBook(market(winning), [], true, 10000, () => RECEIVED);
  book.add(entry());
  const state = { memories: [], agents: [], signalFollower: book.list() };
  assert.doesNotThrow(() => assertAppendOnly(state, { ...state, signalFollower: [...book.list(), ...book.list()] }));
  assert.throws(() => assertAppendOnly(state, { ...state, signalFollower: [] }), /rewrite/);
});

test('janela da Binance pagina velas de 1 minuto', async () => {
  const urls: string[] = [];
  const fake = (async (url: string) => {
    urls.push(url);
    const start = Number(new URL(url).searchParams.get('startTime'));
    const count = urls.length === 1 ? 1000 : 5;
    const rows = Array.from({ length: count }, (_, i) => [start + i * MIN, '1', '2', '0.5', '1.5', '10']);
    return new Response(JSON.stringify(rows));
  }) as typeof fetch;
  const candles = await new BinanceSignalWindow(fake).candles('spot', 'AIOTUSDT', 0, 2000 * MIN);
  assert.equal(candles.length, 1005);
  assert.equal(urls.length, 2);
  assert.ok(urls[0]!.startsWith('https://api.binance.com/api/v3/klines'));
  assert.equal(new URL(urls[1]!).searchParams.get('startTime'), String(1000 * MIN));
});

test('preview lê a mensagem sem gravar: entrada, Segunda Fase com pai e rejeitada', () => {
  const book = new SignalFollowerBook(market(winning), [], true, 10000, () => RECEIVED);
  const first = book.preview(entry());
  assert.equal(first.kind, 'ENTRY');
  assert.equal((first.signal as { symbol: string }).symbol, 'AIOTUSDT');
  const orphan = book.preview(PHASE2);
  assert.equal(orphan.kind, 'PHASE2');
  assert.equal(orphan.parentId, undefined);
  const parent = book.add(entry());
  assert.equal(book.preview(PHASE2).parentId, parent.id);
  const bad = book.preview('mensagem qualquer sem formato');
  assert.equal(bad.kind, 'REJECTED_PARSE');
  assert.ok(bad.reason);
  assert.equal(book.list().length, 1);
});

test('preview funciona com o seguidor desligado e não grava', () => {
  const book = new SignalFollowerBook(market(winning));
  assert.equal(book.preview(entry()).kind, 'ENTRY');
  assert.equal(book.list().length, 0);
});

test('receivedAt de outra data põe o sinal no dia certo e marca a origem como OWNER', async () => {
  const starts: number[] = [];
  const spy: MarketWindow = {
    async candles(_sleeve, _symbol, start) {
      starts.push(start);
      return winning(start);
    },
    async funding() {
      return [];
    },
  };
  const book = new SignalFollowerBook(spy, [], true, 10000, () => RECEIVED + 10 * MIN);
  const today = book.add(entry());
  const old = book.add(entry('BBBUSDT'), '2026-10-20T23:59:00-03:00');
  assert.equal(today.receivedAtSource, 'SERVER');
  assert.equal(old.receivedAtSource, 'OWNER');
  assert.equal(old.receivedAt, '2026-10-21T02:59:00.000Z');
  await book.report();
  assert.ok(starts.includes(Date.UTC(2026, 9, 24, 12, 51))); // 09:51 de hoje em Brasília
  assert.ok(starts.includes(Date.UTC(2026, 9, 20, 12, 51))); // 09:51 do dia 20
});

test('receivedAt no futuro ou inválido é rejeitado e nada é gravado', () => {
  const book = new SignalFollowerBook(market(winning), [], true, 10000, () => RECEIVED);
  assert.throws(() => book.add(entry(), '2026-10-25T23:59:00-03:00'), /invalid receivedAt/);
  assert.throws(() => book.add(entry(), 'ontem'), /invalid receivedAt/);
  assert.equal(book.list().length, 0);
});
