import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStateStore } from '../src/infrastructure/json-state-store.js';
import { assertAppendOnly } from '../src/infrastructure/postgres-state-store.js';
import { validatePerpetualDataset, type PerpetualDataset } from '../src/domain/perpetual-backtest.js';
import type { StoredState } from '../src/domain/storage.js';
const trade = Array.from({ length: 300 }, (_, i) => ({ timestamp: i * 3600000, open: 100, high: 100, low: 100, close: 100, volume: 1 }));
const dataset: PerpetualDataset = { instrument: 'BINANCE_USDM:BTCUSDT', trade, mark: structuredClone(trade), funding: [] };
const state: StoredState = { agents: [], memories: [], perpetualStudies: [{ id: 'test-study', status: 'RUNNING', createdAt: '2026-01-01T00:00:00Z', request: { bars: 300, trainBars: 100, testBars: 50 }, dataset, datasetHash: validatePerpetualDataset(dataset) }] };
test('JSON and PostgreSQL guards pin a running study identity, dataset and hash before completion', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'historical-audit-'));
    try {
        const store = new JsonStateStore(join(directory, 'state.json'));
        await store.save(state);
        const changes: ((next: StoredState) => void)[] = [next => { next.perpetualStudies = []; }, next => { next.perpetualStudies![0].request.trainBars = 101; }, next => { next.perpetualStudies![0].createdAt = '2026-02-01'; }, next => { next.perpetualStudies![0].dataset!.trade[0].close = 200; }, next => { delete next.perpetualStudies![0].dataset; }, next => { next.perpetualStudies![0].datasetHash = 'invented'; }];
        for (const mutate of changes) {
            const rewritten = structuredClone(state);
            mutate(rewritten);
            assert.throws(() => assertAppendOnly(state, rewritten), /study/);
            await assert.rejects(store.save(rewritten), /study/);
            assert.deepEqual(await store.load(), state);
        }
        const interrupted = structuredClone(state);
        Object.assign(interrupted.perpetualStudies![0], { status: 'INTERRUPTED', error: 'server restarted before completion' });
        assert.doesNotThrow(() => assertAppendOnly(state, interrupted));
        await store.save(interrupted);
        const rewrite = structuredClone(interrupted);
        rewrite.perpetualStudies![0].status = 'COMPLETED';
        assert.throws(() => assertAppendOnly(interrupted, rewrite), /study/);
        await assert.rejects(store.save(rewrite), /study/);
        assert.deepEqual(await new JsonStateStore(join(directory, 'state.json')).load(), interrupted);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
