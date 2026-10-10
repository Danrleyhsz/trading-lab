import test from 'node:test';
import assert from 'node:assert/strict';
import {DAY,buildGrid,eligibility,type SpotSeriesLike} from '../scripts/estudos/busca-diaria-lib.js';
import {membership,scaledPortfolio} from '../scripts/estudos/busca-maiores-lib.js';

const T0=Date.UTC(2020,0,1);
function coin(symbol:string,closes:number[],qv:number,status='TRADING'):SpotSeriesLike{
 return {symbol,baseAsset:symbol.replace('USDT',''),status,t:closes.map((_,i)=>T0+i*DAY),c:closes,h:closes.map(x=>x*1.01),l:closes.map(x=>x*0.99),qv:closes.map(()=>qv)};
}
const flat=(n:number,v=100)=>Array.from({length:n},()=>v);
const noisy=(n:number,amp:number,start=100)=>{let p=start;return Array.from({length:n},(_,i)=>(p*=1+amp*(i%2?1:-1)*(1+(i%7)/10)));};

test('membros: as N de maior volume somado, ranking só a cada 30 dias, retirada tira a moeda sem repor até o próximo ranking',()=>{
 const days=220,g=buildGrid([coin('AAAUSDT',flat(220),9e6),coin('BBBUSDT',flat(220),7e6),coin('CCCUSDT',flat(220),5e6),coin('DDDUSDT',flat(220),3e6),coin('EEEUSDT',flat(150),8e6,'BREAK')],T0,days);
 const e=g.coins.map(c=>eligibility(c,days)),m=membership(g,e,3,30,90);
 const names=(t:number)=>g.coins.filter((_,k)=>m[k][t]).map(c=>c.symbol.replace('USDT','')).sort();
 assert.deepEqual(names(120),['AAA','BBB','EEE'],'EEE (8 mi) entra entre as 3 maiores');
 // Dia 150 é múltiplo de 30 e é o último dia de EEE: elegibilidade exige vela no dia seguinte, então ela não entra no ranking nem fica.
 assert.ok(!names(150).includes('EEE'));assert.deepEqual(names(180),['AAA','BBB','CCC']);
 // Entre rankings a composição não muda mesmo que os volumes mudem.
 assert.deepEqual(names(121),names(120));assert.deepEqual(names(148),names(120));assert.ok(!names(149).includes('EEE'),'no último dia da série a moeda deixa de ser elegível');
});

test('escala de risco: reduz a exposição quando a volatilidade bruta passa do alvo, não olha o futuro e Infinity desliga',()=>{
 const days=300,calm=flat(300,100).map((v,i)=>v*(1+0.0005*i)),wild=noisy(300,0.05);
 const g=buildGrid([coin('AAAUSDT',calm,9e6),coin('BBBUSDT',wild,9e6)],T0,days),e=g.coins.map(c=>eligibility(c,days)),m=membership(g,e,2,30,90),ones=g.coins.map(()=>new Uint8Array(days).fill(1));
 const scaled=scaledPortfolio(g,ones,m,2,0,100,280,0.2),raw=scaledPortfolio(g,ones,m,2,0,100,280,Infinity);
 assert.ok(raw.scale.slice(1).every(s=>s===1));assert.ok(scaled.scale.slice(40).some(s=>s<0.5),'volatilidade alta reduz a escala');assert.ok(scaled.scale.slice(1).every(s=>s<=1));
 // Sem olhar o futuro: mudar preços depois do dia 200 não muda a escala até o dia 200.
 const wild2=wild.map((v,i)=>i>200?v*3:v),g2=buildGrid([coin('AAAUSDT',calm,9e6),coin('BBBUSDT',wild2,9e6)],T0,days),e2=g2.coins.map(c=>eligibility(c,days)),m2=membership(g2,e2,2,30,90);
 const scaled2=scaledPortfolio(g2,ones,m2,2,0,100,280,0.2);
 for(let i=0;i<100;i++)assert.ok(Math.abs(scaled.scale[i]-scaled2.scale[i])<1e-12,'escala mudou no passado no índice '+i);
 // Custo é cobrado sobre a variação de peso, inclusive a causada pela escala.
 const withCost=scaledPortfolio(g,ones,m,2,0.0015,100,280,0.2);assert.ok(withCost.returns.reduce((a,b)=>a+b,0)<scaled.returns.reduce((a,b)=>a+b,0));
 // Antes de 30 dias de histórico da carteira, a escala é 0,5 (o índice 0 é o dia da decisão inicial e não tem retorno).
 assert.equal(scaled.scale[1],0.5);
});
