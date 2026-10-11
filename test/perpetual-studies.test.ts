import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  PerpetualStudies,
  registerPerpetualStudies,
  studyCandidates,
  STUDY_CANDIDATE_SETS,
} from '../src/application/perpetual-studies.js';
import { screenPerpetualStudy } from '../src/application/perpetual-study-screen.js';
import { AgentRegistry } from '../src/domain/agents.js';
import { AgentCoordinator } from '../src/application/agent-coordinator.js';
import { EventBus } from '../src/application/event-bus.js';
import { walkForwardPerpetual } from '../src/domain/perpetual-walk-forward.js';
import type { PerpetualDataset } from '../src/domain/perpetual-backtest.js';
const data = (n: number): PerpetualDataset => {
  const trade = Array.from({ length: n }, (_, i) => ({
    timestamp: i * 3600000,
    open: 100 + i,
    high: 100 + i,
    low: 100 + i,
    close: 100 + i,
    volume: 1,
  }));
  return { instrument: 'BINANCE_USDM:BTCUSDT', trade, mark: structuredClone(trade), funding: [] };
};
const cfg = {
  initialCapital: 1000,
  feeRate: 0.001,
  slippageBps: 0,
  maintenanceRate: 0.01,
  liquidationFeeRate: 0.005,
  positionFraction: 0.1,
  fastPeriod: 2,
  slowPeriod: 5,
};
test('walk-forward selects before test observations and includes warmup without opening positions there', () => {
  const a = data(60),
    b = structuredClone(a);
  for (let i = 30; i < 60; i++)
    for (const series of [b.trade, b.mark]) {
      series[i].close = 500 + i;
      series[i].open = 500 + i;
      series[i].high = 500 + i;
      series[i].low = 500 + i;
    }
  const run = (d: PerpetualDataset) => walkForwardPerpetual(d, [cfg, { ...cfg, fastPeriod: 3, slowPeriod: 8 }], 30, 10);
  const x = run(a),
    y = run(b);
  assert.equal(x.folds[0].selectedCandidate, y.folds[0].selectedCandidate);
  assert.equal(x.folds[0].trainingNetPnl, y.folds[0].trainingNetPnl);
  assert.equal(x.folds.length, 3);
  assert.ok(x.folds[0].result.audit.filter((e) => e.kind === 'FILL').every((e) => e.timestamp >= x.folds[0].testStart));
  assert.equal(x.automaticPaperApproval, false);
});
test('study API rejects claimed results, retains source failures and emits no paper execution', async () => {
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus),
    events: string[] = [];
  bus.subscribe((e) => events.push(e.type));
  const studies = new PerpetualStudies({
    load: async () => {
      throw new Error('source unavailable');
    },
  });
  const app = Fastify();
  registerPerpetualStudies(app, studies, async () => {}, coordinator, bus);
  try {
    assert.equal(
      (await app.inject({ method: 'POST', url: '/backtests/v2/studies', payload: { result: { netPnl: 123 } } }))
        .statusCode,
      400,
    );
    const response = await app.inject({
      method: 'POST',
      url: '/backtests/v2/studies',
      payload: { bars: 300, trainBars: 100, testBars: 50 },
    });
    assert.equal(response.statusCode, 202);
    await new Promise((resolve) => setImmediate(resolve));
    const record = studies.get(response.json().id)!;
    assert.equal(record.status, 'FAILED');
    assert.equal(record.result, undefined);
    assert.equal(record.error, 'source unavailable');
    assert.ok(events.includes('BACKTEST_FAILED'));
    assert.ok(!events.includes('PAPER_FILL'));
    assert.equal(coordinator.registry.get('euler')!.status, 'IDLE');
  } finally {
    await app.close();
  }
});
test('pending studies restore as interrupted rather than completed', () => {
  const studies = new PerpetualStudies({ load: async () => data(300) }, [
    { id: 'pending', status: 'RUNNING', createdAt: '2026-01-01', request: { bars: 300, trainBars: 100, testBars: 50 } },
  ]);
  assert.equal(studies.get('pending')!.status, 'INTERRUPTED');
  assert.equal(studies.get('pending')!.result, undefined);
});

