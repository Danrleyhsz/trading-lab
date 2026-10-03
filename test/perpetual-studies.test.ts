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
