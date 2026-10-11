// Estudo RAPIDO_V1 (docs/PROTOCOLO_RAPIDO_V1.md): quatro candidatas entre moedas com decisões a cada 24 h ou 8 h.
// Roda fora do servidor, só com dados públicos da Binance USD-M já baixados; não envia ordens e não toca em contas.
// Uso: npx tsx scripts/estudos/rapido.ts
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import {simulateBlend,momentum,carry,type Attractiveness} from './fatores-lib.js';
import {load,startOf,metrics,corr,pct,PROTOCOL as FATORES} from './fatores.js';

const SPLIT=Date.UTC(2024,6,1);
export const RAPIDO=Object.freeze({version:'RAPIDO_V1',declaredAt:'2026-10-09',symbols:FATORES.symbols,
 rule:{...FATORES.rule},gate:{maximumDrawdown:0.15,minimumPositiveYears:3,maximumMarketCorrelation:0.3,maximumFilledShare:0.01,trials:13},split:new Date(SPLIT).toISOString()});
const reversal=(h:number):Attractiveness=>{const m=momentum(h);return (d,s,i)=>new Map([...m(d,s,i)].map(([k,v])=>[k,-v]));};
const candidates:{id:string;label:string;lookback:number;rebalance:number;signal:Attractiveness}[]=[
 {id:'XS_REV24_V1',label:'Reversão 24 h, decisão a cada 24 h',lookback:24,rebalance:24,signal:reversal(24)},
 {id:'XS_REV8_V1',label:'Reversão 8 h, decisão a cada 8 h',lookback:8,rebalance:8,signal:reversal(8)},
 {id:'XS_MOM72_V1',label:'Momentum 72 h, decisão a cada 24 h',lookback:72,rebalance:24,signal:momentum(72)},
 {id:'XS_CARRY72_V1',label:'Carry (funding 72 h), decisão a cada 24 h',lookback:72,rebalance:24,signal:carry(72)}];

