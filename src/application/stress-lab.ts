// Laboratório de estresse (STRESS_LAB_V1, passo 2 do mapa ATS-MATRIX, docs/STRESS_LAB.md).
// Roda o ciclo autônomo, o livro paper e o risco DE PRODUÇÃO sobre um mercado SINTÉTICO gerado por semente, hora a
// hora, só em memória: sem banco, sem corretora, sem rede. Cada cenário injeta uma falha numa janela declarada e
// confere invariantes que valem sempre, mais as expectativas do próprio cenário. "Sobreviver" é manter os invariantes
// e os controles de risco, não ter lucro. Os preços são sintéticos: o relatório não diz nada sobre o mercado real.
import { createHash } from 'node:crypto';
import { AutonomousPerpetualCycle } from './autonomous-perpetual-cycle.js';
import { PerpetualPaperBook, type PerpetualBookState } from './perpetual-paper-book.js';
import { EventBus } from './event-bus.js';
import { MemoryStore } from '../domain/memory.js';
import type { DomainEvent } from '../domain/events.js';
import type { Candle } from '../domain/backtest.js';
import type { PerpetualConfig, PerpetualDataset } from '../domain/perpetual-backtest.js';
import type { PerpetualQuote, FundingRecord } from '../domain/perpetual-market.js';
import type { PerpetualStudies, PerpetualStudy } from './perpetual-studies.js';

const HOUR = 3600000,
  ACCOUNT = 'evaluation:nova:usdm',
  INSTRUMENT = 'BINANCE_USDM:BTCUSDT' as const;
export const STRESS_POLICY = Object.freeze({
  version: 'STRESS_LAB_V1',
  warmupBars: 120,
  runHours: 240,
  startPrice: 60000,
  hourlyVolatility: 0.004,
  trendDrift: 0.0015,
  trendBlockHours: 36,
  fundingRate: 0.0001,
  halfSpread: 0.5,
  initialCash: 1000,
  maxLossFraction: 0.03,
  recoveryLimitHours: 1,
  // Estratégia rápida (SMA 5/20) para o laboratório ter entradas e saídas frequentes; não é a estratégia do piloto.
  configuration: {
    strategy: 'SMA',
    initialCapital: 10000,
    feeRate: 0.00055,
    slippageBps: 1,
    maintenanceRate: 0.01,
    liquidationFeeRate: 0.005,
    positionFraction: 0.1,
    fastPeriod: 5,
    slowPeriod: 20,
  } as PerpetualConfig,
});

