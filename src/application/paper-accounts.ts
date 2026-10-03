import type {AgentId} from '../domain/agents.js';
import {PaperBroker, type PaperOrder, type PaperFill} from '../domain/broker.js';
import type {DomainEvent} from '../domain/events.js';
import {Portfolio} from '../domain/portfolio.js';
import {RiskEngine} from '../domain/risk.js';
import type {PaperAccountDefinition, StoredPaperAccount} from '../domain/paper-account.js';
import {EventBus} from './event-bus.js';
import {TradingService} from './trading-service.js';

interface RuntimeAccount {
 definition:PaperAccountDefinition;
 portfolio:Portfolio;
 trading:TradingService;
 ledger:DomainEvent[];
 pending:Promise<unknown>;
}
export class PaperAccounts {
 private accounts=new Map<string,RuntimeAccount>();
 constructor(private bus:EventBus, initialFundCash:number, restored:StoredPaperAccount[]=[]){
  for(const stored of restored)this.restore(stored);
  if(!this.accounts.has('fund'))this.add({id:'fund',kind:'FUND',ownerAgentId:null,initialCash:initialFundCash,createdAt:new Date().toISOString()});
  bus.subscribe(event=>this.record(event));
 }
 private add(definition:PaperAccountDefinition){
  if(this.accounts.has(definition.id))throw Error('duplicate account');
  if((definition.kind==='FUND')!==(definition.id==='fund')||((definition.kind==='FUND')!==(definition.ownerAgentId===null)))throw Error('invalid account definition');
  const portfolio=new Portfolio(definition.initialCash);
  this.accounts.set(definition.id,{definition:{id:definition.id,kind:definition.kind,ownerAgentId:definition.ownerAgentId,initialCash:definition.initialCash,createdAt:definition.createdAt},portfolio,trading:new TradingService(new PaperBroker(),portfolio,new RiskEngine(),this.bus),ledger:[],pending:Promise.resolve()});
 }
 private restore(stored:StoredPaperAccount){
  this.add(stored);
  const account=this.accounts.get(stored.id)!;
  const ids=new Set<string>();
  for(const event of stored.ledger){
   if(ids.has(event.id))throw Error('duplicate ledger event');
   ids.add(event.id);
   if(this.accountId(event)!==stored.id)throw Error('account ledger attribution mismatch');
   if(event.type==='PAPER_FILL'){
    const fill=(event.payload as {fill:PaperFill}).fill;
    if(!Number.isFinite(fill.quantity)||fill.quantity<=0||!Number.isFinite(fill.fillPrice)||fill.fillPrice<=0||!Number.isFinite(fill.fee)||fill.fee<0||!['BUY','SELL'].includes(fill.side))throw Error('invalid stored fill');
    account.portfolio.applyFill(fill);
   }
   account.ledger.push(structuredClone(event));
  }
 }
 private accountId(event:DomainEvent){
  const payload=event.payload as {accountId?:string;order?:PaperOrder;fill?:PaperFill};
  return payload?.accountId??payload?.order?.accountId??payload?.fill?.accountId;
 }
 private record(event:DomainEvent){
  const id=this.accountId(event);
  if(!id||id.endsWith(':usdm'))return;
  const account=this.accounts.get(id);
  if(!account)throw Error('unknown event account');
  if(!account.ledger.some(item=>item.id===event.id))account.ledger.push(structuredClone(event));
 }
 ensureEvaluation(ownerAgentId:AgentId,initialCash:number){
  const id='evaluation:'+ownerAgentId;
  if(!this.accounts.has(id))this.add({id,kind:'EVALUATION',ownerAgentId,initialCash,createdAt:new Date().toISOString()});
 }
 has(id:string){return this.accounts.has(id)}
 list(ownerAgentId?:AgentId){
  return [...this.accounts.values()].filter(account=>ownerAgentId===undefined||account.definition.ownerAgentId===ownerAgentId).map(account=>{
   const fills=account.ledger.filter(event=>event.type==='PAPER_FILL').map(event=>(event.payload as {fill:PaperFill}).fill);
   return {...structuredClone(account.definition),portfolio:account.portfolio.snapshot(),feesPaid:fills.reduce((sum,fill)=>sum+fill.fee,0),fills:fills.length,ledgerEvents:account.ledger.length};
  });
 }
 snapshot(id:string){return this.list().find(account=>account.id===id)}
 ledger(id:string){const account=this.accounts.get(id);if(!account)throw Error('unknown account');return structuredClone(account.ledger)}
 exportState():StoredPaperAccount[]{return [...this.accounts.values()].map(account=>({...structuredClone(account.definition),ledger:structuredClone(account.ledger)}))}
 mark(symbol:string,price:number){for(const account of this.accounts.values())account.portfolio.mark(symbol,price)}
 propose(id:string,order:PaperOrder){
  const account=this.accounts.get(id);
  if(!account)throw Error('unknown account');
  // Attribution is assigned by the account book, never copied from the caller.
  const proposalId=crypto.randomUUID(),agentId=account.definition.ownerAgentId??'nova';
  const attributed:PaperOrder={symbol:order.symbol,side:order.side,quantity:order.quantity,referencePrice:order.referencePrice,accountId:id,agentId,proposalId,...(order.strategyId?{strategyId:order.strategyId}:{})};
  const run=async()=>({...await account.trading.propose(attributed),accountId:id,agentId,proposalId});
  // Risk sees all previous fills, including concurrent requests on this account.
  const result=account.pending.then(run);
  account.pending=result.catch(()=>{});
  return result;
 }
}
