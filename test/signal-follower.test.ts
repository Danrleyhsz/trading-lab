import test from 'node:test';
import assert from 'node:assert/strict';
import type { Candle } from '../src/domain/backtest.js';
import {
  exitWeights,
  futuresLeverage,
  parseEntrySignal,
  parsePhase2Signal,
  simulatePhase2Entry,
  signalTimestamp,
  simulateSignal,
  type EntrySignal,
  type FollowerConfig,
} from '../src/domain/signal-follower.js';

// TEST_ONLY: mensagem real do canal (com a marca d'água invisível) e velas sintéticas; nada aqui é gravado como dado de mercado.
const MESSAGE = `🔥🔥🔥🥷 09:51 | AIOTUSDT | PREÇO ATUAL: 0.0615
MACRO: Direcional lateral em tempos maiores.
TENDÊNCIA: ↗ COMPRADORA NO MICRO
🟡 CONVICÇÃO BOA
━━━━━━━━━━━━━━━━━━
ZONAS TÉCNICAS
Retração: 0.0602 – 0.0612 | Defesa: 0.0600
━━━━━━━━━━━━━━━━━━
🎯 POSSÍVEIS PARCIAIS
Parcial 1: 0.0638 🚀
Parcial 2: 0.0668 🚀
Alvo 1: 0.0675 🔥
━━━━━━━━━━━━━━━━━━
VOLATILIDADE: EXTREMA
RISCO: ALTO
Sinais de força reforçam possível rompimento.​‌​‌‍⁠`;

