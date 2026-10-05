import test from 'node:test';
import assert from 'node:assert/strict';
import {AutonomousPerpetualCycle,studyEligibility} from '../src/application/autonomous-perpetual-cycle.js';
import {PerpetualStudies,type PerpetualStudy} from '../src/application/perpetual-studies.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {MemoryStore} from '../src/domain/memory.js';
import {EventBus} from '../src/application/event-bus.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {eligibleStudyFixture} from './fixtures/perpetual-study.js';
const now=1700000000000,closed=Math.floor(now/3600000)*3600000-3600000;
const config={initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:30};
const dataset=():PerpetualDataset=>{const trade=Array.from({length:100},(_,i)=>({timestamp:closed-(99-i)*3600000,open:100+i,high:100+i,low:100+i,close:100+i,volume:1}));return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]};};
// Controlled eligibility fixture, never supplied through a production API or saved in product data.
const eligible=()=>eligibleStudyFixture(now);
test('autonomous evaluation is inert by default and rejects insufficient historical evidence',async()=>{assert.equal(studyEligibility(undefined,now).eligible,false);const failed=eligible();failed.result!.folds[0].result.liquidations=1;assert.equal(studyEligibility(failed,now).eligible,false);let calls=0;const source={load:async()=>{calls++;return dataset();}},bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>now),studies=new PerpetualStudies(source,[eligible()]);const cycle=new AutonomousPerpetualCycle(false,'controlled-study',studies,book,source,async()=>{},new MemoryStore(),bus,async()=>{},()=>now);await cycle.onMarket();assert.equal(calls,0);assert.equal(book.list().length,0);});
test('enabled cycle uses sourced closed candles, mandatory risk and a durable cursor to avoid repeated fills',async()=>{const source={load:async()=>dataset()},bus=new EventBus(),events:string[]=[],memories=new MemoryStore();bus.subscribe(e=>events.push(e.type));const book=new PerpetualPaperBook(bus,undefined,()=>now);book.ensureEvaluation('nova',1000);const save=async()=>{};await book.synchronize({instrument:'BINANCE_USDM:BTCUSDT',symbol:'BTCUSDT',bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime:now+28800000,bookTime:now,markTime:now,receivedAt:now},[],save);const studies=new PerpetualStudies(source,[eligible()]);const cycle=new AutonomousPerpetualCycle(true,'controlled-study',studies,book,source,save,memories,bus,async()=>{},()=>now);await cycle.onMarket();assert.equal(book.list()[0].fills,1);assert.ok(events.includes('RISK_APPROVED'));assert.ok(events.includes('AUTONOMOUS_DECISION'));assert.equal(memories.list()[0].kind,'OBSERVATION');assert.ok(memories.list()[0].sourceEventId);await cycle.onMarket();assert.equal(book.list()[0].fills,1);assert.equal(book.status().autonomousCursor,closed);});

