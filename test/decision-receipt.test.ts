import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {AutonomousPerpetualCycle} from '../src/application/autonomous-perpetual-cycle.js';
import {PerpetualStudies} from '../src/application/perpetual-studies.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {PilotTeamBriefing} from '../src/application/pilot-team-briefing.js';
import {AgentMessageBus} from '../src/domain/agent-messages.js';
import {MemoryStore} from '../src/domain/memory.js';
import {event,type DomainEvent} from '../src/domain/events.js';
import {decisionReceipt,decisionReceipts,registerDecisionReceipts,type ReceiptInput} from '../src/application/decision-receipt.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {eligibleStudyFixture} from './fixtures/perpetual-study.js';

const now=1700000000000,closed=Math.floor(now/3600000)*3600000-3600000,account='evaluation:nova:usdm';
const dataset=(instrument:PerpetualDataset['instrument']='BINANCE_USDM:BTCUSDT'):PerpetualDataset=>{const trade=Array.from({length:100},(_,i)=>({timestamp:closed-(99-i)*3600000,open:100+i,high:100+i,low:100+i,close:100+i,volume:1}));return {instrument,trade,mark:structuredClone(trade),funding:[]};};
const quote=(time:number)=>({instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime:time+28800000,bookTime:time,markTime:time,receivedAt:time});

/** Ciclo de produção em memória (mesmo arranjo dos testes do piloto) com briefing da equipe. */
async function pilotRun(instrument:PerpetualDataset['instrument']){
 const bus=new EventBus(),events:DomainEvent[]=[],memories=new MemoryStore(),messages=new AgentMessageBus(),team=new PilotTeamBriefing(messages);
 bus.subscribe(e=>{events.push(e);if(e.type==='RISK_APPROVED'||e.type==='RISK_REJECTED')team.riskReview(e.type==='RISK_APPROVED',e.payload as never);});
 const book=new PerpetualPaperBook(bus,undefined,()=>now);book.ensureEvaluation('nova',1000);await book.synchronize(quote(now),[],async()=>{});
 const source={load:async()=>dataset(instrument)},studies=new PerpetualStudies(source,[eligibleStudyFixture(now)]);
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',studies,book,source,async()=>{},memories,bus,async()=>{},()=>now,()=>true,{onDecision:c=>team.brief(c)});
 await cycle.onMarket();
 const input:ReceiptInput={accountId:account,events,ledger:book.ledger(account)!,memories:memories.query(),messages:messages.list(),now:Date.now()+60000};
 return {input,decision:events.find(e=>e.type==='AUTONOMOUS_DECISION')!};
}

test('recibo de uma entrada executada pelo ciclo real: proposta, risco, fill, equipe e latência, sem o conjunto de candles',async()=>{
 const {input,decision}=await pilotRun('BINANCE_USDM:BTCUSDT');
 const {receipt}=decisionReceipt(input,decision.id)!;
 assert.equal(receipt.outcome,'EXECUTED');assert.equal(receipt.complete,true);
 assert.equal(receipt.actions.length,1);assert.equal(receipt.actions[0].side,'BUY');assert.deepEqual(receipt.actions[0].risk,{approved:true,reasons:[]});assert.ok(receipt.actions[0].fill);
 assert.equal(receipt.proposal.positionBefore,0);assert.ok(receipt.proposal.positionAfter!>0);
 assert.equal(receipt.provenance.signalCandles!.count,100);assert.equal(receipt.provenance.backendFingerprint,null);
 assert.ok(receipt.team.some(m=>m.kind==='EXECUTION_PLAN')&&receipt.team.some(m=>m.kind==='RISK_REVIEW'&&!m.advisoryOnly));
 // Os eventos levam o relógio real (event()), não o relógio simulado do teste.
 assert.equal(receipt.latencySeconds.closeToDecision,(Date.parse(decision.occurredAt)-closed-3600000)/1000);assert.ok(receipt.latencySeconds.decisionToFirstFill!>=0&&receipt.latencySeconds.decisionToFirstFill!<5);
 // O recibo nunca devolve os candles brutos da decisão.
 assert.ok(!JSON.stringify(receipt).includes('"signalDataset"')&&!JSON.stringify(receipt).includes('"trade"'));
});

test('com dados de reserva o recibo mostra a entrada bloqueada pelo ciclo, não uma lacuna',async()=>{
 const {input,decision}=await pilotRun('BYBIT_LINEAR:BTCUSDT');
 const {receipt}=decisionReceipt(input,decision.id)!;
 assert.equal(receipt.outcome,'ENTRY_BLOCKED');assert.equal(receipt.actions.length,0);assert.equal(receipt.blocks[0].reason,'BACKUP_DATA');assert.equal(receipt.complete,true);
});

/** Eventos gravados à mão para os desfechos que o ciclo real não produz num único candle. */
function recorded(direction:number,currentQuantity:number,at:number,candle=closed){
 const e=event('AUTONOMOUS_DECISION',{accountId:account,studyId:'s',candleTimestamp:candle,direction,currentQuantity,configuration:{}});e.occurredAt=new Date(at).toISOString();return e;
}
const stamp=(e:DomainEvent,at:number)=>{e.occurredAt=new Date(at).toISOString();return e;};
const base=(events:DomainEvent[],ledger:DomainEvent[]=[],at=now):ReceiptInput=>({accountId:account,events,ledger,memories:[],messages:[],now:at});

