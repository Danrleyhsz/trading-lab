// VOL_TARGET_V1: tamanho pela volatilidade sobre o sinal BREAKOUT 480 h do piloto (docs/PROTOCOLO_VOL_TARGET_V1.md).
// Só simulação histórica offline com o simulador oficial (backtestPerpetual): não emite eventos de corretora, não grava
// contas, não muda o piloto. Usa o cache do estudo de carry (scripts/estudos/out/carry-BTCUSDT.json).
// Uso: npx tsx scripts/estudos/vol-target.ts   (opcional: CARRY_CACHE_DIR=<pasta>)
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {Candle} from '../../src/domain/backtest.js';
import {backtestPerpetual,type PerpetualConfig,type PerpetualDataset,type FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import {performanceMetrics} from '../../src/domain/performance-metrics.js';
import {calibrateTarget,volSizing} from '../../src/domain/vol-target.js';
import {scriptProvenance} from './proveniencia.js';

const H=3600000,DAY=86400000;
export const P=Object.freeze({
 version:'VOL_TARGET_V1',
 data:{source:'BINANCE_USDM BTCUSDT 1h + funding (cache FUNDING_CARRY_V1)',firstBar:Date.UTC(2022,0,1),lastBar:Date.UTC(2026,9,5,23)},
 calibration:{from:Date.UTC(2022,0,1),to:Date.UTC(2023,0,1)},
 evaluation:{from:Date.UTC(2023,0,1),years:[2023,2024,2025,2026]},
 base:{strategy:'BREAKOUT',fastPeriod:10,slowPeriod:480,feeRate:0.00055,slippageBps:1,initialCapital:10000,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1} as PerpetualConfig,
 sizing:{base:0.1,min:0.02,max:0.199},
 primary:{lookback:720},
 sensitivity:[{lookback:168},{lookback:2160}],
 stressedCosts:{feeRate:0.0011,slippageBps:5},
 bootstrap:{blockDays:30,resamples:2000,seed:20261006,threshold:0.9},
});
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');

function load(){
 const dir=process.env.CARRY_CACHE_DIR??'scripts/estudos/out',file=dir+'/carry-BTCUSDT.json';
 if(!existsSync(file))throw Error('sem dados: rode o estudo de carry (FUNDING_CARRY_V1) para baixar '+file);
 const raw=readFileSync(file,'utf8'),d=JSON.parse(raw),byHour=new Map<number,Candle>(d.perp.map((c:Candle)=>[c.timestamp,c]));
 const candles:Candle[]=[];let filled=0,prev:Candle|undefined;
 for(let t=P.data.firstBar;t<=P.data.lastBar;t+=H){const c=byHour.get(t);if(c){candles.push(c);prev=c;}else{if(!prev)throw Error('sem vela inicial');filled++;candles.push({timestamp:t,open:prev.close,high:prev.close,low:prev.close,close:prev.close,volume:0});}}
 const open=new Map(candles.map(c=>[c.timestamp,c.open]));let fundingMarkFilled=0;
 const funding:FundingSettlement[]=d.funding.filter((f:FundingSettlement)=>f.timestamp>=P.data.firstBar&&f.timestamp<P.data.lastBar+H)
  .map((f:FundingSettlement)=>{if(f.markPrice>0)return f;fundingMarkFilled++;return {...f,markPrice:open.get(Math.floor(f.timestamp/H)*H)!};});
 return {candles,funding,filled,fundingMarkFilled,cacheSha256:sha(raw)};
}

/** Retorno diário (último ponto de equity de cada dia UTC) a partir da avaliação. */
function dailyReturns(series:{timestamp:number;equity:number}[]){
 const byDay=new Map<number,number>();for(const p of series)byDay.set(Math.floor(p.timestamp/DAY),p.equity);
 const days=[...byDay.keys()].sort((a,b)=>a-b),out:{day:number;r:number}[]=[];
 for(let k=1;k<days.length;k++)out.push({day:days[k],r:byDay.get(days[k])!/byDay.get(days[k-1])!-1});
 return out;
}
const sharpeOf=(r:number[])=>{const m=r.reduce((s,x)=>s+x,0)/r.length,sd=Math.sqrt(r.reduce((s,x)=>s+(x-m)**2,0)/(r.length-1));return sd>0?m/sd*Math.sqrt(365):0;};
function mulberry(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/** Bootstrap em blocos pareado (mesmos dias para A e B): fração de reamostragens com Sharpe(B) − Sharpe(A) > 0. */
export function pairedBlockBootstrap(a:number[],b:number[],block:number,resamples:number,seed:number){
 if(a.length!==b.length||a.length<block*2)throw Error('séries incompatíveis');
 const rnd=mulberry(seed),n=a.length;let wins=0;const deltas:number[]=[];
 for(let k=0;k<resamples;k++){const ra:number[]=[],rb:number[]=[];while(ra.length<n){const s=Math.floor(rnd()*(n-block+1));for(let j=0;j<block&&ra.length<n;j++){ra.push(a[s+j]);rb.push(b[s+j]);}}
  const d=sharpeOf(rb)-sharpeOf(ra);deltas.push(d);if(d>0)wins++;}
 deltas.sort((x,y)=>x-y);return {probability:wins/resamples,p05:deltas[Math.floor(resamples*0.05)],p50:deltas[Math.floor(resamples*0.5)],p95:deltas[Math.floor(resamples*0.95)]};
}

function run(candles:Candle[],funding:FundingSettlement[],lookback:number|null,costs:{feeRate:number;slippageBps:number}){
 const warm=P.evaluation.from-P.base.slowPeriod*H;
 const trade=candles.filter(c=>c.timestamp>=warm);
 const data:PerpetualDataset={instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:funding.filter(f=>f.timestamp>=warm&&f.timestamp<P.data.lastBar+H)};
 const cfg={...P.base,...costs};
 let target:number|null=null,sizing:ReturnType<typeof volSizing>|null=null;
 if(lookback!==null){target=calibrateTarget(candles,lookback,P.calibration.from,P.calibration.to);sizing=volSizing(candles,{lookback,target,...P.sizing});}
 // O período avaliado tem ~34 000 velas: limite de dados ampliado só nesta pesquisa (o produto continua em 10 000).
 const res=backtestPerpetual(data,cfg,{maxBars:60000,...(sizing?{entrySizing:(t:number)=>sizing!(t)}:{})});
 const series=res.equitySeries.filter(p=>p.timestamp>=P.evaluation.from);
 const trades=res.tradeOutcomes.map(netPnl=>({netPnl}));
 const total=performanceMetrics(series,trades);
 const years=Object.fromEntries(P.evaluation.years.map(y=>{const pts=series.filter(p=>new Date(p.timestamp).getUTCFullYear()===y);return [y,pts.length>2?performanceMetrics(pts):null];}));
 const fr=sizing?sizing.fractions:[];
 return {lookback,target,netPnl:res.netPnl,feesPaid:res.feesPaid,fundingCashDelta:res.fundingCashDelta,liquidations:res.liquidations,trades:res.trades,
  sharpe:total.sharpe,maxDrawdown:total.maxDrawdown,calmar:total.calmar,annualizedReturn:total.annualizedReturn,annualizedVolatility:total.annualizedVolatility,
  yearSharpe:Object.fromEntries(Object.entries(years).map(([y,m])=>[y,m?.sharpe??null])),
  yearReturn:Object.fromEntries(Object.entries(years).map(([y,m])=>[y,m?.totalReturn??null])),
  fractions:fr.length?{entries:fr.length,mean:fr.reduce((s,x)=>s+x,0)/fr.length,min:Math.min(...fr),max:Math.max(...fr),atCap:fr.filter(x=>x>=P.sizing.max).length,atFloor:fr.filter(x=>x<=P.sizing.min).length}:null,
  daily:dailyReturns(series)};
}

if(process.argv[1]?.replace(/\\/g,'/').endsWith('scripts/estudos/vol-target.ts')){
 const {candles,funding,filled,fundingMarkFilled,cacheSha256}=load();
 const baseCosts={feeRate:P.base.feeRate,slippageBps:P.base.slippageBps};
 const A=run(candles,funding,null,baseCosts),B=run(candles,funding,P.primary.lookback,baseCosts);
 const As=run(candles,funding,null,P.stressedCosts),Bs=run(candles,funding,P.primary.lookback,P.stressedCosts);
 const sens=P.sensitivity.map(s=>run(candles,funding,s.lookback,baseCosts));
 const days=A.daily.map(d=>d.day);if(B.daily.length!==days.length||B.daily.some((d,k)=>d.day!==days[k]))throw Error('dias diferentes entre A e B');
 const boot=pairedBlockBootstrap(A.daily.map(d=>d.r),B.daily.map(d=>d.r),P.bootstrap.blockDays,P.bootstrap.resamples,P.bootstrap.seed);
 const yearsBetter=P.evaluation.years.filter(y=>(B.yearSharpe[y]??-Infinity)>(A.yearSharpe[y]??Infinity)).length;
 const criteria=[
  {id:'HIGHER_SHARPE',passed:(B.sharpe??-Infinity)>(A.sharpe??Infinity)},
  {id:'DRAWDOWN_NOT_WORSE',passed:B.maxDrawdown!==null&&A.maxDrawdown!==null&&B.maxDrawdown<=A.maxDrawdown},
  {id:'HIGHER_SHARPE_3_OF_4_YEARS',passed:yearsBetter>=3,detail:yearsBetter+' de 4'},
  {id:'HIGHER_SHARPE_DOUBLED_COSTS',passed:(Bs.sharpe??-Infinity)>(As.sharpe??Infinity)},
  {id:'BOOTSTRAP_P_GE_0_90',passed:boot.probability>=P.bootstrap.threshold,detail:boot.probability.toFixed(3)},
 ];
 const fragile=sens.some(s=>!((s.sharpe??-Infinity)>(A.sharpe??Infinity)));
 const decision=criteria.every(c=>c.passed)?(fragile?'APROVADO COM RESSALVA (sensibilidade inverte o sinal)':'APROVADO COMO CANDIDATO'):'REPROVADO';
 const strip=(r:ReturnType<typeof run>)=>{const {daily:_d,...rest}=r;return rest;};
 const out={protocol:P,provenance:scriptProvenance('scripts/estudos/vol-target.ts'),execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  data:{cacheSha256,bars:candles.length,filledHours:filled,fundingMarkFilled,evaluationDays:days.length},trials:1+P.sensitivity.length,
  arms:{A:strip(A),B:strip(B),A_stressed:strip(As),B_stressed:strip(Bs),sensitivity:sens.map(strip)},bootstrap:boot,criteria,decision};
 const base='docs/estudos/vol-target-2026-10-06';writeFileSync(base+'.json',JSON.stringify(out,null,1));writeFileSync(base+'.md',markdown(out));
 console.log(decision,JSON.stringify(criteria));
}

function markdown(o:any){
 const pct=(v:number|null)=>v===null||v===undefined||!Number.isFinite(v)?'n/d':(v*100).toFixed(2)+'%';const n2=(v:number|null)=>v===null||!Number.isFinite(v)?'n/d':v.toFixed(2);
 const row=(name:string,r:any)=>`| ${name} | ${n2(r.netPnl)} | ${n2(r.sharpe)} | ${pct(r.maxDrawdown)} | ${n2(r.calmar)} | ${r.trades} | ${o.protocol.evaluation.years.map((y:number)=>n2(r.yearSharpe[y])).join(' / ')} | ${r.fractions?r.fractions.mean.toFixed(3)+' ('+r.fractions.min.toFixed(3)+'–'+r.fractions.max.toFixed(3)+')':'0,100 fixo'} |`;
 return `# Resultado VOL_TARGET_V1: tamanho pela volatilidade sobre o BREAKOUT 480 h

Executado em ${o.runAt}. Só simulação histórica offline. Protocolo: \`docs/PROTOCOLO_VOL_TARGET_V1.md\`. Commit ${o.provenance.codeCommit} (árvore ${o.provenance.workingTreeClean?'limpa':'com alterações: '+o.provenance.uncommittedFiles.join(', ')}).

**Decisão pela regra declarada: ${o.decision}.**

Avaliação de ${new Date(o.protocol.evaluation.from).toISOString().slice(0,10)} a ${new Date(o.protocol.data.lastBar).toISOString().slice(0,10)} (${o.data.evaluationDays} dias). Alvo de volatilidade calibrado só em 2022. Dados: ${o.data.bars} velas, ${o.data.filledHours} horas preenchidas, ${o.data.fundingMarkFilled} registros de funding sem preço preenchidos pela abertura da hora; cache sha256 \`${o.data.cacheSha256}\`.

| Braço | P&L líquido | Sharpe | Queda máx. | Calmar | Operações | Sharpe por ano (2023 / 2024 / 2025 / 2026) | Fração média (mín–máx) |
|---|---|---|---|---|---|---|---|
${row('A · fração fixa 0,10',o.arms.A)}
${row('B · alvo de vol., 720 h',o.arms.B)}
${row('A · custos dobrados',o.arms.A_stressed)}
${row('B · custos dobrados',o.arms.B_stressed)}
${o.arms.sensitivity.map((s:any)=>row('sensibilidade · '+s.lookback+' h',s)).join('\n')}

Bootstrap em blocos de ${o.protocol.bootstrap.blockDays} dias (${o.protocol.bootstrap.resamples} reamostragens, semente ${o.protocol.bootstrap.seed}): P(Sharpe B > Sharpe A) = ${o.bootstrap.probability.toFixed(3)}; diferença de Sharpe p5 ${n2(o.bootstrap.p05)}, mediana ${n2(o.bootstrap.p50)}, p95 ${n2(o.bootstrap.p95)}.

## Critérios (todos precisam passar)

${o.criteria.map((c:any)=>`- ${c.passed?'✅':'❌'} ${c.id}${c.detail?' ('+c.detail+')':''}`).join('\n')}

Tentativas contadas: ${o.trials} (primária + ${o.protocol.sensitivity.length} de sensibilidade). Nada aqui é recomendação de investimento: é pesquisa histórica com custos modelados.
`;
}
