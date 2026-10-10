import type {Candle} from '../backtest.js';
import {atr} from './indicators.js';

/**
 * Primitivas e detectores do VIDEO_HYPOTHESES_V2_ICT (docs/PROTOCOLO_HIPOTESES_ICT.md, com as Emendas 1 e 2).
 * Tudo é causal: o sinal na vela t usa só as velas 0..t. Os detectores varrem a série para a frente e os testes cortam a série
 * e comparam. Só pesquisa: não envia ordens. Os números (limiares, janelas, stops, alvos) vêm do protocolo; o vídeo não define nenhum.
 */
export const ICT_ATR_BARS=24;
const STOP_BUFFER=0.1,MIN_R=0.25,MAX_R=4,DEFAULT_TARGET_R=2,DEFAULT_MAX_BARS=48;

/** Intenção de entrada decidida no fechamento da vela do sinal; o simulador executa na abertura seguinte. */
export interface IctIntent {side:1|-1;stop:number;target?:number;maxBars:number}
/** Uma zona: `touched` = o nível de entrada foi alcançado dentro da validade sem anulação; `entered` = gerou intenção de entrada. */
export interface ZoneStat {kind:string;created:number;side:1|-1;touched:boolean;entered:boolean}
/** Varredura (H08) ou varredura com retomada (H11). `resumedAt` é a vela da retomada, ou null se não houve. */
export interface SweepEvent {index:number;side:1|-1;resumedAt:number|null}
export interface IctResult {signals:(IctIntent|null)[];zones:ZoneStat[];events:SweepEvent[]}
const empty=(n:number):IctResult=>({signals:new Array<IctIntent|null>(n).fill(null),zones:[],events:[]});

// ---------- P2: pivô confirmado (L) ----------
export interface Pivot {index:number;confirmedAt:number;price:number;kind:'HIGH'|'LOW'}
/** A vela p é topo se high[p] ≥ high[k] para todo k em [p−L, p+L] (fundo: espelho). O pivô só existe a partir da vela p+L. */
export function confirmedPivots(candles:readonly Candle[],L:number):Pivot[]{
 const out:Pivot[]=[];
 for(let p=L;p+L<candles.length;p++){
  let isHigh=true,isLow=true;
  for(let k=p-L;k<=p+L;k++){if(candles[k].high>candles[p].high)isHigh=false;if(candles[k].low<candles[p].low)isLow=false;if(!isHigh&&!isLow)break;}
  if(isHigh)out.push({index:p,confirmedAt:p+L,price:candles[p].high,kind:'HIGH'});
  if(isLow)out.push({index:p,confirmedAt:p+L,price:candles[p].low,kind:'LOW'});
 }
 return out.sort((a,b)=>a.confirmedAt-b.confirmedAt||a.index-b.index||(a.kind==='HIGH'?-1:1));
}

// ---------- P3: vela de deslocamento (k) ----------
/** +1 altista, −1 baixista, 0 nenhuma: corpo ≥ k·ATR[i] e fechamento no quarto extremo da própria amplitude. */
export function displacement(candles:readonly Candle[],range:readonly number[],k:number):Int8Array{
 const out=new Int8Array(candles.length);
 for(let i=0;i<candles.length;i++){
  const c=candles[i],a=range[i],h=c.high-c.low;if(!Number.isFinite(a)||!(h>0))continue;
  if(c.close-c.open>=k*a&&(c.close-c.low)/h>=0.75)out[i]=1;
  else if(c.open-c.close>=k*a&&(c.high-c.close)/h>=0.75)out[i]=-1;
 }
 return out;
}

