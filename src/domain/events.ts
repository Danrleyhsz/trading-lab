export type DomainEventType =
  | 'MARKET_TICK'
  | 'AGENT_STATE_CHANGED'
  | 'TRADE_PROPOSED'
  | 'RISK_APPROVED'
  | 'RISK_REJECTED'
  | 'PAPER_ORDER_SUBMITTED'
  | 'PAPER_FILL'
  | 'POSITION_CLOSED'
  | 'MEMORY_CREATED'
  | 'RESEARCH_STARTED'
  | 'RESEARCH_COMPLETED'
  | 'RESEARCH_FAILED'
  | 'BACKTEST_STARTED'
  | 'BACKTEST_COMPLETED'
  | 'BACKTEST_FAILED'
  | 'PERPETUAL_MARKET_UPDATED'
  | 'MARKET_DATA_FAILED'
  | 'FUNDING_SETTLED'
  | 'PAPER_LIQUIDATION'
  | 'PAPER_CONTROL_CHANGED'
  | 'AUTONOMOUS_DECISION'
  | 'AUTONOMOUS_PILOT_STOPPED'
  | 'AUTONOMOUS_ENTRY_CHECKED'
  | 'AUTONOMOUS_ATTEMPT_FAILED'
  | 'AUTONOMOUS_ATTEMPT_RECOVERED'
  | 'RESEARCH_JOB_UPDATED';
export interface DomainEvent<T = unknown> {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  payload: T;
}
export const event = (type: DomainEventType, payload: unknown): DomainEvent => ({
  id: crypto.randomUUID(),
  type,
  occurredAt: new Date().toISOString(),
  payload,
});
