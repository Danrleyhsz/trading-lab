import type {PaperFill} from './broker.js';
import type {DomainEvent} from './events.js';

interface OpenTrade {
  symbol:string; instrument:string; direction:'LONG'|'SHORT'; openedAt:string;
  quantity:number; averageEntry:number; grossPnl:number; feesPaid:number; fundingCashDelta:number;
  fillEventIds:string[]; fundingEventIds:string[];
}
export interface ClosedPaperTrade extends Omit<OpenTrade,'quantity'|'averageEntry'> {
  closedAt:string; netPnl:number;
}
export interface AccountPerformance {
  available:boolean; reason:string|null; coverage:'RECORDED_LEDGER_ONLY';
  closedTrades:ClosedPaperTrade[];
  openTrades:(OpenTrade & {netRealizedPnl:number})[];
  summary:{closedTrades:number;wins:number;losses:number;breakeven:number;winRate:number|null;closedNetPnl:number;openNetRealizedPnl:number;realizedNetPnl:number;feesPaid:number;fundingCashDelta:number};
}
const blank = ():AccountPerformance => ({
  available:true,reason:null,coverage:'RECORDED_LEDGER_ONLY',closedTrades:[],openTrades:[],
  summary:{closedTrades:0,wins:0,losses:0,breakeven:0,winRate:null,closedNetPnl:0,openNetRealizedPnl:0,realizedNetPnl:0,feesPaid:0,fundingCashDelta:0},
});
/**
 * Read-only position lifecycles: flat -> open -> flat. A reversal closes the old
 * lifecycle and opens another, allocating its one actual fee proportionally.
 * Economic timestamps preserve late-published funding. Funding at the exact
 * fill timestamp precedes that fill, matching the book's strict '<' rule.
 */
export function projectAccountPerformance(ledger:DomainEvent[],accountId:string,instrument:string):AccountPerformance {
  try {
    const result=blank(), open=new Map<string,OpenTrade>(), ids=new Set<string>();
    const items=ledger.map((e,index)=>{
      if (!e.id || ids.has(e.id)) throw Error('duplicate or missing source event');
      ids.add(e.id);
      const payload=e.payload as {fill?:PaperFill;accountId?:string;timestamp?:number};
      const time=e.type==='PAPER_FILL'?Date.parse(payload.fill?.filledAt??''):e.type==='FUNDING_SETTLED'?payload.timestamp:undefined;
      if ((e.type==='PAPER_FILL'||e.type==='FUNDING_SETTLED') && !Number.isFinite(time)) throw Error('missing economic timestamp');
      return {e,index,time:time??0};
    }).filter(item=>item.e.type==='PAPER_FILL'||item.e.type==='FUNDING_SETTLED')
      .sort((a,b)=>a.time-b.time || (a.e.type===b.e.type?a.index-b.index:a.e.type==='FUNDING_SETTLED'?-1:1));
    for (const {e} of items) {
      const payload=e.payload as {fill?:PaperFill;accountId?:string;quantity?:number;cashDelta?:number;symbol?:string};
      if (e.type==='FUNDING_SETTLED') {
        if (payload.accountId!==accountId || !Number.isFinite(payload.cashDelta) || !Number.isFinite(payload.quantity)) throw Error('unattributed funding');
        // Current perpetual book supports BTCUSDT; the instrument stays explicit.
        const symbol=payload.symbol??'BTCUSDT', trade=open.get(symbol);
        if (!trade || Math.abs(trade.quantity-payload.quantity!)>1e-9) throw Error('funding exposure does not match recorded fills');
        trade.fundingCashDelta+=payload.cashDelta!;trade.fundingEventIds.push(e.id);result.summary.fundingCashDelta+=payload.cashDelta!;
        continue;
      }
      const fill=payload.fill;
      if (!fill || fill.accountId!==accountId || !fill.symbol || !['BUY','SELL'].includes(fill.side) ||
          !Number.isFinite(fill.quantity)||fill.quantity<=0 || !Number.isFinite(fill.fillPrice)||fill.fillPrice<=0 ||
          !Number.isFinite(fill.fee)||fill.fee<0 ||
          (instrument==='LEGACY_PAPER_V1'?!!fill.instrument:fill.instrument!==instrument)) throw Error('invalid or unattributed fill');
      result.summary.feesPaid+=fill.fee;
      const signed=(fill.side==='BUY'?1:-1)*fill.quantity, old=open.get(fill.symbol);
      const begin=(quantity:number,fee:number)=>{
        open.set(fill.symbol,{symbol:fill.symbol,instrument,direction:quantity>0?'LONG':'SHORT',openedAt:fill.filledAt,quantity,averageEntry:fill.fillPrice,grossPnl:0,feesPaid:fee,fundingCashDelta:0,fillEventIds:[e.id],fundingEventIds:[]});
      };
      if (!old) {begin(signed,fill.fee);continue;}
      if (Math.sign(old.quantity)===Math.sign(signed)) {
        old.averageEntry=(Math.abs(old.quantity)*old.averageEntry+fill.quantity*fill.fillPrice)/(Math.abs(old.quantity)+fill.quantity);
        old.quantity+=signed;old.feesPaid+=fill.fee;old.fillEventIds.push(e.id);continue;
      }
      const closing=Math.min(Math.abs(old.quantity),fill.quantity), closingFee=fill.fee*closing/fill.quantity;
      old.grossPnl+=closing*(fill.fillPrice-old.averageEntry)*Math.sign(old.quantity);
      old.feesPaid+=closingFee;old.fillEventIds.push(e.id);
      const remaining=old.quantity+signed;
      if (remaining===0 || Math.sign(remaining)!==Math.sign(old.quantity)) {
        const {quantity,averageEntry,...record}=old;
        result.closedTrades.push({...record,closedAt:fill.filledAt,netPnl:old.grossPnl-old.feesPaid+old.fundingCashDelta});
        open.delete(fill.symbol);
        if (remaining!==0) begin(remaining,fill.fee-closingFee);
      } else old.quantity=remaining;
    }
    result.openTrades=[...open.values()].map(trade=>({...trade,netRealizedPnl:trade.grossPnl-trade.feesPaid+trade.fundingCashDelta}));
    const s=result.summary;s.closedTrades=result.closedTrades.length;
    s.wins=result.closedTrades.filter(t=>t.netPnl>1e-8).length;s.losses=result.closedTrades.filter(t=>t.netPnl<-1e-8).length;s.breakeven=s.closedTrades-s.wins-s.losses;
    s.winRate=s.closedTrades?s.wins/s.closedTrades:null;s.closedNetPnl=result.closedTrades.reduce((sum,t)=>sum+t.netPnl,0);
    s.openNetRealizedPnl=result.openTrades.reduce((sum,t)=>sum+t.netRealizedPnl,0);s.realizedNetPnl=s.closedNetPnl+s.openNetRealizedPnl;
    if (result.openTrades.some(t=>[t.quantity,t.averageEntry,t.grossPnl,t.feesPaid,t.fundingCashDelta,t.netRealizedPnl].some(v=>!Number.isFinite(v)))) throw Error('non-finite position outcome');
    if (Object.values(s).some(value=>value!==null&&!Number.isFinite(value))) throw Error('non-finite performance');
    return result;
  } catch(error) {
    // Missing provenance stays unavailable; never infer a trade or a winning record.
    return {...blank(),available:false,reason:error instanceof Error?error.message:'performance evidence unavailable'};
  }
}
