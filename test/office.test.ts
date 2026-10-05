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
  for(const name of ['collaboration','navigation','workstations','presence','transitions','life','screens','character-frames','sprites'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),context);
  vm.runInContext(readFileSync('public/office/app.js','utf8'),context);
  return {ids,rooms,requests,intervals,context,get socket(){return socket}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const preflightFixture=()=>({scope:'READ_ONLY_CONTINUOUS_PREFLIGHT',observedAt:new Date().toISOString(),activationReady:false,cycleEnabled:false,configuredStudyId:null,runtimePrerequisites:{ready:false,reasons:['EXPLICIT_STUDY_REQUIRED']},unverified:['AUTOMATIC_OFF_PROVIDER_BACKUP','EXTERNAL_FAILURE_ALERTS'],studies:[{studyId:'TEST_ONLY_NEGATIVE',configured:false,eligible:false,evidence:{netPnl:-131.51},checks:['COMPLETED_V2_STUDY','RECORDED_USDM_EVIDENCE','NONOVERLAPPING_TEST_WINDOWS','MINIMUM_TEST_FOLDS','MINIMUM_CLOSED_TRADES','POSITIVE_RECONCILED_OOS_PNL','NO_MODELED_LIQUIDATIONS','BOUNDED_TEST_DRAWDOWN','COMPATIBLE_SIGNAL_AND_COSTS','RECENT_CLOSED_EVIDENCE'].map(id=>({id,ok:id!=='POSITIVE_RECONCILED_OOS_PNL'}))}]});
test('continuous preflight shows rejection, original study link and external gates without activating work',async()=>{
 const data=preflightFixture(),responses:Record<string,unknown>={'/paper/perpetual/preflight':data},h=harness(responses);await settle();
 const text=flatten(h.ids.get('#continuousPreflight')!);assert.match(text,/Não elegível/);assert.match(text,/-131.51/);assert.match(text,/Backup automático fora do provedor/);assert.match(text,/Alertas externos/);assert.match(text,/Pendente: P&L fora da amostra positivo/);
 assert.match(h.ids.get('#preflightStatus')!.textContent,/Ciclo desligado.*nenhum estudo/);buttons(h.ids.get('#continuousPreflight')!)[0].onclick!();await settle();assert.ok(h.requests.includes('/backtests/v2/studies/TEST_ONLY_NEGATIVE'));assert.ok(!h.requests.some(p=>p.includes('/orders')));
 (h.context.document as any).activeElement=buttons(h.ids.get('#continuousPreflight')!)[0];await vm.runInContext('refreshOnline()',h.context);assert.equal(buttons(h.ids.get('#continuousPreflight')!)[0].focusCalls,1);
 responses['/paper/perpetual/preflight']={httpError:401};await vm.runInContext('refreshOnline()',h.context);assert.equal(h.ids.get('#continuousPreflight')!.children.length,0);assert.match(h.ids.get('#preflightStatus')!.textContent,/indisponível/);
});
test('preflight rejects stale, contradictory and malformed checks and clears after source failure',async()=>{
 for(const mutate of [(d:any)=>d.observedAt='2020-01-01T00:00:00Z',(d:any)=>d.studies[0].eligible=true,(d:any)=>d.studies[0].checks[0].id='UNKNOWN',(d:any)=>d.studies[0].checks[1]=d.studies[0].checks[0],(d:any)=>d.activationReady=true,(d:any)=>d.studies[0]=null,(d:any)=>d.studies[0].checks[0]=null,(d:any)=>d.studies.push(d.studies[0]),(d:any)=>d.studies[0].configured=true]){
  const data=preflightFixture();mutate(data);const h=harness({'/paper/perpetual/preflight':data});await settle();assert.equal(h.ids.get('#continuousPreflight')!.children.length,0);
 }
 const h=harness({'/paper/perpetual/preflight':preflightFixture()});await settle();assert.ok(h.ids.get('#continuousPreflight')!.children.length>0);
 h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_FAILURE',type:'MARKET_DATA_FAILED'})});assert.equal(h.ids.get('#continuousPreflight')!.children.length,0);
 assert.match(h.ids.get('#accountScope')!.textContent,/Avaliações legadas não configuradas.*USD-M/);
});
test('agent cards keep original character identity and open actual profiles',async()=>{
 const h=harness();await settle();const card=h.ids.get('#agentList')!.children[0];assert.equal((card as any).className,'agent-card');assert.equal(card.children[0].dataset.sprite,'atlas');assert.equal(card.children[0].children[0].attributes.src,'/office/agent-sprites.png');assert.match(flatten(card),/Coordenação de pesquisa/);card.onclick!();await settle();assert.ok(h.requests.includes('/agents/atlas/profile'));assert.equal(h.ids.get('#profile')!.dataset.terminal,'false');
});
test('three workstation screen surfaces open separate read views with floating terminal and return focus',async()=>{
 const h=harness();await settle();const office=h.ids.get('#office')!,central=office.children.find(e=>e.dataset.station==='atlas')!,left=office.children.find(e=>e.dataset.stationScreen==='atlas:left')!,right=office.children.find(e=>e.dataset.stationScreen==='atlas:right')!;
 central.onclick!();await settle();assert.equal(h.ids.get('#profile')!.dataset.terminal,'true');h.ids.get('#profile')!.close();(h.context.document as any).activeElement=left;left.onclick!();assert.equal(h.ids.get('#researchPanel')!.hidden,false);assert.equal(h.ids.get('#workspaceDialog')!.dataset.terminal,'true');h.ids.get('#workspaceDialog')!.close();assert.equal(left.focusCalls,1);right.onclick!();assert.equal(h.ids.get('#historyPanel')!.hidden,false);assert.ok(!h.requests.includes('/research/jobs')||h.requests.filter(p=>p==='/research/jobs').length<3);
});
test('scene display surfaces route data center to readiness and wall screens to existing panels',async()=>{
 const h=harness();await settle();h.ids.get('#sceneDataCenter')!.onclick!();assert.equal(h.ids.get('#accessPanel')!.hidden,false);assert.equal(h.ids.get('#workspaceDialog')!.dataset.terminal,'true');const wall=h.ids.get('#office')!.children.find(e=>e.dataset.sceneScreen==='risk-wall')!;wall.onclick!();assert.equal(h.ids.get('#researchPanel')!.hidden,false);assert.equal(h.ids.get('#office')!.children.filter(e=>e.dataset.sceneScreen).length,10);
});
test('market terminals draw only observed session prices and retain explicit stale status on failure',async()=>{
 const h=harness({},false,true);await settle();await vm.runInContext("observeTrace('mark',100,'2026-01-01T00:00:00Z');observeTrace('mark',101,'2026-01-01T00:00:01Z')",h.context);assert.match(flatten(h.ids.get('#markChart')!),/100.00 USDT/);assert.match(h.ids.get('#markChartStatus')!.textContent,/2 observações/);assert.ok(h.ids.get('#markChart')!.children.some(e=>e.attributes.role==='img'));await vm.runInContext("marketUnavailable('TEST_ONLY source unavailable')",h.context);assert.match(h.ids.get('#markChartStatus')!.textContent,/histórico desta sessão/);assert.ok(!h.requests.some(p=>p.includes('/orders')));
});
test('market chart spacing reflects actual timestamps and labels missing time without inventing it',async()=>{
 const h=harness({},false,true);await settle();vm.runInContext("observeTrace('mark',100,'2026-01-01T00:00:00Z');observeTrace('mark',101,'2026-01-01T00:00:01Z');observeTrace('mark',102,'2026-01-01T00:00:10Z')",h.context);
 const chart=h.ids.get('#markChart')!,svg=chart.children.find(e=>e.attributes.role==='img')!;assert.match(svg.children[0].attributes.points,/0.0,165.0 60.0,90.0 600.0,15.0/);assert.match(flatten(chart),/eixo por tempo observado/);
 vm.runInContext("observeTrace('mark',103,null)",h.context);assert.match(flatten(chart),/Horário indisponível/);assert.match(flatten(chart),/ordem de recebimento/);
});

test('research job cards expose original results and clear stale lifecycle on read failure',async()=>{
 const id='00000000-0000-4000-8000-000000000001',runId='00000000-0000-4000-8000-000000000002',responses:Record<string,unknown>={'/research/jobs':[{id,runId,status:'COMPLETED',limit:100,updatedAt:'2026-01-01T00:00:00Z'}]},h=harness(responses);await settle();
 assert.match(flatten(h.ids.get('#researchJobs')!),/Concluída/);assert.match(flatten(h.ids.get('#researchJobs')!),/100 candles/);buttons(h.ids.get('#researchJobs')!)[0].onclick!();await settle();assert.ok(h.requests.includes('/research/runs/'+runId));assert.ok(!h.requests.includes('/research/run'));
 (h.context.document as any).activeElement=buttons(h.ids.get('#researchJobs')!)[0];await vm.runInContext('refreshOnline()',h.context);assert.equal(buttons(h.ids.get('#researchJobs')!)[0].focusCalls,1);
 responses['/research/jobs']={httpError:401};await vm.runInContext('refreshOnline()',h.context);assert.match(flatten(h.ids.get('#researchJobs')!),/indisponíveis/);assert.doesNotMatch(flatten(h.ids.get('#researchJobs')!),/Concluída/);
});
const researchFixture=(id='TEST_ONLY_RESEARCH')=>({id,status:'REJECTED',startedAt:'2026-01-01T00:00:00Z',completedAt:'2026-01-01T00:01:00Z',findings:[{agentId:'vega',metric:'volatility',summary:'TEST_ONLY <script>source text</script>',values:{volatility:0.1}}],events:[{id:'TEST_ONLY_EVENT',type:'RESEARCH_COMPLETED'}],backtest:{netPnl:-10,trades:2}});
test('research detail reads actual retained evidence without scheduling work and preserves source text',async()=>{
 const run=researchFixture(),h=harness({['/research/runs/'+run.id]:run});await settle();
 await vm.runInContext(`researchDetails('${run.id}')`,h.context);
 const text=flatten(h.ids.get('#researchDetails')!);assert.match(text,/não representa tarefa atual/);assert.match(text,/fora da amostra/);assert.match(text,/<script>source text<\/script>/);assert.match(text,/TEST_ONLY_EVENT/);
 assert.ok(h.requests.includes('/research/runs/'+run.id));assert.ok(!h.requests.includes('/research/run'));
});
test('research failures remain failures with unavailable source coverage rather than invented results',async()=>{
 const run={...researchFixture(),status:'FAILED',findings:[],events:[],backtest:undefined,error:'TEST_ONLY_SOURCE_FAILURE'},h=harness({['/research/runs/'+run.id]:run});await settle();
 await vm.runInContext(`researchDetails('${run.id}')`,h.context);
 const text=flatten(h.ids.get('#researchDetails')!);assert.match(text,/TEST_ONLY_SOURCE_FAILURE/);assert.match(text,/Dataset não disponível/);assert.doesNotMatch(text,/Backtest histórico/);
});
test('research dataset provenance separates hourly spot history from USD-M context and rejects mismatches',async()=>{
 const run={...researchFixture(),dataset:{symbol:'BTCUSDT',interval:'1h',historyMarket:'BINANCE_SPOT',snapshotMarket:'BINANCE_USDM',hash:'a'.repeat(64),retrievedAt:'2026-01-01T00:00:00Z',candles:Array.from({length:64},(_,i)=>({timestamp:Date.parse('2025-12-29T00:00:00Z')+i*3600000}))}};
 const responses:Record<string,unknown>={['/research/runs/'+run.id]:run},h=harness(responses);await settle();await vm.runInContext(`researchDetails('${run.id}')`,h.context);
 const text=flatten(h.ids.get('#researchDetails')!);assert.match(text,/BINANCE_SPOT/);assert.match(text,/BINANCE_USDM/);assert.match(text,/64 candles fechados/);assert.match(text,/a{64}/);
 responses['/research/runs/'+run.id]={...run,dataset:{...run.dataset,historyMarket:'TEST_ONLY_OTHER'}};await vm.runInContext(`researchDetails('${run.id}')`,h.context);assert.equal(h.ids.get('#researchDetails')!.children.length,0);
});
test('research list retains backend newest-first order and dialog closing returns to a connected opener',async()=>{
 const h=harness({'/research/runs':[researchFixture('TEST_ONLY_NEW'),researchFixture('TEST_ONLY_OLD')]});await settle();
 const buttons=h.ids.get('#researchRuns')!.children.map(row=>row.children.at(-1)!);assert.equal(buttons[0]!.dataset.researchId,'TEST_ONLY_NEW');assert.equal(buttons[1]!.dataset.researchId,'TEST_ONLY_OLD');
 (h.context.document as any).activeElement=buttons[0];await vm.runInContext("researchDetails('TEST_ONLY_NEW')",h.context);h.ids.get('#researchDialog')!.close();assert.equal(buttons[0]!.focusCalls,1);
});
test('wrong-identity and unauthorized research responses clear previous detail and never use summary fallback',async()=>{
 const run=researchFixture(),responses:Record<string,unknown>={['/research/runs/'+run.id]:run},h=harness(responses);await settle();
 await vm.runInContext(`researchDetails('${run.id}')`,h.context);
 responses['/research/runs/'+run.id]={...run,id:'TEST_ONLY_OTHER'};await vm.runInContext(`researchDetails('${run.id}')`,h.context);assert.equal(h.ids.get('#researchDetails')!.children.length,0);
 responses['/research/runs/'+run.id]={httpError:401};await vm.runInContext(`researchDetails('${run.id}')`,h.context);assert.equal(h.ids.get('#researchDetails')!.children.length,0);assert.match(h.ids.get('#researchDetailStatus')!.textContent,/indisponível/);
});
test('late research responses cannot overwrite a newer selection or populate a closed dialog',async()=>{
 let finish!:(value:unknown)=>void;const pending=new Promise(resolve=>{finish=resolve}),next=researchFixture('TEST_ONLY_NEXT');
 const h=harness({'/research/runs/TEST_ONLY_PENDING':pending,['/research/runs/'+next.id]:next});await settle();
 const first=vm.runInContext("researchDetails('TEST_ONLY_PENDING')",h.context);await settle();await vm.runInContext(`researchDetails('${next.id}')`,h.context);finish(researchFixture('TEST_ONLY_PENDING'));await first;
 assert.match(flatten(h.ids.get('#researchDetails')!),/TEST_ONLY_NEXT/);assert.doesNotMatch(flatten(h.ids.get('#researchDetails')!),/TEST_ONLY_PENDING/);
 let done!:(value:unknown)=>void;const h2=harness({'/research/runs/TEST_ONLY_CLOSE':new Promise(resolve=>{done=resolve})});await settle();const request=vm.runInContext("researchDetails('TEST_ONLY_CLOSE')",h2.context);await settle();h2.ids.get('#researchDialog')!.close();done(researchFixture('TEST_ONLY_CLOSE'));await request;assert.equal(h2.ids.get('#researchDetails')!.children.length,0);
});
test('reference control areas open existing read panels without inventing agent rooms or scheduling work',async()=>{
 const h=harness();await settle();const before=[...h.requests];
 for(const [id,panel] of [['sceneDataCenter','accessPanel'],['sceneWarRoom','financePanel'],['sceneMarketAnalysis','marketPanel']]){
  h.ids.get('#'+id)!.onclick!();assert.equal(h.ids.get('#workspaceDialog')!.open,true);assert.equal(h.ids.get('#'+panel)!.hidden,false);h.ids.get('#workspaceDialog')!.close();
 }
 await settle();assert.deepEqual(h.requests,before);assert.equal(h.rooms.length,6);assert.equal(h.rooms[0].children[0].children[0].dataset.room,'Research Lab');
});
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
 h.ids.get('#office')!.rect={left:0,top:0,width:1852,height:849};agent.rect={left:174-36,top:299-98,width:72,height:98};
 (agent as any).animate=(frames:any,options:any)=>{const effect={frames,options,cancels:0,onfinish:undefined,cancel(){this.cancels++;}};animations.push(effect);return effect;};
 const actual={id:'atlas',name:'Atlas',room:'Quant Lab',status:'BACKTESTING',experience:3};
 h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_RECEIVED_STATE',type:'AGENT_STATE_CHANGED',occurredAt:new Date().toISOString(),payload:actual})});
 assert.equal(h.rooms[1].children[0].children[0],agent);assert.equal(agent.dataset.room,'Quant Lab');assert.equal(agent.dataset.status,'BACKTESTING');assert.equal(agent.dataset.travel,'recorded');assert.equal(animations.length,1);
 assert.match(flatten(h.ids.get('#agentList')!.children[0]),/Quant Lab/);assert.equal(h.ids.get('#activeAgents')!.textContent,'1 / 1');
 h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_NEW_STATUS',type:'AGENT_STATE_CHANGED',occurredAt:new Date().toISOString(),payload:{...actual,status:'IDLE'}})});
 animations[0].onfinish();assert.equal(agent.dataset.travel,undefined);assert.equal(animations[0].cancels,1);assert.equal(animations.length,1);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
 assert.ok(!h.requests.some(url=>url.includes('/orders')||url.includes('/ai/')));
});