/** PRNG determinístico (mulberry32): mesma semente, mesmo mercado. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Market {
  trade: Candle[];
  mark: Candle[];
  funding: Omit<FundingRecord, 'instrument'>[];
}
/** Mercado sintético: blocos de tendência alternada + ruído; `shock` troca o retorno de horas específicas, `volatility` multiplica o ruído. */
function syntheticMarket(
  seed: number,
  options: {
    shock?: Record<number, number>;
    drift?: Record<number, number>;
    volatility?: (hour: number) => number;
  } = {},
): Market {
  const rnd = random(seed),
    p = STRESS_POLICY,
    total = p.warmupBars + p.runHours,
    start = Date.UTC(2030, 0, 1);
  const normal = () => {
    const u = Math.max(rnd(), 1e-12),
      v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const trade: Candle[] = [];
  let close = p.startPrice;
  for (let i = 0; i < total; i++) {
    const hour = i - p.warmupBars,
      block = Math.floor(i / p.trendBlockHours) % 2 === 0 ? 1 : -1;
    const drift = options.drift?.[hour] ?? block * p.trendDrift,
      sigma = p.hourlyVolatility * (options.volatility?.(hour) ?? 1);
    const open = close,
      ret = options.shock?.[hour] ?? drift + sigma * normal();
    close = open * Math.exp(Math.log1p(ret));
    const wick = open * sigma * Math.abs(normal()) * 0.5;
    trade.push({
      timestamp: start + i * HOUR,
      open,
      high: Math.max(open, close) + wick,
      low: Math.max(1, Math.min(open, close) - wick),
      close,
      volume: 100 + Math.floor(rnd() * 50),
    });
  }
  const mark = trade.map((c) => ({ ...c, volume: 0 }));
  // Funding a cada 8 h, até depois do último candle (o livro espera a liquidação seguinte à última cotação).
  const funding: Market['funding'] = [];
  for (let t = Math.ceil(start / (8 * HOUR)) * 8 * HOUR; t <= start + (total + 16) * HOUR; t += 8 * HOUR)
    funding.push({
      timestamp: t,
      rate: p.fundingRate,
      markPrice: (trade.find((c) => c.timestamp === t) ?? trade.at(-1)!).open,
    });
  return { trade, mark, funding };
}

/** O que um cenário pode fazer numa hora `h` (0 = primeira hora do teste). */
export interface StressHooks {
  quote?: (h: number, q: PerpetualQuote) => PerpetualQuote;
  load?: (h: number, data: PerpetualDataset) => PerpetualDataset;
  /** Antes do ciclo: halt, reinício, chamadas repetidas, marcas fora de ordem. */
  before?: (h: number, world: World) => Promise<void>;
  /** Horas em que abrir ou aumentar exposição é proibido (o harness confere). */
  forbidOpen?: (h: number) => boolean;
}
export interface StressScenario {
  id: string;
  title: string;
  covers: string[];
  window: [number, number] | null;
  market?: Parameters<typeof syntheticMarket>[1];
  hooks?: StressHooks;
  expectations: { id: string; description: string; check: (r: ScenarioMetrics, w: World) => boolean }[];
}

/** Estado vivo de uma execução (exposto aos ganchos dos cenários). */
export class World {
  bus = new EventBus();
  events: DomainEvent[] = [];
  memories = new MemoryStore();
  clock = 0;
  book!: PerpetualPaperBook;
  cycle!: AutonomousPerpetualCycle;
  decisionsByHour = new Map<number, number>();
  rejectedCorrectly: string[] = [];
  constructor(
    readonly market: Market,
    readonly hooks: StressHooks,
  ) {
    this.bus.subscribe((e) => this.events.push(e));
  }
  save = async (_: PerpetualBookState) => {};
  now = () => this.clock;
  study = {
    id: 'stress-study',
    status: 'COMPLETED',
    result: { datasetHash: 'synthetic', folds: [{ configuration: STRESS_POLICY.configuration }] },
  } as unknown as PerpetualStudy;
  // TEST_ONLY: elegibilidade fixa; no piloto real a triagem do estudo é a única autoridade.
  studies = {
    screen: () => ({ eligible: true, reason: 'TEST_ONLY stress stub' }),
    get: () => this.study,
  } as unknown as PerpetualStudies;
  hour = 0;
  lastQuote: PerpetualQuote | null = null;
  closedSlice(count: number): PerpetualDataset {
    const m = this.market,
      stop = m.trade.findIndex((c) => c.timestamp > this.clock - HOUR);
    const end = stop < 0 ? m.trade.length : stop;
    const trade = m.trade.slice(Math.max(0, end - count), end),
      mark = m.mark.slice(Math.max(0, end - count), end);
    return {
      instrument: INSTRUMENT,
      trade: structuredClone(trade),
      mark: structuredClone(mark),
      funding: m.funding
        .filter((f) => f.timestamp >= trade[0].timestamp && f.timestamp < trade.at(-1)!.timestamp + HOUR)
        .map((f) => ({ ...f })),
    };
  }
  source = {
    load: async (count: number) => {
      const data = this.closedSlice(count);
      return this.hooks.load ? this.hooks.load(this.hour, data) : data;
    },
  };
  makeBook(state?: PerpetualBookState) {
    this.book = new PerpetualPaperBook(this.bus, state, this.now);
    if (!state) this.book.ensureEvaluation('nova', STRESS_POLICY.initialCash);
    this.cycle = new AutonomousPerpetualCycle(
      true,
      this.study.id,
      this.studies,
      this.book,
      this.source,
      this.save,
      this.memories,
      this.bus,
      async () => {},
      this.now,
      () => true,
      { retryDelayMs: 0, maxLossFraction: STRESS_POLICY.maxLossFraction },
    );
  }
  /** Reinício do serviço: novo livro e novo ciclo a partir do estado salvo (como num restart real). */
  async restart() {
    this.makeBook(this.book.exportState());
    if (this.lastQuote) await this.book.synchronize(this.lastQuote, [], this.save);
  }
  quoteAt(index: number): PerpetualQuote {
    const c = this.market.trade[index],
      m = this.market.mark[index],
      next = Math.ceil((this.clock + 1) / (8 * HOUR)) * 8 * HOUR;
    return {
      instrument: INSTRUMENT,
      symbol: 'BTCUSDT',
      bid: c.close - STRESS_POLICY.halfSpread,
      ask: c.close + STRESS_POLICY.halfSpread,
      markPrice: m.close,
      indexPrice: m.close,
      fundingRate: STRESS_POLICY.fundingRate,
      nextFundingTime: next,
      bookTime: this.clock,
      markTime: this.clock,
      receivedAt: this.clock,
    };
  }
}

export interface ScenarioMetrics {
  decisions: number;
  fills: number;
  openingFills: number;
  riskRejected: Record<string, number>;
  cycleErrors: Record<string, number>;
  syncRejected: Record<string, number>;
  entryBlocked: number;
  killSwitchActivations: number;
  pilotStops: string[];
  worstSlippageBps: number | null;
  maxDrawdown: number;
  finalEquity: number;
  finalPosition: number;
  recoveryHours: number | null;
  rejectedCorrectly: string[];
}
const bump = (o: Record<string, number>, k: string) => {
  o[k] = (o[k] ?? 0) + 1;
};
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 120);