test('historical drain rejects new work and waits for the active source and final durable outcome', async () => {
  let release!: (data: PerpetualDataset) => void;
  const pending = new Promise<PerpetualDataset>((resolve) => {
    release = resolve;
  });
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus),
    studies = new PerpetualStudies({ load: async () => pending });
  let retained: ReturnType<PerpetualStudies['list']> = [];
  const save = async () => {
    retained = studies.list();
  };
  const study = await studies.start({ bars: 300, trainBars: 100, testBars: 50 }, save, coordinator, bus);
  let finished = false;
  const draining = studies.drain().then(() => {
    finished = true;
  });
  assert.equal(studies.status().accepting, false);
  assert.equal(studies.status().activeTasks, 1);
  await assert.rejects(
    studies.start({ bars: 300, trainBars: 100, testBars: 50 }, save, coordinator, bus),
    /runtime draining/,
  );
  assert.equal(finished, false);
  release(data(300));
  await draining;
  assert.equal(studies.status().activeTasks, 0);
  assert.equal(studies.status().busy, false);
  assert.equal(retained.find((r) => r.id === study.id)?.status, 'COMPLETED');
  assert.equal(studies.status().persistenceFailed, false);
});
test('draining joins an initial persistence failure without inventing an accepted study', async () => {
  let rejectSave!: (error: Error) => void;
  const pending = new Promise<void>((_resolve, reject) => {
    rejectSave = reject;
  });
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus);
  let sourceCalls = 0;
  const studies = new PerpetualStudies({
    load: async () => {
      sourceCalls++;
      return data(300);
    },
  });
  const starting = studies.start({ bars: 300, trainBars: 100, testBars: 50 }, () => pending, coordinator, bus);
  const failed = assert.rejects(starting, /storage offline/);
  const draining = studies.drain();
  rejectSave(Error('storage offline'));
  await failed;
  await draining;
  assert.equal(sourceCalls, 0);
  assert.equal(studies.list().length, 0);
  assert.equal(studies.status().activeTasks, 0);
});
test('a failed final historical write drains safely and remains visible in runtime diagnostics', async () => {
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus),
    studies = new PerpetualStudies({
      load: async () => {
        throw Error('source unavailable');
      },
    });
  let saves = 0;
  await studies.start(
    { bars: 300, trainBars: 100, testBars: 50 },
    async () => {
      if (++saves === 3) throw Error('test-only database credential must stay private');
    },
    coordinator,
    bus,
  );
  await studies.drain();
  assert.equal(studies.status().persistenceFailed, true);
  assert.equal(studies.status().busy, false);
  assert.equal(studies.status().activeTasks, 0);
  assert.equal(JSON.stringify(studies.status()).includes('credential'), false);
});

