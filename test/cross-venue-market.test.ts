import test from 'node:test';
import assert from 'node:assert/strict';
import {CrossVenueMarket} from '../src/infrastructure/cross-venue-market.js';

const clock=Date.UTC(2026,9,5,12);const now=()=>clock;
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
function fakeFetch(over:Partial<Record<'bybit'|'okx'|'hyper',Response|(()=>Response)>>={}){
 const calls:string[]=[];
 const f=(async(url:string)=>{calls.push(String(url));const pick=(k:'bybit'|'okx'|'hyper',ok:()=>Response)=>{const o=over[k];return typeof o==='function'?o():o??ok();};
  if(String(url).includes('bybit'))return pick('bybit',()=>respond({retCode:0,result:{list:[{symbol:'BTCUSDT',markPrice:'86000',fundingRate:'0.0001',openInterestValue:'5000000000'}]}}));
  if(String(url).includes('funding-rate'))return pick('okx',()=>respond({code:'0',data:[{instId:'BTC-USDT-SWAP',fundingRate:'0.00005'}]}));
  if(String(url).includes('mark-price'))return pick('okx',()=>respond({code:'0',data:[{instId:'BTC-USDT-SWAP',markPx:'86010'}]}));
  return pick('hyper',()=>respond([{universe:[{name:'ETH'},{name:'BTC'}]},[{},{markPx:'86020',funding:'0.00002',openInterest:'1000'}]]));}) as unknown as typeof fetch;
 return {f,calls};
}
test('normaliza funding para 8 h, calcula consenso e a distância da Binance', async()=>{
 const {f}=fakeFetch();const m=new CrossVenueMarket(()=>({markPrice:86100,fundingRate:0.0002,markTime:clock}),f,now);await m.refresh();const s=m.snapshot();
 const hl=s.venues.find(v=>v.venue==='hyperliquid')!.quote!;assert.equal(hl.fundingRate8h.toFixed(6),'0.000160','funding horário x 8');assert.equal(hl.openInterestUsd,86020000);
 assert.equal(s.consensusMark,86010);assert.equal(s.binanceDivergenceBps!.toFixed(2),((86100/86010-1)*10000).toFixed(2));
 assert.equal(s.fundingSpread8h!.toFixed(6),(0.0002-0.00005).toFixed(6));assert.equal(s.scope,'PUBLIC_CROSS_VENUE_CONTEXT_ONLY');
});
test('resposta estranha ou 429 nunca vira número: a corretora fica sem dados e pausa', async()=>{
 const {f,calls}=fakeFetch({bybit:respond({retCode:10001,result:{list:[]}}),okx:()=>new Response('lento',{status:429})});
 const m=new CrossVenueMarket(()=>null,f,now);await m.refresh();let s=m.snapshot();
 assert.equal(s.venues.find(v=>v.venue==='bybit')!.quote,null);assert.match(s.venues.find(v=>v.venue==='okx')!.error!,/429/);assert.equal(s.binanceDivergenceBps,null,'sem Binance não há divergência');
 const before=calls.filter(c=>c.includes('okx')).length;await m.refresh();assert.equal(calls.filter(c=>c.includes('okx')).length,before,'okx pausada não recebe nova requisição');
 s=m.snapshot();assert.match(s.venues.find(v=>v.venue==='okx')!.error!,/pausado/);
});
