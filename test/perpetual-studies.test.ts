import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {PerpetualStudies,registerPerpetualStudies} from '../src/application/perpetual-studies.js';
import {AgentRegistry} from '../src/domain/agents.js';
import {AgentCoordinator} from '../src/application/agent-coordinator.js';
import {EventBus} from '../src/application/event-bus.js';
import {walkForwardPerpetual} from '../src/domain/perpetual-walk-forward.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
const data=(n:number):PerpetualDataset=>{const trade=Array.from({length:n},(_,i)=>({timestamp:i*3600000,open:100+i,high:100+i,low:100+i,close:100+i,volume:1}));return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]};};
const cfg={initialCapital:1000,feeRate:0.001,slippageBps:0,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:2,slowPeriod:5};
test('walk-forward selects before test observations and includes warmup without opening positions there',()=>{
 const a=data(60),b=structuredClone(a);for(let i=30;i<60;i++)for(const series of [b.trade,b.mark]){series[i].close=500+i;series[i].open=500+i;series[i].high=500+i;series[i].low=500+i;}
 const run=(d:PerpetualDataset)=>walkForwardPerpetual(d,[cfg,{...cfg,fastPeriod:3,slowPeriod:8}],30,10);
 const x=run(a),y=run(b);assert.equal(x.folds[0].selectedCandidate,y.folds[0].selectedCandidate);assert.equal(x.folds[0].trainingNetPnl,y.folds[0].trainingNetPnl);assert.equal(x.folds.length,3);
 assert.ok(x.folds[0].result.audit.filter(e=>e.kind==='FILL').every(e=>e.timestamp>=x.folds[0].testStart));assert.equal(x.automaticPaperApproval,false);
});
test('study API rejects claimed results, retains source failures and emits no paper execution',async()=>{
 const bus=new EventBus(),coordinator=new AgentCoordinator(new AgentRegistry(),bus),events:string[]=[];bus.subscribe(e=>events.push(e.type));
 const studies=new PerpetualStudies({load:async()=>{throw new Error('source unavailable');}});const app=Fastify();registerPerpetualStudies(app,studies,async()=>{},coordinator,bus);
 try{assert.equal((await app.inject({method:'POST',url:'/backtests/v2/studies',payload:{result:{netPnl:123}}})).statusCode,400);
 const response=await app.inject({method:'POST',url:'/backtests/v2/studies',payload:{bars:300,trainBars:100,testBars:50}});assert.equal(response.statusCode,202);
 await new Promise(resolve=>setImmediate(resolve));const record=studies.get(response.json().id)!;assert.equal(record.status,'FAILED');assert.equal(record.result,undefined);assert.equal(record.error,'source unavailable');assert.ok(events.includes('BACKTEST_FAILED'));assert.ok(!events.includes('PAPER_FILL'));assert.equal(coordinator.registry.get('euler')!.status,'IDLE');
 }finally{await app.close();}
});
test('pending studies restore as interrupted rather than completed',()=>{const studies=new PerpetualStudies({load:async()=>data(300)},[{id:'pending',status:'RUNNING',createdAt:'2026-01-01',request:{bars:300,trainBars:100,testBars:50}}]);assert.equal(studies.get('pending')!.status,'INTERRUPTED');assert.equal(studies.get('pending')!.result,undefined);});

test('historical drain rejects new work and waits for the active source and final durable outcome',async()=>{
 let release!:(data:PerpetualDataset)=>void;const pending=new Promise<PerpetualDataset>(resolve=>{release=resolve;});const bus=new EventBus(),coordinator=new AgentCoordinator(new AgentRegistry(),bus),studies=new PerpetualStudies({load:async()=>pending});let retained:ReturnType<PerpetualStudies['list']>=[];
 const save=async()=>{retained=studies.list();};const study=await studies.start({bars:300,trainBars:100,testBars:50},save,coordinator,bus);let finished=false;const draining=studies.drain().then(()=>{finished=true;});
 assert.equal(studies.status().accepting,false);assert.equal(studies.status().activeTasks,1);await assert.rejects(studies.start({bars:300,trainBars:100,testBars:50},save,coordinator,bus),/runtime draining/);assert.equal(finished,false);release(data(300));await draining;assert.equal(studies.status().activeTasks,0);assert.equal(studies.status().busy,false);assert.equal(retained.find(r=>r.id===study.id)?.status,'COMPLETED');assert.equal(studies.status().persistenceFailed,false);
});
test('draining joins an initial persistence failure without inventing an accepted study',async()=>{
 let rejectSave!:(error:Error)=>void;const pending=new Promise<void>((_resolve,reject)=>{rejectSave=reject;});const bus=new EventBus(),coordinator=new AgentCoordinator(new AgentRegistry(),bus);let sourceCalls=0;const studies=new PerpetualStudies({load:async()=>{sourceCalls++;return data(300);}});
 const starting=studies.start({bars:300,trainBars:100,testBars:50},()=>pending,coordinator,bus);const failed=assert.rejects(starting,/storage offline/);const draining=studies.drain();rejectSave(Error('storage offline'));await failed;await draining;assert.equal(sourceCalls,0);assert.equal(studies.list().length,0);assert.equal(studies.status().activeTasks,0);
});
test('a failed final historical write drains safely and remains visible in runtime diagnostics',async()=>{
 const bus=new EventBus(),coordinator=new AgentCoordinator(new AgentRegistry(),bus),studies=new PerpetualStudies({load:async()=>{throw Error('source unavailable');}});let saves=0;
 await studies.start({bars:300,trainBars:100,testBars:50},async()=>{if(++saves===3)throw Error('test-only database credential must stay private');},coordinator,bus);await studies.drain();assert.equal(studies.status().persistenceFailed,true);assert.equal(studies.status().busy,false);assert.equal(studies.status().activeTasks,0);assert.equal(JSON.stringify(studies.status()).includes('credential'),false);
});