test('loaded evidence is durable before simulation and drain joins simulation plus final persistence', async () => {
  let releaseSimulation!: (result: ReturnType<typeof walkForwardPerpetual>) => void;
  const simulation = new Promise<ReturnType<typeof walkForwardPerpetual>>((resolve) => {
    releaseSimulation = resolve;
  });
  let started!: () => void;
  const running = new Promise<void>((resolve) => {
    started = resolve;
  });
  let finalRelease!: () => void;
  const finalWrite = new Promise<void>((resolve) => {
    finalRelease = resolve;
  });
  let retained: ReturnType<PerpetualStudies['list']> = [];
  let saves = 0;
  const input = data(300);
  const bus = new EventBus(),
    events: string[] = [];
  bus.subscribe((e) => events.push(e.type));
  const coordinator = new AgentCoordinator(new AgentRegistry(), bus);
  const studies = new PerpetualStudies({ load: async () => input }, [], {
    run: async () => {
      assert.equal(retained[0].status, 'RUNNING');
      assert.deepEqual(retained[0].dataset, input);
      assert.match(retained[0].datasetHash!, /^[a-f0-9]{64}$/);
      started();
      return simulation;
    },
  });
  const save = async () => {
    if (++saves === 4) await finalWrite;
    retained = studies.list();
  };
  const accepted = await studies.start({ bars: 300, trainBars: 100, testBars: 50 }, save, coordinator, bus);
  await running;
  assert.equal(studies.get(accepted.id)!.status, 'RUNNING');
  assert.equal(studies.get(accepted.id)!.result, undefined);
  const interrupted = new PerpetualStudies({ load: async () => input }, retained).get(accepted.id)!;
  assert.equal(interrupted.status, 'INTERRUPTED');
  assert.deepEqual(interrupted.dataset, input);
  assert.equal(interrupted.datasetHash, retained[0].datasetHash);
  assert.equal(interrupted.result, undefined);
  let drained = false;
  const draining = studies.drain().then(() => {
    drained = true;
  });
  releaseSimulation(walkForwardPerpetual(input, [cfg], 100, 50));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(drained, false);
  assert.equal(retained[0].status, 'RUNNING');
  finalRelease();
  await draining;
  assert.equal(retained[0].status, 'COMPLETED');
  assert.equal(studies.status().activeTasks, 0);
  assert.ok(events.includes('BACKTEST_COMPLETED'));
  assert.ok(!events.includes('PAPER_FILL'));
});
test('failed evidence persistence never starts simulation and retains a truthful failure without secret details', async () => {
  let calls = 0,
    saves = 0;
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus);
  const studies = new PerpetualStudies({ load: async () => data(300) }, [], {
    run: async () => {
      calls++;
      throw Error('must not execute');
    },
  });
  let retained: ReturnType<PerpetualStudies['list']> = [];
  const accepted = await studies.start(
    { bars: 300, trainBars: 100, testBars: 50 },
    async () => {
      if (++saves === 3) throw Error('test-only private database URL');
      retained = studies.list();
    },
    coordinator,
    bus,
  );
  await studies.drain();
  const record = studies.get(accepted.id)!;
  assert.equal(calls, 0);
  assert.equal(record.status, 'FAILED');
  assert.equal(record.error, 'historical evidence persistence failed');
  assert.equal(record.result, undefined);
  assert.equal(record.dataset?.trade.length, 300);
  assert.equal(retained[0].status, 'FAILED');
  assert.equal(JSON.stringify(record).includes('private database'), false);
});
test('incomplete source history is retained as failure and cannot be simulated', async () => {
  let calls = 0;
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus);
  const studies = new PerpetualStudies({ load: async () => data(299) }, [], {
    run: async () => {
      calls++;
      throw Error('must not execute');
    },
  });
  await studies.start({ bars: 300, trainBars: 100, testBars: 50 }, async () => {}, coordinator, bus);
  await studies.drain();
  assert.equal(calls, 0);
  assert.equal(studies.list()[0].status, 'FAILED');
  assert.equal(studies.list()[0].error, 'incomplete study dataset');
  assert.equal(studies.list()[0].result, undefined);
});

import { HistoricalStudyRunner } from '../src/application/historical-study-runner.js';
import { validatePerpetualDataset } from '../src/domain/perpetual-backtest.js';
test('worker timeout retains durable input evidence and failure, with no completion or broker event', async () => {
  const bus = new EventBus(),
    events: string[] = [];
  bus.subscribe((e) => events.push(e.type));
  const coordinator = new AgentCoordinator(new AgentRegistry(), bus),
    studies = new PerpetualStudies({ load: async () => data(300) }, [], new HistoricalStudyRunner(1));
  let retained: ReturnType<PerpetualStudies['list']> = [];
  const accepted = await studies.start(
    { bars: 300, trainBars: 100, testBars: 50 },
    async () => {
      retained = studies.list();
    },
    coordinator,
    bus,
  );
  await studies.drain();
  const record = retained.find((s) => s.id === accepted.id)!;
  assert.equal(record.status, 'FAILED');
  assert.equal(record.error, 'historical simulation timed out');
  assert.equal(record.datasetHash, validatePerpetualDataset(record.dataset!));
  assert.equal(record.result, undefined);
  assert.equal(coordinator.registry.get('euler')!.status, 'IDLE');
  assert.ok(events.includes('BACKTEST_FAILED'));
  assert.ok(!events.includes('BACKTEST_COMPLETED'));
  assert.ok(!events.includes('PAPER_FILL'));
  assert.equal(studies.status().activeTasks, 0);
});

