import WebSocket from 'ws';
import type {QuoteSocket} from './binance-perpetual-market.js';

/**
 * Read-only market context for the office wall screens: spot 24h tickers, hourly candles, USD-M open interest,
 * observed liquidations, order book depth, 1-minute taker flow and a 24h volume profile. Public Binance data
 * only; nothing here feeds signals, risk or execution. Every section carries its own observation time and
 * coverage so the UI never presents a partial window as a full one.
 */
export const PANORAMA_SYMBOLS=['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT'] as const;
export const PANORAMA_STREAMS=[
 'wss://stream.binance.com:9443/stream?streams='+[...PANORAMA_SYMBOLS.map(s=>s.toLowerCase()+'@miniTicker'),'btcusdt@kline_1h','ethusdt@kline_1h'].join('/'),
 'wss://fstream.binance.com/market/stream?streams=btcusdt@kline_1m/!forceOrder@arr',
 'wss://fstream.binance.com/public/ws/btcusdt@depth20@500ms'
] as const;
const HOUR=3600000,MINUTE=60000,MAX_BAN_MS=3600000;
export interface Candle {t:number;o:number;h:number;l:number;c:number}
interface Ticker {price:number;open:number;high:number;low:number;quoteVolume:number;time:number}
interface Flow {t:number;buy:number;sell:number}
interface Liquidation {t:number;side:'LONG'|'SHORT';usd:number}
const finite=(...values:number[])=>values.every(Number.isFinite);

