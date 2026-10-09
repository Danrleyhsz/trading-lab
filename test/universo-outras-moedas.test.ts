import test from 'node:test';
import assert from 'node:assert/strict';
import {select,RULE} from '../scripts/estudos/universo-outras-moedas.js';

const mk=(base:string,over:Partial<Record<string,unknown>>={})=>({symbol:base+'USDT',baseAsset:base,quoteAsset:'USDT',contractType:'PERPETUAL',status:'TRADING',underlyingType:'COIN',onboardDate:Date.UTC(2021,0,1),...over}) as any;

test('universo de outras moedas: regra mecânica, sem preço, com grupos por rodízio de volume',()=>{
 const info=[mk('AAA'),mk('BBB'),mk('CCC'),mk('DDD'),mk('EEE'),mk('NEW',{onboardDate:Date.UTC(2022,0,1)}),mk('STOCK',{underlyingType:'EQUITY'}),mk('USDC'),mk('USED'),mk('OFF',{status:'BREAK'}),mk('FUT',{contractType:'CURRENT_QUARTER'}),mk('NOVOL')];
 const volume=new Map<string,number>([['AAAUSDT',500],['BBBUSDT',400],['CCCUSDT',300],['DDDUSDT',200],['EEEUSDT',100],['NEWUSDT',900],['STOCKUSDT',900],['USDCUSDT',900],['USEDUSDT',900],['OFFUSDT',900],['FUTUSDT',900]]);
 const {eligibleCount,chosen}=select(info,volume,['USEDUSDT']);
 // Fora: listada depois de 30/11/2021, não é moeda, é moeda-dólar, já usada, fora de operação, não perpétuo, sem volume.
 assert.equal(eligibleCount,5);assert.deepEqual(chosen.map(c=>c.baseAsset),['AAA','BBB','CCC','DDD','EEE']);
 // Rodízio de volume em 3 grupos: 1º→1, 2º→2, 3º→3, 4º→1, 5º→2.
 assert.deepEqual(chosen.map(c=>c.group),[1,2,3,1,2]);assert.equal(RULE.groups,3);assert.equal(RULE.count,45);
});
