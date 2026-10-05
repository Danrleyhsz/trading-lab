import test from 'node:test';
import assert from 'node:assert/strict';
import {backtestPerpetual,type PerpetualDataset} from '../src/domain/perpetual-backtest.js';
import {STUDY_CANDIDATE_SETS} from '../src/application/perpetual-studies.js';

// Ideia do lookahead-analysis do Freqtrade (só a ideia): se trocarmos o futuro, nenhuma decisão do passado pode mudar.
const H=3600000;
function rng(seed:number){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/2**32;};}
function walk(length:number,seed:number,start=100){const r=rng(seed);let p=start;return Array.from({length},()=>{p*=1+(r()-0.5)*0.03;return p;});}
function dataset(closes:number[]):PerpetualDataset{
 const candles=closes.map((c,i)=>({timestamp:i*H,open:i?closes[i-1]:c,high:Math.max(c,i?closes[i-1]:c)*1.002,low:Math.min(c,i?closes[i-1]:c)*0.998,close:c,volume:1}));
 return {instrument:'BINANCE_USDM:BTCUSDT',trade:candles,mark:structuredClone(candles),funding:closes.map((_,i)=>i).filter(i=>i%8===0&&i>0).map(i=>({timestamp:i*H,rate:0.0001,markPrice:closes[i]}))};
}

test('nenhuma estratégia declarada olha o futuro: trocar os candles depois do corte não muda nada antes dele',()=>{
 const total=1700,cut=1300,base=walk(total,42);
 const changed=[...base.slice(0,cut),...walk(total-cut,777,base[cut-1])];
 const before=(rows:{timestamp:number}[])=>JSON.stringify(rows.filter(r=>r.timestamp<cut*H));
 let checked=0,futureDiffers=0;
 for(const [name,set] of Object.entries(STUDY_CANDIDATE_SETS))for(const config of set){
  const a=backtestPerpetual(dataset(base),config),b=backtestPerpetual(dataset(changed),config);
  assert.equal(before(a.audit),before(b.audit),name+' '+(config.strategy??'SMA')+' '+config.slowPeriod+': decisões antes do corte mudaram');
  assert.equal(before(a.equitySeries),before(b.equitySeries),name+': equity antes do corte mudou');
  if(JSON.stringify(a.equitySeries)!==JSON.stringify(b.equitySeries))futureDiffers++;
  checked++;
 }
 // Controle do próprio teste: a troca do futuro tem que mudar algo depois do corte, senão o teste não provaria nada.
 assert.ok(futureDiffers>=checked*0.8,'a perturbação mudou o futuro em '+futureDiffers+' de '+checked);
 assert.ok(checked>=14,'todas as configurações declaradas foram verificadas: '+checked);
});
