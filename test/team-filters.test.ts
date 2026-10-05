import test from 'node:test';
import assert from 'node:assert/strict';
import {perpetualDirection,teamFiltersAllow,validTeamFilters} from '../src/domain/perpetual-signals.js';
import {backtestPerpetual} from '../src/domain/perpetual-backtest.js';
import {STUDY_CANDIDATE_SETS} from '../src/application/perpetual-studies.js';

const hour=3600000;
const candles=(closes:number[])=>closes.map((c,i)=>({timestamp:i*hour,open:c,high:c,low:c,close:c,volume:1}));
const base={initialCapital:10000,feeRate:0.00055,slippageBps:1,maintenanceRate:0.01,liquidationFeeRate:0.005,positionFraction:0.1,fastPeriod:10,slowPeriod:480,strategy:'BREAKOUT' as const};

test('team filters only veto opening or reversing, never force a position',()=>{
 // 30 days ago price was far higher; the last 480 hours drift, then break out: above the 480h range, below the 720h average.
 const closes=[...Array.from({length:300},()=>300),...Array.from({length:470},(_,i)=>120-i*0.02),...Array.from({length:30},(_,i)=>111+i*0.05),130];
 const data=candles(closes);
 assert.equal(perpetualDirection(data,base,0),1,'unfiltered breakout opens long');
 assert.equal(perpetualDirection(data,{...base,filters:{regime:true}},0),0,'Oracle vetoes a long below the regime average');
 assert.equal(perpetualDirection(data,{...base,filters:{momentum:true}},0),1,'Satoshi agrees: 24h momentum is up');
 assert.equal(perpetualDirection(data,{...base,filters:{regime:true}},2),1,'an existing long is kept, not forced out');
 assert.equal(perpetualDirection(data,{...base,filters:{regime:true}},-2),0,'a vetoed reversal closes the short without opening a long');
 assert.equal(teamFiltersAllow(data,{momentum:true},-1),false);
});

test('Vega vetoes entries while daily volatility expands beyond 1.5x the weekly level',()=>{
 const calm=Array.from({length:480},(_,i)=>100+Math.sin(i)*0.05),wild=Array.from({length:24},(_,i)=>100+(i%2?3:-3));
 const data=candles([...calm,...wild]);
 assert.equal(teamFiltersAllow(data,{volatility:true},1),false);
 assert.equal(teamFiltersAllow(candles([...calm,...calm.slice(0,24)]),{volatility:true},1),true);
});

test('only declared filter keys are accepted, and every team set is a single breakout candidate',()=>{
 assert.equal(validTeamFilters({regime:true}),true);assert.equal(validTeamFilters({}),false);assert.equal(validTeamFilters({regime:false}),false);assert.equal(validTeamFilters({leverage:true}),false);
 for(const [name,set] of Object.entries(STUDY_CANDIDATE_SETS).filter(([n])=>n.startsWith('TEAM_')||n.startsWith('BREAKOUT_480'))){assert.equal(set.length,1,name);assert.equal(set[0].strategy,'BREAKOUT');assert.equal(set[0].slowPeriod,480);}
 const closes=Array.from({length:900},(_,i)=>100+i*0.05);const data={instrument:'BINANCE_USDM:BTCUSDT' as const,trade:candles(closes),mark:candles(closes),funding:[]};
 assert.throws(()=>backtestPerpetual(data,{...base,filters:{leverage:true} as never}),/team filters/);
 assert.ok(Number.isFinite(backtestPerpetual(data,{...base,filters:{regime:true,volatility:true,momentum:true}}).netPnl));
});

test('proteções: pausa após encerrar e após perdas seguidas; só bloqueiam abrir, nunca fechar', async()=>{
 const {protectionsAllowEntry,validProtections}=await import('../src/domain/perpetual-signals.js');
 const H=3600000,p={cooldownHours:24,maxConsecutiveLosses:2,lossPauseHours:72};
 assert.deepEqual(protectionsAllowEntry(p,[],0),{allowed:true,reason:null});
 assert.equal(protectionsAllowEntry(p,[{closedAt:0,netPnl:5}],10*H).reason,'COOLDOWN');
 assert.equal(protectionsAllowEntry(p,[{closedAt:0,netPnl:5}],25*H).allowed,true);
 assert.equal(protectionsAllowEntry(p,[{closedAt:0,netPnl:-1},{closedAt:H,netPnl:-2}],40*H).reason,'LOSS_STREAK_PAUSE');
 assert.equal(protectionsAllowEntry(p,[{closedAt:0,netPnl:-1},{closedAt:H,netPnl:-2}],80*H).allowed,true);
 assert.equal(validProtections({cooldownHours:0}),false);assert.equal(validProtections({maxConsecutiveLosses:2}),false,'pausa por perdas exige as duas chaves');assert.equal(validProtections({leverage:3}),false);
 // No backtest, a configuração protegida nunca opera mais vezes que a mesma sem proteção.
 const closes=Array.from({length:1500},(_,i)=>100+Math.sin(i/9)*6+(i%37===0?8:0));
 const data={instrument:'BINANCE_USDM:BTCUSDT' as const,trade:candles(closes),mark:candles(closes),funding:[]};
 const plain=backtestPerpetual(data,{...base,slowPeriod:30}),guarded=backtestPerpetual(data,{...base,slowPeriod:30,protections:p});
 assert.ok(guarded.trades<plain.trades,'proteção reduz entradas: '+guarded.trades+' vs '+plain.trades);
});
