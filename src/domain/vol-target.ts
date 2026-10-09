import type {Candle} from './backtest.js';

/**
 * Tamanho pela volatilidade (protocolo VOL_TARGET_V1, docs/PROTOCOLO_VOL_TARGET_V1.md). Só pesquisa histórica.
 * A fração de uma entrada na vela i é base × alvo ÷ σ, limitada a [mínimo, máximo], onde σ é o desvio-padrão dos
 * retornos log horários das `lookback` horas ANTERIORES à vela i (fechamentos de i−lookback−1 até i−1).
 * Somas acumuladas deixam cada consulta em O(1).
 */
export interface VolSizingConfig {lookback:number;target:number;base:number;min:number;max:number}

export function realizedVolSeries(candles:readonly Candle[]){
 const r=candles.map((c,i)=>i?Math.log(c.close/candles[i-1].close):0);
 const s1=new Float64Array(r.length+1),s2=new Float64Array(r.length+1);
 for(let i=0;i<r.length;i++){s1[i+1]=s1[i]+r[i];s2[i+1]=s2[i]+r[i]*r[i];}
 /** σ horário dos `lookback` retornos que terminam no fechamento da vela i−1 (null se não há histórico suficiente). */
 return (i:number,lookback:number)=>{
  const from=i-lookback,to=i;// retornos r[from..to-1]; r[k] usa os fechamentos k−1 e k, todos antes da vela i
  if(from<1||to>r.length)return null;
  const n=lookback,m=(s1[to]-s1[from])/n,v=(s2[to]-s2[from])/n-m*m;
  return v>0?Math.sqrt(v*n/(n-1)):null;
 };
}

/** Mediana de σ em cada hora do período de calibração [from, to): fixa o alvo antes de olhar o período avaliado. */
export function calibrateTarget(candles:readonly Candle[],lookback:number,from:number,to:number){
 const vol=realizedVolSeries(candles),values:number[]=[];
 candles.forEach((c,i)=>{if(c.timestamp>=from&&c.timestamp<to){const v=vol(i,lookback);if(v!==null)values.push(v);}});
 if(!values.length)throw Error('no calibration data');
 values.sort((a,b)=>a-b);const k=Math.floor(values.length/2);
 return values.length%2?values[k]:(values[k-1]+values[k])/2;
}

/** Função de tamanho para o gancho entrySizing do simulador. */
export function volSizing(candles:readonly Candle[],cfg:VolSizingConfig){
 if(!(cfg.lookback>=2&&cfg.target>0&&cfg.base>0&&cfg.min>0&&cfg.min<=cfg.max&&cfg.max<=0.2))throw Error('invalid vol sizing config');
 const vol=realizedVolSeries(candles),index=new Map(candles.map((c,i)=>[c.timestamp,i]));
 const fractions:number[]=[];
 const fn=(timestamp:number)=>{
  const i=index.get(timestamp);if(i===undefined)throw Error('unknown entry bar');
  const sigma=vol(i,cfg.lookback);
  // Sem histórico suficiente, usa a fração base (declarado no protocolo).
  const f=sigma===null?cfg.base:Math.min(cfg.max,Math.max(cfg.min,cfg.base*cfg.target/sigma));
  fractions.push(f);return f;
 };
 return Object.assign(fn,{fractions});
}
