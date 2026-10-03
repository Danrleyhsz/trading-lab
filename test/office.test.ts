import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Element {
  hidden=false; textContent=''; children:Element[]=[]; dataset:Record<string,string>={}; onclick?:()=>void;
  parentElement?:Element; remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(item=>item!==this);this.parentElement=undefined}
  append(...items:Element[]){for(const item of items){item.remove();item.parentElement=this;this.children.push(item)}}
  replaceChildren(...items:Element[]){for(const child of this.children)child.parentElement=undefined;this.children=[];this.append(...items)}
  listeners:Record<string,Array<()=>void>>={};open=false;focusCalls=0;isConnected=true;
  attributes:Record<string,string>={};rect={left:0,top:0,width:100,height:100};getBoundingClientRect(){return this.rect}
  setAttribute(name:string,value:string){this.attributes[name]=value} addEventListener(name:string,fn:()=>void){(this.listeners[name]??=[]).push(fn)} showModal(){this.open=true} close(){this.open=false;for(const fn of this.listeners.close??[])fn()} focus(){this.focusCalls++}
  querySelector(){return this.children[0]}
}
function harness(overrides:Record<string,unknown>={},reduceMotion=false,geometry=false){
  const ids=new Map<string,Element>();
  const rooms=['Research Lab','Quant Lab','Trading Floor','Risk Desk','Meeting Room','Lounge'].map(room=>{const n=new Element();n.dataset.room=room;n.append(new Element());return n});
  let socket:any;
  const document={createElement:()=>new Element(),querySelector:(s:string)=>{if(!ids.has(s))ids.set(s,new Element());return ids.get(s)},querySelectorAll:(s:string)=>s==='.occupants'?rooms.map(n=>n.children[0]):s==='button[data-space]'?[]:s==='.agent'?rooms.flatMap(n=>n.children[0].children):rooms};
  if(geometry)(document as any).createElementNS=()=>{const e=new Element(),set=e.setAttribute.bind(e);e.setAttribute=(name:string,value:string)=>{set(name,value);if(name==='id')ids.set('#'+value,e)};return e};
  const requests:string[]=[];const intervals:Array<()=>void>=[];
  const context=vm.createContext({matchMedia:()=>({matches:reduceMotion,addEventListener(){}}),document,location:{protocol:'https:',host:'example.test'},WebSocket:class{constructor(){socket=this}},fetch:async(url:string)=>{requests.push(url);return {ok:!(overrides[url] as any)?.httpError,status:(overrides[url] as any)?.httpError||200,json:async()=>Object.hasOwn(overrides,url)? await overrides[url] :url==='/finance'?{legacyAccounts:[{id:'fund',kind:'FUND',instrument:'LEGACY_PAPER_V1',initialCash:10000,portfolio:{equity:10000},feesPaid:0}],perpetualAccounts:[{id:'evaluation:nova:usdm',kind:'EVALUATION',instrument:'BINANCE_USDM:BTCUSDT',ownerAgentId:'nova',initialCash:5000,portfolio:{equity:4900},feesPaid:10,fundingCashDelta:-20,maxDrawdown:0.03,initialMargin:500,valuationFresh:false}]}:url==='/market/v3'?{status:'UNAVAILABLE',quote:null}:url==='/paper/perpetual/status'?{halted:false,executionEnabled:false,autonomous:{enabled:false,reason:'completed V2 study required'}}:url==='/backtests/v2/studies'?[]:url==='/agents'?[{id:'atlas',name:'Atlas',role:'Research',room:'Research Lab',status:'IDLE',experience:0,updatedAt:'2026-01-01'}]:url==='/agent-messages'?[]:url==='/research/runs'?[]:url==='/paper/accounts'?[{kind:'FUND',ownerAgentId:null,initialCash:10000,portfolio:{equity:10000},fills:0}]:url==='/portfolio'?{initialCash:10000,equity:10000,realizedPnl:0,unrealizedPnl:0}:url==='/market/latest'?{status:'waiting'}:{evidence:{observations:0,decisions:0,failures:0,lessons:0,sentMessages:0,strategyIds:[],recordedTransitions:0},coverage:{legacyTransitionsWithoutHistory:0,activitySince:null},memories:[],messages:[],activity:[]}}},setInterval:(callback:()=>void)=>{intervals.push(callback);return 0},setTimeout:()=>0,clearTimeout:()=>{},console});
  for(const name of ['collaboration','navigation','presence','transitions','character-frames','sprites'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),context);
  vm.runInContext(readFileSync('public/office/app.js','utf8'),context);
  return {ids,rooms,requests,intervals,context,get socket(){return socket}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('closing a profile whose roster opener was refreshed keeps keyboard focus inside the parent panel',async()=>{
 const h=harness();await settle();h.ids.get('#navAgents')!.onclick!();const opener=h.ids.get('#agentList')!.children[0];h.context.document.activeElement=opener;opener.onclick!();await settle();opener.isConnected=false;
 h.ids.get('#profile')!.close();assert.equal(h.ids.get('#workspaceDialog')!.open,true);assert.ok(h.ids.get('#closeWorkspace')!.focusCalls>0);
});
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

test('a received room transition animates a stable view while all labels immediately show the backend state',async()=>{
 const h=harness();await settle();const agent=h.rooms[0].children[0].children[0],animations:any[]=[];
 h.ids.get('#office')!.rect={left:0,top:0,width:1536,height:1024};agent.rect={left:1536*.086-36,top:1024*.4072-110,width:72,height:110};
 (agent as any).animate=(frames:any,options:any)=>{const effect={frames,options,cancels:0,onfinish:undefined,cancel(){this.cancels++;}};animations.push(effect);return effect;};
 const actual={id:'atlas',name:'Atlas',room:'Quant Lab',status:'BACKTESTING',experience:3};
 h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_RECEIVED_STATE',type:'AGENT_STATE_CHANGED',occurredAt:new Date().toISOString(),payload:actual})});
 assert.equal(h.rooms[1].children[0].children[0],agent);assert.equal(agent.dataset.room,'Quant Lab');assert.equal(agent.dataset.status,'BACKTESTING');assert.equal(agent.dataset.travel,'recorded');assert.equal(animations.length,1);
 assert.match(h.ids.get('#agentList')!.children[0].textContent,/Quant Lab/);assert.equal(h.ids.get('#activeAgents')!.textContent,'1 / 1');
 h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_NEW_STATUS',type:'AGENT_STATE_CHANGED',occurredAt:new Date().toISOString(),payload:{...actual,status:'IDLE'}})});
 animations[0].onfinish();assert.equal(agent.dataset.travel,undefined);assert.equal(animations[0].cancels,1);assert.equal(animations.length,1);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
 assert.ok(!h.requests.some(url=>url.includes('/orders')||url.includes('/ai/')));
});

test('stream disconnect and reduced motion stop travel without replay on a snapshot',async()=>{
 for(const reduce of [false,true]){
  const actual={id:'atlas',name:'Atlas',room:'Quant Lab',status:'IDLE',experience:0},overrides:any={};const h=harness(overrides,reduce);await settle();
  const agent=h.rooms[0].children[0].children[0];h.ids.get('#office')!.rect={left:0,top:0,width:1536,height:1024};agent.rect={left:1536*.086-36,top:1024*.4072-110,width:72,height:110};let plays=0,cancels=0;let animation:any;
  (agent as any).animate=()=>{plays++;animation={cancel(){cancels++;},onfinish:undefined};return animation;};
  overrides['/agents']=[actual];h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_STATE',type:'AGENT_STATE_CHANGED',occurredAt:new Date().toISOString(),payload:actual})});
  assert.equal(plays,reduce?0:1);h.socket.onclose();animation?.onfinish();assert.equal(agent.dataset.travel,undefined);assert.equal(cancels,reduce?0:1);
  h.intervals[0]();await settle();assert.equal(plays,reduce?0:1);assert.equal(agent.dataset.room,'Quant Lab');assert.equal(agent.dataset.status,'IDLE');
 }
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

test('office shows real runtime gates and clears a diagnosis after source failure or an old snapshot',async()=>{
 const report={mode:'PAPER_TRADING',observedAt:new Date().toISOString(),phase:'SERVING',environment:'DEVELOPMENT',controlPlaneReady:true,storage:{lastPersistedAt:new Date().toISOString(),pendingWrites:0},market:{perpetual:{status:'UNAVAILABLE'}},paper:{newExposure:{ready:false,reasons:['PERPETUAL_EXECUTION_DISABLED','FUNDING_RECONCILIATION_PENDING']},autonomous:{ready:false}},jobs:{research:{busy:false},historical:{busy:false}},ai:{enabled:false,heldMicrousd:0}};
 const h=harness({'/runtime/readiness':report});await settle();assert.match(h.ids.get('#runtimeStatus')!.textContent,/Painel disponível.*desenvolvimento/);const detail=h.ids.get('#runtimeDetails')!.children.map(item=>item.textContent).join(' ');assert.match(detail,/Execução paper desligada/);assert.match(detail,/Funding aguardando conciliação/);assert.match(detail,/IA desligada/);assert.match(detail,/verificação externa/);
 h.socket.onmessage({data:JSON.stringify({id:'source-failure',type:'MARKET_DATA_FAILED'})});assert.match(h.ids.get('#runtimeStatus')!.textContent,/indisponível ou desatualizado/);assert.equal(h.ids.get('#runtimeDetails')!.children.length,0);
 const old=harness({'/runtime/readiness':{...report,observedAt:'2020-01-01T00:00:00Z'}});await settle();assert.match(old.ids.get('#runtimeStatus')!.textContent,/desatualizado/);
});
test('an older runtime diagnosis cannot undo a newer streamed source failure',async()=>{
 let resolve!:(value:unknown)=>void;const delayed=new Promise(r=>resolve=r);const h=harness({'/runtime/readiness':delayed});await settle();h.socket.onmessage({data:JSON.stringify({id:'new-failure',type:'MARKET_DATA_FAILED'})});resolve({observedAt:new Date().toISOString(),phase:'SERVING',controlPlaneReady:true,storage:{},market:{},paper:{newExposure:{ready:true}},jobs:{},ai:{}});await settle();assert.match(h.ids.get('#runtimeStatus')!.textContent,/indisponível ou desatualizado/);assert.equal(h.ids.get('#runtimeDetails')!.children.length,0);
});
test('runtime diagnosis expires even when refreshing the network is still pending',async()=>{
 const report={mode:'PAPER_TRADING',observedAt:new Date().toISOString(),phase:'SERVING',environment:'PRODUCTION',controlPlaneReady:true,storage:{lastPersistedAt:null,pendingWrites:0},market:{perpetual:{status:'HEALTHY'}},paper:{newExposure:{ready:false,reasons:['PERPETUAL_EXECUTION_DISABLED']},autonomous:{ready:false}},jobs:{research:{busy:false},historical:{busy:false}},ai:{enabled:false}};
 const h=harness({'/runtime/readiness':report});await settle();assert.match(h.ids.get('#runtimeStatus')!.textContent,/Painel disponível/);
 vm.runInContext('Date.now = () => '+(Date.now()+20000),h.context);h.intervals.forEach(callback=>callback());assert.match(h.ids.get('#runtimeStatus')!.textContent,/indisponível ou desatualizado/);assert.equal(h.ids.get('#runtimeDetails')!.children.length,0);await settle();assert.match(h.ids.get('#runtimeStatus')!.textContent,/desatualizado/);
});
test('partial diagnostics never invent idle tasks or a deployment environment',async()=>{
 const h=harness({'/runtime/readiness':{observedAt:new Date().toISOString(),phase:'SERVING',controlPlaneReady:true,storage:{},market:{},paper:{newExposure:{ready:true}},jobs:{},ai:{}}});await settle();assert.match(h.ids.get('#runtimeStatus')!.textContent,/indisponível/);assert.equal(h.ids.get('#runtimeDetails')!.children.length,0);
});

function flatten(element:Element):string{return [element.textContent,...element.children.map(flatten)].join(' ');}
function buttons(element:Element):Element[]{return element.children.flatMap(child=>[...(child.onclick?[child]:[]),...buttons(child)]);}
const recorded=(id:string,type='RISK_REJECTED')=>({id,type,occurredAt:'2026-01-01T00:00:00Z',payload:{accountId:'evaluation:nova:usdm',decision:{approved:false,reasons:['TEST_ONLY_LIMIT']},summary:'<script>not executable</script>'}});
test('office opens session event originals without fabricating durable confirmation',async()=>{
 const record=recorded('actual-source'),h=harness({'/audit/events/actual-source':{source:'DURABLE_SNAPSHOT',event:record}});await settle();h.socket.onmessage({data:JSON.stringify(record)});buttons(h.ids.get('#events')!)[0].onclick!();await settle();assert.ok(h.requests.includes('/audit/events/actual-source'));assert.match(h.ids.get('#auditStatus')!.textContent,/confirmado no histórico gravado/);assert.match(flatten(h.ids.get('#auditContent')!),/TEST_ONLY_LIMIT/);assert.match(flatten(h.ids.get('#auditContent')!),/<script>not executable/);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
});
test('office pages recorded history with original cursors and never fills empty history with agent work',async()=>{
 const first='/audit/events?limit=25',second=first+'&before=oldest',h=harness({[first]:{source:'DURABLE_SNAPSHOT',events:[recorded('oldest')],nextCursor:'oldest'},[second]:{source:'DURABLE_SNAPSHOT',events:[],nextCursor:null}});await settle();h.ids.get('#navHistory')!.onclick!();await settle();assert.equal(h.ids.get('#historyPanel')!.hidden,false);assert.equal(h.ids.get('#historyList')!.children.length,1);h.ids.get('#olderEvents')!.onclick!();await settle();assert.ok(h.requests.includes(second));assert.match(h.ids.get('#historyStatus')!.textContent,/Nenhum evento gravado/);assert.equal(h.ids.get('#historyList')!.children.length,0);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
});
test('changing an audit filter invalidates an older response and its cursor',async()=>{
 let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});const h=harness({'/audit/events?limit=25':pending,'/audit/events?limit=25&type=PAPER_FILL':{source:'DURABLE_SNAPSHOT',events:[],nextCursor:null}});await settle();h.ids.get('#navHistory')!.onclick!();await settle();(h.ids.get('#eventType') as any).value='PAPER_FILL';(h.ids.get('#eventType') as any).onchange();await settle();release({source:'DURABLE_SNAPSHOT',events:[recorded('stale')],nextCursor:'stale'});await settle();assert.equal(h.ids.get('#historyList')!.children.length,0);assert.match(h.ids.get('#historyStatus')!.textContent,/Nenhum evento gravado/);assert.equal((h.ids.get('#olderEvents') as any).disabled,true);
});
test('an older event detail cannot overwrite a newly selected original record',async()=>{
 let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});const h=harness({'/audit/events/one':pending,'/audit/events/two':{source:'DURABLE_SNAPSHOT',event:recorded('two')}});await settle();for(const id of ['one','two'])h.socket.onmessage({data:JSON.stringify(recorded(id))});const rows=h.ids.get('#events')!.children;buttons(rows[1])[0].onclick!();buttons(rows[0])[0].onclick!();await settle();release({source:'DURABLE_SNAPSHOT',event:recorded('one')});await settle();assert.match(flatten(h.ids.get('#auditContent')!),/ID original: two/);assert.doesNotMatch(flatten(h.ids.get('#auditContent')!),/ID original: one/);
});
test('account audit pages stay on the independent account and open original fills without merging fund capital',async()=>{
 const path='/paper/perpetual/accounts/evaluation%3Anova%3Ausdm/performance?limit=25',trade={symbol:'BTCUSDT',direction:'LONG',openedAt:'2026-01-01',closedAt:'2026-01-02',netPnl:-3,grossPnl:0,feesPaid:2,fundingCashDelta:-1,fillEventIds:['source-fill'],fundingEventIds:['source-funding']},performance={available:true,coverage:'RECORDED_LEDGER_ONLY',summary:{closedTrades:2,winRate:0,closedNetPnl:-6},closedTrades:[trade],nextCursor:'source-fill'};
 const h=harness({[path]:performance,[path+'&before=source-fill']:{...performance,closedTrades:[],nextCursor:null},'/audit/events/source-fill':{source:'DURABLE_SNAPSHOT',event:recorded('source-fill','PAPER_FILL')}});await settle();const accountCard=h.ids.get('#finance')!.children[1];buttons(accountCard).find(button=>button.textContent==='Navegar operações desta conta')!.onclick!();await settle();assert.ok(h.requests.includes(path));assert.match(flatten(h.ids.get('#auditContent')!),/Resultado líquido encerrado: -6.00 USDT/);buttons(h.ids.get('#auditContent')!).find(button=>button.textContent.includes('source-fill'))!.onclick!();await settle();assert.match(flatten(h.ids.get('#auditContent')!),/ID original: source-fill/);h.ids.get('#auditBack')!.onclick!();assert.match(flatten(h.ids.get('#auditContent')!),/Resultado líquido encerrado/);h.ids.get('#auditOlder')!.onclick!();await settle();assert.ok(h.requests.includes(path+'&before=source-fill'));assert.match(flatten(h.ids.get('#auditContent')!),/Nenhuma operação completa/);assert.equal(h.ids.get('#equity')!.textContent,'10000.00 USDT');
});

