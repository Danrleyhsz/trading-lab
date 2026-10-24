import type { Candle } from './backtest.js';
import type { FundingSettlement } from './perpetual-backtest.js';

/**
 * Seguidor de Sinais (docs/SIGNAL_FOLLOWER.md, regra v1.0): lê a mensagem de entrada do canal
 * e simula um sinal de compra spot contra velas reais. Só simulação; não emite eventos de corretora.
 * Os avisos de "parcial validada" do canal nunca entram aqui: a execução vem só das velas.
 */

export interface EntrySignal {
  raw: string;
  time: string;
  symbol: string;
  priceAtSignal: number;
  zoneLow: number;
  zoneHigh: number;
  defense: number;
  partials: number[];
  targets: number[];
  macro?: string;
  trend?: string;
  conviction?: string;
  volatility?: string;
  risk?: string;
}
export type ParseResult =
  | { ok: true; signal: EntrySignal }
  | { ok: false; status: 'REJECTED_PARSE'; reason: string; raw: string };

// Marca d'água do canal: caracteres de largura zero.
export const stripInvisible = (s: string) => s.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '');

const NUM = '(\\d+(?:[.,]\\d+)?)';
const num = (s: string) => Number(s.replace(',', '.'));
const field = (text: string, label: string) => text.match(new RegExp(`${label}:\\s*([^\\n]+)`, 'i'))?.[1]?.trim();
const levels = (text: string, label: string) =>
  [...text.matchAll(new RegExp(`${label}\\s*\\d+:\\s*${NUM}`, 'gi'))].map((m) => num(m[1]!));

export function parseEntrySignal(raw: string): ParseResult {
  const text = stripInvisible(raw);
  const fail = (reason: string): ParseResult => ({ ok: false, status: 'REJECTED_PARSE', reason, raw });
  const head = text.match(new RegExp(`(\\d{1,2}:\\d{2})\\s*\\|\\s*([A-Z0-9]+)\\s*\\|\\s*PREÇO ATUAL:\\s*${NUM}`, 'i'));
  if (!head) return fail('cabeçalho (hora | símbolo | preço atual) não encontrado');
  const zone = text.match(new RegExp(`Retração:\\s*${NUM}\\s*[–—-]\\s*${NUM}`, 'i'));
  if (!zone) return fail('zona de retração não encontrada');
  const defense = text.match(new RegExp(`Defesa:\\s*${NUM}`, 'i'));
  if (!defense) return fail('defesa não encontrada');
  const signal: EntrySignal = {
    raw,
    time: head[1]!.padStart(5, '0'),
    symbol: head[2]!.toUpperCase(),
    priceAtSignal: num(head[3]!),
    zoneLow: num(zone[1]!),
    zoneHigh: num(zone[2]!),
    defense: num(defense[1]!),
    partials: levels(text, 'Parcial'),
    targets: levels(text, 'Alvo'),
    macro: field(text, 'MACRO'),
    trend: field(text, 'TENDÊNCIA'),
    conviction: text.match(/CONVICÇÃO\s+([^\n]+)/i)?.[1]?.trim(),
    volatility: field(text, 'VOLATILIDADE'),
    risk: field(text, 'RISCO'),
  };
  if (signal.targets.length === 0) return fail('nenhum alvo encontrado');
  if (!(signal.defense < signal.zoneLow && signal.zoneLow <= signal.zoneHigh))
    return fail('esperado defesa < início da zona ≤ fim da zona');
  const exits = [...signal.partials, ...signal.targets];
  if (exits.some((l, i) => l <= signal.zoneHigh || (i > 0 && l <= exits[i - 1]!)))
    return fail('saídas devem ficar acima da zona e em ordem crescente');
  return { ok: true, signal };
}

/** Converte "HH:MM" (horário de Brasília, UTC-3) em timestamp; hora no futuro em relação ao recebimento = dia anterior. */
export function signalTimestamp(time: string, receivedAt: number): number {
  const OFFSET = 3 * 3600000;
  const [h, m] = time.split(':').map(Number);
  const local = new Date(receivedAt - OFFSET);
  let ts = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h!, m!) + OFFSET;
  if (ts > receivedAt) ts -= 86400000;
  return ts;
}

