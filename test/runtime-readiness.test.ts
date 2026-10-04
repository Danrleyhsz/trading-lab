import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { RuntimeReadiness, registerRuntimeReadiness, type RuntimeInputs } from '../src/application/runtime-readiness.js';
import { registerAccessControl } from '../src/application/access-control.js';
import { PerpetualPaperBook } from '../src/application/perpetual-paper-book.js';
import { EventBus } from '../src/application/event-bus.js';
import { AiAnalysis } from '../src/application/ai-analysis.js';
import { PERPETUAL_INSTRUMENT, type PerpetualQuote } from '../src/domain/perpetual-market.js';
const start = Date.parse('2026-10-03T04:00:00Z');
const quote = (now: number): PerpetualQuote => ({ instrument: PERPETUAL_INSTRUMENT, symbol: 'BTCUSDT', bid: 100, ask: 101, markPrice: 100, indexPrice: 100, fundingRate: 0.001, nextFundingTime: start + 3600000, bookTime: now, markTime: now, receivedAt: now });
function monitor(options: {
    production?: boolean;
    storage?: 'POSTGRESQL' | 'JSON_DEVELOPMENT';
    protectedAccess?: boolean;
    httpsOrigin?: boolean;
} = {}) {
    let now = start, available = true;
    const runtime = new RuntimeReadiness({ production: true, storage: 'POSTGRESQL', protectedAccess: true, httpsOrigin: true, storageAvailable: () => available, ...options }, () => now);
    return { runtime, setNow: (value: number) => { now = value; }, setAvailable: (value: boolean) => { available = value; }, ready: () => { runtime.writeQueued(); runtime.writeSucceeded(); runtime.serving(); } };
}
async function inputs(): Promise<RuntimeInputs> {
    const book = new PerpetualPaperBook(new EventBus(), undefined, () => start);
    book.ensureEvaluation('nova', 1000);
    await book.synchronize(quote(start), [], async () => { });
    return { spot: { symbol: 'BTCUSDT', price: 100, timestamp: start, exchange: 'binance' }, perpetual: { status: 'HEALTHY', quote: quote(start), consecutiveFailures: 0 }, book: book.status(), autonomous: { enabled: false, studyId: null, busy: false, error: null, eligible: false, reason: 'completed V2 study required', accountId: 'evaluation:nova:usdm', lastProcessedCandle: null, blockedReason: null, stopReason: null, maxLossFraction: 0.03, lastAttemptFailed: false, nextAttemptAt: null }, research: { busy: false, accepting: true }, historical: { busy: false, accepting: true, persistenceFailed: false, activeTasks: 0, interruptedStudies: 0 }, ai: new AiAnalysis(async () => { }, [], undefined, undefined, () => start).status(), legacyExecutionEnabled: false, evaluationEnabled: false, perpetualEnabled: false };
}
test('runtime readiness requires initial durable state and preserves restart-local observations', () => {
    const h = monitor();
    assert.ok(h.runtime.control().reasons.includes('INITIAL_PERSISTENCE_PENDING'));
    assert.equal(h.runtime.control().storage.lastPersistedAt, null);
    h.runtime.writeQueued();
    assert.equal(h.runtime.control().storage.pendingWrites, 1);
    h.runtime.writeSucceeded();
    assert.equal(h.runtime.control().ready, false);
    h.runtime.serving();
    assert.equal(h.runtime.control().ready, true);
    assert.equal(h.runtime.control().storage.pendingWrites, 0);
    assert.equal(monitor().runtime.control().storage.lastPersistedAt, null);
    assert.throws(() => h.runtime.writeSucceeded(), /unmatched/);
});
test('database failures, recovery and clock rollback report actual writes without exposing error text', () => {
    const h = monitor();
    h.ready();
    h.runtime.writeQueued();
    h.runtime.writeFailed();
    assert.equal(h.runtime.control().ready, false);
    assert.equal(h.runtime.control().storage.persistenceFailed, true);
    h.setNow(start + 1);
    h.runtime.writeQueued();
    h.runtime.writeSucceeded();
    assert.equal(h.runtime.control().ready, true);
    assert.equal(h.runtime.control().storage.lastPersistenceFailureAt, new Date(start).toISOString());
    h.setAvailable(false);
    assert.ok(h.runtime.control().reasons.includes('STORAGE_UNAVAILABLE'));
    h.setAvailable(true);
    h.setNow(start - 1);
    assert.ok(h.runtime.control().reasons.includes('CLOCK_ROLLBACK'));
});
test('production readiness cannot advertise JSON, missing protection or HTTP as cloud ready', () => {
    for (const config of [{ storage: 'JSON_DEVELOPMENT' as const }, { protectedAccess: false }, { httpsOrigin: false }]) {
        const h = monitor(config);
        h.ready();
        assert.equal(h.runtime.control().ready, false);
    }
    const development = monitor({ production: false, storage: 'JSON_DEVELOPMENT', protectedAccess: false, httpsOrigin: false });
    development.ready();
    assert.equal(development.runtime.control().ready, true);
    assert.equal(development.runtime.control().environment, 'DEVELOPMENT');
});
test('a healthy control plane does not imply enabled paper, autonomous work, AI calls or risk approval', async () => {
    const h = monitor();
    h.ready();
    const input = await inputs(), snapshot = h.runtime.snapshot(input);
    assert.equal(snapshot.controlPlaneReady, true);
    assert.equal(snapshot.paper.submission.ready, false);
    assert.ok(snapshot.paper.submission.reasons.includes('PERPETUAL_EXECUTION_DISABLED'));
    assert.equal(snapshot.paper.autonomous.ready, false);
    assert.equal(snapshot.ai.enabled, false);
    assert.equal(snapshot.ai.auditRecords, 0);
    assert.equal(snapshot.paper.riskApprovalRequired, true);
    assert.equal(snapshot.paper.evaluationCapitalIncludedInFund, false);
    assert.equal(snapshot.hostingVerification, 'NOT_PERFORMED_BY_RUNTIME');
});
test('stale/future quotes and a source failure block paper while read-only cloud diagnostics stay available', async () => {
    const h = monitor();
    h.ready();
    const input = await inputs();
    input.perpetualEnabled = true;
    assert.equal(h.runtime.snapshot(input).paper.submission.ready, true);
    input.perpetual.status = 'UNAVAILABLE';
    assert.equal(h.runtime.snapshot(input).paper.submission.ready, false);
    assert.equal(h.runtime.snapshot(input).controlPlaneReady, true);
    input.perpetual.status = 'HEALTHY';
    h.setNow(start + 15001);
    assert.equal(h.runtime.snapshot(input).market.perpetual.fresh, false);
    assert.equal(h.runtime.snapshot(input).paper.submission.ready, false);
    h.setNow(start);
    input.perpetual.quote = { ...quote(start), receivedAt: start + 5001 };
    assert.equal(h.runtime.snapshot(input).paper.submission.ready, false);
    input.perpetual.quote = quote(start);
    h.setNow(start + 60001);
    input.legacyExecutionEnabled = true;
    assert.ok(h.runtime.snapshot(input).paper.legacySubmission.reasons.includes('SPOT_QUOTE_NOT_READY'));
});
test('funding publication blocks submissions; a halt keeps reducing orders behind deterministic risk', async () => {
    let now = start;
    const bus = new EventBus(), book = new PerpetualPaperBook(bus, undefined, () => now), account = book.ensureEvaluation('nova', 1000);
    const q = { ...quote(start), nextFundingTime: start + 2000 };
    await book.synchronize(q, [], async () => { });
    const h = monitor();
    h.ready();
    const input = await inputs();
    input.perpetualEnabled = true;
    await book.propose(account, 'BUY', 1, async () => { });
    await book.halt(true, async () => { });
    input.book = book.status();
    let report = h.runtime.snapshot(input);
    assert.equal(report.paper.submission.ready, true);
    assert.ok(report.paper.newExposure.reasons.includes('NEW_EXPOSURE_HALTED'));
    assert.equal((await book.propose(account, 'SELL', 1, async () => { })).status, 'filled');
    now = start + 3000;
    h.setNow(now);
    input.book = book.status();
    report = h.runtime.snapshot(input);
    assert.equal(report.paper.funding.ready, false);
    assert.ok(report.paper.submission.reasons.includes('FUNDING_RECONCILIATION_PENDING'));
    await assert.rejects(book.propose(account, 'BUY', 1, async () => { }), /funding reconciliation pending/);
});
test('autonomous readiness requires an actual independent account, eligible study and idle cycle', async () => {
    const h = monitor();
    h.ready();
    const input = await inputs();
    input.perpetualEnabled = true;
    input.autonomous = { ...input.autonomous, enabled: true, eligible: true, studyId: 'TEST_FIXTURE_ELIGIBLE' };
    assert.equal(h.runtime.snapshot(input).paper.autonomous.ready, true);
    input.book.autonomousAccountExists = false;
    assert.ok(h.runtime.snapshot(input).paper.autonomous.reasons.includes('NOVA_ACCOUNT_UNAVAILABLE'));
    input.book.autonomousAccountExists = true;
    input.autonomous.busy = true;
    assert.ok(h.runtime.snapshot(input).paper.autonomous.reasons.includes('AUTONOMOUS_BUSY'));
    input.autonomous.busy = false;
    input.autonomous.eligible = false;
    assert.ok(h.runtime.snapshot(input).paper.autonomous.reasons.includes('STUDY_NOT_ELIGIBLE'));
});
test('public health is minimal and private diagnostics/mutations retain authentication and drain gates', async () => {
    const h = monitor(), input = await inputs(), app = Fastify(), token = 'test-only-code-at-least-32-characters';
    registerAccessControl(app, token, true, 'https://example.test');
    registerRuntimeReadiness(app, h.runtime, () => input);
    let mutations = 0;
    app.post('/work', async () => { mutations++; return { ok: true }; });
    try {
        assert.equal((await app.inject('/health/live')).statusCode, 200);
        assert.deepEqual((await app.inject('/health/ready')).json(), { ok: false, mode: 'PAPER_TRADING' });
        assert.equal((await app.inject('/health/ready')).statusCode, 503);
        assert.equal((await app.inject('/runtime/readiness')).statusCode, 401);
        assert.equal((await app.inject('/health/ready/private')).statusCode, 401);
        h.ready();
        assert.equal((await app.inject('/health/ready')).statusCode, 200);
        assert.equal((await app.inject({ method: 'POST', url: '/work', headers: { authorization: 'Bearer ' + token } })).statusCode, 200);
        h.runtime.draining();
        assert.equal((await app.inject('/health/live')).statusCode, 200);
        assert.equal((await app.inject('/health/ready')).statusCode, 503);
        assert.equal((await app.inject({ method: 'POST', url: '/work', headers: { authorization: 'Bearer ' + token } })).statusCode, 503);
        assert.equal(mutations, 1);
        const report = (await app.inject({ url: '/runtime/readiness', headers: { authorization: 'Bearer ' + token } })).json();
        assert.equal(report.phase, 'DRAINING');
        assert.equal(report.controlPlaneReady, false);
        assert.equal(JSON.stringify(report).includes(token), false);
        assert.equal((await app.inject({ method: 'POST', url: '/auth/login', payload: { accessToken: token } })).statusCode, 200);
        assert.throws(() => h.runtime.serving(), /cannot resume/);
        h.runtime.stopped();
        assert.equal(h.runtime.control().phase, 'STOPPED');
    }
    finally {
        await app.close();
    }
});
