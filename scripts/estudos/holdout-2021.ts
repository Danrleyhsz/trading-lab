// Estudo HOLDOUT_2021_V1 (docs/PROTOCOLO_HOLDOUT_2021.md): as três finalistas em dados de 12/2020 a 12/2021, que nenhum estudo viu.
// Roda fora do servidor, só com dados públicos da Binance USD-M (via curl); não envia ordens e não toca em contas.
// Uso: npx tsx scripts/estudos/holdout-2021.ts
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import type {PerpetualDataset,FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import type {Candle} from '../../src/domain/backtest.js';
import {simulateBlend,momentum,carry,joinBlocks,type Book} from './fatores-lib.js';
import {metrics,corr,pct,PROTOCOL as FATORES} from './fatores.js';

const H=3600000,dir='scripts/estudos/out';
export const HOLDOUT=Object.freeze({version:'HOLDOUT_2021_V1',declaredAt:'2026-10-09',symbols:FATORES.symbols,
 firstBar:Date.UTC(2020,10,3,0),lastBar:Date.UTC(2021,11,31,23),firstDecisionBar:Date.UTC(2020,11,1,0),
 rule:{...FATORES.rule},gate:{maximumDrawdown:0.15,maximumMarketCorrelation:0.3,maximumFilledShare:0.01},
 measured:{feeRate:0.0005,slippageBps:1},bootstrap:{draws:10000,blockWeeks:4,seed:20201201}});
const P=HOLDOUT;
const sleep=(ms:number)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
function get(path:string,params:Record<string,string|number>){
 const url='https://fapi.binance.com'+path+'?'+new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
 for(let attempt=0;attempt<4;attempt++){
  const out=execFileSync('curl',['-sS','-m','30','-w','\n%{http_code}',url],{encoding:'utf8',maxBuffer:64*1024*1024}),i=out.lastIndexOf('\n'),status=Number(out.slice(i+1));
  if(status===200){sleep(600);return JSON.parse(out.slice(0,i));}
  if(status===418||status===429)throw Error('Binance HTTP '+status+': pausa necessária');
  sleep(3000);
 }
 throw Error('Binance indisponível para '+path);
}
export function download(symbol:string){
 const file=`${dir}/holdout21-${symbol}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const raw:Candle[]=[];let cursor=P.firstBar;
 while(cursor<=P.lastBar){const page=get('/fapi/v1/klines',{symbol,interval:'1h',startTime:cursor,endTime:P.lastBar+H-1,limit:1500}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({timestamp:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])});cursor=raw.at(-1)!.timestamp+H;}
 const funding:FundingSettlement[]=[];cursor=P.firstBar;
 while(cursor<=P.lastBar){const page=get('/fapi/v1/fundingRate',{symbol,startTime:cursor,endTime:P.lastBar+H-1,limit:1000}) as Record<string,string>[];if(!page.length)break;
  for(const f of page)funding.push({timestamp:Number(f.fundingTime),rate:Number(f.fundingRate),markPrice:Number(f.markPrice)});cursor=funding.at(-1)!.timestamp+1;if(page.length<1000)break;}
 const data={symbol,raw,funding};mkdirSync(dir,{recursive:true});writeFileSync(file,JSON.stringify(data));return data;
}
/** Grade horária completa: horas faltando viram vela parada no último fechamento, com volume zero (contadas). */
export function grid(raw:Candle[]){
 const byHour=new Map(raw.map(c=>[c.timestamp,c])),out:Candle[]=[];let filled=0,last:Candle|undefined;
 for(let t=P.firstBar;t<=P.lastBar;t+=H){const c=byHour.get(t);if(c){out.push(c);last=c;}else{if(!last)throw Error('sem vela inicial');filled++;out.push({timestamp:t,open:last.close,high:last.close,low:last.close,close:last.close,volume:0});}}
 return {candles:out,filled};
}
export function load(){
 const datasets:Record<string,PerpetualDataset>={},quality:Record<string,{filled:number;share:number;fundingMarkFilled:number}>={};
 for(const s of P.symbols){
  const d=download(s),{candles,filled}=grid(d.raw),share=filled/candles.length;let fundingMarkFilled=0;
  quality[s]={filled,share,fundingMarkFilled:0};
  if(share>P.gate.maximumFilledShare)throw Error('DATA_QUALITY: '+s+' com '+(share*100).toFixed(2)+'% de horas preenchidas; o estudo para sem calcular nada (protocolo)');
  const open=new Map(candles.map(c=>[c.timestamp,c.open]));
  const funding=d.funding.filter((f:FundingSettlement)=>f.timestamp>=P.firstBar&&f.timestamp<P.lastBar+H).map((f:FundingSettlement)=>{if(f.markPrice>0)return f;fundingMarkFilled++;return {...f,markPrice:open.get(Math.floor(f.timestamp/H)*H)!};});
  quality[s].fundingMarkFilled=fundingMarkFilled;
  datasets[s]=joinBlocks(s,[{trade:candles,funding}]);
 }
 return {datasets,quality};
}
const M5:Book={signal:momentum(672),legFraction:0.05,longCount:5,shortCount:5},C5:Book={signal:carry(168),legFraction:0.05,longCount:5,shortCount:5};
const M25:Book={...M5,legFraction:0.025},C25:Book={...C5,legFraction:0.025};
const finalists:{id:string;label:string;books:Book[];priorFile:string;priorPick:(j:any)=>any}[]=[
 {id:'XSMOM_L28',label:'Momentum 28 dias',books:[M5],priorFile:'docs/estudos/fatores-v1-2026-10-09.json',priorPick:j=>j.results.find((r:any)=>r.id==='XSMOM_L28')},
 {id:'XS_CARRY_V1',label:'Carry entre moedas',books:[C5],priorFile:'docs/estudos/fatores-v1-2026-10-09.json',priorPick:j=>j.results.find((r:any)=>r.id==='XS_CARRY_V1')},
 {id:'COMBO_CARRY_MOM_V1',label:'Carry + momentum',books:[M25,C25],priorFile:'docs/estudos/combo-carry-mom-replay-2026-10-09.json',priorPick:j=>j.blend}];

function prng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/** Reamostragem circular de blocos de semanas; devolve o intervalo de 90% do retorno total composto e a fração negativa. */
export function bootstrap(weekly:number[],draws:number,block:number,seed:number){
 const rnd=prng(seed),n=weekly.length,totals:number[]=[];
 for(let d=0;d<draws;d++){let eq=1,count=0;while(count<n){const s=Math.floor(rnd()*n);for(let k=0;k<block&&count<n;k++,count++)eq*=1+weekly[(s+k)%n];}totals.push(eq-1);}
 totals.sort((a,b)=>a-b);return {p05:totals[Math.floor(0.05*draws)],median:totals[Math.floor(0.5*draws)],p95:totals[Math.floor(0.95*draws)],negativeShare:totals.filter(v=>v<0).length/draws};
}
const pnlBetween=(eq:{timestamp:number;equity:number}[],from:number,to:number)=>{const before=eq.filter(p=>p.timestamp<from).at(-1)?.equity??P.rule.initialCapital,pts=eq.filter(p=>p.timestamp>=from&&p.timestamp<to);if(pts.length<2)return null;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}return {returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};};

function main(){
 const {datasets,quality}=load(),start=datasets[P.symbols[0]].trade.findIndex(c=>c.timestamp===P.firstDecisionBar);if(start<672)throw Error('janela sem histórico suficiente');
 const R=P.rule,cfg=(o:Record<string,number>)=>({...R,startBar:start,...o} as any),periods:[string,number,number][]=[['2020-12',Date.UTC(2020,11,1),Date.UTC(2021,0,1)],['2021-T1',Date.UTC(2021,0,1),Date.UTC(2021,3,1)],['2021-T2',Date.UTC(2021,3,1),Date.UTC(2021,6,1)],['2021-T3',Date.UTC(2021,6,1),Date.UTC(2021,9,1)],['2021-T4',Date.UTC(2021,9,1),Date.UTC(2022,0,1)]];
 const results=finalists.map(f=>{
  const run=(o:Record<string,number>)=>simulateBlend(datasets,cfg(o),f.books),base=run({}),doubled=run({feeRate:R.feeRate*2,slippageBps:R.slippageBps*2}),meas=run({feeRate:P.measured.feeRate,slippageBps:P.measured.slippageBps}),measX2=run({feeRate:P.measured.feeRate*2,slippageBps:P.measured.slippageBps*2});
  const m=metrics(datasets,base,start),prior=f.priorPick(JSON.parse(readFileSync(f.priorFile,'utf8')));
  const checks:Record<string,boolean>={DATA_QUALITY:true,POSITIVE_PNL:m.netPnl>0,BOUNDED_DRAWDOWN:m.maxDrawdown<=P.gate.maximumDrawdown,DOUBLED_COSTS_POSITIVE:doubled.netPnl>0,MARKET_NEUTRAL:Math.abs(m.marketCorrelation)<=P.gate.maximumMarketCorrelation};
  const half=Date.UTC(2021,6,1),halves={first:pnlBetween(base.equitySeries,P.firstDecisionBar,half),second:pnlBetween(base.equitySeries,half,Date.UTC(2022,0,1))};
  const out={id:f.id,label:f.label,verdict:Object.values(checks).every(Boolean)?'CONFIRMADA_NO_PASSADO':'NAO_CONFIRMADA',failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,
   netPnl:m.netPnl,returnPct:m.returnPct,maxDrawdown:m.maxDrawdown,sharpeAnnualized:m.sharpeAnnualized,marketCorrelation:m.marketCorrelation,doubledPnl:doubled.netPnl,measuredPnl:meas.netPnl,measuredDoubledPnl:measX2.netPnl,
   feesPaid:m.feesPaid,fundingCashDelta:m.fundingCashDelta,turnover:m.turnover,decisions:m.rebalances,closedLegs:m.closedLegs,buyHold:m.buyHold,halves,periods:Object.fromEntries(periods.map(([k,a,b])=>[k,pnlBetween(base.equitySeries,a,b)])),
   bootstrap:bootstrap(m.weeklyReturns,P.bootstrap.draws,P.bootstrap.blockWeeks,P.bootstrap.seed),weeklyReturns:m.weeklyReturns,
   inSample:{returnPct:prior.returnPct,maxDrawdown:prior.maxDrawdown,sharpeAnnualized:prior.sharpeAnnualized},datasetHashes:base.datasetHashes};
  console.log(f.id.padEnd(20),out.verdict.padEnd(22),pct(out.returnPct),'DD',(out.maxDrawdown*100).toFixed(1)+'%','x2',out.doubledPnl.toFixed(0),'corr',out.marketCorrelation.toFixed(2),'medido',meas.netPnl.toFixed(0),'Sharpe',out.sharpeAnnualized.toFixed(2),'IC90',pct(out.bootstrap.p05),pct(out.bootstrap.p95),'neg',(out.bootstrap.negativeShare*100).toFixed(0)+'%',out.failed.join(','));
  return out;
 });
 const weeklyCorrelation={momentumVsCarry:corr(results[0].weeklyReturns,results[1].weeklyReturns),comboVsMomentum:corr(results[2].weeklyReturns,results[0].weeklyReturns),comboVsCarry:corr(results[2].weeklyReturns,results[1].weeklyReturns)};
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_HOLDOUT_2021.md'],{encoding:'utf8'}).trim();
 const report={protocol:P,protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),symbols:P.symbols,
  period:{from:new Date(P.firstDecisionBar).toISOString(),to:new Date(datasets[P.symbols[0]].trade.at(-1)!.timestamp).toISOString()},quality,weeklyCorrelation,results:results.map(({weeklyReturns,...r})=>r)};
 const base='docs/estudos/holdout-2021-2026-10-09';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
}
function markdown(r:any){
 const res=r.results as any[],per=(x:any,k:string)=>x.periods[k]?`${pct(x.periods[k].returnPct)} / ${(x.periods[k].maxDrawdown*100).toFixed(1)}%`:'n/d',h=(x:any)=>x?`${pct(x.returnPct)} / ${(x.maxDrawdown*100).toFixed(1)}%`:'n/d';
 return [`# Resultado ${r.protocol.version}: as três finalistas em dados não vistos (12/2020 a 12/2021)`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_HOLDOUT_2021.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Janela: ${r.period.from.slice(0,10)} a ${r.period.to.slice(0,10)}, 15 moedas, decisão semanal, ${res[0].decisions} decisões.`,'',
  '## Veredito','','| Finalista | Veredito | Reprovou em |','|---|---|---|',...res.map(x=>`| ${x.id} · ${x.label} | **${x.verdict}** | ${x.failed.join(', ')||'-'} |`),'',
  '## Números na janela (custos do veredito: taxa 0,055% e slippage 2 bps)','','| | Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Custo medido (USDT) | Custo medido x2 (USDT) | Corr. mercado | Comprar e segurar a cesta |','|---|---|---|---|---|---|---|---|---|',
  ...res.map(x=>`| ${x.id} | ${pct(x.returnPct)} | ${(x.maxDrawdown*100).toFixed(1)}% | ${x.sharpeAnnualized.toFixed(2)} | ${x.doubledPnl.toFixed(0)} | ${x.measuredPnl.toFixed(0)} | ${x.measuredDoubledPnl.toFixed(0)} | ${x.marketCorrelation.toFixed(2)} | ${pct(x.buyHold)} |`),'',
  'Capital de 10 000. "Custo medido" é taxa de 0,05% e slippage de 1 bp (`docs/MEDICAO_CUSTO_EXECUCAO.md`).','',
  '## Por período (retorno / queda máxima)','','| | 2020-12 | 2021-T1 | 2021-T2 | 2021-T3 | 2021-T4 | 1ª metade (12/2020 a 06/2021) | 2ª metade (07 a 12/2021) |','|---|---|---|---|---|---|---|---|',
  ...res.map(x=>`| ${x.id} | ${['2020-12','2021-T1','2021-T2','2021-T3','2021-T4'].map(k=>per(x,k)).join(' | ')} | ${h(x.halves.first)} | ${h(x.halves.second)} |`),'',
  '## Comparação com 2022 a out/2026 (a mesma regra)','','| | Retorno no período antigo | Queda máx. | Sharpe anual | Retorno na janela 2021 | Queda máx. | Sharpe anual |','|---|---|---|---|---|---|---|',
  ...res.map(x=>`| ${x.id} | ${pct(x.inSample.returnPct)} | ${(x.inSample.maxDrawdown*100).toFixed(1)}% | ${x.inSample.sharpeAnnualized.toFixed(2)} | ${pct(x.returnPct)} | ${(x.maxDrawdown*100).toFixed(1)}% | ${x.sharpeAnnualized.toFixed(2)} |`),'',
  '(Os períodos têm durações diferentes: 4,8 anos contra 13 meses; compare o formato, não o total.)','',
  '## Poder do teste (reamostragem de blocos de 4 semanas, 10 000 sorteios)','','| | Retorno total: percentil 5 | mediana | percentil 95 | Fração de sorteios com retorno negativo |','|---|---|---|---|---|',
  ...res.map(x=>`| ${x.id} | ${pct(x.bootstrap.p05)} | ${pct(x.bootstrap.median)} | ${pct(x.bootstrap.p95)} | ${(x.bootstrap.negativeShare*100).toFixed(1)}% |`),'',
  `Correlação semanal na janela: momentum com carry ${r.weeklyCorrelation.momentumVsCarry.toFixed(2)}, combinação com momentum ${r.weeklyCorrelation.comboVsMomentum.toFixed(2)}, combinação com carry ${r.weeklyCorrelation.comboVsCarry.toFixed(2)}.`,'',
  '## Atividade','','| | Taxas pagas | Funding (caixa) | Giro (x o capital) | Posições encerradas |','|---|---|---|---|---|',...res.map(x=>`| ${x.id} | ${x.feesPaid.toFixed(0)} | ${x.fundingCashDelta.toFixed(0)} | ${x.turnover.toFixed(1)} | ${x.closedLegs} |`),'',
  'Qualidade dos dados (horas preenchidas por moeda): '+Object.entries(r.quality).map(([s,q]:[string,any])=>`${s} ${q.filled}`).join(', ')+'.','',
  'Hashes dos datasets (SHA-256):','',...Object.entries(res[0].datasetHashes).map(([s,hh])=>`- ${s}: \`${hh}\``)].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('holdout-2021.ts'))main();
