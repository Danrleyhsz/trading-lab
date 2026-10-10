// Registrador ao vivo LISTAGEM_HEDGE_LIVE_V1 (docs/PROTOCOLO_LISTAGENS_AO_VIVO.md): venda de listagens novas com hedge de BTC, só registro.
// Não envia ordens e não toca em contas; usa apenas dados públicos da Binance USD-M. Uso: npx tsx scripts/estudos/listagens-ao-vivo.ts
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {simulateEvents,clusteredT,type Ev} from './eventos.js';
import {pages,fundingPages,toSeries,perEvent,LISTAGEM} from './listagens-2020-2021.js';
import type {LeanData} from './lean-sim.js';
import {pct} from './fatores.js';

const H=3600000,DIR='docs/estudos',LEDGER=`${DIR}/listagens-ao-vivo-registro.json`,OUT=`${DIR}/listagens-ao-vivo`;
export const LIVE=Object.freeze({version:'LISTAGEM_HEDGE_LIVE_V1',declaredAt:'2026-10-10',entryDelayHours:LISTAGEM.entryDelayHours,holdHours:LISTAGEM.holdHours,stopAdverse:LISTAGEM.stopAdverse,fraction:LISTAGEM.fraction,
 feeRate:LISTAGEM.feeRate,slippageBps:LISTAGEM.slippageBps,hedgeSlippageBps:LISTAGEM.hedgeSlippageBps,initial:LISTAGEM.initial,grossCap:LISTAGEM.grossCap,
 minimumClosed:30,minimumWeeks:8,minimumT:2,lossStop:-0.10,lossStopMinimumClosed:15,maximumDrawdown:0.15});
export interface LedgerEntry {symbol:string;baseAsset:string;onboardDate:string;firstSeenAt:string;entryTimeUtc:string}
export interface Ledger {protocol:string;protocolInstant:string;entries:LedgerEntry[]}
export interface ContractInfo {symbol:string;baseAsset:string;quoteAsset:string;contractType:string;status:string;underlyingType:string;onboardDate:number}

/** Contratos novos que atendem à regra e ainda não estão no livro-razão. A hora de entrada precisa ser posterior ao instante do protocolo. */
export function discover(info:ContractInfo[],ledger:LedgerEntry[],protocolInstant:number,now:number):LedgerEntry[]{
 const known=new Set(ledger.map(e=>e.symbol));
 return info.filter(s=>s.contractType==='PERPETUAL'&&s.quoteAsset==='USDT'&&s.underlyingType==='COIN'&&s.status==='TRADING'&&s.symbol!=='BTCUSDT'&&!known.has(s.symbol)
   &&s.onboardDate<=now&&s.onboardDate+LIVE.entryDelayHours*H>protocolInstant)
  .map(s=>({symbol:s.symbol,baseAsset:s.baseAsset,onboardDate:new Date(s.onboardDate).toISOString(),firstSeenAt:new Date(now).toISOString(),entryTimeUtc:new Date(s.onboardDate+LIVE.entryDelayHours*H).toISOString()}))
  .sort((a,b)=>a.symbol.localeCompare(b.symbol));
}

type Raw={t:number;o:number;h:number;c:number};
export interface CoinData {entry:LedgerEntry;raw:Raw[];funding:[number,number,number][];tradable:boolean}
export interface LiveEvent {symbol:string;status:'WAITING'|'OPEN'|'CLOSED_TIME'|'CLOSED_STOP'|'CLOSED_END'|'DADOS_INDISPONIVEIS';firstCandle:string|null;entryAt:string|null;exitPlannedAt:string|null;
 hedgedReturn:number|null;unhedgedReturn:number|null;unrealized:boolean}
export interface LiveSnapshot {
 scope:'FORWARD_PAPER_TRACKING_ONLY';version:string;observedAt:string;lastClosedCandle:string;protocolInstant:string;weeksSinceProtocol:number;
 counts:{ledger:number;waiting:number;open:number;closed:number;unavailable:number;skipped:number};
 closed:{events:number;mean:number|null;tStat:number|null;median:number|null;hitRate:number|null;worst:number|null;best:number|null;meanCostsX3:number|null;stops:number};
 portfolio:{returnPct:number|null;maxDrawdown:number|null};verdict:'EM_ANDAMENTO'|'CONFIRMADO_AO_VIVO'|'NAO_CONFIRMADO'|'ENCERRADO_POR_PERDA';verdictReason:string;events:LiveEvent[]}

const isoWeek=(ms:number)=>{const d=new Date(ms),t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);
 const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return `${t.getUTCFullYear()}-W${String(Math.ceil(((t.getTime()-y0.getTime())/86400000+1)/7)).padStart(2,'0')}`;};

