import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { EventAudit, registerEventAudit } from '../src/application/event-audit.js';
import { registerAccessControl } from '../src/application/access-control.js';
import type { StoredState } from '../src/domain/storage.js';
import type { DomainEvent } from '../src/domain/events.js';
const row = (
  id: string,
  time: number,
  type: DomainEvent['type'] = 'RISK_REJECTED',
  accountId = 'evaluation:nova:usdm',
): DomainEvent => ({
  id,
  type,
  occurredAt: new Date(time).toISOString(),
  payload: { accountId, decision: { approved: false, reasons: ['TEST_ONLY_LIMIT'] } },
});
const state = (events: DomainEvent[]): StoredState => ({ agents: [], memories: [], domainEvents: events });
test('audit pages use only confirmed originals, stable timestamp/ID ties, strict filters and original cursors', async () => {
  const original = [
    row('older', 1000),
    row('tie-b', 2000, 'PAPER_FILL'),
    row('tie-a', 2000),
    row('fund', 3000, 'RISK_REJECTED', 'fund'),
  ];
  const stored = state(original),
    audit = new EventAudit(() => stored),
    app = Fastify();
  registerEventAudit(app, audit);
  try {
    const first = (await app.inject('/audit/events?limit=2')).json();
    assert.deepEqual(
      first.events.map((e: DomainEvent) => e.id),
      ['fund', 'tie-a'],
    );
    assert.equal(first.source, 'DURABLE_SNAPSHOT');
    assert.equal(first.nextCursor, 'tie-a');
    const next = (await app.inject('/audit/events?limit=2&before=tie-a')).json();
    assert.deepEqual(
      next.events.map((e: DomainEvent) => e.id),
      ['tie-b', 'older'],
    );
    assert.equal(next.nextCursor, null);
    const filtered = (await app.inject('/audit/events?type=RISK_REJECTED&accountId=evaluation%3Anova%3Ausdm')).json();
    assert.deepEqual(
      filtered.events.map((e: DomainEvent) => e.id),
      ['tie-a', 'older'],
    );
    assert.equal((await app.inject('/audit/events?before=missing')).statusCode, 400);
    for (const q of ['limit=0', 'limit=101', 'limit=1.5', 'type=FAKE_PROFIT', 'fabricated=true', 'before='])
      assert.equal((await app.inject('/audit/events?' + q)).statusCode, 400);
    assert.deepEqual((await app.inject('/audit/events/older')).json().event, original[0]);
    assert.equal((await app.inject('/audit/events/missing')).statusCode, 404);
    assert.equal((await app.inject('/audit/events/older?claimed=true')).statusCode, 400);
    assert.deepEqual(stored.domainEvents, original);
  } finally {
    await app.close();
  }
});
test('audit includes actual restored legacy ledgers and research, deduplicates copies and rejects conflicting IDs', async () => {
  const recorded = row('legacy', 1000),
    snapshot = state([recorded]);
  snapshot.paperAccounts = [
    {
      id: 'fund',
      kind: 'FUND',
      ownerAgentId: null,
      initialCash: 1000,
      createdAt: '2026-01-01',
      ledger: [structuredClone(recorded), row('fund-ledger', 500)],
    },
  ];
  const audit = new EventAudit(() => snapshot);
  assert.equal(audit.page({ limit: 25 }).events.length, 2);
  const result = audit.get('legacy')!;
  (result.event.payload as any).accountId = 'pretend';
  assert.notEqual((audit.get('legacy')!.event.payload as any).accountId, 'pretend');
  const conflict = structuredClone(snapshot);
  conflict.paperAccounts![0].ledger[0].payload = { accountId: 'different' };
  assert.throws(() => new EventAudit(() => conflict).get('legacy'), /conflicting/);
});
test('unconfirmed events and failed writes never appear until a new durable snapshot is published', () => {
  let committed: StoredState | null = null;
  const audit = new EventAudit(() => committed);
  assert.throws(() => audit.page({ limit: 25 }), /unavailable/);
  committed = state([row('accepted', 1000)]);
  assert.equal(audit.get('accepted')!.event.id, 'accepted');
  const staged = structuredClone(committed);
  staged.domainEvents!.push(row('pending', 2000));
  assert.equal(audit.get('pending'), undefined);
  committed = staged;
  assert.equal(audit.get('pending')!.event.id, 'pending');
  assert.equal(audit.page({ limit: 25 }).events.length, 2);
});
test('recorded audit stays authenticated and missing/conflicting evidence fails without leaking raw errors', async () => {
  const token = 'test-only-access-code-at-least-32-characters',
    app = Fastify();
  registerAccessControl(app, token, true, 'https://example.test');
  registerEventAudit(
    app,
    new EventAudit(() => {
      throw Error('test-only private DB URL');
    }),
  );
  try {
    assert.equal((await app.inject('/audit/events')).statusCode, 401);
    assert.equal((await app.inject('/audit/events/id')).statusCode, 401);
    const response = await app.inject({ url: '/audit/events', headers: { authorization: 'Bearer ' + token } });
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.includes('private'), false);
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/audit/events',
          headers: { authorization: 'Bearer ' + token },
          payload: { profit: 100 },
        })
      ).statusCode,
      404,
    );
  } finally {
    await app.close();
  }
});

test('invalid recorded identity/timestamp makes audit unavailable instead of inventing a repaired event', async () => {
  for (const record of [
    { ...row('bad', 0), id: 123 },
    { ...row('bad', 0), occurredAt: 'unknown-time' },
  ]) {
    const app = Fastify();
    registerEventAudit(app, new EventAudit(() => state([record as DomainEvent])));
    try {
      const response = await app.inject('/audit/events');
      assert.equal(response.statusCode, 503);
      assert.equal(response.body.includes('1970'), false);
    } finally {
      await app.close();
    }
  }
});
