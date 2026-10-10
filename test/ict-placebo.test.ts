import test from 'node:test';
import assert from 'node:assert/strict';
import type {Candle} from '../src/domain/backtest.js';
import {signalBacktest} from '../src/domain/signal-backtest.js';
import {drawDistinct,forwardReturn,mulberry32,newExtremes,percentileByRank,placeboStrategy,templateFromIntent,type PlaceboEntry} from '../src/domain/video-hypotheses/placebo.js';

const H=3600000,T0=Date.UTC(2025,0,1);
const flat=(n:number):Candle[]=>Array.from({length:n},(_,i)=>({timestamp:T0+i*H,open:100,high:100.5,low:99.5,close:100,volume:1}));
const costs={initialCapital:10000,positionFraction:0.1,feeRate:0.00055,slippageBps:2,warmup:0};

test('mulberry32: mesma semente, mesma sequência; sementes diferentes divergem; valores em [0, 1)',()=>{
 const take=(seed:number)=>{const r=mulberry32(seed);return Array.from({length:6},()=>r());};
 assert.deepEqual(take(7),take(7));assert.notDeepEqual(take(7),take(8));
 for(const v of take(1))assert.ok(v>=0&&v<1);
});

test('drawDistinct: n posições distintas, ordenadas, dentro do intervalo, determinísticas e sem viés de posição',()=>{
 const a=drawDistinct(mulberry32(3),50,10),b=drawDistinct(mulberry32(3),50,10);
 assert.deepEqual(a,b);assert.equal(new Set(a).size,10);assert.deepEqual(a,[...a].sort((x,y)=>x-y));
 assert.ok(a.every(v=>Number.isInteger(v)&&v>=0&&v<50));
 assert.deepEqual(drawDistinct(mulberry32(1),5,5),[0,1,2,3,4]);assert.deepEqual(drawDistinct(mulberry32(1),5,0),[]);
 assert.throws(()=>drawDistinct(mulberry32(1),3,4));
 // Cada posição de 10 entra com frequência próxima de 3/10 em 3 000 sorteios.
 const hits=new Array<number>(10).fill(0);
 for(let s=1;s<=3000;s++)for(const v of drawDistinct(mulberry32(s),10,3))hits[v]++;
 for(const h of hits)assert.ok(Math.abs(h/3000-0.3)<0.04,`frequência ${h/3000}`);
});

test('molde da operação real: múltiplos em ATR da vela de decisão, lado e limite de tempo',()=>{
 assert.deepEqual(templateFromIntent(100,2,{side:1,stop:96,target:108,maxBars:48}),{side:1,stopAtr:2,targetAtr:4,maxBars:48});
 assert.deepEqual(templateFromIntent(100,2,{side:-1,stop:104,target:92,maxBars:24}),{side:-1,stopAtr:2,targetAtr:4,maxBars:24});
 assert.equal(templateFromIntent(100,2,{side:1,stop:96,maxBars:24})!.targetAtr,undefined,'sem alvo, o placebo também fica sem alvo');
 assert.equal(templateFromIntent(100,2,{side:1,stop:101}),null,'stop do lado errado');
 assert.equal(templateFromIntent(100,0,{side:1,stop:99}),null);
});

test('placebo: a entrada herda lado e distâncias em ATR; com posição aberta passa para a primeira vela livre; fora do ano é perdida',()=>{
 const candles=flat(400),range=candles.map(()=>1);
 const entry=(index:number,deadline:number,maxBars=10):PlaceboEntry=>({index,deadline,side:-1,stopAtr:2,targetAtr:3,maxBars});
 // Decisão direta: venda com stop 2 ATR acima e alvo 3 ATR abaixo do fechamento.
 const direct=placeboStrategy(range,candles,[entry(300,399)]);
 assert.deepEqual(direct.strategy(298,null),null,'ainda não é a vela de decisão');
 assert.deepEqual(direct.strategy(299,null),{side:-1,stop:102,target:97,maxBars:10});
 assert.equal(direct.lost(),0);
 // Duas entradas coladas: a segunda espera a primeira sair (limite de 10 velas) e entra na primeira vela livre.
 const two=placeboStrategy(range,candles,[entry(300,399),entry(302,399)]);
 const res=signalBacktest(candles,[],two.strategy,costs);
 assert.equal(res.trades.length,2);
 assert.equal(res.trades[0].entryTime,T0+300*H);
 assert.equal(res.trades[0].exitTime,T0+310*H,'sai por tempo na abertura da vela 310');
 assert.equal(res.trades[1].entryTime,T0+311*H,'a decisão da vela 310 abre na 311');
 assert.equal(two.lost(),0);
 // O prazo do ano acaba antes de a vela livre chegar: a operação é perdida e contada.
 const late=placeboStrategy(range,candles,[entry(300,399),entry(302,305)]);
 assert.equal(signalBacktest(candles,[],late.strategy,costs).trades.length,1);
 assert.equal(late.lost(),1);
 // Entrada que nem chegou a ser decidida até o fim da série também conta como perdida.
 const never=placeboStrategy(range,candles,[entry(399,399),entry(399,399)]);
 signalBacktest(candles,[],never.strategy,costs);
 assert.equal(never.lost(),1);
});

test('percentil por posto: 90% de 200 é a 180ª em ordem crescente',()=>{
 const values=Array.from({length:200},(_,i)=>(i*37)%200+1);
 assert.equal(percentileByRank(values,0.9),180);assert.equal(percentileByRank(values,1),200);assert.equal(percentileByRank(values,0.005),1);
 assert.ok(Number.isNaN(percentileByRank([],0.9)));
});

test('estudo de eventos: retorno futuro com lado aplicado e novas mínimas e máximas de N velas',()=>{
 const closes=[100,101,102,100,98,99,103];
 const candles:Candle[]=closes.map((c,i)=>({timestamp:T0+i*H,open:c,high:c+0.5,low:c-0.5,close:c,volume:1}));
 assert.ok(Math.abs(forwardReturn(candles,2,2,1)!-(98/102-1))<1e-12);
 assert.ok(Math.abs(forwardReturn(candles,2,2,-1)!-(1-98/102))<1e-12);
 assert.equal(forwardReturn(candles,5,3,1),null);
 // N = 3: a vela 4 faz nova mínima das 3 anteriores e a vela 6 faz nova máxima.
 const ex=newExtremes(candles,3);
 assert.deepEqual(ex.filter(e=>e.side===1).map(e=>e.index),[4]);
 assert.deepEqual(ex.filter(e=>e.side===-1).map(e=>e.index),[6]);
});
