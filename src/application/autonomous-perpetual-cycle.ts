import {perpetualDirection} from '../domain/perpetual-signals.js';
import {validatePerpetualDataset,type PerpetualDataset} from '../domain/perpetual-backtest.js';
import type {PerpetualStudies,PerpetualStudy} from './perpetual-studies.js';
import type {PerpetualPaperBook,PerpetualBookState} from './perpetual-paper-book.js';
import type {MemoryStore} from '../domain/memory.js';
import type {EventBus} from './event-bus.js';
import {event} from '../domain/events.js';
import {screenPerpetualStudy} from './perpetual-study-screen.js';
export function studyEligibility(study:PerpetualStudy|undefined,now=Date.now()){
 const {eligible,reason}=screenPerpetualStudy(study,now);return {eligible,reason};
}
export class AutonomousPerpetualCycle {
 private busy=false;private error:string|null=null;
 constructor(private enabled:boolean,private studyId:string,private studies:PerpetualStudies,private book:PerpetualPaperBook,private source:{load(count:number):Promise<PerpetualDataset>},private save:(state:PerpetualBookState)=>Promise<void>,private memories:MemoryStore,private bus:EventBus,private persist:()=>Promise<void>,private now:()=>number=Date.now,private canContinue:()=>boolean=()=>true){}
 status(){const {eligible,reason}=this.studies.screen(this.studyId,this.now());return {enabled:this.enabled,studyId:this.studyId||null,busy:this.busy,error:this.error,eligible,reason,accountId:'evaluation:nova:usdm',lastProcessedCandle:this.book.status().autonomousCursor};}
 private bookReady(){const status=this.book.status();return this.canContinue()&&!status.halted&&!status.persistenceFailed&&status.marketReady&&status.fundingReady;}
 async onMarket(){if(!this.enabled||this.busy||!this.bookReady())return;if(!this.studies.screen(this.studyId,this.now()).eligible)return;const hour=Math.floor(this.now()/3600000)*3600000;if((this.book.status().autonomousCursor??0)>=hour-3600000)return;const study=this.studies.get(this.studyId);this.busy=true;
  try{const configuration=study!.result!.folds.at(-1)!.configuration;const data=await this.source.load(Math.max(100,configuration.slowPeriod+2));if(!this.bookReady()||!this.studies.screen(this.studyId,this.now()).eligible)return;const hash=validatePerpetualDataset(data);const last=data.trade.at(-1)!;if(last.timestamp+3600000>this.now()||this.now()-last.timestamp>2*3600000)throw Error('signal history stale');if((this.book.status().autonomousCursor??0)>=last.timestamp)return;
   const account=this.book.list().find(a=>a.id==='evaluation:nova:usdm');if(!account)throw Error('independent perpetual evaluation account unavailable');const current=account.portfolio.positions[0]?.quantity??0;const direction=perpetualDirection(data.trade,configuration,current);
   // Persist the decision cursor before execution: restart never duplicates this candle.
   await this.book.checkpoint(last.timestamp,this.save);const decision=event('AUTONOMOUS_DECISION',{accountId:account.id,studyId:study!.id,studyDatasetHash:study!.result!.datasetHash,signalDatasetHash:hash,signalDataset:data,candleTimestamp:last.timestamp,direction,configuration});this.bus.publish(decision);
   this.memories.add({agentId:'nova',kind:'OBSERVATION',summary:'computed paper signal from closed USD-M candles',sourceEventId:decision.id,strategyId:study!.id,metadata:{accountId:account.id,candleTimestamp:last.timestamp,signalDatasetHash:hash,direction}});await this.persist();
   if(current&&Math.sign(current)!==direction)await this.book.propose(account.id,current>0?'SELL':'BUY',Math.abs(current),this.save,study!.id);
   const fresh=this.book.list().find(a=>a.id===account.id)!;if(!fresh.portfolio.positions.length&&direction&&fresh.portfolio.equity>0){const quote=this.book.market();if(!quote)throw Error('market unavailable');await this.book.propose(account.id,direction>0?'BUY':'SELL',fresh.portfolio.equity*0.1/(direction>0?quote.ask:quote.bid),this.save,study!.id);}this.error=null;
  }catch(error){this.error=error instanceof Error?error.message:'autonomous evaluation unavailable';throw error;}finally{this.busy=false;}
 }
}
