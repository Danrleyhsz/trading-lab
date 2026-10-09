// Verificação do Demo Trading de futuros da Binance (dinheiro fictício). Lê a chave de BINANCE_DEMO_API_KEY e
// BINANCE_DEMO_API_SECRET (variáveis de ambiente do usuário no Windows); nunca imprime a chave nem o segredo.
// Uso:  npx tsx scripts/testnet/verificar.ts            → relógio, saldo e posições (só leitura)
//       npx tsx scripts/testnet/verificar.ts --ordem    → também abre e fecha uma ordem mínima em BTCUSDT
//       CURL=1 ...                                      → usa curl no lugar do fetch do Node
import {execFile,execFileSync} from 'node:child_process';
import {BinanceFuturesDemo,DEMO_FUTURES_BASE} from '../../src/infrastructure/binance-futures-demo.js';

function secret(name:string){
 const value=process.env[name];if(value)return value;
 try{const out=execFileSync('reg',['query','HKCU\\Environment','/v',name],{encoding:'utf8',stdio:['ignore','pipe','ignore']});return out.match(new RegExp(name+'\\s+REG_\\w+\\s+(\\S+)'))?.[1]??'';}catch{return '';}
}
// curl com método e cabeçalho; a chave vai por stdin (-K -) para não aparecer na lista de processos.
const curlFetch=((url:string,init?:RequestInit)=>new Promise<Response>((resolve,reject)=>{
 const headers=Object.entries((init?.headers??{}) as Record<string,string>);
 const child=execFile('curl',['-sS','-m','20','-X',init?.method??'GET','-K','-','-D','-','-w','\n%{http_code}',String(url)],{encoding:'utf8',maxBuffer:32*1024*1024},(error,out)=>{
  if(error)return reject(Error('curl failed'));const i=out.lastIndexOf('\n'),status=Number(out.slice(i+1)),raw=out.slice(0,i),split=raw.lastIndexOf('\r\n\r\n');
  const head=raw.slice(0,split),body=raw.slice(split+4),retry=head.match(/retry-after:\s*(\d+)/i)?.[1];resolve(new Response(body,{status,headers:retry?{'retry-after':retry}:{}}));});
 child.stdin!.end(headers.map(([k,v])=>`header = "${k}: ${v}"\n`).join(''));
})) as unknown as typeof fetch;

async function main(){
 const apiKey=secret('BINANCE_DEMO_API_KEY'),apiSecret=secret('BINANCE_DEMO_API_SECRET');
 if(!apiKey||!apiSecret){console.log('Chave do Demo Trading não configurada. Veja docs/TESTNET_BINANCE.md.');process.exitCode=2;return;}
 const request=process.env.CURL==='1'?curlFetch:fetch,demo=new BinanceFuturesDemo({apiKey,apiSecret},request);
 console.log('Ambiente:',DEMO_FUTURES_BASE,'(dinheiro fictício)');
 console.log('Diferença de relógio:',Math.round(await demo.syncTime()),'ms');
 const account=await demo.account();console.log('Saldo:',account.totalWalletBalance.toFixed(2),'USDT · disponível',account.availableBalance.toFixed(2),'· pode operar:',account.canTrade);
 const open=await demo.positions();console.log('Posições abertas:',open.length?open.map(p=>`${p.symbol} ${p.positionAmt}`).join(', '):'nenhuma');
 if(!process.argv.includes('--ordem'))return;
 const symbol='BTCUSDT',rules=await demo.symbolRules(symbol);
 const mark=Number((await (await request(`${DEMO_FUTURES_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`)).json()).markPrice);
 const quantity=BinanceFuturesDemo.roundQuantity(Math.max(rules.minNotional*1.2/mark,rules.minQty),mark,rules);
 await demo.setLeverage(symbol,1);
 const buy=await demo.marketOrder(symbol,'BUY',quantity);console.log('Compra:',buy.status,buy.executedQty,'BTC a',buy.avgPrice,'· ordem',buy.clientOrderId);
 const after=await demo.positions(symbol);console.log('Posição depois da compra:',after.map(p=>`${p.positionAmt} BTC, entrada ${p.entryPrice}`).join(', ')||'nenhuma');
 const sell=await demo.marketOrder(symbol,'SELL',quantity,{reduceOnly:true});console.log('Venda (só reduz):',sell.status,sell.executedQty,'BTC a',sell.avgPrice);
 const trades=(await demo.userTrades(symbol,10)).filter(t=>t.orderId===buy.orderId||t.orderId===sell.orderId);
 const fees=trades.reduce((s,t)=>s+t.commission,0),realized=trades.reduce((s,t)=>s+t.realizedPnl,0);
 console.log('Execuções:',trades.length,'· taxas',fees.toFixed(4),trades[0]?.commissionAsset??'','· resultado realizado',realized.toFixed(4),'USDT');
 console.log('Posições abertas no fim:',(await demo.positions(symbol)).length);
}
main().catch(error=>{console.error('Falhou:',error instanceof Error?error.message:'erro');process.exitCode=1;});
