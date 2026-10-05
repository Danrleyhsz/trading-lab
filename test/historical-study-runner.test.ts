import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HistoricalStudyRunner } from '../src/application/historical-study-runner.js';
import { walkForwardPerpetual } from '../src/domain/perpetual-walk-forward.js';
import type { PerpetualConfig, PerpetualDataset } from '../src/domain/perpetual-backtest.js';
const data = (n = 300): PerpetualDataset => { const trade = Array.from({ length: n }, (_, i) => { const price = 100 + Math.sin(i / 7) * 12 + i / 40; return { timestamp: i * 3600000, open: price, high: price + 3, low: price - 3, close: price + Math.sin(i), volume: 1 }; }); return { instrument: 'BINANCE_USDM:BTCUSDT', trade, mark: structuredClone(trade), funding: Array.from({ length: Math.floor(n / 8) }, (_, i) => ({ timestamp: i * 8 * 3600000, rate: i % 2 ? 0.0001 : -0.0001, markPrice: trade[i * 8].open })) }; };
const base: PerpetualConfig = { initialCapital: 10000, feeRate: 0.00055, slippageBps: 1, maintenanceRate: 0.01, liquidationFeeRate: 0.005, positionFraction: 0.1, fastPeriod: 10, slowPeriod: 30 };
const candidates = [base, { ...base, fastPeriod: 20, slowPeriod: 60 }, { ...base, fastPeriod: 5, slowPeriod: 20 }, { ...base, strategy: 'BREAKOUT' as const }, { ...base, strategy: 'MEAN_REVERSION' as const }];
const fixture = (name: string) => new URL(`./fixtures/historical-worker-${name}.${import.meta.url.endsWith('.ts') ? 'ts' : 'js'}`, import.meta.url);
test('isolated historical worker preserves every fold, funding, risk proposal and hash exactly', async () => {
    const input = data();
    const expected = walkForwardPerpetual(input, candidates, 100, 50);
    const result = await new HistoricalStudyRunner().run(input, candidates, 100, 50);
    assert.deepEqual(result, expected);
    assert.equal(result.automaticPaperApproval, false);
    assert.ok(result.folds.some(f => f.result.audit.some(e => e.kind === 'PROPOSAL')));
    assert.ok(result.folds.some(f => f.result.audit.some(e => e.kind === 'FUNDING')));
});
test('worker snapshots submitted inputs and refuses overlap until the previous worker has exited', async () => {
    const runner = new HistoricalStudyRunner(), input = data(), configs = structuredClone(candidates), expected = walkForwardPerpetual(input, configs, 100, 50);
    const running = runner.run(input, configs, 100, 50);
    input.trade[0].close = 999;
    configs[0].feeRate = 0.5;
    await assert.rejects(runner.run(data(), candidates, 100, 50), /busy/);
    assert.deepEqual(await running, expected);
    assert.deepEqual(await runner.run(data(), candidates, 100, 50), walkForwardPerpetual(data(), candidates, 100, 50));
});
test('historical workload limits and discontinuous evidence fail before computation', async () => {
    const runner = new HistoricalStudyRunner();
    await assert.rejects(runner.run(data(5001), candidates, 100, 50), /limits/);
    await assert.rejects(runner.run(data(), [...candidates, base], 100, 50), /limits/);
    await assert.rejects(runner.run(data(), candidates, 99, 50), /limits/);
    const broken = data();
    broken.mark[1].timestamp += 1;
    await assert.rejects(runner.run(broken, candidates, 100, 50), /candles/);
    assert.throws(() => new HistoricalStudyRunner(20001), /timeout/);
});
test('a CPU-bound worker cannot block parent timers, and timeout joins termination before reuse', async () => {
    const runner = new HistoricalStudyRunner(1200, fixture('stall'));
    let parentTimerFired = false;
    const timer = setTimeout(() => { parentTimerFired = true; }, 20);
    const running = assert.rejects(runner.run(data(), candidates, 100, 50), /timed out/);
    await running;
    clearTimeout(timer);
    assert.equal(parentTimerFired, true);
    await assert.rejects(runner.run(data(), candidates, 100, 50), /timed out/);
});
test('worker crashes and exits retain failure without accepting partial or fake results', async () => {
    await assert.rejects(new HistoricalStudyRunner(10000, fixture('error')).run(data(), candidates, 100, 50), /worker failed/);
    await assert.rejects(new HistoricalStudyRunner(10000, fixture('exit')).run(data(), candidates, 100, 50), /without a result/);
    await assert.rejects(new HistoricalStudyRunner(10000, fixture('invalid')).run(data(), candidates, 100, 50), /invalid historical worker result/);
});
test('the cloud-sized 5000-bar workload runs while the parent remains responsive', async () => {
    let ticks = 0;
    const timer = setInterval(() => { ticks++; }, 5);
    try {
        const input = data(5000);
        const result = await new HistoricalStudyRunner().run(input, candidates, 400, 100);
        assert.equal(result.folds.length, 46);
        assert.equal(result.datasetHash, walkForwardPerpetual(input, [base], 4900, 100).datasetHash);
        assert.ok(ticks > 0);
        assert.equal(result.automaticPaperApproval, false);
    }
    finally {
        clearInterval(timer);
    }
});

test('worker inherits no runtime secrets or unrelated environment in development and compiled cloud paths',async()=>{
 const previous=process.env.TRADING_LAB_TEST_WORKER_SECRET;process.env.TRADING_LAB_TEST_WORKER_SECRET='fixture-only-not-a-real-key';try{const input=data();assert.deepEqual(await new HistoricalStudyRunner(10000,fixture('environment')).run(input,candidates,100,50),walkForwardPerpetual(input,candidates,100,50));}finally{if(previous===undefined)delete process.env.TRADING_LAB_TEST_WORKER_SECRET;else process.env.TRADING_LAB_TEST_WORKER_SECRET=previous;}
});
