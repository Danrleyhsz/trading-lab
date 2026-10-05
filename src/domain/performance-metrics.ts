// Métricas de desempenho no estilo do quantstats (só a ideia; implementação própria).
// Entrada: equity ao longo do tempo e, opcionalmente, o resultado líquido de cada operação encerrada.
// Nada é estimado quando faltam dados: a métrica fica null e o motivo é explicado na tela.

const HOUR=3600000,YEAR=365*24*HOUR;
export interface EquityPoint {timestamp:number;equity:number}
export interface TradeResult {netPnl:number;openedAt?:number;closedAt?:number}
export interface PerformanceMetrics {
 from:string|null;to:string|null;hours:number;
 totalReturn:number|null;annualizedReturn:number|null;annualizedVolatility:number|null;
 sharpe:number|null;sortino:number|null;calmar:number|null;
 maxDrawdown:number|null;maxDrawdownHours:number|null;timeInMarket:number|null;
 trades:number;winRate:number|null;profitFactor:number|null;averageWin:number|null;averageLoss:number|null;
 bestTrade:number|null;worstTrade:number|null;longestLosingStreak:number;
 notes:string[];
}
/** Agrupa a equity por hora (último ponto de cada hora). */
export function hourlyEquity(points:EquityPoint[]){
 const byHour=new Map<number,EquityPoint>();for(const p of points)if(Number.isFinite(p.equity)&&Number.isFinite(p.timestamp))byHour.set(Math.floor(p.timestamp/HOUR),p);
 return [...byHour.values()].sort((a,b)=>a.timestamp-b.timestamp);
}
export function performanceMetrics(points:EquityPoint[],trades:TradeResult[]=[],exposure?:{inMarketHours:number}):PerformanceMetrics{
 const equity=hourlyEquity(points),notes:string[]=[];
 const results=trades.map(t=>t.netPnl).filter(Number.isFinite);
 const wins=results.filter(r=>r>0),losses=results.filter(r=>r<0);
 let streak=0,longest=0;for(const r of results){streak=r<0?streak+1:0;longest=Math.max(longest,streak);}
 const tradeStats={trades:results.length,winRate:results.length?wins.length/results.length:null,
  profitFactor:losses.length?wins.reduce((s,r)=>s+r,0)/Math.abs(losses.reduce((s,r)=>s+r,0)):wins.length?null:null,
  averageWin:wins.length?wins.reduce((s,r)=>s+r,0)/wins.length:null,averageLoss:losses.length?losses.reduce((s,r)=>s+r,0)/losses.length:null,
  bestTrade:results.length?Math.max(...results):null,worstTrade:results.length?Math.min(...results):null,longestLosingStreak:longest};
 if(results.length&&!losses.length)notes.push('Sem operações perdedoras: fator de lucro indefinido.');
 if(equity.length<3){notes.push('Menos de 3 horas de equity registradas: métricas de retorno indisponíveis.');
  return {from:equity[0]?new Date(equity[0].timestamp).toISOString():null,to:equity.at(-1)?new Date(equity.at(-1)!.timestamp).toISOString():null,hours:equity.length,totalReturn:null,annualizedReturn:null,annualizedVolatility:null,sharpe:null,sortino:null,calmar:null,maxDrawdown:null,maxDrawdownHours:null,timeInMarket:null,...tradeStats,notes};}
 const returns=equity.slice(1).map((p,i)=>equity[i].equity>0?p.equity/equity[i].equity-1:0);
 const n=returns.length,mean=returns.reduce((s,r)=>s+r,0)/n,sd=Math.sqrt(returns.reduce((s,r)=>s+(r-mean)**2,0)/n);
 const downside=Math.sqrt(returns.reduce((s,r)=>s+Math.min(0,r)**2,0)/n),perYear=24*365;
 const span=equity.at(-1)!.timestamp-equity[0].timestamp,total=equity.at(-1)!.equity/equity[0].equity-1;
 let peak=equity[0].equity,peakAt=equity[0].timestamp,maxDd=0,maxDdHours=0;
 for(const p of equity){if(p.equity>=peak){peak=p.equity;peakAt=p.timestamp;}else{maxDd=Math.max(maxDd,1-p.equity/peak);maxDdHours=Math.max(maxDdHours,(p.timestamp-peakAt)/HOUR);}}
 const annualized=span>0?Math.pow(1+total,YEAR/span)-1:null;
 if(span<30*24*HOUR)notes.push('Menos de 30 dias: valores anualizados são instáveis e servem só de referência.');
 return {from:new Date(equity[0].timestamp).toISOString(),to:new Date(equity.at(-1)!.timestamp).toISOString(),hours:equity.length,
  totalReturn:total,annualizedReturn:annualized,annualizedVolatility:sd*Math.sqrt(perYear),
  sharpe:sd>0?mean/sd*Math.sqrt(perYear):null,sortino:downside>0?mean/downside*Math.sqrt(perYear):null,
  calmar:maxDd>0&&annualized!==null?annualized/maxDd:null,maxDrawdown:maxDd,maxDrawdownHours:maxDdHours,
  timeInMarket:exposure?Math.min(1,exposure.inMarketHours/Math.max(1,span/HOUR)):null,...tradeStats,notes};
}
