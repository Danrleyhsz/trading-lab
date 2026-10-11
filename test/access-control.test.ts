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
test('login lockout is per client IP: one blocked IP does not block the owner, and the block expires 60 s after the last failure', async () => {
  const token = 'test-only-access-code-at-least-32-characters',
    app = Fastify();
  registerAccessControl(app, token, true, 'https://example.test');
  const real = Date.now;
  let clock = real();
  Date.now = () => clock;
  const login = (ip: string, accessToken: string) =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { accessToken },
      headers: { origin: 'https://example.test' },
      remoteAddress: ip,
    });
  try {
    for (let i = 0; i < 10; i++) assert.equal((await login('203.0.113.7', 'wrong')).statusCode, 401);
    assert.equal((await login('203.0.113.7', 'wrong')).statusCode, 429);
    assert.equal(
      (await login('203.0.113.7', token)).statusCode,
      429,
      'the blocked IP stays blocked, even with the right token',
    );
    assert.equal((await login('198.51.100.20', token)).statusCode, 200, 'the owner on another IP is not locked out');
    assert.equal((await login('198.51.100.21', 'wrong')).statusCode, 401, 'another IP still gets a normal answer');
    clock += 59000;
    assert.equal(
      (await login('203.0.113.7', token)).statusCode,
      429,
      '59 s after the last failure it is still blocked',
    );
    clock += 2000;
    assert.equal(
      (await login('203.0.113.7', token)).statusCode,
      200,
      '61 s after the last failure the block has expired',
    );
    // Depois de expirar, a contagem começa do zero: nove falhas novas ainda não bloqueiam.
    for (let i = 0; i < 9; i++) assert.equal((await login('203.0.113.7', 'wrong')).statusCode, 401);
    assert.equal((await login('203.0.113.7', token)).statusCode, 200);
  } finally {
    Date.now = real;
    await app.close();
  }
});
test('the failure table stays bounded: past the cap the oldest entry is dropped instead of growing without limit', async () => {
  const token = 'test-only-access-code-at-least-32-characters',
    app = Fastify();
  registerAccessControl(app, token, true, 'https://example.test');
  const login = (ip: string, accessToken: string) =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { accessToken },
      headers: { origin: 'https://example.test' },
      remoteAddress: ip,
    });
  try {
    for (let i = 0; i < 10; i++) await login('203.0.113.7', 'wrong');
    assert.equal((await login('203.0.113.7', token)).statusCode, 429);
    for (let i = 0; i < 1000; i++) await login(`10.${i >> 8}.${i & 255}.1`, 'wrong');
    assert.equal(
      (await login('203.0.113.7', token)).statusCode,
      200,
      'the oldest tracked IP was evicted when the table reached its cap',
    );
    // Quem falhou há pouco é mantido: a mais antiga é que sai, não uma qualquer.
    for (let i = 0; i < 10; i++) await login('198.51.100.9', 'wrong');
    for (let i = 0; i < 500; i++) await login(`172.16.${i >> 8}.${i & 255}`, 'wrong');
    assert.equal(
      (await login('198.51.100.9', token)).statusCode,
      429,
      'a recently blocked IP is still blocked after other IPs were added',
    );
  } finally {
    await app.close();
  }
});

test('login lockout ignores X-Forwarded-For unless the server was configured to trust a proxy, so the header cannot be used to dodge it', async () => {
  const token = 'test-only-access-code-at-least-32-characters',
    app = Fastify();
  registerAccessControl(app, token, true, 'https://example.test');
  try {
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/auth/login',
            payload: { accessToken: 'wrong' },
            headers: { origin: 'https://example.test', 'x-forwarded-for': `198.51.100.${i}` },
            remoteAddress: '203.0.113.50',
          })
        ).statusCode,
        401,
      );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { accessToken: 'wrong' },
          headers: { origin: 'https://example.test', 'x-forwarded-for': '198.51.100.99' },
          remoteAddress: '203.0.113.50',
        })
      ).statusCode,
      429,
    );
  } finally {
    await app.close();
  }
});
