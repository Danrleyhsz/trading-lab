import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

class Portrait {
  hidden = false;
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  children: Portrait[] = [];
  className = '';
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  replaceChildren() {
    this.children = [];
  }
  append(child: Portrait) {
    this.children.push(child);
  }
}
function environment() {
  const context = vm.createContext({ document: { createElement: () => new Portrait() } });
  for (const name of ['character-frames', 'sprites'])
    vm.runInContext(readFileSync('public/office/' + name + '.js', 'utf8'), context);
  return context.OfficeSprites;
}

test('frame metadata belongs to the actual unchanged irregular atlas and stays within source bounds', () => {
  const api = environment(),
    png = readFileSync('public/office/agent-sprites.png');
  assert.equal(png.readUInt32BE(16), api.source.width);
  assert.equal(png.readUInt32BE(20), api.source.height);
  assert.equal(createHash('sha256').update(png).digest('hex'), api.source.sha256);
  assert.equal(Object.keys(api.frames).length, 8);
  assert.equal(Object.isFrozen(api.frames), true);
  for (const frame of Object.values(api.frames) as any[]) {
    assert.ok(frame.x >= 0 && frame.y >= 0 && frame.w > 0 && frame.h > 0);
    assert.ok(frame.x + frame.w <= api.source.width && frame.y + frame.h <= api.source.height);
    assert.equal(Object.isFrozen(frame), true);
  }
  assert.notEqual(api.source.width % 4, 0);
  assert.notEqual(api.source.height % 2, 0);
});

test('repainting a stable actor preserves independent direction frames and retains original profile art', () => {
  const api = environment(),
    portrait = new Portrait();
  assert.equal(api.paint(portrait, 'atlas', true), true);
  const parts = portrait.children.slice();
  api.paint(portrait, 'atlas', true);
  assert.deepEqual(portrait.children, parts);
  assert.equal(portrait.hidden, false);
  assert.equal(portrait.dataset.sprite, 'atlas');
  assert.equal(portrait.dataset.rig, 'directional');
  assert.equal(parts.length, 24);
  for (const direction of api.directions) {
    assert.equal(parts.filter((part) => part.dataset.direction === direction).length, 6);
  }
  assert.equal(parts.filter((part) => part.dataset.frame === '5').length, 4); // Visibility requires a seat; posture is not task evidence.
  assert.ok(parts.every((part) => part.attributes['aria-hidden'] === 'true'));
  api.paint(portrait, 'euler', false);
  assert.equal(portrait.dataset.sprite, 'euler');
  assert.equal(portrait.dataset.rig, 'portrait');
  assert.equal(portrait.children.length, 0);
  assert.doesNotMatch(portrait.attributes.style, /NaN|Infinity/);
});

test('unknown identities never display another actor and known recovery restores the genuine portrait', () => {
  const api = environment(),
    portrait = new Portrait();
  api.paint(portrait, 'nova', true);
  for (const id of ['unknown', '__proto__', '<img onerror=bad>']) {
    assert.equal(api.paint(portrait, id, true), false);
    assert.equal(portrait.hidden, true);
    assert.equal(portrait.dataset.sprite, undefined);
    assert.equal(portrait.children.length, 0);
  }
  api.paint(portrait, 'vega', true);
  assert.equal(portrait.hidden, false);
  assert.equal(portrait.dataset.sprite, 'vega');
  assert.equal(portrait.dataset.rig, 'directional');
});

test('all eight directional sheets have 24 audited bounded frames and match their actual PNG bytes', () => {
  const api = environment();
  assert.equal(Object.keys(api.sheets).length, 8);
  const hashes = new Set<string>();
  for (const [id, sheet] of Object.entries(api.sheets) as [string, any][]) {
    const png = readFileSync('public/office/characters/' + id + '.png'); // Sheets are delivered at pixelScale (0.5 since 2026-10-05); frame metadata stays in the audited source coordinates.
    assert.equal(sheet.pixelScale, 0.5);
    assert.equal(png.readUInt32BE(16), sheet.width * sheet.pixelScale);
    assert.equal(png.readUInt32BE(20), sheet.height * sheet.pixelScale);
    assert.equal(png[25], 6); // RGBA encoding; transparent pixels were checked in the source audit.
    assert.equal(createHash('sha256').update(png).digest('hex'), sheet.sha256);
    hashes.add(sheet.sha256);
    assert.equal(Object.isFrozen(sheet), true);
    assert.equal(sheet.frames.length, 24);
    assert.equal(sheet.columnCuts.length, 6);
    for (const [i, frame] of sheet.frames.entries()) {
      const column = i % 6,
        row = Math.floor(i / 6),
        cuts = sheet.columnCuts[column];
      assert.ok(frame.x >= (column * sheet.width) / 6 && frame.x + frame.w <= ((column + 1) * sheet.width) / 6);
      assert.ok(frame.y >= cuts[row] && frame.y + frame.h <= cuts[row + 1]);
      assert.ok(frame.w > 0 && frame.h > 0);
      assert.ok(Number.isFinite(frame.pivotX) && frame.pivotX >= frame.x && frame.pivotX <= frame.x + frame.w);
      if (column < 5) assert.ok(frame.h <= sheet.referenceHeight);
      assert.equal(Object.isFrozen(frame), true);
    }
  }
  assert.equal(hashes.size, 8);
});
