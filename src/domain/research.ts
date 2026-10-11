import type { DomainEvent } from './events.js';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { AgentId } from './agents.js';
import type { Candle, BacktestResult } from './backtest.js';
import type { MarketSnapshot } from './market-snapshot.js';

const candleSchema = z.object({
  timestamp: z.number().finite().int().nonnegative(),
  open: z.number().finite().positive(),
  high: z.number().finite().positive(),
  low: z.number().finite().positive(),
  close: z.number().finite().positive(),
  volume: z.number().finite().nonnegative(),
});
const snapshotSchema = z.object({
  symbol: z.literal('BTCUSDT'),
  price: z.number().finite().positive(),
  bid: z.number().finite().positive(),
  ask: z.number().finite().positive(),
  spread: z.number().finite().nonnegative(),
  spreadBps: z.number().finite().nonnegative(),
  fundingRate: z.number().finite().optional(),
  openInterest: z.number().finite().nonnegative().optional(),
  timestamp: z.number().finite().int().nonnegative(),
});
export interface ResearchDataset {
  symbol: 'BTCUSDT';
  interval: '1h';
  historyMarket: 'BINANCE_SPOT';
  snapshotMarket: 'BINANCE_USDM';
  retrievedAt: string;
  snapshot: MarketSnapshot;
  candles: Candle[];
  hash: string;
}
export interface SpecialistFinding {
  agentId: AgentId;
  metric: string;
  values: Record<string, string | number | null>;
  summary: string;
}
export interface ResearchRun {
  id: string;
  startedAt: string;
  completedAt: string;
  startedEventId: string;
  events: DomainEvent[];
  status: 'SCREEN_PASSED' | 'REJECTED' | 'FAILED';
  dataset?: ResearchDataset;
  findings: SpecialistFinding[];
  strategyId?: string;
  backtest?: BacktestResult;
  error?: string;
}
export class ResearchRunStore {
  private runs: ResearchRun[] = [];
  hydrate(runs: ResearchRun[]) {
    this.runs = structuredClone(runs);
  }
  append(run: ResearchRun) {
    if (this.runs.some((item) => item.id === run.id)) throw Error('duplicate research run');
    this.runs.push(structuredClone(run));
  }
  list() {
    return structuredClone(this.runs);
  }
  summaries(limit = 20) {
    return this.runs
      .slice(-limit)
      .reverse()
      .map((run) =>
        structuredClone({
          id: run.id,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          strategyId: run.strategyId,
          error: run.error,
          datasetHash: run.dataset?.hash,
          candles: run.dataset?.candles.length,
          findings: run.findings,
          backtest: run.backtest,
        }),
      );
  }
  get(id: string) {
    return this.list().find((run) => run.id === id);
  }
}
export function researchDataset(
  snapshotInput: MarketSnapshot,
  candleInput: Candle[],
  now = Date.now(),
): ResearchDataset {
  const snapshot = snapshotSchema.parse(snapshotInput),
    all = z.array(candleSchema).min(64).max(1000).parse(candleInput);
  if (
    snapshot.bid > snapshot.ask ||
    snapshot.price < snapshot.bid ||
    snapshot.price > snapshot.ask ||
    now - snapshot.timestamp > 60000 ||
    snapshot.timestamp > now + 5000
  )
    throw Error('invalid or stale market snapshot');
  for (let i = 0; i < all.length; i++) {
    const candle = all[i]!;
    if (candle.timestamp > now) throw Error('future candle timestamp');
    if (
      candle.low > Math.min(candle.open, candle.close) ||
      candle.high < Math.max(candle.open, candle.close) ||
      candle.low > candle.high
    )
      throw Error('invalid candle bounds');
    if (i > 0 && candle.timestamp - all[i - 1]!.timestamp !== 3600000) throw Error('non-contiguous hourly history');
  }
  const candles = all.filter((candle) => candle.timestamp + 3600000 <= now);
  if (candles.length < 64 || now - candles.at(-1)!.timestamp > 7200000)
    throw Error('insufficient or stale closed candles');
  const evidence = {
    symbol: 'BTCUSDT' as const,
    interval: '1h' as const,
    historyMarket: 'BINANCE_SPOT' as const,
    snapshotMarket: 'BINANCE_USDM' as const,
    snapshot,
    candles,
  };
  return {
    ...evidence,
    retrievedAt: new Date(now).toISOString(),
    hash: createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
  };
}
export function specialistFindings(dataset: ResearchDataset): SpecialistFinding[] {
  const candles = dataset.candles,
    first = candles[0]!,
    last = candles.at(-1)!;
  const returns = candles.slice(1).map((candle, i) => Math.log(candle.close) - Math.log(candles[i]!.close));
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const volatility = Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length);
  const momentum = Math.expm1(Math.log(last.close) - Math.log(first.close));
  if (!Number.isFinite(momentum) || !Number.isFinite(volatility) || !Number.isFinite(mean))
    throw Error('non-finite research metrics');
  const trendScore = volatility > 0 ? Math.abs(mean) / volatility : mean === 0 ? 0 : null;
  const regime =
    (trendScore !== null && trendScore > 0.25) || (volatility === 0 && mean !== 0)
      ? 'TREND_CANDIDATE'
      : 'NO_CLEAR_TREND';
  return [
    {
      agentId: 'satoshi',
      metric: 'observed-spot-momentum',
      values: { returnPct: momentum, hourlyCandles: candles.length },
      summary: `Observed BTC spot return over ${candles.length} hourly candles: ${(momentum * 100).toFixed(3)}%`,
    },
    {
      agentId: 'flux',
      metric: 'observed-derivatives-context',
      values: {
        spreadBps: dataset.snapshot.spreadBps,
        fundingRate: dataset.snapshot.fundingRate ?? null,
        openInterest: dataset.snapshot.openInterest ?? null,
      },
      summary: `Observed USD-M spread: ${dataset.snapshot.spreadBps.toFixed(3)} bps; optional funding/open interest remain unavailable when absent`,
    },
    {
      agentId: 'vega',
      metric: 'observed-hourly-volatility',
      values: { logReturnStdDev: volatility, meanLogReturn: mean },
      summary: `Observed hourly log-return standard deviation: ${volatility.toFixed(6)}; descriptive, not a forecast`,
    },
    {
      agentId: 'oracle',
      metric: 'descriptive-regime',
      values: { regime, trendScore },
      summary: `Descriptive regime: ${regime}; abs(mean hourly log return)/volatility threshold 0.25`,
    },
  ];
}
