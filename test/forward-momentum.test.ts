import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FORWARD_PROTOCOL as P,
  ForwardMomentumTracker,
  forwardFromDatasets,
} from '../src/application/forward-momentum.js';
import type { PerpetualDataset } from '../src/domain/perpetual-backtest.js';

const H = 3600000,
  W = 168 * H,
  start = P.firstDecisionBar - P.lookbackHours * H;
/** 21 moedas com tendências diferentes (índice k define a inclinação), da janela de aquecimento até `hours` depois. */
function universe(
  hoursAfterStart: number,
  shape: (k: number, i: number) => number = (k, i) => 100 * (1 + (k - 10) * 0.0002) ** i,
) {
  const n = P.lookbackHours + hoursAfterStart + 1,
    out: Record<string, PerpetualDataset> = {};
  P.symbols.forEach((s, k) => {
    const closes = Array.from({ length: n }, (_, i) => shape(k, i));
    const trade = closes.map((c, i) => ({
      timestamp: start + i * H,
      open: i ? closes[i - 1] : c,
      high: Math.max(c, i ? closes[i - 1] : c),
      low: Math.min(c, i ? closes[i - 1] : c),
      close: c,
      volume: 1,
    }));
    out[s] = {
      instrument: `BINANCE_USDM:${s}` as PerpetualDataset['instrument'],
      trade,
      mark: structuredClone(trade),
      funding: [],
    };
  });
  return out;
}

test('protocolo do acompanhamento: universo igual ao declarado, metade do tamanho e início depois da declaração', () => {
  const u = JSON.parse(readFileSync('docs/estudos/universo-2026-10-05.json', 'utf8'));
  assert.deepEqual([...P.symbols], [...u.universe, ...u.control]);
  assert.equal(P.legFraction, 0.05);
  assert.equal(P.stopDrawdown, 0.15);
  assert.equal(P.weeks, 12);
  assert.ok(P.firstDecisionBar + H > Date.parse(P.declaredAt), 'a primeira decisão vem depois da declaração');
  assert.match(readFileSync('docs/PROTOCOLO_ACOMPANHAMENTO_MOMENTUM.md', 'utf8'), /5%\*\* do patrimônio/);
});

test('em andamento: decide no início declarado, compra as que mais subiram, vende as que mais caíram e agenda a próxima', () => {
  const now = P.firstDecisionBar + 30 * H;
  const s = forwardFromDatasets(universe(30), now);
  assert.equal(s.status, 'RUNNING');
  assert.equal(s.verdict, 'IN_PROGRESS');
  assert.equal(s.rebalances, 1);
  assert.deepEqual(
    s.portfolio!.long,
    ['BTCUSDT', 'ETHUSDT', 'LTCUSDT', 'SOLUSDT', 'DOGEUSDT'],
    'as 5 de maior alta, da maior para a menor',
  );
  assert.deepEqual(s.portfolio!.short, ['UNIUSDT', 'NEARUSDT', 'WLDUSDT', 'ZECUSDT', 'ENAUSDT'], 'as 5 de maior queda');
  assert.equal(s.portfolio!.decidedAt, new Date(P.firstDecisionBar + H).toISOString());
  assert.equal(s.nextDecisionAt, new Date(P.firstDecisionBar + H + W).toISOString());
  assert.ok(s.netPnl! > 0, 'a diferença entre vencedoras e perdedoras continuou');
  assert.equal(s.curve[0].timestamp, P.firstDecisionBar, 'a curva começa no início declarado');
});

test('parada antecipada: a queda de 15% encerra e reprova; depois de 12 semanas o resultado é final', () => {
  // Inverte as tendências depois do início: as vencedoras despencam e as perdedoras disparam.
  const crash = universe(400, (k, i) =>
    i <= P.lookbackHours + 1
      ? 100 * (1 + (k - 10) * 0.0002) ** i
      : 100 * (1 + (k - 10) * 0.0002) ** (P.lookbackHours + 1) * (1 - (k - 10) * 0.004) ** (i - P.lookbackHours - 1),
  );
  const stopped = forwardFromDatasets(crash, P.firstDecisionBar + 400 * H);
  assert.equal(stopped.status, 'STOPPED_BY_DRAWDOWN');
  assert.equal(stopped.verdict, 'REJECTED');
  assert.ok(stopped.maxDrawdown! >= 0.15);
  assert.equal(stopped.nextDecisionAt, null);
  const done = forwardFromDatasets(universe(12 * 168 + 50), P.firstDecisionBar + (12 * 168 + 50) * H);
  assert.equal(done.status, 'COMPLETED');
  assert.equal(done.verdict, 'APPROVED');
  assert.equal(done.weeksElapsed, 12);
  assert.equal(done.rebalances, 12);
  assert.ok(done.curve.at(-1)!.timestamp < P.firstDecisionBar + 12 * W + H, 'nada depois do fim declarado conta');
});

test('serviço: espera o início sem buscar nada, nunca calcula com a cesta incompleta e pausa após 418', async () => {
  let calls = 0;
  const before = new ForwardMomentumTracker(
    {
      load: async () => {
        calls++;
        throw Error('x');
      },
    },
    () => P.firstDecisionBar - H,
  );
  assert.equal((await before.refresh()).status, 'WAITING_START');
  assert.equal(calls, 0);
  let now = P.firstDecisionBar + 5 * H;
  const data = universe(5);
  let fail = 'ZECUSDT';
  const t = new ForwardMomentumTracker(
    {
      load: async (_n, s) => {
        calls++;
        if (s === fail) throw Error('USD-M history HTTP 418');
        return data[s];
      },
    },
    () => now,
  );
  const s = await t.refresh();
  assert.equal(s.status, 'DATA_UNAVAILABLE');
  assert.match(s.error!, /418/);
  assert.equal(s.curve.length, 0);
  const c = calls;
  now += 10 * 60000;
  await t.refresh();
  assert.equal(calls, c, 'pausado por 1 h depois do 418');
  now += H;
  fail = '';
  assert.equal((await t.refresh()).status, 'RUNNING');
  assert.equal(t.snapshot().scope, 'FORWARD_PAPER_TRACKING_ONLY');
});

test('acompanhamento desligado pelo dono: não busca dados, não agenda e diz isso no instantâneo', async () => {
  let calls = 0;
  const history = {
    load: async () => {
      calls++;
      throw new Error('não deveria buscar');
    },
  };
  const t = new ForwardMomentumTracker(history as never, () => Date.UTC(2026, 9, 10, 12), false);
  t.start();
  const s = t.snapshot();
  assert.equal(s.status, 'DISABLED');
  assert.equal(s.verdict, 'CLOSED_BY_OWNER');
  assert.equal(s.nextDecisionAt, null);
  assert.equal(s.equity, null);
  assert.equal(s.error, null);
  assert.equal((await t.refresh()).status, 'DISABLED');
  assert.equal(calls, 0);
  t.stop();
});
