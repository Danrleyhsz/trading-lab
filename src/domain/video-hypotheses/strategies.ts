import type {Candle} from '../backtest.js';
import type {Decision,SignalStrategy} from '../signal-backtest.js';
import {atr,returnStd,rollingExtremes,rollingVwap,sessionVwap,sma} from './indicators.js';

/**
 * Hipóteses H01 a H05 de docs/research/video-strategy-hypotheses.md em regras determinísticas (protocolo
 * VIDEO_HYPOTHESES_V1, docs/PROTOCOLO_HIPOTESES_VIDEO.md). Cada estratégia pré-calcula indicadores causais e decide no
 * fechamento da vela i usando só as velas 0..i. A H06 (calendário) depende da janela de treino e fica em calendar.ts.
 */
export type Family='H01_FIBONACCI'|'H02_MA_DEVIATION'|'H03_VWAP'|'H04_SUPPORT_RESISTANCE'|'H04_V2_SUPPORT_RESISTANCE'|'H05_FLAG';
export interface HypothesisConfig {id:string;family:Family;params:Record<string,number|string>}
const ATR_BARS=24;

// ---------- H03 VWAP ----------
function vwapOf(candles:readonly Candle[],anchor:string){return anchor==='SESSION'?sessionVwap(candles):rollingVwap(candles,anchor==='ROLL168'?168:24);}
function vwapTrend(candles:readonly Candle[],p:Record<string,number|string>):SignalStrategy{
 const vwap=vwapOf(candles,String(p.anchor));
 // Papel A (regime): comprado acima do VWAP, vendido abaixo; troca de lado quando o fechamento cruza.
 return (i,pos)=>{if(!Number.isFinite(vwap[i]))return null;const side=candles[i].close>vwap[i]?1:candles[i].close<vwap[i]?-1:0;return side&&side!==pos?.side?{side:side as 1|-1}:null;};
}
function vwapReversion(candles:readonly Candle[],p:Record<string,number|string>):SignalStrategy{
 const vwap=vwapOf(candles,String(p.anchor)),sd=returnStd(candles,24),range=atr(candles,ATR_BARS),k=Number(p.k);
 // Papel B (reversão): distância ao VWAP em unidades da volatilidade diária; sai ao cruzar o VWAP ou em 24 h.
 return (i,pos)=>{
  const c=candles[i].close;if(!Number.isFinite(vwap[i])||!Number.isFinite(sd[i])||!Number.isFinite(range[i])||sd[i]<=0)return null;
  const z=(c-vwap[i])/vwap[i]/(sd[i]*Math.sqrt(24));
  if(pos)return (pos.side>0&&c>=vwap[i])||(pos.side<0&&c<=vwap[i])?'EXIT':null;
  return z<-k?{side:1,stop:c-3*range[i],maxBars:24}:z>k?{side:-1,stop:c+3*range[i],maxBars:24}:null;
 };
}
function vwapRetest(candles:readonly Candle[],p:Record<string,number|string>):SignalStrategy{
 const vwap=sessionVwap(candles),range=atr(candles,ATR_BARS),tol=Number(p.tolerance),signal=new Array<Decision>(candles.length).fill(null);
 // Papel C (rompimento e reteste): cruza o VWAP, volta a tocá-lo em até 12 velas e fecha do lado do rompimento.
 let armed=0,armedUntil=-1;
 for(let i=1;i<candles.length;i++){
  const v=vwap[i],c=candles[i];if(!Number.isFinite(v)||!Number.isFinite(vwap[i-1])||!Number.isFinite(range[i]))continue;
  if(armed&&i>armedUntil)armed=0;
  if(armed>0&&c.low<=v*(1+tol)&&c.close>v){signal[i]={side:1,stop:Math.min(c.low,v)-0.5*range[i],maxBars:24};armed=0;continue;}
  if(armed<0&&c.high>=v*(1-tol)&&c.close<v){signal[i]={side:-1,stop:Math.max(c.high,v)+0.5*range[i],maxBars:24};armed=0;continue;}
  if(candles[i-1].close<=vwap[i-1]&&c.close>v){armed=1;armedUntil=i+12;}else if(candles[i-1].close>=vwap[i-1]&&c.close<v){armed=-1;armedUntil=i+12;}
 }
 return (i,pos)=>{if(pos)return (pos.side>0&&candles[i].close<vwap[i])||(pos.side<0&&candles[i].close>vwap[i])?'EXIT':null;return signal[i];};
}

