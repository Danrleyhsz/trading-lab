// Estudo PIT_COMPLETO_V1 (docs/PROTOCOLO_POOL_COMPLETO.md): momentum de 28 dias com 2,5% por posição, universo de 30 moedas escolhido a cada
// 4 semanas pelo volume dos 672 h anteriores, dentre 543 perpétuas (incluindo as em deslistagem). Só dados públicos da Binance USD-M.
//   npx tsx scripts/estudos/pool-completo.ts --download   baixa (e guarda) as séries; retomável
//   npx tsx scripts/estudos/pool-completo.ts              análise e relatório
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe,hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';
import {simulateBlend,momentum} from './fatores-lib.js';
import {simulateLean,leanMomentum,toLean,sliceLean,subset,type LeanData,type LeanBook,type LeanResult} from './lean-sim.js';
import {load as loadOriginal,startOf,corr,pct,PROTOCOL as FATORES} from './fatores.js';
import {lastBarOf} from './mom-metade.js';
import {get} from './holdout-2021.js';

const H=3600000,dir='scripts/estudos/out',FIRST=Date.UTC(2021,11,4,0),LOOKBACK=672,REFRESH=672,SQRT_YEAR=Math.sqrt(24*365);
export const POOL=Object.freeze({version:'PIT_COMPLETO_V1',declaredAt:'2026-10-09',universeSize:30,refreshHours:REFRESH,firstDecisionBar:Date.UTC(2022,0,1,0),
 rule:{...FATORES.rule,legFraction:0.025},gate:{maximumDrawdown:0.15,minimumPositiveYears:3,maximumMarketCorrelation:0.3,maximumFilledShare:0.01,minimumUsableShare:0.9,trials:18},split:Date.UTC(2024,6,1)});
const P=POOL,file=(s:string)=>`${dir}/pool-${s}.json`;
interface Stored {symbol:string;first:number;count:number;o:number[];c:number[];v:number[];filled:number;funding:[number,number,number][];fundingMarkFilled:number;sha256:string}
const list=()=>JSON.parse(readFileSync('docs/estudos/pool-completo-lista-2026-10-09.json','utf8')).pool as {symbol:string;baseAsset:string;status:string;onboardDate:string}[];

