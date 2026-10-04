import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {screenPerpetualStudy} from '../src/application/perpetual-study-screen.js';
import {studyEligibility,AutonomousPerpetualCycle} from '../src/application/autonomous-perpetual-cycle.js';
import {continuousPaperPreflight,registerContinuousPaperPreflight} from '../src/application/continuous-paper-preflight.js';
import {PerpetualStudies,type PerpetualStudy} from '../src/application/perpetual-studies.js';
import {RuntimeReadiness,type RuntimeInputs} from '../src/application/runtime-readiness.js';
import {registerAccessControl} from '../src/application/access-control.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {MemoryStore} from '../src/domain/memory.js';
import {AiAnalysis} from '../src/application/ai-analysis.js';
import {eligibleStudyFixture} from './fixtures/perpetual-study.js';
const now=Date.parse('2026-10-04T11:00:00Z');
const source={load:async()=>{throw Error('TEST_ONLY unexpected source retrieval');}};

test('screen exposes unchanged negative OOS result and does not approve account work',()=>{
    const study=eligibleStudyFixture(now);study.result!.netPnl=-131.51;study.result!.folds.forEach(f=>f.result.netPnl=-131.51/6);
    const original=structuredClone(study),screen=screenPerpetualStudy(study,now);
    assert.equal(screen.eligible,false);assert.equal(screen.evidence.netPnl,-131.51);
    assert.ok(screen.checks.some(c=>c.id==='POSITIVE_RECONCILED_OOS_PNL'&&!c.ok));
    assert.deepEqual(study,original);assert.equal(studyEligibility(study,now).eligible,false);
});
test('NaN/future/missing dates, corrupted hashes/windows, costs and invalid counts fail closed',()=>{
    const changes:Array<(s:PerpetualStudy)=>void>=[
        s=>{s.completedAt='invalid';},s=>{s.completedAt=new Date(now+1).toISOString();},s=>{s.result!.folds[5].testEnd=NaN;},
        s=>{s.result!.folds[5].testEnd=now;},s=>{s.result!.folds[5].testEnd-=8*86400000;},
        s=>{s.dataset!.trade[0].volume=2;},s=>{s.datasetHash='forged';},s=>{delete s.dataset;},s=>{s.dataset!.trade=undefined as any;},s=>{s.dataset!.trade=null as any;},
        s=>{s.result!.folds[1].testStart=s.result!.folds[0].testStart;},
        s=>{s.result!.folds[0].configuration.fastPeriod=0;},s=>{s.result!.folds[0].configuration.feeRate=0;},
        s=>{s.result!.folds[0].configuration.strategy='UNKNOWN' as any;},s=>{s.result!.folds[0].configuration.slowPeriod=5001;},
        s=>{s.result!.folds[0].result.trades=-1;},s=>{s.result!.folds[0].result.liquidations=-1;},
        s=>{s.result!.folds[0].result.maxDrawdown=-0.1;},s=>{s.result!.folds[0].result.netPnl=NaN;},
        s=>{s.result!.netPnl=101;},s=>{s.result!.folds[0]=null as any;},s=>{s.result!.folds=null as any;},
    ];
    assert.equal(screenPerpetualStudy(eligibleStudyFixture(now),now).eligible,true);
    for(const mutate of changes){const study=eligibleStudyFixture(now);mutate(study);assert.equal(screenPerpetualStudy(study,now).eligible,false);assert.equal(studyEligibility(study,now).eligible,false);}
    assert.equal(screenPerpetualStudy(undefined,now).eligible,false);
    assert.equal(screenPerpetualStudy(eligibleStudyFixture(now),NaN).eligible,false);
    assert.equal(screenPerpetualStudy(eligibleStudyFixture(now),now+7*86400000).eligible,true);
    assert.equal(screenPerpetualStudy(eligibleStudyFixture(now),now+7*86400000+1).eligible,false);
});
test('malformed study cannot retrieve a signal, persist a cursor or emit a fill/memory',async()=>{
    const study=eligibleStudyFixture(now);study.result!.folds[5].testEnd=NaN;
    const bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,()=>now),memories=new MemoryStore();book.ensureEvaluation('nova',1000);
    await book.synchronize({instrument:'BINANCE_USDM:BTCUSDT',symbol:'BTCUSDT',bid:100,ask:101,markPrice:100,indexPrice:100,fundingRate:0,nextFundingTime:now+28800000,bookTime:now,markTime:now,receivedAt:now},[],async()=>{});
    let saved=0;const cycle=new AutonomousPerpetualCycle(true,study.id,new PerpetualStudies(source,[study]),book,source,async()=>{saved++;},memories,bus,async()=>{saved++;},()=>now);
    await cycle.onMarket();assert.equal(saved,0);assert.equal(book.status().autonomousCursor,null);assert.equal(book.list()[0].fills,0);assert.equal(memories.list().length,0);
});
async function diagnosis() {
    const runtime=new RuntimeReadiness({production:true,storage:'POSTGRESQL',protectedAccess:true,httpsOrigin:true,storageAvailable:()=>true},()=>now);
    runtime.writeQueued();runtime.writeSucceeded();runtime.serving();
    const book=new PerpetualPaperBook(new EventBus(),undefined,()=>now);book.ensureEvaluation('nova',1000);
    const quote={instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:100,ask:101,markPrice:100,indexPrice:100,fundingRate:0,nextFundingTime:now+28800000,bookTime:now,markTime:now,receivedAt:now};await book.synchronize(quote,[],async()=>{});
    const input:RuntimeInputs={spot:null,perpetual:{status:'HEALTHY',quote,consecutiveFailures:0},book:book.status(),autonomous:{enabled:false,studyId:null,busy:false,error:null,eligible:false,reason:'TEST_ONLY',accountId:'evaluation:nova:usdm',lastProcessedCandle:null},research:{busy:false,accepting:true},historical:{busy:false,accepting:true,persistenceFailed:false,activeTasks:0,interruptedStudies:0},ai:new AiAnalysis(async()=>{}).status(),legacyExecutionEnabled:false,evaluationEnabled:false,perpetualEnabled:true};
    return runtime.snapshot(input);
}
test('eligible candidates never select themselves or certify external backups/alerts',async()=>{
    const studies=new PerpetualStudies(source,[eligibleStudyFixture(now)]),report=await diagnosis();
    const preflight=continuousPaperPreflight(studies,report,now);
    assert.equal(preflight.studies[0].eligible,true);assert.equal(preflight.configuredStudyId,null);assert.equal(preflight.runtimePrerequisites.ready,false);assert.equal(preflight.activationReady,false);assert.equal(preflight.cycleEnabled,false);
    assert.ok(preflight.runtimePrerequisites.reasons.includes('EXPLICIT_STUDY_REQUIRED'));
    report.paper.autonomousStudyId='controlled-study';
    const configured=continuousPaperPreflight(studies,report,now);assert.equal(configured.runtimePrerequisites.ready,true);assert.equal(configured.activationReady,false);assert.equal(configured.unverified.length,3);
    report.paper.newExposure.reasons.push('NEW_EXPOSURE_HALTED');assert.equal(continuousPaperPreflight(studies,report,now).runtimePrerequisites.ready,false);
    report.paper.newExposure.reasons=[];report.ai.enabled=true;assert.ok(continuousPaperPreflight(studies,report,now).runtimePrerequisites.reasons.includes('PAID_AI_OUTSIDE_ROLLOUT'));
});
test('trade and drawdown boundaries remain fixed without requiring every fold to be profitable',()=>{
    const study=eligibleStudyFixture(now);study.result!.folds.forEach((f,i)=>{f.result.trades=i===0?10:0;f.result.maxDrawdown=0.15;f.result.netPnl=i===0?-5:21;});
    assert.equal(screenPerpetualStudy(study,now).eligible,true);
    study.result!.folds[0].result.trades=9;assert.equal(screenPerpetualStudy(study,now).eligible,false);
    study.result!.folds[0].result.trades=10;study.result!.folds[0].result.maxDrawdown=0.150001;assert.equal(screenPerpetualStudy(study,now).eligible,false);
});
test('cached immutable screens recheck clock expiry/rollback and cannot be tainted by returned copies',()=>{
    const study=eligibleStudyFixture(now),studies=new PerpetualStudies(source,[study]);assert.equal(studies.screen(study.id,now).eligible,true);
    const copy=studies.screen(study.id,now);copy.eligible=false;copy.checks[0].ok=false;copy.evidence.netPnl=99999;
    studies.get(study.id)!.dataset!.trade[0].volume=999;
    assert.equal(studies.screen(study.id,now).eligible,true);assert.equal(studies.screen(study.id,now).evidence.netPnl,100);
    assert.equal(studies.screen(study.id,now+7*86400000+1).eligible,false);assert.equal(studies.screen(study.id,now-1).eligible,false);assert.equal(studies.screen(study.id,now).eligible,true);
});
test('bounded authenticated read includes configured original outside recent window and has no mutation endpoint',async()=>{
    const entries=Array.from({length:25},(_,i)=>({...eligibleStudyFixture(now),id:'TEST_ONLY_'+i})),studies=new PerpetualStudies(source,entries),report=await diagnosis();report.paper.autonomousStudyId=entries[0].id;
    const original=studies.list(),token='TEST_ONLY_PREFLIGHT_TOKEN_12345678901234567890',app=Fastify();registerAccessControl(app,token,true,'https://example.test');registerContinuousPaperPreflight(app,studies,()=>report,()=>now);
    try {
        assert.equal((await app.inject('/paper/perpetual/preflight')).statusCode,401);
        const response=await app.inject({url:'/paper/perpetual/preflight',headers:{authorization:'Bearer '+token}});
        const body=response.json();assert.equal(response.statusCode,200);assert.equal(body.studies.length,21);assert.equal(body.studies[0].studyId,entries[0].id);assert.equal(body.studies[0].configured,true);
        assert.doesNotMatch(response.body,/TEST_ONLY_PREFLIGHT_TOKEN|signalDataset|"trade":/);
        assert.equal((await app.inject({method:'POST',url:'/paper/perpetual/preflight',headers:{authorization:'Bearer '+token},payload:{enabled:true}})).statusCode,404);
        assert.deepEqual(studies.list(),original);
    }finally{await app.close();}
});
