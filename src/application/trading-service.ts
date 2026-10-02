import {event} from '../domain/events.js';
import type {PaperOrder,Broker} from '../domain/broker.js';
import type {Portfolio} from '../domain/portfolio.js';
import type {RiskEngine} from '../domain/risk.js';
import type {EventBus} from './event-bus.js';
export class TradingService {
 constructor(private broker:Broker, private portfolio:Portfolio, private risk:RiskEngine, private bus:EventBus) {}
 async propose(order:PaperOrder) {
  this.bus.publish(event('TRADE_PROPOSED',order));
  const decision=this.risk.evaluate(order,this.portfolio.snapshot());
  if(!decision.approved){this.bus.publish(event('RISK_REJECTED',{order,decision}));return {status:'rejected' as const,decision};}
  this.bus.publish(event('RISK_APPROVED',{order,decision}));
  this.bus.publish(event('PAPER_ORDER_SUBMITTED',order));
  const fill=await this.broker.submit(order);
  this.portfolio.applyFill(fill);
  this.bus.publish(event('PAPER_FILL',{fill,portfolio:this.portfolio.snapshot()}));
  return {status:'filled' as const,fill,portfolio:this.portfolio.snapshot()};
 }
}
export type TradeResult = Awaited<ReturnType<TradingService['propose']>>;
export interface PaperExecution {propose(order:PaperOrder):Promise<TradeResult>}