/** Avalia o livro-razão com as velas disponíveis até `now`. Função pura, sem rede. */
export function evaluateLive(coins:CoinData[],btcRaw:Raw[],btcFunding:[number,number,number][],protocolInstant:number,now:number):LiveSnapshot{
 const lastClosed=Math.floor(now/H)*H-H,clean=(r:Raw[])=>r.filter(x=>x.t<=lastClosed);
 const events:LiveEvent[]=[],usable:{c:CoinData;s:ReturnType<typeof toSeries>}[]=[];
 for(const c of coins){
  const raw=clean(c.raw);
  if(!raw.length){events.push({symbol:c.entry.symbol,status:Date.parse(c.entry.entryTimeUtc)>now?'WAITING':'DADOS_INDISPONIVEIS',firstCandle:null,entryAt:c.entry.entryTimeUtc,exitPlannedAt:null,hedgedReturn:null,unhedgedReturn:null,unrealized:false});continue;}
  usable.push({c,s:toSeries(c.entry.symbol,raw,c.funding)});
 }
 const btc=toSeries('BTCUSDT',clean(btcRaw),btcFunding);
 const series=[...usable.map(u=>u.s),btc],T0=Math.min(...series.map(s=>s.first)),bars=Math.round((lastClosed-T0)/H)+1;
 const symbols=series.map(s=>s.symbol),first=series.map(s=>Math.round((s.first-T0)/H)),lastIdx=series.map((s,k)=>first[k]+s.count-1);
 const lean:LeanData={symbols,timestamps:Float64Array.from({length:bars},(_,i)=>T0+i*H),first:Int32Array.from(first),open:series.map(s=>Float64Array.from(s.o)),close:series.map(s=>Float64Array.from(s.c)),
  volume:symbols.map(()=>new Float64Array(0)),funding:series.map(s=>s.funding.map(([timestamp,rate,markPrice])=>({timestamp,rate,markPrice})))};
 const highs=series.map(s=>Float64Array.from(s.h)),btcK=symbols.length-1;
 // Moedas ainda negociando não têm "última vela": a posição continua aberta; só contratos que saíram de negociação terminam na última vela.
 const lastForSim=Int32Array.from(lastIdx.map((l,k)=>k===btcK||usable[k]?.c.tradable?bars+1_000_000:l));
 const evs:Ev[]=[];
 usable.forEach((u,k)=>{
  const entry=first[k]+LIVE.entryDelayHours;
  if(entry>bars-1){events.push({symbol:u.c.entry.symbol,status:'WAITING',firstCandle:new Date(series[k].first).toISOString(),entryAt:new Date(T0+entry*H).toISOString(),exitPlannedAt:new Date(T0+(entry+LIVE.holdHours)*H).toISOString(),hedgedReturn:null,unhedgedReturn:null,unrealized:false});return;}
  evs.push({k,entryBar:entry,exitBar:entry+LIVE.holdHours,side:-1,fraction:LIVE.fraction,stop:LIVE.stopAdverse,hedgeK:btcK,id:k});
 });
 const hl={lean,last:lastForSim};
 const high=(k:number,i:number)=>{const j=i-first[k];return j<0?0:highs[k][Math.min(j,highs[k].length-1)];};
 const opts=(m:number,start:number)=>({fee:LIVE.feeRate*m,slippageBps:LIVE.slippageBps*m,hedgeSlippageBps:LIVE.hedgeSlippageBps*m,initial:LIVE.initial,startBar:start,endBar:bars-1,grossCap:LIVE.grossCap,high});
 let closedRets:number[]=[],closedWeeks:string[]=[],medianV:number|null=null,x3Mean:number|null=null,port={returnPct:null as number|null,maxDrawdown:null as number|null},stops=0,skipped=0;
 if(evs.length){
  const start=Math.min(...evs.map(e=>e.entryBar)),sim=simulateEvents(hl as any,evs,opts(1,start)),sim3=simulateEvents(hl as any,evs,opts(3,start)),pe=perEvent(sim.results),pe3=perEvent(sim3.results);
  skipped=sim.skipped;port={returnPct:sim.finalEquity/LIVE.initial-1,maxDrawdown:sim.maxDrawdown};
  for(const e of pe){
   const u=usable[e.k],reason=e.reason==='stop'?'CLOSED_STOP':e.reason==='end'?'CLOSED_END':'CLOSED_TIME';
   events.push({symbol:u.c.entry.symbol,status:reason,firstCandle:new Date(series[e.k].first).toISOString(),entryAt:new Date(T0+e.entryBar*H).toISOString(),exitPlannedAt:new Date(T0+(e.entryBar+LIVE.holdHours)*H).toISOString(),hedgedReturn:e.hedged,unhedgedReturn:e.unhedged,unrealized:false});
   closedRets.push(e.hedged);closedWeeks.push(isoWeek(T0+e.entryBar*H));if(e.stop)stops++;
  }
  const openIds=new Set(sim.open.map(o=>o.id));
  for(const id of openIds){
   const legs=sim.open.filter(o=>o.id===id),main=legs.find(l=>!l.hedge)!,hedge=legs.find(l=>l.hedge),k=main.k,u=usable[k];
   events.push({symbol:u.c.entry.symbol,status:'OPEN',firstCandle:new Date(series[k].first).toISOString(),entryAt:new Date(T0+main.entryBar*H).toISOString(),exitPlannedAt:new Date(T0+main.exitBar*H).toISOString(),
    hedgedReturn:(main.unrealized+(hedge?.unrealized??0))/main.notional,unhedgedReturn:main.unrealized/main.notional,unrealized:true});
  }
  x3Mean=pe3.length?pe3.reduce((a,e)=>a+e.hedged,0)/pe3.length:null;
  const s=[...closedRets].sort((a,b)=>a-b);medianV=s.length?s[Math.floor(s.length/2)]:null;
 }
 const n=closedRets.length,cl=n?clusteredT(closedRets,closedWeeks):null,weeks=(now-protocolInstant)/(7*24*H);
 const closed={events:n,mean:cl?cl.mean:null,tStat:cl?cl.t:null,median:medianV,hitRate:n?closedRets.filter(x=>x>0).length/n:null,worst:n?Math.min(...closedRets):null,best:n?Math.max(...closedRets):null,meanCostsX3:x3Mean,stops};
 let verdict:LiveSnapshot['verdict'],reason:string;
 if(n>=LIVE.lossStopMinimumClosed&&port.returnPct!==null&&port.returnPct<=LIVE.lossStop){verdict='ENCERRADO_POR_PERDA';reason=`carteira simulada em ${pct(port.returnPct)} com ${n} eventos encerrados`;}
 else if(n<LIVE.minimumClosed||weeks<LIVE.minimumWeeks){verdict='EM_ANDAMENTO';reason=`${n} de ${LIVE.minimumClosed} eventos encerrados; ${weeks.toFixed(1)} de ${LIVE.minimumWeeks} semanas`;}
 else{
  const ok=closed.mean!==null&&closed.mean>0&&(closed.tStat??0)>=LIVE.minimumT&&(closed.median??0)>0&&(closed.meanCostsX3??0)>0&&(port.maxDrawdown??1)<=LIVE.maximumDrawdown;
  verdict=ok?'CONFIRMADO_AO_VIVO':'NAO_CONFIRMADO';reason=`média ${pct(closed.mean??0)}, t ${(closed.tStat??0).toFixed(2)}, mediana ${pct(closed.median??0)}, custos x3 ${pct(closed.meanCostsX3??0)}, queda máx. ${((port.maxDrawdown??0)*100).toFixed(1)}%`;
 }
 const count=(s:LiveEvent['status'][])=>events.filter(e=>s.includes(e.status)).length;
 return {scope:'FORWARD_PAPER_TRACKING_ONLY',version:LIVE.version,observedAt:new Date(now).toISOString(),lastClosedCandle:new Date(lastClosed).toISOString(),protocolInstant:new Date(protocolInstant).toISOString(),weeksSinceProtocol:weeks,
  counts:{ledger:coins.length,waiting:count(['WAITING']),open:count(['OPEN']),closed:count(['CLOSED_TIME','CLOSED_STOP','CLOSED_END']),unavailable:count(['DADOS_INDISPONIVEIS']),skipped},closed,portfolio:port,verdict,verdictReason:reason,
  events:events.sort((a,b)=>(a.entryAt??'').localeCompare(b.entryAt??'')||a.symbol.localeCompare(b.symbol))};
}

