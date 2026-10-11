import type { Candle } from './backtest.js';
import {
  backtestPerpetual,
  type PerpetualConfig,
  type PerpetualDataset,
  type SimulationEntry,
} from './perpetual-backtest.js';
import { perpetualDirection } from './perpetual-signals.js';

/**
 * Verificador genérico de viés de futuro (docs/FREQTRADE_FREQAI_AUDIT.md, item 1; ideia da `lookahead-analysis` do
 * Freqtrade, reimplementada do zero, nenhum código copiado). Só teste e auditoria: não muda nenhum resultado.
 *
 * Princípio: uma decisão tomada no fechamento da vela k só pode depender das velas 0..k. Então, calculada com o
 * histórico completo ou com o histórico cortado em k, ela tem de ser idêntica. Qualquer diferença é vazamento.
 * Limite: só verifica os pontos testados; não substitui as garantias estruturais (o sinal usa só velas fechadas).
 */
export interface LookaheadViolation {
  index: number;
  timestamp: number;
  full: number;
  truncated: number;
}
export interface LookaheadReport {
  checked: number;
  violations: LookaheadViolation[];
}

/** Estratégia vetorial: devolve uma decisão por vela, tomada no fechamento dela (como um cálculo de indicadores de uma vez). */
export type VectorStrategy = (candles: readonly Candle[]) => number[];

function checkpoints(length: number, from: number, stride: number) {
  if (!Number.isInteger(from) || from < 0 || !Number.isInteger(stride) || stride < 1)
    throw new Error('invalid checkpoints');
  const out: number[] = [];
  for (let i = from; i < length; i += stride) out.push(i);
  if (length > from && out.at(-1) !== length - 1) out.push(length - 1);
  return out;
}

/** Compara cada decisão do histórico completo com a mesma decisão recalculada só com as velas até ela. */
export function findDecisionLookahead(
  candles: readonly Candle[],
  strategy: VectorStrategy,
  options: { from?: number; stride?: number } = {},
): LookaheadReport {
  const full = strategy(candles);
  if (full.length !== candles.length) throw new Error('strategy must return one decision per candle');
  const violations: LookaheadViolation[] = [];
  let checked = 0;
  for (const i of checkpoints(candles.length, options.from ?? 0, options.stride ?? 1)) {
    const truncated = strategy(candles.slice(0, i + 1));
    checked++;
    if (!Object.is(truncated[i], full[i]))
      violations.push({ index: i, timestamp: candles[i].timestamp, full: full[i], truncated: truncated[i] });
  }
  return { checked, violations };
}

/**
 * Adapta as estratégias do laboratório (perpetualDirection) ao formato vetorial: a decisão no fechamento da vela k usa
 * as velas 0..k, exatamente como o simulador faz na abertura de k+1. Antes do aquecimento, a decisão é 0.
 */
export function perpetualStrategy(
  config: PerpetualConfig,
  currentQuantity = 0,
  warmup = config.slowPeriod,
): VectorStrategy {
  return (candles) =>
    candles.map((_, i) =>
      i + 1 < warmup ? 0 : perpetualDirection(candles.slice(0, i + 1) as Candle[], config, currentQuantity),
    );
}

export interface PrefixViolation {
  cut: number;
  cutTimestamp: number;
  reason: string;
}
export type Simulation = (data: PerpetualDataset) => SimulationEntry[];
/** Corta o dataset na vela `cut` (exclusiva), mantendo só o funding liquidado até o fim da última vela que ficou. */
export function truncateDataset(data: PerpetualDataset, cut: number): PerpetualDataset {
  const end = data.trade[cut - 1].timestamp + 3600000;
  return {
    instrument: data.instrument,
    trade: data.trade.slice(0, cut),
    mark: data.mark.slice(0, cut),
    funding: data.funding.filter((f) => f.timestamp < end),
  };
}
/**
 * Consistência de prefixo do simulador inteiro (estratégia, filtros, proteções, funding e liquidação): a trilha de
 * auditoria tem de ser idêntica à da simulação com o histórico completo até o último instante da última vela do corte:
 * entra a execução na abertura dela e o funding dentro dela; fica de fora só o último milissegundo (encerramento forçado
 * no fim dos dados e teste de liquidação da vela), que no histórico completo não acontece.
 */
