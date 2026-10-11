import type { PerpetualPaperBook } from './perpetual-paper-book.js';
import type { PaperAccounts } from './paper-accounts.js';
import type { FastifyInstance } from 'fastify';
import type { AgentRegistry, AgentId } from '../domain/agents.js';
import type { MemoryStore } from '../domain/memory.js';
import type { AgentMessageBus } from '../domain/agent-messages.js';
import { agentCareer, type AgentActivityJournal } from '../domain/agent-career.js';

export function registerAgentProfiles(
  app: FastifyInstance,
  agents: AgentRegistry,
  memories: MemoryStore,
  messages: AgentMessageBus,
  activity: AgentActivityJournal,
  accounts?: PaperAccounts,
  perpetual?: PerpetualPaperBook,
) {
  app.get<{ Params: { id: string } }>('/agents/:id/profile', async (req, reply) => {
    const agent = agents.get(req.params.id as AgentId);
    if (!agent) return reply.code(404).send({ error: 'unknown agent' });
    const profile = agentCareer(agent, memories.list(agent.id), messages.list(agent.id), activity.list(agent.id));
    const evaluationAccounts = accounts?.list(agent.id) ?? [];
    const perpetualEvaluationAccounts = perpetual?.list().filter((a) => a.ownerAgentId === agent.id) ?? [];
    const recentTrades = [
      ...evaluationAccounts.map((a) => ({
        accountId: a.id,
        instrument: 'LEGACY_PAPER_V1',
        performance: accounts!.performance(a.id, 20),
      })),
      ...perpetualEvaluationAccounts.map((a) => ({
        accountId: a.id,
        instrument: a.instrument,
        performance: perpetual!.performance(a.id, 20),
      })),
    ];
    return {
      ...profile,
      evaluationAccounts,
      perpetualEvaluationAccounts,
      recentTrades,
      // Compatibility projection includes legacy evaluation only. Each account exposes its own outcome metrics.
      performance: evaluationAccounts.length
        ? {
            realizedPnl: evaluationAccounts.reduce((sum, a) => sum + a.portfolio.realizedPnl, 0),
            netPnl: evaluationAccounts.reduce((sum, a) => sum + a.portfolio.equity - a.initialCash, 0),
            feesPaid: evaluationAccounts.reduce((sum, a) => sum + a.feesPaid, 0),
            winRate: null,
            maxDrawdown: null,
            reason:
              'Legacy evaluation totals only; fund and USD-M excluded. Per-account outcome metrics are exposed on each account.',
          }
        : profile.performance,
    };
  });
}
