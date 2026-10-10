// Motor da BUSCA_DIARIA_V1 (docs/PROTOCOLO_BUSCA_DIARIA_V1.md): regras compradas-ou-fora por moeda sobre velas diárias à vista, carteira de peso
// igual entre as moedas elegíveis, custos por variação de peso. Simulação histórica só; não envia ordens.
export const DAY=86400000;
export interface SpotSeriesLike {symbol:string;baseAsset:string;status:string;t:number[];h:number[];l:number[];c:number[];qv:number[]}
export interface CoinSeries {symbol:string;baseAsset:string;status:string;pegged:boolean;first:number;last:number;c:Float64Array;h:Float64Array;l:Float64Array;qv:Float64Array;has:Uint8Array}
export interface Grid {T0:number;days:number;coins:CoinSeries[]}
export const ELIGIBILITY=Object.freeze({minDays:90,volumeWindow:30,minMedianQuoteVolume:1_000_000,peggedLow:0.9,peggedHigh:1.1,peggedShare:0.95});
export const COST_PER_SIDE=0.002;

/** Atrelada ao dólar: fechamento entre 0,90 e 1,10 em pelo menos 95% dos dias. */
export const isPegged=(c:ArrayLike<number>)=>c.length>=30&&Array.from(c).filter(x=>x>=ELIGIBILITY.peggedLow&&x<=ELIGIBILITY.peggedHigh).length/c.length>=ELIGIBILITY.peggedShare;

/** Grade diária: dias faltando dentro da vida da moeda repetem o último fechamento (has=0); fora da vida, NaN. */
export function buildGrid(series:SpotSeriesLike[],T0:number,days:number):Grid{
 const coins:CoinSeries[]=[];
 for(const s of series){
  if(!s.t.length)continue;
  const c=new Float64Array(days).fill(NaN),h=new Float64Array(days).fill(NaN),l=new Float64Array(days).fill(NaN),qv=new Float64Array(days),has=new Uint8Array(days);
  const first=Math.round((s.t[0]-T0)/DAY),last=Math.round((s.t.at(-1)!-T0)/DAY);
  if(first<0||last>=days)throw new Error('série fora da grade: '+s.symbol);
  s.t.forEach((t,k)=>{const i=Math.round((t-T0)/DAY);c[i]=s.c[k];h[i]=s.h[k];l[i]=s.l[k];qv[i]=s.qv[k];has[i]=1;});
  for(let i=first+1;i<=last;i++)if(!has[i]){c[i]=c[i-1];h[i]=c[i-1];l[i]=c[i-1];}
  coins.push({symbol:s.symbol,baseAsset:s.baseAsset,status:s.status,pegged:isPegged(s.c),first,last,c,h,l,qv,has});
 }
 return {T0,days,coins};
}

/** Elegibilidade na decisão do dia t (informação até t). */
export function eligibility(coin:CoinSeries,days:number,e=ELIGIBILITY):Uint8Array{
 const out=new Uint8Array(days);if(coin.pegged)return out;
 const buf:number[]=[];
 for(let t=coin.first+e.minDays-1;t<coin.last&&t<days;t++){
  buf.length=0;for(let k=t-e.volumeWindow+1;k<=t;k++)buf.push(k>=0?coin.qv[k]:0);
  buf.sort((a,b)=>a-b);const median=(buf[Math.floor((buf.length-1)/2)]+buf[Math.ceil((buf.length-1)/2)])/2;
  if(median>=e.minMedianQuoteVolume)out[t]=1;
 }
 return out;
}

export type RuleId='SMA20'|'SMA50'|'SMA100'|'DONCHIAN_55_20'|'TSMOM90';
export const RULES:RuleId[]=['SMA20','SMA50','SMA100','DONCHIAN_55_20','TSMOM90'];
/** Posição (0 ou 1) decidida no fechamento do dia t, só com informação até t. 0 onde a série ainda não tem histórico. */
export function positions(rule:RuleId,coin:CoinSeries,days:number):Uint8Array{
 const pos=new Uint8Array(days),{c,h,l,first,last}=coin;
 const sma=(n:number)=>{let sum=0;for(let t=first;t<=last;t++){sum+=c[t];if(t-first>=n)sum-=c[t-n];if(t-first>=n-1)pos[t]=c[t]>sum/n?1:0;}};
 if(rule==='SMA20')sma(20);else if(rule==='SMA50')sma(50);else if(rule==='SMA100')sma(100);
 else if(rule==='TSMOM90'){for(let t=first+90;t<=last;t++)pos[t]=c[t]/c[t-90]-1>0?1:0;}
 else{
  let inPos=0;
  for(let t=first+55;t<=last;t++){
   let hi=-Infinity,lo=Infinity;for(let k=t-55;k<t;k++)if(h[k]>hi)hi=h[k];for(let k=t-20;k<t;k++)if(l[k]<lo)lo=l[k];
   if(!inPos&&c[t]>hi)inPos=1;else if(inPos&&c[t]<lo)inPos=0;
   pos[t]=inPos;
  }
 }
 return pos;
}

