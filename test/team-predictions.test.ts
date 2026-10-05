import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from '../src/domain/memory.js';
import {TeamPredictions,predictionsFrom,settle,scorecard,rankMemories,PREDICTION_POLICY} from '../src/application/team-predictions.js';

const H=3600000;
const candles=(closes:number[],start=0)=>closes.map((c,i)=>({timestamp:start+i*H,open:c,high:c,low:c,close:c,volume:1}));
const obs=(over:object={})=>({satoshi:{change24h:0.02},vega:{dailyVolatility7d:0.02,volatilityExpanding:false},flux:{fundingRate:0.0002},oracle:{regime:'TRENDING_UP'},...over});

test('regras pré-declaradas: cada observação vira uma previsão verificável (ou nenhuma)',()=>{
 const p=predictionsFrom(obs(),candles([100,101]),'d1');
 assert.deepEqual(p.map(x=>x.agentId+':'+x.expectation),['satoshi:UP','oracle:UP','vega:VOL_NORMAL','flux:DOWN']);
 assert.equal(p[0].horizonEnd,H+24*H);
 const neutral=predictionsFrom(obs({satoshi:{change24h:0},flux:{fundingRate:0.00005},oracle:{regime:'UNKNOWN'}}),candles([100]),'d2');
 assert.deepEqual(neutral.map(x=>x.agentId),['vega'],'sem sinal claro, não há previsão');
});

test('conferência usa só candles fechados até o fim do prazo',()=>{
 const p={...predictionsFrom(obs(),candles([100]),'d')[0]};
 assert.equal(settle(p,candles(Array(10).fill(101),H)),null,'antes de 24 h não confere');
 const up=settle(p,candles(Array.from({length:24},(_,i)=>100+i*0.1),H))!;assert.equal(up.hit,true);
 const down=settle({...p,expectation:'DOWN'},candles(Array.from({length:24},(_,i)=>100+i*0.1),H))!;assert.equal(down.hit,false);
 const range=settle({...p,expectation:'RANGE'},candles(Array(24).fill(100.5),H))!;assert.equal(range.hit,true);
});

test('memória grava previsões, confere quando vencem e faz uma reflexão a cada 10 avaliações',()=>{
 const memories=new MemoryStore(),team=new TeamPredictions(memories);
 // 10 horas de previsões do Satoshi (alta), depois 34 horas de preço subindo: todas devem ser acertos.
 const series=Array.from({length:60},(_,i)=>100+i*0.2);
 for(let h=0;h<10;h++)team.record({...obs(),oracle:{regime:'UNKNOWN'},vega:{dailyVolatility7d:null,volatilityExpanding:null},flux:{fundingRate:null}} as never,candles(series.slice(0,h+1)),'d'+h);
 assert.equal(team.pending().length,10);
 team.settleDue(candles(series));
 const ev=memories.query({kind:'EVALUATION'});assert.equal(ev.length,10);assert.ok(ev.every(e=>e.metadata?.hit===true));
 const lesson=memories.query({kind:'LESSON'});assert.equal(lesson.length,1);assert.match(lesson[0].summary,/acertei 10 de 10/);
 team.settleDue(candles(series));assert.equal(memories.query({kind:'EVALUATION'}).length,10,'nunca avalia duas vezes');
 const card=scorecard(memories.query()).find(s=>s.agentId==='satoshi')!;assert.equal(card.hitRate,1);assert.equal(card.settled,10);assert.equal(card.pending,0);
 assert.equal(PREDICTION_POLICY.version,'TEAM_PREDICTIONS_V1');
});

test('destaques ordenam por recência, importância e relevância sem alterar nada',()=>{
 const now=Date.UTC(2026,9,5,12);
 const m=(id:string,kind:string,hoursAgo:number,tags:string[]=[])=>({id,agentId:'vega',kind,summary:id,createdAt:new Date(now-hoursAgo*H).toISOString(),tags}) as never;
 const ranked=rankMemories([m('velha-licao','LESSON',500),m('obs-agora','OBSERVATION',0),m('licao-recente','LESSON',2),m('pred','PREDICTION',1,['funding'])],now,'funding',3).map(r=>r.memory.id);
 assert.equal(ranked[0],'licao-recente');assert.ok(ranked.includes('pred'),'etiqueta pedida sobe');assert.ok(!ranked.includes('velha-licao'));
});
