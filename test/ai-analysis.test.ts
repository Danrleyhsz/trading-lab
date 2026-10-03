import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AiAnalysis, DISABLED_AI_POLICY, registerAiStatus, type AiPolicy, type AnalyticalProvider } from '../src/application/ai-analysis.js';
import { hash, validateAiLedger, usagePrice, type AiPrice, type AiRecord, type AiResponse } from '../src/domain/ai-analysis.js';
import { assertAppendOnly } from '../src/infrastructure/postgres-state-store.js';
import { JsonStateStore } from '../src/infrastructure/json-state-store.js';
// Synthetic prices/responses are test fixtures only; no production provider or paid call exists.
const price: AiPrice = { provider: 'TEST_ONLY', model: 'fixture-text', version: 'fixture-v1', currency: 'USD', inputMicrousdPerMillion: 2000000, outputMicrousdPerMillion: 5000000 };
const policy: AiPolicy = { enabled: true, globalDailyMicrousd: 1000, agentDailyMicrousd: 500, globalDailyRequests: 10, agentDailyRequests: 5, maxInputTokens: 100, maxOutputTokens: 20, timeoutMs: 1000 };
const request = { key: 'source-1', agentId: 'atlas' as const, question: 'Explain the retained evidence', evidence: { sourceId: 'research:fixture-only', text: 'TEST FIXTURE: observed spread' } };
const reply = (): AiResponse => ({ providerRequestId: 'fixture-' + Math.random(), model: price.model, text: 'Test advisory only', usage: { inputTokens: 8, outputTokens: 4 } });
function harness(options: {
    policy?: AiPolicy;
    analyze?: AnalyticalProvider['analyze'];
    persist?: (ledger: AiRecord[]) => Promise<void>;
    records?: AiRecord[];
    clock?: () => number;
} = {}) {
    let durable: AiRecord[] = structuredClone(options.records ?? []), calls = 0;
    const provider: AnalyticalProvider = { price: { ...price }, countInput: () => 10, analyze: async (input, limits) => { calls++; return options.analyze ? options.analyze(input, limits) : reply(); } };
    const ai = new AiAnalysis(async (ledger) => { await options.persist?.(ledger); durable = structuredClone(ledger); }, durable, options.policy ?? { ...policy }, provider, options.clock ?? (() => Date.parse('2026-10-03T01:00:00Z')));
    return { ai, provider, calls: () => calls, durable: () => structuredClone(durable) };
}
test('AI is disabled without a provider, with zero budget and no public submission endpoint', async () => {
    let saves = 0;
    const ai = new AiAnalysis(async () => { saves++; });
    await assert.rejects(ai.analyze(request), /DISABLED/);
    assert.equal(saves, 0);
    const app = Fastify();
    registerAiStatus(app, ai);
    try {
        const status = (await app.inject('/ai/status')).json();
        assert.equal(status.enabled, false);
        assert.equal(status.providerConfigured, false);
        assert.equal(status.executionAuthority, false);
        assert.equal(status.global.spentMicrousd, 0);
        assert.equal(status.price, null);
        assert.equal((await app.inject({ method: 'POST', url: '/ai/analyze', payload: request })).statusCode, 404);
    }
    finally {
        await app.close();
    }
    assert.throws(() => new AiAnalysis(async () => { }, [], { ...policy }, undefined), /explicit provider/);
});
test('a durable reservation precedes the provider, and only reported usage settles a price ceiling', async () => {
    let h: ReturnType<typeof harness>;
    h = harness({ analyze: async (input, limits) => { assert.equal(h.durable().length, 1); assert.equal(h.durable()[0].kind, 'RESERVED'); assert.equal(input.evidence.sha256, hash(request.evidence.text)); assert.equal(limits.maxOutputTokens, 20); assert.equal('broker' in limits, false); return reply(); } });
    const record = await h.ai.analyze(request);
    assert.equal(record.usagePricedMicrousd, 36);
    assert.equal(h.ai.status().global.heldMicrousd, 0);
    assert.equal(h.ai.status().global.spentMicrousd, 36);
    const external = h.ai.exportLedger();
    external.length = 0;
    assert.equal(h.ai.exportLedger().length, 2);
    await h.ai.analyze(request);
    assert.equal(h.calls(), 1);
    await assert.rejects(h.ai.analyze({ ...request, question: 'different' }), /IDEMPOTENCY_CONFLICT/);
    h.provider.price.version = 'changed externally';
    assert.equal(h.ai.status().price?.version, 'fixture-v1');
});
test('global and per-agent caps serialize concurrent attempts and remain independent of account capital', async () => {
    const h = harness({ policy: { ...policy, globalDailyMicrousd: 120, agentDailyMicrousd: 120 } });
    const results = await Promise.allSettled([h.ai.analyze(request), h.ai.analyze({ ...request, key: 'source-2', agentId: 'euler' })]);
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'rejected');
    assert.equal(h.calls(), 1);
    const independent = harness({ policy: { ...policy, globalDailyMicrousd: 500, agentDailyMicrousd: 120 } });
    await independent.ai.analyze(request);
    await assert.rejects(independent.ai.analyze({ ...request, key: 'source-2' }), /BUDGET_EXHAUSTED/);
    await independent.ai.analyze({ ...request, key: 'source-3', agentId: 'euler' });
    assert.equal(independent.calls(), 2);
});
test('provider failure retains its reservation across restart and midnight without paid retries', async () => {
    let now = Date.parse('2026-10-03T23:59:00Z');
    const h = harness({ policy: { ...policy, globalDailyMicrousd: 120, agentDailyMicrousd: 120 }, clock: () => now, analyze: async () => { throw Error('unknown provider charge; secret must not enter audit'); } });
    await assert.rejects(h.ai.analyze(request), /PROVIDER_FAILED/);
    assert.equal(h.ai.status().global.heldMicrousd, 120);
    assert.equal(JSON.stringify(h.durable()).includes('secret'), false);
    now += 120000;
    const restarted = harness({ records: h.durable(), clock: () => now, policy: { ...policy, globalDailyMicrousd: 120, agentDailyMicrousd: 120 } });
    await assert.rejects(restarted.ai.analyze(request), /OUTSTANDING_ATTEMPT/);
    await assert.rejects(restarted.ai.analyze({ ...request, key: 'new-day' }), /BUDGET_EXHAUSTED/);
    assert.equal(restarted.calls(), 0);
});
test('failed reservation persistence prevents any call; failed settlement persistence holds already attempted cost', async () => {
    const initial = harness({ persist: async () => { throw Error('disk unavailable'); } });
    await assert.rejects(initial.ai.analyze(request), /PERSISTENCE_UNAVAILABLE/);
    assert.equal(initial.calls(), 0);
    assert.equal(initial.ai.status().persistenceBlocked, true);
    const settlement = harness({ persist: async (ledger) => { if (ledger.length === 2)
            throw Error('db unavailable'); } });
    await assert.rejects(settlement.ai.analyze(request), /PERSISTENCE_UNAVAILABLE/);
    assert.equal(settlement.calls(), 1);
    assert.equal(settlement.durable().length, 1);
    assert.equal(settlement.ai.status().global.heldMicrousd, 120);
    await assert.rejects(settlement.ai.analyze({ ...request, key: 'later' }), /PERSISTENCE_UNAVAILABLE/);
    const restart = harness({ records: settlement.durable() });
    await assert.rejects(restart.ai.analyze(request), /OUTSTANDING_ATTEMPT/);
    assert.equal(restart.calls(), 0);
});
test('invalid/over-cap usage, unsupported billing and model changes never create a fake settlement', async () => {
    for (const response of [{ ...reply(), usage: { inputTokens: 11, outputTokens: 4 } }, { ...reply(), usage: { inputTokens: 8, outputTokens: 21 } }, { ...reply(), model: 'unapproved-model' }, { ...reply(), usage: { inputTokens: 8, outputTokens: 4, extraCharge: 1 } }, { ...reply(), usage: { inputTokens: NaN, outputTokens: 4 } }]) {
        const h = harness({ analyze: async () => response });
        await assert.rejects(h.ai.analyze(request), /INVALID_RESPONSE/);
        assert.equal(h.ai.status().global.heldMicrousd, 120);
        assert.equal(h.ai.status().global.spentMicrousd, 0);
        assert.equal(h.durable()[1].kind, 'UNRESOLVED');
    }
});
test('bounded provider timeout aborts the attempt and holds unknown cost', async () => {
    let aborted = false;
    const h = harness({ policy: { ...policy, timeoutMs: 100 }, analyze: async (_input, { signal }) => new Promise((_, reject) => { signal.addEventListener('abort', () => { aborted = true; reject(Error('aborted')); }); }) });
    await assert.rejects(h.ai.analyze(request), /TIMEOUT/);
    assert.equal(aborted, true);
    assert.equal(h.ai.status().global.heldMicrousd, 120);
    assert.equal(h.durable()[1].kind, 'UNRESOLVED');
});
test('clock rollback and input/request limits prevent calls; completed usage belongs to reservation UTC day', async () => {
    let now = Date.parse('2026-10-03T23:59:00Z');
    const h = harness({ clock: () => now, policy: { ...policy, globalDailyRequests: 1 }, analyze: async () => { now += 120000; return reply(); } });
    await h.ai.analyze(request);
    assert.equal(h.ai.status().global.spentMicrousd, 0);
    now = Date.parse('2026-10-03T23:58:00Z');
    await assert.rejects(h.ai.analyze({ ...request, key: 'backwards' }), /CLOCK_ROLLBACK/);
    assert.equal(h.calls(), 1);
    const inputs = harness({ policy: { ...policy, maxInputTokens: 9 } });
    await assert.rejects(inputs.ai.analyze(request), /INPUT_LIMIT/);
    assert.equal(inputs.calls(), 0);
    const counts = harness({ policy: { ...policy, globalDailyRequests: 1 } });
    await counts.ai.analyze(request);
    await assert.rejects(counts.ai.analyze({ ...request, key: 'extra' }), /BUDGET_EXHAUSTED/);
    assert.equal(counts.calls(), 1);
    assert.throws(() => new AiAnalysis(async () => { }, [], { ...policy, agentDailyMicrousd: 0 }, h.provider), /positive budgets/);
});
test('AI audit rejects rewriting evidence, usage, attribution, chronology or reservations in PostgreSQL and JSON', async () => {
    const h = harness();
    await h.ai.analyze(request);
    const records = h.durable();
    assert.doesNotThrow(() => validateAiLedger(records));
    const tampered = structuredClone(records);
    if (tampered[0].kind === 'RESERVED')
        tampered[0].input.evidence.text = 'rewritten';
    assert.throws(() => validateAiLedger(tampered));
    const usage = structuredClone(records);
    if (usage[1].kind === 'SETTLED')
        usage[1].usagePricedMicrousd = 0;
    assert.throws(() => validateAiLedger(usage));
    const state = { agents: [], memories: [], aiLedger: records };
    assert.throws(() => assertAppendOnly(state, { ...state, aiLedger: [] }));
    assert.throws(() => validateAiLedger([records[1]]));
    assert.throws(() => validateAiLedger([...records, records[1]]));
    const dir = await mkdtemp(join(tmpdir(), 'trading-ai-audit-'));
    try {
        const store = new JsonStateStore(join(dir, 'state.json'));
        await store.save(state);
        await assert.rejects(store.save({ ...state, aiLedger: [] }));
        assert.deepEqual((await store.load())?.aiLedger, records);
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
});
test('micro-dollar pricing rounds conservatively without floating point overflow', () => {
    assert.equal(usagePrice({ ...price, inputMicrousdPerMillion: 1, outputMicrousdPerMillion: 1 }, 1, 1), 2);
    assert.throws(() => usagePrice({ ...price, inputMicrousdPerMillion: Number.MAX_SAFE_INTEGER }, Number.MAX_SAFE_INTEGER, 1), /overflow/);
    assert.equal(DISABLED_AI_POLICY.globalDailyMicrousd, 0);
});
test('queued requests snapshot evidence and expose only recorded read-only audit detail', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const h = harness({ analyze: async () => { await gate; return reply(); } });
    const original = structuredClone(request);
    const job = h.ai.analyze(original);
    original.evidence.text = 'caller changed evidence';
    release();
    await job;
    const reservation = h.durable()[0];
    assert.equal(reservation.kind, 'RESERVED');
    if (reservation.kind === 'RESERVED')
        assert.equal(reservation.input.evidence.text, request.evidence.text);
    const app = Fastify();
    registerAiStatus(app, h.ai);
    try {
        const records = (await app.inject('/ai/analyses/' + reservation.id)).json();
        assert.equal(records.length, 2);
        records[0].input.evidence.text = 'edited UI';
        assert.equal(h.ai.exportLedger()[0].kind, 'RESERVED');
        assert.equal((await app.inject('/ai/analyses/missing')).statusCode, 404);
    }
    finally {
        await app.close();
    }
});
test('duplicate provider request identifiers remain unresolved rather than double-counting claimed usage', async () => {
    const h = harness({ analyze: async () => ({ ...reply(), providerRequestId: 'same-provider-request' }) });
    await h.ai.analyze(request);
    await assert.rejects(h.ai.analyze({ ...request, key: 'different-evidence' }), /INVALID_RESPONSE/);
    assert.equal(h.ai.status().global.spentMicrousd, 36);
    assert.equal(h.ai.status().global.heldMicrousd, 120);
});
