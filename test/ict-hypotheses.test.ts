import test from 'node:test';
import assert from 'node:assert/strict';
import type {Candle} from '../src/domain/backtest.js';
import {atr} from '../src/domain/video-hypotheses/indicators.js';
import {
 breakOfStructure,confirmedPivots,displacement,displacementMomentum,fairValueGaps,fvgRetracement,internalRangeLiquidity,
 invertedFvg,liquiditySweeps,orderBlocks,type IctResult
} from '../src/domain/video-hypotheses/ict.js';

const H=3600000,T0=Date.UTC(2025,0,1);
const bar=(i:number,o:number,h:number,l:number,c:number):Candle=>({timestamp:T0+i*H,open:o,high:h,low:l,close:c,volume:1});
const flat=(i:number,p=100):Candle=>bar(i,p,p+0.5,p-0.5,p);
/** `from` velas planas (100, amplitude 1, ATR = 1) seguidas das velas [abertura, máxima, mínima, fechamento] a partir do índice `from`. */
function build(from:number,rows:number[][],tail=3):Candle[]{
 const out:Candle[]=[];for(let i=0;i<from;i++)out.push(flat(i));
 for(const r of rows)out.push(bar(out.length,r[0],r[1],r[2],r[3]));
 // A cauda é quase sem amplitude para não varrer nem testar nenhum nível do fundo plano.
 const last=out[out.length-1].close;for(let k=0;k<tail;k++)out.push(bar(out.length,last,last+0.1,last-0.1,last));
 return out;
}
const at=(r:IctResult)=>r.signals.map((s,i)=>s?i:-1).filter(i=>i>=0);
const A=(c:readonly Candle[],i:number)=>atr(c,24)[i];

test('P2 pivô: só existe a partir da vela p+L e não muda quando a série cresce',()=>{
 const L=6,candles:Candle[]=[];
 for(let k=0;k<45;k++){const h=100-Math.abs(k-20)*0.5;candles.push(bar(k,h-0.2,h,h-0.4,h-0.1));}
 const peak=(c:readonly Candle[])=>confirmedPivots(c,L).find(p=>p.kind==='HIGH'&&p.index===20);
 assert.equal(peak(candles.slice(0,26)),undefined,'com as velas 0..25 o topo da vela 20 ainda não existe');
 const found=peak(candles.slice(0,27));assert.ok(found);assert.equal(found.confirmedAt,26);assert.equal(found.price,100);
 assert.deepEqual(peak(candles),found);
});

test('P4 FVG: detecta o gap de 3 velas, não detecta com vela do meio fraca, respeita o tamanho mínimo e o espelho',()=>{
 const up=build(31,[[100,103.2,99.9,103],[103,104,102.5,103.5]]);
 const range=atr(up,24),gaps=fairValueGaps(up,range,1.5,0.25);
 assert.equal(gaps.length,1);
 assert.deepEqual(gaps[0],{created:32,side:1,bottom:100.5,top:102.5,ce:101.5});
 const weak=build(31,[[100,102,99.9,100.2],[102,103,101.5,102.5]]);
 assert.deepEqual(fairValueGaps(weak,atr(weak,24),1.5,0.25),[],'o gap existe, mas a vela do meio não é de deslocamento');
 assert.deepEqual(fairValueGaps(up,range,1.5,2),[],'gap de 2,0 é menor que 2 ATR (≈ 2,23)');
 const down=build(31,[[100,100.1,96.8,97],[97,98,96,96.5]]);
 const mirror=fairValueGaps(down,atr(down,24),1.5,0.25);
 assert.equal(mirror.length,1);assert.deepEqual({side:mirror[0].side,top:mirror[0].top,bottom:mirror[0].bottom},{side:-1,top:99.5,bottom:98});
});

