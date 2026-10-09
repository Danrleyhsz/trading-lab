// Estudo COMBO_CARRY_MOM_V1 (docs/PROTOCOLO_COMBO_CARRY_MOMENTUM.md): carry + momentum entre moedas, dois livros somados.
// Roda fora do servidor, só com dados públicos da Binance USD-M; não envia ordens e não toca em contas.
//   npx tsx scripts/estudos/combo.ts            replay histórico (informativo, com portão)
//   npx tsx scripts/estudos/combo.ts --forward  acompanhamento ao vivo desde 13/10/2026 (baixa dados públicos novos)
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import type {PerpetualDataset} from '../../src/domain/perpetual-backtest.js';
import {BinancePerpetualHistory} from '../../src/infrastructure/binance-perpetual-history.js';
import {FORWARD_PROTOCOL} from '../../src/application/forward-momentum.js';
import {simulateBlend,momentum,carry,joinBlocks,type Book} from './fatores-lib.js';
import {load,startOf,metrics,corr,pct,PROTOCOL as FATORES} from './fatores.js';

const H=3600000,SQRT_YEAR=Math.sqrt(24*365);
export const COMBO=Object.freeze({version:'COMBO_CARRY_MOM_V1',declaredAt:'2026-10-09',legFraction:0.025,longCount:5,shortCount:5,lookbackHours:672,carryWindowHours:168,
 rule:FATORES.rule,gate:{maximumDrawdown:0.15,minimumPositiveYears:3,maximumMarketCorrelation:0.3,maximumFilledShare:0.01,trials:9},
 forward:{symbols:FORWARD_PROTOCOL.symbols,firstDecisionBar:Date.UTC(2026,9,13,2),weeks:11,rebalanceHours:168,stopDrawdown:0.15,initialCapital:10000}});
const M:Book={signal:momentum(672),legFraction:0.025,longCount:5,shortCount:5},C:Book={signal:carry(168),legFraction:0.025,longCount:5,shortCount:5};
const M5:Book={...M,legFraction:0.05},C5:Book={...C,legFraction:0.05};
const BLEND=[M,C];
const cfgOf=(o:Record<string,number>)=>({...COMBO.rule,...o} as any);

