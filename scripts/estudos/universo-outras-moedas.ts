// Monta, por regra mecânica e sem olhar nenhum retorno, as 45 "outras moedas" do protocolo MOM_METADE_V1
// (docs/PROTOCOLO_MOM_METADE.md): perpétuos USDT que não estão nas 15 moedas já usadas, listados até 30/11/2021, ordenados pelo volume de 24 h.
// Só lê a lista de contratos e o volume (nenhum preço histórico, nenhuma variação de preço). Uso: npx tsx scripts/estudos/universo-outras-moedas.ts
import {writeFileSync} from 'node:fs';
import {FORWARD_PROTOCOL} from '../../src/application/forward-momentum.js';

const USED=['ZEC','NEAR','UNI','BCH','FIL','AAVE','AVAX','LINK','XRP','XLM','DOGE','SOL','LTC','ETH','BTC'].map(s=>s+'USDT');
export const RULE=Object.freeze({listedUntil:Date.UTC(2021,10,30),count:45,groups:3,excludedBaseAssets:['USDC','TUSD','FDUSD','BUSD','USDP','DAI','EUR','AEUR','XUSD','RLUSD','USD1']});
export interface Candidate {symbol:string;baseAsset:string;onboardDate:number;quoteVolume24h:number}
/** Seleção e divisão em grupos por rodízio de volume (1º, 2º e 3º maiores vão para os grupos 1, 2 e 3; depois repete). Função pura para teste. */
export function select(info:{symbol:string;baseAsset:string;quoteAsset:string;contractType:string;status:string;underlyingType:string;onboardDate:number}[],volume:Map<string,number>,used=USED){
 const eligible:Candidate[]=info.filter(s=>s.contractType==='PERPETUAL'&&s.quoteAsset==='USDT'&&s.status==='TRADING'&&s.underlyingType==='COIN'&&s.onboardDate<=RULE.listedUntil&&!used.includes(s.symbol)&&!RULE.excludedBaseAssets.includes(s.baseAsset)&&volume.has(s.symbol))
  .map(s=>({symbol:s.symbol,baseAsset:s.baseAsset,onboardDate:s.onboardDate,quoteVolume24h:volume.get(s.symbol)!}));
 eligible.sort((a,b)=>b.quoteVolume24h-a.quoteVolume24h||a.symbol.localeCompare(b.symbol));
 const chosen=eligible.slice(0,RULE.count).map((c,i)=>({...c,rank:i+1,group:(i%RULE.groups)+1}));
 return {eligibleCount:eligible.length,chosen};
}
async function main(){
 const get=async (p:string)=>{const r=await fetch('https://fapi.binance.com'+p);if(!r.ok)throw new Error('HTTP '+r.status+' '+p);return r.json() as Promise<any>;};
 const info=(await get('/fapi/v1/exchangeInfo')).symbols,tickers=await get('/fapi/v1/ticker/24hr'),volume=new Map<string,number>(tickers.map((t:any)=>[t.symbol as string,Number(t.quoteVolume)]));
 const {eligibleCount,chosen}=select(info,volume);
 const out={protocol:'MOM_METADE_V1',generatedAt:new Date().toISOString(),rule:RULE,usedSymbols:USED,forwardSymbols:FORWARD_PROTOCOL.symbols,eligibleCount,universe:chosen.map(c=>({...c,onboardDate:new Date(c.onboardDate).toISOString().slice(0,10)}))};
 writeFileSync('docs/estudos/universo-outras-moedas-2026-10-09.json',JSON.stringify(out,null,1));
 console.log('elegíveis',eligibleCount);for(const g of [1,2,3])console.log('grupo',g,chosen.filter(c=>c.group===g).map(c=>c.baseAsset+'('+c.onboardDate+')').join(' '));
}
if(process.argv[1]?.endsWith('universo-outras-moedas.ts'))void main();
