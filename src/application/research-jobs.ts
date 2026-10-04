import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {event,type DomainEvent} from '../domain/events.js';
import type {ResearchEngine} from './research-engine.js';
import type {EventBus} from './event-bus.js';

const update=z.object({jobId:z.string().uuid(),limit:z.number().int().min(100).max(1000),status:z.enum(['QUEUED','RUNNING','COMPLETED','FAILED','INTERRUPTED']),runId:z.string().uuid().optional(),reason:z.enum(['RESEARCH_FAILED','TASK_FAILED','RUNTIME_RESTARTED']).optional()}).strict();
export interface ResearchJob {id:string;limit:number;status:z.infer<typeof update>['status'];createdAt:string;updatedAt:string;runId?:string;reason?:z.infer<typeof update>['reason'];eventIds:string[]}
// Lifecycle is reconstructed from existing immutable domain events, not a second queue/database.
export class ResearchJobs {
 private records=new Map<string,ResearchJob>();private active=new Set<Promise<void>>();private accepting=true;private persistenceFailed=false;
 constructor(private engine:Pick<ResearchEngine,'run'|'status'>,private bus:EventBus,private persist:()=>Promise<void>,restored:DomainEvent[]=[],private quantBusy:()=>boolean=()=>false){
  const ids=new Set<string>();
  for(const record of restored)if(record.type==='RESEARCH_JOB_UPDATED'){
   if(ids.has(record.id)||!Number.isFinite(Date.parse(record.occurredAt)))throw Error('invalid research job history');ids.add(record.id);this.apply(record);
  }
 }
 private apply(record:DomainEvent){
  const p=update.parse(record.payload),old=this.records.get(p.jobId);
  if(p.status==='RUNNING'&&(p.runId||p.reason)||p.status==='COMPLETED'&&p.reason||p.status==='INTERRUPTED'&&p.runId||p.status==='FAILED'&&(!p.reason||p.reason==='RUNTIME_RESTARTED'||(p.reason==='RESEARCH_FAILED')!==Boolean(p.runId)))throw Error('invalid research lifecycle evidence');
  if(!old){if(p.status!=='QUEUED'||p.runId||p.reason)throw Error('invalid research admission');this.records.set(p.jobId,{id:p.jobId,limit:p.limit,status:p.status,createdAt:record.occurredAt,updatedAt:record.occurredAt,eventIds:[record.id]});return;}
  if(old.limit!==p.limit||Date.parse(record.occurredAt)<Date.parse(old.updatedAt)||!['QUEUED','RUNNING'].includes(old.status)||p.status==='QUEUED'||p.status==='RUNNING'&&old.status!=='QUEUED'||p.status==='COMPLETED'&&(old.status!=='RUNNING'||!p.runId)||p.status==='INTERRUPTED'&&p.reason!=='RUNTIME_RESTARTED')throw Error('research job history rewrite');
  this.records.set(p.jobId,{...old,status:p.status,updatedAt:record.occurredAt,runId:p.runId,reason:p.reason,eventIds:[...old.eventIds,record.id]});
 }
 private record(jobId:string,limit:number,status:ResearchJob['status'],extra:{runId?:string;reason?:ResearchJob['reason']}={}){
  const e=event('RESEARCH_JOB_UPDATED',{jobId,limit,status,...extra});this.apply(e);this.bus.publish(e);
 }
 private async save(){try{await this.persist();}catch{this.persistenceFailed=true;throw Error('research persistence unavailable');}}
 list(){return structuredClone([...this.records.values()]);}
 summaries(){return this.list().slice(-20).reverse();}
 get(id:string){return structuredClone(this.records.get(id));}
 status(){return {busy:this.active.size>0||this.engine.status().busy,accepting:this.accepting&&!this.persistenceFailed,persistenceFailed:this.persistenceFailed,activeTasks:this.active.size,interruptedJobs:this.list().filter(j=>j.status==='INTERRUPTED').length};}
 stopAccepting(){this.accepting=false;}
 async drain(){this.stopAccepting();await Promise.all([...this.active]);}
 recover(){for(const j of this.list())if(j.status==='QUEUED'||j.status==='RUNNING')this.record(j.id,j.limit,'INTERRUPTED',{reason:'RUNTIME_RESTARTED'});}
 async start(limit=500){
  if(!this.status().accepting)throw Error('research admission unavailable');
  if(this.status().busy||this.quantBusy())throw Error('research already running');
  if(!Number.isInteger(limit)||limit<100||limit>1000)throw Error('invalid research limit');
  const id=crypto.randomUUID();let finish!:()=>void;const completion=new Promise<void>(resolve=>{finish=resolve});this.active.add(completion);
  const finished=()=>{this.active.delete(completion);finish();};
  try{this.record(id,limit,'QUEUED');await this.save();}catch{this.persistenceFailed=true;finished();throw Error('research admission persistence failed');}
  const admitted=this.get(id)!;
  const task=async()=>{
   try{
    this.record(id,limit,'RUNNING');await this.save();
    const run=await this.engine.run(limit);
    this.record(id,limit,run.status==='FAILED'?'FAILED':'COMPLETED',{runId:run.id,...run.status==='FAILED'?{reason:'RESEARCH_FAILED' as const}:{}});
    await this.save();
   }catch{
    if(this.get(id)?.status==='RUNNING'){this.record(id,limit,'FAILED',{reason:'TASK_FAILED'});}
    try{await this.save();}catch{this.persistenceFailed=true;}
   }
  };
  void task().catch(()=>{this.persistenceFailed=true;}).finally(finished);return admitted;
 }
}
const request=z.object({symbol:z.literal('BTCUSDT').default('BTCUSDT'),limit:z.number().int().min(100).max(1000).default(500)}).strict();
export function registerResearchJobs(app:FastifyInstance,jobs:ResearchJobs){
 app.get('/research/jobs',async()=>jobs.summaries());
 app.get<{Params:{id:string}}>('/research/jobs/:id',async(req,reply)=>jobs.get(req.params.id)??reply.code(404).send({error:'unknown research job'}));
 app.post('/research/jobs',async(req,reply)=>{const parsed=request.safeParse(req.body??{});if(!parsed.success)return reply.code(400).send({error:'invalid research request'});try{return reply.code(202).send(await jobs.start(parsed.data.limit));}catch(error){return reply.code(error instanceof Error&&error.message==='research already running'?409:503).send({error:'research admission unavailable'});}});
}
