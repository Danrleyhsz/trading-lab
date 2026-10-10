// Estudo LISTAGEM_HEDGE_V1 (docs/PROTOCOLO_LISTAGENS_2020_2021.md): venda de listagens novas com hedge de BTC, nas listagens de 2019 a 2021.
// Roda fora do servidor, só com dados públicos da Binance USD-M (via curl); não envia ordens e não toca em contas.
// Uso: npx tsx scripts/estudos/listagens-2020-2021.ts
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {simulateEvents,clusteredT,listingEvents,type Ev,type EvSim,type EvResult} from './eventos.js';
import {loadPool} from './pool-completo.js';
import {lastBarOf} from './mom-metade.js';
import {get} from './holdout-2021.js';
import {pct} from './fatores.js';
import type {LeanData} from './lean-sim.js';

const H=3600000,dir='scripts/estudos/out',T0=Date.UTC(2019,8,8,0),END=Date.UTC(2022,0,10,23),POOL_FIRST=Date.UTC(2021,11,4,0);
export const LISTAGEM=Object.freeze({version:'LISTAGEM_HEDGE_V1',declaredAt:'2026-10-09',listedBefore:POOL_FIRST,entryDelayHours:168,holdHours:672,stopAdverse:0.5,fraction:0.01,
 feeRate:0.00055,slippageBps:10,hedgeSlippageBps:2,initial:10000,grossCap:0.5,minimumHours:840,maximumFilledShare:0.01,usableShare:0.9,minimumEvents:80,minimumT:2.0,minimumYearEvents:10,maximumDrawdown:0.15});
const P=LISTAGEM;

