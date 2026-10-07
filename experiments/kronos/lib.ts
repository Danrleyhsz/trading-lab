// Funções puras do experimento KRONOS_AB_V1 (experiments/kronos/PROTOCOLO_KRONOS_AB_V1.md). Só pesquisa histórica
// offline: nada aqui envia ordens, lê credenciais ou toca contas; o simulador é o mesmo backtestPerpetual do laboratório.
import {createHash} from 'node:crypto';
import type {Candle} from '../../src/domain/backtest.js';
import {backtestPerpetual,type PerpetualConfig,type PerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';

export const HOUR=3600000,FOUR=4*HOUR;
export const sha256=(value:unknown)=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');

/** Velas de 4h em blocos UTC; um bloco só existe se as 4 velas de 1h estiverem presentes (nunca bloco parcial). */
export function aggregateFourHour(hourly:Candle[]):Candle[]{
 const out:Candle[]=[];
 for(let i=0;i<hourly.length;i++){
  const c=hourly[i];if(c.timestamp%FOUR!==0)continue;const group=hourly.slice(i,i+4);
  if(group.length<4||group.some((g,k)=>g.timestamp!==c.timestamp+k*HOUR))continue;
  out.push({timestamp:c.timestamp,open:group[0].open,high:Math.max(...group.map(g=>g.high)),low:Math.min(...group.map(g=>g.low)),close:group[3].close,volume:group.reduce((s,g)=>s+g.volume,0)});
 }
 return out;
}
/** Origem da previsão que a estratégia pode consultar para uma entrada executada na abertura de `entryTimestamp`. */
export function originFor(timeframe:'1h'|'4h',entryTimestamp:number){
 // 1h: a última vela fechada é a anterior à execução. 4h: o último bloco completo, que termina até a execução.
 return timeframe==='1h'?entryTimestamp-HOUR:Math.floor(entryTimestamp/FOUR)*FOUR-FOUR;
}
/**
 * Velas de entrada possíveis: rompimento no fechamento da vela anterior, quando a estratégia está sem posição. Espelha
 * exatamente o perpetualDirection do simulador sobre o MESMO recorte de dados (inclusive a primeira vela operável).
 */
export function breakoutEntryBars(hourly:Candle[],slowPeriod:number,from:number,to:number){
 const bars:{timestamp:number;direction:number}[]=[];
 for(let i=slowPeriod;i<hourly.length;i++){
  const t=hourly[i].timestamp;if(t<from||t>to)continue;
  const closed=hourly.slice(0,i),last=closed.at(-1)!.close,prior=closed.slice(-slowPeriod-1,-1);
  const high=Math.max(...prior.map(c=>c.high)),low=Math.min(...prior.map(c=>c.low));
  if(last>high)bars.push({timestamp:t,direction:1});else if(last<low)bars.push({timestamp:t,direction:-1});
 }
 return bars;
}
/** Grade diária: origem cujo fechamento cai às 00:00 UTC (vela 23:00 de 1h ou bloco 20:00 de 4h), alvo 24 h depois. */
export function dailyGridOrigins(timeframe:'1h'|'4h',from:number,lastTarget:number){
 const out:number[]=[],step=timeframe==='1h'?HOUR:FOUR;
 for(let day=Math.ceil(from/86400000)*86400000;day+24*HOUR-HOUR<=lastTarget;day+=86400000)if(day>=from)out.push(day-step);
 return out;
}
export interface ForecastRecord {timeframe:'1h'|'4h';origin:number;contextStart:number;contextEnd:number;inputSha256:string;lastClose:number;predictedClose:number[];predictedReturn:number;seconds:number;error?:string}
/** Filtro KRONOS_ENTRY_FILTER_V1: permite a entrada só se a previsão aponta na mesma direção; sem previsão, não entra. */
export function entryFilter(timeframe:'1h'|'4h',forecasts:Map<number,ForecastRecord>,log:{timestamp:number;direction:number;origin:number;predictedReturn:number|null;allowed:boolean}[]){
 return (timestamp:number,direction:number)=>{
  const origin=originFor(timeframe,timestamp),f=forecasts.get(origin);
  // A previsão consultada tem de terminar antes da execução; qualquer outra coisa é vazamento.
  if(f&&f.contextEnd+(timeframe==='1h'?HOUR:FOUR)>timestamp)throw new Error('forecast context ends after the decision');
  const valid=f&&!f.error&&Number.isFinite(f.predictedReturn);const allowed=!!valid&&direction*f!.predictedReturn>0;
  log.push({timestamp,direction,origin,predictedReturn:valid?f!.predictedReturn:null,allowed});return allowed;
 };
}
export interface TradingMetrics {netPnl:number;grossPnl:number;feesPaid:number;fundingCashDelta:number;maxDrawdown:number;sharpeAnnualized:number|null;profitFactor:number|null;winRate:number|null;trades:number;turnover:number;liquidations:number;quarters:number[]}
export function tradingMetrics(result:ReturnType<typeof backtestPerpetual>,cfg:PerpetualConfig,quarters:number[],from:number):TradingMetrics{
 const series=result.equitySeries.filter(p=>p.timestamp>=from),m=moments(hourlyReturns(series));
 const wins=result.tradeOutcomes.filter(p=>p>0).reduce((s,p)=>s+p,0),losses=-result.tradeOutcomes.filter(p=>p<=0).reduce((s,p)=>s+p,0);
 const turnover=result.audit.filter(a=>a.kind==='FILL'||a.kind==='LIQUIDATION').reduce((s,a)=>s+Math.abs(a.quantity*a.price),0)/cfg.initialCapital;
 const equityAt=(t:number)=>{let e=cfg.initialCapital;for(const p of result.equitySeries){if(p.timestamp>=t)break;e=p.equity;}return e;};
 const q=quarters.slice(0,-1).map((start,k)=>equityAt(quarters[k+1])-equityAt(start));
 return {netPnl:result.netPnl,grossPnl:result.netPnl+result.feesPaid,feesPaid:result.feesPaid,fundingCashDelta:result.fundingCashDelta,maxDrawdown:result.maxDrawdown,
  sharpeAnnualized:Number.isFinite(m.sharpe)?m.sharpe*Math.sqrt(24*365):null,profitFactor:losses>0?wins/losses:null,winRate:result.winRate,trades:result.trades,turnover,liquidations:result.liquidations,quarters:q};
}
export function runArm(data:PerpetualDataset,cfg:PerpetualConfig,advisory?:(timestamp:number,direction:number)=>boolean){
 return backtestPerpetual(data,cfg,advisory?{entryAdvisory:advisory}:{});
}
/** Qualidade da previsão na grade diária: acerto de direção (com teste binomial unilateral), MAE/RMSE e referências. */
export function forecastQuality(rows:{predicted:number;realized:number;persistence:number}[]){
 const n=rows.length,hits=rows.filter(r=>Math.sign(r.predicted)===Math.sign(r.realized)&&r.realized!==0).length;
 const mae=(f:(r:typeof rows[number])=>number)=>rows.reduce((s,r)=>s+Math.abs(f(r)-r.realized),0)/n,rmse=(f:(r:typeof rows[number])=>number)=>Math.sqrt(rows.reduce((s,r)=>s+(f(r)-r.realized)**2,0)/n);
 let p=0;for(let k=hits;k<=n;k++)p+=Math.exp(logChoose(n,k)-n*Math.LN2);
 const rank=(v:number[])=>{const idx=v.map((x,i)=>[x,i] as const).sort((a,b)=>a[0]-b[0]);const r=new Array(v.length);idx.forEach(([,i],k)=>r[i]=k);return r as number[];};
 const a=rank(rows.map(r=>r.predicted)),b=rank(rows.map(r=>r.realized)),ma=(n-1)/2;let cov=0,va=0,vb=0;for(let i=0;i<n;i++){cov+=(a[i]-ma)*(b[i]-ma);va+=(a[i]-ma)**2;vb+=(b[i]-ma)**2;}
 return {n,directionalAccuracy:hits/n,binomialPValue:p,maeReturn:mae(r=>r.predicted),rmseReturn:rmse(r=>r.predicted),maeZeroForecast:mae(()=>0),rmseZeroForecast:rmse(()=>0),
  persistenceAccuracy:rows.filter(r=>Math.sign(r.persistence)===Math.sign(r.realized)&&r.realized!==0).length/n,alwaysUpAccuracy:rows.filter(r=>r.realized>0).length/n,spearman:cov/Math.sqrt(va*vb)};
}
function logChoose(n:number,k:number){let s=0;for(let i=1;i<=k;i++)s+=Math.log(n-k+i)-Math.log(i);return s;}
