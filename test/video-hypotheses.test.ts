import test from 'node:test';
import assert from 'node:assert/strict';
import type {Candle} from '../src/domain/backtest.js';
import {backtestPerpetual,type PerpetualConfig,type PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {perpetualDirection} from '../src/domain/perpetual-signals.js';
import {signalBacktest,type SignalStrategy} from '../src/domain/signal-backtest.js';
import {HYPOTHESIS_GRID,buildStrategy,supportResistance} from '../src/domain/video-hypotheses/strategies.js';
import {calendarStrategy,fitCalendar} from '../src/domain/video-hypotheses/calendar.js';
import {findDecisionLookahead} from '../src/domain/lookahead-check.js';

const H=3600000,T0=Date.UTC(2025,0,1);
/** Série com tendência, ciclos, ruído, saltos e volume variável (VWAP, rompimentos, bandeiras e retrações). */
function series(n:number,seed=5):PerpetualDataset{
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-0.5;};
 const closes:number[]=[];let p=100;for(let i=0;i<n;i++){p*=1+0.0005*Math.sin(i/80)+0.006*Math.sin(i/21)+0.006*rnd()+(i%97===0?0.04*Math.sign(rnd()):0);closes.push(p);}
 const trade:Candle[]=closes.map((c,i)=>{const o=i?closes[i-1]:c;return {timestamp:T0+i*H,open:o,high:Math.max(o,c)*(1+0.002+0.002*Math.abs(rnd())),low:Math.min(o,c)*(1-0.002-0.002*Math.abs(rnd())),close:c,volume:50+40*Math.sin(i/7)+30*Math.abs(rnd())};});
 const funding=[];for(let i=0;i<n;i+=8)funding.push({timestamp:T0+i*H,rate:0.0001*Math.sin(i/40),markPrice:closes[i]});
 return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding};
}
const costs={initialCapital:10000,positionFraction:0.1,feeRate:0.00055,slippageBps:2};

test('equivalência: o motor de sinais reproduz o backtestPerpetual do laboratório (SMA e rompimento, com funding)',()=>{
 const data=series(900);
 for(const cfg of [{initialCapital:10000,feeRate:0.00055,slippageBps:2,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:30},{initialCapital:10000,feeRate:0.00055,slippageBps:2,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:48,strategy:'BREAKOUT' as const}] as PerpetualConfig[]){
  const reference=backtestPerpetual(data,cfg);
  const strategy:SignalStrategy=(i,pos)=>{const d=perpetualDirection(data.trade.slice(0,i+1),cfg,pos?pos.side*pos.quantity:0);if(!d)return pos?'EXIT':null;return d!==pos?.side?{side:d as 1|-1}:null;};
  const mine=signalBacktest(data.trade,data.funding,strategy,{...costs,warmup:cfg.slowPeriod});
  assert.ok(reference.trades>=5,'a referência opera');assert.equal(mine.trades.length,reference.trades);
  assert.ok(Math.abs(mine.netPnl-reference.netPnl)<1e-6,`P&L ${mine.netPnl} × ${reference.netPnl}`);
  assert.ok(Math.abs(mine.feesPaid-reference.feesPaid)<1e-6);assert.ok(Math.abs(mine.fundingCashDelta-reference.fundingCashDelta)<1e-6);
 }
});

test('stop, alvo, limite de tempo e gap: o stop vence quando os dois são tocados; gap executa na abertura',()=>{
 const flat=(o:number,h:number,l:number,c:number,i:number):Candle=>({timestamp:T0+i*H,open:o,high:h,low:l,close:c,volume:1});
 const bars=[flat(100,100,100,100,0),flat(100,101,99,100,1),flat(100,112,89,100,2),flat(100,100,100,100,3)];
 const once=(intent:{side:1|-1;stop?:number;target?:number;maxBars?:number}):SignalStrategy=>i=>i===0?intent:null;
 const both=signalBacktest(bars,[],once({side:1,stop:90,target:110}),{...costs,slippageBps:0,feeRate:0,warmup:0});
 assert.equal(both.trades[0].reason,'STOP');assert.equal(both.trades[0].exitPrice,90);
 const gapBars=[flat(100,100,100,100,0),flat(100,101,99,100,1),flat(80,85,79,84,2)];
 const gap=signalBacktest(gapBars,[],once({side:1,stop:90}),{...costs,slippageBps:0,feeRate:0,warmup:0});assert.equal(gap.trades[0].exitPrice,80,'abertura abaixo do stop executa na abertura');
 const timed=signalBacktest([...bars.slice(0,2),flat(100,101,99,100,2),flat(100,101,99,100,3),flat(100,101,99,100,4)],[],once({side:-1,maxBars:2}),{...costs,warmup:0});
 assert.equal(timed.trades[0].reason,'TIME');assert.equal(timed.trades[0].exitTime,T0+3*H,'entra na abertura da vela 1, fica 2 velas e sai na abertura da 3');
});