// ---------- dados ----------
interface Series {symbol:string;first:number;count:number;o:number[];h:number[];c:number[];filled:number;funding:[number,number,number][];sha256:string}
export function pages(path:string,symbol:string,start:number,end:number,limit:number){
 const raw:{t:number;o:number;h:number;c:number}[]=[];let cursor=start;
 while(cursor<=end){const page=get(path,{symbol,interval:'1h',startTime:cursor,endTime:end,limit}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({t:Number(r[0]),o:Number(r[1]),h:Number(r[2]),c:Number(r[4])});cursor=raw.at(-1)!.t+H;if(page.length<limit)break;}
 return raw;
}
export function fundingPages(symbol:string,start:number,end:number){
 const out:[number,number,number][]=[];let cursor=start;
 while(cursor<=end){const page=get('/fapi/v1/fundingRate',{symbol,startTime:cursor,endTime:end,limit:1000}) as Record<string,string>[];if(!page.length)break;
  for(const f of page)out.push([Number(f.fundingTime),Number(f.fundingRate),Number(f.markPrice)]);cursor=out.at(-1)![0]+1;if(page.length<1000)break;}
 return out;
}
/** Grade horária da primeira à última vela; horas faltantes viram vela parada (contadas). Funding sem preço de marcação usa a abertura da hora. */
export function toSeries(symbol:string,raw:{t:number;o:number;h:number;c:number}[],funding:[number,number,number][],limitHours?:number):Series{
 if(!raw.length)return {symbol,first:0,count:0,o:[],h:[],c:[],filled:0,funding:[],sha256:''};
 const by=new Map(raw.map(r=>[r.t,r])),first=raw[0].t,last=limitHours?Math.min(raw.at(-1)!.t,first+limitHours*H):raw.at(-1)!.t,o:number[]=[],h:number[]=[],c:number[]=[];let filled=0,prev=raw[0].c;
 for(let t=first;t<=last;t+=H){const k=by.get(t);if(k){o.push(k.o);h.push(k.h);c.push(k.c);prev=k.c;}else{o.push(prev);h.push(prev);c.push(prev);filled++;}}
 const f=funding.filter(x=>x[0]>=first&&x[0]<last+H).map(x=>x[2]>0?x:[x[0],x[1],o[Math.floor((x[0]-first)/H)]] as [number,number,number]);
 return {symbol,first,count:o.length,o,h,c,filled,funding:f,sha256:createHash('sha256').update(JSON.stringify({o,h,c,f})).digest('hex')};
}
function fetchCoin(symbol:string,onboard:number):Series{
 const file=`${dir}/listagem-${symbol}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const start=onboard-24*H,end=start+1500*H;
 const s=toSeries(symbol,pages('/fapi/v1/klines',symbol,start,end,1500),fundingPages(symbol,start,end),1400);
 mkdirSync(dir,{recursive:true});writeFileSync(file,JSON.stringify(s));return s;
}
function fetchBtc():Series{
 const file=`${dir}/listagem-BTCUSDT.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const s=toSeries('BTCUSDT',pages('/fapi/v1/klines','BTCUSDT',T0,END,1500),fundingPages('BTCUSDT',T0,END));
 mkdirSync(dir,{recursive:true});writeFileSync(file,JSON.stringify(s));return s;
}

// ---------- estudo ----------
interface Built {lean:LeanData;last:Int32Array;high:Float64Array[];btc:number;dropped:{symbol:string;reason:string}[];hashes:Record<string,string>;listed:number}
function build():Built{
 const list=(JSON.parse(readFileSync('docs/estudos/pool-completo-lista-2026-10-09.json','utf8')).pool as {symbol:string;onboardDate:string}[])
  .filter(c=>Date.parse(c.onboardDate)<P.listedBefore&&c.symbol!=='BTCUSDT'),dropped:{symbol:string;reason:string}[]=[],hashes:Record<string,string>={};
 const bars=Math.round((END-T0)/H)+1,symbols:string[]=[],first:number[]=[],last:number[]=[],open:Float64Array[]=[],close:Float64Array[]=[],high:Float64Array[]=[],funding:any[]=[];
 const add=(s:Series)=>{const f=Math.round((s.first-T0)/H);symbols.push(s.symbol);first.push(f);last.push(f+s.count-1);open.push(Float64Array.from(s.o));close.push(Float64Array.from(s.c));high.push(Float64Array.from(s.h));
  funding.push(s.funding.map(([timestamp,rate,markPrice])=>({timestamp,rate,markPrice})));hashes[s.symbol]=s.sha256;};
 let n=0;
 for(const c of list){
  n++;const s=fetchCoin(c.symbol,Date.parse(c.onboardDate));if(n%20===0)console.log('baixadas/lidas',n,'de',list.length);
  if(s.count<P.minimumHours){dropped.push({symbol:c.symbol,reason:s.count?`só ${s.count} velas`:'sem velas'});continue;}
  if(s.filled/s.count>P.maximumFilledShare){dropped.push({symbol:c.symbol,reason:`${(s.filled/s.count*100).toFixed(2)}% de horas preenchidas`});continue;}
  add(s);
 }
 const btc=symbols.length;add(fetchBtc());
 const lean:LeanData={symbols,timestamps:Float64Array.from({length:bars},(_,i)=>T0+i*H),first:Int32Array.from(first),open,close,volume:symbols.map(()=>new Float64Array(0)),funding};
 return {lean,last:Int32Array.from(last),high,btc,dropped,hashes,listed:list.length};
}
const cfg=(mult=1,start=0,bars=0)=>({fee:P.feeRate*mult,slippageBps:P.slippageBps*mult,hedgeSlippageBps:P.hedgeSlippageBps*mult,initial:P.initial,startBar:start,endBar:bars-1,grossCap:P.grossCap});
const monthOfBar=(ts:Float64Array,bar:number)=>new Date(ts[bar]).toISOString().slice(0,7);
const yearOfBar=(ts:Float64Array,bar:number)=>new Date(ts[bar]).getUTCFullYear();
const quantile=(v:number[],q:number)=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(q*s.length))]:NaN;};

