import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {backtestPerpetual,type PerpetualConfig,type PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {HOUR,FOUR,aggregateFourHour,breakoutEntryBars,dailyGridOrigins,entryFilter,forecastQuality,originFor,type ForecastRecord} from '../experiments/kronos/lib.js';

const T0=Date.UTC(2026,0,1);
const cfg:PerpetualConfig={strategy:'BREAKOUT',fastPeriod:10,slowPeriod:48,feeRate:0.00055,slippageBps:1,initialCapital:10000,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1};
/** Série com subida, queda e nova subida, para gerar rompimentos nos dois sentidos. */
function dataset(n=400):PerpetualDataset{
 const closes=Array.from({length:n},(_,i)=>100*(1+0.08*Math.sin(i/40))*(1+i*0.0002));
 const trade=closes.map((c,i)=>{const o=i?closes[i-1]:c;return {timestamp:T0+i*HOUR,open:o,high:Math.max(o,c)*1.001,low:Math.min(o,c)*0.999,close:c,volume:5};});
 return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]};
}
const record=(origin:number,predictedReturn:number,timeframe:'1h'|'4h'='1h'):ForecastRecord=>({timeframe,origin,contextStart:origin-100*HOUR,contextEnd:origin,inputSha256:'x',lastClose:1,predictedClose:[1+predictedReturn],predictedReturn,seconds:1});

test('Kronos desligado: o filtro que sempre permite reproduz a base de forma idêntica',()=>{
 const d=dataset(),base=backtestPerpetual(d,cfg),control=backtestPerpetual(d,cfg,{entryAdvisory:()=>true});
 assert.ok(base.trades>=2,'a série gera operações');assert.deepEqual(control.audit,base.audit);assert.equal(control.netPnl,base.netPnl);
});

test('o filtro só veta abrir: com veto total não abre nada; posição aberta continua podendo fechar',()=>{
 const d=dataset(),none=backtestPerpetual(d,cfg,{entryAdvisory:()=>false});
 assert.equal(none.audit.filter(a=>a.kind==='FILL').length,0);assert.equal(none.netPnl,0);
 // Permite só a primeira entrada: ela tem de ser fechada pela própria estratégia (o filtro não segura posição).
 let first=true;const one=backtestPerpetual(d,cfg,{entryAdvisory:()=>{const ok=first;first=false;return ok;}});
 const fills=one.audit.filter(a=>a.kind==='FILL');assert.ok(fills.length>=2&&Math.abs(fills[0].quantity+fills[1].quantity)<1e-9,'a entrada permitida foi encerrada');
});

test('as velas candidatas espelham exatamente as decisões de entrada do simulador',()=>{
 const d=dataset(),from=d.trade[cfg.slowPeriod].timestamp,asked:number[]=[];
 backtestPerpetual(d,cfg,{entryAdvisory:(t)=>{asked.push(t);return false;}});
 const candidates=new Set(breakoutEntryBars(d.trade,cfg.slowPeriod,from,d.trade.at(-1)!.timestamp).map(b=>b.timestamp));
 assert.ok(asked.length>0);for(const t of asked)assert.ok(candidates.has(t),'o simulador só consulta velas candidatas');
});

test('origem e vazamento: a previsão consultada termina antes da execução; contexto depois dela é recusado',()=>{
 const entry=Date.UTC(2026,0,10,13);
 assert.equal(originFor('1h',entry),entry-HOUR);assert.equal(originFor('4h',entry),Date.UTC(2026,0,10,8),'o bloco 12:00–16:00 ainda não fechou às 13:00');
 assert.equal(originFor('4h',Date.UTC(2026,0,10,12)),Date.UTC(2026,0,10,8),'bloco que fecha exatamente na execução pode ser usado');
 const log:Parameters<typeof entryFilter>[2]=[];
 assert.equal(entryFilter('1h',new Map([[entry-HOUR,record(entry-HOUR,0.01)]]),log)(entry,1),true);
 assert.equal(entryFilter('1h',new Map([[entry-HOUR,record(entry-HOUR,0.01)]]),log)(entry,-1),false,'previsão contra a direção veta');
 assert.equal(entryFilter('1h',new Map(),log)(entry,1),false,'sem previsão: falha fechada');
 assert.equal(entryFilter('1h',new Map([[entry-HOUR,{...record(entry-HOUR,0.01),error:'x'}]]),log)(entry,1),false,'previsão rejeitada não libera entrada');
 const leaky={...record(entry-HOUR,0.01),contextEnd:entry};
 assert.throws(()=>entryFilter('1h',new Map([[entry-HOUR,leaky]]),log)(entry,1),/after the decision/);
});

test('4h só com blocos completos e grade diária com o mesmo alvo nos dois tempos',()=>{
 const hours=Array.from({length:30},(_,i)=>({timestamp:T0+i*HOUR,open:1,high:2,low:0.5,close:1+i,volume:1}));
 const four=aggregateFourHour(hours);assert.equal(four.length,7,'28 horas completas viram 7 blocos; as 2 restantes não');
 assert.deepEqual(four[0],{timestamp:T0,open:1,high:2,low:0.5,close:4,volume:4});
 assert.ok(aggregateFourHour(hours.slice(1)).every(c=>c.timestamp%FOUR===0),'nunca bloco desalinhado');
 const g1=dailyGridOrigins('1h',Date.UTC(2026,0,2),Date.UTC(2026,0,5,23)),g4=dailyGridOrigins('4h',Date.UTC(2026,0,2),Date.UTC(2026,0,5,23));
 assert.deepEqual(g1.map(o=>o+HOUR),g4.map(o=>o+FOUR),'as duas origens fecham no mesmo instante (00:00 UTC)');
});

test('qualidade da previsão: acerto, p-valor binomial e referências',()=>{
 const rows=Array.from({length:20},(_,i)=>({predicted:i<15?0.01:-0.01,realized:0.02,persistence:-0.01}));
 const q=forecastQuality(rows);assert.equal(q.directionalAccuracy,0.75);assert.ok(Math.abs(q.binomialPValue-0.0207)<0.001);assert.equal(q.persistenceAccuracy,0);assert.equal(q.alwaysUpAccuracy,1);
});

test('isolamento: o código do experimento não importa corretora, contas, ordens nem credenciais',()=>{
 const files=['experiments/kronos/lib.js',...readdirSync('experiments/kronos/scripts').map(f=>'experiments/kronos/scripts/'+f)];
 for(const f of files){const s=readFileSync(f,'utf8');
  assert.doesNotMatch(s,/paper-broker|perpetual-paper-book|paper-accounts|binance-futures-demo|trading-service|BINANCE_DEMO_API|apiKey|fapi\/v1\/order|signature=/i,f);}
});
