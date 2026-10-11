import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import Fastify from 'fastify';
import { registerOfficeAssets } from '../src/application/office-assets.js';
import { decodePng } from '../scripts/assets/png.js';
const map = JSON.parse(readFileSync('public/office2/scene-map.json', 'utf8'));
const manifest = JSON.parse(readFileSync('public/office2/art/manifesto.json', 'utf8'));
const supports = JSON.parse(readFileSync('public/office2/art/apoios.json', 'utf8')).supports;
function runtime() {
  const ctx = vm.createContext({});
  for (const name of ['iso', 'ambience', 'navigation-icons', 'scene'])
    vm.runInContext(readFileSync('public/office2/' + name + '.js', 'utf8'), ctx);
  return ctx;
}

test('contatos de todos os móveis, inclusive espelhados, ficam dentro da ocupação com folga das paredes', () => {
  const iso = runtime().Office2Iso.create(map);
  for (const p of map.props.filter((p: any) => p.blocking !== false))
    for (const flip of [false, true]) {
      const info = manifest.props[p.asset],
        support = supports[p.asset],
        place = iso.propPlacement({ ...p, flip }, info, support);
      assert.ok(Number.isFinite(place.s) && place.s > 0, p.asset);
      for (const [x, y] of support.contacts) {
        const at = iso.unproject(
          place.x + (flip ? -1 : 1) * (x * place.s + place.dx),
          place.y + y * place.s + place.dy,
        );
        assert.ok(
          at.i >= p.tile.i + 0.17 &&
            at.i <= p.tile.i + p.footprint.a - 0.17 &&
            at.j >= p.tile.j + 0.17 &&
            at.j <= p.tile.j + p.footprint.b - 0.17,
          p.asset + ' contato fora do piso',
        );
      }
    }
});

test('a câmera enquadra os quatro cantos e paredes em desktop e celular, inclusive com painel aberto', () => {
  const lib = runtime().Office2Iso,
    iso = lib.create(map);
  for (const [vw, vh] of [
    [1920, 864],
    [1006, 660],
    [390, 430],
    [390, 280],
  ])
    for (const room of map.rooms) {
      const t = room.tiles,
        pts = [
          [t.i0, t.j0],
          [t.i1, t.j0],
          [t.i1, t.j1],
          [t.i0, t.j1],
        ].map(([i, j]) => iso.project(i, j));
      const bounds = {
        x0: Math.min(...pts.map((p: any) => p.x)) - 32,
        x1: Math.max(...pts.map((p: any) => p.x)) + 32,
        y0: Math.min(...pts.map((p: any) => p.y)) - 112,
        y1: Math.max(...pts.map((p: any) => p.y)) + 30,
      };
      const c = lib.fit(bounds, vw, vh, 2.6, 32);
      assert.ok(bounds.x0 * c.s + c.x >= 31.99 && bounds.x1 * c.s + c.x <= vw - 31.99, room.id);
      assert.ok(bounds.y0 * c.s + c.y >= 31.99 && bounds.y1 * c.s + c.y <= vh - 31.99, room.id);
    }
});

test('ciclo usa os horários e preferência do escritório antigo, incluindo amanhecer e armazenamento indisponível', () => {
  const A = runtime().Office2Ambience;
  for (const [hour, phase] of [
    [0, 'night'],
    [4, 'night'],
    [5, 'dusk'],
    [6.99, 'dusk'],
    [7, 'day'],
    [16.99, 'day'],
    [17, 'dusk'],
    [18.99, 'dusk'],
    [19, 'night'],
    [23, 'night'],
  ])
    assert.equal(A.phase('auto', hour), phase);
  assert.equal(A.phase('night', 10), 'night');
  assert.equal(A.phase('day', 23), 'day');
  assert.equal(A.phase('invalid', 12), 'day');
  const denied = {
    getItem() {
      throw Error('denied');
    },
    setItem() {
      throw Error('denied');
    },
  };
  assert.equal(A.read(denied), 'auto');
  assert.equal(A.save(denied, 'dusk'), 'dusk');
  let key = '',
    value = '';
  const storage = {
    getItem() {
      return value;
    },
    setItem(k: string, v: string) {
      key = k;
      value = v;
    },
  };
  A.save(storage, 'day');
  assert.equal(key, 'trading-lab.lighting.v1');
  assert.equal(A.read(storage), 'day');
});

