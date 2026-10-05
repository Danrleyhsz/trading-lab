// Paridade entre o piloto ao vivo e o histórico (ideia do NautilusTrader: o mesmo código no estudo e no ao vivo).
// Para cada decisão gravada pelo piloto, três conferências independentes:
//  1. reprodução: a mesma regra, com os mesmos candles gravados na decisão, dá a mesma direção? (código e regra iguais)
//  2. dados: os candles que o piloto usou são iguais aos candles do histórico baixado depois? (dados iguais)
//  3. histórico: a regra aplicada aos candles do histórico, nas mesmas horas, dá a mesma direção? (estudo = piloto)
// E uma conferência de execução: depois da decisão, a posição da conta ficou do lado que a decisão mandou?
// Só leitura: usa eventos gravados e candles públicos; nunca altera o piloto, o livro paper ou as regras.
import type {Candle} from '../domain/backtest.js';
import type {DomainEvent} from '../domain/events.js';
import type {PerpetualConfig,PerpetualDataset} from '../domain/perpetual-backtest.js';
import {perpetualDirection,teamFilterWarmup} from '../domain/perpetual-signals.js';

export const PARITY_POLICY=Object.freeze({version:'PILOT_PARITY_V1',relativeTolerance:1e-9,quantityEpsilon:1e-12});
const HOUR=3600000;
export type DecisionVerdict='MATCH'|'CODE_DIFFERENCE'|'DATA_DIFFERENCE'|'HISTORY_DIFFERENCE'|'INSUFFICIENT_HISTORY';
export type ExecutionVerdict='MATCH'|'RISK_REJECTED'|'PILOT_STOPPED'|'PROTECTION_BLOCK'|'UNEXPLAINED'|'PENDING';
export interface ParityRow {
 eventId:string;candleTimestamp:string;recordedDirection:number;positionBefore:number;positionSource:'RECORDED'|'RECORDED_DIFFERS_FROM_FILLS'|'FILLS';
 reproducedDirection:number|null;historicalDirection:number|null;
 candles:{compared:number;different:number;missing:number;firstDifference:string|null};
 verdict:DecisionVerdict;
 execution:{positionAfter:number;expected:number;verdict:ExecutionVerdict};
}
const sign=(v:number)=>Math.abs(v)<PARITY_POLICY.quantityEpsilon?0:Math.sign(v);
const same=(a:number,b:number)=>a===b||Math.abs(a-b)<=PARITY_POLICY.relativeTolerance*Math.max(Math.abs(a),Math.abs(b));
const sameCandle=(a:Candle,b:Candle)=>same(a.open,b.open)&&same(a.high,b.high)&&same(a.low,b.low)&&same(a.close,b.close);
const time=(e:DomainEvent)=>Date.parse(e.occurredAt);

interface DecisionPayload {accountId:string;candleTimestamp:number;direction:number;currentQuantity?:number;configuration:PerpetualConfig;signalDataset?:PerpetualDataset}
/** Quantidade assinada da conta a partir dos fills gravados até (excluindo) o instante `before`. */
function positionAt(fills:{at:number;signed:number}[],before:number){let q=0;for(const f of fills)if(f.at<before)q+=f.signed;return q;}

