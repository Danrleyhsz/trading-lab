import test from 'node:test';
import assert from 'node:assert/strict';
import {backtestPerpetual,type PerpetualConfig,type PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {realizedVolSeries,calibrateTarget,volSizing} from '../src/domain/vol-target.js';
import {pairedBlockBootstrap} from '../scripts/estudos/vol-target.js';
import type {Candle} from '../src/domain/backtest.js';

// VOL_TARGET_V1 (docs/PROTOCOLO_VOL_TARGET_V1.md): o tamanho usa só o passado, e sem o gancho o simulador é idêntico.
const H=3600000;
function candles(n:number,seed=1):Candle[]{let a=seed,c=100;const out:Candle[]=[];for(let i=0;i<n;i++){a=(a*1103515245+12345)%2147483648;const r=(a/2147483648-0.5)*0.02+(Math.floor(i/150)%2?0.002:-0.0015);const o=c;c=o*(1+r);out.push({timestamp:i*H,open:o,high:Math.max(o,c)*1.001,low:Math.min(o,c)*0.999,close:c,volume:1});}return out;}
const cfg:PerpetualConfig={strategy:'BREAKOUT',fastPeriod:10,slowPeriod:48,feeRate:0.00055,slippageBps:1,initialCapital:10000,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1};
const dataset=(c:Candle[]):PerpetualDataset=>({instrument:'BINANCE_USDM:BTCUSDT',trade:c,mark:structuredClone(c),funding:[]});

test('sem o gancho de tamanho, o simulador dá exatamente o mesmo resultado; com fração fixa igual, também',()=>{
 const c=candles(1200),a=backtestPerpetual(dataset(c),cfg),b=backtestPerpetual(dataset(c),cfg,{entrySizing:()=>0.1});
 assert.ok(a.trades>3);assert.equal(a.netPnl,b.netPnl);assert.deepEqual(a.tradeOutcomes,b.tradeOutcomes);
 assert.throws(()=>backtestPerpetual(dataset(c),cfg,{entrySizing:()=>0.25}),/invalid entry sizing/);
 assert.throws(()=>backtestPerpetual(dataset(c),cfg,{entrySizing:()=>Number.NaN}),/invalid entry sizing/);
});

test('σ na vela i usa só fechamentos anteriores: mudar a vela i ou o futuro não muda o valor',()=>{
 const c=candles(800),vol=realizedVolSeries(c)(500,100);
 const changed=c.map((x,k)=>k>=500?{...x,close:x.close*(k%2?1.3:0.7)}:x);
 assert.equal(realizedVolSeries(changed)(500,100),vol);
 assert.notEqual(realizedVolSeries(changed)(501,100),realizedVolSeries(c)(501,100));
 // Igual ao cálculo direto.
 const r=c.slice(400,500).map((x,k)=>Math.log(x.close/c[399+k].close)),m=r.reduce((s,x)=>s+x,0)/r.length;
 assert.ok(Math.abs(Math.sqrt(r.reduce((s,x)=>s+(x-m)**2,0)/(r.length-1))-vol!)<1e-12);
 assert.equal(realizedVolSeries(c)(50,100),null);
});

test('tamanho: base × alvo ÷ σ dentro dos limites; sem histórico usa a base; alvo é a mediana da calibração',()=>{
 const c=candles(900),vol=realizedVolSeries(c);
 const target=calibrateTarget(c,100,200*H,400*H);
 const s=volSizing(c,{lookback:100,target,base:0.1,min:0.02,max:0.199});
 const f=s(500*H),expected=Math.min(0.199,Math.max(0.02,0.1*target/vol(500,100)!));
 assert.equal(f,expected);assert.equal(s(10*H),0.1);
 assert.equal(volSizing(c,{lookback:100,target:target*100,base:0.1,min:0.02,max:0.199})(500*H),0.199);
 assert.equal(volSizing(c,{lookback:100,target:target/100,base:0.1,min:0.02,max:0.199})(500*H),0.02);
 assert.deepEqual(s.fractions,[f,0.1]);
 assert.throws(()=>volSizing(c,{lookback:100,target,base:0.1,min:0.02,max:0.25}));
});

test('bootstrap pareado é determinístico pela semente e acusa a série melhor',()=>{
 const a=Array.from({length:400},(_,k)=>Math.sin(k)*0.01),b=a.map(x=>x+0.002);
 const r1=pairedBlockBootstrap(a,b,30,300,7),r2=pairedBlockBootstrap(a,b,30,300,7);
 assert.deepEqual(r1,r2);assert.ok(r1.probability>0.9);
 assert.ok(pairedBlockBootstrap(b,a,30,300,7).probability<0.1);
 assert.throws(()=>pairedBlockBootstrap(a,b.slice(1),30,300,7));
});

test('limite de velas: o padrão continua 10 000; pesquisa pode ampliar explicitamente, com teto',()=>{
 const c=candles(10050);
 assert.throws(()=>backtestPerpetual(dataset(c),cfg),/invalid dataset/);
 assert.ok(backtestPerpetual(dataset(c),cfg,{maxBars:20000}).trades>0);
 assert.throws(()=>backtestPerpetual(dataset(c),cfg,{maxBars:500000}),/invalid dataset limit/);
});
