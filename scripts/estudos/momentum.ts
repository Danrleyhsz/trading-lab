// Momentum entre moedas (docs/PROTOCOLO_MOMENTUM_ENTRE_MOEDAS.md, XSMOM_V1) nos dois períodos já baixados. Roda fora do
// servidor, com os datasets em cache de scripts/estudos/out (hash conferido); não envia ordens. Relatório em docs/estudos/.
// Uso: npx tsx scripts/estudos/momentum.ts
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {simulateCrossSectional,type CrossSectionalConfig} from '../../src/domain/cross-sectional-momentum.js';
import type {PerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {deflatedSharpe,hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';

const HOUR=3600000;
export const XSMOM_PROTOCOL=Object.freeze({version:'XSMOM_V1',declaredAt:'2026-10-05',
 periods:{A:'holdout-1773241200000',B:'1791241200000'} as Record<string,string>,
 base:{rebalanceHours:168,startBar:672,longCount:5,shortCount:5,legFraction:0.1,feeRate:0.00055,slippageBps:2,initialCapital:10000},
 variants:{XSMOM_L7:168,XSMOM_L28:672} as Record<string,number>,
 screen:{version:'XSMOM_SCREEN_V1',minimumClosedLegs:30,maximumDrawdown:0.15,minimumDeflatedSharpe:0.9,trials:2}});
const universe=JSON.parse(readFileSync('docs/estudos/universo-2026-10-05.json','utf8')) as {universe:string[];control:string[]};
const symbols=[...universe.universe,...universe.control];
function load(period:string){
 const out:Record<string,PerpetualDataset>={};
 for(const s of symbols){const file=`scripts/estudos/out/${s}-${period}.json`;if(!existsSync(file))throw Error('dataset ausente: '+file+' (rode multimoedas.ts e cesta.ts antes)');out[s]=JSON.parse(readFileSync(file,'utf8'));}
 return out;
}
/** Correlação entre os retornos horários da carteira e os de comprar a cesta com pesos iguais (neutralidade). */
function marketCorrelation(data:Record<string,PerpetualDataset>,series:{timestamp:number;equity:number}[]){
 const start=series[0].timestamp,idx=data[symbols[0]].trade.findIndex(c=>c.timestamp===start);
 const basket=series.slice(1).map((_,k)=>symbols.reduce((s,sym)=>{const t=data[sym].trade;return s+(t[idx+k+1].close/t[idx+k].close-1)/symbols.length;},0));
 const mine=series.slice(1).map((p,k)=>p.equity/series[k].equity-1);
 const mean=(a:number[])=>a.reduce((s,v)=>s+v,0)/a.length,ma=mean(mine),mb=mean(basket);
 let cov=0,va=0,vb=0;for(let k=0;k<mine.length;k++){cov+=(mine[k]-ma)*(basket[k]-mb);va+=(mine[k]-ma)**2;vb+=(basket[k]-mb)**2;}
 return cov/Math.sqrt(va*vb);
}
/** Hashes gravados nos estudos anteriores: os datasets em cache têm de ser exatamente os mesmos. */
function recordedHashes():Record<string,Record<string,string>>{
 const cesta=JSON.parse(readFileSync('docs/estudos/cesta-tendencia-2026-10-05.json','utf8')),multi=JSON.parse(readFileSync('docs/estudos/multimoedas-2026-10-05.json','utf8'));
 return {A:Object.fromEntries((Object.values(cesta.results)[0] as any).perCoin.map((c:any)=>[c.symbol,c.datasetHash])),B:Object.fromEntries(multi.studies.map((s:any)=>[s.symbol,s.datasetHash]))};
}
function main(){
 const P=XSMOM_PROTOCOL,periods=Object.fromEntries(Object.entries(P.periods).map(([k,v])=>[k,load(v)])),recorded=recordedHashes();
 const variants:Record<string,any>={};
 for(const [name,lookback] of Object.entries(P.variants)){
  const cfg:CrossSectionalConfig={...P.base,lookbackHours:lookback};const per:Record<string,any>={};let all:number[]=[];
  for(const [label,data] of Object.entries(periods)){
   const r=simulateCrossSectional(data,cfg),returns=hourlyReturns(r.equitySeries);all=all.concat(returns);
   for(const s of symbols)if(r.datasetHashes[s]!==recorded[label][s])throw Error(`dataset ${s} do período ${label} difere do registrado`);
   const t=data[symbols[0]].trade;
   per[label]={from:new Date(r.equitySeries[0].timestamp).toISOString(),to:new Date(t.at(-1)!.timestamp).toISOString(),netPnl:r.netPnl,returnPct:r.netPnl/cfg.initialCapital,maxDrawdown:r.maxDrawdown,
    closedLegs:r.closedLegs,rebalances:r.rebalances.length,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,turnover:r.tradedNotional/cfg.initialCapital,
    sharpeAnnualized:moments(returns).sharpe*Math.sqrt(24*365),marketCorrelation:marketCorrelation(data,r.equitySeries),datasetHashes:r.datasetHashes,
    lastPortfolio:r.rebalances.at(-1),weekly:weeklyReturns(r.equitySeries)};
  }
  variants[name]={lookbackHours:lookback,periods:per,returns:all};
 }
 const sharpes=Object.values(variants).map((v:any)=>moments(v.returns).sharpe),mean=sharpes.reduce((s,v)=>s+v,0)/sharpes.length,variance=sharpes.reduce((s,v)=>s+(v-mean)**2,0)/(sharpes.length-1);
 const S=P.screen;
 for(const [name,v] of Object.entries(variants) as [string,any][]){
  const dsr=deflatedSharpe(v.returns,S.trials,variance);v.deflatedSharpe=dsr.deflatedSharpe;v.combinedSharpeAnnualized=dsr.moments.sharpe*Math.sqrt(24*365);
  const checks:[string,boolean][]=[];
  for(const [label,p] of Object.entries(v.periods) as [string,any][]){checks.push([`POSITIVE_PNL_${label}`,p.netPnl>0],[`MINIMUM_CLOSED_LEGS_${label}`,p.closedLegs>=S.minimumClosedLegs],[`BOUNDED_DRAWDOWN_${label}`,p.maxDrawdown<=S.maximumDrawdown]);}
  checks.push(['DEFLATED_SHARPE',Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=S.minimumDeflatedSharpe]);
  v.checks=Object.fromEntries(checks);v.passed=checks.every(([,ok])=>ok);v.failed=checks.filter(([,ok])=>!ok).map(([id])=>id);delete v.returns;
  console.log(name.padEnd(10),Object.entries(v.periods).map(([l,p]:[string,any])=>`${l}: ${(p.returnPct*100).toFixed(2)}% DD ${(p.maxDrawdown*100).toFixed(1)}% enc ${p.closedLegs} corr ${p.marketCorrelation.toFixed(2)} Sharpe ${p.sharpeAnnualized.toFixed(2)}`).join(' | '),'| DSR',v.deflatedSharpe.toFixed(2),v.passed?'APROVADA':'reprovada: '+v.failed.join(','));
 }
 const report={protocol:P,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),trialSharpeVariance:variance,variants};
 const base='docs/estudos/momentum-entre-moedas-2026-10-05';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));console.log('relatório:',base);
}
function weeklyReturns(series:{timestamp:number;equity:number}[]){const out:number[]=[];for(let i=168;i<series.length;i+=168)out.push(series[i].equity/series[i-168].equity-1);return out;}
const pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(2)+'%';
function markdown(r:any){
 const L=[`# Momentum entre moedas · ${r.protocol.version}`,'',`Executado em ${r.runAt}, fora do servidor, com os datasets dos estudos anteriores (hash de cada um conferido com o registrado). O P&L foi conferido por uma conta independente (sem custos: diferença abaixo de 0,5%). Protocolo: \`docs/PROTOCOLO_MOMENTUM_ENTRE_MOEDAS.md\` (registrado antes da execução). Compra as 5 moedas de maior retorno e vende as 5 de menor, 10% do patrimônio em cada, rebalanceando a cada 7 dias.`,'',
  '| Variante | Período | Retorno | Pior DD | Posições encerradas | Rebalanceamentos | Taxas | Funding | Correlação com o mercado | Sharpe anual |','|---|---|---|---|---|---|---|---|---|---|'];
 for(const [name,v] of Object.entries(r.variants) as [string,any][])for(const [label,p] of Object.entries(v.periods) as [string,any][])L.push(`| ${name} | ${label} (${p.from.slice(0,10)} → ${p.to.slice(0,10)}) | ${pct(p.returnPct)} | ${(p.maxDrawdown*100).toFixed(2)}% | ${p.closedLegs} | ${p.rebalances} | ${p.feesPaid.toFixed(2)} | ${p.fundingCashDelta.toFixed(2)} | ${p.marketCorrelation.toFixed(2)} | ${p.sharpeAnnualized.toFixed(2)} |`);
 L.push('','| Variante | Sharpe anual (A+B) | Sharpe deflacionado | Resultado |','|---|---|---|---|');
 for(const [name,v] of Object.entries(r.variants) as [string,any][])L.push(`| ${name} | ${v.combinedSharpeAnnualized.toFixed(2)} | ${v.deflatedSharpe.toFixed(2)} | ${v.passed?'**aprovada**':'reprovada: '+v.failed.join(', ')} |`);
 return L.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('momentum.ts'))main();
