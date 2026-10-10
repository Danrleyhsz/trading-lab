// Estudo BUSCA_ANTIGA_V1 (docs/PROTOCOLO_BUSCA_ANTIGA_V1.md): a regra congelada de BUSCA_MAIORES_V1 em 2011 a 16/08/2017, com velas diárias públicas
// do Bitstamp (BTC) e da Bitfinex (10 altcoins). Só dados públicos; não envia ordens. Uso: npx tsx scripts/estudos/busca-antiga.ts
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deflatedSharpe} from '../../src/domain/backtest-robustness.js';
import {loadSpot} from './spot-diario-perfil.js';
import {DAY,buildGrid,eligibility,positions,stats,coinAlone,type RuleId,type SpotSeriesLike} from './busca-diaria-lib.js';
import {MAIORES,membership,scaledPortfolio} from './busca-maiores-lib.js';

const DIR='scripts/estudos/out',END=Date.UTC(2017,7,16),CHECK_END=Date.UTC(2018,11,31),TRIALS=33,pct=(v:number)=>(v>=0?'+':'')+(v*100).toFixed(1)+'%';
export const ANTIGA=Object.freeze({version:'BUSCA_ANTIGA_V1',declaredAt:'2026-10-10',...MAIORES,end:'2017-08-16',rules:['SMA50','SMA100','DONCHIAN_55_20'] as RuleId[],
 pairs:[{symbol:'BTC',source:'bitstamp',pair:'btcusd'},...['LTC','ETH','ETC','ZEC','XMR','DSH','XRP','EOS','IOT','OMG'].map(s=>({symbol:s,source:'bitfinex',pair:`t${s}USD`}))],
 maximumDrawdown:0.30,minimumSharpe:0.8,minimumYearsPositive:2,completeYears:[2014,2015,2016],minimumBreadth:0.6,minimumMemberDays:365,trials:TRIALS});
const P=ANTIGA;
interface Raw {t:number;o:number;h:number;l:number;c:number;v:number}

function curlJson(url:string){return JSON.parse(execFileSync('curl',['-sS','-m','40',url],{encoding:'utf8',maxBuffer:64*1024*1024}));}
const sleep=(ms:number)=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
export function parseBitstamp(rows:{timestamp:string;open:string;high:string;low:string;close:string;volume:string}[]):Raw[]{
 return rows.map(r=>({t:Number(r.timestamp)*1000,o:Number(r.open),h:Number(r.high),l:Number(r.low),c:Number(r.close),v:Number(r.volume)}));
}
/** Bitfinex: [MTS, ABERTURA, FECHAMENTO, MÁXIMA, MÍNIMA, VOLUME]. */
export function parseBitfinex(rows:number[][]):Raw[]{return rows.map(r=>({t:r[0],o:r[1],c:r[2],h:r[3],l:r[4],v:r[5]}));}
function download(p:{symbol:string;source:string;pair:string}):Raw[]{
 const file=`${DIR}/antiga-${p.symbol}.json`;
 if(existsSync(file))return JSON.parse(readFileSync(file,'utf8')).rows as Raw[];
 let rows:Raw[]=[];
 if(p.source==='bitstamp'){
  let start=Math.floor(Date.UTC(2011,8,1)/1000);
  for(;;){const j=curlJson(`https://www.bitstamp.net/api/v2/ohlc/${p.pair}/?step=86400&limit=1000&start=${start}`),page=parseBitstamp(j.data.ohlc);sleep(800);
   if(!page.length)break;rows.push(...page);const last=page.at(-1)!.t;if(last>=CHECK_END||page.length<1000)break;start=Math.floor(last/1000)+86400;}
 }else{
  rows=parseBitfinex(curlJson(`https://api-pub.bitfinex.com/v2/candles/trade:1D:${p.pair}/hist?limit=10000&sort=1&start=0&end=${CHECK_END+DAY}`));sleep(2500);
 }
 const seen=new Set<number>();rows=rows.filter(r=>r.t<=CHECK_END&&!seen.has(r.t)&&seen.add(r.t)).sort((a,b)=>a.t-b.t);
 mkdirSync(DIR,{recursive:true});writeFileSync(file,JSON.stringify({symbol:p.symbol,source:p.source,pair:p.pair,rows,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}));
 return rows;
}
const toSeries=(symbol:string,rows:Raw[],end:number):SpotSeriesLike=>{
 const r=rows.filter(x=>x.t<=end&&x.c>0);
 return {symbol:symbol+'USDT',baseAsset:symbol,status:'TRADING',t:r.map(x=>x.t),h:r.map(x=>x.h),l:r.map(x=>x.l),c:r.map(x=>x.c),qv:r.map(x=>x.v*x.c)};
};
const corr=(a:number[],b:number[])=>{const n=Math.min(a.length,b.length),x=a.slice(0,n),y=b.slice(0,n),mx=x.reduce((s,v)=>s+v,0)/n,my=y.reduce((s,v)=>s+v,0)/n;let c=0,vx=0,vy=0;for(let i=0;i<n;i++){c+=(x[i]-mx)*(y[i]-my);vx+=(x[i]-mx)**2;vy+=(y[i]-my)**2;}return c/Math.sqrt(vx*vy);};

