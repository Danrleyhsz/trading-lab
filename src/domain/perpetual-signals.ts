import type {Candle} from './backtest.js';
import type {PerpetualConfig} from './perpetual-backtest.js';

/** Researcher hypotheses as entry filters (TEAM_FILTERS_V1). They can only veto opening or reversing a position, never force one. */
export interface TeamFilters {regime?:true;volatility?:true;momentum?:true}
// Regime uses 720 hours (30 days): a 480-hour breakout is always above a shorter average, so it could never veto.
export const TEAM_FILTER_WARMUP={regime:720,volatility:169,momentum:25} as const;
export function validTeamFilters(filters:unknown):filters is TeamFilters|undefined{
 if(filters===undefined)return true;
 if(!filters||typeof filters!=='object'||Array.isArray(filters))return false;
 const entries=Object.entries(filters);return entries.length>0&&entries.every(([k,v])=>Object.hasOwn(TEAM_FILTER_WARMUP,k)&&v===true);
}
export const teamFilterWarmup=(filters?:TeamFilters)=>Math.max(0,...Object.keys(filters??{}).map(k=>TEAM_FILTER_WARMUP[k as keyof TeamFilters]));
function dailyVolatility(closes:number[],bars:number){
 const window=closes.slice(-bars-1),returns=window.slice(1).map((c,i)=>Math.log(c/window[i]));
 const mean=returns.reduce((s,r)=>s+r,0)/returns.length;return Math.sqrt(returns.reduce((s,r)=>s+(r-mean)**2,0)/returns.length)*Math.sqrt(24);
}
/** Whether every enabled filter agrees with opening `direction` on these closed candles. */
export function teamFiltersAllow(closed:Candle[],filters:TeamFilters,direction:number){
 const closes=closed.map(c=>c.close),last=closes.at(-1)!;
 if(closes.length<teamFilterWarmup(filters))throw Error('insufficient filter history');
 // Oracle: trade only with the 30-day (720-hour) regime.
 if(filters.regime){const sma=closes.slice(-720).reduce((s,c)=>s+c,0)/720;if(direction>0?last<=sma:last>=sma)return false;}
 // Vega: no new exposure while daily volatility (24h) is expanding beyond 1.5x the 7-day level.
 if(filters.volatility&&dailyVolatility(closes,24)>1.5*dailyVolatility(closes,168))return false;
 // Satoshi: 24h momentum must point the same way.
 if(filters.momentum&&Math.sign(last/closes.at(-25)!-1)!==direction)return false;
 return true;
}
export function perpetualDirection(closed:Candle[],config:PerpetualConfig,currentQuantity=0){
 const direction=baseDirection(closed,config,currentQuantity);
 if(!config.filters||direction===0||direction===Math.sign(currentQuantity))return direction;
 // A vetoed reversal still closes the current position; it just does not open the opposite one.
 return teamFiltersAllow(closed,config.filters,direction)?direction:0;
}
function baseDirection(closed:Candle[],config:PerpetualConfig,currentQuantity:number){if(closed.length<config.slowPeriod)throw Error('insufficient signal history');const last=closed.at(-1)!.close;const window=closed.slice(-config.slowPeriod);const mean=window.reduce((sum,c)=>sum+c.close,0)/window.length;
 if(config.strategy==='BREAKOUT'){const prior=closed.slice(-config.slowPeriod-1,-1);return last>Math.max(...prior.map(c=>c.high))?1:last<Math.min(...prior.map(c=>c.low))?-1:Math.sign(currentQuantity);}
 if(config.strategy==='MEAN_REVERSION'){const sd=Math.sqrt(window.reduce((sum,c)=>sum+(c.close-mean)**2,0)/window.length);const z=sd?(last-mean)/sd:0;return z>1.5?-1:z< -1.5?1:0;}
 const fast=closed.slice(-config.fastPeriod).reduce((sum,c)=>sum+c.close,0)/config.fastPeriod;return Math.sign(fast-mean);
}

/**
 * Proteções inspiradas no Freqtrade (só a ideia; nenhum código copiado). Elas só bloqueiam ABRIR posição;
 * fechar continua sempre permitido. A mesma função vale no backtest e no piloto ao vivo.
 * - cooldownHours: pausa depois de encerrar uma operação;
 * - maxConsecutiveLosses + lossPauseHours: após N perdas seguidas, pausa de entradas por X horas.
 */
export interface Protections {cooldownHours?:number;maxConsecutiveLosses?:number;lossPauseHours?:number}
export function validProtections(p:unknown):p is Protections|undefined{
 if(p===undefined)return true;if(!p||typeof p!=='object'||Array.isArray(p))return false;
 const v=p as Record<string,unknown>,keys=Object.keys(v);if(!keys.length||keys.some(k=>!['cooldownHours','maxConsecutiveLosses','lossPauseHours'].includes(k)))return false;
 const int=(x:unknown,min:number,max:number)=>x===undefined||(Number.isInteger(x)&&(x as number)>=min&&(x as number)<=max);
 if(!int(v.cooldownHours,1,720)||!int(v.maxConsecutiveLosses,1,20)||!int(v.lossPauseHours,1,720))return false;
 return (v.maxConsecutiveLosses===undefined)===(v.lossPauseHours===undefined);
}
export function protectionsAllowEntry(p:Protections|undefined,closed:{closedAt:number;netPnl:number}[],now:number):{allowed:boolean;reason:'COOLDOWN'|'LOSS_STREAK_PAUSE'|null}{
 if(!p||!closed.length)return {allowed:true,reason:null};
 const ordered=[...closed].sort((a,b)=>a.closedAt-b.closedAt),last=ordered.at(-1)!;
 if(p.cooldownHours&&now-last.closedAt<p.cooldownHours*3600000)return {allowed:false,reason:'COOLDOWN'};
 if(p.maxConsecutiveLosses&&p.lossPauseHours&&ordered.length>=p.maxConsecutiveLosses&&ordered.slice(-p.maxConsecutiveLosses).every(t=>t.netPnl<0)&&now-last.closedAt<p.lossPauseHours*3600000)return {allowed:false,reason:'LOSS_STREAK_PAUSE'};
 return {allowed:true,reason:null};
}
