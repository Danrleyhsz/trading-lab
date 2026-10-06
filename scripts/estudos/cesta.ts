// Teste da cesta de tendência em período não visto (docs/PROTOCOLO_CESTA_TENDENCIA.md, TREND_BASKET_V1). Roda fora do
// servidor, só com dados públicos da Binance USD-M; não envia ordens e não grava estado. Relatório em docs/estudos/.
// Uso: CURL=1 npx tsx scripts/estudos/cesta.ts
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {BinancePerpetualHistory} from '../../src/infrastructure/binance-perpetual-history.js';
import {walkForwardPerpetual} from '../../src/domain/perpetual-walk-forward.js';
import {validatePerpetualDataset,type PerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {deflatedSharpe,moments} from '../../src/domain/backtest-robustness.js';
import {candidatesOf} from './multimoedas.js';
import type {StudyCandidateSet} from '../../src/application/perpetual-studies.js';

const HOUR=3600000;
export const BASKET_PROTOCOL=Object.freeze({version:'TREND_BASKET_V1',declaredAt:'2026-10-05',bars:5000,trainBars:1500,testBars:500,
 // Primeiro candle do estudo MULTI_ASSET_STUDY_V1: o período deste teste termina na hora anterior.
 previousStudyStart:Date.UTC(2026,2,11,15),
 hypotheses:{CESTA_TENDENCIA_SMA:'MULTI_DAY_TREND_V1',CESTA_ROMPIMENTO_PROTEGIDO:'BREAKOUT_480_PROTECTED_V1'} as Record<string,StudyCandidateSet>,
 screen:{version:'TREND_BASKET_SCREEN_V1',minimumTrades:30,maximumDrawdown:0.15,minimumPositiveFolds:4,minimumPositiveCoinShare:0.6,minimumDeflatedSharpe:0.9,trials:2}});
const universe=JSON.parse(readFileSync('docs/estudos/universo-2026-10-05.json','utf8')) as {universe:string[];control:string[]};
const symbols=[...universe.universe,...universe.control];
const curlFetch=((url:string)=>new Promise<Response>((resolve,reject)=>execFile('curl',['-sS','-m','30','-w','\n%{http_code}',String(url)],{encoding:'utf8',maxBuffer:64*1024*1024},(error,out)=>{if(error)return reject(error);const i=out.lastIndexOf('\n');resolve(new Response(out.slice(0,i),{status:Number(out.slice(i+1))}));}))) as unknown as typeof fetch;
// "Agora" do carregador = primeiro candle do estudo anterior: a última vela carregada é a hora imediatamente antes.
const history=new BinancePerpetualHistory(process.env.CURL==='1'?curlFetch:fetch,()=>BASKET_PROTOCOL.previousStudyStart);
const cacheDir='scripts/estudos/out';mkdirSync(cacheDir,{recursive:true});
async function dataset(symbol:string):Promise<PerpetualDataset>{
 const file=`${cacheDir}/${symbol}-holdout-${BASKET_PROTOCOL.previousStudyStart}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const data=await history.load(BASKET_PROTOCOL.bars,symbol);writeFileSync(file,JSON.stringify(data));return data;
}

async function main(){
 const P=BASKET_PROTOCOL,data=new Map<string,PerpetualDataset>(),failures:{symbol:string;error:string}[]=[];
 for(const symbol of symbols){
  try{const d=await dataset(symbol);if(d.trade.at(-1)!.timestamp!==P.previousStudyStart-HOUR)throw Error('período diferente do declarado');data.set(symbol,d);console.log('dados',symbol,new Date(d.trade[0].timestamp).toISOString().slice(0,16),'→',new Date(d.trade.at(-1)!.timestamp).toISOString().slice(0,16));}
  catch(error){failures.push({symbol,error:String((error as Error).message||error)});console.log('falha de dados',symbol,failures.at(-1)!.error);}
 }
 const coins=[...data.keys()],weight=1/coins.length,results:Record<string,unknown>={};
 for(const [name,set] of Object.entries(P.hypotheses)){
  const perCoin:any[]=[];const curve=new Map<number,number>();
  for(const symbol of coins){
   const d=data.get(symbol)!,candidates=candidatesOf(set),wf=walkForwardPerpetual(d,candidates,P.trainBars,P.testBars);
   // Equity da moeda ao fim de cada hora de teste: último ponto da simulação dentro da hora (mesmo critério de
   // hourlyReturns), repetindo o valor anterior numa hora sem ponto. A simulação grava vários pontos por hora, em
   // instantes que variam entre moedas, então somar por instante exato contaria moedas duas vezes ou faltaria moedas.
   const byHour=new Map<number,number>();
   for(const f of wf.folds)for(const p of f.result.equitySeries){const h=Math.floor(p.timestamp/HOUR)*HOUR;if(h>=f.testStart&&h<=f.testEnd)byHour.set(h,p.equity);}
   let held=candidates[0].initialCapital;
   for(const f of wf.folds)for(let h=f.testStart;h<=f.testEnd;h+=HOUR){held=byHour.get(h)??held;curve.set(h,(curve.get(h)??0)+held*weight);}
   const first=d.trade.findIndex(c=>c.timestamp===wf.folds[0].testStart),last=d.trade.findIndex(c=>c.timestamp===wf.folds.at(-1)!.testEnd);
   perCoin.push({symbol,datasetHash:validatePerpetualDataset(d),netPnl:wf.netPnl,returnPct:wf.netPnl/candidates[0].initialCapital,trades:wf.folds.reduce((s,f)=>s+f.result.trades,0),liquidations:wf.folds.reduce((s,f)=>s+f.result.liquidations,0),
    funding:wf.folds.reduce((s,f)=>s+f.result.fundingCashDelta,0),buyHold:d.trade[last].close/d.trade[first].open-1,folds:wf.folds.map(f=>({testStart:f.testStart,testEnd:f.testEnd,netPnl:f.result.netPnl,returnPct:f.result.netPnl/candidates[0].initialCapital}))});
  }
  const points=[...curve].sort((a,b)=>a[0]-b[0]),capital=10000;
  // Curva começa no capital inicial (todas as moedas abrem a primeira janela com 10 000 × peso).
  const equity=[capital,...points.map(([,v])=>v)],returns=equity.slice(1).map((v,i)=>v/equity[i]-1);
  let peak=-Infinity,maxDrawdown=0;for(const v of equity){peak=Math.max(peak,v);maxDrawdown=Math.max(maxDrawdown,1-v/peak);}
  const folds=perCoin[0].folds.map((f:any,i:number)=>({testStart:f.testStart,testEnd:f.testEnd,returnPct:perCoin.reduce((s,c)=>s+c.folds[i].returnPct*weight,0)}));
  // Conferência: o P&L da cesta tem de ser a média ponderada do P&L das moedas (falha alto se a curva estiver errada).
  const expected=perCoin.reduce((s,c)=>s+c.netPnl*weight,0);if(Math.abs(equity.at(-1)!-capital-expected)>1e-6*Math.max(1,Math.abs(expected)))throw Error('curva da cesta não bate com as moedas');
  const netPnl=equity.at(-1)!-capital,trades=perCoin.reduce((s,c)=>s+c.trades,0),positiveCoins=perCoin.filter(c=>c.netPnl>0).length;
  const m=moments(returns),dsr=deflatedSharpe(returns,P.screen.trials,0);
  results[name]={set,netPnl,returnPct:netPnl/capital,trades,maxDrawdown,positiveFolds:folds.filter((f:any)=>f.returnPct>0).length,folds,positiveCoins,coins:perCoin.length,
   sharpeAnnualized:m.sharpe*Math.sqrt(24*365),buyHold:perCoin.reduce((s,c)=>s+c.buyHold*weight,0),funding:perCoin.reduce((s,c)=>s+c.funding*weight,0),liquidations:perCoin.reduce((s,c)=>s+c.liquidations,0),perCoin,hours:returns.length,returns};
 }
 // Desconto de 2 tentativas: dispersão dos Sharpe horários das duas cestas.
 const sharpes=Object.values(results).map((r:any)=>moments(r.returns).sharpe),mean=(sharpes[0]+sharpes[1])/2,variance=sharpes.reduce((s,v)=>s+(v-mean)**2,0)/(sharpes.length-1);
 const S=P.screen;
 for(const r of Object.values(results) as any[]){
  const dsr=deflatedSharpe(r.returns,S.trials,variance);r.deflatedSharpe=dsr.deflatedSharpe;
  const checks:[string,boolean][]=[['POSITIVE_BASKET_PNL',r.netPnl>0],['MINIMUM_TRADES',r.trades>=S.minimumTrades],['BOUNDED_DRAWDOWN',r.maxDrawdown<=S.maximumDrawdown],['POSITIVE_FOLDS',r.positiveFolds>=S.minimumPositiveFolds],
   ['BREADTH',r.positiveCoins/r.coins>=S.minimumPositiveCoinShare],['DEFLATED_SHARPE',Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=S.minimumDeflatedSharpe]];
  r.checks=Object.fromEntries(checks);r.passed=checks.every(([,ok])=>ok);r.failed=checks.filter(([,ok])=>!ok).map(([id])=>id);delete r.returns;
  console.log(r.set.padEnd(26),'P&L',r.netPnl.toFixed(2),'retorno',(r.returnPct*100).toFixed(2)+'%','ops',r.trades,'DD',(r.maxDrawdown*100).toFixed(2)+'%','janelas+',r.positiveFolds+'/7','moedas+',r.positiveCoins+'/'+r.coins,'Sharpe',r.sharpeAnnualized.toFixed(2),'DSR',r.deflatedSharpe.toFixed(2),'B&H',(r.buyHold*100).toFixed(1)+'%',r.passed?'APROVADA':'reprovada: '+r.failed.join(','));
 }
 const report={protocol:P,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),trialSharpeVariance:variance,failures,results};
 const base='docs/estudos/cesta-tendencia-2026-10-05';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));console.log('relatório:',base);
}
const pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(2)+'%';
function markdown(r:any){
 const L=[`# Teste da cesta de tendência · ${r.protocol.version}`,'',
  '> **Correção de cálculo antes do resultado final:** a primeira execução somou a equity das moedas por instante exato, e a simulação grava vários pontos por hora em instantes que variam entre moedas. Isso contou moedas duas vezes em algumas horas e deixou outras de fora, gerando números impossíveis (+80% com queda de 93%). A curva passou a usar o último ponto de cada hora, o mesmo critério de `hourlyReturns`, e o script confere que o P&L da cesta é a média das moedas. Regras, dados e critérios não mudaram.','',`Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M. Período não visto: as 5000 velas de 1 hora terminadas em ${new Date(r.protocol.previousStudyStart-HOUR).toISOString()}. Protocolo: \`docs/PROTOCOLO_CESTA_TENDENCIA.md\` (registrado antes da execução).`,'',
  '| Hipótese | P&L (10 000) | Retorno | Comprar e segurar a cesta | Operações | Pior DD | Janelas + | Moedas + | Sharpe anual | Sharpe deflac. | Resultado |','|---|---|---|---|---|---|---|---|---|---|---|'];
 for(const [name,x] of Object.entries(r.results) as [string,any][])L.push(`| ${name} (${x.set}) | ${x.netPnl.toFixed(2)} | ${pct(x.returnPct)} | ${pct(x.buyHold)} | ${x.trades} | ${(x.maxDrawdown*100).toFixed(2)}% | ${x.positiveFolds}/${x.folds.length} | ${x.positiveCoins}/${x.coins} | ${x.sharpeAnnualized.toFixed(2)} | ${x.deflatedSharpe.toFixed(2)} | ${x.passed?'**aprovada**':'reprovada: '+x.failed.join(', ')} |`);
 for(const [name,x] of Object.entries(r.results) as [string,any][]){
  L.push('',`## ${name}: por janela e por moeda`,'',x.folds.map((f:any,i:number)=>`janela ${i+1}: ${pct(f.returnPct)}`).join(' · '),'','| Moeda | Retorno | Comprar e segurar | Operações |','|---|---|---|---|');
  for(const c of [...x.perCoin].sort((a:any,b:any)=>b.returnPct-a.returnPct))L.push(`| ${c.symbol} | ${pct(c.returnPct)} | ${pct(c.buyHold)} | ${c.trades} |`);
 }
 if(r.failures.length)L.push('','Falhas de dados: '+r.failures.map((f:any)=>f.symbol+' ('+f.error+')').join('; '));
 const hashes=new Map<string,string>();for(const x of Object.values(r.results) as any[])for(const c of x.perCoin)hashes.set(c.symbol,c.datasetHash);
 L.push('','Hashes dos datasets (SHA-256):','',...[...hashes].map(([s,h])=>`- ${s}: \`${h}\``));
 return L.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('cesta.ts'))await main();
