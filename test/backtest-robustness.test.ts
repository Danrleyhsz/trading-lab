import test from 'node:test';
import assert from 'node:assert/strict';
import {normalCdf,normalInverse,moments,deflatedSharpe,expectedMaxSharpe,probabilityOfBacktestOverfitting,combinatorialPurgedCv,hourlyReturns} from '../src/domain/backtest-robustness.js';
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
 assert.equal(r.policy.version,'ROBUSTNESS_SCREEN_V2');assert.equal(typeof r.eligible,'boolean');
 assert.equal(r.metrics.marketChange,closes[1099]/closes[899]-1,'mercado do fechamento anterior à janela de teste ao fim dela');
});

test('CPCV: 45 divisões e 9 caminhos completos, sem hora repetida; vantagem real dá caminhos positivos, ruído não', ()=>{
 const random=rng(29);
 const strong=Array.from({length:3000},()=>[0.0015+0.01*gaussian(random),0.01*gaussian(random),0.01*gaussian(random)]);
 const pure=Array.from({length:3000},()=>[0,1,2].map(()=>0.01*gaussian(random)));
 const good=combinatorialPurgedCv(strong),bad=combinatorialPurgedCv(pure);
 assert.equal(good.splits,45);assert.equal(good.paths.length,9);
 assert.ok(good.paths.every(p=>p.hours===3000),'cada caminho cobre todas as horas exatamente uma vez');
 assert.equal(good.embargo,30,'embargo de 1% das horas (mínimo 24)');
 assert.ok(good.paths.every(p=>p.sharpe>0),'vantagem real: todos os caminhos positivos');assert.equal(good.selections[0],45,'o candidato bom é escolhido em toda divisão');
 const positive=bad.paths.filter(p=>p.sharpe>0).length;assert.ok(positive<9,'ruído puro não passa em todos os caminhos ('+positive+'/9)');
 assert.equal(combinatorialPurgedCv(strong.slice(0,100)).paths.length,0,'histórico curto: sem caminhos e com motivo');
 assert.match(combinatorialPurgedCv(strong.slice(0,100)).reason!,/insuficientes/);
});

test('CPCV: o embargo tira do treino as horas coladas depois do teste (sem vazamento)', ()=>{
 // Candidato 1 só é excelente nas 30 primeiras horas do grupo 1, logo depois do grupo 0. Quando o grupo 0 é teste
 // e o grupo 1 é treino, sem embargo essas horas entram no treino e o candidato 1 é escolhido por vazamento.
 const matrix=Array.from({length:2400},(_,t)=>[0.0001+0.002*(t%2?1:-1),t>=240&&t<270?0.05:-0.0002]);
 const leak=combinatorialPurgedCv(matrix,{embargo:0}),guarded=combinatorialPurgedCv(matrix,{embargo:30});
 assert.equal((leak.selections[1]??0)-(guarded.selections[1]??0),8,'as 8 divisões com grupo 0 em teste e grupo 1 em treino mudam de escolha');
});
