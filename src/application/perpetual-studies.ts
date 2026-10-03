import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {walkForwardPerpetual} from '../domain/perpetual-walk-forward.js';
import type {PerpetualDataset,PerpetualConfig} from '../domain/perpetual-backtest.js';
import type {AgentCoordinator} from './agent-coordinator.js';
import type {EventBus} from './event-bus.js';
import {event} from '../domain/events.js';
const schema=z.object({bars:z.number().int().min(300).max(5000).default(1000),trainBars:z.number().int().min(100).max(3000).default(400),testBars:z.number().int().min(50).max(1000).default(100)}).strict().refine(v=>v.bars>=v.trainBars+v.testBars,'insufficient study windows');
export interface PerpetualStudy {id:string;status:'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'INTERRUPTED';createdAt:string;request:z.infer<typeof schema>;dataset?:PerpetualDataset;result?:ReturnType<typeof walkForwardPerpetual>;error?:string;completedAt?:string}
export class PerpetualStudies {
 private records:PerpetualStudy[];private busy=false;private accepting=true;private activeTasks=new Set<Promise<void>>();private persistenceError:string|null=null;
 constructor(private source:{load(count:number):Promise<PerpetualDataset>},restored:PerpetualStudy[]=[]){this.records=structuredClone(restored).map(s=>s.status==='RUNNING'||s.status==='QUEUED'?{...s,status:'INTERRUPTED',error:'server restarted before completion'}:s);}
 list(){return structuredClone(this.records);}
 status(){return {busy:this.busy,accepting:this.accepting,persistenceFailed:!!this.persistenceError,activeTasks:this.activeTasks.size,interruptedStudies:this.records.filter(s=>s.status==='INTERRUPTED').length};}
 stopAccepting(){this.accepting=false;}
 async drain(){this.stopAccepting();await Promise.all([...this.activeTasks]);}
 summaries(){return this.records.slice(-20).reverse().map(({dataset,result,...s})=>({...s,netPnl:result?.netPnl,folds:result?.folds.length}));}
 get(id:string){return structuredClone(this.records.find(s=>s.id===id));}
 async start(request:z.infer<typeof schema>,persist:()=>Promise<void>,coordinator:AgentCoordinator,bus:EventBus){
  if(!this.accepting)throw new Error('historical runtime draining');
  if(this.busy||coordinator.registry.get('euler')?.status==='BACKTESTING'||coordinator.registry.get('atlas')?.status==='RESEARCHING')throw new Error('quant job already running');
  this.busy=true;let finish!:()=>void;const completion=new Promise<void>(resolve=>{finish=resolve;});this.activeTasks.add(completion);const finished=()=>{this.activeTasks.delete(completion);finish();};const study:PerpetualStudy={id:crypto.randomUUID(),status:'QUEUED',createdAt:new Date().toISOString(),request};this.records.push(study);
  try{await persist();}catch(error){this.records.pop();this.busy=false;finished();throw error;}
  const task=async()=>{study.status='RUNNING';coordinator.backtest(`USD-M historical study ${study.id}`);bus.publish(event('BACKTEST_STARTED',{studyId:study.id,model:'LINEAR_PERPETUAL_V2'}));
   try{await persist();study.dataset=await this.source.load(request.bars);
    const base:PerpetualConfig={initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:30};
    study.result=walkForwardPerpetual(study.dataset,[base,{...base,fastPeriod:20,slowPeriod:60},{...base,fastPeriod:5,slowPeriod:20},{...base,strategy:'BREAKOUT'},{...base,strategy:'MEAN_REVERSION'}],request.trainBars,request.testBars);study.status='COMPLETED';
   }catch(error){study.status='FAILED';study.error=error instanceof Error?error.message:'historical study failed';}
   finally{study.completedAt=new Date().toISOString();coordinator.move('euler','IDLE','Quant Lab',`Historical study ${study.status.toLowerCase()}: ${study.id}`);bus.publish(event(study.status==='COMPLETED'?'BACKTEST_COMPLETED':'BACKTEST_FAILED',{studyId:study.id,status:study.status,error:study.error}));try{await persist();this.persistenceError=null;}finally{this.busy=false;}}
  };
  void task().catch(()=>{this.persistenceError='historical persistence failed';}).finally(finished);return this.get(study.id)!;
 }
}
export function registerPerpetualStudies(app:FastifyInstance,studies:PerpetualStudies,persist:()=>Promise<void>,coordinator:AgentCoordinator,bus:EventBus){
 app.get('/backtests/v2/studies',async()=>studies.summaries());
 app.get<{Params:{id:string}}>('/backtests/v2/studies/:id',async(req,reply)=>studies.get(req.params.id)??reply.code(404).send({error:'unknown study'}));
 app.post('/backtests/v2/studies',async(req,reply)=>{const parsed=schema.safeParse(req.body??{});if(!parsed.success)return reply.code(400).send({error:'invalid study request'});try{return reply.code(202).send(await studies.start(parsed.data,persist,coordinator,bus));}catch(error){if(error instanceof Error&&error.message==='quant job already running')return reply.code(409).send({error:error.message});throw error;}});
}
