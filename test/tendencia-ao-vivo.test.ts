import test from 'node:test';
import assert from 'node:assert/strict';
import {DAY,buildGrid,eligibility,positions,type SpotSeriesLike} from '../scripts/estudos/busca-diaria-lib.js';
import {membership,scaledPortfolio,MAIORES} from '../scripts/estudos/busca-maiores-lib.js';
import {ORIGIN,GENESIS,TREND_LIVE,decide,initialState,mark,rebalance,recordHash,verifyLedger,walkBuy,walkSell,
 type AccountRun,type Ledger,type Quote,type RunRecord} from '../scripts/estudos/tendencia-ao-vivo-lib.js';

/** Série diária sintética: 12 moedas, volumes decrescentes (as 5 primeiras são as maiores), tendência, ciclos e ruído. */
function market(days:number,seed=7):SpotSeriesLike[]{
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-0.5;};
 const start=ORIGIN+40*30*DAY;
 return Array.from({length:12},(_,k)=>{
  const t:number[]=[],h:number[]=[],l:number[]=[],c:number[]=[],qv:number[]=[];let p=100+10*k;
  for(let i=0;i<days;i++){p*=1+0.0015*Math.sin(i/(40+7*k))+0.03*rnd();t.push(start+i*DAY);c.push(p);h.push(p*(1+0.01*Math.abs(rnd())));l.push(p*(1-0.01*Math.abs(rnd())));qv.push((12-k)*8_000_000*(1+0.2*rnd()));}
  return {symbol:`C${String(k).padStart(2,'0')}USDT`,baseAsset:`C${k}`,status:'TRADING',t,h,l,c,qv};
 });
}

test('livro de ofertas: a compra sobe pelas ofertas, a venda desce pelas demandas, e o que falta fica registrado',()=>{
 const buy=walkBuy([[100,1],[101,2]],250);
 assert.ok(Math.abs(buy.qty-(1+150/101))<1e-9);assert.ok(Math.abs(buy.value-250)<1e-9);assert.equal(buy.filledAll,true);assert.ok(buy.avg>100&&buy.avg<101);
 const thin=walkBuy([[100,1]],500);assert.equal(thin.filledAll,false);assert.ok(Math.abs(thin.value-100)<1e-9);
 const sell=walkSell([[100,1],[99,2]],2);assert.ok(Math.abs(sell.value-199)<1e-9);assert.ok(Math.abs(sell.avg-99.5)<1e-9);assert.equal(sell.filledAll,true);
 assert.equal(walkSell([[100,1]],3).filledAll,false);
});

test('decisão ao vivo: com dados só até o dia T dá os mesmos pesos da pesquisa com a série inteira',()=>{
 const data=market(700),cutDay=data[0].t[600];
 const live=decide(data,cutDay);
 // Caminho da pesquisa: grade inteira, elegibilidade com a vela do dia seguinte, escala pelo índice T + 1.
 const T0=data[0].t[0],days=700,idx=600,grid=buildGrid(data,T0,days),elig=grid.coins.map(c=>eligibility(c,days)),member=membership(grid,elig,MAIORES.universeSize);
 const members=grid.coins.filter((_,k)=>member[k][idx]).map(c=>c.symbol).sort();
 assert.deepEqual(live.members,members);assert.equal(members.length,5);
 for(const [account,rule] of [['SMA100','SMA100'],['DONCHIAN_55_20','DONCHIAN_55_20']] as const){
  const pos=grid.coins.map(c=>positions(rule,c,days)),run=scaledPortfolio(grid,pos,member,5,MAIORES.costPerSide,0,idx+1);
  assert.ok(Math.abs(live.scale[account]-run.scale[idx+1])<1e-12,`${account}: escala`);
  const slot=1/members.length;
  grid.coins.forEach((c,k)=>{if(!member[k][idx])return;
   assert.equal(live.signals[account][c.symbol],pos[k][idx],`${account} ${c.symbol}: sinal`);
   assert.ok(Math.abs(live.weights[account][c.symbol]-(pos[k][idx]?run.scale[idx+1]*slot:0))<1e-12,`${account} ${c.symbol}: peso`);});
 }
 const sum=(w:Record<string,number>)=>Object.values(w).reduce((a,b)=>a+b,0);
 for(const a of ['SMA100','DONCHIAN_55_20','BENCH_5_MAIORES'] as const)assert.ok(sum(live.weights[a])<=1+1e-12,'sem alavancagem');
 // A carteira de referência fica sempre comprada nos 5 membros.
 assert.ok(Object.values(live.signals.BENCH_5_MAIORES).every(v=>v===1));
});

test('decisão ao vivo: acrescentar velas futuras não muda a decisão do dia T (sem viés de futuro)',()=>{
 const full=market(700),cutDay=full[0].t[500],a=decide(full,cutDay),b=decide(full.map(s=>({...s,t:s.t.slice(0,501),h:s.h.slice(0,501),l:s.l.slice(0,501),c:s.c.slice(0,501),qv:s.qv.slice(0,501)})),cutDay);
 assert.deepEqual(a,b);
});

