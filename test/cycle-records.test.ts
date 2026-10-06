import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {AutonomousPerpetualCycle,CYCLE_CHECKS_VERSION} from '../src/application/autonomous-perpetual-cycle.js';
import {PerpetualStudies} from '../src/application/perpetual-studies.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {EventAudit,registerEventAudit} from '../src/application/event-audit.js';
import {MemoryStore} from '../src/domain/memory.js';
import {event,type DomainEvent} from '../src/domain/events.js';
import {decisionReceipt,decisionReceipts} from '../src/application/decision-receipt.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {eligibleStudyFixture} from './fixtures/perpetual-study.js';

// Passo 5 do mapa ATS-MATRIX (lacunas L1, L2, L5, L6): o ciclo grava o que já checava, sem mudar nenhuma condição.
const now=1700000000000,closed=Math.floor(now/3600000)*3600000-3600000,account='evaluation:nova:usdm';
const release={codeCommit:'a'.repeat(40),backendFingerprint:'b'.repeat(64)};
const dataset=(instrument:PerpetualDataset['instrument']='BINANCE_USDM:BTCUSDT'):PerpetualDataset=>{const trade=Array.from({length:100},(_,i)=>({timestamp:closed-(99-i)*3600000,open:100+i,high:100+i,low:100+i,close:100+i,volume:1}));return {instrument,trade,mark:structuredClone(trade),funding:[]};};
const quote=(time:number)=>({instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime:time+28800000,bookTime:time,markTime:time,receivedAt:time});
async function run(load:()=>Promise<PerpetualDataset>,clock=()=>now){
 const bus=new EventBus(),events:DomainEvent[]=[],memories=new MemoryStore();bus.subscribe(e=>events.push(e));
 const book=new PerpetualPaperBook(bus,undefined,clock);book.ensureEvaluation('nova',1000);await book.synchronize(quote(clock()),[],async()=>{});
 const studies=new PerpetualStudies({load},[eligibleStudyFixture(now)]);
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',studies,book,{load},async()=>{},memories,bus,async()=>{},clock,()=>true,{release,retryDelayMs:0});
 return {bus,events,memories,book,cycle};
}

test('decisão grava as 7 checagens que a levaram até ali e a release; ordem, fill e checagem da entrada levam o ID da decisão',async()=>{
 const {events,book,cycle}=await run(async()=>dataset());await cycle.onMarket();
 const decision=events.find(e=>e.type==='AUTONOMOUS_DECISION')!,p=decision.payload as any;
 assert.equal(p.checksVersion,CYCLE_CHECKS_VERSION);assert.deepEqual(p.release,release);
 assert.deepEqual(p.checks.map((c:any)=>c.id),['STUDY_ELIGIBLE','PILOT_LOSS_LIMIT','NOT_HALTED','SOURCES_READY','DATASET_VALID','SIGNAL_FRESH','CANDLE_NOT_PROCESSED']);
 assert.ok(p.checks.every((c:any)=>c.ok));
 const order=events.find(e=>e.type==='TRADE_PROPOSED')!.payload as any,fill=(events.find(e=>e.type==='PAPER_FILL')!.payload as any).fill;
 assert.equal(order.decisionEventId,decision.id);assert.equal(fill.decisionEventId,decision.id);
 const entry=events.find(e=>e.type==='AUTONOMOUS_ENTRY_CHECKED')!.payload as any;
 assert.equal(entry.decisionEventId,decision.id);assert.equal(entry.outcome,'ENTRY_SUBMITTED');assert.equal(entry.reason,null);
 assert.deepEqual(entry.checks.map((c:any)=>[c.id,c.ok]),[['PRIMARY_DATA',true],['PROTECTIONS',true],['EQUITY_POSITIVE',true]]);
 // O livro com o novo campo continua restaurável (o fill com decisionEventId passa na validação do restore).
 assert.doesNotThrow(()=>new PerpetualPaperBook(new EventBus(),book.exportState(),()=>now));
});

test('dados de reserva: a mesma regra de sempre bloqueia, e agora o bloqueio é um evento com o motivo',async()=>{
 const {events,memories,cycle}=await run(async()=>dataset('BYBIT_LINEAR:BTCUSDT'));await cycle.onMarket();
 const entry=events.find(e=>e.type==='AUTONOMOUS_ENTRY_CHECKED')!.payload as any;
 assert.equal(entry.outcome,'ENTRY_BLOCKED');assert.equal(entry.reason,'BACKUP_DATA');assert.equal(entry.checks[0].ok,false);
 assert.equal(events.filter(e=>e.type==='TRADE_PROPOSED').length,0);
 // A memória do Sentinel continua sendo gravada como antes.
 assert.equal(memories.query({agentId:'sentinel',kind:'DECISION'})[0].metadata?.reason,'BACKUP_DATA');
});

