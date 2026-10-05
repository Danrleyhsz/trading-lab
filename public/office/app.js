const traces = {spot:[],mark:[]};
function observeTrace(source, price, timestamp) {
  if (!Number.isFinite(price) || price <= 0) return;
  const series = traces[source], time = timestamp ? new Date(timestamp).getTime() : NaN;
  if (series.length && ((Number.isFinite(time) && time <= series[series.length-1].time) || (!Number.isFinite(time) && price === series[series.length-1].price))) return;
  series.push({price,time});if (series.length > 90) series.shift();
  renderMarketChart(source);
  const host = q(source === 'spot' ? '#spotTrace' : '#markTrace');host.replaceChildren();
  if (series.length < 2) {host.textContent = 'Aguardando mais observações';return;}
  host.textContent = '';
  const low = Math.min(...series.map(p=>p.price)), high = Math.max(...series.map(p=>p.price));
  const points = series.map((p,index)=>(index*300/(series.length-1)).toFixed(1)+','+(33-(p.price-low)/(high-low||1)*28).toFixed(1)).join(' ');
  if (!document.createElementNS) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 300 38');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const line = document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',points);line.setAttribute('fill','none');line.setAttribute('stroke','#18dba0');line.setAttribute('stroke-width','2');svg.append(line);host.append(svg);
}
function marketUnavailable(reason) {
  screens.update({quote:null});
  q('#marketV3').textContent = reason;q('#markPrice').textContent = 'Indisponível';q('#fundingRate').textContent = '—';q('#spreadQuote').textContent = '—';q('#quoteTime').textContent = reason;
  q('#markChartStatus').textContent=reason+' · o traçado abaixo é histórico desta sessão.';
}
function renderMarketChart(source){
 const host=q(source==='spot'?'#spotChart':'#markChart'),status=q(source==='spot'?'#spotChartStatus':'#markChartStatus'),series=traces[source];host.replaceChildren();
 status.textContent=series.length+' observações recebidas nesta sessão · sem histórico simulado';
 if(series.length<2){host.append(node('p','Aguardando duas observações reais para desenhar o traçado.'));return;}
 const low=Math.min(...series.map(p=>p.price)),high=Math.max(...series.map(p=>p.price));
 const span=series[series.length-1].time-series[0].time, timed=series.every(p=>Number.isFinite(p.time))&&span>0;
 host.append(node('small','Mínimo '+money(low)+' · máximo '+money(high)));
 host.append(node('small',timed?'Janela recebida: '+new Date(series[0].time).toLocaleTimeString()+' → '+new Date(series[series.length-1].time).toLocaleTimeString()+' · eixo por tempo observado':'Horário indisponível · eixo por ordem de recebimento'));
 if(!document.createElementNS)return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 600 180');svg.setAttribute('role','img');svg.setAttribute('aria-label','Traçado de preço '+(source==='spot'?'BTC spot':'BTC USD-M')+' observado nesta sessão, '+series.length+' amostras');
 const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',series.map((p,i)=>((timed?(p.time-series[0].time)/span:i/(series.length-1))*600).toFixed(1)+','+(165-(p.price-low)/(high-low||1)*150).toFixed(1)).join(' '));line.setAttribute('stroke',source==='spot'?'#ffcb62':'#35c9ff');line.setAttribute('stroke-width','2');line.setAttribute('fill','none');svg.append(line);host.append(svg);
}
function outcomeLabel(performance) {
  if (!performance?.available) return 'Métricas de operações indisponíveis';
  const s=performance.summary;
  return s.closedTrades + ' operações encerradas · acerto ' + (s.winRate===null?'indisponível':(s.winRate*100).toFixed(1)+'%');
}
function renderClosedTrades(accounts) {
  const host=q('#closedTrades');host.replaceChildren();
  if(!accounts.length){host.textContent='Nenhuma conta de avaliação atribuída.';return;}
  for(const account of accounts){
    const performance=account.performance,group=node('section','');
    group.append(node('b',account.accountId),node('p',outcomeLabel(performance)));
    if(performance?.available){
      for(const trade of [...performance.closedTrades].reverse()){
        const row=outcomeCard(trade);


        group.append(row);
      }
      if(!performance.closedTrades.length)group.append(node('p','Nenhuma operação completa registrada. Posições abertas não entram na taxa de acerto.'));
    } else group.append(node('p',performance?.reason || 'Evidências indisponíveis'));
    const browse=node('button','Navegar operações desta conta');browse.onclick=()=>openAccountAudit(account);group.append(browse);const link=node('a','Ver auditoria de operações (JSON)');
    link.setAttribute('href',(account.instrument==='BINANCE_USDM:BTCUSDT'?'/paper/perpetual/accounts/':'/paper/accounts/')+encodeURIComponent(account.accountId)+'/performance');
    group.append(link);host.append(group);
  }
}
function renderEquitySamples(card,account) {
  if(!account.samples?.length)return;
  const samples=account.samples.filter(sample=>Number.isFinite(sample.equity)&&Number.isFinite(sample.timestamp));
  card.append(node('small','Equity observada · amostras por minuto (até 24h)'));
  if(samples.length<2){card.append(node('small','Aguardando mais amostras'));return;}
  if(!document.createElementNS)return;
  const low=Math.min(...samples.map(s=>s.equity)),high=Math.max(...samples.map(s=>s.equity));
  const start=samples[0].timestamp,end=samples[samples.length-1].timestamp;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 300 80');svg.setAttribute('role','img');svg.setAttribute('aria-label','Equity observada de '+account.id+' de '+date(start)+' até '+date(end));svg.setAttribute('class','equity-trace');
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',samples.map(s=>((s.timestamp-start)/(end-start||1)*300).toFixed(1)+','+(74-(s.equity-low)/(high-low||1)*66).toFixed(1)).join(' '));line.setAttribute('stroke','#35c9ff');line.setAttribute('stroke-width','2');line.setAttribute('fill','none');svg.append(line);card.append(svg);
}
function renderFinancialOverview(data) {
  const all = [...(data.legacyAccounts || []), ...(data.perpetualAccounts || [])];
  const positions = q('#positions'), performance = q('#performance');positions.replaceChildren();performance.replaceChildren();
  const quote=screens.state.quote,mark=quote&&Date.now()-quote.markTime<=15000?quote.markPrice:null;
  const positionRows=[],performanceRows=[];
  for (const account of all) {
    const name = account.kind === 'FUND' ? 'Fundo' : (agents.get(account.ownerAgentId)?.name || account.ownerAgentId || account.id);
    const usdm = account.instrument === 'BINANCE_USDM:BTCUSDT';
    for (const position of account.portfolio.positions || []) {
      if (!Number.isFinite(position.quantity) || position.quantity === 0) continue;
      const long=position.quantity>0,current=usdm?mark:null,move=current&&position.averageEntry>0?(current/position.averageEntry-1)*(long?1:-1):null;
      const row=node('tr',''),asset=cell(usdm?'BTC-PERP':position.symbol);asset.append(node('small',' · '+name+(account.valuationFresh === false ? ' · avaliação desatualizada' : '')));
      row.append(asset,cell(long?'LONG':'SHORT',long?'up':'down'),cell(fmtBr(position.averageEntry)),cell(current?fmtBr(current):'—'),cell(pctBr(move),move===null?'':move>=0?'up':'down'),cell(fmtBr(Math.abs(position.quantity),4)+' BTC'));
      positionRows.push(row);
    }
    if (account.kind !== 'FUND') {
      const s=account.performance?.summary,winRate=account.performance?.available&&s?.winRate!==null&&s?.winRate!==undefined?s.winRate:null,change=account.portfolio.equity/account.initialCash-1;
      const row=node('tr',''),who=cell(name);who.dataset.agent=account.ownerAgentId||'';
      const bar=node('span','');bar.className='win-bar';bar.setAttribute('style','--win:'+(winRate===null?0:Math.round(winRate*100)));bar.dataset.tone=winRate===null?'none':winRate>=0.5?'up':'down';
      const rate=cell(winRate===null?'—':fmtBr(winRate*100,1)+'%');rate.append(bar);
      row.append(who,cell(fmtBr(account.portfolio.equity)+(account.valuationFresh === false ? ' *' : '')),cell(pctBr(change),change>=0?'up':'down'),cell(String(s?.closedTrades??0)),rate);
      row.title=outcomeLabel(account.performance);row.dataset.change=String(change);performanceRows.push(row);
    }
  }
  performanceRows.sort((a,b)=>Number(b.dataset.change)-Number(a.dataset.change));
  q('#openPositionCount').textContent=String(positionRows.length);if(q('#positionsCount'))q('#positionsCount').textContent='('+positionRows.length+')';
  if (!positionRows.length) {positions.textContent = 'Nenhuma posição aberta registrada.';positions.className='empty-state';} else {positions.className='table-host';positions.append(tableOf(['Ativo','Direção','Entrada','Preço Atual','P&L','Tamanho'],positionRows));}
  if (!performanceRows.length) {performance.textContent = 'Contas de avaliação ainda não configuradas.';performance.className='empty-state';} else {performance.className='table-host';performance.append(tableOf(['Agente','Capital','P&L','Trades','Win Rate'],performanceRows));}
}
let terminalOpener=null;
function openPanel(panel, title, navId) { stopPresence();terminalOpener=document.activeElement;
  q('#workspaceDialog').dataset.terminal='false';
  for (const id of ['agentsPanel','financePanel','operationsPanel','marketPanel','researchPanel','memoryPanel','historyPanel','accessPanel']) if(q('#'+id))q('#'+id).hidden = id !== panel;
  q('#workspaceTitle').textContent = title;
  for (const id of ['navOffice','navAgents','navFinance','navMarket','navResearch','navHistory','navAccess']) {
    if(!q('#'+id))continue;q('#'+id).className = 'nav' + (id === navId ? ' active' : '');
    q('#'+id).setAttribute('aria-current', id === navId ? 'page' : 'false');
  }
  q('#workspaceDialog').showModal();
}
const agents = new Map(), events = [];
let selected, profileOpener, profileVersion = 0, busy = false, stateVersion = 0, marketVersion = 0;
const spriteIds = ['atlas', 'euler', 'nova', 'sentinel', 'satoshi', 'flux', 'vega', 'oracle'];
const statusLabels = {IDLE:'Disponível', RESEARCHING:'Pesquisando', BACKTESTING:'Testando hipóteses', TRADING:'Execução paper', REVIEWING_RISK:'Avaliando risco', MEETING:'Em reunião'};
const roleLabels = {atlas:'Coordenação de pesquisa', euler:'Pesquisa quantitativa', nova:'Trader paper', sentinel:'Gestão de risco', satoshi:'Pesquisa de Bitcoin', flux:'Microestrutura de mercado', vega:'Pesquisa de volatilidade', oracle:'Regimes de mercado'};
function sprite(element,id,directional=false){OfficeSprites.paint(element,id,directional);}
const agentViews=new Map();let presenceEnabled=true;
const stationViews=new Map(),agentObservedAt=new Map();let stationConnected=false;
function stationProjection(agent){return OfficeWorkstations.project(agent,{observedAt:agentObservedAt.get(agent?.id)||0,connected:stationConnected,events});}
function renderStations(){
 for(const station of OfficeWorkstations.catalog){
  let view=stationViews.get(station.id);
  if(!view){
   const monitor=node('button',''),name=node('b',''),state=node('small',''),chair=node('span','');
   monitor.className='station-monitor';monitor.dataset.station=station.id;monitor.append(name,state);
   const {width,height}=OfficeNavigation.scene;
   monitor.setAttribute('style','left:'+station.mx/width*100+'%;top:'+(station.my-16)/height*100+'%');
   monitor.onclick=()=>{profile(station.id);q('#profile').dataset.terminal='true';};
   for(const [screen,offset] of [['left',-47],['right',47]]){
    const side=node('button','');side.className='station-monitor station-side';side.dataset.stationScreen=station.id+':'+screen;
    side.setAttribute('style','left:'+(station.mx+offset)/width*100+'%;top:'+(station.my-16)/height*100+'%');
    const action=screen==='right'?{panel:'historyPanel',title:'Registro geral de evidências',nav:'navHistory'}:station.room==='Trading Floor'?{panel:'marketPanel',title:'Terminal de mercado',nav:'navMarket'}:{panel:'researchPanel',title:'Bancada de pesquisa e risco',nav:'navResearch'};
    side.setAttribute('aria-label',station.id+' · '+action.title);side.setAttribute('title',action.title);side.onclick=()=>{openPanel(action.panel,action.title,action.nav);q('#workspaceDialog').dataset.terminal='true';};q('#office').append(side);
   }
   chair.className='station-chair'+(station.room==='Research Lab'?' research-chair':'');chair.setAttribute('aria-hidden','true');
   // Cenário modular: a cadeira é a peça própria apoiada no ponto do agente; na arte atual, um recorte do fundo.
   if(globalThis.OfficeCenario?.modular){const r=OfficeCenario.chairRect(station);chair.setAttribute('style','left:'+r.x/width*100+'%;top:'+r.y/height*100+'%;width:'+r.w/width*100+'%;height:'+r.h/height*100+'%');}
   else chair.setAttribute('style','left:'+station.cx/width*100+'%;top:'+station.cy/height*100+'%;width:'+station.cw/width*100+'%;height:'+station.ch/height*100+'%;background-position:-'+station.cx/width*100+'cqw -'+station.cy/width*100+'cqw');
   q('#office').append(monitor,chair);view={monitor,name,state,chair};stationViews.set(station.id,view);
  }
  const agent=agents.get(station.id),occupant=OfficeWorkstations.seat(agent),p=stationProjection(agent);
  view.name.textContent=agent?.name||station.id;view.state.textContent=!agent?'Sem dados':!occupant?'Em outra sala':p.label;
  view.monitor.dataset.active=String(!!occupant&&p.active);view.monitor.disabled=!agent;
  view.monitor.setAttribute('aria-label','Monitor de '+(agent?.name||station.id)+': '+view.state.textContent+'. Abrir estado e evidências');
  view.monitor.setAttribute('title',p.mode+' · '+(p.updatedAt?date(p.updatedAt):'Sem data')+' · '+p.reasonLabel+': '+p.reason);
  view.chair.hidden=!occupant;
 }
}