test('todas as 45 configurações de H01 a H05 decidem só com o passado (lado e stop)',()=>{
 const data=series(700,9).trade;
 for(const config of HYPOTHESIS_GRID){
  const side=(c:readonly Candle[])=>{const s=buildStrategy(c,config);return c.map((_,i)=>{const d=s(i,null);return d&&d!=='EXIT'?d.side:0;});};
  const stop=(c:readonly Candle[])=>{const s=buildStrategy(c,config);return c.map((_,i)=>{const d=s(i,null);return d&&d!=='EXIT'&&d.stop!==undefined?d.stop:NaN;});};
  for(const vector of [side,stop]){const r=findDecisionLookahead(data,vector,{from:200,stride:3});assert.deepEqual(r.violations,[],config.id);}
 }
 assert.equal(HYPOTHESIS_GRID.length,45);assert.equal(new Set(HYPOTHESIS_GRID.map(c=>c.id)).size,45);
});

test('cada família gera sinais na série sintética (os detectores não estão mortos)',()=>{
 const data=series(2500,13).trade,families=new Map<string,number>();
 for(const config of HYPOTHESIS_GRID){const s=buildStrategy(data,config);let n=0;for(let i=0;i<data.length;i++){const d=s(i,null);if(d&&d!=='EXIT')n++;}families.set(config.family,(families.get(config.family)??0)+n);}
 for(const [family,n] of families)assert.ok(n>0,family);
});

test('suporte e resistência: o resultado de cada reteste só é conhecido depois dele; a taxa usada no sinal é a anterior',()=>{
 const data=series(2000,21).trade,{touches}=supportResistance(data,{pivotBars:12,minRetests:1,minHoldRate:0.5});
 assert.ok(touches.length>20);assert.ok(touches.some(t=>t.outcome==='HOLD')&&touches.some(t=>t.outcome==='BREAK'));
 for(const t of touches)assert.ok(t.priorHoldRate===null||t.priorHoldRate>=0&&t.priorHoldRate<=1);
 // Cortar a série depois de um toque não muda o histórico anterior ao toque.
 const cut=touches[Math.floor(touches.length/2)],early=supportResistance(data.filter(c=>c.timestamp<=cut.time),{pivotBars:12,minRetests:1,minHoldRate:0.5}).touches.find(t=>t.time===cut.time&&t.zoneType===cut.zoneType)!;
 assert.equal(early.priorEligible,cut.priorEligible);assert.equal(early.priorHoldRate,cut.priorHoldRate);
});

test('calendário: o ajuste só usa a janela de treino, exige |t| >= 3 e a decisão não olha a próxima vela',()=>{
 const a=series(3000,31).trade,from=a[0].timestamp,to=a[2000].timestamp,fit=fitCalendar([a],'HOUR_OF_DAY',from,to);
 const b=a.map((c,i)=>i>=2000?{...c,close:c.open*1.05}:c);assert.deepEqual(fitCalendar([b],'HOUR_OF_DAY',from,to),fit,'velas fora da janela não mudam o ajuste');
 assert.ok(fit.buckets.every(x=>x.side===0||Math.abs(x.t)>=3));
 const forced={...fit,buckets:fit.buckets.map((x,k)=>({...x,side:(k%3===0?1:k%3===1?-1:0) as -1|0|1}))};
 const side=(c:readonly Candle[])=>{const s=calendarStrategy(c,forced);return c.map((_,i)=>{const d=s(i,null);return d&&d!=='EXIT'?d.side:0;});};
 assert.deepEqual(findDecisionLookahead(a,side,{from:10,stride:7}).violations,[]);
});
