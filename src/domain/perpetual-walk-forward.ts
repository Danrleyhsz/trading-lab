import {backtestPerpetual,validatePerpetualDataset,type PerpetualDataset,type PerpetualConfig} from './perpetual-backtest.js';
export function walkForwardPerpetual(data:PerpetualDataset,candidates:PerpetualConfig[],trainBars:number,testBars:number){
 const datasetHash=validatePerpetualDataset(data);
 if(!Number.isInteger(trainBars)||!Number.isInteger(testBars)||testBars<3||candidates.length<1||candidates.length>20||candidates.some(c=>trainBars<=c.slowPeriod)||data.trade.length<trainBars+testBars)throw new Error('invalid walk-forward windows');
 const slice=(start:number,end:number):PerpetualDataset=>({instrument:data.instrument,trade:data.trade.slice(start,end),mark:data.mark.slice(start,end),funding:data.funding.filter(f=>f.timestamp>=data.trade[start].timestamp&&f.timestamp<data.trade[end-1].timestamp+3600000)});
 let equity=candidates[0].initialCapital;const folds=[];
 for(let start=trainBars;start+testBars<=data.trade.length;start+=testBars){
  const training=slice(start-trainBars,start);const ranked=candidates.map((config,index)=>({config,index,result:backtestPerpetual(training,config)})).sort((a,b)=>b.result.netPnl-a.result.netPnl||a.index-b.index);
  const selected=ranked[0];if(equity<=0)break;
  // Warmup is from prior observations; the simulator opens only after slowPeriod bars.
  const testing=slice(start-selected.config.slowPeriod,start+testBars);
  const result=backtestPerpetual(testing,{...selected.config,initialCapital:equity});
  folds.push({trainStart:training.trade[0].timestamp,trainEnd:training.trade.at(-1)!.timestamp,testStart:data.trade[start].timestamp,testEnd:data.trade[start+testBars-1].timestamp,selectedCandidate:selected.index,trainingNetPnl:selected.result.netPnl,result});equity=result.finalEquity;
 }
 return {datasetHash,model:'LINEAR_PERPETUAL_WALK_FORWARD_V2' as const,execution:'HISTORICAL_SIMULATION' as const,folds,finalEquity:equity,netPnl:equity-candidates[0].initialCapital,excludedTailBars:(data.trade.length-trainBars)%testBars,foldPolicy:'flat at every fold boundary; candidate chosen by training net P&L only',automaticPaperApproval:false};
}
