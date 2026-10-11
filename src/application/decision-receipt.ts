// Recibo de decisão do piloto (passo 1 do mapa ATS-MATRIX, docs/research/ATSMATRIX_MAPA_DE_LACUNAS.md).
// Junta, para cada AUTONOMOUS_DECISION gravada, o que aconteceu depois: propostas, risco, fills, bloqueios do ciclo,
// paradas do piloto e mensagens da equipe. Só leitura: usa eventos, memórias e mensagens já gravados; nunca altera
// o piloto, o livro paper ou as regras. O que não foi gravado aparece como null, nunca como valor inventado.
import type { FastifyInstance } from 'fastify';
import type { DomainEvent } from '../domain/events.js';
import type { MemoryRecord } from '../domain/memory.js';
import type { AgentMessage } from '../domain/agent-messages.js';
import type { PerpetualConfig, PerpetualDataset } from '../domain/perpetual-backtest.js';

export const RECEIPT_POLICY = Object.freeze({
  version: 'DECISION_RECEIPT_V1',
  pendingMs: 5 * 60000,
  quantityEpsilon: 1e-12,
  // Decisão e ordem ainda não têm ID em comum (lacuna L1): a ordem pertence à decisão se acontece entre ela e a próxima.
  linkage: 'TIME_WINDOW' as const,
});
const HOUR = 3600000;
export type ReceiptOutcome =
  'EXECUTED' | 'RISK_REJECTED' | 'ENTRY_BLOCKED' | 'PILOT_STOPPED' | 'NO_ACTION_NEEDED' | 'PENDING' | 'UNEXPLAINED';
interface DecisionPayload {
  accountId: string;
  studyId: string;
  studyDatasetHash?: string;
  signalDatasetHash?: string;
  signalDataset?: PerpetualDataset;
  candleTimestamp: number;
  direction: number;
  currentQuantity?: number;
  configuration: PerpetualConfig;
}
interface OrderPayload {
  side: 'BUY' | 'SELL';
  quantity: number;
  referencePrice: number;
  proposalId?: string;
  strategyId?: string;
}
export interface ReceiptInput {
  accountId: string | null;
  events: DomainEvent[];
  ledger: DomainEvent[];
  memories: MemoryRecord[];
  messages: AgentMessage[];
  now: number;
}

const time = (e: { occurredAt: string }) => Date.parse(e.occurredAt);
const sign = (v: number) => (Math.abs(v) < RECEIPT_POLICY.quantityEpsilon ? 0 : Math.sign(v));
const iso = (t: number) => new Date(t).toISOString();

function decisionsOf(input: ReceiptInput) {
  return input.events
    .filter((e) => e.type === 'AUTONOMOUS_DECISION' && (e.payload as DecisionPayload)?.accountId === input.accountId)
    .sort(
      (a, b) =>
        (a.payload as DecisionPayload).candleTimestamp - (b.payload as DecisionPayload).candleTimestamp ||
        time(a) - time(b),
    );
}

