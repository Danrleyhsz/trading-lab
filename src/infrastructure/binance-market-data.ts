import WebSocket from 'ws';
import type {MarketDataAdapter,MarketTick} from '../domain/market.js';
export class BinancePublicMarketData implements MarketDataAdapter {
 private ws?:WebSocket;private timer?:ReturnType<typeof setTimeout>;private stopped=true;
 constructor(private symbol='btcusdt'){}
 async connect(onTick:(tick:MarketTick)=>void){this.stopped=false;const open=()=>{if(this.stopped)return;const ws=this.ws=new WebSocket(`wss://stream.binance.com:9443/ws/${this.symbol}@bookTicker`);ws.on('message',raw=>{try{const d=JSON.parse(raw.toString()),bid=Number(d.b),ask=Number(d.a);if(!Number.isFinite(bid)||!Number.isFinite(ask)||bid<=0||ask<bid)return;onTick({symbol:this.symbol.toUpperCase(),price:(bid+ask)/2,bid,ask,exchange:'binance',timestamp:Date.now()});}catch{/* Ignore malformed external frames; never synthesize a tick. */}});ws.on('error',()=>ws.terminate());ws.on('close',()=>{if(!this.stopped)this.timer=setTimeout(open,3000);});};open();}
 async disconnect(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.ws?.terminate();}
}
