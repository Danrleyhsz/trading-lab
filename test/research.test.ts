import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {ResearchRunStore,researchDataset} from '../src/domain/research.js';
import {ResearchEngine,type ResearchSources} from '../src/application/research-engine.js';
import {registerResearchRoutes} from '../src/application/research-routes.js';
import {AgentRegistry} from '../src/domain/agents.js';
import {AgentCoordinator} from '../src/application/agent-coordinator.js';
import {AgentCollaboration} from '../src/application/agent-collaboration.js';
import {MemoryStore} from '../src/domain/memory.js';
import {AgentMessageBus} from '../src/domain/agent-messages.js';
import {StrategyRegistry} from '../src/domain/strategy.js';
import {StrategyLab} from '../src/application/strategy-lab.js';
import {HistoricalBacktester,type Candle} from '../src/domain/backtest.js';
import {EventBus} from '../src/application/event-bus.js';
import type {DomainEvent} from '../src/domain/events.js';
function sourceFixture():ResearchSources {
 const now=Date.now(),end=Math.floor(now/3600000)*3600000-3600000;
 const candles:Candle[]=Array.from({length:100},(_,i)=>({timestamp:end-(99-i)*3600000,open:100,high:101,low:99,close:100,volume:100}));
 return {snapshot:async()=>({symbol:'BTCUSDT',price:100,bid:99.99,ask:100.01,spread:0.02,spreadBps:2,timestamp:now}),candles:async()=>structuredClone(candles)};
}
function setup(source=sourceFixture()){
 const bus=new EventBus(),events:DomainEvent[]=[],agents=new AgentRegistry(),coordinator=new AgentCoordinator(agents,bus),messages=new AgentMessageBus(),memories=new MemoryStore(),strategies=new StrategyRegistry(),runs=new ResearchRunStore();
 bus.subscribe(event=>events.push(event));
 const collaboration=new AgentCollaboration(messages,coordinator,memories),lab=new StrategyLab(strategies,coordinator,memories);
 const engine=new ResearchEngine(source,coordinator,collaboration,messages,memories,strategies,lab,new HistoricalBacktester(),runs,bus);
 return {engine,events,agents,messages,memories,strategies,runs};
}
test('research preserves rejected hypotheses, input evidence and real specialist output without trading',async()=>{
 const h=setup(),run=await h.engine.run(100);
 assert.equal(run.status,'REJECTED');assert.equal(run.backtest?.trades,0);assert.equal(run.dataset?.candles.length,100);assert.equal(run.dataset?.hash.length,64);
 assert.deepEqual(run.findings.map(finding=>finding.agentId),['satoshi','flux','vega','oracle']);
 assert.equal(h.messages.list('flux').find(message=>message.from==='flux')?.kind,'RESEARCH_FINDING');
 assert.ok(h.memories.list('atlas').some(memory=>memory.kind==='FAILURE'));
 const sources=new Set(run.events.map(event=>event.id));
 for(const memory of h.memories.list().filter(memory=>memory.sourceEventId))assert.ok(sources.has(memory.sourceEventId!));
 assert.equal(h.events.filter(event=>event.type==='PAPER_FILL'||event.type==='TRADE_PROPOSED'||event.type==='RISK_APPROVED').length,0);
 assert.equal(h.agents.get('nova')!.experience,0);assert.equal(h.agents.get('sentinel')!.experience,0);
 for(const id of ['atlas','euler','satoshi','flux','vega','oracle'] as const)assert.equal(h.agents.get(id)!.status,'IDLE');
 const restoredRuns=new ResearchRunStore();restoredRuns.hydrate(JSON.parse(JSON.stringify(h.runs.list())));
 const restoredStrategies=new StrategyRegistry();restoredStrategies.hydrate(h.strategies.list());
 assert.equal(restoredRuns.get(run.id)?.status,'REJECTED');assert.equal(restoredStrategies.get(run.strategyId!)?.status,'REJECTED');
 assert.equal('dataset' in restoredRuns.summaries()[0]!,false);
});
test('unavailable data creates an explicit failure and no fabricated measurements or backtest',async()=>{
 const h=setup({snapshot:async()=>{throw Error('provider unavailable')},candles:async()=>[]});
 const run=await h.engine.run(100);
 assert.equal(run.status,'FAILED');assert.equal(run.dataset,undefined);assert.equal(run.backtest,undefined);assert.equal(run.findings.length,0);assert.equal(h.strategies.list().length,0);
 assert.equal(h.memories.list('atlas')[0]!.kind,'FAILURE');assert.equal(h.memories.list('flux').length,0);assert.equal(h.agents.get('flux')!.experience,0);assert.equal(h.agents.get('atlas')!.status,'IDLE');
 assert.ok(run.events.some(event=>event.id===h.memories.list('atlas')[0]!.sourceEventId));
});
test('dataset rejects gaps, invalid candle bounds and stale quotes, and excludes only the unfinished candle',async()=>{
 const source=sourceFixture(),snapshot=await source.snapshot('BTCUSDT'),candles=await source.candles('BTCUSDT','1h',100);
 const invalid=structuredClone(candles);invalid[1]!.timestamp+=1;assert.throws(()=>researchDataset(snapshot,invalid),/non-contiguous/);
 const bounds=structuredClone(candles);bounds[1]!.low=999;assert.throws(()=>researchDataset(snapshot,bounds),/bounds/);
 assert.throws(()=>researchDataset({...snapshot,timestamp:Date.now()-120000},candles),/stale/);
 const last=candles.at(-1)!;candles.push({...last,timestamp:last.timestamp+3600000});assert.equal(researchDataset(snapshot,candles).candles.length,100);
});
test('research rejects overlapping runs and public requests cannot supply invented evidence/results',async()=>{
 let release:()=>void=()=>{};const pending=new Promise<void>(resolve=>release=resolve),source=sourceFixture(),h=setup({...source,snapshot:async(symbol)=>{await pending;return source.snapshot(symbol)}});
 const first=h.engine.run(100);await assert.rejects(()=>h.engine.run(100),/already running/);release();await first;
 const app=Fastify();registerResearchRoutes(app,h.engine,async()=>{});
 try{
  assert.equal((await app.inject({method:'POST',url:'/research/run',payload:{symbol:'BTCUSDT',candles:[],netPnl:1000000}})).statusCode,400);
  assert.equal((await app.inject('/research/runs/missing')).statusCode,404);
  assert.equal((await app.inject('/research/runs')).json().length,1);
 }finally{await app.close()}
});

test('positive historical screens keep their evidence and never promote themselves to paper execution',async()=>{
 const now=Date.now(),end=Math.floor(now/3600000)*3600000-3600000,source=sourceFixture();
 const candles:Candle[]=Array.from({length:1000},(_,i)=>{const close=100+15*Math.sin(i*Math.PI*2/80);return {timestamp:end-(999-i)*3600000,open:close,high:close+1,low:close-1,close,volume:100}});
 const h=setup({...source,candles:async()=>candles}),run=await h.engine.run(1000);
 assert.equal(run.status,'SCREEN_PASSED');assert.ok(run.backtest!.trades>=10);assert.ok(run.backtest!.netPnl>0);
 assert.ok(h.memories.list('atlas').some(memory=>memory.kind==='LESSON'&&memory.strategyId===run.strategyId));
 assert.equal(h.events.some(event=>event.type==='PAPER_FILL'||event.type==='PAPER_ORDER_SUBMITTED'),false);
 assert.equal(h.agents.get('nova')!.experience,0);
});
