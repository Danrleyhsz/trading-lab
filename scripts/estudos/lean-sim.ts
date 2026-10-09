// Versão enxuta em memória do simulador de livros somados de fatores-lib.ts, para universos grandes (dezenas de moedas) em máquina
// com pouca RAM: preços em Float64Array em vez de objetos de vela. A lógica é a mesma (decisão no fechamento, execução na abertura
// da vela seguinte, taxa e slippage sobre a quantidade líquida, funding real) e o resultado é conferido contra `simulateBlend`
// em teste (test/lean-sim.test.ts) e contra os números já publicados.
import type {PerpetualDataset,FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import type {BlendConfig} from './fatores-lib.js';

const HOUR=3600000;
export interface LeanData {
 symbols:string[];            // em ordem alfabética (localeCompare), a mesma dos desempates de simulateBlend
 timestamps:Float64Array;
 open:Float64Array[];
 close:Float64Array[];
 volume:Float64Array[];
 funding:FundingSettlement[][];
}
export interface LeanBook {
 /** Pontuação (maior é melhor) de cada moeda, na ordem de `symbols`, usando só informação até a vela `i`. */
 score:(d:LeanData,i:number)=>Float64Array;
 legFraction:number;longCount:number;shortCount:number;
 /** Índices das moedas que o livro pode operar na decisão `i`. */
 eligible?:(d:LeanData,i:number)=>ReadonlySet<number>;
}
export interface LeanResult {
 equitySeries:{timestamp:number;equity:number}[];finalEquity:number;netPnl:number;maxDrawdown:number;feesPaid:number;fundingCashDelta:number;
 tradedNotional:number;closedLegs:number;rebalances:{timestamp:number;long:string[];short:string[]}[];datasetHashes:Record<string,string>;
}
export const leanMomentum=(lookback:number)=>(d:LeanData,i:number)=>Float64Array.from(d.close,c=>c[i]/c[i-lookback]-1);

export function toLean(datasets:Record<string,PerpetualDataset>):LeanData{
 const symbols=Object.keys(datasets).sort((a,b)=>a.localeCompare(b)),n=datasets[symbols[0]].trade.length;
 return {symbols,timestamps:Float64Array.from(datasets[symbols[0]].trade,c=>c.timestamp),
  open:symbols.map(s=>Float64Array.from(datasets[s].trade,c=>c.open)),close:symbols.map(s=>Float64Array.from(datasets[s].trade,c=>c.close)),
  volume:symbols.map(s=>Float64Array.from(datasets[s].trade,c=>c.volume)),funding:symbols.map(s=>datasets[s].funding)};
}
/** Acrescenta uma moeda (em ordem alfabética) sem reconstruir as demais. */
export function addSymbol(d:LeanData,symbol:string,one:PerpetualDataset){
 const {symbols,...rest}=d,n=one.trade.length;
 if(d.symbols.length&&n!==d.timestamps.length)throw new Error('unaligned universe: '+symbol);
 const k=symbols.findIndex(s=>s.localeCompare(symbol)>0),at=k<0?symbols.length:k,ins=<T>(a:T[],v:T)=>[...a.slice(0,at),v,...a.slice(at)];
 if(d.symbols.length&&one.trade.some((c,i)=>c.timestamp!==d.timestamps[i]))throw new Error('unaligned universe: '+symbol);
 return {symbols:ins(symbols,symbol),timestamps:d.symbols.length?d.timestamps:Float64Array.from(one.trade,c=>c.timestamp),
  open:ins(rest.open,Float64Array.from(one.trade,c=>c.open)),close:ins(rest.close,Float64Array.from(one.trade,c=>c.close)),
  volume:ins(rest.volume,Float64Array.from(one.trade,c=>c.volume)),funding:ins(rest.funding,one.funding)} as LeanData;
}
/** Recorte das primeiras `bars` velas (e do funding até a última delas). */
export function sliceLean(d:LeanData,bars:number):LeanData{
 const stop=d.timestamps[bars-1]+HOUR;
 return {symbols:d.symbols,timestamps:d.timestamps.slice(0,bars),open:d.open.map(a=>a.slice(0,bars)),close:d.close.map(a=>a.slice(0,bars)),volume:d.volume.map(a=>a.slice(0,bars)),
  funding:d.funding.map(f=>f.filter(x=>x.timestamp<stop))};
}
export function subset(d:LeanData,keep:string[]):LeanData{
 const idx=d.symbols.map((s,k)=>keep.includes(s)?k:-1).filter(k=>k>=0);
 return {symbols:idx.map(k=>d.symbols[k]),timestamps:d.timestamps,open:idx.map(k=>d.open[k]),close:idx.map(k=>d.close[k]),volume:idx.map(k=>d.volume[k]),funding:idx.map(k=>d.funding[k])};
}

export function simulateLean(d:LeanData,cfg:BlendConfig,books:LeanBook[]):LeanResult{
 const symbols=d.symbols,S=symbols.length,bars=d.timestamps.length;
 if(!books.length||books.some(b=>b.longCount<1||b.shortCount<1)||S<Math.max(...books.map(b=>b.longCount+b.shortCount)))throw new Error('universe smaller than the portfolio');
 if(![cfg.lookbackHours,cfg.rebalanceHours,cfg.startBar].every(v=>Number.isSafeInteger(v)&&v>0)||cfg.startBar<cfg.lookbackHours)throw new Error('invalid schedule');
 if(!(books.every(b=>b.legFraction>0)&&books.reduce((sum,b)=>sum+b.legFraction*(b.longCount+b.shortCount),0)<=1))throw new Error('gross exposure above 1x');
 if(!(cfg.feeRate>=0&&cfg.slippageBps>=0&&cfg.initialCapital>0))throw new Error('invalid costs');
 if(bars<=cfg.startBar+1)throw new Error('not enough bars');
 const slip=cfg.slippageBps/10000,qty=new Float64Array(S),fundingIndex=new Int32Array(S);
 let cash=cfg.initialCapital,fees=0,funding=0,traded=0,closedLegs=0,pending:Float64Array|null=null,peak=cfg.initialCapital,maxDrawdown=0;
 const equitySeries:{timestamp:number;equity:number}[]=[],rebalances:LeanResult['rebalances']=[];
 for(let i=0;i<bars;i++){
  const t=d.timestamps[i];
  if(pending){
   for(let s=0;s<S;s++){
    const current=qty[s],target=pending[s],delta=target-current;if(Math.abs(delta)<1e-15)continue;
    const price=d.open[s][i]*(1+Math.sign(delta)*slip),fee=Math.abs(delta)*price*cfg.feeRate;
    cash-=delta*price+fee;fees+=fee;traded+=Math.abs(delta)*price;
    if(current!==0&&(target===0||Math.sign(target)!==Math.sign(current)))closedLegs++;
    qty[s]=target;
   }
   pending=null;
  }
  for(let s=0;s<S;s++){
   const list=d.funding[s];let k=fundingIndex[s];
   while(k<list.length&&list[k].timestamp<t+HOUR){const f=list[k];if(f.timestamp>=t){const q=qty[s];if(q){const delta=-q*f.markPrice*f.rate;cash+=delta;funding+=delta;}}k++;}
   fundingIndex[s]=k;
  }
  let equity=cash;for(let s=0;s<S;s++)equity+=qty[s]*d.close[s][i];
  if(i>=cfg.startBar){equitySeries.push({timestamp:t,equity});peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak>0?1-equity/peak:0);}
  if(i>=cfg.startBar&&(i-cfg.startBar)%cfg.rebalanceHours===0&&i+1<bars){
   pending=new Float64Array(S);let record:{long:string[];short:string[]}|null=null;
   for(const book of books){
    const allowed=book.eligible?.(d,i),pool:number[]=[];for(let s=0;s<S;s++)if(!allowed||allowed.has(s))pool.push(s);
    if(pool.length<book.longCount+book.shortCount)throw new Error('eligible universe smaller than the portfolio');
    const score=book.score(d,i),ranked=pool.map(s=>({s,r:score[s]})).sort((a,b)=>b.r-a.r||symbols[a.s].localeCompare(symbols[b.s]));
    const long=ranked.slice(0,book.longCount).map(x=>x.s),short=ranked.slice(-book.shortCount).map(x=>x.s),notional=book.legFraction*equity;
    for(const s of long)pending[s]+=notional/d.close[s][i];
    for(const s of short)pending[s]-=notional/d.close[s][i];
    if(books.length===1)record={long:long.map(s=>symbols[s]),short:short.map(s=>symbols[s])};
   }
   const p=pending;
   rebalances.push({timestamp:t,long:record?.long??symbols.filter((_,s)=>p[s]>0),short:record?.short??symbols.filter((_,s)=>p[s]<0)});
  }
 }
 const finalEquity=equitySeries.at(-1)?.equity??cfg.initialCapital;
 return {equitySeries,finalEquity,netPnl:finalEquity-cfg.initialCapital,maxDrawdown,feesPaid:fees,fundingCashDelta:funding,tradedNotional:traded,closedLegs,rebalances,datasetHashes:{}};
}

/** Objeto mínimo no formato que `metrics()` de fatores.ts lê (só fechamentos por índice). Não aloca velas. */
export function metricsShim(d:LeanData):Record<string,PerpetualDataset>{
 const out:Record<string,PerpetualDataset>={},n=d.timestamps.length;
 d.symbols.forEach((s,k)=>{
  const close=d.close[k],trade=new Proxy([] as unknown[],{get:(_t,p)=>{
   if(p==='length')return n;if(p==='at')return (i:number)=>({close:close[i<0?n+i:i]});
   if(typeof p==='string'&&/^\d+$/.test(p))return {close:close[+p]};return undefined;}});
  out[s]={instrument:`BINANCE_USDM:${s}` as PerpetualDataset['instrument'],trade:trade as never,mark:trade as never,funding:[]};
 });
 return out;
}