// ---------- P4: FVG (k, g) ----------
export interface Fvg {created:number;side:1|-1;top:number;bottom:number;ce:number}
/** FVG criado no fechamento da vela i; a vela do meio (i−1) precisa ser de deslocamento (k) e o gap ter pelo menos g·ATR[i]. */
export function fairValueGaps(candles:readonly Candle[],range:readonly number[],k:number,g:number):Fvg[]{
 const disp=displacement(candles,range,k),out:Fvg[]=[];
 for(let i=2;i<candles.length;i++){
  const a=range[i];if(!Number.isFinite(a))continue;
  if(candles[i].low>candles[i-2].high&&disp[i-1]===1&&candles[i].low-candles[i-2].high>=g*a){const bottom=candles[i-2].high,top=candles[i].low;out.push({created:i,side:1,top,bottom,ce:(top+bottom)/2});}
  else if(candles[i].high<candles[i-2].low&&disp[i-1]===-1&&candles[i-2].low-candles[i].high>=g*a){const top=candles[i-2].low,bottom=candles[i].high;out.push({created:i,side:-1,top,bottom,ce:(top+bottom)/2});}
 }
 return out;
}

// ---------- P5: quebra de estrutura (BOS), L = 6 ----------
/** +1 se fecha acima do último topo confirmado com o fechamento anterior ainda abaixo dele; −1 espelho. */
export function breakOfStructure(candles:readonly Candle[],L=6):Int8Array{
 const out=new Int8Array(candles.length),pivots=confirmedPivots(candles,L);
 let next=0,high:number|null=null,low:number|null=null;
 for(let i=0;i<candles.length;i++){
  while(next<pivots.length&&pivots[next].confirmedAt<=i){if(pivots[next].kind==='HIGH')high=pivots[next].price;else low=pivots[next].price;next++;}
  if(i===0)continue;
  if(high!==null&&candles[i].close>high&&candles[i-1].close<high)out[i]=1;
  else if(low!==null&&candles[i].close<low&&candles[i-1].close>low)out[i]=-1;
 }
 return out;
}

// ---------- regras comuns ----------
/** Sanidade de R: |entrada − stop| precisa ficar em [0,25; 4]·ATR da vela do sinal; alvo padrão de 2R e limite de 48 velas. */
function intent(side:1|-1,entry:number,stop:number,a:number,opts:{target?:number|null;maxBars?:number}={}):IctIntent|null{
 if(!Number.isFinite(a)||!Number.isFinite(stop)||!Number.isFinite(entry))return null;
 const r=side>0?entry-stop:stop-entry;if(!(r>0)||r<MIN_R*a||r>MAX_R*a)return null;
 const target=opts.target===null?undefined:opts.target??entry+side*DEFAULT_TARGET_R*r;
 if(target!==undefined&&!(side>0?target>entry:target<entry))return null;
 return {side,stop,target,maxBars:opts.maxBars??DEFAULT_MAX_BARS};
}

/** Zona de reteste. `inclusive`: a entrada aceita fechamento igual à borda (a leitura literal do H09B; H07 e H10 usam estrito). */
interface ZoneSpec {kind:string;side:1|-1;bottom:number;top:number;level:number;from:number;until:number;created:number;inclusive:boolean;stop:(j:number)=>number}
interface Retest {touched:boolean;index:number;intent:IctIntent|null}
/**
 * Varre a zona da vela `from` até `until`. Compra: anulada se a vela fecha abaixo de `bottom` (mesmo que a mínima tenha alcançado o nível);
 * toque quando a mínima alcança `level`; entrada se a vela fecha acima de `bottom`. Venda: espelho. A zona é consumida no primeiro toque.
 */
