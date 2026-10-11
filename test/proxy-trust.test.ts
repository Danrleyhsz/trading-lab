import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { RENDER_PROXY_HOPS, trustedProxyHops, trustProxyOption } from '../src/application/proxy-trust.js';
const ipFor = async (env: NodeJS.ProcessEnv, forwarded: string | undefined, peer = '10.20.30.40') => {
  const app = Fastify({ trustProxy: trustProxyOption(trustedProxyHops(env)) });
  app.get('/ip', async (req) => ({ ip: req.ip }));
  try {
    const res = await app.inject({
      url: '/ip',
      remoteAddress: peer,
      headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
    });
    return (res.json() as { ip: string }).ip;
  } finally {
    await app.close();
  }
};
const cloudflare = '162.158.10.20',
  client = '203.0.113.9';
test('trusted hops: 2 on Render, 0 elsewhere, explicit override wins and a bad value is refused', () => {
  assert.equal(RENDER_PROXY_HOPS, 2);
  assert.equal(trustedProxyHops({}), 0);
  assert.equal(trustedProxyHops({ RENDER: 'false' }), 0);
  assert.equal(trustedProxyHops({ RENDER: 'true' }), 2);
  assert.equal(trustedProxyHops({ RENDER: 'true', TRUSTED_PROXY_HOPS: '3' }), 3);
  assert.equal(trustedProxyHops({ RENDER: 'true', TRUSTED_PROXY_HOPS: '0' }), 0);
  assert.equal(trustedProxyHops({ TRUSTED_PROXY_HOPS: '1' }), 1);
  assert.equal(trustedProxyHops({ RENDER: 'true', TRUSTED_PROXY_HOPS: ' ' }), 2, 'blank means unset');
  for (const bad of ['-1', '1.5', 'abc', '6', '2,3'])
    assert.throws(() => trustedProxyHops({ TRUSTED_PROXY_HOPS: bad }), /TRUSTED_PROXY_HOPS/, bad);
  assert.equal(trustProxyOption(0), false);
  assert.equal(typeof trustProxyOption(2), 'function');
});
test('on Render the client is the second address from the right; anything the caller wrote on the left is ignored', async () => {
  const render = { RENDER: 'true' };
  assert.equal(await ipFor(render, `${client}, ${cloudflare}`), client, 'the normal chain: client, Cloudflare');
  assert.equal(
    await ipFor(render, `198.51.100.1, 198.51.100.2, ${client}, ${cloudflare}`),
    client,
    'forged entries to the left are ignored',
  );
  assert.equal(await ipFor(render, `6.6.6.6, ${client}, ${cloudflare}`), client);
  assert.equal(await ipFor(render, undefined), '10.20.30.40', 'no forwarded header: the socket address');
});
test('off Render the forwarded header is ignored, so a caller cannot choose its own address', async () => {
  assert.equal(await ipFor({}, `6.6.6.6, ${client}, ${cloudflare}`), '10.20.30.40');
  assert.equal(await ipFor({ NODE_ENV: 'production' }, `6.6.6.6, ${client}, ${cloudflare}`), '10.20.30.40');
});
test('a miscounted chain is visible instead of silent: one hop too few returns the Cloudflare address, not a forged one', async () => {
  assert.equal(await ipFor({ TRUSTED_PROXY_HOPS: '1' }, `6.6.6.6, ${client}, ${cloudflare}`), cloudflare);
});
