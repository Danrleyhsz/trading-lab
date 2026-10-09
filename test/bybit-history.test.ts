import test from 'node:test';
import assert from 'node:assert/strict';
import {BybitPerpetualHistory,ResilientPerpetualHistory} from '../src/infrastructure/bybit-perpetual-history.js';
import {AutonomousPerpetualCycle} from '../src/application/autonomous-perpetual-cycle.js';
import {PerpetualStudies} from '../src/application/perpetual-studies.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {MemoryStore} from '../src/domain/memory.js';
import {EventBus} from '../src/application/event-bus.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {eligibleStudyFixture} from './fixtures/perpetual-study.js';

const H=3600000,now=1700000000000,closed=Math.floor(now/H)*H-H;
/** API da Bybit simulada: do mais novo para o mais antigo, no máximo `limit` linhas por página. */
function fakeBybit(hours:number){
 const first=closed-(hours-1)*H,calls:string[]=[];
 const respond=(list:unknown[])=>new Response(JSON.stringify({retCode:0,result:{list}}),{status:200});
 const f=(async(input:string|URL)=>{const url=new URL(String(input));calls.push(url.pathname);const q=url.searchParams;
  if(url.pathname.endsWith('kline')){const start=Number(q.get('start')),end=Number(q.get('end')),limit=Number(q.get('limit'));const rows:unknown[]=[];
   for(let t=Math.floor(end/H)*H;t>=start&&rows.length<limit;t-=H)if(t>=first&&t<=closed){const c=100+(t-first)/H;rows.push(url.pathname.includes('mark-price')?[String(t),String(c),String(c+1),String(c-1),String(c+0.5)]:[String(t),String(c),String(c+1),String(c-1),String(c+0.5),'7','700']);}
   return respond(rows);}
  const start=Number(q.get('startTime')),end=Number(q.get('endTime'));const rows:unknown[]=[];
  for(let t=Math.floor(end/(8*H))*8*H;t>=start&&rows.length<200;t-=8*H)if(t>=first)rows.push({symbol:'BTCUSDT',fundingRate:'0.0001',fundingRateTimestamp:String(t)});
  return respond(rows);}) as typeof fetch;
 return {f,calls};
}

test('histórico da Bybit: pagina para trás, alinha mark e funding e marca o instrumento próprio',async()=>{
 const {f,calls}=fakeBybit(1500),data=await new BybitPerpetualHistory(f,()=>now).load(1500);
 assert.equal(data.instrument,'BYBIT_LINEAR:BTCUSDT');assert.equal(data.trade.length,1500);assert.equal(data.trade.at(-1)!.timestamp,closed,'termina na última hora fechada');
 assert.ok(calls.filter(c=>c==='/v5/market/kline').length>=2,'1500 h exigem duas páginas');
 assert.ok(data.funding.length>=180&&data.funding.every(x=>x.markPrice===data.mark.find(m=>m.timestamp===x.timestamp)!.open),'funding usa o mark da hora');
 const broken=(async()=>new Response(JSON.stringify({retCode:10006,result:{list:[]}}),{status:200})) as unknown as typeof fetch;
 await assert.rejects(new BybitPerpetualHistory(broken,()=>now).load(100),/invalid Bybit/);
});

test('reserva só entra quando ligada e quando a Binance falha; o status registra o motivo',async()=>{
 const binance={load:async():Promise<PerpetualDataset>=>{throw Error('USD-M history HTTP 418');}},bybit={load:async(n:number)=>new BybitPerpetualHistory(fakeBybit(n).f,()=>now).load(n)};
 await assert.rejects(new ResilientPerpetualHistory(binance,bybit,false).load(100),/418/,'desligada: o erro original continua');
 const on=new ResilientPerpetualHistory(binance,bybit,true,()=>now),data=await on.load(100);
 assert.equal(data.instrument,'BYBIT_LINEAR:BTCUSDT');assert.equal(on.status().fallbacks,1);assert.match(on.status().lastFallback!.reason,/418/);
 const ok=new ResilientPerpetualHistory({load:async()=>({instrument:'BINANCE_USDM:BTCUSDT'} as unknown as PerpetualDataset)},bybit,true);assert.equal((await ok.load(100)).instrument,'BINANCE_USDM:BTCUSDT');assert.equal(ok.status().fallbacks,0);
});

test('com dados de reserva o piloto fecha posição, mas nunca abre',async()=>{
 const series=(t0:number,step:number):PerpetualDataset=>{const trade=Array.from({length:100},(_,i)=>({timestamp:t0-(99-i)*H,open:150+step*i,high:150+step*i,low:150+step*i,close:150+step*i,volume:1}));return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]};};
 let clock=now,data=series(closed,1);const source={load:async()=>data},bus=new EventBus(),memories=new MemoryStore(),save=async()=>{};
 const book=new PerpetualPaperBook(bus,undefined,()=>clock);book.ensureEvaluation('nova',1000);
 const quote=(t:number)=>({instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:199,ask:199.1,markPrice:199,indexPrice:199,fundingRate:0.001,nextFundingTime:now+28800000,bookTime:t,markTime:t,receivedAt:t});
 await book.synchronize(quote(clock),[],save);
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligibleStudyFixture(now)]),book,source,save,memories,bus,async()=>{},()=>clock);
 // Reserva na primeira hora, com sinal de compra: não abre e o Sentinel registra o motivo.
 data={...series(closed,1),instrument:'BYBIT_LINEAR:BTCUSDT'};await cycle.onMarket();
 assert.equal(book.list()[0].fills,0);assert.ok(memories.list().some(m=>m.agentId==='sentinel'&&m.metadata?.reason==='BACKUP_DATA'));
 // Hora seguinte com a Binance: abre normalmente.
 clock+=H;await book.synchronize(quote(clock),[],save);data=series(closed+H,1);await cycle.onMarket();assert.equal(book.list()[0].fills,1);
 // Hora seguinte com reserva e sinal contrário: fecha, mas não abre a venda.
 clock+=H;await book.synchronize(quote(clock),[],save);data={...series(closed+2*H,-1),instrument:'BYBIT_LINEAR:BTCUSDT'};await cycle.onMarket();
 assert.equal(book.list()[0].fills,2,'só o fechamento');assert.equal(book.list()[0].portfolio.positions.length,0);
});