export function findSimulationLookahead(
  data: PerpetualDataset,
  simulate: Simulation,
  cuts: number[],
): { checked: number; violations: PrefixViolation[] } {
  const full = simulate(data),
    violations: PrefixViolation[] = [];
  for (const cut of cuts) {
    if (!Number.isInteger(cut) || cut < 3 || cut > data.trade.length) throw new Error('invalid cut');
    const boundary = data.trade[cut - 1].timestamp,
      end = boundary + 3600000 - 1,
      before = (rows: SimulationEntry[]) => JSON.stringify(rows.filter((r) => r.timestamp < end));
    if (before(simulate(truncateDataset(data, cut))) !== before(full))
      violations.push({
        cut,
        cutTimestamp: boundary,
        reason: 'audit trail before the cut differs from the full-history run',
      });
  }
  return { checked: cuts.length, violations };
}
/** Vela de que, no instante da abertura, só se conhece o preço de abertura (o resto ainda não aconteceu). */
const openOnly = (c: Candle): Candle => ({
  timestamp: c.timestamp,
  open: c.open,
  high: c.open,
  low: c.open,
  close: c.open,
  volume: 0,
});
/**
 * Viés no momento da execução, que o corte por vela não pega: uma ordem executada na abertura da vela k não pode depender
 * do fechamento, da máxima ou da mínima de k. Para cada ordem do histórico completo executada numa abertura, refaz a
 * simulação com os dados até k e a vela k reduzida ao preço de abertura; tudo o que acontece até a abertura de k (as
 * ordens e o funding liquidado nela) tem de sair idêntico. Mesma ideia da `lookahead-analysis` do Freqtrade: verificar
 * cada entrada e saída que de fato aconteceu.
 */
export function findExecutionLookahead(
  data: PerpetualDataset,
  simulate: Simulation,
): { checked: number; violations: PrefixViolation[] } {
  const full = simulate(data),
    index = new Map(data.trade.map((c, i) => [c.timestamp, i]));
  const bars = [
    ...new Set(full.filter((r) => r.kind === 'FILL' && index.has(r.timestamp)).map((r) => index.get(r.timestamp)!)),
  ]
    .filter((k) => k >= 2)
    .sort((a, b) => a - b);
  const violations: PrefixViolation[] = [];
  for (const k of bars) {
    const cut = truncateDataset(data, k + 1),
      at = data.trade[k].timestamp;
    cut.trade[k] = openOnly(cut.trade[k]);
    cut.mark[k] = openOnly(cut.mark[k]);
    // Até o primeiro segundo da vela: funding na virada da hora e a execução na abertura.
    const upToOpen = (rows: SimulationEntry[]) => JSON.stringify(rows.filter((r) => r.timestamp < at + 1000));
    if (upToOpen(simulate(cut)) !== upToOpen(full))
      violations.push({
        cut: k + 1,
        cutTimestamp: at,
        reason: 'order at this open depends on data from inside its own candle',
      });
  }
  return { checked: bars.length, violations };
}
/** Atalho para o simulador de perpétuos do laboratório. */
export const perpetualSimulation =
  (config: PerpetualConfig): Simulation =>
  (data) =>
    backtestPerpetual(data, config).audit;

/**
 * Paridade com histórico curto (docs/FREQTRADE_FREQAI_AUDIT.md, item 2; ideia da `recursive-analysis` do Freqtrade,
 * reimplementada). O backtest decide com todo o histórico até a vela; o piloto decide só com as últimas `liveBars`
 * velas fechadas (liveSignalBars). Indicador recursivo (média exponencial semeada na primeira vela, contadores
 * acumulados) dá resultados diferentes nos dois casos, e aí o piloto não reproduz o backtest. Esta verificação compara as
 * duas decisões em cada ponto.
 */
export interface ShortHistoryDivergence {
  index: number;
  timestamp: number;
  longHistory: number;
  shortHistory: number;
}
export function findShortHistoryDivergence(
  candles: readonly Candle[],
  decide: (closed: Candle[]) => number,
  liveBars: number,
  options: { from?: number; stride?: number } = {},
): { checked: number; divergences: ShortHistoryDivergence[] } {
  if (!Number.isInteger(liveBars) || liveBars < 1) throw new Error('invalid live history length');
  const divergences: ShortHistoryDivergence[] = [];
  let checked = 0;
  for (const i of checkpoints(candles.length, Math.max(options.from ?? 0, liveBars - 1), options.stride ?? 1)) {
    const longHistory = decide(candles.slice(0, i + 1) as Candle[]),
      shortHistory = decide(candles.slice(i + 1 - liveBars, i + 1) as Candle[]);
    checked++;
    if (!Object.is(longHistory, shortHistory))
      divergences.push({ index: i, timestamp: candles[i].timestamp, longHistory, shortHistory });
  }
  return { checked, divergences };
}
/** Decisão do laboratório nas velas fechadas recebidas, como o ciclo ao vivo e o simulador chamam. */
export const perpetualDecision =
  (config: PerpetualConfig, currentQuantity = 0) =>
  (closed: Candle[]) =>
    perpetualDirection(closed, config, currentQuantity);
