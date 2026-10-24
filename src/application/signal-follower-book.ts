import type { Candle } from '../domain/backtest.js';
import type { FundingSettlement } from '../domain/perpetual-backtest.js';
import {
  SIGNAL_FOLLOWER_V1,
  parseEntrySignal,
  parsePhase2Signal,
  signalTimestamp,
  simulatePhase2Entry,
  simulateSignal,
  type EntrySignal,
  type FollowerConfig,
  type Phase2Signal,
  type SignalOutcome,
} from '../domain/signal-follower.js';

/**
 * Seguidor de Sinais no Lab (docs/SIGNAL_FOLLOWER.md). Grava só as mensagens coladas (append-only); o resultado é
 * refeito a cada consulta com velas públicas reais da Binance, como o acompanhamento de momentum. Nunca envia ordens.
 */
export interface StoredFollowerMessage {
  id: string;
  receivedAt: string;
  raw: string;
  kind: 'ENTRY' | 'PHASE2' | 'REJECTED_PARSE';
  reason?: string;
  parentId?: string;
}
export interface MarketWindow {
  candles(market: 'spot' | 'futures', symbol: string, start: number, end: number): Promise<Candle[]>;
  funding(symbol: string, start: number, end: number): Promise<FundingSettlement[]>;
}
type Sleeve = 'spot' | 'futures';
export interface SignalResult extends Omit<SignalOutcome, 'status'> {
  messageId: string;
  symbol: string;
  phase: 1 | 2;
  status: SignalOutcome['status'] | 'RISK_MAX_OPEN' | 'DATA_MISSING';
  error?: string;
}
export interface VariantReport {
  sleeve: Sleeve;
  runnerFraction: number;
  capital: number;
  signals: SignalResult[];
  summary: { closed: number; open: number; wins: number; totalR: number; averageR: number | null; pnl: number };
}
export interface FollowerReport {
  scope: 'SIGNAL_FOLLOWER_PAPER_ONLY';
  enabled: boolean;
  ruleVersion: string;
  generatedAt: string;
  messages: StoredFollowerMessage[];
  variants: VariantReport[];
}

const HOUR = 3600000;
// shortcut: cada sinal é seguido por no máximo 7 dias de velas de 1 min; ampliar se houver sinais mais longos.
const MAX_WINDOW = 7 * 24 * HOUR;
const MAX_OPEN_PER_SLEEVE = 3;

export class SignalFollowerBook {
  private messages: StoredFollowerMessage[];
  constructor(
    private market: MarketWindow,
    restored: StoredFollowerMessage[] = [],
    private enabled = false,
    private totalCapital = 10000,
    private now: () => number = Date.now,
  ) {
    this.messages = structuredClone(restored);
  }
  isEnabled() {
    return this.enabled;
  }
  list() {
    return structuredClone(this.messages);
  }
  add(raw: string): StoredFollowerMessage {
    if (!this.enabled) throw new Error('signal follower disabled');
    const receivedAt = new Date(this.now()).toISOString();
    const base = { id: crypto.randomUUID(), receivedAt, raw };
    let message: StoredFollowerMessage;
    if (/SEGUNDA FASE/i.test(raw)) {
      const parsed = parsePhase2Signal(raw);
      if (!parsed.ok) message = { ...base, kind: 'REJECTED_PARSE', reason: parsed.reason };
      else {
        // shortcut: o pai é a última entrada do mesmo símbolo, executada ou não; checar a execução quando houver muitos sinais.
        const parent = [...this.messages].reverse().find(
          (m) => m.kind === 'ENTRY' && (parseEntrySignal(m.raw) as { signal?: EntrySignal }).signal?.symbol === parsed.signal.symbol,
        );
        message = { ...base, kind: 'PHASE2', parentId: parent?.id };
      }
    } else {
      const parsed = parseEntrySignal(raw);
      message = parsed.ok ? { ...base, kind: 'ENTRY' } : { ...base, kind: 'REJECTED_PARSE', reason: parsed.reason };
    }
    this.messages.push(message);
    return structuredClone(message);
  }