export interface LeverageRule {
  min: number;
  max: number;
  liquidationSafetyFactor: number;
  maintenanceMarginRate: number;
}
export interface FollowerConfig {
  capital: number;
  riskPerSignal: number;
  entryMode: 'zone_high' | 'zone_mid';
  entryExpiryHours: number;
  stopBufferBelowDefense: number;
  exitBufferBelowLevel: number;
  feeRate: number;
  market?: 'spot' | 'futures';
  leverage?: LeverageRule;
  /** Parte da posição que segue depois do alvo 1 esperando a Segunda Fase (0 = variante sem runner). */
  runnerFraction?: number;
  runnerMaxWaitHoursForPhase2?: number;
}
export const SIGNAL_FOLLOWER_V1 = {
  ruleVersion: '1.0',
  sleeves: { spot: 0.75, futures: 0.25 },
  riskPerSignal: 0.01,
  entryMode: 'zone_high',
  entryExpiryHours: 24,
  stopBufferBelowDefense: 0.005,
  exitBufferBelowLevel: 0.005,
  spotFeeRate: 0.001,
  futuresFeeRate: 0.0005,
  leverage: { min: 5, max: 15, liquidationSafetyFactor: 2, maintenanceMarginRate: 0.005 },
  runnerVariants: [0, 0.2],
  runnerMaxWaitHoursForPhase2: 48,
  phase2NewEntryMinRR: 1.5,
} as const;

export interface Fill {
  reason: 'ENTRY' | 'EXIT' | 'STOP' | 'RUNNER_TIMEOUT' | 'LIQUIDATION';
  time: number;
  price: number;
  quantity: number;
}
export interface SignalOutcome {
  status:
    | 'REJECTED_INVALIDATED'
    | 'FUTURES_SKIPPED_STOP_TOO_WIDE'
    | 'SKIPPED_LOW_RR'
    | 'PENDING'
    | 'CANCELLED_EXPIRED'
    | 'OPEN'
    | 'CLOSED'
    | 'LIQUIDATED';
  sizeCapped: boolean;
  stop: number;
  exitLevels: number[];
  fills: Fill[];
  pnl: number;
  funding: number;
  r: number;
  leverage?: number;
  runnerClosedNoPhase2?: boolean;
  rr?: number;
}

/** 2 parciais + 1 alvo → 30/30/40; a última saída leva 40% e o resto divide igualmente; saída única leva 100%. */
export function exitWeights(n: number): number[] {
  if (n <= 1) return [1];
  return [...Array<number>(n - 1).fill(0.6 / (n - 1)), 0.4];
}

/** Maior alavancagem (até max) com a liquidação pelo menos `liquidationSafetyFactor`× mais longe que o stop; null = não abre em futuros. */
export function futuresLeverage(stopDist: number, rule: LeverageRule): number | null {
  const l = Math.min(rule.max, Math.floor(1 / (rule.liquidationSafetyFactor * stopDist + rule.maintenanceMarginRate)));
  return l >= rule.min ? l : null;
}

export interface SimulationExtras {
  /** Mensagem de Segunda Fase do mesmo símbolo e o momento em que chegou. */
  phase2?: { signal: Phase2Signal; time: number };
  /** Liquidações de funding reais (só futuros). */
  funding?: FundingSettlement[];
  /** Pesos de saída em vez da regra automática. */
  weights?: number[];
}

const HOUR = 3600000;
const EPS = 1e-12;

