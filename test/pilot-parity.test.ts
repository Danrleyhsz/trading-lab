import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {AutonomousPerpetualCycle} from '../src/application/autonomous-perpetual-cycle.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {MemoryStore} from '../src/domain/memory.js';
import {backtestPerpetual,type PerpetualDataset,type PerpetualConfig} from '../src/domain/perpetual-backtest.js';
import {pilotParity} from '../src/application/pilot-parity.js';
import type {DomainEvent} from '../src/domain/events.js';
import type {PerpetualStudies} from '../src/application/perpetual-studies.js';

const H=3600000,start=Date.UTC(2026,8,1);
const cfg:PerpetualConfig={strategy:'SMA',initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:5,slowPeriod:20};
/** Preço em onda (cruza as médias várias vezes) e funding a cada 8 h: dados sintéticos só para o teste. */
function market(hours:number):PerpetualDataset{
 const trade=Array.from({length:hours},(_,i)=>{const close=30000+800*Math.sin(i/9)+120*Math.sin(i/2.3),open=30000+800*Math.sin((i-1)/9)+120*Math.sin((i-1)/2.3);return {timestamp:start+i*H,open,high:Math.max(open,close)+15,low:Math.min(open,close)-15,close,volume:10};});
 return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:trade.filter(c=>c.timestamp%(8*H)===0).map(c=>({timestamp:c.timestamp,rate:0.0001,markPrice:c.open}))};
}
/** Roda o ciclo de produção hora a hora (relógio simulado), como o treino da equipe, e devolve o que ele gravou. */
async function runPilot(full:PerpetualDataset,first:number){
 let clock=full.trade[first-1].timestamp+H+3000;mock.timers.enable({apis:['Date'],now:clock});
 try{
  const bus=new EventBus(),events:DomainEvent[]=[];bus.subscribe(e=>events.push(e));
  const book=new PerpetualPaperBook(bus,undefined,()=>clock);book.ensureEvaluation('nova',1000);
  const closedSlice=(count:number):PerpetualDataset=>{const stop=full.trade.findIndex(c=>c.timestamp>clock-H);const end=stop<0?full.trade.length:stop;const trade=full.trade.slice(Math.max(0,end-count),end);return {instrument:full.instrument,trade,mark:full.mark.slice(Math.max(0,end-count),end),funding:full.funding.filter(f=>f.timestamp>=trade[0].timestamp&&f.timestamp<trade.at(-1)!.timestamp+H)};};
  const study={id:'paridade',result:{datasetHash:'teste',folds:[{configuration:cfg}]}};
  // Elegibilidade simulada SÓ no teste: o piloto real usa a triagem de verdade.
  const studies={screen:()=>({eligible:true,reason:'TEST_ONLY'}),get:()=>study} as unknown as PerpetualStudies;
  const cycle=new AutonomousPerpetualCycle(true,study.id,studies,book,{load:async(n:number)=>closedSlice(n)},async()=>{},new MemoryStore(),bus,async()=>{},()=>clock,()=>true,{retryDelayMs:0});
  for(let i=first-1;i<full.trade.length;i++){
   clock=full.trade[i].timestamp+H+3000;mock.timers.setTime(clock);
   const c=full.trade[i],next=full.funding.find(f=>f.timestamp>clock)?.timestamp??clock+8*H,last=[...full.funding].reverse().find(f=>f.timestamp<=clock);
   const quote={instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:c.close-0.05,ask:c.close+0.05,markPrice:c.close,indexPrice:c.close,fundingRate:last?.rate??0,nextFundingTime:next,bookTime:clock,markTime:clock,receivedAt:clock};
   const settlements=book.fundingDue(quote.markTime)?full.funding.filter(f=>f.timestamp>book.cursor()&&f.timestamp<=quote.markTime).map(f=>({instrument:'BINANCE_USDM:BTCUSDT' as const,...f})):[];
   await book.synchronize(quote,settlements,async()=>{});
   await cycle.onMarket();
  }
  return {events,ledger:book.ledger(book.list()[0].id)!,accountId:book.list()[0].id,now:clock};
 }finally{mock.timers.reset();}
}