test('stream disconnect and reduced motion stop travel without replay on a snapshot',async()=>{
 for(const reduce of [false,true]){
  const actual={id:'atlas',name:'Atlas',room:'Quant Lab',status:'IDLE',experience:0},overrides:any={};const h=harness(overrides,reduce);await settle();
  const agent=h.rooms[0].children[0].children[0];h.ids.get('#office')!.rect={left:0,top:0,width:1852,height:849};agent.rect={left:174-36,top:299-98,width:72,height:98};let plays=0,cancels=0;let animation:any;
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
 h.intervals.forEach(fn=>fn());await settle();assert.equal(agent.children.filter(c=>(c as any).className==='recorded-speech').length,1);assert.match(flatten(agent),/Hipótese → euler/);assert.equal(agent.dataset.status,'IDLE');
 // The header counts an agent with a recorded message in the last hour as active; the backend status is unchanged.
 assert.equal(h.ids.get('#activeAgents')!.textContent,'1 / 1');
 const original=agent.children.find(c=>(c as any).className==='recorded-speech');h.intervals.forEach(fn=>fn());await settle();assert.equal(agent.children.find(c=>(c as any).className==='recorded-speech'),original);
});
test('room communication refresh preserves focused participants and safely closes with the actual state unchanged',async()=>{
 const message={id:'focus-message',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'Original fixture',createdAt:'2026-01-01T00:00:00Z'},h=harness({'/agent-messages':[message]});await settle();h.ids.get('#openCollaboration')!.onclick!();await settle();
 const participant=buttons(h.ids.get('#roomMessages')!)[0];(h.context.document as any).activeElement=participant;h.intervals.forEach(fn=>fn());await settle();
 const updated=buttons(h.ids.get('#roomMessages')!)[0];assert.equal(updated.dataset.roomControl,participant.dataset.roomControl);assert.ok(updated.focusCalls>0);assert.match(flatten(h.ids.get('#roomMessages')!),/→/);h.ids.get('#closeRoom')!.onclick!();assert.equal(h.ids.get('#roomDialog')!.open,false);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');
});
test('reduced-motion preference disables presentation by default; only an explicit owner choice animates, without changing backend status',async()=>{
 const h=harness({},true);await settle();assert.equal(h.ids.get('#office')!.dataset.presence,'off');assert.equal(h.ids.get('#togglePresence')!.textContent,'Ativar animações');assert.equal((h.ids.get('#togglePresence') as any).disabled,false);assert.match(h.ids.get('#togglePresence')!.attributes.title,/movimento reduzido/);assert.equal(h.ids.get('#activeAgents')!.textContent,'0 / 1');assert.equal(h.rooms[0].children[0].children[0].dataset.status,'IDLE');
 h.ids.get('#togglePresence')!.onclick!();await settle();assert.equal(h.ids.get('#office')!.dataset.presence,'on');assert.equal(h.ids.get('#togglePresence')!.textContent,'Pausar animações');assert.equal(h.rooms[0].children[0].children[0].dataset.status,'IDLE');assert.ok(!h.requests.some(p=>/orders|jobs|studies/.test(p)&&!p.startsWith('/backtests/v2/studies')&&p!=='/research/jobs'));
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


test('station monitors follow streamed state, label past reasons and open existing real profiles without scheduling work',async()=>{
 const overrides:any={},h=harness(overrides);await settle();const actor=h.rooms[0].children[0].children[0],monitor=h.ids.get('#office')!.children.find(e=>e.dataset.station==='atlas')!;
 assert.equal(actor.dataset.pose,'seated');assert.match(flatten(monitor),/Sem tarefa/);const actual={id:'atlas',name:'Atlas',room:'Research Lab',status:'RESEARCHING',updatedAt:new Date().toISOString(),lastReason:'TEST_ONLY public dataset request',experience:1};
 overrides['/agents']=[actual];h.socket.onmessage({data:JSON.stringify({id:'TEST_ONLY_STATION_STATE',type:'AGENT_STATE_CHANGED',occurredAt:actual.updatedAt,payload:actual})});assert.match(flatten(monitor),/Pesquisando/);assert.equal(actor.dataset.pose,'seated');monitor.onclick!();await settle();assert.match(h.ids.get('#stationState')!.textContent,/Pesquisando/);assert.match(h.ids.get('#stationReason')!.textContent,/public dataset/);assert.equal(h.ids.get('#stationSource')!.children.length,1);assert.ok(h.requests.includes('/agents/atlas/profile'));assert.ok(!h.requests.includes('/research/run'));h.socket.onclose();assert.match(h.ids.get('#stationState')!.textContent,/desconectados/);
 vm.runInContext('Date.now = () => '+(Date.now()+20000),h.context);h.intervals[0]();assert.match(flatten(monitor),/Desatualizado/);
});

test('research outcomes distinguish recorded next-open costs from unversioned history without relabeling old evidence',async()=>{
 const rows=[{id:'TEST_ONLY_NEW',status:'REJECTED',completedAt:'2026-01-01',backtest:{trades:1,netPnl:-5,model:'SPOT_SMA_NEXT_OPEN_V2',feesPaid:20}},{id:'TEST_ONLY_OLD',status:'SCREEN_PASSED',completedAt:'2025-01-01',backtest:{trades:10,netPnl:123.45}}];
 const h=harness({'/research/runs':rows});await settle();const text=flatten(h.ids.get('#researchRuns')!);
 assert.match(text,/abertura seguinte/);assert.match(text,/20.00 USDT/);assert.match(text,/modelo e custos não versionados/);assert.match(text,/123.45 USDT/);
 assert.equal(rows[1]!.backtest.model,undefined);assert.ok(!h.requests.includes('/research/run'));
});

test('overview counts actual nonflat positions without mixing equity and expires its count on financial read failure',async()=>{
 const responses:Record<string,unknown>={'/finance':{legacyAccounts:[{id:'fund',kind:'FUND',initialCash:1000,portfolio:{equity:1000,positions:[{symbol:'BTCUSDT',quantity:1,averageEntry:100},{symbol:'ETHUSDT',quantity:0,averageEntry:0}]}}],perpetualAccounts:[{id:'evaluation:nova:usdm',kind:'EVALUATION',ownerAgentId:'nova',instrument:'BINANCE_USDM:BTCUSDT',initialCash:500,portfolio:{equity:500,positions:[{symbol:'BTCUSDT',quantity:-2,averageEntry:100}]}}]}};
 const h=harness(responses);await settle();assert.equal(h.ids.get('#openPositionCount')!.textContent,'2');
 responses['/finance']={httpError:503};await vm.runInContext('refreshOnline()',h.context);
 assert.equal(h.ids.get('#openPositionCount')!.textContent,'—');assert.ok(!h.requests.some(url=>url.includes('/orders')));
});
