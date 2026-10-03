import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Element {
  textContent=''; children:Element[]=[]; dataset:Record<string,string>={}; onclick?:()=>void;
  append(...items:Element[]){this.children.push(...items)}
  replaceChildren(...items:Element[]){this.children=items}
  setAttribute(){} addEventListener(){} showModal(){} close(){}
  querySelector(){return this.children[0]}
}
function harness(){
  const ids=new Map<string,Element>();
  const rooms=['Research Lab','Quant Lab','Trading Floor','Risk Desk','Meeting Room','Lounge'].map(room=>{const n=new Element();n.dataset.room=room;n.append(new Element());return n});
  let socket:any;
  const document={createElement:()=>new Element(),querySelector:(s:string)=>{if(!ids.has(s))ids.set(s,new Element());return ids.get(s)},querySelectorAll:(s:string)=>s==='.occupants'?rooms.map(n=>n.children[0]):rooms};
  const requests:string[]=[];
  const context=vm.createContext({document,location:{protocol:'https:',host:'example.test'},WebSocket:class{constructor(){socket=this}},fetch:async(url:string)=>{requests.push(url);return {ok:true,json:async()=>url==='/agents'?[{id:'atlas',name:'Atlas',role:'Research',room:'Research Lab',status:'IDLE',experience:0,updatedAt:'2026-01-01'}]:url==='/research/runs'?[]:url==='/paper/accounts'?[{kind:'FUND',ownerAgentId:null,initialCash:10000,portfolio:{equity:10000},fills:0}]:url==='/portfolio'?{initialCash:10000,equity:10000,realizedPnl:0,unrealizedPnl:0}:url==='/market/latest'?{status:'waiting'}:{evidence:{observations:0,decisions:0,failures:0,lessons:0,sentMessages:0,strategyIds:[],recordedTransitions:0},coverage:{legacyTransitionsWithoutHistory:0,activitySince:null},memories:[],messages:[],activity:[]}}},setInterval:()=>0,setTimeout:()=>0,console});
  vm.runInContext(readFileSync('public/office/app.js','utf8'),context);
  return {ids,rooms,requests,get socket(){return socket}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('office projects backend rooms and opens real empty memory/activity without fabricated records',async()=>{
  const h=harness();await settle();
  assert.equal(h.rooms[0]!.children[0]!.children.length,1);
  const agent=h.rooms[0]!.children[0]!.children[0]!;
  agent.onclick!();await settle();
  assert.equal(h.ids.get('#experience')!.textContent,'Experience: 0 recorded transitions');
  assert.equal(h.ids.get('#memories')!.textContent,'No records available.');
  assert.ok(h.requests.includes('/agents/atlas/profile'));
  assert.match(h.ids.get('#career')!.textContent,/Individual P&L, win rate and drawdown unavailable/);
  assert.equal(h.ids.get('#market')!.textContent,'Waiting for market data');
});
test('office moves agents only on real state events and reports a disconnected stream',async()=>{
  const h=harness();await settle();
  h.socket.onmessage({data:JSON.stringify({id:'event-1',type:'AGENT_STATE_CHANGED',occurredAt:'2026-01-01',payload:{id:'atlas',name:'Atlas',room:'Meeting Room',status:'MEETING',experience:1}})});
  assert.equal(h.rooms[0]!.children[0]!.children.length,0);
  assert.equal(h.rooms[4]!.children[0]!.children.length,1);
  assert.equal(h.ids.get('#events')!.children.length,1);
  h.socket.onclose();
  assert.match(h.ids.get('#connection')!.textContent,/disconnected/);
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
 assert.match(h.ids.get('#accountScope')!.textContent,/not configured/);
 assert.equal(h.ids.get('#equity')!.textContent,'10000.00 USDT');
 assert.equal(h.ids.get('#pnl')!.textContent,'0.00 USDT');
});
