import type { AgentMessageBus } from '../domain/agent-messages.js';
import type { MemoryStore } from '../domain/memory.js';
import type { AgentId } from '../domain/agents.js';

/**
 * Gatilhos de mercado fora do normal (MARKET_TRIGGERS_V1, declarado em 05/10/2026; ideia do Hyper-Alpha-Arena).
 * A cada 15 min guarda uma amostra de cada métrica pública; quando o valor atual fica abaixo do percentil 5
 * ou acima do 95 das amostras guardadas, o pesquisador responsável publica um alerta para o Quant Lab.
 * Só gera mensagens e memórias: nunca altera sinal, risco ou execução.
 */
export const TRIGGER_POLICY = Object.freeze({
  version: 'MARKET_TRIGGERS_V1',
  sampleMinutes: 15,
  keepSamples: 7 * 24 * 4,
  minimumSamples: 24 * 4,
  low: 5,
  high: 95,
  cooldownHours: 6,
});
export interface MarketReading {
  funding: number | null;
  oiChange1h: number | null;
  liquidations1h: number | null;
  takerDelta1h: number | null;
  priceChange1h: number | null;
  fundingSpread8h?: number | null;
  binanceDivergenceBps?: number | null;
}
const metrics: {
  key: keyof MarketReading;
  agent: AgentId;
  label: string;
  format: (v: number) => string;
  to?: AgentId[];
}[] = [
  {
    key: 'funding',
    agent: 'flux',
    label: 'funding cotado',
    format: (v) => (v * 100).toFixed(4).replace('.', ',') + '%',
  },
  {
    key: 'oiChange1h',
    agent: 'flux',
    label: 'variação do open interest em 1 h',
    format: (v) => (v * 100).toFixed(2).replace('.', ',') + '%',
  },
  {
    key: 'takerDelta1h',
    agent: 'flux',
    label: 'saldo comprador-vendedor agressor em 1 h',
    format: (v) => v.toFixed(1).replace('.', ',') + ' BTC',
  },
  {
    key: 'liquidations1h',
    agent: 'vega',
    label: 'liquidações observadas na última hora',
    format: (v) => 'US$ ' + Math.round(v).toLocaleString('pt-BR'),
  },
  {
    key: 'priceChange1h',
    agent: 'satoshi',
    label: 'variação do BTC em 1 h',
    format: (v) => (v * 100).toFixed(2).replace('.', ',') + '%',
  },
  // Comparação entre corretoras (Bybit, OKX, Hyperliquid): diferença de funding e preço da Binance fora do consenso.
  {
    key: 'fundingSpread8h',
    agent: 'flux',
    label: 'diferença de funding entre corretoras (8 h)',
    format: (v) => (v * 100).toFixed(4).replace('.', ',') + '%',
  },
  {
    key: 'binanceDivergenceBps',
    agent: 'sentinel',
    label: 'distância do mark da Binance para o consenso das outras corretoras',
    format: (v) => v.toFixed(1).replace('.', ',') + ' bps',
    to: ['nova', 'atlas'],
  },
];
/** Percentil (0–100) do valor dentro da amostra: fração das amostras menores, contando empates pela metade. */
export function percentileRank(values: number[], value: number) {
  if (!values.length) return NaN;
  const below = values.filter((v) => v < value).length,
    equal = values.filter((v) => v === value).length;
  return ((below + 0.5 * equal) / values.length) * 100;
}
export class MarketTriggers {
  private history = new Map<keyof MarketReading, number[]>();
  private lastAlert = new Map<string, number>();
  private startedAt: number;
  constructor(
    private read: () => MarketReading,
    private messages: AgentMessageBus,
    private memories: MemoryStore,
    private now: () => number = Date.now,
  ) {
    this.startedAt = now();
  }
  /** Uma amostra; devolve os alertas publicados nesta rodada. */
  sample() {
    const reading = this.read(),
      fired: string[] = [];
    for (const m of metrics) {
      const value = reading[m.key];
      if (value === null || value === undefined || !Number.isFinite(value)) continue;
      const past = this.history.get(m.key) ?? [];
      if (past.length >= TRIGGER_POLICY.minimumSamples) {
        const p = percentileRank(past, value),
          key = m.key + (p >= TRIGGER_POLICY.high ? ':alto' : ':baixo');
        const recent = (this.lastAlert.get(key) ?? -Infinity) > this.now() - TRIGGER_POLICY.cooldownHours * 3600000;
        if ((p >= TRIGGER_POLICY.high || p <= TRIGGER_POLICY.low) && !recent) {
          const side =
            p >= TRIGGER_POLICY.high
              ? 'acima do percentil ' + TRIGGER_POLICY.high
              : 'abaixo do percentil ' + TRIGGER_POLICY.low;
          const coverage = Math.round((past.length * TRIGGER_POLICY.sampleMinutes) / 60);
          const summary =
            'Fora do normal: ' +
            m.label +
            ' em ' +
            m.format(value) +
            ' (' +
            side +
            ' das últimas ' +
            coverage +
            ' h). Sugiro testar uma hipótese no Quant Lab.';
          const message = this.messages.send({
            from: m.agent,
            to: m.to ?? ['atlas', 'euler'],
            kind: 'RESEARCH_FINDING',
            summary,
            context: {
              trigger: true,
              policy: TRIGGER_POLICY.version,
              metric: m.key,
              value,
              percentile: Number(p.toFixed(1)),
              coverageHours: coverage,
              advisoryOnly: true,
            },
          });
          this.memories.add({
            agentId: m.agent,
            kind: 'OBSERVATION',
            summary,
            tags: ['gatilho', m.key],
            metadata: { policy: TRIGGER_POLICY.version, messageId: message.id, value, percentile: p },
          });
          this.lastAlert.set(key, this.now());
          fired.push(m.key);
        }
      }
      past.push(value);
      if (past.length > TRIGGER_POLICY.keepSamples) past.shift();
      this.history.set(m.key, past);
    }
    return fired;
  }
  status() {
    return {
      policy: TRIGGER_POLICY,
      startedAt: new Date(this.startedAt).toISOString(),
      samples: Object.fromEntries(metrics.map((m) => [m.key, this.history.get(m.key)?.length ?? 0])),
      ready: metrics.some((m) => (this.history.get(m.key)?.length ?? 0) >= TRIGGER_POLICY.minimumSamples),
    };
  }
}
/** Leitura a partir do panorama público e da cotação USD-M já recebidos pelo servidor. */
export function readingFrom(
  panorama: {
    openInterest: { history?: { usd: number }[] } | null;
    liquidations: { hourly: { longs: number; shorts: number }[] };
    flow: { buy: number; sell: number }[];
    candles: Record<string, { c: number }[]>;
  },
  fundingRate: number | null,
  venues?: { fundingSpread8h: number | null; binanceDivergenceBps: number | null },
): MarketReading {
  const oi = panorama.openInterest?.history ?? [],
    hourly = panorama.liquidations.hourly,
    btc = panorama.candles.BTCUSDT ?? [];
  const lastHour = hourly.at(-2); // a última hora completa (a atual ainda está em andamento)
  return {
    funding: fundingRate,
    oiChange1h: oi.length >= 2 && oi.at(-2)!.usd > 0 ? oi.at(-1)!.usd / oi.at(-2)!.usd - 1 : null,
    liquidations1h: lastHour ? lastHour.longs + lastHour.shorts : null,
    takerDelta1h: panorama.flow.length >= 30 ? panorama.flow.slice(-60).reduce((s, f) => s + f.buy - f.sell, 0) : null,
    priceChange1h: btc.length >= 3 && btc.at(-3)!.c > 0 ? btc.at(-2)!.c / btc.at(-3)!.c - 1 : null,
    fundingSpread8h: venues?.fundingSpread8h ?? null,
    binanceDivergenceBps: venues?.binanceDivergenceBps ?? null,
  };
}
