import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {PerpetualStudies,registerPerpetualStudies,studyConfigHash,studyProvenanceCheck,STUDY_SIMULATOR_MODEL,type PerpetualStudy} from '../src/application/perpetual-studies.js';
import {assertHistoricalStudiesAppendOnly} from '../src/infrastructure/historical-study-guard.js';
import {AgentRegistry} from '../src/domain/agents.js';
import {AgentCoordinator} from '../src/application/agent-coordinator.js';
import {EventBus} from '../src/application/event-bus.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';

const data=(n:number):PerpetualDataset=>{const trade=Array.from({length:n},(_,i)=>({timestamp:i*3600000,open:100+Math.sin(i/9)*5,high:106,low:94,close:100+Math.sin((i+1)/9)*5,volume:1}));return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]};};
const release={codeCommit:'a'.repeat(40),backendFingerprint:'b'.repeat(64)};
async function run(source:{load(count:number):Promise<PerpetualDataset>},payload:Record<string,unknown>){
 const bus=new EventBus(),coordinator=new AgentCoordinator(new AgentRegistry(),bus),studies=new PerpetualStudies(source,[],undefined,release),app=Fastify();
 registerPerpetualStudies(app,studies,async()=>{},coordinator,bus);
 try{const response=await app.inject({method:'POST',url:'/backtests/v2/studies',payload});assert.equal(response.statusCode,202);
  for(let i=0;i<200&&['QUEUED','RUNNING'].includes(studies.get(response.json().id)!.status);i++)await new Promise(resolve=>setTimeout(resolve,10));
  return {studies,study:studies.get(response.json().id)!,detail:(await app.inject({method:'GET',url:`/backtests/v2/studies/${response.json().id}`})).json()};}
 finally{await app.close();}
}

test('estudo novo grava commit, impressão digital do backend, hash da configuração e versão do simulador',async()=>{
 // O conjunto de tendência precisa de janela de treino maior que o aquecimento de 480 velas.
 const {study,detail}=await run({load:async()=>data(1200)},{bars:1200,trainBars:600,testBars:200,candidateSet:'MULTI_DAY_TREND_V1'});
 assert.equal(study.status,'COMPLETED');
 assert.deepEqual(study.provenance,{version:'STUDY_PROVENANCE_V1',...release,candidateSet:'MULTI_DAY_TREND_V1',configSha256:studyConfigHash(study.request).configSha256,simulatorModel:STUDY_SIMULATOR_MODEL});
 assert.equal(study.result!.model,study.provenance!.simulatorModel,'a versão gravada é a do simulador que de fato rodou');
 assert.deepEqual(detail.provenance,study.provenance,'a proveniência aparece no detalhe do estudo');
 assert.deepEqual(studyProvenanceCheck(study),{recorded:true,configMatchesCurrentCode:true,currentConfigSha256:study.provenance!.configSha256});
});

test('estudo que falha ao baixar dados também tem proveniência (gravada antes da fonte)',async()=>{
 const {study}=await run({load:async()=>{throw new Error('source unavailable');}},{bars:300,trainBars:100,testBars:50});
 assert.equal(study.status,'FAILED');assert.equal(study.provenance!.candidateSet,'SHORT_HORIZON_V1','sem conjunto declarado vale o original');assert.equal(study.provenance!.codeCommit,release.codeCommit);
});

test('hash da configuração: muda com janelas, conjunto ou parâmetros; não muda com a ordem das chaves',()=>{
 const a=studyConfigHash({bars:1000,trainBars:400,testBars:100}).configSha256;
 assert.equal(studyConfigHash({testBars:100,trainBars:400,bars:1000}).configSha256,a);
 assert.equal(studyConfigHash({bars:1000,trainBars:400,testBars:100,candidateSet:'SHORT_HORIZON_V1'}).configSha256,a,'conjunto omitido = conjunto original');
 assert.notEqual(studyConfigHash({bars:1000,trainBars:400,testBars:50}).configSha256,a);
 assert.notEqual(studyConfigHash({bars:1000,trainBars:400,testBars:100,candidateSet:'BREAKOUT_480_CONTROL_V1'}).configSha256,a);
 // Uma configuração gravada que não bate com o código atual é apontada (conjunto editado no lugar, por exemplo).
 const edited:PerpetualStudy={id:'x',status:'COMPLETED',createdAt:'2026-10-06',request:{bars:1000,trainBars:400,testBars:100},provenance:{version:'STUDY_PROVENANCE_V1',codeCommit:null,backendFingerprint:null,candidateSet:'SHORT_HORIZON_V1',configSha256:'0'.repeat(64),simulatorModel:STUDY_SIMULATOR_MODEL}};
 assert.equal(studyProvenanceCheck(edited).recorded&&studyProvenanceCheck(edited).configMatchesCurrentCode,false);
});

test('estudos antigos sem proveniência continuam legíveis e não são reescritos; proveniência gravada não pode mudar',()=>{
 const old:PerpetualStudy={id:'old',status:'FAILED',createdAt:'2026-01-01',request:{bars:300,trainBars:100,testBars:50},error:'x',completedAt:'2026-01-01'};
 const studies=new PerpetualStudies({load:async()=>data(300)},[old]);
 assert.equal(studies.get('old')!.provenance,undefined);assert.deepEqual(studyProvenanceCheck(studies.get('old')!),{recorded:false});
 assert.doesNotThrow(()=>assertHistoricalStudiesAppendOnly([old],[old]));
 const recorded:PerpetualStudy={id:'new',status:'QUEUED',createdAt:'2026-10-06',request:{bars:300,trainBars:100,testBars:50},provenance:{version:'STUDY_PROVENANCE_V1',...release,...studyConfigHash({bars:300,trainBars:100,testBars:50}),simulatorModel:STUDY_SIMULATOR_MODEL}};
 assert.doesNotThrow(()=>assertHistoricalStudiesAppendOnly([recorded],[{...recorded,status:'RUNNING'}]));
 assert.throws(()=>assertHistoricalStudiesAppendOnly([recorded],[{...recorded,provenance:{...recorded.provenance!,codeCommit:'c'.repeat(40)}}]),/provenance rewrite/);
 assert.throws(()=>assertHistoricalStudiesAppendOnly([recorded],[{...recorded,provenance:undefined}]),/provenance rewrite/);
});

test('sem identidade de versão (desenvolvimento local), o estudo grava commit e impressão digital nulos, nunca inventados',async()=>{
 const bus=new EventBus(),coordinator=new AgentCoordinator(new AgentRegistry(),bus),studies=new PerpetualStudies({load:async()=>{throw new Error('offline');}});
 const study=await studies.start({bars:300,trainBars:100,testBars:50},async()=>{},coordinator,bus);
 assert.equal(study.provenance!.codeCommit,null);assert.equal(study.provenance!.backendFingerprint,null);assert.match(study.provenance!.configSha256,/^[0-9a-f]{64}$/);
 await studies.drain();
});

test('estudos offline: o relatório registra o commit e se a árvore tinha alterações não commitadas',async()=>{
 const {scriptProvenance}=await import('../scripts/estudos/proveniencia.js');
 const p=scriptProvenance('scripts/estudos/momentum.ts');
 assert.equal(p.version,'SCRIPT_PROVENANCE_V1');assert.equal(p.script,'scripts/estudos/momentum.ts');assert.match(p.node,/^v\d+/);
 assert.ok(p.codeCommit===null||/^[0-9a-f]{40}$/.test(p.codeCommit));
 assert.ok(p.workingTreeClean===null||(p.workingTreeClean===(p.uncommittedFiles.length===0)),'limpa só quando não há arquivo alterado');
});