export function pilotParity(input:{accountId:string;events:DomainEvent[];ledger:DomainEvent[];history:PerpetualDataset;now:number}){
 const decisions=input.events.filter(e=>e.type==='AUTONOMOUS_DECISION'&&(e.payload as DecisionPayload)?.accountId===input.accountId)
  .sort((a,b)=>(a.payload as DecisionPayload).candleTimestamp-(b.payload as DecisionPayload).candleTimestamp);
 const fills=input.ledger.filter(e=>e.type==='PAPER_FILL').map(e=>{const f=(e.payload as {fill:{side:string;quantity:number}}).fill;return {at:time(e),signed:(f.side==='BUY'?1:-1)*f.quantity};});
 const rejections=input.ledger.filter(e=>e.type==='RISK_REJECTED').map(time);
 const stops=input.events.filter(e=>e.type==='AUTONOMOUS_PILOT_STOPPED'&&(e.payload as {accountId?:string})?.accountId===input.accountId).map(time);
 const byTime=new Map(input.history.trade.map((c,i)=>[c.timestamp,i]));
 const rows:ParityRow[]=decisions.map((e,k)=>{
  const p=e.payload as DecisionPayload,at=time(e),cfg=p.configuration;
  // Posição no momento da decisão: gravada no evento (desde PILOT_PARITY_V1) ou reconstruída pelos fills anteriores.
  const fromFills=positionAt(fills,at),before=typeof p.currentQuantity==='number'?p.currentQuantity:fromFills;
  // 1. Reprodução com os candles gravados na própria decisão.
  const recorded=p.signalDataset?.trade??null;
  let reproduced:number|null=null;try{if(recorded)reproduced=perpetualDirection(recorded,cfg,before);}catch{reproduced=null;}
  // 2. Candles gravados × histórico, um a um.
  let compared=0,different=0,missing=0,firstDifference:string|null=null;
  for(const c of recorded??[]){const i=byTime.get(c.timestamp);if(i===undefined){missing++;continue;}compared++;if(!sameCandle(c,input.history.trade[i])){different++;firstDifference??=new Date(c.timestamp).toISOString();}}
  // 3. A mesma regra sobre o histórico, terminando no mesmo candle fechado.
  const end=byTime.get(p.candleTimestamp),need=Math.max(cfg.slowPeriod+1,teamFilterWarmup(cfg.filters)+1);
  let historical:number|null=null;if(end!==undefined&&end+1>=need){try{historical=perpetualDirection(input.history.trade.slice(0,end+1),cfg,before);}catch{historical=null;}}
  const verdict:DecisionVerdict=reproduced!==null&&reproduced!==p.direction?'CODE_DIFFERENCE'
   :historical===null?'INSUFFICIENT_HISTORY'
   :historical===p.direction?(different?'DATA_DIFFERENCE':'MATCH')
   :different||missing?'DATA_DIFFERENCE':'HISTORY_DIFFERENCE';
  // Execução: posição logo antes da próxima decisão (ou agora, se for a última).
  const nextAt=k+1<decisions.length?time(decisions[k+1]):input.now;
  const after=positionAt(fills,nextAt),expected=p.direction;
  const within=(t:number)=>t>=at&&t<nextAt;
  const execution:ExecutionVerdict=sign(after)===expected?'MATCH'
   :k+1===decisions.length&&input.now-at<5*60000?'PENDING'
   :stops.some(within)?'PILOT_STOPPED'
   :rejections.some(within)?'RISK_REJECTED'
   :sign(before)===0&&sign(after)===0&&expected!==0&&cfg.protections?'PROTECTION_BLOCK'
   :'UNEXPLAINED';
  return {eventId:e.id,candleTimestamp:new Date(p.candleTimestamp).toISOString(),recordedDirection:p.direction,positionBefore:before,positionSource:typeof p.currentQuantity==='number'?(sign(p.currentQuantity)===sign(fromFills)?'RECORDED':'RECORDED_DIFFERS_FROM_FILLS'):'FILLS',
   reproducedDirection:reproduced,historicalDirection:historical,candles:{compared,different,missing,firstDifference},verdict,
   execution:{positionAfter:after,expected,verdict:execution}};
 });
 const count=(f:(r:ParityRow)=>boolean)=>rows.filter(f).length;
 const decisionsChecked=count(r=>r.verdict!=='INSUFFICIENT_HISTORY');
 const summary={decisions:rows.length,decisionsChecked,
  match:count(r=>r.verdict==='MATCH'),codeDifference:count(r=>r.verdict==='CODE_DIFFERENCE'),dataDifference:count(r=>r.verdict==='DATA_DIFFERENCE'),
  historyDifference:count(r=>r.verdict==='HISTORY_DIFFERENCE'),insufficientHistory:count(r=>r.verdict==='INSUFFICIENT_HISTORY'),
  notReproducible:count(r=>r.reproducedDirection===null),
  executionMatch:count(r=>r.execution.verdict==='MATCH'),executionExplained:count(r=>['RISK_REJECTED','PILOT_STOPPED','PROTECTION_BLOCK','PENDING'].includes(r.execution.verdict)),
  executionUnexplained:count(r=>r.execution.verdict==='UNEXPLAINED'),positionInconsistent:count(r=>r.positionSource==='RECORDED_DIFFERS_FROM_FILLS')};
 // Aprovado só quando toda decisão conferível bate (dados podem diferir sem mudar a direção) e toda execução bate ou tem motivo gravado.
 const passed=rows.length>0&&summary.codeDifference===0&&summary.executionUnexplained===0&&summary.positionInconsistent===0&&rows.every(r=>r.historicalDirection===null||r.historicalDirection===r.recordedDirection);
 return {scope:'READ_ONLY_PILOT_PARITY' as const,policy:PARITY_POLICY,accountId:input.accountId,observedAt:new Date(input.now).toISOString(),
  history:{from:input.history.trade[0]?new Date(input.history.trade[0].timestamp).toISOString():null,to:input.history.trade.at(-1)?new Date(input.history.trade.at(-1)!.timestamp+HOUR).toISOString():null,candles:input.history.trade.length},
  passed,summary,rows,
  legend:{MATCH:'mesma direção no ao vivo, na reprodução e no histórico, com candles iguais',CODE_DIFFERENCE:'a regra atual, com os candles gravados, não reproduz a decisão: código ou regra mudou',DATA_DIFFERENCE:'algum candle gravado difere do histórico (a direção pode ou não ter mudado)',HISTORY_DIFFERENCE:'candles iguais, mas a regra sobre o histórico dá outra direção',INSUFFICIENT_HISTORY:'histórico baixado não cobre a janela da decisão'}};
}

