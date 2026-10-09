import test from 'node:test';
import assert from 'node:assert/strict';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {simulateBlend,momentum} from '../scripts/estudos/fatores-lib.js';
import {metrics} from '../scripts/estudos/fatores.js';
import {simulateLean,leanMomentum,toLean,addSymbol,subset,sliceLean,metricsShim} from '../scripts/estudos/lean-sim.js';

const H=3600000,T0=Date.UTC(2024,0,1);
function prng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function universe(symbols:string[],bars:number,seed=3):Record<string,PerpetualDataset>{
 const out:Record<string,PerpetualDataset>={};
 symbols.forEach((s,k)=>{
  const rnd=prng(seed+k*37),vol=0.002+0.001*k,drift=(k%3-1)*0.00005;let price=40*(k+2);const trade=[];
  for(let i=0;i<bars;i++){const open=price,ret=drift+(rnd()-0.5)*2*vol;price=open*(1+ret);trade.push({timestamp:T0+i*H,open,high:Math.max(open,price)*1.001,low:Math.min(open,price)*0.999,close:price,volume:50*(k+1)*(0.5+rnd())});}
  const funding=[];for(let i=0;i<bars;i+=8)funding.push({timestamp:T0+i*H+7,rate:0.0001*(k-5)/5+(rnd()-0.5)*0.00005,markPrice:trade[i].close});
  out[s]={instrument:`BINANCE_USDM:${s}` as PerpetualDataset['instrument'],trade,mark:trade,funding};
 });
 return out;
}
const symbols=Array.from({length:12},(_,k)=>String.fromCharCode(65+k).repeat(3)+'USDT');
const cfg={lookbackHours:240,rebalanceHours:72,startBar:700,feeRate:0.00055,slippageBps:2,initialCapital:10000};

test('simulador enxuto dá o mesmo resultado do simulador completo (um livro, dois livros e universo restrito)',()=>{
 const d=universe(symbols,1500),lean=toLean(d);
 const allowedNames=new Set(symbols.slice(2,10)),allowedIdx=new Set(lean.symbols.map((s,k)=>allowedNames.has(s)?k:-1).filter(k=>k>=0));
 const cases=[
  {full:[{signal:momentum(240),legFraction:0.05,longCount:3,shortCount:3}],fast:[{score:leanMomentum(240),legFraction:0.05,longCount:3,shortCount:3}]},
  {full:[{signal:momentum(240),legFraction:0.025,longCount:3,shortCount:3},{signal:momentum(120),legFraction:0.025,longCount:2,shortCount:2}],fast:[{score:leanMomentum(240),legFraction:0.025,longCount:3,shortCount:3},{score:leanMomentum(120),legFraction:0.025,longCount:2,shortCount:2}]},
  {full:[{signal:momentum(240),legFraction:0.05,longCount:3,shortCount:3,eligible:()=>allowedNames}],fast:[{score:leanMomentum(240),legFraction:0.05,longCount:3,shortCount:3,eligible:()=>allowedIdx}]}];
 for(const c of cases){
  const a=simulateBlend(d,cfg,c.full as any),b=simulateLean(lean,cfg,c.fast);
  assert.equal(b.finalEquity,a.finalEquity);assert.equal(b.maxDrawdown,a.maxDrawdown);assert.equal(b.feesPaid,a.feesPaid);assert.equal(b.fundingCashDelta,a.fundingCashDelta);
  assert.equal(b.tradedNotional,a.tradedNotional);assert.equal(b.closedLegs,a.closedLegs);assert.deepEqual(b.equitySeries,a.equitySeries);assert.deepEqual(b.rebalances,a.rebalances);
 }
});

test('metricsShim, addSymbol, subset e sliceLean preservam os números',()=>{
 const d=universe(symbols,1500),lean=toLean(d),a=simulateBlend(d,cfg,[{signal:momentum(240),legFraction:0.05,longCount:3,shortCount:3}]),b=simulateLean(lean,cfg,[{score:leanMomentum(240),legFraction:0.05,longCount:3,shortCount:3}]);
 const mFull=metrics(d,a,cfg.startBar),mLean=metrics(metricsShim(lean),b as any,cfg.startBar);
 assert.equal(mLean.netPnl,mFull.netPnl);assert.equal(mLean.marketCorrelation,mFull.marketCorrelation);assert.equal(mLean.buyHold,mFull.buyHold);assert.deepEqual(mLean.weeklyReturns,mFull.weeklyReturns);
 // Montar o universo moeda a moeda, fora de ordem, dá o mesmo universo.
 let built=toLean({[symbols[5]]:d[symbols[5]]});for(const s of [...symbols].reverse())if(s!==symbols[5])built=addSymbol(built,s,d[s]);
 assert.deepEqual(built.symbols,lean.symbols);assert.deepEqual(built.close.map(a=>a[100]),lean.close.map(a=>a[100]));
 // Subconjunto e recorte.
 const sub=subset(lean,symbols.slice(0,4));assert.equal(sub.symbols.length,4);
 const cut=sliceLean(lean,1000);assert.equal(cut.timestamps.length,1000);assert.ok(cut.funding[0].every(f=>f.timestamp<lean.timestamps[999]+H));
});

test('séries com início tardio e fim antecipado dão o mesmo resultado que as séries completas preenchidas (zero antes, último preço depois)',()=>{
 const d=universe(symbols,1500),lean=toLean(d),bars=1500;
 // Moedas 0 a 2 só passam a existir na vela 300; moedas 3 e 4 acabam na vela 1100; as demais ficam completas.
 const firstOf=(k:number)=>k<=2?300:0,lastOf=(k:number)=>k===3||k===4?1100:bars-1;
 const padded={...lean,open:lean.open.map((a,k)=>Float64Array.from(a,(v,i)=>i<firstOf(k)?0:i>lastOf(k)?a[lastOf(k)]:v)),close:lean.close.map((a,k)=>Float64Array.from(a,(v,i)=>i<firstOf(k)?0:i>lastOf(k)?a[lastOf(k)]:v)),first:undefined};
 const span={...lean,first:Int32Array.from(lean.symbols,(_,k)=>firstOf(k)),open:lean.open.map((a,k)=>a.slice(firstOf(k),lastOf(k)+1)),close:lean.close.map((a,k)=>a.slice(firstOf(k),lastOf(k)+1))};
 // Só moedas vivas entram no universo, como o estudo faz: o filtro de elegibilidade exclui as que ainda não existem ou já acabaram.
 const alive=(i:number)=>new Set(lean.symbols.map((_,k)=>k).filter(k=>i>=firstOf(k)+240&&i<=lastOf(k)));
 const book=[{score:leanMomentum(240),legFraction:0.05,longCount:3,shortCount:3,eligible:(_d:any,i:number)=>alive(i)}];
 const a=simulateLean(padded as any,cfg,book),b=simulateLean(span as any,cfg,book);
 assert.deepEqual(b.equitySeries,a.equitySeries);assert.equal(b.closedLegs,a.closedLegs);assert.ok(b.rebalances.length>5);
 // Há decisões em que as moedas que acabaram ainda estão na carteira e são zeradas no último preço, sem NaN.
 assert.ok(b.equitySeries.every(p=>Number.isFinite(p.equity)));
});