function main(){
 const raw=Object.fromEntries(P.pairs.map(p=>[p.symbol,download(p)])),usable=P.pairs.filter(p=>raw[p.symbol].length>=90);
 const series=usable.map(p=>toSeries(p.symbol,raw[p.symbol],END)).filter(s=>s.t.length>0);
 const T0=Math.min(...series.map(s=>s.t[0])),days=Math.round((END-T0)/DAY)+1,grid=buildGrid(series,T0,days),last=days-2,K=grid.coins.length;
 const elig=grid.coins.map(c=>eligibility(c,days)),member5=membership(grid,elig,5),btcK=grid.coins.findIndex(c=>c.baseAsset==='BTC'),ones=grid.coins.map(()=>new Uint8Array(days).fill(1));
 // BTC sem filtro de volume: só os 90 dias de histórico.
 const btcNoVol=grid.coins.map((c,k)=>{const a=new Uint8Array(days);if(k===btcK)for(let t=c.first+89;t<c.last&&t<days;t++)a[t]=1;return a;});
 const btcVol=grid.coins.map((_,k)=>k===btcK?elig[k]:new Uint8Array(days));
 const yearIdx=(y:number)=>[Math.max(0,Math.round((Date.UTC(y,0,1)-T0)/DAY)),Math.min(last,Math.round((Date.UTC(y+1,0,1)-T0)/DAY)-1)] as [number,number];
 const run=(pos:Uint8Array[],member:Uint8Array[],n:number,cost:number,w:[number,number]=[0,last],target=P.targetVol)=>scaledPortfolio(grid,pos,member,n,cost,w[0],w[1],target);
 const stat=(r:ReturnType<typeof run>,a?:number,b?:number)=>stats(r.returns,a??1,b??r.returns.length);
 const bench=run(ones,member5,5,P.costPerSide),benchS=stat(bench);
 const firstEligible=(()=>{const m=member5.map(a=>a.findIndex(x=>x===1)).filter(i=>i>=0);return m.length?new Date(T0+Math.min(...m)*DAY).toISOString().slice(0,10):'nunca';})();
 console.log('moedas',K,'| de',new Date(T0).toISOString().slice(0,10),'a 2017-08-16 |',days,'dias | primeira decisão com membro:',firstEligible,'| bench',pct(benchS.total),'Sharpe',benchS.sharpe.toFixed(2),'DD',pct(benchS.maxDrawdown));
 const results=(P.rules as RuleId[]).map(rule=>{
  const pos=grid.coins.map(c=>positions(rule,c,days));
  const r=run(pos,member5,5,P.costPerSide),s=stat(r),x2=stat(run(pos,member5,5,P.costPerSide*2)),x4=stat(run(pos,member5,5,P.costPerSide*4));
  const byYear:Record<string,{ret:number;dd:number;invested:number}>={};
  for(let y=2011;y<=2017;y++){const [a,b]=yearIdx(y);if(b-a<20)continue;const lo=a+1,hi=b+1,st=stats(r.returns,lo,Math.min(hi,r.returns.length)),inv=Array.from(r.invested.slice(lo,hi));byYear[y]={ret:st.total,dd:st.maxDrawdown,invested:inv.reduce((x,v)=>x+v,0)/Math.max(1,inv.length)};}
  const each=grid.coins.map((c,k)=>({symbol:c.baseAsset,...coinAlone(c,pos[k],member5[k],P.costPerSide,0,last)})).filter(x=>x.days>=P.minimumMemberDays);
  const breadth=each.length?each.filter(x=>x.total>0).length/each.length:0,positiveYears=P.completeYears.filter(y=>(byYear[y]?.ret??-1)>0).length;
  const btc=stat(run(pos,btcVol,1,P.costPerSide)),btcNoV=stat(run(pos,btcNoVol,1,P.costPerSide)),btcBuyHold=stat(run(ones,btcNoVol,1,P.costPerSide));
  const checks:Record<string,boolean>={DATA_QUALITY:usable.length/P.pairs.length>=0.9,POSITIVE_NET:s.total>0,BOUNDED_DRAWDOWN:s.maxDrawdown<=P.maximumDrawdown,SHARPE_BAR:s.sharpe>=P.minimumSharpe&&s.sharpe>benchS.sharpe,
   POSITIVE_YEARS:positiveYears>=P.minimumYearsPositive,COSTS_X2:x2.total>0,MEMBER_BREADTH:breadth>=P.minimumBreadth};
  const out={rule,verdict:Object.values(checks).every(Boolean)?'VALIDADA_ANTIGA':'NAO_VALIDADA',failed:Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),checks,full:s,costsX2:x2,costsX4:x4,byYear,positiveYears,breadth,memberCoins:each.length,
   btcWithVolumeFilter:btc,btcNoVolumeFilter:btcNoV,btcBuyHold,averageScale:r.scale.reduce((a,b)=>a+b,0)/r.scale.length,investedShare:r.invested.reduce((a,b)=>a+b,0)/r.invested.length};
  console.log(rule.padEnd(15),out.verdict.padEnd(14),'total',pct(s.total),'Sharpe',s.sharpe.toFixed(2),'DD',pct(s.maxDrawdown),'| anos+',positiveYears+'/3','amplitude',(breadth*100).toFixed(0)+'%('+each.length+')','x2',pct(x2.total),'x4',pct(x4.total),'| BTC s/ filtro',pct(btcNoV.total),btcNoV.sharpe.toFixed(2),pct(btcNoV.maxDrawdown),out.failed.join(','));
  return out;
 });
 const sh=results.map(x=>x.full.sharpe/Math.sqrt(365)),m=sh.reduce((a,b)=>a+b,0)/sh.length,variance=sh.reduce((a,b)=>a+(b-m)**2,0)/(sh.length-1);
 const dsr=results.map(x=>{const pos=grid.coins.map(c=>positions(x.rule,c,days));return {rule:x.rule,deflatedSharpe:deflatedSharpe(Array.from(run(pos,member5,5,P.costPerSide).returns).slice(1),TRIALS,variance).deflatedSharpe};});
 // Conferência das séries contra a Binance na sobreposição (17/08/2017 a 31/12/2018).
 const check:Record<string,{days:number;returnCorrelation:number}>={};
 for(const [sym,bin] of [['BTC','BTCUSDT'],['ETH','ETHUSDT'],['LTC','LTCUSDT']] as const){
  const f=`${DIR}/spot1d-${bin}.json`;if(!existsSync(f)||!raw[sym])continue;
  const b=loadSpot(f),byT=new Map(raw[sym].map(r=>[Math.floor(r.t/DAY),r.c])),x:number[]=[],y:number[]=[];
  for(let i=1;i<b.t.length;i++){if(b.t[i]>CHECK_END)break;const a0=byT.get(Math.floor(b.t[i-1]/DAY)),a1=byT.get(Math.floor(b.t[i]/DAY));if(a0&&a1){x.push(a1/a0-1);y.push(b.c[i]/b.c[i-1]-1);}}
  if(x.length>30)check[sym]={days:x.length,returnCorrelation:corr(x,y)};
 }
 console.log('conferência com a Binance:',JSON.stringify(check));
 const commit=execFileSync('git',['log','-1','--format=%H','--','docs/PROTOCOLO_BUSCA_ANTIGA_V1.md'],{encoding:'utf8'}).trim();
 const report={protocol:{...P,pairs:P.pairs},protocolCommit:commit,execution:'HISTORICAL_SIMULATION_OFFLINE',automaticPaperApproval:false,runAt:new Date().toISOString(),
  data:{coins:K,from:new Date(T0).toISOString().slice(0,10),to:'2017-08-16',days,firstDecisionWithMember:firstEligible,pairsDeclared:P.pairs.length,pairsUsable:usable.length,seriesStart:Object.fromEntries(series.map(s=>[s.baseAsset,new Date(s.t[0]).toISOString().slice(0,10)]))},
  benchmark:benchS,results,deflated:dsr,sourceCheck:check,datasetHashes:Object.fromEntries(P.pairs.filter(p=>raw[p.symbol].length).map(p=>[p.symbol,createHash('sha256').update(JSON.stringify(raw[p.symbol])).digest('hex')]))};
 const out='docs/estudos/busca-antiga-v1-2026-10-10';writeFileSync(out+'.json',JSON.stringify(report,null,1));writeFileSync(out+'.md',markdown(report));
}
function markdown(r:any){
 const f=(s:any)=>`${pct(s.total)} / ${s.sharpe.toFixed(2)} / ${(s.maxDrawdown*100).toFixed(1)}%`,res=r.results as any[],yrs=Object.keys(res[0].byYear);
 return [`# Resultado ${r.protocol.version}: a regra congelada nas maiores moedas, 2011 a 2017`,'',
  `Executado em ${r.runAt}, fora do servidor, com velas diárias públicas do Bitstamp (BTC) e da Bitfinex (altcoins), pelo protocolo \`docs/PROTOCOLO_BUSCA_ANTIGA_V1.md\` (commit \`${r.protocolCommit}\`), sem mudar nenhum critério. ${r.data.coins} moedas com dados, de ${r.data.from} a ${r.data.to}; primeira data com membro elegível: ${r.data.firstDecisionWithMember}. Início das séries: ${Object.entries(r.data.seriesStart).map(([s,d])=>`${s} ${d}`).join(', ')}. Células "retorno / Sharpe / queda máxima".`,'',
  '## Veredito por regra','','| Regra | Veredito | Reprovou em |','|---|---|---|',...res.map(x=>`| ${x.rule} | **${x.verdict}** | ${x.failed.join(', ')||'-'} |`),'',
  '## Carteira das maiores (alvo de 20% de volatilidade, 15 bps por lado)','','| | Período inteiro | Custos x2 | Custos x4 (60 bps por lado) | Anos positivos (2014, 2015, 2016) | Amplitude entre membros |','|---|---|---|---|---|---|',
  `| **Maiores sempre compradas** (benchmark) | ${f(r.benchmark)} | | | | |`,...res.map(x=>`| ${x.rule} | ${f(x.full)} | ${pct(x.costsX2.total)} | ${pct(x.costsX4.total)} | ${x.positiveYears} de 3 | ${(x.breadth*100).toFixed(0)}% de ${x.memberCoins} |`),'',
  '## BTC sozinho (informação)','','| Regra | Com o filtro de volume do protocolo | Sem filtro de volume (de 90 dias de histórico em diante) | BTC comprado e seguro, mesma escala, sem filtro |','|---|---|---|---|',
  ...res.map(x=>`| ${x.rule} | ${f(x.btcWithVolumeFilter)} | ${f(x.btcNoVolumeFilter)} | ${f(x.btcBuyHold)} |`),'',
  '## Por ano (retorno / queda máxima · fração investida)','','| Regra | '+yrs.join(' | ')+' |','|---|'+yrs.map(()=>'---').join('|')+'|',
  ...res.map((x:any)=>`| ${x.rule} | `+yrs.map(y=>`${pct(x.byYear[y].ret)} / ${(x.byYear[y].dd*100).toFixed(0)}% · ${(x.byYear[y].invested*100).toFixed(0)}%`).join(' | ')+' |'),'',
  `Sharpe deflacionado com 33 tentativas (fora do veredito): ${r.deflated.map((d:any)=>`${d.rule} ${d.deflatedSharpe.toFixed(3)}`).join('; ')}.`,'',
  '## Conferência das séries contra a Binance (sobreposição até 31/12/2018)','',...Object.entries(r.sourceCheck).map(([s,c]:[string,any])=>`- ${s}: ${c.days} dias em comum, correlação dos retornos diários ${c.returnCorrelation.toFixed(3)}.`),'',
  'Hashes das séries (SHA-256):','',...Object.entries(r.datasetHashes).map(([s,h])=>`- ${s}: \`${h}\``),''].join('\n');
}
if(process.argv[1]?.endsWith('busca-antiga.ts'))main();
