import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {event,type DomainEvent} from '../src/domain/events.js';
import {decisionReceipts} from '../src/application/decision-receipt.js';

// Escritório 2.0, fase F2: o Anel de decisão lê as fichas reais (mesma função do servidor) e nunca mostra "OK" para o
// que não foi gravado.
function ring(){const c=vm.createContext({Math,Object,Array,Set,Map,Number,String,JSON,Date,Infinity});vm.runInContext(readFileSync('public/office2/ring.js','utf8'),c);return c.Office2Ring;}
const account='evaluation:nova:usdm',closed=Date.UTC(2026,9,6,12),at=(ms:number)=>new Date(ms).toISOString();
const stamp=(e:DomainEvent,ms:number)=>{e.occurredAt=at(ms);return e;};
function decision(direction:number,current:number,candle:number){return stamp(event('AUTONOMOUS_DECISION',{accountId:account,studyId:'d674cb32-x',candleTimestamp:candle,direction,currentQuantity:current,configuration:{}}),candle+3600000+5000);}
const order=(id:string,side:'BUY'|'SELL')=>({symbol:'BTCUSDT',side,quantity:0.001,referencePrice:60000,accountId:account,proposalId:id});
/** Três horas gravadas: entrada executada, entrada rejeitada pelo risco, entrada bloqueada pelo ciclo; e uma sem ação. */
function receipts(){
 const d1=decision(1,0,closed),d2=decision(1,0,closed+3600000),d3=decision(-1,0,closed+7200000),d4=decision(0,0,closed+10800000),t=(d:DomainEvent)=>Date.parse(d.occurredAt)+10;
 const o1=order('p1','BUY'),o2=order('p2','BUY');
 const ledger=[stamp(event('TRADE_PROPOSED',o1),t(d1)),stamp(event('RISK_APPROVED',{accountId:account,order:o1,decision:{approved:true,reasons:[],notional:60}}),t(d1)),stamp(event('PAPER_FILL',{accountId:account,fill:{...o1,id:'f1',fillPrice:60006,fee:0.033,filledAt:at(t(d1))}}),t(d1)),
  stamp(event('TRADE_PROPOSED',o2),t(d2)),stamp(event('RISK_REJECTED',{accountId:account,order:o2,decision:{approved:false,reasons:['DAILY_LOSS_LIMIT'],notional:60}}),t(d2))];
 const memories=[{id:'m1',agentId:'sentinel',kind:'DECISION' as const,summary:'entrada adiada',createdAt:at(t(d3)),sourceEventId:d3.id,metadata:{reason:'BACKUP_DATA'}}];
 const body=decisionReceipts({accountId:account,events:[d1,d2,d3,d4],ledger,memories,messages:[],now:t(d4)+600000},10);
 return JSON.parse(JSON.stringify(body));
}

test('os 5 estágios saem da ficha real: executada, rejeitada, bloqueada e sem ação, com o validador UNKNOWN quando nada foi gravado',()=>{
 const R=ring(),body=receipts(),[noAction,blocked,rejected,executed]=body.receipts.map((r:any)=>R.stages(r));
 const st=(s:any[])=>Object.fromEntries(s.map(x=>[x.id,x.state]));
 assert.deepEqual(st(executed),{trader:'ok',risk:'ok',validator:'unknown',execution:'ok',audit:'ok'});
 assert.match(executed.find((s:any)=>s.id==='execution').text,/1 fill\(s\) paper · BUY 0.001 @ 60006.00/);
 assert.deepEqual(st(rejected),{trader:'ok',risk:'rejected',validator:'unknown',execution:'none',audit:'ok'});
 assert.match(rejected.find((s:any)=>s.id==='risk').text,/DAILY_LOSS_LIMIT/);
 assert.deepEqual(st(blocked),{trader:'ok',risk:'none',validator:'blocked',execution:'none',audit:'ok'});
 assert.equal(blocked.find((s:any)=>s.id==='validator').truth,'REAL');assert.match(blocked.find((s:any)=>s.id==='validator').text,/BACKUP_DATA/);
 assert.deepEqual(st(noAction),{trader:'ok',risk:'none',validator:'unknown',execution:'none',audit:'ok'});
 // Sem registro, o validador nunca aparece como aprovado.
 for(const s of [executed,rejected,noAction])assert.equal(s.find((x:any)=>x.id==='validator').truth,'UNKNOWN');
 const sum=R.summary(body);assert.equal(sum.decisions,4);assert.equal(sum.completePct,100);assert.equal(sum.linkage,'DECISION_ID_OR_TIME_WINDOW');assert.ok(body.receipts.every((r:any)=>r.linkage==='TIME_WINDOW'&&r.checks===null));
 assert.deepEqual(JSON.parse(JSON.stringify(sum.reasons)),[{label:'RISK:DAILY_LOSS_LIMIT',n:1},{label:'CYCLE:BACKUP_DATA',n:1}]);
});

