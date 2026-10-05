import type {MemoryRecord,MemoryStore} from '../domain/memory.js';
import type {Candle} from '../domain/backtest.js';

/**
 * Previsões verificáveis da equipe (ver docs/MEMORIA_DA_EQUIPE.md). V1 (05/10/2026): cada observação do briefing
 * vira uma previsão para as próximas 24 h. V2 (05/10/2026): além disso, uma vez por dia (candle das 00:00 UTC), a
 * mesma observação vira uma previsão para 7 dias. Quando o prazo passa, o resultado real (candles fechados) é
 * gravado como avaliação. As previsões são só medição: não mudam nenhuma decisão.
 */
export const PREDICTION_POLICY=Object.freeze({version:'TEAM_PREDICTIONS_V2',horizonHours:24,weeklyHorizonHours:168,weeklyAtUtcHour:0,rangeThreshold:0.01,crowdedFunding:0.0001,lessonEvery:10});
const horizonOf=(p:{horizonHours?:unknown})=>typeof p.horizonHours==='number'?p.horizonHours:PREDICTION_POLICY.horizonHours;
const horizonText=(h:number)=>h===168?'7 dias':h+' h';
export type Expectation='UP'|'DOWN'|'RANGE'|'VOL_HIGH'|'VOL_NORMAL';
export interface Prediction {agentId:'satoshi'|'vega'|'flux'|'oracle';metric:string;expectation:Expectation;basis:string;refClose:number;candleTimestamp:number;horizonEnd:number;horizonHours?:number;decisionEventId:string}
type Observations={satoshi:{change24h:number|null};vega:{dailyVolatility7d:number|null;volatilityExpanding:boolean|null};flux:{fundingRate:number|null};oracle:{regime:string}};
const HOUR=3600000;