// ---------- download ----------
function fetchRaw(symbol:string,lastBar:number){
 const old=`${dir}/outras-${symbol}.json`;if(existsSync(old)){const j=JSON.parse(readFileSync(old,'utf8'));return {raw:j.raw as any[],funding:j.funding as any[]};}
 const raw:any[]=[];let cursor=FIRST;
 while(cursor<=lastBar){const page=get('/fapi/v1/klines',{symbol,interval:'1h',startTime:cursor,endTime:lastBar+H-1,limit:1500}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({timestamp:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])});cursor=raw.at(-1).timestamp+H;}
 const funding:any[]=[];cursor=FIRST;
 while(cursor<=lastBar){const page=get('/fapi/v1/fundingRate',{symbol,startTime:cursor,endTime:lastBar+H-1,limit:1000}) as Record<string,string>[];if(!page.length)break;
  for(const f of page)funding.push({timestamp:Number(f.fundingTime),rate:Number(f.fundingRate),markPrice:Number(f.markPrice)});cursor=funding.at(-1).timestamp+1;if(page.length<1000)break;}
 return {raw,funding};
}
/** Compacta uma moeda: grade horária da primeira à última vela (horas faltantes viram vela parada com volume zero, contadas). */
export function compact(symbol:string,raw:{timestamp:number;open:number;close:number;volume:number}[],funding:{timestamp:number;rate:number;markPrice:number}[]):Stored{
 if(!raw.length)return {symbol,first:0,count:0,o:[],c:[],v:[],filled:0,funding:[],fundingMarkFilled:0,sha256:''};
 const byHour=new Map(raw.map(r=>[r.timestamp,r])),first=raw[0].timestamp,last=raw.at(-1)!.timestamp,o:number[]=[],c:number[]=[],v:number[]=[];let filled=0,prev=raw[0].close;
 for(let t=first;t<=last;t+=H){const k=byHour.get(t);if(k){o.push(k.open);c.push(k.close);v.push(k.volume);prev=k.close;}else{o.push(prev);c.push(prev);v.push(0);filled++;}}
 let fundingMarkFilled=0;const openAt=(t:number)=>o[Math.floor((t-first)/H)];
 const f:[number,number,number][]=funding.filter(x=>x.timestamp>=first&&x.timestamp<last+H).map(x=>{if(x.markPrice>0)return [x.timestamp,x.rate,x.markPrice] as [number,number,number];fundingMarkFilled++;return [x.timestamp,x.rate,openAt(x.timestamp)] as [number,number,number];});
 return {symbol,first,count:o.length,o,c,v,filled,funding:f,fundingMarkFilled,sha256:createHash('sha256').update(JSON.stringify({o,c,v,f})).digest('hex')};
}
function download(){
 mkdirSync(dir,{recursive:true});const lastBar=lastBarOf(),all=list(),from=process.argv.find(a=>a.startsWith('--from='))?.slice(7);let done=0,skipped=0;
 // Vários processos podem rodar juntos, cada um por uma ponta da lista; cada moeda só é baixada se o arquivo ainda não existe.
 const order=all.map((c,k)=>({c,k}));if(from==='reverse')order.reverse();if(from==='middle'){const m=Math.floor(all.length/2);order.push(...order.splice(0,m));}
 const coins=all;
 for(const {c,k} of order){
  if(existsSync(file(c.symbol))){skipped++;continue;}
  try{const {raw,funding}=fetchRaw(c.symbol,lastBar),s=compact(c.symbol,raw,funding);writeFileSync(file(c.symbol),JSON.stringify(s));done++;
   console.log(`[${k+1}/${coins.length}] ${c.symbol} ${s.count} velas, ${s.filled} preenchidas, ${s.funding.length} fundings`);}
  catch(e){const msg=String((e as Error).message);console.log(`[${k+1}/${coins.length}] ${c.symbol} ERRO ${msg}`);if(/HTTP (418|429)/.test(msg)){console.log('parando: a corretora pediu para reduzir o ritmo; rode de novo mais tarde');process.exit(2);}}
 }
 console.log('baixadas',done,'já existiam',skipped);
}

