import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DomainEvent, DomainEventType } from '../domain/events.js';
import type { StoredState } from '../domain/storage.js';
import { collectEvents } from '../infrastructure/postgres-state-store.js';
const types = [
  'MARKET_TICK',
  'AGENT_STATE_CHANGED',
  'TRADE_PROPOSED',
  'RISK_APPROVED',
  'RISK_REJECTED',
  'PAPER_ORDER_SUBMITTED',
  'PAPER_FILL',
  'POSITION_CLOSED',
  'MEMORY_CREATED',
  'RESEARCH_JOB_UPDATED',
  'RESEARCH_STARTED',
  'RESEARCH_COMPLETED',
  'RESEARCH_FAILED',
  'BACKTEST_STARTED',
  'BACKTEST_COMPLETED',
  'BACKTEST_FAILED',
  'PERPETUAL_MARKET_UPDATED',
  'MARKET_DATA_FAILED',
  'FUNDING_SETTLED',
  'PAPER_LIQUIDATION',
  'PAPER_CONTROL_CHANGED',
  'AUTONOMOUS_DECISION',
  'AUTONOMOUS_PILOT_STOPPED',
  'AUTONOMOUS_ENTRY_CHECKED',
  'AUTONOMOUS_ATTEMPT_FAILED',
  'AUTONOMOUS_ATTEMPT_RECOVERED',
] as const satisfies readonly DomainEventType[];
const query = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    before: z.string().min(1).max(200).optional(),
    type: z.enum(types).optional(),
    accountId: z.string().min(1).max(200).optional(),
    compact: z.enum(['1']).optional(),
  })
  .strict();
/** Compact pages drop bulky evidence (decision datasets, portfolio snapshots); the full record stays available by id. */
const bulky = ['signalDataset', 'dataset', 'portfolio'];
function compactEvent(e: DomainEvent): DomainEvent {
  const payload =
    e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload)
      ? Object.fromEntries(Object.entries(e.payload as Record<string, unknown>).filter(([k]) => !bulky.includes(k)))
      : e.payload;
  return { ...e, payload };
}
function accountId(e: DomainEvent) {
  const p = e.payload as {
    accountId?: string;
    order?: {
      accountId?: string;
    };
    fill?: {
      accountId?: string;
    };
  };
  return p?.accountId ?? p?.order?.accountId ?? p?.fill?.accountId;
}
/** Read only the last confirmed snapshot. No disk query can interleave a writer transaction. */
export class EventAudit {
  private cachedState: StoredState | null = null;
  private cachedEvents: DomainEvent[] = [];
  constructor(private readSnapshot: () => StoredState | null) {}
  private events() {
    const state = this.readSnapshot();
    if (!state) throw Error('audit snapshot unavailable');
    if (state !== this.cachedState) {
      const events = collectEvents(state);
      if (
        events.some(
          (e) =>
            typeof e.id !== 'string' ||
            !e.id ||
            e.id.length > 200 ||
            typeof e.occurredAt !== 'string' ||
            !types.includes(e.type) ||
            !Number.isFinite(Date.parse(e.occurredAt)),
        )
      )
        throw Error('invalid retained event');
      events.sort(
        (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
      this.cachedEvents = events;
      this.cachedState = state;
    }
    return this.cachedEvents;
  }
  page(filter: z.infer<typeof query>) {
    const events = this.events().filter(
      (e) => (!filter.type || e.type === filter.type) && (!filter.accountId || accountId(e) === filter.accountId),
    );
    const cursor = filter.before ? events.findIndex((e) => e.id === filter.before) : -1;
    if (filter.before && cursor < 0) throw Error('unknown audit cursor');
    const rows = events.slice(cursor + 1, cursor + 1 + filter.limit);
    return {
      source: 'DURABLE_SNAPSHOT' as const,
      coverage: 'RECORDED_EVENTS_ONLY' as const,
      order: 'OCCURRED_AT_DESC_ID_ASC' as const,
      events: structuredClone(filter.compact ? rows.map(compactEvent) : rows),
      nextCursor: cursor + 1 + rows.length < events.length ? rows.at(-1)!.id : null,
    };
  }
  /** Retained events, newest first, for read-only projections (do not mutate). */
  list() {
    return this.events();
  }
  get(id: string) {
    const record = this.events().find((e) => e.id === id);
    return record ? { source: 'DURABLE_SNAPSHOT' as const, event: structuredClone(record) } : undefined;
  }
}
export function registerEventAudit(app: FastifyInstance, audit: EventAudit) {
  app.get('/audit/events', async (req, reply) => {
    const parsed = query.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid audit query' });
    try {
      return audit.page(parsed.data);
    } catch (error) {
      return reply
        .code(error instanceof Error && error.message === 'unknown audit cursor' ? 400 : 503)
        .send({
          error:
            error instanceof Error && error.message === 'unknown audit cursor'
              ? 'unknown audit cursor'
              : 'recorded audit unavailable',
        });
    }
  });
  app.get<{
    Params: {
      id: string;
    };
  }>('/audit/events/:id', async (req, reply) => {
    if (!req.params.id || req.params.id.length > 200 || Object.keys(req.query as object).length)
      return reply.code(400).send({ error: 'invalid audit event query' });
    try {
      return audit.get(req.params.id) ?? reply.code(404).send({ error: 'recorded event not found' });
    } catch {
      return reply.code(503).send({ error: 'recorded audit unavailable' });
    }
  });
}