const cfg: FollowerConfig = {
  capital: 10000,
  riskPerSignal: 0.01,
  entryMode: 'zone_high',
  entryExpiryHours: 24,
  stopBufferBelowDefense: 0.005,
  exitBufferBelowLevel: 0.005,
  feeRate: 0,
};
const parsed = parseEntrySignal(MESSAGE);
assert.ok(parsed.ok);
const signal: EntrySignal = parsed.signal;
const MIN = 60000;
const bar = (i: number, open: number, high: number, low: number): Candle => ({
  timestamp: i * MIN,
  open,
  high,
  low,
  close: open,
  volume: 1,
});
const near = (actual: number, expected: number, eps = 0.01) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} difere de ${expected}`);

const entryBar = bar(1, 0.0615, 0.0616, 0.0611); // limite em 0,0612 executa
const p1Bar = bar(2, 0.062, 0.0636, 0.062);
const p2Bar = bar(3, 0.064, 0.0667, 0.0635);
const a1Bar = bar(4, 0.0665, 0.068, 0.066);

test('T1: parser lê a mensagem real e ignora a marca d’água invisível', () => {
  assert.equal(signal.time, '09:51');
  assert.equal(signal.symbol, 'AIOTUSDT');
  assert.equal(signal.priceAtSignal, 0.0615);
  assert.equal(signal.zoneLow, 0.0602);
  assert.equal(signal.zoneHigh, 0.0612);
  assert.equal(signal.defense, 0.06);
  assert.deepEqual(signal.partials, [0.0638, 0.0668]);
  assert.deepEqual(signal.targets, [0.0675]);
  assert.equal(signal.conviction, 'BOA');
  assert.equal(signal.volatility, 'EXTREMA');
  assert.equal(signal.risk, 'ALTO');
  assert.equal(signal.raw, MESSAGE);
});

test('T2: mensagem sem defesa é rejeitada e guarda o motivo', () => {
  const r = parseEntrySignal(MESSAGE.replace(' | Defesa: 0.0600', ''));
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.status === 'REJECTED_PARSE' && r.reason.includes('defesa'));
});

test('parser rejeita saídas fora de ordem', () => {
  const r = parseEntrySignal(MESSAGE.replace('Parcial 2: 0.0668', 'Parcial 2: 0.0630'));
  assert.equal(r.ok, false);
});

test('hora do sinal em UTC-3; hora no futuro volta um dia', () => {
  const received = Date.UTC(2026, 9, 24, 13, 0); // 10:00 em Brasília
  assert.equal(signalTimestamp('09:51', received), Date.UTC(2026, 9, 24, 12, 51));
  const early = Date.UTC(2026, 9, 24, 12, 45); // 09:45 em Brasília
  assert.equal(signalTimestamp('09:51', early), Date.UTC(2026, 9, 23, 12, 51));
});

test('pesos de saída: 30/30/40, saída única 100%', () => {
  assert.deepEqual(exitWeights(3).map((w) => +w.toFixed(4)), [0.3, 0.3, 0.4]);
  assert.deepEqual(exitWeights(1), [1]);
});

test('T3: preço não volta à zona em 24h → cancelado, PnL 0', () => {
  const hours = Array.from({ length: 26 }, (_, i) => ({ ...bar(0, 0.0625, 0.063, 0.062), timestamp: (i + 1) * 3600000 }));
  const r = simulateSignal(signal, 0, hours, cfg);
  assert.equal(r.status, 'CANCELLED_EXPIRED');
  assert.equal(r.pnl, 0);
});

test('T4: entra e toca o stop antes da P1 → −1R', () => {
  const r = simulateSignal(signal, 0, [entryBar, bar(2, 0.061, 0.061, 0.059)], cfg);
  assert.equal(r.status, 'CLOSED');
  near(r.stop, 0.0597, 1e-9);
  near(r.pnl, -100);
  near(r.r, -1, 1e-6);
});

test('T5: atinge P1, P2 e alvo 1 → +309,94', () => {
  const r = simulateSignal(signal, 0, [entryBar, p1Bar, p2Bar, a1Bar], cfg);
  assert.equal(r.status, 'CLOSED');
  near(r.fills[0]!.price, 0.0612, 1e-12);
  near(r.fills[0]!.quantity, 66666.67);
  near(r.pnl, 309.94);
});

test('T6: atinge P1 e volta à entrada → resto sai no zero a zero', () => {
  const r = simulateSignal(signal, 0, [entryBar, p1Bar, bar(3, 0.063, 0.063, 0.061)], cfg);
  assert.equal(r.status, 'CLOSED');
  near(r.pnl, 45.62);
});

test('T7: mesma vela toca stop e P1 → vale o stop', () => {
  const r = simulateSignal(signal, 0, [entryBar, bar(2, 0.062, 0.064, 0.059)], cfg);
  near(r.pnl, -100);
});

test('T8: preço já abaixo da defesa no sinal → invalidado', () => {
  const r = simulateSignal({ ...signal, priceAtSignal: 0.0595 }, 0, [entryBar, p1Bar], cfg);
  assert.equal(r.status, 'REJECTED_INVALIDATED');
  assert.equal(r.fills.length, 0);
});

test('T11: velas anteriores ao sinal são ignoradas (sem look-ahead)', () => {
  const before = bar(-1, 0.059, 0.07, 0.058); // tocaria stop e alvos se fosse lida
  const r = simulateSignal(signal, 0, [before, entryBar, p1Bar, p2Bar, a1Bar], cfg);
  near(r.pnl, 309.94);
});

test('sem velas suficientes o sinal fica pendente, não é inventado', () => {
  const r = simulateSignal(signal, 0, [bar(1, 0.063, 0.063, 0.0625)], cfg);
  assert.equal(r.status, 'PENDING');
});

test('taxas reduzem o resultado', () => {
  const r = simulateSignal(signal, 0, [entryBar, p1Bar, p2Bar, a1Bar], { ...cfg, feeRate: 0.001 });
  assert.ok(r.pnl < 309.94 && r.pnl > 250);
});

// --- Futuros (T9) ---
const rule = { min: 5, max: 15, liquidationSafetyFactor: 2, maintenanceMarginRate: 0.005 };

test('alavancagem pela distância do stop', () => {
  assert.equal(futuresLeverage(0.0245, rule), 15); // daria 18, limitado a 15
  assert.equal(futuresLeverage(0.05, rule), 9);
  assert.equal(futuresLeverage(0.12, rule), null);
});

test('T9: stop a ~12% → futuros pulado, spot segue', () => {
  const wide = { ...signal, defense: 0.054 };
  const fut = simulateSignal(wide, 0, [entryBar, p1Bar], { ...cfg, market: 'futures' });
  assert.equal(fut.status, 'FUTURES_SKIPPED_STOP_TOO_WIDE');
  assert.equal(fut.fills.length, 0);
  const spot = simulateSignal(wide, 0, [entryBar, p1Bar], cfg);
  assert.equal(spot.status, 'OPEN');
});

test('futuros: mesmo risco do spot, 15x, funding real descontado', () => {
  const funding = [{ timestamp: 2.5 * MIN, rate: 0.0001, markPrice: 0.063 }];
  const r = simulateSignal(signal, 0, [entryBar, p1Bar, p2Bar, a1Bar], { ...cfg, market: 'futures' }, { funding });
  assert.equal(r.leverage, 15);
  const qty = 100 / 0.0015;
  near(r.funding, -0.0001 * qty * 0.7 * 0.063);
  near(r.pnl, 309.94 + r.funding);
});

test('futuros: abertura abaixo da liquidação registra LIQUIDATED', () => {
  const r = simulateSignal(signal, 0, [entryBar, bar(2, 0.05, 0.05, 0.049)], { ...cfg, market: 'futures' });
  assert.equal(r.status, 'LIQUIDATED');
  assert.equal(r.fills.at(-1)!.reason, 'LIQUIDATION');
});

// --- Segunda Fase (T12–T17) ---
const PHASE2 = `🔥 ANÁLISE — SEGUNDA FASE | 08:36 | AIOT

