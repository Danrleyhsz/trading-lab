// Robustez estatística de estudos históricos (Bailey & López de Prado).
// - Deflated Sharpe Ratio (2014): probabilidade de o Sharpe observado ser real depois de descontar
//   o número de tentativas, a assimetria e a curtose dos retornos.
// - PBO por CSCV (2017): probabilidade de o melhor candidato escolhido "dentro da amostra" ficar abaixo
//   da mediana "fora da amostra", em todas as combinações de blocos.
// Funções puras; nenhuma ordem, conta ou dado de produção é tocado aqui.

const EULER_GAMMA=0.5772156649015329;

/** Função de distribuição acumulada da normal padrão (Abramowitz-Stegun 7.1.26, erro < 1,5e-7). */
export function normalCdf(x:number){
 const t=1/(1+0.3275911*Math.abs(x)/Math.SQRT2);
 const erf=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-(x*x)/2);
 return x>=0?(1+erf)/2:(1-erf)/2;
}
/** Inversa da normal padrão (Acklam), erro relativo < 1,2e-9. */
export function normalInverse(p:number){
 if(!(p>0&&p<1))throw Error('probabilidade fora de (0,1)');
 const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
 const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
 const c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
 const d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
 const low=0.02425;
 if(p<low){const q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 if(p>1-low){const q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
 const q=p-0.5,r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
export interface ReturnMoments {n:number;mean:number;sd:number;sharpe:number;skewness:number;kurtosis:number}
/** Momentos dos retornos por período. Sharpe NÃO anualizado (por período), como na fórmula do DSR. */
export function moments(returns:number[]):ReturnMoments{
 const n=returns.length;if(n<3)return {n,mean:NaN,sd:NaN,sharpe:NaN,skewness:NaN,kurtosis:NaN};
 const mean=returns.reduce((s,r)=>s+r,0)/n,variance=returns.reduce((s,r)=>s+(r-mean)**2,0)/n,sd=Math.sqrt(variance);
 if(!(sd>0))return {n,mean,sd,sharpe:0,skewness:0,kurtosis:3};
 const skewness=returns.reduce((s,r)=>s+((r-mean)/sd)**3,0)/n,kurtosis=returns.reduce((s,r)=>s+((r-mean)/sd)**4,0)/n;
 return {n,mean,sd,sharpe:mean/sd,skewness,kurtosis};
}
/**
 * Sharpe "esperado por sorte" do melhor entre N tentativas independentes (SR0 do DSR).
 * trialSharpeVariance: variância dos Sharpes das tentativas (por período).
 */
export function expectedMaxSharpe(trials:number,trialSharpeVariance:number){
 if(!(trials>1)||!(trialSharpeVariance>0))return 0;
 return Math.sqrt(trialSharpeVariance)*((1-EULER_GAMMA)*normalInverse(1-1/trials)+EULER_GAMMA*normalInverse(1-1/(trials*Math.E)));
}
/** Probabilidade (0–1) de o Sharpe observado superar o benchmark sr0, corrigida por assimetria e curtose (PSR). */
export function probabilisticSharpe(m:ReturnMoments,sr0:number){
 if(!(m.n>3)||!Number.isFinite(m.sharpe))return NaN;
 const denominator=1-m.skewness*m.sharpe+(m.kurtosis-1)/4*m.sharpe**2;
 if(!(denominator>0))return NaN;
 return normalCdf((m.sharpe-sr0)*Math.sqrt(m.n-1)/Math.sqrt(denominator));
}
/** Deflated Sharpe Ratio: PSR contra o melhor Sharpe esperado por sorte entre `trials` tentativas. */
export function deflatedSharpe(returns:number[],trials:number,trialSharpeVariance:number){
 const m=moments(returns),sr0=expectedMaxSharpe(trials,trialSharpeVariance);
 return {moments:m,trials,benchmarkSharpe:sr0,deflatedSharpe:probabilisticSharpe(m,sr0)};
}
function combinations(n:number,k:number){const out:number[][]=[];const pick=(start:number,acc:number[])=>{if(acc.length===k){out.push(acc.slice());return;}for(let i=start;i<n;i++){acc.push(i);pick(i+1,acc);acc.pop();}};pick(0,[]);return out;}
const sharpeOf=(r:number[])=>moments(r).sharpe;
/**
 * PBO por CSCV. `matrix[t][c]` = retorno do candidato c no período t (mesmos períodos para todos).
 * Divide o tempo em `blocks` blocos (par), testa todas as combinações de metade dentro da amostra.
 * Também devolve, para cada combinação, o Sharpe fora da amostra do candidato escolhido.
 */
export function probabilityOfBacktestOverfitting(matrix:number[][],blocks=10){
 const candidates=matrix[0]?.length??0;
 if(candidates<2)return {pbo:null as number|null,combinations:0,selectedOutOfSampleSharpes:[] as number[],reason:'PBO exige pelo menos 2 candidatos'};
 if(blocks%2!==0||blocks<4||matrix.length<blocks*4)return {pbo:null,combinations:0,selectedOutOfSampleSharpes:[],reason:'períodos insuficientes para os blocos'};
 const size=Math.floor(matrix.length/blocks),parts=Array.from({length:blocks},(_,i)=>matrix.slice(i*size,(i+1)*size));
 let below=0;const oos:number[]=[];const combos=combinations(blocks,blocks/2);
 for(const inSample of combos){
  const set=new Set(inSample),isRows=parts.filter((_,i)=>set.has(i)).flat(),oosRows=parts.filter((_,i)=>!set.has(i)).flat();
  const isSharpe=Array.from({length:candidates},(_,c)=>sharpeOf(isRows.map(r=>r[c])));
  const best=isSharpe.reduce((b,v,i)=>v>isSharpe[b]?i:b,0);
  const oosSharpe=Array.from({length:candidates},(_,c)=>sharpeOf(oosRows.map(r=>r[c])));
  // Posição relativa do escolhido fora da amostra (0–1); logit <= 0 significa abaixo da mediana.
  const rank=oosSharpe.filter(v=>v<oosSharpe[best]).length+0.5*(oosSharpe.filter(v=>v===oosSharpe[best]).length-1);
  const omega=(rank+1)/(candidates+1);if(Math.log(omega/(1-omega))<=0)below++;
  oos.push(oosSharpe[best]);
 }
 return {pbo:below/combos.length,combinations:combos.length,selectedOutOfSampleSharpes:oos,reason:null as string|null};
}
/** Retornos horários a partir da série de equity da simulação (último ponto de cada hora). */
export function hourlyReturns(series:{timestamp:number;equity:number}[]){
 const byHour=new Map<number,number>();for(const p of series)byHour.set(Math.floor(p.timestamp/3600000),p.equity);
 const equity=[...byHour.entries()].sort((a,b)=>a[0]-b[0]).map(([,e])=>e);
 return equity.slice(1).map((e,i)=>equity[i]>0?e/equity[i]-1:0);
}
