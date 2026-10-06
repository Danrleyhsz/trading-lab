// Escritório 2.0 (F1): câmera, foco por zona, barra de cima, agentes e painel. Dados só de rotas GET autenticadas;
// sem dado, o elemento diz "sem dado" (UNKNOWN). Passeios de agentes em pausa são cosméticos e rotulados (STATIC).
(() => {
 const D=globalThis.document;if(!D)return;
 const $=s=>D.querySelector(s),el=(tag,cls,text)=>{const n=D.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 // Fonte prevista e fase de cada módulo (OFFICE_BACKEND_VISUAL_MAP.md). Na F1 os painéis ainda não leem esses dados.
 const MODULES={
  MAIN_FLOOR:{name:'Entrada e visão geral',phase:'F1',truth:'REAL',sources:['/finance (equity, P&L do dia, posições)']},
  MARKET_HORIZON:{name:'Horizon · inteligência de mercado',phase:'F5',truth:'REAL',sources:['/market/v3','/market/panorama','/market/venues (referência)']},
  DECISION_RING:{name:'Anel de decisão',phase:'F2',truth:'REAL',sources:['/paper/perpetual/pilot/receipts (fichas de decisão)']},
  PAPER_EXECUTION:{name:'Execução paper',phase:'F2',truth:'REAL',sources:['/paper/perpetual/accounts','/audit/events?type=PAPER_FILL']},
  RISK_CONTROL:{name:'Gestão de risco',phase:'F4',truth:'REAL',sources:['/finance (checagens)','/paper/perpetual/status (kill switch)']},
  NEXUS:{name:'Nexus · comunicação',phase:'F4',truth:'REAL',sources:['/agent-messages','/agents']},
  DIAGNOSTICS:{name:'Diagnóstico · linha do tempo',phase:'F4',truth:'REAL',sources:['/paper/perpetual/pilot/parity','/runtime/readiness']},
  STRESS_LAB:{name:'Stress Lab · testes',phase:'F3',truth:'SIMULATION',sources:['relatório STRESS_LAB_V1 (rota de leitura na F3)']},
  BACKTEST:{name:'Backtest · experimentos',phase:'F3',truth:'SIMULATION',sources:['/backtests/v2/studies']},
  AUDIT_LOGS:{name:'Auditoria · registros',phase:'F4',truth:'REAL',sources:['/paper/perpetual/pilot/receipts','/audit/events']},
  IDLE_LOUNGE:{name:'Lazer',phase:'F1',truth:'STATIC',sources:['passeios cosméticos rotulados']},
  PANORAMIC_EDGE:{name:'Borda panorâmica',phase:'F1',truth:'STATIC',sources:['decoração']},
 };
 const STATUS={IDLE:'parado',RESEARCHING:'pesquisando',BACKTESTING:'testando',TRADING:'operando (paper)',REVIEWING_RISK:'revisando risco',MEETING:'em reunião'};
 const state={map:null,iso:null,scene:null,cache:null,agents:new Map(),session:null,market:null,focus:null,camera:{x:0,y:0,s:1},target:null,anim:null,hidden:false};
 const viewport=$('#viewport'),canvas=$('#scene'),ctx=canvas.getContext('2d'),labels=$('#labels'),panel=$('#panel');
 const loadImage=src=>{const img=new Image();img.decoding='async';img.src=src;return img;};
 const charImages={},images={props:{}};
 async function get(path){try{const r=await fetch(path,{credentials:'same-origin',headers:{accept:'application/json'}});if(!r.ok)return {ok:false,status:r.status};return {ok:true,body:await r.json()};}catch{return {ok:false,status:0};}}

 // ---------- câmera ----------
 function overview(){const {w,h}=state.map.projection.scene,vw=viewport.clientWidth,vh=viewport.clientHeight,s=Math.min(vw/w,vh/h);return {s,x:(vw-w*s)/2,y:(vh-h*s)/2};}
 function roomCamera(room){
  const t=room.tiles,pts=[[t.i0,t.j0],[t.i1,t.j0],[t.i1,t.j1],[t.i0,t.j1]].map(([i,j])=>state.iso.project(i,j));
  const cx=(Math.min(...pts.map(p=>p.x))+Math.max(...pts.map(p=>p.x)))/2,cy=(Math.min(...pts.map(p=>p.y))+Math.max(...pts.map(p=>p.y)))/2-24;
  const vw=viewport.clientWidth,vh=viewport.clientHeight,s=vw<900?Math.max(1,Math.floor(overview().s*2)):2;return {s,x:vw/2-cx*s,y:vh/2-cy*s};
 }
 function moveCamera(to){if(reduced){state.camera=to;return;}const from={...state.camera},start=performance.now();state.anim={from,to,start};}
 function stepCamera(now){const a=state.anim;if(!a)return;const t=Math.min(1,(now-a.start)/320),e=1-Math.pow(1-t,3);
  state.camera={s:a.from.s+(a.to.s-a.from.s)*e,x:a.from.x+(a.to.x-a.from.x)*e,y:a.from.y+(a.to.y-a.from.y)*e};if(t>=1)state.anim=null;}
 function resize(){const dpr=globalThis.devicePixelRatio||1;canvas.width=Math.round(viewport.clientWidth*dpr);canvas.height=Math.round(viewport.clientHeight*dpr);canvas.style.width=viewport.clientWidth+'px';canvas.style.height=viewport.clientHeight+'px';
  state.camera=state.focus?roomCamera(state.focus):overview();state.anim=null;}

 // ---------- zonas ----------
 function focusRoom(room){
  state.focus=room;moveCamera(room?roomCamera(room):overview());
  for(const b of D.querySelectorAll('[data-room]'))b.setAttribute('aria-current',String(!!room&&b.dataset.room===room.id));
  renderPanel();
 }
 function renderPanel(){
  panel.replaceChildren();const room=state.focus;panel.hidden=!room;if(!room)return;
  const mods=[room.module,...(room.subzones??[]).map(s=>s.module)].filter((m,k,a)=>a.indexOf(m)===k);
  const head=el('header');head.append(el('h2','',room.label),Object.assign(el('button','ghost','Visão geral'),{type:'button',onclick:()=>focusRoom(null)}));panel.append(head);
  for(const m of mods){const info=MODULES[m];const box=el('section','module');box.append(el('h3','',info.name));
   const chip=el('span','truth',info.truth);chip.dataset.truth=info.truth;box.append(chip);
   const list=el('ul');for(const s of info.sources)list.append(el('li','',s));box.append(el('p','muted','Fonte prevista:'),list);
   box.append(el('p','muted',info.phase==='F1'?'Sem painel de dados: área de ambiente.':'Painel com dados entra na fase '+info.phase+'. Até lá, as telas desta zona ficam apagadas (sem dado).'));panel.append(box);}
  const screens=state.map.screens.filter(s=>s.room===room.id);
  if(screens.length){const box=el('section','module');box.append(el('h3','','Telas'));const ul=el('ul');for(const s of screens){const li=el('li','',s.id+' · ');const chip=el('span','truth','UNKNOWN');chip.dataset.truth='UNKNOWN';li.append(chip,D.createTextNode(' sem dado (fase '+MODULES[s.module].phase+')'));ul.append(li);}box.append(ul);panel.append(box);}
  const here=[...state.agents.values()].filter(a=>state.iso.roomAt(Math.round(a.pos.i),Math.round(a.pos.j))?.id===room.id);
  const box=el('section','module');box.append(el('h3','','Agentes aqui'));
  if(!state.agentsReal)box.append(el('p','muted','Sem dado de agentes (sem acesso ou rota indisponível).'));
  else if(!here.length)box.append(el('p','muted','Nenhum agente nesta zona agora.'));
  else{const ul=el('ul');for(const a of here){const li=el('li','',a.name+' · '+(a.pause?'pausa (cosmético)':STATUS[a.status]??a.status));li.dataset.truth=a.pause?'STATIC':'REAL';ul.append(li);}box.append(ul);}
  panel.append(box);
 }

 // ---------- agentes ----------
 const workPoint=id=>state.map.points.find(p=>p.agent===id);
 function syncAgents(list){
  const seen=new Set();
  for(const a of list){const wp=workPoint(a.id);if(!wp)continue;seen.add(a.id);
   let ag=state.agents.get(a.id);
   if(!ag){const rnd=Office2Iso.prng([...a.id].reduce((s,c)=>s*31+c.charCodeAt(0),7));ag={id:a.id,name:a.name,rnd,pos:{...wp.tile},home:wp,dir:wp.facing,mode:'idle',step:0,path:[],pause:null,nextPause:performance.now()+20000+rnd()*40000};state.agents.set(a.id,ag);ag.plate=el('div','plate');labels.append(ag.plate);}
   ag.name=a.name;ag.status=a.status;ag.reason=a.lastReason;
  }
  for(const [id,ag] of state.agents)if(!seen.has(id)){ag.plate.remove();state.agents.delete(id);}
 }
 function occupied(except){return [...state.agents.values()].filter(a=>a!==except).map(a=>({i:Math.round(a.pos.i),j:Math.round(a.pos.j)}));}
 function walkTo(ag,goal){const from={i:Math.round(ag.pos.i),j:Math.round(ag.pos.j)};const path=state.iso.plan(from,goal,occupied(ag));if(path.length>1){ag.path=path.slice(1);ag.mode='walk';ag.legStart=performance.now();ag.legFrom={...from};return true;}return false;}
 const idlePoints=()=>state.map.points.filter(p=>p.kind==='IDLE');
 function tickAgent(ag,now){
  const atHome=Math.round(ag.pos.i)===ag.home.tile.i&&Math.round(ag.pos.j)===ag.home.tile.j&&!ag.path.length;
  // Trabalho real (status ≠ IDLE): sentado no posto, sem passeio.
  if(ag.status!=='IDLE'){if(!atHome&&!ag.path.length)walkTo(ag,ag.home.tile);else if(atHome){ag.mode='seated';ag.dir=ag.home.facing;ag.pause=null;}}
  else if(!reduced&&!ag.path.length){
   if(ag.pause&&now>ag.pause.until){ag.pause=null;walkTo(ag,ag.home.tile);ag.nextPause=now+40000+ag.rnd()*60000;}
   else if(!ag.pause&&atHome&&now>ag.nextPause){const free=idlePoints().filter(p=>!occupied(ag).some(o=>o.i===p.tile.i&&o.j===p.tile.j));const pick=free[Math.floor(ag.rnd()*free.length)];
    if(pick&&walkTo(ag,pick.tile))ag.pause={point:pick.id,until:Infinity};else ag.nextPause=now+30000;}
   else if(atHome){ag.mode='idle';ag.dir=ag.home.facing;}
  }
  if(ag.path.length){const next=ag.path[0],t=Math.min(1,(now-ag.legStart)/400);ag.dir=state.iso.direction(ag.legFrom,next);ag.mode='walk';ag.step=Math.floor(now/125);
   ag.pos={i:ag.legFrom.i+(next.i-ag.legFrom.i)*t,j:ag.legFrom.j+(next.j-ag.legFrom.j)*t};
   if(t>=1){ag.path.shift();ag.legFrom={...next};ag.legStart=now;if(!ag.path.length){ag.mode='idle';if(ag.pause&&ag.pause.until===Infinity)ag.pause.until=now+20000+ag.rnd()*20000;}}}
 }
 function placePlate(ag){ag.plate.hidden=tiny();const c=state.camera,p=state.iso.project(ag.pos.i+0.5,ag.pos.j+0.5,state.map.projection.personHeightPx+10);
  ag.plate.style.transform=`translate(${Math.round(p.x*c.s+c.x)}px,${Math.round(p.y*c.s+c.y)}px) translate(-50%,-100%)`;
  const label=ag.name+(ag.pause?' · pausa':'');if(ag.plate.textContent!==label)ag.plate.textContent=label;ag.plate.dataset.truth=ag.pause?'STATIC':'REAL';}

 // ---------- rótulos das zonas (L7) ----------
 const zoneLabels=[];
 function buildZoneLabels(){for(const r of state.map.rooms){if(r.module==='PANORAMIC_EDGE'&&r.outdoor&&r.id==='terraco-norte')continue;const n=el('button','zone-label',r.label);n.type='button';n.dataset.truth='STATIC';n.onclick=()=>focusRoom(r);labels.append(n);
   const brand=r.edges?.j0==='parede-marca';if(brand){const b=el('div','brand','TRADINGLAB');b.dataset.truth='STATIC';labels.append(b);zoneLabels.push({node:b,room:r,brand:true});}
   zoneLabels.push({node:n,room:r});}}
 // Abaixo de 0,45 (celular na visão geral) os rótulos se sobrepõem: some o texto e a navegação fica na barra.
const tiny=()=>state.camera.s<0.45;
function placeZoneLabels(){const c=state.camera;for(const z of zoneLabels){z.node.hidden=tiny();const t=z.room.tiles,mid=state.iso.project((t.i0+t.i1)/2,t.j0,z.brand?56:80);z.node.style.transform=`translate(${Math.round(mid.x*c.s+c.x)}px,${Math.round(mid.y*c.s+c.y)}px) translate(-50%,-100%)`;z.node.style.fontSize=Math.max(10,Math.min(16,11*c.s))+'px';}}

 // ---------- barra de cima ----------
 function clock(){const now=new Date();$('#clockDate').textContent=now.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});$('#clockTime').textContent=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
 function chip(node,text,truth){node.textContent=text;node.dataset.truth=truth;}
 async function refresh(){
  const auth=await get('/auth/status');
  if(!auth.ok)chip($('#session'),'sessão: sem dado','UNKNOWN');else chip($('#session'),auth.body.authenticated?'acesso completo':auth.body.required?'sem acesso: entrar pelo escritório atual':'acesso aberto (desenvolvimento)',auth.body.authenticated||!auth.body.required?'REAL':'UNKNOWN');
  const agents=await get('/agents');
  state.agentsReal=agents.ok&&Array.isArray(agents.body);
  if(state.agentsReal)syncAgents(agents.body);else syncAgents([]);
  $('#agentsStatus').hidden=state.agentsReal;
  const status=await get('/paper/perpetual/status');
  if(status.ok)chip($('#market'),status.body.marketReady?'mercado 24/7 · cotação fresca':'cotação sem dado fresco',status.body.marketReady?'REAL':'UNKNOWN');else chip($('#market'),'mercado: sem dado','UNKNOWN');
  if(state.focus)renderPanel();
 }

 // ---------- laço ----------
 function frame(now){
  if(state.hidden)return;stepCamera(now);
  for(const ag of state.agents.values())tickAgent(ag,now);
  const dpr=globalThis.devicePixelRatio||1,c=state.camera;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0b1426';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=false;ctx.setTransform(c.s*dpr,0,0,c.s*dpr,c.x*dpr,c.y*dpr);
  state.scene.draw(ctx,state.cache,[...state.agents.values()],globalThis.OfficeSpriteSheets,charImages);
  for(const ag of state.agents.values())placePlate(ag);placeZoneLabels();
  requestAnimationFrame(frame);
 }
 function onClick(ev){const r=canvas.getBoundingClientRect(),c=state.camera,x=(ev.clientX-r.left-c.x)/c.s,y=(ev.clientY-r.top-c.y)/c.s;const t=state.iso.tileAt(x,y);const room=t&&state.iso.roomAt(t.i,t.j);if(room)focusRoom(room);else if(state.focus)focusRoom(null);}

 async function start(){
  const res=await get('/office2/scene-map.json');if(!res.ok){$('#agentsStatus').hidden=false;$('#agentsStatus').textContent='Mapa da cena indisponível.';return;}
  state.map=res.body;state.iso=Office2Iso.create(state.map);
  for(const id of Object.keys(globalThis.OfficeSpriteSheets??{}))charImages[id]=loadImage('/office/characters/'+id+'.png');
  state.scene=Office2Scene.create(state.map,state.iso,images);state.cache=state.scene.renderStatic(2);
  buildZoneLabels();resize();
  for(const b of D.querySelectorAll('[data-room]'))b.addEventListener('click',()=>{const id=b.dataset.room;focusRoom(id?state.map.rooms.find(r=>r.id===id):null);});
  $('#moreZones').addEventListener('change',e=>{const r=state.map.rooms.find(x=>x.id===e.target.value);if(r)focusRoom(r);e.target.value='';});
  canvas.addEventListener('click',onClick);
  D.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.focus)focusRoom(null);});
  // O painel abre e fecha ao lado da cena: o tamanho da área da cena é observado, não só o da janela.
  if(globalThis.ResizeObserver)new ResizeObserver(()=>resize()).observe(viewport);else globalThis.addEventListener('resize',resize);
  D.addEventListener('visibilitychange',()=>{state.hidden=D.hidden;if(!D.hidden)requestAnimationFrame(frame);});
  clock();setInterval(clock,15000);await refresh();setInterval(refresh,15000);
  requestAnimationFrame(frame);
 }
 globalThis.Office2={state,focusRoom,MODULES};
 start();
})();
