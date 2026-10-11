import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../src/domain/agents.js';
import { AgentActivityJournal } from '../src/domain/agent-career.js';
import { PaperAccounts } from '../src/application/paper-accounts.js';
import { EventBus } from '../src/application/event-bus.js';
test('expanded roster starts idle with no synthesized work or historical activity', () => {
  const agents = new AgentRegistry(),
    journal = new AgentActivityJournal();
  assert.equal(agents.list().length, 8);
  for (const id of ['satoshi', 'flux', 'vega', 'oracle'] as const) {
    const agent = agents.get(id)!;
    assert.equal(agent.status, 'IDLE');
    assert.equal(agent.experience, 0);
    assert.equal(agent.lastReason, undefined);
    assert.ok(agent.specialization);
    assert.equal(journal.list(id).length, 0);
  }
  const old = agents.get('atlas')!;
  old.experience = 42;
  old.lastReason = 'preserved historical reason';
  agents.hydrate([old]);
  assert.equal(agents.get('atlas')!.experience, 42);
  assert.equal(agents.get('atlas')!.lastReason, 'preserved historical reason');
  assert.equal(agents.get('satoshi')!.experience, 0);
  const external = agents.get('atlas')!;
  external.experience = 999;
  assert.equal(agents.get('atlas')!.experience, 42);
});
test('configured expanded evaluation accounts preserve independence and restored endowments', () => {
  const agents = new AgentRegistry(),
    accounts = new PaperAccounts(new EventBus(), 10000);
  for (const agent of agents.list()) accounts.ensureEvaluation(agent.id, 1000);
  assert.equal(accounts.list().length, 9);
  assert.equal(accounts.snapshot('fund')!.portfolio.equity, 10000);
  for (const agent of agents.list()) assert.equal(accounts.list(agent.id)[0]!.fills, 0);
  const restored = new PaperAccounts(new EventBus(), 10000, accounts.exportState());
  for (const agent of agents.list()) restored.ensureEvaluation(agent.id, 9999);
  assert.equal(restored.list().length, 9);
  assert.equal(restored.snapshot('evaluation:oracle')!.initialCash, 1000);
});
