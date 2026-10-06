import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotReport,PILOT_EVALUATION_PROTOCOL} from '../src/application/pilot-report.js';
import type {DomainEvent} from '../src/domain/events.js';

const H=3600000,t0=Date.UTC(2026,9,4,23);
const ev=(type:string,at:number,payload:unknown):DomainEvent=>({id:type+at,type:type as never,occurredAt:new Date(at).toISOString(),payload});
const decision=(at:number,direction:number)=>ev('AUTONOMOUS_DECISION',at,{accountId:'a',direction,candleTimestamp:at-H,signalDataset:{trade:[{close:100000}]}});
const base={accountId:'a',ledger:[],equity:1010,initialCash:1000,maxDrawdown:0.01,equityPoints:[{timestamp:t0-60000,equity:999.9}],closedTrades:[],mark:105000,now:t0+7*24*H};

test('the report measures the pilot from its first decision against flat and same-exposure buy and hold',()=>{
 const r:any=pilotReport({...base,events:[decision(t0,0),decision(t0+H,1),decision(t0+2*H,-1)],autonomous:{enabled:false,eligible:false,stopReason:null,studyId:'s'}});
 assert.equal(r.startEquity,999.9,'pre-pilot fills stay out of the pilot result');assert.equal(r.pnl.toFixed(2),'10.10');
 assert.equal(r.benchmarks.btcReturn.toFixed(4),'0.0500');assert.equal(r.metrics.marketChange,r.benchmarks.btcReturn,'métrica e referência do piloto são o mesmo número');assert.equal(r.benchmarks.buyAndHoldSameExposure.toFixed(3),(999.9*0.1*0.05).toFixed(3));
 assert.deepEqual(r.decisions,{total:3,long:1,short:1,flat:1});
 assert.equal(r.verdict,'INSUFFICIENT_EVIDENCE','fewer than '+PILOT_EVALUATION_PROTOCOL.minimumClosedTrades+' closed trades');assert.match(r.nextStep,/Não estender/);
});

test('verdicts follow the pre-declared protocol',()=>{
 const trades=[1,2,3].map(i=>({openedAt:new Date(t0+i*H).toISOString(),closedAt:new Date(t0+i*H+60000).toISOString(),netPnl:4}));
 const run=(over:object)=>(pilotReport({...base,events:[decision(t0,1)],closedTrades:trades,autonomous:{enabled:false,eligible:false,stopReason:null,studyId:'s'},...over}) as any);
 assert.equal(run({}).verdict,'OUTPERFORMED');
 assert.equal(run({mark:200000}).verdict,'POSITIVE_BELOW_BENCHMARK','buy and hold with the same exposure did better');
 assert.equal(run({equity:990}).verdict,'UNDERPERFORMED');
 assert.equal(run({autonomous:{enabled:false,eligible:false,stopReason:'PILOT_LOSS_LIMIT',studyId:'s'}}).verdict,'STOPPED_BY_LOSS_LIMIT');
 const live=run({autonomous:{enabled:true,eligible:true,stopReason:null,studyId:'s'}});assert.equal(live.verdict,'IN_PROGRESS');assert.equal(live.provisionalVerdict,'OUTPERFORMED');
 assert.equal((pilotReport({...base,events:[],autonomous:{enabled:true,eligible:true,stopReason:null,studyId:'s'}}) as any).status,'NO_DECISIONS');
});