/** Invariantes que valem para todo cenário. Exportado para o teste de mutação do próprio verificador. */
export function checkInvariants(input: {
  events: DomainEvent[];
  openings: { hour: number; forbidden: boolean; halted: boolean }[];
  decisionsByHour: Map<number, number>;
  restoreOk: boolean;
  equity: number;
  maxDrawdown: number;
}) {
  const violations: string[] = [];
  const approved = new Set<string>();
  for (const e of input.events) {
    const p = e.payload as { order?: { proposalId?: string }; fill?: { proposalId?: string } };
    if (e.type === 'RISK_APPROVED' && p.order?.proposalId) approved.add(p.order.proposalId);
    if (e.type === 'PAPER_FILL' && !(p.fill?.proposalId && approved.has(p.fill.proposalId)))
      violations.push('INV_FILL_WITHOUT_RISK_APPROVAL');
  }
  for (const o of input.openings) {
    if (o.forbidden) violations.push('INV_NEW_EXPOSURE_WHILE_BLOCKED@h' + o.hour);
    if (o.halted) violations.push('INV_NEW_EXPOSURE_WHILE_HALTED@h' + o.hour);
  }
  for (const [candle, count] of input.decisionsByHour)
    if (count > 1) violations.push('INV_DUPLICATE_DECISION@' + new Date(candle).toISOString());
  if (!input.restoreOk) violations.push('INV_STATE_NOT_RESTORABLE');
  if (!Number.isFinite(input.equity) || !(input.maxDrawdown >= 0 && input.maxDrawdown <= 1))
    violations.push('INV_NON_FINITE_ACCOUNTING');
  return [...new Set(violations)];
}

