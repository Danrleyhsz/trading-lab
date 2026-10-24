import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { SignalFollowerBook, type MarketWindow } from '../src/application/signal-follower-book.js';
import { registerSignalRoutes } from '../src/application/signal-follower-routes.js';

// TEST_ONLY: mensagem do canal e mercado vazio; as rotas não falam com a Binance nestes casos.
const MESSAGE = `🔥🔥🔥🥷 09:51 | AIOTUSDT | PREÇO ATUAL: 0.0615
Retração: 0.0602 – 0.0612 | Defesa: 0.0600
Parcial 1: 0.0638 🚀
Parcial 2: 0.0668 🚀
Alvo 1: 0.0675 🔥`;
const NOW = Date.UTC(2026, 9, 24, 12, 55);
const empty: MarketWindow = { candles: async () => [], funding: async () => [] };
function setup(enabled: boolean) {
  const app = Fastify();
  const book = new SignalFollowerBook(empty, [], enabled, 10000, () => NOW);
  let saved = 0;
  registerSignalRoutes(app, book, async () => void saved++);
  return { app, book, saved: () => saved };
}
const post = (app: ReturnType<typeof Fastify>, payload: unknown) => app.inject({ method: 'POST', url: '/paper/signals', payload: payload as object });

test('dryRun lê a mensagem, não grava e funciona com o seguidor desligado', async () => {
  const { app, book, saved } = setup(false);
  const reply = await post(app, { message: MESSAGE, dryRun: true });
  assert.equal(reply.statusCode, 200);
  assert.equal(reply.json().kind, 'ENTRY');
  assert.equal(book.list().length, 0);
  assert.equal(saved(), 0);
  await app.close();
});

test('registrar com o seguidor desligado devolve 403 e não grava', async () => {
  const { app, book, saved } = setup(false);
  assert.equal((await post(app, { message: MESSAGE })).statusCode, 403);
  assert.equal(book.list().length, 0);
  assert.equal(saved(), 0);
  await app.close();
});

test('registrar liga o seguidor, grava e persiste; data antiga vira OWNER', async () => {
  const { app, book, saved } = setup(true);
  const now = await post(app, { message: MESSAGE });
  assert.equal(now.statusCode, 200);
  assert.equal(now.json().receivedAtSource, 'SERVER');
  const old = await post(app, { message: MESSAGE, receivedAt: '2026-10-20T23:59:00-03:00' });
  assert.equal(old.json().receivedAtSource, 'OWNER');
  assert.equal(book.list().length, 2);
  assert.equal(saved(), 2);
  await app.close();
});

test('receivedAt inválido ou futuro → 400; corpo inválido → 400', async () => {
  const { app, book, saved } = setup(true);
  for (const receivedAt of ['ontem', '2026-10-25T23:59:00-03:00']) {
    const reply = await post(app, { message: MESSAGE, receivedAt });
    assert.equal(reply.statusCode, 400);
    assert.equal(reply.json().error, 'invalid receivedAt');
  }
  assert.equal((await post(app, { message: 'curta' })).statusCode, 400);
  assert.equal((await post(app, { message: MESSAGE, extra: 1 })).statusCode, 400);
  assert.equal(book.list().length, 0);
  assert.equal(saved(), 0);
  await app.close();
});
