// Estudo BUSCA_EVENTOS_V1 (docs/PROTOCOLO_BUSCA_EVENTOS_V1.md): venda de listagens novas (B), reversão após funding extremo (C) e carry
// direcional no universo ponto no tempo (A), no pool completo de 543 perpétuas. Só dados públicos já baixados; não envia ordens.
// Uso: npx tsx scripts/estudos/eventos.ts
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';
import {simulateLean,px,type LeanBook,type LeanData} from './lean-sim.js';
import {loadPool,universeFactory,type Loaded} from './pool-completo.js';
import {lastBarOf} from './mom-metade.js';
import {pct,corr} from './fatores.js';

const H=3600000,FIRST=Date.UTC(2021,11,4,0),SQRT_YEAR=Math.sqrt(24*365);
export const BUSCA=Object.freeze({version:'BUSCA_EVENTOS_V1',declaredAt:'2026-10-09',initialCapital:10000,feeRate:0.00055,
 B:{id:'NEW_LISTING_FADE_V1',entryDelayHours:168,holdHours:672,stopAdverse:0.5,fraction:0.01,slippageBps:10,firstEventBefore:Date.UTC(2025,7,31,23)},
 C:{id:'FUNDING_EXTREME_REVERSAL_V1',threshold:0.001,holdHours:24,stopAdverse:0.3,fraction:0.005,slippageBps:5},
 grossCap:0.5,maxMonthlyTStat:3,minimumEvents:150,minimumYearEvents:10,maximumDrawdown:0.15,usableShare:0.9});
const B=BUSCA;

// ---------- motor de eventos ----------
export interface Ev {k:number;entryBar:number;exitBar:number;side:1|-1;fraction:number;stop:number;
 /** Perna de hedge: mesma quantia em valor, lado oposto, na moeda `hedgeK`; fecha junto com a perna principal (inclusive no stop). */
 hedgeK?:number;id?:number}
export interface EvResult {k:number;entryBar:number;exitBar:number;side:1|-1;ret:number;pnl:number;reason:'time'|'stop'|'end';funding:number;id?:number;notional:number;hedge:boolean}
export interface EvSim {results:EvResult[];skipped:number;equity:{timestamp:number;equity:number}[];finalEquity:number;maxDrawdown:number;minEquity:number}
export interface EvOptions {fee:number;slippageBps:number;initial:number;startBar:number;endBar:number;grossCap:number;
 /** Slippage da perna de hedge (padrão: o mesmo da principal). */
 hedgeSlippageBps?:number;
 /** Máxima da hora da moeda `k` na vela `i`; se presente, o stop de venda é testado pela máxima (senão, pelo fechamento). */
 high?:(k:number,i:number)=>number}
