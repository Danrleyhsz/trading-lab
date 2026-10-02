export type Side="BUY"|"SELL";
export interface PaperOrder{symbol:string;side:Side;quantity:number;referencePrice:number}
export interface PaperFill extends PaperOrder{id:string;fillPrice:number;fee:number;filledAt:string}
export interface Broker{submit(order:PaperOrder):Promise<PaperFill>}
export class PaperBroker implements Broker{constructor(private feeRate=0.00055,private slippageBps=1){}async submit(o:PaperOrder){if(o.quantity<=0||o.referencePrice<=0)throw new Error("invalid order");const direction=o.side==="BUY"?1:-1;const fillPrice=o.referencePrice*(1+direction*this.slippageBps/10000);return{id:crypto.randomUUID(),...o,fillPrice,fee:fillPrice*o.quantity*this.feeRate,filledAt:new Date().toISOString()}}}