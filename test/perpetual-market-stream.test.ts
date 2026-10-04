import test from 'node:test';
import assert from 'node:assert/strict';
import {BinancePerpetualMarket,STREAM_URLS,type QuoteSocket} from '../src/infrastructure/binance-perpetual-market.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
let clock=1700000000000;const now=()=>clock;
class FakeSocket implements QuoteSocket{listeners:Record<string,((raw?:unknown)=>void)[]>={};terminated=false;on(event:string,listener:(raw?:unknown)=>void){(this.listeners[event]??=[]).push(listener);return this;}emit(event:string,raw?:unknown){for(const l of this.listeners[event]??[])l(raw);}terminate(){this.terminated=true;this.emit('close');}}
const book=(t:number,bid='100',ask='101')=>JSON.stringify({stream:'btcusdt@bookTicker',data:{e:'bookTicker',s:'BTCUSDT',b:bid,a:ask,T:t,E:t}});
const mark=(t:number)=>JSON.stringify({stream:'btcusdt@markPrice@1s',data:{e:'markPriceUpdate',E:t,s:'BTCUSDT',p:'100.5',i:'100.4',r:'0.0001',T:t+3600000}});

test('streamed book and mark become the same validated quote; malformed, foreign or stale frames never do',()=>{
 clock=1700000000000;const sockets:FakeSocket[]=[];const market=new BinancePerpetualMarket(async()=>{throw Error('TEST_ONLY no REST');},now,()=>{const s=new FakeSocket();sockets.push(s);return s;});
 assert.equal(market.streamQuote(),null);
 (market as any).stopped=false;(market as any).connect(STREAM_URLS[0]);const s=sockets[0];
 s.emit('message','not json');s.emit('message',JSON.stringify({data:{e:'bookTicker',s:'ETHUSDT',b:'1',a:'2',T:clock}}));s.emit('message',book(clock));assert.equal(market.streamQuote(),null);
 s.emit('message',mark(clock));const quote=market.streamQuote()!;
 assert.deepEqual([quote.bid,quote.ask,quote.markPrice,quote.indexPrice,quote.fundingRate,quote.bookTime,quote.markTime],[100,101,100.5,100.4,0.0001,clock,clock]);
 s.emit('message',book(clock,'102','101'));assert.equal(market.streamQuote(),null,'crossed book rejected');
 s.emit('message',book(clock));clock+=16000;assert.equal(market.streamQuote(),null,'stale stream rejected');
});

test('quotes are delivered from the stream without REST calls; a closed socket is reopened',async()=>{
 clock=1700000000000;let rest=0;const sockets:FakeSocket[]=[];
 const urls:string[]=[];const market=new BinancePerpetualMarket(async()=>{rest++;throw Error('TEST_ONLY no REST');},now,url=>{const s=new FakeSocket();sockets.push(s);urls.push(url);return s;});
 // Raw (unwrapped) frames, as the /public/ws and /market/ws endpoints send them.
 const opened=()=>{sockets[0].emit('message',JSON.stringify(JSON.parse(book(clock)).data));sockets[1].emit('message',JSON.stringify(JSON.parse(mark(clock)).data));};
 const delivered:number[]=[];
 await market.start(async q=>{delivered.push(q.markTime);},()=>{});
 try{
 assert.deepEqual(urls,[...STREAM_URLS],'book on /public and mark on /market');assert.match(urls[0],/\/public\/ws\/btcusdt@bookTicker$/);assert.match(urls[1],/\/market\/ws\/btcusdt@markPrice@1s$/);
 opened();await new Promise(r=>setTimeout(r,2500));
 assert.ok(delivered.length>=1);assert.equal(market.snapshot().transport,'WEBSOCKET');assert.equal(market.snapshot().status,'HEALTHY');assert.equal(rest,0,'no REST while the stream is fresh');
 sockets[0].emit('close');await new Promise(r=>setTimeout(r,2100));
 assert.equal(sockets.length,3,'only the closed stream reconnected after backoff');assert.equal(urls[2],STREAM_URLS[0]);
 }finally{await market.stop();}
 assert.equal(sockets[1].terminated,true);assert.equal(sockets[2].terminated,true);
});

test('418/429 pause REST for Retry-After instead of retrying into a longer IP ban',async()=>{
 clock=1700000000000;let calls=0;
 const market=new BinancePerpetualMarket(async()=>{calls++;return new Response('banned',{status:418,headers:{'retry-after':'120'}});},now,()=>new FakeSocket());
 await assert.rejects(market.quote(),/HTTP 418/);const after=calls;
 await assert.rejects(market.quote(),/paused until/);await assert.rejects(market.funding(clock-1,clock),/paused until/);assert.equal(calls,after,'no request during the pause');
 assert.equal(market.snapshot().restPausedUntil,clock+120000);
 clock+=120001;await assert.rejects(market.quote(),/HTTP 418/);assert.ok(calls>after);
 const limited=new BinancePerpetualMarket(async()=>new Response('slow down',{status:429}),now,()=>new FakeSocket());
 await assert.rejects(limited.quote(),/HTTP 429/);assert.equal(limited.snapshot().restPausedUntil,clock+60000,'minimum one-minute pause without Retry-After');
});

test('funding history is due only on first sync or after the expected settlement time',async()=>{
 clock=1700000000000;const paper=new PerpetualPaperBook(new EventBus(),undefined,now);paper.ensureEvaluation('nova',1000);
 assert.equal(paper.fundingDue(clock),true,'first sync');
 const quote={instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:100,ask:101,markPrice:100,indexPrice:100,fundingRate:0,nextFundingTime:clock+28800000,bookTime:clock,markTime:clock,receivedAt:clock};
 await paper.synchronize(quote,[],async()=>{});
 assert.equal(paper.fundingDue(clock+1000),false,'no settlement can be pending before the expected time');
 assert.equal(paper.fundingDue(clock+28800000),true,'due once the expected time is reached');
});