// A máquina tem pouca memória: cada candidata roda num processo e o resultado fica em cache até as quatro estarem prontas.
const CACHE=process.env.RAPIDO_CACHE??join(tmpdir(),'rapido-v1-cache');
const cached=<T>(key:string,compute:()=>T):T=>{mkdirSync(CACHE,{recursive:true});const f=join(CACHE,key+'.json');if(existsSync(f))return JSON.parse(readFileSync(f,'utf8'));const v=compute();writeFileSync(f,JSON.stringify(v));return v;};
function main(){
 const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
 const {datasets,longOnly,quality}=load(),start=startOf(datasets),startLong=startOf(longOnly),R=RAPIDO.rule,G=RAPIDO.gate;
 const book=(signal:Attractiveness)=>[{signal,legFraction:R.legFraction,longCount:R.longCount,shortCount:R.shortCount}];
 const cfg=(o:Record<string,number>)=>({...R,...o} as any);
 // Teste de regressão obrigatório antes de qualquer candidata.
 const prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8'));
 const reg=simulateBlend(longOnly,cfg({startBar:startLong}),book(momentum(672))),regReturn=reg.netPnl/R.initialCapital;
 const regression={returnPct:regReturn,expectedReturnPct:prior.returnPct,maxDrawdown:reg.maxDrawdown,expectedMaxDrawdown:prior.maxDrawdown,ok:Math.abs(regReturn-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005};
 console.log('regressão do controle',pct(regReturn),'esperado',pct(prior.returnPct),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',regression.ok?'OK':'FALHOU');
 if(!regression.ok)throw Error('Teste de regressão do controle falhou: o estudo para e nada é reportado como resultado (protocolo)');
 const control=cached('control',()=>{const m=metrics(datasets,simulateBlend(datasets,cfg({startBar:start}),book(momentum(672))),start);return {returnPct:m.returnPct,maxDrawdown:m.maxDrawdown,years:m.years,weeklyReturns:m.weeklyReturns};});
 const fat=JSON.parse(readFileSync('docs/estudos/fatores-v1-2026-10-09.json','utf8')),variance=fat.trialSharpeVariance as number;
 const halves=(eq:{timestamp:number;equity:number}[])=>{const before=eq.filter(p=>p.timestamp<SPLIT).at(-1)!.equity;return {first:before-R.initialCapital,second:eq.at(-1)!.equity-before};};
 const judged=candidates.filter(c=>!only||c.id===only||existsSync(join(CACHE,c.id+'.json'))).map(c=>cached(c.id,()=>{
  const run=(o:Record<string,number>)=>simulateBlend(datasets,cfg({lookbackHours:c.lookback,rebalanceHours:c.rebalance,startBar:start,...o}),book(c.signal));
  const base=run({}),doubled=run({feeRate:R.feeRate*2,slippageBps:R.slippageBps*2}),gross=run({feeRate:0,slippageBps:0}),m=metrics(datasets,base,start),h=halves(base.equitySeries);
  const dsr=deflatedSharpe(m.returns,G.trials,variance).deflatedSharpe,positiveYears=Object.values(m.years).filter(y=>!y.partial&&y.returnPct>0).length;
  const checks:Record<string,boolean>={DATA_QUALITY:Object.values(quality).every(q=>q.share<=G.maximumFilledShare),POSITIVE_PNL:m.netPnl>0,BOUNDED_DRAWDOWN:m.maxDrawdown<=G.maximumDrawdown,POSITIVE_YEARS:positiveYears>=G.minimumPositiveYears,
   DOUBLED_COSTS_POSITIVE:doubled.netPnl>0,MARKET_NEUTRAL:Math.abs(m.marketCorrelation)<=G.maximumMarketCorrelation,BOTH_HALVES_POSITIVE:h.first>0&&h.second>0};
  const out={id:c.id,label:c.label,rebalanceHours:c.rebalance,verdict:Object.values(checks).every(Boolean)?'PROPOR_ACOMPANHAMENTO':'ENCERRADA',failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,
   netPnl:m.netPnl,returnPct:m.returnPct,maxDrawdown:m.maxDrawdown,years:m.years,positiveYears,sharpeAnnualized:m.sharpeAnnualized,marketCorrelation:m.marketCorrelation,doubledPnl:doubled.netPnl,
   grossPnl:gross.netPnl,costsPaid:m.feesPaid,fundingCashDelta:m.fundingCashDelta,halves:{firstPnl:h.first,secondPnl:h.second},decisions:m.rebalances,closedLegs:m.closedLegs,turnover:m.turnover,
   deflatedSharpe:dsr,weeklyCorrelationWithControl:corr(m.weeklyReturns,control.weeklyReturns),buyHold:m.buyHold,datasetHashes:base.datasetHashes};
  console.log(c.id.padEnd(15),out.verdict.padEnd(22),'líq',pct(out.returnPct),'bruto',pct(out.grossPnl/R.initialCapital),'DD',(out.maxDrawdown*100).toFixed(1)+'%','anos+',positiveYears,'x2',out.doubledPnl.toFixed(0),'metades',h.first.toFixed(0),h.second.toFixed(0),'corr',out.marketCorrelation.toFixed(2),'DSR',dsr.toFixed(2),out.failed.join(','));
  return out;
 }));
 if(judged.length<candidates.length){console.log('faltam candidatas em cache; rode as demais com --only=ID');return;}
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_RAPIDO_V1.md'],{encoding:'utf8'}).trim();
 const report={protocol:RAPIDO,protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),symbols:RAPIDO.symbols,period:{from:new Date(FATORES.firstDecisionBar).toISOString(),to:new Date(datasets[RAPIDO.symbols[0]].trade.at(-1)!.timestamp).toISOString()},
  quality,regression,control:{returnPct:control.returnPct,maxDrawdown:control.maxDrawdown,years:control.years},trialSharpeVariance:variance,results:judged};
 const base='docs/estudos/rapido-v1-2026-10-09';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
}
function markdown(r:any){
 const yrs=['2022','2023','2024','2025','2026'],yr=(y:any,k:string)=>y[k]?`${pct(y[k].returnPct)} / ${(y[k].maxDrawdown*100).toFixed(1)}%${y[k].partial?' (parcial)':''}`:'n/d',res=r.results as any[];
 return [`# Resultado ${r.protocol.version}: estratégias entre moedas com decisões diárias e a cada 8 h`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_RAPIDO_V1.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Período: ${r.period.from.slice(0,10)} a ${r.period.to.slice(0,10)}, 15 moedas, 5 compradas e 5 vendidas, 5% por posição.`,'',
  `**Teste de regressão do controle:** ${pct(r.regression.returnPct)} contra ${pct(r.regression.expectedReturnPct)} esperado, queda máxima ${(r.regression.maxDrawdown*100).toFixed(2)}% contra ${(r.regression.expectedMaxDrawdown*100).toFixed(2)}%: ${r.regression.ok?'conferiu':'FALHOU'}.`,'',
  '## Veredito por candidata','','| Candidata | Veredito | Reprovou em |','|---|---|---|',...res.map(x=>`| ${x.id} · ${x.label} | **${x.verdict}** | ${x.failed.join(', ')||'-'} |`),'',
  '## Números (líquido de custos)','','| | Líquido | Antes de custos | Custos pagos | Queda máx. | Sharpe anual | Custos x2 | 1ª metade | 2ª metade | Corr. mercado |','|---|---|---|---|---|---|---|---|---|---|',
  ...res.map(x=>`| ${x.id} | ${pct(x.returnPct)} | ${pct(x.grossPnl/10000)} | ${x.costsPaid.toFixed(0)} | ${(x.maxDrawdown*100).toFixed(1)}% | ${x.sharpeAnnualized.toFixed(2)} | ${x.doubledPnl.toFixed(0)} | ${x.halves.firstPnl.toFixed(0)} | ${x.halves.secondPnl.toFixed(0)} | ${x.marketCorrelation.toFixed(2)} |`),'',
  'Valores em USDT sobre 10 000 de capital. "Antes de custos" tem taxa e slippage zerados e mantém o funding real.','',
  '## Atividade','','| | Decisões | Posições encerradas | Giro (x o capital) | Sharpe deflacionado (13 tentativas, fora do veredito) | Corr. semanal com o controle |','|---|---|---|---|---|---|',
  ...res.map(x=>`| ${x.id} | ${x.decisions} | ${x.closedLegs} | ${x.turnover.toFixed(0)} | ${x.deflatedSharpe.toFixed(3)} | ${x.weeklyCorrelationWithControl.toFixed(2)} |`),'',
  '## Por ano (retorno / queda máxima no ano)','','| | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',
  `| Controle XSMOM_L28 | `+yrs.map(y=>yr(r.control.years,y)).join(' | ')+' |',...res.map(x=>`| ${x.id} | `+yrs.map(y=>yr(x.years,y)).join(' | ')+' |'),'',
  'Hashes dos datasets (SHA-256):','',...Object.entries(res[0].datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``)].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('rapido.ts'))main();
