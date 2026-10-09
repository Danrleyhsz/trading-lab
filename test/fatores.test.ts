import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCrossSectional} from '../src/domain/cross-sectional-momentum.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {simulateFactor,momentum,lowVolatility,carry,composite,positions,joinBlocks} from '../scripts/estudos/fatores-lib.js';

const H=3600000,T0=Date.UTC(2024,0,1);
function prng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/** Universo sintético determinístico: passeio aleatório com volatilidades e funding diferentes por moeda. */
function universe(symbols:string[],bars:number,seed=7):Record<string,PerpetualDataset>{
 const out:Record<string,PerpetualDataset>={};
 symbols.forEach((s,k)=>{
  const rnd=prng(seed+k*101),vol=0.002+0.0015*k,drift=(k%3-1)*0.00005;let price=100*(k+1);const trade=[];
  for(let i=0;i<bars;i++){const open=price,ret=drift+(rnd()-0.5)*2*vol;price=open*(1+ret);const hi=Math.max(open,price)*(1+rnd()*vol),lo=Math.min(open,price)*(1-rnd()*vol);trade.push({timestamp:T0+i*H,open,high:hi,low:lo,close:price,volume:1000});}
  const funding=[];for(let i=0;i<bars;i+=8)funding.push({timestamp:T0+i*H+7,rate:0.0001*(k-5)/5+(rnd()-0.5)*0.00005,markPrice:trade[i].close});
  out[s]={instrument:`BINANCE_USDM:${s}` as PerpetualDataset['instrument'],trade,mark:structuredClone(trade),funding};
 });
 return out;
}
const symbols=['AAAUSDT','BBBUSDT','CCCUSDT','DDDUSDT','EEEUSDT','FFFUSDT','GGGUSDT','HHHUSDT','IIIUSDT','JJJUSDT','KKKUSDT','LLLUSDT'];
const cfg={lookbackHours:240,rebalanceHours:72,startBar:240,longCount:3,shortCount:3,legFraction:0.05,feeRate:0.00055,slippageBps:2,initialCapital:10000};

test('com o sinal de momentum, o simulador copiado dá exatamente o resultado do original',()=>{
 const d=universe(symbols,1500),a=simulateCrossSectional(d,cfg),b=simulateFactor(d,cfg,momentum(cfg.lookbackHours));
 assert.equal(b.finalEquity,a.finalEquity);assert.equal(b.maxDrawdown,a.maxDrawdown);assert.equal(b.feesPaid,a.feesPaid);assert.equal(b.fundingCashDelta,a.fundingCashDelta);
 assert.equal(b.closedLegs,a.closedLegs);assert.deepEqual(b.rebalances,a.rebalances);assert.deepEqual(b.equitySeries,a.equitySeries);assert.ok(a.rebalances.length>10&&a.fundingCashDelta!==0);
});

test('o sinal de carry usa só funding já liquidado até o fechamento da decisão e nunca olha o futuro',()=>{
 const d=universe(symbols,900),i=400,close=d[symbols[0]].trade[i].timestamp+H,base=carry(168)(d,symbols,i);
 // Uma liquidação exatamente no fechamento, ou depois, não altera o sinal.
 const future=structuredClone(d);for(const s of symbols){future[s].funding.push({timestamp:close,rate:0.5,markPrice:1},{timestamp:close+8*H,rate:-0.5,markPrice:1});}
 assert.deepEqual([...carry(168)(future,symbols,i)],[...base]);
 // Uma liquidação um milissegundo antes do fechamento entra.
 const inside=structuredClone(d);inside[symbols[0]].funding.push({timestamp:close-1,rate:0.01,markPrice:1});inside[symbols[0]].funding.sort((a,b)=>a.timestamp-b.timestamp);
 assert.notEqual(carry(168)(inside,symbols,i).get(symbols[0]),base.get(symbols[0]));
 // Funding mais alto = menos atrativa (vende-se quem paga funding alto a quem compra).
 const manual=new Map(symbols.map(s=>[s,0]));manual.set('AAAUSDT',0.001);manual.set('BBBUSDT',-0.001);
 const probe=structuredClone(d);for(const s of symbols)probe[s].funding=probe[s].funding.filter(f=>f.timestamp>=close);for(const s of symbols)probe[s].funding.push({timestamp:close-H,rate:manual.get(s)!,markPrice:1});
 for(const s of symbols)probe[s].funding.sort((a,b)=>a.timestamp-b.timestamp);
 const score=carry(168)(probe,symbols,i);assert.ok(score.get('BBBUSDT')!>score.get('AAAUSDT')!);
});

test('baixa volatilidade prefere a menos volátil; composto é a média das posições; empates seguem a ordem do símbolo',()=>{
 const d=universe(symbols,900),i=850,vol=lowVolatility(672)(d,symbols,i);
 // As moedas sintéticas ficam mais voláteis com o índice: a menos volátil (AAA) é a mais atrativa.
 assert.equal([...vol.entries()].sort((a,b)=>b[1]-a[1])[0][0],'AAAUSDT');assert.equal([...vol.entries()].sort((a,b)=>a[1]-b[1])[0][0],'LLLUSDT');
 const pos=positions(new Map([['B',1],['A',1],['C',0]]));assert.equal(pos.get('C'),0);assert.deepEqual([pos.get('A'),pos.get('B')],[2,1]);
 const c=composite([momentum(240),lowVolatility(240)])(d,symbols,i),p1=positions(momentum(240)(d,symbols,i)),p2=positions(lowVolatility(240)(d,symbols,i));
 for(const s of symbols)assert.equal(c.get(s),(p1.get(s)!+p2.get(s)!)/2);
});

test('cada sinal roda de ponta a ponta, é determinístico e não altera o universo de entrada',()=>{
 const d=universe(symbols,1200),snapshot=JSON.stringify(d);
 for(const [name,f] of [['carry',carry(168)],['lowvol',lowVolatility(240)],['composto',composite([momentum(240),lowVolatility(240),carry(168)])]] as const){
  const a=simulateFactor(d,cfg,f),b=simulateFactor(d,cfg,f);assert.deepEqual(a.equitySeries,b.equitySeries,name);assert.ok(a.rebalances.length>10,name);
  for(const r of a.rebalances){assert.equal(r.long.length,3);assert.equal(r.short.length,3);assert.ok(!r.long.some(s=>r.short.includes(s)),name);}
 }
 assert.equal(JSON.stringify(d),snapshot);
});

test('junção de blocos recusa lacuna, repetição e funding fora de ordem',()=>{
 const d=universe(['AAAUSDT'],30)['AAAUSDT'],a={trade:d.trade.slice(0,10),funding:[]},b={trade:d.trade.slice(10,20),funding:[]};
 assert.equal(joinBlocks('AAAUSDT',[a,b]).trade.length,20);
 assert.throws(()=>joinBlocks('AAAUSDT',[a,{trade:d.trade.slice(11,20),funding:[]}]),/lacuna/);
 assert.throws(()=>joinBlocks('AAAUSDT',[a,{trade:d.trade.slice(9,20),funding:[]}]),/lacuna ou repetição/);
 const f=[{timestamp:5,rate:0.1,markPrice:1},{timestamp:9,rate:0.1,markPrice:1}];
 assert.throws(()=>joinBlocks('AAAUSDT',[{trade:a.trade,funding:f},{trade:b.trade,funding:[f[1]]}]),/funding repetido/);
});
