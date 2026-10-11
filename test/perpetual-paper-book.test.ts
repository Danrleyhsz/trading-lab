import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/application/event-bus.js';
import { PerpetualPaperBook, type PerpetualBookState } from '../src/application/perpetual-paper-book.js';
import { PERPETUAL_INSTRUMENT, type PerpetualQuote } from '../src/domain/perpetual-market.js';
import { PerpetualRiskEngine } from '../src/domain/perpetual-risk.js';
const start = 1700000000000;
const quote = (now: number, price = 100): PerpetualQuote => ({
  instrument: PERPETUAL_INSTRUMENT,
  symbol: 'BTCUSDT',
  bid: price,
  ask: price,
  markPrice: price,
  indexPrice: price,
  fundingRate: 0.01,
  nextFundingTime: start + 28800000,
  bookTime: now,
  markTime: now,
  receivedAt: now,
});
const noop = async () => {};
test('perpetual accounts preserve attributed fees/funding after restart without touching the fund', async () => {
  let now = start;
  const bus = new EventBus(),
    book = new PerpetualPaperBook(bus, undefined, () => now);
  const id = book.ensureEvaluation('nova', 1000);
  let stored: PerpetualBookState | undefined;
  const save = async (s: PerpetualBookState) => {
    stored = structuredClone(s);
  };
  await book.synchronize(quote(now), [], save);
  const fill = await book.propose(id, 'BUY', 1, save);
  assert.equal(fill.status, 'filled');
  now += 2000;
  await book.synchronize(
    quote(now),
    [{ instrument: PERPETUAL_INSTRUMENT, timestamp: now - 1, rate: 0.01, markPrice: 100 }],
    save,
  );
  const snapshot = book.list()[0];
  assert.equal(snapshot.fundingCashDelta, -1);
  assert.equal(snapshot.fills, 1);
  assert.equal(
    book.list().some((a) => a.id === 'fund'),
    false,
  );
  const restored = new PerpetualPaperBook(new EventBus(), stored, () => now);
  assert.deepEqual(restored.list(), book.list());
  await assert.rejects(
    restored.synchronize(
      quote(now),
      [{ instrument: PERPETUAL_INSTRUMENT, timestamp: now - 1, rate: 0.01, markPrice: 100 }],
      save,
    ),
    /invalid funding reconciliation/,
  );
});
test('failed durable write exposes no fill or changed capital and blocks later proposals', async () => {
  const bus = new EventBus(),
    published: string[] = [];
  bus.subscribe((e) => published.push(e.type));
  const book = new PerpetualPaperBook(bus, undefined, () => start);
  const id = book.ensureEvaluation('nova', 1000);
  await book.synchronize(quote(start), [], noop);
  await assert.rejects(
    book.propose(id, 'BUY', 1, async () => {
      throw Error('database offline');
    }),
    /database offline/,
  );
  assert.equal(book.list()[0].fills, 0);
  assert.equal(book.list()[0].portfolio.cash, 1000);
  assert.ok(!published.includes('PAPER_FILL'));
  await assert.rejects(book.propose(id, 'BUY', 1, noop), /persistence unavailable/);
});
test('halt prevents new exposure while mandatory risk still permits a reducing exit', async () => {
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => start),
    id = book.ensureEvaluation('nova', 1000);
  await book.synchronize(quote(start), [], noop);
  await book.propose(id, 'BUY', 1, noop);
  await book.halt(true, noop);
  const rejected = await book.propose(id, 'BUY', 0.1, noop);
  assert.equal(rejected.status, 'rejected');
  if (rejected.status === 'rejected') assert.ok(rejected.decision.reasons.includes('KILL_SWITCH'));
  assert.equal((await book.propose(id, 'SELL', 1, noop)).status, 'filled');
  assert.equal(book.list()[0].portfolio.positions.length, 0);
});
test('fresh quote stress causes a risk-approved liquidation, including liquidation costs', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000);
  await book.synchronize(quote(now), [], noop);
  await book.propose(id, 'SELL', 1, noop);
  now += 2000;
  await book.synchronize(quote(now, 2000), [], noop);
  assert.equal(book.list()[0].portfolio.positions.length, 0);
  assert.ok(book.list()[0].portfolio.equity < 0);
  const ledger = book.ledger(id)!;
  assert.equal(ledger.filter((e) => e.type === 'PAPER_LIQUIDATION').length, 1);
  assert.equal(ledger.filter((e) => e.type === 'RISK_APPROVED').length, 2);
});
test('pending funding publication and stale prices block reconciliation without invented cash flows', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now);
  book.ensureEvaluation('nova', 1000);
  const first = { ...quote(now), nextFundingTime: now + 1000 };
  await book.synchronize(first, [], noop);
  now += 2000;
  await assert.rejects(book.synchronize(quote(now), [], noop), /publication pending/);
  assert.equal(book.list()[0].fundingCashDelta, 0);
  now += 20000;
  await assert.rejects(book.synchronize(quote(start), [], noop), /stale market/);
});
test('risk rejects stale quotes and drawdown without being fooled by an otherwise affordable order', () => {
  const risk = new PerpetualRiskEngine(),
    order = { symbol: 'BTCUSDT', side: 'BUY' as const, quantity: 1, referencePrice: 100 },
    portfolio = { initialCash: 1000, cash: 950, equity: 950, realizedPnl: 0, unrealizedPnl: 0, positions: [] };
  assert.ok(
    risk
      .evaluate(order, portfolio, quote(start), { halted: false, peakEquity: 1500, dailyStartEquity: 1000 }, start)
      .reasons.includes('DRAWDOWN_LIMIT'),
  );
  assert.ok(
    !risk
      .evaluate(order, portfolio, quote(start), { halted: false, peakEquity: 1200, dailyStartEquity: 1000 }, start)
      .reasons.includes('DRAWDOWN_LIMIT'),
    'queda de 20,8% está dentro do limite de 30%',
  );
  assert.ok(
    risk
      .evaluate(
        order,
        portfolio,
        quote(start),
        { halted: false, peakEquity: 1000, dailyStartEquity: 1000 },
        start + 20000,
      )
      .reasons.includes('STALE_MARKET'),
  );
});
test('real account outcomes reconcile costs, refresh the projection and survive restart', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000);
  assert.equal(book.performance(id)!.summary.winRate, null);
  await book.synchronize(quote(now), [], noop);
  await book.propose(id, 'BUY', 1, noop);
  assert.equal(book.performance(id)!.summary.closedTrades, 0);
  now += 2000;
  await book.synchronize(
    quote(now, 110),
    [{ instrument: PERPETUAL_INSTRUMENT, timestamp: now - 1, rate: 0.01, markPrice: 110 }],
    noop,
  );
  await book.propose(id, 'SELL', 1, noop);
  const performance = book.performance(id)!;
  assert.equal(performance.summary.closedTrades, 1);
  assert.equal(performance.summary.winRate, 1);
  assert.ok(Math.abs(performance.summary.realizedNetPnl - (book.list()[0].portfolio.cash - 1000)) < 1e-9);
  performance.closedTrades[0].netPnl = -999;
  assert.ok(book.performance(id)!.closedTrades[0].netPnl > 0);
  assert.deepEqual(
    new PerpetualPaperBook(new EventBus(), book.exportState(), () => now).performance(id),
    book.performance(id),
  );
  assert.equal(book.list()[0].performance.summary.closedTrades, 1);
});
test('perpetual restore refuses a duplicated fill or misleading inner attribution/instrument', async () => {
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => start),
    id = book.ensureEvaluation('nova', 1000);
  await book.synchronize(quote(start), [], noop);
  await book.propose(id, 'BUY', 1, noop);
  const valid = book.exportState();
  for (const tamper of [
    (state: PerpetualBookState) => {
      (state.accounts[0].ledger.find((e) => e.type === 'PAPER_FILL')!.payload as any).fill.accountId = 'fund';
    },
    (state: PerpetualBookState) => {
      (state.accounts[0].ledger.find((e) => e.type === 'PAPER_FILL')!.payload as any).fill.agentId = 'atlas';
    },
    (state: PerpetualBookState) => {
      (state.accounts[0].ledger.find((e) => e.type === 'PAPER_FILL')!.payload as any).fill.symbol = 'ETHUSDT';
    },
    (state: PerpetualBookState) => {
      const original = state.accounts[0].ledger.find((e) => e.type === 'PAPER_FILL')!;
      state.accounts[0].ledger.push({ ...structuredClone(original), id: 'another-event-same-fill' });
    },
  ]) {
    const corrupted = structuredClone(valid);
    tamper(corrupted);
    assert.throws(() => new PerpetualPaperBook(new EventBus(), corrupted, () => start), /perpetual (fill|ledger)/);
  }
  assert.deepEqual(new PerpetualPaperBook(new EventBus(), valid, () => start).list(), book.list());
});
// Gravação durável: o livro só regrava o estado quando algo durável mudou ou a amostra de equity virou de minuto.
// `start` cai 20 s depois do início de um minuto, então +39999 ms ainda é o mesmo minuto e +40000 ms é o seguinte.
const counting = () => {
  const saved: PerpetualBookState[] = [];
  return {
    saved,
    save: async (s: PerpetualBookState) => {
      saved.push(structuredClone(s));
    },
  };
};
test('quotes inside the same minute without new events do not write the state; the minute rollover does', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000),
    { saved, save } = counting();
  await book.synchronize(quote(now), [], save);
  assert.equal(saved.length, 1, 'first quote writes (new account sample and funding schedule)');
  await book.propose(id, 'BUY', 1, save);
  assert.equal(saved.length, 2, 'a fill is always written');
  for (const offset of [3000, 6000, 9000, 12000, 15000, 18000, 21000, 24000, 27000, 30000, 33000, 36000, 39000]) {
    now = start + offset;
    await book.synchronize(quote(now, 100 + offset / 1000), [], save);
  }
  assert.equal(saved.length, 2, 'thirteen quotes in the same minute wrote nothing');
  assert.equal(book.market()!.markPrice, 139, 'the in-memory quote is still current');
  assert.equal(book.list()[0].valuationTime, start + 39000);
  now = start + 40000;
  await book.synchronize(quote(now, 140), [], save);
  assert.equal(saved.length, 3, 'the first quote of the next minute writes');
  now = start + 43000;
  await book.synchronize(quote(now, 141), [], save);
  assert.equal(saved.length, 3, 'and the minute after it is quiet again');
  assert.equal(saved.at(-1)!.accounts[0].samples.length, 2);
});
test('funding settlement or liquidation inside the same minute is written immediately, even with no position to charge', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000),
    { saved, save } = counting();
  await book.synchronize(quote(now), [], save);
  now = start + 3000;
  await book.synchronize(
    quote(now),
    [{ instrument: PERPETUAL_INSTRUMENT, timestamp: now - 1, rate: 0.01, markPrice: 100 }],
    save,
  );
  assert.equal(saved.length, 2, 'a settlement that charged nobody still moves the funding cursor');
  assert.equal(saved.at(-1)!.fundingCursor, now - 1);
  assert.equal(saved.at(-1)!.accounts[0].ledger.filter((e) => e.type === 'FUNDING_SETTLED').length, 0);
  await book.propose(id, 'BUY', 1, save);
  assert.equal(saved.length, 3);
  now = start + 6000;
  await book.synchronize(
    quote(now),
    [{ instrument: PERPETUAL_INSTRUMENT, timestamp: now - 1, rate: 0.01, markPrice: 100 }],
    save,
  );
  assert.equal(saved.length, 4, 'a settlement that charges a position is written');
  assert.equal(saved.at(-1)!.accounts[0].ledger.filter((e) => e.type === 'FUNDING_SETTLED').length, 1);
});
test('a liquidation inside the same minute is written immediately', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000),
    { saved, save } = counting();
  await book.synchronize(quote(now), [], save);
  await book.propose(id, 'SELL', 1, save);
  const before = saved.length;
  now = start + 3000;
  await book.synchronize(quote(now, 2000), [], save);
  assert.equal(saved.length, before + 1);
  assert.equal(saved.at(-1)!.accounts[0].ledger.filter((e) => e.type === 'PAPER_LIQUIDATION').length, 1);
});
test('peak equity, drawdown and samples stay exact in memory while writes are skipped', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000),
    { saved, save } = counting();
  await book.synchronize(quote(now), [], save);
  await book.propose(id, 'BUY', 1, save);
  let peak = 1000,
    drawdown = 0;
  const equityAfter = () => book.list()[0].portfolio.equity;
  for (const [offset, price] of [
    [3000, 104],
    [6000, 111],
    [9000, 96],
    [12000, 99],
    [15000, 121],
    [18000, 90],
    [21000, 95],
  ] as const) {
    now = start + offset;
    await book.synchronize(quote(now, price), [], save);
    const equity = equityAfter();
    peak = Math.max(peak, equity);
    drawdown = Math.max(drawdown, (peak - equity) / peak);
  }
  assert.equal(saved.length, 2, 'nothing was written during the minute');
  const state = book.exportState(),
    account = state.accounts[0];
  assert.equal(account.peakEquity, peak);
  assert.ok(drawdown > 0.02);
  assert.equal(account.maxDrawdown, drawdown);
  assert.equal(account.samples.length, 1, 'samples of one minute collapse into the latest one');
  assert.deepEqual(account.samples[0], { timestamp: start + 21000, equity: equityAfter() });
  assert.equal(book.list()[0].maxDrawdown, drawdown);
  now = start + 40000;
  await book.synchronize(quote(now, 95), [], save);
  const written = saved.at(-1)!.accounts[0];
  assert.equal(saved.length, 3);
  assert.equal(written.peakEquity, peak);
  assert.equal(written.maxDrawdown, drawdown);
  assert.equal(written.samples.length, 2);
  assert.deepEqual(
    new PerpetualPaperBook(new EventBus(), saved.at(-1), () => now).list(),
    book.list(),
    'the rollover write restores to exactly the live book',
  );
});
test('persistence stays fail-closed: a failed write blocks orders and is retried on every quote until it succeeds', async () => {
  let now = start;
  const book = new PerpetualPaperBook(new EventBus(), undefined, () => now),
    id = book.ensureEvaluation('nova', 1000),
    { saved, save } = counting();
  await book.synchronize(quote(now), [], save);
  now = start + 39000;
  await book.synchronize(quote(now), [], save);
  now = start + 40000;
  await assert.rejects(
    book.synchronize(quote(now), [], async () => {
      throw Error('database offline');
    }),
    /database offline/,
  );
  assert.equal(book.status().persistenceFailed, true);
  await assert.rejects(book.propose(id, 'BUY', 1, save), /persistence unavailable/);
  const before = saved.length;
  now = start + 43000;
  await book.synchronize(quote(now), [], save);
  assert.equal(
    saved.length,
    before + 1,
    'inside the same minute, the retry still writes because the book is in failure state',
  );
  assert.equal(book.status().persistenceFailed, false);
  assert.equal((await book.propose(id, 'BUY', 1, save)).status, 'filled');
});
