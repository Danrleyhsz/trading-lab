import {Worker} from 'node:worker_threads';
import type {FastifyInstance} from 'fastify';
import {studyCandidates,type PerpetualStudies,type StudyCandidateSet} from './perpetual-studies.js';
import type {computeStudyRobustness} from './study-robustness.js';

type Result=ReturnType<typeof computeStudyRobustness>;
type Entry={status:'COMPUTING'}|{status:'READY';result:Result;computedAt:string}|{status:'FAILED';error:string};
const LIMITS=Object.freeze({timeoutMs:60000,maxOldGenerationSizeMb:256});

/**
 * Calcula a robustez de um estudo concluído sob demanda, um por vez, numa thread separada.
 * O resultado fica em memória (é derivado do estudo gravado, então pode ser recalculado a qualquer momento).
 */
export class StudyRobustnessRunner {
 private cache=new Map<string,Entry>();private active=false;
 constructor(private studies:PerpetualStudies,private moduleURL=new URL('./study-robustness-worker.js',import.meta.url)){
  if(import.meta.url.endsWith('.ts'))this.moduleURL=new URL('./study-robustness-worker.ts',import.meta.url);
 }
 /** Todas as configurações diferentes já testadas por estudos concluídos (desconto de múltiplas tentativas). */
 private trials(){return this.studies.list().filter(s=>s.status==='COMPLETED').flatMap(s=>studyCandidates((s.request?.candidateSet??'SHORT_HORIZON_V1') as StudyCandidateSet));}
 get(id:string):Entry|{status:'NOT_FOUND'}|{status:'NOT_COMPLETED'}|{status:'BUSY'}{
  const cached=this.cache.get(id);if(cached&&cached.status!=='FAILED')return cached;
  const study=this.studies.get(id);if(!study)return {status:'NOT_FOUND'};
  if(study.status!=='COMPLETED'||!study.dataset||!study.result)return {status:'NOT_COMPLETED'};
  if(this.active)return {status:'BUSY'};
  this.active=true;this.cache.set(id,{status:'COMPUTING'});
  const input={dataset:study.dataset,candidates:studyCandidates((study.request.candidateSet??'SHORT_HORIZON_V1') as StudyCandidateSet),folds:study.result.folds,trials:this.trials()};
  void this.run(input).then(result=>this.cache.set(id,{status:'READY',result,computedAt:new Date().toISOString()}),error=>this.cache.set(id,{status:'FAILED',error:error instanceof Error?error.message:'falha no cálculo'})).finally(()=>{this.active=false;});
  return {status:'COMPUTING'};
 }
 private run(input:unknown):Promise<Result>{
  const url=this.moduleURL.pathname.endsWith('.ts')?new URL('data:text/javascript,'+encodeURIComponent(`import {register} from ${JSON.stringify(import.meta.resolve('tsx/esm/api'))};register();await import(${JSON.stringify(this.moduleURL.href)});`)):this.moduleURL;
  return new Promise((resolve,reject)=>{
   const worker=new Worker(url,{workerData:input,execArgv:[],env:this.moduleURL.pathname.endsWith('.ts')?{TSX_DISABLE_CACHE:'1'}:{},resourceLimits:{maxOldGenerationSizeMb:LIMITS.maxOldGenerationSizeMb}});
   let done=false;const finish=(error?:Error,result?:Result)=>{if(done)return;done=true;clearTimeout(timer);void worker.terminate().then(()=>error?reject(error):resolve(result!),()=>reject(Error('falha ao encerrar o worker')));};
   const timer=setTimeout(()=>finish(Error('cálculo de robustez excedeu o tempo')),LIMITS.timeoutMs);
   worker.once('error',()=>finish(Error('worker de robustez falhou')));
   worker.once('exit',()=>finish(Error('worker de robustez encerrou sem resultado')));
   worker.once('message',(m:{ok?:boolean;result?:Result})=>m?.ok&&m.result?finish(undefined,m.result):finish(Error('cálculo de robustez falhou')));
  });
 }
}
export function registerStudyRobustness(app:FastifyInstance,runner:StudyRobustnessRunner){
 app.get<{Params:{id:string}}>('/backtests/v2/studies/:id/robustness',async(req,reply)=>{
  const entry=runner.get(req.params.id);
  if(entry.status==='NOT_FOUND')return reply.code(404).send({error:'estudo desconhecido'});
  if(entry.status==='NOT_COMPLETED')return reply.code(409).send({error:'estudo ainda não concluído'});
  return reply.code(entry.status==='READY'?200:202).send(entry);
 });
}
