import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentRegistry } from '../src/domain/agents.js';
import { AgentCoordinator } from '../src/application/agent-coordinator.js';
import { EventBus } from '../src/application/event-bus.js';
import { MemoryStore } from '../src/domain/memory.js';
test('agent movement emits truthful state event', () => {
  const bus = new EventBus(),
    events: any[] = [];
  bus.subscribe((e) => events.push(e));
  const c = new AgentCoordinator(new AgentRegistry(), bus);
  const s = c.backtest('validate momentum');
  assert.equal(s.room, 'Quant Lab');
  assert.equal(s.status, 'BACKTESTING');
  assert.equal(events[0].type, 'AGENT_STATE_CHANGED');
  assert.equal(events[0].payload.lastReason, 'validate momentum');
});
test('memory is append-only through public API', () => {
  const m = new MemoryStore();
  m.add({ agentId: 'sentinel', kind: 'FAILURE', summary: 'risk rejected oversized order' });
  assert.equal(m.list('sentinel').length, 1);
  assert.equal(m.list()[0]?.kind, 'FAILURE');
});