/** Recibo de uma decisão, dado o instante da decisão seguinte (ou agora, se for a última). */
function receipt(input: ReceiptInput, decision: DomainEvent, nextAt: number | null) {
  // A última decisão fica com tudo o que veio depois dela.
  const p = decision.payload as DecisionPayload,
    at = time(decision),
    within = (t: number) => t >= at && (nextAt === null || t < nextAt);
  // Propostas da janela, na ordem gravada no livro, agrupadas pelo proposalId que o livro grava em cada etapa.
  const proposals = new Map<
    string,
    {
      proposalId: string;
      proposedAt: string;
      side: string;
      quantity: number;
      referencePrice: number;
      risk: { approved: boolean; reasons: string[] } | null;
      fill: { fillId: string; at: string; price: number; fee: number } | null;
      liquidation: boolean;
    }
  >();
  for (const e of input.ledger) {
    if (!within(time(e))) continue;
    const payload = e.payload as {
      order?: OrderPayload;
      decision?: { approved: boolean; reasons: string[] };
      fill?: { id: string; proposalId?: string; fillPrice: number; fee: number };
      proposalId?: string;
    };
    if (e.type === 'TRADE_PROPOSED') {
      const o = e.payload as OrderPayload;
      if (o.proposalId)
        proposals.set(o.proposalId, {
          proposalId: o.proposalId,
          proposedAt: e.occurredAt,
          side: o.side,
          quantity: o.quantity,
          referencePrice: o.referencePrice,
          risk: null,
          fill: null,
          liquidation: false,
        });
    } else if ((e.type === 'RISK_APPROVED' || e.type === 'RISK_REJECTED') && payload.order?.proposalId) {
      const r = proposals.get(payload.order.proposalId);
      if (r) r.risk = { approved: e.type === 'RISK_APPROVED', reasons: [...(payload.decision?.reasons ?? [])] };
    } else if (e.type === 'PAPER_FILL' && payload.fill?.proposalId) {
      const r = proposals.get(payload.fill.proposalId);
      if (r)
        r.fill = { fillId: payload.fill.id, at: e.occurredAt, price: payload.fill.fillPrice, fee: payload.fill.fee };
    } else if (e.type === 'PAPER_LIQUIDATION' && payload.proposalId) {
      const r = proposals.get(payload.proposalId);
      if (r) r.liquidation = true;
    }
  }
  const actions = [...proposals.values()];
  // Bloqueios do ciclo: hoje só existem como memória do Sentinel ligada à decisão (lacuna L2).
  const blocks = input.memories
    .filter((m) => m.sourceEventId === decision.id && m.agentId === 'sentinel' && m.kind === 'DECISION')
    .map((m) => ({
      reason: typeof m.metadata?.reason === 'string' ? m.metadata.reason : null,
      summary: m.summary,
      at: m.createdAt,
    }));
  const stops = input.events
    .filter(
      (e) =>
        e.type === 'AUTONOMOUS_PILOT_STOPPED' &&
        (e.payload as { accountId?: string })?.accountId === input.accountId &&
        within(time(e)),
    )
    .map((e) => ({ eventId: e.id, at: e.occurredAt, reason: (e.payload as { reason?: string }).reason ?? null }));
  const ids = new Set(actions.map((a) => a.proposalId));
  const team = input.messages
    .filter(
      (m) =>
        m.context?.decisionEventId === decision.id ||
        (m.kind === 'RISK_REVIEW' &&
          typeof m.context?.proposalId === 'string' &&
          ids.has(m.context.proposalId as string)),
    )
    .map((m) => ({
      from: m.from,
      kind: m.kind,
      summary: m.summary,
      advisoryOnly: m.kind === 'RISK_REVIEW' ? false : m.context?.advisoryOnly === true,
    }));
  const filled = actions.filter((a) => a.fill),
    rejected = actions.filter((a) => a.risk && !a.risk.approved);
  // Decisões antigas não gravavam a posição: reconstruída pelos fills anteriores, como na paridade do piloto.
  const fromFills = input.ledger
    .filter((e) => e.type === 'PAPER_FILL' && time(e) < at)
    .reduce((q, e) => {
      const f = (e.payload as { fill: { side: string; quantity: number } }).fill;
      return q + (f.side === 'BUY' ? f.quantity : -f.quantity);
    }, 0);
  const recordedPosition = typeof p.currentQuantity === 'number',
    before = recordedPosition ? p.currentQuantity! : fromFills;
  const after = filled.reduce((q, a) => q + (a.side === 'BUY' ? a.quantity : -a.quantity), before);
  const outcome: ReceiptOutcome = stops.length
    ? 'PILOT_STOPPED'
    : rejected.length
      ? 'RISK_REJECTED'
      : blocks.length
        ? 'ENTRY_BLOCKED'
        : filled.length
          ? 'EXECUTED'
          : sign(before) === sign(p.direction)
            ? 'NO_ACTION_NEEDED'
            : nextAt === null && input.now - at < RECEIPT_POLICY.pendingMs
              ? 'PENDING'
              : 'UNEXPLAINED';
  const close = p.candleTimestamp + HOUR,
    firstFill = filled.map((a) => Date.parse(a.fill!.at)).sort((a, b) => a - b)[0];
  const candles = p.signalDataset?.trade;
  return {
    decisionEventId: decision.id,
    decidedAt: decision.occurredAt,
    candleTimestamp: iso(p.candleTimestamp),
    proposal: {
      direction: p.direction,
      positionBefore: before,
      positionSource: recordedPosition ? ('RECORDED' as const) : ('FILLS' as const),
      positionAfter: after,
      configuration: p.configuration,
    },
    provenance: {
      studyId: p.studyId,
      studyDatasetHash: p.studyDatasetHash ?? null,
      signalDatasetHash: p.signalDatasetHash ?? null,
      signalCandles: candles?.length
        ? {
            instrument: p.signalDataset!.instrument,
            count: candles.length,
            from: iso(candles[0].timestamp),
            to: iso(candles.at(-1)!.timestamp),
          }
        : null,
      // A decisão ainda não grava o commit/impressão digital do backend (lacuna L5).
      backendFingerprint: null,
    },
    actions,
    blocks,
    stops,
    team,
    outcome,
    complete: outcome !== 'PENDING' && outcome !== 'UNEXPLAINED',
    latencySeconds: {
      closeToDecision: (at - close) / 1000,
      decisionToFirstFill: firstFill === undefined ? null : (firstFill - at) / 1000,
    },
    window: { from: decision.occurredAt, to: nextAt === null ? null : iso(nextAt) },
  };
}
export type DecisionReceipt = ReturnType<typeof receipt>;

