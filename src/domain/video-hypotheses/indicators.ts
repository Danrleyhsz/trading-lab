import type { Candle } from '../backtest.js';

// Indicadores causais: o valor na posição i usa só as velas 0..i (verificado em test/video-hypotheses.test.ts).
// Antes de haver dados suficientes, o valor é NaN (nunca estimado).

export function sma(values: readonly number[], n: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}
/** ATR simples: média do true range das últimas n velas. */
export function atr(candles: readonly Candle[], n: number): number[] {
  const tr = candles.map((c, i) =>
    i === 0
      ? c.high - c.low
      : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close)),
  );
  return sma(tr, n);
}
/** Desvio-padrão dos retornos horários das últimas n velas. */
export function returnStd(candles: readonly Candle[], n: number): number[] {
  const r = candles.map((c, i) => (i === 0 ? 0 : c.close / candles[i - 1].close - 1)),
    out = new Array<number>(candles.length).fill(NaN);
  for (let i = n; i < candles.length; i++) {
    const w = r.slice(i - n + 1, i + 1),
      m = w.reduce((s, x) => s + x, 0) / n;
    out[i] = Math.sqrt(w.reduce((s, x) => s + (x - m) ** 2, 0) / n);
  }
  return out;
}
const typical = (c: Candle) => (c.high + c.low + c.close) / 3;
/** VWAP das últimas n velas (preço típico ponderado pelo volume). Sem volume na janela, NaN. */
export function rollingVwap(candles: readonly Candle[], n: number): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  let pv = 0,
    v = 0;
  for (let i = 0; i < candles.length; i++) {
    pv += typical(candles[i]) * candles[i].volume;
    v += candles[i].volume;
    if (i >= n) {
      pv -= typical(candles[i - n]) * candles[i - n].volume;
      v -= candles[i - n].volume;
    }
    if (i >= n - 1 && v > 0) out[i] = pv / v;
  }
  return out;
}
/** VWAP ancorado na sessão diária UTC (reinicia às 00:00 UTC), acumulado até a vela atual inclusive. */
export function sessionVwap(candles: readonly Candle[]): number[] {
  const out = new Array<number>(candles.length).fill(NaN);
  let pv = 0,
    v = 0,
    day = -1;
  for (let i = 0; i < candles.length; i++) {
    const d = Math.floor(candles[i].timestamp / 86400000);
    if (d !== day) {
      day = d;
      pv = 0;
      v = 0;
    }
    pv += typical(candles[i]) * candles[i].volume;
    v += candles[i].volume;
    if (v > 0) out[i] = pv / v;
  }
  return out;
}
/** Máxima e mínima das últimas n velas (inclusive a atual), com o índice de cada uma. */
export function rollingExtremes(candles: readonly Candle[], n: number) {
  const hi = new Array<number>(candles.length).fill(NaN),
    lo = new Array<number>(candles.length).fill(NaN),
    hiAt = new Array<number>(candles.length).fill(-1),
    loAt = new Array<number>(candles.length).fill(-1);
  for (let i = n - 1; i < candles.length; i++) {
    let h = -Infinity,
      l = Infinity,
      a = -1,
      b = -1;
    for (let k = i - n + 1; k <= i; k++) {
      if (candles[k].high >= h) {
        h = candles[k].high;
        a = k;
      }
      if (candles[k].low <= l) {
        l = candles[k].low;
        b = k;
      }
    }
    hi[i] = h;
    lo[i] = l;
    hiAt[i] = a;
    loAt[i] = b;
  }
  return { hi, lo, hiAt, loAt };
}
