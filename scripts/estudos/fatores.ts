// Estudo FATORES_V1 (docs/PROTOCOLO_FATORES_V1.md): carry entre moedas, baixa volatilidade e um composto, no molde do momentum.
// Roda fora do servidor, só com dados públicos da Binance USD-M (já baixados em scripts/estudos/out, ou baixados por curl se faltar
// o histórico longo); não envia ordens e não toca em contas. Uso: npx tsx scripts/estudos/fatores.ts
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe,hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';
import type {PerpetualDataset,FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import {download,grid,LONG_PROTOCOL} from './momentum-longo.js';
import {simulateFactor,momentum,lowVolatility,carry,composite,joinBlocks,type Attractiveness} from './fatores-lib.js';

const H=3600000,dir='scripts/estudos/out',SQRT_YEAR=Math.sqrt(24*365);
export const PROTOCOL=Object.freeze({version:'FATORES_V1',declaredAt:'2026-10-09',
 symbols:LONG_PROTOCOL.symbols,firstDecisionBar:Date.UTC(2022,0,1,0),
 rule:{lookbackHours:672,rebalanceHours:168,longCount:5,shortCount:5,legFraction:0.05,feeRate:0.00055,slippageBps:2,initialCapital:10000,maxBars:60000},
 screen:{maximumDrawdown:0.15,minimumPositiveYears:3,minimumDeflatedSharpe:0.9,liveCandidateDeflatedSharpe:0.5,maximumMarketCorrelation:0.3,maximumFilledShare:0.01,trials:8}});
const P=PROTOCOL;
const strategies:{id:string;label:string;trial:boolean;signal:Attractiveness}[]=[
 {id:'XSMOM_L28',label:'Controle: momentum 28 dias',trial:false,signal:momentum(672)},
 {id:'XS_CARRY_V1',label:'C1 · carry entre moedas',trial:true,signal:carry(168)},
 {id:'XS_LOWVOL_V1',label:'C2 · baixa volatilidade',trial:true,signal:lowVolatility(672)},
 {id:'XS_COMPOSITE_V1',label:'C3 · composto',trial:true,signal:composite([momentum(672),lowVolatility(672),carry(168)])}];

function load(){
 const quality:Record<string,{filledLong:number;share:number}>={},datasets:Record<string,PerpetualDataset>={},longOnly:Record<string,PerpetualDataset>={};
 for(const s of P.symbols){
  const d=download(s),{candles,filled}=grid(d.raw),share=filled/candles.length;quality[s]={filledLong:filled,share};
  if(share>P.screen.maximumFilledShare)throw Error('DATA_QUALITY: '+s+' com '+(share*100).toFixed(2)+'% de horas preenchidas; o estudo para sem calcular nada');
  // Mesmo tratamento do estudo longo: funding antigo sem preço de marcação usa a abertura da vela de negócios da hora.
  const open=new Map(candles.map(c=>[c.timestamp,c.open]));
  const funding=d.funding.filter((f:FundingSettlement)=>f.timestamp>=LONG_PROTOCOL.firstBar&&f.timestamp<LONG_PROTOCOL.lastBar+H).map((f:FundingSettlement)=>f.markPrice>0?f:{...f,markPrice:open.get(Math.floor(f.timestamp/H)*H)!});
  const hold=JSON.parse(readFileSync(`${dir}/${s}-holdout-1773241200000.json`,'utf8')),main=JSON.parse(readFileSync(`${dir}/${s}-1791241200000.json`,'utf8'));
  longOnly[s]=joinBlocks(s,[{trade:candles,funding}]);
  datasets[s]=joinBlocks(s,[{trade:candles,funding},{trade:hold.trade,funding:hold.funding},{trade:main.trade,funding:main.funding}]);
 }
 return {datasets,longOnly,quality};
}
const startOf=(d:Record<string,PerpetualDataset>)=>d[P.symbols[0]].trade.findIndex(c=>c.timestamp===P.firstDecisionBar);

function metrics(datasets:Record<string,PerpetualDataset>,r:ReturnType<typeof simulateFactor>,startBar:number){
 const symbols=Object.keys(datasets),trade=datasets[symbols[0]].trade,returns=hourlyReturns(r.equitySeries),m=moments(returns);
 const years:Record<string,{returnPct:number;maxDrawdown:number;partial:boolean}>={};
 for(const y of [2022,2023,2024,2025,2026]){
  const pts=r.equitySeries.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);if(pts.length<2)continue;
  const before=r.equitySeries.filter(p=>p.timestamp<pts[0].timestamp).at(-1)?.equity??P.rule.initialCapital;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}
  years[y]={returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd,partial:y===2026};
 }
 const basket=r.equitySeries.slice(1).map((_,k)=>symbols.reduce((s,sym)=>s+(datasets[sym].trade[startBar+k+1].close/datasets[sym].trade[startBar+k].close-1)/symbols.length,0));
 const mine=returns.slice(0,basket.length),mm=mine.reduce((a,b)=>a+b,0)/mine.length,mb=basket.reduce((a,b)=>a+b,0)/basket.length;let cov=0,va=0,vb=0;
 for(let k=0;k<mine.length;k++){cov+=(mine[k]-mm)*(basket[k]-mb);va+=(mine[k]-mm)**2;vb+=(basket[k]-mb)**2;}
 const weekly=r.equitySeries.filter((_,k)=>k%168===0).map(p=>p.equity),weeklyReturns=weekly.slice(1).map((e,k)=>e/weekly[k]-1);
 return {netPnl:r.netPnl,returnPct:r.netPnl/P.rule.initialCapital,maxDrawdown:r.maxDrawdown,years,sharpeAnnualized:m.sharpe*SQRT_YEAR,hourlySharpe:m.sharpe,returns,
  marketCorrelation:va>0&&vb>0?cov/Math.sqrt(va*vb):NaN,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,turnover:r.tradedNotional/P.rule.initialCapital,rebalances:r.rebalances.length,closedLegs:r.closedLegs,weeklyReturns,
  buyHold:symbols.reduce((s,sym)=>s+(trade.at(-1)!.close/trade[startBar].close-1)/symbols.length,0)};
}
const corr=(a:number[],b:number[])=>{const n=Math.min(a.length,b.length),x=a.slice(0,n),y=b.slice(0,n),mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n;let c=0,vx=0,vy=0;for(let i=0;i<n;i++){c+=(x[i]-mx)*(y[i]-my);vx+=(x[i]-mx)**2;vy+=(y[i]-my)**2;}return c/Math.sqrt(vx*vy);};
const pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(2)+'%';

