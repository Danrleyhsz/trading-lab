// TEST_ONLY accelerated team drill. Replays real recorded USD-M candles hour by hour through the production
// cycle, paper book, deterministic risk and team briefing, entirely in memory. It never opens a database,
// never calls an exchange and never touches production. Study eligibility is stubbed (it is verified live
// by the screen); the drill checks the team pipeline, not strategy quality.
// Usage: STUDY_FILE=study.json [HOURS=336] [REPORT_PATH=drill.json] npm run team-drill
import {readFile,writeFile} from 'node:fs/promises';
import {AutonomousPerpetualCycle} from './application/autonomous-perpetual-cycle.js';
import {PerpetualPaperBook} from './application/perpetual-paper-book.js';
import {EventBus} from './application/event-bus.js';
import {PilotTeamBriefing} from './application/pilot-team-briefing.js';
import {AgentMessageBus} from './domain/agent-messages.js';
import {MemoryStore} from './domain/memory.js';
import {TeamPredictions,scorecard} from './application/team-predictions.js';
import type {PerpetualStudy,PerpetualStudies} from './application/perpetual-studies.js';
import type {PerpetualDataset} from './domain/perpetual-backtest.js';

const hour=3600000;
const study=JSON.parse(await readFile(process.env.STUDY_FILE??'',"utf8")) as PerpetualStudy;
const full=study.dataset!,hours=Number(process.env.HOURS??336);
if(!full||!study.result||!(hours>0&&hours<full.trade.length-500))throw Error('STUDY_FILE must be a full study record with dataset and result; HOURS must leave 500 bars of history');
const startIndex=full.trade.length-hours;
let clock=full.trade[startIndex-1].timestamp+hour+60000;const now=()=>clock;
const teamMemories=new MemoryStore(),bus=new EventBus(),messages=new AgentMessageBus(),team=new PilotTeamBriefing(messages,new TeamPredictions(teamMemories)),events:{type:string;payload:any;at:number}[]=[];
bus.subscribe(e=>{events.push({type:e.type,payload:e.payload,at:clock});if(e.type==='RISK_APPROVED'||e.type==='RISK_REJECTED')team.riskReview(e.type==='RISK_APPROVED',e.payload as never);});
const book=new PerpetualPaperBook(bus,undefined,now);book.ensureEvaluation('nova',1000);
const save=async()=>{};
const closedSlice=(count:number):PerpetualDataset=>{const end=full.trade.findIndex(c=>c.timestamp>clock-hour);const stop=end<0?full.trade.length:end;const trade=full.trade.slice(Math.max(0,stop-count),stop),mark=full.mark.slice(Math.max(0,stop-count),stop);return {instrument:full.instrument,trade,mark,funding:full.funding.filter(f=>f.timestamp>=trade[0].timestamp&&f.timestamp<trade.at(-1)!.timestamp+hour)};};
const source={load:async(count:number)=>closedSlice(count)};
// TEST_ONLY eligibility stub: the live screen remains the only authority for the real pilot.
const studies={screen:()=>({eligible:true,reason:'TEST_ONLY drill stub',policyVersion:'TEST_ONLY',checks:[],evidence:{}}),get:()=>study} as unknown as PerpetualStudies;
const cycle=new AutonomousPerpetualCycle(true,study.id,studies,book,source,save,new MemoryStore(),bus,async()=>{},now,()=>true,{retryDelayMs:0,onDecision:context=>team.brief(context)});
const quoteAt=(i:number)=>{const c=full.trade[i],m=full.mark[i],next=full.funding.find(f=>f.timestamp>clock)?.timestamp??clock+8*hour;const last=[...full.funding].reverse().find(f=>f.timestamp<=clock);return {instrument:'BINANCE_USDM:BTCUSDT' as const,symbol:'BTCUSDT' as const,bid:c.close-0.05,ask:c.close+0.05,markPrice:m.close,indexPrice:m.close,fundingRate:last?.rate??0,nextFundingTime:next,bookTime:clock,markTime:clock,receivedAt:clock};};
const failures:string[]=[];
for(let i=startIndex-1;i<full.trade.length;i++){
 clock=full.trade[i].timestamp+hour+60000;
 const quote=quoteAt(i);const settlements=book.fundingDue(quote.markTime)?full.funding.filter(f=>f.timestamp>book.cursor()&&f.timestamp<=quote.markTime).map(f=>({instrument:'BINANCE_USDM:BTCUSDT' as const,...f})):[];
 await book.synchronize(quote,settlements,save);
 await cycle.onMarket().catch(error=>failures.push(`${new Date(clock).toISOString()} ${error instanceof Error?error.message:error}`));
}
const nova=book.list()[0],sent=messages.list();
const byAgent=Object.fromEntries(['satoshi','vega','flux','oracle','nova','sentinel'].map(a=>[a,sent.filter(m=>m.from===a).length]));
const decisions=events.filter(e=>e.type==='AUTONOMOUS_DECISION').map(e=>({candle:new Date(e.payload.candleTimestamp).toISOString(),direction:e.payload.direction}));
const report={scope:'TEST_ONLY_ACCELERATED_TEAM_DRILL',studyId:study.id,replayedHours:hours,from:new Date(full.trade[startIndex].timestamp).toISOString(),to:new Date(full.trade.at(-1)!.timestamp).toISOString(),
 decisions:decisions.length,directionChanges:decisions.filter((d,i)=>i>0&&d.direction!==decisions[i-1].direction).length,messagesByAgent:byAgent,
 riskApproved:events.filter(e=>e.type==='RISK_APPROVED').length,riskRejected:events.filter(e=>e.type==='RISK_REJECTED').length,fills:nova.fills,fundingSettlements:events.filter(e=>e.type==='FUNDING_SETTLED').length,
 pilotStops:events.filter(e=>e.type==='AUTONOMOUS_PILOT_STOPPED').map(e=>e.payload.reason),finalEquity:nova.portfolio.equity,openPositions:nova.portfolio.positions,failures,
 firstDecisionConversation:sent.filter(m=>m.context?.decisionEventId===events.find(e=>e.type==='AUTONOMOUS_DECISION')?.payload&&true).slice(0,0),
 sampleConversation:sent.slice(0,7).map(m=>({from:m.from,to:m.to,kind:m.kind,summary:m.summary})),
 // Placar das previsões da equipe no replay (TEST_ONLY: os dados se sobrepõem ao treino do estudo).
 teamScorecard:scorecard(teamMemories.query()).map(s=>({agentId:s.agentId,settled:s.settled,hits:s.hits,hitRate:s.hitRate})),
 tradeConversations:sent.filter(m=>m.from==='sentinel').slice(0,6).map(m=>({from:m.from,summary:m.summary}))};
delete (report as Record<string,unknown>).firstDecisionConversation;
if(process.env.REPORT_PATH)await writeFile(process.env.REPORT_PATH,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
