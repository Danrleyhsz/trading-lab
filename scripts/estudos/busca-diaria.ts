// Estudo BUSCA_DIARIA_V1 (docs/PROTOCOLO_BUSCA_DIARIA_V1.md): cinco regras compradas-ou-fora, por moeda, em velas diárias à vista da Binance
// (712 pares USDT, 206 já retirados), de 2017 a 2026. Só dados públicos já baixados; não envia ordens. Uso: npx tsx scripts/estudos/busca-diaria.ts
import {readdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import {loadSpot,type SpotSeries} from './spot-diario-perfil.js';
import {DAY,RULES,COST_PER_SIDE,buildGrid,eligibility,positions,portfolio,buyHoldPositions,stats,coinAlone,halfOf,type RuleId,type Grid} from './busca-diaria-lib.js';

const DIR='scripts/estudos/out',T0=Date.UTC(2017,7,17),ERA2=Date.UTC(2022,0,1),TRIALS=27,pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(1)+'%';
export const BUSCA_DIARIA=Object.freeze({version:'BUSCA_DIARIA_V1',declaredAt:'2026-10-10',costPerSide:COST_PER_SIDE,rules:RULES,maximumDrawdown:0.30,minimumSharpe:0.8,minimumBreadth:0.6,minimumCoinDays:365,trials:TRIALS});
const P=BUSCA_DIARIA;

function main(){
 const files=readdirSync(DIR).filter(f=>f.startsWith('spot1d-')&&f.endsWith('.json')),series:SpotSeries[]=files.map(f=>loadSpot(`${DIR}/${f}`)).filter(s=>s.t.length>0);
 const lastT=Math.max(...series.map(s=>s.t.at(-1)!)),days=Math.round((lastT-T0)/DAY)+1,grid:Grid=buildGrid(series,T0,days);
 const usableCoins=grid.coins.filter(c=>!c.pegged),era2Start=Math.round((ERA2-T0)/DAY),last=days-2;
 const elig=grid.coins.map(c=>eligibility(c,days)),K=grid.coins.length;
 const symbolOf=(k:number)=>grid.coins[k].symbol,btcK=grid.coins.findIndex(c=>c.symbol==='BTCUSDT');
 const windows={full:[0,last] as [number,number],era1:[0,era2Start-1] as [number,number],era2:[era2Start,last] as [number,number]};
 const run=(pos:Uint8Array[],cost:number,w:[number,number],mask?:(k:number)=>boolean)=>{const r=portfolio(grid,pos,elig,cost,w[0],w[1],mask);return {r,s:stats(r.returns,1)};};
 const bhPos=buyHoldPositions(grid),bench=Object.fromEntries(Object.entries(windows).map(([k,w])=>[k,run(bhPos,COST_PER_SIDE,w).s]));
 const btcBench=Object.fromEntries(Object.entries(windows).map(([k,w])=>[k,run(bhPos,COST_PER_SIDE,w,i=>i===btcK).s]));
 console.log('pares',series.length,'| não atrelados',usableCoins.length,'| dias',days,'| bench cesta full',pct(bench.full.total),'Sharpe',bench.full.sharpe.toFixed(2),'DD',pct(bench.full.maxDrawdown));
 const results=RULES.map((rule:RuleId)=>{
  const pos=grid.coins.map(c=>positions(rule,c,days));
  const per=Object.fromEntries(Object.entries(windows).map(([k,w])=>[k,run(pos,COST_PER_SIDE,w).s])),x2=Object.fromEntries(Object.entries(windows).map(([k,w])=>[k,run(pos,COST_PER_SIDE*2,w).s]));
  const full=run(pos,COST_PER_SIDE,windows.full),halves=[0,1].map(h=>run(pos,COST_PER_SIDE,windows.full,k=>halfOf(symbolOf(k))===h).s);
  const survivors=run(pos,COST_PER_SIDE,windows.full,k=>grid.coins[k].status==='TRADING').s,btc=run(pos,COST_PER_SIDE,windows.full,k=>k===btcK).s;
  const btcByEra=Object.fromEntries(Object.entries(windows).map(([k,w])=>[k,run(pos,COST_PER_SIDE,w,i=>i===btcK).s]));
  // Amplitude: cada moeda sozinha, com a mesma regra, nos dias em que foi elegível.
  const each=grid.coins.map((c,k)=>({symbol:c.symbol,status:c.status,...coinAlone(c,pos[k],elig[k],COST_PER_SIDE,0,last)})).filter(x=>x.days>=P.minimumCoinDays);
  const breadth=each.filter(x=>x.total>0).length/each.length,beatsBuyHold=each.filter(x=>x.total>x.buyHoldTotal).length/each.length;
  const years:Record<string,{ret:number;dd:number;active:number;invested:number}>={};
  for(let y=2017;y<=2026;y++){const a=Math.max(0,Math.round((Date.UTC(y,0,1)-T0)/DAY)),b=Math.min(last,Math.round((Date.UTC(y+1,0,1)-T0)/DAY)-1);if(b-a<20)continue;
   const s=stats(full.r.returns,a-full.r.from+1,b-full.r.from+1),act=full.r.active.slice(a-full.r.from+1,b-full.r.from+1),inv=full.r.invested.slice(a-full.r.from+1,b-full.r.from+1);
   years[y]={ret:s.total,dd:s.maxDrawdown,active:act.reduce((s2,v)=>s2+v,0)/act.length,invested:inv.reduce((s2,v)=>s2+v,0)/inv.length};}
  const turnover=full.r.turnover.reduce((a,b)=>a+b,0)/full.r.turnover.length;
  const checks:Record<string,boolean>={DATA_QUALITY:series.length/files.length>=0.9,
   POSITIVE_NET:per.full.total>0&&per.era1.total>0&&per.era2.total>0,
   BOUNDED_DRAWDOWN:per.full.maxDrawdown<=P.maximumDrawdown&&per.era1.maxDrawdown<=P.maximumDrawdown&&per.era2.maxDrawdown<=P.maximumDrawdown,
   SHARPE_BAR:['full','era1','era2'].every(k=>per[k].sharpe>=P.minimumSharpe&&per[k].sharpe>bench[k].sharpe),
   BREADTH:breadth>=P.minimumBreadth,COSTS_X2:['full','era1','era2'].every(k=>x2[k].total>0),
   UNIVERSE_HALVES:halves.every(h=>h.total>0&&h.maxDrawdown<=P.maximumDrawdown)};
  const out={rule,verdict:Object.values(checks).every(Boolean)?'VALIDADA_DIARIA':'NAO_VALIDADA',failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,per,costsX2:x2,halves,
   breadth,beatsBuyHold,coins:each.length,survivorsOnly:survivors,btcAlone:btc,btcByEra,years,turnoverPerDay:turnover,costBpsPerYear:turnover*COST_PER_SIDE*365*1e4,
   worstCoins:[...each].sort((a,b)=>a.total-b.total).slice(0,8).map(x=>({symbol:x.symbol,status:x.status,total:x.total,buyHold:x.buyHoldTotal})),
   deliveredBy:{delisted:each.filter(x=>x.status!=='TRADING').length}};
  console.log(rule.padEnd(15),out.verdict.padEnd(14),'full',pct(per.full.total),'Sharpe',per.full.sharpe.toFixed(2),'DD',pct(per.full.maxDrawdown),'| era1',pct(per.era1.total),per.era1.sharpe.toFixed(2),pct(per.era1.maxDrawdown),'| era2',pct(per.era2.total),per.era2.sharpe.toFixed(2),pct(per.era2.maxDrawdown),
   '| amplitude',(breadth*100).toFixed(0)+'%','x2',pct(x2.full.total),'metades',halves.map(h=>pct(h.total)).join('/'),out.failed.join(','));
  return out;
 });
 // Sharpe deflacionado (informação) com as 5 regras: variância dos Sharpe por dia entre elas.
 const sharpesDaily=results.map(r=>r.per.full.sharpe/Math.sqrt(365)),mean=sharpesDaily.reduce((a,b)=>a+b,0)/sharpesDaily.length,variance=sharpesDaily.reduce((a,b)=>a+(b-mean)**2,0)/(sharpesDaily.length-1);
 const dsr=results.map(r=>{const pos=grid.coins.map(c=>positions(r.rule,c,days));const rr=portfolio(grid,pos,elig,COST_PER_SIDE,0,last).returns;return {rule:r.rule,deflatedSharpe:deflatedSharpe(Array.from(rr).slice(1),TRIALS,variance).deflatedSharpe};});
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_BUSCA_DIARIA_V1.md'],{encoding:'utf8'}).trim();
 const report={protocol:{...P,T0:new Date(T0).toISOString(),era2:new Date(ERA2).toISOString()},protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  data:{pairs:series.length,nonPegged:usableCoins.length,pegged:grid.coins.filter(c=>c.pegged).length,delisted:usableCoins.filter(c=>c.status!=='TRADING').length,days,firstDay:new Date(T0).toISOString().slice(0,10),lastDay:new Date(lastT).toISOString().slice(0,10)},
  benchmarkEqualWeight:bench,benchmarkBtc:btcBench,results,deflated:dsr,datasetHashes:Object.fromEntries(series.map(s=>[s.symbol,s.sha256]))};
 const out='docs/estudos/busca-diaria-v1-2026-10-10';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
}
function markdown(r:any){
 const f=(s:any)=>`${pct(s.total)} / ${s.sharpe.toFixed(2)} / ${(s.maxDrawdown*100).toFixed(1)}%`,res=r.results as any[],yrs=Object.keys(res[0].years);
 return [`# Resultado ${r.protocol.version}: regras compradas-ou-fora por moeda, velas diárias à vista, 2017 a 2026`,'',
  `Executado em ${r.runAt}, fora do servidor, com velas diárias públicas da Binance, pelo protocolo \`docs/PROTOCOLO_BUSCA_DIARIA_V1.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. ${r.data.pairs} pares USDT, ${r.data.nonPegged} não atrelados ao dólar (${r.data.delisted} já retirados da corretora), de ${r.data.firstDay} a ${r.data.lastDay}. Custo de 20 bps por lado; células "retorno / Sharpe / queda máxima".`,'',
  '## Veredito por regra','','| Regra | Veredito | Reprovou em |','|---|---|---|',...res.map(x=>`| ${x.rule} | **${x.verdict}** | ${x.failed.join(', ')||'-'} |`),'',
  '## Carteira (peso igual entre moedas elegíveis; fora do mercado quando o sinal é de venda)','','| | Período inteiro | 2017 a 2021 | 2022 a 2026 |','|---|---|---|---|',
  `| **Cesta comprada e segura** (benchmark) | ${f(r.benchmarkEqualWeight.full)} | ${f(r.benchmarkEqualWeight.era1)} | ${f(r.benchmarkEqualWeight.era2)} |`,`| BTC comprado e seguro | ${f(r.benchmarkBtc.full)} | ${f(r.benchmarkBtc.era1)} | ${f(r.benchmarkBtc.era2)} |`,
  ...res.map(x=>`| ${x.rule} | ${f(x.per.full)} | ${f(x.per.era1)} | ${f(x.per.era2)} |`),'',
  '## Robustez','','| Regra | Amplitude (moedas com retorno líquido > 0) | Venceu comprar e segurar (por moeda) | Custos x2 (inteiro) | Metade A / metade B | Só moedas em operação | BTC sozinho | Sharpe deflacionado (27 tentativas) |','|---|---|---|---|---|---|---|---|',
  ...res.map((x:any)=>`| ${x.rule} | ${(x.breadth*100).toFixed(0)}% de ${x.coins} | ${(x.beatsBuyHold*100).toFixed(0)}% | ${pct(x.costsX2.full.total)} | ${pct(x.halves[0].total)} / ${pct(x.halves[1].total)} | ${f(x.survivorsOnly)} | ${f(x.btcAlone)} | ${r.deflated.find((d:any)=>d.rule===x.rule).deflatedSharpe.toFixed(3)} |`),'',
  '## BTC sozinho com cada regra, por era (informação)','','| Regra | Período inteiro | 2017 a 2021 | 2022 a 2026 |','|---|---|---|---|',...res.map((x:any)=>`| ${x.rule} | ${f(x.btcByEra.full)} | ${f(x.btcByEra.era1)} | ${f(x.btcByEra.era2)} |`),'',
  '## Por ano (retorno / queda máxima; moedas elegíveis em média e fração investida)','','| Regra | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',
  ...res.map((x:any)=>`| ${x.rule} | `+yrs.map(y=>x.years[y]?`${pct(x.years[y].ret)} / ${(x.years[y].dd*100).toFixed(0)}% · ${x.years[y].active.toFixed(0)} · ${(x.years[y].invested/Math.max(x.years[y].active,1e-9)*100).toFixed(0)}%`:'n/d').join(' | ')+' |'),'',
  '## Atividade e piores moedas','','| Regra | Giro diário médio (soma dos pesos negociados) | Custo em bps ao ano | 5 piores moedas (retorno da regra / comprar e segurar) |','|---|---|---|---|',
  ...res.map((x:any)=>`| ${x.rule} | ${x.turnoverPerDay.toFixed(3)} | ${x.costBpsPerYear.toFixed(0)} | ${x.worstCoins.slice(0,5).map((w:any)=>`${w.symbol.replace('USDT','')} ${pct(w.total)}/${pct(w.buyHold)}`).join(', ')} |`),''].join('\n');
}
if(process.argv[1]?.endsWith('busca-diaria.ts'))main();
