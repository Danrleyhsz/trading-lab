import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SignalFollowerBook } from './signal-follower-book.js';

const body = z
  .object({ message: z.string().min(10).max(5000), receivedAt: z.string().max(40).optional(), dryRun: z.boolean().optional() })
  .strict();

/** Rotas do Seguidor de Sinais. `dryRun` só lê a mensagem (funciona com o seguidor desligado); registrar exige a flag. */
export function registerSignalRoutes(app: FastifyInstance, book: SignalFollowerBook, persist: () => Promise<void>) {
  app.get('/paper/signals', async () => book.report());
  app.post('/paper/signals', async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid message' });
    if (parsed.data.dryRun) return book.preview(parsed.data.message);
    if (!book.isEnabled()) return reply.code(403).send({ error: 'signal follower disabled' });
    let message;
    try {
      message = book.add(parsed.data.message, parsed.data.receivedAt);
    } catch {
      return reply.code(400).send({ error: 'invalid receivedAt' });
    }
    await persist();
    return message;
  });
}
