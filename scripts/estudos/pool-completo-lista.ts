// Lista mecânica do pool completo do protocolo PIT_COMPLETO_V1 (docs/PROTOCOLO_POOL_COMPLETO.md): todas as perpétuas USDT de moeda
// da Binance USD-M, em operação ou em liquidação (deslistagem), listadas até 30/09/2025. Só lê a lista pública de contratos
// (nenhum preço). Uso: npx tsx scripts/estudos/pool-completo-lista.ts
import {writeFileSync} from 'node:fs';

export const POOL_RULE=Object.freeze({listedUntil:Date.UTC(2025,8,30),statuses:['TRADING','SETTLING'],excludedBaseAssets:['USDC','TUSD','FDUSD','BUSD','USDP','DAI','EUR','AEUR','XUSD','RLUSD','USD1']});
export interface ContractInfo {symbol:string;baseAsset:string;quoteAsset:string;contractType:string;status:string;underlyingType:string;onboardDate:number}
/** Seleção mecânica; função pura para teste. */
export function selectPool(info:ContractInfo[]){
 return info.filter(s=>s.contractType==='PERPETUAL'&&s.quoteAsset==='USDT'&&s.underlyingType==='COIN'&&POOL_RULE.statuses.includes(s.status)&&s.onboardDate<=POOL_RULE.listedUntil&&!POOL_RULE.excludedBaseAssets.includes(s.baseAsset))
  .map(s=>({symbol:s.symbol,baseAsset:s.baseAsset,status:s.status,onboardDate:s.onboardDate})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
}
async function main(){
 const r=await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');if(!r.ok)throw new Error('HTTP '+r.status);
 const pool=selectPool(((await r.json()) as any).symbols as ContractInfo[]);
 const byStatus=Object.fromEntries(POOL_RULE.statuses.map(s=>[s,pool.filter(c=>c.status===s).length]));
 const byYear:Record<string,number>={};for(const c of pool){const y=String(new Date(c.onboardDate).getUTCFullYear());byYear[y]=(byYear[y]??0)+1;}
 writeFileSync('docs/estudos/pool-completo-lista-2026-10-09.json',JSON.stringify({protocol:'PIT_COMPLETO_V1',generatedAt:new Date().toISOString(),rule:{...POOL_RULE,listedUntil:new Date(POOL_RULE.listedUntil).toISOString()},count:pool.length,byStatus,byListingYear:byYear,
  pool:pool.map(c=>({...c,onboardDate:new Date(c.onboardDate).toISOString().slice(0,10)}))},null,1));
 console.log('pool',pool.length,JSON.stringify(byStatus),JSON.stringify(byYear));
}
if(process.argv[1]?.endsWith('pool-completo-lista.ts'))void main();