test('pre-declared candidate sets are recorded, fixed and pass the shared cost/signal screen shape', async () => {
  assert.deepEqual(Object.keys(STUDY_CANDIDATE_SETS), [
    'SHORT_HORIZON_V1',
    'MULTI_DAY_TREND_V1',
    'BREAKOUT_480_CONTROL_V1',
    'TEAM_ORACLE_REGIME_V1',
    'TEAM_VEGA_VOLATILITY_V1',
    'TEAM_SATOSHI_MOMENTUM_V1',
    'TEAM_COMBINED_V1',
    'BREAKOUT_480_PROTECTED_V1',
  ]);
  assert.equal(studyCandidates().length, 5);
  assert.deepEqual(studyCandidates(), studyCandidates('SHORT_HORIZON_V1'));
  assert.deepEqual(
    studyCandidates('MULTI_DAY_TREND_V1').map((c) => [c.strategy ?? 'SMA', c.fastPeriod, c.slowPeriod]),
    [
      ['SMA', 48, 240],
      ['SMA', 72, 480],
      ['BREAKOUT', 10, 480],
    ],
  );
  const copy = studyCandidates('MULTI_DAY_TREND_V1');
  copy[0].slowPeriod = 1;
  assert.equal(studyCandidates('MULTI_DAY_TREND_V1')[0].slowPeriod, 240);
  const seen: number[][] = [];
  const simulator = {
    run: async (d: PerpetualDataset, c: any[], train: number, test: number) => {
      seen.push(c.map((x) => x.slowPeriod));
      return walkForwardPerpetual(d, c, train, test);
    },
  };
  const bus = new EventBus(),
    coordinator = new AgentCoordinator(new AgentRegistry(), bus),
    studies = new PerpetualStudies({ load: async (n: number) => data(n) }, [], simulator as any);
  const app = Fastify();
  registerPerpetualStudies(app, studies, async () => {}, coordinator, bus);
  try {
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/backtests/v2/studies',
          payload: { bars: 900, trainBars: 400, testBars: 100, candidateSet: 'MULTI_DAY_TREND_V1' },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/backtests/v2/studies',
          payload: { bars: 900, trainBars: 500, testBars: 100, candidateSet: 'UNDECLARED' },
        })
      ).statusCode,
      400,
    );
    const response = await app.inject({
      method: 'POST',
      url: '/backtests/v2/studies',
      payload: { bars: 700, trainBars: 500, testBars: 100, candidateSet: 'MULTI_DAY_TREND_V1' },
    });
    assert.equal(response.statusCode, 202);
    for (let i = 0; i < 50 && studies.get(response.json().id)!.status !== 'COMPLETED'; i++)
      await new Promise((r) => setTimeout(r, 10));
    const study = studies.get(response.json().id)!;
    assert.equal(study.status, 'COMPLETED');
    assert.equal(study.request.candidateSet, 'MULTI_DAY_TREND_V1');
    assert.deepEqual(seen, [[240, 480, 480]]);
    assert.ok(screenPerpetualStudy(study, Date.now()).checks.find((c) => c.id === 'COMPATIBLE_SIGNAL_AND_COSTS')!.ok);
    const legacy = await app.inject({ method: 'POST', url: '/backtests/v2/studies', payload: {} });
    assert.equal(legacy.statusCode, 202);
    assert.equal(legacy.json().request.candidateSet, undefined);
  } finally {
    await app.close();
  }
});
