import {perpetualDirection,teamFilterWarmup,protectionsAllowEntry} from '../domain/perpetual-signals.js';
import {validatePerpetualDataset,type PerpetualDataset} from '../domain/perpetual-backtest.js';
import type {PerpetualStudies,PerpetualStudy} from './perpetual-studies.js';
import type {PerpetualPaperBook,PerpetualBookState} from './perpetual-paper-book.js';
import type {MemoryStore} from '../domain/memory.js';
import type {EventBus} from './event-bus.js';
import {event} from '../domain/events.js';
import {screenPerpetualStudy} from './perpetual-study-screen.js';
import type {PilotDecisionContext} from './pilot-team-briefing.js';
export function studyEligibility(study:PerpetualStudy|undefined,now=Date.now()){
 const {eligible,reason}=screenPerpetualStudy(study,now);return {eligible,reason};
}
export interface PilotOptions {
 /** Set when the deployment is not the owner-approved release; the cycle stays disabled and says why. */
 blockedReason?:string|null;
 /** Pre-declared pilot stop: close the position and halt new exposure once equity falls this fraction below the endowment. */
 maxLossFraction?:number;
 /** Back-off after a failed attempt so an outage never turns into a request loop. */
 retryDelayMs?:number;
 /** Team briefing hook; it never affects the decision and its failures are contained. */
 onDecision?:(context:PilotDecisionContext)=>void;
}
export class AutonomousPerpetualCycle {
 private busy=false;private error:string|null=null;private nextAttemptAt=0;private stopReason:string|null=null;private lastAttemptFailed=false;
 private readonly blockedReason:string|null;private readonly maxLossFraction:number;private readonly retryDelayMs:number;private readonly onDecision?:(context:PilotDecisionContext)=>void;
 constructor(private enabled:boolean,private studyId:string,private studies:PerpetualStudies,private book:PerpetualPaperBook,private source:{load(count:number):Promise<PerpetualDataset>},private save:(state:PerpetualBookState)=>Promise<void>,private memories:MemoryStore,private bus:EventBus,private persist:()=>Promise<void>,private now:()=>number=Date.now,private canContinue:()=>boolean=()=>true,options:PilotOptions={}){
  this.blockedReason=options.blockedReason??null;this.maxLossFraction=options.maxLossFraction??0.03;this.retryDelayMs=options.retryDelayMs??300000;this.onDecision=options.onDecision;
  if(!(this.maxLossFraction>0&&this.maxLossFraction<0.1))throw Error('pilot loss limit must be between 0 and the 10% risk drawdown limit');
 }
 private active(){return this.enabled&&!this.blockedReason;}
 status(){const {eligible,reason}=this.studies.screen(this.studyId,this.now());return {enabled:this.active(),studyId:this.studyId||null,busy:this.busy,error:this.error,eligible,reason,accountId:'evaluation:nova:usdm',lastProcessedCandle:this.book.status().autonomousCursor,blockedReason:this.blockedReason,stopReason:this.stopReason,maxLossFraction:this.maxLossFraction,lastAttemptFailed:this.lastAttemptFailed,nextAttemptAt:this.nextAttemptAt>this.now()?this.nextAttemptAt:null};}
 private sourcesReady(){const status=this.book.status();return this.canContinue()&&!status.persistenceFailed&&status.marketReady&&status.fundingReady;}
 /** Pilot exit: an expired/ineligible study or the loss limit closes any open position through normal risk (reductions are allowed while halted). */
 private async stop(reason:string,account:ReturnType<PerpetualPaperBook['list']>[number],current:number){
  if(this.stopReason!==reason){this.stopReason=reason;this.bus.publish(event('AUTONOMOUS_PILOT_STOPPED',{accountId:account.id,studyId:this.studyId,reason,equity:account.portfolio.equity,initialCash:account.initialCash}));}
  if(current)await this.book.propose(account.id,current>0?'SELL':'BUY',Math.abs(current),this.save,this.studyId);
  if(reason==='PILOT_LOSS_LIMIT'&&!this.book.status().halted)await this.book.halt(true,this.save);
 }
 async onMarket(){
  if(!this.active()||this.busy||this.now()<this.nextAttemptAt||!this.sourcesReady())return;
  const account=this.book.list().find(a=>a.id==='evaluation:nova:usdm');if(!account)return;
  const current=account.portfolio.positions[0]?.quantity??0;
  const eligible=this.studies.screen(this.studyId,this.now()).eligible;
  const lossLimit=account.portfolio.equity<=account.initialCash*(1-this.maxLossFraction);
  const stopReason=!eligible?'STUDY_NOT_ELIGIBLE':lossLimit?'PILOT_LOSS_LIMIT':null;
  this.busy=true;
  try{
   if(stopReason){await this.stop(stopReason,account,current);this.succeeded();return;}
   if(this.book.status().halted)return;
   const hour=Math.floor(this.now()/3600000)*3600000;if((this.book.status().autonomousCursor??0)>=hour-3600000)return;
   const study=this.studies.get(this.studyId)!;const configuration=study.result!.folds.at(-1)!.configuration;const data=await this.source.load(Math.max(100,configuration.slowPeriod+2,teamFilterWarmup(configuration.filters)+2));
   if(!this.sourcesReady()||this.book.status().halted||!this.studies.screen(this.studyId,this.now()).eligible)return;
   const hash=validatePerpetualDataset(data);const last=data.trade.at(-1)!;if(last.timestamp+3600000>this.now()||this.now()-last.timestamp>2*3600000)throw Error('signal history stale');if((this.book.status().autonomousCursor??0)>=last.timestamp)return;
   const direction=perpetualDirection(data.trade,configuration,current);
   // Persist the decision cursor before execution: restart never duplicates this candle.
   await this.book.checkpoint(last.timestamp,this.save);const decision=event('AUTONOMOUS_DECISION',{accountId:account.id,studyId:study.id,studyDatasetHash:study.result!.datasetHash,signalDatasetHash:hash,signalDataset:data,candleTimestamp:last.timestamp,direction,configuration});this.bus.publish(decision);
   this.memories.add({agentId:'nova',kind:'OBSERVATION',summary:'computed paper signal from closed USD-M candles',sourceEventId:decision.id,strategyId:study.id,metadata:{accountId:account.id,candleTimestamp:last.timestamp,signalDatasetHash:hash,direction}});
   try{this.onDecision?.({data,quote:this.book.market(),direction,currentQuantity:current,configuration,studyId:study.id,candleTimestamp:last.timestamp,decisionEventId:decision.id});}catch{/* Advisory briefing only; never blocks the decision. */}await this.persist();
   if(current&&Math.sign(current)!==direction)await this.book.propose(account.id,current>0?'SELL':'BUY',Math.abs(current),this.save,study.id);
   const fresh=this.book.list().find(a=>a.id===account.id)!;
   // Proteções do estudo (se houver): mesma regra do backtest; só impedem abrir, nunca fechar.
   const closed=(this.book.performance(account.id)?.closedTrades??[]).map(t=>({closedAt:Date.parse(t.closedAt),netPnl:t.netPnl}));const guard=protectionsAllowEntry(configuration.protections,closed,this.now());
   if(!fresh.portfolio.positions.length&&direction&&!guard.allowed)this.memories.add({agentId:'sentinel',kind:'DECISION',summary:'entrada bloqueada pela proteção '+guard.reason,sourceEventId:decision.id,strategyId:study.id,metadata:{accountId:account.id,candleTimestamp:last.timestamp,reason:guard.reason,direction}});
   if(!fresh.portfolio.positions.length&&direction&&guard.allowed&&fresh.portfolio.equity>0){const quote=this.book.market();if(!quote)throw Error('market unavailable');await this.book.propose(account.id,direction>0?'BUY':'SELL',fresh.portfolio.equity*0.1/(direction>0?quote.ask:quote.bid),this.save,study.id);}
   this.succeeded();
  }catch(error){this.error=error instanceof Error?error.message:'autonomous evaluation unavailable';this.lastAttemptFailed=true;this.nextAttemptAt=this.now()+this.retryDelayMs;throw error;}finally{this.busy=false;}
 }
 private succeeded(){this.error=null;this.lastAttemptFailed=false;this.nextAttemptAt=0;}
}
