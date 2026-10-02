import type {AgentId} from './agents.js';
import type {DomainEvent} from './events.js';
export interface PaperAccountDefinition {
 id:string;
 kind:'FUND'|'EVALUATION';
 ownerAgentId:AgentId|null;
 initialCash:number;
 createdAt:string;
}
export interface StoredPaperAccount extends PaperAccountDefinition {ledger:DomainEvent[]}
