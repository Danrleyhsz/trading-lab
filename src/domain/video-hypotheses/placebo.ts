import type { Candle } from '../backtest.js';
import type { SignalStrategy } from '../signal-backtest.js';

/**
 * Placebo do critério 7 do VIDEO_SCREEN_V2 (docs/PROTOCOLO_HIPOTESES_ICT.md, Emenda 1 item 4 e Emenda 3): repete a sequência escolhida
 * com o mesmo número de entradas por moeda e por ano, o mesmo lado e a mesma distância de stop e alvo em ATR, sorteando só a vela de
 * entrada. Só pesquisa histórica: não envia ordens.
 */

/** PRNG pequeno e determinístico (mulberry32); a mesma semente dá sempre a mesma sequência. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sorteia `n` posições distintas de [0, m) sem reposição (algoritmo de Floyd) e devolve em ordem crescente. */
export function drawDistinct(rand: () => number, m: number, n: number): number[] {
  if (!Number.isInteger(m) || !Number.isInteger(n) || n < 0 || n > m) throw new Error(`sorteio inválido: ${n} de ${m}`);
  const chosen = new Set<number>();
  for (let j = m - n; j < m; j++) {
    const t = Math.floor(rand() * (j + 1));
    chosen.add(chosen.has(t) ? j : t);
  }
  return [...chosen].sort((a, b) => a - b);
}

/** Lado, distância do stop e do alvo em múltiplos do ATR da vela de decisão, e limite de tempo, de uma operação real. */
export interface TradeTemplate {
  side: 1 | -1;
  stopAtr: number;
  targetAtr?: number;
  maxBars?: number;
}
export function templateFromIntent(
  close: number,
  atrValue: number,
  intent: { side: 1 | -1; stop?: number; target?: number; maxBars?: number },
): TradeTemplate | null {
  if (!(atrValue > 0) || intent.stop === undefined) return null;
  const stopAtr = (intent.side * (close - intent.stop)) / atrValue;
  if (!(stopAtr > 0)) return null;
  return {
    side: intent.side,
    stopAtr,
    targetAtr: intent.target === undefined ? undefined : (intent.side * (intent.target - close)) / atrValue,
    maxBars: intent.maxBars,
  };
}

/** `index` é a vela de entrada (a abertura em que a posição abre); a decisão é tomada no fechamento da anterior. `deadline` é a última vela de entrada do ano. */
export interface PlaceboEntry extends TradeTemplate {
  index: number;
  deadline: number;
}

/**
 * Estratégia do placebo. As entradas vêm em ordem cronológica. Uma entrada com posição aberta na vela de decisão passa para a primeira
 * vela livre seguinte (as seguintes esperam atrás dela); se passar de `deadline`, é perdida e contada em `lost()`.
 */
export function placeboStrategy(
  range: readonly number[],
  candles: readonly Candle[],
  entries: readonly PlaceboEntry[],
): { strategy: SignalStrategy; lost: () => number } {
  let next = 0,
    lost = 0;
  const strategy: SignalStrategy = (i, pos) => {
    while (next < entries.length && i + 1 > entries[next].deadline) {
      lost++;
      next++;
    }
    if (pos || next >= entries.length) return null;
    const e = entries[next];
    if (e.index - 1 > i) return null;
    next++;
    const a = range[i],
      close = candles[i].close;
    if (!Number.isFinite(a)) {
      lost++;
      return null;
    }
    return {
      side: e.side,
      stop: close - e.side * e.stopAtr * a,
      target: e.targetAtr === undefined ? undefined : close + e.side * e.targetAtr * a,
      maxBars: e.maxBars,
    };
  };
  return { strategy, lost: () => lost + (entries.length - next) };
}

/** Valor de posto `ceil(q·n)` em ordem crescente (q = 0,9 e n = 200 dá o 180º). */
export function percentileByRank(values: readonly number[], q: number): number {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length, Math.max(1, Math.ceil(q * sorted.length))) - 1];
}

/** Retorno com o lado aplicado, `h` velas depois do fechamento da vela `i`; null se a série acabar antes. */
export function forwardReturn(candles: readonly Candle[], i: number, h: number, side: 1 | -1): number | null {
  return i + h < candles.length && candles[i].close > 0 ? side * (candles[i + h].close / candles[i].close - 1) : null;
}

/** Velas cuja mínima é nova mínima das `n` velas anteriores (lado 1) ou cuja máxima é nova máxima (lado −1). */
export function newExtremes(candles: readonly Candle[], n: number): { index: number; side: 1 | -1 }[] {
  const out: { index: number; side: 1 | -1 }[] = [];
  for (let i = n; i < candles.length; i++) {
    let lo = Infinity,
      hi = -Infinity;
    for (let k = i - n; k < i; k++) {
      if (candles[k].low < lo) lo = candles[k].low;
      if (candles[k].high > hi) hi = candles[k].high;
    }
    if (candles[i].low < lo) out.push({ index: i, side: 1 });
    if (candles[i].high > hi) out.push({ index: i, side: -1 });
  }
  return out;
}
