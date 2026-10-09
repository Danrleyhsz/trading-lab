import test from 'node:test';
import assert from 'node:assert/strict';
import {walk,analyze,summarize} from '../scripts/estudos/custo-execucao.js';

test('custo a mercado caminha pelo livro e inclui metade do spread',()=>{
 const asks:[string,string][]=[['100.10','2'],['100.20','10']],bids:[string,string][]=[['99.90','2'],['99.80','10']],mid=100;
 // 100 USDT cabem no primeiro nível: custo = 10 bps (metade do spread de 20 bps).
 assert.ok(Math.abs(walk(asks,mid,100,'buy')!-10)<1e-9);assert.ok(Math.abs(walk(bids,mid,100,'sell')!-10)<1e-9);
 // 400 USDT passam do primeiro nível (200,2 USDT) e entram no segundo: preço médio entre 100,10 e 100,20.
 const c=walk(asks,mid,400,'buy')!;assert.ok(c>10&&c<20);
 // Livro curto demais: não cobre e não inventa custo.
 assert.equal(walk(asks,mid,100000,'buy'),null);
});

test('amostra e resumo por moeda e no geral',()=>{
 const bids:[string,string][]=[['99.90','1000']],asks:[string,string][]=[['100.10','1000']],s=analyze('XUSDT',1,bids,asks);
 assert.equal(s.mid,100);assert.ok(Math.abs(s.spreadBps-20)<1e-9);assert.deepEqual(s.buyBps.map(v=>v&&Math.round(v)),[10,10,10]);
 const sum=summarize([s,{...s,symbol:'YUSDT'}]);assert.equal(Object.keys(sum.bySymbol).length,2);assert.equal(Math.round(sum.overall.n500.median),10);
});
