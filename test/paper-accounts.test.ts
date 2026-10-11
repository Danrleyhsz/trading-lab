import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { PaperAccounts } from '../src/application/paper-accounts.js';
import { registerPaperAccountRoutes } from '../src/application/paper-account-routes.js';
import { registerAgentProfiles } from '../src/application/agent-profiles.js';
import { AgentRegistry } from '../src/domain/agents.js';
import { AgentActivityJournal } from '../src/domain/agent-career.js';
import { AgentMessageBus } from '../src/domain/agent-messages.js';
import { MemoryStore } from '../src/domain/memory.js';
import { StrategyRegistry } from '../src/domain/strategy.js';
import { AgentCoordinator } from '../src/application/agent-coordinator.js';
import { EventBus } from '../src/application/event-bus.js';
import { RiskEngine } from '../src/domain/risk.js';
import { Portfolio } from '../src/domain/portfolio.js';

const order = { symbol: 'BTCUSDT', side: 'BUY' as const, quantity: 0.1, referencePrice: 1000 };
test('evaluation capital and fills never change fund balances and remain attributable after restore', async () => {
  const bus = new EventBus(),
    accounts = new PaperAccounts(bus, 10000);
  assert.equal(accounts.list().length, 1);
  const fund = accounts.snapshot('fund');
  accounts.ensureEvaluation('nova', 1000);
  const result = await accounts.propose('evaluation:nova', {
    ...order,
    accountId: 'fund',
    agentId: 'atlas',
    proposalId: 'forged',
  });
  assert.equal(result.status, 'filled');
  assert.deepEqual(accounts.snapshot('fund'), fund);
  if (result.status !== 'filled') throw Error('expected fill');
  assert.equal(result.fill.accountId, 'evaluation:nova');
  assert.equal(result.fill.agentId, 'nova');
  assert.notEqual(result.fill.proposalId, 'forged');
  assert.deepEqual(
    accounts.ledger('evaluation:nova').map((event) => event.type),
    ['TRADE_PROPOSED', 'RISK_APPROVED', 'PAPER_ORDER_SUBMITTED', 'PAPER_FILL'],
  );
  accounts.mark('BTCUSDT', 1100);
  const snapshot = accounts.snapshot('evaluation:nova');
  const restored = new PaperAccounts(new EventBus(), 99999, JSON.parse(JSON.stringify(accounts.exportState())));
  restored.mark('BTCUSDT', 1100);
  assert.deepEqual(restored.snapshot('evaluation:nova'), snapshot);
  assert.equal(restored.snapshot('fund')!.initialCash, 10000);
  restored.ensureEvaluation('nova', 88888);
  assert.equal(restored.snapshot('evaluation:nova')!.initialCash, 1000);
  const exposed = restored.ledger('evaluation:nova');
  exposed.splice(0);
  assert.equal(restored.ledger('evaluation:nova').length, 4);
});
test('concurrent proposals see prior fills and cannot exceed cumulative account position risk', async () => {
  const accounts = new PaperAccounts(new EventBus(), 10000);
  accounts.ensureEvaluation('nova', 1000);
  const [first, second] = await Promise.all([
    accounts.propose('evaluation:nova', { ...order, quantity: 0.15 }),
    accounts.propose('evaluation:nova', { ...order, quantity: 0.15 }),
  ]);
  assert.equal(first.status, 'filled');
  assert.equal(second.status, 'rejected');
  if (second.status === 'rejected') assert.ok(second.decision.reasons.includes('POSITION_LIMIT'));
  assert.equal(accounts.snapshot('evaluation:nova')!.fills, 1);
  assert.equal(accounts.snapshot('fund')!.fills, 0);
  assert.deepEqual(
    accounts
      .ledger('evaluation:nova')
      .slice(-2)
      .map((event) => event.type),
    ['TRADE_PROPOSED', 'RISK_REJECTED'],
  );
});
test('risk rejects non-finite values and invalid sides rather than approving them by failed comparisons', () => {
  const risk = new RiskEngine(),
    portfolio = new Portfolio(1000).snapshot();
  for (const quantity of [NaN, Infinity, -1, 0])
    assert.equal(risk.evaluate({ ...order, quantity }, portfolio).approved, false);
  assert.equal(risk.evaluate({ ...order, side: 'INVALID' as any }, portfolio).approved, false);
  assert.throws(() => new Portfolio(NaN));
});
function api(evaluationEnabled = true, marketAge = 0) {
  const app = Fastify(),
    bus = new EventBus(),
    agents = new AgentRegistry(),
    memories = new MemoryStore(),
    strategies = new StrategyRegistry(),
    accounts = new PaperAccounts(bus, 10000);
  accounts.ensureEvaluation('nova', 1000);
  accounts.ensureEvaluation('atlas', 2000);
  let persistenceCount = 0;
  registerPaperAccountRoutes(app, accounts, {
    market: () => ({ symbol: 'BTCUSDT', price: 1000, exchange: 'test', timestamp: Date.now() - marketAge }),
    memories,
    strategies,
    coordinator: new AgentCoordinator(agents, bus),
    persist: async () => {
      persistenceCount++;
    },
    evaluationEnabled,
    bus,
  });
  registerAgentProfiles(app, agents, memories, new AgentMessageBus(), new AgentActivityJournal(), accounts);
  return {
    app,
    accounts,
    memories,
    strategies,
    get persistenceCount() {
      return persistenceCount;
    },
  };
}
test('account API rejects forged routing/approval fields and exposes only per-agent evaluation performance', async () => {
  const h = api();
  try {
    const payload = { symbol: 'BTCUSDT', side: 'BUY', quantity: 0.1 };
    for (const extra of [{ accountId: 'fund' }, { referencePrice: 1 }, { agentId: 'atlas' }, { approved: true }])
      assert.equal(
        (
          await h.app.inject({
            method: 'POST',
            url: '/paper/accounts/evaluation:nova/orders',
            payload: { ...payload, ...extra },
          })
        ).statusCode,
        400,
      );
    assert.equal(h.memories.list().length, 0);
    assert.equal(h.accounts.snapshot('evaluation:nova')!.fills, 0);
    assert.equal(
      (await h.app.inject({ method: 'POST', url: '/paper/accounts/missing/orders', payload })).statusCode,
      404,
    );
    const result = await h.app.inject({ method: 'POST', url: '/paper/accounts/evaluation:nova/orders', payload });
    assert.equal(result.statusCode, 200);
    assert.equal(result.json().status, 'filled');
    assert.equal(h.persistenceCount, 1);
    const memory = h.memories.list('nova')[0]!;
    assert.equal(memory.metadata?.accountId, 'evaluation:nova');
    assert.ok(h.accounts.ledger('evaluation:nova').some((event) => event.id === memory.sourceEventId));
    const profile = (await h.app.inject('/agents/nova/profile')).json();
    assert.equal(profile.evaluationAccounts.length, 1);
    assert.equal(profile.evaluationAccounts[0].ownerAgentId, 'nova');
    assert.equal(profile.performance.realizedPnl, 0);
    assert.ok(profile.performance.netPnl < 0);
    assert.ok(profile.performance.feesPaid > 0);
    assert.equal(profile.performance.winRate, null);
    assert.equal(h.accounts.snapshot('fund')!.portfolio.equity, 10000);
    assert.equal((await h.app.inject({ method: 'POST', url: '/paper/orders', payload })).json().accountId, 'fund');
  } finally {
    await h.app.close();
  }
});
test('evaluation execution can be disabled and unvalidated strategy cannot affect the fund', async () => {
  const disabled = api(false);
  try {
    assert.equal(
      (
        await disabled.app.inject({
          method: 'POST',
          url: '/paper/accounts/evaluation:nova/orders',
          payload: { symbol: 'BTCUSDT', side: 'BUY', quantity: 0.1 },
        })
      ).statusCode,
      403,
    );
    assert.equal(disabled.accounts.snapshot('evaluation:nova')!.fills, 0);
  } finally {
    await disabled.app.close();
  }
  const h = api();
  try {
    const strategy = h.strategies.create('experimental', 'BTCUSDT'),
      payload = { symbol: 'BTCUSDT', side: 'BUY', quantity: 0.1, strategyId: strategy.id };
    assert.equal((await h.app.inject({ method: 'POST', url: '/paper/orders', payload })).statusCode, 400);
    assert.equal(
      (await h.app.inject({ method: 'POST', url: '/paper/accounts/evaluation:nova/orders', payload })).json().status,
      'filled',
    );
    assert.equal(h.accounts.snapshot('fund')!.portfolio.positions.length, 0);
  } finally {
    await h.app.close();
  }
});