export function decisionReceipt(input: ReceiptInput, eventId: string) {
  const decisions = decisionsOf(input),
    k = decisions.findIndex((e) => e.id === eventId);
  if (k < 0) return undefined;
  return {
    scope: 'RECORDED_DECISION_RECEIPT' as const,
    policy: RECEIPT_POLICY,
    receipt: receipt(input, decisions[k], k + 1 < decisions.length ? time(decisions[k + 1]) : null),
  };
}

/** Os últimos `limit` recibos (mais recente primeiro) e um resumo de todas as decisões gravadas. */
export function decisionReceipts(input: ReceiptInput, limit: number) {
  const decisions = decisionsOf(input);
  const all = decisions.map((e, k) => receipt(input, e, k + 1 < decisions.length ? time(decisions[k + 1]) : null));
  const byOutcome = Object.fromEntries(
    (
      [
        'EXECUTED',
        'RISK_REJECTED',
        'ENTRY_BLOCKED',
        'PILOT_STOPPED',
        'NO_ACTION_NEEDED',
        'PENDING',
        'UNEXPLAINED',
      ] as const
    ).map((o) => [o, all.filter((r) => r.outcome === o).length]),
  );
  const reasons: Record<string, number> = {};
  for (const r of all) {
    for (const a of r.actions)
      for (const reason of a.risk && !a.risk.approved ? a.risk.reasons : [])
        reasons['RISK:' + reason] = (reasons['RISK:' + reason] ?? 0) + 1;
    for (const b of r.blocks)
      reasons['CYCLE:' + (b.reason ?? 'UNKNOWN')] = (reasons['CYCLE:' + (b.reason ?? 'UNKNOWN')] ?? 0) + 1;
  }
  const latencies = all
    .map((r) => r.latencySeconds.closeToDecision)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const pct = (q: number) =>
    latencies.length ? latencies[Math.min(latencies.length - 1, Math.ceil(q * latencies.length) - 1)] : null;
  const settled = all.filter((r) => r.outcome !== 'PENDING');
  return {
    scope: 'RECORDED_DECISION_RECEIPTS' as const,
    policy: RECEIPT_POLICY,
    accountId: input.accountId,
    observedAt: iso(input.now),
    summary: {
      decisions: all.length,
      complete: all.filter((r) => r.complete).length,
      completeFraction: settled.length ? settled.filter((r) => r.complete).length / settled.length : null,
      byOutcome,
      reasons,
      closeToDecisionSeconds: latencies.length ? { p50: pct(0.5), p95: pct(0.95), max: latencies.at(-1)! } : null,
    },
    receipts: all.slice(-limit).reverse(),
    coverage:
      'Ordem ligada à decisão pela janela de tempo (lacuna L1). Bloqueios do ciclo só aparecem quando o Sentinel gravou memória; histórico velho e falha de fonte não são gravados (lacuna L2). Sem impressão digital do backend por decisão (lacuna L5).',
  };
}

export function registerDecisionReceipts(app: FastifyInstance, input: () => ReceiptInput) {
  app.get('/paper/perpetual/pilot/receipts', async (req, reply) => {
    const raw = (req.query as { limit?: string }).limit,
      limit = Number(raw ?? 24);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      return reply.code(400).send({ error: 'limit must be an integer from 1 to 100' });
    return decisionReceipts(input(), limit);
  });
  app.get<{ Params: { id: string } }>('/paper/perpetual/pilot/receipts/:id', async (req, reply) => {
    if (!req.params.id || req.params.id.length > 200) return reply.code(400).send({ error: 'invalid decision id' });
    return decisionReceipt(input(), req.params.id) ?? reply.code(404).send({ error: 'recorded decision not found' });
  });
}
