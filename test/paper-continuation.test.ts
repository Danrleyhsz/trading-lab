import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertAppendOnly} from '../src/infrastructure/postgres-state-store.js';
import {JsonStateStore} from '../src/infrastructure/json-state-store.js';
import type {StoredState} from '../src/domain/storage.js';
import {PerpetualPaperBook,type PerpetualBookState} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {PERPETUAL_INSTRUMENT,type PerpetualQuote,type FundingRecord} from '../src/domain/perpetual-market.js';
const start=1700000000000,closed=Math.floor(start/3600000)*3600000-3600000;
const quote=(now:number,nextFundingTime=start+2000):PerpetualQuote=>({instrument:PERPETUAL_INSTRUMENT,symbol:'BTCUSDT',bid:100,ask:100,markPrice:100,indexPrice:100,fundingRate:0.01,nextFundingTime,bookTime:now,markTime:now,receivedAt:now});
const funding=(timestamp:number,rate=0.01):FundingRecord=>({instrument:PERPETUAL_INSTRUMENT,timestamp,rate,markPrice:100});
const noop=async()=>{};
const state=():StoredState=>({agents:[],memories:[],perpetualBook:{accounts:[],fundingCursor:start,autonomousCursor:closed,halted:false}});

test('both durable guards refuse cursor rollback/removal and retain original perpetual evidence',async()=>{
 const previous=state();
 const corruptions:Array<(s:StoredState)=>void>=[
  s=>{s.perpetualBook!.fundingCursor--;},
  s=>{s.perpetualBook!.autonomousCursor!-=3600000;},
  s=>{delete s.perpetualBook!.autonomousCursor;},
  s=>{delete s.perpetualBook;},
  s=>{s.perpetualBook!.fundingCursor=NaN;},
  s=>{s.perpetualBook!.autonomousCursor!++;},
  s=>{s.perpetualBook!.expectedFundingTime=-1;},
 ];
 const dir=await mkdtemp(join(tmpdir(),'trading-continuation-'));
 try{
  const path=join(dir,'state.json'),store=new JsonStateStore(path);await store.save(previous);
  for(const corrupt of corruptions){const next=structuredClone(previous);corrupt(next);assert.throws(()=>assertAppendOnly(previous,next),/cursor|continuation|funding time/);await assert.rejects(store.save(next),/cursor|continuation|funding time/);assert.deepEqual(await store.load(),previous);}
  const advanced=structuredClone(previous);advanced.perpetualBook!.fundingCursor+=2000;advanced.perpetualBook!.autonomousCursor!+=3600000;
  await store.save(advanced);assert.deepEqual(await new JsonStateStore(path).load(),advanced);
  // Original committed ledger/owner must survive even in the development adapter.
  const book=new PerpetualPaperBook(new EventBus(),undefined,()=>start);const id=book.ensureEvaluation('nova',1000);
  await book.synchronize(quote(start),[],noop);await book.propose(id,'BUY',1,noop);
  const original:StoredState={agents:[],memories:[],perpetualBook:book.exportState()},ledgerStore=new JsonStateStore(join(dir,'ledger.json'));await ledgerStore.save(original);
  for(const change of [
   (b:PerpetualBookState)=>{b.accounts[0].ledger=[];},
   (b:PerpetualBookState)=>{b.accounts[0].ownerAgentId='atlas';},
   (b:PerpetualBookState)=>{b.accounts[0].initialCash=2000;},
   (b:PerpetualBookState)=>{b.accounts[0].createdAt='fabricated';},
  ]){const changed=structuredClone(original);change(changed.perpetualBook!);assert.throws(()=>assertAppendOnly(original,changed),/rewrite/);await assert.rejects(ledgerStore.save(changed),/rewrite/);assert.deepEqual(await ledgerStore.load(),original);}
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('restore refuses malformed/future progress instead of resetting recorded cursors',()=>{
 for(const change of [
  (b:PerpetualBookState)=>{b.fundingCursor=start+6000;},
  (b:PerpetualBookState)=>{b.autonomousCursor=closed+1;},
  (b:PerpetualBookState)=>{b.autonomousCursor=closed+3600000;},
  (b:PerpetualBookState)=>{b.expectedFundingTime=NaN;},
 ]){const original=state().perpetualBook!;change(original);const untouched=structuredClone(original);assert.throws(()=>new PerpetualPaperBook(new EventBus(),original,()=>start),/cursor|funding time/);assert.deepEqual(original,untouched);}
 assert.deepEqual(new PerpetualPaperBook(new EventBus(),state().perpetualBook,()=>start).exportState(),state().perpetualBook);
});

test('a later funding row cannot replace a known missing boundary; failure and restart preserve cash',async()=>{
 let now=start;const published:string[]=[],bus=new EventBus();bus.subscribe(e=>published.push(e.type));
 const book=new PerpetualPaperBook(bus,undefined,()=>now),id=book.ensureEvaluation('nova',1000);let stored:PerpetualBookState|undefined;
 const save=async(s:PerpetualBookState)=>{stored=structuredClone(s);};
 await book.synchronize(quote(now),[],save);await book.propose(id,'BUY',1,save);const before=book.exportState(),publishedBefore=published.length;
 now=start+10000;const later=funding(start+7000);
 await assert.rejects(book.synchronize(quote(now,start+20000),[later],save),/publication pending/);
 assert.deepEqual(book.exportState(),before);assert.equal(published.length,publishedBefore);assert.equal(book.status().fundingReady,false);
 await assert.rejects(book.propose(id,'SELL',1,save),/funding reconciliation pending/);
 const restored=new PerpetualPaperBook(bus,stored,()=>now);assert.equal(restored.market(),null);
 await assert.rejects(restored.synchronize(quote(now,start+20000),[later],save),/publication pending/);
 await restored.synchronize(quote(now,start+20000),[funding(start+2000),later],save);
 assert.equal(restored.list()[0].fundingCashDelta,-2);assert.equal(restored.cursor(),later.timestamp);
 const after=restored.exportState();await assert.rejects(restored.synchronize(quote(now,start+20000),[later],save),/invalid funding reconciliation/);assert.deepEqual(restored.exportState(),after);
 const again=new PerpetualPaperBook(new EventBus(),stored,()=>now);await again.synchronize(quote(now,start+20000),[],save);
 assert.equal(again.list()[0].fundingCashDelta,-2);assert.equal(again.ledger(id)!.filter(e=>e.type==='FUNDING_SETTLED').length,2);
});

test('failed funding persistence publishes no payment; retry/restart settles the same original rows once',async()=>{
 let now=start;const bus=new EventBus(),events:string[]=[];bus.subscribe(e=>events.push(e.type));const book=new PerpetualPaperBook(bus,undefined,()=>now),id=book.ensureEvaluation('nova',1000);
 await book.synchronize(quote(now),[],noop);await book.propose(id,'BUY',1,noop);const before=book.exportState();now+=3000;
 const rows=[funding(start+2000)];await assert.rejects(book.synchronize(quote(now,start+20000),rows,async()=>{throw Error('fixture database unavailable');}),/database unavailable/);
 assert.deepEqual(book.exportState(),before);assert.equal(book.status().persistenceFailed,true);assert.equal(events.filter(e=>e==='FUNDING_SETTLED').length,0);
 await book.synchronize(quote(now,start+20000),rows,noop);assert.equal(book.status().persistenceFailed,false);assert.equal(book.list()[0].fundingCashDelta,-1);assert.equal(events.filter(e=>e==='FUNDING_SETTLED').length,1);
 const restored=new PerpetualPaperBook(new EventBus(),book.exportState(),()=>now);await restored.synchronize(quote(now,start+20000),[],noop);assert.equal(restored.list()[0].fundingCashDelta,-1);
});

test('already confirmed funding tolerates an unchanged announced boundary without charging it again',async()=>{
 let now=start;const book=new PerpetualPaperBook(new EventBus(),undefined,()=>now);const id=book.ensureEvaluation('nova',1000);
 await book.synchronize(quote(now),[],noop);await book.propose(id,'BUY',1,noop);now+=3000;
 await book.synchronize(quote(now),[funding(start+2000)],noop);await book.synchronize(quote(now),[],noop);
 assert.equal(book.status().fundingReady,true);assert.equal(book.list()[0].fundingCashDelta,-1);
 assert.equal((await book.propose(id,'SELL',1,noop)).status,'filled');
});

test('closed-candle checkpoints serialize duplicates and failed writes cannot advance progress',async()=>{
 const book=new PerpetualPaperBook(new EventBus(),undefined,()=>start);let saves=0;const save=async()=>{saves++;};
 for(const timestamp of [NaN,closed+1,closed+3600000])await assert.rejects(book.checkpoint(timestamp,save),/closed candle/);
 assert.equal(saves,0);assert.equal(book.status().autonomousCursor,null);
 await assert.rejects(book.checkpoint(closed,async()=>{throw Error('fixture write failed');}),/write failed/);assert.equal(book.status().autonomousCursor,null);
 await assert.rejects(book.checkpoint(closed,save),/persistence unavailable/);
 await book.synchronize(quote(start),[],save);
 const results=await Promise.allSettled([book.checkpoint(closed,save),book.checkpoint(closed,save)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(book.status().autonomousCursor,closed);assert.equal(saves,2);
 await assert.rejects(book.checkpoint(closed-3600000,save),/already processed/);
});