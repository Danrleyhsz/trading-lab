import {simulateCrossSectional} from '../domain/cross-sectional-momentum.js';
import type {PerpetualDataset} from '../domain/perpetual-backtest.js';

/**
 * Acompanhamento ao vivo do momentum entre moedas (docs/PROTOCOLO_ACOMPANHAMENTO_MOMENTUM.md, XSMOM_FORWARD_V1).
 * Só simulação a partir de dados públicos: a cada hora refaz a carteira desde o início declarado. Não envia ordens,
 * não usa as contas do piloto e não grava estado (o resultado é reproduzível pelos mesmos dados públicos).
 */
const HOUR=3600000;
export const FORWARD_PROTOCOL=Object.freeze({version:'XSMOM_FORWARD_V1',declaredAt:'2026-10-06T00:55:00Z',
 symbols:['ENAUSDT','ZECUSDT','WLDUSDT','NEARUSDT','UNIUSDT','ONDOUSDT','1000PEPEUSDT','BCHUSDT','FILUSDT','AAVEUSDT','SUIUSDT','TAOUSDT','AVAXUSDT','LINKUSDT','XRPUSDT','XLMUSDT','DOGEUSDT','SOLUSDT','LTCUSDT','ETHUSDT','BTCUSDT'],
 // Vela cujo fechamento é a primeira decisão (06/10/2026 02:00 UTC, decisão às 03:00).
 firstDecisionBar:Date.UTC(2026,9,6,2),lookbackHours:672,rebalanceHours:168,longCount:5,shortCount:5,legFraction:0.05,
 feeRate:0.00055,slippageBps:2,initialCapital:10000,weeks:12,stopDrawdown:0.15});
export interface ForwardSnapshot {
 scope:'FORWARD_PAPER_TRACKING_ONLY';protocol:typeof FORWARD_PROTOCOL;observedAt:string;
 status:'WAITING_START'|'RUNNING'|'STOPPED_BY_DRAWDOWN'|'COMPLETED'|'DATA_UNAVAILABLE';
 verdict:'IN_PROGRESS'|'APPROVED'|'REJECTED';
 startedAt:string;endsAt:string;nextDecisionAt:string|null;weeksElapsed:number;lastCandle:string|null;
 equity:number|null;netPnl:number|null;returnPct:number|null;maxDrawdown:number|null;feesPaid:number|null;fundingCashDelta:number|null;
 portfolio:{decidedAt:string;long:string[];short:string[]}|null;rebalances:number;
 curve:{timestamp:number;equity:number}[];error:string|null;
}
type History={load(count:number,symbol:string):Promise<PerpetualDataset>};

