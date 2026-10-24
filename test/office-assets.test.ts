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
test('office2 caches only the art images for a day; pages, scripts, styles and JSON always revalidate, and the 1.0 office is unchanged', async () => {
  const app = Fastify();
  registerOfficeAssets(app);
  try {
    for (const name of [
      'art/cidade-dia.png',
      'art/cidade-entardecer.png',
      'art/cidade-noite.png',
      'art/cidade-noite.jpg',
      'art/props/sofa.png',
      'art/icones/estagio-risk.png',
      'art/texturas/piso-marmore.png',
      'art/personagens/vega.png',
    ]) {
      const reply = await app.inject('/office2/' + name);
      assert.equal(reply.statusCode, 200, name);
      assert.equal(reply.headers['cache-control'], 'public, max-age=86400', name);
    }
    for (const name of [
      '',
      'index.html',
      'style.css',
      'app.js',
      'scene.js',
      'scene-map.json',
      'stress-report.json',
      'art/manifesto.json',
      'art/apoios.json',
      'art/personagens/quadros.json',
    ]) {
      const reply = await app.inject('/office2/' + name);
      assert.equal(reply.statusCode, 200, name);
      assert.equal(reply.headers['cache-control'], 'no-cache', name);
    }
    for (const name of ['index.html', 'app.js', 'style.css', 'cidade-faixa-noite.png', 'characters/atlas.png']) {
      const reply = await app.inject('/office/' + name);
      assert.equal(reply.statusCode, 200, name);
      assert.equal(reply.headers['cache-control'], 'no-cache', name);
    }
  } finally {
    await app.close();
  }
});
test('office2 assets carry ETag and Last-Modified and answer a matching conditional request with an empty 304', async () => {
  const app = Fastify();
  registerOfficeAssets(app);
  try {
    const seen = new Set<string>();
    for (const name of [
      '',
      'index.html',
      'app.js',
      'style.css',
      'scene-map.json',
      'art/manifesto.json',
      'art/props/sofa.png',
      'art/cidade-noite.png',
    ]) {
      const url = '/office2/' + name;
      const first = await app.inject(url);
      assert.equal(first.statusCode, 200, name);
      const etag = String(first.headers.etag),
        modified = String(first.headers['last-modified']);
      assert.match(etag, /^"[A-Za-z0-9_-]+"$/, name);
      assert.match(modified, /GMT$/, name);
      assert.equal((await app.inject(url)).headers.etag, etag, 'the same bytes give the same ETag');
      seen.add(etag);

      const cached = await app.inject({ url, headers: { 'if-none-match': etag } });
      assert.equal(cached.statusCode, 304, name);
      assert.equal(cached.rawPayload.length, 0, name);
      assert.equal(cached.headers.etag, etag);
      assert.equal(cached.headers['cache-control'], first.headers['cache-control'], 'caching policy is kept on a 304');
      for (const header of [`W/${etag}`, `"other", ${etag}`, '*'])
        assert.equal((await app.inject({ url, headers: { 'if-none-match': header } })).statusCode, 304, header);

      const stale = await app.inject({ url, headers: { 'if-none-match': '"stale"' } });
      assert.equal(stale.statusCode, 200, name);
      assert.equal(stale.rawPayload.length, first.rawPayload.length, 'a different tag gets the whole file');

      assert.equal((await app.inject({ url, headers: { 'if-modified-since': modified } })).statusCode, 304, name);
      const earlier = new Date(Date.parse(modified) - 3600000).toUTCString();
      assert.equal((await app.inject({ url, headers: { 'if-modified-since': earlier } })).statusCode, 200, name);
      assert.equal((await app.inject({ url, headers: { 'if-modified-since': 'not a date' } })).statusCode, 200, name);
      // If-None-Match decide sozinho: uma etiqueta velha não vira 304 só porque a data bate.
      const both = await app.inject({ url, headers: { 'if-none-match': '"stale"', 'if-modified-since': modified } });
      assert.equal(both.statusCode, 200, name);
    }
    assert.equal(seen.size, 8 - 1, 'different files have different tags (index.html is served twice)');
    const missing = await app.inject('/office2/art/props/nao-existe.png');
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.headers.etag, undefined);
  } finally {
    await app.close();
  }
});

test('office2 serve a tela Sinais (HTML e JS) e o escritório linka para ela', async () => {
  const app = Fastify();
  registerOfficeAssets(app);
  try {
    const page = await app.inject('/office2/sinais.html');
    assert.equal(page.statusCode, 200);
    assert.match(page.headers['content-type']!, /^text\/html/);
    assert.match(page.body, /\/office2\/sinais\.js/);
    const script = await app.inject('/office2/sinais.js');
    assert.equal(script.statusCode, 200);
    assert.match(script.headers['content-type']!, /javascript/);
    assert.equal(script.headers['cache-control'], 'no-cache');
    assert.match((await app.inject('/office2/')).body, /href="\/office2\/sinais\.html"/);
  } finally {
    await app.close();
  }
});