// ---------- H02 desvio percentual da média ----------
function maDeviation(candles:readonly Candle[],p:Record<string,number|string>):SignalStrategy{
 const n=Number(p.period),closes=candles.map(c=>c.close),mean=sma(closes,n),sd=returnStd(candles,n),range=atr(candles,ATR_BARS),mode=String(p.mode);
 const dev=closes.map((c,i)=>(c-mean[i])/mean[i]);
 const threshold=(i:number)=>p.threshold==='VOL'?2*sd[i]*Math.sqrt(n):Number(p.threshold);
 // Entra só na vela em que o desvio cruza o limite; sai quando o desvio volta a zero, por stop de 3 ATR ou em 48 h.
 return (i,pos)=>{
  const th=threshold(i);if(i<1||!Number.isFinite(dev[i])||!Number.isFinite(dev[i-1])||!Number.isFinite(th)||!Number.isFinite(range[i]))return null;
  if(pos)return Math.sign(dev[i])!==Math.sign(dev[pos.entryIndex-1]??dev[i])&&Math.sign(dev[i])!==0?'EXIT':null;
  const c=candles[i].close,below=dev[i]< -th&&dev[i-1]>= -th,above=dev[i]>th&&dev[i-1]<=th;
  const side=mode==='REVERSION'?(below?1:above?-1:0):(above?1:below?-1:0);
  return side?{side:side as 1|-1,stop:c-side*3*range[i],maxBars:48}:null;
 };
}

// ---------- H01 Fibonacci automático ----------
function fibonacci(candles:readonly Candle[],p:Record<string,number|string>):SignalStrategy{
 const n=Number(p.lookback),level=Number(p.level),{hi,lo,hiAt,loAt}=rollingExtremes(candles,n),range=atr(candles,ATR_BARS),signal=new Array<Decision>(candles.length).fill(null);
 // Perna de impulso = máxima e mínima da janela, com tamanho de pelo menos 4 ATR. Entrada no toque do nível de retração
 // com fechamento de volta a favor da tendência; stop além da origem (100%), alvo no extremo (0%), limite de 72 h.
 // Uma entrada por perna: a perna é identificada pelos índices da máxima e da mínima.
 const traded=new Set<string>();
 for(let i=n;i<candles.length;i++){
  const H=hi[i],L=lo[i],a=range[i],c=candles[i];if(!Number.isFinite(a)||H-L<4*a)continue;
  const key=`${hiAt[i]}:${loAt[i]}`;if(traded.has(key))continue;
  if(loAt[i]<hiAt[i]&&hiAt[i]<i){const price=H-level*(H-L);if(c.low<=price&&c.close>price&&c.close>L){signal[i]={side:1,stop:L-0.1*a,target:H,maxBars:72};traded.add(key);}}
  else if(hiAt[i]<loAt[i]&&loAt[i]<i){const price=L+level*(H-L);if(c.high>=price&&c.close<price&&c.close<H){signal[i]={side:-1,stop:H+0.1*a,target:L,maxBars:72};traded.add(key);}}
 }
 return (i,pos)=>pos?null:signal[i];
}

// ---------- H05 bandeira ----------
function flag(candles:readonly Candle[],p:Record<string,number|string>):SignalStrategy{
 const impulseBars=Number(p.impulseBars),maxDepth=Number(p.depth),range=atr(candles,ATR_BARS),signal=new Array<Decision>(candles.length).fill(null),used=new Set<number>();
 // Mastro: variação de pelo menos 4 ATR em `impulseBars` velas. Bandeira: 4 a 24 velas depois, recuo de no máximo `depth`
 // do mastro e amplitude de no máximo metade dele. Rompimento: fechamento além da bandeira. Stop no outro lado da
 // bandeira, alvo = rompimento + tamanho do mastro, limite de 48 h. Um sinal por mastro.
 for(let t=impulseBars+5;t<candles.length;t++){
  const c=candles[t];
  for(let f=4;f<=24;f++){
   const e=t-f,s=e-impulseBars;if(s<0)break;const a=range[e];if(!Number.isFinite(a)||used.has(e))continue;
   const move=candles[e].close-candles[s].close;if(Math.abs(move)<4*a)continue;
   let fh=-Infinity,fl=Infinity;for(let k=e+1;k<t;k++){fh=Math.max(fh,candles[k].high);fl=Math.min(fl,candles[k].low);}
   if(fh-fl>0.5*Math.abs(move))continue;
   if(move>0&&(candles[e].close-fl)/move<=maxDepth&&c.close>fh){signal[t]={side:1,stop:fl,target:c.close+move,maxBars:48};used.add(e);break;}
   if(move<0&&(fh-candles[e].close)/-move<=maxDepth&&c.close<fl){signal[t]={side:-1,stop:fh,target:c.close+move,maxBars:48};used.add(e);break;}
  }
 }
 return (i,pos)=>pos?null:signal[i];
}

