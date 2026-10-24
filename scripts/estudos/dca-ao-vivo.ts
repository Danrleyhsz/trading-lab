// Execução simulada DCA_BTC_ETH_AO_VIVO_V1 (docs/PROTOCOLO_DCA_AO_VIVO.md): compra mensal de BTC e ETH, simples e com pausa abaixo da SMA200.
// Só dados públicos da Binance; não envia ordens, não usa contas nem chaves. Uma rodada por dia, sob demanda:
//   npx tsx scripts/estudos/dca-ao-vivo.ts [--dry]
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {DAY} from './busca-diaria-lib.js';
import {GENESIS,type Level,type Quote} from './tendencia-ao-vivo-lib.js';
import {ORIGINS,ORIGIN_API,getJson} from './tendencia-ao-vivo.js';
import {DCA_ACCOUNTS,DCA_LIVE,dcaHash,emptyState,monthsBetween,sma,step,verifyDcaLedger,type DcaAccountId,type DcaAccountRun,type DcaLedger,type DcaRunRecord} from './dca-ao-vivo-lib.js';

const LEDGER_FILE='docs/estudos/dca-ao-vivo-registro.json',REPORT_FILE='docs/estudos/dca-ao-vivo.md';
const pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(2)+'%',usd=(v:number)=>v.toFixed(2);

async function main(){
 if(!ORIGINS.includes(ORIGIN_API))throw new Error('BINANCE_SPOT_ORIGIN inválido: '+ORIGIN_API);
 const dry=process.argv.includes('--dry'),now=Date.now(),month=new Date(now).toISOString().slice(0,7);
 const closes:Record<string,number>={},sma200:Record<string,number>={},quotes:Record<string,Quote>={};
 for(const symbol of DCA_LIVE.symbols){
  // Só velas diárias já fechadas.
  const rows=(await getJson('/api/v3/klines',{symbol,interval:'1d',limit:DCA_LIVE.smaDays+1})) as unknown[][];
  const closed=rows.filter(r=>Number(r[0])+DAY<=now).map(r=>Number(r[4]));
  closes[symbol]=closed.at(-1)!;sma200[symbol]=sma(closed,DCA_LIVE.smaDays);
  const book=(await getJson('/api/v3/depth',{symbol,limit:DCA_LIVE.depthLevels})) as {bids:string[][];asks:string[][]};
  const lv=(x:string[][])=>x.map(([p,q])=>[Number(p),Number(q)] as Level),bids=lv(book.bids),asks=lv(book.asks);
  if(bids.length&&asks.length)quotes[symbol]={mid:(bids[0][0]+asks[0][0])/2,bids,asks};
 }
 const ledger:DcaLedger=existsSync(LEDGER_FILE)?JSON.parse(readFileSync(LEDGER_FILE,'utf8')):{protocol:DCA_LIVE.version,runs:[]};
 const check=verifyDcaLedger(ledger);if(!check.ok)throw new Error('livro-razão adulterado ou corrompido na rodada '+(check.brokenAt!+1));
 const last=ledger.runs.at(-1),contributed=!last||month>last.month,missedMonths=last&&contributed?monthsBetween(last.month,month)-1:0;
 const accounts={} as Record<DcaAccountId,DcaAccountRun>;
 for(const a of DCA_ACCOUNTS){const p=last?.accounts[a];accounts[a]=step(a,p?{cash:p.cash,positions:p.positions,invested:p.invested}:emptyState(),contributed,quotes,closes,sma200);}
 const body:Omit<DcaRunRecord,'hash'>={n:ledger.runs.length+1,runAt:new Date(now).toISOString(),month,contributed,missedMonths,closes,sma200,accounts,prevHash:last?.hash??GENESIS};
 ledger.runs.push({...body,hash:dcaHash(body)});
 console.log(`rodada ${body.n} | mês ${month} | ${contributed?'aportou':'sem aporte'} | meses perdidos ${missedMonths}`);
 for(const a of DCA_ACCOUNTS){const r=accounts[a];console.log(`  ${a.padEnd(17)} valor ${usd(r.equity)} / aportado ${usd(r.invested)} | ordens ${r.orders.length} | guardado ${r.held.map(h=>h.symbol+':'+h.reason).join(', ')||'-'}`);}
 if(dry){console.log('--dry: nada gravado');return;}
 writeFileSync(LEDGER_FILE,JSON.stringify(ledger,null,1));writeFileSync(REPORT_FILE,report(ledger));
 console.log('gravado em',LEDGER_FILE,'e',REPORT_FILE);
}

/** Resumo legível regerado a cada rodada; a história fica no livro-razão e no Git. */
export function report(ledger:DcaLedger):string{
 const last=ledger.runs.at(-1)!,L=[`# Compra mensal de BTC e ETH, execução simulada · ${ledger.protocol}`,'',
  `Última rodada: **${last.n}** em ${last.runAt} (mês ${last.month}). Protocolo: \`docs/PROTOCOLO_DCA_AO_VIVO.md\`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno.`,'',
  `Fechamento e SMA200: ${DCA_LIVE.symbols.map(s=>`${s} ${last.closes[s]} (média ${last.sma200[s].toFixed(2)}, ${last.closes[s]>last.sma200[s]?'acima':'abaixo'})`).join('; ')}.`,'',
  '| Conta | Aportado (USDT) | Valor (USDT) | Retorno | Caixa guardado | Posições |','|---|---|---|---|---|---|',
  ...DCA_ACCOUNTS.map(a=>{const r=last.accounts[a],cash=Object.values(r.cash).reduce((s,x)=>s+x,0);
   return `| ${a} | ${usd(r.invested)} | ${usd(r.equity)} | ${r.invested?pct(r.equity/r.invested-1):'-'} | ${usd(cash)} | ${Object.entries(r.positions).map(([s,q])=>`${s} ${q.toPrecision(5)}`).join(', ')||'-'} |`;}),'',
  '## Custo medido (todas as compras simuladas)','','| Conta | Compras | Slippage do livro (bps) | Total vs fechamento, com taxa (bps) | Não preenchidas por inteiro |','|---|---|---|---|---|'];
 for(const a of DCA_ACCOUNTS){const o=ledger.runs.flatMap(r=>r.accounts[a].orders),m=(k:'slipBps'|'totalBps')=>o.length?(o.reduce((s,x)=>s+x[k],0)/o.length).toFixed(1):'-';
  L.push(`| ${a} | ${o.length} | ${m('slipBps')} | ${m('totalBps')} | ${o.filter(x=>!x.filledAll).length} |`);}
 L.push('',`Rodadas: ${ledger.runs.length}; meses perdidos por falta de rodada: ${ledger.runs.reduce((s,r)=>s+r.missedMonths,0)}.`,'');
 return L.join('\n');
}
if(process.argv[1]?.endsWith('dca-ao-vivo.ts'))void main();
