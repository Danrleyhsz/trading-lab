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
  const context=vm.createContext({document,location:{protocol:'https:',host:'example.test'},WebSocket:class{constructor(){socket=this}},fetch:async(url:string)=>{requests.push(url);return {ok:true,json:async()=>url==='/agents'?[{id:'atlas',name:'Atlas',role:'Research',room:'Research Lab',status:'IDLE',experience:0,updatedAt:'2026-01-01'}]:url==='/portfolio'?{equity:10000,realizedPnl:0,unrealizedPnl:0}:url==='/market/latest'?{status:'waiting'}:[]}},setInterval:()=>0,setTimeout:()=>0,console});
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
  assert.ok(h.requests.includes('/memories?agentId=atlas'));
  assert.ok(h.requests.includes('/agent-messages?agentId=atlas'));
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
