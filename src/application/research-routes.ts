import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import type {ResearchEngine} from './research-engine.js';
const requestSchema=z.object({symbol:z.literal('BTCUSDT').default('BTCUSDT'),limit:z.number().int().min(100).max(1000).default(500)}).strict();
export function registerResearchRoutes(app:FastifyInstance,research:ResearchEngine,persist:()=>Promise<void>,blocked:()=>boolean=()=>false){
 app.get('/research/runs',async()=>research.runs.summaries());
 app.get<{Params:{id:string}}>('/research/runs/:id',async(req,reply)=>research.runs.get(req.params.id)??reply.code(404).send({error:'unknown research run'}));
 app.post('/research/run',async(req,reply)=>{
  if(blocked())return reply.code(409).send({error:'research admission unavailable'});
  const parsed=requestSchema.safeParse(req.body??{});
  if(!parsed.success)return reply.code(400).send({error:'invalid research request',issues:parsed.error.issues});
  try{const run=await research.run(parsed.data.limit);await persist();return reply.code(run.status==='FAILED'?502:200).send(run)}
  catch(error){if(error instanceof Error&&error.message==='research already running')return reply.code(409).send({error:error.message});throw error}
 });
}
