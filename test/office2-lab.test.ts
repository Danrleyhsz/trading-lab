import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Escritório 2.0, fase F3: Stress Lab e Backtest são SIMULAÇÃO e o painel diz isso; nada vira resultado do piloto.
function lab() {
  const c = vm.createContext({ Math, Object, Array, Number, String, JSON });
  vm.runInContext(readFileSync('public/office2/lab.js', 'utf8'), c);
  return c.Office2Lab;
}
const report = JSON.parse(readFileSync('public/office2/stress-report.json', 'utf8'));

test('Stress Lab: o relatório publicado vira placar de 14 cenários na ordem do catálogo, com semente e sha', () => {
  const L = lab(),
    vm1 = L.stress(report);
  assert.equal(vm1.seed, 20261006);
  assert.equal(vm1.sha, report.reportSha256);
  assert.equal(vm1.scenarios.length, 14);
  assert.deepEqual(
    [...vm1.scenarios.map((s: any) => s.id)],
    report.scenarios.map((s: any) => s.id),
  );
  assert.match(vm1.headline, /^14 de 14 cenários sobreviveram · 0 violações/);
  // Um cenário que falha aparece como falha, com a violação e a expectativa não cumprida.
  const broken = structuredClone(report);
  broken.scenarios[1].survived = false;
  broken.scenarios[1].invariantViolations = ['INV_NEW_EXPOSURE_WHILE_HALTED@h3'];
  broken.scenarios[1].expectations[0].passed = false;
  const b = L.stress(broken).scenarios[1];
  assert.equal(b.survived, false);
  assert.deepEqual([...b.violations], ['INV_NEW_EXPOSURE_WHILE_HALTED@h3']);
  assert.equal(b.failed.length, 1);
  // Sem o selo SIMULATION, o relatório não é aceito.
  assert.equal(L.stress({ ...report, scope: 'LIVE' }), null);
  assert.equal(L.stress(null), null);
});

test('Backtest: estudos com a marca do piloto e a triagem real; sem lista, nada é inventado', () => {
  const L = lab();
  const list = [
    {
      id: 'd674cb32-aaaa',
      status: 'COMPLETED',
      request: { bars: 5000, trainBars: 1500, testBars: 500, candidateSet: 'MULTI_DAY_TREND_V1' },
      netPnl: 22.97,
      folds: 7,
    },
    {
      id: '81b94121-bbbb',
      status: 'COMPLETED',
      request: { bars: 3000, trainBars: 1200, testBars: 300 },
      netPnl: -286.67,
      folds: 6,
    },
    { id: 'x', status: 'RUNNING' },
  ];
  const v = L.studies(list, { autonomous: { studyId: 'd674cb32-aaaa', eligible: true, reason: 'eligible' } });
  assert.deepEqual({ ...v.pilot }, { id: 'd674cb32-aaaa', eligible: true, reason: 'eligible' });
  assert.equal(v.rows[0].pilot, true);
  assert.equal(v.rows[2].netPnl, null);
  assert.equal(L.studies(null, null), null);
  assert.equal(L.studies(list, null).pilot, null);
});

test('telas do Stress Lab e do Backtest só desenham com dado', () => {
  const L = lab(),
    calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, k) =>
        typeof k === 'string' && ['fillStyle', 'strokeStyle', 'lineWidth'].includes(k)
          ? undefined
          : (..._a: unknown[]) => {
              calls.push(String(k));
            },
      set: () => true,
    },
  );
  const inner = [
    { x: 0, y: 0 },
    { x: 96, y: 48 },
    { x: 96, y: 96 },
    { x: 0, y: 48 },
  ];
  assert.equal(L.paintStress(ctx, inner, null), false);
  assert.equal(L.paintStress(ctx, inner, L.stress(report)), true);
  assert.equal(calls.filter((c) => c === 'fillRect').length, 14);
  assert.equal(L.paintStudies(ctx, inner, { rows: [{ netPnl: null }] }), false);
  assert.equal(L.paintStudies(ctx, inner, { rows: [{ netPnl: 5, pilot: true }, { netPnl: -3 }] }), true);
});