/** Atraso de cada decisão: mostra quantos segundos depois do fechamento o piloto decidiu. */
export function decisionLatency(events:DomainEvent[],accountId:string){
 return events.filter(e=>e.type==='AUTONOMOUS_DECISION'&&(e.payload as DecisionPayload)?.accountId===accountId)
  .map(e=>(time(e)-(e.payload as DecisionPayload).candleTimestamp-HOUR)/1000).filter(Number.isFinite).sort((a,b)=>a-b);
}
type Input={accountId:string|null;events:DomainEvent[];ledger:DomainEvent[];now:number};
/**
 * GET /paper/perpetual/pilot/parity: baixa o histórico público uma vez a cada 10 min (no máximo) e confere todas as
 * decisões gravadas. Uma só conferência por vez; erro de rede vira 503 sem afetar o piloto.
 */
export function registerPilotParity(app:{get:(path:string,handler:(req:unknown,reply:{code:(n:number)=>{send:(b:unknown)=>unknown}})=>Promise<unknown>)=>unknown},input:()=>Input,history:{load(count:number):Promise<PerpetualDataset>},ttlMs=600000){
 let cached:{at:number;body:unknown}|null=null,running:Promise<unknown>|null=null;
 const compute=async()=>{
  const i=input();if(!i.accountId)return {scope:'READ_ONLY_PILOT_PARITY',accountId:null,passed:false,summary:null,rows:[],note:'Nenhum piloto configurado.'};
  const decisions=i.events.filter(e=>e.type==='AUTONOMOUS_DECISION'&&(e.payload as DecisionPayload)?.accountId===i.accountId);
  const earliest=Math.min(...decisions.map(e=>(e.payload as DecisionPayload).signalDataset?.trade[0]?.timestamp??(e.payload as DecisionPayload).candleTimestamp));
  const count=Number.isFinite(earliest)?Math.min(10000,Math.max(3,Math.ceil((i.now-earliest)/HOUR)+2)):3;
  const result=pilotParity({accountId:i.accountId,events:i.events,ledger:i.ledger,history:await history.load(count),now:i.now});
  const latency=decisionLatency(i.events,i.accountId);
  return {...result,decisionLatencySeconds:latency.length?{min:latency[0],median:latency[Math.floor(latency.length/2)],max:latency.at(-1)}:null};
 };
 app.get('/paper/perpetual/pilot/parity',async(_req,reply)=>{
  if(cached&&input().now-cached.at<ttlMs)return cached.body;
  try{running??=compute().finally(()=>{running=null;});const body=await running;cached={at:input().now,body};return body;}
  catch(error){return reply.code(503).send({error:'conferência de paridade indisponível: '+(error instanceof Error?error.message:String(error)).slice(0,200)});}
 });
}