function markdown(s:LiveSnapshot){
 const c=s.closed,f=(v:number|null)=>v===null?'n/d':pct(v);
 return [`# Registrador ao vivo ${s.version}: venda de listagens novas com hedge de BTC`,'',
  `Observado em ${s.observedAt} (última vela fechada ${s.lastClosedCandle}). Instante do protocolo: ${s.protocolInstant} (${s.weeksSinceProtocol.toFixed(1)} semanas). **Só registro simulado, sem ordens nem contas** (\`${s.scope}\`). Regra e limites: \`docs/PROTOCOLO_LISTAGENS_AO_VIVO.md\`.`,'',
  `## Situação: **${s.verdict}**`,'',s.verdictReason+'.','',
  '| Eventos no livro-razão | Em espera | Abertos | Encerrados | Dados indisponíveis | Pulados por limite |','|---|---|---|---|---|---|',`| ${s.counts.ledger} | ${s.counts.waiting} | ${s.counts.open} | ${s.counts.closed} | ${s.counts.unavailable} | ${s.counts.skipped} |`,'',
  '## Encerrados (resultado realizado, com hedge de BTC, depois de custos)','','| Medida | Valor |','|---|---|',`| Eventos | ${c.events} |`,`| Média por evento / t (por semana ISO) | ${f(c.mean)} / ${c.tStat===null?'n/d':c.tStat.toFixed(2)} |`,
  `| Mediana / taxa de acerto | ${f(c.median)} / ${c.hitRate===null?'n/d':(c.hitRate*100).toFixed(0)+'%'} |`,`| Pior / melhor | ${f(c.worst)} / ${f(c.best)} |`,`| Média com custos x3 | ${f(c.meanCostsX3)} |`,`| Stops | ${c.stops} |`,
  `| Carteira simulada (inclui abertos): retorno / queda máx. | ${f(s.portfolio.returnPct)} / ${s.portfolio.maxDrawdown===null?'n/d':(s.portfolio.maxDrawdown*100).toFixed(1)+'%'} |`,'',
  '## Eventos','','| Moeda | Situação | Primeira vela | Entrada | Saída prevista | Com hedge | Sem hedge |','|---|---|---|---|---|---|---|',
  ...s.events.map(e=>`| ${e.symbol.replace('USDT','')} | ${e.status} | ${e.firstCandle?.slice(0,10)??'-'} | ${e.entryAt?.slice(0,16).replace('T',' ')??'-'} | ${e.exitPlannedAt?.slice(0,16).replace('T',' ')??'-'} | ${e.hedgedReturn===null?'-':f(e.hedgedReturn)+(e.unrealized?' (não realizado)':'')} | ${e.unhedgedReturn===null?'-':f(e.unhedgedReturn)} |`),''].join('\n');
}