// ---------- H04 suporte e resistência estatísticos ----------
export interface ZoneTouchStat {time:number;zoneType:'SUPPORT'|'RESISTANCE';priorEligible:number;priorHoldRate:number|null;outcome:'HOLD'|'BREAK'|'NONE'}
interface Zone {type:'SUPPORT'|'RESISTANCE';top:number;bottom:number;created:number;eligible:number;holds:number;pending:{at:number;stat:ZoneTouchStat}|null;broken:boolean}
/** Zonas de pivôs confirmados e estatística de retestes, tudo no ponto do tempo (sem pivô futuro, sem resultado futuro). */
export function supportResistance(candles:readonly Candle[],p:Record<string,number|string>){
 const L=Number(p.pivotBars),minRetests=Number(p.minRetests),minHold=Number(p.minHoldRate),range=atr(candles,ATR_BARS);
 // V1 descarta a zona no rompimento (então a taxa de acerto das zonas vivas é sempre 100%). V2 (emenda 1) mantém a zona:
 // o rompimento conta como reteste que falhou e a zona só sai pela idade, como na estatística "Held %" do vídeo.
 const keepBroken=p.keepBroken===1;
 const zones:Zone[]=[],signal=new Array<Decision>(candles.length).fill(null),touches:ZoneTouchStat[]=[];
 for(let i=0;i<candles.length;i++){
  const c=candles[i],a=range[i];
  // 1) Resolve retestes pendentes: segura se fechar 0,5 ATR além da zona em até 12 velas antes de fechar do outro lado.
  for(const z of zones){if(!z.pending||z.broken)continue;const age=i-z.pending.at,stat=z.pending.stat;
   const held=z.type==='SUPPORT'?c.close>z.top+0.5*(range[z.pending.at]||0):c.close<z.bottom-0.5*(range[z.pending.at]||0),broke=z.type==='SUPPORT'?c.close<z.bottom:c.close>z.top;
   if(broke){z.eligible++;z.broken=!keepBroken;z.pending=null;stat.outcome='BREAK';}else if(held){z.eligible++;z.holds++;z.pending=null;stat.outcome='HOLD';}else if(age>=12){z.pending=null;}}
  for(let k=zones.length-1;k>=0;k--)if(zones[k].broken||i-zones[k].created>720)zones.splice(k,1);
  // 2) Pivô em i-L confirmado agora (extremo das L velas antes e das L depois, todas já fechadas).
  const pv=i-L;if(pv>=L&&Number.isFinite(range[i])){let isHigh=true,isLow=true;for(let k=pv-L;k<=pv+L;k++){if(candles[k].high>candles[pv].high)isHigh=false;if(candles[k].low<candles[pv].low)isLow=false;}
   const w=0.5*range[i];if(isLow)zones.push({type:'SUPPORT',top:candles[pv].low+w,bottom:candles[pv].low-w,created:i,eligible:0,holds:0,pending:null,broken:false});
   if(isHigh)zones.push({type:'RESISTANCE',top:candles[pv].high+w,bottom:candles[pv].high-w,created:i,eligible:0,holds:0,pending:null,broken:false});
   for(const type of ['SUPPORT','RESISTANCE'] as const){const own=zones.filter(z=>z.type===type);if(own.length>20)zones.splice(zones.indexOf(own[0]),1);}}
  if(i===0||!Number.isFinite(a))continue;
  // 3) Toque: o preço chega à zona vindo do lado certo; com histórico suficiente e taxa de acerto, sinal no fechamento.
  for(const z of zones){if(z.pending||z.created===i)continue;
   const touch=z.type==='SUPPORT'?c.low<=z.top&&candles[i-1].close>z.top:c.high>=z.bottom&&candles[i-1].close<z.bottom;if(!touch)continue;
   const rate=z.eligible?z.holds/z.eligible:null,stat:ZoneTouchStat={time:c.timestamp,zoneType:z.type,priorEligible:z.eligible,priorHoldRate:rate,outcome:'NONE'};touches.push(stat);z.pending={at:i,stat};
   if(!signal[i]&&z.eligible>=minRetests&&rate!==null&&rate>=minHold){
    if(z.type==='SUPPORT'&&c.close>z.bottom){const stop=z.bottom-0.25*a;signal[i]={side:1,stop,target:c.close+2*(c.close-stop),maxBars:48};}
    if(z.type==='RESISTANCE'&&c.close<z.top){const stop=z.top+0.25*a;signal[i]={side:-1,stop,target:c.close-2*(stop-c.close),maxBars:48};}}
  }
 }
 return {strategy:((i,pos)=>pos?null:signal[i]) as SignalStrategy,touches};
}

