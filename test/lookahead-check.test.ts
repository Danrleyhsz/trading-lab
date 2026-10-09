import test from 'node:test';
import assert from 'node:assert/strict';
import type {Candle} from '../src/domain/backtest.js';
import type {PerpetualConfig,PerpetualDataset,SimulationEntry} from '../src/domain/perpetual-backtest.js';
import {findDecisionLookahead,findExecutionLookahead,findSimulationLookahead,perpetualSimulation,perpetualStrategy,truncateDataset,type VectorStrategy} from '../src/domain/lookahead-check.js';

const H=3600000,T0=Date.UTC(2025,0,1);
/** Série com tendência, ciclos e ruído determinístico: gera rompimentos, cruzamentos de médias e extremos. */
function dataset(n=1000):PerpetualDataset{
 let seed=7;const noise=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-0.5;};
 const closes:number[]=[];let p=100;for(let i=0;i<n;i++){p*=1+0.0004*Math.sin(i/90)+0.006*Math.sin(i/23)+0.004*noise();closes.push(p);}
 const trade:Candle[]=closes.map((c,i)=>{const o=i?closes[i-1]:c;return {timestamp:T0+i*H,open:o,high:Math.max(o,c)*1.002,low:Math.min(o,c)*0.998,close:c,volume:10};});
 const funding=[];for(let i=0;i<n;i+=8)funding.push({timestamp:T0+i*H,rate:0.0001*Math.sin(i/50),markPrice:closes[i]});
 return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding};
}
const base:PerpetualConfig={initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:30};
const families:[string,PerpetualConfig][]=[['SMA 10/30',base],['BREAKOUT 48',{...base,strategy:'BREAKOUT',slowPeriod:48}],['MEAN_REVERSION 40',{...base,strategy:'MEAN_REVERSION',fastPeriod:5,slowPeriod:40}]];
const filters={regime:true as const,volatility:true as const,momentum:true as const};

test('vazamento plantado: decidir olhando a vela seguinte é detectado, com índice e horário',()=>{
 const d=dataset(300).trade;
 const peeks:VectorStrategy=c=>c.map((x,i)=>i+1<c.length?Math.sign(c[i+1].close-x.close):0);
 const r=findDecisionLookahead(d,peeks,{from:10,stride:7});
 assert.ok(r.checked>30);assert.ok(r.violations.length>0);
 const v=r.violations[0];assert.equal(v.timestamp,d[v.index].timestamp);assert.equal(v.truncated,0,'cortado na vela, não há vela seguinte');
});

test('vazamento plantado sutil: normalizar pela média da série inteira (calculada de uma vez) é detectado',()=>{
 const d=dataset(300).trade;
 const globalZ:VectorStrategy=c=>{const mean=c.reduce((s,x)=>s+x.close,0)/c.length;return c.map(x=>x.close>mean?1:-1);};
 assert.ok(findDecisionLookahead(d,globalZ,{from:20,stride:5}).violations.length>0);
});

test('estratégia causal escrita à mão (média de 20 velas até a vela atual) passa',()=>{
 const d=dataset(300).trade;
 const sma:VectorStrategy=c=>c.map((x,i)=>i<19?0:Math.sign(x.close-c.slice(i-19,i+1).reduce((s,y)=>s+y.close,0)/20));
 const r=findDecisionLookahead(d,sma);assert.equal(r.checked,300);assert.deepEqual(r.violations,[]);
});

test('as três famílias do laboratório, com e sem filtros da equipe e em qualquer posição atual, não olham o futuro',()=>{
 const d=dataset(1000).trade;
 for(const [name,cfg] of families)for(const withFilters of [false,true])for(const position of [0,1,-1]){
  const config=withFilters?{...cfg,filters}:cfg,warmup=withFilters?Math.max(cfg.slowPeriod,720)+1:cfg.slowPeriod+1;
  const strategy=perpetualStrategy(config,position,warmup),r=findDecisionLookahead(d,strategy,{from:warmup,stride:23});
  assert.ok(r.checked>=10,name);assert.deepEqual(r.violations,[],`${name}${withFilters?' com filtros':''}, posição ${position}`);
 }
});

