import type {AgentMessageBus} from '../domain/agent-messages.js';
import type {PerpetualConfig,PerpetualDataset} from '../domain/perpetual-backtest.js';
import type {PerpetualQuote} from '../domain/perpetual-market.js';

/** Context each pilot decision carries to the team. */
export interface PilotDecisionContext {data:PerpetualDataset;quote:PerpetualQuote|null;direction:number;currentQuantity:number;configuration:PerpetualConfig;studyId:string;candleTimestamp:number;decisionEventId:string}
const round=(value:number,digits=6)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
const change=(closes:number[],bars:number)=>closes.length>bars?closes.at(-1)!/closes.at(-1-bars)!-1:NaN;
function dailyVolatility(closes:number[],bars:number){
 if(closes.length<=bars)return NaN;const returns=closes.slice(-bars-1).slice(1).map((c,i)=>Math.log(c/closes.slice(-bars-1)[i]));
 const mean=returns.reduce((s,r)=>s+r,0)/returns.length;return Math.sqrt(returns.reduce((s,r)=>s+(r-mean)**2,0)/returns.length)*Math.sqrt(24);
}
/** Deterministic, descriptive observations computed from the same closed candles and live quote the decision used. */
export function teamObservations(context:PilotDecisionContext){
 const closes=context.data.trade.map(c=>c.close),last=closes.at(-1)!;
 const sma240=closes.length>=240?closes.slice(-240).reduce((s,c)=>s+c,0)/240:NaN;
 const vol24=dailyVolatility(closes,24),vol168=dailyVolatility(closes,168);
 const regime=!Number.isFinite(sma240)?'UNKNOWN':last>sma240*1.02?'TRENDING_UP':last<sma240*0.98?'TRENDING_DOWN':'RANGE';
 const q=context.quote,mid=q?(q.bid+q.ask)/2:NaN;
 return {
  satoshi:{change24h:round(change(closes,24)),change7d:round(change(closes,168))},
  vega:{dailyVolatility24h:round(vol24),dailyVolatility7d:round(vol168),volatilityExpanding:Number.isFinite(vol24)&&Number.isFinite(vol168)?vol24>vol168*1.5:null},
  flux:{fundingRate:q?round(q.fundingRate,8):null,spreadBps:q?round((q.ask-q.bid)/mid*10000,3):null,lastSettledFundingRate:round(context.data.funding.at(-1)?.rate??NaN,8)},
  oracle:{regime,distanceToSma240:round(Number.isFinite(sma240)?last/sma240-1:NaN)},
 };
}
const pct=(value:number|null)=>value===null?'n/a':(value*100).toFixed(2)+'%';
/**
 * Publishes the team's view of each pilot decision as structured agent messages. Researcher observations are
 * ADVISORY context only: the decision comes exclusively from the screened study's signal and the risk engine.
 */
export class PilotTeamBriefing {
 constructor(private messages:AgentMessageBus){}
 brief(context:PilotDecisionContext){
  const o=teamObservations(context),base={studyId:context.studyId,candleTimestamp:context.candleTimestamp,decisionEventId:context.decisionEventId,advisoryOnly:true};
  const to:Parameters<AgentMessageBus['send']>[0]['to']=['nova','sentinel','atlas'];
  this.messages.send({from:'satoshi',to,kind:'RESEARCH_FINDING',summary:`BTC momentum: ${pct(o.satoshi.change24h)} in 24h, ${pct(o.satoshi.change7d)} in 7d`,context:{...base,...o.satoshi}});
  this.messages.send({from:'vega',to,kind:'RESEARCH_FINDING',summary:`Daily volatility ${pct(o.vega.dailyVolatility24h)} (24h) vs ${pct(o.vega.dailyVolatility7d)} (7d)${o.vega.volatilityExpanding?', expanding':''}`,context:{...base,...o.vega}});
  this.messages.send({from:'flux',to,kind:'RESEARCH_FINDING',summary:`Funding ${o.flux.fundingRate===null?'n/a':(o.flux.fundingRate*100).toFixed(4)+'%'}, spread ${o.flux.spreadBps??'n/a'} bps`,context:{...base,...o.flux}});
  this.messages.send({from:'oracle',to,kind:'RESEARCH_FINDING',summary:`Regime ${o.oracle.regime} (${pct(o.oracle.distanceToSma240)} from the 240h average)`,context:{...base,...o.oracle}});
  const action=context.direction===0?(context.currentQuantity?'close any position':'stay flat'):context.direction>0?'be long':'be short';
  const strategy=`${context.configuration.strategy??'SMA'} ${context.configuration.strategy==='BREAKOUT'?context.configuration.slowPeriod:`${context.configuration.fastPeriod}/${context.configuration.slowPeriod}`}`;
  return this.messages.send({from:'nova',to:['sentinel','atlas'],kind:'EXECUTION_PLAN',summary:`Signal says ${action} (${strategy} from study ${context.studyId.slice(0,8)}); researcher notes are context only`,context:{...base,direction:context.direction,currentQuantity:context.currentQuantity,observations:o}});
 }
 /** Sentinel's record of the deterministic risk decision on a pilot order. */
 riskReview(approved:boolean,payload:{order?:{side?:string;quantity?:number;proposalId?:string};decision?:{reasons?:string[];notional?:number};accountId?:string}){
  const order=payload.order??{},reasons=payload.decision?.reasons??[];
  return this.messages.send({from:'sentinel',to:['nova','atlas'],kind:'RISK_REVIEW',summary:approved?`Approved ${order.side} ${order.quantity} BTC (notional ${round(payload.decision?.notional??NaN,2)} USDT)`:`Rejected ${order.side} ${order.quantity} BTC: ${reasons.join(', ')||'risk limits'}`,context:{approved,accountId:payload.accountId,proposalId:order.proposalId,reasons}});
 }
}