const liveQuote=(time:number,nextFundingTime=time+28800000)=>({instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime,bookTime:time,markTime:time,receivedAt:time});
test('restored candle progress prevents loading or executing the same signal again',async()=>{
 const bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>now);book.ensureEvaluation('nova',1000);await book.synchronize(liveQuote(now),[],async()=>{});await book.checkpoint(closed,async()=>{});
 const restored=new PerpetualPaperBook(new EventBus(),book.exportState(),()=>now);let calls=0;const source={load:async()=>{calls++;return dataset();}},studies=new PerpetualStudies(source,[eligible()]),memories=new MemoryStore();
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',studies,restored,source,async()=>{},memories,bus,async()=>{},()=>now);
 await cycle.onMarket();assert.equal(restored.status().marketReady,false);await restored.synchronize(liveQuote(now),[],async()=>{});await cycle.onMarket();assert.equal(calls,0);assert.equal(restored.list()[0].fills,0);assert.equal(memories.list().length,0);assert.equal(restored.status().autonomousCursor,closed);
});
test('a halt, expired quote/funding/study or runtime drain during signal retrieval leaves the candle available',async()=>{
 for(const reason of ['halt','quote','funding','study','control']){
  let clock=now,calls=0,admitted=true;const bus=new EventBus(),events:string[]=[],book=new PerpetualPaperBook(bus,undefined,()=>clock),memories=new MemoryStore();bus.subscribe(e=>events.push(e.type));book.ensureEvaluation('nova',1000);
  let release!:(data:PerpetualDataset)=>void;const source={load:async()=>{calls++;return new Promise<PerpetualDataset>(resolve=>{release=resolve;});}},studies=new PerpetualStudies(source,[eligible()]);
  await book.synchronize(liveQuote(clock,reason==='funding'?clock+2000:clock+28800000),[],async()=>{});
  const cycle=new AutonomousPerpetualCycle(true,'controlled-study',studies,book,source,async()=>{},memories,bus,async()=>{},()=>clock,()=>admitted);const pending=cycle.onMarket();assert.equal(calls,1);
  if(reason==='control')admitted=false;
  if(reason==='halt')await book.halt(true,async()=>{});
  if(reason==='quote')clock+=20000;
  if(reason==='funding')clock+=3000;
  if(reason==='study'){clock+=8*86400000;await book.synchronize(liveQuote(clock),[{instrument:'BINANCE_USDM:BTCUSDT',timestamp:now+28800000,rate:0.001,markPrice:199}],async()=>{});}
  release(dataset());await pending;
  assert.equal(book.status().autonomousCursor,null,reason);assert.equal(book.list()[0].fills,0,reason);assert.equal(memories.list().length,0,reason);assert.ok(!events.includes('AUTONOMOUS_DECISION'),reason);assert.equal(cycle.status().busy,false);
 }
});
test('a source outage can recover on the same closed candle without inventing a failed signal or repeated fill',async()=>{
 let available=false,calls=0;const source={load:async()=>{calls++;if(!available)throw Error('fixture source unavailable');return dataset();}},bus=new EventBus(),events:string[]=[],book=new PerpetualPaperBook(bus,undefined,()=>now),memories=new MemoryStore();bus.subscribe(e=>events.push(e.type));book.ensureEvaluation('nova',1000);await book.synchronize(liveQuote(now),[],async()=>{});
 // Zero back-off isolates recovery semantics; the default back-off is covered in continuous-pilot.test.ts.
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligible()]),book,source,async()=>{},memories,bus,async()=>{},()=>now,()=>true,{retryDelayMs:0});
 await assert.rejects(cycle.onMarket(),/source unavailable/);assert.equal(book.status().autonomousCursor,null);assert.equal(memories.list().length,0);assert.equal(book.list()[0].fills,0);
 available=true;await cycle.onMarket();await cycle.onMarket();assert.equal(calls,2);assert.equal(cycle.status().error,null);assert.equal(book.list()[0].fills,1);assert.equal(events.filter(e=>e==='AUTONOMOUS_DECISION').length,1);assert.equal(events.filter(e=>e==='RISK_APPROVED').length,1);
});
test('interruption after a saved candle but before execution is skipped after restart without claiming a fill',async()=>{
 const source={load:async()=>dataset()},bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>now);book.ensureEvaluation('nova',1000);await book.synchronize(liveQuote(now),[],async()=>{});let durable=book.exportState();
 const save=async(state:typeof durable)=>{durable=structuredClone(state);};const cycle=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligible()]),book,source,save,new MemoryStore(),bus,async()=>{throw Error('fixture evidence write interrupted');},()=>now);
 await assert.rejects(cycle.onMarket(),/interrupted/);assert.equal(durable.autonomousCursor,closed);assert.equal(book.list()[0].fills,0);
 const restored=new PerpetualPaperBook(new EventBus(),durable,()=>now);await restored.synchronize(liveQuote(now),[],save);const memories=new MemoryStore(),restarted=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligible()]),restored,source,save,memories,bus,async()=>{},()=>now);
 await restarted.onMarket();assert.equal(restored.list()[0].fills,0);assert.equal(memories.list().length,0);assert.equal(restored.status().autonomousCursor,closed);
});
test('runtime admission blocks signal retrieval until actual service recovery',async()=>{
 let admitted=false,calls=0;const source={load:async()=>{calls++;return dataset();}},bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>now),memories=new MemoryStore();book.ensureEvaluation('nova',1000);await book.synchronize(liveQuote(now),[],async()=>{});
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligible()]),book,source,async()=>{},memories,bus,async()=>{},()=>now,()=>admitted);
 await cycle.onMarket();assert.equal(calls,0);assert.equal(book.status().autonomousCursor,null);assert.equal(memories.list().length,0);
 admitted=true;await cycle.onMarket();assert.equal(calls,1);assert.equal(book.list()[0].fills,1);assert.equal(book.status().autonomousCursor,closed);
});
test('espera do candle (próximo piloto): antes do prazo não lê nem decide; depois decide uma vez; padrão 0 não muda nada',async()=>{
 assert.throws(()=>new AutonomousPerpetualCycle(true,'x',new PerpetualStudies({load:async()=>dataset()},[eligible()]),new PerpetualPaperBook(new EventBus()),{load:async()=>dataset()},async()=>{},new MemoryStore(),new EventBus(),async()=>{},()=>now,()=>true,{settleMs:400000}),/settle/);
 // Hora seguinte à do fixture (o estudo continua elegível), com candles até a hora que acabou de fechar.
 const hour=Math.floor(now/3600000)*3600000+3600000;let clock=hour+30000,calls=0;const shifted=()=>{const d=dataset();for(const c of [...d.trade,...d.mark])c.timestamp+=3600000;return d;};const source={load:async()=>{calls++;return shifted();}},bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>clock);book.ensureEvaluation('nova',1000);
 await book.synchronize({instrument:'BINANCE_USDM:BTCUSDT',symbol:'BTCUSDT',bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime:now+28800000,bookTime:clock,markTime:clock,receivedAt:clock},[],async()=>{});
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligible()]),book,source,async()=>{},new MemoryStore(),bus,async()=>{},()=>clock,()=>true,{settleMs:60000});
 assert.equal(cycle.status().settleSeconds,60);
 await cycle.onMarket();assert.equal(calls,0,'30 s depois da virada: ainda espera');
 clock=hour+61000;await book.synchronize({instrument:'BINANCE_USDM:BTCUSDT',symbol:'BTCUSDT',bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime:now+28800000,bookTime:clock,markTime:clock,receivedAt:clock},[],async()=>{});
 await cycle.onMarket();assert.equal(calls,1);assert.equal(book.list()[0].fills,1);await cycle.onMarket();assert.equal(calls,1,'nunca decide duas vezes a mesma hora');
});
