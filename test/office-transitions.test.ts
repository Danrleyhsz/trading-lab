import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function environment() {
  const context = vm.createContext({ document: { activeElement: null } });
  for (const name of ['navigation', 'transitions'])
    vm.runInContext(readFileSync('public/office/' + name + '.js', 'utf8'), context);
  return { api: context.OfficeTransitions, navigation: context.OfficeNavigation, context };
}
const copy = (data: any) => JSON.parse(JSON.stringify(data));
function motion() {
  const h = environment(),
    animations: any[] = [],
    agent = { id: 'atlas', room: 'Quant Lab', status: 'RESEARCHING', experience: 7 };
  let allowed = true,
    stops = 0,
    settled = 0;
  const entry: any = {
    agent,
    button: {
      dataset: {},
      animate: (frames: any, options: any) => {
        const animation = {
          frames,
          options,
          cancels: 0,
          onfinish: undefined,
          cancel() {
            this.cancels++;
          },
        };
        animations.push(animation);
        return animation;
      },
    },
  };
  const director = new h.api.Director(
    () => allowed,
    () => {
      stops++;
    },
    () => {
      settled++;
    },
  );
  const options = () => ({
    from: { room: 'Research Lab', slot: 0 },
    event: { id: 'TEST_ONLY_STATE', type: 'AGENT_STATE_CHANGED', occurredAt: new Date().toISOString(), payload: agent },
    bounds: { width: 1536, height: 1024 },
  });
  return {
    ...h,
    animations,
    agent,
    entry,
    director,
    options,
    setAllowed: (value: boolean) => {
      allowed = value;
    },
    get stops() {
      return stops;
    },
    get settled() {
      return settled;
    },
  };
}

test('verified doors join the panoramic front aisles in both directions without diagonal shortcuts', () => {
  const { api } = environment();
  for (const [from, to, doorX] of [
    ['Research Lab', 'Quant Lab', 33.4],
    ['Trading Floor', 'Lounge', 66.9],
  ] as const) {
    const path = api.plan(from, 0, to, 1),
      reverse = api.plan(to, 1, from, 0);
    assert.ok(path.length >= 3);
    assert.deepEqual(copy(path[0]), copy(api.anchor(from, 0)));
    assert.deepEqual(copy(path.at(-1)), copy(api.anchor(to, 1)));
    assert.deepEqual(copy(reverse), copy(path).reverse());
    for (let i = 1; i < path.length; i++)
      assert.ok(Math.abs(path[i].x - path[i - 1].x) < 1e-8 || Math.abs(path[i].y - path[i - 1].y) < 1e-8);
    const bridge = path.findIndex((p: any, i: number) => i > 0 && Math.abs(p.y - path[i - 1].y) > 30);
    assert.ok(bridge > 0);
    assert.ok(Math.abs(path[bridge].x - doorX) < 1e-8);
    assert.ok(Math.abs(path[bridge - 1].x - doorX) < 1e-8);
    // Visual review found the Quant cabinets inside the new room.
    for (let i = 1; i < path.length; i++)
      for (let step = 0; step <= 100; step++) {
        const x = path[i - 1].x + ((path[i].x - path[i - 1].x) * step) / 100,
          y = path[i - 1].y + ((path[i].y - path[i - 1].y) * step) / 100;
        assert.ok(!(x >= 27.4 && x <= 30 && y >= 42 && y <= 59));
      }
  }
});

test('unverified, crowded or malformed passages never fabricate a route', () => {
  const { api } = environment();
  for (const pair of [
    ['Research Lab', 'Trading Floor'],
    ['Risk Desk', 'Meeting Room'],
    ['Lounge', 'Meeting Room'],
    ['unknown', 'Quant Lab'],
    ['__proto__', 'Quant Lab'],
    ['Research Lab', 'Research Lab'],
  ])
    assert.equal(api.plan(pair[0], 0, pair[1], 0).length, 0);
  assert.equal(api.plan('Research Lab', 8, 'Quant Lab', 0).length, 0);
  assert.equal(api.plan('Research Lab', 0, 'Quant Lab', 0, [{ x: 33.4, y: 50 }]).length, 0);
  assert.equal(api.plan('Research Lab', 0, 'Quant Lab', 0, [api.anchor('Research Lab', 1)]).length, 0);
  assert.equal(api.plan('Research Lab', 0, 'Quant Lab', 0, [{ x: NaN, y: 60 }]).length, 0);
  assert.equal(api.plan('Research Lab', 0, 'Quant Lab', 0, [] as any, { x: 20, y: 20 }).length, 0);
  assert.equal(api.world('__proto__', { x: 50, y: 50 }), null);
});

test('an in-progress local stroll can leave its actual foot position, but cannot snap across furniture', () => {
  const { api } = environment(),
    start = api.world('Research Lab', { x: 23.25, y: 93.5 });
  const route = api.plan('Research Lab', 0, 'Quant Lab', 0, [], start);
  assert.ok(route.length > 2);
  assert.deepEqual(copy(route[0]), copy(start));
  assert.equal(
    api.plan('Research Lab', 0, 'Quant Lab', 0, [], api.world('Research Lab', { x: 23.25, y: 91.5 })).length,
    0,
  );
  assert.equal(api.plan('Research Lab', 0, 'Quant Lab', 0, [], { x: Infinity, y: 90 }).length, 0);
});