test('piloto ao vivo e o mesmo estudo no histórico tomam as mesmas decisões, hora a hora',async()=>{
 const full=market(260),first=60;
 const live=await runPilot(full,first);
 const report=pilotParity({...live,history:full});
 assert.ok(report.summary.decisions>=190,'o ciclo decidiu em todas as horas');
 assert.equal(report.summary.match,report.summary.decisions,'toda decisão bate na reprodução e no histórico');
 assert.equal(report.summary.executionMatch,report.summary.decisions,'a posição ficou do lado decidido');
 assert.equal(report.passed,true);
 assert.ok(report.rows.every(r=>r.positionSource==='RECORDED'),'a decisão grava a posição do momento');
 const sides=new Set(report.rows.map(r=>r.recordedDirection));assert.ok(sides.has(1)&&sides.has(-1),'o teste cobre compra e venda');
 // O motor de backtest do estudo, nas mesmas horas, fica do mesmo lado que o piloto.
 const warm=first-cfg.slowPeriod,bt=backtestPerpetual({instrument:full.instrument,trade:full.trade.slice(warm),mark:full.mark.slice(warm),funding:full.funding.filter(f=>f.timestamp>=full.trade[warm].timestamp)},cfg);
 let q=0;const btSide=new Map<number,number>();for(const row of bt.audit)if(row.kind==='FILL'||row.kind==='LIQUIDATION'){q+=row.quantity;btSide.set(row.timestamp,Math.abs(q)<1e-12?0:Math.sign(q));}
 let side=0,compared=0;
 for(const r of report.rows){const executedAt=Date.parse(r.candleTimestamp)+H;for(const [t,s] of btSide)if(t<=executedAt)side=s;
  const liveSide=Math.abs(r.execution.positionAfter)<1e-12?0:Math.sign(r.execution.positionAfter);
  if(executedAt<full.trade.at(-1)!.timestamp){assert.equal(liveSide,side,'backtest e piloto em lados diferentes em '+r.candleTimestamp);compared++;}}
 assert.ok(compared>=150);
});

test('a conferência acusa candle diferente, regra diferente e execução sem motivo',async()=>{
 const full=market(160),live=await runPilot(full,60);
 // Candle do histórico revisado depois da decisão (como o fechamento que a Binance ainda soma nos primeiros segundos).
 const revised=structuredClone(full);const target=live.events.find(e=>e.type==='AUTONOMOUS_DECISION')!;const ts=(target.payload as {candleTimestamp:number}).candleTimestamp;
 revised.trade.find(c=>c.timestamp===ts)!.close+=0.1;
 const data=pilotParity({...live,history:revised});
 assert.equal(data.rows[0].verdict,'DATA_DIFFERENCE');assert.equal(data.rows[0].candles.firstDifference,new Date(ts).toISOString());
 assert.equal(data.passed,true,'dado diferente que não muda a direção não reprova, mas fica registrado');
 // Decisão gravada com direção que a regra não produz: código ou regra mudou.
 const tampered=structuredClone(live.events);const d=tampered.find(e=>e.type==='AUTONOMOUS_DECISION')!;(d.payload as {direction:number}).direction*=-1;
 const code=pilotParity({...live,events:tampered,history:full});
 assert.equal(code.rows[0].verdict,'CODE_DIFFERENCE');assert.equal(code.passed,false);
 // Fills apagados: a posição não acompanhou a decisão e não há rejeição de risco nem parada gravada.
 const noFills=pilotParity({...live,ledger:live.ledger.filter(e=>e.type!=='PAPER_FILL'),history:full});
 assert.ok(noFills.summary.executionUnexplained>0);assert.ok(noFills.summary.positionInconsistent>0);assert.equal(noFills.passed,false);
 // Sem histórico suficiente, não há veredito inventado.
 const short=pilotParity({...live,history:{...full,trade:full.trade.slice(-5),mark:full.mark.slice(-5)}});
 assert.ok(short.rows.some(r=>r.verdict==='INSUFFICIENT_HISTORY'&&r.historicalDirection===null));
});
