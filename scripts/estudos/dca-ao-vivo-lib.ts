// Motor da execução simulada DCA_BTC_ETH_AO_VIVO_V1 (docs/PROTOCOLO_DCA_AO_VIVO.md). Funções puras, sem rede.
// Reaproveita a execução contra o livro e a cadeia de hashes da tendência ao vivo. Não envia ordens, não usa contas nem chaves.
import {createHash} from 'node:crypto';
import {GENESIS,canonical,walkBuy,type Quote} from './tendencia-ao-vivo-lib.js';

export type DcaAccountId='DCA_SIMPLES'|'DCA_PAUSA_SMA200';
export const DCA_ACCOUNTS:readonly DcaAccountId[]=['DCA_SIMPLES','DCA_PAUSA_SMA200'];
export const DCA_LIVE=Object.freeze({version:'DCA_BTC_ETH_AO_VIVO_V1',declaredAt:'2026-10-23',symbols:['BTCUSDT','ETHUSDT'] as const,
 monthlyPerSymbol:50,takerFee:0.001,minOrderNotional:10,smaDays:200,depthLevels:100});

export interface DcaOrder {symbol:string;notional:number;qty:number;avgPrice:number;fee:number;mid:number;close:number;slipBps:number;totalBps:number;filledAll:boolean}
export interface DcaAccountState {cash:Record<string,number>;positions:Record<string,number>;invested:number}
export interface DcaAccountRun extends DcaAccountState {orders:DcaOrder[];held:{symbol:string;reason:'BELOW_SMA200'|'MIN_NOTIONAL'|'NO_BOOK';cash:number}[];equity:number}
export interface DcaRunRecord {n:number;runAt:string;month:string;contributed:boolean;missedMonths:number;closes:Record<string,number>;sma200:Record<string,number>;
 accounts:Record<DcaAccountId,DcaAccountRun>;prevHash:string;hash:string}
export interface DcaLedger {protocol:string;runs:DcaRunRecord[]}

export const emptyState=():DcaAccountState=>({cash:{},positions:{},invested:0});
export const sma=(closes:readonly number[],n:number)=>closes.length<n?NaN:closes.slice(-n).reduce((s,x)=>s+x,0)/n;
/** Meses calendário entre dois 'AAAA-MM' (b depois de a). */
export const monthsBetween=(a:string,b:string)=>(+b.slice(0,4)-+a.slice(0,4))*12+(+b.slice(5,7)-+a.slice(5,7));

/** Uma rodada de uma conta: aporte (se for o primeiro do mês), decisão por moeda e compra a mercado contra o livro. */
export function step(account:DcaAccountId,prev:DcaAccountState,contribute:boolean,quotes:Record<string,Quote|undefined>,closes:Record<string,number>,sma200:Record<string,number>):DcaAccountRun{
 const {takerFee:fee,minOrderNotional:min,monthlyPerSymbol}=DCA_LIVE,s:DcaAccountState={cash:{...prev.cash},positions:{...prev.positions},invested:prev.invested};
 const orders:DcaOrder[]=[],held:DcaAccountRun['held']=[];
 for(const symbol of DCA_LIVE.symbols){
  if(contribute){s.cash[symbol]=(s.cash[symbol]??0)+monthlyPerSymbol;s.invested+=monthlyPerSymbol;}
  const cash=s.cash[symbol]??0,q=quotes[symbol];if(cash<=0)continue;
  // Média indisponível (NaN) conta como "não acima": a pausa nunca compra sem a média calculada.
  if(account==='DCA_PAUSA_SMA200'&&!(closes[symbol]>sma200[symbol])){held.push({symbol,reason:'BELOW_SMA200',cash});continue;}
  if(!q){held.push({symbol,reason:'NO_BOOK',cash});continue;}
  const budget=cash/(1+fee);if(budget<min){held.push({symbol,reason:'MIN_NOTIONAL',cash});continue;}
  const fill=walkBuy(q.asks,budget),feeValue=fill.value*fee,close=closes[symbol]??q.mid;
  s.cash[symbol]=cash-fill.value-feeValue;s.positions[symbol]=(s.positions[symbol]??0)+fill.qty;
  orders.push({symbol,notional:fill.value,qty:fill.qty,avgPrice:fill.avg,fee:feeValue,mid:q.mid,close,slipBps:(fill.avg-q.mid)/q.mid*1e4,
   totalBps:(fill.avg-close)/close*1e4+fee*1e4,filledAll:fill.filledAll});
 }
 const equity=DCA_LIVE.symbols.reduce((e,sym)=>e+(s.cash[sym]??0)+(s.positions[sym]??0)*(quotes[sym]?.mid??closes[sym]??0),0);
 return {...s,orders,held,equity};
}

export const dcaHash=(rec:Omit<DcaRunRecord,'hash'>)=>createHash('sha256').update(canonical(rec)).digest('hex');
/** Cada registro guarda o hash do anterior; qualquer edição ou remoção de uma rodada passada quebra a cadeia. */
export function verifyDcaLedger(ledger:DcaLedger):{ok:boolean;brokenAt:number|null}{
 let prev=GENESIS;
 for(const [i,r] of ledger.runs.entries()){const {hash,...body}=r;if(r.n!==i+1||r.prevHash!==prev||dcaHash(body)!==hash)return {ok:false,brokenAt:i};prev=hash;}
 return {ok:true,brokenAt:null};
}