test('P3 e P5: deslocamento exige corpo e fechamento no quarto extremo; BOS exige a quebra com o fechamento anterior abaixo',()=>{
 const candles=build(30,[[100.2,100.3,99,99.2],[99.2,100.1,99.1,100],[100,100,98.8,99],[99,103.3,98.9,103.2],[101.5,103.3,99.8,100.5]]);
 const d=displacement(candles,atr(candles,24),1.5);
 assert.equal(d[33],1);assert.equal(d[30],0,'corpo pequeno');assert.equal(d[34],0,'corpo de 1,0 < 1,5 ATR');
 const wick=build(30,[[100,103.3,98.9,100.5]]);
 assert.equal(displacement(wick,atr(wick,24),1.5)[30],0,'corpo pequeno com pavio grande não é deslocamento');
 const bos=breakOfStructure(candles,6);
 assert.equal(bos[33],1,'fecha em 103,2 acima do topo confirmado de 100,5, com o fechamento anterior em 99');
 assert.equal(bos[34],0);
 const already=build(30,[[100,102,99.9,101.5],[101.5,104,101.4,103.5]]);
 assert.equal(breakOfStructure(already,6)[31],0,'o fechamento anterior já estava acima do topo: não é uma quebra nova');
});

test('H07 OB: escolhe a última vela de baixa antes do deslocamento, entra no reteste e o BOS exigido filtra',()=>{
 const rows=[[100.2,100.3,99,99.2],[99.2,100.1,99.1,100],[100,100,98.8,99],[99,103.3,98.9,103.2],[101.5,103.3,99.8,100.5]];
 const candles=build(30,rows),res=orderBlocks(candles,{k:1.5,bos:0});
 assert.deepEqual(at(res),[34]);
 const s=res.signals[34]!;
 assert.equal(s.side,1);assert.equal(s.maxBars,48);
 // OB = vela 32 (a última de baixa), bottom 98,8; a primeira de baixa (vela 30) daria bottom 99,0.
 assert.ok(Math.abs(s.stop-(98.8-0.1*A(candles,34)))<1e-9,`stop ${s.stop}`);
 assert.ok(Math.abs(s.target!-(100.5+2*(100.5-s.stop)))<1e-9);
 assert.deepEqual(res.zones,[{kind:'ORDER_BLOCK',created:33,side:1,touched:true,entered:true}]);
 assert.deepEqual(at(orderBlocks(candles,{k:1.5,bos:1})),[34],'o deslocamento da vela 33 é uma BOS');
 // Sem quebra de estrutura: deslocamento que fecha abaixo do topo confirmado de 100,5.
 const quiet=build(30,[[100.2,100.3,99,99.2],[99.2,100.1,99.1,100],[100,100,98.8,99],[97.9,100.2,97.8,100.1],[100.1,100.3,99.8,100.2]]);
 assert.deepEqual(at(orderBlocks(quiet,{k:1.5,bos:0})),[34]);
 assert.deepEqual(at(orderBlocks(quiet,{k:1.5,bos:1})),[],'sem BOS não há OB com bos = 1');
});

test('H07 OB: fechar abaixo de bottom anula a zona mesmo que a mínima tenha alcançado o nível',()=>{
 const candles=build(30,[[100.2,100.3,99,99.2],[99.2,100.1,99.1,100],[100,100,98.8,99],[99,103.3,98.9,103.2],[99,99.1,97.9,98]]);
 const res=orderBlocks(candles,{k:1.5,bos:0});
 assert.deepEqual(at(res),[]);
 assert.deepEqual(res.zones.map(z=>({touched:z.touched,entered:z.entered})),[{touched:false,entered:false}]);
});

