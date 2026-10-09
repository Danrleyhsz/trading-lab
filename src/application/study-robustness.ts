import {backtestPerpetual,type PerpetualConfig,type PerpetualDataset} from '../domain/perpetual-backtest.js';
import {combinatorialPurgedCv,deflatedSharpe,hourlyReturns,moments,probabilityOfBacktestOverfitting} from '../domain/backtest-robustness.js';
import {teamFilterWarmup} from '../domain/perpetual-signals.js';
import {performanceMetrics} from '../domain/performance-metrics.js';

/**
 * Triagem de robustez V2 (docs/ROBUSTEZ_DE_ESTUDOS.md), declarada em 05/10/2026: V1 + CPCV.
 * Vale para estudos usados em pilotos que começarem depois do piloto atual; o piloto em andamento
 * continua com INDEPENDENT_PAPER_SCREEN_V1, sem mudança de regra no meio.
 */
export const ROBUSTNESS_POLICY=Object.freeze({version:'ROBUSTNESS_SCREEN_V2',declaredAt:'2026-10-05',minimumDeflatedSharpe:0.9,maximumPbo:0.5,minimumPositivePathShare:0.6,cscvBlocks:10,
 cpcvGroups:10,cpcvTestGroups:2,minimumCpcvPositivePathShare:0.6});
