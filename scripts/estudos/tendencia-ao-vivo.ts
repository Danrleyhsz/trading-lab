// Execução simulada TENDENCIA_MAIORES_AO_VIVO_V1 (docs/PROTOCOLO_TENDENCIA_AO_VIVO.md): tendência (SMA100 e Donchian 55/20) nas 5 maiores moedas
// por volume, alvo de volatilidade de 20%, à vista, sem alavancagem, com as ordens simuladas contra o livro de ofertas público.
// Só dados públicos da Binance; não envia ordens, não usa contas nem chaves. Uma rodada por dia, sob demanda:
//   npx tsx scripts/estudos/tendencia-ao-vivo.ts [--dry]
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {selectPairs} from './spot-diario-baixar.js';
import {DAY,type SpotSeriesLike} from './busca-diaria-lib.js';
import {ACCOUNTS,GENESIS,TREND_LIVE,decide,initialState,mark,rebalance,recordHash,verifyLedger,
 type AccountId,type AccountRun,type Ledger,type Level,type Quote,type RunRecord} from './tendencia-ao-vivo-lib.js';

// Os dois hosts servem os mesmos dados públicos de mercado; o segundo não é bloqueado nos servidores do GitHub Actions.
export const ORIGINS=['https://api.binance.com','https://data-api.binance.vision'],ORIGIN_API=process.env.BINANCE_SPOT_ORIGIN??ORIGINS[0],DIR='docs/estudos',LEDGER=`${DIR}/tendencia-ao-vivo-registro.json`,REPORT=`${DIR}/tendencia-ao-vivo.md`;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function getJson(path:string,params:Record<string,string|number>={}){
 const url=ORIGIN_API+path+'?'+new URLSearchParams(Object.entries(params).map(([k,v])=>[k,String(v)]));
 for(let attempt=0;attempt<4;attempt++){
  const r=await fetch(url);
  if(r.status===418||r.status===429)throw new Error('HTTP '+r.status+': a corretora pediu para reduzir o ritmo');
  if(r.ok){await sleep(150);return r.json();}
  await sleep(2000);
 }
 throw new Error('indisponível: '+path);
}
const pct=(v:number,d=2)=>(v>=0?'+':'')+(v*100).toFixed(d)+'%',usd=(v:number)=>v.toFixed(2),bps=(v:number)=>v.toFixed(1);

async function main(){
 if(!ORIGINS.includes(ORIGIN_API))throw new Error('BINANCE_SPOT_ORIGIN inválido: '+ORIGIN_API);
 const dry=process.argv.includes('--dry'),now=Date.now();
 const info=((await getJson('/api/v3/exchangeInfo')) as {symbols:{symbol:string;baseAsset:string;quoteAsset:string;status:string}[]}).symbols;
 const trading=selectPairs(info).filter(p=>p.status==='TRADING');
 const volume=new Map(((await getJson('/api/v3/ticker/24hr')) as {symbol:string;quoteVolume:string}[]).map(t=>[t.symbol,Number(t.quoteVolume)]));
 const pool=trading.sort((a,b)=>(volume.get(b.symbol)??0)-(volume.get(a.symbol)??0)).slice(0,TREND_LIVE.candidatePool);
 // Só velas diárias já fechadas: a vela do dia corrente ainda não existe para a decisão.
 const series:SpotSeriesLike[]=[],sha=createHash('sha256');
 for(const p of pool){
  const rows=(await getJson('/api/v3/klines',{symbol:p.symbol,interval:'1d',limit:TREND_LIVE.historyDays})) as unknown[][];
  const closed=rows.filter(r=>Number(r[0])+DAY<=now);if(!closed.length)continue;
  const s:SpotSeriesLike={symbol:p.symbol,baseAsset:p.baseAsset,status:p.status,t:closed.map(r=>Number(r[0])),h:closed.map(r=>Number(r[2])),l:closed.map(r=>Number(r[3])),c:closed.map(r=>Number(r[4])),qv:closed.map(r=>Number(r[7]))};
  series.push(s);sha.update(JSON.stringify([s.symbol,s.t,s.c,s.qv]));
 }
 const btc=series.find(s=>s.symbol==='BTCUSDT');if(!btc)throw new Error('sem BTCUSDT');
 const decisionDay=btc.t.at(-1)!,decision=decide(series,decisionDay);
 const ledger:Ledger=existsSync(LEDGER)?JSON.parse(readFileSync(LEDGER,'utf8')):{protocol:TREND_LIVE.version,initialCapital:TREND_LIVE.initialCapital,runs:[]};
 const check=verifyLedger(ledger);if(!check.ok)throw new Error('livro-razão adulterado ou corrompido na rodada '+(check.brokenAt!+1));
 const last=ledger.runs.at(-1),decided=!last||decisionDay>Date.parse(last.decisionDay);
 const stateOf=(a:AccountId)=>last?{cash:last.accounts[a].cash,positions:{...last.accounts[a].positions},peak:last.accounts[a].peak,halted:last.accounts[a].halted}:initialState();
 // Livro de ofertas das moedas a negociar e das já em carteira.
 const held=new Set(ACCOUNTS.flatMap(a=>Object.keys(stateOf(a).positions))),need=new Set<string>([...held,...(decided?decision.members:[])]);
 const quotes:Record<string,Quote>={},closes:Record<string,number>={};
 for(const symbol of need){
  const book=(await getJson('/api/v3/depth',{symbol,limit:TREND_LIVE.depthLevels})) as {bids:string[][];asks:string[][]};
  const lv=(x:string[][])=>x.map(([p,q])=>[Number(p),Number(q)] as Level);
  const bids=lv(book.bids),asks=lv(book.asks);if(!bids.length||!asks.length)continue;
  quotes[symbol]={mid:(bids[0][0]+asks[0][0])/2,bids,asks};
  const s=series.find(x=>x.symbol===symbol);if(s)closes[symbol]=s.c.at(-1)!;
 }
 const accounts={} as Record<AccountId,AccountRun>;
 for(const a of ACCOUNTS){
  const weights=decision.weights[a],res=decided?rebalance(stateOf(a),weights,quotes,closes):mark(stateOf(a),quotes,closes);
  accounts[a]={targetWeights:decided?weights:{},signals:decision.signals[a],scale:decision.scale[a],orders:res.orders,skipped:res.skipped,cash:res.state.cash,positions:res.state.positions,
   equityBefore:res.equityBefore,equity:res.equity,peak:res.state.peak,drawdown:res.drawdown,halted:res.state.halted};
 }
 const body:Omit<RunRecord,'hash'>={n:ledger.runs.length+1,runAt:new Date(now).toISOString(),decisionDay:decision.decisionDay,decided,delaySeconds:Math.round((now-(decisionDay+DAY))/1000),
  missedDays:last&&decided?Math.round((decisionDay-Date.parse(last.decisionDay))/DAY)-1:0,members:decision.members,dataSha256:sha.digest('hex'),accounts,prevHash:last?.hash??GENESIS};
 const record:RunRecord={...body,hash:recordHash(body)};
 ledger.runs.push(record);
 console.log(`rodada ${record.n} | dia decidido ${record.decisionDay} | ${decided?'negociou':'só marcou'} | atraso ${(record.delaySeconds/3600).toFixed(1)} h | dias perdidos ${record.missedDays} | membros ${record.members.join(', ')}`);
 for(const a of ACCOUNTS){const r=accounts[a];console.log(`  ${a.padEnd(18)} patrimônio ${usd(r.equity)} (${pct(r.equity/TREND_LIVE.initialCapital-1)}) | queda ${pct(-r.drawdown)} | escala ${r.scale.toFixed(2)} | ordens ${r.orders.length} | puladas ${r.skipped.length}`);}
 if(dry){console.log('--dry: nada gravado');return;}
 writeFileSync(LEDGER,JSON.stringify(ledger,null,1));writeFileSync(REPORT,report(ledger));
 let commit='desconhecido';try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{/* fora do git: fica desconhecido, nunca inventado */}
 console.log('gravado em',LEDGER,'e',REPORT,'| commit do código',commit.slice(0,7));
}

