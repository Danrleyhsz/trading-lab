import test from 'node:test';
import assert from 'node:assert/strict';
import {EventBus} from '../src/application/event-bus.js';
import {PerpetualPaperBook,type PerpetualBookState} from '../src/application/perpetual-paper-book.js';
import {PERPETUAL_INSTRUMENT,type PerpetualQuote} from '../src/domain/perpetual-market.js';
import {PerpetualRiskEngine} from '../src/domain/perpetual-risk.js';
const start=1700000000000;
const quote=(now:number,price=100):PerpetualQuote=>({instrument:PERPETUAL_INSTRUMENT,symbol:'BTCUSDT',bid:price,ask:price,markPrice:price,indexPrice:price,fundingRate:0.01,nextFundingTime:start+28800000,bookTime:now,markTime:now,receivedAt:now});
const noop=async()=>{};
test('perpetual accounts preserve attributed fees/funding after restart without touching the fund',async()=>{
 let now=start;const bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>now);const id=book.ensureEvaluation('nova',1000);let stored:PerpetualBookState|undefined;const save=async(s:PerpetualBookState)=>{stored=structuredClone(s);};await book.synchronize(quote(now),[],save);const fill=await book.propose(id,'BUY',1,save);assert.equal(fill.status,'filled');now+=2000;await book.synchronize(quote(now),[{instrument:PERPETUAL_INSTRUMENT,timestamp:now-1,rate:0.01,markPrice:100}],save);const snapshot=book.list()[0];assert.equal(snapshot.fundingCashDelta,-1);assert.equal(snapshot.fills,1);assert.equal(book.list().some(a=>a.id==='fund'),false);
 const restored=new PerpetualPaperBook(new EventBus(),stored,()=>now);assert.deepEqual(restored.list(),book.list());await assert.rejects(restored.synchronize(quote(now),[{instrument:PERPETUAL_INSTRUMENT,timestamp:now-1,rate:0.01,markPrice:100}],save),/invalid funding reconciliation/);
});
test('failed durable write exposes no fill or changed capital and blocks later proposals',async()=>{
 const bus=new EventBus(),published:string[]=[];bus.subscribe(e=>published.push(e.type));const book=new PerpetualPaperBook(bus,undefined,()=>start);const id=book.ensureEvaluation('nova',1000);await book.synchronize(quote(start),[],noop);await assert.rejects(book.propose(id,'BUY',1,async()=>{throw Error('database offline');}),/database offline/);assert.equal(book.list()[0].fills,0);assert.equal(book.list()[0].portfolio.cash,1000);assert.ok(!published.includes('PAPER_FILL'));await assert.rejects(book.propose(id,'BUY',1,noop),/persistence unavailable/);
});
test('halt prevents new exposure while mandatory risk still permits a reducing exit',async()=>{
 const book=new PerpetualPaperBook(new EventBus(),undefined,()=>start),id=book.ensureEvaluation('nova',1000);await book.synchronize(quote(start),[],noop);await book.propose(id,'BUY',1,noop);await book.halt(true,noop);const rejected=await book.propose(id,'BUY',0.1,noop);assert.equal(rejected.status,'rejected');if(rejected.status==='rejected')assert.ok(rejected.decision.reasons.includes('KILL_SWITCH'));assert.equal((await book.propose(id,'SELL',1,noop)).status,'filled');assert.equal(book.list()[0].portfolio.positions.length,0);
});
test('fresh quote stress causes a risk-approved liquidation, including liquidation costs',async()=>{
 let now=start;const book=new PerpetualPaperBook(new EventBus(),undefined,()=>now),id=book.ensureEvaluation('nova',1000);await book.synchronize(quote(now),[],noop);await book.propose(id,'SELL',1,noop);now+=2000;await book.synchronize(quote(now,2000),[],noop);assert.equal(book.list()[0].portfolio.positions.length,0);assert.ok(book.list()[0].portfolio.equity<0);const ledger=book.ledger(id)!;assert.equal(ledger.filter(e=>e.type==='PAPER_LIQUIDATION').length,1);assert.equal(ledger.filter(e=>e.type==='RISK_APPROVED').length,2);
});
test('pending funding publication and stale prices block reconciliation without invented cash flows',async()=>{
 let now=start;const book=new PerpetualPaperBook(new EventBus(),undefined,()=>now);book.ensureEvaluation('nova',1000);const first={...quote(now),nextFundingTime:now+1000};await book.synchronize(first,[],noop);now+=2000;await assert.rejects(book.synchronize(quote(now),[],noop),/publication pending/);assert.equal(book.list()[0].fundingCashDelta,0);now+=20000;await assert.rejects(book.synchronize(quote(start),[],noop),/stale market/);
});
test('risk rejects stale quotes and drawdown without being fooled by an otherwise affordable order',()=>{
 const risk=new PerpetualRiskEngine(),order={symbol:'BTCUSDT',side:'BUY' as const,quantity:1,referencePrice:100},portfolio={initialCash:1000,cash:950,equity:950,realizedPnl:0,unrealizedPnl:0,positions:[]};assert.ok(risk.evaluate(order,portfolio,quote(start),{halted:false,peakEquity:1200,dailyStartEquity:1000},start).reasons.includes('DRAWDOWN_LIMIT'));assert.ok(risk.evaluate(order,portfolio,quote(start),{halted:false,peakEquity:1000,dailyStartEquity:1000},start+20000).reasons.includes('STALE_MARKET'));
});
test('real account outcomes reconcile costs, refresh the projection and survive restart',async()=>{
 let now=start;const book=new PerpetualPaperBook(new EventBus(),undefined,()=>now),id=book.ensureEvaluation('nova',1000);
 assert.equal(book.performance(id)!.summary.winRate,null);
 await book.synchronize(quote(now),[],noop);await book.propose(id,'BUY',1,noop);
 assert.equal(book.performance(id)!.summary.closedTrades,0);
 now+=2000;await book.synchronize(quote(now,110),[{instrument:PERPETUAL_INSTRUMENT,timestamp:now-1,rate:0.01,markPrice:110}],noop);await book.propose(id,'SELL',1,noop);
 const performance=book.performance(id)!;
 assert.equal(performance.summary.closedTrades,1);assert.equal(performance.summary.winRate,1);
 assert.ok(Math.abs(performance.summary.realizedNetPnl-(book.list()[0].portfolio.cash-1000))<1e-9);
 performance.closedTrades[0].netPnl=-999;
 assert.ok(book.performance(id)!.closedTrades[0].netPnl>0);
 assert.deepEqual(new PerpetualPaperBook(new EventBus(),book.exportState(),()=>now).performance(id),book.performance(id));
 assert.equal(book.list()[0].performance.summary.closedTrades,1);
});
