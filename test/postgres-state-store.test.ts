import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {validatePerpetualDataset} from '../src/domain/perpetual-backtest.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PostgresStateStore,assertAppendOnly} from '../src/infrastructure/postgres-state-store.js';
import type {StoredState} from '../src/domain/storage.js';
const state:StoredState={agents:[],memories:[{id:'m1',agentId:'nova',kind:'FAILURE',summary:'actual failure',createdAt:'2026-01-01T00:00:00Z'}],paperAccounts:[{id:'fund',kind:'FUND',ownerAgentId:null,initialCash:1000,createdAt:'2026-01-01',ledger:[]}]};
test('PostgreSQL state guards refuse history removal, modifications and capital reseeding',()=>{assert.doesNotThrow(()=>assertAppendOnly(state,structuredClone(state)));const deleted=structuredClone(state);deleted.memories=[];assert.throws(()=>assertAppendOnly(state,deleted));const rewritten=structuredClone(state);rewritten.memories[0].summary='pretend success';assert.throws(()=>assertAppendOnly(state,rewritten));const capital=structuredClone(state);capital.paperAccounts![0].initialCash=2000;assert.throws(()=>assertAppendOnly(state,capital));});
import {AiAnalysis} from '../src/application/ai-analysis.js';
test('PostgreSQL roundtrip, single writer exclusion and transactional rejection',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const first=new PostgresStateStore(process.env.TEST_DATABASE_URL!);await first.open();let retained=structuredClone(state);
 try{
  assert.equal(await first.load(),null);await first.save(state);const second=new PostgresStateStore(process.env.TEST_DATABASE_URL!);await assert.rejects(second.open(),/another Trading Lab writer/);assert.deepEqual(await first.load(),state);
  const altered=structuredClone(state);altered.memories=[];await assert.rejects(first.save(altered));assert.deepEqual(await first.load(),state);
  // Test fixture provider only: exercise real transactional AI reservation/settlement persistence.
  const ai=new AiAnalysis(async ledger=>{const staged={...retained,aiLedger:ledger};await first.save(staged);retained=staged;},[],{enabled:true,globalDailyMicrousd:1000,agentDailyMicrousd:1000,globalDailyRequests:2,agentDailyRequests:2,maxInputTokens:20,maxOutputTokens:20,timeoutMs:1000},{price:{provider:'TEST_ONLY',model:'fixture',version:'fixture-v1',currency:'USD',inputMicrousdPerMillion:1000000,outputMicrousdPerMillion:1000000},countInput:()=>10,analyze:async()=>{assert.equal((await first.load())?.aiLedger?.[0].kind,'RESERVED');return {providerRequestId:'fixture-request',model:'fixture',text:'Test advisory only',usage:{inputTokens:10,outputTokens:1}};}});
  await ai.analyze({key:'pg-fixture',agentId:'atlas',question:'Test fixture',evidence:{sourceId:'TEST_ONLY',text:'Synthetic integration fixture'}});
  assert.deepEqual(await first.load(),retained);await assert.rejects(first.save({...retained,aiLedger:[]}));assert.deepEqual(await first.load(),retained);
  // Test-only historical evidence: transactional pinning applies before a final outcome.
  const trade=Array.from({length:300},(_,i)=>({timestamp:i*3600000,open:100,high:100,low:100,close:100,volume:1}));
  retained={...retained,perpetualStudies:[{id:'pg-study-fixture',status:'RUNNING',createdAt:'2026-01-01T00:00:00Z',request:{bars:300,trainBars:100,testBars:50},dataset:{instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]},datasetHash:validatePerpetualDataset({instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]})}]};await first.save(retained);
  const evidenceRewrite=structuredClone(retained);evidenceRewrite.perpetualStudies![0].dataset!.trade[0].close=200;await assert.rejects(first.save(evidenceRewrite),/study/);assert.deepEqual(await first.load(),retained);
  retained=structuredClone(retained);Object.assign(retained.perpetualStudies![0],{status:'INTERRUPTED',error:'server restarted before completion'});await first.save(retained);assert.deepEqual(await first.load(),retained);
  // Test-only paper continuation: actual DB rejects progress rollback without changing cash/events.
  const time=1700000000000,closed=Math.floor(time/3600000)*3600000-3600000;
  const book=new PerpetualPaperBook(new EventBus(),undefined,()=>time),id=book.ensureEvaluation('nova',1000);
  const saveBook=async(perpetualBook:ReturnType<PerpetualPaperBook['exportState']>)=>{const staged={...retained,perpetualBook};await first.save(staged);retained=staged;};
  await book.synchronize({instrument:'BINANCE_USDM:BTCUSDT',symbol:'BTCUSDT',bid:100,ask:100,markPrice:100,indexPrice:100,fundingRate:0.01,nextFundingTime:time+28800000,bookTime:time,markTime:time,receivedAt:time},[],saveBook);
  await book.propose(id,'BUY',1,saveBook);await book.checkpoint(closed,saveBook);
  for(const corrupt of [
   (s:StoredState)=>{s.perpetualBook!.fundingCursor--;},
   (s:StoredState)=>{s.perpetualBook!.autonomousCursor!-=3600000;},
   (s:StoredState)=>{delete s.perpetualBook!.autonomousCursor;},
   (s:StoredState)=>{s.perpetualBook!.accounts[0].ownerAgentId='atlas';},
  ]){const changed=structuredClone(retained);corrupt(changed);await assert.rejects(first.save(changed),/rollback|rewrite/);assert.deepEqual(await first.load(),retained);}
  await book.halt(true,saveBook);assert.deepEqual(await first.load(),retained);
 }finally{await first.close();}
 const restarted=new PostgresStateStore(process.env.TEST_DATABASE_URL!);await restarted.open();try{const loaded=await restarted.load();assert.deepEqual(loaded,retained);const book=new PerpetualPaperBook(new EventBus(),loaded!.perpetualBook,()=>1700000000000);assert.equal(book.status().autonomousCursor,retained.perpetualBook!.autonomousCursor);assert.equal(book.status().marketReady,false);assert.equal(book.list()[0].fills,1);assert.equal(book.status().halted,true);}finally{await restarted.close();}
});
