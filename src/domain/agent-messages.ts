import type{AgentId}from "./agents.js";
export type AgentMessageKind="HYPOTHESIS"|"BACKTEST_RESULT"|"RISK_REVIEW"|"EXECUTION_PLAN"|"PORTFOLIO_DECISION";
export interface AgentMessage{id:string;from:AgentId;to:AgentId[];kind:AgentMessageKind;summary:string;createdAt:string;context:Record<string,unknown>}
export class AgentMessageBus{private messages:AgentMessage[]=[];send(input:Omit<AgentMessage,"id"|"createdAt">){const m:AgentMessage={...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()};this.messages.push(m);return{...m}}list(agentId?:AgentId){return this.messages.filter(m=>!agentId||m.from===agentId||m.to.includes(agentId)).map(m=>({...m,to:[...m.to],context:{...m.context}}))}}