function main(){
 const {datasets,longOnly,quality}=load(),start=startOf(datasets),startLong=startOf(longOnly);
 // 1) Teste de regressão obrigatório: o controle, só no histórico longo, tem de reproduzir o XSMOM_LONG_HISTORY_V1.
 const prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8'));
 const reg=simulateFactor(longOnly,{...P.rule,startBar:startLong},momentum(672)),regReturn=reg.netPnl/P.rule.initialCapital;
 const regression={returnPct:regReturn,expectedReturnPct:prior.returnPct,maxDrawdown:reg.maxDrawdown,expectedMaxDrawdown:prior.maxDrawdown,
  ok:Math.abs(regReturn-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005};
 console.log('regressão do controle',pct(regReturn),'esperado',pct(prior.returnPct),'DD',(reg.maxDrawdown*100).toFixed(2)+'%','esperado',(prior.maxDrawdown*100).toFixed(2)+'%',regression.ok?'OK':'FALHOU');
 if(!regression.ok)throw Error('Teste de regressão do controle falhou: o estudo para e nada é reportado como resultado (protocolo)');
 // 2) Simulações no período inteiro, com custos normais e dobrados.
 const mem=(t:string)=>console.log('['+t+'] heap '+Math.round(process.memoryUsage().heapUsed/1048576)+' MB, rss '+Math.round(process.memoryUsage().rss/1048576)+' MB');mem('dados carregados');
 const results=strategies.map(s=>{
  mem('antes de '+s.id);const base=simulateFactor(datasets,{...P.rule,startBar:start},s.signal),doubled=simulateFactor(datasets,{...P.rule,feeRate:P.rule.feeRate*2,slippageBps:P.rule.slippageBps*2,startBar:start},s.signal);
  return {...s,run:base,m:metrics(datasets,base,start),doubledPnl:doubled.netPnl};
 });
 // 3) Sharpe deflacionado com 8 tentativas: as 5 de momentum já medidas e as 3 candidatas.
 const old=JSON.parse(readFileSync('docs/estudos/momentum-entre-moedas-2026-10-05.json','utf8'));
 const sharpes=[...Object.values(old.variants).flatMap((v:any)=>Object.values(v.periods).map((p:any)=>p.sharpeAnnualized/SQRT_YEAR)),prior.sharpeAnnualized/SQRT_YEAR,...results.filter(r=>r.trial).map(r=>r.m.hourlySharpe)];
 if(sharpes.length!==P.screen.trials)throw Error('contagem de tentativas inconsistente: '+sharpes.length);
 const mean=sharpes.reduce((a,b)=>a+b,0)/sharpes.length,variance=sharpes.reduce((a,b)=>a+(b-mean)**2,0)/(sharpes.length-1),S=P.screen;
 const control=results[0];
 const judged=results.map(r=>{
  const dsr=deflatedSharpe(r.m.returns,S.trials,variance).deflatedSharpe,yearsFull=Object.entries(r.m.years).filter(([,y])=>!y.partial),positiveYears=yearsFull.filter(([,y])=>y.returnPct>0).length;
  const checks:Record<string,boolean>={DATA_QUALITY:true,POSITIVE_PNL:r.m.netPnl>0,BOUNDED_DRAWDOWN:r.m.maxDrawdown<=S.maximumDrawdown,POSITIVE_YEARS:positiveYears>=S.minimumPositiveYears,
   DOUBLED_COSTS_POSITIVE:r.doubledPnl>0,MARKET_NEUTRAL:Math.abs(r.m.marketCorrelation)<=S.maximumMarketCorrelation,DEFLATED_SHARPE:Number.isFinite(dsr)&&dsr>=S.minimumDeflatedSharpe};
  const firstSix=Object.entries(checks).filter(([k])=>k!=='DEFLATED_SHARPE').every(([,v])=>v);
  const verdict=!r.trial?'CONTROLE (não julgado)':Object.values(checks).every(Boolean)?'APROVADA':firstSix&&Number.isFinite(dsr)&&dsr>=S.liveCandidateDeflatedSharpe?'CANDIDATA_AO_VIVO':'REPROVADA';
  return {id:r.id,label:r.label,trial:r.trial,verdict,failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,deflatedSharpe:dsr,positiveYears,
   netPnl:r.m.netPnl,returnPct:r.m.returnPct,maxDrawdown:r.m.maxDrawdown,years:r.m.years,sharpeAnnualized:r.m.sharpeAnnualized,marketCorrelation:r.m.marketCorrelation,buyHold:r.m.buyHold,
   feesPaid:r.m.feesPaid,fundingCashDelta:r.m.fundingCashDelta,turnover:r.m.turnover,rebalances:r.m.rebalances,closedLegs:r.m.closedLegs,doubledPnl:r.doubledPnl,
   weeklyCorrelationWithControl:r.id===control.id?1:corr(r.m.weeklyReturns,control.m.weeklyReturns)};
 });
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_FATORES_V1.md'],{encoding:'utf8'}).trim();
 const report={protocol:P,protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),symbols:P.symbols,period:{from:new Date(P.firstDecisionBar).toISOString(),to:new Date(datasets[P.symbols[0]].trade.at(-1)!.timestamp).toISOString()},
  quality,regression,trialSharpes:sharpes,trialSharpeVariance:variance,results:judged,datasetHashes:control.run.datasetHashes};
 const base='docs/estudos/fatores-v1-2026-10-09';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
 for(const j of judged)console.log(j.id.padEnd(16),j.verdict.padEnd(24),pct(j.returnPct),'DD',(j.maxDrawdown*100).toFixed(1)+'%','anos+',j.positiveYears,'custos x2',j.doubledPnl.toFixed(0),'corr',j.marketCorrelation.toFixed(2),'DSR',j.deflatedSharpe.toFixed(2),j.failed.join(','));
}
function markdown(r:any){
 const rows=r.results as any[],yrs=['2022','2023','2024','2025','2026'];
 return [`# Resultado ${r.protocol.version}: carry, baixa volatilidade e composto entre moedas`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_FATORES_V1.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Período: ${r.period.from.slice(0,10)} a ${r.period.to.slice(0,10)}. Moedas: ${r.symbols.join(', ')}.`,'',
  `**Teste de regressão do controle:** ${pct(r.regression.returnPct)} contra ${pct(r.regression.expectedReturnPct)} esperado, queda máxima ${(r.regression.maxDrawdown*100).toFixed(2)}% contra ${(r.regression.expectedMaxDrawdown*100).toFixed(2)}%: ${r.regression.ok?'conferiu':'FALHOU'}.`,'',
  '## Veredito','','| Estratégia | Veredito | Reprovou em |','|---|---|---|',...rows.map(x=>`| ${x.label} | **${x.verdict}** | ${x.failed.length?x.failed.join(', '):'nada'} |`),'',
  '## Números','','| Estratégia | Retorno | Queda máx. | Anos + (de 4) | Custos x2 (P&L) | Corr. mercado | Sharpe anual | Sharpe deflac. (8 tent.) | Corr. semanal com o controle |','|---|---|---|---|---|---|---|---|---|',
  ...rows.map(x=>`| ${x.label} | ${pct(x.returnPct)} | ${(x.maxDrawdown*100).toFixed(2)}% | ${x.positiveYears} | ${x.doubledPnl.toFixed(0)} | ${x.marketCorrelation.toFixed(2)} | ${x.sharpeAnnualized.toFixed(2)} | ${x.deflatedSharpe.toFixed(2)} | ${x.weeklyCorrelationWithControl.toFixed(2)} |`),'',
  '## Por ano (retorno / queda máxima no ano)','','| Estratégia | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',
  ...rows.map(x=>`| ${x.label} | `+yrs.map(y=>x.years[y]?`${pct(x.years[y].returnPct)} / ${(x.years[y].maxDrawdown*100).toFixed(1)}%${x.years[y].partial?' (parcial)':''}`:'n/d').join(' | ')+' |'),'',
  '## Custos e giro','','| Estratégia | Taxas | Funding | Giro (x capital) | Rebalanceamentos | Posições encerradas |','|---|---|---|---|---|---|',
  ...rows.map(x=>`| ${x.label} | ${x.feesPaid.toFixed(0)} | ${x.fundingCashDelta.toFixed(0)} | ${x.turnover.toFixed(1)} | ${x.rebalances} | ${x.closedLegs} |`),'',
  `Comprar e segurar a cesta das 15 moedas no mesmo período (referência): ${pct(rows[0].buyHold)}.`,'',
  `Sharpe deflacionado com ${r.protocol.screen.trials} tentativas (5 de momentum já medidas e 3 candidatas); variância dos Sharpe horários entre as tentativas: ${r.trialSharpeVariance.toExponential(3)}.`,'',
  'Qualidade dos dados: horas preenchidas no histórico longo por moeda (paradas da corretora): '+Object.entries(r.quality).map(([s,q]:[string,any])=>`${s} ${q.filledLong}`).join(', ')+'.','',
  'Hashes dos datasets (SHA-256):','',...Object.entries(r.datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``)].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('fatores.ts'))main();
