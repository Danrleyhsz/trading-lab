import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runStressLab,runScenario,checkInvariants,STRESS_SCENARIOS,STRESS_POLICY,type StressScenario} from '../src/application/stress-lab.js';
import {event} from '../src/domain/events.js';

test('catálogo STRESS_LAB_V1: todos os cenários sobrevivem sem violar invariantes, e a mesma semente reproduz o mesmo relatório',async()=>{
 const a=await runStressLab(20261006);
 assert.equal(a.scope,'SIMULATION');
 for(const s of a.scenarios)assert.ok(s.survived,s.id+': '+JSON.stringify({violations:s.invariantViolations,failed:s.expectations.filter(x=>!x.passed)}));
 assert.equal(a.summary.invariantViolations,0);
 // O relatório que o Escritório 2.0 mostra (public/office2/stress-report.json) tem que ser exatamente esta rodada.
 // Se o código do laboratório mudar, regenere com: REPORT_PATH=public/office2/stress-report.json npm run stress-lab
 assert.equal(JSON.parse(readFileSync('public/office2/stress-report.json','utf8')).reportSha256,a.reportSha256);
 // Reprodutibilidade: rodar de novo (num subconjunto, para o teste ser rápido) dá exatamente o mesmo relatório.
 const subset=STRESS_SCENARIOS.filter(s=>['BASELINE','LOSS_LIMIT','DUPLICATE_OUT_OF_ORDER'].includes(s.id));
 assert.equal((await runStressLab(20261006,subset)).reportSha256,(await runStressLab(20261006,subset)).reportSha256);
 // Cada item da lista do documento ATS-MATRIX tem um cenário.
 const covered=new Set(a.scenarios.flatMap(s=>s.covers));
 for(const item of ['abrupt BTC move','volatility spike','spread widening','abnormal slippage','stale/delayed market data','missing candle','market-data provider outage','Binance/Bybit disagreement','repeated stop sequence','maximum-loss boundary','malformed/partial market snapshot','duplicate/out-of-order events'])assert.ok(covered.has(item),item);
});

test('outra semente gera outro mercado e o catálogo continua sobrevivendo',async()=>{
 const r=await runStressLab(7);
 assert.notEqual(r.scenarios[0].metrics.finalEquity,(await runScenario(STRESS_SCENARIOS[0],20261006)).metrics.finalEquity);
 for(const s of r.scenarios)assert.ok(s.survived,s.id+': '+JSON.stringify({violations:s.invariantViolations,failed:s.expectations.filter(x=>!x.passed)}));
});

test('o verificador de invariantes acusa cada violação plantada',()=>{
 const order={symbol:'BTCUSDT',side:'BUY',quantity:1,referencePrice:1,proposalId:'p'};
 const fill=event('PAPER_FILL',{fill:{...order,id:'f'}});
 const clean={events:[event('RISK_APPROVED',{order,decision:{approved:true,reasons:[]}}),fill],openings:[],decisionsByHour:new Map([[0,1]]),restoreOk:true,equity:1000,maxDrawdown:0.01};
 assert.deepEqual(checkInvariants(clean),[]);
 assert.deepEqual(checkInvariants({...clean,events:[fill]}),['INV_FILL_WITHOUT_RISK_APPROVAL']);
 assert.deepEqual(checkInvariants({...clean,openings:[{hour:5,forbidden:true,halted:false}]}),['INV_NEW_EXPOSURE_WHILE_BLOCKED@h5']);
 assert.deepEqual(checkInvariants({...clean,openings:[{hour:6,forbidden:false,halted:true}]}),['INV_NEW_EXPOSURE_WHILE_HALTED@h6']);
 assert.deepEqual(checkInvariants({...clean,decisionsByHour:new Map([[0,2]])}),['INV_DUPLICATE_DECISION@1970-01-01T00:00:00.000Z']);
 assert.deepEqual(checkInvariants({...clean,restoreOk:false}),['INV_STATE_NOT_RESTORABLE']);
 assert.deepEqual(checkInvariants({...clean,equity:Number.NaN}),['INV_NON_FINITE_ACCOUNTING']);
});

test('sabotagem de ponta a ponta: um componente que abre posição com cotação velha é acusado; com kill switch o risco barra',async()=>{
 const W:[number,number]=[100,124],inW=(h:number)=>h>=W[0]&&h<W[1];
 const stale=STRESS_SCENARIOS.find(s=>s.id==='STALE_QUOTE')!;
 // Componente defeituoso: ignora a cotação velha e manda comprar direto no livro, na hora em que a cotação volta a ser boa
 // mas ainda dentro da janela proibida (a cotação da hora anterior continua válida no livro por 15 s).
 const sabotaged:StressScenario={...stale,id:'SABOTAGE_STALE',hooks:{forbidOpen:inW,before:async(h,w)=>{if(inW(h)){const q=w.book.market();if(q)await w.book.propose('evaluation:nova:usdm','BUY',0.0001,w.save);}}}};
 const r=await runScenario(sabotaged,20261006);
 assert.equal(r.survived,false);assert.ok(r.invariantViolations.some(v=>v.startsWith('INV_NEW_EXPOSURE_WHILE_BLOCKED')),JSON.stringify(r.invariantViolations));
 // Com o kill switch ligado, uma ordem direta que AUMENTA a posição é rejeitada pelo risco (KILL_SWITCH) e nenhuma exposição nova acontece.
 const ks=STRESS_SCENARIOS.find(s=>s.id==='KILL_SWITCH')!;
 const pushy:StressScenario={...ks,id:'SABOTAGE_KILL_SWITCH',hooks:{...ks.hooks,before:async(h,w)=>{await ks.hooks!.before!(h,w);if(inW(h)){const q=w.book.list()[0].portfolio.positions[0]?.quantity??0;await w.book.propose('evaluation:nova:usdm',q<0?'SELL':'BUY',0.0001,w.save);}}}};
 const k=await runScenario(pushy,20261006);
 assert.deepEqual(k.invariantViolations,[]);assert.equal(k.metrics.riskRejected.KILL_SWITCH,24);
 assert.equal(STRESS_POLICY.version,'STRESS_LAB_V1');
});
