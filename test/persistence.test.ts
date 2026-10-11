import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStateStore } from '../src/infrastructure/json-state-store.js';
test('state survives store recreation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'trading-lab-'));
  try {
    const path = join(dir, 'state.json'),
      s = new JsonStateStore(path);
    await s.save({
      memories: [{ id: '1', agentId: 'nova', kind: 'DECISION', summary: 'paper fill', createdAt: 'now' }],
      agents: [],
    });
    const loaded = await new JsonStateStore(path).load();
    assert.equal(loaded?.memories[0]?.summary, 'paper fill');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

import { AgentRegistry } from '../src/domain/agents.js';
import { AgentMessageBus } from '../src/domain/agent-messages.js';
import { AgentActivityJournal } from '../src/domain/agent-career.js';
import { event } from '../src/domain/events.js';
import type { StoredState } from '../src/domain/storage.js';
test('messages and event-linked career history survive restart with legacy compatibility', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'trading-lab-career-'));
  try {
    const path = join(dir, 'state.json'),
      store = new JsonStateStore(path),
      agents = new AgentRegistry(),
      messages = new AgentMessageBus(),
      activity = new AgentActivityJournal();
    const next = agents.transition('atlas', 'RESEARCHING', 'Research Lab', 'observed market condition');
    const source = event('AGENT_STATE_CHANGED', next);
    activity.record(source);
    messages.send({
      from: 'atlas',
      to: ['euler'],
      kind: 'HYPOTHESIS',
      summary: 'recorded hypothesis',
      context: { symbol: 'BTCUSDT' },
    });
    const first = store.save({
      agents: agents.list(),
      memories: [],
      agentMessages: messages.list(),
      agentActivity: activity.list(),
    });
    const second = store.save({
      agents: agents.list(),
      memories: [{ id: 'later', agentId: 'atlas', kind: 'OBSERVATION', summary: 'later evidence', createdAt: 'now' }],
      agentMessages: messages.list(),
      agentActivity: activity.list(),
    });
    await Promise.all([first, second]);
    const restored = await new JsonStateStore(path).load();
    const restoredMessages = new AgentMessageBus(),
      restoredActivity = new AgentActivityJournal();
    restoredMessages.hydrate(restored?.agentMessages ?? []);
    restoredActivity.hydrate(restored?.agentActivity ?? []);
    assert.equal(restored?.memories[0]?.id, 'later');
    assert.equal(restoredMessages.list('euler')[0]?.summary, 'recorded hypothesis');
    assert.equal(restoredActivity.list('atlas')[0]?.eventId, source.id);
    const external = restoredMessages.list();
    external[0]!.context.symbol = 'changed';
    assert.equal(restoredMessages.list()[0]?.context.symbol, 'BTCUSDT');
    // Um snapshot legado (sem agentActivity) é lido normalmente; gravá-lo por cima do histórico seria apagar histórico.
    const legacyStore = new JsonStateStore(join(dir, 'legacy.json'));
    await legacyStore.save({ agents: agents.list(), memories: [] });
    const legacy = await legacyStore.load();
    assert.equal(legacy?.agentActivity, undefined);
    await assert.rejects(store.save({ agents: agents.list(), memories: [] }), /deletion or rewrite/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// O store de JSON (desenvolvimento e testes) roda as mesmas checagens de "só cresce" do PostgreSQL (assertAppendOnly).
const base = (): StoredState => ({
  agents: [],
  memories: [
    { id: 'm1', agentId: 'nova', kind: 'FAILURE', summary: 'actual failure', createdAt: '2026-01-01T00:00:00Z' },
  ],
  domainEvents: [event('PAPER_CONTROL_CHANGED', { halted: true })],
});
test('JSON store rejects rewriting an old domain event, rewriting an old memory and deleting history, but accepts appends', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'trading-lab-append-only-'));
  try {
    const path = join(dir, 'state.json'),
      store = new JsonStateStore(path),
      first = base();
    await store.save(first);
    const rewrittenEvent = structuredClone(first);
    (rewrittenEvent.domainEvents![0].payload as { halted: boolean }).halted = false;
    await assert.rejects(store.save(rewrittenEvent), /historical record deletion or rewrite rejected/);
    const rewrittenMemory = structuredClone(first);
    rewrittenMemory.memories[0].summary = 'pretend success';
    await assert.rejects(store.save(rewrittenMemory), /historical record deletion or rewrite rejected/);
    const deletedMemory = structuredClone(first);
    deletedMemory.memories = [];
    await assert.rejects(store.save(deletedMemory), /historical record deletion or rewrite rejected/);
    const deletedEvent = structuredClone(first);
    deletedEvent.domainEvents = [];
    await assert.rejects(store.save(deletedEvent), /historical record deletion or rewrite rejected/);
    assert.deepEqual(await store.load(), first, 'every rejected write left the file untouched');
    const appended = structuredClone(first);
    appended.domainEvents!.push(event('PAPER_CONTROL_CHANGED', { halted: false }));
    appended.memories.push({
      id: 'm2',
      agentId: 'nova',
      kind: 'DECISION',
      summary: 'later',
      createdAt: '2026-01-02T00:00:00Z',
    });
    await store.save(appended);
    assert.deepEqual(await store.load(), appended);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