/** Resumo legível regerado a cada rodada; a história fica no livro-razão e no Git. */
export function report(ledger:Ledger):string{
 const last=ledger.runs.at(-1)!,L:string[]=[`# Tendência nas maiores, execução simulada · ${ledger.protocol}`,'',
  `Última rodada: **${last.n}** em ${last.runAt} (dia decidido ${last.decisionDay}, ${last.decided?'negociou':'só marcou'}, atraso de ${(last.delaySeconds/3600).toFixed(1)} h). Protocolo: \`docs/PROTOCOLO_TENDENCIA_AO_VIVO.md\`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.`,'',
  `Membros do universo (5 maiores por volume): ${last.members.join(', ')}.`,'',
  '| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |','|---|---|---|---|---|---|',
  ...ACCOUNTS.map(a=>{const r=last.accounts[a];return `| ${a} | ${usd(r.equity)} | ${pct(r.equity/ledger.initialCapital-1)} | ${pct(-r.drawdown)} | ${r.scale.toFixed(2)} | ${Object.entries(r.positions).map(([s,q])=>`${s} ${q.toPrecision(5)}`).join(', ')||'caixa'}${r.halted?' (ENCERRADA por queda de 30%)':''} |`;}),'',
  '## Custo e atraso medidos (todas as ordens simuladas)','','Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.','',
  '| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |','|---|---|---|---|---|---|---|'];
 for(const a of ACCOUNTS){
  const o=ledger.runs.flatMap(r=>r.accounts[a].orders),m=(k:'feeBps'|'slipBps'|'delayBps'|'totalBps')=>o.length?o.reduce((s,x)=>s+x[k],0)/o.length:NaN;
  L.push(`| ${a} | ${o.length} | ${bps(m('feeBps'))} | ${bps(m('slipBps'))} | ${bps(m('delayBps'))} | ${bps(m('totalBps'))} | ${o.filter(x=>!x.filledAll).length} |`);
 }
 const days=ledger.runs.filter(r=>r.decided).length,missed=ledger.runs.reduce((s,r)=>s+r.missedDays,0);
 L.push('',`Dias decididos: ${days}; dias perdidos por falta de rodada: ${missed}; rodadas: ${ledger.runs.length}.`,'');
 return L.join('\n');
}
if(process.argv[1]?.endsWith('tendencia-ao-vivo.ts'))void main();
