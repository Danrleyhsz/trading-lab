// Original read-only workstation geometry and state projection; no execution capability.
(() => {
 const catalog=[
  {id:'atlas',room:'Research Lab',x:174,y:299,mx:174,my:196,cx:151,cy:237,cw:45,ch:38},
  {id:'satoshi',room:'Research Lab',x:346,y:299,mx:346,my:196,cx:323,cy:237,cw:45,ch:38},
  {id:'oracle',room:'Research Lab',x:519,y:299,mx:519,my:196,cx:496,cy:237,cw:45,ch:38},
  {id:'nova',room:'Trading Floor',x:760,y:300,mx:760,my:198,cx:738,cy:238,cw:48,ch:40},
  {id:'flux',room:'Trading Floor',x:1125,y:300,mx:1125,my:198,cx:1102,cy:238,cw:48,ch:40},
  {id:'sentinel',room:'Risk Desk',x:1442,y:300,mx:1442,my:194,cx:1416,cy:238,cw:48,ch:40},
  {id:'euler',room:'Quant Lab',x:204,y:543,mx:204,my:434,cx:180,cy:477,cw:45,ch:37},
  {id:'vega',room:'Quant Lab',x:406,y:543,mx:406,my:434,cx:383,cy:477,cw:47,ch:38}
 ].map(s=>globalThis.OfficeLayout?.seat(s)??s).map(s=>Object.freeze({...s,point:Object.freeze({x:s.x/OfficeNavigation.scene.width*100,y:s.y/OfficeNavigation.scene.height*100})}));Object.freeze(catalog);
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