export interface PortfolioResult {returns:Float64Array;active:Float64Array;invested:Float64Array;turnover:Float64Array;from:number;to:number}
/**
 * Retorno da carteira nos dias from+1..to: na decisão do dia t, cada moeda elegível tem peso 1/n(t) se o sinal é comprado e fica em caixa se não;
 * o retorno do dia t+1 é a média dos retornos de fechamento a fechamento, menos custo por lado sobre a variação de peso de cada moeda.
 * `mask` restringe as moedas (metades do universo, só em operação, BTC).
 */
export function portfolio(grid:Grid,pos:Uint8Array[],elig:Uint8Array[],costPerSide:number,from:number,to:number,mask?:(k:number)=>boolean):PortfolioResult{
 const n=to-from+1,returns=new Float64Array(n),active=new Float64Array(n),invested=new Float64Array(n),turnover=new Float64Array(n);
 const K=grid.coins.length,prev=new Float64Array(K);
 // Pesos do dia anterior à janela: carteira vazia.
 for(let t=from;t<to;t++){
  let count=0;for(let k=0;k<K;k++)if((!mask||mask(k))&&elig[k][t])count++;
  const w=count?1/count:0;let ret=0,turn=0,inv=0;
  for(let k=0;k<K;k++){
   const e=(!mask||mask(k))&&elig[k][t]===1,a=e?pos[k][t]*w:0;
   turn+=Math.abs(a-prev[k]);
   if(a>0){const c=grid.coins[k],r=c.c[t+1]/c.c[t]-1;if(Number.isFinite(r))ret+=a*r;inv+=a;}
   prev[k]=a;
  }
  returns[t+1-from]=ret-costPerSide*turn;active[t+1-from]=count;invested[t+1-from]=inv;turnover[t+1-from]=turn;
 }
 return {returns,active,invested,turnover,from,to};
}

/** Benchmark: as mesmas moedas elegíveis, sempre compradas (peso igual). */
export function buyHoldPositions(grid:Grid):Uint8Array[]{return grid.coins.map(()=>new Uint8Array(grid.days).fill(1));}

export interface Stats {total:number;annualized:number;sharpe:number;maxDrawdown:number;days:number}
export function stats(returns:ArrayLike<number>,start=0,end=returns.length):Stats{
 const r:number[]=[];for(let i=start;i<end;i++)r.push(returns[i]);
 const n=r.length;if(!n)return {total:0,annualized:0,sharpe:0,maxDrawdown:0,days:0};
 const mean=r.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(r.reduce((a,b)=>a+(b-mean)**2,0)/n);
 let eq=1,peak=1,dd=0;for(const x of r){eq*=1+x;peak=Math.max(peak,eq);dd=Math.max(dd,1-eq/peak);}
 return {total:eq-1,annualized:eq>0?eq**(365/n)-1:-1,sharpe:sd>0?mean/sd*Math.sqrt(365):0,maxDrawdown:dd,days:n};
}

/** Resultado de uma moeda sozinha (só nos dias elegíveis), com custo por lado nas mudanças de posição. */
export function coinAlone(coin:CoinSeries,pos:Uint8Array,elig:Uint8Array,costPerSide:number,from:number,to:number){
 const r:number[]=[];let prev=0,bh=1,eq=1;
 for(let t=from;t<to;t++){
  if(!elig[t]){prev=0;continue;}
  const ret=coin.c[t+1]/coin.c[t]-1;if(!Number.isFinite(ret))continue;
  const p=pos[t];eq*=1+(p*ret-costPerSide*Math.abs(p-prev));bh*=1+ret;prev=p;r.push(p*ret);
 }
 return {days:r.length,total:eq-1,buyHoldTotal:bh-1};
}

/** Metade do universo por paridade da soma dos códigos do símbolo (divisão fixa e declarada). */
export const halfOf=(symbol:string)=>[...symbol].reduce((a,ch)=>a+ch.charCodeAt(0),0)%2;
