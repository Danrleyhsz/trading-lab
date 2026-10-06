// Avalia o KRONOS_AB_V1: base x braços Kronos na mesma janela, mesmos custos e mesmo simulador; grava o comparativo.
// Uso (na raiz do repositório), depois de prepare.ts e forecast.py: npx tsx experiments/kronos/scripts/evaluate.ts
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import type {PerpetualConfig,PerpetualDataset} from '../../../src/domain/perpetual-backtest.js';
import {HOUR,dailyGridOrigins,entryFilter,forecastQuality,runArm,sha256,tradingMetrics,type ForecastRecord,type TradingMetrics} from '../lib.js';

const cfg=JSON.parse(readFileSync('experiments/kronos/configs/kronos_ab_v1.json','utf8'));
const from=Date.parse(cfg.window.firstEntryBar),last=Date.parse(cfg.window.lastBar),quarters=cfg.window.quarters.map((q:string)=>Date.parse(q));
const raw=readFileSync('experiments/kronos/data/btc-1h.json','utf8'),hourly=JSON.parse(raw),base:PerpetualConfig=cfg.baseline.config,stressed:PerpetualConfig={...base,...cfg.baseline.stressedCosts};
const warm=from-base.slowPeriod*HOUR,trade=hourly.candles.filter((c:{timestamp:number})=>c.timestamp>=warm&&c.timestamp<=last);
// Mesma convenção dos estudos longos: a série de mark repete a de negócios.
const data:PerpetualDataset={instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:hourly.funding.filter((f:{timestamp:number})=>f.timestamp>=warm&&f.timestamp<last+HOUR)};
const close=new Map<number,number>(hourly.candles.map((c:{timestamp:number;close:number})=>[c.timestamp,c.close]));

const baseline=runArm(data,base),baselineStressed=runArm(data,stressed);
// Controle: com o filtro sempre permitindo, o resultado tem de ser idêntico ao da base.
const control=runArm(data,base,()=>true);
if(JSON.stringify(control.audit)!==JSON.stringify(baseline.audit)||control.netPnl!==baseline.netPnl)throw new Error('Kronos-disabled control does not reproduce the baseline');
const A={metrics:tradingMetrics(baseline,base,quarters,from),stressed:tradingMetrics(baselineStressed,stressed,quarters,from)};

type Arm={arm:string;timeframe:'1h'|'4h';status:string;forecasts?:number;rejected?:number;metrics?:TradingMetrics;stressed?:TradingMetrics;delta?:Record<string,number|null>;quality?:ReturnType<typeof forecastQuality>;
 entryDecisions?:{considered:number;allowed:number;vetoed:number};compute?:{meanSeconds:number;totalSeconds:number;peakMemoryMb:number};provenance?:Record<string,unknown>;incrementalValue?:boolean;checks?:Record<string,boolean>};
