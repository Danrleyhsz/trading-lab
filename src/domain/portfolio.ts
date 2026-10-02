import type{PaperFill,Side}from "./broker.js";
export interface Position{symbol:string;quantity:number;averageEntry:number;realizedPnl:number}
export interface PortfolioSnapshot{initialCash:number;cash:number;equity:number;realizedPnl:number;unrealizedPnl:number;positions:Position[]}
export class Portfolio{
 private cash:number;private positions=new Map<string,Position>();private marks=new Map<string,number>();
 constructor(readonly initialCash=10000){if(initialCash<=0)throw new Error("initial cash must be positive");this.cash=initialCash}
 applyFill(fill:PaperFill){const signed=fill.side==="BUY"?fill.quantity:-fill.quantity;const p=this.positions.get(fill.symbol)??{symbol:fill.symbol,quantity:0,averageEntry:0,realizedPnl:0};const old=p.quantity;
 if(old===0||Math.sign(old)===Math.sign(signed)){const q=old+signed;p.averageEntry=(Math.abs(old)*p.averageEntry+Math.abs(signed)*fill.fillPrice)/Math.abs(q);p.quantity=q}
 else{const closing=Math.min(Math.abs(old),Math.abs(signed));const pnl=closing*(fill.fillPrice-p.averageEntry)*Math.sign(old);p.realizedPnl+=pnl;this.cash+=pnl;const q=old+signed;if(q===0){p.quantity=0;p.averageEntry=0}else if(Math.sign(q)!==Math.sign(old)){p.quantity=q;p.averageEntry=fill.fillPrice}else p.quantity=q}
 this.cash-=fill.fee;this.positions.set(fill.symbol,p);this.marks.set(fill.symbol,fill.fillPrice)}
 mark(symbol:string,price:number){if(price>0)this.marks.set(symbol,price)}
 snapshot():PortfolioSnapshot{const ps=[...this.positions.values()].filter(p=>p.quantity!==0);const unrealized=ps.reduce((s,p)=>s+p.quantity*((this.marks.get(p.symbol)??p.averageEntry)-p.averageEntry),0);const realized=[...this.positions.values()].reduce((s,p)=>s+p.realizedPnl,0);return{initialCash:this.initialCash,cash:this.cash,equity:this.cash+unrealized,realizedPnl:realized,unrealizedPnl:unrealized,positions:ps.map(p=>({...p}))}}
}