/** Grade pré-declarada (VIDEO_HYPOTHESES_V1). Os valores observados nos vídeos estão marcados no protocolo. */
export const HYPOTHESIS_GRID:HypothesisConfig[]=[
 ...['ROLL24','ROLL168','SESSION'].map(anchor=>({id:`H03A_${anchor}`,family:'H03_VWAP' as const,params:{role:'TREND',anchor}})),
 ...['ROLL24','SESSION'].flatMap(anchor=>[1,2].map(k=>({id:`H03B_${anchor}_K${k}`,family:'H03_VWAP' as const,params:{role:'REVERSION',anchor,k}}))),
 ...[0.001,0.003].map(tolerance=>({id:`H03C_TOL${tolerance}`,family:'H03_VWAP' as const,params:{role:'RETEST',tolerance}})),
 ...[12,24].flatMap(pivotBars=>[1,2].flatMap(minRetests=>[0.5,0.67].map(minHoldRate=>({id:`H04_P${pivotBars}_M${minRetests}_H${minHoldRate}`,family:'H04_SUPPORT_RESISTANCE' as const,params:{pivotBars,minRetests,minHoldRate}})))),
 ...['REVERSION','MOMENTUM'].flatMap(mode=>[25,50].flatMap(period=>[0.02,0.03,0.04,'VOL'].map(threshold=>({id:`H02_${mode}_N${period}_${threshold}`,family:'H02_MA_DEVIATION' as const,params:{mode,period,threshold}})))),
 ...[48,168].flatMap(lookback=>[0.236,0.382,0.5,0.618].map(level=>({id:`H01_N${lookback}_L${level}`,family:'H01_FIBONACCI' as const,params:{lookback,level}}))),
 ...[6,12].flatMap(impulseBars=>[0.382,0.5].map(depth=>({id:`H05_I${impulseBars}_D${depth}`,family:'H05_FLAG' as const,params:{impulseBars,depth}}))),
];
/** Emenda 1 (declarada em docs/PROTOCOLO_HIPOTESES_VIDEO.md antes de rodar): H04 com zonas que sobrevivem ao rompimento. */
export const AMENDMENT_1_GRID:HypothesisConfig[]=[12,24].flatMap(pivotBars=>[1,2].flatMap(minRetests=>[0.5,0.67].map(minHoldRate=>({id:`H04V2_P${pivotBars}_M${minRetests}_H${minHoldRate}`,family:'H04_V2_SUPPORT_RESISTANCE' as const,params:{pivotBars,minRetests,minHoldRate,keepBroken:1}}))));
export function buildStrategy(candles:readonly Candle[],config:HypothesisConfig):SignalStrategy{
 const p=config.params;
 switch(config.family){
  case 'H03_VWAP':return p.role==='TREND'?vwapTrend(candles,p):p.role==='REVERSION'?vwapReversion(candles,p):vwapRetest(candles,p);
  case 'H02_MA_DEVIATION':return maDeviation(candles,p);
  case 'H01_FIBONACCI':return fibonacci(candles,p);
  case 'H05_FLAG':return flag(candles,p);
  case 'H04_SUPPORT_RESISTANCE':case 'H04_V2_SUPPORT_RESISTANCE':return supportResistance(candles,p).strategy;
 }
}