function retest(candles:readonly Candle[],range:readonly number[],z:ZoneSpec):Retest{
 for(let j=z.from;j<=Math.min(z.until,candles.length-1);j++){
  const c=candles[j];
  if(z.side>0){
   if(c.close<z.bottom)return {touched:false,index:j,intent:null};
   if(c.low<=z.level)return {touched:true,index:j,intent:(z.inclusive?c.close>=z.bottom:c.close>z.bottom)?intent(1,c.close,z.stop(j),range[j]):null};
  }else{
   if(c.close>z.top)return {touched:false,index:j,intent:null};
   if(c.high>=z.level)return {touched:true,index:j,intent:(z.inclusive?c.close<=z.top:c.close<z.top)?intent(-1,c.close,z.stop(j),range[j]):null};
  }
 }
 return {touched:false,index:-1,intent:null};
}
/** Resolve as zonas da mais antiga para a mais nova: a mais antiga tocada numa vela fica com ela (mesmo sem sinal); as outras são consumidas. */
function resolve(candles:readonly Candle[],range:readonly number[],zones:ZoneSpec[],result:IctResult){
 const claimed=new Set<number>();
 for(const z of [...zones].sort((a,b)=>a.created-b.created)){
  const r=retest(candles,range,z),stat:ZoneStat={kind:z.kind,created:z.created,side:z.side,touched:r.touched,entered:false};
  result.zones.push(stat);
  if(!r.touched||claimed.has(r.index))continue;
  claimed.add(r.index);
  if(r.intent){result.signals[r.index]=r.intent;stat.entered=true;}
 }
}

// ---------- H07: Order Block ----------
export function orderBlocks(candles:readonly Candle[],opts:{k:number;bos:0|1}):IctResult{
 const n=candles.length,range=atr(candles,ICT_ATR_BARS),disp=displacement(candles,range,opts.k),bos=breakOfStructure(candles,6),result=empty(n),zones:ZoneSpec[]=[];
 for(let i=1;i<n;i++){
  const side=disp[i];if(!side||(opts.bos===1&&bos[i]!==side))continue;
  // De i−1 para trás, por no máximo 5 velas, a primeira vela contrária ao deslocamento.
  let ob=-1;for(let j=i-1;j>=Math.max(0,i-5);j--){if(side>0?candles[j].close<candles[j].open:candles[j].close>candles[j].open){ob=j;break;}}
  if(ob<0)continue;
  const bottom=candles[ob].low,top=candles[ob].high;
  zones.push({kind:'ORDER_BLOCK',side:side as 1|-1,bottom,top,level:side>0?top:bottom,from:i+1,until:i+72,created:i,inclusive:false,
   stop:j=>side>0?bottom-STOP_BUFFER*range[j]:top+STOP_BUFFER*range[j]});
 }
 resolve(candles,range,zones,result);
 return result;
}

// ---------- H09: Displacement ----------
/** Papel A (momentum): entra a favor da vela de deslocamento, stop além da própria vela, sem alvo, saída por tempo em 24 velas. */
export function displacementMomentum(candles:readonly Candle[],opts:{k:number}):IctResult{
 const n=candles.length,range=atr(candles,ICT_ATR_BARS),disp=displacement(candles,range,opts.k),result=empty(n);
 for(let i=0;i<n;i++){
  const side=disp[i];if(!side)continue;
  const stop=side>0?candles[i].low-STOP_BUFFER*range[i]:candles[i].high+STOP_BUFFER*range[i];
  result.signals[i]=intent(side as 1|-1,candles[i].close,stop,range[i],{target:null,maxBars:24});
 }
 return result;
}
/** Papel B (retração ao FVG): entrada na borda (EDGE) ou no meio (CE); stop além da vela de deslocamento (i−1). */
export function fvgRetracement(candles:readonly Candle[],opts:{k:number;entry:'EDGE'|'CE'}):IctResult{
 const n=candles.length,range=atr(candles,ICT_ATR_BARS),result=empty(n),zones:ZoneSpec[]=[];
 for(const f of fairValueGaps(candles,range,opts.k,0.25)){
  const i=f.created,level=opts.entry==='CE'?f.ce:f.side>0?f.top:f.bottom;
  zones.push({kind:'FVG_RETRACEMENT',side:f.side,bottom:f.bottom,top:f.top,level,from:i+1,until:i+24,created:i,inclusive:true,
   stop:j=>f.side>0?candles[i-1].low-STOP_BUFFER*range[j]:candles[i-1].high+STOP_BUFFER*range[j]});
 }
 resolve(candles,range,zones,result);
 return result;
}

