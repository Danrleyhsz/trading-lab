import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BinancePerpetualHistory} from '../src/infrastructure/binance-perpetual-history.js';
test('USD-M loader paginates matching closed trade and mark ranges and preserves funding timestamps',async()=>{
 const urls:URL[]=[];const now=1004*3600000;
 const request:typeof fetch=async input=>{const url=new URL(String(input));urls.push(url);const start=Number(url.searchParams.get('startTime'));
 if(url.pathname.endsWith('fundingRate'))return new Response(JSON.stringify([{symbol:'BTCUSDT',fundingTime:16*3600000+1,fundingRate:'0.001',markPrice:'100'}]));
 const count=Number(url.searchParams.get('limit'));return new Response(JSON.stringify(Array.from({length:count},(_,i)=>[start+i*3600000,'100','100','100','100','1',start+(i+1)*3600000-1])));};
 const data=await new BinancePerpetualHistory(request,()=>now).load(1001);assert.equal(data.trade.length,1001);assert.equal(data.trade[0].timestamp,3*3600000);assert.equal(data.trade.at(-1)!.timestamp,1003*3600000);assert.equal(data.funding[0].timestamp,16*3600000+1);assert.equal(urls.filter(u=>u.pathname.endsWith('klines')).length,2);assert.ok(urls.every(u=>u.hostname==='fapi.binance.com'));assert.ok(urls.every(u=>Number(u.searchParams.get('endTime'))===now-1));
});
test('source rejects unavailable funding rather than assuming no settlement',async()=>{const request:typeof fetch=async input=>{const url=new URL(String(input));if(url.pathname.endsWith('fundingRate'))return new Response('[]');const start=Number(url.searchParams.get('startTime'));return new Response(JSON.stringify(Array.from({length:24},(_,i)=>[start+i*3600000,100,100,100,100,1,0])));};await assert.rejects(new BinancePerpetualHistory(request,()=>48*3600000).load(24),/funding history unavailable/);});