/** Regras pré-declaradas: o que cada pesquisador "espera" a partir da própria observação. */
export function predictionsFrom(o:Observations,closes:Candle[],decisionEventId:string,horizonHours:number=PREDICTION_POLICY.horizonHours):Prediction[]{
 const last=closes.at(-1);if(!last)return [];
 const base={refClose:last.close,candleTimestamp:last.timestamp,horizonEnd:last.timestamp+horizonHours*HOUR,horizonHours,decisionEventId};
 const out:Prediction[]=[];
 // Satoshi: momentum de 24 h continua na mesma direção.
 if(Number.isFinite(o.satoshi.change24h)&&o.satoshi.change24h!==0)out.push({...base,agentId:'satoshi',metric:'momentum_24h',expectation:o.satoshi.change24h!>0?'UP':'DOWN',basis:'continuação do momentum de 24 h'});
 // Oracle: o regime indica a direção (ou movimento pequeno, se lateral).
 if(o.oracle.regime==='TRENDING_UP'||o.oracle.regime==='TRENDING_DOWN'||o.oracle.regime==='RANGE')out.push({...base,agentId:'oracle',metric:'regime_240h',expectation:o.oracle.regime==='TRENDING_UP'?'UP':o.oracle.regime==='TRENDING_DOWN'?'DOWN':'RANGE',basis:'regime em relação à média de 240 h'});
 // Vega: volatilidade em expansão continua alta; sem expansão, continua normal.
 if(typeof o.vega.volatilityExpanding==='boolean'&&Number.isFinite(o.vega.dailyVolatility7d))out.push({...base,agentId:'vega',metric:'volatility_24h',expectation:o.vega.volatilityExpanding?'VOL_HIGH':'VOL_NORMAL',basis:'volatilidade de 24 h contra a de 7 dias'});
 // Flux: funding alto (comprados lotados) tende a correção; funding negativo, a alta.
 const f=o.flux.fundingRate;if(Number.isFinite(f)&&(f!>=PREDICTION_POLICY.crowdedFunding||f!<0))out.push({...base,agentId:'flux',metric:'funding',expectation:f!>=PREDICTION_POLICY.crowdedFunding?'DOWN':'UP',basis:'funding como sinal contrário'});
 return out;
}
function dailyVolatility(closes:number[]){const r=closes.slice(1).map((c,i)=>Math.log(c/closes[i]));const m=r.reduce((s,x)=>s+x,0)/r.length;return Math.sqrt(r.reduce((s,x)=>s+(x-m)**2,0)/r.length)*Math.sqrt(24);}
/** Confere uma previsão com os candles fechados. Devolve null se ainda não há dados até o fim do prazo. */
export function settle(p:Prediction&{vol7d?:number},candles:Candle[]){
 const window=candles.filter(c=>c.timestamp>p.candleTimestamp&&c.timestamp<=p.horizonEnd);
 if(window.length<horizonOf(p)||window.at(-1)!.timestamp!==p.horizonEnd)return null;
 const ret=window.at(-1)!.close/p.refClose-1;
 let hit:boolean;
 if(p.expectation==='UP')hit=ret>0;else if(p.expectation==='DOWN')hit=ret<0;else if(p.expectation==='RANGE')hit=Math.abs(ret)<PREDICTION_POLICY.rangeThreshold;
 else{const vol=dailyVolatility([p.refClose,...window.map(c=>c.close)]),ref=p.vol7d??NaN;if(!Number.isFinite(ref))return null;/* regra simétrica: referência justa de 50% */hit=p.expectation==='VOL_HIGH'?vol>ref:vol<=ref;}
 return {hit,realizedReturn:ret};
}
const words:Record<Expectation,string>={UP:'alta',DOWN:'queda',RANGE:'movimento pequeno (< 1%)',VOL_HIGH:'volatilidade alta',VOL_NORMAL:'volatilidade normal'};
/** Grava as previsões do briefing e confere as que venceram. Nunca lança: falha aqui não afeta o piloto. */
export class TeamPredictions {
 constructor(private memories:MemoryStore){}
 record(o:Observations,candles:Candle[],decisionEventId:string){
  const last=candles.at(-1),daily=!!last&&new Date(last.timestamp).getUTCHours()===PREDICTION_POLICY.weeklyAtUtcHour;
  const all=[...predictionsFrom(o,candles,decisionEventId),...(daily?predictionsFrom(o,candles,decisionEventId,PREDICTION_POLICY.weeklyHorizonHours):[])];
  for(const p of all)this.memories.add({agentId:p.agentId,kind:'PREDICTION',summary:'prevejo '+words[p.expectation]+(horizonOf(p)===168?' nos próximos 7 dias':' nas próximas 24 h')+' ('+p.basis+')',sourceEventId:decisionEventId,tags:['previsao',p.metric,...(horizonOf(p)===168?['7d']:[])],metadata:{policy:PREDICTION_POLICY.version,...p,...(p.agentId==='vega'?{vol7d:o.vega.dailyVolatility7d}:{})}});
 }
 /** Taxa de acerto de cada pesquisador nas avaliações já conferidas. */
 hitRates(){return Object.fromEntries(scorecard(this.memories.query()).map(s=>[s.agentId,{hitRate:s.hitRate,settled:s.settled}]));}
 /** Previsões ainda sem avaliação. */
 pending(){const settled=new Set(this.memories.query({kind:'EVALUATION'}).map(m=>m.metadata?.predictionId));return this.memories.query({kind:'PREDICTION'}).filter(m=>!settled.has(m.id));}
 settleDue(candles:Candle[]){
  for(const m of this.pending()){
   const p=m.metadata as unknown as Prediction&{vol7d?:number};if(!p||!Number.isFinite(p.horizonEnd))continue;
   const r=settle(p,candles);if(!r)continue;
   this.memories.add({agentId:m.agentId,kind:'EVALUATION',summary:(r.hit?'acertei':'errei')+': previ '+words[p.expectation]+'; o BTC variou '+(r.realizedReturn*100).toFixed(2).replace('.',',')+'% em '+horizonText(horizonOf(p)),sourceEventId:m.sourceEventId,tags:['avaliacao',p.metric,...(horizonOf(p)===168?['7d']:[])],confidence:r.hit?1:0,metadata:{policy:PREDICTION_POLICY.version,predictionId:m.id,hit:r.hit,realizedReturn:r.realizedReturn,expectation:p.expectation,horizonEnd:p.horizonEnd,horizonHours:horizonOf(p)}});
   this.maybeLesson(m.agentId,horizonOf(p));
  }
 }
 /** Reflexão a cada 10 avaliações do mesmo prazo: uma lição com a taxa de acerto recente (sem IA, só contagem). */
 private maybeLesson(agentId:string,horizon:number){
  const evaluations=this.memories.query({agentId,kind:'EVALUATION'}).filter(e=>horizonOf(e.metadata??{})===horizon);if(!evaluations.length||evaluations.length%PREDICTION_POLICY.lessonEvery!==0)return;
  const recent=evaluations.slice(-PREDICTION_POLICY.lessonEvery),hits=recent.filter(e=>e.metadata?.hit===true).length,rate=hits/recent.length;
  this.memories.add({agentId,kind:'LESSON',summary:'acertei '+hits+' de '+recent.length+' previsões recentes'+(horizon===168?' de 7 dias':'')+' ('+Math.round(rate*100)+'%)'+(rate<0.5?': meu sinal está pior que uma moeda; tratar com cautela':rate>=0.6?': meu sinal tem ajudado':': resultado neutro'),tags:['reflexao','placar'],confidence:rate,metadata:{policy:PREDICTION_POLICY.version,hits,total:recent.length,horizonHours:horizon}});
 }
}
/** Placar por pesquisador, a partir das avaliações gravadas. */
export function scorecard(memories:MemoryRecord[]){
 const agents=['satoshi','vega','flux','oracle'];
 return agents.map(agentId=>{
  // Placar principal: 24 h (como na V1). O de 7 dias fica separado em `weekly`.
  const of=(h:number,kind:string)=>memories.filter(m=>m.agentId===agentId&&m.kind===kind&&horizonOf(m.metadata??{})===h);
  const ev=of(PREDICTION_POLICY.horizonHours,'EVALUATION'),hits=ev.filter(m=>m.metadata?.hit===true).length;
  const pending=of(PREDICTION_POLICY.horizonHours,'PREDICTION').length-ev.length;
  const wev=of(PREDICTION_POLICY.weeklyHorizonHours,'EVALUATION'),whits=wev.filter(m=>m.metadata?.hit===true).length,wpending=of(PREDICTION_POLICY.weeklyHorizonHours,'PREDICTION').length-wev.length;
  return {agentId,settled:ev.length,hits,hitRate:ev.length?hits/ev.length:null,pending:Math.max(0,pending),last:ev.slice(-10).map(m=>({at:m.createdAt,hit:m.metadata?.hit===true,summary:m.summary})),
   weekly:{settled:wev.length,hits:whits,hitRate:wev.length?whits/wev.length:null,pending:Math.max(0,wpending)}};
 });
}
/**
 * Memórias em destaque (inspirado em Generative Agents): recência (meia-vida de 72 h) + importância por tipo
 * + relevância por etiqueta. Só ordena o que já existe; nada é criado ou alterado.
 */
export function rankMemories(memories:MemoryRecord[],now:number,tag?:string,limit=5){
 const importance:Record<string,number>={LESSON:1,FAILURE:0.8,EVALUATION:0.6,DECISION:0.5,PREDICTION:0.3,OBSERVATION:0.2};
 return [...memories].map(m=>{const age=Math.max(0,now-Date.parse(m.createdAt))/HOUR;const recency=Math.pow(0.5,age/72);const relevance=tag&&m.tags?.includes(tag)?1:0;
  const miss=m.kind==='EVALUATION'&&m.metadata?.hit===false?0.2:0;return {memory:m,score:0.5*recency+0.3*Math.min(1,(importance[m.kind]??0.2)+miss)+0.2*relevance};})
  .sort((a,b)=>b.score-a.score).slice(0,limit);
}