const declaredOrigins=JSON.parse(readFileSync('experiments/kronos/data/origins.json','utf8')) as Record<'1h'|'4h',number[]>;
const expectedOrigins={'1h':declaredOrigins['1h'].length,'4h':declaredOrigins['4h'].length};
const arms:Arm[]=[];
// B1 é só sensibilidade (1 caminho, como o braço C): aparece nas tabelas, mas não entra no critério de decisão.
for(const arm of ['B','C','B1'])for(const timeframe of ['1h','4h'] as const){
 const file=`experiments/kronos/results/forecasts-${arm}-${timeframe}.jsonl`;
 if(!existsSync(file)){arms.push({arm,timeframe,status:cfg.arms[arm].status??'SEM PREVISÕES'});continue;}
 const records:ForecastRecord[]=readFileSync(file,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
 // Só avalia um braço com todas as origens declaradas; arquivo parcial (cálculo em andamento) nunca vira resultado.
 if(records.length<expectedOrigins[timeframe]){arms.push({arm,timeframe,status:`INCOMPLETO (${records.length}/${expectedOrigins[timeframe]} previsões)`});continue;}
 const map=new Map(records.map(r=>[r.origin,r])),log:Parameters<typeof entryFilter>[2]=[],logStressed:Parameters<typeof entryFilter>[2]=[];
 const run=runArm(data,base,entryFilter(timeframe,map,log)),runStressed=runArm(data,stressed,entryFilter(timeframe,map,logStressed));
 const metrics=tradingMetrics(run,base,quarters,from),stressedMetrics=tradingMetrics(runStressed,stressed,quarters,from);
 // Qualidade da previsão na grade diária (alvo lido só aqui, depois de todas as previsões gravadas).
 const rows=dailyGridOrigins(timeframe,from,last).map(o=>{const r=map.get(o);const end=o+(timeframe==='1h'?HOUR:4*HOUR);const lastClose=close.get(end-HOUR)!,target=close.get(end+23*HOUR),before=close.get(end-HOUR-24*HOUR);
  return r&&!r.error&&target!==undefined&&before!==undefined?{predicted:r.predictedReturn,realized:target/lastClose-1,persistence:lastClose/before-1}:null;}).filter(Boolean) as {predicted:number;realized:number;persistence:number}[];
 const ok=records.filter(r=>!r.error),seconds=ok.map(r=>r.seconds);
 const quality=forecastQuality(rows),beatsQuarters=metrics.quarters.filter((q,k)=>q>A.metrics.quarters[k]).length;
 const checks={HIGHER_NET_PNL:metrics.netPnl>A.metrics.netPnl,HIGHER_IN_3_OF_4_QUARTERS:beatsQuarters>=3,HIGHER_WITH_DOUBLED_COSTS:stressedMetrics.netPnl>A.stressed.netPnl,DIRECTION_ABOVE_CHANCE:quality.directionalAccuracy>0.5&&quality.binomialPValue<0.05};
 const first=records[0] as unknown as Record<string,unknown>;
 arms.push({arm,timeframe,status:'AVALIADO',forecasts:records.length,rejected:records.length-ok.length,metrics,stressed:stressedMetrics,
  delta:{netPnl:metrics.netPnl-A.metrics.netPnl,maxDrawdown:metrics.maxDrawdown-A.metrics.maxDrawdown,sharpeAnnualized:metrics.sharpeAnnualized!==null&&A.metrics.sharpeAnnualized!==null?metrics.sharpeAnnualized-A.metrics.sharpeAnnualized:null,trades:metrics.trades-A.metrics.trades,stressedNetPnl:stressedMetrics.netPnl-A.stressed.netPnl},
  quality,entryDecisions:{considered:log.length,allowed:log.filter(l=>l.allowed).length,vetoed:log.filter(l=>!l.allowed).length},
  compute:{meanSeconds:seconds.reduce((a,b)=>a+b,0)/Math.max(1,seconds.length),totalSeconds:seconds.reduce((a,b)=>a+b,0),peakMemoryMb:Math.max(...records.map(r=>(r as unknown as {peakMemoryMb:number}).peakMemoryMb??0))},
  provenance:{model:first.model,modelRevision:first.modelRevision,tokenizer:first.tokenizer,tokenizerRevision:first.tokenizerRevision,codeCommit:first.codeCommit,datasetSha256:first.datasetSha256,sampling:first.sampling,forecastFileSha256:sha256(readFileSync(file,'utf8'))},
  checks,incrementalValue:Object.values(checks).every(Boolean)});
}
arms.push({arm:'D',timeframe:'1h',status:cfg.arms.D.status},{arm:'D',timeframe:'4h',status:cfg.arms.D.status});
const evaluated=arms.filter(a=>a.metrics);
const rank=(key:(a:Arm)=>number,desc=true)=>[{name:'A',value:key({arm:'A',timeframe:'1h',status:'',metrics:A.metrics} as Arm)},...evaluated.map(a=>({name:a.arm+'-'+a.timeframe,value:key(a)}))].sort((x,y)=>desc?y.value-x.value:x.value-y.value).map(x=>x.name);
const report={version:cfg.version,runAt:new Date().toISOString(),scope:cfg.scope,window:cfg.window,datasetSha256:sha256(raw),baselineConfig:base,stressedCosts:cfg.baseline.stressedCosts,
 controlReproducesBaseline:true,A,arms,
 rankings:{riskAdjusted:rank(a=>a.metrics!.sharpeAnnualized??-Infinity),drawdown:rank(a=>a.metrics!.maxDrawdown,false),robustnessQuartersPositive:rank(a=>a.metrics!.quarters.filter(q=>q>0).length),computeCost:['A',...evaluated.sort((x,y)=>x.compute!.totalSeconds-y.compute!.totalSeconds).map(a=>a.arm+'-'+a.timeframe)]},
 decision:evaluated.some(a=>a.incrementalValue&&!cfg.arms[a.arm].sensitivityOnly)?'CONTINUAR PESQUISA COM O(S) BRAÇO(S) QUE PASSARAM':'MANTER SÓ A BASE (sem evidência de valor incremental)'};
writeFileSync('experiments/kronos/results/comparison-v1.json',JSON.stringify(report,null,1));
writeFileSync('experiments/kronos/results/RELATORIO_KRONOS_AB_V1.md',markdown(report));
console.log('base',A.metrics.netPnl.toFixed(2),'trades',A.metrics.trades);for(const a of evaluated)console.log(a.arm,a.timeframe,'P&L',a.metrics!.netPnl.toFixed(2),'delta',a.delta!.netPnl!.toFixed(2),'acerto',(a.quality!.directionalAccuracy*100).toFixed(1)+'%','p',a.quality!.binomialPValue.toFixed(3),'vetos',a.entryDecisions!.vetoed+'/'+a.entryDecisions!.considered,a.incrementalValue?'VALOR':'sem valor');
console.log('decisão:',report.decision);

function markdown(r:any){
 const n=(v:number|null|undefined,d=2)=>v===null||v===undefined||!Number.isFinite(v)?'—':v.toFixed(d),p=(v:number|null|undefined)=>v===null||v===undefined?'—':(v*100).toFixed(1)+'%';
 const row=(name:string,m:TradingMetrics,s:TradingMetrics)=>`| ${name} | ${n(m.netPnl)} | ${n(m.grossPnl)} | ${p(m.maxDrawdown)} | ${n(m.sharpeAnnualized)} | ${n(m.profitFactor)} | ${p(m.winRate)} | ${m.trades} | ${n(m.turnover,1)} | ${n(s.netPnl)} | ${m.quarters.map(q=>n(q,0)).join(' / ')} |`;
 const L=[`# Relatório KRONOS_AB_V1 (BTC, etapa 1)`,'',`Executado em ${r.runAt}. Só pesquisa histórica offline. Janela de avaliação: ${r.window.firstEntryBar} a ${r.window.lastBar}, posterior a todos os pesos usados. Protocolo: \`experiments/kronos/PROTOCOLO_KRONOS_AB_V1.md\`.`,'',
  `**Decisão pela regra declarada: ${r.decision}.**`,'',
  'O controle com o Kronos desligado reproduziu a base de forma idêntica: mesma trilha de auditoria e mesmo P&L.','',
  '## Resultado de operação (estratégia do piloto, mesma janela e mesmos custos)','',
  '| Braço | P&L líquido | P&L bruto | Queda máx. | Sharpe | Fator de lucro | Acerto | Operações | Giro (x capital) | P&L com custos dobrados | P&L por trimestre |','|---|---|---|---|---|---|---|---|---|---|---|',
  row('A · base',r.A.metrics,r.A.stressed),...r.arms.filter((a:Arm)=>a.metrics).map((a:Arm)=>row(`${a.arm} · ${a.timeframe}`,a.metrics!,a.stressed!)),'',
  '## Qualidade da previsão (grade diária, 24 h, sem sobreposição)','',
  '| Braço | Previsões | Acerto de direção | p (binomial) | Referência: persistência | Referência: sempre sobe | MAE / RMSE do retorno | MAE / RMSE da previsão zero | Spearman |','|---|---|---|---|---|---|---|---|---|',
  ...r.arms.filter((a:Arm)=>a.quality).map((a:Arm)=>{const q=a.quality!;return `| ${a.arm} · ${a.timeframe} | ${q.n} | ${p(q.directionalAccuracy)} | ${n(q.binomialPValue,3)} | ${p(q.persistenceAccuracy)} | ${p(q.alwaysUpAccuracy)} | ${n(q.maeReturn,4)} / ${n(q.rmseReturn,4)} | ${n(q.maeZeroForecast,4)} / ${n(q.rmseZeroForecast,4)} | ${n(q.spearman)} |`;}),'',
  '## Filtro de entrada, custo de cálculo e critérios','',
  '| Braço | Entradas consultadas / permitidas / vetadas | Previsões / rejeitadas | Segundos por previsão | Total (min) | Memória de pico (MB) | Critérios (P&L, 3 de 4 trimestres, custos dobrados, direção) |','|---|---|---|---|---|---|---|',
  ...r.arms.map((a:Arm)=>a.metrics?`| ${a.arm} · ${a.timeframe} | ${a.entryDecisions!.considered} / ${a.entryDecisions!.allowed} / ${a.entryDecisions!.vetoed} | ${a.forecasts} / ${a.rejected} | ${n(a.compute!.meanSeconds)} | ${n(a.compute!.totalSeconds/60,1)} | ${n(a.compute!.peakMemoryMb,0)} | ${Object.entries(a.checks!).map(([k,v])=>(v?'✅ ':'❌ ')+k).join(', ')} |`:`| ${a.arm} · ${a.timeframe} | ${a.status} | | | | | |`),'',
  '## Classificações separadas','',`- Resultado ajustado ao risco (Sharpe): ${r.rankings.riskAdjusted.join(' > ')}`,`- Menor queda: ${r.rankings.drawdown.join(' > ')}`,`- Trimestres positivos: ${r.rankings.robustnessQuartersPositive.join(' > ')}`,`- Menor custo de cálculo: ${r.rankings.computeCost.join(' > ')}`,'',
  '## Proveniência','',`- Dataset (btc-1h.json): \`${r.datasetSha256}\``,...r.arms.filter((a:Arm)=>a.provenance).map((a:Arm)=>`- ${a.arm} · ${a.timeframe}: ${a.provenance!.model}@${a.provenance!.modelRevision}, tokenizer ${a.provenance!.tokenizer}@${a.provenance!.tokenizerRevision}, código ${a.provenance!.codeCommit}, previsões \`${a.provenance!.forecastFileSha256}\``),''];
 return L.join('\n');
}
