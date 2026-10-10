// Baixa as velas DIÁRIAS de todos os pares USDT do mercado à vista da Binance, em operação e já retirados (status BREAK), de 2017 a hoje.
// Só dados públicos; não envia ordens nem usa contas. Retomável e paralelizável por ponta da lista:
//   npx tsx scripts/estudos/spot-diario-baixar.ts [--from=reverse|middle]
import {writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const DIR='scripts/estudos/out',DAY=86400000,ORIGIN='https://api.binance.com';
export interface SpotPair {symbol:string;baseAsset:string;status:string}
/** Tokens alavancados (BTCUP, ETHDOWN...): o prefixo é outra base da própria lista. `JUP` e `SYRUP` não são alavancados porque `J` e `SYR` não são bases. */
export function isLeveraged(base:string,bases:Set<string>){const m=/^(.+?)(UP|DOWN|BULL|BEAR)$/.exec(base);return !!m&&bases.has(m[1]);}
export function selectPairs(symbols:{symbol:string;baseAsset:string;quoteAsset:string;status:string}[]):SpotPair[]{
 const usdt=symbols.filter(s=>s.quoteAsset==='USDT'),bases=new Set(usdt.map(s=>s.baseAsset));
 return usdt.filter(s=>!isLeveraged(s.baseAsset,bases)).map(s=>({symbol:s.symbol,baseAsset:s.baseAsset,status:s.status})).sort((a,b)=>a.symbol.localeCompare(b.symbol));
}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function getJson(path:string,params:Record<string,string|number>){
 const url=ORIGIN+path+'?'+new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
 for(let attempt=0;attempt<4;attempt++){
  const r=await fetch(url);
  if(r.status===418||r.status===429)throw new Error('HTTP '+r.status+': a corretora pediu para reduzir o ritmo');
  if(r.ok){await sleep(300);return r.json();}
  if(r.status===400)return [];
  await sleep(2000);
 }
 throw new Error('indisponível: '+path);
}
async function main(){
 mkdirSync(DIR,{recursive:true});
 const info=((await getJson('/api/v3/exchangeInfo',{})) as any).symbols as {symbol:string;baseAsset:string;quoteAsset:string;status:string}[];
 const pairs=selectPairs(info),from=process.argv.find(a=>a.startsWith('--from='))?.slice(7),order=[...pairs];
 if(from==='reverse')order.reverse();if(from==='middle')order.push(...order.splice(0,Math.floor(order.length/2)));
 console.log('pares USDT (sem alavancados):',pairs.length,'| em operação',pairs.filter(p=>p.status==='TRADING').length,'| retirados (BREAK)',pairs.filter(p=>p.status!=='TRADING').length);
 let done=0;
 for(const [n,p] of order.entries()){
  const file=`${DIR}/spot1d-${p.symbol}.json`;if(existsSync(file))continue;
  try{
   const rows:number[][]=[];let cursor=0;
   for(;;){const page=await getJson('/api/v3/klines',{symbol:p.symbol,interval:'1d',startTime:cursor,limit:1000}) as unknown[][];if(!page.length)break;
    for(const r of page)rows.push([Number(r[0]),Number(r[1]),Number(r[2]),Number(r[3]),Number(r[4]),Number(r[5]),Number(r[7]),Number(r[8])]);
    cursor=Number(page.at(-1)![0])+DAY;if(page.length<1000)break;}
   // Colunas: t, abertura, máxima, mínima, fechamento, volume em moeda, volume financeiro, número de negócios.
   const body={symbol:p.symbol,baseAsset:p.baseAsset,status:p.status,columns:['t','o','h','l','c','v','qv','n'],rows};
   writeFileSync(file,JSON.stringify({...body,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}));done++;
   console.log(`[${n+1}/${order.length}] ${p.symbol} ${p.status} ${rows.length} dias`+(rows.length?` (${new Date(rows[0][0]).toISOString().slice(0,10)} a ${new Date(rows.at(-1)![0]).toISOString().slice(0,10)})`:''));
  }catch(e){const msg=String((e as Error).message);console.log(`[${n+1}/${order.length}] ${p.symbol} ERRO ${msg}`);if(/HTTP (418|429)/.test(msg)){console.log('parando: rode de novo mais tarde');process.exit(2);}}
 }
 console.log('baixados agora:',done);
}
if(process.argv[1]?.endsWith('spot-diario-baixar.ts'))void main();
