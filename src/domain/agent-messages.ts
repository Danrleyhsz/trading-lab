import type {AgentId} from './agents.js';
export type AgentMessageKind='HYPOTHESIS'|'BACKTEST_RESULT'|'RISK_REVIEW'|'EXECUTION_PLAN'|'PORTFOLIO_DECISION';
export interface AgentMessage{id:string;from:AgentId;to:AgentId[];kind:AgentMessageKind;summary:string;createdAt:string;context:Record<string,unknown>}
export class AgentMessageBus {
 private messages: AgentMessage[]=[];
 hydrate(messages: AgentMessage[]){this.messages=structuredClone(messages)}
 send(input:Omit<AgentMessage,'id'|'createdAt'>){const message:AgentMessage={...structuredClone(input),id:crypto.randomUUID(),createdAt:new Date().toISOString()};this.messages.push(message);return structuredClone(message)}
 list(agentId?:AgentId){return structuredClone(this.messages.filter(message=>!agentId||message.from===agentId||message.to.includes(agentId)))}
}
