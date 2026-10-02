import type {PaperOrder} from './broker.js';
import type {PortfolioSnapshot} from './portfolio.js';
export interface RiskLimits {maxPositionPct:number;maxLossPct:number;maxLeverage:number}
export interface RiskDecision {approved:boolean;reasons:string[];notional:number}
export class RiskEngine {
 constructor(private limits:RiskLimits={maxPositionPct:0.2,maxLossPct:0.05,maxLeverage:1}) {}
 evaluate(order:PaperOrder, portfolio:PortfolioSnapshot):RiskDecision {
  const notional=order.quantity*order.referencePrice, reasons:string[]=[];
  if(!Number.isFinite(order.quantity)||!Number.isFinite(order.referencePrice)||order.quantity<=0||order.referencePrice<=0||!['BUY','SELL'].includes(order.side)||!order.symbol) reasons.push('INVALID_ORDER');
  if(!Number.isFinite(portfolio.equity)||portfolio.equity<=0) reasons.push('INVALID_EQUITY');
  const current=portfolio.positions.find(position=>position.symbol===order.symbol);
  const projectedQuantity=(current?.quantity??0)+(order.side==='BUY'?order.quantity:-order.quantity);
  const projectedNotional=Math.abs(projectedQuantity*order.referencePrice);
  if(projectedNotional>portfolio.equity*this.limits.maxPositionPct) reasons.push('POSITION_LIMIT');
  if(portfolio.equity<=portfolio.initialCash*(1-this.limits.maxLossPct)) reasons.push('LOSS_LIMIT');
  const gross=portfolio.positions.filter(position=>position.symbol!==order.symbol).reduce((sum,position)=>sum+Math.abs(position.quantity*position.averageEntry),0)+projectedNotional;
  if(gross>portfolio.equity*this.limits.maxLeverage) reasons.push('LEVERAGE_LIMIT');
  return {approved:reasons.length===0,reasons,notional};
 }
}
