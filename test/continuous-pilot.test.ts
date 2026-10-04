import test from 'node:test';
import assert from 'node:assert/strict';
import {AutonomousPerpetualCycle} from '../src/application/autonomous-perpetual-cycle.js';
import {PerpetualStudies} from '../src/application/perpetual-studies.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {MemoryStore} from '../src/domain/memory.js';
import {EventBus} from '../src/application/event-bus.js';
import {checkCloudConfiguration} from '../src/application/cloud-launch.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {eligibleStudyFixture} from './fixtures/perpetual-study.js';

const start=1700000000000;let clock=start;const now=()=>clock;
// Next funding far ahead so the multi-day clock jumps below do not cross a settlement.
const quote=(price:number)=>({instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:price,ask:price+0.1,markPrice:price,indexPrice:price,fundingRate:0,nextFundingTime:start+60*86400000,bookTime:clock,markTime:clock,receivedAt:clock});
const dataset=():PerpetualDataset=>{const closed=Math.floor(clock/3600000)*3600000-3600000;const trade=Array.from({length:100},(_,i)=>({timestamp:closed-(99-i)*3600000,open:100+i,high:100+i,low:100+i,close:100+i,volume:1}));return {instrument:'BINANCE_USDM:BTCUSDT',trade,mark:structuredClone(trade),funding:[]};};
async function setup(options:ConstructorParameters<typeof AutonomousPerpetualCycle>[11]={}){
 clock=start;const bus=new EventBus(),events:{type:string;payload:any}[]=[];bus.subscribe(e=>events.push(e));
 const book=new PerpetualPaperBook(bus,undefined,now);book.ensureEvaluation('nova',1000);const save=async()=>{};await book.synchronize(quote(199),[],save);
 let loads=0;const source={load:async()=>{loads++;return dataset();}};
 const studies=new PerpetualStudies(source,[eligibleStudyFixture(start)]);
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',studies,book,source,save,new MemoryStore(),bus,async()=>{},now,()=>true,options);
 return {book,cycle,events,save,loads:()=>loads,source};
}

test('a deployment that is not the approved release keeps the cycle disabled and says why',async()=>{
 const {cycle,book,loads}=await setup({blockedReason:'RELEASE_NOT_APPROVED'});
 await cycle.onMarket();assert.equal(loads(),0);assert.equal(book.list()[0].fills,0);
 assert.equal(cycle.status().enabled,false);assert.equal(cycle.status().blockedReason,'RELEASE_NOT_APPROVED');
});

test('pilot loss limit closes the open position through risk and halts new exposure',async()=>{
 const {cycle,book,events,save}=await setup();
 await book.propose('evaluation:nova:usdm','BUY',1,save);assert.equal(book.list()[0].portfolio.positions.length,1);
 clock+=1000;await book.synchronize(quote(165),[],save);// about -34 USDT on a 1000 endowment: beyond the 3% pilot limit
 await cycle.onMarket();
 const nova=book.list()[0];assert.equal(nova.portfolio.positions.length,0);assert.equal(nova.fills,2);assert.equal(book.status().halted,true);
 const stopped=events.filter(e=>e.type==='AUTONOMOUS_PILOT_STOPPED');assert.equal(stopped.length,1);assert.equal(stopped[0].payload.reason,'PILOT_LOSS_LIMIT');
 await cycle.onMarket();assert.equal(book.list()[0].fills,2,'no new exposure after the stop');assert.equal(events.filter(e=>e.type==='AUTONOMOUS_PILOT_STOPPED').length,1);
});

test('an expired or ineligible study ends the pilot by closing the position, without new exposure',async()=>{
 const {cycle,book,events,save,loads}=await setup();
 await book.propose('evaluation:nova:usdm','SELL',0.5,save);
 clock=start+8*86400000;await book.synchronize(quote(199),[],save);// evidence older than the 7-day screen limit
 await cycle.onMarket();
 assert.equal(book.list()[0].portfolio.positions.length,0);assert.equal(loads(),0,'no signal is computed for an ineligible study');
 assert.equal(events.find(e=>e.type==='AUTONOMOUS_PILOT_STOPPED')!.payload.reason,'STUDY_NOT_ELIGIBLE');assert.equal(book.status().halted,false);
});