// ---------- análise ----------
export interface Loaded {lean:LeanData;last:Int32Array;status:string[];onboard:number[];vol:Float64Array[];refreshBars:number[];dropped:{symbol:string;reason:string}[];hashes:Record<string,string>;fundingMarkFilled:number}
export function loadPool(start:number,bars:number):Loaded{
 const coins=list(),dropped:{symbol:string;reason:string}[]=[],symbols:string[]=[],first:number[]=[],last:number[]=[],open:Float64Array[]=[],close:Float64Array[]=[],funding:any[]=[],status:string[]=[],onboard:number[]=[],vol:Float64Array[]=[],hashes:Record<string,string>={};
 const refreshBars:number[]=[];for(let b=start;b<bars-1;b+=REFRESH)refreshBars.push(b);let fundingMarkFilled=0;
 for(const c of coins){
  if(!existsSync(file(c.symbol))){dropped.push({symbol:c.symbol,reason:'sem arquivo (não baixado)'});continue;}
  const s=JSON.parse(readFileSync(file(c.symbol),'utf8')) as Stored;
  if(s.count<LOOKBACK+1){dropped.push({symbol:c.symbol,reason:s.count?'menos de 672 velas':'sem velas'});continue;}
  if(s.filled/s.count>P.gate.maximumFilledShare){dropped.push({symbol:c.symbol,reason:`${(s.filled/s.count*100).toFixed(2)}% de horas preenchidas`});continue;}
  const f=Math.round((s.first-FIRST)/H);if(f<0)throw Error('vela antes do início em '+c.symbol);
  symbols.push(c.symbol);first.push(f);last.push(f+s.count-1);open.push(Float64Array.from(s.o));close.push(Float64Array.from(s.c));
  funding.push(s.funding.map(([timestamp,rate,markPrice])=>({timestamp,rate,markPrice})));status.push(c.status);onboard.push(Date.parse(c.onboardDate));hashes[c.symbol]=s.sha256;fundingMarkFilled+=s.fundingMarkFilled;
  // Volume financeiro dos 672 h anteriores (inclusive) em cada atualização do universo; -1 se a moeda ainda não tem 672 h de velas ou já acabou.
  const cumv=new Float64Array(s.count+1);for(let i=0;i<s.count;i++)cumv[i+1]=cumv[i]+s.v[i]*s.c[i];
  vol.push(Float64Array.from(refreshBars,b=>{const k=b-f;return k>=LOOKBACK&&k<s.count?cumv[k+1]-cumv[k+1-LOOKBACK]:-1;}));
 }
 const timestamps=Float64Array.from({length:bars},(_,i)=>FIRST+i*H);
 return {lean:{symbols,timestamps,first:Int32Array.from(first),open,close,volume:symbols.map(()=>new Float64Array(0)),funding},last:Int32Array.from(last),status,onboard,vol,refreshBars,dropped,hashes,fundingMarkFilled};
}
/** Universo ponto no tempo do protocolo; `allow` restringe o pool (variantes). */
export function universeFactory(L:Loaded,start:number){
 const memo=new Map<string,ReadonlySet<number>[]>();
 const sets=(allow:(k:number)=>boolean,n:number,key:string)=>{
  const id=key+':'+n;let v=memo.get(id);if(v)return v;
  v=L.refreshBars.map((_,r)=>{
   const cand:{k:number;v:number}[]=[];for(let k=0;k<L.lean.symbols.length;k++)if(allow(k)&&L.vol[k][r]>=0)cand.push({k,v:L.vol[k][r]});
   cand.sort((a,b)=>b.v-a.v||L.lean.symbols[a.k].localeCompare(L.lean.symbols[b.k]));return new Set(cand.slice(0,n).map(x=>x.k));
  });memo.set(id,v);return v;
 };
 return (allow:(k:number)=>boolean,n:number,key:string):LeanBook['eligible']=>{
  const byRefresh=sets(allow,n,key);
  return (_d,i)=>{const r=Math.floor((i-start)/REFRESH),base=byRefresh[r],out=new Set<number>();for(const k of base)if(i<=L.last[k])out.add(k);return out;};
 };
}
const pnlBetween=(eq:{timestamp:number;equity:number}[],from:number,to:number)=>{const before=eq.filter(p=>p.timestamp<from).at(-1)?.equity??P.rule.initialCapital,pts=eq.filter(p=>p.timestamp>=from&&p.timestamp<to);if(pts.length<2)return null;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}return {pnl:pts.at(-1)!.equity-before,returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};};

