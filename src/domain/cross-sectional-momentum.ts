import {validatePerpetualDataset,type PerpetualDataset} from './perpetual-backtest.js';

/**
 * Momentum entre moedas (docs/PROTOCOLO_MOMENTUM_ENTRE_MOEDAS.md): a cada rebalanceamento compra as moedas de maior
 * retorno nas últimas `lookbackHours` e vende as de menor retorno, no mesmo valor. Simulação histórica só; não emite
 * eventos de corretora nem grava contas.
 *
 * Linha do tempo de cada vela i (sem olhar o futuro):
 *  1. abertura de i: executa as posições decididas no fechamento de i-1 (preço de abertura ± slippage, mais a taxa);
 *  2. durante a hora de i: liquida o funding registrado naquela hora (comprado paga taxa positiva, vendido recebe);
 *  3. fechamento de i: marca a carteira pelo fechamento e, se for hora de rebalancear, decide as próximas posições
 *     usando só fechamentos até i.
 */
export interface CrossSectionalConfig {lookbackHours:number;rebalanceHours:number;startBar:number;longCount:number;shortCount:number;legFraction:number;feeRate:number;slippageBps:number;initialCapital:number;maxBars?:number}
export interface CrossSectionalResult {
 model:'CROSS_SECTIONAL_MOMENTUM_V1';execution:'HISTORICAL_SIMULATION';datasetHashes:Record<string,string>;
 equitySeries:{timestamp:number;equity:number}[];finalEquity:number;netPnl:number;maxDrawdown:number;
 feesPaid:number;fundingCashDelta:number;tradedNotional:number;closedLegs:number;rebalances:{timestamp:number;long:string[];short:string[]}[];
}
const HOUR=3600000;
export function simulateCrossSectional(datasets:Record<string,PerpetualDataset>,cfg:CrossSectionalConfig):CrossSectionalResult{
 const symbols=Object.keys(datasets).sort();
 if(symbols.length<cfg.longCount+cfg.shortCount||cfg.longCount<1||cfg.shortCount<1)throw new Error('universe smaller than the portfolio');
 if(![cfg.lookbackHours,cfg.rebalanceHours,cfg.startBar].every(v=>Number.isSafeInteger(v)&&v>0)||cfg.startBar<cfg.lookbackHours)throw new Error('invalid schedule');
 if(!(cfg.legFraction>0&&cfg.legFraction*(cfg.longCount+cfg.shortCount)<=1))throw new Error('gross exposure above 1x');
 if(!(cfg.feeRate>=0&&cfg.slippageBps>=0&&cfg.initialCapital>0))throw new Error('invalid costs');
 const datasetHashes:Record<string,string>={};for(const s of symbols)datasetHashes[s]=validatePerpetualDataset(datasets[s],cfg.maxBars);
 const bars=datasets[symbols[0]].trade.length;
 for(const s of symbols){const t=datasets[s].trade;if(t.length!==bars||t.some((c,i)=>c.timestamp!==datasets[symbols[0]].trade[i].timestamp))throw new Error('unaligned universe: '+s);}
 if(bars<=cfg.startBar+1)throw new Error('not enough bars');
 const slip=cfg.slippageBps/10000,qty=new Map(symbols.map(s=>[s,0])),fundingIndex=new Map(symbols.map(s=>[s,0]));
 let cash=cfg.initialCapital,fees=0,funding=0,traded=0,closedLegs=0,pending:Map<string,number>|null=null,peak=cfg.initialCapital,maxDrawdown=0;
 const equitySeries:{timestamp:number;equity:number}[]=[],rebalances:CrossSectionalResult['rebalances']=[];
 const mark=(i:number)=>symbols.reduce((sum,s)=>sum+qty.get(s)!*datasets[s].trade[i].close,cash);
 for(let i=0;i<bars;i++){
  const t=datasets[symbols[0]].trade[i].timestamp;
  // 1) Execução na abertura.
  if(pending){
   for(const s of symbols){
    const current=qty.get(s)!,target=pending.get(s)??0,delta=target-current;if(Math.abs(delta)<1e-15)continue;
    const price=datasets[s].trade[i].open*(1+Math.sign(delta)*slip),fee=Math.abs(delta)*price*cfg.feeRate;
    cash-=delta*price+fee;fees+=fee;traded+=Math.abs(delta)*price;
    if(current!==0&&(target===0||Math.sign(target)!==Math.sign(current)))closedLegs++;
    qty.set(s,target);
   }
   pending=null;
  }
  // 2) Funding liquidado durante esta hora.
  for(const s of symbols){
   const list=datasets[s].funding;let k=fundingIndex.get(s)!;
   while(k<list.length&&list[k].timestamp<t+HOUR){const f=list[k];if(f.timestamp>=t){const q=qty.get(s)!;if(q){const delta=-q*f.markPrice*f.rate;cash+=delta;funding+=delta;}}k++;}
   fundingIndex.set(s,k);
  }
  // 3) Marcação e decisão no fechamento.
  const equity=mark(i);
  if(i>=cfg.startBar){equitySeries.push({timestamp:t,equity});peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak>0?1-equity/peak:0);}
  if(i>=cfg.startBar&&(i-cfg.startBar)%cfg.rebalanceHours===0&&i+1<bars){
   const ranked=symbols.map(s=>({s,r:datasets[s].trade[i].close/datasets[s].trade[i-cfg.lookbackHours].close-1})).sort((a,b)=>b.r-a.r||a.s.localeCompare(b.s));
   const long=ranked.slice(0,cfg.longCount).map(x=>x.s),short=ranked.slice(-cfg.shortCount).map(x=>x.s),notional=cfg.legFraction*equity;
   pending=new Map(symbols.map(s=>[s,0]));
   for(const s of long)pending.set(s,notional/datasets[s].trade[i].close);
   for(const s of short)pending.set(s,-notional/datasets[s].trade[i].close);
   rebalances.push({timestamp:t,long,short});
  }
 }
 const finalEquity=equitySeries.at(-1)?.equity??cfg.initialCapital;
 return {model:'CROSS_SECTIONAL_MOMENTUM_V1',execution:'HISTORICAL_SIMULATION',datasetHashes,equitySeries,finalEquity,netPnl:finalEquity-cfg.initialCapital,maxDrawdown,feesPaid:fees,fundingCashDelta:funding,tradedNotional:traded,closedLegs,rebalances};
}