/** Simula eventos de perpétuo (compra ou venda) com tamanho proporcional ao patrimônio, taxas, slippage, funding real, hedge opcional e stop. */
export function simulateEvents(L:Pick<Loaded,'lean'|'last'>,evs:Ev[],o:EvOptions):EvSim{
 const d=L.lean,byBar=new Map<number,Ev[]>();
 for(const e of evs){const a=byBar.get(e.entryBar)??[];a.push(e);byBar.set(e.entryBar,a);}
 for(const a of byBar.values())a.sort((x,y)=>x.k-y.k);
 type Pos={e:Ev;qty:number;entry:number;raw:number;j:number;fund:number;slip:number;hedge:boolean};
 const open:Pos[]=[],results:EvResult[]=[],equitySeries:{timestamp:number;equity:number}[]=[];
 let cash=o.initial,skipped=0,peak=o.initial,maxDD=0,minEq=o.initial,equity=o.initial;
 const close=(p:Pos,price:number,reason:EvResult['reason'],bar:number)=>{
  const exit=price*(1-p.e.side*p.slip),gross=p.e.side*p.qty*(exit-p.entry),fees=o.fee*p.qty*exit;cash+=gross-fees;
  const pnl=gross-o.fee*p.qty*p.entry-fees+p.fund;results.push({k:p.e.k,entryBar:p.e.entryBar,exitBar:bar,side:p.e.side,ret:pnl/(p.qty*p.entry),pnl,reason,funding:p.fund,id:p.e.id,notional:p.qty*p.entry,hedge:p.hedge});
 };
 const slipMain=o.slippageBps/10000,slipHedge=(o.hedgeSlippageBps??o.slippageBps)/10000;
 const px0=(arr:Float64Array[],k:number,i:number)=>px(arr[k],d.first![k],i);
 for(let i=o.startBar;i<=o.endBar;i++){
  const t=d.timestamps[i];
  // saídas no tempo, na abertura
  for(let n=open.length-1;n>=0;n--){const p=open[n];if(p.e.exitBar===i){close(p,px0(d.open,p.e.k,i),'time',i);open.splice(n,1);}}
  // entradas, na abertura (a perna principal e, se houver, o hedge)
  for(const e of byBar.get(i)??[]){
   const f=d.first![e.k];if(i<f||i>L.last[e.k])continue;
   if(e.hedgeK!==undefined&&(i<d.first![e.hedgeK]||i>L.last[e.hedgeK]))continue;
   const raw=px0(d.open,e.k,i),entry=raw*(1+e.side*slipMain);let gross=0;for(const p of open)gross+=p.qty*p.entry;
   const qty=e.fraction*equity/entry,legs=e.hedgeK!==undefined?2:1;if(!(qty>0)||(gross+legs*qty*entry)>o.grossCap*equity){skipped++;continue;}
   const fund=(k:number)=>{let j=0;const list=d.funding[k];while(j<list.length&&list[j].timestamp<t)j++;return j;};
   cash-=o.fee*qty*entry;open.push({e,qty,entry,raw,j:fund(e.k),fund:0,slip:slipMain,hedge:false});
   if(e.hedgeK!==undefined){
    const rawH=px0(d.open,e.hedgeK,i),side=(-e.side) as 1|-1,entryH=rawH*(1+side*slipHedge),qtyH=qty*entry/entryH;
    cash-=o.fee*qtyH*entryH;open.push({e:{k:e.hedgeK,entryBar:e.entryBar,exitBar:e.exitBar,side,fraction:e.fraction,stop:Infinity,id:e.id},qty:qtyH,entry:entryH,raw:rawH,j:fund(e.hedgeK),fund:0,slip:slipHedge,hedge:true});
   }
  }
  // funding, stop e fim da série
  const stopped=new Set<number>();
  for(const p of open){
   const list=d.funding[p.e.k];
   while(p.j<list.length&&list[p.j].timestamp<t+H){const x=list[p.j];if(x.timestamp>=t){const dlt=-p.e.side*p.qty*x.markPrice*x.rate;cash+=dlt;p.fund+=dlt;}p.j++;}
  }
  for(let n=open.length-1;n>=0;n--){
   const p=open[n];if(!Number.isFinite(p.e.stop))continue;
   const f=d.first![p.e.k],c=px(d.close[p.e.k],f,i);let hit=false,price=c;
   if(o.high&&p.e.side===-1){const h=o.high(p.e.k,i),trigger=p.raw*(1+p.e.stop);if(h>=trigger){hit=true;price=Math.max(px(d.open[p.e.k],f,i),trigger);}}
   else{const adverse=p.e.side===-1?c/p.raw-1:1-c/p.raw;if(adverse>=p.e.stop)hit=true;}
   if(hit){close(p,price,'stop',i);open.splice(n,1);if(p.e.id!==undefined)stopped.add(p.e.id);}
  }
  for(let n=open.length-1;n>=0;n--){
   const p=open[n],c=px0(d.close,p.e.k,i);
   if(p.e.id!==undefined&&stopped.has(p.e.id)){close(p,c,'stop',i);open.splice(n,1);}
   else if(i===L.last[p.e.k]){close(p,c,'end',i);open.splice(n,1);}
  }
  equity=cash;for(const p of open)equity+=p.e.side*p.qty*(px0(d.close,p.e.k,i)-p.entry);
  equitySeries.push({timestamp:t,equity});peak=Math.max(peak,equity);maxDD=Math.max(maxDD,peak>0?1-equity/peak:1);minEq=Math.min(minEq,equity);
  if(equity<=0)break;
 }
 return {results,skipped,equity:equitySeries,finalEquity:equity,maxDrawdown:maxDD,minEquity:minEq};
}/** Média, erro-padrão agrupado por mês (CR0) e estatística t. */
export function clusteredT(rets:number[],clusters:string[]){
 const n=rets.length,m=rets.reduce((a,b)=>a+b,0)/n,by=new Map<string,number>();
 rets.forEach((r,i)=>by.set(clusters[i],(by.get(clusters[i])??0)+(r-m)));
 const v=[...by.values()].reduce((s,x)=>s+x*x,0)/(n*n);return {mean:m,se:Math.sqrt(v),t:v>0?m/Math.sqrt(v):0,clusters:by.size};
}
const quantile=(v:number[],q:number)=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(q*s.length))]:NaN;};
const monthOf=(L:Pick<Loaded,'lean'>,bar:number)=>new Date(L.lean.timestamps[bar]).toISOString().slice(0,7);
const yearOf=(L:Pick<Loaded,'lean'>,bar:number)=>new Date(L.lean.timestamps[bar]).getUTCFullYear();

