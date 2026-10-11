import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerOfficeAssets } from '../src/application/office-assets.js';
test('office serves binary artwork with correct type and never exposes arbitrary paths', async () => {
  const app = Fastify();
  registerOfficeAssets(app);
  try {
    for (const name of [
      'cenario-modular.png',
      'cidade-faixa-dia.png',
      'cidade-faixa-entardecer.png',
      'cidade-faixa-noite.png',
      'assets/cadeira-costas.png',
      'agent-sprites.png',
      ...['atlas', 'euler', 'nova', 'sentinel', 'satoshi', 'flux', 'vega', 'oracle'].map(
        (id) => 'characters/' + id + '.png',
      ),
    ]) {
      const reply = await app.inject('/office/' + name);
      assert.equal(reply.statusCode, 200);
      assert.match(reply.headers['content-type']!, /^image\/png/);
      assert.deepEqual([...reply.rawPayload.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(reply.headers['x-content-type-options'], 'nosniff');
    }
    assert.equal((await app.inject('/office/private.env')).statusCode, 404);
    assert.equal((await app.inject('/office/subdir/index.html')).statusCode, 404);
    assert.equal((await app.inject('/office/characters/unknown.png')).statusCode, 404);
    assert.equal((await app.inject('/office/characters/atlas.png/extra')).statusCode, 404);
    for (const name of [
      'presence.js',
      'navigation.js',
      'collaboration.js',
      'transitions.js',
      'life.js',
      'screens.js',
      'character-frames.js',
      'sprites.js',
      'workstations.js',
      'display.js',
    ]) {
      const presentation = await app.inject('/office/' + name);
      assert.equal(presentation.statusCode, 200);
      assert.match(presentation.headers['content-type']!, /javascript/);
    }
    const page = await app.inject('/office/index.html');
    assert.match(page.body, /lang="pt-BR"/);
    // O escritório 2.0 é a entrada padrão; o 1.0 segue servido em /office/index.html (checado acima).
    const entry = await app.inject('/office');
    assert.equal(entry.statusCode, 302);
    assert.equal(entry.headers.location, '/office2/');
    assert.equal((await app.inject('/office2')).headers.location, '/office2/');
  } finally {
    await app.close();
  }
});