PREÇO DE ENTRADA: 0.0608 ✅
PREÇO DA LEITURA ATUAL: 0.0678

Suporte atual: 0.0621
Resistência atual: 0.0687
Possível alvo 2: 0.0715
Possível alvo 3: 0.0741

⚠️ Quem estiver chegando somente na Segunda Fase deve considerar que a entrada original ocorreu numa região bem diferente da atual.\u200B\u200C\u200D`;
const p2parsed = parsePhase2Signal(PHASE2);
assert.ok(p2parsed.ok);
const p2 = p2parsed.signal;
const runnerCfg: FollowerConfig = { ...cfg, runnerFraction: 0.2, runnerMaxWaitHoursForPhase2: 48 };
const phase2 = { signal: p2, time: 4.5 * MIN };
const qty = 100 / 0.0015;
const phase1Runner = (0.063481 - 0.0612) * qty * 0.3 + (0.066466 - 0.0612) * qty * 0.3 + (0.0671625 - 0.0612) * qty * 0.2;

test('T12: parser da Segunda Fase', () => {
  assert.equal(p2.symbol, 'AIOTUSDT');
  assert.equal(p2.time, '08:36');
  assert.equal(p2.originalEntry, 0.0608);
  assert.equal(p2.priceAtSignal, 0.0678);
  assert.equal(p2.support, 0.0621);
  assert.equal(p2.resistance, 0.0687);
  assert.deepEqual(p2.targets, [0.0715, 0.0741]);
  assert.equal(parsePhase2Signal(PHASE2.replace('Suporte atual: 0.0621', '')).ok, false);
});

test('T13: runner pega alvo 2 e alvo 3 → +380,25', () => {
  const path = [entryBar, p1Bar, p2Bar, a1Bar, bar(5, 0.068, 0.0712, 0.0675), bar(6, 0.0712, 0.074, 0.071)];
  const r = simulateSignal(signal, 0, path, runnerCfg, { phase2 });
  assert.equal(r.status, 'CLOSED');
  near(r.pnl, 380.25);
});

test('T14: runner volta ao stop da P2 → +300,65; sem runner no mesmo caminho → +309,94', () => {
  const path = [entryBar, p1Bar, p2Bar, a1Bar, bar(5, 0.067, 0.068, 0.066)];
  near(simulateSignal(signal, 0, path, runnerCfg, { phase2 }).pnl, 300.65);
  near(simulateSignal(signal, 0, path, cfg, { phase2 }).pnl, 309.94);
});

test('T15: entrada nova na Segunda Fase com RR ruim é ignorada', () => {
  const r = simulatePhase2Entry(p2, 0, [bar(1, 0.0678, 0.068, 0.0675)], cfg);
  assert.equal(r.status, 'SKIPPED_LOW_RR');
  near(r.rr!, 0.56);
});

test('entrada nova na Segunda Fase com RR bom opera 50/50 nos alvos', () => {
  const r = simulatePhase2Entry(p2, 0, [bar(1, 0.0635, 0.064, 0.063), bar(2, 0.064, 0.075, 0.064)], cfg);
  assert.equal(r.status, 'CLOSED');
  assert.ok(r.rr! >= 1.5);
  assert.equal(r.fills.filter((f) => f.reason === 'EXIT').length, 2);
});

test('T16: sem Segunda Fase em 48h o runner fecha na abertura seguinte', () => {
  const late = bar(4 + 48 * 60 + 1, 0.066, 0.0665, 0.0664);
  const r = simulateSignal(signal, 0, [entryBar, p1Bar, p2Bar, a1Bar, late], runnerCfg);
  assert.equal(r.runnerClosedNoPhase2, true);
  near(r.pnl, phase1Runner + (0.066 - 0.0612) * qty * 0.2);
});

test('T17: suporte da Segunda Fase abaixo do stop do runner não rebaixa o stop', () => {
  const r = simulateSignal(signal, 0, [entryBar, p1Bar, p2Bar, a1Bar, bar(5, 0.068, 0.0685, 0.0675)], runnerCfg, { phase2 });
  assert.equal(r.status, 'OPEN');
  near(r.stop, 0.066466, 1e-9);
});