test('carregamento das texturas preserva a fase escolhida e prolonga a fachada na visão mobile', async () => {
  const context = runtime(),
    renders: any[] = [],
    nodes = new Map<string, any>();
  const node = () => ({
    clientWidth: 390,
    clientHeight: 674,
    style: {},
    dataset: {},
    classList: { add() {}, toggle() {} },
    append() {},
    replaceChildren() {},
    addEventListener() {},
    setAttribute() {},
    getContext() {
      return {};
    },
  });
  const document = {
    hidden: false,
    querySelector(key: string) {
      if (!nodes.has(key)) nodes.set(key, node());
      return nodes.get(key);
    },
    querySelectorAll() {
      return [];
    },
    createElement: node,
    createTextNode: node,
    addEventListener() {},
  };
  class Img {
    onload?: () => void;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  Object.assign(context, {
    document,
    Image: Img,
    localStorage: {
      getItem() {
        return 'day';
      },
    },
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame() {},
    setInterval() {},
    addEventListener() {},
    performance: { now: () => 0 },
    OfficeSpriteSheets: {},
    Office2Ring: { ACCOUNT: 'evaluation:nova:usdm' },
    Office2Lab: {},
    Office2Ops: {},
    Office2Horizon: {},
    fetch: async (url: string) => ({ ok: url === '/office2/scene-map.json', status: 404, json: async () => map }),
    Office2Scene: {
      create() {
        return {
          signs: [],
          renderStatic(scale: number, phase: string, height: number) {
            renders.push({ scale, phase, height });
            return { worldHeight: height };
          },
        };
      },
    },
  });
  vm.runInContext(readFileSync('public/office2/app.js', 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(renders.length >= 2, 'inclui reconstrução depois das texturas');
  assert.ok(
    renders.every((r) => r.phase === 'day'),
    'a reconstrução não volta à fachada noturna',
  );
  assert.ok(
    renders.every((r) => r.scale === 1 && r.height > 3000),
    'fachada adaptada sem cache 2× no celular',
  );
  const c = context.Office2.state.camera;
  assert.ok(renders.at(-1).height * c.s + c.y >= 674, 'fachada chega ao rodapé');
});

test('em foco, placas e telas de outras salas não atravessam o mobiliário da sala selecionada', () => {
  const lib = runtime(),
    titles: string[] = [],
    ctx = new Proxy(
      { globalAlpha: 1 },
      {
        get: (t: any, k) =>
          k === 'globalAlpha'
            ? t[k]
            : k === 'measureText'
              ? () => ({ width: 20 })
              : k === 'createLinearGradient' || k === 'createRadialGradient'
                ? () => ({ addColorStop() {} })
                : (...args: unknown[]) => {
                    if (k === 'fillText') titles.push(String(args[0]));
                  },
        set: (t: any, k, v) => {
          t[k] = v;
          return true;
        },
      },
    );
  const scene = lib.Office2Scene.create(map, lib.Office2Iso.create(map), {});
  scene.draw(ctx, {}, [], {}, {}, {}, 'convivencia');
  assert.ok(titles.some((t) => t.includes('CONVIVÊNCIA')));
  assert.ok(!titles.some((t) => /BACKTEST|RISK|HORIZON|NEXUS/.test(t)));
});

test('portas físicas não retêm a parede da sala vizinha e telas não atravessam aberturas', () => {
  const lib = runtime(),
    iso = lib.Office2Iso.create(map),
    scene = lib.Office2Scene.create(map, iso, {});
  for (const d of iso.doors) {
    const a = d.inner,
      b = d.outer;
    const seg =
      a.i === b.i
        ? [a.i, Math.max(a.j, b.j), a.i + 1, Math.max(a.j, b.j)]
        : [Math.max(a.i, b.i), a.j, Math.max(a.i, b.i), a.j + 1];
    assert.ok(!scene.walls.some((w: any) => [w.a.i, w.a.j, w.b.i, w.b.j].join(',') === seg.join(',')), d.room);
  }
  for (const screen of map.screens) {
    const room = map.rooms.find((r: any) => r.id === screen.room);
    for (const d of room.doors ?? [])
      if (d.side === screen.wall)
        assert.ok(d.at < screen.tiles.from || d.at >= screen.tiles.to, screen.id + ' sobre porta');
  }
});

test('todos os menus principais têm emblema ou ícone local, incluindo Convivência e Recepção', () => {
  const lib = runtime(),
    html = readFileSync('public/office2/index.html', 'utf8'),
    app = readFileSync('public/office2/app.js', 'utf8');
  const roomIds = [...html.matchAll(/<button[^>]+data-room="([^"]*)"/g)].map((m) => m[1]);
  for (const id of roomIds) {
    if (id === '' || lib.Office2NavIcons.names.includes(id)) continue;
    assert.ok(app.includes(id + ":'zona-") || app.includes("'" + id + "':'zona-"), id);
  }
  const nodes: any[] = [];
  const document = {
    createElementNS(_ns: string, tag: string) {
      const n = {
        tag,
        attrs: {} as any,
        setAttribute(k: string, v: string) {
          this.attrs[k] = v;
        },
        append(c: any) {
          nodes.push(c);
        },
      };
      return n;
    },
  };
  for (const id of ['convivencia', 'recepcao']) {
    const n = lib.Office2NavIcons.node(id, document);
    assert.equal(n.tag, 'svg');
    assert.equal(n.attrs['aria-hidden'], 'true');
    assert.equal(nodes.at(-1).tag, 'path');
    assert.ok(nodes.at(-1).attrs.d.length > 10);
  }
});

test('as três cidades são opacas e as novas rotas servem apenas os nomes explícitos, com nosniff', async () => {
  const app = Fastify();
  registerOfficeAssets(app);
  try {
    for (const name of ['dia', 'entardecer', 'noite']) {
      const img = decodePng(readFileSync('public/office2/art/cidade-' + name + '.png'));
      assert.equal(img.width, 1536);
      assert.equal(img.height, 1024);
      assert.ok(img.data.every((v, i) => i % 4 !== 3 || v === 255));
      const res = await app.inject('/office2/art/cidade-' + name + '.png');
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
    }
    for (const p of ['ambience.js', 'navigation-icons.js', 'art/apoios.json'])
      assert.equal((await app.inject('/office2/' + p)).statusCode, 200);
    for (const p of ['art/cidade-segredo.png', 'art/apoios-private.json', 'art/..%2F..%2F.env'])
      assert.equal((await app.inject('/office2/' + p)).statusCode, 404);
  } finally {
    await app.close();
  }
});

/** Abre o app.js com uma tela de `vw` × `vh` e devolve a câmera inicial e o enquadramento do andar inteiro. */
async function initialCamera(vw: number, vh: number) {
  const context = runtime(),
    nodes = new Map<string, any>();
  const node = () => ({
    clientWidth: vw,
    clientHeight: vh,
    style: {},
    dataset: {},
    classList: { add() {}, toggle() {} },
    append() {},
    replaceChildren() {},
    addEventListener() {},
    setAttribute() {},
    getContext() {
      return {};
    },
  });
  const document = {
    hidden: false,
    querySelector(key: string) {
      if (!nodes.has(key)) nodes.set(key, node());
      return nodes.get(key);
    },
    querySelectorAll() {
      return [];
    },
    createElement: node,
    createTextNode: node,
    addEventListener() {},
  };
  class Img {
    onload?: () => void;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  Object.assign(context, {
    document,
    Image: Img,
    localStorage: {
      getItem() {
        return 'day';
      },
    },
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame() {},
    setInterval() {},
    addEventListener() {},
    performance: { now: () => 0 },
    OfficeSpriteSheets: {},
    Office2Ring: { ACCOUNT: 'evaluation:nova:usdm' },
    Office2Lab: {},
    Office2Ops: {},
    Office2Horizon: {},
    fetch: async (url: string) => ({ ok: url === '/office2/scene-map.json', status: 404, json: async () => map }),
    Office2Scene: {
      create() {
        return {
          signs: [],
          renderStatic(_scale: number, _phase: string, height: number) {
            return { worldHeight: height };
          },
        };
      },
    },
  });
  vm.runInContext(readFileSync('public/office2/app.js', 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  const iso = context.Office2Iso.create(map),
    top = iso.project(0, 0, 102),
    left = iso.project(0, iso.H),
    right = iso.project(iso.W, 0),
    bottom = iso.project(iso.W, iso.H);
  const bounds = { x0: left.x - 12, x1: right.x + 12, y0: top.y - 14, y1: bottom.y + 24 };
  return {
    camera: context.Office2.state.camera as { s: number; x: number; y: number },
    fit: context.Office2Iso.fit(bounds, vw, vh, 2, 16),
    bounds,
  };
}

test('celular em pé abre mais perto, centrado no andar; desktop e celular deitado seguem com o andar inteiro', async () => {
  const phone = await initialCamera(390, 674);
  assert.ok(Math.abs(phone.camera.s - phone.fit.s * 1.35) < 1e-9, '1,35× o enquadramento do andar inteiro');
  const centerX = ((phone.bounds.x0 + phone.bounds.x1) / 2) * phone.camera.s + phone.camera.x;
  assert.ok(Math.abs(centerX - 390 / 2) < 1, 'andar centrado na horizontal');
  assert.ok(
    phone.bounds.y0 * phone.camera.s + phone.camera.y >= 71.99,
    'o cartão do andar, no topo, não cobre a planta',
  );
  const desktop = await initialCamera(1200, 700);
  assert.ok(Math.abs(desktop.camera.s - desktop.fit.s) < 1e-9, 'desktop mantém o andar inteiro');
  const landscape = await initialCamera(560, 300);
  assert.ok(Math.abs(landscape.camera.s - landscape.fit.s) < 1e-9, 'celular deitado mantém o andar inteiro');
});

test('em tela estreita a barra leva "Outros ambientes", luz e o link antigo para a faixa de baixo e os devolve em tela larga', async () => {
  const context = runtime(),
    nodes = new Map<string, any>(),
    moved: any[] = [],
    restored: any[] = [];
  const node = (extra: any = {}) => ({
    clientWidth: 390,
    clientHeight: 674,
    style: {},
    dataset: {},
    classList: { add() {}, toggle() {} },
    append() {},
    replaceChildren() {},
    addEventListener() {},
    setAttribute() {},
    getContext() {
      return {};
    },
    ...extra,
  });
  const other = node({ id: 'otherRooms', nextSibling: 'market' }),
    label = node({ id: 'luz', nextSibling: 'clock' }),
    link = node({ id: 'link', nextSibling: null });
  nodes.set(
    'nav',
    node({
      append(n: any) {
        moved.push(n);
      },
    }),
  );
  nodes.set(
    '.status',
    node({
      insertBefore(n: any, ref: any) {
        restored.push([n, ref]);
      },
    }),
  );
  nodes.set('#otherRooms', other);
  nodes.set(
    '#lightingMode',
    node({
      closest() {
        return label;
      },
    }),
  );
  nodes.set('.chip.link', link);
  const document = {
    hidden: false,
    querySelector(key: string) {
      if (!nodes.has(key)) nodes.set(key, node());
      return nodes.get(key);
    },
    querySelectorAll() {
      return [];
    },
    createElement: node,
    createTextNode: node,
    addEventListener() {},
  };
  let change: (() => void) | undefined;
  const mq = {
    matches: true,
    addEventListener(_t: string, fn: () => void) {
      change = fn;
    },
  };
  class Img {
    onload?: () => void;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  Object.assign(context, {
    document,
    Image: Img,
    localStorage: {
      getItem() {
        return 'day';
      },
    },
    matchMedia: () => mq,
    requestAnimationFrame() {},
    setInterval() {},
    addEventListener() {},
    performance: { now: () => 0 },
    OfficeSpriteSheets: {},
    Office2Ring: { ACCOUNT: 'evaluation:nova:usdm' },
    Office2Lab: {},
    Office2Ops: {},
    Office2Horizon: {},
    fetch: async (url: string) => ({ ok: url === '/office2/scene-map.json', status: 404, json: async () => map }),
    Office2Scene: {
      create() {
        return {
          signs: [],
          renderStatic(_scale: number, _phase: string, height: number) {
            return { worldHeight: height };
          },
        };
      },
    },
  });
  vm.runInContext(readFileSync('public/office2/app.js', 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(moved, [other, label, link], 'em tela estreita os três controles vão para a faixa de zonas');
  mq.matches = false;
  change?.();
  assert.deepEqual(
    restored,
    [
      [other, 'market'],
      [label, 'clock'],
      [link, null],
    ],
    'em tela larga voltam à posição original',
  );
});