// ---------- H10: Inverted FVG ----------
export function invertedFvg(candles:readonly Candle[],opts:{g:number;disp:0|1}):IctResult{
 const n=candles.length,range=atr(candles,ICT_ATR_BARS),disp=displacement(candles,range,1),result=empty(n),zones:ZoneSpec[]=[];
 for(const f of fairValueGaps(candles,range,1,opts.g)){
  // O FVG baixista vira IFVG altista na primeira vela que fecha acima de `top` (com disp = 1, e que seja de deslocamento altista)
  // em até 48 velas. Antes da inversão nada anula o FVG, e fechamentos comuns acima de `top` não o matam (Emenda 1, itens 1 e 10).
  let inverted=-1;
  for(let t=f.created+1;t<=Math.min(f.created+48,n-1);t++){
   const crossed=f.side<0?candles[t].close>f.top:candles[t].close<f.bottom;
   if(crossed&&(opts.disp===0||disp[t]===-f.side)){inverted=t;break;}
  }
  if(inverted<0)continue;
  const side=(-f.side) as 1|-1,level=side>0?f.top:f.bottom;
  // A idade da zona conta da inversão (Emenda 2), que é quando ela passa a existir como IFVG.
  zones.push({kind:'INVERTED_FVG',side,bottom:f.bottom,top:f.top,level,from:inverted+1,until:inverted+24,created:inverted,inclusive:false,
   stop:j=>side>0?f.bottom-STOP_BUFFER*range[j]:f.top+STOP_BUFFER*range[j]});
 }
 resolve(candles,range,zones,result);
 return result;
}

// ---------- H08: Liquidity Sweep ----------
export function liquiditySweeps(candles:readonly Candle[],opts:{L:number;r:number}):IctResult{
 const n=candles.length,range=atr(candles,ICT_ATR_BARS),pivots=confirmedPivots(candles,opts.L),result=empty(n);
 type Level={price:number;confirmedAt:number};
 const lows:Level[]=[],highs:Level[]=[];let next=0;
 type Pending={side:1|-1;level:number;atr:number;start:number;extreme:number;event:SweepEvent};
 const pending:Pending[]=[];
 for(let i=0;i<n;i++){
  const c=candles[i],a=range[i];
  // Níveis vencidos (mais de 168 velas desde a confirmação) saem.
  for(const list of [lows,highs])for(let k=list.length-1;k>=0;k--)if(i-list[k].confirmedAt>168)list.splice(k,1);
  // Varredura na vela i: todos os níveis tomados são consumidos; o sinal vale só para o mais raso dentro de 1 ATR (Emenda 1, item 2).
  if(Number.isFinite(a)){
   const swept=lows.filter(l=>c.low<l.price);
   for(const l of swept)lows.splice(lows.indexOf(l),1);
   const inside=swept.filter(l=>c.low>=l.price-a);
   if(inside.length){const level=Math.min(...inside.map(l=>l.price)),event:SweepEvent={index:i,side:1,resumedAt:null};result.events.push(event);pending.push({side:1,level,atr:a,start:i,extreme:c.low,event});}
   const sweptHigh=highs.filter(l=>c.high>l.price);
   for(const l of sweptHigh)highs.splice(highs.indexOf(l),1);
   const insideHigh=sweptHigh.filter(l=>c.high<=l.price+a);
   if(insideHigh.length){const level=Math.max(...insideHigh.map(l=>l.price)),event:SweepEvent={index:i,side:-1,resumedAt:null};result.events.push(event);pending.push({side:-1,level,atr:a,start:i,extreme:c.high,event});}
  }
  // Retomada: alguma vela em [i, i+r−1] fecha de volta além do nível, sem fechamento anterior além de 1 ATR da varredura.
  // As pendências são resolvidas da mais antiga para a mais nova; a mais antiga fica com a vela, mesmo sem sinal (Emenda 2).
  let claimed=false;
  for(let k=0;k<pending.length;){
   const p=pending[k];
   if(i>p.start+opts.r-1){pending.splice(k,1);continue;}
   p.extreme=p.side>0?Math.min(p.extreme,c.low):Math.max(p.extreme,c.high);
   const failed=p.side>0?c.close<p.level-p.atr:c.close>p.level+p.atr,resumed=p.side>0?c.close>p.level:c.close<p.level;
   if(failed){pending.splice(k,1);continue;}
   if(resumed){
    pending.splice(k,1);p.event.resumedAt=i;
    if(!claimed){
     claimed=true;
     const stop=p.side>0?p.extreme-STOP_BUFFER*a:p.extreme+STOP_BUFFER*a;
     result.signals[i]=intent(p.side,c.close,stop,a);
    }
    continue;
   }
   k++;
  }
  // Pivôs confirmados nesta vela entram depois da varredura; ficam no máximo os 10 mais recentes por lado.
  while(next<pivots.length&&pivots[next].confirmedAt<=i){
   const pv=pivots[next++],list=pv.kind==='LOW'?lows:highs;list.push({price:pv.price,confirmedAt:pv.confirmedAt});
   while(list.length>10)list.shift();
  }
 }
 return result;
}