export interface RobustnessInput {
 dataset:PerpetualDataset;
 /** Candidatos do próprio estudo (o conjunto pré-declarado). */
 candidates:PerpetualConfig[];
 /** Janelas fora da amostra do estudo, com a série de equity do candidato escolhido em cada uma. */
 folds:{testStart:number;testEnd:number;result:{equitySeries?:{timestamp:number;equity:number}[];tradeOutcomes?:number[]}}[];
 /** Todas as configurações diferentes já testadas no registro (para o desconto de múltiplas tentativas). */
 trials:PerpetualConfig[];
}
const HOUR=3600000;
const warmupOf=(c:PerpetualConfig)=>Math.max(c.slowPeriod,teamFilterWarmup(c.filters));
const annualize=(sharpe:number)=>Number.isFinite(sharpe)?sharpe*Math.sqrt(24*365):NaN;
/** Retornos horários de um candidato no dataset inteiro, a partir do fim do aquecimento comum. */
function fullReturns(dataset:PerpetualDataset,config:PerpetualConfig,skipHours:number){
 const series=backtestPerpetual(dataset,config).equitySeries;return hourlyReturns(series).slice(skipHours);
}
/** Mercado nas janelas de teste (contíguas): do fechamento anterior à primeira janela ao fechamento da última vela de teste. */
function outOfSampleMarket(input:RobustnessInput){
 if(!input.folds.length)return undefined;
 const first=Math.min(...input.folds.map(f=>f.testStart)),last=Math.max(...input.folds.map(f=>f.testEnd)),trade=input.dataset.trade;
 const start=trade.filter(c=>c.timestamp<first).at(-1)??trade.find(c=>c.timestamp>=first),end=trade.filter(c=>c.timestamp<=last).at(-1);
 return start&&end?{startPrice:start.close,endPrice:end.close}:undefined;
}
export function computeStudyRobustness(input:RobustnessInput){
 // 1) Retornos fora da amostra do estudo: só as horas de teste de cada janela (o aquecimento fica de fora).
 const oos=input.folds.flatMap(f=>hourlyReturns((f.result.equitySeries??[]).filter(p=>p.timestamp>=f.testStart&&p.timestamp<f.testEnd+HOUR)));
 // 2) Sharpe de cada configuração já testada no registro, no mesmo dataset, para medir a dispersão entre tentativas.
 const unique=new Map<string,PerpetualConfig>();for(const c of input.trials){const {initialCapital:_capital,...key}=c;unique.set(JSON.stringify(key),c);}
 const trials=[...unique.values()],skip=Math.max(...trials.map(warmupOf),...input.candidates.map(warmupOf));
 const trialSharpes=trials.map(c=>moments(fullReturns(input.dataset,c,skip)).sharpe).filter(Number.isFinite);
 const mean=trialSharpes.reduce((s,v)=>s+v,0)/Math.max(1,trialSharpes.length);
 const variance=trialSharpes.length>1?trialSharpes.reduce((s,v)=>s+(v-mean)**2,0)/(trialSharpes.length-1):0;
 const dsr=deflatedSharpe(oos,Math.max(1,trials.length),variance);
 // 3) PBO/CSCV entre os candidatos do próprio estudo.
 const columns=input.candidates.map(c=>fullReturns(input.dataset,c,skip));const length=Math.min(...columns.map(c=>c.length));
 const matrix=Array.from({length},(_,t)=>columns.map(c=>c[t]));
 const pbo=probabilityOfBacktestOverfitting(matrix,ROBUSTNESS_POLICY.cscvBlocks);
 // 4) CPCV: 45 divisões (10 grupos, 2 de teste), purga de 1 h e embargo de 1% das horas (mínimo 24 h); 9 caminhos fora da amostra.
 const cpcv=combinatorialPurgedCv(matrix,{groups:ROBUSTNESS_POLICY.cpcvGroups,testGroups:ROBUSTNESS_POLICY.cpcvTestGroups});
 const cpcvSharpes=cpcv.paths.map(p=>p.sharpe).filter(Number.isFinite).sort((a,b)=>a-b);
 const cpcvPositive=cpcvSharpes.length?cpcvSharpes.filter(s=>s>0).length/cpcvSharpes.length:null;
 const positiveShare=pbo.selectedOutOfSampleSharpes.length?pbo.selectedOutOfSampleSharpes.filter(s=>s>0).length/pbo.selectedOutOfSampleSharpes.length:null;
 const checks=[
  {id:'DEFLATED_SHARPE',ok:Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=ROBUSTNESS_POLICY.minimumDeflatedSharpe,value:dsr.deflatedSharpe},
  {id:'PROBABILITY_OF_OVERFITTING',ok:pbo.pbo===null?true:pbo.pbo<=ROBUSTNESS_POLICY.maximumPbo,value:pbo.pbo,note:pbo.reason},
  {id:'POSITIVE_OUT_OF_SAMPLE_PATHS',ok:positiveShare===null?true:positiveShare>=ROBUSTNESS_POLICY.minimumPositivePathShare,value:positiveShare},
  // Sem caminhos CPCV (histórico curto), reprova: não há evidência para aprovar.
  {id:'CPCV_POSITIVE_PATHS',ok:cpcvPositive!==null&&cpcvPositive>=ROBUSTNESS_POLICY.minimumCpcvPositivePathShare,value:cpcvPositive,note:cpcv.reason}
 ];
 return {policy:ROBUSTNESS_POLICY,
  outOfSample:{hours:oos.length,sharpePerHour:dsr.moments.sharpe,sharpeAnnualized:annualize(dsr.moments.sharpe),skewness:dsr.moments.skewness,kurtosis:dsr.moments.kurtosis},
  multipleTesting:{trials:trials.length,trialSharpeVariance:variance,benchmarkSharpeAnnualized:annualize(dsr.benchmarkSharpe),deflatedSharpe:dsr.deflatedSharpe},
  overfitting:{pbo:pbo.pbo,combinations:pbo.combinations,positivePathShare:positiveShare,note:pbo.reason},
  cpcv:{splits:cpcv.splits,paths:cpcv.paths.length,purgeHours:cpcv.purge,embargoHours:cpcv.embargo,positivePathShare:cpcvPositive,
   medianSharpeAnnualized:cpcvSharpes.length?annualize(cpcvSharpes[Math.floor(cpcvSharpes.length/2)]):null,worstSharpeAnnualized:cpcvSharpes.length?annualize(cpcvSharpes[0]):null,
   pathReturns:cpcv.paths.map(p=>p.totalReturn),selections:Object.fromEntries(Object.entries(cpcv.selections).map(([i,n])=>[String(input.candidates[Number(i)]?.strategy??'SMA')+' '+input.candidates[Number(i)]?.fastPeriod+'/'+input.candidates[Number(i)]?.slowPeriod+'#'+i,n])),note:cpcv.reason},
  // Métricas fora da amostra (equity das janelas de teste e operações de cada janela).
  metrics:performanceMetrics(input.folds.flatMap(f=>(f.result.equitySeries??[]).filter(p=>p.timestamp>=f.testStart&&p.timestamp<f.testEnd+HOUR)),input.folds.flatMap(f=>(f.result.tradeOutcomes??[]).map(netPnl=>({netPnl}))),undefined,outOfSampleMarket(input)),
  eligible:checks.every(c=>c.ok),checks};
}
