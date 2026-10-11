import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerAccessControl } from '../src/application/access-control.js';
test('cloud authentication protects reads/writes and provides an HttpOnly session without embedding a token', async () => {
  const app = Fastify();
  const token = 'test-only-access-code-at-least-32-characters';
  registerAccessControl(app, token, true, 'https://example.test');
  app.get('/finance', async () => ({ ok: true }));
  app.post('/execute', async () => ({ ok: true }));
  try {
    assert.equal((await app.inject('/finance')).statusCode, 401);
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { accessToken: token },
      headers: { origin: 'https://example.test' },
    });
    assert.equal(login.statusCode, 200);
    const cookie = String(login.headers['set-cookie']);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.ok(!cookie.includes(token));
    assert.equal((await app.inject({ url: '/finance', headers: { cookie } })).statusCode, 200);
    assert.equal(
      (await app.inject({ method: 'POST', url: '/execute', headers: { cookie, origin: 'https://evil.test' } }))
        .statusCode,
      403,
    );
    assert.equal(
      (await app.inject({ url: '/finance', headers: { authorization: 'Bearer ' + token } })).statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ url: '/finance', headers: { cookie: 'lab_session=1.forged.bad' } })).statusCode,
      401,
    );
  } finally {
    await app.close();
  }
});
test('production refuses to expose the panel with missing access protection', () => {
  assert.throws(() => registerAccessControl(Fastify(), '', true, 'https://example.test'), /APP_ACCESS_TOKEN/);
});
test('read-only monitoring token reads but cannot write, log in, stream or replace the main secret', async () => {
  const token = 'test-only-access-code-at-least-32-characters',
    reader = 'test-only-read-only-monitor-token-32-chars-min',
    app = Fastify();
  registerAccessControl(app, token, true, 'https://example.test', reader);
  app.get('/finance', async () => ({ ok: true }));
  app.post('/paper/perpetual/halt', async () => ({ halted: true }));
  app.get('/events', async () => ({ stream: true }));
  const bearer = { authorization: 'Bearer ' + reader };
  try {
    app.get('/', async (_req, reply) => reply.redirect('/office2/'));
    assert.equal((await app.inject('/')).headers.location, '/office2/');
    assert.equal((await app.inject({ url: '/finance', headers: bearer })).statusCode, 200);
    assert.equal((await app.inject({ method: 'HEAD', url: '/finance', headers: bearer })).statusCode, 200);
    assert.equal(
      (await app.inject({ method: 'POST', url: '/paper/perpetual/halt', headers: bearer, payload: { halted: true } }))
        .statusCode,
      403,
    );
    assert.equal((await app.inject({ url: '/events', headers: bearer })).statusCode, 403);
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { accessToken: reader },
          headers: { origin: 'https://example.test' },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (await app.inject({ url: '/finance', headers: { authorization: 'Bearer ' + reader + 'x' } })).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/paper/perpetual/halt',
          headers: { authorization: 'Bearer ' + token },
          payload: { halted: true },
        })
      ).statusCode,
      200,
    );
  } finally {
    await app.close();
  }
  assert.throws(
    () => registerAccessControl(Fastify(), token, true, 'https://example.test', 'short'),
    /READ_ONLY_ACCESS_TOKEN/,
  );
  assert.throws(
    () => registerAccessControl(Fastify(), token, true, 'https://example.test', token),
    /READ_ONLY_ACCESS_TOKEN/,
  );
});