export class BinanceMarketPanorama {
 private stopped=true;private sockets=new Map<string,QuoteSocket>();private failures=new Map<string,number>();private timers=new Set<ReturnType<typeof setTimeout>>();
 private tickers=new Map<string,Ticker>();private candles=new Map<string,Candle[]>();private flow:Flow[]=[];private liquidations:Liquidation[]=[];
 private book?:{bids:[number,number][];asks:[number,number][];time:number};private openInterest?:{btc:number;time:number};private openInterestHistory:{t:number;btc:number;usd:number}[]=[];
 private profile?:{time:number;from:number;to:number;buckets:{price:number;volume:number}[]};private liquidationSince:number|null=null;private restBlockedUntil=0;private errors:string[]=[];
 constructor(private request:typeof fetch=fetch,private now:()=>number=Date.now,private openSocket:(url:string)=>QuoteSocket=url=>new WebSocket(url)){}
 async start(){
  if(!this.stopped)return;this.stopped=false;this.liquidationSince=this.now();
  for(const url of PANORAMA_STREAMS)this.connect(url);
  // Seed windows once, then refresh slowly: about 8 REST calls per 30 minutes in total.
  // Sequential, so a 418/429 on the first call pauses the rest instead of firing them in parallel.
  for(const seed of [()=>this.seedCandles('BTCUSDT'),()=>this.seedCandles('ETHUSDT'),()=>this.seedFlow(),()=>this.refreshOpenInterest(),()=>this.refreshProfile()])await seed();
  this.every(5*MINUTE,()=>this.refreshOpenInterest());this.every(15*MINUTE,()=>this.refreshProfile());this.every(30*MINUTE,()=>Promise.allSettled([this.seedCandles('BTCUSDT'),this.seedCandles('ETHUSDT')]));
 }
 async stop(){this.stopped=true;for(const timer of this.timers)clearTimeout(timer);this.timers.clear();for(const socket of this.sockets.values())socket.terminate();this.sockets.clear();}
 private every(ms:number,task:()=>Promise<unknown>){const run=()=>{if(this.stopped)return;const timer=setTimeout(async()=>{this.timers.delete(timer);await task().catch(()=>{});run();},ms);this.timers.add(timer);};run();}
 private async get(url:string){
  if(this.now()<this.restBlockedUntil)throw Error('panorama REST paused after rate limiting');
  const response=await this.request(url,{signal:AbortSignal.timeout(10000)});
  if(response.status===418||response.status===429){const seconds=Number(response.headers.get('retry-after'));this.restBlockedUntil=this.now()+Math.min(MAX_BAN_MS,Math.max(60000,Number.isFinite(seconds)?seconds*1000:0));throw Error('panorama HTTP '+response.status);}
  if(!response.ok)throw Error('panorama HTTP '+response.status);return response.json();
 }
 private note(error:unknown){this.errors=[String(error instanceof Error?error.message:error).slice(0,200),...this.errors].slice(0,5);}
 private async seedCandles(symbol:'BTCUSDT'|'ETHUSDT'){
  try{const rows=await this.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=48`);if(!Array.isArray(rows))throw Error('invalid klines');
   const candles=rows.map((r:unknown[])=>({t:Number(r[0]),o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4])})).filter((c:Candle)=>finite(c.t,c.o,c.h,c.l,c.c));this.mergeCandles(symbol,candles);}catch(error){this.note(error);}
 }
 private mergeCandles(symbol:string,incoming:Candle[]){const map=new Map((this.candles.get(symbol)??[]).map(c=>[c.t,c]));for(const c of incoming)map.set(c.t,c);this.candles.set(symbol,[...map.values()].sort((a,b)=>a.t-b.t).slice(-48));}
 private async seedFlow(){
  try{const rows=await this.get('https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=1m&limit=60');if(!Array.isArray(rows))throw Error('invalid flow');
   for(const r of rows){const t=Number(r[0]),volume=Number(r[5]),buy=Number(r[9]);if(finite(t,volume,buy))this.putFlow({t,buy,sell:Math.max(0,volume-buy)});}}catch(error){this.note(error);}
 }
 private putFlow(f:Flow){const i=this.flow.findIndex(x=>x.t===f.t);if(i>=0)this.flow[i]=f;else this.flow.push(f);this.flow.sort((a,b)=>a.t-b.t);this.flow=this.flow.filter(x=>x.t>this.now()-HOUR-MINUTE);}
 private async refreshOpenInterest(){
  try{const now=await this.get('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT');const btc=Number(now.openInterest),time=Number(now.time);if(finite(btc,time))this.openInterest={btc,time};
   const history=await this.get('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=25');
   if(Array.isArray(history))this.openInterestHistory=history.map((h:Record<string,string>)=>({t:Number(h.timestamp),btc:Number(h.sumOpenInterest),usd:Number(h.sumOpenInterestValue)})).filter(h=>finite(h.t,h.btc,h.usd));}catch(error){this.note(error);}
 }
 private async refreshProfile(){
  try{const rows=await this.get('https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=96');if(!Array.isArray(rows)||!rows.length)throw Error('invalid profile');
   const bars=rows.map((r:unknown[])=>({t:Number(r[0]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4]),v:Number(r[5])})).filter(b=>finite(b.t,b.h,b.l,b.c,b.v));
   const low=Math.min(...bars.map(b=>b.l)),high=Math.max(...bars.map(b=>b.h)),count=24,step=(high-low)/count||1,buckets=Array.from({length:count},(_,i)=>({price:low+step*(i+0.5),volume:0}));
   for(const b of bars){const typical=(b.h+b.l+b.c)/3;buckets[Math.min(count-1,Math.max(0,Math.floor((typical-low)/step)))].volume+=b.v;}
   this.profile={time:this.now(),from:bars[0].t,to:bars.at(-1)!.t+15*MINUTE,buckets};}catch(error){this.note(error);}
 }
 private connect(url:string){
  if(this.stopped)return;let socket:QuoteSocket;
  try{socket=this.openSocket(url);}catch{this.reconnect(url);return;}
  this.sockets.set(url,socket);socket.on('message',raw=>this.frame(url,raw));socket.on('error',()=>socket.terminate());
  socket.on('close',()=>{if(this.sockets.get(url)===socket){this.sockets.delete(url);this.reconnect(url);}});
 }
 private reconnect(url:string){if(this.stopped)return;const n=(this.failures.get(url)??0)+1;this.failures.set(url,n);const timer=setTimeout(()=>{this.timers.delete(timer);this.connect(url);},Math.min(60000,1000*2**Math.min(n,6)));this.timers.add(timer);}
 /** Parses one public stream frame; malformed or foreign frames are ignored. */
 frame(url:string,raw:unknown){
  let message:any;try{message=JSON.parse(String(raw));}catch{return;}const d=message?.data??message;if(!d||typeof d!=='object')return;this.failures.set(url,0);
  const now=this.now();
  if(d.e==='24hrMiniTicker'&&(PANORAMA_SYMBOLS as readonly string[]).includes(d.s)){const t={price:Number(d.c),open:Number(d.o),high:Number(d.h),low:Number(d.l),quoteVolume:Number(d.q),time:Number(d.E)};if(finite(...Object.values(t))&&t.price>0&&t.open>0)this.tickers.set(d.s,t);}
  else if(d.e==='kline'&&d.k){const k=d.k;
   if(k.i==='1h'&&(d.s==='BTCUSDT'||d.s==='ETHUSDT')){const c={t:Number(k.t),o:Number(k.o),h:Number(k.h),l:Number(k.l),c:Number(k.c)};if(finite(c.t,c.o,c.h,c.l,c.c))this.mergeCandles(d.s,[c]);}
   else if(k.i==='1m'&&d.s==='BTCUSDT'){const t=Number(k.t),volume=Number(k.v),buy=Number(k.V);if(finite(t,volume,buy))this.putFlow({t,buy,sell:Math.max(0,volume-buy)});}}
  else if(d.e==='forceOrder'&&d.o){const o=d.o,usd=Number(o.ap||o.p)*Number(o.z||o.q),t=Number(o.T||d.E);
   // A SELL liquidation order closes a long position; a BUY closes a short.
   if(finite(usd,t)&&usd>0&&(o.S==='SELL'||o.S==='BUY')){this.liquidations.push({t,side:o.S==='SELL'?'LONG':'SHORT',usd});this.liquidations=this.liquidations.filter(l=>l.t>now-24*HOUR);}}
  else if(d.e==='depthUpdate'&&Array.isArray(d.b)&&Array.isArray(d.a)&&d.s==='BTCUSDT'){
   const side=(rows:unknown[][])=>rows.map(r=>[Number(r[0]),Number(r[1])] as [number,number]).filter(([p,q])=>finite(p,q)&&p>0&&q>=0);
   const bids=side(d.b),asks=side(d.a);if(bids.length&&asks.length&&bids[0][0]<asks[0][0])this.book={bids,asks,time:Number(d.E)||now};}
 }
 snapshot(){
  const now=this.now(),fresh=(t?:number,limit=60000)=>t!==undefined&&now-t<=limit;
  const tickers=Object.fromEntries(PANORAMA_SYMBOLS.filter(s=>this.tickers.has(s)).map(s=>{const t=this.tickers.get(s)!;return [s,{price:t.price,change24h:t.price/t.open-1,high:t.high,low:t.low,quoteVolume:t.quoteVolume,time:t.time,fresh:fresh(t.time)}];}));
  const hours=Array.from({length:24},(_,i)=>{const start=Math.floor(now/HOUR)*HOUR-(23-i)*HOUR;const rows=this.liquidations.filter(l=>l.t>=start&&l.t<start+HOUR);return {t:start,longs:rows.filter(r=>r.side==='LONG').reduce((s,r)=>s+r.usd,0),shorts:rows.filter(r=>r.side==='SHORT').reduce((s,r)=>s+r.usd,0)};});
  const oiFirst=this.openInterestHistory[0],oiLast=this.openInterestHistory.at(-1);
  return {observedAt:new Date(now).toISOString(),scope:'PUBLIC_MARKET_CONTEXT_ONLY' as const,
   tickers,
   candles:Object.fromEntries([...this.candles].map(([s,c])=>[s,c.slice(-48)])),
   openInterest:this.openInterest?{btc:this.openInterest.btc,usd:oiLast?.usd??null,change24h:oiFirst&&oiLast&&oiFirst.btc>0?oiLast.btc/oiFirst.btc-1:null,history:this.openInterestHistory.map(h=>({t:h.t,usd:h.usd})),time:this.openInterest.time,fresh:fresh(this.openInterest.time,15*60000)}:null,
   liquidations:{since:this.liquidationSince?new Date(Math.max(this.liquidationSince,now-24*HOUR)).toISOString():null,coverageHours:this.liquidationSince?Math.min(24,(now-this.liquidationSince)/HOUR):0,
    longs:this.liquidations.filter(l=>l.side==='LONG').reduce((s,l)=>s+l.usd,0),shorts:this.liquidations.filter(l=>l.side==='SHORT').reduce((s,l)=>s+l.usd,0),hourly:hours,
    note:'Binance streams at most one liquidation snapshot per symbol per second; totals are observed lower bounds.'},
   book:this.book&&fresh(this.book.time,10000)?{bids:this.book.bids.slice(0,20),asks:this.book.asks.slice(0,20),time:this.book.time}:null,
   flow:this.flow.slice(-60),
   volumeProfile:this.profile??null,
   errors:this.errors};
 }
}
