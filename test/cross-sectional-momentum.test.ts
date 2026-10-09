import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateCrossSectional,type CrossSectionalConfig} from '../src/domain/cross-sectional-momentum.js';
import type {PerpetualDataset} from '../src/domain/perpetual-backtest.js';

const H=3600000;
const series=(closes:number[],funding:PerpetualDataset['funding']=[]):PerpetualDataset=>{
 const trade=closes.map((c,i)=>({timestamp:i*H,open:i?closes[i-1]:c,high:Math.max(c,i?closes[i-1]:c),low:Math.min(c,i?closes[i-1]:c),close:c,volume:1}));
 return {instrument:'BINANCE_USDM:AAAUSDT',trade,mark:structuredClone(trade),funding};
};
const cfg:CrossSectionalConfig={lookbackHours:4,rebalanceHours:4,startBar:4,longCount:1,shortCount:1,legFraction:0.5,feeRate:0,slippageBps:0,initialCapital:1000};
const trend=(start:number,step:number,n=24)=>Array.from({length:n},(_,i)=>start*(1+step)**i);

test('momentum entre moedas: compra a que mais subiu, vende a que mais caiu, e lucra quando a diferença continua',()=>{
 const up={...series(trend(100,0.01)),instrument:'BINANCE_USDM:UPUSDT' as const},down={...series(trend(100,-0.01)),instrument:'BINANCE_USDM:DOWNUSDT' as const},flat={...series(trend(100,0)),instrument:'BINANCE_USDM:FLATUSDT' as const};
 const r=simulateCrossSectional({UP:up,DOWN:down,FLAT:flat},cfg);
 assert.deepEqual(r.rebalances[0],{timestamp:4*H,long:['UP'],short:['DOWN']});
 assert.ok(r.netPnl>0,'as duas pontas ganham');assert.equal(r.closedLegs,0,'mantém as mesmas posições: nada é encerrado');
 assert.equal(r.equitySeries[0].timestamp,4*H,'a série começa na primeira decisão');
});

test('mercado inteiro andando junto: as pontas se compensam e só sobram os custos',()=>{
 const make=(name:string)=>({...series(trend(100,0.02)),instrument:`BINANCE_USDM:${name}USDT` as const});
 const free=simulateCrossSectional({AA:make('AA'),BB:make('BB'),CC:make('CC')},cfg);
 assert.ok(Math.abs(free.netPnl)<1e-6,'sem custos e com retornos iguais, o resultado é zero: a carteira é neutra');
 const paid=simulateCrossSectional({AA:make('AA'),BB:make('BB'),CC:make('CC')},{...cfg,feeRate:0.001,slippageBps:5});
 assert.ok(paid.netPnl<0&&paid.feesPaid>0,'com custos, perde exatamente o que pagou');
 assert.ok(-paid.netPnl>=paid.feesPaid-1e-9,'a perda inclui a taxa e o slippage');
});

test('não olha o futuro: mudar velas depois de uma decisão não muda o que foi decidido nem a equity até ali',()=>{
 const a=trend(100,0.01),b=trend(100,-0.01),c=trend(100,0.003);
 const base=simulateCrossSectional({A:series(a),B:series(b),C:series(c)},cfg);
 const b2=[...b];for(let i=13;i<b2.length;i++)b2[i]=b[i]*3;// o futuro de B muda a partir da vela 13
 const changed=simulateCrossSectional({A:series(a),B:series(b2),C:series(c)},cfg);
 assert.deepEqual(changed.rebalances.slice(0,3),base.rebalances.slice(0,3),'decisões das velas 4, 8 e 12 iguais');
 assert.deepEqual(changed.equitySeries.filter(p=>p.timestamp<13*H),base.equitySeries.filter(p=>p.timestamp<13*H));
});

test('funding: posição comprada paga taxa positiva, vendida recebe; registro fora da hora não conta duas vezes',()=>{
 const n=12,fundingAt=(t:number)=>[{timestamp:t,rate:0.001,markPrice:100}];
 const a={...series(trend(100,0.01,n),fundingAt(6*H+5)),instrument:'BINANCE_USDM:AAUSDT' as const},b={...series(trend(100,-0.01,n),fundingAt(6*H+5)),instrument:'BINANCE_USDM:BBUSDT' as const};
 const r=simulateCrossSectional({A:a,B:b},{...cfg,startBar:4,rebalanceHours:100});
 // Comprado em A (paga 0,1% de ~500) e vendido em B (recebe 0,1% de ~500): saldo perto de zero, uma liquidação cada.
 assert.ok(Math.abs(r.fundingCashDelta)<0.2,'as duas pontas se compensam: '+r.fundingCashDelta);
 const longOnly=simulateCrossSectional({A:a,B:{...b,funding:[]}},{...cfg,startBar:4,rebalanceHours:100});
 assert.ok(longOnly.fundingCashDelta<0,'só a ponta comprada com funding positivo: paga');
});

test('recusa universo desalinhado, exposição acima de 1x e agenda sem histórico suficiente',()=>{
 const a=series(trend(100,0.01)),b=series(trend(100,-0.01)).trade.slice(1);
 assert.throws(()=>simulateCrossSectional({A:a,B:{...a,trade:b,mark:b}},cfg),/unaligned|invalid/);
 assert.throws(()=>simulateCrossSectional({A:a,B:series(trend(100,-0.01))},{...cfg,legFraction:0.6}),/1x/);
 assert.throws(()=>simulateCrossSectional({A:a,B:series(trend(100,-0.01))},{...cfg,startBar:2}),/schedule/);
});