async function main(){
 const instantIso=execFileSync('git',['log','--reverse','--format=%cI','--','docs/PROTOCOLO_LISTAGENS_AO_VIVO.md'],{encoding:'utf8'}).trim().split('\n')[0];
 const ledger:Ledger=existsSync(LEDGER)?JSON.parse(readFileSync(LEDGER,'utf8')):{protocol:LIVE.version,protocolInstant:new Date(instantIso).toISOString(),entries:[]};
 const protocolInstant=Date.parse(ledger.protocolInstant),now=Date.now();
 const r=await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');if(!r.ok)throw new Error('HTTP '+r.status);
 const info=((await r.json()) as any).symbols as ContractInfo[];
 const added=discover(info,ledger.entries,protocolInstant,now);
 ledger.entries.push(...added);writeFileSync(LEDGER,JSON.stringify(ledger,null,1));
 console.log('livro-razão:',ledger.entries.length,'(novos:',added.map(e=>e.symbol).join(', ')||'nenhum',')');
 const statusOf=new Map(info.map(s=>[s.symbol,s.status]));
 const coins:CoinData[]=ledger.entries.map(e=>{
  const start=Date.parse(e.onboardDate)-24*H,end=now;let raw:Raw[]=[],funding:[number,number,number][]=[];
  try{raw=pages('/fapi/v1/klines',e.symbol,start,end,1500);funding=fundingPages(e.symbol,start,end);}catch(err){console.log('aviso',e.symbol,String((err as Error).message));}
  return {entry:e,raw,funding,tradable:statusOf.get(e.symbol)==='TRADING'};
 });
 const earliest=Math.min(...coins.map(c=>Date.parse(c.entry.onboardDate)-24*H),now-H);
 let btcRaw:Raw[]=[],btcFunding:[number,number,number][]=[];
 if(coins.length){btcRaw=pages('/fapi/v1/klines','BTCUSDT',earliest,now,1500);btcFunding=fundingPages('BTCUSDT',earliest,now);}
 if(!coins.length||!btcRaw.length){
  const empty=evaluateLive([],[{t:Math.floor(now/H)*H-H,o:1,h:1,c:1}],[],protocolInstant,now);
  writeFileSync(OUT+'.json',JSON.stringify(empty,null,1));writeFileSync(OUT+'.md',markdown(empty));console.log('sem eventos ainda:',empty.verdict,empty.verdictReason);return;
 }
 const snap=evaluateLive(coins,btcRaw,btcFunding,protocolInstant,now);
 writeFileSync(OUT+'.json',JSON.stringify({...snap,dataSha256:createHash('sha256').update(JSON.stringify({coins:coins.map(c=>[c.entry.symbol,c.raw.length]),btc:btcRaw.length})).digest('hex')},null,1));writeFileSync(OUT+'.md',markdown(snap));
 console.log(snap.verdict,'|',snap.verdictReason,'| em espera',snap.counts.waiting,'abertos',snap.counts.open,'encerrados',snap.counts.closed);
}
if(process.argv[1]?.endsWith('listagens-ao-vivo.ts'))void main();
