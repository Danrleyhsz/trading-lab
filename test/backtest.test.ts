import test from "node:test";import assert from "node:assert/strict";import{HistoricalBacktester,type Candle}from "../src/domain/backtest.js";
const prices=[10,10,10,9,8,9,11,13,14,13,11,9,8,9,11,13];const candles:Candle[]=prices.map((p,i)=>({timestamp:i,open:p,high:p,low:p,close:p,volume:1}));
test("backtester is deterministic and reports risk/performance metrics",()=>{const b=new HistoricalBacktester(),cfg={initialCapital:10000,feeRate:.0005,slippageBps:1,fastPeriod:2,slowPeriod:3};const a=b.run(candles,cfg),c=b.run(candles,cfg);assert.deepEqual(a,c);assert.ok(a.trades>=1);assert.ok(Number.isFinite(a.maxDrawdown));assert.ok(Number.isFinite(a.netPnl));assert.ok(a.winRate>=0&&a.winRate<=1)});
test("backtester rejects insufficient history",()=>assert.throws(()=>new HistoricalBacktester().run(candles.slice(0,3),{initialCapital:10000,feeRate:0,slippageBps:0,fastPeriod:2,slowPeriod:3})));

// TEST_ONLY price fixtures: these are never written as market/work/account records.
const settings={initialCapital:1000,feeRate:0,slippageBps:0,fastPeriod:2,slowPeriod:3};
const series=(values:number[])=>values.map((p,i)=>({timestamp:i,open:p,high:p,low:p,close:p,volume:1}));
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} differs from ${expected}`);

test('completed signals execute at the next open including gaps, without rewriting caller evidence',()=>{
 const data=series([10,10,9,8,9,11,12,12]);data[6]!.open=25;data[6]!.high=25;
 const before=structuredClone(data),cfg={...settings};const result=new HistoricalBacktester().run(data,cfg);
 assert.equal(result.trades,1);near(result.finalEquity,1000*12/25);assert.equal(result.wins,0);
 assert.deepEqual(data,before);assert.deepEqual(cfg,settings);assert.equal(result.model,'SPOT_SMA_NEXT_OPEN_V2');assert.deepEqual(result.configuration,cfg);
});

test('a last-candle crossover with no next observation cannot create a historical entry',()=>{
 const result=new HistoricalBacktester().run(series([10,10,9,8,9,11]),settings);
 assert.equal(result.trades,0);assert.equal(result.finalEquity,1000);assert.equal(result.feesPaid,0);assert.equal(result.maxDrawdown,0);
});

test('entry and exit fees classify a small gross winner as an actual net loss',()=>{
 const data=series([10,10,9,8,9,11,11.165]);data[6]!.open=11;data[6]!.low=11;
 const result=new HistoricalBacktester().run(data,{...settings,feeRate:.01});
 const quantity=1000/(11*1.01),expected=quantity*11.165*.99;
 assert.equal(result.wins,0);assert.equal(result.losses,1);assert.equal(result.winRate,0);
 near(result.finalEquity,expected);near(result.netPnl,expected-1000);near(result.grossLoss,1000-expected);
 near(result.feesPaid!,quantity*(11+11.165)*.01);assert.equal(result.profitFactor,0);
});

test('forced final closing includes its fee and adverse slippage in the observed drawdown',()=>{
 const result=new HistoricalBacktester().run(series([10,10,9,8,9,11,11,11]),{...settings,feeRate:.01,slippageBps:10});
 const expected=1000/(1.001*1.01)*.999*.99;
 near(result.finalEquity,expected);near(result.maxDrawdown,(1000-expected)/1000);
 near(result.grossProfit-result.grossLoss,result.netPnl);assert.equal(result.trades,result.wins+result.losses);
});

test('multiple closed outcomes reconcile fully costed account equity and profit factor',()=>{
 const result=new HistoricalBacktester().run(candles,{...settings,feeRate:.001,slippageBps:3});
 assert.ok(result.trades>=2);near(result.grossProfit-result.grossLoss,result.netPnl);
 near(result.finalEquity,1000+result.netPnl);assert.equal(result.trades,result.wins+result.losses);
 if(result.grossLoss)near(result.profitFactor!,result.grossProfit/result.grossLoss);
 assert.ok(result.feesPaid!>0);
});

test('invalid costs, cash, periods, prices, chronology and arithmetic fail rather than produce performance',()=>{
 const engine=new HistoricalBacktester();
 for(const patch of [{initialCapital:0},{initialCapital:Infinity},{feeRate:-1},{feeRate:1},{slippageBps:10000},{slippageBps:NaN},{fastPeriod:0},{fastPeriod:2.5},{slowPeriod:2}])assert.throws(()=>engine.run(candles,{...settings,...patch}),/configuration/);
 for(const patch of [{open:NaN},{volume:-1},{timestamp:0},{high:1},{close:Infinity}]){const data=structuredClone(candles);Object.assign(data[4]!,patch);assert.throws(()=>engine.run(data,settings),/candle/);}
 assert.throws(()=>engine.run(series([10,10,9,8,9,11,11,11]),{...settings,initialCapital:Number.MIN_VALUE}),/position size/);
});
