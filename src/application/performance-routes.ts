import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AccountPerformance } from '../domain/account-performance.js';
export function registerPerformanceRoute(
  app: FastifyInstance,
  path: string,
  read: (id: string) => AccountPerformance | undefined,
) {
  const query = z
    .object({ limit: z.coerce.number().int().min(1).max(100).default(25), before: z.string().min(1).optional() })
    .strict();
  app.get<{ Params: { id: string } }>(path, async (req, reply) => {
    const parsed = query.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid performance query' });
    const performance = read(req.params.id);
    if (!performance) return reply.code(404).send({ error: 'unknown account' });
    const ordered = [...performance.closedTrades].reverse();
    const cursor = parsed.data.before ? ordered.findIndex((t) => t.fillEventIds.at(-1) === parsed.data.before) : -1;
    if (parsed.data.before && cursor < 0) return reply.code(400).send({ error: 'unknown performance cursor' });
    const rows = ordered.slice(cursor + 1, cursor + 1 + parsed.data.limit),
      more = cursor + 1 + rows.length < ordered.length;
    return { ...performance, closedTrades: rows, nextCursor: more ? rows.at(-1)!.fillEventIds.at(-1) : null };
  });
}
