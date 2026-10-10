// Motor da execução simulada TENDENCIA_MAIORES_AO_VIVO_V1 (docs/PROTOCOLO_TENDENCIA_AO_VIVO.md): decide com o mesmo código da pesquisa
// (BUSCA_MAIORES_V1: universo, regra e escala de risco) e simula as ordens contra o livro de ofertas público.
// Funções puras, sem rede. Não envia ordens, não usa contas nem chaves.
import {createHash} from 'node:crypto';
import {DAY,buildGrid,eligibility,positions,type RuleId,type SpotSeriesLike} from './busca-diaria-lib.js';
import {MAIORES,membership,scaledPortfolio} from './busca-maiores-lib.js';

/** Primeiro dia da grade da pesquisa; o ranking do universo é refeito nos dias múltiplos de 30 a partir dele. */
export const ORIGIN=Date.UTC(2017,7,17);
export type AccountId='SMA100'|'DONCHIAN_55_20'|'BENCH_5_MAIORES';
export const ACCOUNTS:readonly AccountId[]=['SMA100','DONCHIAN_55_20','BENCH_5_MAIORES'];
export const TREND_LIVE=Object.freeze({version:'TENDENCIA_MAIORES_AO_VIVO_V1',declaredAt:'2026-10-10',initialCapital:10_000,takerFee:0.001,minOrderNotional:10,
 candidatePool:100,historyDays:1000,depthLevels:100,maximumDrawdown:0.30,assumedCostPerSide:MAIORES.costPerSide,universe:MAIORES});
const RULE_OF:Partial<Record<AccountId,RuleId>>={SMA100:'SMA100',DONCHIAN_55_20:'DONCHIAN_55_20'};

export interface Decision {decisionDay:string;members:string[];scale:Record<AccountId,number>;signals:Record<AccountId,Record<string,number>>;weights:Record<AccountId,Record<string,number>>}

const cutAt=(s:SpotSeriesLike,limit:number):SpotSeriesLike=>{let n=s.t.length;while(n>0&&s.t[n-1]>limit)n--;return {...s,t:s.t.slice(0,n),h:s.h.slice(0,n),l:s.l.slice(0,n),c:s.c.slice(0,n),qv:s.qv.slice(0,n)};};

/**
 * Pesos-alvo no fechamento do dia `decisionDay` (UTC, início da vela diária fechada), só com informação até ele. Usa `buildGrid`, `eligibility`,
 * `positions`, `membership` e `scaledPortfolio` da pesquisa. A grade começa num dia alinhado ao ranking de 30 dias da pesquisa. A última vela de
 * cada moeda ganha um dia sintético (mesmo fechamento, volume zero) só para a regra "vela no dia seguinte" da elegibilidade não zerar o último dia.
 */
export function decide(series:readonly SpotSeriesLike[],decisionDay:number):Decision{
 const cut=series.map(s=>cutAt(s,decisionDay)).filter(s=>s.t.length>0);
 if(!cut.length)throw new Error('sem velas até o dia da decisão');
 const earliest=Math.min(...cut.map(s=>s.t[0])),m=Math.max(0,Math.floor((earliest-ORIGIN)/(30*DAY))),T0=ORIGIN+m*30*DAY;
 const days=Math.round((decisionDay-T0)/DAY)+2,Tl=days-2;
 const grid=buildGrid(cut.map(s=>{
  const keep=s.t.map((t,i)=>i).filter(i=>s.t[i]>=T0),pick=(a:number[])=>keep.map(i=>a[i]);
  const out={...s,t:pick(s.t),h:pick(s.h),l:pick(s.l),c:pick(s.c),qv:pick(s.qv)};
  if(out.t.length&&out.t.at(-1)===decisionDay){const c=out.c.at(-1)!;out.t.push(decisionDay+DAY);out.h.push(c);out.l.push(c);out.c.push(c);out.qv.push(0);}
  return out;
 }).filter(s=>s.t.length>0),T0,days);
 const elig=grid.coins.map(c=>eligibility(c,days)),member=membership(grid,elig,TREND_LIVE.universe.universeSize);
 const names=grid.coins.map(c=>c.symbol),inUniverse=names.map((_,k)=>member[k][Tl]===1);
 const members=names.filter((_,k)=>inUniverse[k]).sort(),count=members.length,slot=count?1/Math.min(TREND_LIVE.universe.universeSize,count):0;
 const scale={} as Record<AccountId,number>,signals={} as Record<AccountId,Record<string,number>>,weights={} as Record<AccountId,Record<string,number>>;
 for(const account of ACCOUNTS){
  const rule=RULE_OF[account],pos=grid.coins.map(c=>rule?positions(rule,c,days):new Uint8Array(days).fill(1));
  // O fator de escala da decisão do dia Tl é o do índice Tl+1 (o retorno bruto do dia sintético é zero e não entra na estimativa).
  const s=scaledPortfolio(grid,pos,member,TREND_LIVE.universe.universeSize,TREND_LIVE.assumedCostPerSide,0,days-1).scale[days-1];
  scale[account]=s;signals[account]={};weights[account]={};
  names.forEach((name,k)=>{if(!inUniverse[k])return;signals[account][name]=pos[k][Tl];weights[account][name]=pos[k][Tl]?s*slot:0;});
 }
 return {decisionDay:new Date(decisionDay).toISOString().slice(0,10),members,scale,signals,weights};
}