const book=(mid:number,spread=0.0004,depth=1_000_000):Quote=>({mid,asks:[[mid*(1+spread/2),depth/mid],[mid*(1+spread*3),depth/mid]],bids:[[mid*(1-spread/2),depth/mid],[mid*(1-spread*3),depth/mid]]});

test('ordens simuladas: compra até o peso-alvo com taxa, venda antes de compra, ordens pequenas puladas e custo medido contra o fechamento',()=>{
 const quotes={AAAUSDT:book(100),BBBUSDT:book(50)},closes={AAAUSDT:99,BBBUSDT:50};
 const first=rebalance(initialState(),{AAAUSDT:0.3,BBBUSDT:0.2},quotes,closes);
 assert.equal(first.orders.length,2);assert.ok(first.orders.every(o=>o.side==='BUY'&&o.filledAll));
 assert.ok(Math.abs(first.orders[0].notional-3000)<1);assert.ok(Math.abs(first.orders[1].notional-2000)<1);
 assert.ok(first.state.cash>0&&first.state.cash<TREND_LIVE.initialCapital-4999);
 const fees=first.orders.reduce((s,o)=>s+o.fee,0);assert.ok(Math.abs(fees-first.orders.reduce((s,o)=>s+o.notional,0)*TREND_LIVE.takerFee)<1e-9);
 const a=first.orders[0];assert.ok(a.slipBps>0,'comprar custa acima do meio');assert.ok(a.delayBps>0,'o preço subiu desde o fechamento: custo de atraso');assert.ok(a.totalBps>a.feeBps);
 // Segunda rodada: AAA sai e BBB sobe; a venda acontece antes e financia a compra.
 const second=rebalance(first.state,{AAAUSDT:0,BBBUSDT:0.5},quotes,closes);
 assert.deepEqual(second.orders.map(o=>o.side),['SELL','BUY']);assert.equal(second.state.positions.AAAUSDT,undefined);
 // Ajuste abaixo do valor mínimo não vira ordem.
 const tiny=rebalance(first.state,{AAAUSDT:0.3004,BBBUSDT:0.2},quotes,closes);
 assert.equal(tiny.orders.length,0);assert.ok(tiny.skipped.some(s=>s.reason==='MIN_NOTIONAL'));
 // Patrimônio nunca fica negativo nem o caixa abaixo de zero.
 assert.ok(second.state.cash>=0&&second.equity>0);
});

test('queda de 30% desde o pico encerra a conta e zera a carteira; marcar a mercado não negocia',()=>{
 const q={AAAUSDT:book(100)},closes={AAAUSDT:100},bought=rebalance(initialState(),{AAAUSDT:1},q,closes);
 const crash={AAAUSDT:book(60)},marked=mark(bought.state,crash,{AAAUSDT:60});
 assert.equal(marked.orders.length,0);assert.ok(marked.drawdown>0.35);assert.equal(marked.state.halted,true);
 const out=rebalance(marked.state,{AAAUSDT:1},crash,{AAAUSDT:60});
 assert.equal(out.state.halted,true);assert.equal(out.state.positions.AAAUSDT,undefined);assert.ok(out.orders.every(o=>o.side==='SELL'));
 const after=rebalance(out.state,{AAAUSDT:1},crash,{AAAUSDT:60});assert.equal(after.orders.length,0,'conta encerrada não volta a comprar');
});

test('livro-razão encadeado: qualquer alteração de uma rodada passada é detectada',()=>{
 const run=(n:number,prev:string):RunRecord=>{
  const acc:AccountRun={targetWeights:{},signals:{},scale:1,orders:[],skipped:[],cash:10000,positions:{},equityBefore:10000,equity:10000,peak:10000,drawdown:0,halted:false};
  const body={n,runAt:'2026-10-11T00:00:00.000Z',decisionDay:'2026-10-10',decided:true,delaySeconds:0,missedDays:0,members:['BTCUSDT'],dataSha256:'x',
   accounts:{SMA100:acc,DONCHIAN_55_20:acc,BENCH_5_MAIORES:acc},prevHash:prev};
  return {...body,hash:recordHash(body)};
 };
 const r1=run(1,GENESIS),r2=run(2,r1.hash),ledger:Ledger={protocol:TREND_LIVE.version,initialCapital:10000,runs:[r1,r2]};
 assert.deepEqual(verifyLedger(ledger),{ok:true,brokenAt:null});
 const forged=structuredClone(ledger);forged.runs[0].accounts.SMA100.equity=20000;
 assert.deepEqual(verifyLedger(forged),{ok:false,brokenAt:0});
 const removed:Ledger={...ledger,runs:[r2]};assert.equal(verifyLedger(removed).ok,false);
});
