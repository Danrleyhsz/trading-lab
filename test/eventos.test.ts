import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateEvents,clusteredT,listingEvents,fundingEvents,type Ev} from '../scripts/estudos/eventos.js';

const H=3600000,FIRST=Date.UTC(2021,11,4,0);
/** Duas moedas sintéticas: A começa na vela 0 (não é listagem nova) e cai 10% ao longo de 100 horas; B começa na vela 50 e dispara. */
function world(){
 const bars=400,ts=Float64Array.from({length:bars},(_,i)=>FIRST+i*H);
 const a=new Float64Array(bars).map((_,i)=>100*(1-0.001*Math.min(i,100))),aClose=a;
 const bFirst=50,b=new Float64Array(bars-bFirst).map((_,i)=>10*(1+0.02*i));
 return {lean:{symbols:['AAAUSDT','BBBUSDT'],timestamps:ts,first:Int32Array.from([0,bFirst]),open:[a,b],close:[aClose,b],volume:[new Float64Array(0),new Float64Array(0)],
  funding:[[{timestamp:FIRST+8*H+5,rate:0.001,markPrice:100},{timestamp:FIRST+16*H+5,rate:0.0001,markPrice:100}] as any,[]]},last:Int32Array.from([bars-1,bars-1]),bars};
}
const base={fee:0.00055,slippageBps:10,initial:10000,startBar:0,endBar:399,grossCap:0.5};

test('venda: ganha quando o preço cai, recebe funding positivo e paga custos',()=>{
 const w=world(),ev:Ev[]=[{k:0,entryBar:4,exitBar:100,side:-1,fraction:0.01,stop:0.5}],r=simulateEvents(w as any,ev,base);
 assert.equal(r.results.length,1);const x=r.results[0];
 // Preço de 99,6 a 90: queda de cerca de 9,6%; custos: 2 taxas de 0,055% e 2 slippages de 10 bps.
 assert.ok(x.ret>0.07&&x.ret<0.1,'retorno '+x.ret);assert.equal(x.reason,'time');assert.ok(x.funding>0);
 assert.ok(r.finalEquity>10000);assert.equal(r.skipped,0);
 // Custos x3 reduzem o resultado.
 const r3=simulateEvents(w as any,ev,{...base,fee:base.fee*3,slippageBps:30});assert.ok(r3.results[0].ret<x.ret);
});

test('stop por fechamento: venda de moeda que dobra é fechada quando o fechamento passa de 150% da entrada',()=>{
 const w=world(),r=simulateEvents(w as any,[{k:1,entryBar:60,exitBar:300,side:-1,fraction:0.01,stop:0.5}],base),x=r.results[0];
 assert.equal(x.reason,'stop');assert.ok(x.exitBar>60&&x.exitBar<110);assert.ok(x.ret<-0.4&&x.ret>-0.7,'retorno '+x.ret);
 assert.ok(r.maxDrawdown>0&&r.maxDrawdown<0.01);
});

test('limite de exposição bruta pula eventos e série que acaba fecha a posição',()=>{
 const w=world(),evs:Ev[]=Array.from({length:5},()=>({k:0,entryBar:10,exitBar:200,side:-1 as const,fraction:0.2,stop:0.9})),r=simulateEvents(w as any,evs,base);
 assert.equal(r.results.length,2);assert.equal(r.skipped,3);
 const w2=world();w2.last[0]=120;const r2=simulateEvents(w2 as any,[{k:0,entryBar:10,exitBar:300,side:-1,fraction:0.01,stop:0.9}],base);
 assert.equal(r2.results[0].reason,'end');assert.equal(r2.results[0].exitBar,120);
});

test('eventos de listagem e de funding: só moedas novas, sem sobreposição por moeda, lado pelo sinal do funding',()=>{
 const w=world();
 const l=listingEvents(w as any,168,100,399);assert.equal(l.length,1);assert.equal(l[0].entryBar,218); // B nasce na vela 50 e entra 168 h depois; A existia antes do início e não é listagem nova
 const none=listingEvents(w as any,168,100,200);assert.equal(none.length,0); // entrada depois do último dia permitido
 const l2=listingEvents(w as any,100,100,399);assert.equal(l2.length,1);assert.equal(l2[0].k,1);assert.equal(l2[0].entryBar,150);assert.equal(l2[0].side,-1);
 const f=fundingEvents(w as any,0.0005,24,0,'both');assert.equal(f.length,1);assert.equal(f[0].side,-1);assert.equal(f[0].entryBar,9);assert.equal(f[0].exitBar,33);
});

test('estatística t agrupada por mês',()=>{
 const same=clusteredT([0.1,0.1,0.1,0.1],['a','a','b','b']);assert.equal(same.t,0);assert.equal(same.clusters,2);
 const r=clusteredT([0.1,0.12,0.08,0.11,0.09,0.1],['a','a','b','b','c','c']);assert.ok(r.t>5&&Math.abs(r.mean-0.1)<1e-9);
});