test('only an explicitly missing persisted event can show a received-only fallback; expired access cannot',async()=>{
 for(const status of [404,401]){const record=recorded('received'),h=harness({'/audit/events/received':{httpError:status}});await settle();h.socket.onmessage({data:JSON.stringify(record)});buttons(h.ids.get('#events')!)[0].onclick!();await settle();if(status===404){assert.match(h.ids.get('#auditStatus')!.textContent,/Ainda não confirmado/);assert.match(flatten(h.ids.get('#auditContent')!),/ID original: received/);}else{assert.match(h.ids.get('#auditStatus')!.textContent,/Histórico indisponível/);assert.equal(h.ids.get('#auditContent')!.children.length,0);}}
});
test('closing audit invalidates a pending response and restores the original control focus',async()=>{
 let release!:(value:unknown)=>void;const pending=new Promise(resolve=>{release=resolve;});const record=recorded('slow'),h=harness({'/audit/events/slow':pending});await settle();h.socket.onmessage({data:JSON.stringify(record)});const button=buttons(h.ids.get('#events')!)[0];(h.context.document as any).activeElement=button;button.onclick!();h.ids.get('#closeAudit')!.onclick!();assert.equal(button.focusCalls,1);release({source:'DURABLE_SNAPSHOT',event:record});await settle();assert.equal(h.ids.get('#auditDialog')!.open,false);assert.equal(h.ids.get('#auditContent')!.children.length,0);
});
test('a new session event keeps the focused original event accessible by keyboard',async()=>{
 const h=harness();await settle();h.socket.onmessage({data:JSON.stringify(recorded('focus'))});(h.context.document as any).activeElement=buttons(h.ids.get('#events')!)[0];h.socket.onmessage({data:JSON.stringify(recorded('new'))});const focused=buttons(h.ids.get('#events')!).find(button=>button.dataset.eventId==='focus')!;assert.equal(focused.focusCalls,1);assert.equal(h.ids.get('#events')!.children.length,2);
});

