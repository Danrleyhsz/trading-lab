import {createHmac} from 'node:crypto';

/**
 * Cliente do ambiente de testes de futuros USD-M da Binance (Demo Trading, dinheiro fictício). Só aceita o endereço de
 * testes: qualquer outro host, inclusive o de produção (fapi.binance.com), é recusado na construção. Não faz parte do
 * piloto nem do servidor; serve para validar ordens, taxas e execução reais antes de qualquer decisão sobre dinheiro
 * real (docs/TESTNET_BINANCE.md). A chave e o segredo vêm de fora do código e nunca aparecem em mensagens de erro.
 */
export const DEMO_FUTURES_BASE='https://demo-fapi.binance.com' as const;
export interface DemoCredentials {apiKey:string;apiSecret:string}
export interface SymbolRules {symbol:string;stepSize:number;minQty:number;minNotional:number;tickSize:number}
export interface DemoOrder {orderId:number;clientOrderId:string;symbol:string;side:'BUY'|'SELL';status:string;executedQty:number;avgPrice:number;cumQuote:number;reduceOnly:boolean;updateTime:number}
type Params=Record<string,string|number|boolean>;

export class BinanceFuturesDemo {
 private offset=0;private rules=new Map<string,SymbolRules>();
 constructor(private credentials:DemoCredentials,private request:typeof fetch=fetch,private now:()=>number=Date.now,readonly baseUrl:string=DEMO_FUTURES_BASE){
  if(baseUrl!==DEMO_FUTURES_BASE)throw new Error('only the Binance futures demo host is allowed');
  if(!/^[A-Za-z0-9]{16,128}$/.test(credentials.apiKey??'')||!/^[A-Za-z0-9]{16,128}$/.test(credentials.apiSecret??''))throw new Error('demo API credentials missing or malformed');
 }
 /** Assinatura HMAC SHA256 da query, como na documentação da Binance. */
 static sign(query:string,secret:string){return createHmac('sha256',secret).update(query).digest('hex');}
 private async call(method:'GET'|'POST'|'DELETE',path:string,params:Params={},signed=false){
  const query=new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
  if(signed){query.set('recvWindow','5000');query.set('timestamp',String(Math.round(this.now()+this.offset)));query.set('signature',BinanceFuturesDemo.sign(query.toString(),this.credentials.apiSecret));}
  const response=await this.request(`${this.baseUrl}${path}${query.size?'?'+query:''}`,{method,headers:signed?{'X-MBX-APIKEY':this.credentials.apiKey}:{},signal:AbortSignal.timeout(10000)});
  const text=await response.text();let body:any;try{body=JSON.parse(text);}catch{body=null;}
  // Mensagem de erro só com método, caminho e o código da Binance: nunca a query assinada, a chave ou o segredo.
  if(!response.ok){const retry=response.headers.get('retry-after');throw new Error(`demo ${method} ${path} HTTP ${response.status}${body?.code!==undefined?' code '+body.code:''}${body?.msg?': '+String(body.msg).slice(0,160):''}${retry?' retry-after '+retry:''}`);}
  if(body===null)throw new Error(`demo ${method} ${path}: invalid JSON`);
  return body;
 }
 /** Acerta o relógio pelo servidor (a Binance recusa pedidos fora da janela de 5 s). */
 async syncTime(){const before=this.now(),{serverTime}=await this.call('GET','/fapi/v1/time'),after=this.now();if(!Number.isFinite(serverTime))throw new Error('invalid server time');this.offset=serverTime-(before+after)/2;return this.offset;}
 async symbolRules(symbol:string):Promise<SymbolRules>{
  const cached=this.rules.get(symbol);if(cached)return cached;
  const info=await this.call('GET','/fapi/v1/exchangeInfo');const s=info.symbols?.find((x:any)=>x.symbol===symbol);if(!s)throw new Error('unknown demo symbol '+symbol);
  const f=(type:string)=>s.filters.find((x:any)=>x.filterType===type)??{};
  const rules={symbol,stepSize:Number(f('MARKET_LOT_SIZE').stepSize??f('LOT_SIZE').stepSize),minQty:Number(f('MARKET_LOT_SIZE').minQty??f('LOT_SIZE').minQty),minNotional:Number(f('MIN_NOTIONAL').notional??0),tickSize:Number(f('PRICE_FILTER').tickSize)};
  if(![rules.stepSize,rules.minQty,rules.minNotional,rules.tickSize].every(Number.isFinite)||rules.stepSize<=0)throw new Error('invalid symbol rules '+symbol);
  this.rules.set(symbol,rules);return rules;
 }
 /** Quantidade arredondada para baixo no passo do símbolo; recusa abaixo do mínimo de quantidade ou de valor. */
 static roundQuantity(quantity:number,price:number,rules:SymbolRules){
  const decimals=Math.max(0,-Math.floor(Math.log10(rules.stepSize)));const q=Number((Math.floor(quantity/rules.stepSize+1e-9)*rules.stepSize).toFixed(decimals));
  if(!(q>=rules.minQty))throw new Error(`quantity below minimum for ${rules.symbol}`);if(q*price<rules.minNotional)throw new Error(`notional below minimum for ${rules.symbol}`);return q;
 }
 async account(){const a=await this.call('GET','/fapi/v2/account',{},true);return {totalWalletBalance:Number(a.totalWalletBalance),availableBalance:Number(a.availableBalance),totalUnrealizedProfit:Number(a.totalUnrealizedProfit),canTrade:a.canTrade===true};}
 async positions(symbol?:string){const rows=await this.call('GET','/fapi/v2/positionRisk',symbol?{symbol}:{},true);return (rows as any[]).filter(p=>Number(p.positionAmt)!==0).map(p=>({symbol:p.symbol,positionAmt:Number(p.positionAmt),entryPrice:Number(p.entryPrice),markPrice:Number(p.markPrice),unRealizedProfit:Number(p.unRealizedProfit),leverage:Number(p.leverage)}));}
 async setLeverage(symbol:string,leverage:number){if(!Number.isInteger(leverage)||leverage<1||leverage>3)throw new Error('demo leverage limited to 1–3x');return this.call('POST','/fapi/v1/leverage',{symbol,leverage},true);}
 /** Ordem a mercado. `reduceOnly` só diminui uma posição existente (usada para encerrar). */
 async marketOrder(symbol:string,side:'BUY'|'SELL',quantity:number,{reduceOnly=false,clientOrderId}:{reduceOnly?:boolean;clientOrderId?:string}={}):Promise<DemoOrder>{
  if(!/^[A-Z0-9]{2,20}USDT$/.test(symbol)||!['BUY','SELL'].includes(side)||!(quantity>0))throw new Error('invalid demo order');
  const id=clientOrderId??'tl-'+Math.round(this.now()).toString(36)+'-'+Math.random().toString(36).slice(2,8);
  if(!/^[A-Za-z0-9._:-]{1,36}$/.test(id))throw new Error('invalid client order id');
  const o=await this.call('POST','/fapi/v1/order',{symbol,side,type:'MARKET',quantity,newClientOrderId:id,newOrderRespType:'RESULT',...(reduceOnly?{reduceOnly:true}:{})},true);
  return this.order(o);
 }
 async queryOrder(symbol:string,clientOrderId:string){return this.order(await this.call('GET','/fapi/v1/order',{symbol,origClientOrderId:clientOrderId},true));}
 private order(o:any):DemoOrder{return {orderId:Number(o.orderId),clientOrderId:String(o.clientOrderId),symbol:String(o.symbol),side:o.side,status:String(o.status),executedQty:Number(o.executedQty),avgPrice:Number(o.avgPrice),cumQuote:Number(o.cumQuote),reduceOnly:o.reduceOnly===true,updateTime:Number(o.updateTime)};}
 async userTrades(symbol:string,limit=20){const rows=await this.call('GET','/fapi/v1/userTrades',{symbol,limit},true);return (rows as any[]).map(t=>({id:Number(t.id),orderId:Number(t.orderId),side:t.side,price:Number(t.price),qty:Number(t.qty),commission:Number(t.commission),commissionAsset:String(t.commissionAsset),realizedPnl:Number(t.realizedPnl),time:Number(t.time),maker:t.maker===true}));}
}
