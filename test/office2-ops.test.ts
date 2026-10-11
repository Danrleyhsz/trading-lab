import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Escritório 2.0, fase F4: Nexus, Diagnóstico, Auditoria e Risk só mostram o que foi gravado.
function ops() {
  const c = vm.createContext({ Math, Object, Array, Set, Map, Number, String, JSON, Date, Infinity });
  vm.runInContext(readFileSync('public/office2/ops.js', 'utf8'), c);
  return c.Office2Ops;
}
const msg = (from: string, to: string[], kind: string, decisionEventId?: string) => ({
  from,
  to,
  kind,
  summary: kind,
  createdAt: '2026-10-06T15:00:00.000Z',
  context: { decisionEventId, advisoryOnly: kind !== 'RISK_REVIEW' },
});

test('Nexus: arestas agregadas das mensagens reais, filtro por decisão e nós sem troca apagados', () => {
  const O = ops(),
    messages = [
      msg('satoshi', ['nova', 'sentinel'], 'RESEARCH_FINDING', 'd1'),
      msg('satoshi', ['nova'], 'RESEARCH_FINDING', 'd2'),
      msg('nova', ['sentinel'], 'EXECUTION_PLAN', 'd2'),
      msg('sentinel', ['nova'], 'RISK_REVIEW'),
      msg('stranger', ['nova'], 'X'),
    ];
  const all = O.nexus(messages);
  assert.equal(all.total, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(all.edges[0])), {
    from: 'satoshi',
    to: 'nova',
    count: 2,
    kinds: ['RESEARCH_FINDING'],
  });
  assert.equal(
    all.edges.some((e: any) => e.from === 'stranger'),
    false,
  );
  assert.equal(all.nodes.find((n: any) => n.id === 'euler').active, false);
  assert.equal(all.nodes.find((n: any) => n.id === 'nova').active, true);
  const one = O.nexus(messages, 'd2');
  assert.equal(one.total, 2);
  assert.equal(one.edges.length, 2);
  assert.equal(O.nexus(null), null);
  assert.equal(all.recent[0].kind, 'X');
  assert.equal(all.recent[1].advisory, false);
});

test('Diagnóstico: linha do tempo da ficha em ordem, paridade da decisão e histórico de falhas sempre UNKNOWN', () => {
  const O = ops();
  const receipt = {
    decisionEventId: 'd1',
    candleTimestamp: '2026-10-06T14:00:00.000Z',
    decidedAt: '2026-10-06T15:00:05.000Z',
    latencySeconds: { closeToDecision: 5 },
    actions: [
      {
        proposedAt: '2026-10-06T15:00:05.100Z',
        side: 'BUY',
        quantity: 0.001,
        risk: { approved: false, reasons: ['STALE_MARKET'] },
        fill: null,
      },
    ],
    blocks: [],
    stops: [],
  };
  const parity = {
    passed: true,
    summary: { decisions: 1 },
    rows: [{ eventId: 'd1', verdict: 'MATCH', execution: { verdict: 'RISK_REJECTED' }, candles: { compared: 3 } }],
    decisionLatencySeconds: { median: 4.3 },
  };
  const v = O.diagnostics(
    receipt,
    parity,
    { ready: true, reasons: [], storage: { kind: 'POSTGRESQL' }, market: { perpetual: { status: 'HEALTHY' } } },
    { autonomous: { error: null, lastAttemptFailed: false } },
  );
  assert.deepEqual(JSON.parse(JSON.stringify(v.timeline.map((e: any) => e.kind))), [
    'market',
    'decision',
    'proposal',
    'bad',
  ]);
  assert.equal(v.parity.row.verdict, 'MATCH');
  assert.equal(v.parity.row.execution, 'RISK_REJECTED');
  assert.equal(v.readiness.storage, 'POSTGRESQL');
  assert.equal(v.historyKnown, false);
  const empty = O.diagnostics(null, null, null, null);
  assert.equal(empty.timeline.length, 0);
  assert.equal(empty.parity, null);
  assert.equal(empty.cycle, null);
});

test('Auditoria e Risk: frações e distâncias calculadas dos dados; sem dado fica null', () => {
  const O = ops();
  const a = O.audit({ summary: { decisions: 4, complete: 3, completeFraction: 0.75 } }, [
    {
      id: 'e1',
      occurredAt: '2026-10-06T15:00:00Z',
      type: 'PAPER_FILL',
      payload: { fill: { accountId: 'evaluation:nova:usdm' } },
    },
  ]);
  assert.deepEqual({ ...a.receipts }, { decisions: 4, complete: 3, fraction: 0.75 });
  assert.equal(a.events[0].account, 'evaluation:nova:usdm');
  assert.equal(O.audit(null, null).events, null);
  const accounts = [
    {
      id: 'evaluation:nova:usdm',
      initialCash: 1000,
      portfolio: { equity: 985 },
      daily: { startEquity: 1000 },
      maxDrawdown: 0.02,
    },
  ];
  const r = O.risk(
    accounts,
    { halted: false, autonomous: { maxLossFraction: 0.03 } },
    { summary: { reasons: { 'RISK:DRAWDOWN_LIMIT': 2 } } },
  );
  assert.equal(r.killSwitch, false);
  const by = Object.fromEntries(r.limits.map((l: any) => [l.id, l]));
  assert.equal(by['pilot-loss'].use.toFixed(3), '0.500');
  assert.equal(by['daily-loss'].use.toFixed(3), '0.300');
  assert.equal(by.drawdown.use.toFixed(3), '0.067');
  assert.deepEqual(JSON.parse(JSON.stringify(r.rejections)), [{ reason: 'RISK:DRAWDOWN_LIMIT', n: 2 }]);
  const none = O.risk(null, null, null);
  assert.equal(none.killSwitch, null);
  assert.ok(none.limits.every((l: any) => l.use === null));
  // Os limites batem com o motor de risco (perpetual-risk.ts: 30% de drawdown desde 10/10/2026, 5% de perda diária).
  const engine = readFileSync('src/domain/perpetual-risk.ts', 'utf8');
  assert.match(engine, /peakEquity\s*\*\s*\(\s*1\s*-\s*MAX_DRAWDOWN_FRACTION\s*\)/);
  assert.match(readFileSync('src/domain/risk.ts', 'utf8'), /MAX_DRAWDOWN_FRACTION\s*=\s*0\.30?\b/);
  assert.match(engine, /dailyStartEquity\s*\*\s*0\.95/);
  assert.equal(O.RISK_LIMITS.drawdown, 0.3);
  assert.equal(O.RISK_LIMITS.dailyLoss, 0.05);
});

test('telas do F4 só desenham com dado', () => {
  const O = ops(),
    ctx = new Proxy(
      {},
      {
        get: (_t, k) =>
          typeof k === 'string' && ['fillStyle', 'strokeStyle', 'lineWidth'].includes(k)
            ? undefined
            : (..._a: unknown[]) => undefined,
        set: () => true,
      },
    );
  const inner = [
    { x: 0, y: 0 },
    { x: 96, y: 48 },
    { x: 96, y: 96 },
    { x: 0, y: 48 },
  ];
  assert.equal(O.paintNexus(ctx, inner, { edges: [] }), false);
  assert.equal(O.paintTimeline(ctx, inner, { timeline: [] }), false);
  assert.equal(O.paintAudit(ctx, inner, { receipts: null }), false);
  assert.equal(O.paintRisk(ctx, inner, { limits: [], killSwitch: null }), false);
  assert.equal(O.paintNexus(ctx, inner, O.nexus([msg('nova', ['sentinel'], 'EXECUTION_PLAN')])), true);
});