// ---------- execução simulada contra o livro de ofertas ----------
export type Level=[price:number,qty:number];
export interface Quote {mid:number;asks:Level[];bids:Level[]}
export interface Fill {qty:number;value:number;avg:number;filledAll:boolean}
/** Compra a mercado gastando até `budget` (moeda de cotação), subindo pelas ofertas de venda. */
export function walkBuy(asks:readonly Level[],budget:number):Fill{
 let qty=0,spent=0,left=budget;
 for(const [price,size] of asks){if(left<=1e-9)break;const take=Math.min(size,left/price);qty+=take;spent+=take*price;left-=take*price;}
 return {qty,value:spent,avg:qty?spent/qty:0,filledAll:left<=1e-6};
}
/** Vende a mercado `quantity` da moeda, descendo pelas ofertas de compra. */
export function walkSell(bids:readonly Level[],quantity:number):Fill{
 let sold=0,got=0,left=quantity;
 for(const [price,size] of bids){if(left<=1e-12)break;const take=Math.min(size,left);sold+=take;got+=take*price;left-=take;}
 return {qty:sold,value:got,avg:sold?got/sold:0,filledAll:left<=1e-9};
}

export interface Order {symbol:string;side:'BUY'|'SELL';requestedNotional:number;qty:number;avgPrice:number;notional:number;fee:number;mid:number;close:number;
 slipBps:number;delayBps:number;feeBps:number;totalBps:number;filledAll:boolean}
export interface Skipped {symbol:string;reason:'MIN_NOTIONAL'|'NO_BOOK'|'NO_CASH';requestedNotional:number}
export interface AccountState {cash:number;positions:Record<string,number>;peak:number;halted:boolean}
export interface Rebalance {state:AccountState;orders:Order[];skipped:Skipped[];equityBefore:number;equity:number;drawdown:number}
export const initialState=():AccountState=>({cash:TREND_LIVE.initialCapital,positions:{},peak:TREND_LIVE.initialCapital,halted:false});

const equityOf=(state:AccountState,quotes:Record<string,Quote>,closes:Record<string,number>)=>
 state.cash+Object.entries(state.positions).reduce((s,[sym,q])=>s+q*(quotes[sym]?.mid??closes[sym]??0),0);

/** Marca a conta a mercado sem negociar (rodada repetida no mesmo dia). */
export function mark(state:AccountState,quotes:Record<string,Quote>,closes:Record<string,number>):Rebalance{
 const equity=equityOf(state,quotes,closes),peak=Math.max(state.peak,equity),halted=state.halted||equity<=peak*(1-TREND_LIVE.maximumDrawdown);
 return {state:{cash:state.cash,positions:{...state.positions},peak,halted},orders:[],skipped:[],equityBefore:equity,equity,drawdown:1-equity/peak};
}

/**
 * Leva a conta aos pesos-alvo: vendas primeiro, depois compras, a mercado contra o livro, taxa taker fixa, sem ordens abaixo do valor mínimo.
 * Queda de 30% desde o pico zera a conta e a encerra (`halted`). Quantidades fracionárias: o passo de lote da corretora não é simulado.
 */
