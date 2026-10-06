// Carry de funding, 2022 a 2026 (docs/PROTOCOLO_CARRY_FUNDING.md, FUNDING_CARRY_V1). Roda fora do servidor, só com dados
// públicos da Binance (à vista e USD-M, via curl); não envia ordens.
// Uso: npx tsx scripts/estudos/carry.ts
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {simulateFundingCarry,type CarryMarket} from '../../src/domain/funding-carry.js';
import type {FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import type {Candle} from '../../src/domain/backtest.js';
import {hourlyReturns,moments,probabilisticSharpe} from '../../src/domain/backtest-robustness.js';

const H=3600000;
export const CARRY_PROTOCOL=Object.freeze({version:'FUNDING_CARRY_V1',declaredAt:'2026-10-06',
 symbols:['ZECUSDT','NEARUSDT','UNIUSDT','BCHUSDT','FILUSDT','AAVEUSDT','AVAXUSDT','LINKUSDT','XRPUSDT','XLMUSDT','DOGEUSDT','SOLUSDT','LTCUSDT','ETHUSDT','BTCUSDT'],
 firstBar:Date.UTC(2022,0,1,0),lastBar:Date.UTC(2026,9,5,23),fundingFrom:Date.UTC(2021,11,24,0),
 rule:{rebalanceHours:168,signalHours:168,maxPositions:5,positionFraction:0.1,entryMinimumFunding:0.00105,exitFunding:0,minimumCashToShortNotional:0.5,
  spotFeeRate:0.001,perpFeeRate:0.00055,slippageBps:2,maintenanceRate:0.01,initialCapital:10000},
 screen:{version:'FUNDING_CARRY_SCREEN_V1',maximumFilledShare:0.01,maximumDrawdown:0.15,minimumPositiveYears:4,sharpeBenchmarkAnnual:1.0,minimumProbability:0.9}});
const P=CARRY_PROTOCOL,dir='scripts/estudos/out';mkdirSync(dir,{recursive:true});
const sleep=(ms:number)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
function get(host:string,path:string,params:Record<string,string|number>){
 const url=host+path+'?'+new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
 for(let attempt=0;attempt<4;attempt++){
  const out=execFileSync('curl',['-sS','-m','30','-w','\n%{http_code}',url],{encoding:'utf8',maxBuffer:64*1024*1024}),i=out.lastIndexOf('\n'),status=Number(out.slice(i+1));
  if(status===200){sleep(600);return JSON.parse(out.slice(0,i));}
  if(status===418||status===429)throw Error('Binance HTTP '+status+': pausa necessária');
  sleep(3000);
 }
 throw Error('Binance indisponível para '+path);
}
function klines(host:string,path:string,symbol:string,limit:number){
 const raw:Candle[]=[];let cursor=P.firstBar;
 while(cursor<=P.lastBar){const page=get(host,path,{symbol,interval:'1h',startTime:cursor,endTime:P.lastBar+H-1,limit}) as unknown[][];if(!page.length)break;
  for(const r of page)raw.push({timestamp:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])});cursor=raw.at(-1)!.timestamp+H;}
 return raw;
}
function download(symbol:string){
 const file=`${dir}/carry-${symbol}.json`;if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
 const spot=klines('https://api.binance.com','/api/v3/klines',symbol,1000),perp=klines('https://fapi.binance.com','/fapi/v1/klines',symbol,1500);
 const funding:FundingSettlement[]=[];let cursor=P.fundingFrom;
 while(cursor<=P.lastBar){const page=get('https://fapi.binance.com','/fapi/v1/fundingRate',{symbol,startTime:cursor,endTime:P.lastBar+H-1,limit:1000}) as Record<string,string>[];if(!page.length)break;
  for(const f of page)funding.push({timestamp:Number(f.fundingTime),rate:Number(f.fundingRate),markPrice:Number(f.markPrice)});cursor=funding.at(-1)!.timestamp+1;if(page.length<1000)break;}
 const data={symbol,spot,perp,funding};writeFileSync(file,JSON.stringify(data));return data;
}
/** Grade horária completa: horas faltando viram vela parada no último fechamento, com volume zero (contadas). */
function grid(raw:Candle[]){
 const byHour=new Map(raw.map(c=>[c.timestamp,c])),out:Candle[]=[];let filled=0,last:Candle|undefined;
 for(let t=P.firstBar;t<=P.lastBar;t+=H){const c=byHour.get(t);if(c){out.push(c);last=c;}else{if(!last)throw Error('sem vela inicial');filled++;out.push({timestamp:t,open:last.close,high:last.close,low:last.close,close:last.close,volume:0});}}
 return {candles:out,filled};
}
function main(){
 const markets:Record<string,CarryMarket>={},quality:Record<string,{spotFilled:number;perpFilled:number;fundingMarkFilled:number;fundings:number}>={},failures:string[]=[];
 for(const s of P.symbols){
  const d=download(s),spot=grid(d.spot),perp=grid(d.perp),n=spot.candles.length;
  // A Binance não devolve o preço de marcação nos fundings antigos. Nesses registros usa a abertura da vela do perpétuo
  // da hora da liquidação (antes da primeira vela, a abertura da primeira); só entra no valor recebido, nunca no sinal.
  const open=new Map(perp.candles.map(c=>[c.timestamp,c.open]));let fundingMarkFilled=0;
  const funding=d.funding.filter((f:FundingSettlement)=>f.timestamp>=P.fundingFrom&&f.timestamp<P.lastBar+H).map((f:FundingSettlement)=>{if(f.markPrice>0)return f;fundingMarkFilled++;
   return {...f,markPrice:open.get(Math.max(P.firstBar,Math.floor(f.timestamp/H)*H))!};});
  quality[s]={spotFilled:spot.filled,perpFilled:perp.filled,fundingMarkFilled,fundings:funding.length};
  console.log('dados',s,n,'velas',spot.filled,'/',perp.filled,'preenchidas',funding.length,'fundings');
  if(Math.max(spot.filled,perp.filled)/n>P.screen.maximumFilledShare){failures.push(s);continue;}
  markets[s]={spot:spot.candles,perp:perp.candles,funding};
 }
 const r=simulateFundingCarry(markets,P.rule),symbols=Object.keys(markets);
 const returns=hourlyReturns(r.equitySeries),m=moments(returns),sr0=P.screen.sharpeBenchmarkAnnual/Math.sqrt(24*365),probability=probabilisticSharpe(m,sr0);
 const years:Record<string,{returnPct:number;maxDrawdown:number}>={};
 for(const y of [2022,2023,2024,2025,2026]){const pts=r.equitySeries.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);if(pts.length<2)continue;
  const before=r.equitySeries.filter(p=>p.timestamp<pts[0].timestamp).at(-1)?.equity??P.rule.initialCapital;let peak=-Infinity,dd=0;for(const p of pts){peak=Math.max(peak,p.equity);dd=Math.max(dd,1-p.equity/peak);}
  years[y]={returnPct:pts.at(-1)!.equity/before-1,maxDrawdown:dd};}
 const basket=r.equitySeries.slice(1).map((_,k)=>symbols.reduce((s,sym)=>s+(markets[sym].spot[k+1].close/markets[sym].spot[k].close-1)/symbols.length,0));
 const mine=returns.slice(0,basket.length),mm=mine.reduce((a,b)=>a+b,0)/mine.length,mb=basket.reduce((a,b)=>a+b,0)/basket.length;
 let cov=0,va=0,vb=0;for(let k=0;k<mine.length;k++){cov+=(mine[k]-mm)*(basket[k]-mb);va+=(mine[k]-mm)**2;vb+=(basket[k]-mb)**2;}
 const buyHold=symbols.reduce((s,sym)=>s+(markets[sym].spot.at(-1)!.close/markets[sym].spot[0].close-1)/symbols.length,0);
 const span=(r.equitySeries.at(-1)!.timestamp-r.equitySeries[0].timestamp+H)/(365*24*H),annualized=(r.finalEquity/P.rule.initialCapital)**(1/span)-1;
 const heldCount:Record<string,number>={};for(const d of r.decisions)for(const s of d.held)heldCount[s]=(heldCount[s]??0)+1;
 const S=P.screen,positiveYears=Object.values(years).filter(y=>y.returnPct>0).length;
 const checks:[string,boolean][]=[['DATA_QUALITY',failures.length===0],['NO_LIQUIDATION',r.liquidatedAt===null],['POSITIVE_PNL',r.netPnl>0],['BOUNDED_DRAWDOWN',r.maxDrawdown<=S.maximumDrawdown],
  ['POSITIVE_YEARS',positiveYears>=S.minimumPositiveYears],['SHARPE_ABOVE_ONE',Number.isFinite(probability)&&probability>=S.minimumProbability]];
 const {equitySeries,decisions,execution:_simulation,...summary}=r;
 const report={protocol:P,...summary,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),symbols,failures,quality,
  returnPct:r.netPnl/P.rule.initialCapital,annualizedReturn:annualized,years,positiveYears,sharpeAnnualized:m.sharpe*Math.sqrt(24*365),probabilitySharpeAboveOne:probability,
  investedShare:r.investedHours/r.equitySeries.length,averagePositions:r.positionHours/r.equitySeries.length,weeksHeldBySymbol:heldCount,marketCorrelation:cov/Math.sqrt(va*vb),buyHold,
  decisionCount:decisions.length,lastDecision:decisions.at(-1),checks:Object.fromEntries(checks),passed:checks.every(([,ok])=>ok),failed:checks.filter(([,ok])=>!ok).map(([id])=>id)};
 const base='docs/estudos/carry-funding-2026-10-06';writeFileSync(base+'.json',JSON.stringify(report,null,1));writeFileSync(base+'.md',markdown(report));
 console.log('resultado',(report.returnPct*100).toFixed(2)+'%','anual',(annualized*100).toFixed(2)+'%','DD',(r.maxDrawdown*100).toFixed(2)+'%','anos+',positiveYears+'/'+Object.keys(years).length,
  Object.entries(years).map(([y,v])=>y+' '+(v.returnPct*100).toFixed(1)+'%').join(' '),'Sharpe',report.sharpeAnnualized.toFixed(2),'P(SR>1)',probability.toFixed(2),
  'funding',r.fundingReceived.toFixed(0),'taxas',r.feesPaid.toFixed(0),'base',r.basisPnl.toFixed(0),'investido',(report.investedShare*100).toFixed(0)+'%','margem min',r.minimumMarginRatio?.toFixed(2),
  report.passed?'APROVADA':'reprovada: '+report.failed.join(','));
}
const pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(2)+'%';
function markdown(r:any){
 const L=[`# Carry de funding · ${r.protocol.version}`,'',`Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance (à vista e USD-M). Período: 01/01/2022 a 05/10/2026. Protocolo: \`docs/PROTOCOLO_CARRY_FUNDING.md\` (registrado antes da execução).`,'',
  `**Resultado: ${r.passed?'aprovada':'reprovada ('+r.failed.join(', ')+')'}.**`,'',
  '| Medida | Valor |','|---|---|',`| Retorno no período | ${pct(r.returnPct)} |`,`| Retorno anualizado | ${pct(r.annualizedReturn)} |`,`| Queda máxima | ${(r.maxDrawdown*100).toFixed(2)}% |`,`| Anos positivos | ${r.positiveYears} de ${Object.keys(r.years).length} |`,
  `| Sharpe anual | ${r.sharpeAnnualized.toFixed(2)} |`,`| Probabilidade de o Sharpe verdadeiro passar de 1,0 | ${(r.probabilitySharpeAboveOne*100).toFixed(1)}% |`,
  `| Funding recebido / taxas / diferença entre preços | ${r.fundingReceived.toFixed(2)} / ${r.feesPaid.toFixed(2)} / ${r.basisPnl.toFixed(2)} |`,
  `| Tempo investido / média de moedas | ${(r.investedShare*100).toFixed(0)}% / ${r.averagePositions.toFixed(2)} |`,`| Entradas / saídas | ${r.entries} / ${r.exits} |`,
  `| Menor folga de margem | ${r.minimumMarginRatio===null?'—':(r.minimumMarginRatio*100).toFixed(1)+'%'} |`,`| Liquidação | ${r.liquidatedAt===null?'nenhuma':new Date(r.liquidatedAt).toISOString()} |`,
  `| Correlação com o mercado | ${r.marketCorrelation.toFixed(2)} |`,`| Comprar e segurar a cesta à vista (referência) | ${pct(r.buyHold)} |`,'',
  '| Ano | Retorno | Queda máxima no ano |','|---|---|---|',...Object.entries(r.years).map(([y,v]:[string,any])=>`| ${y} | ${pct(v.returnPct)} | ${(v.maxDrawdown*100).toFixed(2)}% |`),'',
  'Semanas na carteira por moeda: '+Object.entries(r.weeksHeldBySymbol).sort((a:any,b:any)=>b[1]-a[1]).map(([s,n])=>`${s} ${n}`).join(', ')+'.','',
  'Horas preenchidas por série (à vista / perpétuo): '+Object.entries(r.quality).map(([s,q]:[string,any])=>`${s} ${q.spotFilled}/${q.perpFilled}`).join(', ')+'.','',
  'Fundings sem preço de marcação na fonte (preenchidos com a abertura da vela do perpétuo): '+Object.entries(r.quality).map(([s,q]:[string,any])=>`${s} ${q.fundingMarkFilled}`).join(', ')+'.','',
  '## Hashes das séries (SHA-256)','',...Object.entries(r.marketHashes).map(([s,h])=>`- ${s}: \`${h}\``),''];
 return L.join('\n');
}
main();
