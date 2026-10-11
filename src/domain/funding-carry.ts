import { createHash } from 'node:crypto';
import type { Candle } from './backtest.js';
import type { FundingSettlement } from './perpetual-backtest.js';

/**
 * Carry de funding (docs/PROTOCOLO_CARRY_FUNDING.md): compra à vista e vende o perpétuo na mesma quantidade, e recebe o
 * funding enquanto ele está positivo. Simulação histórica só; não emite eventos de corretora nem grava contas.
 *
 * Linha do tempo de cada vela i (sem olhar o futuro):
 *  1. abertura de i: executa as entradas e saídas decididas no fechamento de i-1 (abertura ± slippage, mais as taxas);
 *  2. durante a hora de i: liquida o funding registrado naquela hora (o vendido recebe taxa positiva);
 *  3. testa a margem no pior caso da hora (máxima do perpétuo) e marca a carteira pelo fechamento;
 *  4. fechamento de i: se for hora de decidir, usa só o funding liquidado antes do fechamento.
 */
export interface CarryMarket {
  spot: Candle[];
  perp: Candle[];
  funding: FundingSettlement[];
}
export interface CarryConfig {
  rebalanceHours: number;
  signalHours: number;
  maxPositions: number;
  positionFraction: number;
  entryMinimumFunding: number;
  exitFunding: number;
  minimumCashToShortNotional: number;
  spotFeeRate: number;
  perpFeeRate: number;
  slippageBps: number;
  maintenanceRate: number;
  initialCapital: number;
}
export interface CarryDecision {
  timestamp: number;
  held: string[];
  opened: string[];
  closed: string[];
  signals: Record<string, number>;
}
export interface CarryResult {
  model: 'FUNDING_CARRY_V1';
  execution: 'HISTORICAL_SIMULATION';
  marketHashes: Record<string, string>;
  equitySeries: { timestamp: number; equity: number }[];
  finalEquity: number;
  netPnl: number;
  maxDrawdown: number;
  feesPaid: number;
  fundingReceived: number;
  basisPnl: number;
  entries: number;
  exits: number;
  investedHours: number;
  positionHours: number;
  minimumMarginRatio: number | null;
  liquidatedAt: number | null;
  decisions: CarryDecision[];
}
const HOUR = 3600000;
function validCandles(series: Candle[]) {
  return series.every(
    (c, i) =>
      Number.isSafeInteger(c.timestamp) &&
      c.timestamp % HOUR === 0 &&
      (i === 0 || c.timestamp === series[i - 1].timestamp + HOUR) &&
      [c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v) && v > 0) &&
      c.high >= Math.max(c.open, c.close) &&
      c.low <= Math.min(c.open, c.close),
  );
}
export function hashCarryMarket(market: CarryMarket) {
  const candle = (c: Candle) => ({
    timestamp: c.timestamp,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  });
  return createHash('sha256')
    .update(
      JSON.stringify({
        spot: market.spot.map(candle),
        perp: market.perp.map(candle),
        funding: market.funding.map((f) => ({ timestamp: f.timestamp, rate: f.rate, markPrice: f.markPrice })),
      }),
    )
    .digest('hex');
}
export function simulateFundingCarry(markets: Record<string, CarryMarket>, cfg: CarryConfig): CarryResult {
  const symbols = Object.keys(markets).sort();
  if (
    !symbols.length ||
    !(cfg.maxPositions >= 1) ||
    !(cfg.positionFraction > 0 && cfg.positionFraction * cfg.maxPositions <= 1)
  )
    throw new Error('invalid portfolio');
  if (![cfg.rebalanceHours, cfg.signalHours].every((v) => Number.isSafeInteger(v) && v > 0))
    throw new Error('invalid schedule');
  if (!(
    cfg.spotFeeRate >= 0 &&
    cfg.perpFeeRate >= 0 &&
    cfg.slippageBps >= 0 &&
    cfg.maintenanceRate >= 0 &&
    cfg.initialCapital > 0 &&
    cfg.minimumCashToShortNotional >= 0
  ))
    throw new Error('invalid costs');
  const base = markets[symbols[0]].perp,
    bars = base.length;
  if (bars < 2) throw new Error('not enough bars');
  const marketHashes: Record<string, string> = {};
  for (const s of symbols) {
    const m = markets[s];
    if (
      m.spot.length !== bars ||
      m.perp.length !== bars ||
      !validCandles(m.spot) ||
      !validCandles(m.perp) ||
      m.spot.some((c, i) => c.timestamp !== base[i].timestamp || m.perp[i].timestamp !== base[i].timestamp)
    )
      throw new Error('unaligned or invalid candles: ' + s);
    if (
      m.funding.some(
        (f, i) =>
          !Number.isFinite(f.rate) || !(f.markPrice > 0) || (i > 0 && f.timestamp <= m.funding[i - 1].timestamp),
      )
    )
      throw new Error('invalid funding: ' + s);
    marketHashes[s] = hashCarryMarket(m);
  }
  const slip = cfg.slippageBps / 10000,
    positions = new Map<string, { qty: number; entry: number }>();
  // Liquidações anteriores à primeira vela só servem para o sinal.
  const fundingIndex = new Map(
    symbols
      .map((s) => [s, markets[s].funding.findIndex((f) => f.timestamp >= base[0].timestamp)])
      .map(([s, k]) => [s, k === -1 ? markets[s as string].funding.length : k] as [string, number]),
  );
  let cash = cfg.initialCapital,
    fees = 0,
    funding = 0,
    entries = 0,
    exits = 0,
    investedHours = 0,
    positionHours = 0,
    peak = cfg.initialCapital,
    maxDrawdown = 0;
  let minimumMarginRatio: number | null = null,
    liquidatedAt: number | null = null,
    pending: { open: { symbol: string; qty: number }[]; close: string[] } | null = null;
  const equitySeries: { timestamp: number; equity: number }[] = [],
    decisions: CarryDecision[] = [];
  for (let i = 0; i < bars; i++) {
    const t = base[i].timestamp;
    if (pending) {
      for (const s of pending.close) {
        const p = positions.get(s)!,
          spot = markets[s].spot[i].open * (1 - slip),
          perp = markets[s].perp[i].open * (1 + slip);
        const fee = p.qty * spot * cfg.spotFeeRate + p.qty * perp * cfg.perpFeeRate;
        cash += p.qty * spot + p.qty * (p.entry - perp) - fee;
        fees += fee;
        positions.delete(s);
        exits++;
      }
      for (const { symbol, qty } of pending.open) {
        const spot = markets[symbol].spot[i].open * (1 + slip),
          perp = markets[symbol].perp[i].open * (1 - slip);
        const fee = qty * spot * cfg.spotFeeRate + qty * perp * cfg.perpFeeRate;
        cash -= qty * spot + fee;
        fees += fee;
        positions.set(symbol, { qty, entry: perp });
        entries++;
      }
      pending = null;
    }
    for (const s of symbols) {
      const list = markets[s].funding;
      let k = fundingIndex.get(s)!;
      while (k < list.length && list[k].timestamp < t + HOUR) {
        const f = list[k],
          p = positions.get(s);
        if (p && f.timestamp >= t) {
          const delta = p.qty * f.markPrice * f.rate;
          cash += delta;
          funding += delta;
        }
        k++;
      }
      fundingIndex.set(s, k);
    }
    if (positions.size) {
      // Margem cruzada no pior caso da hora: o à vista não serve de garantia, só o caixa e o resultado aberto dos perpétuos.
      let worst = cash,
        notional = 0;
      for (const [s, p] of positions) {
        const high = markets[s].perp[i].high;
        worst += p.qty * (p.entry - high);
        notional += p.qty * high;
      }
      const ratio = worst / notional;
      minimumMarginRatio = minimumMarginRatio === null ? ratio : Math.min(minimumMarginRatio, ratio);
      if (ratio <= cfg.maintenanceRate) liquidatedAt = t;
      investedHours++;
      positionHours += positions.size;
    }
    let equity = cash;
    for (const [s, p] of positions)
      equity += p.qty * markets[s].spot[i].close + p.qty * (p.entry - markets[s].perp[i].close);
    equitySeries.push({ timestamp: t, equity });
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, 1 - equity / peak);
    if (liquidatedAt !== null) break;
    if (i % cfg.rebalanceHours !== 0 || i === bars - 1) continue;
    const signals: Record<string, number> = {};
    for (const s of symbols)
      signals[s] = markets[s].funding
        .filter((f) => f.timestamp >= t + HOUR - cfg.signalHours * HOUR && f.timestamp < t + HOUR)
        .reduce((a, f) => a + f.rate, 0);
    const close = [...positions.keys()].filter((s) => signals[s] <= cfg.exitFunding).sort();
    const candidates = symbols
      .filter((s) => !positions.has(s) && signals[s] >= cfg.entryMinimumFunding)
      .sort((a, b) => signals[b] - signals[a] || a.localeCompare(b));
    // Projeção pelo fechamento: as saídas devolvem caixa, cada entrada consome caixa e aumenta o valor vendido.
    let projectedCash = cash,
      shortNotional = 0;
    for (const [s, p] of positions) {
      const spot = markets[s].spot[i].close,
        perp = markets[s].perp[i].close;
      if (close.includes(s)) projectedCash += p.qty * spot + p.qty * (p.entry - perp);
      else shortNotional += p.qty * perp;
    }
    const open: { symbol: string; qty: number }[] = [];
    for (const s of candidates) {
      if (positions.size - close.length + open.length >= cfg.maxPositions) break;
      const spot = markets[s].spot[i].close,
        qty = (cfg.positionFraction * equity) / spot,
        cost = qty * spot * (1 + cfg.spotFeeRate),
        addedShort = qty * markets[s].perp[i].close;
      if (projectedCash - cost < cfg.minimumCashToShortNotional * (shortNotional + addedShort)) break;
      projectedCash -= cost;
      shortNotional += addedShort;
      open.push({ symbol: s, qty });
    }
    if (close.length || open.length) pending = { open, close };
    decisions.push({
      timestamp: t,
      held: [...positions.keys()]
        .filter((s) => !close.includes(s))
        .concat(open.map((o) => o.symbol))
        .sort(),
      opened: open.map((o) => o.symbol),
      closed: close,
      signals,
    });
  }
  const finalEquity = equitySeries.at(-1)!.equity,
    netPnl = finalEquity - cfg.initialCapital;
  return {
    model: 'FUNDING_CARRY_V1',
    execution: 'HISTORICAL_SIMULATION',
    marketHashes,
    equitySeries,
    finalEquity,
    netPnl,
    maxDrawdown,
    feesPaid: fees,
    fundingReceived: funding,
    basisPnl: netPnl - funding + fees,
    entries,
    exits,
    investedHours,
    positionHours,
    minimumMarginRatio,
    liquidatedAt,
    decisions,
  };
}