function analyze(){
 const R=P.rule,G=P.gate,leanBook=(frac:number,eligible?:LeanBook['eligible']):LeanBook[]=>[{score:leanMomentum(672),legFraction:frac,longCount:5,shortCount:5,eligible}];
 const prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8')),lastBar=lastBarOf(),bars=Math.round((lastBar-FIRST)/H)+1;
 // 1) Regressão do controle com o simulador completo.
 let longBars=0;
 {
  const {longOnly}=loadOriginal(),reg=simulateBlend(longOnly,{...FATORES.rule,startBar:startOf(longOnly)} as any,[{signal:momentum(672),legFraction:0.05,longCount:5,shortCount:5}]),ret=reg.netPnl/FATORES.rule.initialCapital;
  const ok=Math.abs(ret-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005;
  console.log('regressão do controle (simulador completo)',pct(ret),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',ok?'OK':'FALHOU');
  if(!ok)throw Error('Teste de regressão do controle falhou: o estudo para e nada é reportado como resultado (protocolo)');
  longBars=longOnly[Object.keys(longOnly)[0]].trade.length;
 }
 const start=Math.round((P.firstDecisionBar-FIRST)/H),L=loadPool(start,bars),symbols=L.lean.symbols;
 const originals=['ZECUSDT','NEARUSDT','UNIUSDT','BCHUSDT','FILUSDT','AAVEUSDT','AVAXUSDT','LINKUSDT','XRPUSDT','XLMUSDT','DOGEUSDT','SOLUSDT','LTCUSDT','ETHUSDT','BTCUSDT'];
 // Mesmo controle com os dados baixados agora e o simulador enxuto: o pipeline novo precisa reproduzir o número publicado.
 {
  const sub=sliceLean(subset(L.lean,originals),longBars),reg=simulateLean(sub,{...FATORES.rule,startBar:start} as any,leanBook(0.05)),ret=reg.netPnl/FATORES.rule.initialCapital;
  const ok=Math.abs(ret-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005;
  console.log('regressão do controle (dados novos, simulador enxuto)',pct(ret),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',ok?'OK':'FALHOU');
  if(!ok)throw Error('O pipeline novo não reproduz o controle publicado; o estudo para');
 }
 const usableShare=symbols.length/list().length,old59=new Set([...originals,...(JSON.parse(readFileSync('docs/estudos/universo-outras-moedas-2026-10-09.json','utf8')).universe as {symbol:string}[]).map(c=>c.symbol)]);
 console.log('pool utilizável',symbols.length,'de',list().length,`(${(usableShare*100).toFixed(1)}%)`,'fora:',L.dropped.length);
 const universe=universeFactory(L,start),all=()=>true,cfg=(o:Record<string,number>={})=>({...R,startBar:start,...o} as any),run=(books:LeanBook[],o?:Record<string,number>)=>simulateLean(L.lean,cfg(o),books);
 // Cesta igual do universo vigente, hora a hora (metade da regra de neutralidade) e métricas, no mesmo formato de fatores.ts.
 const basketOf=(elig:NonNullable<LeanBook['eligible']>)=>{
  const n=L.lean.timestamps.length-start-1,b=new Float64Array(n),px=(k:number,i:number)=>{const f=L.lean.first![k],a=L.lean.close[k];return i<f?0:(i-f<a.length?a[i-f]:a[a.length-1]);};
  for(let j=0;j<n;j++){const t=start+j+1,members=elig(L.lean,t-1);let s=0,c=0;for(const k of members){if(t>L.last[k])continue;const p0=px(k,t-1),p1=px(k,t);if(p0>0&&p1>0){s+=p1/p0-1;c++;}}b[j]=c?s/c:0;}
  return b;
 };
 const metricsOf=(r:LeanResult,basket:Float64Array)=>{
  const returns=hourlyReturns(r.equitySeries),m=moments(returns),years:Record<string,{returnPct:number;maxDrawdown:number;partial:boolean}>={};
  for(const y of [2022,2023,2024,2025,2026]){
   const pts=r.equitySeries.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);if(pts.length<2)continue;
   const before=r.equitySeries.filter(p=>p.timestamp<pts[0].timestamp).at(-1)?.equity??R.initialCapital;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}
   years[y]={returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd,partial:y===2026};
  }
  const mine=returns.slice(0,basket.length),mm=mine.reduce((a,b)=>a+b,0)/mine.length,mb=basket.reduce((a,b)=>a+b,0)/basket.length;let cov=0,va=0,vb=0;
  for(let k=0;k<mine.length;k++){cov+=(mine[k]-mm)*(basket[k]-mb);va+=(mine[k]-mm)**2;vb+=(basket[k]-mb)**2;}
  const weekly=r.equitySeries.filter((_,k)=>k%168===0).map(p=>p.equity),weeklyReturns=weekly.slice(1).map((e,k)=>e/weekly[k]-1);let hold=1;for(const x of basket)hold*=1+x;
  return {netPnl:r.netPnl,returnPct:r.netPnl/R.initialCapital,maxDrawdown:r.maxDrawdown,years,sharpeAnnualized:m.sharpe*SQRT_YEAR,returns,marketCorrelation:va>0&&vb>0?cov/Math.sqrt(va*vb):NaN,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,
   turnover:r.tradedNotional/R.initialCapital,rebalances:r.rebalances.length,closedLegs:r.closedLegs,weeklyReturns,buyHold:hold-1};
 };
 // 2) Veredito: N = 30, 2,5% por posição.
 const eligMain=universe(all,P.universeSize,'todas'),basket=basketOf(eligMain!);
 const base=run(leanBook(0.025,eligMain)),doubled=run(leanBook(0.025,eligMain),{feeRate:R.feeRate*2,slippageBps:R.slippageBps*2}),full=run(leanBook(0.05,eligMain));
 const m=metricsOf(base,basket),mf=metricsOf(full,basket),variance=JSON.parse(readFileSync('docs/estudos/fatores-v1-2026-10-09.json','utf8')).trialSharpeVariance as number;
 const dsr=deflatedSharpe(m.returns,G.trials,variance).deflatedSharpe,positiveYears=Object.values(m.years).filter(y=>!y.partial&&y.returnPct>0).length;
 const h1=pnlBetween(base.equitySeries,P.firstDecisionBar,P.split),h2=pnlBetween(base.equitySeries,P.split,Date.UTC(2100,0,1));
 const checks:Record<string,boolean>={DATA_QUALITY:usableShare>=G.minimumUsableShare,POSITIVE_PNL:m.netPnl>0,BOUNDED_DRAWDOWN:m.maxDrawdown<=G.maximumDrawdown,POSITIVE_YEARS:positiveYears>=G.minimumPositiveYears,
  DOUBLED_COSTS_POSITIVE:doubled.netPnl>0,MARKET_NEUTRAL:Math.abs(m.marketCorrelation)<=G.maximumMarketCorrelation,BOTH_HALVES_POSITIVE:(h1?.pnl??-1)>0&&(h2?.pnl??-1)>0};
 const verdict=Object.values(checks).every(Boolean)?'VALIDADA_POOL_COMPLETO':'NAO_VALIDADA';
 console.log('PIT completo (30)',verdict,pct(m.returnPct),'DD',(m.maxDrawdown*100).toFixed(1)+'%','(5%:',(mf.maxDrawdown*100).toFixed(1)+'%)','anos+',positiveYears,'x2',doubled.netPnl.toFixed(0),'corr',m.marketCorrelation.toFixed(2),'Sharpe',m.sharpeAnnualized.toFixed(2),'DSR',dsr.toFixed(3),Object.entries(checks).filter(([,v])=>!v).map(([k])=>k).join(','));
 // 3) Informação, fora do veredito.
 const describe=(label:string,r:LeanResult,b:Float64Array)=>{const x=metricsOf(r,b);const o={label,returnPct:x.returnPct,maxDrawdown:x.maxDrawdown,sharpeAnnualized:x.sharpeAnnualized,positiveYears:Object.values(x.years).filter(y=>!y.partial).filter(y=>y.returnPct>0).length,years:x.years,marketCorrelation:x.marketCorrelation,weeklyReturns:x.weeklyReturns,closedLegs:x.closedLegs,turnover:x.turnover,buyHold:x.buyHold};
  console.log('  ',label.padEnd(36),pct(o.returnPct),'DD',(o.maxDrawdown*100).toFixed(1)+'%','Sharpe',o.sharpeAnnualized.toFixed(2),'anos+',o.positiveYears);return o;};
 const variant=(label:string,allow:(k:number)=>boolean,key:string,n:number)=>{const e=universe(allow,n,key);return describe(label,run(leanBook(0.025,e)),basketOf(e!));};
 const variants=[
  variant('Universo de 15 moedas',all,'todas',15),
  variant('Universo de 60 moedas',all,'todas',60),
  variant('Sem as 59 moedas dos estudos anteriores',k=>!old59.has(symbols[k]),'sem59',P.universeSize),
  variant('Só moedas ainda em operação (418)',k=>L.status[k]==='TRADING','trading',P.universeSize),
  variant('Só moedas em liquidação (125)',k=>L.status[k]==='SETTLING','settling',P.universeSize),
  variant('Só listadas até 30/11/2021',k=>L.onboard[k]<=Date.UTC(2021,10,30),'ate2021',P.universeSize)];
 // Composição do universo ao longo do tempo.
 const byYear:Record<string,{slots:number;old59:number;settling:number;listedAfter2021:number;distinct:Set<number>;refreshes:number}>={};
 L.refreshBars.forEach((bar,r)=>{const y=String(new Date(L.lean.timestamps[bar]).getUTCFullYear()),e=byYear[y]??={slots:0,old59:0,settling:0,listedAfter2021:0,distinct:new Set<number>(),refreshes:0};
  e.refreshes++;for(const k of (eligMain as any)(L.lean,bar)){e.slots++;e.distinct.add(k);if(old59.has(symbols[k]))e.old59++;if(L.status[k]==='SETTLING')e.settling++;if(L.onboard[k]>Date.UTC(2021,10,30))e.listedAfter2021++;}});
 const composition=Object.fromEntries(Object.entries(byYear).map(([y,e])=>[y,{refreshes:e.refreshes,distinctCoins:e.distinct.size,shareOld59:e.old59/e.slots,shareSettling:e.settling/e.slots,shareListedAfter2021:e.listedAfter2021/e.slots}]));
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_POOL_COMPLETO.md'],{encoding:'utf8'}).trim(),strip=({weeklyReturns,...r}:any)=>r;
 const report={protocol:{...P,split:new Date(P.split).toISOString()},protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  pool:{listed:list().length,usable:symbols.length,usableShare,dropped:L.dropped,fundingMarkFilled:L.fundingMarkFilled,statusCounts:{TRADING:L.status.filter(s=>s==='TRADING').length,SETTLING:L.status.filter(s=>s==='SETTLING').length}},
  engine:'scripts/estudos/lean-sim.ts + pool-completo.ts',verdict,checks,failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),
  main:{netPnl:m.netPnl,returnPct:m.returnPct,maxDrawdown:m.maxDrawdown,sharpeAnnualized:m.sharpeAnnualized,marketCorrelation:m.marketCorrelation,years:m.years,positiveYears,doubledPnl:doubled.netPnl,halves:{first:h1,second:h2},decisions:m.rebalances,closedLegs:m.closedLegs,turnover:m.turnover,feesPaid:m.feesPaid,fundingCashDelta:m.fundingCashDelta,buyHold:m.buyHold,deflatedSharpe:dsr,
   fullSize:{returnPct:mf.returnPct,maxDrawdown:mf.maxDrawdown,sharpeAnnualized:mf.sharpeAnnualized},drawdownRatio:m.maxDrawdown/mf.maxDrawdown},
  variants:variants.map(strip),composition,datasetHashes:L.hashes};
 const out='docs/estudos/pool-completo-2026-10-09';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
 console.log('composição',JSON.stringify(Object.fromEntries(Object.entries(composition).map(([y,c]:[string,any])=>[y,{moedas:c.distinctCoins,antigas59:+(c.shareOld59*100).toFixed(0),liquidacao:+(c.shareSettling*100).toFixed(0)}]))));
}
function markdown(r:any){
 const yrs=['2022','2023','2024','2025','2026'],yr=(y:any,k:string)=>y[k]?`${pct(y[k].returnPct)} / ${(y[k].maxDrawdown*100).toFixed(1)}%${y[k].partial?' (parcial)':''}`:'n/d',p=r.main,hv=(h:any)=>h?`${pct(h.returnPct)} / ${(h.maxDrawdown*100).toFixed(1)}%`:'n/d';
 return [`# Resultado ${r.protocol.version}: momentum de 28 dias com o pool completo, em universo ponto no tempo`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_POOL_COMPLETO.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Pool de ${r.pool.listed} moedas, ${r.pool.usable} utilizáveis (${(r.pool.usableShare*100).toFixed(1)}%; ${r.pool.statusCounts.TRADING} em operação e ${r.pool.statusCounts.SETTLING} em liquidação); a cada 4 semanas, as 30 de maior volume dos 672 h anteriores entre as elegíveis; 5 compradas e 5 vendidas; 2,5% por posição; 01/01/2022 ao fim de out/2026.`,'',
  `## Veredito: **${r.verdict}**${r.failed.length?' (reprovou em '+r.failed.join(', ')+')':''}`,'','| Critério | Passou |','|---|---|',...Object.entries(r.checks).map(([k,v])=>`| ${k} | ${v?'sim':'não'} |`),'',
  '## Números (universo ponto no tempo de 30, 2,5% por posição)','','| Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Corr. mercado | Anos + (de 4) | 1ª metade | 2ª metade | Cesta do universo (comprar e segurar) |','|---|---|---|---|---|---|---|---|---|',
  `| ${pct(p.returnPct)} | ${(p.maxDrawdown*100).toFixed(1)}% | ${p.sharpeAnnualized.toFixed(2)} | ${p.doubledPnl.toFixed(0)} | ${p.marketCorrelation.toFixed(2)} | ${p.positiveYears} | ${hv(p.halves.first)} | ${hv(p.halves.second)} | ${pct(p.buyHold)} |`,'',
  `Com 5% por posição: ${pct(p.fullSize.returnPct)}, queda máxima ${(p.fullSize.maxDrawdown*100).toFixed(1)}% (razão das quedas ${p.drawdownRatio.toFixed(2)}). Sharpe deflacionado (18 tentativas, fora do veredito): ${p.deflatedSharpe.toFixed(3)}. Taxas ${p.feesPaid.toFixed(0)}, funding ${p.fundingCashDelta.toFixed(0)}, giro ${p.turnover.toFixed(0)}x, ${p.decisions} decisões, ${p.closedLegs} posições encerradas.`,'',
  '## Por ano (retorno / queda máxima no ano)','','| | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',`| **Principal (30 moedas)** | `+yrs.map(y=>yr(p.years,y)).join(' | ')+' |',...r.variants.map((v:any)=>`| ${v.label} | `+yrs.map(y=>yr(v.years,y)).join(' | ')+' |'),'',
  '## Variantes (informação, fora do veredito)','','| Variante | Retorno | Queda máx. | Sharpe anual | Anos + | Corr. mercado |','|---|---|---|---|---|---|',...r.variants.map((v:any)=>`| ${v.label} | ${pct(v.returnPct)} | ${(v.maxDrawdown*100).toFixed(1)}% | ${v.sharpeAnnualized.toFixed(2)} | ${v.positiveYears} | ${v.marketCorrelation.toFixed(2)} |`),'',
  '## Composição do universo','','| Ano | Atualizações | Moedas diferentes | Vagas nas 59 antigas | Vagas em moedas em liquidação | Vagas em listadas depois de 11/2021 |','|---|---|---|---|---|---|',
  ...Object.entries(r.composition).map(([y,c]:[string,any])=>`| ${y} | ${c.refreshes} | ${c.distinctCoins} | ${(c.shareOld59*100).toFixed(0)}% | ${(c.shareSettling*100).toFixed(0)}% | ${(c.shareListedAfter2021*100).toFixed(0)}% |`),'',
  r.pool.dropped.length?`Moedas fora do pool por qualidade ou falta de dados (${r.pool.dropped.length}): `+r.pool.dropped.map((d:any)=>d.symbol.replace('USDT','')+' ('+d.reason+')').join(', ')+'.':'','',
  `Horas de funding sem preço de marcação preenchidas pela abertura: ${r.pool.fundingMarkFilled}.`].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('pool-completo.ts')){if(process.argv.includes('--download'))download();else analyze();}