const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
// The owner may explicitly animate the office even when the operating system asks for reduced motion.
let motionChoice=(()=>{try{return globalThis.localStorage?.getItem('trading-lab.motion.v1')==='on'?'on':'system';}catch{return 'system';}})();
const systemReducesMotion=()=>!!reducedMotion?.matches&&motionChoice!=='on';
const motionAllowed=()=>document.body?.dataset?.editing!=="on"&&presenceEnabled&&!selectedHandoff&&!systemReducesMotion()&&!document.hidden&&!['#profile','#workspaceDialog','#roomDialog','#auditDialog','#studyDialog','#researchDialog','#screenDialog'].some(id=>q(id).open);
const presence=new OfficePresence.Director(motionAllowed);
const transitions=new OfficeTransitions.Director(motionAllowed,view=>presence.stop(view),view=>presence.update(view,view.agent,view.slot,view.host));
const screens=new OfficeScreens.Screens(q('#office'));
const life=new OfficeLife.Director({allowed:motionAllowed,bounds:()=>q('#office').getBoundingClientRect?.()});
function stopPresence(){q('#office').dataset.presence='off';for(const view of agentViews.values()){life.stop(view);transitions.stop(view);presence.stop(view);}}
/** Mensagem registrada mais recente do agente na última hora (mesma regra do contador "Agentes Ativos"). */
function recentWork(agent){if(!communicationReady)return null;const now=Date.now();return communications.filter(m=>m.from===agent.id&&now-Date.parse(m.createdAt)<=65*60000&&Date.parse(m.createdAt)<=now+60000).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0]??null;}
function render(movingEvent){
 const focusedAgent=document.activeElement?.dataset?.agentId,slots=new Map(),placements=new Map();q('#agentList').replaceChildren();
 for(const agent of agents.values()){const slot=slots.get(agent.room)||0;slots.set(agent.room,slot+1);placements.set(agent.id,slot);}
 for(const [id,view] of agentViews)if(!agents.has(id)){life.forget(view);transitions.stop(view);presence.forget(view);clearViewSpeech(view);view.button.remove();agentViews.delete(id);}
 for(const agent of agents.values()){
  let view=agentViews.get(agent.id);
  if(!view){
   const button=node('button',''),avatar=node('span',''),label=node('b',''),status=node('small',''),shadow=node('span','');
   button.className='agent';avatar.className='sprite';shadow.className='foot-shadow';avatar.setAttribute('aria-hidden','true');shadow.setAttribute('aria-hidden','true');sprite(avatar,agent.id,true);button.append(avatar,label,status,shadow);button.onclick=()=>globalThis.OfficeDashboard?OfficeDashboard.selectAgent(agent.id):profile(agent.id);
   view={button,avatar,label,status};agentViews.set(agent.id,view);
  }
  const from=view.agent?{room:view.agent.room,slot:view.slot,station:view.station}:null,wasTraveling=!!view.transitionRoute;
  const bounds=q('#office').getBoundingClientRect?.(),previous=view.button.getBoundingClientRect?.();
  const startPoint=from&&previous&&bounds?.width>0&&bounds?.height>0?{x:(previous.left+previous.width/2-bounds.left)/bounds.width*100,y:(previous.top+previous.height-bounds.top)/bounds.height*100}:undefined;
  const button=view.button;button.dataset.agentId=agent.id;button.dataset.status=agent.status;button.dataset.room=agent.room;view.label.textContent=agent.name;view.status.textContent=statusLabels[agent.status]||agent.status;
  button.setAttribute('aria-label',agent.name+', '+agent.room+', '+(statusLabels[agent.status]||agent.status));button.setAttribute('title',agent.lastReason||'Disponível; sem atividade registrada');
  const room=[...document.querySelectorAll('.room[data-room]')].find(element=>element.dataset.room===agent.room),host=room?.querySelector('.occupants')||q('#unmapped');
  const slot=placements.get(agent.id);view.station=OfficeWorkstations.seat(agent);
  const point=(view.station?OfficeTransitions.local(agent.room,view.station.point):OfficePresence.floorPoint(agent.room,slot))||{x:50,y:88};
  button.dataset.seated=String(!!view.station);button.dataset.stationScale=String(!!view.station||!!from?.station||wasTraveling);
  if(button.parentElement!==host)host.append(button);button.setAttribute('style','left:'+point.x+'%;top:'+point.y+'%');
  presence.update(view,agent,slot,host);life.update(view);
  const occupied=[];
  for(const other of agents.values())if(other.id!==agent.id){const anchor=OfficeWorkstations.seat(other)?.point||OfficeTransitions.anchor(other.room,placements.get(other.id));if(anchor)occupied.push(anchor);}
  for(const other of agentViews.values())if(other!==view){
   if(other.transitionRoute)occupied.push(...other.transitionRoute);
   else if(other.route)occupied.push(...other.route.map(p=>OfficeTransitions.world(other.agent.room,p)).filter(Boolean));
  }
  transitions.update(view,agent,slot,{from:wasTraveling?null:from,event:movingEvent?.payload?.id===agent.id?movingEvent:undefined,bounds,occupied,startPoint});
  if(agent.id===focusedAgent)button.focus?.({preventScroll:true});
  const row=node('button',''),portrait=node('span',''),copy=node('span','');row.className='agent-card';portrait.className='sprite roster-portrait';portrait.setAttribute('aria-hidden','true');sprite(portrait,agent.id);const image=node('img','');image.setAttribute('src','/office/agent-sprites.png');image.setAttribute('alt','');portrait.append(image);const work=recentWork(agent),state=agent.status!=='IDLE'?statusLabels[agent.status]||agent.status:work?'Ativo · '+ago(work.createdAt):statusLabels[agent.status]||agent.status;
  const doing=work?node('small','Último trabalho: '+((globalThis.OfficeLife?.text(work))||work.summary).slice(0,90)):node('small','Sem trabalho registrado na última hora');doing.className='agent-doing';if(work)doing.title=(globalThis.OfficeLife?.text(work))||work.summary;
  const stateNode=node('span',state);stateNode.dataset.active=String(agent.status!=='IDLE'||!!work);
  copy.append(node('b',agent.name),node('small',roleLabels[agent.id]||agent.role),stateNode,doing,node('small',agent.room));row.append(portrait,copy);row.setAttribute('aria-label',agent.name+' · '+agent.room+' · '+state+(work?' · '+work.summary:''));row.onclick=()=>profile(agent.id);q('#agentList').append(row);
 }
 q('#office').dataset.presence=motionAllowed()?'on':'off';
 q('#togglePresence').textContent=systemReducesMotion()?'Ativar animações':selectedHandoff?'Presença pausada':presenceEnabled?'Pausar animações':'Animar escritório';q('#togglePresence').disabled=!!selectedHandoff;q('#togglePresence').setAttribute('aria-pressed',String(presenceEnabled&&!selectedHandoff&&!systemReducesMotion()));
 q('#togglePresence').setAttribute('title',systemReducesMotion()?'Seu sistema pede movimento reduzido. Clique para animar o escritório mesmo assim.':'Animações são apenas visuais; não alteram trabalho nem resultados.');if(document.body)document.body.dataset.motion=motionChoice;
 renderLastWords();
 q('#activeAgents').textContent=[...agents.values()].filter(agent=>agent.status!=='IDLE'||recentWork(agent)).length+' / '+agents.size;
 renderStations();if(selected)renderState();if(inspectedRoom&&q('#roomDialog').open)renderRoom();renderHandoffs();
}
function renderState() {
  const agent = agents.get(selected);
  if (!agent) return;
  const station=stationProjection(agent);q('#stationState').textContent=station.label+' · '+station.mode+(station.updatedAt?' · '+date(station.updatedAt):'');q('#stationReason').textContent=station.reasonLabel+': '+station.reason;q('#stationSource').replaceChildren();if(station.eventId)q('#stationSource').append(sourceButton(station.eventId));else q('#stationSource').textContent='ID do evento deste estado não recebido nesta sessão. Consulte o histórico preservado abaixo.';
  q('#profileTitle').textContent = agent.name;sprite(q('#profilePortrait'),agent.id);
  q('#profileState').textContent = (roleLabels[agent.id] || agent.role) + ' · ' + agent.room + ' · ' + (statusLabels[agent.status] || agent.status);
  q('#experience').textContent = `Experiência: ${agent.experience} transições registradas`;
  q('#reason').textContent = (roleLabels[agent.id] ? roleLabels[agent.id] + ' · ' : '') + (agent.lastReason || 'Nenhum motivo de atividade registrado');
  q('#updated').textContent = 'Estado atualizado pelo backend: ' + date(agent.updatedAt);
}
async function profile(id) {
  q('#profile').dataset.terminal='false';
  profileOpener=document.activeElement;stopPresence();selected = id;
  q('#profile').showModal();
  renderState();
  await details();
}
function records(selector, items, renderRecord) {
  const host = q(selector);
  host.replaceChildren();
  if (!items.length) host.textContent = 'Nenhum registro disponível.';
  for (const item of [...items].reverse()) host.append(renderRecord(item));
}
async function details() {
  const id = selected, version = ++profileVersion;
  if (!id) return;
  const selectors = ['#memories', '#activity', '#career', '#history', '#closedTrades'];
  selectors.forEach(selector => q(selector).textContent = 'Carregando…');
  try {
    const result = await get('/agents/' + encodeURIComponent(id) + '/profile');
    if (version !== profileVersion || id !== selected) return;
    const evidence = result.evidence, coverage = result.coverage;renderClosedTrades(result.recentTrades || []);
    q('#perpetualProfile').textContent = (result.perpetualEvaluationAccounts || []).map(a => 'Avaliação perpétua: ' + money(a.portfolio.equity - a.initialCash) + ' P&L líquido · funding ' + money(a.fundingCashDelta) + ' · taxas ' + money(a.feesPaid) + ' · drawdown máximo observado ' + (a.maxDrawdown === null ? 'indisponível' : (a.maxDrawdown * 100).toFixed(2) + '%') + (a.valuationFresh ? '' : ' · avaliação desatualizada')).join(' | ');
    q('#career').textContent = `${evidence.observations} observações · ${evidence.decisions} decisões · ${evidence.failures} falhas · ${evidence.lessons} lições · ${evidence.sentMessages} mensagens enviadas. Estratégias estudadas: ${evidence.strategyIds.length}. ${result.evaluationAccounts?.length ? 'P&L líquido da avaliação: ' + money(result.performance.netPnl) + '. Taxas: ' + money(result.performance.feesPaid) + '. Fundo separado. Consulte as métricas de cada conta em operações encerradas.' : 'P&L individual, taxa de acerto e drawdown indisponíveis: sem conta de avaliação atribuída.'}`;
    q('#coverage').textContent = `${evidence.recordedTransitions} transições no histórico preservado. ${coverage.legacyTransitionsWithoutHistory} transições antigas não têm histórico detalhado. Histórico desde: ${coverage.activitySince ? date(coverage.activitySince) : 'nenhuma transição registrada'}.`;
    records('#memories', result.memories, memory => {
      const row = node('li', '');
      row.append(node('b', globalThis.OfficeI18n?OfficeI18n.kind(memory.kind):memory.kind), node('p', globalThis.OfficeI18n?OfficeI18n.text(memory.summary):memory.summary), node('small', date(memory.createdAt)));
      const strategyId = memory.strategyId || memory.metadata?.strategyId;
      if (strategyId) row.append(node('p', 'Estratégia: ' + strategyId));
      if (memory.tags?.length) row.append(node('p', memory.tags.join(' · ')));
      if (memory.confidence !== undefined) row.append(node('p', 'Confiança registrada: ' + memory.confidence));if(memory.sourceEventId)row.append(sourceButton(memory.sourceEventId));
      return row;
    });
    records('#activity', result.messages, message => {
      const row = node('li', '');
      row.append(node('b', message.kind), node('p', message.summary), node('p', `${message.from} → ${message.to.join(', ')}`), node('small', date(message.createdAt)));
      return row;
    });
    records('#history', result.activity, activity => {
      const row = node('li', '');
      row.append(node('b', `${activity.state.room} · ${activity.state.status}`), node('p', activity.state.lastReason || ''), node('small', date(activity.occurredAt)), sourceButton(activity.eventId));
      return row;
    });
  } catch {
    if (version !== profileVersion || id !== selected) return;
    selectors.forEach(selector => q(selector).textContent = 'Dados indisponíveis. Reabra para tentar novamente.');
    q('#coverage').textContent = '';
  }
}
q('#closeProfile').onclick = () => q('#profile').close();
q('#profile').addEventListener('close', () => { selected = undefined; profileVersion++; });
function renderAccounts(items) {
  const host = q('#accounts');
  host.replaceChildren();
  for (const account of items) {
    const row = node('li', '');
    row.append(node('b', account.kind === 'FUND' ? 'Fundo · portfólio paper oficial separado' : 'Avaliação · ' + account.ownerAgentId), node('p', 'Patrimônio: ' + money(account.portfolio.equity)), node('p', 'P&L líquido: ' + money(account.portfolio.equity - account.initialCash)), node('small', `${account.fills} fills registrados · Capital virtual inicial: ${money(account.initialCash)}`));
    host.append(row);
  }
  q('#accountScope').textContent = items.some(account => account.kind === 'EVALUATION') ? 'Avaliações legadas independentes. Os saldos não são somados ao patrimônio do fundo.' : 'Avaliações legadas não configuradas. As contas USD-M aparecem nos cards financeiros acima; o fundo permanece separado.';
}
async function refresh() {
  if (busy) return;
  busy = true;
  const initialStateVersion = stateVersion, initialMarketVersion = marketVersion;
  try {
    const [states, portfolio, market, accounts, runs] = await Promise.all([get('/agents'), get('/portfolio'), get('/market/latest'), get('/paper/accounts'), get('/research/runs')]);
    // A snapshot requested before a stream event must not move an agent back.
    if (initialStateVersion === stateVersion) {
      agents.clear();
      agentObservedAt.clear();states.forEach(agent => {agents.set(agent.id, agent);agentObservedAt.set(agent.id,Date.now());});
      render();
    }
    renderResearch(runs);renderAccounts(accounts);q('#equity').textContent = money(portfolio.equity);
    q('#pnl').textContent = money(portfolio.equity - portfolio.initialCash);
    if (initialMarketVersion === marketVersion) { q('#market').textContent = market.price ? market.symbol + ' ' + money(market.price) : 'Aguardando dados de mercado'; observeTrace('spot',market.price,market.timestamp); }
    q('#sync').textContent = 'Estado recebido às ' + new Date().toLocaleTimeString();
  } catch {
    agentObservedAt.clear();renderStations();if(selected)renderState();
    q('#sync').textContent = 'Sistema indisponível · dados exibidos podem estar desatualizados';q('#accountScope').textContent = 'Contas indisponíveis ou desatualizadas';
  } finally { busy = false; }
}
function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/events`);
  ws.onopen = () => { stationConnected=true;renderStations();q('#connection').textContent = '● Eventos conectados'; refresh(); if (selected) details(); };
  ws.onmessage = message => {
    let event;
    try { event = JSON.parse(message.data); } catch { return; }
    if (!event.id || !event.type) return;
    if (event.type === 'PERPETUAL_MARKET_UPDATED') { onlineVersion++; showPerpetualMarket({quote: event.payload, status: 'HEALTHY'}); refreshOnline(); return; }
    if (event.type === 'MARKET_DATA_FAILED') { onlineVersion++; marketUnavailable('USD-M indisponível · ordens paper bloqueadas'); runtimeUnavailable(); }
    if (event.type === 'MARKET_TICK') {
      marketVersion++;
      q('#market').textContent = event.payload.symbol + ' ' + money(event.payload.price);observeTrace('spot',event.payload.price,event.payload.timestamp);
      return;
    }
    if (events.some(item => item.id === event.id)) return;
    events.unshift(event);
    events.splice(50);
    renderSessionEvents();
    if (event.type === 'AGENT_STATE_CHANGED') {
      stateVersion++;
      agents.set(event.payload.id, event.payload);agentObservedAt.set(event.payload.id,Date.now());render(event);
    }
    refresh();
    if (selected) details();
  };
  ws.onerror = () => ws.close();
  ws.onclose = () => {
    stationConnected=false;renderStations();if(selected)renderState();stopPresence();
    q('#connection').textContent = 'Eventos desconectados · reconectando';
    setTimeout(connect, 3000);
  };
}
refresh();
setInterval(() => { renderStations();if(selected)renderState();refresh(); if (selected) details(); }, 5000);
connect();

// Equity series are heavy: fetch them once a minute and reuse them between the light polls.
let financeCalls=0;const financeSeries=new Map();
const financeUrl=()=>financeCalls++%12===0?'/finance':'/finance?series=none';
function withSeries(data){for(const account of data?.perpetualAccounts||[]){if(account.seriesOmitted){const cached=financeSeries.get(account.id);if(cached){account.samples=cached.samples;account.hourly=cached.hourly;}}else financeSeries.set(account.id,{samples:account.samples,hourly:account.hourly});}return data;}
let onlineBusy = false, onlineVersion = 0, halted = null, runtimeObservedAt = 0, preflightObservedAt = 0;
function showPerpetualMarket(market) {
  const quote = market.quote;
  if (market.status !== 'HEALTHY' || !quote || !Number.isFinite(quote.markTime) || Date.now()-quote.markTime > 15000) {
    marketUnavailable('USD-M indisponível ou desatualizado · ordens paper bloqueadas');return;
  }
  if (quote) {
    q('#markPrice').textContent = money(quote.markPrice);
    q('#fundingRate').textContent = Number.isFinite(quote.fundingRate) ? (quote.fundingRate * 100).toFixed(4) + '%' : '—';
    q('#spreadQuote').textContent = money(quote.bid) + ' / ' + money(quote.ask);
    q('#quoteTime').textContent = market.status + ' · ' + date(quote.markTime);
    observeTrace('mark', quote.markPrice, quote.markTime);screens.update({quote,trace:traces.mark.map(p=>p.price)});
  } else marketUnavailable('USD-M indisponível · ordens bloqueadas');
  q('#marketV3').textContent = quote ? `BTCUSDT perpetual · bid ${money(quote.bid)} · ask ${money(quote.ask)} · mark ${money(quote.markPrice)} · funding cotado ${(quote.fundingRate * 100).toFixed(4)}% · ${market.status}. Atualizado em ${date(quote.markTime)}` : 'USD-M indisponível · ordens paper bloqueadas';
}
function runtimeUnavailable() {
  runtimeObservedAt = 0;
  q('#runtimeStatus').textContent = 'Diagnóstico indisponível ou desatualizado · entre se o acesso for exigido';
  q('#runtimeDetails').replaceChildren();
  preflightUnavailable();
}
function renderRuntime(data) {
  const observed = Date.parse(data?.observedAt), phases = {STARTING:'Inicializando',SERVING:'Em serviço',DRAINING:'Encerrando',STOPPED:'Encerrado'};
  if (data?.mode!=='PAPER_TRADING' || !Number.isFinite(observed) || Date.now()-observed>15000 || observed>Date.now()+5000 || typeof data.controlPlaneReady!=='boolean' || !Object.hasOwn(phases,data.phase) || !['PRODUCTION','DEVELOPMENT'].includes(data.environment) || !data.storage || !['HEALTHY','UNAVAILABLE'].includes(data.market?.perpetual?.status) || typeof data.paper?.newExposure?.ready!=='boolean' || !Array.isArray(data.paper.newExposure.reasons) || typeof data.paper.autonomous?.ready!=='boolean' || typeof data.jobs?.research?.busy!=='boolean' || typeof data.jobs?.historical?.busy!=='boolean' || typeof data.ai?.enabled!=='boolean') {runtimeUnavailable();return;}
  runtimeObservedAt = observed;
  const reasons = {RUNTIME_STARTING:'Serviço inicializando',RUNTIME_DRAINING:'Serviço encerrando',RUNTIME_STOPPED:'Serviço encerrado',CLOCK_ROLLBACK:'Relógio do serviço recuou',STORAGE_UNAVAILABLE:'Banco indisponível',PERSISTENCE_FAILED:'Última gravação falhou',INITIAL_PERSISTENCE_PENDING:'Aguardando a primeira gravação',PRODUCTION_POSTGRESQL_REQUIRED:'Banco de produção pendente',PRODUCTION_ACCESS_REQUIRED:'Proteção de acesso pendente',PRODUCTION_HTTPS_REQUIRED:'Acesso seguro pendente',PERPETUAL_EXECUTION_DISABLED:'Execução paper desligada',PERPETUAL_SOURCE_UNAVAILABLE:'Dados perpétuos indisponíveis',BOOK_QUOTE_NOT_READY:'Cotação do livro indisponível',BOOK_PERSISTENCE_FAILED:'Gravação do livro falhou',FUNDING_RECONCILIATION_PENDING:'Funding aguardando conciliação',NEW_EXPOSURE_HALTED:'Novas exposições pausadas',NO_INDEPENDENT_ACCOUNTS:'Contas independentes não configuradas'};
  q('#runtimeStatus').textContent = phases[data.phase] + ' · ' + (data.controlPlaneReady?'Painel disponível':'Painel com impedimento') + ' · ' + (data.environment==='PRODUCTION'?'Ambiente de produção':'Ambiente de desenvolvimento');
  const host=q('#runtimeDetails');host.replaceChildren();
  const add=text=>host.append(node('li',text));
  add('Última gravação confirmada: ' + (data.storage.lastPersistedAt?date(data.storage.lastPersistedAt):'nenhuma neste processo'));
  if (Number.isSafeInteger(data.storage.pendingWrites)) add('Gravações aguardando: ' + data.storage.pendingWrites);
  add('Dados perpétuos: ' + (data.market.perpetual?.status==='HEALTHY'?'atuais':'indisponíveis'));
  add('Novas exposições paper: ' + (data.paper.newExposure.ready?'condições operacionais atendidas; aprovação do risco continua obrigatória':(data.paper.newExposure.reasons||[]).map(reason=>reasons[reason]||'Bloqueio adicional registrado').join(' · ')));
  add('Autonomia: ' + (data.paper.autonomous?.ready?'condições operacionais atendidas':'aguardando condições ou desligada'));
  add('Pesquisa: ' + (data.jobs.research?.busy?'em andamento':'sem tarefa em andamento') + ' · estudo histórico: ' + (data.jobs.historical?.busy?'em andamento':'sem tarefa em andamento'));
  add(data.ai.enabled?'IA habilitada para análise':'IA desligada · chamadas pagas desativadas');
  if (data.ai.heldMicrousd>0) add('Há reserva de orçamento de IA com custo ainda não esclarecido.');
  add('Hospedagem e backups exigem verificação externa. Execução exclusivamente paper; avaliações separadas do fundo.');
}
async function refreshOnline() {
  if (onlineBusy) return;onlineBusy = true;const version = onlineVersion;
  try {
    const results = await Promise.allSettled([get('/market/v3'), get(financeUrl()), get('/backtests/v2/studies'), get('/paper/perpetual/status'), get('/runtime/readiness'), get('/research/jobs'),get('/paper/perpetual/preflight')]);
    if (results[0].status === 'fulfilled' && version === onlineVersion) showPerpetualMarket(results[0].value);
    else if (results[0].status === 'rejected') marketUnavailable('Dados USD-M indisponíveis · preços podem estar desatualizados');
    if (results[1].status === 'fulfilled') {
      const data = withSeries(results[1].value), host = q('#finance');host.replaceChildren();renderFinancialOverview(data);screens.update({finance:data,names:agentNames()});
      for (const account of [...(data.legacyAccounts || []), ...(data.perpetualAccounts || [])]) {
        const card = node('article', '');const net = account.portfolio.equity - account.initialCash;
        card.append(node('h3', account.kind === 'FUND' ? 'Fundo · portfólio paper separado' : 'Avaliação · ' + account.ownerAgentId), node('p', account.instrument), node('p', 'Patrimônio: ' + money(account.portfolio.equity)), node('p', 'P&L líquido: ' + money(net)), node('p', 'Taxas: ' + money(account.feesPaid)), node('p', 'Funding: ' + money(account.fundingCashDelta)), node('p', 'Drawdown máximo observado: ' + (Number.isFinite(account.maxDrawdown) ? (account.maxDrawdown * 100).toFixed(2) + '%' : 'indisponível')));
        if (account.instrument === 'BINANCE_USDM:BTCUSDT') card.append(node('p', 'Margem: ' + money(account.initialMargin)), node('small', account.valuationFresh ? 'Avaliação atual por amostragem' : 'Avaliação indisponível ou desatualizada'));
        card.append(node('p',outcomeLabel(account.performance)));renderEquitySamples(card,account);if(account.id){const browse=node('button','Navegar operações desta conta');browse.onclick=()=>openAccountAudit(account);card.append(browse);}host.append(card);
      }
    } else { q('#finance').textContent = 'Dados financeiros indisponíveis · entre se o acesso for exigido';q('#openPositionCount').textContent='—';q('#positions').textContent = 'Posições indisponíveis ou desatualizadas';q('#performance').textContent = 'Contas indisponíveis ou desatualizadas'; }
    if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) records('#studyList', [...results[2].value].reverse(), study => { const li = node('li', '');const button = node('button', `${study.status} · ${date(study.createdAt)}${Number.isFinite(study.netPnl) ? ' · P&L histórico ' + money(study.netPnl) : ''}`);button.onclick = () => studyDetails(study.id);li.append(button);return li; });
    if (results[3].status === 'fulfilled') {
      const status = results[3].value;q('#riskSummary').textContent = 'Execução ' + (status.executionEnabled ? 'habilitada' : 'desligada') + ' · Autonomia ' + (status.autonomous?.enabled ? 'habilitada' : 'desligada') + (status.halted ? ' · Novas exposições pausadas' : '');halted = status.halted;q('#haltPaper').disabled = typeof halted !== 'boolean';q('#haltPaper').textContent = halted ? 'Retomar exposições paper permitidas' : 'Pausar novas exposições paper';
      q('#onlineStatus').textContent = `Execução perpétua ${status.executionEnabled ? 'habilitada' : 'desligada'} · nova exposição ${halted ? 'pausada' : 'sujeita ao risco'} · autonomia ${status.autonomous?.enabled ? 'habilitada' : 'desligada'} · ${status.autonomous?.reason || 'estado indisponível'}. Somente avaliação independente.`;
    } else { halted = null;q('#riskSummary').textContent = 'Estado de risco indisponível';q('#haltPaper').disabled = true;q('#onlineStatus').textContent = 'Controles indisponíveis · entre se o acesso for exigido'; }
    renderResearchJobs(results[5].status==='fulfilled' ? results[5].value : null);
    if (results[4].status==='fulfilled' && version===onlineVersion) {renderRuntime(results[4].value);screens.update({readiness:runtimeObservedAt?results[4].value:null});} else {runtimeUnavailable();screens.update({readiness:null});}
    if(results[6].status==='fulfilled'&&version===onlineVersion)renderPreflight(results[6].value);else preflightUnavailable();
  } finally { onlineBusy = false; }
}
q('#haltPaper').onclick = async () => {
  if (typeof halted !== 'boolean') return;q('#haltPaper').disabled = true;
  try { const response = await fetch('/paper/perpetual/halt', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({halted:!halted})});if (!response.ok) throw Error();await refreshOnline(); }
  catch { q('#onlineStatus').textContent = 'A alteração falhou. Confira o estado do sistema.'; }
};
q('#loginPanel').onclick = async () => {
  try { const response = await fetch('/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:q('#accessToken').value})});q('#accessToken').value = '';q('#loginStatus').textContent = response.ok ? 'Acesso autorizado' : 'Acesso recusado';if (response.ok) { await refresh();await refreshOnline(); } }
  catch { q('#loginStatus').textContent = 'Não foi possível acessar o laboratório'; }
};
refreshOnline();setInterval(() => {refreshOnline();if (!runtimeObservedAt || Date.now()-runtimeObservedAt>15000 || runtimeObservedAt>Date.now()+5000) runtimeUnavailable();if(!preflightObservedAt||Date.now()-preflightObservedAt>15000||preflightObservedAt>Date.now()+5000)preflightUnavailable();}, 5000);

q('#navOffice').onclick = () => q('#workspaceDialog').close();
q('#navAgents').onclick = () => openPanel('agentsPanel','Equipe do laboratório','navAgents');
q('#navFinance').onclick = () => openPanel('financePanel','Portfólio e contas','navFinance');
q('#navMarket').onclick = () => openPanel('marketPanel','Mercado observado','navMarket');
q('#navResearch').onclick = () => openPanel('researchPanel','Pesquisa, estudos e risco','navResearch');
q('#navAccess').onclick = () => openPanel('accessPanel','Acesso ao painel','navAccess');
q('#sceneDataCenter').onclick = () => openPanel('accessPanel','Data Center · estado do serviço','navAccess');
q('#sceneWarRoom').onclick = () => openPanel('financePanel','War Room · portfólio e contas','navFinance');
q('#sceneMarketAnalysis').onclick = () => openPanel('marketPanel','Análise de mercado','navMarket');
q('#openControls').onclick = q('#navResearch').onclick;
q('#closeWorkspace').onclick = () => q('#workspaceDialog').close();
q('#workspaceDialog').addEventListener('close', () => {
  for (const id of ['navOffice','navAgents','navFinance','navMarket','navResearch','navHistory','navAccess']) {q('#'+id).className = 'nav' + (id === 'navOffice' ? ' active' : '');q('#'+id).setAttribute('aria-current',id === 'navOffice' ? 'page' : 'false');}
});

let inspectedRoom=null,communicationVersion=0,communicationBusy=false,communicationReady=false;
let communications=[],seenCommunications=new Set(),selectedHandoff=null,handoffProfileFocus=null;
const messageKinds={HYPOTHESIS:'Hipótese',BACKTEST_RESULT:'Resultado de teste',RISK_REVIEW:'Revisão de risco',EXECUTION_PLAN:'Plano de execução',PORTFOLIO_DECISION:'Decisão de portfólio',RESEARCH_FINDING:'Achado de pesquisa',DEBATE:'Debate da equipe'};
const roomInfo={
 'Research Lab':{description:'Biblioteca e coordenação de hipóteses. Consulte evidências e pesquisas registradas.',action:'Abrir pesquisas',panel:'researchPanel',nav:'navResearch'},
 'Quant Lab':{description:'Bancada de testes históricos. Resultados positivos, negativos e falhas ficam preservados.',action:'Abrir estudos históricos',panel:'researchPanel',nav:'navResearch'},
 'Trading Floor':{description:'Mesas de execução paper. As contas de avaliação e o fundo possuem capital separado.',action:'Ver operações e contas',panel:'financePanel',nav:'navFinance'},
 'Risk Desk':{description:'Quadro de risco determinístico. Uma animação ou conversa não aprova uma ordem.',action:'Ver controles de risco',panel:'researchPanel',nav:'navResearch'},
 'Meeting Room':{description:'Mesa de colaboração. As mensagens abaixo são comunicações estruturadas realmente registradas.',action:'Ver equipe',panel:'agentsPanel',nav:'navAgents'},
 'Lounge':{description:'Área de convivência do cenário. Movimentos de presença são visuais e não alteram o trabalho ou a experiência.',action:'Ver equipe',panel:'agentsPanel',nav:'navAgents'}
};
function openRoom(room){if(!roomInfo[room])return;stopPresence();inspectedRoom=room;renderRoom();q('#roomDialog').showModal();refreshCommunications();}
function messageCard(message,controls=[]){
 const li=node('li',''),line=node('div','');line.className='message-participants';
 for(const [index,id] of [message.from,...message.to].entries()){if(index===1)line.append(node('span','→'));else if(index>1)line.append(node('span',','));const button=node('button',agents.get(id)?.name||id);button.dataset.agentId=id;button.dataset.roomControl='message:'+message.id+':'+index;button.onclick=()=>{q('#roomDialog').close();profile(id);};line.append(button);controls.push(button);}
 li.append(line,node('b',messageKinds[message.kind]),node('p',message.summary),node('small',date(message.createdAt)+' · '+message.id));const highlight=node('button','Destacar participantes no escritório');highlight.dataset.roomControl='highlight:'+message.id;highlight.onclick=()=>{q('#roomDialog').close();selectHandoff(message.id);};li.append(highlight);controls.push(highlight);return li;
}
function renderRoom(){
 const focused=document.activeElement?.dataset?.roomControl,controls=[];const room=inspectedRoom,info=roomInfo[room];if(!info)return;q('#roomTitle').textContent=room;q('#roomDescription').textContent=info.description;
 const people=q('#roomPeople');people.replaceChildren();const occupants=[...agents.values()].filter(a=>a.room===room);
 for(const agent of occupants){const button=node('button',''),portrait=node('span','');portrait.className='sprite';portrait.setAttribute('aria-hidden','true');sprite(portrait,agent.id);button.append(portrait,node('b',agent.name),node('small',statusLabels[agent.status]||agent.status));button.dataset.roomControl='person:'+agent.id;button.onclick=()=>{q('#roomDialog').close();profile(agent.id);};people.append(button);controls.push(button);}
 if(!occupants.length)people.textContent='Nenhum agente nesta sala no estado recebido.';
 const actions=q('#roomActions');actions.replaceChildren();const action=node('button',info.action);action.onclick=()=>{q('#roomDialog').close();openPanel(info.panel,info.action,info.nav);};action.dataset.roomControl='action';actions.append(action);controls.push(action);
 const objectHost=q('#roomObjects');objectHost.replaceChildren();for(const feature of OfficeNavigation.features.filter(f=>f.room===room)){const button=node('button',feature.label+' ↗');button.dataset.roomControl='object:'+feature.id;button.onclick=()=>openFurniture(feature.id);objectHost.append(button);controls.push(button);}
 const messages=room==='Meeting Room'?communications:communications.filter(m=>occupants.some(a=>a.id===m.from||m.to.includes(a.id)));
 const list=q('#roomMessages'),rows=messages.slice().reverse().map(message=>messageCard(message,controls));list.replaceChildren(...rows);if(focused&&q('#roomDialog').open)(controls.find(button=>button.dataset.roomControl===focused)||q('#closeRoom')).focus?.({preventScroll:true});
 q('#roomMessageStatus').textContent=communicationReady?(messages.length?'Comunicações registradas · horário e participantes originais.':'Nenhuma comunicação registrada para esta sala.'):'Comunicações indisponíveis ou ainda não recebidas.';
}
const agentNames=()=>Object.fromEntries([...agents.values()].map(a=>[a.id,a.name||a.id]));
const ago=value=>{const minutes=Math.max(0,Math.round((Date.now()-Date.parse(value))/60000));return minutes<1?'agora':minutes<60?'há '+minutes+' min':'há '+Math.floor(minutes/60)+' h'+(minutes%60?' '+(minutes%60)+' min':'');};
// Each agent's latest recorded message (up to two hours old) stays above the character, with its age.
function renderLastWords(){
 for(const [id,view] of agentViews){
  const latest=communicationReady?[...communications].reverse().find(m=>m.from===id):null,age=latest?Date.now()-Date.parse(latest.createdAt):Infinity;
  if(!latest||!(age>=-60000&&age<=7200000)){view.lastWords?.remove();view.lastWords=undefined;continue;}
  if(!view.lastWords){view.lastWords=node('span','');view.lastWords.className='last-words';view.lastWords.setAttribute('aria-hidden','true');}
  const text=OfficeLife.text(latest)||latest.summary,when=ago(latest.createdAt);
  if(view.lastWords.dataset.id!==latest.id||view.lastWords.dataset.when!==when){view.lastWords.replaceChildren(node('span',text),node('small',when+' · registro original'));view.lastWords.dataset.id=latest.id;view.lastWords.dataset.when=when;}
  view.lastWords.setAttribute('title',(messageKinds[latest.kind]||latest.kind)+' · '+date(latest.createdAt)+' · '+latest.id);
  if(view.lastWords.parentElement!==view.button)view.button.append(view.lastWords);
 }
}
function clearViewSpeech(view){view.speech?.remove();view.speech=null;if(view.speechTimer!==undefined)clearTimeout(view.speechTimer);view.speechTimer=undefined;delete view.button.dataset.delivery;}
function clearSpeech(){for(const view of agentViews.values())clearViewSpeech(view);}
function showMessage(message){
 for(const id of new Set([message.from,...message.to])){
  const view=agentViews.get(id);if(!view)continue;clearViewSpeech(view);
  const sending=id===message.from,speech=node('span',sending?(messageKinds[message.kind]||message.kind)+' → '+message.to.map(id=>agents.get(id)?.name||id).join(', '):'Mensagem de '+(agents.get(message.from)?.name||message.from));
  speech.className='recorded-speech';speech.setAttribute('title',message.summary+' · '+date(message.createdAt)+' · '+message.id);speech.setAttribute('aria-hidden','true');view.button.dataset.delivery=sending?'sent':'received';view.button.append(speech);view.speech=speech;
  view.speechTimer=setTimeout(()=>{if(view.speech===speech)clearViewSpeech(view);},8000);
 }
}
function selectHandoff(id){if(!communications.some(m=>m.id===id))return;selectedHandoff=id;stopPresence();render();}
function handoffProfile(messageId,id){handoffProfileFocus=messageId+':'+id;profile(id);}
function restoreHandoffFocus(){if(!handoffProfileFocus)return;const target=[...q('#handoffDetail').children].find(b=>b.dataset.handoffControl===handoffProfileFocus);(target||q('#openCollaboration')).focus?.({preventScroll:true});handoffProfileFocus=null;}
function renderHandoffMap(message){
 const host=q('#office');q('#handoffMap')?.remove();
 for(const [id,view] of agentViews){delete view.button.dataset.handoff;if(message){if(id===message.from)view.button.dataset.handoff='sender';else if(message.to.includes(id))view.button.dataset.handoff='recipient';}}
 if(!message||!document.createElementNS||!host.getBoundingClientRect)return;
 const bounds=host.getBoundingClientRect();if(bounds.width<=0||bounds.height<=0)return;const positions=new Map();
 for(const [id,view] of agentViews){if(!roomInfo[view.agent?.room]||!view.button.getBoundingClientRect)continue;const r=view.button.getBoundingClientRect();positions.set(id,{x:(r.left+r.width/2-bounds.left)/bounds.width*100,y:(r.top+r.height/2-bounds.top)/bounds.height*100});}
 const links=OfficeCollaboration.links(message,positions);if(!links.length)return;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('id','handoffMap');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','handoff-map');
 for(const link of links){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M '+link.start.x+' '+link.start.y+' L '+link.end.x+' '+link.end.y);path.setAttribute('vector-effect','non-scaling-stroke');const end=document.createElementNS('http://www.w3.org/2000/svg','circle');end.setAttribute('cx',String(link.end.x));end.setAttribute('cy',String(link.end.y));end.setAttribute('r','.7');svg.append(path,end);}host.append(svg);
}
function renderHandoffs(){
 const focused=document.activeElement?.dataset?.handoffControl,controls=[],list=q('#handoffList'),detail=q('#handoffDetail');list.replaceChildren();detail.replaceChildren();
 const message=communicationReady?communications.find(m=>m.id===selectedHandoff):null;if(!message)selectedHandoff=null;
 q('#clearHandoff').hidden=!message;
 q('#handoffStatus').textContent=!communicationReady?'Comunicações indisponíveis ou ainda não recebidas.':!communications.length?'Nenhuma comunicação registrada.':message?'Registro selecionado · linhas ligam posições atuais; presença em pausa.':'Últimas mensagens registradas · selecione para destacar participantes.';
 for(const item of communications.slice(-6).reverse()){const row=node('li',''),button=node('button','');button.dataset.handoffControl=item.id;button.setAttribute('aria-pressed',String(item.id===selectedHandoff));button.append(node('b',(agents.get(item.from)?.name||item.from)+' → '+item.to.map(id=>agents.get(id)?.name||id).join(', ')),node('span',messageKinds[item.kind]),node('small',date(item.createdAt)));button.onclick=()=>selectHandoff(item.id);row.append(button);list.append(row);controls.push(button);}
 if(message){detail.append(node('b',messageKinds[message.kind]),node('p',message.summary),node('small','ID original: '+message.id+' · '+date(message.createdAt)),node('p','Salas e estados atuais; não indicam onde esta mensagem foi enviada.'));for(const [index,id] of [message.from,...message.to].entries()){const agent=agents.get(id),button=node('button',(index===0?'Remetente: ':'Destinatário: ')+(agent?.name||id)+(agent?' · '+agent.room+' · '+(statusLabels[agent.status]||agent.status):' · estado indisponível'));button.dataset.handoffControl=message.id+':'+id;button.disabled=!agent;button.onclick=()=>handoffProfile(message.id,id);detail.append(button);controls.push(button);}}
 renderHandoffMap(message);if(focused)(controls.find(b=>b.dataset.handoffControl===focused&&!b.disabled)||q(message?'#clearHandoff':'#openCollaboration')).focus?.({preventScroll:true});
}
q('#clearHandoff').onclick=()=>{const old=selectedHandoff;selectedHandoff=null;render();const button=[...q('#handoffList').children].flatMap(row=>[...row.children]).find(b=>b.dataset.handoffControl===old);(button||q('#openCollaboration')).focus?.({preventScroll:true});};
async function refreshCommunications(){
 if(communicationBusy)return;communicationBusy=true;const version=++communicationVersion;
 try{
  const data=await get('/agent-messages');if(version!==communicationVersion)return;if(!Array.isArray(data))throw Error('invalid communications');
  const recent=OfficeCollaboration.read(data,spriteIds,messageKinds,communications);
  const initial=!communicationReady;communications=recent;
  if(!initial)for(const message of recent){const age=Date.now()-Date.parse(message.createdAt);if(!seenCommunications.has(message.id)&&age>=0&&age<=30000){showMessage(message);life.react(message,agentNames());}}
  seenCommunications=new Set(recent.map(m=>m.id));communicationReady=true;
 }catch{communications=[];communicationReady=false;clearSpeech();}
 finally{communicationBusy=false;screens.update({messages:communicationReady?communications:[],names:agentNames()});if(inspectedRoom)renderRoom();renderHandoffs();if(!selectedHandoff)render();}
}
q('#togglePresence').onclick=()=>{
 if(systemReducesMotion()){motionChoice='on';presenceEnabled=true;try{globalThis.localStorage?.setItem('trading-lab.motion.v1','on');}catch{}}
 else presenceEnabled=!presenceEnabled;
 stopPresence();render();
};
setInterval(()=>life.tick(),1000);
q('#openCollaboration').onclick=()=>openRoom('Meeting Room');q('#closeRoom').onclick=()=>q('#roomDialog').close();
for(const button of document.querySelectorAll('button[data-space]'))button.onclick=()=>openRoom(button.dataset.space);
for(const id of ['#roomDialog','#profile','#workspaceDialog','#auditDialog','#studyDialog'])q(id).addEventListener('close',()=>{render();if(id==='#profile'){const opener=profileOpener;profileOpener=null;if(handoffProfileFocus)restoreHandoffFocus();else if(opener?.isConnected)opener.focus?.({preventScroll:true});else if(q('#workspaceDialog').open)q('#closeWorkspace').focus?.();else if(q('#roomDialog').open)q('#closeRoom').focus?.();}});
document.addEventListener?.('visibilitychange',()=>{stopPresence();render();});reducedMotion?.addEventListener?.('change',()=>{stopPresence();render();});
q('#office').addEventListener('focusin',event=>{const view=agentViews.get(event.target?.closest?.('.agent')?.dataset.agentId);if(view){transitions.stop(view);presence.stop(view);}});
refreshCommunications();setInterval(refreshCommunications,5000);

const furnitureActions={
 library:{panel:'researchPanel',title:'Biblioteca · pesquisas registradas',nav:'navResearch'},
 terminal:{panel:'marketPanel',title:'Terminal · mercado observado',nav:'navMarket'},
 'risk-board':{panel:'researchPanel',title:'Quadro · controles de risco',nav:'navResearch'},
 'quant-servers':{panel:'researchPanel',title:'Bancada · estudos históricos',nav:'navResearch'}
};
let furnitureReturn=null;
function openFurniture(id){
 const feature=OfficeNavigation.features.find(f=>f.id===id);if(!feature)return;
 if(q('#roomDialog').open)q('#roomDialog').close();
 const action=furnitureActions[id];if(action){furnitureReturn=id;openPanel(action.panel,action.title,action.nav);}else{furnitureReturn=null;openRoom(feature.room);}
}
for(const feature of OfficeNavigation.features){
 const room=[...document.querySelectorAll('.room[data-room]')].find(element=>element.dataset.room===feature.room);if(!room)continue;
 const button=node('button',''),icon=node('span',feature.icon),label=node('span',feature.label);button.className='furniture-hit';button.dataset.furniture=feature.id;button.setAttribute('aria-label',feature.label);button.setAttribute('style','left:'+feature.x+'%;top:'+feature.y+'%');icon.setAttribute('aria-hidden','true');label.className='furniture-label';button.append(icon,label);button.onclick=()=>openFurniture(feature.id);room.append(button);
}
q('#workspaceDialog').addEventListener('close',()=>{if(furnitureReturn){document.querySelector('button[data-furniture="'+furnitureReturn+'"]')?.focus?.({preventScroll:true});furnitureReturn=null;}});
globalThis.addEventListener?.('resize',()=>{stopPresence();render();});

// Scene monitor surfaces open existing read panels; they never submit jobs or orders.
for(const [id,action] of Object.entries({sceneDataCenter:{panel:'accessPanel',title:'Data Center · serviço e persistência',nav:'navAccess'},sceneWarRoom:{panel:'financePanel',title:'War Room · capital e portfólio',nav:'navFinance'},sceneMarketAnalysis:{panel:'marketPanel',title:'Observatório · mercado recebido',nav:'navMarket'}}))q('#'+id).onclick=()=>{openPanel(action.panel,action.title,action.nav);q('#workspaceDialog').dataset.terminal='true';};

for(const screen of [
 {id:'war-left',x:766,y:627,w:128,h:72,panel:'financePanel',title:'War Room · contas independentes',nav:'navFinance'},
 {id:'war-right',x:1053,y:627,w:128,h:72,panel:'historyPanel',title:'War Room · auditoria',nav:'navHistory'},
 {id:'market-upper-right',x:1658,y:607,w:140,h:48,panel:'marketPanel',title:'Mercado · traçados recebidos',nav:'navMarket'},
 {id:'market-lower-left',x:1493,y:664,w:140,h:48,panel:'marketPanel',title:'Mercado · cotações e funding',nav:'navMarket'},
 {id:'market-lower-right',x:1658,y:664,w:140,h:48,panel:'historyPanel',title:'Mercado · fontes e eventos',nav:'navHistory'},
 {id:'meeting-wall',x:1559,y:369,w:184,h:62,panel:'agentsPanel',title:'Meeting Room · equipe',nav:'navAgents'},
 {id:'risk-wall',x:1634,y:147,w:156,h:62,panel:'researchPanel',title:'Risk Desk · controles determinísticos',nav:'navResearch'},
 {id:'trading-empty-left',x:902,y:180,w:36,h:40,panel:'marketPanel',title:'Trading Floor · mercado spot',nav:'navMarket'},
 {id:'trading-empty-center',x:949,y:180,w:36,h:40,panel:'financePanel',title:'Trading Floor · portfólio',nav:'navFinance'},
 {id:'trading-empty-right',x:992,y:180,w:36,h:40,panel:'historyPanel',title:'Trading Floor · auditoria',nav:'navHistory'}
]){const hit=node('button','');hit.className='control-zone scene-screen';hit.dataset.sceneScreen=screen.id;hit.setAttribute('aria-label',screen.title);hit.setAttribute('title',screen.title);hit.setAttribute('style','left:'+screen.x/1852*100+'%;top:'+screen.y/849*100+'%;width:'+screen.w/1852*100+'%;height:'+screen.h/849*100+'%;transform:translate(-50%,-50%)');hit.onclick=()=>{openPanel(screen.panel,screen.title,screen.nav);q('#workspaceDialog').dataset.terminal='true';};q('#office').append(hit);}

q('#workspaceDialog').addEventListener('close',()=>{if(q('#workspaceDialog').dataset.terminal==='true' && terminalOpener?.isConnected)terminalOpener.focus?.({preventScroll:true});terminalOpener=null;});