/** Junta as pernas de cada evento: retorno sobre o valor vendido, com e sem hedge. */
export function perEvent(results:EvResult[]){
 const by=new Map<number,{main?:EvResult;hedge?:EvResult}>();
 for(const r of results){if(r.id===undefined)continue;const e=by.get(r.id)??{};if(r.hedge)e.hedge=r;else e.main=r;by.set(r.id,e);}
 return [...by.entries()].filter(([,e])=>e.main).map(([id,e])=>({id,k:e.main!.k,entryBar:e.main!.entryBar,unhedged:e.main!.ret,hedged:(e.main!.pnl+(e.hedge?.pnl??0))/e.main!.notional,btcLeg:(e.hedge?.pnl??0)/e.main!.notional,reason:e.main!.reason,stop:e.main!.reason==='stop'}));
}
function describe(label:string,ts:Float64Array,evs:ReturnType<typeof perEvent>,key:'hedged'|'unhedged',sim?:EvSim){
 const rets=evs.map(e=>e[key]),cl=clusteredT(rets,evs.map(e=>monthOfBar(ts,e.entryBar))),sorted=[...rets].sort((a,b)=>a-b),cut=Math.floor(sorted.length*0.01),trimmed=sorted.slice(cut,sorted.length-cut);
 const years:Record<string,{n:number;mean:number}>={};for(const y of [...new Set(evs.map(e=>yearOfBar(ts,e.entryBar)))].sort()){const s=evs.filter(e=>yearOfBar(ts,e.entryBar)===y).map(e=>e[key]);years[y]={n:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length};}
 return {label,events:rets.length,mean:cl.mean,tStat:cl.t,clusters:cl.clusters,median:quantile(rets,0.5),hitRate:rets.filter(x=>x>0).length/rets.length,worst:sorted[0],best:sorted.at(-1),trimmedMean:trimmed.reduce((a,b)=>a+b,0)/trimmed.length,years,stops:evs.filter(e=>e.stop).length,
  portfolio:sim?{returnPct:sim.finalEquity/P.initial-1,maxDrawdown:sim.maxDrawdown,minEquity:sim.minEquity,skipped:sim.skipped}:null};
}

