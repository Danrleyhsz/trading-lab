import type {Candle} from './backtest.js';
import type {FundingSettlement} from './perpetual-backtest.js';

/**
 * Simulador de sinais para pesquisa (docs/research/video-strategy-hypotheses.md, protocolo VIDEO_HYPOTHESES_V1).
 * Mesmas convenções do backtestPerpetual do laboratório, mas em tempo linear e com stop, alvo e limite de tempo:
 *  1. abertura da vela i: executa o que foi decidido no fechamento de i-1 (preço de abertura ± slippage, mais a taxa);
 *  2. funding liquidado antes da abertura vale para a posição carregada; o restante da hora, para a posição nova;
 *  3. durante a vela i: stop e alvo pela máxima e mínima; se os dois forem tocados na mesma vela, vale o stop (pior caso);
 *     abertura além do stop ou do alvo executa na própria abertura;
 *  4. fechamento de i: marca pelo fechamento e pede a decisão da estratégia, que só pode usar velas 0..i.
 * Só simulação histórica: não emite eventos de corretora nem grava contas.
 */
export interface Intent {side:1|-1;stop?:number;target?:number;maxBars?:number}
export type Decision=Intent|'EXIT'|null;
export interface OpenPosition {side:1|-1;entryIndex:number;entryPrice:number;quantity:number;stop?:number;target?:number;maxBars?:number}
/** Decide no fechamento da vela i; deve usar só informação das velas 0..i (verificado por lookahead-check nos testes). */
export type SignalStrategy=(i:number,position:OpenPosition|null)=>Decision;
export interface SignalBacktestConfig {initialCapital:number;positionFraction:number;feeRate:number;slippageBps:number;warmup:number}
export interface SignalTrade {side:1|-1;entryTime:number;exitTime:number;entryPrice:number;exitPrice:number;netPnl:number;fees:number;funding:number;reason:'SIGNAL'|'STOP'|'TARGET'|'TIME'|'END'}
export interface SignalBacktestResult {equity:{timestamp:number;equity:number}[];trades:SignalTrade[];netPnl:number;feesPaid:number;fundingCashDelta:number;exposureHours:number}
const HOUR=3600000;

export function signalBacktest(candles:readonly Candle[],funding:readonly FundingSettlement[],strategy:SignalStrategy,cfg:SignalBacktestConfig):SignalBacktestResult{
 if(!(cfg.initialCapital>0&&cfg.positionFraction>0&&cfg.positionFraction<=1&&cfg.feeRate>=0&&cfg.slippageBps>=0&&Number.isInteger(cfg.warmup)&&cfg.warmup>=0))throw new Error('invalid signal backtest config');
 const slip=cfg.slippageBps/10000,trades:SignalTrade[]=[],equity:{timestamp:number;equity:number}[]=[];
 // Estado mutável num objeto só: as funções internas e o laço enxergam o mesmo valor.
 const s={cash:cfg.initialCapital,position:null as OpenPosition|null,pending:null as Decision,fundingIndex:0,fees:0,funding:0,exposure:0,tradeFees:0,tradeFunding:0,entryTime:0};
 const fill=(price:number,side:number)=>price*(1+side*slip);
 const open=(i:number,intent:Intent,price:number,time:number)=>{
  const fillPrice=fill(price,intent.side),quantity=s.cash*cfg.positionFraction/price,fee=quantity*fillPrice*cfg.feeRate;
  s.cash-=fee;s.fees+=fee;s.tradeFees=fee;s.tradeFunding=0;s.entryTime=time;
  s.position={side:intent.side,entryIndex:i,entryPrice:fillPrice,quantity,stop:intent.stop,target:intent.target,maxBars:intent.maxBars};
 };
 const close=(price:number,time:number,reason:SignalTrade['reason'])=>{
  const p=s.position!,fillPrice=fill(price,-p.side),fee=p.quantity*fillPrice*cfg.feeRate,pnl=p.side*p.quantity*(fillPrice-p.entryPrice);
  s.cash+=pnl-fee;s.fees+=fee;s.tradeFees+=fee;
  trades.push({side:p.side,entryTime:s.entryTime,exitTime:time,entryPrice:p.entryPrice,exitPrice:fillPrice,netPnl:pnl-s.tradeFees+s.tradeFunding,fees:s.tradeFees,funding:s.tradeFunding,reason});
  s.position=null;
 };
 const settle=(until:number)=>{
  while(s.fundingIndex<funding.length&&funding[s.fundingIndex].timestamp<until){
   const f=funding[s.fundingIndex++],p=s.position;if(!p)continue;
   const delta=-p.side*p.quantity*f.markPrice*f.rate;s.cash+=delta;s.funding+=delta;s.tradeFunding+=delta;
  }
 };
 for(let i=0;i<candles.length;i++){
  const c=candles[i];
  settle(c.timestamp+1000);
  const action=s.pending;s.pending=null;
  if(action==='EXIT'){if(s.position)close(c.open,c.timestamp,s.position.maxBars!==undefined&&i-s.position.entryIndex>=s.position.maxBars?'TIME':'SIGNAL');}
  else if(action){if(s.position&&s.position.side!==action.side)close(c.open,c.timestamp,'SIGNAL');if(!s.position&&s.cash>0)open(i,action,c.open,c.timestamp);}
  settle(c.timestamp+HOUR);
  const p=s.position;
  if(p){
   // Abertura já além do stop ou do alvo executa na própria abertura (gap); senão, o stop tem prioridade (pior caso).
   const stopHit=p.stop!==undefined&&(p.side>0?c.low<=p.stop:c.high>=p.stop),targetHit=p.target!==undefined&&(p.side>0?c.high>=p.target:c.low<=p.target);
   if(stopHit)close(p.side>0?Math.min(c.open,p.stop!):Math.max(c.open,p.stop!),c.timestamp+HOUR-1,'STOP');
   else if(targetHit)close(p.side>0?Math.max(c.open,p.target!):Math.min(c.open,p.target!),c.timestamp+HOUR-1,'TARGET');
  }
  const q=s.position;
  if(q)s.exposure++;
  equity.push({timestamp:c.timestamp,equity:s.cash+(q?q.side*q.quantity*(c.close-q.entryPrice):0)});
  if(i===candles.length-1)break;
  if(q&&q.maxBars!==undefined&&i-q.entryIndex+1>=q.maxBars){s.pending='EXIT';continue;}
  if(i+1<cfg.warmup)continue;
  const decision=strategy(i,q?{...q}:null);
  if(decision==='EXIT'){if(q)s.pending='EXIT';}
  else if(decision&&(!q||q.side!==decision.side))s.pending=decision;
 }
 if(s.position){const last=candles.at(-1)!;close(last.close,last.timestamp+HOUR-1,'END');equity[equity.length-1]={timestamp:last.timestamp,equity:s.cash};}
 return {equity,trades,netPnl:s.cash-cfg.initialCapital,feesPaid:s.fees,fundingCashDelta:s.funding,exposureHours:s.exposure};
}