test('closing account audit returns focus inside the still-open parent panel if refresh replaced its opener',async()=>{
 const path='/paper/perpetual/accounts/evaluation%3Anova%3Ausdm/performance?limit=25',h=harness({[path]:{available:true,coverage:'RECORDED_LEDGER_ONLY',summary:{closedTrades:0,winRate:null,closedNetPnl:0},closedTrades:[],nextCursor:null}});await settle();h.ids.get('#navFinance')!.onclick!();const opener=buttons(h.ids.get('#finance')!.children[1]).find(button=>button.textContent==='Navegar operações desta conta')!;(h.context.document as any).activeElement=opener;opener.onclick!();await settle();opener.isConnected=false;h.ids.get('#closeAudit')!.onclick!();assert.equal(h.ids.get('#closeWorkspace')!.focusCalls,1);assert.equal(h.ids.get('#workspaceDialog')!.open,true);assert.equal(h.ids.get('#auditDialog')!.open,false);
});

test('stable living characters survive snapshot refresh and cosmetic controls never change backend work',async()=>{
 const h=harness();await settle();const original=h.rooms[0].children[0].children[0];
 h.intervals[0]();await settle();assert.equal(h.rooms[0].children[0].children[0],original);assert.equal(h.rooms[0].children[0].children.length,1);
 h.ids.get('#togglePresence')!.onclick!();assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');assert.equal(h.rooms[0].children[0].children[0],original);assert.match(h.ids.get('#togglePresence')!.textContent,/Animar/);assert.equal(original.dataset.status,'IDLE');assert.equal(original.dataset.room,'Research Lab');assert.ok(!h.requests.some(url=>url.includes('/orders')));
});