function main(){
 const B=build(),L=B.lean,bars=L.timestamps.length,usableShare=(L.symbols.length-1)/B.listed;
 console.log('moedas elegíveis',B.listed,'utilizáveis',L.symbols.length-1,`(${(usableShare*100).toFixed(1)}%)`,'fora:',B.dropped.map(d=>d.symbol+':'+d.reason).join('; ')||'-');
 const high=(k:number,i:number)=>{const f=L.first![k],a=B.high[k];const j=i-f;return j<0?0:a[Math.min(j,a.length-1)];};
 const hl={lean:L,last:B.last};
 const evs=(delay:number,hold:number,hedge:boolean):Ev[]=>{
  const out:Ev[]=[];for(let k=0;k<B.btc;k++){const f=L.first![k],entry=f+delay;if(entry>=B.last[k])continue;
   out.push({k,entryBar:entry,exitBar:Math.min(entry+hold,B.last[k]),side:-1,fraction:P.fraction,stop:P.stopAdverse,hedgeK:hedge?B.btc:undefined,id:k});}
  return out.sort((a,b)=>a.entryBar-b.entryBar||a.k-b.k);
 };
 const run=(e:Ev[],mult=1,intrabar=true)=>{const first=e.length?Math.min(...e.map(x=>x.entryBar)):0;return simulateEvents(hl as any,e,{...cfg(mult,first,bars),high:intrabar?high:undefined});};
 const main_=evs(P.entryDelayHours,P.holdHours,true),simMain=run(main_),pe=perEvent(simMain.results),x3=perEvent(run(main_,3).results);
 const S=describe('Principal (com hedge de BTC)',L.timestamps,pe,'hedged',simMain),meanX3=x3.reduce((a,e)=>a+e.hedged,0)/x3.length;
 const yearsOk=Object.entries(S.years).filter(([,v])=>v.n>=P.minimumYearEvents);
 const checks:Record<string,boolean>={DATA_QUALITY:usableShare>=P.usableShare,ENOUGH_EVENTS:S.events>=P.minimumEvents,SIGNIFICANT_MEAN:S.mean>0&&S.tStat>=P.minimumT,MEDIAN_POSITIVE:S.median>0,
  POSITIVE_YEARS:yearsOk.length>0&&yearsOk.every(([,v])=>v.mean>0),COSTS_X3:meanX3>0,BOUNDED_DRAWDOWN:S.portfolio!.maxDrawdown<=P.maximumDrawdown&&S.portfolio!.minEquity>0};
 const verdict=Object.values(checks).every(Boolean)?'VALIDADA_EM_NAO_VISTO':'NAO_VALIDADA';
 const show=(s:ReturnType<typeof describe>)=>console.log(s.label.padEnd(36),'eventos',s.events,'média',pct(s.mean),'t',s.tStat.toFixed(2),'mediana',pct(s.median),'acerto',(s.hitRate*100).toFixed(0)+'%','pior',pct(s.worst),'stops',s.stops,'carteira',s.portfolio?pct(s.portfolio.returnPct)+' DD '+(s.portfolio.maxDrawdown*100).toFixed(1)+'%':'-','anos',Object.entries(s.years).map(([y,v])=>y+':'+v.n+'/'+pct(v.mean)).join(' '));
 show(S);console.log('verdict',verdict,Object.entries(checks).filter(([,v])=>!v).map(([k])=>k).join(','),'| média com custos x3',pct(meanX3));
 // Informação
 const unh=describe('Sem hedge (regra da família B)',L.timestamps,pe,'unhedged'),btcLeg={mean:pe.reduce((a,e)=>a+e.btcLeg,0)/pe.length};show(unh);
 const variants=[{label:'Entrada em 3 dias',d:72,h:672},{label:'Entrada em 14 dias',d:336,h:672},{label:'Saída em 14 dias',d:168,h:336},{label:'Saída em 56 dias',d:168,h:1344}].map(v=>{
  const s=run(evs(v.d,v.h,true)),r=describe(v.label+' (com hedge)',L.timestamps,perEvent(s.results),'hedged',s);show(r);return r;});
 const byCoin=new Map<number,number>();for(const e of pe)byCoin.set(e.k,(byCoin.get(e.k)??0)+e.hedged);
 const ranked=[...byCoin.entries()].map(([k,v])=>[L.symbols[k],v] as [string,number]).sort((a,b)=>a[1]-b[1]);
 // Junção com a amostra de 2022 a 2025 (a da descoberta), pelo mesmo motor, com hedge e stop pelo fechamento (como na descoberta).
 const lastBar=lastBarOf(),poolBars=Math.round((lastBar-POOL_FIRST)/H)+1,PL=loadPool(Math.round((Date.UTC(2022,0,1)-POOL_FIRST)/H),poolBars);
 const bk=PL.lean.symbols.indexOf('BTCUSDT'),lastEntry=Math.round((Date.UTC(2025,7,31,23)-POOL_FIRST)/H);
 const disc=listingEvents(PL,168,672,lastEntry).map(e=>({...e,hedgeK:bk,id:e.k})),firstD=Math.min(...disc.map(e=>e.entryBar));
 const simD=simulateEvents(PL as any,disc,{fee:P.feeRate,slippageBps:P.slippageBps,hedgeSlippageBps:P.hedgeSlippageBps,initial:P.initial,startBar:firstD,endBar:poolBars-1,grossCap:P.grossCap}),peD=perEvent(simD.results);
 const dMonth=peD.map(e=>monthOfBar(PL.lean.timestamps,e.entryBar)),nMonth=pe.map(e=>monthOfBar(L.timestamps,e.entryBar));
 const clD=clusteredT(peD.map(e=>e.hedged),dMonth),clAll=clusteredT([...peD.map(e=>e.hedged),...pe.map(e=>e.hedged)],[...dMonth,...nMonth]);
 const discovery={events:peD.length,mean:clD.mean,tStat:clD.t,median:quantile(peD.map(e=>e.hedged),0.5)},joined={events:peD.length+pe.length,mean:clAll.mean,tStat:clAll.t,median:quantile([...peD,...pe].map(e=>e.hedged),0.5)};
 console.log('descoberta 2022-2025 (hedge, mesmo motor)','eventos',discovery.events,'média',pct(discovery.mean),'t',discovery.tStat.toFixed(2),'mediana',pct(discovery.median),'| junção','eventos',joined.events,'média',pct(joined.mean),'t',joined.tStat.toFixed(2));
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_LISTAGENS_2020_2021.md'],{encoding:'utf8'}).trim();
 const report={protocol:{...P,listedBefore:new Date(P.listedBefore).toISOString()},protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  pool:{listed:B.listed,usable:L.symbols.length-1,usableShare,dropped:B.dropped},verdict,checks,failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),main:S,meanCostsX3:meanX3,unhedged:unh,btcLegMean:btcLeg.mean,variants,
  biggestLosses:ranked.slice(0,5),biggestGains:ranked.slice(-5).reverse(),discovery,joined,datasetHashes:B.hashes};
 const out='docs/estudos/listagens-2020-2021-2026-10-09';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
}
function markdown(r:any){
 const s=r.main,row=(v:any)=>`| ${v.label} | ${v.events} | ${pct(v.mean)} | ${v.tStat.toFixed(2)} | ${pct(v.median)} | ${(v.hitRate*100).toFixed(0)}% | ${pct(v.worst)} | ${v.portfolio?pct(v.portfolio.returnPct)+' / '+(v.portfolio.maxDrawdown*100).toFixed(1)+'%':'-'} |`;
 return [`# Resultado ${r.protocol.version}: venda de listagens novas com hedge de BTC, nas listagens de 2019 a 2021`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_LISTAGENS_2020_2021.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. ${r.pool.usable} das ${r.pool.listed} moedas listadas antes de 04/12/2021 tinham dados utilizáveis.`,'',
  `## Veredito: **${r.verdict}**${r.failed.length?' (reprovou em '+r.failed.join(', ')+')':''}`,'','| Critério | Passou |','|---|---|',...Object.entries(r.checks).map(([k,v])=>`| ${k} | ${v?'sim':'não'} |`),'',
  '## Números (venda 7 dias depois da listagem, por 28 dias, 1% por perna, hedge de BTC, stop em 150% pela máxima)','','| | Eventos | Média | t (por mês) | Mediana | Acerto | Pior evento | Carteira / queda máx. |','|---|---|---|---|---|---|---|---|',row(s),row(r.unhedged),...r.variants.map(row),'',
  `Média por evento com custos triplicados: ${pct(r.meanCostsX3)}. Média da perna de BTC isolada: ${pct(r.btcLegMean)}. Média sem o pior e o melhor 1%: ${pct(s.trimmedMean)}. Stops acionados: ${s.stops}.`,'',
  `Por ano de entrada: ${Object.entries(s.years).map(([y,v]:[string,any])=>`${y}: ${v.n} eventos, ${pct(v.mean)}`).join('; ')}.`,'',
  `Maiores perdas por moeda (soma dos retornos por evento): ${r.biggestLosses.map((x:any)=>x[0].replace('USDT','')+' '+pct(x[1])).join(', ')}. Maiores ganhos: ${r.biggestGains.map((x:any)=>x[0].replace('USDT','')+' '+pct(x[1])).join(', ')}.`,'',
  '## Junção com a amostra da descoberta (informação)','','| Amostra | Eventos | Média com hedge | t | Mediana |','|---|---|---|---|---|',
  `| Descoberta, 2022 a 2025 (mesmo motor, stop pelo fechamento) | ${r.discovery.events} | ${pct(r.discovery.mean)} | ${r.discovery.tStat.toFixed(2)} | ${pct(r.discovery.median)} |`,`| Nova, 2019 a 2021 | ${s.events} | ${pct(s.mean)} | ${s.tStat.toFixed(2)} | ${pct(s.median)} |`,`| Junção | ${r.joined.events} | ${pct(r.joined.mean)} | ${r.joined.tStat.toFixed(2)} | ${pct(r.joined.median)} |`,'',
  r.pool.dropped.length?`Moedas fora por qualidade ou falta de dados (${r.pool.dropped.length}): `+r.pool.dropped.map((d:any)=>d.symbol.replace('USDT','')+' ('+d.reason+')').join(', ')+'.':'','',
  '## Hashes das séries (SHA-256)','',...Object.entries(r.datasetHashes).map(([k,h])=>`- ${k}: \`${h}\``),''].join('\n');
}
if(process.argv[1]?.endsWith('listagens-2020-2021.ts'))main();
