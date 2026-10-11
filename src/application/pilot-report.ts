import type { FastifyInstance } from 'fastify';
import type { DomainEvent } from '../domain/events.js';
import { performanceMetrics } from '../domain/performance-metrics.js';

/**
 * Pre-declared pilot evaluation (docs/PILOT_EVALUATION_PROTOCOL.md), declared 2026-10-05 before any pilot trade.
 * The report is computed only from recorded decisions, the pilot account and the current USD-M mark.
 */
export const PILOT_EVALUATION_PROTOCOL = {
  version: 'PILOT_EVALUATION_V1',
  declaredAt: '2026-10-05',
  minimumClosedTrades: 3,
  positionFraction: 0.1,
} as const;
export type PilotVerdict =
  | 'IN_PROGRESS'
  | 'STOPPED_BY_LOSS_LIMIT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'OUTPERFORMED'
  | 'POSITIVE_BELOW_BENCHMARK'
  | 'UNDERPERFORMED';
export const PILOT_NEXT_STEP: Record<Exclude<PilotVerdict, 'IN_PROGRESS'>, string> = {
  STOPPED_BY_LOSS_LIMIT: 'Encerrar a estratégia e registrar a lição; nenhum novo piloto com o mesmo estudo.',
  INSUFFICIENT_EVIDENCE:
    'Não estender automaticamente. Rodar nova triagem com dados recentes (inclusive os conjuntos da equipe) e iniciar outro piloto só com um estudo elegível.',
  OUTPERFORMED:
    'Candidato a um segundo piloto paper mais longo (30 dias) com o estudo re-triado em dados recentes. Continua sem dinheiro real.',
  POSITIVE_BELOW_BENCHMARK: 'Encerrar: ganhou, mas menos que segurar BTC com a mesma exposição. Registrar a lição.',
  UNDERPERFORMED: 'Encerrar a estratégia e registrar a lição.',
};
export interface PilotReportInput {
  accountId: string | null;
  events: DomainEvent[];
  ledger: DomainEvent[];
  equity: number | null;
  initialCash: number | null;
  maxDrawdown: number | null;
  equityPoints: { timestamp: number; equity: number }[];
  closedTrades: { openedAt: string; closedAt: string; netPnl: number }[];
  autonomous: { enabled: boolean; eligible: boolean; stopReason: string | null; studyId: string | null };
  mark: number | null;
  now: number;
}
/**
 * Equity of a book that was flat when the pilot began, from the ledger alone: endowment plus the cash of every earlier fill
 * (sells in, buys out, fees out) and funding settlement. If a position was still open at the start there is no mark to value it
 * from the ledger, so the endowment is kept (the previous behaviour).
 */
