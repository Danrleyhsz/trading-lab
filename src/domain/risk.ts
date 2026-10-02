import type{PaperOrder}from "./broker.js";import type{PortfolioSnapshot}from "./portfolio.js";
export interface RiskLimits{maxPositionPct:number;maxLossPct:number;maxLeverage:number}
export interface RiskDecision{approved:boolean;reasons:string[];notional:number}
export class RiskEngine{constructor(private limits:RiskLimits={maxPositionPct:0.2,maxLossPct:0.05,maxLeverage:1}){}
 evaluate(order:PaperOrder,p:PortfolioSnapshot):RiskDecision{const notional=order.quantity*order.referencePrice;const reasons:string[]=[];if(order.quantity<=0||order.referencePrice<=0)reasons.push("INVALID_ORDER");if(notional>p.equity*this.limits.maxPositionPct)reasons.push("POSITION_LIMIT");if(p.equity<=p.initialCash*(1-this.limits.maxLossPct))reasons.push("LOSS_LIMIT");const gross=p.positions.reduce((s,x)=>s+Math.abs(x.quantity*x.averageEntry),0)+notional;if(gross>p.equity*this.limits.maxLeverage)reasons.push("LEVERAGE_LIMIT");return{approved:reasons.length===0,reasons,notional}}
}