test('a failed attempt backs off instead of retrying on every quote',async()=>{
 clock=start;const bus=new EventBus(),book=new PerpetualPaperBook(bus,undefined,now);book.ensureEvaluation('nova',1000);await book.synchronize(quote(199),[],async()=>{});
 let loads=0;const source={load:async()=>{loads++;throw Error('TEST_ONLY USD-M history HTTP 418');}};
 const cycle=new AutonomousPerpetualCycle(true,'controlled-study',new PerpetualStudies(source,[eligibleStudyFixture(start)]),book,source,async()=>{},new MemoryStore(),bus,async()=>{},now,()=>true,{retryDelayMs:300000});
 await assert.rejects(cycle.onMarket(),/418/);assert.equal(cycle.status().lastAttemptFailed,true);
 clock+=60000;await book.synchronize(quote(199),[],async()=>{});await cycle.onMarket();assert.equal(loads,1,'no retry inside the back-off window');
 clock+=241000;await book.synchronize(quote(199),[],async()=>{});await assert.rejects(cycle.onMarket(),/418/);assert.equal(loads,2);
 assert.throws(()=>new AutonomousPerpetualCycle(true,'x',new PerpetualStudies(source,[]),book,source,async()=>{},new MemoryStore(),bus,async()=>{},now,()=>true,{maxLossFraction:0.1}),/loss limit/);
});

test('only the explicit pilot phase may enable autonomy, with an explicit study and a pinned release',()=>{
 const base={NODE_ENV:'production',PAPER_TRADING_ONLY:'true',PUBLIC_ORIGIN:'https://example.test',APP_ACCESS_TOKEN:'x'.repeat(40),DATABASE_URL:'postgresql://u:p@db.example.test/lab',MARKET_SYMBOL:'btcusdt',INITIAL_PAPER_CAPITAL:'10000',EVALUATION_WALLETS_ENABLED:'true',EVALUATION_PAPER_CAPITAL:'1000',PERPETUAL_PAPER_ENABLED:'true',PAPER_EVALUATION_ENABLED:'false',LEGACY_PAPER_EXECUTION_ENABLED:'false'};
 const failed=(env:NodeJS.ProcessEnv)=>checkCloudConfiguration(env).filter(c=>!c.ok).map(c=>c.id);
 const pilot={...base,CLOUD_LAUNCH_PHASE:'CONTINUOUS_PAPER_PILOT',AUTONOMOUS_PERPETUAL_ENABLED:'true',AUTONOMOUS_STUDY_ID:'d674cb32-2ba0-4f9a-854e-9c1d4f656592',CONTINUOUS_RELEASE_COMMIT:'a'.repeat(40)};
 assert.deepEqual(failed(pilot),[]);
 assert.deepEqual(failed({...base,CLOUD_LAUNCH_PHASE:'CONTROLLED_PAPER',AUTONOMOUS_PERPETUAL_ENABLED:'false'}),[]);
 assert.ok(failed({...base,CLOUD_LAUNCH_PHASE:'CONTROLLED_PAPER',AUTONOMOUS_PERPETUAL_ENABLED:'true',AUTONOMOUS_STUDY_ID:pilot.AUTONOMOUS_STUDY_ID}).includes('AUTONOMOUS_PERPETUAL_ENABLED_MUST_BE_FALSE'));
 assert.ok(failed({...pilot,CONTINUOUS_RELEASE_COMMIT:undefined}).includes('PINNED_RELEASE_COMMIT'));
 assert.ok(failed({...pilot,AUTONOMOUS_STUDY_ID:'latest'}).includes('EXPLICIT_PILOT_STUDY'));
 assert.ok(failed({...pilot,AUTONOMOUS_PERPETUAL_ENABLED:'false'}).includes('AUTONOMOUS_PERPETUAL_ENABLED_MUST_BE_TRUE'));
 assert.ok(failed({...pilot,PILOT_MAX_LOSS:'0.2'}).includes('VALID_PILOT_LOSS_LIMIT'));
 assert.ok(failed({...pilot,LEGACY_PAPER_EXECUTION_ENABLED:'true'}).includes('LEGACY_PAPER_EXECUTION_ENABLED_MUST_BE_FALSE'));
});
