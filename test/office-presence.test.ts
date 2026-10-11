import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function environment() {
  const callbacks = new Map<number, () => void>();
  let sequence = 0;
  const cancelled: number[] = [];
  const context = vm.createContext({
    document: { activeElement: null },
    setTimeout: (fn: () => void) => {
      callbacks.set(++sequence, fn);
      return sequence;
    },
    clearTimeout: (id: number) => {
      cancelled.push(id);
      callbacks.delete(id);
    },
  });
  vm.runInContext(readFileSync('public/office/navigation.js', 'utf8'), context);
  vm.runInContext(readFileSync('public/office/presence.js', 'utf8'), context);
  vm.runInContext(readFileSync('public/office/transitions.js', 'utf8'), context);
  return { api: context.OfficePresence, transitions: context.OfficeTransitions, callbacks, cancelled, context };
}
test('cosmetic floor lanes are bounded and unknown rooms never get a fabricated location', () => {
  const { api } = environment();
  for (const room of ['Research Lab', 'Quant Lab', 'Trading Floor', 'Risk Desk', 'Meeting Room', 'Lounge'])
    for (let slot = 0; slot < 8; slot++) {
      const point = api.floorPoint(room, slot),
        path = api.idlePath(room, slot, 'atlas', 300, 280);
      assert.ok(point.x >= 10 && point.x <= 90);
      assert.ok(point.y >= 92 && point.y <= 98);
      for (const p of path) {
        assert.ok(Math.abs(p.x) <= 60);
        assert.ok(Math.abs(p.y) <= 170);
      }
      assert.equal(path.at(-1).x, 0);
      assert.equal(path.at(-1).y, 0);
    }
  assert.equal(api.floorPoint('unknown', 0), null);
  assert.equal(api.idlePath('unknown', 0, 'atlas', 300, 280).length, 0);
  assert.equal(api.idlePath('Research Lab', 0, 'atlas', 0, 280).length, 0);
});
test('idle presentation reuses one timer and actual task/room changes cancel previous motion', () => {
  const h = environment(),
    agent = { id: 'atlas', room: 'Research Lab', status: 'IDLE', experience: 0 },
    original = structuredClone(agent);
  let cancels = 0;
  const animations: any[] = [];
  const entry: any = {
      button: {
        dataset: {},
        animate: (frames: unknown) => {
          const animation = {
            frames,
            cancel: () => {
              cancels++;
            },
            onfinish: undefined,
          };
          animations.push(animation);
          return animation;
        },
      },
    },
    host = { getBoundingClientRect: () => ({ width: 300, height: 280 }) };
  const director = new h.api.Director(() => true);
  director.update(entry, agent, 0, host);
  director.update(entry, agent, 0, host);
  assert.equal(h.callbacks.size, 1);
  h.callbacks.get(entry.timer)!();
  assert.equal(entry.button.dataset.pose, 'walk');
  assert.equal(animations.length, 1);
  assert.deepEqual(agent, original);
  director.update(entry, { ...agent, status: 'RESEARCHING' }, 0, host);
  assert.equal(cancels, 1);
  assert.equal(entry.button.dataset.pose, 'task');
  animations[0].onfinish();
  assert.equal(entry.animation, undefined);
  assert.equal(entry.button.dataset.pose, 'task');
});
test('pause/reduced-motion/visibility gate cancels timers and stale callbacks without domain mutations', () => {
  const h = environment();
  let enabled = true,
    walks = 0;
  const agent = { id: 'atlas', room: 'Research Lab', status: 'IDLE', experience: 0 },
    entry: any = {
      button: {
        dataset: {},
        animate: () => {
          walks++;
          return { cancel() {} };
        },
      },
    },
    host = { getBoundingClientRect: () => ({ width: 300, height: 280 }) };
  const director = new h.api.Director(() => enabled);
  director.update(entry, agent, 0, host);
  const callback = h.callbacks.get(entry.timer)!;
  enabled = false;
  director.update(entry, agent, 0, host);
  callback();
  assert.equal(walks, 0);
  assert.equal(entry.timer, undefined);
  assert.equal(agent.status, 'IDLE');
  assert.equal(agent.experience, 0);
  enabled = true;
  director.update(entry, agent, 0, host);
  const currentTimer = entry.timer;
  assert.ok(currentTimer !== undefined);
  callback();
  assert.equal(entry.timer, currentTimer);
  assert.equal(walks, 0);
});
test('a segmented cosmetic route turns on the return and never claims a completed backend task', () => {
  const h = environment(),
    animations: any[] = [],
    facings: string[] = [],
    agent = { id: 'atlas', room: 'Research Lab', status: 'IDLE', experience: 0 },
    entry: any = {
      button: {
        dataset: {},
        animate: (frames: unknown, options: unknown) => {
          facings.push(entry.button.dataset.facing);
          const animation = { frames, options, cancel() {}, onfinish: undefined };
          animations.push(animation);
          return animation;
        },
      },
    },
    host = { getBoundingClientRect: () => ({ width: 300, height: 280 }) },
    director = new h.api.Director(() => true);
  director.update(entry, agent, 0, host);
  h.callbacks.get(entry.timer)!();
  assert.ok(entry.route.length > 2);
  assert.equal(entry.button.dataset.navigation, 'walking');
  let index = 0;
  while (entry.animation && index < 100) {
    const animation = entry.animation;
    animation.onfinish();
    index++;
  }
  assert.ok(index > 2 && index < 100);
  assert.ok(facings.includes('left') && facings.includes('right'));
  assert.equal(entry.button.dataset.pose, 'rest');
  assert.equal(entry.route, undefined);
  assert.ok(entry.timer !== undefined);
  assert.equal(agent.experience, 0);
  assert.equal(agent.status, 'IDLE');
});