export async function runScenario(scenario: StressScenario, seed: number) {
  const p = STRESS_POLICY,
    market = syntheticMarket(seed, scenario.market),
    hooks = scenario.hooks ?? {},
    world = new World(market, hooks);
  world.clock = market.trade[p.warmupBars - 1].timestamp + HOUR + 60000;
  world.makeBook();
  const cycleErrors: Record<string, number> = {},
    syncRejected: Record<string, number> = {},
    openings: { hour: number; forbidden: boolean; halted: boolean }[] = [];
  let worstSlippageBps: number | null = null,
    position = 0;
  const decisionHours: number[] = [];
  for (let i = p.warmupBars; i < market.trade.length; i++) {
    const h = i - p.warmupBars;
    world.hour = h;
    world.clock = market.trade[i].timestamp + HOUR + 60000;
    let quote = world.quoteAt(i);
    if (hooks.quote) quote = hooks.quote(h, quote);
    const settlements = world.book.fundingDue(quote.markTime)
      ? market.funding
          .filter((f) => f.timestamp > world.book.cursor() && f.timestamp <= world.clock)
          .map((f) => ({ instrument: INSTRUMENT, ...f }))
      : [];
    try {
      await world.book.synchronize(quote, settlements, world.save);
      world.lastQuote = quote;
    } catch (error) {
      bump(syncRejected, message(error));
    }
    const seen = world.events.length;
    if (hooks.before) await hooks.before(h, world);
    const haltedBefore = world.book.status().halted;
    try {
      await world.cycle.onMarket();
    } catch (error) {
      bump(cycleErrors, message(error));
    }
    for (const e of world.events.slice(seen)) {
      if (e.type === 'AUTONOMOUS_DECISION') {
        const c = (e.payload as { candleTimestamp: number }).candleTimestamp;
        world.decisionsByHour.set(c, (world.decisionsByHour.get(c) ?? 0) + 1);
        decisionHours.push(h);
      }
      if (e.type === 'PAPER_FILL') {
        const f = (e.payload as { fill: { side: string; quantity: number; fillPrice: number } }).fill,
          signed = f.side === 'BUY' ? f.quantity : -f.quantity,
          next = position + signed;
        if (Math.abs(next) > Math.abs(position) + 1e-12)
          openings.push({ hour: h, forbidden: hooks.forbidOpen?.(h) ?? false, halted: haltedBefore });
        const mid = (quote.bid + quote.ask) / 2,
          slip = ((f.side === 'BUY' ? f.fillPrice - mid : mid - f.fillPrice) / mid) * 10000;
        worstSlippageBps = Math.max(worstSlippageBps ?? -Infinity, slip);
        position = next;
      }
    }
  }
  // Fills fora do ciclo (ex.: liquidação na sincronização) também contam para a posição.
  const account = world.book.list()[0];
  let restoreOk = true;
  try {
    const restored = new PerpetualPaperBook(new EventBus(), world.book.exportState(), world.now);
    restoreOk = Math.abs(restored.list()[0].portfolio.equity - account.portfolio.equity) < 1e-9;
  } catch {
    restoreOk = false;
  }
  const ledger = world.book.ledger(ACCOUNT)!,
    riskRejected: Record<string, number> = {};
  for (const e of ledger)
    if (e.type === 'RISK_REJECTED')
      for (const r of (e.payload as { decision: { reasons: string[] } }).decision.reasons) bump(riskRejected, r);
  const recoveryHours = scenario.window
    ? (() => {
        const first = decisionHours.find((h) => h >= scenario.window![1]);
        return first === undefined ? null : first - scenario.window![1];
      })()
    : null;
  const metrics: ScenarioMetrics = {
    decisions: decisionHours.length,
    fills: account.fills,
    openingFills: openings.length,
    riskRejected,
    cycleErrors,
    syncRejected,
    entryBlocked: world.memories.query({ agentId: 'sentinel', kind: 'DECISION' }).length,
    killSwitchActivations: world.events.filter(
      (e) => e.type === 'PAPER_CONTROL_CHANGED' && (e.payload as { halted: boolean }).halted,
    ).length,
    pilotStops: world.events
      .filter((e) => e.type === 'AUTONOMOUS_PILOT_STOPPED')
      .map((e) => (e.payload as { reason: string }).reason),
    worstSlippageBps: worstSlippageBps === null ? null : Number(worstSlippageBps.toFixed(4)),
    maxDrawdown: Number((account.maxDrawdown ?? 0).toFixed(8)),
    finalEquity: Number(account.portfolio.equity.toFixed(6)),
    finalPosition: Number((account.portfolio.positions[0]?.quantity ?? 0).toFixed(12)),
    recoveryHours,
    rejectedCorrectly: world.rejectedCorrectly,
  };
  const invariantViolations = checkInvariants({
    events: world.events,
    openings,
    decisionsByHour: world.decisionsByHour,
    restoreOk,
    equity: account.portfolio.equity,
    maxDrawdown: account.maxDrawdown ?? 0,
  });
  const expectations = scenario.expectations.map((x) => ({
    id: x.id,
    description: x.description,
    passed: x.check(metrics, world),
  }));
  return {
    id: scenario.id,
    title: scenario.title,
    covers: scenario.covers,
    window: scenario.window,
    survived: invariantViolations.length === 0 && expectations.every((x) => x.passed),
    invariantViolations,
    expectations,
    metrics,
  };
}
export type ScenarioResult = Awaited<ReturnType<typeof runScenario>>;

const inWindow = (w: [number, number]) => (h: number) => h >= w[0] && h < w[1];
const opened = (r: ScenarioMetrics) => r.openingFills > 0;
const recovered = (r: ScenarioMetrics) =>
  r.recoveryHours !== null && r.recoveryHours <= STRESS_POLICY.recoveryLimitHours;
