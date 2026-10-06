import test from 'node:test';
import assert from 'node:assert/strict';
import type {Candle} from '../src/domain/backtest.js';
import type {PerpetualConfig} from '../src/domain/perpetual-backtest.js';
import {liveSignalBars} from '../src/domain/perpetual-signals.js';
import {findShortHistoryDivergence,perpetualDecision} from '../src/domain/lookahead-check.js';

const H=3600000,T0=Date.UTC(2025,0,1);
function candles(n:number):Candle[]{
 let seed=11;const noise=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-0.5;};
 const closes:number[]=[];let p=100;for(let i=0;i<n;i++){p*=1+0.0004*Math.sin(i/90)+0.006*Math.sin(i/23)+0.004*noise();closes.push(p);}
 return closes.map((c,i)=>{const o=i?closes[i-1]:c;return {timestamp:T0+i*H,open:o,high:Math.max(o,c)*1.002,low:Math.min(o,c)*0.998,close:c,volume:10};});
}
const base:PerpetualConfig={initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:30};
const filters={regime:true as const,volatility:true as const,momentum:true as const};

test('indicadores recursivos plantados divergem com histórico curto e são detectados',()=>{
 const d=candles(600);
 // Média exponencial semeada no primeiro preço recebido: depende de quanto histórico veio.
 const ema=(closed:Candle[])=>{let e=closed[0].close;for(const c of closed)e=0.02*c.close+0.98*e;return Math.sign(closed.at(-1)!.close-e);};
 const r=findShortHistoryDivergence(d,ema,100,{stride:3});assert.ok(r.checked>100);assert.ok(r.divergences.length>0);
 const v=r.divergences[0];assert.equal(v.timestamp,d[v.index].timestamp);assert.notEqual(v.longHistory,v.shortHistory);
 // O exemplo da documentação do Freqtrade: contador de velas desde o início.
 const steps=(closed:Candle[])=>closed.length%2;
 assert.ok(findShortHistoryDivergence(d,steps,101,{stride:5}).divergences.length>0);
});

test('indicador de janela fixa (média de 50 velas) tem paridade exata',()=>{
 const sma=(closed:Candle[])=>{const w=closed.slice(-50);return Math.sign(closed.at(-1)!.close-w.reduce((s,c)=>s+c.close,0)/50);};
 const r=findShortHistoryDivergence(candles(400),sma,60);assert.equal(r.checked,400-59);assert.deepEqual(r.divergences,[]);
});

test('todas as famílias do laboratório, com e sem filtros e em qualquer posição, decidem igual com o histórico que o piloto carrega',()=>{
 const d=candles(1100);
 const configs:[string,PerpetualConfig][]=[['SMA 10/30',base],['SMA 48/240',{...base,fastPeriod:48,slowPeriod:240}],['BREAKOUT 480 (piloto)',{...base,strategy:'BREAKOUT',slowPeriod:480}],['MEAN_REVERSION 40',{...base,strategy:'MEAN_REVERSION',fastPeriod:5,slowPeriod:40}]];
 for(const [name,cfg] of configs)for(const config of [cfg,{...cfg,filters}])for(const position of [0,1,-1]){
  const live=liveSignalBars(config),r=findShortHistoryDivergence(d,perpetualDecision(config,position),live,{stride:17});
  assert.ok(r.checked>=10,name);assert.deepEqual(r.divergences,[],`${name}${config.filters?' com filtros':''}, posição ${position}, ${live} velas`);
 }
});

test('histórico do piloto: cobre o aquecimento de cada estratégia e filtro, e entradas inválidas são recusadas',()=>{
 assert.equal(liveSignalBars(base),100);assert.equal(liveSignalBars({...base,strategy:'BREAKOUT',slowPeriod:480}),482);
 assert.equal(liveSignalBars({...base,filters:{regime:true}}),722);assert.equal(liveSignalBars({...base,filters:{momentum:true}}),100);
 assert.throws(()=>findShortHistoryDivergence(candles(50),()=>0,0),/invalid live history length/);
});
