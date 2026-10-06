// Estudo histórico multimoedas (docs/PROTOCOLO_MULTIMOEDAS.md, MULTI_ASSET_STUDY_V1). Roda fora do servidor, só com
// dados públicos da Binance USD-M; não envia ordens e não grava nada no estado do servidor. Gera o relatório em
// docs/estudos/ com o hash de cada dataset, para qualquer pessoa reproduzir o resultado.
// Uso: npx tsx scripts/estudos/multimoedas.ts            (CURL=1 usa curl no lugar do fetch do Node)
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {BinancePerpetualHistory} from '../../src/infrastructure/binance-perpetual-history.js';
import {walkForwardPerpetual} from '../../src/domain/perpetual-walk-forward.js';
import {backtestPerpetual,validatePerpetualDataset,type PerpetualConfig,type PerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {studyCandidates,type StudyCandidateSet} from '../../src/application/perpetual-studies.js';
import {computeStudyRobustness} from '../../src/application/study-robustness.js';
import {deflatedSharpe,hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';

export const PROTOCOL=Object.freeze({version:'MULTI_ASSET_STUDY_V1',declaredAt:'2026-10-05',bars:5000,trainBars:1500,testBars:500,
 sets:['SHORT_HORIZON_V1','MULTI_DAY_TREND_V1','BREAKOUT_480_PROTECTED_V1'] as StudyCandidateSet[],feeRate:0.00055,slippageBps:2,
 screen:{version:'MULTI_ASSET_SCREEN_V1',minimumFolds:3,minimumTrades:10,maximumDrawdown:0.15,minimumDeflatedSharpe:0.9,minimumCpcvPositivePathShare:0.6,maximumPbo:0.5}});
const HOUR=3600000;
const universe=JSON.parse(readFileSync('docs/estudos/universo-2026-10-05.json','utf8')) as {universe:string[];control:string[]};
const symbols=[...universe.universe,...universe.control];
/** Custos do protocolo: os candidatos já declarados, só com o slippage de 2 bps. */
export const candidatesOf=(set:StudyCandidateSet):PerpetualConfig[]=>studyCandidates(set).map(c=>({...c,feeRate:PROTOCOL.feeRate,slippageBps:PROTOCOL.slippageBps}));

const curlFetch=((url:string)=>new Promise<Response>((resolve,reject)=>execFile('curl',['-sS','-m','30','-w','\n%{http_code}',String(url)],{encoding:'utf8',maxBuffer:64*1024*1024},(error,out)=>{if(error)return reject(error);const i=out.lastIndexOf('\n');resolve(new Response(out.slice(0,i),{status:Number(out.slice(i+1))}));}))) as unknown as typeof fetch;
const history=new BinancePerpetualHistory(process.env.CURL==='1'?curlFetch:fetch);
const cacheDir='scripts/estudos/out';mkdirSync(cacheDir,{recursive:true});
async function dataset(symbol:string,runAt:number):Promise<PerpetualDataset>{
 // Cache local (fora do git) para refazer o relatório sem baixar de novo; o hash confere que é o mesmo dado.
 const file=`${cacheDir}/${symbol}-${runAt}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const data=await history.load(PROTOCOL.bars,symbol);writeFileSync(file,JSON.stringify(data));return data;
}

async function main(){
 const runAt=Number(process.env.RUN_AT)||Math.floor(Date.now()/HOUR)*HOUR;
 const studies:any[]=[],failures:{symbol:string;error:string}[]=[];
 for(const symbol of symbols){
  let data:PerpetualDataset;
  try{data=await dataset(symbol,runAt);}catch(error){failures.push({symbol,error:String((error as Error).message||error)});console.log('falha de dados',symbol,failures.at(-1)!.error);continue;}
  const hash=validatePerpetualDataset(data);
  for(const set of PROTOCOL.sets){
   const candidates=candidatesOf(set),t0=Date.now();
   const wf=walkForwardPerpetual(data,candidates,PROTOCOL.trainBars,PROTOCOL.testBars);
   const robust=computeStudyRobustness({dataset:data,candidates,folds:wf.folds,trials:candidates});
   const oos=wf.folds.flatMap(f=>hourlyReturns((f.result.equitySeries??[]).filter(p=>p.timestamp>=f.testStart&&p.timestamp<f.testEnd+HOUR)));
   // Retorno de comprar e segurar no mesmo período fora da amostra (referência, não critério).
   const first=data.trade.findIndex(c=>c.timestamp===wf.folds[0]?.testStart),last=data.trade.findIndex(c=>c.timestamp===wf.folds.at(-1)?.testEnd);
   const buyHold=first>=0&&last>=0?data.trade[last].close/data.trade[first].open-1:null;
   const trades=wf.folds.reduce((s,f)=>s+f.result.trades,0),liquidations=wf.folds.reduce((s,f)=>s+f.result.liquidations,0);
   const funding=wf.folds.reduce((s,f)=>s+(f.result.fundingCashDelta??0),0);
   // Sharpe de cada candidato no dataset inteiro: entra na dispersão entre tentativas do estudo todo.
   const trialSharpes=candidates.map(c=>moments(hourlyReturns(backtestPerpetual(data,c).equitySeries).slice(Math.max(...candidates.map(x=>x.slowPeriod)))).sharpe).filter(Number.isFinite);
   studies.push({symbol,set,datasetHash:hash,from:data.trade[0].timestamp,to:data.trade.at(-1)!.timestamp,fundingRecords:data.funding.length,
    folds:wf.folds.map(f=>({testStart:f.testStart,testEnd:f.testEnd,selected:f.selectedCandidate,trades:f.result.trades,netPnl:f.result.netPnl,maxDrawdown:f.result.maxDrawdown,liquidations:f.result.liquidations})),
    netPnl:wf.netPnl,trades,liquidations,maxFoldDrawdown:Math.max(0,...wf.folds.map(f=>f.result.maxDrawdown)),positiveFolds:wf.folds.filter(f=>f.result.netPnl>0).length,funding,buyHold,
    oosReturns:oos,trialSharpes,robustness:{pbo:robust.overfitting.pbo,cpcvPositive:robust.cpcv.positivePathShare,cpcvMedianSharpe:robust.cpcv.medianSharpeAnnualized,sharpeAnnualized:robust.outOfSample.sharpeAnnualized,metrics:robust.metrics},seconds:(Date.now()-t0)/1000});
   console.log(symbol.padEnd(13),set.padEnd(26),'P&L',wf.netPnl.toFixed(2).padStart(9),'ops',String(trades).padStart(4),'B&H',buyHold===null?'—':(buyHold*100).toFixed(1)+'%');
  }
 }
 // Desconto de múltiplas tentativas no estudo inteiro: todas as configurações (moedas × candidatos).
 const allSharpes=studies.flatMap(s=>s.trialSharpes),n=allSharpes.length,mean=allSharpes.reduce((a,b)=>a+b,0)/Math.max(1,n);
 const variance=n>1?allSharpes.reduce((a,b)=>a+(b-mean)**2,0)/(n-1):0;
 const P=PROTOCOL.screen;
 for(const s of studies){
  const dsr=deflatedSharpe(s.oosReturns,n,variance);
  const checks=[['MINIMUM_FOLDS',s.folds.length>=P.minimumFolds],['MINIMUM_TRADES',s.trades>=P.minimumTrades],['POSITIVE_OOS_PNL',s.netPnl>0&&Math.abs(s.netPnl-s.folds.reduce((a:number,f:any)=>a+f.netPnl,0))<=1e-6*Math.max(1,Math.abs(s.netPnl))],
   ['NO_LIQUIDATIONS',s.liquidations===0],['BOUNDED_FOLD_DRAWDOWN',s.maxFoldDrawdown<=P.maximumDrawdown],['DEFLATED_SHARPE',Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=P.minimumDeflatedSharpe],
   ['CPCV_POSITIVE_PATHS',s.robustness.cpcvPositive!==null&&s.robustness.cpcvPositive>=P.minimumCpcvPositivePathShare],['PROBABILITY_OF_OVERFITTING',s.robustness.pbo===null||s.robustness.pbo<=P.maximumPbo]] as [string,boolean][];
  s.deflatedSharpe=dsr.deflatedSharpe;s.checks=Object.fromEntries(checks);s.passed=checks.every(([,ok])=>ok);s.failed=checks.filter(([,ok])=>!ok).map(([id])=>id);
  delete s.oosReturns;delete s.trialSharpes;
 }
 const day=new Date(runAt).toISOString().slice(0,10),base=`docs/estudos/multimoedas-${day}`;
 const report={protocol:PROTOCOL,runAt:new Date(runAt).toISOString(),execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,trials:n,trialSharpeVariance:variance,failures,studies};
 writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
 console.log('\nrelatório:',base+'.json / .md','·',studies.filter(s=>s.passed).length,'aprovadas de',studies.length);
}
const pct=(v:number|null)=>v===null||!Number.isFinite(v)?'—':(v>=0?'+':'')+(v*100).toFixed(1)+'%';
function markdown(r:any){
 const rows=[...r.studies].sort((a:any,b:any)=>Number(b.passed)-Number(a.passed)||b.netPnl-a.netPnl);
 const lines=[`# Estudo multimoedas · ${r.protocol.version}`,'',`Executado em ${r.runAt} (simulação histórica fora do servidor, dados públicos da Binance USD-M). Protocolo: \`docs/PROTOCOLO_MULTIMOEDAS.md\`. Tentativas no desconto de múltiplos testes: ${r.trials}.`,'',
  `**Aprovadas: ${rows.filter((s:any)=>s.passed).length} de ${rows.length}.** Aprovação aqui é filtro para um piloto paper, não prova de lucro.`,'',
  '| Moeda | Conjunto | P&L fora da amostra (10 000) | Retorno | Comprar e segurar | Operações | Janelas positivas | Pior DD | Sharpe deflac. | CPCV + | Resultado |','|---|---|---|---|---|---|---|---|---|---|---|'];
 for(const s of rows)lines.push(`| ${s.symbol} | ${s.set} | ${s.netPnl.toFixed(2)} | ${pct(s.netPnl/10000)} | ${pct(s.buyHold)} | ${s.trades} | ${s.positiveFolds}/${s.folds.length} | ${(s.maxFoldDrawdown*100).toFixed(1)}% | ${Number.isFinite(s.deflatedSharpe)?s.deflatedSharpe.toFixed(2):'—'} | ${s.robustness.cpcvPositive===null?'—':Math.round(s.robustness.cpcvPositive*100)+'%'} | ${s.passed?'**aprovada**':'reprovada: '+s.failed.join(', ')} |`);
 if(r.failures.length)lines.push('','Falhas de dados: '+r.failures.map((f:any)=>f.symbol+' ('+f.error+')').join('; '));
 lines.push('','Hashes dos datasets (SHA-256, forma canônica dos estudos):','',...[...new Map(r.studies.map((s:any)=>[s.symbol,s.datasetHash])).entries()].map(([sym,h])=>`- ${sym}: \`${h}\``));
 return lines.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('multimoedas.ts'))await main();