test('a modal pauses all character presentation through refresh and closing restores the motion preference',async()=>{
 const h=harness();await settle();const actor=h.rooms[0].children[0].children[0],portrait=actor.children[0],parts=portrait.children.slice();
 assert.equal(portrait.dataset.sprite,'atlas');assert.equal(portrait.dataset.rig,'directional');assert.equal(h.ids.get('#office')!.dataset.presence,'on');
 actor.onclick!();await settle();assert.equal(h.ids.get('#office')!.dataset.presence,'off');assert.equal(h.ids.get('#profilePortrait')!.dataset.rig,'portrait');
 h.intervals[0]();await settle();assert.equal(h.ids.get('#office')!.dataset.presence,'off');assert.equal(actor.children[0],portrait);assert.deepEqual(portrait.children,parts);
 h.ids.get('#profile')!.close();assert.equal(h.ids.get('#office')!.dataset.presence,'on');assert.equal(actor.dataset.status,'IDLE');assert.equal(h.ids.get('#experience')!.textContent,'Experiência: 0 transições registradas');
});
test('interactive meeting room opens original communications and participants without invented chatter',async()=>{
 const message={id:'stored-message',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'<img onerror=not-executable> Original hypothesis',createdAt:'2026-01-01T00:00:00Z',context:{source:'TEST_ONLY'}};
 const h=harness({'/agent-messages':[message]});await settle();h.ids.get('#openCollaboration')!.onclick!();await settle();
 assert.equal(h.ids.get('#roomDialog')!.open,true);assert.match(h.ids.get('#roomMessageStatus')!.textContent,/registradas/);assert.match(flatten(h.ids.get('#roomMessages')!),/stored-message/);assert.match(flatten(h.ids.get('#roomMessages')!),/<img onerror=not-executable>/);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');assert.equal(h.rooms[0].children[0].children[0].children.some(c=>(c as any).className==='recorded-speech'),false);
 const participant=buttons(h.ids.get('#roomMessages')!)[0];participant.onclick!();await settle();assert.equal(h.ids.get('#roomDialog')!.open,false);assert.equal(h.ids.get('#profile')!.open,true);assert.ok(h.requests.includes('/agents/atlas/profile'));
});
test('empty or failed communication remains explicit and cannot claim a meeting occurred',async()=>{
 const h=harness();await settle();h.ids.get('#openCollaboration')!.onclick!();await settle();assert.match(h.ids.get('#roomMessageStatus')!.textContent,/Nenhuma comunicação registrada/);assert.equal(h.ids.get('#roomMessages')!.children.length,0);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
 const failed=harness({'/agent-messages':{httpError:401}});await settle();failed.ids.get('#openCollaboration')!.onclick!();await settle();assert.match(failed.ids.get('#roomMessageStatus')!.textContent,/indisponíveis/);assert.equal(failed.ids.get('#roomMessages')!.children.length,0);
});
test('invalid communication participants or timestamps do not create visual characters or messages',async()=>{
 for(const message of [{id:'bad',from:'unknown-agent',to:['atlas'],kind:'HYPOTHESIS',summary:'unverified',createdAt:'2026-01-01'}, {id:'bad',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'unverified',createdAt:'invalid'}]){
  const h=harness({'/agent-messages':[message]});await settle();h.ids.get('#openCollaboration')!.onclick!();await settle();assert.match(h.ids.get('#roomMessageStatus')!.textContent,/indisponíveis/);assert.equal(h.ids.get('#roomMessages')!.children.length,0);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
 }
});
test('only a newly observed recent original message creates a temporary speech indicator',async()=>{
 const messages:any[]=[],h=harness({'/agent-messages':messages});await settle();const agent=h.rooms[0].children[0].children[0];
 messages.push({id:'new-original',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'Actual test fixture message',createdAt:new Date().toISOString(),context:{}});
 h.intervals.forEach(fn=>fn());await settle();assert.equal(agent.children.filter(c=>(c as any).className==='recorded-speech').length,1);assert.match(flatten(agent),/Hipótese → euler/);assert.equal(agent.dataset.status,'IDLE');assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
 const original=agent.children.find(c=>(c as any).className==='recorded-speech');h.intervals.forEach(fn=>fn());await settle();assert.equal(agent.children.find(c=>(c as any).className==='recorded-speech'),original);
});
test('room communication refresh preserves focused participants and safely closes with the actual state unchanged',async()=>{
 const message={id:'focus-message',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'Original fixture',createdAt:'2026-01-01T00:00:00Z'},h=harness({'/agent-messages':[message]});await settle();h.ids.get('#openCollaboration')!.onclick!();await settle();
 const participant=buttons(h.ids.get('#roomMessages')!)[0];(h.context.document as any).activeElement=participant;h.intervals.forEach(fn=>fn());await settle();
 const updated=buttons(h.ids.get('#roomMessages')!)[0];assert.equal(updated.dataset.roomControl,participant.dataset.roomControl);assert.ok(updated.focusCalls>0);assert.match(flatten(h.ids.get('#roomMessages')!),/→/);h.ids.get('#closeRoom')!.onclick!();assert.equal(h.ids.get('#roomDialog')!.open,false);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
});
test('reduced-motion preference explicitly disables presentation without changing the backend status',async()=>{
 const h=harness({},true);await settle();assert.equal(h.ids.get('#office')!.dataset.presence,'off');assert.equal(h.ids.get('#togglePresence')!.textContent,'Movimento reduzido');assert.equal((h.ids.get('#togglePresence') as any).disabled,true);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');assert.equal(h.rooms[0].children[0].children[0].dataset.status,'IDLE');
});
test('furniture opens existing market/research controls and lounge collaboration without scheduling work',async()=>{
 const h=harness();await settle();const furniture=h.rooms.flatMap(room=>room.children).filter(button=>button.dataset.furniture);assert.equal(furniture.length,6);
 furniture.find(button=>button.dataset.furniture==='terminal')!.onclick!();assert.equal(h.ids.get('#workspaceDialog')!.open,true);assert.equal(h.ids.get('#marketPanel')!.hidden,false);assert.match(h.ids.get('#workspaceTitle')!.textContent,/mercado observado/);h.ids.get('#closeWorkspace')!.onclick!();
 furniture.find(button=>button.dataset.furniture==='coffee')!.onclick!();await settle();assert.equal(h.ids.get('#roomDialog')!.open,true);assert.equal(h.ids.get('#roomTitle')!.textContent,'Lounge');assert.match(flatten(h.ids.get('#roomObjects')!),/Café e convivência/);assert.match(h.ids.get('#roomMessageStatus')!.textContent,/Nenhuma comunicação/);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');assert.equal(h.ids.get('#equity')!.textContent,'10000.00 USDT');assert.ok(!h.requests.includes('/research/run'));
});