  async report(): Promise<FollowerReport> {
    const now = this.now();
    const cache = new Map<string, Promise<Candle[] | FundingSettlement[]>>();
    const load = <T>(key: string, fn: () => Promise<T>) => {
      if (!cache.has(key)) cache.set(key, fn() as Promise<Candle[] | FundingSettlement[]>);
      return cache.get(key)! as Promise<T>;
    };
    const timed = (m: StoredFollowerMessage, time: string) => signalTimestamp(time, Date.parse(m.receivedAt));
    const entries = this.messages
      .filter((m) => m.kind === 'ENTRY')
      .map((m) => {
        const signal = (parseEntrySignal(m.raw) as { signal: EntrySignal }).signal;
        return { m, signal, time: timed(m, signal.time) };
      });
    const phase2s = this.messages
      .filter((m) => m.kind === 'PHASE2')
      .map((m) => {
        const signal = (parsePhase2Signal(m.raw) as { signal: Phase2Signal }).signal;
        return { m, signal, time: timed(m, signal.time) };
      });

    const variants: VariantReport[] = [];
    for (const sleeve of ['spot', 'futures'] as const)
      for (const runnerFraction of SIGNAL_FOLLOWER_V1.runnerVariants) {
        const capital = this.totalCapital * SIGNAL_FOLLOWER_V1.sleeves[sleeve];
        const cfg: FollowerConfig = {
          capital,
          riskPerSignal: SIGNAL_FOLLOWER_V1.riskPerSignal,
          entryMode: SIGNAL_FOLLOWER_V1.entryMode,
          entryExpiryHours: SIGNAL_FOLLOWER_V1.entryExpiryHours,
          stopBufferBelowDefense: SIGNAL_FOLLOWER_V1.stopBufferBelowDefense,
          exitBufferBelowLevel: SIGNAL_FOLLOWER_V1.exitBufferBelowLevel,
          feeRate: sleeve === 'spot' ? SIGNAL_FOLLOWER_V1.spotFeeRate : SIGNAL_FOLLOWER_V1.futuresFeeRate,
          market: sleeve,
          leverage: SIGNAL_FOLLOWER_V1.leverage,
          runnerFraction,
          runnerMaxWaitHoursForPhase2: SIGNAL_FOLLOWER_V1.runnerMaxWaitHoursForPhase2,
        };
        const jobs = [
          ...entries.map((e) => ({ ...e, phase: 1 as const })),
          ...phase2s.map((p) => ({ ...p, phase: 2 as const })),
        ].sort((a, b) => a.time - b.time);
        const open: { from: number; to: number }[] = [];
        const signals: SignalResult[] = [];
        for (const job of jobs) {
          const symbol = job.signal.symbol;
          const end = Math.min(now, job.time + MAX_WINDOW);
          let outcome: SignalOutcome;
          try {
            const candles = await load(`${sleeve}:${symbol}:${job.time}`, () =>
              this.market.candles(sleeve, symbol, job.time, end),
            );
            const funding =
              sleeve === 'futures'
                ? await load(`f:${symbol}:${job.time}`, () => this.market.funding(symbol, job.time, end))
                : [];
            if (job.phase === 1) {
              const child = phase2s.find((p) => p.m.parentId === job.m.id);
              outcome = simulateSignal(job.signal as EntrySignal, job.time, candles as Candle[], cfg, {
                funding: funding as FundingSettlement[],
                phase2: child && runnerFraction > 0 ? { signal: child.signal, time: child.time } : undefined,
              });
            } else
              outcome = simulatePhase2Entry(job.signal as Phase2Signal, job.time, candles as Candle[], cfg, undefined, {
                funding: funding as FundingSettlement[],
              });
          } catch (error) {
            signals.push({
              ...emptyOutcome(),
              messageId: job.m.id,
              symbol,
              phase: job.phase,
              status: 'DATA_MISSING',
              error: error instanceof Error ? error.message : 'unknown error',
            });
            continue;
          }
          const entry = outcome.fills.find((f) => f.reason === 'ENTRY');
          if (entry) {
            // Limite do motor de risco: no máximo 3 sinais abertos por carteira ao mesmo tempo.
            const busy = open.filter((o) => o.from <= entry.time && entry.time < o.to).length;
            if (busy >= MAX_OPEN_PER_SLEEVE) {
              signals.push({ ...emptyOutcome(), messageId: job.m.id, symbol, phase: job.phase, status: 'RISK_MAX_OPEN' });
              continue;
            }
            const closedAt = outcome.status === 'OPEN' ? Infinity : outcome.fills.at(-1)!.time;
            open.push({ from: entry.time, to: closedAt });
          }
          signals.push({ ...outcome, messageId: job.m.id, symbol, phase: job.phase });
        }
        variants.push({ sleeve, runnerFraction, capital, signals, summary: summarize(signals) });
      }
    return {
      scope: 'SIGNAL_FOLLOWER_PAPER_ONLY',
      enabled: this.enabled,
      ruleVersion: SIGNAL_FOLLOWER_V1.ruleVersion,
      generatedAt: new Date(now).toISOString(),
      messages: this.list(),
      variants,
    };
  }
}

function emptyOutcome(): Omit<SignalOutcome, 'status'> {
  return { sizeCapped: false, stop: 0, exitLevels: [], fills: [], pnl: 0, funding: 0, r: 0 };
}
function summarize(signals: SignalResult[]) {
  const done = signals.filter((s) => s.status === 'CLOSED' || s.status === 'LIQUIDATED');
  const totalR = done.reduce((sum, s) => sum + s.r, 0);
  return {
    closed: done.length,
    open: signals.filter((s) => s.status === 'OPEN').length,
    wins: done.filter((s) => s.pnl > 0).length,
    totalR,
    averageR: done.length ? totalR / done.length : null,
    pnl: signals.reduce((sum, s) => sum + s.pnl, 0),
  };
}
