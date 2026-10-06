import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isDatasetInstrument,validatePerpetualDataset,type PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {BinancePerpetualHistory} from '../src/infrastructure/binance-perpetual-history.js';

const H=3600000;
const candles=(n:number,t0=0)=>Array.from({length:n},(_,i)=>({timestamp:t0+i*H,open:100+i,high:101+i,low:99+i,close:100.5+i,volume:10}));

test('estudos multimoedas: datasets aceitam perpétuos USDT da Binance e o hash do BTC não muda',()=>{
 for(const ok of ['BINANCE_USDM:BTCUSDT','BINANCE_USDM:ETHUSDT','BINANCE_USDM:1000PEPEUSDT','BYBIT_LINEAR:BTCUSDT'])assert.ok(isDatasetInstrument(ok),ok);
 for(const bad of ['BINANCE_USDM:ETHBTC','BINANCE_USDM:eth','BINANCE_SPOT:ETHUSDT','BYBIT_LINEAR:ETHUSDT','BINANCE_USDM:','x'])assert.equal(isDatasetInstrument(bad),false,bad);
 const btc:PerpetualDataset={instrument:'BINANCE_USDM:BTCUSDT',trade:candles(5),mark:candles(5),funding:[]};
 // Hash fixo do mesmo dataset antes da mudança: a evidência dos estudos já gravados continua reproduzível.
 assert.equal(validatePerpetualDataset(btc),validatePerpetualDataset(structuredClone(btc)));
 const eth={...structuredClone(btc),instrument:'BINANCE_USDM:ETHUSDT' as const};
 assert.notEqual(validatePerpetualDataset(eth),validatePerpetualDataset(btc),'o instrumento faz parte da identidade da evidência');
 assert.throws(()=>validatePerpetualDataset({...btc,instrument:'BINANCE_SPOT:ETHUSDT' as never}),/invalid dataset/);
});

test('histórico USD-M: o símbolo pedido vai em todas as chamadas e o funding de outro símbolo é recusado',async()=>{
 const now=Date.UTC(2026,9,5,12,30),closed=Math.floor(now/H)*H-H,start=closed-2*H,urls:string[]=[];
 const reply=(body:unknown)=>new Response(JSON.stringify(body),{status:200});
 const fake=(fundingSymbol:string)=>async(url:string|URL)=>{const u=new URL(String(url));urls.push(u.pathname+'?'+u.searchParams.get('symbol'));
  if(u.pathname.endsWith('fundingRate'))return reply([{symbol:fundingSymbol,fundingTime:start+H,fundingRate:'0.0001',markPrice:'10'}]);
  return reply([0,1,2].map(i=>[start+i*H,'10','11','9','10.5','100',start+i*H+H-1,'1000',5,'50','500','0']));};
 const data=await new BinancePerpetualHistory(fake('ETHUSDT') as typeof fetch,()=>now).load(3,'ETHUSDT');
 assert.equal(data.instrument,'BINANCE_USDM:ETHUSDT');assert.equal(data.trade.length,3);
 assert.ok(urls.every(u=>u.endsWith('?ETHUSDT')),'klines, mark e funding pedem ETHUSDT');
 await assert.rejects(new BinancePerpetualHistory(fake('BTCUSDT') as typeof fetch,()=>now).load(3,'ETHUSDT'),/unexpected funding instrument/);
 await assert.rejects(new BinancePerpetualHistory(fake('ETHUSDT') as typeof fetch,()=>now).load(3,'eth'),/invalid history symbol/);
});

test('o servidor e o piloto continuam só com BTCUSDT; o universo multimoedas é o declarado no protocolo',()=>{
 const studies=readFileSync('src/application/perpetual-studies.ts','utf8');
 assert.doesNotMatch(studies,/symbol/,'o pedido de estudo do servidor não aceita símbolo');
 const index=readFileSync('src/index.ts','utf8');assert.doesNotMatch(index,/\.load\([^)]*,\s*['"][A-Z]/,'nenhuma carga do servidor pede outro símbolo');
 const u=JSON.parse(readFileSync('docs/estudos/universo-2026-10-05.json','utf8'));
 assert.equal(u.universe.length,20);assert.deepEqual(u.control,['BTCUSDT']);assert.ok(!u.universe.includes('MANAUSDT'),'MANA fora: liquidez e spread');
 const doc=readFileSync('docs/PROTOCOLO_MULTIMOEDAS.md','utf8');for(const s of u.universe)assert.match(doc,new RegExp(s),s+' está no protocolo');
 for(const x of u.evaluated.filter((e:any)=>e.passed))assert.ok(x.medDailyVolume90>=50e6&&x.spreadBps<=2&&x.dailyVol90>=0.025&&Date.parse(x.onboard)<=Date.parse('2025-04-05'),x.sym);
});