test('simulador inteiro (estratégia, filtros, proteções, funding e liquidação): o prefixo não muda quando o futuro é cortado',()=>{
 // Com filtros, o simulador exige mais velas que o aquecimento de 720 h; sem filtros, corta também bem no começo.
 const data=dataset(1000),cuts=[200,333,480,611,777,905,999],filteredCuts=[740,777,851,905,999];
 const protections={cooldownHours:6,maxConsecutiveLosses:2,lossPauseHours:24,maxDrawdownPercent:5,drawdownLookbackHours:240,drawdownPauseHours:48};
 for(const [name,cfg] of families)for(const config of [cfg,{...cfg,protections},{...cfg,filters,protections}]){
  const audit=perpetualSimulation(config)(data);
  if(!config.filters)assert.ok(audit.filter(a=>a.kind==='FILL').length>=4,`${name} opera na série de teste`);
  const at=config.filters?filteredCuts:cuts,r=findSimulationLookahead(data,perpetualSimulation(config),at);
  assert.equal(r.checked,at.length);assert.deepEqual(r.violations,[],name);
 }
});

test('simulador com vazamento plantado (entra se a próxima vela sobe) é detectado',()=>{
 const data=dataset(200);
 const leaky=(d:PerpetualDataset):SimulationEntry[]=>d.trade.flatMap((c,i)=>i+1<d.trade.length&&d.trade[i+1].close>c.close?[{kind:'FILL' as const,timestamp:c.timestamp,quantity:1,price:c.open,cashDelta:0}]:[]);
 const r=findSimulationLookahead(data,leaky,[50,120,199]);assert.ok(r.violations.length>0);
});

test('viés na execução: operar na abertura usando o fechamento da mesma vela é detectado; o simulador do laboratório passa',()=>{
 const data=dataset(400);
 // Vazamento plantado: compra na abertura da vela se ela vai fechar em alta.
 const sameBar=(d:PerpetualDataset):SimulationEntry[]=>d.trade.flatMap(c=>c.close>c.open*1.001?[{kind:'FILL' as const,timestamp:c.timestamp,quantity:1,price:c.open,cashDelta:0}]:[]);
 const leak=findExecutionLookahead(data,sameBar);assert.ok(leak.checked>10);assert.equal(leak.violations.length,leak.checked,'toda ordem plantada é pega');
 // O corte por vela sozinho não enxerga esse tipo de vazamento (por isso as duas verificações existem).
 assert.deepEqual(findSimulationLookahead(data,sameBar,[100,250,399]).violations,[]);
 const protections={cooldownHours:6,maxConsecutiveLosses:2,lossPauseHours:24};
 for(const [name,cfg] of families)for(const config of [cfg,{...cfg,protections}]){
  const r=findExecutionLookahead(data,perpetualSimulation(config));assert.ok(r.checked>=2,`${name} tem ordens para verificar`);assert.deepEqual(r.violations,[],name);
 }
});

test('corte do dataset mantém só o funding até o fim da última vela e recusa entradas inválidas',()=>{
 const data=dataset(100),cut=truncateDataset(data,40);
 assert.equal(cut.trade.length,40);assert.equal(cut.mark.length,40);assert.ok(cut.funding.every(f=>f.timestamp<data.trade[39].timestamp+H));
 assert.throws(()=>findDecisionLookahead(data.trade,c=>c.map(()=>0),{stride:0}),/invalid checkpoints/);
 assert.throws(()=>findDecisionLookahead(data.trade,()=>[1]),/one decision per candle/);
 assert.throws(()=>findSimulationLookahead(data,perpetualSimulation(base),[2]),/invalid cut/);
});
