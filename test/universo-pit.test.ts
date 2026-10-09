import test from 'node:test';
import assert from 'node:assert/strict';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {simulateBlend,momentum} from '../scripts/estudos/fatores-lib.js';
import {cumulativeQuoteVolume,topByVolume,pitEligibility} from '../scripts/estudos/universo-pit.js';

const H=3600000,T0=Date.UTC(2024,0,1);
function prng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function universe(symbols:string[],bars:number,seed=11):Record<string,PerpetualDataset>{
 const out:Record<string,PerpetualDataset>={};
 symbols.forEach((s,k)=>{
  const rnd=prng(seed+k*53),vol=0.002+0.001*k;let price=50*(k+1);const trade=[];
  for(let i=0;i<bars;i++){const open=price,ret=(rnd()-0.5)*2*vol;price=open*(1+ret);trade.push({timestamp:T0+i*H,open,high:Math.max(open,price)*1.001,low:Math.min(open,price)*0.999,close:price,volume:(k+1)*100*(0.5+rnd())});}
  const funding=[];for(let i=0;i<bars;i+=8)funding.push({timestamp:T0+i*H+7,rate:0.0001*(rnd()-0.5),markPrice:trade[i].close});
  out[s]={instrument:`BINANCE_USDM:${s}` as PerpetualDataset['instrument'],trade,mark:trade,funding};
 });
 return out;
}
const symbols=Array.from({length:14},(_,k)=>String.fromCharCode(65+k).repeat(3)+'USDT');
const cfg={lookbackHours:240,rebalanceHours:72,startBar:700,feeRate:0.00055,slippageBps:2,initialCapital:10000};

test('universo ponto no tempo: escolhe pelo volume dos horas anteriores e nunca olha o futuro',()=>{
 const d=universe(symbols,1500),cum=Object.fromEntries(symbols.map(s=>[s,cumulativeQuoteVolume(d[s])])),bar=900;
 const top=topByVolume(cum,symbols,bar,5,672);
 // Volume em moeda cresce com o índice da moeda; os 5 maiores quase sempre são os últimos, e a escolha é determinística.
 assert.equal(top.length,5);assert.deepEqual(topByVolume(cum,symbols,bar,5,672),top);
 // Volume gigante só DEPOIS da vela de decisão não muda a escolha daquela data.
 const future=structuredClone(d);for(let i=bar+1;i<1500;i++)future.AAAUSDT.trade[i].volume=1e9;
 const cumF=Object.fromEntries(symbols.map(s=>[s,cumulativeQuoteVolume(future[s])]));
 assert.deepEqual(topByVolume(cumF,symbols,bar,5,672),top);
 // Volume gigante antes da decisão muda.
 const past=structuredClone(d);for(let i=bar-100;i<=bar;i++)past.AAAUSDT.trade[i].volume=1e9;
 const cumP=Object.fromEntries(symbols.map(s=>[s,cumulativeQuoteVolume(past[s])]));
 assert.ok(topByVolume(cumP,symbols,bar,5,672).includes('AAAUSDT'));
});

test('o filtro de elegibilidade só deixa o livro operar moedas do universo da data',()=>{
 const d=universe(symbols,1500),cum=Object.fromEntries(symbols.map(s=>[s,cumulativeQuoteVolume(d[s])])),book=(eligible?:any)=>[{signal:momentum(240),legFraction:0.025,longCount:3,shortCount:3,eligible}];
 const elig=pitEligibility(cum,symbols,cfg.startBar,8,672,672),r=simulateBlend(d,cfg,book(elig));
 assert.ok(r.rebalances.length>5);
 for(const reb of r.rebalances){const i=Math.round((reb.timestamp-T0)/H),allowed=elig(d,symbols,i);for(const s of [...reb.long,...reb.short])assert.ok(allowed.has(s),`${s} fora do universo em ${i}`);}
 // Elegibilidade com todas as moedas = sem filtro.
 const all=simulateBlend(d,cfg,book(()=>new Set(symbols))),none=simulateBlend(d,cfg,book());
 assert.deepEqual(all,none);
 // Universo menor que a carteira é recusado.
 assert.throws(()=>simulateBlend(d,cfg,book(()=>new Set(symbols.slice(0,4)))),/eligible universe/);
});
