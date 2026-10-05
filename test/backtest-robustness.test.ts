import test from 'node:test';
import assert from 'node:assert/strict';
import {normalCdf,normalInverse,moments,deflatedSharpe,expectedMaxSharpe,probabilityOfBacktestOverfitting,hourlyReturns} from '../src/domain/backtest-robustness.js';
import {computeStudyRobustness} from '../src/application/study-robustness.js';
import {studyCandidates} from '../src/application/perpetual-studies.js';

// Gerador determinístico, para os testes não dependerem de sorte.
function rng(seed:number){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/2**32;};}
function gaussian(random:()=>number){const u=Math.max(1e-12,random()),v=random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

test('normal: valores de referência da tabela', ()=>{
 assert.ok(Math.abs(normalCdf(0)-0.5)<1e-7);assert.ok(Math.abs(normalCdf(1.96)-0.9750021)<1e-6);assert.ok(Math.abs(normalCdf(-1)-0.1586553)<1e-6);
 assert.ok(Math.abs(normalInverse(0.975)-1.959964)<1e-5);assert.ok(Math.abs(normalInverse(0.5))<1e-9);assert.ok(Math.abs(normalInverse(0.01)+2.326348)<1e-5);
});

test('Deflated Sharpe: quanto mais tentativas, mais exigente; retornos sem vantagem não passam', ()=>{
 const random=rng(7),edge=Array.from({length:4000},()=>0.0004+0.01*gaussian(random)),noise=Array.from({length:4000},()=>0.01*gaussian(random));
 const one=deflatedSharpe(edge,1,0),many=deflatedSharpe(edge,50,0.0004);
 assert.ok(one.deflatedSharpe>many.deflatedSharpe,'50 tentativas descontam mais do que 1');
 assert.ok(expectedMaxSharpe(50,0.0004)>expectedMaxSharpe(5,0.0004));
 assert.ok(deflatedSharpe(noise,20,0.0004).deflatedSharpe<0.9,'ruído com muitas tentativas não é aprovado');
 const m=moments([0.01,-0.01,0.02,0.0,0.005]);assert.ok(Number.isFinite(m.sharpe));assert.ok(Number.isNaN(moments([1,2]).sharpe),'poucos dados: indefinido, nunca inventado');
});

test('PBO: um candidato realmente melhor dá PBO baixo; candidatos iguais em ruído dão PBO perto de 0,5', ()=>{
 const random=rng(11);
 const strong=Array.from({length:2000},()=>[0.002+0.01*gaussian(random),0.01*gaussian(random),0.01*gaussian(random),0.01*gaussian(random)]);
 const pure=Array.from({length:2000},()=>[0,1,2,3].map(()=>0.01*gaussian(random)));
 const good=probabilityOfBacktestOverfitting(strong,10),bad=probabilityOfBacktestOverfitting(pure,10);
 assert.equal(good.combinations,252);assert.ok(good.pbo!<0.1,'PBO '+good.pbo);assert.ok(bad.pbo!>0.25,'PBO '+bad.pbo);
 assert.equal(probabilityOfBacktestOverfitting(strong.map(r=>[r[0]]),10).pbo,null,'1 candidato: PBO não se aplica');
});

test('retornos horários usam o último ponto de cada hora', ()=>{
 assert.deepEqual(hourlyReturns([{timestamp:0,equity:100},{timestamp:1000,equity:101},{timestamp:3600000,equity:110},{timestamp:7200000,equity:99}]).map(r=>Number(r.toFixed(6))),[Number((110/101-1).toFixed(6)),Number((99/110-1).toFixed(6))]);
});

test('robustez de um estudo: usa só as horas de teste e conta as tentativas do registro', ()=>{
 const H=3600000,closes=Array.from({length:1400},(_,i)=>100+Math.sin(i/40)*8+i*0.01);
 const candles=closes.map((c,i)=>({timestamp:i*H,open:c,high:c+0.3,low:c-0.3,close:c,volume:1}));
 const dataset={instrument:'BINANCE_USDM:BTCUSDT' as const,trade:candles,mark:structuredClone(candles),funding:[]};
 const candidates=studyCandidates('SHORT_HORIZON_V1');
 const folds=[{testStart:900*H,testEnd:1099*H,result:{equitySeries:Array.from({length:300},(_,i)=>({timestamp:(800+i)*H,equity:10000+i}))}}];
 const r=computeStudyRobustness({dataset,candidates,folds,trials:[...candidates,...studyCandidates('MULTI_DAY_TREND_V1')]});
 assert.equal(r.outOfSample.hours,199,'só as horas de teste entram (o aquecimento fica de fora)');
 assert.equal(r.multipleTesting.trials,8);assert.equal(r.overfitting.combinations,252);
 assert.equal(r.policy.version,'ROBUSTNESS_SCREEN_V1');assert.equal(typeof r.eligible,'boolean');
});
