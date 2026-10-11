import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { AgentRegistry } from '../src/domain/agents.js';
import { MemoryStore } from '../src/domain/memory.js';
import { AgentMessageBus } from '../src/domain/agent-messages.js';
import { AgentActivityJournal, agentCareer } from '../src/domain/agent-career.js';
import { event } from '../src/domain/events.js';
import { registerAgentProfiles } from '../src/application/agent-profiles.js';

test('career retains failures and legacy gaps without inventing historical performance', () => {
  const agents = new AgentRegistry(),
    memories = new MemoryStore(),
    messages = new AgentMessageBus(),
    activity = new AgentActivityJournal();
  agents.transition('euler', 'BACKTESTING', 'Quant Lab', 'older transition');
  const state = agents.transition('euler', 'IDLE', 'Quant Lab', 'failed test retained');
  const transition = event('AGENT_STATE_CHANGED', state);
  activity.record(transition);
  activity.record(transition);
  memories.add({
    agentId: 'euler',
    kind: 'FAILURE',
    summary: 'failed backtest',
    metadata: { strategyId: 'strategy-1', netPnl: -50 },
  });
  memories.add({ agentId: 'atlas', kind: 'DECISION', summary: 'another agent' });
  const profile = agentCareer(state, memories.list(), messages.list(), activity.list());
  assert.equal(profile.evidence.failures, 1);
  assert.equal(profile.evidence.decisions, 0);
  assert.equal(profile.evidence.recordedTransitions, 1);
  assert.equal(profile.coverage.legacyTransitionsWithoutHistory, 1);
  assert.deepEqual(profile.evidence.strategyIds, ['strategy-1']);
  assert.equal(profile.performance.realizedPnl, null);
  profile.activity[0]!.state.lastReason = 'changed externally';
  assert.equal(activity.list()[0]!.state.lastReason, 'failed test retained');
});
test('profile endpoint isolates agents and returns 404 for an unknown agent', async () => {
  const app = Fastify(),
    agents = new AgentRegistry(),
    memories = new MemoryStore(),
    messages = new AgentMessageBus(),
    activity = new AgentActivityJournal();
  memories.add({ agentId: 'atlas', kind: 'OBSERVATION', summary: 'recorded hypothesis' });
  messages.send({ from: 'atlas', to: ['euler'], kind: 'HYPOTHESIS', summary: 'actual message', context: {} });
  registerAgentProfiles(app, agents, memories, messages, activity);
  try {
    const atlas = await app.inject('/agents/atlas/profile');
    assert.equal(atlas.statusCode, 200);
    assert.equal(atlas.json().evidence.observations, 1);
    assert.equal(atlas.json().evidence.sentMessages, 1);
    const nova = await app.inject('/agents/nova/profile');
    assert.equal(nova.json().memories.length, 0);
    assert.equal(nova.json().messages.length, 0);
    assert.equal((await app.inject('/agents/unknown/profile')).statusCode, 404);
  } finally {
    await app.close();
  }
});