export function rebalance(state:AccountState,weights:Record<string,number>,quotes:Record<string,Quote>,closes:Record<string,number>):Rebalance{
 const fee=TREND_LIVE.takerFee,min=TREND_LIVE.minOrderNotional,equityBefore=equityOf(state,quotes,closes),peak=Math.max(state.peak,equityBefore);
 const halted=state.halted||equityBefore<=peak*(1-TREND_LIVE.maximumDrawdown);
 const next:AccountState={cash:state.cash,positions:{...state.positions},peak,halted},orders:Order[]=[],skipped:Skipped[]=[];
 const symbols=[...new Set([...Object.keys(state.positions),...Object.keys(weights)])].sort();
 const target=(s:string)=>halted?0:weights[s]??0;
 const record=(symbol:string,side:'BUY'|'SELL',requested:number,fill:Fill,q:Quote)=>{
  const sgn=side==='BUY'?1:-1,close=closes[symbol]??q.mid,feeValue=fill.value*fee;
  orders.push({symbol,side,requestedNotional:requested,qty:fill.qty,avgPrice:fill.avg,notional:fill.value,fee:feeValue,mid:q.mid,close,
   slipBps:sgn*(fill.avg-q.mid)/q.mid*1e4,delayBps:sgn*(q.mid-close)/close*1e4,feeBps:fee*1e4,totalBps:sgn*(fill.avg-close)/close*1e4+fee*1e4,filledAll:fill.filledAll});
  return feeValue;
 };
 for(const pass of ['SELL','BUY'] as const)for(const symbol of symbols){
  const held=next.positions[symbol]??0,q=quotes[symbol],want=target(symbol)*equityBefore;
  if(!q){if(held>0||want>0)skipped.push({symbol,reason:'NO_BOOK',requestedNotional:Math.abs(want-held*(closes[symbol]??0))});continue;}
  const delta=want-held*q.mid;
  if(pass==='SELL'&&delta<0){
   const requested=-delta;if(requested<min){if(requested>=1)skipped.push({symbol,reason:'MIN_NOTIONAL',requestedNotional:requested});continue;}
   const all=requested>=held*q.mid-1e-9,qty=all?held:requested/q.mid,fill=walkSell(q.bids,qty);
   next.cash+=fill.value-record(symbol,'SELL',requested,fill,q);next.positions[symbol]=held-fill.qty;if(next.positions[symbol]<=1e-12)delete next.positions[symbol];
  }
  if(pass==='BUY'&&delta>0){
   if(delta<min){if(delta>=1)skipped.push({symbol,reason:'MIN_NOTIONAL',requestedNotional:delta});continue;}
   const budget=Math.min(delta,next.cash/(1+fee));if(budget<min){skipped.push({symbol,reason:'NO_CASH',requestedNotional:delta});continue;}
   const fill=walkBuy(q.asks,budget);next.cash-=fill.value+record(symbol,'BUY',delta,fill,q);next.positions[symbol]=held+fill.qty;
  }
 }
 const equity=equityOf(next,quotes,closes);
 return {state:next,orders,skipped,equityBefore,equity,drawdown:1-equity/peak};
}

// ---------- livro-razão encadeado ----------
export interface AccountRun {targetWeights:Record<string,number>;signals:Record<string,number>;scale:number;orders:Order[];skipped:Skipped[];cash:number;positions:Record<string,number>;
 equityBefore:number;equity:number;peak:number;drawdown:number;halted:boolean}
export interface RunRecord {n:number;runAt:string;decisionDay:string;decided:boolean;delaySeconds:number;missedDays:number;members:string[];dataSha256:string;
 accounts:Record<AccountId,AccountRun>;prevHash:string;hash:string}
export interface Ledger {protocol:string;initialCapital:number;runs:RunRecord[]}
export const GENESIS='0'.repeat(64);
const canonical=(x:unknown):string=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']'
 :'{'+Object.keys(x as object).sort().map(k=>JSON.stringify(k)+':'+canonical((x as Record<string,unknown>)[k])).join(',')+'}';
export const recordHash=(rec:Omit<RunRecord,'hash'>)=>createHash('sha256').update(canonical(rec)).digest('hex');
/** Cada registro guarda o hash do anterior; qualquer edição ou remoção de uma rodada passada quebra a cadeia. */
export function verifyLedger(ledger:Ledger):{ok:boolean;brokenAt:number|null}{
 let prev=GENESIS;
 for(const [i,r] of ledger.runs.entries()){
  const {hash,...body}=r;
  if(r.n!==i+1||r.prevHash!==prev||recordHash(body)!==hash)return {ok:false,brokenAt:i};
  prev=hash;
 }
 return {ok:true,brokenAt:null};
}
