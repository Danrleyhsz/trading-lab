import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Element {
  hidden=false; textContent=''; children:Element[]=[]; dataset:Record<string,string>={}; onclick?:()=>void;
  append(...items:Element[]){this.children.push(...items)}
  replaceChildren(...items:Element[]){this.children=items}
  setAttribute(){} addEventListener(){} showModal(){} close(){}
  querySelector(){return this.children[0]}
}
function harness(overrides:Record<string,unknown>={}){
  const ids=new Map<string,Element>();
  const rooms=['Research Lab','Quant Lab','Trading Floor','Risk Desk','Meeting Room','Lounge'].map(room=>{const n=new Element();n.dataset.room=room;n.append(new Element());return n});
  let socket:any;
  const document={createElement:()=>new Element(),querySelector:(s:string)=>{if(!ids.has(s))ids.set(s,new Element());return ids.get(s)},querySelectorAll:(s:string)=>s==='.occupants'?rooms.map(n=>n.children[0]):rooms};
  const requests:string[]=[];
  const context=vm.createContext({document,location:{protocol:'https:',host:'example.test'},WebSocket:class{constructor(){socket=this}},fetch:async(url:string)=>{requests.push(url);return {ok:true,json:async()=>Object.hasOwn(overrides,url)? await overrides[url] :url==='/finance'?{legacyAccounts:[{id:'fund',kind:'FUND',instrument:'LEGACY_PAPER_V1',initialCash:10000,portfolio:{equity:10000},feesPaid:0}],perpetualAccounts:[{id:'evaluation:nova:usdm',kind:'EVALUATION',instrument:'BINANCE_USDM:BTCUSDT',ownerAgentId:'nova',initialCash:5000,portfolio:{equity:4900},feesPaid:10,fundingCashDelta:-20,maxDrawdown:0.03,initialMargin:500,valuationFresh:false}]}:url==='/market/v3'?{status:'UNAVAILABLE',quote:null}:url==='/paper/perpetual/status'?{halted:false,executionEnabled:false,autonomous:{enabled:false,reason:'completed V2 study required'}}:url==='/backtests/v2/studies'?[]:url==='/agents'?[{id:'atlas',name:'Atlas',role:'Research',room:'Research Lab',status:'IDLE',experience:0,updatedAt:'2026-01-01'}]:url==='/research/runs'?[]:url==='/paper/accounts'?[{kind:'FUND',ownerAgentId:null,initialCash:10000,portfolio:{equity:10000},fills:0}]:url==='/portfolio'?{initialCash:10000,equity:10000,realizedPnl:0,unrealizedPnl:0}:url==='/market/latest'?{status:'waiting'}:{evidence:{observations:0,decisions:0,failures:0,lessons:0,sentMessages:0,strategyIds:[],recordedTransitions:0},coverage:{legacyTransitionsWithoutHistory:0,activitySince:null},memories:[],messages:[],activity:[]}}},setInterval:()=>0,setTimeout:()=>0,console});
  vm.runInContext(readFileSync('public/office/app.js','utf8'),context);
  return {ids,rooms,requests,get socket(){return socket}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('office projects backend rooms and opens real empty memory/activity without fabricated records',async()=>{
  const h=harness();await settle();
  assert.equal(h.rooms[0]!.children[0]!.children.length,1);
  const agent=h.rooms[0]!.children[0]!.children[0]!;
  agent.onclick!();await settle();
  assert.equal(h.ids.get('#experience')!.textContent,'Experiência: 0 transições registradas');
  assert.equal(h.ids.get('#memories')!.textContent,'Nenhum registro disponível.');
  assert.ok(h.requests.includes('/agents/atlas/profile'));
  assert.match(h.ids.get('#career')!.textContent,/P&L individual, taxa de acerto e drawdown indisponíveis/);
  assert.equal(h.ids.get('#market')!.textContent,'Aguardando dados de mercado');
});
test('office moves agents only on real state events and reports a disconnected stream',async()=>{
  const h=harness();await settle();
  h.socket.onmessage({data:JSON.stringify({id:'event-1',type:'AGENT_STATE_CHANGED',occurredAt:'2026-01-01',payload:{id:'atlas',name:'Atlas',room:'Meeting Room',status:'MEETING',experience:1}})});
  assert.equal(h.rooms[0]!.children[0]!.children.length,0);
  assert.equal(h.rooms[4]!.children[0]!.children.length,1);
  assert.equal(h.ids.get('#events')!.children.length,1);
  h.socket.onclose();
  assert.match(h.ids.get('#connection')!.textContent,/desconectados/);
});

test('an older initial snapshot cannot overwrite a newer streamed room or market tick',async()=>{
 const h=harness();
 h.socket.onmessage({data:JSON.stringify({id:'new-state',type:'AGENT_STATE_CHANGED',occurredAt:'2026-01-01',payload:{id:'atlas',name:'Atlas',room:'Meeting Room',status:'MEETING',experience:1}})});
 h.socket.onmessage({data:JSON.stringify({id:'new-tick',type:'MARKET_TICK',payload:{symbol:'BTCUSDT',price:50000}})});
 await settle();
 assert.equal(h.rooms[0]!.children[0]!.children.length,0);
 assert.equal(h.rooms[4]!.children[0]!.children.length,1);
 assert.equal(h.ids.get('#market')!.textContent,'BTCUSDT 50000.00 USDT');
 assert.equal(h.ids.get('#events')!.children.length,1);
});


test('office labels fund equity separately and does not synthesize evaluation capital',async()=>{
 const h=harness();await settle();
 assert.equal(h.ids.get('#accounts')!.children.length,1);
 assert.match(h.ids.get('#accountScope')!.textContent,/não configuradas/);
 assert.equal(h.ids.get('#equity')!.textContent,'10000.00 USDT');
 assert.equal(h.ids.get('#pnl')!.textContent,'0.00 USDT');
});

test('financial panel keeps perpetual evaluation P&L separate and labels stale valuation',async()=>{const h=harness();await settle();assert.equal(h.ids.get('#finance')!.children.length,2);const evaluation=h.ids.get('#finance')!.children[1].children.map(n=>n.textContent).join(' ');assert.match(evaluation,/P&L líquido: -100.00 USDT/);assert.match(evaluation,/Funding: -20.00 USDT/);assert.match(evaluation,/Avaliação indisponível ou desatualizada/);assert.equal(h.ids.get('#equity')!.textContent,'10000.00 USDT');assert.match(h.ids.get('#onlineStatus')!.textContent,/Execução perpétua desligada/);});
test('USD-M feed failures explicitly block the panel price status rather than inventing a quote',async()=>{const h=harness();await settle();h.socket.onmessage({data:JSON.stringify({id:'failure',type:'MARKET_DATA_FAILED',occurredAt:'2026-01-01',payload:{instrument:'BINANCE_USDM:BTCUSDT'}})});assert.match(h.ids.get('#marketV3')!.textContent,/ordens paper bloqueadas/);});

test('visual controls open actual panels and show only backend activity counts',async()=>{
 const h=harness();await settle();
 assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
 h.ids.get('#navAgents')!.onclick!();
 assert.equal(h.ids.get('#agentsPanel')!.hidden,false);
 assert.equal(h.ids.get('#researchPanel')!.hidden,true);
 assert.equal(h.ids.get('#workspaceTitle')!.textContent,'Equipe do laboratório');
 assert.equal(h.ids.get('#positions')!.textContent,'Nenhuma posição aberta registrada.');
 h.socket.onmessage({data:JSON.stringify({id:'quote',type:'PERPETUAL_MARKET_UPDATED',payload:{markPrice:50000,bid:49999,ask:50001,fundingRate:0.0001,markTime:Date.now()}})});
 assert.equal(h.ids.get('#markPrice')!.textContent,'50000.00 USDT');
 h.socket.onmessage({data:JSON.stringify({id:'failed-source',type:'MARKET_DATA_FAILED'})});
 assert.equal(h.ids.get('#markPrice')!.textContent,'Indisponível');
 assert.equal(h.ids.get('#fundingRate')!.textContent,'—');
});
test('a quote snapshot requested before a source failure cannot make the stale price appear healthy',async()=>{
 let resolve!:(value:unknown)=>void;const delayed=new Promise(r=>resolve=r);
 const h=harness({'/market/v3':delayed});await settle();
 h.socket.onmessage({data:JSON.stringify({id:'source-failed',type:'MARKET_DATA_FAILED'})});
 resolve({status:'HEALTHY',quote:{markTime:Date.now(),markPrice:50000,bid:49999,ask:50001,fundingRate:0.001}});
 await settle();
 assert.equal(h.ids.get('#markPrice')!.textContent,'Indisponível');
 assert.match(h.ids.get('#marketV3')!.textContent,/bloqueadas/);
});
