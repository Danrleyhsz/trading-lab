import type {Candle} from '../backtest.js';
import type {SignalStrategy} from '../signal-backtest.js';

/**
 * H06 (efeitos de calendário) de docs/research/video-strategy-hypotheses.md. O evento religioso citado no vídeo não vira
 * regra. Testa só a abstração defensável: hora do dia (UTC) e dia da semana.
 * Os lados são ajustados SÓ na janela de treino, com todas as moedas juntas, e exigem |t| >= 3 (correção conservadora
 * para varrer 24 horas ou 7 dias). Depois ficam congelados para o período de teste.
 */
export type CalendarKind='HOUR_OF_DAY'|'DAY_OF_WEEK';
export const CALENDAR_MIN_T=3;
export const bucketOf=(kind:CalendarKind,timestamp:number)=>kind==='HOUR_OF_DAY'?new Date(timestamp).getUTCHours():new Date(timestamp).getUTCDay();
export interface CalendarFit {kind:CalendarKind;from:number;to:number;buckets:{bucket:number;n:number;meanReturn:number;t:number;side:-1|0|1}[]}
/** Retorno de cada vela (abertura→fechamento) agrupado pelo seu período; só velas com horário em [from, to). */
export function fitCalendar(datasets:readonly (readonly Candle[])[],kind:CalendarKind,from:number,to:number):CalendarFit{
 const sums=new Map<number,{n:number;s:number;s2:number}>();
 for(const candles of datasets)for(const c of candles){if(c.timestamp<from||c.timestamp>=to||!(c.open>0))continue;const r=c.close/c.open-1,b=bucketOf(kind,c.timestamp),x=sums.get(b)??{n:0,s:0,s2:0};x.n++;x.s+=r;x.s2+=r*r;sums.set(b,x);}
 const buckets=[...sums.entries()].sort((a,b)=>a[0]-b[0]).map(([bucket,x])=>{const mean=x.s/x.n,sd=Math.sqrt(Math.max(0,x.s2/x.n-mean*mean)),t=sd>0?mean/(sd/Math.sqrt(x.n)):0;
  return {bucket,n:x.n,meanReturn:mean,t,side:(t>=CALENDAR_MIN_T?1:t<=-CALENDAR_MIN_T?-1:0) as -1|0|1};});
 return {kind,from,to,buckets};
}
/** No fechamento da vela i, posiciona para a próxima vela conforme o período dela (o horário futuro é conhecido; o preço não). */
export function calendarStrategy(candles:readonly Candle[],fit:CalendarFit):SignalStrategy{
 const sides=new Map(fit.buckets.map(b=>[b.bucket,b.side]));
 return (i,pos)=>{const side=sides.get(bucketOf(fit.kind,candles[i].timestamp+3600000))??0;if(!side)return pos?'EXIT':null;return side!==pos?.side?{side}:null;};
}