export function simulateSignal(
  signal: EntrySignal,
  signalTime: number,
  candles: Candle[],
  cfg: FollowerConfig,
  extras: SimulationExtras = {},
): SignalOutcome {
  const runner = cfg.runnerFraction ?? 0;
  const futures = cfg.market === 'futures';
  const stop0 = signal.defense * (1 - cfg.stopBufferBelowDefense);
  const adjust = (l: number) => l * (1 - cfg.exitBufferBelowLevel);
  const levels = [...signal.partials, ...signal.targets].map(adjust);
  const phase1Count = levels.length;
  const weights = [...(extras.weights ?? exitWeights(phase1Count))];
  weights[phase1Count - 1]! -= runner;
  const riskAmount = cfg.capital * cfg.riskPerSignal;
  const out: SignalOutcome = {
    status: 'PENDING',
    sizeCapped: false,
    stop: stop0,
    exitLevels: levels,
    fills: [],
    pnl: 0,
    funding: 0,
    r: 0,
  };
  if (signal.priceAtSignal < signal.defense) return { ...out, status: 'REJECTED_INVALIDATED' };

  const limit = cfg.entryMode === 'zone_mid' ? (signal.zoneLow + signal.zoneHigh) / 2 : signal.zoneHigh;
  const marketEntry = signal.priceAtSignal <= signal.zoneHigh;
  const expiry = signalTime + cfg.entryExpiryHours * HOUR;
  const after = candles.filter((c) => c.timestamp > signalTime); // sem look-ahead
  const funding = (extras.funding ?? []).filter((f) => f.timestamp > signalTime);
  const phase2 = extras.phase2;

  let entry = 0,
    entryTime = 0,
    qty = 0,
    remaining = 0,
    stop = stop0,
    next = 0,
    prevExit = 0,
    a1Time = 0,
    phase2Active = false,
    liquidation = 0,
    f = 0;
  const pay = (price: number, q: number) => (out.pnl += (price - entry) * q - price * q * cfg.feeRate);
  const close = (reason: Fill['reason'], time: number, price: number) => {
    pay(price, remaining);
    out.fills.push({ reason, time, price, quantity: remaining });
    remaining = 0;
  };

  for (const c of after) {
    if (qty === 0) {
      if (c.timestamp > expiry) return { ...out, status: 'CANCELLED_EXPIRED' };
      const fill = marketEntry ? c.open : c.low <= limit ? Math.min(c.open, limit) : 0;
      if (!fill) continue;
      if (futures) {
        const rule = cfg.leverage ?? SIGNAL_FOLLOWER_V1.leverage;
        const lev = futuresLeverage((fill - stop) / fill, rule);
        if (lev === null) return { ...out, status: 'FUTURES_SKIPPED_STOP_TOO_WIDE' };
        out.leverage = lev;
        liquidation = fill * (1 - 1 / lev + rule.maintenanceMarginRate);
      }
      entry = prevExit = fill;
      entryTime = c.timestamp;
      qty = riskAmount / (entry - stop);
      const maxNotional = cfg.capital * (out.leverage ?? 1);
      if (qty * entry > maxNotional) {
        qty = maxNotional / entry;
        out.sizeCapped = true;
      }
      remaining = qty;
      out.pnl -= entry * qty * cfg.feeRate;
      out.fills.push({ reason: 'ENTRY', time: c.timestamp, price: entry, quantity: qty });
    }
    // Funding liquidado até esta vela, com posição aberta (long paga taxa positiva).
    for (; f < funding.length && funding[f]!.timestamp <= c.timestamp; f++) {
      if (funding[f]!.timestamp <= entryTime) continue;
      const cash = -funding[f]!.rate * remaining * funding[f]!.markPrice;
      out.funding += cash;
      out.pnl += cash;
    }
    // Runner esperando a Segunda Fase.
    if (next === levels.length && remaining > EPS && !phase2Active) {
      const deadline = a1Time + (cfg.runnerMaxWaitHoursForPhase2 ?? 48) * HOUR;
      if (phase2 && phase2.time <= deadline && c.timestamp > phase2.time) {
        phase2Active = true;
        stop = Math.max(stop, phase2.signal.support * (1 - cfg.stopBufferBelowDefense)); // stop nunca desce
        for (const t of phase2.signal.targets) {
          levels.push(adjust(t));
          weights.push(runner / phase2.signal.targets.length);
        }
      } else if (c.timestamp > deadline) {
        close('RUNNER_TIMEOUT', c.timestamp, c.open);
        out.runnerClosedNoPhase2 = true;
        break;
      }
    }
    if (futures && c.open <= liquidation) {
      close('LIQUIDATION', c.timestamp, c.open);
      out.status = 'LIQUIDATED';
      break;
    }
    // Stop antes das saídas: no mesmo candle vale o pior caso.
    if (c.low <= stop) {
      close('STOP', c.timestamp, Math.min(c.open, stop));
      break;
    }
    while (next < levels.length && c.high >= levels[next]!) {
      const price = Math.max(c.open, levels[next]!);
      const last = next === levels.length - 1 && (runner === 0 || phase2Active);
      const q = last ? remaining : qty * weights[next]!;
      pay(price, q);
      out.fills.push({ reason: 'EXIT', time: c.timestamp, price, quantity: q });
      remaining -= q;
      // Parciais: stop na entrada. Alvo 1 e saídas da Segunda Fase: stop na saída anterior.
      stop = Math.max(stop, next < phase1Count - 1 ? entry : prevExit);
      prevExit = price;
      if (next === phase1Count - 1) a1Time = c.timestamp;
      next++;
    }
    if (remaining <= EPS) break;
  }
  if (qty === 0) {
    const last = after.at(-1)?.timestamp ?? signalTime;
    return { ...out, status: last >= expiry ? 'CANCELLED_EXPIRED' : 'PENDING' };
  }
  out.stop = stop;
  if (out.status !== 'LIQUIDATED') out.status = remaining > EPS ? 'OPEN' : 'CLOSED';
  out.r = out.pnl / riskAmount;
  return out;
}

