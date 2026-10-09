// Biblioteca do estudo FATORES_V1 (docs/PROTOCOLO_FATORES_V1.md). Só simulação histórica offline; fora do servidor.
// O simulador é uma cópia de src/domain/cross-sectional-momentum.ts com um único acréscimo: o sinal que ordena as moedas é
// injetado. Com o sinal de momentum, o resultado é idêntico ao do original (conferido em test/fatores.test.ts).
import {validatePerpetualDataset,type PerpetualDataset,type FundingSettlement} from '../../src/domain/perpetual-backtest.js';
import type {Candle} from '../../src/domain/backtest.js';
import type {CrossSectionalConfig,CrossSectionalResult} from '../../src/domain/cross-sectional-momentum.js';

const HOUR=3600000;
/** Atratividade de cada moeda na vela de decisão `i`, só com informação até o fechamento de `i`. Maior é melhor. */
export type Attractiveness=(datasets:Record<string,PerpetualDataset>,symbols:string[],i:number)=>Map<string,number>;

/** Um livro: um sinal que ordena as moedas, quantas comprar e vender e o tamanho de cada posição. */
export interface Book {signal:Attractiveness;legFraction:number;longCount:number;shortCount:number}
export type BlendConfig=Omit<CrossSectionalConfig,'longCount'|'shortCount'|'legFraction'>;

/**
 * Simulador de um ou mais livros somados: a posição final de cada moeda é a soma das posições dos livros (compras e vendas de livros
 * diferentes na mesma moeda se compensam), e a taxa e o slippage incidem só sobre a quantidade líquida negociada. Com um único livro
 * é exatamente o simulador de momentum original (conferido em test/fatores.test.ts).
 */
export function simulateBlend(datasets:Record<string,PerpetualDataset>,cfg:BlendConfig,books:Book[]):CrossSectionalResult{
 const symbols=Object.keys(datasets).sort();
 if(!books.length||books.some(b=>b.longCount<1||b.shortCount<1)||symbols.length<Math.max(...books.map(b=>b.longCount+b.shortCount)))throw new Error('universe smaller than the portfolio');
 if(![cfg.lookbackHours,cfg.rebalanceHours,cfg.startBar].every(v=>Number.isSafeInteger(v)&&v>0)||cfg.startBar<cfg.lookbackHours)throw new Error('invalid schedule');
 if(!(books.every(b=>b.legFraction>0)&&books.reduce((sum,b)=>sum+b.legFraction*(b.longCount+b.shortCount),0)<=1))throw new Error('gross exposure above 1x');
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
  for(const s of symbols){
   const list=datasets[s].funding;let k=fundingIndex.get(s)!;
   while(k<list.length&&list[k].timestamp<t+HOUR){const f=list[k];if(f.timestamp>=t){const q=qty.get(s)!;if(q){const delta=-q*f.markPrice*f.rate;cash+=delta;funding+=delta;}}k++;}
   fundingIndex.set(s,k);
  }
  const equity=mark(i);
  if(i>=cfg.startBar){equitySeries.push({timestamp:t,equity});peak=Math.max(peak,equity);maxDrawdown=Math.max(maxDrawdown,peak>0?1-equity/peak:0);}
  if(i>=cfg.startBar&&(i-cfg.startBar)%cfg.rebalanceHours===0&&i+1<bars){
   pending=new Map(symbols.map(s=>[s,0]));let record:{long:string[];short:string[]}|null=null;
   for(const book of books){
    const score=book.signal(datasets,symbols,i),ranked=symbols.map(s=>({s,r:score.get(s)!})).sort((a,b)=>b.r-a.r||a.s.localeCompare(b.s));
    const long=ranked.slice(0,book.longCount).map(x=>x.s),short=ranked.slice(-book.shortCount).map(x=>x.s),notional=book.legFraction*equity;
    for(const s of long)pending.set(s,pending.get(s)!+notional/datasets[s].trade[i].close);
    for(const s of short)pending.set(s,pending.get(s)!-notional/datasets[s].trade[i].close);
    if(books.length===1)record={long,short};
   }
   rebalances.push({timestamp:t,long:record?.long??symbols.filter(s=>pending!.get(s)!>0),short:record?.short??symbols.filter(s=>pending!.get(s)!<0)});
  }
 }
 const finalEquity=equitySeries.at(-1)?.equity??cfg.initialCapital;
 return {model:'CROSS_SECTIONAL_MOMENTUM_V1',execution:'HISTORICAL_SIMULATION',datasetHashes,equitySeries,finalEquity,netPnl:finalEquity-cfg.initialCapital,maxDrawdown,feesPaid:fees,fundingCashDelta:funding,tradedNotional:traded,closedLegs,rebalances};
}
/** Um livro só (o molde do momentum e das candidatas de FATORES_V1). */
export function simulateFactor(datasets:Record<string,PerpetualDataset>,cfg:CrossSectionalConfig,attractiveness:Attractiveness):CrossSectionalResult{
 const {longCount,shortCount,legFraction,...rest}=cfg;
 return simulateBlend(datasets,rest,[{signal:attractiveness,legFraction,longCount,shortCount}]);
}

