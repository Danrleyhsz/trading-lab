import type {FastifyInstance} from 'fastify';
import type {AgentRegistry, AgentId} from '../domain/agents.js';
import type {MemoryStore} from '../domain/memory.js';
import type {AgentMessageBus} from '../domain/agent-messages.js';
import {agentCareer, type AgentActivityJournal} from '../domain/agent-career.js';

export function registerAgentProfiles(app:FastifyInstance, agents:AgentRegistry, memories:MemoryStore, messages:AgentMessageBus, activity:AgentActivityJournal){
 app.get<{Params:{id:string}}>('/agents/:id/profile',async(req,reply)=>{
  const agent=agents.get(req.params.id as AgentId);
  if(!agent)return reply.code(404).send({error:'unknown agent'});
  return agentCareer(agent,memories.list(agent.id),messages.list(agent.id),activity.list(agent.id));
 });
}