test('concurrent cosmetic routes reserve footprints and removed actors release browser-only reservations', () => {
  const h = environment(),
    host = { getBoundingClientRect: () => ({ width: 300, height: 280 }) },
    director = new h.api.Director(() => true),
    entries: any[] = [];
  for (const [index, id] of ['atlas', 'euler'].entries()) {
    const entry: any = { button: { dataset: {}, animate: () => ({ cancel() {}, onfinish: undefined }) } };
    entries.push(entry);
    director.update(entry, { id, room: 'Research Lab', status: 'IDLE', experience: 0 }, index, host);
  }
  h.callbacks.get(entries[0].timer)!();
  h.callbacks.get(entries[1].timer)!();
  assert.ok(entries[0].route);
  if (entries[1].route)
    for (const a of entries[0].route)
      for (const b of entries[1].route) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 12);
  const old = entries[0].animation;
  director.forget(entries[0]);
  old.onfinish();
  assert.equal(director.entries.size, 1);
  assert.equal(entries[0].route, undefined);
  assert.equal(entries[0].animation, undefined);
  assert.equal(entries[1].agent.experience, 0);
});

test('idle strolls reserve every sampled segment of a recorded journey, including its departing room', () => {
  const h = environment(),
    host = { getBoundingClientRect: () => ({ width: 300, height: 280 }) },
    director = new h.api.Director(() => true);
  const idle: any = { button: { dataset: {}, animate: () => ({ cancel() {}, onfinish: undefined }) } };
  const traveler: any = {
    button: { dataset: {} },
    transitionRoute: [
      { x: 34, y: 94 },
      { x: 10, y: 94 },
    ].map((p) => h.transitions.world('Research Lab', p)),
  };
  director.update(idle, { id: 'atlas', room: 'Research Lab', status: 'IDLE' }, 0, host);
  director.update(traveler, { id: 'euler', room: 'Quant Lab', status: 'IDLE' }, 0, host);
  assert.equal(traveler.timer, undefined);
  h.callbacks.get(idle.timer)!();
  assert.equal(idle.animation, undefined);
  assert.equal(idle.button.dataset.navigation, 'waiting');
});

test('keyboard focus stops a local walk and stale completions cannot resume the focused character', () => {
  const h = environment(),
    effects: any[] = [],
    agent = { id: 'atlas', room: 'Research Lab', status: 'IDLE' },
    entry: any = {
      button: {
        dataset: {},
        animate: () => {
          const effect = {
            cancelled: false,
            cancel() {
              this.cancelled = true;
            },
            onfinish: undefined,
          };
          effects.push(effect);
          return effect;
        },
      },
    };
  const director = new h.api.Director(() => true);
  director.update(entry, agent, 0, { getBoundingClientRect: () => ({ width: 300, height: 280 }) });
  h.callbacks.get(entry.timer)!();
  h.context.document.activeElement = entry.button;
  effects[0].onfinish();
  assert.equal(entry.button.dataset.pose, 'rest');
  assert.equal(entry.route, undefined);
  assert.equal(entry.timer, undefined);
  effects[0].onfinish();
  assert.equal(effects.length, 1);
  assert.equal(agent.status, 'IDLE');
});
