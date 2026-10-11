// Hipóteses dos vídeos, H01 a H06 (docs/research/video-strategy-hypotheses.md; protocolo VIDEO_HYPOTHESES_V1 em
// docs/PROTOCOLO_HIPOTESES_VIDEO.md). Roda fora do servidor, com os dados públicos já baixados pelo estudo de carry
// (carry-<MOEDA>.json; se faltar, rode antes: npx tsx scripts/estudos/carry.ts). Não envia ordens.
// Uso: VIDEO_CACHE_DIR=<pasta com carry-*.json> npx tsx scripts/estudos/hipoteses-video.ts
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import type {Candle} from '../../src/domain/backtest.js';
import type {FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import {signalBacktest,type SignalBacktestConfig,type SignalStrategy} from '../../src/domain/signal-backtest.js';
import {HYPOTHESIS_GRID as GRID_V1,AMENDMENT_1_GRID,buildStrategy,supportResistance,type HypothesisConfig} from '../../src/domain/video-hypotheses/strategies.js';
import {ICT_GRID,ICT_ATR_BARS,fairValueGaps,runIct,type IctResult} from '../../src/domain/video-hypotheses/ict.js';
import {atr} from '../../src/domain/video-hypotheses/indicators.js';
import {drawDistinct,forwardReturn,mulberry32,newExtremes,percentileByRank,placeboStrategy,templateFromIntent,type PlaceboEntry,type TradeTemplate} from '../../src/domain/video-hypotheses/placebo.js';
import {calendarStrategy,fitCalendar,type CalendarKind,type CalendarFit} from '../../src/domain/video-hypotheses/calendar.js';
import {findDecisionLookahead} from '../../src/domain/lookahead-check.js';
import {deflatedSharpe,moments} from '../../src/domain/backtest-robustness.js';
import {scriptProvenance} from './proveniencia.js';

const H=3600000;
export const VIDEO_PROTOCOL=Object.freeze({version:'VIDEO_HYPOTHESES_V1',declaredAt:'2026-10-06',
 symbols:['ZECUSDT','NEARUSDT','UNIUSDT','BCHUSDT','FILUSDT','AAVEUSDT','AVAXUSDT','LINKUSDT','XRPUSDT','XLMUSDT','DOGEUSDT','SOLUSDT','LTCUSDT','ETHUSDT','BTCUSDT'],
 firstBar:Date.UTC(2022,0,1),lastBar:Date.UTC(2026,9,5,23),testYears:[2024,2025,2026],warmup:200,
 costs:{initialCapital:10000,positionFraction:0.1,feeRate:0.00055,slippageBps:2},stressedCosts:{feeRate:0.0011,slippageBps:5},
 calendarKinds:['HOUR_OF_DAY','DAY_OF_WEEK'] as CalendarKind[],
 screen:{version:'VIDEO_SCREEN_V1',minimumDeflatedSharpe:0.9,minimumPositiveYears:2,minimumCoinBreadth:0.6,minimumStableShare:0.5,maximumFilledShare:0.01}});
const P=VIDEO_PROTOCOL,S=P.screen,dir=process.env.VIDEO_CACHE_DIR??'scripts/estudos/out';
// Emenda 1 (VIDEO_AMENDMENT=1): acrescenta o H04_V2; as 8 configurações novas entram na contagem de tentativas (55).
const AMENDMENT=process.env.VIDEO_AMENDMENT==='1',HYPOTHESIS_GRID=AMENDMENT?[...GRID_V1,...AMENDMENT_1_GRID]:GRID_V1;
const TRIALS=HYPOTHESIS_GRID.length+P.calendarKinds.length;
const yearStart=(y:number)=>Date.UTC(y,0,1),testEnd=P.lastBar+H;
// VIDEO_ICT=1 (docs/PROTOCOLO_HIPOTESES_ICT.md): avalia só as 23 configurações ICT, com 78 tentativas, o placebo e o VIDEO_SCREEN_V2.
const ICT=process.env.VIDEO_ICT==='1',ICT_TRIALS=GRID_V1.length+AMENDMENT_1_GRID.length+P.calendarKinds.length+ICT_GRID.length;
export const ICT_PROTOCOL=Object.freeze({...P,version:'VIDEO_HYPOTHESES_V2_ICT',declaredAt:'2026-10-10',screen:{...S,version:'VIDEO_SCREEN_V2',placebo:{seeds:200,percentile:0.9}}});

interface Coin {symbol:string;candles:Candle[];funding:FundingSettlement[];filled:number;fundingMarkFilled:number}
function load(symbol:string):Coin{
 const file=`${dir}/carry-${symbol}.json`;if(!existsSync(file))throw Error(`sem dados de ${symbol} em ${dir}: rode scripts/estudos/carry.ts`);
 const d=JSON.parse(readFileSync(file,'utf8')),byHour=new Map<number,Candle>(d.perp.map((c:Candle)=>[c.timestamp,c]));
 const candles:Candle[]=[];let filled=0,prev:Candle|undefined;
 for(let t=P.firstBar;t<=P.lastBar;t+=H){const c=byHour.get(t);if(c){candles.push(c);prev=c;}else{if(!prev)throw Error('sem vela inicial: '+symbol);filled++;candles.push({timestamp:t,open:prev.close,high:prev.close,low:prev.close,close:prev.close,volume:0});}}
 const open=new Map(candles.map(c=>[c.timestamp,c.open]));let fundingMarkFilled=0;
 const funding=d.funding.filter((f:FundingSettlement)=>f.timestamp>=P.firstBar&&f.timestamp<testEnd).map((f:FundingSettlement)=>{if(f.markPrice>0)return f;fundingMarkFilled++;return {...f,markPrice:open.get(Math.floor(f.timestamp/H)*H)!};});
 return {symbol,candles,funding,filled,fundingMarkFilled};
}
type Run={equity:Float64Array;coinYearPnl:Record<string,Record<number,number>>;trades:{year:number;netPnl:number;hours:number;symbol:string;side:1|-1;entryTime:number}[];exposure:number};
/** Roda uma estratégia em todas as moedas (10 000 cada) e soma o patrimônio hora a hora. */
function runAll(coins:Coin[],make:(coin:Coin)=>SignalStrategy,cost:SignalBacktestConfig):Run{
 const n=coins[0].candles.length,equity=new Float64Array(n),coinYearPnl:Run['coinYearPnl']={},trades:Run['trades']=[];let exposure=0;
 for(const coin of coins){
  const r=signalBacktest(coin.candles,coin.funding,make(coin),cost);r.equity.forEach((p,i)=>equity[i]+=p.equity);exposure+=r.exposureHours;
  const at=(t:number)=>{let e=cost.initialCapital;for(const p of r.equity){if(p.timestamp>=t)break;e=p.equity;}return e;};
  coinYearPnl[coin.symbol]=Object.fromEntries(P.testYears.map(y=>[y,at(Math.min(yearStart(y+1),testEnd))-at(yearStart(y))]));
  for(const t of r.trades)trades.push({year:new Date(t.exitTime).getUTCFullYear(),netPnl:t.netPnl,hours:(t.exitTime+1-t.entryTime)/H,symbol:coin.symbol,side:t.side,entryTime:t.entryTime});
 }
 return {equity,coinYearPnl,trades,exposure};
}
const times=()=>Array.from({length:Math.round((P.lastBar-P.firstBar)/H)+1},(_,i)=>P.firstBar+i*H);
/** Retornos horários do patrimônio entre [from, to): o primeiro retorno usa o patrimônio da hora anterior a `from`. */
function returnsBetween(equity:Float64Array,from:number,to:number){const t=times(),out:number[]=[];for(let i=1;i<t.length;i++)if(t[i]>=from&&t[i]<to&&equity[i-1]>0)out.push(equity[i]/equity[i-1]-1);return out;}
const sharpeOf=(r:number[])=>{const m=moments(r);return Number.isFinite(m.sharpe)?m.sharpe:-Infinity;};
const compound=(r:number[])=>r.reduce((e,x)=>e*(1+x),1)-1;
function drawdown(r:number[]){let e=1,peak=1,dd=0;for(const x of r){e*=1+x;peak=Math.max(peak,e);dd=Math.max(dd,1-e/peak);}return dd;}

function main(){
 const coins=P.symbols.map(load),failures=coins.filter(c=>c.filled/c.candles.length>S.maximumFilledShare).map(c=>c.symbol);
 for(const c of coins)console.log('dados',c.symbol,c.candles.length,'velas',c.filled,'preenchidas',c.funding.length,'fundings');
 if(failures.length)throw Error('falha de dados: '+failures.join(','));
 // 0) Viés de futuro nos dados reais: cada configuração decide igual com a série inteira e cortada (BTC, últimas 1 500 velas).
 const sample=coins.at(-1)!.candles.slice(-1500);
 for(const config of HYPOTHESIS_GRID){const side=(c:readonly Candle[])=>{const s=buildStrategy(c,config);return c.map((_,i)=>{const d=s(i,null);return d&&d!=='EXIT'?d.side:0;});};
  const r=findDecisionLookahead(sample,side,{from:300,stride:23});if(r.violations.length)throw Error('viés de futuro em '+config.id);}
 console.log(`verificação de viés de futuro: ${HYPOTHESIS_GRID.length} configurações sem violação`);
 const base:SignalBacktestConfig={...P.costs,warmup:P.warmup},stressed:SignalBacktestConfig={...base,...P.stressedCosts};
 // 1) H01 a H05: cada configuração no período inteiro, uma vez (as regras são causais).
 const runs=new Map<string,Run>();
 for(const config of HYPOTHESIS_GRID){const t0=Date.now();runs.set(config.id,runAll(coins,coin=>buildStrategy(coin.candles,config),base));console.log('rodou',config.id,((Date.now()-t0)/1000).toFixed(1)+'s');}
 // 2) H06: lados ajustados só no treino de cada ano de teste; a seleção entre os dois tipos usa o treino (dentro da amostra).
 const calendar:Record<string,{fits:Record<number,CalendarFit>;runs:Record<number,Run>;trainSharpe:Record<number,number>}>={};
 for(const kind of P.calendarKinds){calendar[kind]={fits:{},runs:{},trainSharpe:{}};
  for(const y of P.testYears){const fit=fitCalendar(coins.map(c=>c.candles),kind,P.firstBar,yearStart(y));calendar[kind].fits[y]=fit;
   const run=runAll(coins,coin=>calendarStrategy(coin.candles,fit),base);calendar[kind].runs[y]=run;calendar[kind].trainSharpe[y]=sharpeOf(returnsBetween(run.equity,P.firstBar,yearStart(y)));}
  console.log('rodou H06',kind);}
 // 3) Dispersão dos Sharpe das 47 tentativas no treino comum (2022–2023), para o desconto de múltiplas tentativas.
 const trialSharpes=[...HYPOTHESIS_GRID.map(c=>sharpeOf(returnsBetween(runs.get(c.id)!.equity,P.firstBar,yearStart(2024)))),...P.calendarKinds.map(k=>calendar[k].trainSharpe[2024])].filter(Number.isFinite);
 const mean=trialSharpes.reduce((a,b)=>a+b,0)/trialSharpes.length,variance=trialSharpes.reduce((a,b)=>a+(b-mean)**2,0)/(trialSharpes.length-1);
 // 4) Walk-forward por família: em cada ano de teste, escolhe a configuração de melhor Sharpe no treino ancorado (2022 até o ano anterior).
 const families=[...new Set(HYPOTHESIS_GRID.map(c=>c.family)),'H06_CALENDAR'] as string[],report:Record<string,unknown>[]=[];
 const stressedCache=new Map<string,Run>();
 for(const family of families){
  const isCal=family==='H06_CALENDAR',members=isCal?P.calendarKinds.map(String):HYPOTHESIS_GRID.filter(c=>c.family===family).map(c=>c.id);
  const selected:Record<number,string>={},oos:number[]=[],oosStressed:number[]=[],years:Record<number,number>={},coinPnl:Record<string,number>={};const trades:Run['trades']=[];
  for(const y of P.testYears){
   const trainTo=yearStart(y),end=Math.min(yearStart(y+1),testEnd);
   const score=(id:string)=>isCal?calendar[id].trainSharpe[y]:sharpeOf(returnsBetween(runs.get(id)!.equity,P.firstBar,trainTo));
   const pick=members.reduce((best,id)=>score(id)>score(best)?id:best,members[0]);selected[y]=pick;
   const run=isCal?calendar[pick].runs[y]:runs.get(pick)!;
   const key=isCal?pick+':'+y:pick;let st=stressedCache.get(key);if(!st){st=isCal?runAll(coins,coin=>calendarStrategy(coin.candles,calendar[pick].fits[y]),stressed):runAll(coins,coin=>buildStrategy(coin.candles,HYPOTHESIS_GRID.find(c=>c.id===pick)!),stressed);stressedCache.set(key,st);}
   const r=returnsBetween(run.equity,trainTo,end);oos.push(...r);oosStressed.push(...returnsBetween(st.equity,trainTo,end));years[y]=compound(r);
   for(const [s,v] of Object.entries(run.coinYearPnl))coinPnl[s]=(coinPnl[s]??0)+v[y];trades.push(...run.trades.filter(t=>t.year===y));
  }
  // Estabilidade: fração das configurações da família com resultado positivo no período de teste inteiro (2024 em diante).
  const stable=members.map(id=>isCal?P.testYears.reduce((e,y)=>e*(1+compound(returnsBetween(calendar[id].runs[y].equity,yearStart(y),Math.min(yearStart(y+1),testEnd)))),1)-1:compound(returnsBetween(runs.get(id)!.equity,yearStart(2024),testEnd)));
  const dsr=deflatedSharpe(oos,TRIALS,variance),m=moments(oos),wins=trades.filter(t=>t.netPnl>0),losses=trades.filter(t=>t.netPnl<=0);
  const positiveYears=Object.values(years).filter(v=>v>0).length,breadth=Object.values(coinPnl).filter(v=>v>0).length/P.symbols.length,stableShare=stable.filter(v=>v>0).length/stable.length;
  const checks:Record<string,boolean>={OOS_POSITIVE:compound(oos)>0,COSTS_DOUBLED_POSITIVE:compound(oosStressed)>0,DEFLATED_SHARPE:Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=S.minimumDeflatedSharpe,
   POSITIVE_YEARS:positiveYears>=S.minimumPositiveYears,COIN_BREADTH:breadth>=S.minimumCoinBreadth,PARAMETER_STABILITY:stableShare>=S.minimumStableShare};
  const verdict=Object.values(checks).every(Boolean)?'CANDIDATA':checks.OOS_POSITIVE&&checks.COSTS_DOUBLED_POSITIVE?'INCONCLUSIVA':'REJEITADA';
  report.push({family,configs:members.length,selected,oosReturn:compound(oos),oosReturnStressed:compound(oosStressed),years,maxDrawdown:drawdown(oos),sharpeAnnualized:m.sharpe*Math.sqrt(24*365),deflatedSharpe:dsr.deflatedSharpe,
   positiveYears,coinBreadth:breadth,stableShare,stableByConfig:Object.fromEntries(members.map((id,k)=>[id,stable[k]])),trades:trades.length,winRate:trades.length?wins.length/trades.length:null,
   expectancy:trades.length?trades.reduce((s,t)=>s+t.netPnl,0)/trades.length:null,profitFactor:losses.length?wins.reduce((s,t)=>s+t.netPnl,0)/Math.abs(losses.reduce((s,t)=>s+t.netPnl,0)):null,
   averageHoldingHours:trades.length?trades.reduce((s,t)=>s+t.hours,0)/trades.length:null,checks,verdict});
  console.log(family,verdict,'OOS',(compound(oos)*100).toFixed(2)+'%','custos x2',(compound(oosStressed)*100).toFixed(2)+'%','DSR',dsr.deflatedSharpe.toFixed(2),'anos+',positiveYears,'moedas+',(breadth*100).toFixed(0)+'%','estáveis',(stableShare*100).toFixed(0)+'%','escolhas',JSON.stringify(selected));
 }
 // 5) Referências: cesta comprada com a mesma exposição (10%) e ficar de fora (0).
 const basket=P.testYears.map(y=>{const from=yearStart(y),to=Math.min(yearStart(y+1),testEnd);return coins.reduce((s,c)=>{const a=c.candles.filter(x=>x.timestamp<from).at(-1)!,b=c.candles.filter(x=>x.timestamp<to).at(-1)!;return s+(b.close/a.close-1)/coins.length;},0);});
 const baselines={flat:0,basketSameExposure:basket.reduce((e,r)=>e*(1+0.1*r),1)-1,basketByYear:Object.fromEntries(P.testYears.map((y,k)=>[y,basket[k]]))};
 // 6) H04: a taxa de acerto passada prevê o próximo reteste? (só toques a partir de 2024, resolvidos)
 const holdPrediction=[12,24].flatMap(pivotBars=>(AMENDMENT?[0,1]:[0]).map(keepBroken=>({pivotBars,keepBroken}))).map(({pivotBars,keepBroken})=>{const buckets:Record<string,{hold:number;break:number}>={SEM_HISTORICO:{hold:0,break:0},ABAIXO_DE_50:{hold:0,break:0},A_PARTIR_DE_50:{hold:0,break:0}};
  for(const c of coins)for(const t of supportResistance(c.candles,{pivotBars,minRetests:1,minHoldRate:0.5,keepBroken}).touches){if(t.time<yearStart(2024)||t.outcome==='NONE')continue;const k=t.priorHoldRate===null?'SEM_HISTORICO':t.priorHoldRate<0.5?'ABAIXO_DE_50':'A_PARTIR_DE_50';buckets[k][t.outcome==='HOLD'?'hold':'break']++;}
  return {pivotBars,version:keepBroken?'V2':'V1',buckets:Object.fromEntries(Object.entries(buckets).map(([k,v])=>[k,{...v,holdRate:v.hold+v.break?v.hold/(v.hold+v.break):null}]))};});
 // 7) H06: lados escolhidos no treino e o sinal do retorno médio no ano de teste.
 const calendarTables=Object.fromEntries(P.calendarKinds.map(kind=>[kind,P.testYears.map(y=>{const fit=calendar[kind].fits[y],test=fitCalendar(coins.map(c=>c.candles),kind,yearStart(y),Math.min(yearStart(y+1),testEnd));
  return {year:y,chosen:fit.buckets.filter(b=>b.side!==0).map(b=>({bucket:b.bucket,side:b.side,trainT:b.t,testMean:test.buckets.find(x=>x.bucket===b.bucket)?.meanReturn??null,signKept:Math.sign(test.buckets.find(x=>x.bucket===b.bucket)?.meanReturn??0)===b.side}))};})]));
 const candidates=report.filter(r=>r.verdict==='CANDIDATA').map(r=>r.family);
 const out={protocol:P,amendment:AMENDMENT?'EMENDA_1_H04_V2':null,trials:TRIALS,provenance:scriptProvenance('scripts/estudos/hipoteses-video.ts'),execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  data:coins.map(c=>({symbol:c.symbol,candles:c.candles.length,filled:c.filled,fundings:c.funding.length,fundingMarkFilled:c.fundingMarkFilled})),trialSharpeVariance:variance,families:report,baselines,holdPrediction,calendarTables,
  combinations:candidates.length?{status:'PENDENTE_DE_PROTOCOLO_PROPRIO',components:candidates}:{status:'NAO_EXECUTADAS',reason:'nenhum componente foi classificado como CANDIDATA (regra do documento: combinar só o que se sustenta sozinho)'}};
 const base_=AMENDMENT?'docs/estudos/hipoteses-video-emenda1-2026-10-06':'docs/estudos/hipoteses-video-2026-10-06';writeFileSync(base_+'.json',JSON.stringify(out,null,1));writeFileSync(base_+'.md',markdown(out));
 console.log('referência: cesta com 10% de exposição',(baselines.basketSameExposure*100).toFixed(2)+'%','| combinações:',out.combinations.status);
}
const pct=(v:number|null|undefined)=>v===null||v===undefined||!Number.isFinite(v)?'—':(v>=0?'+':'')+(v*100).toFixed(2)+'%',num=(v:number|null|undefined,d=2)=>v===null||v===undefined||!Number.isFinite(v)?'—':v.toFixed(d);
function markdown(r:any){
 const L=[`# Hipóteses dos vídeos · ${r.protocol.version}`,'',`Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M (15 moedas, 1h, 2022-01-01 a 2026-10-05). Protocolo: \`docs/PROTOCOLO_HIPOTESES_VIDEO.md\` (registrado antes da execução). Commit: \`${r.provenance.codeCommit}\` (árvore ${r.provenance.workingTreeClean?'limpa':'com alterações'}).`,'',
  `Walk-forward por ano (2024, 2025, 2026 até 05/10), com treino ancorado desde 2022. ${r.trials} configurações no total, todas contadas no Sharpe deflacionado. Nenhuma hipótese é estratégia validada; o melhor resultado possível aqui é "candidata a validação adicional".`,'',
  '| Família | Configs | Veredito | Retorno fora da amostra | Com custos dobrados | 2024 / 2025 / 2026 | Queda máx. | Sharpe | Sharpe deflacionado | Moedas positivas | Configs estáveis | Operações | Acerto | Expectativa (USDT) | Fator de lucro |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...r.families.map((f:any)=>`| ${f.family} | ${f.configs} | **${f.verdict}** | ${pct(f.oosReturn)} | ${pct(f.oosReturnStressed)} | ${r.protocol.testYears.map((y:number)=>pct(f.years[y])).join(' / ')} | ${pct(f.maxDrawdown)} | ${num(f.sharpeAnnualized)} | ${num(f.deflatedSharpe)} | ${pct(f.coinBreadth)} | ${pct(f.stableShare)} | ${f.trades} | ${pct(f.winRate)} | ${num(f.expectancy)} | ${num(f.profitFactor)} |`),'',
  `Referência: cesta das 15 moedas comprada com a mesma exposição (10%): ${pct(r.baselines.basketSameExposure)}; ficar de fora: 0%.`,'',
  '## Configuração escolhida em cada ano (pelo treino)','',...r.families.map((f:any)=>`- ${f.family}: ${Object.entries(f.selected).map(([y,id])=>`${y} → ${id}`).join('; ')}`),'',
  '## H04: a taxa de acerto passada prevê o próximo reteste? (toques de 2024 em diante)','','| Pivô | Sem histórico | Taxa anterior < 50% | Taxa anterior ≥ 50% |','|---|---|---|---|',
  ...r.holdPrediction.map((h:any)=>`| ${h.pivotBars} velas (${h.version}) | ${pct(h.buckets.SEM_HISTORICO.holdRate)} (${h.buckets.SEM_HISTORICO.hold+h.buckets.SEM_HISTORICO.break}) | ${pct(h.buckets.ABAIXO_DE_50.holdRate)} (${h.buckets.ABAIXO_DE_50.hold+h.buckets.ABAIXO_DE_50.break}) | ${pct(h.buckets.A_PARTIR_DE_50.holdRate)} (${h.buckets.A_PARTIR_DE_50.hold+h.buckets.A_PARTIR_DE_50.break}) |`),'',
  '## H06: períodos escolhidos no treino (|t| ≥ 3) e se o sinal se manteve no ano de teste','',
  ...Object.entries(r.calendarTables).flatMap(([kind,rows]:[string,any])=>[`**${kind}**`,'',...rows.map((row:any)=>`- ${row.year}: ${row.chosen.length?row.chosen.map((c:any)=>`${c.bucket} (${c.side>0?'compra':'venda'}, t=${num(c.trainT,1)}, ${c.signKept?'manteve':'inverteu'})`).join(', '):'nenhum período passou no corte'}`),'']),
  `## Combinações (C01 a C03)`,'',r.combinations.status==='NAO_EXECUTADAS'?`Não executadas: ${r.combinations.reason}.`:`Componentes candidatos: ${r.combinations.components.join(', ')}. As combinações exigem protocolo próprio, declarado antes de rodar.`,'',
  'Dados: '+r.data.map((d:any)=>`${d.symbol} ${d.filled} h preenchidas`).join(', ')+'.',''];
 return L.join('\n');
}
// ---------- VIDEO_HYPOTHESES_V2_ICT (VIDEO_ICT=1; docs/PROTOCOLO_HIPOTESES_ICT.md, Emendas 1 a 3) ----------
const ICT_FAMILIES=['H07_ORDER_BLOCK','H08_LIQUIDITY_SWEEP','H09_DISPLACEMENT','H10_IFVG','H11_INTERNAL_RANGE_LIQUIDITY'] as const;
const avg=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const stat=(a:number[])=>({n:a.length,mean:avg(a)});
function mainIct(){
 const IP=ICT_PROTOCOL,smoke=process.env.VIDEO_SMOKE==='1',seeds=smoke?Number(process.env.VIDEO_ICT_SEEDS??3):IP.screen.placebo.seeds;
 if(ICT_TRIALS!==78)throw Error('contagem de tentativas diferente de 78: '+ICT_TRIALS);
 const coins=P.symbols.map(load),failures=coins.filter(c=>c.filled/c.candles.length>S.maximumFilledShare).map(c=>c.symbol);
 for(const c of coins)console.log('dados',c.symbol,c.candles.length,'velas',c.filled,'preenchidas',c.funding.length,'fundings');
 if(failures.length)throw Error('falha de dados: '+failures.join(','));
 // 0) Viés de futuro nos dados reais: cada configuração decide igual com a série inteira e cortada (BTC, últimas 1 500 velas).
 const sample=coins.at(-1)!.candles.slice(-1500);
 for(const config of ICT_GRID){const side=(c:readonly Candle[])=>{const s=buildStrategy(c,config);return c.map((_,i)=>{const d=s(i,null);return d&&d!=='EXIT'?d.side:0;});};
  const r=findDecisionLookahead(sample,side,{from:300,stride:23});if(r.violations.length)throw Error('viés de futuro em '+config.id);}
 console.log(`verificação de viés de futuro: ${ICT_GRID.length} configurações sem violação`);
 const base:SignalBacktestConfig={...P.costs,warmup:P.warmup},stressed:SignalBacktestConfig={...base,...P.stressedCosts};
 const trainTo2024=yearStart(2024),nBars=coins[0].candles.length;
 // 1) As 23 configurações ICT no período inteiro, uma vez (as regras são causais).
 const runs=new Map<string,Run>();
 for(const config of ICT_GRID){const t0=Date.now();runs.set(config.id,runAll(coins,coin=>buildStrategy(coin.candles,config),base));console.log('rodou',config.id,((Date.now()-t0)/1000).toFixed(1)+'s');}
 // 2) Dispersão dos Sharpe de treino (2022–2023) das 78 tentativas (Emenda 3, item 19): as 55 do V1 só entram aqui, sem veredito.
 const v1Train:number[]=[];
 for(const config of [...GRID_V1,...AMENDMENT_1_GRID]){const run=runAll(coins,coin=>buildStrategy(coin.candles,config),base);v1Train.push(sharpeOf(returnsBetween(run.equity,P.firstBar,trainTo2024)));console.log('treino V1',config.id);}
 for(const kind of P.calendarKinds){const fit=fitCalendar(coins.map(c=>c.candles),kind,P.firstBar,trainTo2024),run=runAll(coins,coin=>calendarStrategy(coin.candles,fit),base);v1Train.push(sharpeOf(returnsBetween(run.equity,P.firstBar,trainTo2024)));console.log('treino V1 H06',kind);}
 const ictTrain=ICT_GRID.map(c=>sharpeOf(returnsBetween(runs.get(c.id)!.equity,P.firstBar,trainTo2024)));
 const trialSharpes=[...v1Train,...ictTrain].filter(Number.isFinite);
 const trialMean=trialSharpes.reduce((a,b)=>a+b,0)/trialSharpes.length,variance=trialSharpes.reduce((a,b)=>a+(b-trialMean)**2,0)/(trialSharpes.length-1);
 // 3) Walk-forward por família, como no V1: em cada ano de teste, a configuração de melhor Sharpe no treino ancorado.
 const stressedCache=new Map<string,Run>(),signalCache=new Map<string,IctResult>();
 const signalsOf=(config:HypothesisConfig,coin:Coin)=>{const key=config.id+':'+coin.symbol;let r=signalCache.get(key);if(!r){r=runIct(coin.candles,config);signalCache.set(key,r);}return r;};
 const sortedCoins=[...coins].sort((a,b)=>a.symbol.localeCompare(b.symbol)),rangeOf=new Map(coins.map(c=>[c.symbol,atr(c.candles,ICT_ATR_BARS)] as const));
 const yearIndex=(y:number)=>({first:Math.max(P.warmup,Math.round((yearStart(y)-P.firstBar)/H)),last:Math.min(nBars-1,Math.round((yearStart(y+1)-P.firstBar)/H)-1)});
 const report:Record<string,unknown>[]=[];
 for(const family of ICT_FAMILIES){
  signalCache.clear();// só as operações escolhidas da família corrente ficam na memória (a máquina de pesquisa tem pouca RAM)
  const members=ICT_GRID.filter(c=>c.family===family).map(c=>c.id);
  const selected:Record<number,string>={},oos:number[]=[],oosStressed:number[]=[],years:Record<number,number>={},coinPnl:Record<string,number>={};const trades:Run['trades']=[];
  for(const y of P.testYears){
   const trainTo=yearStart(y),end=Math.min(yearStart(y+1),testEnd);
   const score=(id:string)=>sharpeOf(returnsBetween(runs.get(id)!.equity,P.firstBar,trainTo));
   const pick=members.reduce((best,id)=>score(id)>score(best)?id:best,members[0]);selected[y]=pick;
   const run=runs.get(pick)!;
   let st=stressedCache.get(pick);if(!st){st=runAll(coins,coin=>buildStrategy(coin.candles,ICT_GRID.find(c=>c.id===pick)!),stressed);stressedCache.set(pick,st);}
   const r=returnsBetween(run.equity,trainTo,end);oos.push(...r);oosStressed.push(...returnsBetween(st.equity,trainTo,end));years[y]=compound(r);
   for(const [s,v] of Object.entries(run.coinYearPnl))coinPnl[s]=(coinPnl[s]??0)+v[y];trades.push(...run.trades.filter(t=>t.year===y));
  }
  const stable=members.map(id=>compound(returnsBetween(runs.get(id)!.equity,yearStart(2024),testEnd)));
  const dsr=deflatedSharpe(oos,ICT_TRIALS,variance),m=moments(oos),wins=trades.filter(t=>t.netPnl>0),losses=trades.filter(t=>t.netPnl<=0);
  // 4) Placebo (critério 7): mesmas entradas por moeda e ano da sequência escolhida, mesmo lado e mesmas distâncias em ATR, vela sorteada.
  const templates:Record<string,Record<number,TradeTemplate[]>>={};let realEntries=0;
  for(const coin of sortedCoins){templates[coin.symbol]={};
   for(const y of P.testYears){
    const config=ICT_GRID.find(c=>c.id===selected[y])!,res=signalsOf(config,coin),range=rangeOf.get(coin.symbol)!;
    const mine=runs.get(selected[y])!.trades.filter(t=>t.symbol===coin.symbol&&new Date(t.entryTime).getUTCFullYear()===y).sort((a,b)=>a.entryTime-b.entryTime);
    templates[coin.symbol][y]=mine.map(t=>{const d=Math.round((t.entryTime-P.firstBar)/H)-1,intent=res.signals[d];
     const tpl=intent?templateFromIntent(coin.candles[d].close,range[d],intent):null;if(!tpl)throw Error(`operação real sem sinal de origem: ${selected[y]} ${coin.symbol} vela ${d}`);return tpl;});
    realEntries+=mine.length;
   }}
  const placeboReturns:number[]=[],placeboLost:number[]=[];
  for(let seed=1;seed<=seeds;seed++){
   const rand=mulberry32(seed),equity=new Float64Array(nBars);let lost=0;
   for(const coin of sortedCoins){
    const entries:PlaceboEntry[]=[];
    for(const y of P.testYears){const tpl=templates[coin.symbol][y];if(!tpl.length)continue;
     const {first,last}=yearIndex(y);drawDistinct(rand,last-first+1,tpl.length).forEach((o,k)=>entries.push({index:first+o,deadline:last,...tpl[k]}));}
    if(!entries.length){for(let i=0;i<nBars;i++)equity[i]+=base.initialCapital;continue;}
    const p=placeboStrategy(rangeOf.get(coin.symbol)!,coin.candles,entries),r=signalBacktest(coin.candles,coin.funding,p.strategy,base);
    r.equity.forEach((pt,i)=>equity[i]+=pt.equity);lost+=p.lost();
   }
   placeboReturns.push(compound(P.testYears.flatMap(y=>returnsBetween(equity,yearStart(y),Math.min(yearStart(y+1),testEnd)))));placeboLost.push(lost);
  }
  const oosReturn=compound(oos),p90=percentileByRank(placeboReturns,IP.screen.placebo.percentile);
  const placebo={seeds,p90,median:percentileByRank(placeboReturns,0.5),mean:avg(placeboReturns),p10:percentileByRank(placeboReturns,0.1),max:Math.max(...placeboReturns),realBeatsShare:placeboReturns.filter(v=>v<oosReturn).length/seeds,
   realEntries,lostEntriesMean:avg(placeboLost),lostEntriesMax:Math.max(...placeboLost)};
  const bySide=Object.fromEntries(([1,-1] as const).map(s=>{const t=trades.filter(x=>x.side===s);return [s>0?'LONG':'SHORT',{trades:t.length,netPnl:t.reduce((a,x)=>a+x.netPnl,0),winRate:t.length?t.filter(x=>x.netPnl>0).length/t.length:null}];}));
  const positiveYears=Object.values(years).filter(v=>v>0).length,breadth=Object.values(coinPnl).filter(v=>v>0).length/P.symbols.length,stableShare=stable.filter(v=>v>0).length/stable.length;
  const checks:Record<string,boolean>={OOS_POSITIVE:oosReturn>0,COSTS_DOUBLED_POSITIVE:compound(oosStressed)>0,DEFLATED_SHARPE:Number.isFinite(dsr.deflatedSharpe)&&dsr.deflatedSharpe>=S.minimumDeflatedSharpe,
   POSITIVE_YEARS:positiveYears>=S.minimumPositiveYears,COIN_BREADTH:breadth>=S.minimumCoinBreadth,PARAMETER_STABILITY:stableShare>=S.minimumStableShare,PLACEBO_P90:Number.isFinite(p90)&&oosReturn>p90};
  const verdict=Object.values(checks).every(Boolean)?'CANDIDATA':checks.OOS_POSITIVE&&checks.COSTS_DOUBLED_POSITIVE?'INCONCLUSIVA':'REJEITADA';
  report.push({family,configs:members.length,selected,oosReturn,oosReturnStressed:compound(oosStressed),years,maxDrawdown:drawdown(oos),sharpeAnnualized:m.sharpe*Math.sqrt(24*365),deflatedSharpe:dsr.deflatedSharpe,
   positiveYears,coinBreadth:breadth,stableShare,stableByConfig:Object.fromEntries(members.map((id,k)=>[id,stable[k]])),trades:trades.length,winRate:trades.length?wins.length/trades.length:null,
   expectancy:trades.length?trades.reduce((s,t)=>s+t.netPnl,0)/trades.length:null,profitFactor:losses.length?wins.reduce((s,t)=>s+t.netPnl,0)/Math.abs(losses.reduce((s,t)=>s+t.netPnl,0)):null,
   averageHoldingHours:trades.length?trades.reduce((s,t)=>s+t.hours,0)/trades.length:null,bySide,placebo,checks,verdict});
  console.log(family,verdict,'OOS',(oosReturn*100).toFixed(2)+'%','placebo p90',(p90*100).toFixed(2)+'%','custos x2',(compound(oosStressed)*100).toFixed(2)+'%','DSR',dsr.deflatedSharpe.toFixed(2),'anos+',positiveYears,'moedas+',(breadth*100).toFixed(0)+'%','estáveis',(stableShare*100).toFixed(0)+'%','escolhas',JSON.stringify(selected));
 }
 // 5) Taxa de toque (H07, H09B, H10) e inversão: fração das zonas criadas cujo nível de entrada foi alcançado dentro da validade.
 const testStart=yearStart(2024);
 const touch=ICT_GRID.filter(c=>c.family==='H07_ORDER_BLOCK'||c.family==='H10_IFVG'||(c.family==='H09_DISPLACEMENT'&&c.params.role==='RETRACEMENT')).map(config=>{
  const a={created:0,touched:0,entered:0},t={created:0,touched:0,entered:0};let baseFvgs=0;
  for(const coin of coins){
   for(const z of runIct(coin.candles,config).zones){const bucket=coin.candles[z.created].timestamp>=testStart?[a,t]:[a];for(const b of bucket){b.created++;if(z.touched)b.touched++;if(z.entered)b.entered++;}}
   if(config.family==='H10_IFVG')baseFvgs+=fairValueGaps(coin.candles,rangeOf.get(coin.symbol)!,1,Number(config.params.g)).length;
  }
  const rate=(n:number,d:number)=>d?n/d:null;
  return {id:config.id,allPeriod:{...a,touchRate:rate(a.touched,a.created),entryRate:rate(a.entered,a.created)},testYears:{...t,touchRate:rate(t.touched,t.created),entryRate:rate(t.entered,t.created)},
   baseFvgs:config.family==='H10_IFVG'?baseFvgs:null,inversionRate:config.family==='H10_IFVG'?rate(a.created,baseFvgs):null};
 });
 // 6) H08 e H11: o retorno depois de varrer e retomar difere do retorno depois de qualquer nova mínima (máxima) de N velas?
 const horizons=[12,24] as const;
 const eventStudy=ICT_GRID.filter(c=>c.family==='H08_LIQUIDITY_SWEEP'||c.family==='H11_INTERNAL_RANGE_LIQUIDITY').map(config=>{
  const n=Number(config.family==='H08_LIQUIDITY_SWEEP'?config.params.L:config.params.N);
  const bucket=()=>({sweep:{12:[] as number[],24:[] as number[]},any:{12:[] as number[],24:[] as number[]}});
  const all=bucket(),test=bucket();
  for(const coin of coins){
   const add=(which:'sweep'|'any',i:number,side:1|-1)=>{for(const h of horizons){const r=forwardReturn(coin.candles,i,h,side);if(r===null)continue;all[which][h].push(r);if(coin.candles[i].timestamp>=testStart)test[which][h].push(r);}};
   for(const e of runIct(coin.candles,config).events)if(e.resumedAt!==null)add('sweep',e.resumedAt,e.side);
   for(const e of newExtremes(coin.candles,n))add('any',e.index,e.side);
  }
  const fmt=(b:ReturnType<typeof bucket>)=>({sweep:{h12:stat(b.sweep[12]),h24:stat(b.sweep[24])},anyNewExtreme:{h12:stat(b.any[12]),h24:stat(b.any[24])}});
  return {id:config.id,n,allPeriod:fmt(all),testYears:fmt(test)};
 });
 // 7) Referência: cesta comprada com a mesma exposição (10%).
 const basket=P.testYears.map(y=>{const from=yearStart(y),to=Math.min(yearStart(y+1),testEnd);return coins.reduce((s,c)=>{const a=c.candles.filter(x=>x.timestamp<from).at(-1)!,b=c.candles.filter(x=>x.timestamp<to).at(-1)!;return s+(b.close/a.close-1)/coins.length;},0);});
 const baselines={flat:0,basketSameExposure:basket.reduce((e,r)=>e*(1+0.1*r),1)-1,basketByYear:Object.fromEntries(P.testYears.map((y,k)=>[y,basket[k]]))};
 const candidates=report.filter(r=>r.verdict==='CANDIDATA').map(r=>r.family);
 const out={protocol:IP,smoke,trials:ICT_TRIALS,trialSharpeCount:trialSharpes.length,trialSharpeVariance:variance,provenance:scriptProvenance('scripts/estudos/hipoteses-video.ts'),execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  data:coins.map(c=>({symbol:c.symbol,candles:c.candles.length,filled:c.filled,fundings:c.funding.length,fundingMarkFilled:c.fundingMarkFilled})),families:report,touchRates:touch,eventStudy,baselines,
  combinations:candidates.length?{status:'PENDENTE_DE_PROTOCOLO_PROPRIO',components:candidates}:{status:'NAO_EXECUTADAS',reason:'nenhuma família foi classificada como CANDIDATA (regra do protocolo: combinar só o que se sustenta sozinho)'}};
 const stamp=new Date().toISOString().slice(0,10),outBase=`${smoke?(process.env.VIDEO_OUT_DIR??'.'):'docs/estudos'}/hipoteses-ict-${stamp}`;
 writeFileSync(outBase+'.json',JSON.stringify(out,null,1));writeFileSync(outBase+'.md',markdownIct(out));
 console.log('referência: cesta com 10% de exposição',(baselines.basketSameExposure*100).toFixed(2)+'%','| combinações:',out.combinations.status,'| saída:',outBase);
}
function markdownIct(r:any){
 const years=r.protocol.testYears as number[],L:string[]=[`# Hipóteses ICT · ${r.protocol.version}${r.smoke?' (TESTE DE FUMAÇA: dados sintéticos, não vale como resultado)':''}`,'',
  `Executado em ${r.runAt}, fora do servidor, com dados públicos da Binance USD-M (15 moedas, 1h, 2022-01-01 a 2026-10-05). Protocolo: \`docs/PROTOCOLO_HIPOTESES_ICT.md\` com as Emendas 1 a 3, registrado antes da execução. Commit: \`${r.provenance.codeCommit}\` (árvore ${r.provenance.workingTreeClean?'limpa':'com alterações'}).`,'',
  `Walk-forward por ano (2024, 2025, 2026 até 05/10), com treino ancorado desde 2022. ${r.trials} tentativas no Sharpe deflacionado (variância dos Sharpe de treino de ${r.trialSharpeCount} tentativas: ${num(r.trialSharpeVariance,4)}). Placebo: ${r.families[0].placebo.seeds} sementes. Nenhuma hipótese é estratégia validada; o melhor veredito possível é "candidata a validação adicional".`,'',
  '| Família | Veredito | Retorno fora da amostra | Placebo p90 | Placebo mediana | Placebos abaixo do real | Custos dobrados | '+years.join(' / ')+' | Queda máx. | Sharpe | Sharpe deflacionado | Moedas positivas | Configs estáveis | Operações | Acerto | Expectativa (USDT) | Fator de lucro |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...r.families.map((f:any)=>`| ${f.family} | **${f.verdict}** | ${pct(f.oosReturn)} | ${pct(f.placebo.p90)} | ${pct(f.placebo.median)} | ${pct(f.placebo.realBeatsShare)} | ${pct(f.oosReturnStressed)} | ${years.map(y=>pct(f.years[y])).join(' / ')} | ${pct(f.maxDrawdown)} | ${num(f.sharpeAnnualized)} | ${num(f.deflatedSharpe)} | ${pct(f.coinBreadth)} | ${pct(f.stableShare)} | ${f.trades} | ${pct(f.winRate)} | ${num(f.expectancy)} | ${num(f.profitFactor)} |`),'',
  `Referência: cesta das 15 moedas comprada com a mesma exposição (10%): ${pct(r.baselines.basketSameExposure)}; ficar de fora: 0%.`,'',
  '## Critérios por família','','| Família | '+Object.keys(r.families[0].checks).join(' | ')+' |','|---|'+Object.keys(r.families[0].checks).map(()=>'---').join('|')+'|',
  ...r.families.map((f:any)=>`| ${f.family} | ${Object.values(f.checks).map(v=>v?'passa':'falha').join(' | ')} |`),'',
  '## Configuração escolhida em cada ano (pelo treino)','',...r.families.map((f:any)=>`- ${f.family}: ${Object.entries(f.selected).map(([y,id])=>`${y} → ${id}`).join('; ')}`),'',
  '## Placebo e divisão por lado','','| Família | Operações reais (entradas por moeda e ano) | Operações perdidas no placebo (média / máx.) | Compra: n, P&L (USDT), acerto | Venda: n, P&L (USDT), acerto |','|---|---|---|---|---|',
  ...r.families.map((f:any)=>`| ${f.family} | ${f.placebo.realEntries} | ${num(f.placebo.lostEntriesMean,1)} / ${f.placebo.lostEntriesMax} | ${f.bySide.LONG.trades}, ${num(f.bySide.LONG.netPnl)}, ${pct(f.bySide.LONG.winRate)} | ${f.bySide.SHORT.trades}, ${num(f.bySide.SHORT.netPnl)}, ${pct(f.bySide.SHORT.winRate)} |`),'',
  '## Taxa de toque das zonas (H07, H09B, H10)','','| Configuração | Zonas criadas (todo o período) | Tocadas | Taxa de toque | Taxa de entrada | Zonas criadas (2024 em diante) | Taxa de toque | FVG base (H10) | Taxa de inversão (H10) |','|---|---|---|---|---|---|---|---|---|',
  ...r.touchRates.map((t:any)=>`| ${t.id} | ${t.allPeriod.created} | ${t.allPeriod.touched} | ${pct(t.allPeriod.touchRate)} | ${pct(t.allPeriod.entryRate)} | ${t.testYears.created} | ${pct(t.testYears.touchRate)} | ${t.baseFvgs??'—'} | ${pct(t.inversionRate)} |`),'',
  '## H08 e H11: retorno depois da varredura com retomada × depois de qualquer nova mínima (máxima) de N velas','',
  'Retorno médio do fechamento da vela da retomada (H08) ou da varredura (H11), com o lado aplicado (venda multiplica por −1). Período inteiro 2022 a 2026, e entre parênteses de 2024 em diante.','',
  '| Configuração | N | Varredura 12 h | Varredura 24 h | Qualquer nova extrema 12 h | Qualquer nova extrema 24 h |','|---|---|---|---|---|---|',
  ...r.eventStudy.map((e:any)=>{const c=(a:any,b:any)=>`${pct(a.mean)} (n=${a.n}) [${pct(b.mean)}, n=${b.n}]`;return `| ${e.id} | ${e.n} | ${c(e.allPeriod.sweep.h12,e.testYears.sweep.h12)} | ${c(e.allPeriod.sweep.h24,e.testYears.sweep.h24)} | ${c(e.allPeriod.anyNewExtreme.h12,e.testYears.anyNewExtreme.h12)} | ${c(e.allPeriod.anyNewExtreme.h24,e.testYears.anyNewExtreme.h24)} |`;}),'',
  '## Combinações','',r.combinations.status==='NAO_EXECUTADAS'?`Não executadas: ${r.combinations.reason}.`:`Componentes candidatos: ${r.combinations.components.join(', ')}. As combinações exigem protocolo próprio, declarado antes de rodar.`,'',
  'Dados: '+r.data.map((d:any)=>`${d.symbol} ${d.filled} h preenchidas`).join(', ')+'.',''];
 return L.join('\n');
}
if(ICT)mainIct();else main();
