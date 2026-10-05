import {perpetualDirection,validTeamFilters,teamFilterWarmup,validProtections,protectionsAllowEntry,type TeamFilters,type Protections} from './perpetual-signals.js';
import {createHash} from 'node:crypto';
import type {Candle} from './backtest.js';
import {RiskEngine} from './risk.js';
import type {PortfolioSnapshot} from './portfolio.js';
export interface FundingSettlement {timestamp:number;rate:number;markPrice:number}
export interface PerpetualDataset {instrument:'BINANCE_USDM:BTCUSDT';trade:Candle[];mark:Candle[];funding:FundingSettlement[]}
export interface PerpetualConfig {strategy?:'SMA'|'BREAKOUT'|'MEAN_REVERSION';filters?:TeamFilters;protections?:Protections;initialCapital:number;feeRate:number;slippageBps:number;maintenanceRate:number;liquidationFeeRate:number;positionFraction:number;fastPeriod:number;slowPeriod:number}
export interface SimulationEntry {kind:'PROPOSAL'|'FILL'|'FUNDING'|'LIQUIDATION';timestamp:number;quantity:number;price:number;cashDelta:number;approved?:boolean;reasons?:string[]}
const hour=3600000;
export function validatePerpetualDataset(data:PerpetualDataset){
 if(data.instrument!=='BINANCE_USDM:BTCUSDT'||data.trade.length<3||data.trade.length>10000||data.mark.length!==data.trade.length)throw new Error('invalid dataset');
 for(const series of [data.trade,data.mark])for(let i=0;i<series.length;i++){
  const c=series[i];if(!Number.isSafeInteger(c.timestamp)||c.timestamp%hour!==0||![c.open,c.high,c.low,c.close,c.volume].every(Number.isFinite)||Math.min(c.open,c.low,c.close)<=0||c.volume<0||c.high<Math.max(c.open,c.close,c.low)||c.low>Math.min(c.open,c.close)|| (i>0&&c.timestamp!==series[i-1].timestamp+hour))throw new Error('invalid or discontinuous candles');
  if(c.timestamp!==data.trade[i].timestamp)throw new Error('unaligned mark candles');
 }
 let previous=-Infinity;for(const f of data.funding){if(!Number.isSafeInteger(f.timestamp)||f.timestamp<=previous||f.timestamp<data.trade[0].timestamp||f.timestamp>=data.trade.at(-1)!.timestamp+hour||!Number.isFinite(f.rate)||!Number.isFinite(f.markPrice)||f.markPrice<=0)throw new Error('invalid funding');previous=f.timestamp;}
 // Fixed field order (the original adapter's), so storage that reorders object keys, such as PostgreSQL JSONB, cannot change the evidence identity and earlier recorded hashes stay reproducible.
 const candle=(c:Candle)=>({timestamp:c.timestamp,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume});
 const canonical={instrument:data.instrument,trade:data.trade.map(candle),mark:data.mark.map(candle),funding:data.funding.map(f=>({timestamp:f.timestamp,rate:f.rate,markPrice:f.markPrice}))};
 return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
/** Offline historical simulation only. Never emits broker events or writes account balances. */
export function backtestPerpetual(data:PerpetualDataset,cfg:PerpetualConfig){
 const datasetHash=validatePerpetualDataset(data);if(cfg.strategy&&!['SMA','BREAKOUT','MEAN_REVERSION'].includes(cfg.strategy))throw Error('invalid strategy');
 if(!validTeamFilters(cfg.filters)||teamFilterWarmup(cfg.filters)>=data.trade.length)throw Error('invalid team filters');
 if(!validProtections(cfg.protections))throw Error('invalid protections');const warmup=Math.max(cfg.slowPeriod,teamFilterWarmup(cfg.filters));
 if(!Object.entries(cfg).filter(([key])=>key!=='strategy'&&key!=='filters'&&key!=='protections').every(([,value])=>Number.isFinite(value))||cfg.initialCapital<=0||cfg.feeRate<0||cfg.feeRate>=1||cfg.slippageBps<0||cfg.slippageBps>=10000||cfg.maintenanceRate<=0||cfg.maintenanceRate>=1||cfg.liquidationFeeRate<0||cfg.liquidationFeeRate>=1||cfg.positionFraction<=0||cfg.positionFraction>0.2||!Number.isInteger(cfg.fastPeriod)||!Number.isInteger(cfg.slowPeriod)||cfg.fastPeriod<1||cfg.slowPeriod<=cfg.fastPeriod||data.trade.length<=cfg.slowPeriod)throw new Error('invalid configuration');
 const risk=new RiskEngine();const audit:SimulationEntry[]=[];const equitySeries:{timestamp:number;equity:number}[]=[];
 let cash=cfg.initialCapital,quantity=0,entry=0,fees=0,funding=0,liquidations=0,peak=cash,maxDrawdown=0,fundingIndex=0;
 // Operações encerradas (resultado líquido com taxas e funding), usadas pelas proteções.
 const closedTrades:{closedAt:number;netPnl:number}[]=[];let tradeNet=0;
 const snapshot=(mark:number):PortfolioSnapshot=>({initialCash:cfg.initialCapital,cash,equity:cash+quantity*(mark-entry),realizedPnl:0,unrealizedPnl:quantity*(mark-entry),positions:quantity?[{symbol:'BTCUSDT',quantity,averageEntry:entry,realizedPnl:0}]:[]});
 const record=(timestamp:number,mark:number)=>{const equity=snapshot(mark).equity;if(!Number.isFinite(equity))throw new Error('non-finite simulated equity');peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,(peak-equity)/peak);equitySeries.push({timestamp,equity});};
 const execute=(signed:number,price:number,timestamp:number,liquidation=false)=>{
  const decision=risk.evaluate({symbol:'BTCUSDT',side:signed>0?'BUY':'SELL',quantity:Math.abs(signed),referencePrice:price},snapshot(price));
  audit.push({kind:'PROPOSAL',timestamp,quantity:signed,price,cashDelta:0,...decision});if(!decision.approved)return false;
  const fill=price*(1+Math.sign(signed)*cfg.slippageBps/10000);const fee=Math.abs(signed)*fill*(cfg.feeRate+(liquidation?cfg.liquidationFeeRate:0));
  const pnl=quantity===0?0:Math.min(Math.abs(signed),Math.abs(quantity))*(fill-entry)*Math.sign(quantity);cash+=pnl-fee;fees+=fee;
  tradeNet+=pnl-fee;quantity+=signed;entry=quantity===0?0:fill;if(Math.abs(quantity)<1e-12){closedTrades.push({closedAt:timestamp,netPnl:tradeNet});tradeNet=0;}audit.push({kind:liquidation?'LIQUIDATION':'FILL',timestamp,quantity:signed,price:fill,cashDelta:pnl-fee});return true;
 };
  for(let i=0;i<data.trade.length;i++){
  const c=data.trade[i],m=data.mark[i];
  // Boundary settlements within one second apply to the carried position before open execution.
  // Original timestamps remain in the audit. This ordering is a declared modeling assumption.
  const settle=(until:number)=>{while(fundingIndex<data.funding.length&&data.funding[fundingIndex].timestamp<until){const f=data.funding[fundingIndex++];const delta=-quantity*f.markPrice*f.rate;cash+=delta;funding+=delta;tradeNet+=delta;audit.push({kind:'FUNDING',timestamp:f.timestamp,quantity,price:f.markPrice,cashDelta:delta});record(f.timestamp,f.markPrice);}};
  settle(c.timestamp+1000);
  if(i>=warmup){const direction=perpetualDirection(data.trade.slice(0,i),cfg,quantity);if(quantity&&Math.sign(quantity)!==direction)execute(-quantity,c.open,c.timestamp);if(!quantity&&direction&&cash>0&&protectionsAllowEntry(cfg.protections,closedTrades,c.timestamp).allowed)execute(direction*cash*cfg.positionFraction/c.open,c.open,c.timestamp);}
  settle(c.timestamp+hour);
  // OHLC cannot reveal chronology. Funding precedes the worst mark stress; liquidation
  // fills at the adverse trade extreme, deliberately conservative and not exchange parity.
  if(quantity){const worstMark=quantity>0?m.low:m.high;const equity=snapshot(worstMark).equity;const maintenance=Math.abs(quantity)*worstMark*(cfg.maintenanceRate+cfg.liquidationFeeRate);record(c.timestamp+hour-1,worstMark);if(equity<=maintenance){if(execute(-quantity,quantity>0?c.low:c.high,c.timestamp+hour-1,true))liquidations++;}}
  record(c.timestamp+hour-1,m.close);
 }
 if(quantity)execute(-quantity,data.trade.at(-1)!.close,data.trade.at(-1)!.timestamp+hour-1);
 record(data.trade.at(-1)!.timestamp+hour-1,data.mark.at(-1)!.close);
 const tradeOutcomes:number[]=[];let openQuantity=0,net=0;for(const row of audit){if(row.kind==='FUNDING'){if(openQuantity)net+=row.cashDelta;}if(row.kind==='FILL'||row.kind==='LIQUIDATION'){net+=row.cashDelta;openQuantity+=row.quantity;if(Math.abs(openQuantity)<1e-10){tradeOutcomes.push(net);net=0;openQuantity=0;}}}const wins=tradeOutcomes.filter(p=>p>0).length,losses=tradeOutcomes.filter(p=>p<=0).length;
 return {trades:tradeOutcomes.length,wins,losses,winRate:tradeOutcomes.length?wins/tradeOutcomes.length:null,tradeOutcomes,model:'LINEAR_PERPETUAL_V2' as const,execution:'HISTORICAL_SIMULATION' as const,datasetHash,finalEquity:cash,netPnl:cash-cfg.initialCapital,feesPaid:fees,fundingCashDelta:funding,maxDrawdown,liquidations,audit,equitySeries};
}
