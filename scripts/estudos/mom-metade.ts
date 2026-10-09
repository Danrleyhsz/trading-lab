// Estudo MOM_METADE_V1 (docs/PROTOCOLO_MOM_METADE.md): momentum de 28 dias com 2,5% por posição em 45 outras moedas (3 grupos de 15).
// Roda fora do servidor, só com dados públicos da Binance USD-M (via curl); não envia ordens e não toca em contas.
// A máquina tem pouca memória: cada grupo roda num processo e o resultado fica em cache até todos estarem prontos.
//   npx tsx scripts/estudos/mom-metade.ts --group=1   (idem 2, 3 e 0 = as 15 moedas originais, referência)
//   npx tsx scripts/estudos/mom-metade.ts             (junta tudo e escreve docs/estudos/mom-metade-2026-10-09.{json,md})
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import type {PerpetualDataset,FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import type {Candle} from '../../src/domain/backtest.js';
import {simulateBlend,momentum,joinBlocks,type Book} from './fatores-lib.js';
import {load as loadOriginal,startOf,metrics,corr,pct,PROTOCOL as FATORES} from './fatores.js';
import {get} from './holdout-2021.js';

const H=3600000,dir='scripts/estudos/out',CACHE=process.env.MOM_METADE_CACHE??join(tmpdir(),'mom-metade-cache');
export const MOM_METADE=Object.freeze({version:'MOM_METADE_V1',declaredAt:'2026-10-09',firstBar:Date.UTC(2021,11,4,0),firstDecisionBar:Date.UTC(2022,0,1,0),
 rule:{...FATORES.rule,legFraction:0.025},gate:{maximumDrawdown:0.15,minimumPositiveYears:3,maximumMarketCorrelation:0.3,maximumFilledShare:0.01,minimumCoins:12,riskEngineDrawdown:0.10,trials:16},split:Date.UTC(2024,6,1)});
const P=MOM_METADE,SQRT_YEAR=Math.sqrt(24*365);
const book=(frac:number):Book[]=>[{signal:momentum(672),legFraction:frac,longCount:5,shortCount:5}];

/** Último fechamento das 15 moedas originais: todos os grupos terminam no mesmo instante. */
export const lastBarOf=()=>JSON.parse(readFileSync(`${dir}/BTCUSDT-1791241200000.json`,'utf8')).trade.at(-1).timestamp as number;
export function downloadRange(symbol:string,lastBar:number){
 const file=`${dir}/outras-${symbol}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const raw:Candle[]=[];let cursor=P.firstBar;
 while(cursor<=lastBar){const page=get('/fapi/v1/klines',{symbol,interval:'1h',startTime:cursor,endTime:lastBar+H-1,limit:1500}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({timestamp:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])});cursor=raw.at(-1)!.timestamp+H;}
 const funding:FundingSettlement[]=[];cursor=P.firstBar;
 while(cursor<=lastBar){const page=get('/fapi/v1/fundingRate',{symbol,startTime:cursor,endTime:lastBar+H-1,limit:1000}) as Record<string,string>[];if(!page.length)break;
  for(const f of page)funding.push({timestamp:Number(f.fundingTime),rate:Number(f.fundingRate),markPrice:Number(f.markPrice)});cursor=funding.at(-1)!.timestamp+1;if(page.length<1000)break;}
 const data={symbol,raw,funding};mkdirSync(dir,{recursive:true});writeFileSync(file,JSON.stringify(data));return data;
}
export function gridRange(raw:Candle[],first:number,last:number){
 const byHour=new Map(raw.map(c=>[c.timestamp,c])),out:Candle[]=[];let filled=0,prev:Candle|undefined;
 for(let t=first;t<=last;t+=H){const c=byHour.get(t);if(c){out.push(c);prev=c;}else{if(!prev)throw Error('sem vela inicial');filled++;out.push({timestamp:t,open:prev.close,high:prev.close,low:prev.close,close:prev.close,volume:0});}}
 return {candles:out,filled};
}
/** Carrega um grupo; moedas com dados ruins saem antes de qualquer retorno ser calculado (regra do protocolo). */
export function loadGroup(symbols:string[],lastBar:number){
 const datasets:Record<string,PerpetualDataset>={},dropped:{symbol:string;reason:string}[]=[],quality:Record<string,{filled:number;share:number;fundingMarkFilled:number}>={};
 for(const s of symbols){
  try{
   const d=downloadRange(s,lastBar),{candles,filled}=gridRange(d.raw,P.firstBar,lastBar),share=filled/candles.length;
   if(share>P.gate.maximumFilledShare){dropped.push({symbol:s,reason:`${(share*100).toFixed(2)}% de horas preenchidas`});continue;}
   let fundingMarkFilled=0;const open=new Map(candles.map(c=>[c.timestamp,c.open]));
   const funding=d.funding.filter((f:FundingSettlement)=>f.timestamp>=P.firstBar&&f.timestamp<lastBar+H).map((f:FundingSettlement)=>{if(f.markPrice>0)return f;fundingMarkFilled++;return {...f,markPrice:open.get(Math.floor(f.timestamp/H)*H)!};});
   datasets[s]=joinBlocks(s,[{trade:candles,funding}]);quality[s]={filled,share,fundingMarkFilled};
  }catch(e){dropped.push({symbol:s,reason:String((e as Error).message)});}
 }
 return {datasets,dropped,quality};
}
const pnlBetween=(eq:{timestamp:number;equity:number}[],from:number,to:number)=>{const before=eq.filter(p=>p.timestamp<from).at(-1)?.equity??P.rule.initialCapital,pts=eq.filter(p=>p.timestamp>=from&&p.timestamp<to);if(pts.length<2)return null;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}return {pnl:pts.at(-1)!.equity-before,returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};};

function evaluate(group:number,datasets:Record<string,PerpetualDataset>,start:number,dropped:{symbol:string;reason:string}[],variance:number){
 const R=P.rule,G=P.gate,symbols=Object.keys(datasets);
 const run=(frac:number,o:Record<string,number>={})=>simulateBlend(datasets,{...R,startBar:start,...o} as any,book(frac));
 const half=run(0.025),doubled=run(0.025,{feeRate:R.feeRate*2,slippageBps:R.slippageBps*2}),full=run(0.05);
 const m=metrics(datasets,half,start),mf=metrics(datasets,full,start);
 const dsr=deflatedSharpe(m.returns,G.trials,variance).deflatedSharpe,positiveYears=Object.values(m.years).filter(y=>!y.partial&&y.returnPct>0).length,end=Date.UTC(2100,0,1);
 const h1=pnlBetween(half.equitySeries,P.firstDecisionBar,P.split),h2=pnlBetween(half.equitySeries,P.split,end);
 const checks:Record<string,boolean>={DATA_QUALITY:symbols.length>=G.minimumCoins,POSITIVE_PNL:m.netPnl>0,BOUNDED_DRAWDOWN:m.maxDrawdown<=G.maximumDrawdown,POSITIVE_YEARS:positiveYears>=G.minimumPositiveYears,
  DOUBLED_COSTS_POSITIVE:doubled.netPnl>0,MARKET_NEUTRAL:Math.abs(m.marketCorrelation)<=G.maximumMarketCorrelation,BOTH_HALVES_POSITIVE:(h1?.pnl??-1)>0&&(h2?.pnl??-1)>0};
 const out={group,coins:symbols,dropped,passes:Object.values(checks).every(Boolean),failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,
  netPnl:m.netPnl,returnPct:m.returnPct,maxDrawdown:m.maxDrawdown,sharpeAnnualized:m.sharpeAnnualized,marketCorrelation:m.marketCorrelation,doubledPnl:doubled.netPnl,years:m.years,positiveYears,
  halves:{first:h1,second:h2},decisions:m.rebalances,closedLegs:m.closedLegs,turnover:m.turnover,feesPaid:m.feesPaid,fundingCashDelta:m.fundingCashDelta,buyHold:m.buyHold,withinRiskEngine:m.maxDrawdown<=G.riskEngineDrawdown,
  fullSize:{returnPct:mf.returnPct,maxDrawdown:mf.maxDrawdown,sharpeAnnualized:mf.sharpeAnnualized,years:mf.years},drawdownRatio:m.maxDrawdown/mf.maxDrawdown,returnRatio:m.returnPct/mf.returnPct,deflatedSharpe:dsr,
  weeklyReturns:m.weeklyReturns,datasetHashes:half.datasetHashes};
 console.log(`grupo ${group}`.padEnd(8),out.passes?'PASSA':'reprova','moedas',symbols.length,'retorno',pct(out.returnPct),'DD',(out.maxDrawdown*100).toFixed(1)+'%','(5%:',(mf.maxDrawdown*100).toFixed(1)+'%, razão',out.drawdownRatio.toFixed(2)+')','anos+',positiveYears,'x2',doubled.netPnl.toFixed(0),'corr',out.marketCorrelation.toFixed(2),'Sharpe',out.sharpeAnnualized.toFixed(2),out.failed.join(','));
 return out;
}
const cached=<T>(key:string,compute:()=>T):T=>{mkdirSync(CACHE,{recursive:true});const f=join(CACHE,key+'.json');if(existsSync(f))return JSON.parse(readFileSync(f,'utf8'));const v=compute();writeFileSync(f,JSON.stringify(v));return v;};

function runGroup(group:number){
 const variance=JSON.parse(readFileSync('docs/estudos/fatores-v1-2026-10-09.json','utf8')).trialSharpeVariance as number;
 return cached('grupo'+group,()=>{
  if(group===0){const {datasets}=loadOriginal();return evaluate(0,datasets,startOf(datasets),[],variance);}
  const u=JSON.parse(readFileSync('docs/estudos/universo-outras-moedas-2026-10-09.json','utf8')).universe as {symbol:string;group:number}[];
  const {datasets,dropped}=loadGroup(u.filter(c=>c.group===group).map(c=>c.symbol),lastBarOf()),start=datasets[Object.keys(datasets)[0]]?.trade.findIndex(c=>c.timestamp===P.firstDecisionBar)??-1;
  if(Object.keys(datasets).length<P.gate.minimumCoins)return {group,coins:Object.keys(datasets),dropped,passes:false,failed:['DATA_QUALITY'],netPnl:NaN,weeklyReturns:[]} as any;
  return evaluate(group,datasets,start,dropped,variance);
 });
}
function assemble(){
 const groups=[1,2,3].map(g=>runGroup(g)),ref=runGroup(0),passing=groups.filter(g=>g.passes).length,third=groups.filter(g=>!g.passes),thirdPositive=third.length===0||third.every(g=>g.netPnl>0);
 const verdict=passing>=2&&(passing===3||thirdPositive)?'VALIDADA_EM_OUTRAS_MOEDAS':'NAO_VALIDADA';
 const wk=(g:any)=>g.weeklyReturns as number[];
 const correlations={g1g2:corr(wk(groups[0]),wk(groups[1])),g1g3:corr(wk(groups[0]),wk(groups[2])),g2g3:corr(wk(groups[1]),wk(groups[2])),g1ref:corr(wk(groups[0]),wk(ref)),g2ref:corr(wk(groups[1]),wk(ref)),g3ref:corr(wk(groups[2]),wk(ref))};
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_MOM_METADE.md'],{encoding:'utf8'}).trim(),strip=({weeklyReturns,...r}:any)=>r;
 const report={protocol:P,protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),verdict,passingGroups:passing,correlations,groups:groups.map(strip),referenceOriginal15:strip(ref)};
 const base='docs/estudos/mom-metade-2026-10-09';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
 console.log('veredito',verdict,'grupos que passam',passing);
}
function markdown(r:any){
 const gs=r.groups as any[],ref=r.referenceOriginal15,all=[...gs,{...ref,group:'15 originais'}],yrs=['2022','2023','2024','2025','2026'],yr=(y:any,k:string)=>y[k]?`${pct(y[k].returnPct)} / ${(y[k].maxDrawdown*100).toFixed(1)}%${y[k].partial?' (parcial)':''}`:'n/d',hv=(h:any)=>h?`${pct(h.returnPct)} / ${(h.maxDrawdown*100).toFixed(1)}%`:'n/d';
 return [`# Resultado ${r.protocol.version}: momentum de 28 dias com metade do tamanho em 45 outras moedas`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_MOM_METADE.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. 2,5% por posição (0,25x de exposição), 5 compradas e 5 vendidas, decisão semanal, de 01/01/2022 ao fim de out/2026 (cerca de 5 de outubro).`,'',
  `## Veredito: **${r.verdict}** (${r.passingGroups} de 3 grupos passam os 7 critérios)`,'',
  '| Grupo | Moedas usadas | Passa? | Reprovou em |','|---|---|---|---|',...gs.map(g=>`| ${g.group} | ${g.coins.length}${g.dropped.length?' (fora: '+g.dropped.map((d:any)=>d.symbol.replace('USDT','')).join(', ')+')':''} | ${g.passes?'**sim**':'não'} | ${g.failed.join(', ')||'-'} |`),'',
  '## Números (2,5% por posição; custos: taxa 0,055% e slippage 2 bps por lado)','','| Grupo | Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Corr. mercado | Anos + (de 4) | 1ª metade | 2ª metade | Comprar e segurar a cesta |','|---|---|---|---|---|---|---|---|---|---|',
  ...all.map(g=>`| ${g.group} | ${pct(g.returnPct)} | ${(g.maxDrawdown*100).toFixed(1)}% | ${g.sharpeAnnualized.toFixed(2)} | ${g.doubledPnl.toFixed(0)} | ${g.marketCorrelation.toFixed(2)} | ${g.positiveYears} | ${hv(g.halves.first)} | ${hv(g.halves.second)} | ${pct(g.buyHold)} |`),'',
  '## Hipótese de tamanho: metade da posição dá metade da queda?','','| Grupo | Queda a 5% | Queda a 2,5% | Razão das quedas | Retorno a 5% | Retorno a 2,5% | Razão dos retornos | Cabe nos 10% do motor de risco? |','|---|---|---|---|---|---|---|---|',
  ...all.map(g=>`| ${g.group} | ${(g.fullSize.maxDrawdown*100).toFixed(1)}% | ${(g.maxDrawdown*100).toFixed(1)}% | ${g.drawdownRatio.toFixed(2)} | ${pct(g.fullSize.returnPct)} | ${pct(g.returnPct)} | ${g.returnRatio.toFixed(2)} | ${g.withinRiskEngine?'sim':'não'} |`),'',
  '## Por ano (retorno / queda máxima no ano)','','| Grupo | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',...all.map(g=>`| ${g.group} | `+yrs.map(y=>yr(g.years,y)).join(' | ')+' |'),'',
  `Correlação semanal entre os grupos: 1 e 2 ${r.correlations.g1g2.toFixed(2)}, 1 e 3 ${r.correlations.g1g3.toFixed(2)}, 2 e 3 ${r.correlations.g2g3.toFixed(2)}; com as 15 originais: ${r.correlations.g1ref.toFixed(2)}, ${r.correlations.g2ref.toFixed(2)}, ${r.correlations.g3ref.toFixed(2)}. Sharpe deflacionado (16 tentativas, fora do veredito): ${all.map(g=>`${g.group}: ${g.deflatedSharpe.toFixed(3)}`).join('; ')}.`,'',
  '## Atividade','','| Grupo | Decisões | Posições encerradas | Giro (x o capital) | Taxas | Funding (caixa) |','|---|---|---|---|---|---|',...all.map(g=>`| ${g.group} | ${g.decisions} | ${g.closedLegs} | ${g.turnover.toFixed(0)} | ${g.feesPaid.toFixed(0)} | ${g.fundingCashDelta.toFixed(0)} |`),'',
  'Moedas por grupo: '+gs.map(g=>`**${g.group}**: ${g.coins.map((s:string)=>s.replace('USDT','')).join(', ')}`).join('; ')+'.','',
  'Hashes dos datasets (SHA-256), grupo 1:','',...Object.entries(gs[0].datasetHashes||{}).map(([s,h])=>`- ${s}: \`${h}\``)].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('mom-metade.ts')){
 const g=process.argv.find(a=>a.startsWith('--group='))?.slice(8);
 if(g!==undefined){
  // Regressão do controle (5% nas 15 originais) antes de qualquer número novo.
  if(g==='0'){const {longOnly}=loadOriginal(),prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8')),reg=simulateBlend(longOnly,{...FATORES.rule,startBar:startOf(longOnly)} as any,book(0.05)),ret=reg.netPnl/FATORES.rule.initialCapital;
   const ok=Math.abs(ret-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005;console.log('regressão do controle',pct(ret),'esperado',pct(prior.returnPct),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',ok?'OK':'FALHOU');if(!ok)throw Error('Teste de regressão do controle falhou: o estudo para e nada é reportado como resultado (protocolo)');}
  runGroup(+g);
 }else assemble();
}
