// Original read-only workstation geometry and state projection; no execution capability.
(() => {
 const catalog=[
  {id:'atlas',room:'Research Lab',x:149,y:390,mx:150,my:287,cx:133,cy:342,cw:33,ch:30},
  {id:'satoshi',room:'Research Lab',x:270,y:390,mx:272,my:287,cx:253,cy:342,cw:34,ch:30},
  {id:'oracle',room:'Research Lab',x:390,y:390,mx:390,my:287,cx:373,cy:342,cw:34,ch:30},
  {id:'nova',room:'Trading Floor',x:611,y:392,mx:611,my:299,cx:594,cy:344,cw:35,ch:29},
  {id:'flux',room:'Trading Floor',x:928,y:392,mx:928,my:299,cx:911,cy:344,cw:35,ch:29},
  {id:'sentinel',room:'Risk Desk',x:1256,y:394,mx:1264,my:299,cx:1238,cy:346,cw:36,ch:30},
  {id:'euler',room:'Quant Lab',x:138,y:811,mx:145,my:702,cx:121,cy:763,cw:34,ch:32},
  {id:'vega',room:'Quant Lab',x:320,y:811,mx:321,my:703,cx:303,cy:763,cw:34,ch:32}
 ].map(s=>Object.freeze({...s,point:Object.freeze({x:s.x/1536*100,y:s.y/1024*100})}));Object.freeze(catalog);
 const labels={IDLE:'Sem tarefa',RESEARCHING:'Pesquisando',BACKTESTING:'Backtest',TRADING:'Paper',REVIEWING_RISK:'Risco',MEETING:'Reunião'};
 function seat(agent){return catalog.find(s=>s.id===agent?.id&&s.room===agent.room)||null;}
 function project(agent,{observedAt=0,connected=false,now=Date.now(),events=[]}={}){
  const valid=!!agent&&Object.hasOwn(labels,agent.status)&&Number.isFinite(Date.parse(agent.updatedAt));
  const fresh=valid&&Number.isFinite(observedAt)&&observedAt>0&&now>=observedAt&&now-observedAt<=15000;
  const original=valid?events.find(e=>e.type==='AGENT_STATE_CHANGED'&&typeof e.id==='string'&&e.id&&e.payload?.id===agent.id&&e.payload.updatedAt===agent.updatedAt&&e.payload.room===agent.room&&e.payload.status===agent.status&&e.payload.lastReason===agent.lastReason):null;
  return {label:!agent?'Sem ocupante':!fresh?'Desatualizado':labels[agent.status],fresh,
   mode:!fresh?'Estado indisponível ou desatualizado':connected?'Estado recebido · eventos conectados':'Snapshot recebido · eventos desconectados',
   reason:agent?.lastReason||'Nenhum motivo registrado',reasonLabel:agent?.status==='IDLE'?'Último motivo registrado (não é tarefa atual)':'Motivo do estado registrado',
   updatedAt:valid?agent.updatedAt:null,eventId:original?.id||null,active:fresh&&agent.status!=='IDLE'};
 }
 globalThis.OfficeWorkstations={catalog,seat,project};
})();