function summarize(L:Loaded,sim:EvSim,costX3:EvSim,btc?:{k:number}){
 const r=sim.results,rets=r.map(x=>x.ret),cl=clusteredT(rets,r.map(x=>monthOf(L,x.entryBar))),byYear:Record<string,{n:number;mean:number}>={};
 for(const y of [...new Set(r.map(x=>yearOf(L,x.entryBar)))].sort()){const s=r.filter(x=>yearOf(L,x.entryBar)===y).map(x=>x.ret);byYear[y]={n:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length};}
 const sorted=[...rets].sort((a,b)=>a-b),cut=Math.floor(sorted.length*0.01),trimmed=sorted.slice(cut,sorted.length-cut);
 const m3=costX3.results.map(x=>x.ret),byCoin:Record<string,number>={};for(const x of r)byCoin[L.lean.symbols[x.k]]=(byCoin[L.lean.symbols[x.k]]??0)+x.pnl;
 const coinList=Object.entries(byCoin).sort((a,b)=>a[1]-b[1]);
 let hedged:number|null=null;
 if(btc){const k=btc.k,f=L.lean.first![k];const rb=r.map(x=>{const a=px(L.lean.open[k],f,x.entryBar),b=px(L.lean.open[k],f,Math.max(x.exitBar,x.entryBar));return x.ret-x.side*(b/a-1)-2*(B.feeRate+0.0002);});hedged=rb.reduce((a,b)=>a+b,0)/rb.length;}
 return {events:r.length,skipped:sim.skipped,mean:cl.mean,tStat:cl.t,clusters:cl.clusters,median:quantile(rets,0.5),hitRate:rets.filter(x=>x>0).length/rets.length,worst:sorted[0],best:sorted.at(-1),trimmedMean:trimmed.reduce((a,b)=>a+b,0)/trimmed.length,
  byYear,meanCostsX3:m3.reduce((a,b)=>a+b,0)/m3.length,stops:r.filter(x=>x.reason==='stop').length,fundingMean:r.reduce((a,b)=>a+b.funding,0)/r.length,
  portfolio:{returnPct:sim.finalEquity/B.initialCapital-1,maxDrawdown:sim.maxDrawdown,minEquity:sim.minEquity},biggestLossCoins:coinList.slice(0,5).map(([s,v])=>[s,v]),biggestGainCoins:coinList.slice(-5).reverse().map(([s,v])=>[s,v]),meanHedgedBtcNoFunding:hedged};
}

// ---------- eventos ----------
export function listingEvents(L:Pick<Loaded,'lean'|'last'>,entryDelay:number,hold:number,lastEntryBar:number,spec=B.B):Ev[]{
 const out:Ev[]=[];
 for(let k=0;k<L.lean.symbols.length;k++){const f=L.lean.first![k];if(f<=0)continue;const entry=f+entryDelay;if(entry>lastEntryBar||entry>=L.last[k])continue;
  out.push({k,entryBar:entry,exitBar:Math.min(entry+hold,L.last[k]),side:-1,fraction:spec.fraction,stop:spec.stopAdverse});}
 return out.sort((a,b)=>a.entryBar-b.entryBar||a.k-b.k);
}
export function fundingEvents(L:Pick<Loaded,'lean'|'last'>,threshold:number,hold:number,start:number,sides:'both'|'short'|'long'='both',spec=B.C):Ev[]{
 const out:Ev[]=[];
 for(let k=0;k<L.lean.symbols.length;k++){
  let busyUntil=-1;
  for(const f of L.lean.funding[k]){
   if(Math.abs(f.rate)<threshold)continue;const side:1|-1=f.rate>0?-1:1;if(sides==='short'&&side===1||sides==='long'&&side===-1)continue;
   const entry=Math.floor((f.timestamp-FIRST)/H)+1;if(entry<start||entry<=busyUntil||entry>=L.last[k])continue;
   const exit=Math.min(entry+hold,L.last[k]);busyUntil=exit;out.push({k,entryBar:entry,exitBar:exit,side,fraction:spec.fraction,stop:spec.stopAdverse});
  }
 }
 return out.sort((a,b)=>a.entryBar-b.entryBar||a.k-b.k);
}