export function equityBeforeStart(ledger: DomainEvent[], startedAt: number, initialCash: number | null): number | null {
  if (initialCash === null) return null;
  let cash = initialCash,
    position = 0;
  for (const e of ledger) {
    if (Date.parse(e.occurredAt) >= startedAt) continue;
    if (e.type === 'PAPER_FILL') {
      const f = (e.payload as { fill?: { side: string; quantity: number; fillPrice: number; fee?: number } }).fill;
      if (!f) continue;
      const sign = f.side === 'BUY' ? 1 : -1;
      cash -= sign * f.quantity * f.fillPrice + (f.fee ?? 0);
      position += sign * f.quantity;
    } else if (e.type === 'FUNDING_SETTLED') cash += (e.payload as { cashDelta?: number }).cashDelta ?? 0;
  }
  return Math.abs(position) < 1e-9 ? cash : initialCash;
}
export function pilotReport(input: PilotReportInput) {
  const decisions = input.events
    .filter(
      (e) => e.type === 'AUTONOMOUS_DECISION' && (e.payload as { accountId?: string })?.accountId === input.accountId,
    )
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  const first = decisions[0];
  if (!first)
    return {
      scope: 'PILOT_EVALUATION' as const,
      protocol: PILOT_EVALUATION_PROTOCOL,
      status: 'NO_DECISIONS' as const,
      accountId: input.accountId,
    };
  const startedAt = Date.parse(first.occurredAt);
  const startPrice =
    (first.payload as { signalDataset?: { trade?: { close: number }[] } }).signalDataset?.trade?.at(-1)?.close ?? null;
  // Equity when the pilot started: the last recorded point before the first decision. Without one, rebuild it from the ledger
  // (endowment plus cash flows of fills and funding before the start) when the book was flat then; otherwise the endowment.
  const before = input.equityPoints.filter((p) => p.timestamp <= startedAt).at(-1);
  const startEquity = before?.equity ?? equityBeforeStart(input.ledger, startedAt, input.initialCash);
  const fills = input.ledger.filter((e) => e.type === 'PAPER_FILL' && Date.parse(e.occurredAt) >= startedAt);
  const funding = input.ledger
    .filter((e) => e.type === 'FUNDING_SETTLED' && Date.parse(e.occurredAt) >= startedAt)
    .reduce((s, e) => s + ((e.payload as { cashDelta?: number }).cashDelta ?? 0), 0);
  const fees = fills.reduce((s, e) => s + ((e.payload as { fill?: { fee?: number } }).fill?.fee ?? 0), 0);
  const closed = input.closedTrades.filter((t) => Date.parse(t.openedAt) >= startedAt);
  const pnl = input.equity !== null && startEquity !== null ? input.equity - startEquity : null;
  const btcReturn = startPrice && input.mark ? input.mark / startPrice - 1 : null;
  const sameExposure =
    btcReturn !== null && startEquity !== null
      ? startEquity * PILOT_EVALUATION_PROTOCOL.positionFraction * btcReturn
      : null;
  const directions = decisions.map((e) => (e.payload as { direction: number }).direction);
  let verdict: PilotVerdict;
  if (input.autonomous.stopReason === 'PILOT_LOSS_LIMIT') verdict = 'STOPPED_BY_LOSS_LIMIT';
  else if (input.autonomous.enabled && input.autonomous.eligible && !input.autonomous.stopReason)
    verdict = 'IN_PROGRESS';
  else if (closed.length < PILOT_EVALUATION_PROTOCOL.minimumClosedTrades) verdict = 'INSUFFICIENT_EVIDENCE';
  else if (pnl !== null && pnl > 0 && pnl > Math.max(0, sameExposure ?? 0)) verdict = 'OUTPERFORMED';
  else if (pnl !== null && pnl > 0) verdict = 'POSITIVE_BELOW_BENCHMARK';
  else verdict = 'UNDERPERFORMED';
  const provisional: Exclude<PilotVerdict, 'IN_PROGRESS'> =
    closed.length < PILOT_EVALUATION_PROTOCOL.minimumClosedTrades
      ? 'INSUFFICIENT_EVIDENCE'
      : pnl !== null && pnl > Math.max(0, sameExposure ?? 0)
        ? 'OUTPERFORMED'
        : pnl !== null && pnl > 0
          ? 'POSITIVE_BELOW_BENCHMARK'
          : 'UNDERPERFORMED';
  return {
    scope: 'PILOT_EVALUATION' as const,
    protocol: PILOT_EVALUATION_PROTOCOL,
    accountId: input.accountId,
    studyId: input.autonomous.studyId,
    startedAt: first.occurredAt,
    observedAt: new Date(input.now).toISOString(),
    hours: Math.round((input.now - startedAt) / 3600000),
    decisions: {
      total: decisions.length,
      long: directions.filter((d) => d > 0).length,
      short: directions.filter((d) => d < 0).length,
      flat: directions.filter((d) => d === 0).length,
    },
    fills: fills.length,
    closedTrades: closed.length,
    wins: closed.filter((t) => t.netPnl > 0).length,
    pnl,
    startEquity,
    equity: input.equity,
    fees,
    funding,
    maxDrawdownObserved: input.maxDrawdown,
    benchmarks: {
      flat: 0,
      btcReturn,
      buyAndHoldSameExposure: sameExposure,
      buyAndHoldFullEquity: btcReturn !== null && startEquity !== null ? startEquity * btcReturn : null,
      startPrice,
      mark: input.mark,
    },
    // Métricas no estilo quantstats só com a equity e as operações do período do piloto.
    metrics: performanceMetrics(
      input.equityPoints.filter((p) => p.timestamp >= (before?.timestamp ?? startedAt)),
      closed.map((t) => ({ netPnl: t.netPnl })),
      {
        inMarketHours: closed.reduce(
          (s, t) => s + Math.max(0, Date.parse(t.closedAt) - Date.parse(t.openedAt)) / 3600000,
          0,
        ),
      },
      startPrice && input.mark ? { startPrice, endPrice: input.mark } : undefined,
    ),
    verdict,
    provisionalVerdict: verdict === 'IN_PROGRESS' ? provisional : verdict,
    nextStep: PILOT_NEXT_STEP[verdict === 'IN_PROGRESS' ? provisional : verdict],
  };
}
export function registerPilotReport(app: FastifyInstance, input: () => PilotReportInput) {
  app.get('/paper/perpetual/pilot/report', async () => pilotReport(input()));
}