/** Retorno de 672 h (o sinal do XSMOM_L28; o controle do estudo). */
export const momentum=(lookback=672):Attractiveness=>(d,symbols,i)=>new Map(symbols.map(s=>[s,d[s].trade[i].close/d[s].trade[i-lookback].close-1]));
/** Menos o desvio-padrão (da população) dos retornos logarítmicos horários das últimas `window` horas. */
export const lowVolatility=(window=672):Attractiveness=>(d,symbols,i)=>new Map(symbols.map(s=>{
 const c=d[s].trade,r:number[]=[];for(let j=i-window+1;j<=i;j++)r.push(Math.log(c[j].close/c[j-1].close));
 const mean=r.reduce((a,b)=>a+b,0)/r.length;return [s,-Math.sqrt(r.reduce((a,b)=>a+(b-mean)**2,0)/r.length)];
}));
/**
 * Menos a média do funding das liquidações das últimas `window` horas, só as já liquidadas até o fechamento da vela de decisão
 * (timestamp < abertura de i + 1 h). Uma liquidação no instante do fechamento ainda não conta; sem liquidações, a média é 0.
 */
export const carry=(window=168):Attractiveness=>(d,symbols,i)=>{
 const close=d[symbols[0]].trade[i].timestamp+HOUR,from=close-window*HOUR;
 return new Map(symbols.map(s=>{const rates=d[s].funding.filter(f=>f.timestamp>=from&&f.timestamp<close).map(f=>f.rate);return [s,rates.length?-rates.reduce((a,b)=>a+b,0)/rates.length:0];}));
};
/** Posição de cada moeda numa atratividade: 0 = pior, n-1 = melhor; empates pela ordem inversa do símbolo (o oposto do critério de seleção). */
export function positions(score:Map<string,number>){
 const order=[...score.entries()].sort((a,b)=>a[1]-b[1]||b[0].localeCompare(a[0]));
 return new Map(order.map(([s],k)=>[s,k]));
}
/** Média das posições de vários sinais, com pesos iguais. */
export const composite=(signals:Attractiveness[]):Attractiveness=>(d,symbols,i)=>{
 const ranks=signals.map(f=>positions(f(d,symbols,i)));
 return new Map(symbols.map(s=>[s,ranks.reduce((sum,r)=>sum+r.get(s)!,0)/ranks.length]));
};

/**
 * Junta blocos contíguos de velas horárias e de funding de uma moeda. Para sem calcular nada se houver lacuna, repetição ou
 * horário fora de ordem entre blocos, ou se o funding se repetir.
 */
export function joinBlocks(symbol:string,blocks:{trade:Candle[];funding:FundingSettlement[]}[]):PerpetualDataset{
 const trade:Candle[]=[],funding:FundingSettlement[]=[];
 for(const b of blocks){
  for(const c of b.trade){const last=trade.at(-1);if(last&&c.timestamp!==last.timestamp+HOUR)throw new Error(`${symbol}: lacuna ou repetição entre blocos em ${new Date(c.timestamp).toISOString()}`);trade.push(c);}
  for(const f of b.funding){const last=funding.at(-1);if(last&&f.timestamp<=last.timestamp)throw new Error(`${symbol}: funding repetido ou fora de ordem em ${new Date(f.timestamp).toISOString()}`);funding.push(f);}
 }
 // `mark` aponta para a mesma série de negócios (o simulador só usa negócios e funding; igual ao estudo longo, que clonava). Sem cópia, a memória cai pela metade.
 return {instrument:`BINANCE_USDM:${symbol}` as PerpetualDataset['instrument'],trade,mark:trade,funding};
}
