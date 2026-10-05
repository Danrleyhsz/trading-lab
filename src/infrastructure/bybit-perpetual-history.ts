// Histórico público do BTCUSDT perpétuo linear da Bybit (só leitura, sem chave): plano B quando a Binance bloquear o
// servidor (como o HTTP 418 que já aconteceu). O dataset sai com instrumento próprio (BYBIT_LINEAR:BTCUSDT), então
// nunca se confunde com dados da Binance na auditoria nem nos hashes de evidência.
import {validatePerpetualDataset,type PerpetualDataset,type FundingSettlement} from '../domain/perpetual-backtest.js';
import type {Candle} from '../domain/backtest.js';
const hour=3600000;
export class BybitPerpetualHistory {
 constructor(private request:typeof fetch=fetch,private now:()=>number=Date.now){}
 private async get(path:string,params:Record<string,string>){
  const response=await this.request(`https://api.bybit.com${path}?${new URLSearchParams(params)}`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Bybit history HTTP ${response.status}`);
  const body=await response.json() as {retCode?:number;result?:{list?:unknown[]}};
  if(body?.retCode!==0||!Array.isArray(body.result?.list))throw new Error('invalid Bybit history response');return body.result!.list!;
 }
 /** `count` candles de 1 h já fechados, do mais antigo ao mais novo, terminando na última hora fechada. */
 async load(count=1000):Promise<PerpetualDataset>{
  if(!Number.isInteger(count)||count<3||count>10000)throw new Error('invalid history count');
  const end=Math.floor(this.now()/hour)*hour-1,start=end+1-count*hour;
  const candles=async(path:string,withVolume:boolean)=>{
   const byTime=new Map<number,Candle>();let cursor=end;
   while(byTime.size<count){
    // A Bybit devolve do mais novo para o mais antigo; caminhamos para trás até cobrir a janela.
    const page=await this.get(path,{category:'linear',symbol:'BTCUSDT',interval:'60',start:String(start),end:String(cursor),limit:'1000'});if(!page.length)break;
    let oldest=Infinity;
    for(const raw of page){if(!Array.isArray(raw)||raw.length<5)throw new Error('invalid Bybit candle row');const t=Number(raw[0]);oldest=Math.min(oldest,t);
     if(t>=start&&t<=end-hour+1)byTime.set(t,{timestamp:t,open:Number(raw[1]),high:Number(raw[2]),low:Number(raw[3]),close:Number(raw[4]),volume:withVolume?Number(raw[5]):0});}
    if(!(oldest<cursor))throw new Error('invalid Bybit pagination');if(oldest<=start)break;cursor=oldest-1;
   }
   const rows=[...byTime.values()].sort((a,b)=>a.timestamp-b.timestamp);if(rows.length!==count)throw new Error('incomplete Bybit candle history');return rows;
  };
  const [trade,mark]=await Promise.all([candles('/v5/market/kline',true),candles('/v5/market/mark-price-kline',false)]);
  const markAt=new Map(mark.map(c=>[c.timestamp,c.open]));
  const funding:FundingSettlement[]=[];let cursor=end;
  while(cursor>=start){
   const page=await this.get('/v5/market/funding/history',{category:'linear',symbol:'BTCUSDT',startTime:String(start),endTime:String(cursor),limit:'200'});if(!page.length)break;let oldest=Infinity;
   for(const raw of page){const row=raw as Record<string,unknown>;if(row?.symbol!=='BTCUSDT')throw new Error('invalid Bybit funding row');const t=Number(row.fundingRateTimestamp),rate=Number(row.fundingRate);oldest=Math.min(oldest,t);
    // A Bybit não informa o mark da liquidação: usamos a abertura do candle de mark daquela hora (registrado na doc).
    const m=markAt.get(Math.floor(t/hour)*hour);if(t>=start&&t<=end&&m!==undefined&&Number.isFinite(rate))funding.push({timestamp:t,rate,markPrice:m});}
   if(!(oldest<cursor))break;cursor=oldest-1;
  }
  funding.sort((a,b)=>a.timestamp-b.timestamp);
  if(count>=24&&!funding.length)throw new Error('Bybit funding history unavailable');
  const data:PerpetualDataset={instrument:'BYBIT_LINEAR:BTCUSDT',trade,mark,funding:funding.filter((f,i)=>i===0||f.timestamp!==funding[i-1].timestamp)};validatePerpetualDataset(data);return data;
 }
}

export type HistorySource={load(count:number):Promise<PerpetualDataset>};
/**
 * Fonte do piloto com reserva: tenta a Binance; se falhar e a reserva estiver ligada (PERPETUAL_HISTORY_FALLBACK=bybit),
 * usa a Bybit. Desligada por padrão. O ciclo do piloto nunca ABRE posição com dados de reserva (só fecha/reduz).
 */
export class ResilientPerpetualHistory implements HistorySource {
 private lastFallback:{at:string;reason:string}|null=null;private fallbacks=0;
 constructor(private primary:HistorySource,private backup:HistorySource,private enabled:boolean,private now:()=>number=Date.now){}
 async load(count:number){
  try{return await this.primary.load(count);}
  catch(error){
   if(!this.enabled)throw error;
   const reason=(error instanceof Error?error.message:String(error)).slice(0,200);const data=await this.backup.load(count);
   this.fallbacks++;this.lastFallback={at:new Date(this.now()).toISOString(),reason};return data;
  }
 }
 status(){return {scope:'PILOT_SIGNAL_HISTORY_SOURCE' as const,primary:'BINANCE_USDM:BTCUSDT',backup:'BYBIT_LINEAR:BTCUSDT',fallbackEnabled:this.enabled,fallbacks:this.fallbacks,lastFallback:this.lastFallback,
  rule:'Com dados de reserva o piloto só fecha ou reduz posição; nunca abre. Estudos usam sempre só a Binance.'};}
}
