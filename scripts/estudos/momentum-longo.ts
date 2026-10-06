// Momentum entre moedas no histórico longo, 2022 a 2025 (docs/PROTOCOLO_MOMENTUM_HISTORICO_LONGO.md,
// XSMOM_LONG_HISTORY_V1). Roda fora do servidor, só com dados públicos da Binance USD-M (via curl); não envia ordens.
// Uso: npx tsx scripts/estudos/momentum-longo.ts
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {simulateCrossSectional} from '../../src/domain/cross-sectional-momentum.js';
import type {PerpetualDataset,FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import type {Candle} from '../../src/domain/backtest.js';
import {deflatedSharpe,hourlyReturns,moments} from '../../src/domain/backtest-robustness.js';

const H=3600000;
export const LONG_PROTOCOL=Object.freeze({version:'XSMOM_LONG_HISTORY_V1',declaredAt:'2026-10-06',
 symbols:['ZECUSDT','NEARUSDT','UNIUSDT','BCHUSDT','FILUSDT','AAVEUSDT','AVAXUSDT','LINKUSDT','XRPUSDT','XLMUSDT','DOGEUSDT','SOLUSDT','LTCUSDT','ETHUSDT','BTCUSDT'],
 firstBar:Date.UTC(2021,11,4,0),firstDecisionBar:Date.UTC(2022,0,1,0),lastBar:Date.UTC(2025,7,15,6),
 rule:{lookbackHours:672,rebalanceHours:168,longCount:5,shortCount:5,legFraction:0.05,feeRate:0.00055,slippageBps:2,initialCapital:10000},
 screen:{version:'XSMOM_LONG_SCREEN_V1',maximumDrawdown:0.15,minimumPositiveYears:3,minimumDeflatedSharpe:0.9,trials:5,maximumFilledShare:0.01}});
const P=LONG_PROTOCOL,dir='scripts/estudos/out';mkdirSync(dir,{recursive:true});
const sleep=(ms:number)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
function get(path:string,params:Record<string,string|number>){
 const url='https://fapi.binance.com'+path+'?'+new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
 for(let attempt=0;attempt<4;attempt++){
  const out=execFileSync('curl',['-sS','-m','30','-w','\n%{http_code}',url],{encoding:'utf8',maxBuffer:64*1024*1024}),i=out.lastIndexOf('\n'),status=Number(out.slice(i+1));
  if(status===200){sleep(600);return JSON.parse(out.slice(0,i));}
  if(status===418||status===429)throw Error('Binance HTTP '+status+': pausa necessária');
  sleep(3000);
 }
 throw Error('Binance indisponível para '+path);
}
function download(symbol:string){
 const file=`${dir}/long-${symbol}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const raw:Candle[]=[];let cursor=P.firstBar;
 while(cursor<=P.lastBar){const page=get('/fapi/v1/klines',{symbol,interval:'1h',startTime:cursor,endTime:P.lastBar+H-1,limit:1500}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({timestamp:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])});cursor=raw.at(-1)!.timestamp+H;}
 const funding:FundingSettlement[]=[];cursor=P.firstBar;
 while(cursor<=P.lastBar){const page=get('/fapi/v1/fundingRate',{symbol,startTime:cursor,endTime:P.lastBar+H-1,limit:1000}) as Record<string,string>[];if(!page.length)break;
  for(const f of page)funding.push({timestamp:Number(f.fundingTime),rate:Number(f.fundingRate),markPrice:Number(f.markPrice)});cursor=funding.at(-1)!.timestamp+1;if(page.length<1000)break;}
 const data={symbol,raw,funding};writeFileSync(file,JSON.stringify(data));return data;
}
/** Grade horária completa: horas faltando viram vela parada no último fechamento, com volume zero (contadas). */
function grid(raw:Candle[]){
 const byHour=new Map(raw.map(c=>[c.timestamp,c])),out:Candle[]=[];let filled=0,last:Candle|undefined;
 for(let t=P.firstBar;t<=P.lastBar;t+=H){const c=byHour.get(t);if(c){out.push(c);last=c;}else{if(!last)throw Error('sem vela inicial');filled++;out.push({timestamp:t,open:last.close,high:last.close,low:last.close,close:last.close,volume:0});}}
 return {candles:out,filled};
}
function main(){
 const datasets:Record<string,PerpetualDataset>={},quality:Record<string,{filled:number;share:number;fundingMarkFilled:number}>={},failures:string[]=[];
 for(const s of P.symbols){
  const d=download(s);const {candles,filled}=grid(d.raw);const share=filled/candles.length;
  // A Binance não devolve o preço de marcação nos fundings antigos (vem vazio até cerca de 2023). Nesses registros usa a
  // abertura da vela de negócios da hora da liquidação, o mesmo critério declarado para a série de mark.
  const open=new Map(candles.map(c=>[c.timestamp,c.open]));let fundingMarkFilled=0;
  const funding=d.funding.filter((f:FundingSettlement)=>f.timestamp>=P.firstBar&&f.timestamp<P.lastBar+H).map((f:FundingSettlement)=>{if(f.markPrice>0)return f;fundingMarkFilled++;return {...f,markPrice:open.get(Math.floor(f.timestamp/H)*H)!};});
  quality[s]={filled,share,fundingMarkFilled};
  console.log('dados',s,candles.length,'velas',filled,'preenchidas',d.funding.length,'fundings',fundingMarkFilled,'sem mark');
  if(share>P.screen.maximumFilledShare){failures.push(s);continue;}
  // O simulador usa só negócios e funding; a série de mark repete a de negócios (declarado no protocolo).
  datasets[s]={instrument:`BINANCE_USDM:${s}` as PerpetualDataset['instrument'],trade:candles,mark:structuredClone(candles),funding};
 }
 const symbols=Object.keys(datasets),trade=datasets[symbols[0]].trade,startBar=trade.findIndex(c=>c.timestamp===P.firstDecisionBar);
 const r=simulateCrossSectional(datasets,{...P.rule,startBar,maxBars:40000});
 const returns=hourlyReturns(r.equitySeries),m=moments(returns);
 // Dispersão dos Sharpe já medidos com momentum entre moedas (XSMOM_V1, 2 variantes × 2 períodos) mais este.
 const prior=JSON.parse(readFileSync('docs/estudos/momentum-entre-moedas-2026-10-05.json','utf8'));
 const sharpes=[...Object.values(prior.variants).flatMap((v:any)=>Object.values(v.periods).map((p:any)=>p.sharpeAnnualized/Math.sqrt(24*365))),m.sharpe];
 const mean=sharpes.reduce((a,b)=>a+b,0)/sharpes.length,variance=sharpes.reduce((a,b)=>a+(b-mean)**2,0)/(sharpes.length-1);
 const dsr=deflatedSharpe(returns,P.screen.trials,variance);
 const years:Record<string,{returnPct:number;maxDrawdown:number}>={};
 for(const y of [2022,2023,2024,2025]){const pts=r.equitySeries.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);if(pts.length<2)continue;
  const before=r.equitySeries.filter(p=>p.timestamp<pts[0].timestamp).at(-1)?.equity??P.rule.initialCapital;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}
  years[y]={returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};}
 const idx=startBar,basket=r.equitySeries.slice(1).map((_,k)=>symbols.reduce((s,sym)=>s+(datasets[sym].trade[idx+k+1].close/datasets[sym].trade[idx+k].close-1)/symbols.length,0));
 const mine=returns.slice(0,basket.length),mm=mine.reduce((a,b)=>a+b,0)/mine.length,mb=basket.reduce((a,b)=>a+b,0)/basket.length;
 let cov=0,va=0,vb=0;for(let k=0;k<mine.length;k++){cov+=(mine[k]-mm)*(basket[k]-mb);va+=(mine[k]-mm)**2;vb+=(basket[k]-mb)**2;}
 const buyHold=symbols.reduce((s,sym)=>s+(datasets[sym].trade.at(-1)!.close/datasets[sym].trade[startBar].close-1)/symbols.length,0);
 const S=P.screen,positiveYears=Object.values(years).filter(y=>y.returnPct>0).length;
 const checks:[string,boolean][]=[['DATA_QUALITY',failures.length===0],['POSITIVE_PNL',r.netPnl>0],['BOUNDED_DRAWDOWN',r.maxDrawdown<=S.maximumDrawdown],['POSITIVE_YEARS',positiveYears>=S.minimumPositiveYears],['DEFLATED_SHARPE',Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=S.minimumDeflatedSharpe]];
 const report={protocol:P,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),symbols,failures,quality,
  netPnl:r.netPnl,returnPct:r.netPnl/P.rule.initialCapital,maxDrawdown:r.maxDrawdown,years,positiveYears,sharpeAnnualized:m.sharpe*Math.sqrt(24*365),deflatedSharpe:dsr.deflatedSharpe,trialSharpeVariance:variance,
  marketCorrelation:cov/Math.sqrt(va*vb),buyHold,feesPaid:r.feesPaid,fundingCashDelta:r.fundingCashDelta,turnover:r.tradedNotional/P.rule.initialCapital,rebalances:r.rebalances.length,closedLegs:r.closedLegs,
  datasetHashes:r.datasetHashes,checks:Object.fromEntries(checks),passed:checks.every(([,ok])=>ok),failed:checks.filter(([,ok])=>!ok).map(([id])=>id)};
 const base='docs/estudos/momentum-historico-longo-2026-10-06';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
 console.log('resultado',(report.returnPct*100).toFixed(2)+'%','DD',(report.maxDrawdown*100).toFixed(2)+'%','anos+',positiveYears+'/'+Object.keys(years).length,Object.entries(years).map(([y,v])=>y+' '+(v.returnPct*100).toFixed(1)+'%').join(' '),'Sharpe',report.sharpeAnnualized.toFixed(2),'DSR',report.deflatedSharpe.toFixed(2),'corr',report.marketCorrelation.toFixed(2),'B&H',(buyHold*100).toFixed(1)+'%',report.passed?'APROVADA':'reprovada: '+report.failed.join(','));
}
const pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(2)+'%';
function markdown(r:any){
 const L=[`# Momentum entre moedas no histórico longo · ${r.protocol.version}`,'',`Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M. Período: 01/01/2022 a 15/08/2025 (nunca usado antes). Regra idêntica à do acompanhamento ao vivo (28 dias, 5% por posição). Protocolo: \`docs/PROTOCOLO_MOMENTUM_HISTORICO_LONGO.md\` (registrado antes da execução).`,'',
  `**Resultado: ${r.passed?'aprovada':'reprovada ('+r.failed.join(', ')+')'}.**`,'',
  '| Medida | Valor |','|---|---|',`| Retorno no período | ${pct(r.returnPct)} |`,`| Queda máxima | ${(r.maxDrawdown*100).toFixed(2)}% |`,`| Anos positivos | ${r.positiveYears} de ${Object.keys(r.years).length} |`,
  `| Sharpe anual | ${r.sharpeAnnualized.toFixed(2)} |`,`| Sharpe deflacionado (5 tentativas) | ${r.deflatedSharpe.toFixed(2)} |`,`| Correlação com o mercado | ${r.marketCorrelation.toFixed(2)} |`,
  `| Comprar e segurar a cesta (referência) | ${pct(r.buyHold)} |`,`| Taxas / funding | ${r.feesPaid.toFixed(2)} / ${r.fundingCashDelta.toFixed(2)} |`,`| Rebalanceamentos / posições encerradas | ${r.rebalances} / ${r.closedLegs} |`,'',
  '| Ano | Retorno | Queda máxima no ano |','|---|---|---|',...Object.entries(r.years).map(([y,v]:[string,any])=>`| ${y} | ${pct(v.returnPct)} | ${(v.maxDrawdown*100).toFixed(2)}% |`),'',
  'Horas preenchidas por moeda (paradas da corretora): '+Object.entries(r.quality).map(([s,q]:[string,any])=>`${s} ${q.filled}`).join(', ')+'.','','Fundings sem preço de marcação na fonte (preenchidos com a abertura da vela de negócios da hora): '+Object.entries(r.quality).map(([s,q]:[string,any])=>`${s} ${q.fundingMarkFilled}`).join(', ')+'.','',
  'Hashes dos datasets (SHA-256):','',...Object.entries(r.datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``)];
 return L.join('\n')+'\n';
}
if(process.argv[1]?.endsWith('momentum-longo.ts'))main();
