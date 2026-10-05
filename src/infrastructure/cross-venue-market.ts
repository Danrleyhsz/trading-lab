// Funding, mark price e open interest do BTC perpétuo em outras corretoras (só dados públicos, só leitura).
// Ideia do ccxt (dados unificados de várias corretoras) e da arbitragem de funding do Hummingbot; adaptadores
// próprios e pequenos em vez da biblioteca inteira, para não aumentar a imagem do servidor.
// Usos: (1) referência quando a Binance falhar ou divergir; (2) comparar funding entre corretoras como pesquisa.
// Nunca alimenta sinal, risco ou execução: o piloto continua usando só a cotação USD-M da Binance.

export type Venue='binance'|'bybit'|'okx'|'hyperliquid';
export interface VenueQuote {venue:Venue;markPrice:number;fundingRate8h:number;fundingIntervalHours:number;openInterestUsd:number|null;time:number}
interface VenueState {quote:VenueQuote|null;error:string|null;blockedUntil:number;failures:number}
const MAX_BAN_MS=3600000;
const finite=(...v:number[])=>v.every(Number.isFinite);
const median=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return s.length?s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2:NaN;};

export class CrossVenueMarket {
 private state=new Map<Venue,VenueState>();private timer?:ReturnType<typeof setInterval>;
 constructor(private binance:()=>{markPrice:number;fundingRate:number;markTime:number}|null,private request:typeof fetch=fetch,private now:()=>number=Date.now){
  for(const v of ['bybit','okx','hyperliquid'] as const)this.state.set(v,{quote:null,error:null,blockedUntil:0,failures:0});
 }
 start(intervalMs=5*60000){void this.refresh();this.timer=setInterval(()=>void this.refresh(),intervalMs);}
 stop(){if(this.timer)clearInterval(this.timer);}
 private async json(venue:Venue,url:string,init?:RequestInit){
  const s=this.state.get(venue)!;if(this.now()<s.blockedUntil)throw Error('pausado até '+new Date(s.blockedUntil).toISOString()+' após limite de requisições');
  const response=await this.request(url,{...init,signal:AbortSignal.timeout(10000)});
  if(response.status===418||response.status===429||response.status===403){const seconds=Number(response.headers.get('retry-after'));s.blockedUntil=this.now()+Math.min(MAX_BAN_MS,Math.max(60000,Number.isFinite(seconds)?seconds*1000:0));throw Error(venue+' HTTP '+response.status);}
  if(!response.ok)throw Error(venue+' HTTP '+response.status);return response.json();
 }
 private async bybit():Promise<VenueQuote>{
  const j=await this.json('bybit','https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT');const t=j?.result?.list?.[0];
  if(j?.retCode!==0||t?.symbol!=='BTCUSDT')throw Error('bybit: resposta inesperada');
  const q={venue:'bybit' as const,markPrice:Number(t.markPrice),fundingRate8h:Number(t.fundingRate),fundingIntervalHours:8,openInterestUsd:Number(t.openInterestValue),time:this.now()};
  if(!finite(q.markPrice,q.fundingRate8h)||q.markPrice<=0)throw Error('bybit: valores inválidos');return q;
 }
 private async okx():Promise<VenueQuote>{
  const [f,m]=await Promise.all([this.json('okx','https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP'),this.json('okx','https://www.okx.com/api/v5/public/mark-price?instType=SWAP&instId=BTC-USDT-SWAP')]);
  const fr=f?.data?.[0],mk=m?.data?.[0];if(f?.code!=='0'||m?.code!=='0'||fr?.instId!=='BTC-USDT-SWAP'||mk?.instId!=='BTC-USDT-SWAP')throw Error('okx: resposta inesperada');
  const q={venue:'okx' as const,markPrice:Number(mk.markPx),fundingRate8h:Number(fr.fundingRate),fundingIntervalHours:8,openInterestUsd:null,time:this.now()};
  if(!finite(q.markPrice,q.fundingRate8h)||q.markPrice<=0)throw Error('okx: valores inválidos');return q;
 }
 private async hyperliquid():Promise<VenueQuote>{
  const j=await this.json('hyperliquid','https://api.hyperliquid.xyz/info',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'metaAndAssetCtxs'})});
  const i=Array.isArray(j)?j[0]?.universe?.findIndex((u:{name:string})=>u.name==='BTC'):-1;const c=i>=0?j[1]?.[i]:null;if(!c)throw Error('hyperliquid: BTC ausente');
  // Funding da Hyperliquid é por hora; multiplicado por 8 para comparar com as corretoras de 8 h.
  const mark=Number(c.markPx),hourly=Number(c.funding),oi=Number(c.openInterest)*mark;
  const q={venue:'hyperliquid' as const,markPrice:mark,fundingRate8h:hourly*8,fundingIntervalHours:1,openInterestUsd:Number.isFinite(oi)?oi:null,time:this.now()};
  if(!finite(q.markPrice,q.fundingRate8h)||q.markPrice<=0)throw Error('hyperliquid: valores inválidos');return q;
 }
 async refresh(){
  const jobs:[Venue,()=>Promise<VenueQuote>][]=[['bybit',()=>this.bybit()],['okx',()=>this.okx()],['hyperliquid',()=>this.hyperliquid()]];
  await Promise.all(jobs.map(async([venue,load])=>{const s=this.state.get(venue)!;try{s.quote=await load();s.error=null;s.failures=0;}catch(error){s.error=String(error instanceof Error?error.message:error).slice(0,200);s.failures++;}}));
 }
 snapshot(){
  const now=this.now(),fresh=(q:VenueQuote|null)=>!!q&&now-q.time<=15*60000;
  const b=this.binance(),binance:VenueQuote|null=b&&now-b.markTime<=15000?{venue:'binance',markPrice:b.markPrice,fundingRate8h:b.fundingRate,fundingIntervalHours:8,openInterestUsd:null,time:b.markTime}:null;
  const others=[...this.state.values()].map(s=>s.quote).filter(fresh) as VenueQuote[];
  const all=[...(binance?[binance]:[]),...others];
  const fundings=all.map(q=>q.fundingRate8h),otherMarks=others.map(q=>q.markPrice),consensus=median(otherMarks);
  return {observedAt:new Date(now).toISOString(),scope:'PUBLIC_CROSS_VENUE_CONTEXT_ONLY' as const,
   venues:[{venue:'binance' as const,quote:binance,error:binance?null:'cotação USD-M indisponível ou atrasada'},...[...this.state.entries()].map(([venue,s])=>({venue,quote:fresh(s.quote)?s.quote:null,error:fresh(s.quote)?null:s.error??'ainda sem dados'}))],
   fundingSpread8h:fundings.length>=2?Math.max(...fundings)-Math.min(...fundings):null,
   fundingSpreadAnnualized:fundings.length>=2?(Math.max(...fundings)-Math.min(...fundings))*3*365:null,
   consensusMark:Number.isFinite(consensus)?consensus:null,
   binanceDivergenceBps:binance&&Number.isFinite(consensus)?(binance.markPrice/consensus-1)*10000:null,
   note:'Funding da Hyperliquid é por hora e aparece convertido para 8 h. Spread anualizado é teórico (3 liquidações por dia), sem custos de execução.'};
 }
}