/** Calcula o acompanhamento a partir dos datasets das 21 moedas (alinhados, terminando na última vela fechada). */
export function forwardFromDatasets(datasets:Record<string,PerpetualDataset>,now:number):ForwardSnapshot{
 const P=FORWARD_PROTOCOL,base=emptySnapshot(now);
 const first=datasets[P.symbols[0]].trade,startBar=first.findIndex(c=>c.timestamp===P.firstDecisionBar);
 if(startBar<P.lookbackHours)throw new Error('history does not cover the declared start');
 const end=P.firstDecisionBar+P.weeks*P.rebalanceHours*HOUR+HOUR;
 // Só velas até o fim declarado: depois das 12 semanas, nada mais conta.
 const cut=Object.fromEntries(Object.entries(datasets).map(([s,d])=>{const n=d.trade.filter(c=>c.timestamp<end).length;return [s,{...d,trade:d.trade.slice(0,n),mark:d.mark.slice(0,n),funding:d.funding.filter(f=>f.timestamp<end)}];}));
 const r=simulateCrossSectional(cut,{lookbackHours:P.lookbackHours,rebalanceHours:P.rebalanceHours,startBar,longCount:P.longCount,shortCount:P.shortCount,legFraction:P.legFraction,feeRate:P.feeRate,slippageBps:P.slippageBps,initialCapital:P.initialCapital});
 // Parada antecipada: a primeira hora em que a queda chega ao limite encerra o acompanhamento ali.
 let peak=-Infinity,stopAt=-1;for(let i=0;i<r.equitySeries.length;i++){peak=Math.max(peak,r.equitySeries[i].equity);if(1-r.equitySeries[i].equity/peak>=P.stopDrawdown){stopAt=i;break;}}
 const curve=stopAt>=0?r.equitySeries.slice(0,stopAt+1):r.equitySeries,lastPoint=curve.at(-1)!;
 let dd=0;peak=-Infinity;for(const p of curve){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}
 const lastCandle=cut[P.symbols[0]].trade.at(-1)!.timestamp,completed=lastCandle+HOUR>=end;
 const status=stopAt>=0?'STOPPED_BY_DRAWDOWN':completed?'COMPLETED':'RUNNING';
 const netPnl=lastPoint.equity-P.initialCapital,decisions=r.rebalances.filter(x=>stopAt<0||x.timestamp<=lastPoint.timestamp),last=decisions.at(-1);
 const elapsed=Math.max(0,Math.floor((lastCandle+HOUR-(P.firstDecisionBar+HOUR))/(P.rebalanceHours*HOUR)));
 const next=status==='RUNNING'?P.firstDecisionBar+HOUR+(elapsed+1)*P.rebalanceHours*HOUR:null;
 return {...base,status,verdict:status==='STOPPED_BY_DRAWDOWN'?'REJECTED':status==='COMPLETED'?(netPnl>0&&dd<P.stopDrawdown?'APPROVED':'REJECTED'):'IN_PROGRESS',
  nextDecisionAt:next&&next<end?new Date(next).toISOString():null,weeksElapsed:Math.min(P.weeks,elapsed),lastCandle:new Date(lastCandle).toISOString(),
  equity:lastPoint.equity,netPnl,returnPct:netPnl/P.initialCapital,maxDrawdown:dd,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,
  portfolio:last?{decidedAt:new Date(last.timestamp+HOUR).toISOString(),long:last.long,short:last.short}:null,rebalances:decisions.length,curve,error:null};
}
function emptySnapshot(now:number):ForwardSnapshot{
 const P=FORWARD_PROTOCOL;
 return {scope:'FORWARD_PAPER_TRACKING_ONLY',protocol:P,observedAt:new Date(now).toISOString(),status:'WAITING_START',verdict:'IN_PROGRESS',
  startedAt:new Date(P.firstDecisionBar+HOUR).toISOString(),endsAt:new Date(P.firstDecisionBar+P.weeks*P.rebalanceHours*HOUR+HOUR).toISOString(),
  nextDecisionAt:new Date(P.firstDecisionBar+HOUR).toISOString(),weeksElapsed:0,lastCandle:null,equity:null,netPnl:null,returnPct:null,maxDrawdown:null,feesPaid:null,fundingCashDelta:null,portfolio:null,rebalances:0,curve:[],error:null};
}

export class ForwardMomentumTracker {
 private latest:ForwardSnapshot;private timer:ReturnType<typeof setTimeout>|null=null;private stopped=true;private busy=false;private pausedUntil=0;
 constructor(private history:History,private now:()=>number=Date.now){this.latest=emptySnapshot(now());}
 snapshot(){return structuredClone({...this.latest,observedAt:new Date(this.now()).toISOString()});}
 /** Recalcula uma vez por hora, aos 17 minutos (longe das buscas do piloto na virada da hora). */
 start(){if(!this.stopped)return;this.stopped=false;this.schedule(30000);}
 stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.timer=null;}
 private schedule(delay?:number){if(this.stopped)return;const now=this.now(),next=Math.floor(now/HOUR)*HOUR+17*60000;const wait=delay??((next>now?next:next+HOUR)-now);this.timer=setTimeout(()=>{void this.refresh().finally(()=>this.schedule());},wait);}
 async refresh(){
  const P=FORWARD_PROTOCOL,now=this.now();
  if(this.busy||now<this.pausedUntil)return this.latest;
  if(now<P.firstDecisionBar+HOUR){this.latest=emptySnapshot(now);return this.latest;}
  if(this.latest.status==='STOPPED_BY_DRAWDOWN'||this.latest.status==='COMPLETED')return this.latest;
  this.busy=true;
  try{
   const lastClosed=Math.floor(now/HOUR)*HOUR-HOUR,count=Math.round((lastClosed-(P.firstDecisionBar-P.lookbackHours*HOUR))/HOUR)+1;
   const datasets:Record<string,PerpetualDataset>={};
   // Em sequência: um 418/429 para todo o resto em vez de disparar mais pedidos.
   for(const s of P.symbols)datasets[s]=await this.history.load(Math.min(count,10000),s);
   this.latest=forwardFromDatasets(datasets,now);
  }catch(error){
   const message=String(error instanceof Error?error.message:error).slice(0,200);if(/HTTP (418|429)/.test(message))this.pausedUntil=now+HOUR;
   // Mantém o último cálculo, marcado como indisponível nesta hora; nunca calcula com a cesta incompleta.
   this.latest={...this.latest,status:this.latest.curve.length?this.latest.status:'DATA_UNAVAILABLE',error:message};
  }finally{this.busy=false;}
  return this.latest;
 }
}
