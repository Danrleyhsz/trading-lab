import type { Candle } from './backtest.js';

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

export interface FollowerConfig {
  capital: number;
  riskPerSignal: number;
  entryMode: 'zone_high' | 'zone_mid';
  entryExpiryHours: number;
  stopBufferBelowDefense: number;
  exitBufferBelowLevel: number;
  feeRate: number;
}
export const SIGNAL_FOLLOWER_V1: Omit<FollowerConfig, 'capital'> & { ruleVersion: string } = {
  ruleVersion: '1.0',
  riskPerSignal: 0.01,
  entryMode: 'zone_high',
  entryExpiryHours: 24,
  stopBufferBelowDefense: 0.005,
  exitBufferBelowLevel: 0.005,
  feeRate: 0.001,
};

export interface Fill {
  reason: 'ENTRY' | 'EXIT' | 'STOP';
  time: number;
  price: number;
  quantity: number;
}
export interface SignalOutcome {
  status: 'REJECTED_INVALIDATED' | 'PENDING' | 'CANCELLED_EXPIRED' | 'OPEN' | 'CLOSED';
  sizeCapped: boolean;
  stop: number;
  exitLevels: number[];
  fills: Fill[];
  pnl: number;
  r: number;
}

/** 2 parciais + 1 alvo → 30/30/40; a última saída leva 40% e o resto divide igualmente; saída única leva 100%. */
export function exitWeights(n: number): number[] {
  if (n <= 1) return [1];
  return [...Array<number>(n - 1).fill(0.6 / (n - 1)), 0.4];
}

export function simulateSignal(
  signal: EntrySignal,
  signalTime: number,
  candles: Candle[],
  cfg: FollowerConfig,
): SignalOutcome {
  const stop0 = signal.defense * (1 - cfg.stopBufferBelowDefense);
  const levels = [...signal.partials, ...signal.targets].map((l) => l * (1 - cfg.exitBufferBelowLevel));
  const weights = exitWeights(levels.length);
  const riskAmount = cfg.capital * cfg.riskPerSignal;
  const out: SignalOutcome = { status: 'PENDING', sizeCapped: false, stop: stop0, exitLevels: levels, fills: [], pnl: 0, r: 0 };
  if (signal.priceAtSignal < signal.defense) return { ...out, status: 'REJECTED_INVALIDATED' };

  const limit = cfg.entryMode === 'zone_mid' ? (signal.zoneLow + signal.zoneHigh) / 2 : signal.zoneHigh;
  const marketEntry = signal.priceAtSignal <= signal.zoneHigh;
  const expiry = signalTime + cfg.entryExpiryHours * 3600000;
  const after = candles.filter((c) => c.timestamp > signalTime); // sem look-ahead

  let entry = 0,
    qty = 0,
    remaining = 0,
    stop = stop0,
    next = 0;
  const pay = (price: number, q: number) => (out.pnl += (price - entry) * q - price * q * cfg.feeRate);

  for (const c of after) {
    if (qty === 0) {
      if (c.timestamp > expiry) return { ...out, status: 'CANCELLED_EXPIRED' };
      const fill = marketEntry ? c.open : c.low <= limit ? Math.min(c.open, limit) : 0;
      if (!fill) continue;
      entry = fill;
      qty = riskAmount / (entry - stop);
      if (qty * entry > cfg.capital) {
        qty = cfg.capital / entry;
        out.sizeCapped = true;
      }
      remaining = qty;
      out.pnl -= entry * qty * cfg.feeRate;
      out.fills.push({ reason: 'ENTRY', time: c.timestamp, price: entry, quantity: qty });
    }
    // Stop antes das saídas: no mesmo candle vale o pior caso.
    if (c.low <= stop) {
      const price = Math.min(c.open, stop);
      pay(price, remaining);
      out.fills.push({ reason: 'STOP', time: c.timestamp, price, quantity: remaining });
      remaining = 0;
      break;
    }
    while (next < levels.length && c.high >= levels[next]!) {
      const price = Math.max(c.open, levels[next]!);
      const q = next === levels.length - 1 ? remaining : qty * weights[next]!;
      pay(price, q);
      out.fills.push({ reason: 'EXIT', time: c.timestamp, price, quantity: q });
      remaining -= q;
      next++;
      stop = Math.max(stop, entry); // após a primeira saída, stop na entrada
    }
    if (remaining <= 1e-12 && next === levels.length) break;
  }
  if (qty === 0) {
    const last = after.at(-1)?.timestamp ?? signalTime;
    return { ...out, status: last >= expiry ? 'CANCELLED_EXPIRED' : 'PENDING' };
  }
  out.stop = stop;
  out.status = remaining > 1e-12 ? 'OPEN' : 'CLOSED';
  out.r = out.pnl / riskAmount;
  return out;
}