// ---------- acompanhamento ao vivo ----------
export interface ComboForward {
 scope:'FORWARD_PAPER_TRACKING_ONLY';version:string;observedAt:string;status:'WAITING_START'|'RUNNING'|'STOPPED_BY_DRAWDOWN'|'COMPLETED';verdict:'IN_PROGRESS'|'APPROVED'|'REJECTED';
 startedAt:string;endsAt:string;lastCandle:string|null;weeksElapsed:number;equity:number|null;netPnl:number|null;returnPct:number|null;maxDrawdown:number|null;
 feesPaid:number|null;fundingCashDelta:number|null;marketCorrelation:number|null;rebalances:number;portfolio:{decidedAt:string;long:string[];short:string[]}|null;
 comparison:{momentumAloneNetPnl:number|null;momentumLegNetPnl:number|null;carryLegNetPnl:number|null};datasetHashes:Record<string,string>|null;
}
/** Calcula o acompanhamento a partir dos datasets das 21 moedas (alinhados, terminando na última vela fechada). `protocol` só muda nos testes. */
export function comboForwardFromDatasets(datasets:Record<string,PerpetualDataset>,now:number,protocol=COMBO.forward):ComboForward{
 const P=protocol,symbols=Object.keys(datasets).sort(),first=datasets[symbols[0]].trade,end=P.firstDecisionBar+P.weeks*P.rebalanceHours*H+H;
 const base:ComboForward={scope:'FORWARD_PAPER_TRACKING_ONLY',version:COMBO.version,observedAt:new Date(now).toISOString(),status:'WAITING_START',verdict:'IN_PROGRESS',
  startedAt:new Date(P.firstDecisionBar+H).toISOString(),endsAt:new Date(end).toISOString(),lastCandle:null,weeksElapsed:0,equity:null,netPnl:null,returnPct:null,maxDrawdown:null,feesPaid:null,fundingCashDelta:null,
  marketCorrelation:null,rebalances:0,portfolio:null,comparison:{momentumAloneNetPnl:null,momentumLegNetPnl:null,carryLegNetPnl:null},datasetHashes:null};
 if(now<P.firstDecisionBar+H)return base;
 const startBar=first.findIndex(c=>c.timestamp===P.firstDecisionBar);if(startBar<672)throw new Error('history does not cover the declared start');
 // Só velas até o fim declarado: depois das semanas previstas, nada mais conta.
 const cut=Object.fromEntries(Object.entries(datasets).map(([s,d])=>{const n=d.trade.filter(c=>c.timestamp<end).length;const stop=d.trade[n-1].timestamp+H;return [s,{...d,trade:d.trade.slice(0,n),mark:d.mark.slice(0,n),funding:d.funding.filter(f=>f.timestamp<stop)}];}));
 const cfg={lookbackHours:672,rebalanceHours:P.rebalanceHours,startBar,feeRate:0.00055,slippageBps:2,initialCapital:P.initialCapital};
 const r=simulateBlend(cut,cfg,BLEND);
 let peak=-Infinity,stopAt=-1;for(let i=0;i<r.equitySeries.length;i++){peak=Math.max(peak,r.equitySeries[i].equity);if(1-r.equitySeries[i].equity/peak>=P.stopDrawdown){stopAt=i;break;}}
 const curve=stopAt>=0?r.equitySeries.slice(0,stopAt+1):r.equitySeries,lastPoint=curve.at(-1)!;let dd=0;peak=-Infinity;for(const p of curve){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}
 const lastCandle=cut[symbols[0]].trade.at(-1)!.timestamp,completed=lastCandle+H>=end,status=stopAt>=0?'STOPPED_BY_DRAWDOWN':completed?'COMPLETED':'RUNNING';
 const netPnl=lastPoint.equity-P.initialCapital,decisions=r.rebalances.filter(x=>stopAt<0||x.timestamp<=lastPoint.timestamp),last=decisions.at(-1);
 // Correlação com a cesta igual das moedas, hora a hora, até o último ponto contado.
 const n=curve.length-1,rets=curve.slice(1).map((p,k)=>p.equity/curve[k].equity-1),basket=Array.from({length:n},(_,k)=>symbols.reduce((s,sym)=>s+(cut[sym].trade[startBar+k+1].close/cut[sym].trade[startBar+k].close-1)/symbols.length,0));
 const alone=(books:Book[])=>{try{return simulateBlend(cut,cfg,books).netPnl;}catch{return null;}};
 return {...base,status,verdict:status==='STOPPED_BY_DRAWDOWN'?'REJECTED':status==='COMPLETED'?(netPnl>0&&dd<P.stopDrawdown?'APPROVED':'REJECTED'):'IN_PROGRESS',
  lastCandle:new Date(lastCandle).toISOString(),weeksElapsed:Math.min(P.weeks,Math.max(0,Math.floor((lastCandle+H-(P.firstDecisionBar+H))/(P.rebalanceHours*H)))),
  equity:lastPoint.equity,netPnl,returnPct:netPnl/P.initialCapital,maxDrawdown:dd,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,marketCorrelation:n>2?corr(rets,basket):null,rebalances:decisions.length,
  portfolio:last?{decidedAt:new Date(last.timestamp+H).toISOString(),long:last.long,short:last.short}:null,
  comparison:{momentumAloneNetPnl:alone([M5]),momentumLegNetPnl:alone([M]),carryLegNetPnl:alone([C])},datasetHashes:r.datasetHashes};
}
async function runForward(){
 const P=COMBO.forward,now=Date.now();
 if(now<P.firstDecisionBar+H){console.log('Aguardando o início: primeira decisão em',new Date(P.firstDecisionBar+H).toISOString());return;}
 const history=new BinancePerpetualHistory(),lastClosed=Math.floor(now/H)*H-H,count=Math.min(10000,Math.round((lastClosed-(P.firstDecisionBar-672*H))/H)+1),datasets:Record<string,PerpetualDataset>={};
 // Em sequência: um 418/429 para todo o resto em vez de disparar mais pedidos.
 for(const s of P.symbols)datasets[s]=await history.load(count,s);
 const snap=comboForwardFromDatasets(datasets,now);
 const day=new Date(now).toISOString().slice(0,10),file=`docs/estudos/combo-forward-${day}.json`;
 writeFileSync(file,JSON.stringify({...snap,protocolCommit:protocolCommit()},null,1));
 console.log(file,snap.status,snap.verdict,'semanas',snap.weeksElapsed,'equity',snap.equity?.toFixed(2),'P&L',snap.netPnl?.toFixed(2),'queda máx.',snap.maxDrawdown===null?'n/d':(snap.maxDrawdown*100).toFixed(2)+'%','momentum sozinho',snap.comparison.momentumAloneNetPnl?.toFixed(2));
}
const protocolCommit=()=>execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_COMBO_CARRY_MOMENTUM.md'],{encoding:'utf8'}).trim();

