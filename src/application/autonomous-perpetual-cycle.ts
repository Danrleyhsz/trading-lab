import {perpetualDirection} from '../domain/perpetual-signals.js';
import {validatePerpetualDataset,type PerpetualDataset} from '../domain/perpetual-backtest.js';
import type {PerpetualStudies,PerpetualStudy} from './perpetual-studies.js';
import type {PerpetualPaperBook,PerpetualBookState} from './perpetual-paper-book.js';
import type {MemoryStore} from '../domain/memory.js';
import type {EventBus} from './event-bus.js';
import {event} from '../domain/events.js';
export function studyEligibility(study:PerpetualStudy|undefined,now=Date.now()){
 if(!study||study.status!=='COMPLETED'||!study.result||!study.completedAt)return {eligible:false,reason:'completed V2 study required'};
 const result=study.result,folds=result.folds;const trades=folds.reduce((sum,f)=>sum+f.result.trades,0);
 if(!Number.isFinite(result.netPnl)||folds.some(f=>!Number.isFinite(f.result.maxDrawdown)||!Number.isInteger(f.result.trades)||!Number.isInteger(f.result.liquidations))||!Number.isFinite(trades)||folds.length<3||trades<10||result.netPnl<=0||folds.some(f=>!f.configuration||f.result.liquidations>0||f.result.maxDrawdown>0.15))return {eligible:false,reason:'out-of-sample screen failed or incomplete'};
 const end=folds.at(-1)!.testEnd+3600000;if(end>now||now-end>7*86400000)return {eligible:false,reason:'study evidence is stale or future dated'};
 return {eligible:true,reason:'historical screen eligible for independent paper evaluation only'};
}
export class AutonomousPerpetualCycle {
 private busy=false;private error:string|null=null;
 constructor(private enabled:boolean,private studyId:string,private studies:PerpetualStudies,private book:PerpetualPaperBook,private source:{load(count:number):Promise<PerpetualDataset>},private save:(state:PerpetualBookState)=>Promise<void>,private memories:MemoryStore,private bus:EventBus,private persist:()=>Promise<void>,private now:()=>number=Date.now){}
 status(){return {enabled:this.enabled,studyId:this.studyId||null,busy:this.busy,error:this.error,...studyEligibility(this.studies.get(this.studyId),this.now()),accountId:'evaluation:nova:usdm',lastProcessedCandle:this.book.status().autonomousCursor};}
 async onMarket(){if(!this.enabled||this.busy||this.book.status().halted)return;const study=this.studies.get(this.studyId);if(!studyEligibility(study,this.now()).eligible)return;const hour=Math.floor(this.now()/3600000)*3600000;if((this.book.status().autonomousCursor??0)>=hour-3600000)return;this.busy=true;
  try{const configuration=study!.result!.folds.at(-1)!.configuration;const data=await this.source.load(Math.max(100,configuration.slowPeriod+2));const hash=validatePerpetualDataset(data);const last=data.trade.at(-1)!;if(last.timestamp+3600000>this.now()||this.now()-last.timestamp>2*3600000)throw Error('signal history stale');if((this.book.status().autonomousCursor??0)>=last.timestamp)return;
   const account=this.book.list().find(a=>a.id==='evaluation:nova:usdm');if(!account)throw Error('independent perpetual evaluation account unavailable');const current=account.portfolio.positions[0]?.quantity??0;const direction=perpetualDirection(data.trade,configuration,current);
   // Persist the decision cursor before execution: restart never duplicates this candle.
   await this.book.checkpoint(last.timestamp,this.save);const decision=event('AUTONOMOUS_DECISION',{accountId:account.id,studyId:study!.id,studyDatasetHash:study!.result!.datasetHash,signalDatasetHash:hash,signalDataset:data,candleTimestamp:last.timestamp,direction,configuration});this.bus.publish(decision);
   this.memories.add({agentId:'nova',kind:'OBSERVATION',summary:'computed paper signal from closed USD-M candles',sourceEventId:decision.id,strategyId:study!.id,metadata:{accountId:account.id,candleTimestamp:last.timestamp,signalDatasetHash:hash,direction}});await this.persist();
   if(current&&Math.sign(current)!==direction)await this.book.propose(account.id,current>0?'SELL':'BUY',Math.abs(current),this.save,study!.id);
   const fresh=this.book.list().find(a=>a.id===account.id)!;if(!fresh.portfolio.positions.length&&direction&&fresh.portfolio.equity>0){const quote=this.book.market();if(!quote)throw Error('market unavailable');await this.book.propose(account.id,direction>0?'BUY':'SELL',fresh.portfolio.equity*0.1/(direction>0?quote.ask:quote.bid),this.save,study!.id);}this.error=null;
  }catch(error){this.error=error instanceof Error?error.message:'autonomous evaluation unavailable';throw error;}finally{this.busy=false;}
 }
}