test('stale market requests create no fill, risk decision or agent work', async () => {
  const h = api(true, 120000);
  try {
    const response = await h.app.inject({
      method: 'POST',
      url: '/paper/accounts/evaluation:nova/orders',
      payload: { symbol: 'BTCUSDT', side: 'BUY', quantity: 0.1 },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(h.accounts.ledger('evaluation:nova').length, 0);
    assert.equal(h.memories.list().length, 0);
    assert.equal(h.persistenceCount, 0);
  } finally {
    await h.app.close();
  }
});
test('closing evaluation positions records actual realized P&L and fees without fund exposure', async () => {
  const accounts = new PaperAccounts(new EventBus(), 10000);
  accounts.ensureEvaluation('nova', 1000);
  const first = await accounts.propose('evaluation:nova', order);
  const closed = await accounts.propose('evaluation:nova', { ...order, side: 'SELL', referencePrice: 1100 });
  assert.equal(first.status, 'filled');
  assert.equal(closed.status, 'filled');
  const snapshot = accounts.snapshot('evaluation:nova')!;
  assert.equal(snapshot.portfolio.positions.length, 0);
  assert.ok(snapshot.portfolio.realizedPnl > 0);
  assert.ok(snapshot.feesPaid > 0);
  assert.ok(
    Math.abs(snapshot.portfolio.equity - snapshot.initialCash - (snapshot.portfolio.realizedPnl - snapshot.feesPaid)) <
      1e-8,
  );
  assert.equal(accounts.snapshot('fund')!.portfolio.realizedPnl, 0);
  assert.equal(accounts.snapshot('fund')!.portfolio.equity, 10000);
});
test('restore rejects duplicated actual fill IDs and wallet/agent identity mismatches', async () => {
  const accounts = new PaperAccounts(new EventBus(), 10000);
  accounts.ensureEvaluation('nova', 1000);
  await accounts.propose('evaluation:nova', order);
  const valid = accounts.exportState();
  for (const tamper of [
    (state: any[]) => {
      state
        .find((a) => a.id === 'evaluation:nova')
        .ledger.find((e: any) => e.type === 'PAPER_FILL').payload.fill.accountId = 'fund';
    },
    (state: any[]) => {
      state
        .find((a) => a.id === 'evaluation:nova')
        .ledger.find((e: any) => e.type === 'PAPER_FILL').payload.fill.agentId = 'atlas';
    },
    (state: any[]) => {
      const account = state.find((a) => a.id === 'evaluation:nova'),
        original = account.ledger.find((e: any) => e.type === 'PAPER_FILL');
      account.ledger.push({ ...structuredClone(original), id: 'new-event-same-fill' });
    },
    (state: any[]) => {
      state.find((a) => a.id === 'evaluation:nova').ownerAgentId = 'atlas';
    },
  ]) {
    const corrupted = structuredClone(valid);
    tamper(corrupted);
    assert.throws(() => new PaperAccounts(new EventBus(), 10000, corrupted), /attribution/);
  }
  assert.doesNotThrow(() => new PaperAccounts(new EventBus(), 10000, valid));
});
