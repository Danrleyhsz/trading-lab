import type {PaperAccounts} from "./paper-accounts.js";
import type {FastifyInstance} from 'fastify';
import type {AgentRegistry, AgentId} from '../domain/agents.js';
import type {MemoryStore} from '../domain/memory.js';
import type {AgentMessageBus} from '../domain/agent-messages.js';
import {agentCareer, type AgentActivityJournal} from '../domain/agent-career.js';

export function registerAgentProfiles(app:FastifyInstance, agents:AgentRegistry, memories:MemoryStore, messages:AgentMessageBus, activity:AgentActivityJournal, accounts?:PaperAccounts){
 app.get<{Params:{id:string}}>('/agents/:id/profile',async(req,reply)=>{
  const agent=agents.get(req.params.id as AgentId);
  if(!agent)return reply.code(404).send({error:'unknown agent'});
  const profile=agentCareer(agent,memories.list(agent.id),messages.list(agent.id),activity.list(agent.id));const evaluationAccounts=accounts?.list(agent.id)??[];return {...profile,evaluationAccounts,performance:evaluationAccounts.length?{realizedPnl:evaluationAccounts.reduce((sum,account)=>sum+account.portfolio.realizedPnl,0),netPnl:evaluationAccounts.reduce((sum,account)=>sum+account.portfolio.equity-account.initialCash,0),feesPaid:evaluationAccounts.reduce((sum,account)=>sum+account.feesPaid,0),winRate:null,maxDrawdown:null,reason:"Evaluation accounts only; fund excluded. Win rate and drawdown require complete outcome/time series."}:profile.performance};
 });
}
