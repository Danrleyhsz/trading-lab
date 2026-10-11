import { registerPerformanceRoute } from './performance-routes.js';
import type { EventBus } from './event-bus.js';
import type { PaperOrder, PaperFill } from '../domain/broker.js';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { MarketTick } from '../domain/market.js';
import type { MemoryStore } from '../domain/memory.js';
import type { StrategyRegistry } from '../domain/strategy.js';
import type { AgentCoordinator } from './agent-coordinator.js';
import type { PaperAccounts } from './paper-accounts.js';

const orderSchema = z
  .object({
    symbol: z.literal('BTCUSDT'),
    side: z.enum(['BUY', 'SELL']),
    quantity: z.number().finite().positive(),
    strategyId: z.string().min(1).optional(),
  })
  .strict();
export interface PaperAccountRouteDependencies {
  market: () => MarketTick | null;
  memories: MemoryStore;
  strategies: StrategyRegistry;
  coordinator: AgentCoordinator;
  persist: () => Promise<void>;
  executionEnabled?: boolean;
  evaluationEnabled: boolean;
  bus: EventBus;
}
export function registerPaperAccountRoutes(
  app: FastifyInstance,
  accounts: PaperAccounts,
  deps: PaperAccountRouteDependencies,
) {
  const unsubscribe = deps.bus.subscribe((event) => {
    if (event.type !== 'PAPER_ORDER_SUBMITTED') return;
    const order = event.payload as PaperOrder;
    const account = order.accountId ? accounts.snapshot(order.accountId) : undefined;
    if (!account || !order.agentId) return;
    deps.coordinator.move(
      account.ownerAgentId ?? 'nova',
      'TRADING',
      'Trading Floor',
      'submit approved paper order for ' + account.id,
    );
  });
  app.addHook('onClose', async () => {
    unsubscribe();
  });
  registerPerformanceRoute(app, '/paper/accounts/:id/performance', (id) => accounts.performance(id));
  app.get('/paper/accounts', async () => accounts.list());
  app.get<{ Params: { id: string } }>(
    '/paper/accounts/:id',
    async (req, reply) => accounts.snapshot(req.params.id) ?? reply.code(404).send({ error: 'unknown account' }),
  );
  app.get<{ Params: { id: string } }>('/paper/accounts/:id/events', async (req, reply) =>
    accounts.has(req.params.id) ? accounts.ledger(req.params.id) : reply.code(404).send({ error: 'unknown account' }),
  );
  const execute = async (id: string, body: unknown, reply: FastifyReply) => {
    if (deps.executionEnabled === false)
      return reply.code(403).send({ error: 'legacy execution disabled; use independent perpetual evaluation' });
    const account = accounts.snapshot(id);
    if (!account) return reply.code(404).send({ error: 'unknown account' });
    if (account.kind === 'EVALUATION' && !deps.evaluationEnabled)
      return reply.code(403).send({ error: 'evaluation execution disabled' });
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid paper order', issues: parsed.error.issues });
    const market = deps.market();
    if (
      !market ||
      market.symbol !== parsed.data.symbol ||
      !Number.isFinite(market.price) ||
      market.price <= 0 ||
      !Number.isFinite(market.timestamp) ||
      Date.now() - market.timestamp > 60000 ||
      market.timestamp > Date.now() + 5000
    )
      return reply.code(400).send({ error: 'market unavailable or stale' });
    if (parsed.data.strategyId) {
      const strategy = deps.strategies.get(parsed.data.strategyId);
      if (!strategy || strategy.symbol !== market.symbol)
        return reply.code(400).send({ error: 'unknown or incompatible strategy' });
      if (account.kind === 'FUND' && strategy.status !== 'VALIDATED')
        return reply.code(400).send({ error: 'fund strategy must be validated' });
    }
    deps.coordinator.risk('review paper order for ' + id);
    const result = await accounts.propose(id, { ...parsed.data, referencePrice: market.price });
    const source = accounts.ledger(id).find((event) => {
      const payload = event.payload as { fill?: PaperFill; order?: PaperOrder };
      return (
        (event.type === 'PAPER_FILL' && payload.fill?.proposalId === result.proposalId) ||
        (event.type === 'RISK_REJECTED' && payload.order?.proposalId === result.proposalId)
      );
    });
    if (!source) throw Error('execution outcome missing from account ledger');
    if (result.status === 'rejected') {
      deps.memories.add({
        agentId: 'sentinel',
        kind: 'FAILURE',
        summary: 'paper order rejected by risk engine',
        sourceEventId: source?.id,
        metadata: {
          accountId: id,
          proposalId: result.proposalId,
          ownerAgentId: result.agentId,
          reasons: result.decision.reasons,
        },
      });
      deps.coordinator.move('sentinel', 'IDLE', 'Risk Desk', 'review complete for ' + id);
    } else {
      deps.coordinator.move('sentinel', 'IDLE', 'Risk Desk', 'risk review complete for ' + id);
      deps.coordinator.move(result.agentId, 'IDLE', 'Trading Floor', 'paper fill recorded for ' + id);
      deps.memories.add({
        agentId: result.agentId,
        kind: 'DECISION',
        summary: 'approved paper order filled',
        strategyId: parsed.data.strategyId,
        sourceEventId: source?.id,
        metadata: { accountId: id, proposalId: result.proposalId, fillId: result.fill.id, symbol: result.fill.symbol },
      });
    }
    await deps.persist();
    return result;
  };
  app.post<{ Params: { id: string } }>('/paper/accounts/:id/orders', async (req, reply) =>
    execute(req.params.id, req.body, reply),
  );
  // Existing API remains explicitly fund-only. Account routing cannot be inferred from body fields.
  app.post('/paper/orders', async (req, reply) => execute('fund', req.body, reply));
}
