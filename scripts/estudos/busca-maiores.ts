// Estudo BUSCA_MAIORES_V1 (docs/PROTOCOLO_BUSCA_MAIORES_V1.md): tendência (SMA50, SMA100, Donchian 55/20) nas 5 maiores moedas por volume,
// com alvo de volatilidade de 20% ao ano, em velas diárias à vista (2017 a 2026). Só dados públicos já baixados; não envia ordens.
// Uso: npx tsx scripts/estudos/busca-maiores.ts
import {readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import {loadSpot,type SpotSeries} from './spot-diario-perfil.js';
import {DAY,buildGrid,eligibility,positions,stats,coinAlone,type RuleId} from './busca-diaria-lib.js';
import {MAIORES,membership,scaledPortfolio} from './busca-maiores-lib.js';

const DIR='scripts/estudos/out',T0=Date.UTC(2017,7,17),ERA2=Date.UTC(2022,0,1),TRIALS=30,pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(1)+'%';
const RULES_MAIORES:RuleId[]=['SMA50','SMA100','DONCHIAN_55_20'];
export const BUSCA_MAIORES=Object.freeze({version:'BUSCA_MAIORES_V1',declaredAt:'2026-10-10',...MAIORES,rules:RULES_MAIORES,maximumDrawdown:0.30,minimumSharpe:0.8,minimumYearsPositive:6,minimumBreadth:0.6,minimumMemberDays:365,trials:TRIALS});
const P=BUSCA_MAIORES;

function main(){
 const files=readdirSync(DIR).filter(f=>f.startsWith('spot1d-')&&f.endsWith('.json')),series:SpotSeries[]=files.map(f=>loadSpot(`${DIR}/${f}`)).filter(s=>s.t.length>0);
 const lastT=Math.max(...series.map(s=>s.t.at(-1)!)),days=Math.round((lastT-T0)/DAY)+1,grid=buildGrid(series,T0,days),K=grid.coins.length,last=days-2,era2Start=Math.round((ERA2-T0)/DAY);
 const elig=grid.coins.map(c=>eligibility(c,days)),btcK=grid.coins.findIndex(c=>c.symbol==='BTCUSDT');
 const windows={full:[0,last] as [number,number],era1:[0,era2Start-1] as [number,number],era2:[era2Start,last] as [number,number]};
 const memberOf=(n:number)=>membership(grid,elig,n),member5=memberOf(P.universeSize),member3=memberOf(3),member10=memberOf(10);
 const btcOnly=grid.coins.map((_,k)=>k===btcK?elig[k]:new Uint8Array(days));
 const ones=grid.coins.map(()=>new Uint8Array(days).fill(1));
 const run=(pos:Uint8Array[],member:Uint8Array[],n:number,cost:number,w:[number,number],target=P.targetVol)=>{const r=scaledPortfolio(grid,pos,member,n,cost,w[0],w[1],target);return {r,s:stats(r.returns,1)};};
 const eachWin=(pos:Uint8Array[],member:Uint8Array[],n:number,cost:number,target=P.targetVol)=>Object.fromEntries(Object.entries(windows).map(([k,w])=>[k,run(pos,member,n,cost,w,target).s])) as Record<'full'|'era1'|'era2',ReturnType<typeof stats>>;
 const bench=eachWin(ones,member5,5,P.costPerSide);
 console.log('moedas',K,'| dias',days,'| bench (5 maiores sempre compradas, alvo 20%) full',pct(bench.full.total),'Sharpe',bench.full.sharpe.toFixed(2),'DD',pct(bench.full.maxDrawdown));
 const years=(r:ReturnType<typeof run>)=>{const out:Record<string,{ret:number;dd:number;scale:number;invested:number}>={};
  for(let y=2017;y<=2026;y++){const a=Math.max(0,Math.round((Date.UTC(y,0,1)-T0)/DAY)),b=Math.min(last,Math.round((Date.UTC(y+1,0,1)-T0)/DAY)-1);if(b-a<20)continue;
   const lo=a-r.r.from+1,hi=b-r.r.from+1,sl=(x:Float64Array)=>Array.from(x.slice(lo,hi)),avg=(x:number[])=>x.reduce((s,v)=>s+v,0)/Math.max(1,x.length);
   out[y]={ret:stats(r.r.returns,lo,hi).total,dd:stats(r.r.returns,lo,hi).maxDrawdown,scale:avg(sl(r.r.scale)),invested:avg(sl(r.r.invested))};}
  return out;};
 const results=RULES_MAIORES.map(rule=>{
  const pos=grid.coins.map(c=>positions(rule,c,days));
  const per=eachWin(pos,member5,5,P.costPerSide),x2=eachWin(pos,member5,5,P.costPerSide*2),full=run(pos,member5,5,P.costPerSide,windows.full),yr=years(full);
  const fullYears=[2018,2019,2020,2021,2022,2023,2024,2025],positiveYears=fullYears.filter(y=>(yr[y]?.ret??-1)>0).length;
  // Amplitude entre os membros: cada moeda sozinha, nos dias em que foi membro.
  const each=grid.coins.map((c,k)=>({symbol:c.symbol,...coinAlone(c,pos[k],member5[k],P.costPerSide,0,last)})).filter(x=>x.days>=P.minimumMemberDays);
  const breadth=each.length?each.filter(x=>x.total>0).length/each.length:0;
  const variants={
   n3:eachWin(pos,member3,3,P.costPerSide),n10:eachWin(pos,member10,10,P.costPerSide),vol15:eachWin(pos,member5,5,P.costPerSide,0.15),vol30:eachWin(pos,member5,5,P.costPerSide,0.30),noScale:eachWin(pos,member5,5,P.costPerSide,Infinity),
   btcAlone:eachWin(pos,btcOnly,1,P.costPerSide)};
  const checks:Record<string,boolean>={DATA_QUALITY:series.length/files.length>=0.9,
   POSITIVE_NET:per.full.total>0&&per.era1.total>0&&per.era2.total>0,
   BOUNDED_DRAWDOWN:per.full.maxDrawdown<=P.maximumDrawdown&&per.era1.maxDrawdown<=P.maximumDrawdown&&per.era2.maxDrawdown<=P.maximumDrawdown,
   SHARPE_BAR:(['full','era1','era2'] as const).every(k=>per[k].sharpe>=P.minimumSharpe&&per[k].sharpe>bench[k].sharpe),
   POSITIVE_YEARS:positiveYears>=P.minimumYearsPositive,COSTS_X2:(['full','era1','era2'] as const).every(k=>x2[k].total>0),MEMBER_BREADTH:breadth>=P.minimumBreadth};
  const turnover=full.r.turnover.reduce((a,b)=>a+b,0)/full.r.turnover.length;
  const members=[...new Set(grid.coins.map((c,k)=>member5[k].some(Boolean)?c.symbol:null).filter(Boolean))] as string[];
  const out={rule,verdict:Object.values(checks).every(Boolean)?'VALIDADA_MAIORES':'NAO_VALIDADA',failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,per,costsX2:x2,positiveYears,years:yr,breadth,memberCoins:each.length,variants,
   turnoverPerDay:turnover,costBpsPerYear:turnover*P.costPerSide*365*1e4,averageScale:full.r.scale.reduce((a,b)=>a+b,0)/full.r.scale.length,membersEver:members.length,
   worstMembers:[...each].sort((a,b)=>a.total-b.total).slice(0,5).map(x=>({symbol:x.symbol,total:x.total,buyHold:x.buyHoldTotal}))};
  console.log(rule.padEnd(15),out.verdict.padEnd(14),'full',pct(per.full.total),'Sharpe',per.full.sharpe.toFixed(2),'DD',pct(per.full.maxDrawdown),'| era1',pct(per.era1.total),per.era1.sharpe.toFixed(2),pct(per.era1.maxDrawdown),'| era2',pct(per.era2.total),per.era2.sharpe.toFixed(2),pct(per.era2.maxDrawdown),
   '| anos+',positiveYears+'/8','amplitude',(breadth*100).toFixed(0)+'%','x2',pct(x2.full.total),'| sem escala DD',pct(variants.noScale.full.maxDrawdown),out.failed.join(','));
  return out;
 });
 const sh=results.map(r=>r.per.full.sharpe/Math.sqrt(365)),mean=sh.reduce((a,b)=>a+b,0)/sh.length,variance=sh.reduce((a,b)=>a+(b-mean)**2,0)/(sh.length-1);
 const dsr=results.map(r=>{const pos=grid.coins.map(c=>positions(r.rule,c,days));const rr=scaledPortfolio(grid,pos,member5,5,P.costPerSide,0,last).returns;return {rule:r.rule,deflatedSharpe:deflatedSharpe(Array.from(rr).slice(1),TRIALS,variance).deflatedSharpe};});
 // Quem foi membro, por ano (informação).
 const membersByYear:Record<string,string[]>={};
 for(let y=2017;y<=2026;y++){const a=Math.round((Date.UTC(y,0,1)-T0)/DAY),b=Math.min(days-1,Math.round((Date.UTC(y+1,0,1)-T0)/DAY)-1);if(a>b)continue;
  const count=new Map<string,number>();grid.coins.forEach((c,k)=>{let d=0;for(let t=a;t<=b;t++)d+=member5[k][t];if(d>0)count.set(c.symbol.replace('USDT',''),d);});
  membersByYear[y]=[...count.entries()].sort((x,y2)=>y2[1]-x[1]).slice(0,8).map(([s,d])=>`${s} (${d} d)`);}
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_BUSCA_MAIORES_V1.md'],{encoding:'utf8'}).trim();
 const report={protocol:{...P,T0:new Date(T0).toISOString(),era2:new Date(ERA2).toISOString()},protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  data:{pairs:series.length,days,firstDay:new Date(T0).toISOString().slice(0,10),lastDay:new Date(lastT).toISOString().slice(0,10)},benchmark:bench,results,deflated:dsr,membersByYear,datasetHashes:Object.fromEntries(series.map(s=>[s.symbol,s.sha256]))};
 const out='docs/estudos/busca-maiores-v1-2026-10-10';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
}
function markdown(r:any){
 const f=(s:any)=>`${pct(s.total)} / ${s.sharpe.toFixed(2)} / ${(s.maxDrawdown*100).toFixed(1)}%`,res=r.results as any[],yrs=Object.keys(res[0].years);
 return [`# Resultado ${r.protocol.version}: tendência nas 5 maiores moedas por volume, com alvo de volatilidade`,'',
  `Executado em ${r.runAt}, fora do servidor, com velas diárias públicas da Binance, pelo protocolo \`docs/PROTOCOLO_BUSCA_MAIORES_V1.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. De ${r.data.firstDay} a ${r.data.lastDay}. Custo de 15 bps por lado; alvo de volatilidade de 20%; células "retorno / Sharpe / queda máxima".`,'',
  '## Veredito por regra','','| Regra | Veredito | Reprovou em |','|---|---|---|',...res.map(x=>`| ${x.rule} | **${x.verdict}** | ${x.failed.join(', ')||'-'} |`),'',
  '## Carteira das 5 maiores (alvo de volatilidade de 20%)','','| | Período inteiro | 2017 a 2021 | 2022 a 2026 |','|---|---|---|---|',`| **5 maiores sempre compradas** (benchmark, mesma escala) | ${f(r.benchmark.full)} | ${f(r.benchmark.era1)} | ${f(r.benchmark.era2)} |`,
  ...res.map(x=>`| ${x.rule} | ${f(x.per.full)} | ${f(x.per.era1)} | ${f(x.per.era2)} |`),'',
  '## Robustez','','| Regra | Anos positivos (de 8, 2018 a 2025) | Amplitude entre membros | Custos x2 (inteiro) | Fator de escala médio | Giro diário | Custo bps/ano | Sharpe deflacionado (30) |','|---|---|---|---|---|---|---|---|',
  ...res.map((x:any)=>`| ${x.rule} | ${x.positiveYears} | ${(x.breadth*100).toFixed(0)}% de ${x.memberCoins} | ${pct(x.costsX2.full.total)} | ${x.averageScale.toFixed(2)} | ${x.turnoverPerDay.toFixed(3)} | ${x.costBpsPerYear.toFixed(0)} | ${r.deflated.find((d:any)=>d.rule===x.rule).deflatedSharpe.toFixed(3)} |`),'',
  '## Variantes (informação, fora do veredito): período inteiro; 2017 a 2021; 2022 a 2026','','| Regra | Variante | Período inteiro | 2017 a 2021 | 2022 a 2026 |','|---|---|---|---|---|',
  ...res.flatMap((x:any)=>[['3 maiores','n3'],['10 maiores','n10'],['alvo de 15%','vol15'],['alvo de 30%','vol30'],['sem escala','noScale'],['BTC sozinho (alvo de 20%)','btcAlone']].map(([lbl,key])=>`| ${x.rule} | ${lbl} | ${f(x.variants[key].full)} | ${f(x.variants[key].era1)} | ${f(x.variants[key].era2)} |`)),'',
  '## Por ano (retorno / queda máxima; escala média e fração investida)','','| Regra | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',
  ...res.map((x:any)=>`| ${x.rule} | `+yrs.map(y=>x.years[y]?`${pct(x.years[y].ret)} / ${(x.years[y].dd*100).toFixed(0)}% · ${x.years[y].scale.toFixed(2)} · ${(x.years[y].invested*100).toFixed(0)}%`:'n/d').join(' | ')+' |'),'',
  '## Membros do universo, por ano (dias como membro)','',...Object.entries(r.membersByYear).map(([y,l]:[string,any])=>`- **${y}:** ${l.join(', ')}`),''].join('\n');
}
if(process.argv[1]?.endsWith('busca-maiores.ts'))main();
