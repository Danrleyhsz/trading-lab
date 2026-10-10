import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateFundingCarry,type CarryMarket} from '../src/domain/funding-carry.js';
import {simulateCarryV2,type CarryCoin,type CarryV2Config} from '../scripts/estudos/carry-v2-lib.js';
import {spotOf} from '../scripts/estudos/carry-estrutural.js';

const H=3600000,T0=Date.UTC(2024,0,1);
function prng(seed:number){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/** Mercado sintético: à vista e perpétuo com base pequena, tendência por hora e funding positivo com ruído. */
function market(bars:number,seed:number,driftPerHour:number,fundingRate=0.0003){
 const rnd=prng(seed),spot=[],perp=[];let p=100+seed;
 for(let i=0;i<bars;i++){
  const open=p,ret=driftPerHour+(rnd()-0.5)*0.004;p=open*(1+ret);const basis=1+(rnd()-0.5)*0.0006;
  const mk=(o:number,c:number,b:number)=>({timestamp:T0+i*H,open:o*b,high:Math.max(o,c)*b*1.001,low:Math.min(o,c)*b*0.999,close:c*b,volume:10});
  spot.push(mk(open,p,1));perp.push(mk(open,p,basis));
 }
 const funding=[];for(let i=0;i<bars;i+=8)funding.push({timestamp:T0+i*H+7,rate:fundingRate*(0.5+rnd()),markPrice:perp[i].close});
 return {spot,perp,funding} as CarryMarket;
}
const rule={rebalanceHours:168,signalHours:168,maxPositions:5,positionFraction:0.1,entryMinimumFunding:0.00105,exitFunding:0,minimumCashToShortNotional:0.5,spotFeeRate:0.001,perpFeeRate:0.00055,slippageBps:2,maintenanceRate:0.01,initialCapital:10000};
function toCoins(markets:Record<string,CarryMarket>):CarryCoin[]{
 return Object.keys(markets).sort().map(s=>{const m=markets[s];return {symbol:s,first:0,last:m.perp.length-1,spotO:Float64Array.from(m.spot,c=>c.open),spotC:Float64Array.from(m.spot,c=>c.close),perpO:Float64Array.from(m.perp,c=>c.open),perpH:Float64Array.from(m.perp,c=>c.high),perpC:Float64Array.from(m.perp,c=>c.close),funding:m.funding};});
}
const cfgOf=(coins:CarryCoin[],bars:number,over:Partial<CarryV2Config>={}):CarryV2Config=>({t0:T0,bars,startBar:0,...rule,resize:false,universe:()=>new Set(coins.map((_,k)=>k)),...over});

test('V2 sem reajuste, universo completo e séries completas dá o mesmo resultado de V1',()=>{
 const bars=2400,names=['AAAUSDT','BBBUSDT','CCCUSDT','DDDUSDT','EEEUSDT','FFFUSDT'],markets=Object.fromEntries(names.map((s,k)=>[s,market(bars,7+k*13,0.00002*(k-2))]));
 // V1 só pode entrar depois de ter 672 h de histórico; V2 exige o mesmo. Para a comparação, as duas partem de i=1000 sobre as mesmas velas.
 const startBar=1008,cut=Object.fromEntries(Object.entries(markets).map(([s,m])=>[s,{spot:m.spot.slice(startBar),perp:m.perp.slice(startBar),funding:m.funding}]));
 const a=simulateFundingCarry(cut,rule),coins=toCoins(markets),b=simulateCarryV2(coins,cfgOf(coins,bars,{startBar}));
 assert.equal(b.finalEquity,a.finalEquity);assert.equal(b.feesPaid,a.feesPaid);assert.equal(b.fundingReceived,a.fundingReceived);assert.equal(b.entries,a.entries);assert.equal(b.exits,a.exits);
 assert.deepEqual(b.equitySeries,a.equitySeries);assert.ok(a.entries>3&&a.fundingReceived>0);
});

test('com alta forte e contínua, V1 é liquidada e o reajuste semanal de V2 evita a liquidação',()=>{
 const bars=24*400,names=['AAAUSDT','BBBUSDT','CCCUSDT','DDDUSDT','EEEUSDT'],markets=Object.fromEntries(names.map((s,k)=>[s,market(bars,3+k*5,0.0005)]));
 const coins=toCoins(markets),startBar=1008,v1=simulateCarryV2(coins,cfgOf(coins,bars,{startBar,resize:false})),v2=simulateCarryV2(coins,cfgOf(coins,bars,{startBar,resize:true}));
 assert.notEqual(v1.liquidatedAt,null);assert.equal(v2.liquidatedAt,null);assert.ok(v2.resizes>10);assert.ok(v2.equitySeries.length>5000);
 // Delta-neutro: com preços 10 vezes maiores, o patrimônio fica na ordem do capital inicial, não explode com o preço.
 assert.ok(v2.finalEquity>5000&&v2.finalEquity<20000);
});

test('moeda cuja série acaba é fechada nos últimos preços; universo restringe só entradas; mapeamento de símbolo 1000X',()=>{
 const bars=2000,m=market(bars,5,0),coins=toCoins({AAAUSDT:m,BBBUSDT:market(bars,6,0)});
 coins[0].last=1500;coins[0].spotO=coins[0].spotO.slice(0,1501);coins[0].spotC=coins[0].spotC.slice(0,1501);coins[0].perpO=coins[0].perpO.slice(0,1501);coins[0].perpH=coins[0].perpH.slice(0,1501);coins[0].perpC=coins[0].perpC.slice(0,1501);
 const r=simulateCarryV2(coins,cfgOf(coins,bars,{startBar:1008}));assert.ok(r.forcedExits>=1||r.entries===0);assert.ok(r.equitySeries.every(p=>Number.isFinite(p.equity)));
 const only=simulateCarryV2(coins,cfgOf(coins,bars,{startBar:1008,universe:()=>new Set([1])}));assert.ok(Object.keys(only.heldBySymbol).every(s=>s==='BBBUSDT'));
 assert.deepEqual(spotOf('1000PEPEUSDT'),{spot:'PEPEUSDT',mult:1000});assert.deepEqual(spotOf('1000000MOGUSDT'),{spot:'MOGUSDT',mult:1000000});assert.deepEqual(spotOf('BTCUSDT'),{spot:'BTCUSDT',mult:1});
});
