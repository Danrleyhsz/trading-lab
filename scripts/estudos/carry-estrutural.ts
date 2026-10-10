// Estudo CARRY_ESTRUTURAL_V2 (docs/PROTOCOLO_CARRY_ESTRUTURAL_V2.md): carry de funding delta-neutro com reajuste semanal, universo ponto no tempo.
// Só dados públicos da Binance (à vista e USD-M); não envia ordens e não toca em contas.
//   npx tsx scripts/estudos/carry-estrutural.ts --download [--from=reverse|middle]   baixa à vista e perpétuo das moedas do universo; retomável
//   npx tsx scripts/estudos/carry-estrutural.ts                                       análise e relatório
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {hourlyReturns,moments,probabilisticSharpe} from '../../src/domain/backtest-robustness.js';
import {simulateCarryV2,type CarryCoin,type CarryV2Config,type CarryV2Result} from './carry-v2-lib.js';
import {loadPool,universeFactory} from './pool-completo.js';
import {lastBarOf} from './mom-metade.js';
import {pct} from './fatores.js';

const H=3600000,dir='scripts/estudos/out',FIRST=Date.UTC(2021,11,4,0),REFRESH=672,SQRT_YEAR=Math.sqrt(24*365);
export const CARRY2=Object.freeze({version:'CARRY_ESTRUTURAL_V2',declaredAt:'2026-10-09',universeSize:15,firstDecisionBar:Date.UTC(2022,0,1,0),
 rule:{rebalanceHours:168,signalHours:168,maxPositions:5,positionFraction:0.1,entryMinimumFunding:0.00105,exitFunding:0,minimumCashToShortNotional:0.5,spotFeeRate:0.001,perpFeeRate:0.00055,slippageBps:2,maintenanceRate:0.01,initialCapital:10000},
 screen:{maximumFilledShare:0.01,minimumUsableShare:0.9,maximumDrawdown:0.15,minimumPositiveYears:4,sharpeBenchmarkAnnual:1,minimumProbability:0.9,minimumAnnualizedReturn:0.04}});
const P=CARRY2,file=(s:string)=>`${dir}/carry2-${s}.json`;

/** Símbolo à vista e multiplicador de preço: `1000XUSDT` (perpétuo) negocia como `XUSDT` à vista, com preço 1 000 vezes menor. */
export function spotOf(perp:string){const m=/^(1000000|1000)(.+USDT)$/.exec(perp);return m?{spot:m[2],mult:Number(m[1])}:{spot:perp,mult:1};}