test('recorded travel turns at doors, owns one effect, caps duration and leaves domain evidence untouched', () => {
  const h = motion(),
    original = structuredClone(h.agent);
  h.director.update(h.entry, h.agent, 0, h.options());
  assert.equal(h.entry.button.dataset.travel, 'recorded');
  assert.equal(h.entry.button.dataset.pose, 'walk');
  assert.equal(h.stops, 1);
  let duration = 0,
    steps = 0;
  const facings = new Set<string>();
  while (h.entry.transitionAnimation && steps++ < 20) {
    const current = h.entry.transitionAnimation;
    facings.add(h.entry.button.dataset.facing);
    duration += current.options.duration;
    current.onfinish();
    assert.equal(current.cancels, 1);
  }
  assert.ok(steps < 20);
  assert.ok(duration > 0 && duration <= 8000.000001);
  assert.ok(facings.has('down') && facings.has('left') && facings.has('right'));
  assert.equal(h.entry.transitionRoute, undefined);
  assert.equal(h.entry.transitionAnimation, undefined);
  assert.equal(h.entry.button.dataset.travel, undefined);
  assert.equal(h.entry.button.dataset.pose, 'task');
  assert.equal(h.settled, 1);
  assert.deepEqual(h.agent, original);
});

test('snapshot refresh preserves an admitted route and never replays one on initialization or recovery', () => {
  const h = motion();
  h.director.update(h.entry, h.agent, 0, { bounds: { width: 1536, height: 1024 } });
  assert.equal(h.animations.length, 0);
  h.director.update(h.entry, h.agent, 0, h.options());
  const current = h.entry.transitionAnimation;
  h.director.update(h.entry, h.agent, 0, { bounds: { width: 1536, height: 1024 } });
  assert.equal(h.entry.transitionAnimation, current);
  assert.equal(h.animations.length, 1);
  h.director.stop(h.entry);
  h.director.update(h.entry, h.agent, 0, { bounds: { width: 1536, height: 1024 } });
  assert.equal(h.animations.length, 1);
});

test('real status/slot changes and explicit cancelation reject old animation completions', () => {
  const h = motion();
  h.director.update(h.entry, h.agent, 0, h.options());
  const old = h.entry.transitionAnimation;
  h.entry.agent = { ...h.agent, status: 'IDLE' };
  h.director.update(h.entry, h.entry.agent, 0, { bounds: { width: 1536, height: 1024 } });
  old.onfinish();
  assert.equal(old.cancels, 1);
  assert.equal(h.entry.transitionAnimation, undefined);
  assert.equal(h.entry.transitionRoute, undefined);
  assert.equal(h.entry.button.dataset.pose, 'rest');
  assert.equal(h.settled, 0);
  h.entry.agent = h.agent;
  h.director.update(h.entry, h.agent, 0, h.options());
  const removed = h.entry.transitionAnimation;
  h.director.stop(h.entry);
  removed.onfinish();
  assert.equal(h.entry.transitionRoute, undefined);
  assert.equal(h.settled, 0);
});

test('motion gates, focused characters and stale or mismatched events cannot animate recorded work', () => {
  const h = motion();
  h.setAllowed(false);
  h.director.update(h.entry, h.agent, 0, h.options());
  assert.equal(h.animations.length, 0);
  h.setAllowed(true);
  h.context.document.activeElement = h.entry.button;
  h.director.update(h.entry, h.agent, 0, h.options());
  assert.equal(h.animations.length, 0);
  h.context.document.activeElement = null;
  for (const patch of [
    { occurredAt: '2020-01-01' },
    { occurredAt: 'invalid' },
    { occurredAt: new Date(Date.now() + 60000).toISOString() },
    { id: '' },
    { payload: { ...h.agent, status: 'IDLE' } },
  ]) {
    const options = h.options();
    Object.assign(options.event, patch);
    h.director.update(h.entry, h.agent, 0, options);
    assert.equal(h.animations.length, 0);
  }
  h.director.update(h.entry, h.agent, 0, h.options());
  const current = h.entry.transitionAnimation;
  h.setAllowed(false);
  current.onfinish();
  assert.equal(h.entry.transitionRoute, undefined);
  assert.equal(h.settled, 0);
  h.setAllowed(true);
  h.director.update(h.entry, h.agent, 0, { bounds: { width: 1536, height: 1024 } });
  assert.equal(h.entry.transitionRoute, undefined);
});

test('completed segment callbacks cannot restart an obsolete effect or accumulate filled animations', () => {
  const h = motion();
  h.director.update(h.entry, h.agent, 0, h.options());
  const first = h.entry.transitionAnimation;
  first.onfinish();
  const next = h.entry.transitionAnimation;
  first.onfinish();
  assert.equal(h.entry.transitionAnimation, next);
  assert.equal(h.animations.length, 2);
  assert.equal(first.cancels, 1);
  h.director.stop(h.entry);
  next.onfinish();
  assert.equal(h.entry.transitionAnimation, undefined);
  assert.equal(h.animations.length, 2);
});

test('a peer state arriving inside a reserved corridor cancels travel immediately without waiting or replay', () => {
  const h = motion();
  h.director.update(h.entry, h.agent, 0, h.options());
  const previous = h.entry.transitionAnimation;
  assert.ok(h.entry.transitionRoute.length > 50);
  h.director.update(h.entry, h.agent, 0, { occupied: [{ x: 33.4, y: 49 }] });
  previous.onfinish();
  assert.equal(previous.cancels, 1);
  assert.equal(h.entry.transitionRoute, undefined);
  assert.equal(h.animations.length, 1);
  assert.equal(h.settled, 0);
  assert.equal(h.agent.room, 'Quant Lab');
  h.director.update(h.entry, h.agent, 0, {});
  assert.equal(h.entry.transitionAnimation, undefined);
});