test('falha repetida gera um evento só; outra falha e a recuperação também viram evento',async()=>{
 let mode='down';let clock=now;
 const {events,cycle}=await run(async()=>{if(mode==='down')throw Error('provider unavailable');if(mode==='other')throw Error('signal history stale');return dataset();},()=>clock);
 await cycle.onMarket().catch(()=>{});await cycle.onMarket().catch(()=>{});await cycle.onMarket().catch(()=>{});
 assert.equal(events.filter(e=>e.type==='AUTONOMOUS_ATTEMPT_FAILED').length,1);
 mode='other';await cycle.onMarket().catch(()=>{});
 assert.deepEqual(events.filter(e=>e.type==='AUTONOMOUS_ATTEMPT_FAILED').map(e=>(e.payload as any).reason),['provider unavailable','signal history stale']);
 mode='up';await cycle.onMarket();
 const rec=events.filter(e=>e.type==='AUTONOMOUS_ATTEMPT_RECOVERED');assert.equal(rec.length,1);assert.equal((rec[0].payload as any).previousReason,'signal history stale');
 assert.equal(events.filter(e=>e.type==='AUTONOMOUS_DECISION').length,1);
});

test('ficha V2: ligação por ID (ordem de outra decisão não entra), checagens, bloqueio por evento, falhas e release',async()=>{
 const {events,book,cycle,memories}=await run(async()=>dataset());await cycle.onMarket();
 const decision=events.find(e=>e.type==='AUTONOMOUS_DECISION')!;
 // Uma ordem com ID de outra decisão, dentro da janela desta, não pode entrar na ficha.
 const foreign={symbol:'BTCUSDT',side:'SELL',quantity:0.5,referencePrice:199,accountId:account,proposalId:'px',decisionEventId:'outra-decisao'};
 const extra=[event('TRADE_PROPOSED',foreign),event('RISK_REJECTED',{accountId:account,order:foreign,decision:{approved:false,reasons:['KILL_SWITCH'],notional:99}})];
 const failed=event('AUTONOMOUS_ATTEMPT_FAILED',{accountId:account,studyId:'controlled-study',reason:'provider unavailable',nextAttemptAt:0});
 const input={accountId:account,events:[...events,failed],ledger:[...book.ledger(account)!,...extra],memories:memories.query(),messages:[],now:Date.now()+60000};
 const {receipt}=decisionReceipt(input,decision.id)!;
 assert.equal(receipt.linkage,'DECISION_ID');assert.equal(receipt.actions.length,1);assert.equal(receipt.actions[0].side,'BUY');assert.equal(receipt.outcome,'EXECUTED');
 assert.equal(receipt.checks!.version,CYCLE_CHECKS_VERSION);assert.equal(receipt.checks!.decision.length,7);assert.equal(receipt.checks!.entryOutcome,'ENTRY_SUBMITTED');
 assert.equal(receipt.provenance.backendFingerprint,release.backendFingerprint);assert.equal(receipt.provenance.codeCommit,release.codeCommit);
 assert.deepEqual(receipt.attempts.map(a=>[a.kind,a.reason]),[['FAILED','provider unavailable']]);
 assert.equal(decisionReceipts(input,5).policy.version,'DECISION_RECEIPT_V2');
 // Bloqueio por evento.
 const b=await run(async()=>dataset('BYBIT_LINEAR:BTCUSDT'));await b.cycle.onMarket();
 const bd=b.events.find(e=>e.type==='AUTONOMOUS_DECISION')!;
 const br=decisionReceipt({accountId:account,events:b.events,ledger:b.book.ledger(account)!,memories:b.memories.query(),messages:[],now:Date.now()+60000},bd.id)!.receipt;
 assert.equal(br.outcome,'ENTRY_BLOCKED');assert.deepEqual(br.blocks.map(x=>[x.reason,x.source]),[['BACKUP_DATA','EVENT']]);
});

test('a auditoria aceita e filtra os novos tipos de evento',async()=>{
 const e=event('AUTONOMOUS_ENTRY_CHECKED',{accountId:account,decisionEventId:'d',checks:[],outcome:'ENTRY_BLOCKED',reason:'BACKUP_DATA'});
 const audit=new EventAudit(()=>({memories:[],agents:[],domainEvents:[e]} as any));const app=Fastify();registerEventAudit(app,audit);
 try{const r=await app.inject('/audit/events?type=AUTONOMOUS_ENTRY_CHECKED');assert.equal(r.statusCode,200);assert.equal(r.json().events.length,1);
  for(const t of ['AUTONOMOUS_ATTEMPT_FAILED','AUTONOMOUS_ATTEMPT_RECOVERED'])assert.equal((await app.inject('/audit/events?type='+t)).statusCode,200);}
 finally{await app.close();}
});