const errorsMatching = (r: ScenarioMetrics, text: string) =>
  Object.entries(r.cycleErrors)
    .filter(([k]) => k.includes(text))
    .reduce((s, [, v]) => s + v, 0);
const W: [number, number] = [100, 124];

/** Catálogo declarado antes de rodar. Janela padrão: horas 100 a 123 do teste. */
export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'BASELINE',
    title: 'Sem falhas',
    covers: ['baseline'],
    window: null,
    expectations: [
      {
        id: 'decides_every_hour',
        description: 'uma decisão por hora fechada',
        check: (r) => r.decisions === STRESS_POLICY.runHours,
      },
      { id: 'trades', description: 'o ciclo abre posições', check: opened },
      {
        id: 'no_errors',
        description: 'nenhum erro de ciclo ou sincronização',
        check: (r) => !Object.keys(r.cycleErrors).length && !Object.keys(r.syncRejected).length,
      },
    ],
  },
  {
    id: 'ABRUPT_MOVE',
    title: 'Queda de 12% numa hora e alta de 10% doze horas depois',
    covers: ['abrupt BTC move'],
    window: null,
    market: { shock: { 100: -0.12, 112: 0.1 } },
    expectations: [
      {
        id: 'keeps_deciding',
        description: 'continua decidindo todas as horas',
        check: (r) => r.decisions === STRESS_POLICY.runHours,
      },
    ],
  },
  {
    id: 'VOLATILITY_SPIKE',
    title: 'Volatilidade 6x por 24 h',
    covers: ['volatility spike'],
    window: null,
    market: { volatility: (h) => (h >= W[0] && h < W[1] ? 6 : 1) },
    expectations: [
      {
        id: 'keeps_deciding',
        description: 'continua decidindo todas as horas',
        check: (r) => r.decisions === STRESS_POLICY.runHours,
      },
    ],
  },
  {
    id: 'SPREAD_WIDENING',
    title: 'Spread de 2% (1% para cada lado) por 24 h',
    covers: ['spread widening', 'abnormal slippage'],
    window: W,
    hooks: {
      quote: (h, q) => {
        if (!inWindow(W)(h)) return q;
        const mid = (q.bid + q.ask) / 2;
        return { ...q, bid: mid * 0.99, ask: mid * 1.01 };
      },
    },
    // Achado esperado: o risco não tem limite de spread; o custo aparece no pior slippage. Só registramos.
    expectations: [
      {
        id: 'cost_visible',
        description: 'o pior slippage reflete o spread (>= 100 bps)',
        check: (r) => (r.worstSlippageBps ?? 0) >= 100,
      },
    ],
  },
  {
    id: 'STALE_QUOTE',
    title: 'Cotação atrasada 60 s por 24 h',
    covers: ['stale/delayed market data'],
    window: W,
    hooks: {
      quote: (h, q) =>
        inWindow(W)(h)
          ? { ...q, bookTime: q.bookTime - 60000, markTime: q.markTime - 60000, receivedAt: q.receivedAt - 60000 }
          : q,
      forbidOpen: inWindow(W),
    },
    expectations: [
      {
        id: 'sync_rejected',
        description: 'a sincronização recusa cada cotação velha',
        check: (r) => (r.syncRejected['stale market'] ?? 0) === 24,
      },
      { id: 'recovers', description: 'volta a decidir na primeira hora boa', check: recovered },
    ],
  },
  {
    id: 'STALE_CANDLES',
    title: 'Fonte de candles atrasada 3 h por 24 h',
    covers: ['stale/delayed market data'],
    window: W,
    hooks: {
      load: (h, d) => {
        if (!inWindow(W)(h)) return d;
        const cut = d.trade.length - 3;
        return {
          ...d,
          trade: d.trade.slice(0, cut),
          mark: d.mark.slice(0, cut),
          funding: d.funding.filter((f) => f.timestamp < d.trade[cut - 1].timestamp + HOUR),
        };
      },
      forbidOpen: inWindow(W),
    },
    expectations: [
      {
        id: 'stale_blocked',
        description: '"signal history stale" em cada hora da janela',
        check: (r) => errorsMatching(r, 'signal history stale') === 24,
      },
      { id: 'recovers', description: 'volta a decidir na primeira hora boa', check: recovered },
    ],
  },
  {
    id: 'MISSING_CANDLE',
    title: 'Fonte devolve histórico com um candle faltando por 24 h',
    covers: ['missing candle'],
    window: W,
    hooks: {
      load: (h, d) => {
        if (!inWindow(W)(h)) return d;
        const k = Math.floor(d.trade.length / 2);
        return { ...d, trade: d.trade.filter((_, i) => i !== k), mark: d.mark.filter((_, i) => i !== k) };
      },
      forbidOpen: inWindow(W),
    },
    expectations: [
      {
        id: 'rejected',
        description: 'conjunto descontínuo recusado em cada hora',
        check: (r) => errorsMatching(r, 'discontinuous') === 24,
      },
      { id: 'recovers', description: 'volta a decidir na primeira hora boa', check: recovered },
    ],
  },
  {
    id: 'PROVIDER_OUTAGE',
    title: 'Fonte de candles fora do ar por 24 h',
    covers: ['market-data provider outage'],
    window: W,
    hooks: {
      load: (h, d) => {
        if (inWindow(W)(h)) throw Error('provider unavailable (simulated)');
        return d;
      },
      forbidOpen: inWindow(W),
    },
    expectations: [
      {
        id: 'errors',
        description: 'erro em cada hora da janela, sem decisão inventada',
        check: (r) => errorsMatching(r, 'provider unavailable') === 24 && r.decisions === STRESS_POLICY.runHours - 24,
      },
      { id: 'recovers', description: 'volta a decidir na primeira hora boa', check: recovered },
    ],
  },
  {
    id: 'BACKUP_VENUE_DIVERGENCE',
    title: 'Só dados de reserva (Bybit), 3% acima da Binance, por 24 h',
    covers: ['Binance/Bybit disagreement'],
    window: W,
    hooks: {
      load: (h, d) => {
        if (!inWindow(W)(h)) return d;
        const up = (c: Candle) => ({
          ...c,
          open: c.open * 1.03,
          high: c.high * 1.03,
          low: c.low * 1.03,
          close: c.close * 1.03,
        });
        return { ...d, instrument: 'BYBIT_LINEAR:BTCUSDT', trade: d.trade.map(up), mark: d.mark.map(up) };
      },
      forbidOpen: inWindow(W),
    },
    // Cobre a regra "dados de reserva nunca abrem posição"; detectar a divergência em si ainda não existe (lacuna L7).
    expectations: [
      {
        id: 'decides',
        description: 'continua decidindo (pode fechar)',
        check: (r) => r.decisions === STRESS_POLICY.runHours,
      },
    ],
  },
  {
    id: 'LOSS_LIMIT',
    title: 'Alta de 48 h e queda de 50% numa hora com posição comprada',
    covers: ['maximum-loss boundary', 'repeated stop sequence'],
    window: null,
    market: { drift: Object.fromEntries(Array.from({ length: 48 }, (_, i) => [52 + i, 0.003])), shock: { 100: -0.5 } },
    hooks: { forbidOpen: (h) => h > 100 },
    expectations: [
      {
        id: 'stopped',
        description: 'o piloto para por PILOT_LOSS_LIMIT',
        check: (r) => r.pilotStops.includes('PILOT_LOSS_LIMIT'),
      },
      { id: 'flat', description: 'termina sem posição', check: (r) => r.finalPosition === 0 },
      { id: 'halted', description: 'o kill switch fica ligado', check: (_, w) => w.book.status().halted },
    ],
  },
  {
    id: 'KILL_SWITCH',
    title: 'Kill switch ligado por 24 h',
    covers: ['kill-switch'],
    window: W,
    hooks: {
      before: async (h, w) => {
        if (h === W[0]) await w.book.halt(true, w.save);
        if (h === W[1]) await w.book.halt(false, w.save);
      },
      forbidOpen: inWindow(W),
    },
    expectations: [
      {
        id: 'no_decisions',
        description: 'nenhuma decisão com o kill switch ligado',
        check: (r) => r.decisions === STRESS_POLICY.runHours - 24,
      },
      { id: 'recovers', description: 'volta a decidir ao desligar', check: recovered },
    ],
  },
  {
    id: 'MALFORMED_SNAPSHOT',
    title: 'Candle incoerente (máxima abaixo da mínima) e cotação NaN por 24 h',
    covers: ['malformed/partial market snapshot'],
    window: W,
    hooks: {
      load: (h, d) => {
        if (!inWindow(W)(h)) return d;
        const trade = d.trade.slice();
        const last = trade.at(-1)!;
        trade[trade.length - 1] = { ...last, high: last.low - 1 };
        return { ...d, trade };
      },
      quote: (h, q) => (inWindow(W)(h) && h % 2 === 0 ? { ...q, markPrice: Number.NaN } : q),
      forbidOpen: inWindow(W),
    },
    expectations: [
      {
        id: 'rejected',
        description:
          'nas 12 horas pares a cotação NaN é recusada (sem cotação, o ciclo não roda); nas 12 ímpares o candle incoerente é recusado',
        check: (r) =>
          errorsMatching(r, 'invalid or discontinuous candles') === 12 && (r.syncRejected['stale market'] ?? 0) === 12,
      },
      { id: 'recovers', description: 'volta a decidir na primeira hora boa', check: recovered },
    ],
  },
  {
    id: 'DUPLICATE_OUT_OF_ORDER',
    title: 'Ciclo chamado 3x por hora, marca fora de ordem e cursor repetido',
    covers: ['duplicate/out-of-order events'],
    window: W,
    hooks: {
      before: async (h, w) => {
        if (!inWindow(W)(h)) return;
        await w.cycle.onMarket();
        await w.cycle.onMarket();
        const old = w.quoteAt(STRESS_POLICY.warmupBars + h - 1);
        try {
          await w.book.synchronize(
            { ...old, bookTime: w.clock - 2000, markTime: w.clock - 2000, receivedAt: w.clock },
            [],
            w.save,
          );
        } catch (error) {
          if (message(error) === 'out-of-order mark') w.rejectedCorrectly.push('OUT_OF_ORDER_MARK');
        }
        const cursor = w.book.status().autonomousCursor;
        if (cursor) {
          try {
            await w.book.checkpoint(cursor, w.save);
          } catch (error) {
            if (message(error) === 'autonomous candle already processed') w.rejectedCorrectly.push('REPEATED_CURSOR');
          }
        }
      },
    },
    expectations: [
      {
        id: 'one_per_candle',
        description: 'uma decisão por candle',
        check: (r) => r.decisions === STRESS_POLICY.runHours,
      },
      {
        id: 'rejections',
        description: 'marca fora de ordem e cursor repetido recusados em cada hora',
        check: (r) =>
          r.rejectedCorrectly.filter((x) => x === 'OUT_OF_ORDER_MARK').length === 24 &&
          r.rejectedCorrectly.filter((x) => x === 'REPEATED_CURSOR').length === 24,
      },
    ],
  },
  {
    id: 'RESTART',
    title: 'Reinício do serviço a cada hora por 24 h',
    covers: ['restart/recovery'],
    window: W,
    hooks: {
      before: async (h, w) => {
        if (inWindow(W)(h)) await w.restart();
      },
    },
    expectations: [
      {
        id: 'one_per_candle',
        description: 'uma decisão por candle, sem fill repetido',
        check: (r) => r.decisions === STRESS_POLICY.runHours,
      },
    ],
  },
];

