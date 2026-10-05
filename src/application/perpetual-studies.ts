import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import type {walkForwardPerpetual} from '../domain/perpetual-walk-forward.js';
import {HistoricalStudyRunner,type HistoricalStudySimulator} from './historical-study-runner.js';
import {validatePerpetualDataset} from '../domain/perpetual-backtest.js';
import type {PerpetualDataset,PerpetualConfig} from '../domain/perpetual-backtest.js';
import type {AgentCoordinator} from './agent-coordinator.js';
import type {EventBus} from './event-bus.js';
import {event} from '../domain/events.js';
import {screenPerpetualStudy,studyScreenAtTime} from './perpetual-study-screen.js';
const base:PerpetualConfig={initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:30};
/** Fixed, pre-declared candidate sets. A study records which set it used; sets are never edited in place, a new hypothesis gets a new name. */
export const STUDY_CANDIDATE_SETS={
 // Original 5–60 hour signals. Studies without a recorded set used this one.
 SHORT_HORIZON_V1:[base,{...base,fastPeriod:20,slowPeriod:60},{...base,fastPeriod:5,slowPeriod:20},{...base,strategy:'BREAKOUT'},{...base,strategy:'MEAN_REVERSION'}],
 // Multi-day trend with low turnover; see docs/RESEARCH_PROTOCOL_MULTI_DAY_TREND.md.
 MULTI_DAY_TREND_V1:[{...base,fastPeriod:48,slowPeriod:240},{...base,fastPeriod:72,slowPeriod:480},{...base,strategy:'BREAKOUT',slowPeriod:480}],
 // One researcher hypothesis per set, each a single pre-declared candidate, plus the unfiltered control;
 // see docs/RESEARCH_PROTOCOL_TEAM_FILTERS.md.
 BREAKOUT_480_CONTROL_V1:[{...base,strategy:'BREAKOUT',slowPeriod:480}],
 TEAM_ORACLE_REGIME_V1:[{...base,strategy:'BREAKOUT',slowPeriod:480,filters:{regime:true}}],
 TEAM_VEGA_VOLATILITY_V1:[{...base,strategy:'BREAKOUT',slowPeriod:480,filters:{volatility:true}}],
 TEAM_SATOSHI_MOMENTUM_V1:[{...base,strategy:'BREAKOUT',slowPeriod:480,filters:{momentum:true}}],
 TEAM_COMBINED_V1:[{...base,strategy:'BREAKOUT',slowPeriod:480,filters:{regime:true,volatility:true,momentum:true}}],
} satisfies Record<string,PerpetualConfig[]>;
export type StudyCandidateSet=keyof typeof STUDY_CANDIDATE_SETS;
export const studyCandidates=(set:StudyCandidateSet='SHORT_HORIZON_V1')=>structuredClone(STUDY_CANDIDATE_SETS[set]);
const schema=z.object({bars:z.number().int().min(300).max(5000).default(1000),trainBars:z.number().int().min(100).max(3000).default(400),testBars:z.number().int().min(50).max(1000).default(100),candidateSet:z.enum(Object.keys(STUDY_CANDIDATE_SETS) as [StudyCandidateSet,...StudyCandidateSet[]]).optional()}).strict().refine(v=>v.bars>=v.trainBars+v.testBars,'insufficient study windows').refine(v=>studyCandidates(v.candidateSet).every(c=>c.slowPeriod<v.trainBars),'training window shorter than candidate warmup');
export interface PerpetualStudy {id:string;status:'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'INTERRUPTED';createdAt:string;request:z.infer<typeof schema>;dataset?:PerpetualDataset;datasetHash?:string;result?:ReturnType<typeof walkForwardPerpetual>;error?:string;completedAt?:string}
export class PerpetualStudies {
 private screens=new WeakMap<PerpetualStudy,ReturnType<typeof screenPerpetualStudy>>();
 private records:PerpetualStudy[];private busy=false;private accepting=true;private activeTasks=new Set<Promise<void>>();private persistenceError:string|null=null;
 constructor(private source:{load(count:number):Promise<PerpetualDataset>},restored:PerpetualStudy[]=[],private simulator:HistoricalStudySimulator=new HistoricalStudyRunner()){this.records=structuredClone(restored).map(s=>s.status==='RUNNING'||s.status==='QUEUED'?{...s,status:'INTERRUPTED',error:'server restarted before completion'}:s);}
 list(){return structuredClone(this.records);}
 status(){return {busy:this.busy,accepting:this.accepting,persistenceFailed:!!this.persistenceError,activeTasks:this.activeTasks.size,interruptedStudies:this.records.filter(s=>s.status==='INTERRUPTED').length};}
 stopAccepting(){this.accepting=false;}
 async drain(){this.stopAccepting();await Promise.all([...this.activeTasks]);}
 summaries(){return this.records.slice(-20).reverse().map(({dataset,result,...s})=>({...s,netPnl:result?.netPnl,folds:result?.folds.length}));}
 get(id:string){return structuredClone(this.records.find(s=>s.id===id));}
 screen(id:string,now=Date.now()){
  const study=this.records.find(s=>s.id===id);if(!study||study.status!=='COMPLETED')return screenPerpetualStudy(study,now);
  let cached=this.screens.get(study);if(!cached){cached=screenPerpetualStudy(study,now);this.screens.set(study,cached);}
  return studyScreenAtTime(study,cached,now);
 }
 async start(request:z.infer<typeof schema>,persist:()=>Promise<void>,coordinator:AgentCoordinator,bus:EventBus){
  if(!this.accepting)throw new Error('historical runtime draining');
  if(this.busy||coordinator.registry.get('euler')?.status==='BACKTESTING'||coordinator.registry.get('atlas')?.status==='RESEARCHING')throw new Error('quant job already running');
  request=structuredClone(request);this.busy=true;let finish!:()=>void;const completion=new Promise<void>(resolve=>{finish=resolve;});this.activeTasks.add(completion);const finished=()=>{this.activeTasks.delete(completion);finish();};const study:PerpetualStudy={id:crypto.randomUUID(),status:'QUEUED',createdAt:new Date().toISOString(),request};this.records.push(study);
  try{await persist();}catch(error){this.records.pop();this.busy=false;finished();throw error;}
  const task=async()=>{study.status='RUNNING';coordinator.backtest(`USD-M historical study ${study.id}`);bus.publish(event('BACKTEST_STARTED',{studyId:study.id,model:'LINEAR_PERPETUAL_V2'}));
   try{await persist();study.dataset=structuredClone(await this.source.load(request.bars));if(study.dataset.trade.length!==request.bars)throw Error('incomplete study dataset');study.datasetHash=validatePerpetualDataset(study.dataset);try{await persist();}catch{throw Error('historical evidence persistence failed');}
    study.result=await this.simulator.run(study.dataset,studyCandidates(request.candidateSet),request.trainBars,request.testBars);study.status='COMPLETED';
   }catch(error){study.status='FAILED';study.error=error instanceof Error?error.message:'historical study failed';}
   finally{study.completedAt=new Date().toISOString();coordinator.move('euler','IDLE','Quant Lab',`Historical study ${study.status.toLowerCase()}: ${study.id}`);bus.publish(event(study.status==='COMPLETED'?'BACKTEST_COMPLETED':'BACKTEST_FAILED',{studyId:study.id,status:study.status,error:study.error}));try{await persist();this.persistenceError=null;}finally{this.busy=false;}}
  };
  void task().catch(()=>{this.persistenceError='historical persistence failed';}).finally(finished);return this.get(study.id)!;
 }
}
export function registerPerpetualStudies(app:FastifyInstance,studies:PerpetualStudies,persist:()=>Promise<void>,coordinator:AgentCoordinator,bus:EventBus,blocked:()=>boolean=()=>false){
 app.get('/backtests/v2/studies',async()=>studies.summaries());
 app.get<{Params:{id:string}}>('/backtests/v2/studies/:id',async(req,reply)=>studies.get(req.params.id)??reply.code(404).send({error:'unknown study'}));
 app.post('/backtests/v2/studies',async(req,reply)=>{const parsed=schema.safeParse(req.body??{});if(!parsed.success)return reply.code(400).send({error:'invalid study request'});if(blocked())return reply.code(409).send({error:'quant job already running'});try{return reply.code(202).send(await studies.start(parsed.data,persist,coordinator,bus));}catch(error){if(error instanceof Error&&error.message==='quant job already running')return reply.code(409).send({error:error.message});throw error;}});
}
