import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

test('cenário oficial: dimensões e bytes do fundo montado com as peças batem com a geometria das salas e estações', () => {
  const c = vm.createContext({});
  for (const file of ['navigation', 'workstations'])
    vm.runInContext(readFileSync('public/office/' + file + '.js', 'utf8'), c);
  const png = readFileSync('public' + c.OfficeNavigation.scene.asset);
  assert.equal(png.readUInt32BE(16), c.OfficeNavigation.scene.width);
  assert.equal(png.readUInt32BE(20), c.OfficeNavigation.scene.height);
  assert.equal(
    createHash('sha256').update(png).digest('hex'),
    'f11c949d49e235fe42752985374938d99cf14f7b7a6b136d743ec559c22577cc',
  );
  for (const s of c.OfficeWorkstations.catalog) {
    const r = c.OfficeNavigation.layout[s.room];
    assert.ok(s.point.x >= r.x && s.point.x <= r.x + r.w);
    assert.ok(s.point.y >= r.y && s.point.y <= r.y + r.h);
    assert.ok(
      s.cx >= 0 &&
        s.cy >= 0 &&
        s.cx + s.cw <= c.OfficeNavigation.scene.width &&
        s.cy + s.ch <= c.OfficeNavigation.scene.height,
    );
    assert.ok(s.my < s.cy && s.cy + s.ch < s.y); // monitor, chair back, then ground; source coordinates, no simulated work
  }
});