// ---------- família A ----------
function leanCarryScore(d:LeanData,hours=168){
 return (_d:LeanData,i:number)=>{
  const hi=d.timestamps[i]+H,lo=hi-hours*H,out=new Float64Array(d.symbols.length);
  for(let s=0;s<out.length;s++){
   const list=d.funding[s];let a=0,b=list.length;while(a<b){const m=(a+b)>>1;if(list[m].timestamp<hi)a=m+1;else b=m;}
   let sum=0;for(let j=a-1;j>=0&&list[j].timestamp>=lo;j--)sum+=list[j].rate;out[s]=-sum;
  }
  return out;
 };
}

function main(){
 const lastBar=lastBarOf(),bars=Math.round((lastBar-FIRST)/H)+1,start=Math.round((Date.UTC(2022,0,1)-FIRST)/H),L=loadPool(start,bars),usableShare=L.lean.symbols.length/543;
 console.log('pool utilizável',L.lean.symbols.length,'de 543',`(${(usableShare*100).toFixed(1)}%)`);
 const btc=L.lean.symbols.indexOf('BTCUSDT'),lastEntry=Math.round((B.B.firstEventBefore-FIRST)/H);
 const cfg=(slip:number,mult=1)=>({fee:B.feeRate*mult,slippageBps:slip*mult,initial:B.initialCapital,startBar:0,endBar:bars-1,grossCap:B.grossCap});
 const runFamily=(evs:Ev[],slip:number)=>{
  const first=evs.length?Math.min(...evs.map(e=>e.entryBar)):0,c=(m:number)=>({...cfg(slip,m),startBar:first});
  return {base:simulateEvents(L,evs,c(1)),x3:simulateEvents(L,evs,c(3))};
 };
 const checks=(s:ReturnType<typeof summarize>,family:string)=>{
  const years=Object.entries(s.byYear).filter(([,v])=>v.n>=B.minimumYearEvents);
  const c:Record<string,boolean>={DATA_QUALITY:usableShare>=B.usableShare,ENOUGH_EVENTS:s.events>=B.minimumEvents,SIGNIFICANT_MEAN:s.mean>0&&s.tStat>=B.maxMonthlyTStat,
   POSITIVE_YEARS:years.length>0&&years.every(([,v])=>v.mean>0),COSTS_X3:s.meanCostsX3>0,BOUNDED_DRAWDOWN:s.portfolio.maxDrawdown<=B.maximumDrawdown&&s.portfolio.minEquity>0};
  console.log(family.padEnd(30),'eventos',s.events,'média',pct(s.mean),'t',s.tStat.toFixed(2),'mediana',pct(s.median),'acerto',(s.hitRate*100).toFixed(0)+'%','pior',pct(s.worst),'x3',pct(s.meanCostsX3),'carteira',pct(s.portfolio.returnPct),'DD',(s.portfolio.maxDrawdown*100).toFixed(1)+'%',
   'anos',Object.entries(s.byYear).map(([y,v])=>y+':'+v.n+'/'+pct(v.mean)).join(' '),Object.entries(c).filter(([,v])=>!v).map(([k])=>k).join(','));
  return c;
 };
 // Família B
 const evB=listingEvents(L,B.B.entryDelayHours,B.B.holdHours,lastEntry),rb=runFamily(evB,B.B.slippageBps),sB=summarize(L,rb.base,rb.x3,{k:btc}),cB=checks(sB,'B NEW_LISTING_FADE (7d, 28d)');
 const variantsB=[{label:'Entrada em 3 dias',d:72,h:672},{label:'Entrada em 14 dias',d:336,h:672},{label:'Saída em 14 dias',d:168,h:336},{label:'Saída em 56 dias',d:168,h:1344}].map(v=>{
  const r=runFamily(listingEvents(L,v.d,v.h,lastEntry),B.B.slippageBps),s=summarize(L,r.base,r.x3,{k:btc});checks(s,'   B '+v.label);return {label:v.label,...s};});
 // Família C
 const evC=fundingEvents(L,B.C.threshold,B.C.holdHours,start),rc=runFamily(evC,B.C.slippageBps),sC=summarize(L,rc.base,rc.x3,{k:btc}),cC=checks(sC,'C FUNDING_EXTREME (±0,10%, 24h)');
 const variantsC=[{label:'Só vendas (funding alto)',th:B.C.threshold,sides:'short' as const},{label:'Só compras (funding muito negativo)',th:B.C.threshold,sides:'long' as const},{label:'Limite de ±0,05%',th:0.0005,sides:'both' as const},{label:'Limite de ±0,20%',th:0.002,sides:'both' as const}].map(v=>{
  const r=runFamily(fundingEvents(L,v.th,B.C.holdHours,start,v.sides),B.C.slippageBps),s=summarize(L,r.base,r.x3,{k:btc});checks(s,'   C '+v.label);return {label:v.label,...s};});
 // Família A
 const index=new Map(L.lean.symbols.map((s,k)=>[s,k]));void index;
 const eligible=universeFactory(L,start)(()=>true,30,'todas'),score=leanCarryScore(L.lean);
 const book=(frac:number):LeanBook[]=>[{score,legFraction:frac,longCount:5,shortCount:5,eligible}];
 const rule={lookbackHours:672,rebalanceHours:168,startBar:start,feeRate:B.feeRate,slippageBps:2,initialCapital:B.initialCapital,maxBars:60000};
 const a=simulateLean(L.lean,rule as any,book(0.025)),a2=simulateLean(L.lean,{...rule,feeRate:rule.feeRate*2,slippageBps:4} as any,book(0.025)),a5=simulateLean(L.lean,rule as any,book(0.05));
 const metricsA=(r:typeof a)=>{
  const returns=hourlyReturns(r.equitySeries),m=moments(returns),years:Record<string,{returnPct:number;maxDrawdown:number;partial:boolean}>={};
  for(const y of [2022,2023,2024,2025,2026]){const pts=r.equitySeries.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);if(pts.length<2)continue;
   const before=r.equitySeries.filter(p=>p.timestamp<pts[0].timestamp).at(-1)?.equity??B.initialCapital;let pk=-Infinity,dd=0;for(const p of pts){pk=Math.max(pk,p.equity);dd=Math.max(dd,1-p.equity/pk);}years[y]={returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd,partial:y===2026};}
  const basket=new Float64Array(r.equitySeries.length-1);
  for(let j=0;j<basket.length;j++){const t=start+j+1;let s=0,c=0;for(const k of eligible!(L.lean,t-1)){if(t>L.last[k])continue;const f=L.lean.first![k],p0=px(L.lean.close[k],f,t-1),p1=px(L.lean.close[k],f,t);if(p0>0&&p1>0){s+=p1/p0-1;c++;}}basket[j]=c?s/c:0;}
  const mine=returns.slice(0,basket.length),mm=mine.reduce((x,y)=>x+y,0)/mine.length,mb=basket.reduce((x,y)=>x+y,0)/basket.length;let cov=0,va=0,vb=0;for(let k=0;k<mine.length;k++){cov+=(mine[k]-mm)*(basket[k]-mb);va+=(mine[k]-mm)**2;vb+=(basket[k]-mb)**2;}
  const half=Date.UTC(2024,6,1),before=r.equitySeries.filter(p=>p.timestamp<half).at(-1)!.equity,halves={first:before-B.initialCapital,second:r.finalEquity-before};
  return {returnPct:r.netPnl/B.initialCapital,maxDrawdown:r.maxDrawdown,years,positiveYears:Object.values(years).filter(y=>!y.partial&&y.returnPct>0).length,sharpeAnnualized:m.sharpe*SQRT_YEAR,marketCorrelation:va>0&&vb>0?cov/Math.sqrt(va*vb):NaN,halves,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,closedLegs:r.closedLegs,netPnl:r.netPnl};
 };
 const MA=metricsA(a),checksA:Record<string,boolean>={DATA_QUALITY:usableShare>=B.usableShare,POSITIVE_PNL:MA.netPnl>0,BOUNDED_DRAWDOWN:MA.maxDrawdown<=B.maximumDrawdown,POSITIVE_YEARS:MA.positiveYears>=3,
  DOUBLED_COSTS_POSITIVE:a2.netPnl>0,MARKET_NEUTRAL:Math.abs(MA.marketCorrelation)<=0.3,BOTH_HALVES_POSITIVE:MA.halves.first>0&&MA.halves.second>0};
 console.log('A XS_CARRY_PIT (30, 2,5%)'.padEnd(30),pct(MA.returnPct),'DD',(MA.maxDrawdown*100).toFixed(1)+'%','anos+',MA.positiveYears,'x2',a2.netPnl.toFixed(0),'corr',MA.marketCorrelation.toFixed(2),'Sharpe',MA.sharpeAnnualized.toFixed(2),'5%:',pct(a5.netPnl/B.initialCapital),(a5.maxDrawdown*100).toFixed(1)+'%',Object.entries(checksA).filter(([,v])=>!v).map(([k])=>k).join(','));
 const verdictOf=(c:Record<string,boolean>)=>Object.values(c).every(Boolean)?'VALIDADA_HISTORICO':'NAO_VALIDADA';
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_BUSCA_EVENTOS_V1.md'],{encoding:'utf8'}).trim();
 const report={protocol:B,protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),pool:{usable:L.lean.symbols.length,usableShare,dropped:L.dropped},
  B:{verdict:verdictOf(cB),checks:cB,...sB,variants:variantsB},C:{verdict:verdictOf(cC),checks:cC,...sC,variants:variantsC},
  A:{verdict:verdictOf(checksA),checks:checksA,...MA,doubledPnl:a2.netPnl,fullSize:{returnPct:a5.netPnl/B.initialCapital,maxDrawdown:a5.maxDrawdown},momentumControlReturn:JSON.parse(readFileSync('docs/estudos/pool-completo-2026-10-09.json','utf8')).main.returnPct}};
 writeFileSync('docs/estudos/busca-eventos-2026-10-09.json',JSON.stringify(report,null,1));writeFileSync('docs/estudos/busca-eventos-2026-10-09.md',markdown(report));
 void corr;
}
function markdown(r:any){
 const ev=(f:any)=>[`| Eventos executados (pulados por limite de exposição) | ${f.events} (${f.skipped}) |`,`| Média líquida por evento (t agrupado por mês) | ${pct(f.mean)} (t = ${f.tStat.toFixed(2)}, ${f.clusters} meses) |`,`| Mediana / taxa de acerto | ${pct(f.median)} / ${(f.hitRate*100).toFixed(0)}% |`,
  `| Pior / melhor evento | ${pct(f.worst)} / ${pct(f.best)} |`,`| Média sem o pior e o melhor 1% | ${pct(f.trimmedMean)} |`,`| Média com custos x3 | ${pct(f.meanCostsX3)} |`,`| Stops acionados | ${f.stops} |`,`| Funding médio por evento (em dinheiro) | ${f.fundingMean.toFixed(2)} |`,
  `| Carteira simulada: retorno / queda máx. / patrimônio mínimo | ${pct(f.portfolio.returnPct)} / ${(f.portfolio.maxDrawdown*100).toFixed(1)}% / ${f.portfolio.minEquity.toFixed(0)} |`,
  `| Média por evento com hedge de BTC (sem funding do BTC) | ${f.meanHedgedBtcNoFunding===null?'n/d':pct(f.meanHedgedBtcNoFunding)} |`];
 const by=(f:any)=>Object.entries(f.byYear).map(([y,v]:[string,any])=>`${y}: ${v.n} eventos, ${pct(v.mean)}`).join('; ');
 const vt=(f:any)=>['| Variante | Eventos | Média | t | Mediana | Média x3 | Carteira | Queda máx. |','|---|---|---|---|---|---|---|---|',...f.variants.map((v:any)=>`| ${v.label} | ${v.events} | ${pct(v.mean)} | ${v.tStat.toFixed(2)} | ${pct(v.median)} | ${pct(v.meanCostsX3)} | ${pct(v.portfolio.returnPct)} | ${(v.portfolio.maxDrawdown*100).toFixed(1)}% |`)];
 const ck=(c:any)=>['| Critério | Passou |','|---|---|',...Object.entries(c).map(([k,v])=>`| ${k} | ${v?'sim':'não'} |`)];
 const A=r.A,yrs=['2022','2023','2024','2025','2026'];
 return [`# Resultado ${r.protocol.version}: três famílias novas no pool completo`,'',`Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M já baixados, pelo protocolo \`docs/PROTOCOLO_BUSCA_EVENTOS_V1.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Pool: ${r.pool.usable} perpétuas utilizáveis.`,'',
  '| Família | Veredito |','|---|---|',`| B · ${r.protocol.B.id} (vender listagens novas) | **${r.B.verdict}** |`,`| C · ${r.protocol.C.id} (reverter funding extremo) | **${r.C.verdict}** |`,`| A · XS_CARRY_PIT_V1 (carry direcional, universo ponto no tempo) | **${r.A.verdict}** |`,'',
  '## Família B · vender listagens novas (entrada 7 dias depois da listagem, saída em 28 dias, 1% por evento, stop em +50%)','',...ck(r.B.checks),'','| Medida | Valor |','|---|---|',...ev(r.B),'',`Por ano: ${by(r.B)}.`,'',...vt(r.B),'',
  `Maiores perdas por moeda: ${r.B.biggestLossCoins.map((x:any)=>x[0].replace('USDT','')+' '+x[1].toFixed(0)).join(', ')}. Maiores ganhos: ${r.B.biggestGainCoins.map((x:any)=>x[0].replace('USDT','')+' '+x[1].toFixed(0)).join(', ')} (em USDT, sobre 10 000).`,'',
  '## Família C · reverter funding extremo (±0,10%, 24 h, 0,5% por evento, stop em 30%)','',...ck(r.C.checks),'','| Medida | Valor |','|---|---|',...ev(r.C),'',`Por ano: ${by(r.C)}.`,'',...vt(r.C),'',
  `Maiores perdas por moeda: ${r.C.biggestLossCoins.map((x:any)=>x[0].replace('USDT','')+' '+x[1].toFixed(0)).join(', ')}. Maiores ganhos: ${r.C.biggestGainCoins.map((x:any)=>x[0].replace('USDT','')+' '+x[1].toFixed(0)).join(', ')}.`,'',
  '## Família A · carry direcional entre moedas, universo ponto no tempo de 30 (2,5% por posição)','',...ck(A.checks),'','| Medida | Valor |','|---|---|',`| Retorno / queda máxima | ${pct(A.returnPct)} / ${(A.maxDrawdown*100).toFixed(1)}% |`,`| Sharpe anual / anos positivos (de 4) | ${A.sharpeAnnualized.toFixed(2)} / ${A.positiveYears} |`,
  `| Com custos dobrados (USDT) | ${A.doubledPnl.toFixed(0)} |`,`| Correlação com a cesta do universo | ${A.marketCorrelation.toFixed(2)} |`,`| Primeira / segunda metade (USDT) | ${A.halves.first.toFixed(0)} / ${A.halves.second.toFixed(0)} |`,`| Taxas / funding em caixa | ${A.feesPaid.toFixed(0)} / ${A.fundingCashDelta.toFixed(0)} |`,
  `| Com 5% por posição | ${pct(A.fullSize.returnPct)} (queda ${(A.fullSize.maxDrawdown*100).toFixed(1)}%) |`,`| Controle: momentum no mesmo universo (\`PIT_COMPLETO_V1\`) | ${pct(A.momentumControlReturn)} |`,'',
  '| | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',`| Carry direcional | `+yrs.map(y=>A.years[y]?`${pct(A.years[y].returnPct)} / ${(A.years[y].maxDrawdown*100).toFixed(1)}%${A.years[y].partial?' (parcial)':''}`:'n/d').join(' | ')+' |',''].join('\n');
}
if(process.argv[1]?.endsWith('eventos.ts'))main();