export interface Phase2Signal {
  raw: string;
  time: string;
  symbol: string;
  originalEntry: number;
  priceAtSignal: number;
  support: number;
  resistance?: number;
  targets: number[];
}
export type Phase2ParseResult =
  | { ok: true; signal: Phase2Signal }
  | { ok: false; status: 'REJECTED_PARSE'; reason: string; raw: string };

export function parsePhase2Signal(raw: string): Phase2ParseResult {
  const text = stripInvisible(raw);
  const fail = (reason: string): Phase2ParseResult => ({ ok: false, status: 'REJECTED_PARSE', reason, raw });
  const head = text.match(/SEGUNDA FASE\s*\|\s*(\d{1,2}:\d{2})\s*\|\s*([A-Z0-9]+)/i);
  if (!head) return fail('cabeçalho da Segunda Fase não encontrado');
  const value = (label: string) => {
    const m = text.match(new RegExp(`${label}:\\s*${NUM}`, 'i'));
    return m ? num(m[1]!) : undefined;
  };
  const originalEntry = value('PREÇO DE ENTRADA'),
    priceAtSignal = value('PREÇO DA LEITURA ATUAL'),
    support = value('Suporte atual');
  if (originalEntry === undefined || priceAtSignal === undefined || support === undefined)
    return fail('entrada, leitura atual ou suporte não encontrados');
  const symbol = head[2]!.toUpperCase();
  const signal: Phase2Signal = {
    raw,
    time: head[1]!.padStart(5, '0'),
    symbol: symbol.endsWith('USDT') ? symbol : `${symbol}USDT`,
    originalEntry,
    priceAtSignal,
    support,
    resistance: value('Resistência atual'),
    targets: levels(text, 'Possível alvo'),
  };
  if (signal.targets.length === 0) return fail('nenhum alvo encontrado');
  if (!(support < priceAtSignal && priceAtSignal < signal.targets[0]!))
    return fail('esperado suporte < leitura atual < alvo 2');
  if (signal.targets.some((t, i) => i > 0 && t <= signal.targets[i - 1]!)) return fail('alvos fora de ordem');
  return { ok: true, signal };
}

/** Entrada nova na Segunda Fase: só abre se (alvo 2 ajustado − entrada) ≥ minRR × (entrada − stop). */
export function simulatePhase2Entry(
  p2: Phase2Signal,
  time: number,
  candles: Candle[],
  cfg: FollowerConfig,
  minRR: number = SIGNAL_FOLLOWER_V1.phase2NewEntryMinRR,
  extras: Omit<SimulationExtras, 'phase2' | 'weights'> = {},
): SignalOutcome {
  const first = candles.find((c) => c.timestamp > time);
  const stop = p2.support * (1 - cfg.stopBufferBelowDefense);
  const empty: SignalOutcome = { status: 'PENDING', sizeCapped: false, stop, exitLevels: [], fills: [], pnl: 0, funding: 0, r: 0 };
  if (!first) return empty;
  const rr = (p2.targets[0]! * (1 - cfg.exitBufferBelowLevel) - first.open) / (first.open - stop);
  if (rr < minRR) return { ...empty, status: 'SKIPPED_LOW_RR', rr };
  const asEntry: EntrySignal = {
    raw: p2.raw,
    time: p2.time,
    symbol: p2.symbol,
    priceAtSignal: first.open,
    zoneLow: first.open,
    zoneHigh: first.open,
    defense: p2.support,
    partials: [],
    targets: p2.targets,
  };
  const weights = p2.targets.map(() => 1 / p2.targets.length);
  return { ...simulateSignal(asEntry, time, candles, { ...cfg, runnerFraction: 0 }, { ...extras, weights }), rr };
}