test('H08 sweep: varredura com retomada gera sinal; mais funda que 1 ATR não gera e consome o nível; r = 3 espera a retomada',()=>{
 const sweep=build(30,[[100,100.2,98.9,100]]),res=liquiditySweeps(sweep,{L:6,r:1});
 assert.deepEqual(at(res),[30]);
 assert.equal(res.signals[30]!.side,1);
 assert.ok(Math.abs(res.signals[30]!.stop-(98.9-0.1*A(sweep,30)))<1e-9);
 assert.deepEqual(res.events,[{index:30,side:1,resumedAt:30}]);
 // Mais funda que 1 ATR: rompimento, sem evento; o nível já foi consumido e o fundo seguinte não é varredura.
 const deep=build(30,[[100,100.2,97,100],[100,100.2,98.9,100]]),deepRes=liquiditySweeps(deep,{L:6,r:1});
 assert.deepEqual(at(deepRes),[]);assert.deepEqual(deepRes.events,[]);
 const slow=build(30,[[100,100,98.9,99.3],[99.3,100.2,99.2,100.1]]);
 assert.deepEqual(at(liquiditySweeps(slow,{L:6,r:1})),[],'com r = 1 a retomada tinha que ser na própria vela');
 const late=liquiditySweeps(slow,{L:6,r:3});
 assert.deepEqual(at(late),[31]);assert.ok(Math.abs(late.signals[31]!.stop-(98.9-0.1*A(slow,31)))<1e-9,'stop na mínima de 30 a 31');
 assert.deepEqual(late.events,[{index:30,side:1,resumedAt:31}]);
 // Espelho: varredura de topo e venda.
 const top=build(30,[[100,101.1,99.8,100]]),mirror=liquiditySweeps(top,{L:6,r:1});
 assert.deepEqual(at(mirror),[30]);assert.equal(mirror.signals[30]!.side,-1);
});

test('H10 IFVG: pavio além de top não inverte; fechamento além de top inverte e a zona é retestada; disp = 1 espera o deslocamento',()=>{
 const gap=[[100,100.1,96.8,97],[97,98,96,96.5]];
 const wick=build(31,[...gap,[96.5,100,96.4,98.5],...Array.from({length:6},()=>[98,98.5,97.5,98])]);
 assert.deepEqual(at(invertedFvg(wick,{g:0.25,disp:0})),[],'um pavio além de top não basta');
 const closed=build(31,[...gap,[96.5,98,96.4,97.5],[97.5,100.5,97.4,100.2],[100.2,100.4,99.4,100]]);
 for(const disp of [0,1] as const){
  const res=invertedFvg(closed,{g:0.25,disp});
  assert.deepEqual(at(res),[35],`disp = ${disp}`);
  const s=res.signals[35]!;assert.equal(s.side,1);assert.ok(Math.abs(s.stop-(98-0.1*A(closed,35)))<1e-9);
  assert.deepEqual(res.zones,[{kind:'INVERTED_FVG',created:34,side:1,touched:true,entered:true}]);
 }
 // Um fechamento comum acima de top e o reteste logo depois: com disp = 0 opera; com disp = 1 a zona espera o deslocamento.
 const later=build(31,[...gap,[96.5,98,96.4,97.5],[99.4,100,99.3,99.9],[99.9,100.1,99.4,99.8],[99.8,103,99.7,102.9],[102.9,103,99.4,100.5]]);
 assert.deepEqual(at(invertedFvg(later,{g:0.25,disp:0})),[35]);
 assert.deepEqual(at(invertedFvg(later,{g:0.25,disp:1})),[37],'o fechamento comum não matou a zona; a inversão é a vela de deslocamento');
});

test('H11 IRL: fundo interno varrido gera sinal com alvo no topo do range; o fundo do próprio range não gera',()=>{
 const trend=(k:number)=>91+0.2*Math.max(0,k-8);
 const make=(special:Record<number,number[]>)=>Array.from({length:56},(_,k)=>{const m=trend(k),r=special[k]??[m,m+0.5,m-0.5,m+0.1];return bar(k,r[0],r[1],r[2],r[3]);});
 const base={5:[91,110,90.5,91],7:[91,91.5,90,91]};
 const internal=make({...base,43:[98,98.5,96.5,98.1],49:[99.2,99.7,96.1,99.3]}),res=internalRangeLiquidity(internal,{N:48,L:3});
 assert.deepEqual(at(res),[49]);
 const s=res.signals[49]!;
 assert.equal(s.side,1);assert.equal(s.target,110);assert.equal(s.maxBars,72);
 assert.ok(Math.abs(s.stop-(96.1-0.1*A(internal,49)))<1e-9);
 assert.deepEqual(res.events,[{index:49,side:1,resumedAt:49}]);
 const noInternal=make({...base,49:[99.2,99.7,96.1,99.3]});
 assert.deepEqual(at(internalRangeLiquidity(noInternal,{N:48,L:3})),[],'sem fundo interno confirmado não há sinal');
 const ownLow=make({...base,49:[99.2,99.7,89.7,99.3]});
 assert.deepEqual(at(internalRangeLiquidity(ownLow,{N:48,L:3})),[],'o fundo do próprio range não conta');
});

