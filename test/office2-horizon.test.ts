import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Escritório 2.0, fase F5: Horizon mostra só dados públicos coletados pelo servidor e observações gravadas da equipe.
function horizon(){const c=vm.createContext({Math,Object,Array,Number,String,JSON,Date,Infinity});vm.runInContext(readFileSync('public/office2/horizon.js','utf8'),c);return c.Office2Horizon;}
const now=Date.UTC(2026,9,6,18,0);
const panorama={scope:'PUBLIC_MARKET_CONTEXT_ONLY',tickers:{BTCUSDT:{price:85000,change24h:0.01,time:now-1000,fresh:true},ETHUSDT:{price:2600,change24h:-0.02,time:now-600000,fresh:true}},
 candles:{BTCUSDT:[{c:84000},{c:84500},{c:85000}]},openInterest:{usd:8e9,change24h:0.013,fresh:true},liquidations:{longs:4e7,shorts:2e7,coverageHours:17.6},
 flow:[{buy:10,sell:4},{buy:2,sell:6}],book:{bids:[[84999,1],[84998,2]],asks:[[85001,1.5],[85002,0.5]],time:now},errors:[]};
const v3={status:'HEALTHY',quote:{markPrice:85010,indexPrice:85005,fundingRate:0.0001,nextFundingTime:now+3600000,bid:84999.9,ask:85000.1,markTime:now-2000}};
const venues={scope:'PUBLIC_CROSS_VENUE_CONTEXT_ONLY',consensusMark:85000,binanceDivergenceBps:1.2,fundingSpread8h:0.0001,venues:[{quote:{}},{quote:null}]};
const messages=[{from:'oracle',kind:'RESEARCH_FINDING',createdAt:'a',context:{regime:'RANGE',distanceToSma240:0.001}},{from:'vega',kind:'RESEARCH_FINDING',createdAt:'b',context:{dailyVolatility24h:0.01,dailyVolatility7d:0.02,volatilityExpanding:false}},{from:'oracle',kind:'RESEARCH_FINDING',createdAt:'c',context:{regime:'TRENDING_UP',distanceToSma240:0.02}}];

test('Horizon: frescor por fonte, fluxo somado, referência de outras corretoras e a última observação de cada pesquisador',()=>{
 const H=horizon(),v=H.horizon(panorama,v3,venues,messages,now);
 assert.deepEqual(v.tickers.map((t:any)=>[t.symbol,t.fresh]),[['BTCUSDT',true],['ETHUSDT',false]]);
 assert.equal(v.perp.fresh,true);assert.equal(v.perp.spreadBps.toFixed(4),'0.0235');
 assert.deepEqual({...v.flow},{minutes:2,buy:12,sell:10,delta:2});
 assert.equal(v.venues.count,1);assert.match(v.venues.note,/não alimenta sinal, risco nem execução/);
 assert.equal(v.regime.regime,'TRENDING_UP');assert.equal(v.volatility.d7,0.02);
 assert.match(v.liquidations.note,/piso observado/);
 // Cotação velha ou fonte com escopo errado não viram dado fresco nem dado.
 assert.equal(H.horizon(panorama,{...v3,quote:{...v3.quote,markTime:now-60000}},null,[],now).perp.fresh,false);
 const off=H.horizon({...panorama,scope:'OTHER'},null,{...venues,scope:'OTHER'},null,now);
 assert.equal(off.tickers.length,0);assert.equal(off.venues,null);assert.equal(off.perp,null);assert.equal(off.regime,null);
});

test('telas do Horizon só desenham com dado',()=>{
 const H=horizon(),ctx=new Proxy({},{get:(_t,k)=>typeof k==='string'&&['fillStyle','strokeStyle','lineWidth'].includes(k)?undefined:(..._a:unknown[])=>undefined,set:()=>true});
 const inner=[{x:0,y:0},{x:96,y:48},{x:96,y:96},{x:0,y:48}],v=H.horizon(panorama,v3,venues,messages,now);
 assert.equal(H.paintPrice(ctx,inner,{btc48h:[1]}),false);assert.equal(H.paintPrice(ctx,inner,v),true);
 assert.equal(H.paintBook(ctx,inner,{book:{bids:[],asks:[]}}),false);assert.equal(H.paintBook(ctx,inner,v),true);
});