interface Series {first:number;count:number;o:number[];h:number[];l:number[];c:number[];filled:number}
interface Stored {symbol:string;spotSymbol:string;mult:number;spot:Series;perp:Series;sha256:string}
const sleep=(ms:number)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
function getJson(host:string,path:string,params:Record<string,string|number>){
 const url=host+path+'?'+new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
 for(let attempt=0;attempt<4;attempt++){
  const out=execFileSync('curl',['-sS','-m','30','-w','\n%{http_code}',url],{encoding:'utf8',maxBuffer:64*1024*1024}),i=out.lastIndexOf('\n'),status=Number(out.slice(i+1));
  if(status===200){sleep(600);return JSON.parse(out.slice(0,i));}
  if(status===418||status===429)throw Error('Binance HTTP '+status+': pausa necessária');
  if(status===400)return [];
  sleep(3000);
 }
 throw Error('Binance indisponível para '+path);
}
function klines(host:string,path:string,symbol:string,limit:number,lastBar:number):Series{
 const raw:{t:number;o:number;h:number;l:number;c:number}[]=[];let cursor=FIRST;
 while(cursor<=lastBar){const page=getJson(host,path,{symbol,interval:'1h',startTime:cursor,endTime:lastBar+H-1,limit}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({t:Number(r[0]),o:Number(r[1]),h:Number(r[2]),l:Number(r[3]),c:Number(r[4])});cursor=raw.at(-1)!.t+H;}
 if(!raw.length)return {first:0,count:0,o:[],h:[],l:[],c:[],filled:0};
 const by=new Map(raw.map(r=>[r.t,r])),first=raw[0].t,last=raw.at(-1)!.t,o:number[]=[],h:number[]=[],l:number[]=[],c:number[]=[];let filled=0,prev=raw[0].c;
 for(let t=first;t<=last;t+=H){const k=by.get(t);if(k){o.push(k.o);h.push(k.h);l.push(k.l);c.push(k.c);prev=k.c;}else{o.push(prev);h.push(prev);l.push(prev);c.push(prev);filled++;}}
 return {first,count:o.length,o,h,l,c,filled};
}
const spotListing=async()=>{const r=await fetch('https://api.binance.com/api/v3/exchangeInfo');if(!r.ok)throw new Error('HTTP '+r.status);return new Set(((await r.json()) as any).symbols.filter((s:any)=>s.status==='TRADING'&&s.quoteAsset==='USDT').map((s:any)=>s.symbol as string));};

/** Universo ponto no tempo e a união das moedas que alguma vez entram nele, só com volume do perpétuo e existência de par à vista. */
async function plan(){
 const lastBar=lastBarOf(),bars=Math.round((lastBar-FIRST)/H)+1,start=Math.round((P.firstDecisionBar-FIRST)/H),L=loadPool(start,bars),spot=await spotListing();
 const hasSpot=(k:number)=>spot.has(spotOf(L.lean.symbols[k]).spot);
 const elig=universeFactory(L,start)(hasSpot,P.universeSize,'comSpot');
 const union=new Set<number>();for(let b=start;b<bars-1;b+=REFRESH)for(const k of elig!(L.lean,b))union.add(k);
 return {L,start,bars,lastBar,union:[...union].map(k=>L.lean.symbols[k]).sort(),withSpot:L.lean.symbols.filter((_,k)=>hasSpot(k)).length,elig:elig!};
}
async function download(){
 mkdirSync(dir,{recursive:true});const {union,lastBar,withSpot,L}=await plan();
 console.log('moedas do pool com par à vista:',withSpot,'de',L.lean.symbols.length,'| união do universo ponto no tempo:',union.length);
 const from=process.argv.find(a=>a.startsWith('--from='))?.slice(7),order=[...union];if(from==='reverse')order.reverse();if(from==='middle')order.push(...order.splice(0,Math.floor(order.length/2)));
 let done=0;
 for(const [n,s] of order.entries()){
  if(existsSync(file(s)))continue;
  try{
   const {spot,mult}=spotOf(s),sp=klines('https://api.binance.com','/api/v3/klines',spot,1000,lastBar),pp=klines('https://fapi.binance.com','/fapi/v1/klines',s,1500,lastBar);
   const body={symbol:s,spotSymbol:spot,mult,spot:sp,perp:pp},sha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');
   writeFileSync(file(s),JSON.stringify({...body,sha256}));done++;console.log(`[${n+1}/${order.length}] ${s} (à vista ${spot}) ${sp.count}/${pp.count} velas, preenchidas ${sp.filled}/${pp.filled}`);
  }catch(e){const msg=String((e as Error).message);console.log(`[${n+1}/${order.length}] ${s} ERRO ${msg}`);if(/HTTP (418|429)/.test(msg)){console.log('parando: a corretora pediu para reduzir o ritmo; rode de novo mais tarde');process.exit(2);}}
 }
 console.log('baixadas',done,'de',union.length);
}

const pnlYear=(eq:{timestamp:number;equity:number}[],y:number,initial:number)=>{const pts=eq.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);if(pts.length<2)return null;
 const before=eq.filter(p=>p.timestamp<pts[0].timestamp).at(-1)?.equity??initial;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}return {returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};};