test('H09 deslocamento: o papel A entra a favor da vela, sem alvo, com saída por tempo em 24 velas',()=>{
 const candles=build(30,[[99,103.3,98.9,103.2]]),res=displacementMomentum(candles,{k:1.5});
 assert.deepEqual(at(res),[30]);
 const s=res.signals[30]!;assert.equal(s.side,1);assert.equal(s.target,undefined);assert.equal(s.maxBars,24);
 assert.ok(Math.abs(s.stop-(98.9-0.1*A(candles,30)))<1e-9);
 const tiny=build(30,[[103,103.1,102.5,102.6]]);
 assert.deepEqual(at(displacementMomentum(tiny,{k:1.5})),[],'R pequeno demais ou corpo pequeno: sem sinal');
});

/** Série sintética com tendência, ciclos, ruído e saltos (mesma ideia do teste do V1), para as propriedades de causalidade. */
function synthetic(n:number,seed:number):Candle[]{
 const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-0.5;};
 const closes:number[]=[];let p=100;
 for(let i=0;i<n;i++){p*=1+0.0005*Math.sin(i/80)+0.006*Math.sin(i/21)+0.006*rnd()+(i%97===0?0.04*Math.sign(rnd()):0);closes.push(p);}
 return closes.map((c,i)=>{const o=i?closes[i-1]:c;return {timestamp:T0+i*H,open:o,high:Math.max(o,c)*(1+0.002+0.002*Math.abs(rnd())),low:Math.min(o,c)*(1-0.002-0.002*Math.abs(rnd())),close:c,volume:50};});
}
const DETECTORS:Record<string,(c:readonly Candle[])=>IctResult>={
 OB:c=>orderBlocks(c,{k:1.5,bos:0}),OB_BOS:c=>orderBlocks(c,{k:1.5,bos:1}),DISP:c=>displacementMomentum(c,{k:1.5}),
 FVG_CE:c=>fvgRetracement(c,{k:1.5,entry:'CE'}),FVG_EDGE:c=>fvgRetracement(c,{k:1.5,entry:'EDGE'}),IFVG:c=>invertedFvg(c,{g:0.25,disp:0}),
 SWEEP:c=>liquiditySweeps(c,{L:6,r:3}),IRL:c=>internalRangeLiquidity(c,{N:48,L:3})
};

test('os detectores só usam o passado: cortar a série na vela m não muda nenhum sinal até m',()=>{
 const candles=synthetic(1500,13);
 for(const [name,run] of Object.entries(DETECTORS)){
  const full=run(candles);
  for(const m of [400,777,1100,1499]){
   const cut=run(candles.slice(0,m+1));
   assert.deepEqual(cut.signals.slice(0,m+1),full.signals.slice(0,m+1),`${name} cortado em ${m}`);
  }
 }
 // As primitivas também.
 const range=atr(candles,24),prefix=candles.slice(0,900),prefixRange=atr(prefix,24);
 assert.deepEqual([...displacement(prefix,prefixRange,1.5)],[...displacement(candles,range,1.5).slice(0,900)]);
 assert.deepEqual([...breakOfStructure(prefix,6)],[...breakOfStructure(candles,6).slice(0,900)]);
 assert.deepEqual(fairValueGaps(prefix,prefixRange,1.5,0.25),fairValueGaps(candles,range,1.5,0.25).filter(f=>f.created<900));
});

test('os detectores estão vivos na série sintética (cada família gera sinais)',()=>{
 const candles=synthetic(4000,13);
 for(const [name,run] of Object.entries(DETECTORS)){
  const res=run(candles),n=res.signals.filter(Boolean).length;
  assert.ok(n>0,`${name} não gerou nenhum sinal`);
  for(const s of res.signals)if(s){assert.ok(s.stop>0&&Number.isFinite(s.stop));assert.ok(s.maxBars>0);}
 }
});
