// Estudo PIT_UNIVERSO_V1 (docs/PROTOCOLO_UNIVERSO_PONTO_NO_TEMPO.md): momentum de 28 dias com 2,5% por posição, em universo
// escolhido a cada 4 semanas pelo volume financeiro dos 672 h anteriores, dentre as 59 moedas com histórico completo.
// Roda fora do servidor, só com dados públicos da Binance USD-M já baixados (scripts/estudos/out); não envia ordens.
// Uso: npx tsx scripts/estudos/universo-pit.ts
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import type {PerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {validatePerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {simulateBlend,momentum} from './fatores-lib.js';
import {simulateLean,leanMomentum,toLean,addSymbol,sliceLean,subset,metricsShim,type LeanData,type LeanBook,type LeanResult} from './lean-sim.js';
import {load as loadOriginal,startOf,metrics,corr,pct,PROTOCOL as FATORES} from './fatores.js';
import {loadGroup,lastBarOf} from './mom-metade.js';

const H=3600000,LOOKBACK=672,REFRESH=672;
export const PIT=Object.freeze({version:'PIT_UNIVERSO_V1',declaredAt:'2026-10-09',universeSize:15,refreshHours:REFRESH,volumeWindowHours:LOOKBACK,firstDecisionBar:Date.UTC(2022,0,1,0),
 rule:{...FATORES.rule,legFraction:0.025},gate:{maximumDrawdown:0.15,minimumPositiveYears:3,maximumMarketCorrelation:0.3,maximumFilledShare:0.01,trials:17},split:Date.UTC(2024,6,1)});
const P=PIT;

/** Volume financeiro acumulado por moeda (volume em moeda x fechamento da hora), para somar janelas sem olhar o futuro. */
export function cumulativeQuoteVolume(d:PerpetualDataset){const c=new Float64Array(d.trade.length+1);d.trade.forEach((k,i)=>{c[i+1]=c[i]+k.volume*k.close;});return c;}
/** As `n` moedas de maior volume financeiro das `window` horas que terminam na vela `bar` (inclusive); empates em ordem alfabética. */
export function topByVolume(cum:Record<string,Float64Array>,pool:string[],bar:number,n:number,window=LOOKBACK){
 return pool.map(s=>({s,v:cum[s][bar+1]-cum[s][bar+1-window]})).sort((a,b)=>b.v-a.v||a.s.localeCompare(b.s)).slice(0,n).map(x=>x.s);
}
/** Universo ponto no tempo: recalculado a cada `refresh` horas a partir de `start`; só informação até a vela da decisão. */
export function pitEligibility(cum:Record<string,Float64Array>,pool:string[],start:number,n:number,refresh=REFRESH,window=LOOKBACK){
 const memo=new Map<number,ReadonlySet<string>>();
 return (_d:Record<string,PerpetualDataset>,_s:string[],i:number)=>{
  const bar=start+Math.floor((i-start)/refresh)*refresh;let set=memo.get(bar);
  if(!set){set=new Set(topByVolume(cum,pool,bar,n,window));memo.set(bar,set);}
  return set;
 };
}
const pnlBetween=(eq:{timestamp:number;equity:number}[],from:number,to:number)=>{const before=eq.filter(p=>p.timestamp<from).at(-1)?.equity??P.rule.initialCapital,pts=eq.filter(p=>p.timestamp>=from&&p.timestamp<to);if(pts.length<2)return null;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}return {pnl:pts.at(-1)!.equity-before,returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};};

function main(){
 const R=P.rule,G=P.gate,leanBook=(frac:number,eligible?:LeanBook['eligible']):LeanBook[]=>[{score:leanMomentum(672),legFraction:frac,longCount:5,shortCount:5,eligible}];
 const hashes:Record<string,string>={};let lean:LeanData,originalSymbols:string[],longBars:number;
 // 1) Regressão do controle (5% nas 15 originais, sem filtro) antes de qualquer número novo, com o simulador completo.
 {
  const {datasets,longOnly}=loadOriginal(),prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8'));
  const reg=simulateBlend(longOnly,{...FATORES.rule,startBar:startOf(longOnly)} as any,[{signal:momentum(672),legFraction:0.05,longCount:5,shortCount:5}]),ret=reg.netPnl/FATORES.rule.initialCapital,ok=Math.abs(ret-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005;
  console.log('regressão do controle (simulador completo)',pct(ret),'esperado',pct(prior.returnPct),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',ok?'OK':'FALHOU');
  if(!ok)throw Error('Teste de regressão do controle falhou: o estudo para e nada é reportado como resultado (protocolo)');
  longBars=longOnly[Object.keys(longOnly)[0]].trade.length;originalSymbols=Object.keys(datasets).sort();
  for(const s of originalSymbols)hashes[s]=validatePerpetualDataset(datasets[s],60000);
  lean=toLean(datasets);
 }
 // O mesmo controle com o simulador enxuto: precisa dar o mesmo número.
 {
  const prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8')),short=sliceLean(lean,longBars);
  const reg=simulateLean(short,{...FATORES.rule,startBar:short.timestamps.findIndex(t=>t===FATORES.firstDecisionBar)} as any,leanBook(0.05)),ret=reg.netPnl/FATORES.rule.initialCapital;
  const ok=Math.abs(ret-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005;
  console.log('regressão do controle (simulador enxuto)  ',pct(ret),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',ok?'OK':'FALHOU');
  if(!ok)throw Error('o simulador enxuto não reproduz o controle; o estudo para');
 }
 // 2) Pool de 59 moedas: as 15 originais e as 44 outras (ICP saiu na qualidade, como em MOM_METADE_V1), carregadas uma a uma.
 const u=JSON.parse(readFileSync('docs/estudos/universo-outras-moedas-2026-10-09.json','utf8')).universe as {symbol:string}[],lastBar=lastBarOf(),dropped:{symbol:string;reason:string}[]=[],otherSymbols:string[]=[];
 for(const c of u){
  const {datasets,dropped:d}=loadGroup([c.symbol],lastBar);dropped.push(...d);
  for(const [s,ds] of Object.entries(datasets)){hashes[s]=validatePerpetualDataset(ds,60000);lean=addSymbol(lean,s,ds);otherSymbols.push(s);}
 }
 otherSymbols.sort();const symbols=lean.symbols;
 if(symbols.length!==59)throw Error('o pool deveria ter 59 moedas e tem '+symbols.length);
 const start=lean.timestamps.findIndex(t=>t===P.firstDecisionBar);if(start<LOOKBACK)throw Error('histórico insuficiente');
 const cum:Record<string,Float64Array>={};symbols.forEach((s,k)=>{const c=new Float64Array(lean.timestamps.length+1);for(let i=0;i<lean.timestamps.length;i++)c[i+1]=c[i]+lean.volume[k][i]*lean.close[k][i];cum[s]=c;});
 const index=new Map(symbols.map((s,k)=>[s,k])),toIndexSet=new WeakMap<ReadonlySet<string>,ReadonlySet<number>>();
 const eligOf=(pool:string[],n:number):LeanBook['eligible']=>{const byName=pitEligibility(cum,pool,start,n);return (_d,i)=>{const names=byName({},[],i);let idx=toIndexSet.get(names);if(!idx){idx=new Set([...names].map(s=>index.get(s)!));toIndexSet.set(names,idx);}return idx;};};
 const shim=metricsShim(lean),cfg=(o:Record<string,number>={})=>({...R,startBar:start,...o} as any),run=(books:LeanBook[],ds=lean,o?:Record<string,number>)=>simulateLean(ds,cfg(o),books);
 // 3) Veredito: N = 15, 2,5% por posição.
 const base=run(leanBook(0.025,eligOf(symbols,P.universeSize))),doubled=run(leanBook(0.025,eligOf(symbols,P.universeSize)),lean,{feeRate:R.feeRate*2,slippageBps:R.slippageBps*2}),full=run(leanBook(0.05,eligOf(symbols,P.universeSize)));
 const m=metrics(shim,base as any,start),mf=metrics(shim,full as any,start),variance=JSON.parse(readFileSync('docs/estudos/fatores-v1-2026-10-09.json','utf8')).trialSharpeVariance as number;
 const dsr=deflatedSharpe(m.returns,G.trials,variance).deflatedSharpe,positiveYears=Object.values(m.years).filter(y=>!y.partial&&y.returnPct>0).length;
 const h1=pnlBetween(base.equitySeries,P.firstDecisionBar,P.split),h2=pnlBetween(base.equitySeries,P.split,Date.UTC(2100,0,1));
 const checks:Record<string,boolean>={DATA_QUALITY:otherSymbols.length===44&&dropped.length<=1,POSITIVE_PNL:m.netPnl>0,BOUNDED_DRAWDOWN:m.maxDrawdown<=G.maximumDrawdown,POSITIVE_YEARS:positiveYears>=G.minimumPositiveYears,
  DOUBLED_COSTS_POSITIVE:doubled.netPnl>0,MARKET_NEUTRAL:Math.abs(m.marketCorrelation)<=G.maximumMarketCorrelation,BOTH_HALVES_POSITIVE:(h1?.pnl??-1)>0&&(h2?.pnl??-1)>0};
 const verdict=Object.values(checks).every(Boolean)?'VALIDADA_PONTO_NO_TEMPO':'NAO_VALIDADA';
 console.log('PIT 15',verdict,pct(m.returnPct),'DD',(m.maxDrawdown*100).toFixed(1)+'%','(5%:',(mf.maxDrawdown*100).toFixed(1)+'%)','anos+',positiveYears,'x2',doubled.netPnl.toFixed(0),'corr',m.marketCorrelation.toFixed(2),'Sharpe',m.sharpeAnnualized.toFixed(2),'DSR',dsr.toFixed(3),Object.entries(checks).filter(([,v])=>!v).map(([k])=>k).join(','));
 // 4) Informação (fora do veredito).
 const describe=(label:string,r:LeanResult)=>{const x=metrics(shim,r as any,start);return {label,returnPct:x.returnPct,maxDrawdown:x.maxDrawdown,sharpeAnnualized:x.sharpeAnnualized,positiveYears:Object.values(x.years).filter(y=>!y.partial&&y.returnPct>0).length,years:x.years,marketCorrelation:x.marketCorrelation,weeklyReturns:x.weeklyReturns,closedLegs:x.closedLegs,turnover:x.turnover};};
 const show=(v:ReturnType<typeof describe>)=>console.log('  ',v.label.padEnd(34),pct(v.returnPct),'DD',(v.maxDrawdown*100).toFixed(1)+'%','Sharpe',v.sharpeAnnualized.toFixed(2),'anos+',v.positiveYears);
 const variants=[10,20,30].map(n=>describe(`PIT com ${n} moedas`,run(leanBook(0.025,eligOf(symbols,n))))),
  semOriginais=describe('PIT só entre as 44 outras',run(leanBook(0.025,eligOf(otherSymbols,P.universeSize)))),
  fixo59=describe('Universo fixo de 59 (sem filtro)',run(leanBook(0.025))),
  originais15=describe('15 originais fixas (referência)',run(leanBook(0.025),subset(lean,originalSymbols)));
 [...variants,semOriginais,fixo59,originais15].forEach(show);
 // Composição: quantas das 15 vagas vão para as 15 originais, por ano.
 const byYear:Record<string,{vagas:number;originais:number;refreshes:number}>={};
 for(let bar=start;bar<lean.timestamps.length-1;bar+=REFRESH){const y=String(new Date(lean.timestamps[bar]).getUTCFullYear()),top=topByVolume(cum,symbols,bar,P.universeSize),e=byYear[y]??={vagas:0,originais:0,refreshes:0};e.refreshes++;e.vagas+=top.length;e.originais+=top.filter(s=>originalSymbols.includes(s)).length;}
 const composition=Object.fromEntries(Object.entries(byYear).map(([y,e])=>[y,{refreshes:e.refreshes,shareOriginals:e.originais/e.vagas}]));
 const weeklyVsOriginals=corr(m.weeklyReturns,originais15.weeklyReturns);
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_UNIVERSO_PONTO_NO_TEMPO.md'],{encoding:'utf8'}).trim(),strip=({weeklyReturns,...r}:any)=>r;
 const report={protocol:{...P,split:new Date(P.split).toISOString()},protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),pool:{count:symbols.length,originals:originalSymbols.length,others:otherSymbols.length,dropped},
  engine:'scripts/estudos/lean-sim.ts (conferido contra simulateBlend em teste e contra o controle publicado)',verdict,checks,failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),
  pit15:{netPnl:m.netPnl,returnPct:m.returnPct,maxDrawdown:m.maxDrawdown,sharpeAnnualized:m.sharpeAnnualized,marketCorrelation:m.marketCorrelation,years:m.years,positiveYears,doubledPnl:doubled.netPnl,halves:{first:h1,second:h2},decisions:m.rebalances,closedLegs:m.closedLegs,turnover:m.turnover,feesPaid:m.feesPaid,fundingCashDelta:m.fundingCashDelta,buyHold:m.buyHold,deflatedSharpe:dsr,
   fullSize:{returnPct:mf.returnPct,maxDrawdown:mf.maxDrawdown,sharpeAnnualized:mf.sharpeAnnualized},drawdownRatio:m.maxDrawdown/mf.maxDrawdown,weeklyCorrelationWithOriginals:weeklyVsOriginals},
  variants:[...variants,semOriginais,fixo59,originais15].map(strip),composition,datasetHashes:hashes};
 const out='docs/estudos/universo-pit-2026-10-09';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
 console.log('composição (parte das vagas nas 15 originais, %)',JSON.stringify(Object.fromEntries(Object.entries(composition).map(([y,c])=>[y,+(c.shareOriginals*100).toFixed(0)]))));
}function markdown(r:any){
 const yrs=['2022','2023','2024','2025','2026'],yr=(y:any,k:string)=>y[k]?`${pct(y[k].returnPct)} / ${(y[k].maxDrawdown*100).toFixed(1)}%${y[k].partial?' (parcial)':''}`:'n/d',p=r.pit15,hv=(h:any)=>h?`${pct(h.returnPct)} / ${(h.maxDrawdown*100).toFixed(1)}%`:'n/d';
 return [`# Resultado ${r.protocol.version}: momentum de 28 dias em universo ponto no tempo`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_UNIVERSO_PONTO_NO_TEMPO.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Pool de ${r.pool.count} moedas (${r.pool.originals} originais e ${r.pool.others} outras); a cada 4 semanas, as 15 de maior volume financeiro dos 672 h anteriores; 5 compradas e 5 vendidas; 2,5% por posição; 01/01/2022 ao fim de out/2026.`,'',
  `## Veredito: **${r.verdict}**${r.failed.length?' (reprovou em '+r.failed.join(', ')+')':''}`,'','| Critério | Passou |','|---|---|',...Object.entries(r.checks).map(([k,v])=>`| ${k} | ${v?'sim':'não'} |`),'',
  '## Números (verdade: universo ponto no tempo de 15, 2,5% por posição)','','| Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Corr. mercado | Anos + (de 4) | 1ª metade | 2ª metade | Comprar e segurar (cesta do universo) |','|---|---|---|---|---|---|---|---|---|',
  `| ${pct(p.returnPct)} | ${(p.maxDrawdown*100).toFixed(1)}% | ${p.sharpeAnnualized.toFixed(2)} | ${p.doubledPnl.toFixed(0)} | ${p.marketCorrelation.toFixed(2)} | ${p.positiveYears} | ${hv(p.halves.first)} | ${hv(p.halves.second)} | ${pct(p.buyHold)} |`,'',
  `Com 5% por posição: ${pct(p.fullSize.returnPct)}, queda máxima ${(p.fullSize.maxDrawdown*100).toFixed(1)}% (razão das quedas ${p.drawdownRatio.toFixed(2)}). Correlação semanal com as 15 originais fixas: ${p.weeklyCorrelationWithOriginals.toFixed(2)}. Sharpe deflacionado (17 tentativas, fora do veredito): ${p.deflatedSharpe.toFixed(3)}. Taxas ${p.feesPaid.toFixed(0)}, funding ${p.fundingCashDelta.toFixed(0)}, giro ${p.turnover.toFixed(0)}x, ${p.decisions} decisões, ${p.closedLegs} posições encerradas.`,'',
  '## Por ano (retorno / queda máxima no ano)','','| | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',`| **PIT, 15 moedas** | `+yrs.map(y=>yr(p.years,y)).join(' | ')+' |',...r.variants.map((v:any)=>`| ${v.label} | `+yrs.map(y=>yr(v.years,y)).join(' | ')+' |'),'',
  '## Variantes (informação, fora do veredito)','','| Variante | Retorno | Queda máx. | Sharpe anual | Anos + | Corr. mercado |','|---|---|---|---|---|---|',
  ...r.variants.map((v:any)=>`| ${v.label} | ${pct(v.returnPct)} | ${(v.maxDrawdown*100).toFixed(1)}% | ${v.sharpeAnnualized.toFixed(2)} | ${v.positiveYears} | ${v.marketCorrelation.toFixed(2)} |`),'',
  '## Composição do universo: parte das 15 vagas ocupada pelas 15 moedas originais','','| Ano | Atualizações | Parte das vagas |','|---|---|---|',...Object.entries(r.composition).map(([y,c]:[string,any])=>`| ${y} | ${c.refreshes} | ${(c.shareOriginals*100).toFixed(0)}% |`),'',
  r.pool.dropped.length?'Moedas fora do pool por qualidade de dados: '+r.pool.dropped.map((d:any)=>d.symbol+' ('+d.reason+')').join(', ')+'.':'',
  '','Hashes dos datasets (SHA-256):','',...Object.entries(r.datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``)].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('universo-pit.ts'))main();