/** Roda o catálogo inteiro; o hash cobre o relatório todo, então mesma semente + mesmo código = mesmo hash. */
export async function runStressLab(seed: number, scenarios = STRESS_SCENARIOS) {
  if (!Number.isSafeInteger(seed) || seed < 0) throw Error('seed must be a non-negative integer');
  const results: ScenarioResult[] = [];
  for (const s of scenarios) results.push(await runScenario(s, seed));
  const body = {
    scope: 'SIMULATION' as const,
    policy: { ...STRESS_POLICY, configuration: { ...STRESS_POLICY.configuration } },
    seed,
    note: 'Mercado sintético gerado pela semente; mede invariantes e controles do código de produção, não o mercado real.',
    summary: {
      scenarios: results.length,
      survived: results.filter((r) => r.survived).length,
      invariantViolations: results.reduce((s, r) => s + r.invariantViolations.length, 0),
      killSwitchActivations: results.reduce((s, r) => s + r.metrics.killSwitchActivations, 0),
      worstSlippageBps: Math.max(...results.map((r) => r.metrics.worstSlippageBps ?? 0)),
      maxDrawdown: Math.max(...results.map((r) => r.metrics.maxDrawdown)),
    },
    scenarios: results,
  };
  return { ...body, reportSha256: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
}