async function analyze(){
 const {L,start,bars,union,elig}=await plan(),dropped:{symbol:string;reason:string}[]=[],coins:CarryCoin[]=[],hashes:Record<string,string>={},spotShare:Record<string,{spot:number;perp:number}>={};
 // Séries utilizáveis nas duas pontas; a janela comum vai da maior primeira vela à menor última.
  for(const s of union){
  if(!existsSync(file(s))){dropped.push({symbol:s,reason:'sem arquivo (não baixado)'});continue;}
  const d=JSON.parse(readFileSync(file(s),'utf8')) as Stored;
  if(!d.spot.count||!d.perp.count){dropped.push({symbol:s,reason:'sem velas à vista ou no perpétuo'});continue;}
  const fs=d.spot.filled/d.spot.count,fp=d.perp.filled/d.perp.count;
  if(Math.max(fs,fp)>P.screen.maximumFilledShare){dropped.push({symbol:s,reason:`${(Math.max(fs,fp)*100).toFixed(2)}% de horas preenchidas`});continue;}
  const sf=Math.round((d.spot.first-FIRST)/H),pf=Math.round((d.perp.first-FIRST)/H),sl=sf+d.spot.count-1,pl=pf+d.perp.count-1,first=Math.max(sf,pf),last=Math.min(sl,pl);
  if(last-first<200){dropped.push({symbol:s,reason:'janela comum curta'});continue;}
  const cut=(a:number[],f:number,mult:number)=>Float64Array.from(a.slice(first-f,last-f+1),v=>v*mult);
  coins.push({symbol:s,first,last,spotO:cut(d.spot.o,sf,d.mult),spotC:cut(d.spot.c,sf,d.mult),perpO:cut(d.perp.o,pf,1),perpH:cut(d.perp.h,pf,1),perpC:cut(d.perp.c,pf,1),
   funding:[]});
  hashes[s]=d.sha256;spotShare[s]={spot:fs,perp:fp};
 }
 // Funding do arquivo do pool (já com preço de marcação preenchido pela abertura).
 for(const c of coins){const f=JSON.parse(readFileSync(`${dir}/pool-${c.symbol}.json`,'utf8')) as {funding:[number,number,number][]};c.funding=f.funding.map(([timestamp,rate,markPrice])=>({timestamp,rate,markPrice}));}
 const usableShare=coins.length/union.length,coinIndex=new Map(coins.map((c,k)=>[c.symbol,k]));
 console.log('universo: união',union.length,'utilizáveis',coins.length,`(${(usableShare*100).toFixed(1)}%)`,'fora:',dropped.map(d=>d.symbol+':'+d.reason).join('; ')||'-');
 // Universo ponto no tempo: o do perpétuo (volume) restrito às moedas utilizáveis, com a janela comum.
 const universeAt=(i:number)=>{const out=new Set<number>();for(const k of elig(L.lean,i)){const c=coinIndex.get(L.lean.symbols[k]);if(c!==undefined)out.add(c);}return out as ReadonlySet<number>;};
 const base:CarryV2Config={t0:FIRST,bars,startBar:start,...P.rule,resize:true,universe:universeAt};
 const run=(o:Partial<CarryV2Config>):CarryV2Result=>simulateCarryV2(coins,{...base,...o});
 const metrics=(r:CarryV2Result)=>{
  const returns=hourlyReturns(r.equitySeries),m=moments(returns),sr0=P.screen.sharpeBenchmarkAnnual/SQRT_YEAR,probability=probabilisticSharpe(m,sr0);
  const years:Record<string,{returnPct:number;maxDrawdown:number}>={};for(const y of [2022,2023,2024,2025,2026]){const v=pnlYear(r.equitySeries,y,P.rule.initialCapital);if(v)years[y]=v;}
  const span=(r.equitySeries.at(-1)!.timestamp-r.equitySeries[0].timestamp+H)/(365*24*H),annualized=r.finalEquity>0?(r.finalEquity/P.rule.initialCapital)**(1/span)-1:-1;
  // Cesta do universo: retorno médio das moedas à vista presentes nas duas horas.
  const basket=r.equitySeries.slice(1).map((_,j)=>{const i=start+j+1;let s=0,n=0;for(const c of coins){if(c.first<=i-1&&i<=c.last){s+=c.spotC[i-c.first]/c.spotC[i-1-c.first]-1;n++;}}return n?s/n:0;});
  const mine=returns.slice(0,basket.length),mm=mine.reduce((a,b)=>a+b,0)/mine.length,mb=basket.reduce((a,b)=>a+b,0)/basket.length;let cov=0,va=0,vb=0;for(let k=0;k<mine.length;k++){cov+=(mine[k]-mm)*(basket[k]-mb);va+=(mine[k]-mm)**2;vb+=(basket[k]-mb)**2;}
  const positiveYears=Object.values(years).filter(y=>y.returnPct>0).length;
  return {returnPct:r.netPnl/P.rule.initialCapital,annualizedReturn:annualized,maxDrawdown:r.maxDrawdown,years,positiveYears,sharpeAnnualized:m.sharpe*SQRT_YEAR,probabilitySharpeAboveOne:probability,marketCorrelation:va>0&&vb>0?cov/Math.sqrt(va*vb):NaN,
   fundingReceived:r.fundingReceived,feesPaid:r.feesPaid,basisPnl:r.basisPnl,entries:r.entries,exits:r.exits,resizes:r.resizes,forcedExits:r.forcedExits,investedShare:r.investedHours/r.equitySeries.length,averagePositions:r.positionHours/r.equitySeries.length,
   minimumMarginRatio:r.minimumMarginRatio,liquidatedAt:r.liquidatedAt===null?null:new Date(r.liquidatedAt).toISOString(),decisions:r.decisions};
 };
 const main=run({}),M=metrics(main);
 const S=P.screen,checks:Record<string,boolean>={DATA_QUALITY:usableShare>=S.minimumUsableShare,NO_LIQUIDATION:main.liquidatedAt===null,POSITIVE_PNL:main.netPnl>0,BOUNDED_DRAWDOWN:main.maxDrawdown<=S.maximumDrawdown,
  POSITIVE_YEARS:M.positiveYears>=S.minimumPositiveYears,SHARPE_ABOVE_ONE:Number.isFinite(M.probabilitySharpeAboveOne)&&M.probabilitySharpeAboveOne>=S.minimumProbability,BEATS_CASH:M.annualizedReturn>=S.minimumAnnualizedReturn};
 const verdict=Object.values(checks).every(Boolean)?'VALIDADA_CARRY':'NAO_VALIDADA';
 const show=(label:string,x:ReturnType<typeof metrics>)=>console.log(label.padEnd(30),pct(x.returnPct),'anual',pct(x.annualizedReturn),'DD',(x.maxDrawdown*100).toFixed(1)+'%','anos+',x.positiveYears+'/'+Object.keys(x.years).length,'Sharpe',x.sharpeAnnualized.toFixed(2),'P(SR>1)',x.probabilitySharpeAboveOne.toFixed(2),'funding',x.fundingReceived.toFixed(0),'taxas',x.feesPaid.toFixed(0),'base',x.basisPnl.toFixed(0),'invest.',(x.investedShare*100).toFixed(0)+'%','margem',x.minimumMarginRatio?.toFixed(2),x.liquidatedAt??'');
 show('PRINCIPAL (V2, 10%, 15 moedas)',M);console.log('veredito',verdict,Object.entries(checks).filter(([,v])=>!v).map(([k])=>k).join(','));
 const variants=[
  {label:'Sem reajuste (comportamento de V1)',r:run({resize:false})},
  {label:'Tamanho-alvo de 5%',r:run({positionFraction:0.05})},
  {label:'Tamanho-alvo de 15%',r:run({positionFraction:0.15})},
  {label:'Tamanho-alvo de 20%',r:run({positionFraction:0.2})}].map(v=>({label:v.label,...metrics(v.r)}));
 for(const v of variants)show(v.label,v);
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_CARRY_ESTRUTURAL_V2.md'],{encoding:'utf8'}).trim();
 const report={protocol:P,protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),pool:{perpsInPool:L.lean.symbols.length,unionOfUniverse:union.length,usable:coins.length,usableShare,dropped},
  verdict,checks,failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),main:M,variants,heldBySymbol:main.heldBySymbol,symbols:coins.map(c=>c.symbol),datasetHashes:hashes};
 const out='docs/estudos/carry-estrutural-v2-2026-10-09';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
}
function markdown(r:any){
 const m=r.main,yrs=['2022','2023','2024','2025','2026'],yr=(y:any,k:string)=>y[k]?`${pct(y[k].returnPct)} / ${(y[k].maxDrawdown*100).toFixed(2)}%`:'n/d';
 return [`# Resultado ${r.protocol.version}: carry de funding delta-neutro com reajuste semanal`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance (à vista e USD-M), pelo protocolo \`docs/PROTOCOLO_CARRY_ESTRUTURAL_V2.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Universo ponto no tempo de ${r.protocol.universeSize} moedas entre as ${r.pool.perpsInPool} perpétuas do pool com par à vista; ${r.pool.unionOfUniverse} moedas entraram alguma vez, ${r.pool.usable} utilizáveis. 01/01/2022 a 05/10/2026.`,'',
  `## Veredito: **${r.verdict}**${r.failed.length?' (reprovou em '+r.failed.join(', ')+')':''}`,'','| Critério | Passou |','|---|---|',...Object.entries(r.checks).map(([k,v])=>`| ${k} | ${v?'sim':'não'} |`),'',
  '## Números (principal)','','| Medida | Valor |','|---|---|',`| Retorno no período | ${pct(m.returnPct)} |`,`| Retorno anualizado | ${pct(m.annualizedReturn)} |`,`| Queda máxima | ${(m.maxDrawdown*100).toFixed(2)}% |`,`| Anos positivos | ${m.positiveYears} de ${Object.keys(m.years).length} |`,
  `| Sharpe anual | ${m.sharpeAnnualized.toFixed(2)} |`,`| Probabilidade de o Sharpe verdadeiro passar de 1,0 | ${(m.probabilitySharpeAboveOne*100).toFixed(1)}% |`,`| Funding recebido / taxas / diferença de preços (à vista × perpétuo) | ${m.fundingReceived.toFixed(0)} / ${m.feesPaid.toFixed(0)} / ${m.basisPnl.toFixed(0)} |`,
  `| Tempo investido / média de moedas | ${(m.investedShare*100).toFixed(0)}% / ${m.averagePositions.toFixed(2)} |`,`| Entradas / saídas / reajustes / saídas forçadas | ${m.entries} / ${m.exits} / ${m.resizes} / ${m.forcedExits} |`,
  `| Menor folga de margem | ${m.minimumMarginRatio===null?'—':(m.minimumMarginRatio*100).toFixed(1)+'%'} |`,`| Liquidação | ${m.liquidatedAt??'nenhuma'} |`,`| Correlação horária com a cesta do universo | ${m.marketCorrelation.toFixed(2)} |`,'',
  '## Por ano (retorno / queda máxima no ano)','','| | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',`| **Principal** | `+yrs.map(y=>yr(m.years,y)).join(' | ')+' |',...r.variants.map((v:any)=>`| ${v.label} | `+yrs.map(y=>yr(v.years,y)).join(' | ')+' |'),'',
  '## Variantes (informação, fora do veredito)','','| Variante | Retorno | Anualizado | Queda máx. | Sharpe | P(Sharpe>1) | Funding | Taxas | Liquidação |','|---|---|---|---|---|---|---|---|---|',
  ...r.variants.map((v:any)=>`| ${v.label} | ${pct(v.returnPct)} | ${pct(v.annualizedReturn)} | ${(v.maxDrawdown*100).toFixed(1)}% | ${v.sharpeAnnualized.toFixed(2)} | ${(v.probabilitySharpeAboveOne*100).toFixed(0)}% | ${v.fundingReceived.toFixed(0)} | ${v.feesPaid.toFixed(0)} | ${v.liquidatedAt??'nenhuma'} |`),'',
  'Semanas na carteira por moeda: '+Object.entries(r.heldBySymbol).sort((a:any,b:any)=>b[1]-a[1]).map(([s,n])=>`${s} ${n}`).join(', ')+'.','',
  r.pool.dropped.length?`Moedas fora por qualidade ou falta de dados (${r.pool.dropped.length}): `+r.pool.dropped.map((d:any)=>d.symbol.replace('USDT','')+' ('+d.reason+')').join(', ')+'.':'','',
  '## Hashes das séries (SHA-256, à vista e perpétuo)','',...Object.entries(r.datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``),''].join('\n');
}
if(process.argv[1]?.endsWith('carry-estrutural.ts')){if(process.argv.includes('--download'))void download();else void analyze();}
