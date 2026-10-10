// Motor da BUSCA_MAIORES_V1 (docs/PROTOCOLO_BUSCA_MAIORES_V1.md): as N maiores moedas por volume (ranking ponto no tempo a cada 30 dias),
// regras compradas-ou-fora e alvo de volatilidade sobre a própria carteira. Simulação histórica só; não envia ordens.
import type {Grid} from './busca-diaria-lib.js';

export interface MaioresConfig {universeSize:number;refreshDays:number;volumeWindow:number;targetVol:number;volLookback:number;minHistory:number;earlyScale:number;costPerSide:number}
export const MAIORES:Readonly<MaioresConfig>=Object.freeze({universeSize:5,refreshDays:30,volumeWindow:90,targetVol:0.20,volLookback:60,minHistory:30,earlyScale:0.5,costPerSide:0.0015});

/** Membros do universo na decisão do dia t: as N elegíveis de maior volume somado dos `volumeWindow` dias anteriores, ranking a cada `refreshDays`. */
export function membership(grid:Grid,elig:Uint8Array[],n=MAIORES.universeSize,refreshDays=MAIORES.refreshDays,volumeWindow=MAIORES.volumeWindow):Uint8Array[]{
 const K=grid.coins.length,days=grid.days,out=grid.coins.map(()=>new Uint8Array(days));
 let current=new Set<number>();
 for(let t=0;t<days;t++){
  if(t%refreshDays===0){
   const ranked:{k:number;v:number}[]=[];
   for(let k=0;k<K;k++){if(!elig[k][t])continue;let v=0;for(let d=Math.max(0,t-volumeWindow+1);d<=t;d++)v+=grid.coins[k].qv[d];ranked.push({k,v});}
   ranked.sort((a,b)=>b.v-a.v||grid.coins[a.k].symbol.localeCompare(grid.coins[b.k].symbol));
   current=new Set(ranked.slice(0,n).map(x=>x.k));
  }
  for(const k of current)if(elig[k][t])out[k][t]=1;
 }
 return out;
}

export interface ScaledResult {returns:Float64Array;scale:Float64Array;invested:Float64Array;turnover:Float64Array;members:Float64Array;from:number;to:number}
/**
 * Carteira de peso igual entre os membros (fatia 1/min(N, membros elegíveis)), investida onde o sinal é comprado, com escala de risco diária:
 * fator = min(1, alvo / vol anualizada dos retornos BRUTOS da carteira nos últimos `volLookback` dias até t); antes de `minHistory` dias, `earlyScale`.
 * Custo por lado sobre a variação de peso final de cada moeda (inclui a variação causada pela escala). `target=Infinity` desliga a escala.
 */
export function scaledPortfolio(grid:Grid,pos:Uint8Array[],member:Uint8Array[],n:number,cost:number,from:number,to:number,target=MAIORES.targetVol,lookback=MAIORES.volLookback,minHistory=MAIORES.minHistory,earlyScale=MAIORES.earlyScale):ScaledResult{
 const K=grid.coins.length,len=to-from+1,returns=new Float64Array(len),scale=new Float64Array(len),invested=new Float64Array(len),turnover=new Float64Array(len),members=new Float64Array(len);
 const prev=new Float64Array(K),raw:number[]=[];
 for(let t=from;t<to;t++){
  let count=0;for(let k=0;k<K;k++)if(member[k][t])count++;
  const slot=count?1/Math.min(n,count):0;let rawRet=0;
  for(let k=0;k<K;k++)if(member[k][t]&&pos[k][t]){const c=grid.coins[k],r=c.c[t+1]/c.c[t]-1;if(Number.isFinite(r))rawRet+=slot*r;}
  // O retorno bruto do dia t+1 só entra na estimativa de volatilidade a partir da decisão do dia t+1.
  let s=1;
  if(Number.isFinite(target)){
   const hist=raw.slice(-lookback);
   if(hist.length<minHistory)s=earlyScale;else{const m=hist.reduce((a,b)=>a+b,0)/hist.length,sd=Math.sqrt(hist.reduce((a,b)=>a+(b-m)**2,0)/hist.length)*Math.sqrt(365);s=sd>0?Math.min(1,target/sd):1;}
  }
  let ret=0,turn=0,inv=0;
  for(let k=0;k<K;k++){
   const a=member[k][t]&&pos[k][t]?s*slot:0;turn+=Math.abs(a-prev[k]);
   if(a>0){const c=grid.coins[k],r=c.c[t+1]/c.c[t]-1;if(Number.isFinite(r))ret+=a*r;inv+=a;}
   prev[k]=a;
  }
  returns[t+1-from]=ret-cost*turn;scale[t+1-from]=s;invested[t+1-from]=inv;turnover[t+1-from]=turn;members[t+1-from]=count;
  raw.push(rawRet);
 }
 return {returns,scale,invested,turnover,members,from,to};
}