// ---------- replay histórico ----------
function replay(){
 const {datasets,longOnly,quality}=load(),start=startOf(datasets),startLong=startOf(longOnly);
 // Teste de regressão obrigatório: o controle, só no histórico longo, reproduz XSMOM_LONG_HISTORY_V1.
 const prior=JSON.parse(readFileSync('docs/estudos/momentum-historico-longo-2026-10-06.json','utf8'));
 const reg=simulateBlend(longOnly,{...COMBO.rule,startBar:startLong} as any,[M5]),regReturn=reg.netPnl/COMBO.rule.initialCapital;
 const regression={returnPct:regReturn,expectedReturnPct:prior.returnPct,maxDrawdown:reg.maxDrawdown,expectedMaxDrawdown:prior.maxDrawdown,ok:Math.abs(regReturn-prior.returnPct)<=0.0005&&Math.abs(reg.maxDrawdown-prior.maxDrawdown)<=0.0005};
 console.log('regressão do controle',pct(regReturn),'esperado',pct(prior.returnPct),'DD',(reg.maxDrawdown*100).toFixed(2)+'%',regression.ok?'OK':'FALHOU');
 if(!regression.ok)throw Error('Teste de regressão do controle falhou: o estudo para e nada é reportado como resultado (protocolo)');
 const run=(books:Book[],costs=1)=>simulateBlend(datasets,cfgOf({startBar:start,feeRate:COMBO.rule.feeRate*costs,slippageBps:COMBO.rule.slippageBps*costs}),books);
 const blend=run(BLEND),doubled=run(BLEND,2),m5=run([M5]),c5=run([C5]),m25=run([M]),c25=run([C]);
 const mb=metrics(datasets,blend,start),mm5=metrics(datasets,m5,start),mc5=metrics(datasets,c5,start);
 // Sharpe deflacionado com 9 tentativas (as 8 de FATORES_V1 mais esta), com a mesma variância entre tentativas de FATORES_V1 (reportado; fora do portão).
 const fat=JSON.parse(readFileSync('docs/estudos/fatores-v1-2026-10-09.json','utf8')),sharpes=[...fat.trialSharpes,mb.hourlySharpe];
 if(sharpes.length!==COMBO.gate.trials)throw Error('contagem de tentativas inconsistente: '+sharpes.length);
 const variance=fat.trialSharpeVariance as number,dsr=deflatedSharpe(mb.returns,COMBO.gate.trials,variance).deflatedSharpe;
 const G=COMBO.gate,full=Object.entries(mb.years).filter(([,y])=>!y.partial),positiveYears=full.filter(([,y])=>y.returnPct>0).length;
 const checks:Record<string,boolean>={DATA_QUALITY:Object.values(quality).every(q=>q.share<=G.maximumFilledShare),POSITIVE_PNL:mb.netPnl>0,BOUNDED_DRAWDOWN:mb.maxDrawdown<=G.maximumDrawdown,
  POSITIVE_YEARS:positiveYears>=G.minimumPositiveYears,DOUBLED_COSTS_POSITIVE:doubled.netPnl>0,MARKET_NEUTRAL:Math.abs(mb.marketCorrelation)<=G.maximumMarketCorrelation};
 const verdict=Object.values(checks).every(Boolean)?'PROPOR_ACOMPANHAMENTO':'ENCERRADA';
 // Verificação em outro universo (informativa): as 21 moedas do acompanhamento do momentum, 15/08/2025 a 05/10/2026, só dados em cache.
 const dir='scripts/estudos/out',wide:Record<string,PerpetualDataset>={};
 for(const s of FORWARD_PROTOCOL.symbols){const h=JSON.parse(readFileSync(`${dir}/${s}-holdout-1773241200000.json`,'utf8')),m=JSON.parse(readFileSync(`${dir}/${s}-1791241200000.json`,'utf8'));wide[s]=joinBlocks(s,[{trade:h.trade,funding:h.funding},{trade:m.trade,funding:m.funding}]);}
 const wcfg=cfgOf({startBar:672}),w=(books:Book[])=>simulateBlend(wide,wcfg,books),wb=metrics(wide,w(BLEND),672),wm=metrics(wide,w([M5]),672),wc=metrics(wide,w([C5]),672);
 const report={protocol:COMBO,protocolCommit:protocolCommit(),execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),symbols:FATORES.symbols,regression,quality,
  verdict,checks,failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),positiveYears,deflatedSharpe:dsr,trialSharpes:sharpes,trialSharpeVariance:variance,
  blend:{netPnl:mb.netPnl,returnPct:mb.returnPct,maxDrawdown:mb.maxDrawdown,years:mb.years,sharpeAnnualized:mb.sharpeAnnualized,marketCorrelation:mb.marketCorrelation,doubledPnl:doubled.netPnl,feesPaid:mb.feesPaid,fundingCashDelta:mb.fundingCashDelta,turnover:mb.turnover,rebalances:mb.rebalances,closedLegs:mb.closedLegs,buyHold:mb.buyHold},
  comparison:{momentumAlone:{returnPct:mm5.returnPct,maxDrawdown:mm5.maxDrawdown,sharpeAnnualized:mm5.sharpeAnnualized,years:mm5.years},carryAlone:{returnPct:mc5.returnPct,maxDrawdown:mc5.maxDrawdown,sharpeAnnualized:mc5.sharpeAnnualized,years:mc5.years},
   weeklyCorrelation:{blendVsMomentum:corr(mb.weeklyReturns,mm5.weeklyReturns),blendVsCarry:corr(mb.weeklyReturns,mc5.weeklyReturns),momentumVsCarry:corr(mm5.weeklyReturns,mc5.weeklyReturns)},
   legsAlone25:{momentumLegReturnPct:m25.netPnl/COMBO.rule.initialCapital,carryLegReturnPct:c25.netPnl/COMBO.rule.initialCapital}},
  otherUniverse:{symbols:FORWARD_PROTOCOL.symbols.length,period:{from:new Date(wide[FORWARD_PROTOCOL.symbols[0]].trade[672].timestamp).toISOString(),to:new Date(wide[FORWARD_PROTOCOL.symbols[0]].trade.at(-1)!.timestamp).toISOString()},
   blend:{returnPct:wb.returnPct,maxDrawdown:wb.maxDrawdown,sharpeAnnualized:wb.sharpeAnnualized,marketCorrelation:wb.marketCorrelation},momentumAlone:{returnPct:wm.returnPct,maxDrawdown:wm.maxDrawdown,sharpeAnnualized:wm.sharpeAnnualized},carryAlone:{returnPct:wc.returnPct,maxDrawdown:wc.maxDrawdown,sharpeAnnualized:wc.sharpeAnnualized}},
  datasetHashes:blend.datasetHashes};
 const base='docs/estudos/combo-carry-mom-replay-2026-10-09';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
 console.log('combinação',verdict,pct(mb.returnPct),'DD',(mb.maxDrawdown*100).toFixed(1)+'%','anos+',positiveYears,'custos x2',doubled.netPnl.toFixed(0),'corr',mb.marketCorrelation.toFixed(2),'DSR',dsr.toFixed(3),report.failed.join(','));
 console.log('  momentum sozinho',pct(mm5.returnPct),'DD',(mm5.maxDrawdown*100).toFixed(1)+'%','| carry sozinho',pct(mc5.returnPct),'DD',(mc5.maxDrawdown*100).toFixed(1)+'%','| outro universo (21 moedas): combo',pct(wb.returnPct),'DD',(wb.maxDrawdown*100).toFixed(1)+'%');
}
function markdown(r:any){
 const yrs=['2022','2023','2024','2025','2026'],yr=(y:any,k:string)=>y[k]?`${pct(y[k].returnPct)} / ${(y[k].maxDrawdown*100).toFixed(1)}%${y[k].partial?' (parcial)':''}`:'n/d',b=r.blend,c=r.comparison,o=r.otherUniverse;
 return [`# Resultado ${r.protocol.version}: replay histórico (informativo)`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo \`docs/PROTOCOLO_COMBO_CARRY_MOMENTUM.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. Este replay **não valida** a hipótese (ela foi escolhida depois de ver os resultados individuais, nos mesmos dados): só decide se vale acompanhar ao vivo.`,'',
  `**Teste de regressão do controle:** ${pct(r.regression.returnPct)} contra ${pct(r.regression.expectedReturnPct)} esperado, queda máxima ${(r.regression.maxDrawdown*100).toFixed(2)}% contra ${(r.regression.expectedMaxDrawdown*100).toFixed(2)}%: ${r.regression.ok?'conferiu':'FALHOU'}.`,'',
  `## Portão: **${r.verdict}**${r.failed.length?' (reprovou em '+r.failed.join(', ')+')':''}`,'','| Critério | Passou |','|---|---|',...Object.entries(r.checks).map(([k,v])=>`| ${k} | ${v?'sim':'não'} |`),'',
  '## Combinação (2,5% por posição em cada livro) contra cada livro sozinho (5% por posição), 15 moedas, 2022 a out/2026','',
  '| | Retorno | Queda máx. | Sharpe anual | Anos + |','|---|---|---|---|---|',
  `| **Combinação** | ${pct(b.returnPct)} | ${(b.maxDrawdown*100).toFixed(2)}% | ${b.sharpeAnnualized.toFixed(2)} | ${r.positiveYears} de 4 |`,
  `| Momentum sozinho | ${pct(c.momentumAlone.returnPct)} | ${(c.momentumAlone.maxDrawdown*100).toFixed(2)}% | ${c.momentumAlone.sharpeAnnualized.toFixed(2)} | ${Object.entries(c.momentumAlone.years).filter(([k,y]:[string,any])=>!y.partial&&y.returnPct>0).length} de 4 |`,
  `| Carry sozinho | ${pct(c.carryAlone.returnPct)} | ${(c.carryAlone.maxDrawdown*100).toFixed(2)}% | ${c.carryAlone.sharpeAnnualized.toFixed(2)} | ${Object.entries(c.carryAlone.years).filter(([k,y]:[string,any])=>!y.partial&&y.returnPct>0).length} de 4 |`,'',
  `Com custos dobrados, a combinação rende ${b.doubledPnl.toFixed(0)}. Correlação horária com o mercado: ${b.marketCorrelation.toFixed(2)}. Correlação semanal: combinação com momentum ${c.weeklyCorrelation.blendVsMomentum.toFixed(2)}, combinação com carry ${c.weeklyCorrelation.blendVsCarry.toFixed(2)}, momentum com carry ${c.weeklyCorrelation.momentumVsCarry.toFixed(2)}. Cada livro a 2,5%: momentum ${pct(c.legsAlone25.momentumLegReturnPct)}, carry ${pct(c.legsAlone25.carryLegReturnPct)}.`,'',
  '## Por ano (retorno / queda máxima no ano)','','| | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',
  `| Combinação | `+yrs.map(y=>yr(b.years,y)).join(' | ')+' |',`| Momentum sozinho | `+yrs.map(y=>yr(c.momentumAlone.years,y)).join(' | ')+' |',`| Carry sozinho | `+yrs.map(y=>yr(c.carryAlone.years,y)).join(' | ')+' |','',
  `## Outro universo (informativo): ${o.symbols} moedas do acompanhamento, ${o.period.from.slice(0,10)} a ${o.period.to.slice(0,10)}`,'','| | Retorno | Queda máx. | Sharpe anual |','|---|---|---|---|',
  `| Combinação | ${pct(o.blend.returnPct)} | ${(o.blend.maxDrawdown*100).toFixed(2)}% | ${o.blend.sharpeAnnualized.toFixed(2)} |`,`| Momentum sozinho | ${pct(o.momentumAlone.returnPct)} | ${(o.momentumAlone.maxDrawdown*100).toFixed(2)}% | ${o.momentumAlone.sharpeAnnualized.toFixed(2)} |`,`| Carry sozinho | ${pct(o.carryAlone.returnPct)} | ${(o.carryAlone.maxDrawdown*100).toFixed(2)}% | ${o.carryAlone.sharpeAnnualized.toFixed(2)} |`,'',
  `Sharpe deflacionado da combinação (reportado, **fora do portão**, ${r.protocol.gate.trials} tentativas): ${r.deflatedSharpe.toFixed(3)}. Taxas ${b.feesPaid.toFixed(0)}, funding ${b.fundingCashDelta.toFixed(0)}, giro ${b.turnover.toFixed(1)}x o capital, ${b.rebalances} rebalanceamentos, ${b.closedLegs} posições encerradas. Comprar e segurar a cesta: ${pct(b.buyHold)} (universo de sobreviventes).`,'',
  'Hashes dos datasets (SHA-256):','',...Object.entries(r.datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``)].join('\n')+'\n';
}
if(process.argv[1]?.endsWith('combo.ts')){if(process.argv.includes('--forward'))void runForward();else replay();}
