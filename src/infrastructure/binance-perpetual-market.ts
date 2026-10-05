import WebSocket from 'ws';
import {PERPETUAL_INSTRUMENT,perpetualQuoteSchema,freshPerpetualQuote,validFunding,type FundingRecord,type PerpetualQuote} from '../domain/perpetual-market.js';
export interface QuoteSocket {on(event:'message',listener:(raw:unknown)=>void):unknown;on(event:'error'|'close',listener:()=>void):unknown;terminate():void}
// Binance serves USD-M high-frequency book data on /public and mark/funding on /market; the legacy combined URL no longer delivers markPrice.
export const STREAM_URLS=['wss://fstream.binance.com/public/ws/btcusdt@bookTicker','wss://fstream.binance.com/market/ws/btcusdt@markPrice@1s'] as const;
const POLL_MS=3000,MAX_REST_BAN_MS=3600000;
/** USD-M quotes come from public WebSocket streams; REST is a fallback that honours 418/429 Retry-After instead of retrying into an IP ban. */
export class BinancePerpetualMarket {
 private active?:Promise<void>;private timer?:ReturnType<typeof setTimeout>;private stopped=true;private latest:PerpetualQuote|null=null;private error:string|null=null;private failures=0;
 private sockets=new Map<string,QuoteSocket>();private socketFailures=new Map<string,number>();private reconnects=new Set<ReturnType<typeof setTimeout>>();private book?:{bid:number;ask:number;time:number;receivedAt:number};private mark?:{markPrice:number;indexPrice:number;fundingRate:number;nextFundingTime:number;time:number;receivedAt:number}
 private restBlockedUntil=0;private transport:'WEBSOCKET'|'REST'|null=null;
 constructor(private request:typeof fetch=fetch,private now:()=>number=Date.now,private openSocket:(url:string)=>QuoteSocket=url=>new WebSocket(url)){}
 private async get(path:string,params:Record<string,string>={symbol:'BTCUSDT'}){
  if(this.now()<this.restBlockedUntil)throw Error(`USD-M REST paused until ${new Date(this.restBlockedUntil).toISOString()} after rate limiting`);
  const response=await this.request(`https://fapi.binance.com${path}?${new URLSearchParams(params)}`,{signal:AbortSignal.timeout(10000)});
  if(response.status===418||response.status===429){const seconds=Number(response.headers.get('retry-after'));this.restBlockedUntil=this.now()+Math.min(MAX_REST_BAN_MS,Math.max(60000,Number.isFinite(seconds)?seconds*1000:0));throw Error(`USD-M market HTTP ${response.status}`);}
  if(!response.ok)throw Error(`USD-M market HTTP ${response.status}`);return response.json();
 }
 private build(raw:Omit<PerpetualQuote,'instrument'|'symbol'>){const quote=perpetualQuoteSchema.parse({instrument:PERPETUAL_INSTRUMENT,symbol:'BTCUSDT',...raw});if(!freshPerpetualQuote(quote,this.now()))throw Error('stale or unsynchronized USD-M market');return quote;}
 async quote():Promise<PerpetualQuote>{const [book,mark]=await Promise.all([this.get('/fapi/v1/ticker/bookTicker'),this.get('/fapi/v1/premiumIndex')]);if(book.symbol!=='BTCUSDT'||mark.symbol!=='BTCUSDT')throw Error('unexpected instrument');return this.build({bid:Number(book.bidPrice),ask:Number(book.askPrice),markPrice:Number(mark.markPrice),indexPrice:Number(mark.indexPrice),fundingRate:Number(mark.lastFundingRate),nextFundingTime:Number(mark.nextFundingTime),bookTime:Number(book.time),markTime:Number(mark.time),receivedAt:this.now()});}
 /** Latest streamed book and mark, validated exactly like a REST quote; null when either side is missing or stale. */
 streamQuote():PerpetualQuote|null{if(!this.book||!this.mark)return null;try{return this.build({bid:this.book.bid,ask:this.book.ask,markPrice:this.mark.markPrice,indexPrice:this.mark.indexPrice,fundingRate:this.mark.fundingRate,nextFundingTime:this.mark.nextFundingTime,bookTime:this.book.time,markTime:this.mark.time,receivedAt:Math.min(this.book.receivedAt,this.mark.receivedAt)});}catch{return null;}}
 private onFrame(url:string,raw:unknown){
  let frame:any;try{frame=JSON.parse(String(raw));}catch{return;}const d=frame?.data??frame;if(d?.s!=='BTCUSDT')return;
  if(d.e==='bookTicker'){const bid=Number(d.b),ask=Number(d.a),time=Number(d.T??d.E);if([bid,ask,time].every(Number.isFinite))this.book={bid,ask,time,receivedAt:this.now()};}
  else if(d.e==='markPriceUpdate'){const value={markPrice:Number(d.p),indexPrice:Number(d.i),fundingRate:Number(d.r),nextFundingTime:Number(d.T),time:Number(d.E),receivedAt:this.now()};if(Object.values(value).every(Number.isFinite))this.mark=value;}
  this.socketFailures.set(url,0);
 }
 private connect(url:string){
  if(this.stopped)return;let socket:QuoteSocket;
  try{socket=this.openSocket(url);}catch{this.scheduleReconnect(url);return;}
  this.sockets.set(url,socket);
  socket.on('message',raw=>this.onFrame(url,raw));socket.on('error',()=>socket.terminate());
  socket.on('close',()=>{if(this.sockets.get(url)===socket){this.sockets.delete(url);this.scheduleReconnect(url);}});
 }
 private scheduleReconnect(url:string){if(this.stopped)return;const failures=(this.socketFailures.get(url)??0)+1;this.socketFailures.set(url,failures);const timer=setTimeout(()=>{this.reconnects.delete(timer);this.connect(url);},Math.min(60000,1000*2**Math.min(failures,6)));this.reconnects.add(timer);}
 async funding(startTime:number,endTime:number):Promise<FundingRecord[]>{if(!Number.isSafeInteger(startTime)||!Number.isSafeInteger(endTime)||startTime>endTime)throw Error('invalid funding range');const records:FundingRecord[]=[];let cursor=startTime;for(let pageNumber=0;pageNumber<20;pageNumber++){const page=await this.get('/fapi/v1/fundingRate',{symbol:'BTCUSDT',startTime:String(cursor),endTime:String(endTime),limit:'1000'});if(!Array.isArray(page))throw Error('invalid funding response');for(const raw of page){const record:FundingRecord={instrument:PERPETUAL_INSTRUMENT,timestamp:Number(raw.fundingTime),rate:Number(raw.fundingRate),markPrice:Number(raw.markPrice)};if(raw.symbol!=='BTCUSDT'||!validFunding(record)||record.timestamp<cursor||record.timestamp>endTime||(records.length>0&&record.timestamp<=records.at(-1)!.timestamp))throw Error('invalid funding history');records.push(record);}if(page.length<1000)return records;cursor=records.at(-1)!.timestamp+1;}throw Error('funding history exceeds bounded catchup');}
 snapshot(){const quote=this.latest?structuredClone(this.latest):null;return {quote,status:quote&&freshPerpetualQuote(quote,this.now())&&!this.error?'HEALTHY':'UNAVAILABLE',error:this.error,consecutiveFailures:this.failures,pollingMs:POLL_MS,transport:this.transport,restPausedUntil:this.restBlockedUntil>this.now()?this.restBlockedUntil:null};}
 async start(onQuote:(quote:PerpetualQuote)=>Promise<void>,onError:(error:Error)=>void){
  this.stopped=false;for(const url of STREAM_URLS)this.connect(url);
  const poll=async()=>{
   try{
    const streamed=this.streamQuote();let quote:PerpetualQuote;
    if(streamed){quote=streamed;this.transport='WEBSOCKET';}
    else{quote=await this.quote();this.transport='REST';}
    if(this.stopped)return;await onQuote(quote);this.latest=quote;this.error=null;this.failures=0;
   }catch(error){this.failures++;this.error=error instanceof Error?error.message:'market unavailable';onError(new Error(this.error));}
   finally{if(!this.stopped)this.timer=setTimeout(()=>{this.active=poll();},POLL_MS);}
  };
  // Give the stream a moment to deliver its first frames so a restart does not begin on REST.
  this.timer=setTimeout(()=>{this.active=poll();},2000);
 }
 async stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);for(const timer of this.reconnects)clearTimeout(timer);this.reconnects.clear();const open=[...this.sockets.values()];this.sockets.clear();for(const socket of open)socket.terminate();await this.active;}
}