test('selected original handoff highlights actual participants and uses current geometry without changing work',async()=>{
 const original={id:'historical-handoff',from:'atlas',to:['euler','sentinel'],kind:'HYPOTHESIS',summary:'<script>retained original</script>',createdAt:'2026-01-01T00:00:00Z'};
 const roster=[{id:'atlas',name:'Atlas',room:'Research Lab',status:'IDLE',experience:0},{id:'euler',name:'Euler',room:'Quant Lab',status:'IDLE',experience:0}];
 const h=harness({'/agent-messages':[original],'/agents':roster},false,true);await settle();const sender=h.rooms[0].children[0].children[0],recipient=h.rooms[1].children[0].children[0];
 h.ids.get('#office')!.rect={left:0,top:0,width:1000,height:1000};sender.rect={left:100,top:200,width:40,height:80};recipient.rect={left:600,top:700,width:40,height:80};
 buttons(h.ids.get('#handoffList')!)[0].onclick!();assert.equal(sender.dataset.handoff,'sender');assert.equal(recipient.dataset.handoff,'recipient');assert.match(flatten(h.ids.get('#handoffDetail')!),/ID original: historical-handoff/);assert.match(flatten(h.ids.get('#handoffDetail')!),/<script>retained original/);assert.match(flatten(h.ids.get('#handoffDetail')!),/estado indisponível/);assert.match(h.ids.get('#handoffStatus')!.textContent,/Registro selecionado/);assert.equal(h.ids.get('#handoffMap')!.children.length,2);assert.match(h.ids.get('#handoffMap')!.children[0].attributes.d,/M 12 24 L 62 74/);assert.equal(sender.dataset.delivery,undefined);
 recipient.rect.left=800;h.socket.onmessage({data:JSON.stringify({id:'actual-state',type:'AGENT_STATE_CHANGED',payload:{...roster[1],room:'Meeting Room',status:'MEETING',experience:1}})});assert.match(flatten(h.ids.get('#handoffDetail')!),/Meeting Room/);assert.match(h.ids.get('#handoffMap')!.children[0].attributes.d,/82 74/);assert.equal(h.ids.get('#activeAgents')!.textContent,'1 / 2');
 buttons(h.ids.get('#handoffDetail')!)[0].onclick!();await settle();assert.ok(h.requests.includes('/agents/atlas/profile'));h.ids.get('#closeProfile')!.onclick!();assert.ok(buttons(h.ids.get('#handoffDetail')!)[0].focusCalls>0);
 h.ids.get('#clearHandoff')!.onclick!();assert.equal(sender.dataset.handoff,undefined);assert.equal(recipient.dataset.handoff,undefined);assert.equal(h.ids.get('#handoffDetail')!.children.length,0);assert.equal(h.ids.get('#office')!.dataset.presence,'on');assert.ok(!h.requests.some(url=>/(?:\/orders|\/research\/run)$/.test(url)));
});
test('new original communication identifies sender and recipient but failure clears selection and delivery',async()=>{
 const data:any[]=[],roster=[{id:'atlas',name:'Atlas',room:'Research Lab',status:'IDLE',experience:0},{id:'euler',name:'Euler',room:'Quant Lab',status:'IDLE',experience:0}],h=harness({'/agent-messages':data,'/agents':roster});await settle();
 const sender=h.rooms[0].children[0].children[0],recipient=h.rooms[1].children[0].children[0];data.push({id:'new-handoff',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'Fixture only',createdAt:new Date().toISOString()});h.intervals.forEach(fn=>fn());await settle();assert.equal(sender.dataset.delivery,'sent');assert.equal(recipient.dataset.delivery,'received');assert.match(flatten(recipient),/Mensagem de Atlas/);buttons(h.ids.get('#handoffList')!)[0].onclick!();
 data.push({...data[0],summary:'conflicting rewrite'});h.intervals.forEach(fn=>fn());await settle();assert.match(h.ids.get('#handoffStatus')!.textContent,/indisponíveis/);assert.equal(h.ids.get('#handoffList')!.children.length,0);assert.equal(sender.dataset.delivery,undefined);assert.equal(recipient.dataset.delivery,undefined);assert.equal(sender.dataset.handoff,undefined);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 2');
});
test('handoff list stays bounded and preserves keyboard selection across live refresh',async()=>{
 const data=Array.from({length:8},(_,i)=>({id:'fixture-'+i,from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'Original fixture '+i,createdAt:'2026-01-01T00:00:00Z'})),h=harness({'/agent-messages':data});await settle();assert.equal(h.ids.get('#handoffList')!.children.length,6);const button=buttons(h.ids.get('#handoffList')!)[0];(h.context.document as any).activeElement=button;button.onclick!();h.intervals.forEach(fn=>fn());await settle();const current=buttons(h.ids.get('#handoffList')!).find(b=>b.dataset.handoffControl==='fixture-7')!;assert.ok(current.focusCalls>0);assert.match(flatten(h.ids.get('#handoffDetail')!),/fixture-7/);
 data.splice(0,data.length);h.intervals.forEach(fn=>fn());await settle();assert.match(h.ids.get('#handoffStatus')!.textContent,/Nenhuma comunicação/);assert.equal(h.ids.get('#handoffDetail')!.children.length,0);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
});
