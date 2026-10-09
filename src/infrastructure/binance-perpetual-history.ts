import {validatePerpetualDataset,type PerpetualDataset,type FundingSettlement} from '../domain/perpetual-backtest.js';
import type {Candle} from '../domain/backtest.js';
const hour=3600000;
export class BinancePerpetualHistory {
 constructor(private request:typeof fetch=fetch,private now:()=>number=Date.now){}
 private async get(path:string,params:Record<string,string>){const response=await this.request(`https://fapi.binance.com${path}?${new URLSearchParams(params)}`,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`USD-M history HTTP ${response.status}`);const body:unknown=await response.json();if(!Array.isArray(body))throw new Error('invalid USD-M history response');return body;}
 /** `symbol`: perpétuo USDT da Binance (o servidor e o piloto usam só BTCUSDT; outros símbolos servem aos estudos multimoedas). */
 async load(count=1000,symbol='BTCUSDT'):Promise<PerpetualDataset>{
  if(!Number.isInteger(count)||count<3||count>10000)throw new Error('invalid history count');
  if(!/^[A-Z0-9]{2,20}USDT$/.test(symbol))throw new Error('invalid history symbol');
  const end=Math.floor(this.now()/hour)*hour-1,start=end+1-count*hour;
  const candles=async(path:string)=>{const rows:Candle[]=[];let cursor=start;while(cursor<=end){const page=await this.get(path,{symbol,interval:'1h',startTime:String(cursor),endTime:String(end),limit:String(Math.min(1000,count-rows.length))});if(!page.length)throw new Error('incomplete candle history');for(const raw of page){if(!Array.isArray(raw)||raw.length<7)throw new Error('invalid candle row');rows.push({timestamp:Number(raw[0]),open:Number(raw[1]),high:Number(raw[2]),low:Number(raw[3]),close:Number(raw[4]),volume:Number(raw[5])});}const next=rows.at(-1)!.timestamp+hour;if(!Number.isSafeInteger(next)||next<=cursor||rows.length>count)throw new Error('invalid candle pagination');cursor=next;}if(rows.length!==count)throw new Error('incomplete candle history');return rows;};
  const [trade,mark]=await Promise.all([candles('/fapi/v1/klines'),candles('/fapi/v1/markPriceKlines')]);
  const funding:FundingSettlement[]=[];let cursor=start;
  while(cursor<=end){const page=await this.get('/fapi/v1/fundingRate',{symbol,startTime:String(cursor),endTime:String(end),limit:'1000'});for(const raw of page){if(typeof raw!=='object'||raw===null)throw new Error('invalid funding row');const row=raw as Record<string,unknown>;if(row.symbol!==symbol)throw new Error('unexpected funding instrument');funding.push({timestamp:Number(row.fundingTime),rate:Number(row.fundingRate),markPrice:Number(row.markPrice)});}if(page.length<1000)break;const next=funding.at(-1)!.timestamp+1;if(!Number.isSafeInteger(next)||next<=cursor)throw new Error('invalid funding pagination');cursor=next;}
  if(count>=24&&!funding.length)throw new Error('funding history unavailable');
  const data:PerpetualDataset={instrument:`BINANCE_USDM:${symbol}` as PerpetualDataset['instrument'],trade,mark,funding};validatePerpetualDataset(data);return data;
 }
}
