import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {checkCloudConfiguration, checkCloudRuntime, verifyCloudService} from '../src/application/cloud-launch.js';
import {registerAccessControl} from '../src/application/access-control.js';
import {RuntimeReadiness, type RuntimeInputs} from '../src/application/runtime-readiness.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {AiAnalysis} from '../src/application/ai-analysis.js';
import {PostgresStateStore} from '../src/infrastructure/postgres-state-store.js';

// TEST_ONLY: isolated fixture data; no provider, database, network or product writes.
const token = 'TEST_ONLY-random-fixture-code-at-least-32-characters';
const origin = 'https://cloud.example.test';
const time = Date.parse('2026-10-03T20:00:00Z');
const configuration = (): NodeJS.ProcessEnv => ({NODE_ENV:'production',PAPER_TRADING_ONLY:'true',PUBLIC_ORIGIN:origin,APP_ACCESS_TOKEN:token,DATABASE_URL:'postgresql://fixture:SECRET_TEST_ONLY@db.example.test/tradinglab',MARKET_SYMBOL:'btcusdt',INITIAL_PAPER_CAPITAL:'10000',PAPER_EVALUATION_ENABLED:'false',PERPETUAL_PAPER_ENABLED:'false',AUTONOMOUS_PERPETUAL_ENABLED:'false',LEGACY_PAPER_EXECUTION_ENABLED:'false'});
function diagnosis() {
    const runtime = new RuntimeReadiness({production:true,storage:'POSTGRESQL',protectedAccess:true,httpsOrigin:true,storageAvailable:()=>true},()=>time);
    runtime.writeQueued();runtime.writeSucceeded();runtime.serving();
    const book = new PerpetualPaperBook(new EventBus(),undefined,()=>time);
    const input: RuntimeInputs = {spot:{symbol:'BTCUSDT',price:100,timestamp:time,exchange:'TEST_ONLY'},perpetual:{status:'HEALTHY',quote:{instrument:'BINANCE_USDM:BTCUSDT',symbol:'BTCUSDT',bid:100,ask:101,markPrice:100,indexPrice:100,fundingRate:0,nextFundingTime:time+28800000,bookTime:time,markTime:time,receivedAt:time},consecutiveFailures:0},book:book.status(),autonomous:{enabled:false,studyId:null,busy:false,error:null,eligible:false,reason:'completed V2 study required',accountId:'evaluation:nova:usdm',lastProcessedCandle:null},research:{busy:false,accepting:true},historical:{busy:false,accepting:true,persistenceFailed:false,activeTasks:0,interruptedStudies:0},ai:new AiAnalysis(async()=>{},[],undefined,undefined,()=>time).status(),legacyExecutionEnabled:false,evaluationEnabled:false,perpetualEnabled:false};
    return runtime.snapshot(input);
}
test('first-publication config rejects accidental capabilities and TLS weakening without revealing secrets',()=>{
    assert.ok(checkCloudConfiguration(configuration()).every(c=>c.ok));
    for(const changed of [
        {NODE_ENV:'development'}, {PAPER_TRADING_ONLY:'false'}, {APP_ACCESS_TOKEN:'short'},
        {DATABASE_URL:'https://fixture:SECRET_TEST_ONLY@db.example.test/tradinglab'},
        {DATABASE_URL:'postgres://fixture:SECRET_TEST_ONLY@dpg-internal/tradinglab'},
        {DATABASE_URL:'postgres://fixture:SECRET_TEST_ONLY@db.example.test/tradinglab?sslmode=require'},
        {DATABASE_URL:'postgres://fixture:SECRET_TEST_ONLY@db.example.test/tradinglab?host=dpg-internal'},
        {DATABASE_URL:''}, {NODE_TLS_REJECT_UNAUTHORIZED:'0'},
        {PAPER_EVALUATION_ENABLED:'true'}, {PERPETUAL_PAPER_ENABLED:'true'},
        {AUTONOMOUS_PERPETUAL_ENABLED:'true'}, {LEGACY_PAPER_EXECUTION_ENABLED:'true'},
        {LEGACY_PAPER_EXECUTION_ENABLED:undefined}, {AUTONOMOUS_STUDY_ID:'fixture-study'},
        {AI_PROVIDER_API_KEY:'SECRET_TEST_ONLY'}, {BINANCE_API_SECRET:'SECRET_TEST_ONLY'},
        {MARKET_SYMBOL:'ethusdt'}, {INITIAL_PAPER_CAPITAL:'NaN'}, {PORT:'65536'}, {PORT:'0'},
    ]) {
        const report=checkCloudConfiguration({...configuration(),...changed});
        assert.ok(report.some(c=>!c.ok),JSON.stringify(Object.keys(changed)));
        assert.ok(!JSON.stringify(report).includes('SECRET_TEST_ONLY'));
    }
});
test('malformed production database URL errors cannot expose the raw credential input',()=>{
    assert.throws(()=>new PostgresStateStore('INVALID_SECRET_TEST_ONLY',true),(error:unknown)=>{
        const message=error as Error;assert.equal(message.message,'invalid PostgreSQL connection configuration');
        assert.ok(!JSON.stringify(message).includes('INVALID_SECRET_TEST_ONLY'));
        assert.ok(!message.stack?.includes('INVALID_SECRET_TEST_ONLY'));return true;
    });
});
test('production rejects malformed, credential-bearing and path-bearing HTTPS origins before opening storage',async()=>{
    for(const invalid of ['https://','https://user:SECRET_TEST_ONLY@example.test','https://example.test/office/index.html','https://example.test/','https://example.test?secret=value','https://example.test#fragment','http://example.test',' https://example.test']) {
        const app=Fastify();
        try {assert.throws(()=>registerAccessControl(app,token,true,invalid),/exact HTTPS origin/);assert.ok(checkCloudConfiguration({...configuration(),PUBLIC_ORIGIN:invalid}).some(c=>!c.ok));}
        finally {await app.close();}
    }
    const app=Fastify();try{assert.doesNotThrow(()=>registerAccessControl(app,token,true,'https://cloud.example.test:8443'));}finally{await app.close();}
});
test('first-publication smoke accepts the real runtime projection without claiming risk approval or backup verification',()=>{
    const d=diagnosis();
    assert.ok(checkCloudRuntime(d,time).every(c=>c.ok));
    assert.equal(d.paper.newExposure.ready,false);
    assert.equal(d.hostingVerification,'NOT_PERFORMED_BY_RUNTIME');
});
test('smoke rejects stale observations, source outages, JSON storage and accidentally enabled work',()=>{
    for(const mutate of [
        (d:ReturnType<typeof diagnosis>)=>{d.observedAt=new Date(time-60001).toISOString();},
        (d:ReturnType<typeof diagnosis>)=>{d.market.spot.receivedAt=time-60001;},
        (d:ReturnType<typeof diagnosis>)=>{d.market.perpetual.receivedAt=time-15001;},
        (d:ReturnType<typeof diagnosis>)=>{d.market.perpetual.status='UNAVAILABLE';},
        (d:ReturnType<typeof diagnosis>)=>{d.storage.kind='JSON_DEVELOPMENT';},
        (d:ReturnType<typeof diagnosis>)=>{d.storage.persistenceFailed=true;},
        (d:ReturnType<typeof diagnosis>)=>{d.paper.evaluationEnabled=true;},
        (d:ReturnType<typeof diagnosis>)=>{d.paper.submission.reasons=[];},
        (d:ReturnType<typeof diagnosis>)=>{d.paper.autonomous.reasons=[];},
        (d:ReturnType<typeof diagnosis>)=>{d.ai.providerConfigured=true;},
    ]){const d=diagnosis();mutate(d);assert.ok(checkCloudRuntime(d,time).some(c=>!c.ok));}
    for(const invalid of [undefined,null,{},[],{observedAt:'invented'}])assert.ok(checkCloudRuntime(invalid,time).some(c=>!c.ok));
});
test('service smoke uses only bounded same-origin GET requests and never sends the access code through a redirect',async()=>{
    const calls:{url:URL;options:RequestInit}[]=[];
    const request:typeof fetch=async(url,options)=>{
        const target=new URL(String(url));calls.push({url:target,options:options!});
        if(target.pathname==='/office/index.html')return new Response('<html>TEST_ONLY</html>',{headers:{'content-type':'text/html'}});
        if(target.pathname==='/runtime/readiness')return options?.headers&&'authorization' in options.headers ? Response.json(diagnosis()) : Response.json({error:'access required'},{status:401});
        return Response.json({ok:true,mode:'PAPER_TRADING'});
    };
    assert.ok((await verifyCloudService(origin,token,request,()=>time)).every(c=>c.ok));
    assert.equal(calls.length,5);
    assert.ok(calls.every(c=>c.url.origin===origin&&c.options.method==='GET'&&c.options.redirect==='manual'&&c.options.signal));
    assert.equal(calls.filter(c=>JSON.stringify(c.options.headers).includes(token)).length,1);
    const redirected:typeof fetch=async()=>new Response(null,{status:302,headers:{location:'https://evil.example.test'}});
    assert.ok((await verifyCloudService(origin,token,redirected)).some(c=>!c.ok));
});
test('smoke sanitizes raw transport errors, rejects oversized JSON and performs no requests with an invalid origin',async()=>{
    let calls=0;
    const failing:typeof fetch=async()=>{calls++;throw Error(token+' SECRET_TEST_ONLY');};
    const report=await verifyCloudService(origin,token,failing);
    assert.equal(calls,1);assert.ok(report.some(c=>!c.ok));assert.ok(!JSON.stringify(report).includes(token));
    await verifyCloudService(origin+'/path',token,failing);assert.equal(calls,1);
    const huge:typeof fetch=async()=>Response.json({padding:'x'.repeat(131073)});
    assert.ok((await verifyCloudService(origin,token,huge)).some(c=>c.id==='SERVICE_VERIFICATION_FAILED'&&!c.ok));
});
