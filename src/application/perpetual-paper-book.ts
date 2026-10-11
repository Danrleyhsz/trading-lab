import { assertPerpetualContinuation } from '../domain/perpetual-continuation.js';
import { projectAccountPerformance, type AccountPerformance } from '../domain/account-performance.js';
import { Portfolio } from '../domain/portfolio.js';
import { PaperBroker, type PaperFill, type PaperOrder } from '../domain/broker.js';
import { PerpetualRiskEngine } from '../domain/perpetual-risk.js';
import {
  PERPETUAL_INSTRUMENT,
  freshPerpetualQuote,
  validFunding,
  type PerpetualQuote,
  type FundingRecord,
} from '../domain/perpetual-market.js';
import { event, type DomainEvent } from '../domain/events.js';
import { AGENT_IDS, type AgentId } from '../domain/agents.js';
import type { EventBus } from './event-bus.js';
export interface PerpetualAccount {
  id: string;
  ownerAgentId: AgentId;
  initialCash: number;
  createdAt: string;
  ledger: DomainEvent[];
  peakEquity: number;
  maxDrawdown: number;
  dailyDate: string;
  dailyStartEquity: number;
  samples: { timestamp: number; equity: number }[];
  /** Last equity of each hour, kept 8 days for the pilot timeline (added 2026-10; absent in older snapshots). */ hourly?: {
    timestamp: number;
    equity: number;
  }[];
  lastMark?: number;
  lastMarkTime?: number;
}
export interface PerpetualBookState {
  accounts: PerpetualAccount[];
  fundingCursor: number;
  expectedFundingTime?: number;
  halted: boolean;
  autonomousCursor?: number;
}
const owners = AGENT_IDS;
function portfolio(account: PerpetualAccount) {
  const p = new Portfolio(account.initialCash);
  for (const e of account.ledger) {
    if (e.type === 'PAPER_FILL') {
      const fill = (e.payload as { fill: PaperFill }).fill;
      if (
        fill.accountId !== account.id ||
        fill.agentId !== account.ownerAgentId ||
        fill.symbol !== 'BTCUSDT' ||
        fill.instrument !== PERPETUAL_INSTRUMENT ||
        !Number.isFinite(fill.quantity) ||
        fill.quantity <= 0 ||
        !Number.isFinite(fill.fillPrice) ||
        fill.fillPrice <= 0 ||
        !Number.isFinite(fill.fee) ||
        fill.fee < 0 ||
        !['BUY', 'SELL'].includes(fill.side) ||
        !Number.isFinite(Date.parse(fill.filledAt))
      )
        throw Error('invalid perpetual fill');
      p.applyFill(fill);
    }
    if (e.type === 'FUNDING_SETTLED') p.adjustCash((e.payload as { cashDelta: number }).cashDelta);
  }
  if (account.lastMark) p.mark('BTCUSDT', account.lastMark);
  return p;
}
export class PerpetualPaperBook {
  private performanceCache = new Map<string, { events: number; lastId?: string; value: AccountPerformance }>();
  private state: PerpetualBookState;
  private pending: Promise<unknown> = Promise.resolve();
  private quote: PerpetualQuote | null = null;
  private risk = new PerpetualRiskEngine();
  private broker = new PaperBroker();
  private persistenceFailed = false;
  constructor(
    private bus: EventBus,
    restored?: PerpetualBookState,
    private now: () => number = Date.now,
  ) {
    this.state = restored ? structuredClone(restored) : { accounts: [], fundingCursor: this.now(), halted: false };
    assertPerpetualContinuation(undefined, this.state);
    if (this.state.fundingCursor > this.now() + 5000) throw Error('future funding cursor');
    if (this.state.autonomousCursor !== undefined && this.state.autonomousCursor + 3600000 > this.now())
      throw Error('future autonomous cursor');
    const accountIds = new Set<string>();
    for (const account of this.state.accounts) {
      if (
        accountIds.has(account.id) ||
        !Number.isFinite(account.peakEquity) ||
        account.peakEquity <= 0 ||
        !Number.isFinite(account.maxDrawdown) ||
        account.maxDrawdown < 0 ||
        !Number.isFinite(account.dailyStartEquity)
      )
        throw Error('invalid perpetual risk state');
      accountIds.add(account.id);
      if (
        account.id !== `evaluation:${account.ownerAgentId}:usdm` ||
        !owners.includes(account.ownerAgentId) ||
        !Number.isFinite(account.initialCash) ||
        account.initialCash <= 0
      )
        throw Error('invalid perpetual account');
      const ids = new Set<string>(),
        fillIds = new Set<string>();
      for (const e of account.ledger) {
        const payload = e.payload as { accountId?: string; fill?: PaperFill };
        if (ids.has(e.id) || (payload.accountId ?? payload.fill?.accountId) !== account.id)
          throw Error('invalid perpetual ledger');
        ids.add(e.id);
        if (e.type === 'PAPER_FILL') {
          const fill = payload.fill;
          if (!fill?.id || fillIds.has(fill.id)) throw Error('duplicate or missing perpetual fill ID');
          fillIds.add(fill.id);
        }
      }
      portfolio(account);
    }
  }
  ensureEvaluation(ownerAgentId: AgentId, initialCash: number) {
    if (!owners.includes(ownerAgentId) || !Number.isFinite(initialCash) || initialCash <= 0)
      throw Error('invalid evaluation endowment');
    const id = `evaluation:${ownerAgentId}:usdm`;
    if (!this.state.accounts.some((a) => a.id === id))
      this.state.accounts.push({
        id,
        ownerAgentId,
        initialCash,
        createdAt: new Date(this.now()).toISOString(),
        ledger: [],
        peakEquity: initialCash,
        maxDrawdown: 0,
        dailyDate: new Date(this.now()).toISOString().slice(0, 10),
        dailyStartEquity: initialCash,
        samples: [],
      });
    return id;
  }
  exportState() {
    return structuredClone(this.state);
  }
  cursor() {
    return this.state.fundingCursor;
  }
  /** True only when a settlement can be pending (first sync, or the expected funding time has passed without one), so the funding history is not polled on every quote. */
  fundingDue(markTime: number) {
    const expected = this.state.expectedFundingTime;
    return !expected || (markTime >= expected && this.state.fundingCursor < expected);
  }
  market() {
    return this.quote ? structuredClone(this.quote) : null;
  }
  private fundingReady() {
    return (
      !this.state.expectedFundingTime ||
      this.now() < this.state.expectedFundingTime ||
      this.state.fundingCursor >= this.state.expectedFundingTime
    );
  }
  status() {
    return {
      accountCount: this.state.accounts.length,
      autonomousAccountExists: this.state.accounts.some((a) => a.id === 'evaluation:nova:usdm'),
      fundingCursor: this.state.fundingCursor,
      expectedFundingTime: this.state.expectedFundingTime ?? null,
      fundingReady: this.fundingReady(),
      halted: this.state.halted,
      persistenceFailed: this.persistenceFailed,
      marketReady: !!this.quote && freshPerpetualQuote(this.quote, this.now()),
      autonomousCursor: this.state.autonomousCursor ?? null,
    };
  }
  performance(id: string, limit?: number) {
    const account = this.state.accounts.find((a) => a.id === id);
    if (!account) return undefined;
    const cached = this.performanceCache.get(id),
      lastId = account.ledger.at(-1)?.id;
    if (cached && cached.events === account.ledger.length && cached.lastId === lastId)
      return structuredClone({
        ...cached.value,
        closedTrades: limit === 0 ? [] : limit ? cached.value.closedTrades.slice(-limit) : cached.value.closedTrades,
        openTrades: limit === 0 ? [] : cached.value.openTrades,
      });
    const value = projectAccountPerformance(account.ledger, id, PERPETUAL_INSTRUMENT);
    this.performanceCache.set(id, { events: account.ledger.length, lastId, value });
    return structuredClone({
      ...value,
      closedTrades: limit === 0 ? [] : limit ? value.closedTrades.slice(-limit) : value.closedTrades,
      openTrades: limit === 0 ? [] : value.openTrades,
    });
  }
  list() {
    return this.state.accounts.map((account) => {
      const p = portfolio(account).snapshot();
      const fills = account.ledger
        .filter((e) => e.type === 'PAPER_FILL')
        .map((e) => (e.payload as { fill: PaperFill }).fill);
      const funding = account.ledger
        .filter((e) => e.type === 'FUNDING_SETTLED')
        .reduce((sum, e) => sum + (e.payload as { cashDelta: number }).cashDelta, 0);
      const notional = p.positions.reduce(
        (sum, pos) => sum + Math.abs(pos.quantity) * (account.lastMark ?? pos.averageEntry),
        0,
      );
      return {
        id: account.id,
        kind: 'EVALUATION',
        instrument: PERPETUAL_INSTRUMENT,
        ownerAgentId: account.ownerAgentId,
        initialCash: account.initialCash,
        portfolio: p,
        performance: (() => {
          const { closedTrades, openTrades, ...summary } = this.performance(account.id, 0)!;
          return summary;
        })(),
        feesPaid: fills.reduce((sum, f) => sum + f.fee, 0),
        fundingCashDelta: funding,
        fills: fills.length,
        maxDrawdown: account.samples.length ? account.maxDrawdown : null,
        initialMargin: notional,
        maintenanceMargin: notional * 0.01,
        valuationTime: account.lastMarkTime ?? null,
        valuationFresh: !!account.lastMarkTime && this.now() - account.lastMarkTime <= 15000,
        samples: structuredClone(account.samples),
        hourly: structuredClone(account.hourly ?? []),
        daily: { date: account.dailyDate, startEquity: account.dailyStartEquity },
      };
    });
  }
  ledger(id: string) {
    const account = this.state.accounts.find((a) => a.id === id);
    return account ? structuredClone(account.ledger) : undefined;
  }
  private serial<T>(run: () => Promise<T>) {
    const result = this.pending.then(run);
    this.pending = result.catch(() => {});
    return result;
  }
  private async commit(
    next: PerpetualBookState,
    save: (state: PerpetualBookState) => Promise<void>,
    events: DomainEvent[] = [],
  ) {
    try {
      await save(structuredClone(next));
    } catch (error) {
      this.persistenceFailed = true;
      throw error;
    }
    this.state = next;
    this.persistenceFailed = false;
    for (const e of events) this.bus.publish(e);
  }
  private measure(account: PerpetualAccount, quote: PerpetualQuote) {
    account.lastMark = quote.markPrice;
    account.lastMarkTime = quote.markTime;
    const equity = portfolio(account).snapshot().equity;
    if (!Number.isFinite(equity)) throw Error('non-finite perpetual equity');
    account.peakEquity = Math.max(account.peakEquity, equity);
    account.maxDrawdown = Math.max(account.maxDrawdown, (account.peakEquity - equity) / account.peakEquity);
    const day = new Date(quote.markTime).toISOString().slice(0, 10);
    if (account.dailyDate !== day) {
      account.dailyDate = day;
      account.dailyStartEquity = equity;
    }
    const last = account.samples.at(-1);
    const sample = { timestamp: quote.markTime, equity };
    if (last && Math.floor(last.timestamp / 60000) === Math.floor(sample.timestamp / 60000))
      account.samples[account.samples.length - 1] = sample;
    else account.samples.push(sample);
    account.samples = account.samples.slice(-1440);
    const hourly = (account.hourly ??= []);
    const hour = hourly.at(-1);
    if (hour && Math.floor(hour.timestamp / 3600000) === Math.floor(sample.timestamp / 3600000))
      hourly[hourly.length - 1] = sample;
    else hourly.push(sample);
    account.hourly = hourly.slice(-192);
  }
  private async order(
    next: PerpetualBookState,
    account: PerpetualAccount,
    side: 'BUY' | 'SELL',
    quantity: number,
    quote: PerpetualQuote,
    events: DomainEvent[],
    liquidation = false,
    studyId?: string,
  ) {
    const p = portfolio(account);
    p.mark('BTCUSDT', quote.markPrice);
    const proposalId = crypto.randomUUID();
    const order: PaperOrder = {
      symbol: 'BTCUSDT',
      side,
      quantity,
      referencePrice: side === 'BUY' ? quote.ask : quote.bid,
      accountId: account.id,
      agentId: account.ownerAgentId,
      proposalId,
      instrument: PERPETUAL_INSTRUMENT,
      ...(studyId ? { strategyId: studyId } : {}),
    };
    const decision = this.risk.evaluate(
      order,
      p.snapshot(),
      quote,
      {
        halted: next.halted || this.persistenceFailed,
        peakEquity: account.peakEquity,
        dailyStartEquity: account.dailyStartEquity,
      },
      this.now(),
    );
    const add = (e: DomainEvent) => {
      account.ledger.push(e);
      events.push(e);
    };
    add(event('TRADE_PROPOSED', order));
    add(event(decision.approved ? 'RISK_APPROVED' : 'RISK_REJECTED', { accountId: account.id, order, decision }));
    if (!decision.approved) return { status: 'rejected' as const, decision, proposalId };
    add(event('PAPER_ORDER_SUBMITTED', order));
    const fill = await this.broker.submit(order);
    fill.filledAt = new Date(this.now()).toISOString();
    if (liquidation) fill.fee += Math.abs(fill.quantity * fill.fillPrice) * 0.005;
    p.applyFill(fill);
    add(event('PAPER_FILL', { accountId: account.id, fill, portfolio: p.snapshot() }));
    if (liquidation)
      add(
        event('PAPER_LIQUIDATION', {
          accountId: account.id,
          fillId: fill.id,
          proposalId,
          markPrice: quote.markPrice,
          maintenanceRate: 0.01,
          liquidationFeeRate: 0.005,
        }),
      );
    this.measure(account, quote);
    return { status: 'filled' as const, fill, proposalId };
  }
  synchronize(quote: PerpetualQuote, settlements: FundingRecord[], save: (state: PerpetualBookState) => Promise<void>) {
    return this.serial(async () => {
      if (!freshPerpetualQuote(quote, this.now())) throw Error('stale market');
      if (this.state.accounts.some((a) => (a.lastMarkTime ?? 0) > quote.markTime)) throw Error('out-of-order mark');
      const expected = this.state.expectedFundingTime;
      if (
        expected &&
        quote.markTime >= expected &&
        this.state.fundingCursor < expected &&
        !settlements.some((f) => Math.abs(f.timestamp - expected) <= 1000)
      )
        throw Error('funding settlement publication pending');
      const next = structuredClone(this.state),
        events: DomainEvent[] = [];
      let previous = next.fundingCursor;
      for (const settlement of settlements) {
        if (!validFunding(settlement) || settlement.timestamp <= previous || settlement.timestamp > quote.markTime)
          throw Error('invalid funding reconciliation');
        previous = settlement.timestamp;
        for (const account of next.accounts) {
          const signed = account.ledger
            .filter((e) => e.type === 'PAPER_FILL')
            .map((e) => (e.payload as { fill: PaperFill }).fill)
            .filter((f) => Date.parse(f.filledAt) < settlement.timestamp)
            .reduce((sum, f) => sum + (f.side === 'BUY' ? f.quantity : -f.quantity), 0);
          if (signed === 0) continue;
          const cashDelta = -signed * settlement.markPrice * settlement.rate;
          if (!Number.isFinite(cashDelta)) throw Error('invalid funding delta');
          const e = event('FUNDING_SETTLED', { accountId: account.id, ...settlement, quantity: signed, cashDelta });
          account.ledger.push(e);
          events.push(e);
        }
      }
      if (settlements.length) next.fundingCursor = settlements.at(-1)!.timestamp;
      next.expectedFundingTime = quote.nextFundingTime;
      for (const account of next.accounts) {
        this.measure(account, quote);
        const p = portfolio(account).snapshot();
        const position = p.positions[0];
        if (position && p.equity <= Math.abs(position.quantity) * quote.markPrice * 0.015)
          await this.order(
            next,
            account,
            position.quantity > 0 ? 'SELL' : 'BUY',
            Math.abs(position.quantity),
            quote,
            events,
            true,
          );
      }
      await this.commit(next, save, events);
      this.quote = structuredClone(quote);
    });
  }
  propose(
    id: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    save: (state: PerpetualBookState) => Promise<void>,
    studyId?: string,
  ) {
    return this.serial(async () => {
      if (!this.quote || !freshPerpetualQuote(this.quote, this.now())) throw Error('market unavailable');
      if (this.persistenceFailed) throw Error('persistence unavailable');
      if (!this.fundingReady()) throw Error('funding reconciliation pending');
      const next = structuredClone(this.state),
        account = next.accounts.find((a) => a.id === id);
      if (!account) throw Error('unknown perpetual account');
      const events: DomainEvent[] = [];
      const result = await this.order(next, account, side, quantity, this.quote, events, false, studyId);
      await this.commit(next, save, events);
      return result;
    });
  }
  halt(value: boolean, save: (state: PerpetualBookState) => Promise<void>) {
    return this.serial(async () => {
      const next = structuredClone(this.state);
      next.halted = value;
      await this.commit(next, save, [
        event('PAPER_CONTROL_CHANGED', { halted: value, instrument: PERPETUAL_INSTRUMENT }),
      ]);
      return this.status();
    });
  }
  checkpoint(timestamp: number, save: (state: PerpetualBookState) => Promise<void>) {
    return this.serial(async () => {
      if (
        !Number.isSafeInteger(timestamp) ||
        timestamp <= 0 ||
        timestamp % 3600000 !== 0 ||
        timestamp + 3600000 > this.now()
      )
        throw Error('invalid closed candle cursor');
      if (timestamp <= (this.state.autonomousCursor ?? 0)) throw Error('autonomous candle already processed');
      if (this.persistenceFailed) throw Error('persistence unavailable');
      const next = structuredClone(this.state);
      next.autonomousCursor = timestamp;
      await this.commit(next, save);
    });
  }
}