test('execução paper: conta do piloto, posição e fills gravados; sem a conta, nada é inventado',()=>{
 const R=ring();
 const accounts=[{id:'evaluation:vega:usdm',portfolio:{equity:1000,positions:[]}},{id:account,initialCash:1000,portfolio:{equity:1005,positions:[{symbol:'BTCUSDT',quantity:-0.002,averageEntry:61000}]},feesPaid:0.1,fundingCashDelta:-0.02,fills:3,valuationFresh:true,hourly:[{timestamp:1,equity:1000},{timestamp:2,equity:1005}]}];
 const fills=[{occurredAt:at(closed),payload:{fill:{side:'SELL',quantity:0.002,fillPrice:61000,fee:0.07}}}];
 const vm1=R.execution(accounts,fills);
 assert.equal(vm1.pnlPct.toFixed(2),'0.50');assert.deepEqual({...vm1.position},{qty:-0.002,side:'vendido',avg:61000});assert.equal(vm1.fills.length,1);assert.deepEqual([...vm1.hourly],[1000,1005]);
 assert.equal(R.execution([{id:'outra'}],[]),null);assert.equal(R.execution(null,[]),null);
});

test('telas do Ring: desenham só com dado; a de execução devolve false sem curva (fica apagada)',()=>{
 const R=ring(),calls:string[]=[];const ctx=new Proxy({},{get:(_t,k)=>typeof k==='string'&&['fillStyle','strokeStyle','lineWidth'].includes(k)?undefined:(..._a:unknown[])=>{calls.push(String(k));},set:()=>true});
 const inner=[{x:0,y:0},{x:96,y:48},{x:96,y:96},{x:0,y:48}];
 R.paintRing(ctx,inner,R.stages(receipts().receipts[3]));assert.ok(calls.filter(c=>c==='fillRect').length>=6);
 assert.equal(R.paintExecution(ctx,inner,{hourly:[]}),false);assert.equal(R.paintExecution(ctx,inner,{hourly:[1,2,3],position:null}),true);
});

test('passo 5: com as checagens gravadas, o validador fica REAL; sem elas, continua UNKNOWN',()=>{
 const R=ring(),base=receipts().receipts[0];
 const withChecks={...base,checks:{version:'CYCLE_CHECKS_V1',decision:[{id:'STUDY_ELIGIBLE',ok:true},{id:'SIGNAL_FRESH',ok:true}],entry:[{id:'PRIMARY_DATA',ok:true},{id:'PROTECTIONS',ok:true}],entryOutcome:'ENTRY_SUBMITTED'}};
 const v=R.stages(withChecks).find((s:any)=>s.id==='validator');
 assert.equal(v.state,'ok');assert.equal(v.truth,'REAL');assert.match(v.text,/2 de 2 checagens do ciclo passaram · entrada: 2 de 2/);
 assert.equal(R.stages(base).find((s:any)=>s.id==='validator').truth,'UNKNOWN');
});