test('rejeição do risco, parada do piloto, nada a fazer, pendente e sem explicação',()=>{
 const order={symbol:'BTCUSDT',side:'BUY' as const,quantity:1,referencePrice:199,accountId:account,proposalId:'p1'};
 const d1=recorded(1,0,now);
 const rejected=base([d1],[stamp(event('TRADE_PROPOSED',order),now),stamp(event('RISK_REJECTED',{accountId:account,order,decision:{approved:false,reasons:['DRAWDOWN_LIMIT'],notional:199}}),now)]);
 const r=decisionReceipt(rejected,d1.id)!.receipt;assert.equal(r.outcome,'RISK_REJECTED');assert.deepEqual(r.actions[0].risk,{approved:false,reasons:['DRAWDOWN_LIMIT']});
 assert.equal(decisionReceipts(rejected,10).summary.reasons['RISK:DRAWDOWN_LIMIT'],1);
 const stop=stamp(event('AUTONOMOUS_PILOT_STOPPED',{accountId:account,studyId:'s',reason:'PILOT_LOSS_LIMIT'}),now+1000);
 assert.equal(decisionReceipt(base([d1,stop]),d1.id)!.receipt.outcome,'PILOT_STOPPED');
 // Já comprado e o sinal continua comprado: nada a executar.
 const held=recorded(1,0.5,now);assert.equal(decisionReceipt(base([held]),held.id)!.receipt.outcome,'NO_ACTION_NEEDED');
 // Sem nada gravado: pendente nos primeiros 5 min da última decisão, depois sem explicação.
 assert.equal(decisionReceipt(base([d1],[],now+60000),d1.id)!.receipt.outcome,'PENDING');
 const late=decisionReceipt(base([d1],[],now+600000),d1.id)!.receipt;assert.equal(late.outcome,'UNEXPLAINED');assert.equal(late.complete,false);
});

test('a ordem pertence só à janela da sua decisão; o resumo conta completos e latência p50/p95',()=>{
 const order={symbol:'BTCUSDT',side:'BUY' as const,quantity:1,referencePrice:199,accountId:account,proposalId:'p2'};
 const d1=recorded(1,0,now-3600000,closed-3600000),d2=recorded(1,0,now);
 const ledger=[stamp(event('TRADE_PROPOSED',order),now+10),stamp(event('RISK_APPROVED',{accountId:account,order,decision:{approved:true,reasons:[],notional:199}}),now+10),stamp(event('PAPER_FILL',{accountId:account,fill:{...order,id:'f2',fillPrice:199.1,fee:0.1,filledAt:new Date(now+10).toISOString()}}),now+10)];
 const input=base([d2,d1],ledger,now+600000);
 assert.equal(decisionReceipt(input,d1.id)!.receipt.outcome,'UNEXPLAINED');
 const r2=decisionReceipt(input,d2.id)!.receipt;assert.equal(r2.outcome,'EXECUTED');assert.equal(r2.latencySeconds.decisionToFirstFill,0.01);
 const all=decisionReceipts(input,1);
 assert.equal(all.receipts.length,1);assert.equal(all.receipts[0].decisionEventId,d2.id);
 assert.equal(all.summary.decisions,2);assert.equal(all.summary.complete,1);assert.equal(all.summary.completeFraction,0.5);
 assert.deepEqual(all.summary.closeToDecisionSeconds,{p50:(now-closed-3600000)/1000,p95:(now-closed-3600000)/1000,max:(now-closed-3600000)/1000});
 // Outra conta não entra.
 assert.equal(decisionReceipts({...input,accountId:'evaluation:vega:usdm'},10).summary.decisions,0);
});

test('rotas de recibo: só leitura, limites validados e 404 para decisão desconhecida',async()=>{
 const {input,decision}=await pilotRun('BINANCE_USDM:BTCUSDT');
 const app=Fastify();registerDecisionReceipts(app,()=>input);
 const list=await app.inject({method:'GET',url:'/paper/perpetual/pilot/receipts?limit=5'});assert.equal(list.statusCode,200);assert.equal(list.json().receipts[0].decisionEventId,decision.id);
 assert.equal((await app.inject({method:'GET',url:'/paper/perpetual/pilot/receipts?limit=0'})).statusCode,400);
 assert.equal((await app.inject({method:'GET',url:'/paper/perpetual/pilot/receipts?limit=101'})).statusCode,400);
 const one=await app.inject({method:'GET',url:'/paper/perpetual/pilot/receipts/'+decision.id});assert.equal(one.statusCode,200);assert.equal(one.json().receipt.outcome,'EXECUTED');
 assert.equal((await app.inject({method:'GET',url:'/paper/perpetual/pilot/receipts/nope'})).statusCode,404);
 await app.close();
});

test('decisão antiga sem posição gravada usa a posição reconstruída pelos fills anteriores',()=>{
 const order={symbol:'BTCUSDT',side:'BUY' as const,quantity:0.5,referencePrice:199,accountId:account,proposalId:'p0'};
 const old=event('AUTONOMOUS_DECISION',{accountId:account,studyId:'s',candleTimestamp:closed,direction:1,configuration:{}});old.occurredAt=new Date(now).toISOString();
 const fill=stamp(event('PAPER_FILL',{accountId:account,fill:{...order,id:'f0',fillPrice:199,fee:0,filledAt:new Date(now-7200000).toISOString()}}),now-7200000);
 const r=decisionReceipt(base([old],[fill],now+600000),old.id)!.receipt;
 assert.equal(r.proposal.positionSource,'FILLS');assert.equal(r.proposal.positionBefore,0.5);assert.equal(r.outcome,'NO_ACTION_NEEDED');
 // O fill anterior à decisão não entra como ação dela.
 assert.equal(r.actions.length,0);
});
