import test from 'node:test';
import assert from 'node:assert/strict';
import {projectAccountPerformance} from '../src/domain/account-performance.js';
import {PERPETUAL_INSTRUMENT} from '../src/domain/perpetual-market.js';
import type {DomainEvent} from '../src/domain/events.js';
import {Portfolio} from '../src/domain/portfolio.js';
const id='evaluation:nova:usdm',at=(hour:number)=>Date.UTC(2026,0,1,hour);
const fill=(eventId:string,hour:number,side:'BUY'|'SELL',quantity:number,price:number,fee:number):DomainEvent=>({id:eventId,type:'PAPER_FILL',occurredAt:new Date(at(hour)).toISOString(),payload:{accountId:id,fill:{id:'fill-'+eventId,accountId:id,agentId:'nova',symbol:'BTCUSDT',instrument:PERPETUAL_INSTRUMENT,side,quantity,referencePrice:price,fillPrice:price,fee,filledAt:new Date(at(hour)).toISOString()}}});
const funding=(eventId:string,hour:number,quantity:number,cashDelta:number):DomainEvent=>({id:eventId,type:'FUNDING_SETTLED',occurredAt:new Date(at(hour+2)).toISOString(),payload:{accountId:id,symbol:'BTCUSDT',timestamp:at(hour),quantity,cashDelta}});
test('closed-trade performance includes partial closing fees and late-published real funding without changing history',()=>{
 const ledger=[fill('open',0,'BUY',2,100,2),fill('partial',2,'SELL',1,110,1),fill('close',4,'SELL',1,90,1),funding('funding',1,2,-3)];
 const original=structuredClone(ledger),result=projectAccountPerformance(ledger,id,PERPETUAL_INSTRUMENT);
 assert.equal(result.available,true);assert.equal(result.summary.closedTrades,1);assert.equal(result.summary.losses,1);assert.equal(result.summary.winRate,0);
 assert.equal(result.closedTrades[0].grossPnl,0);assert.equal(result.closedTrades[0].netPnl,-7);
 assert.deepEqual(result.closedTrades[0].fillEventIds,['open','partial','close']);assert.deepEqual(result.closedTrades[0].fundingEventIds,['funding']);assert.deepEqual(ledger,original);
});
test('reversal splits one actual fee and keeps current lifecycle out of the win rate',()=>{
 const result=projectAccountPerformance([fill('long',0,'BUY',1,100,1),fill('reverse',1,'SELL',2,110,2),fill('cover',2,'BUY',0.5,100,0.5)],id,PERPETUAL_INSTRUMENT);
 assert.equal(result.summary.closedTrades,1);assert.equal(result.summary.winRate,1);assert.equal(result.closedTrades[0].netPnl,8);
 assert.equal(result.openTrades[0].quantity,-0.5);assert.equal(result.openTrades[0].netRealizedPnl,3.5);assert.equal(result.summary.realizedNetPnl,11.5);assert.equal(result.summary.feesPaid,3.5);
});
test('short funding and same-timestamp ordering reconcile cash with replayed actual fills',()=>{
 const ledger=[fill('short',0,'SELL',2,100,2),fill('cover',2,'BUY',2,90,2),funding('settled',2,-2,3)];
 const result=projectAccountPerformance(ledger,id,PERPETUAL_INSTRUMENT),portfolio=new Portfolio(1000);
 for(const event of ledger){if(event.type==='PAPER_FILL')portfolio.applyFill((event.payload as any).fill);else portfolio.adjustCash((event.payload as any).cashDelta);}
 assert.equal(result.closedTrades[0].netPnl,19);assert.equal(result.summary.realizedNetPnl,portfolio.snapshot().cash-1000);
});
test('incomplete attribution, duplicate events and inconsistent funding do not create performance claims',()=>{
 const event=fill('open',0,'BUY',1,100,1);
 for(const ledger of [[event,event],[event,funding('bad',1,2,-1)],[{...event,payload:{fill:{...(event.payload as any).fill,accountId:'fund'}}}]]){
  const result=projectAccountPerformance(ledger,id,PERPETUAL_INSTRUMENT);assert.equal(result.available,false);assert.equal(result.summary.winRate,null);assert.equal(result.closedTrades.length,0);
 }
 assert.equal(projectAccountPerformance([],id,PERPETUAL_INSTRUMENT).summary.winRate,null);
});
test('scaling and independent symbols reconcile closed and ongoing realized results without counting open positions as trades',()=>{
 const ledger=[fill('a',0,'BUY',1,100,1),fill('b',1,'BUY',1,120,1),fill('c',2,'SELL',1,130,1),fill('d',3,'SELL',1,90,1),fill('e',4,'SELL',1,100,1)];
 const result=projectAccountPerformance(ledger,id,PERPETUAL_INSTRUMENT);
 assert.equal(result.closedTrades[0].grossPnl,0);assert.equal(result.closedTrades[0].netPnl,-4);assert.equal(result.openTrades.length,1);assert.equal(result.summary.realizedNetPnl,-5);
});
import Fastify from 'fastify';
import {registerPerformanceRoute} from '../src/application/performance-routes.js';
test('performance audit pages use original closing event cursors and reject unsupported query fields',async()=>{
 const performance=projectAccountPerformance([fill('a',0,'BUY',1,100,1),fill('b',1,'SELL',1,110,1),fill('c',2,'BUY',1,100,1),fill('d',3,'SELL',1,90,1)],id,PERPETUAL_INSTRUMENT);
 const app=Fastify();registerPerformanceRoute(app,'/accounts/:id/performance',accountId=>accountId===id?structuredClone(performance):undefined);
 try{
  const first=(await app.inject('/accounts/'+id+'/performance?limit=1')).json();
  assert.equal(first.summary.closedTrades,2);assert.equal(first.closedTrades.length,1);assert.equal(first.closedTrades[0].netPnl,-12);assert.equal(first.nextCursor,'d');
  const next=(await app.inject('/accounts/'+id+'/performance?limit=1&before=d')).json();assert.equal(next.closedTrades[0].netPnl,8);assert.equal(next.nextCursor,null);
  assert.equal((await app.inject('/accounts/'+id+'/performance?before=missing')).statusCode,400);
  assert.equal((await app.inject('/accounts/'+id+'/performance?invented=true')).statusCode,400);
  assert.equal((await app.inject('/accounts/fund/performance')).statusCode,404);
 }finally{await app.close();}
});
