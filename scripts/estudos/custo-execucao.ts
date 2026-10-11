// Medição do custo real de execução a mercado nos perpétuos da Binance USD-M (docs/MEDICAO_CUSTO_EXECUCAO.md).
// Só dados públicos (livro de ofertas); não envia ordens e não usa conta nem chave.
//   npx tsx scripts/estudos/custo-execucao.ts --minutes=60 --interval=30 --tag=tarde
// A cada amostra, para cada moeda, caminha pelo livro de ofertas (500 níveis) e calcula o custo, em pontos-base sobre o preço médio
// entre a melhor compra e a melhor venda, de uma ordem a mercado de cada tamanho (compra e venda). Inclui metade do spread.
import {writeFileSync} from 'node:fs';
import {FORWARD_PROTOCOL} from '../../src/application/forward-momentum.js';

const ORIGIN='https://fapi.binance.com',SIZES=[500,5000,50000],arg=(k:string,d:string)=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3)??d;
type Level=[string,string];
export interface Sample {t:number;symbol:string;mid:number;spreadBps:number;buyBps:(number|null)[];sellBps:(number|null)[]}

/** Custo, em pontos-base sobre o preço médio, de comprar (níveis de venda) ou vender (níveis de compra) `notional` a mercado; null se o livro lido não cobre. */
export function walk(levels:Level[],mid:number,notional:number,side:'buy'|'sell'):number|null{
 let left=notional,qty=0;
 for(const [p,q] of levels){const price=+p,take=Math.min(left,price*+q);qty+=take/price;left-=take;if(left<=1e-9)break;}
 if(left>1e-6)return null;
 const avg=notional/qty;return (side==='buy'?avg/mid-1:1-avg/mid)*1e4;
}
export function analyze(symbol:string,t:number,bids:Level[],asks:Level[]):Sample{
 const bid=+bids[0][0],ask=+asks[0][0],mid=(bid+ask)/2;
 return {t,symbol,mid,spreadBps:(ask-bid)/mid*1e4,buyBps:SIZES.map(n=>walk(asks,mid,n,'buy')),sellBps:SIZES.map(n=>walk(bids,mid,n,'sell'))};
}
const quantile=(v:number[],q:number)=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(q*s.length))]:NaN;};
export function summarize(samples:Sample[]):{bySymbol:Record<string,any>;overall:Record<string,any>}{
 const bySymbol:Record<string,any>={},all:Record<string,number[]>={spread:[]};SIZES.forEach(n=>all['cost'+n]=[]);
 for(const sym of [...new Set(samples.map(s=>s.symbol))]){
  const rows=samples.filter(s=>s.symbol===sym),o:any={samples:rows.length,spreadMedian:quantile(rows.map(r=>r.spreadBps),0.5),spreadP90:quantile(rows.map(r=>r.spreadBps),0.9)};
  SIZES.forEach((n,k)=>{const costs=rows.flatMap(r=>[r.buyBps[k],r.sellBps[k]]),ok=costs.filter((c):c is number=>c!==null);
   o['n'+n]={median:quantile(ok,0.5),p90:quantile(ok,0.9),max:ok.length?Math.max(...ok):NaN,notCovered:costs.length-ok.length};all['cost'+n].push(...ok);});
  bySymbol[sym]=o;all.spread.push(...rows.map(r=>r.spreadBps));
 }
 return {bySymbol,overall:{spreadMedian:quantile(all.spread,0.5),...Object.fromEntries(SIZES.map(n=>['n'+n,{median:quantile(all['cost'+n],0.5),p90:quantile(all['cost'+n],0.9),p99:quantile(all['cost'+n],0.99)}]))}};
}
async function depth(symbol:string){
 const r=await fetch(`${ORIGIN}/fapi/v1/depth?symbol=${symbol}&limit=500`);
 if(r.status===418||r.status===429)throw new Error('HTTP '+r.status+': a corretora pediu para reduzir o ritmo; a coleta para aqui');
 if(!r.ok)throw new Error('HTTP '+r.status+' em '+symbol);
 const j:any=await r.json();return {t:j.T as number,bids:j.bids as Level[],asks:j.asks as Level[]};
}
async function main(){
 const minutes=+arg('minutes','60'),interval=+arg('interval','30'),tag=arg('tag','amostra'),end=Date.now()+minutes*60000,samples:Sample[]=[],errors:string[]=[];
 let stopped:string|null=null;
 while(Date.now()<end&&!stopped){
  const tick=Date.now(),res=await Promise.allSettled(FORWARD_PROTOCOL.symbols.map(async s=>{const d=await depth(s);return analyze(s,d.t,d.bids,d.asks);}));
  for(const r of res){if(r.status==='fulfilled')samples.push(r.value);else{errors.push(String(r.reason?.message??r.reason));if(/HTTP (418|429)/.test(String(r.reason?.message)))stopped=String(r.reason.message);}}
  console.log(new Date().toISOString(),'amostras',samples.length,'erros',errors.length);
  await new Promise(r=>setTimeout(r,Math.max(0,interval*1000-(Date.now()-tick))));
 }
 const report={scope:'EXECUTION_COST_MEASUREMENT_PUBLIC_ORDER_BOOK',tag,collectedFrom:samples[0]?new Date(samples[0].t).toISOString():null,collectedTo:samples.length?new Date(samples.at(-1)!.t).toISOString():null,
  sizesUsdt:SIZES,symbols:FORWARD_PROTOCOL.symbols,intervalSeconds:interval,stoppedEarly:stopped,errors:errors.slice(0,20),errorCount:errors.length,summary:summarize(samples)};
 writeFileSync(`docs/estudos/custo-execucao-${tag}.json`,JSON.stringify(report,null,1));
 console.log('overall',JSON.stringify(report.summary.overall));
}
if(process.argv[1]?.endsWith('custo-execucao.ts'))void main();