// ---------- H11: Internal Range Liquidity ----------
export function internalRangeLiquidity(candles:readonly Candle[],opts:{N:number;L:number}):IctResult{
 const n=candles.length,range=atr(candles,ICT_ATR_BARS),pivots=confirmedPivots(candles,opts.L),result=empty(n);
 type Live={index:number;price:number};
 const lows:Live[]=[],highs:Live[]=[];let next=0;
 for(let i=0;i<n;i++){
  const c=candles[i],a=range[i];
  // O nível é consumido na primeira vela cuja mínima (máxima) fica além dele, com ou sem retomada, com ou sem sinal (Emenda 1, item 11).
  const brokenLows=lows.filter(l=>c.low<l.price),brokenHighs=highs.filter(l=>c.high>l.price);
  for(const l of brokenLows)lows.splice(lows.indexOf(l),1);
  for(const l of brokenHighs)highs.splice(highs.indexOf(l),1);
  for(const list of [lows,highs])for(let k=list.length-1;k>=0;k--)if(list[k].index<i-168)list.splice(k,1);
  if(i>=opts.N&&Number.isFinite(a)){
   let rh=-Infinity,rl=Infinity;for(let k=i-opts.N;k<i;k++){if(candles[k].high>rh)rh=candles[k].high;if(candles[k].low<rl)rl=candles[k].low;}
   const w=rh-rl;
   if(w>=6*a){
    // Fundo interno na metade de baixo (discount): varrido e retomado na mesma vela, com até 1 ATR de profundidade.
    const buy=brokenLows.some(l=>l.index>=i-opts.N&&l.price>=rl+0.1*w&&l.price<=rl+0.5*w&&c.close>l.price&&l.price-c.low<=a);
    const sell=brokenHighs.some(l=>l.index>=i-opts.N&&l.price<=rh-0.1*w&&l.price>=rh-0.5*w&&c.close<l.price&&c.high-l.price<=a);
    if(buy)result.events.push({index:i,side:1,resumedAt:i});
    if(sell)result.events.push({index:i,side:-1,resumedAt:i});
    // Uma vela, um sinal: a compra é avaliada antes da venda. Alvo na liquidez externa, que exige 1,5R ou mais.
    if(buy){
     const stop=c.low-STOP_BUFFER*a,r=c.close-stop;
     if(r>0&&(rh-c.close)/r>=1.5)result.signals[i]=intent(1,c.close,stop,a,{target:rh,maxBars:72});
    }else if(sell){
     const stop=c.high+STOP_BUFFER*a,r=stop-c.close;
     if(r>0&&(c.close-rl)/r>=1.5)result.signals[i]=intent(-1,c.close,stop,a,{target:rl,maxBars:72});
    }
   }
  }
  while(next<pivots.length&&pivots[next].confirmedAt<=i){const pv=pivots[next++];(pv.kind==='LOW'?lows:highs).push({index:pv.index,price:pv.price});}
 }
 return result;
}
