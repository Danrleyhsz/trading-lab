const traces = {spot:[],mark:[]};
function observeTrace(source, price, timestamp) {
  if (!Number.isFinite(price) || price <= 0) return;
  const series = traces[source], time = timestamp ? new Date(timestamp).getTime() : NaN;
  if (series.length && ((Number.isFinite(time) && time <= series[series.length-1].time) || (!Number.isFinite(time) && price === series[series.length-1].price))) return;
  series.push({price,time});if (series.length > 90) series.shift();
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
  q('#marketV3').textContent = reason;q('#markPrice').textContent = 'Indisponível';q('#fundingRate').textContent = '—';q('#spreadQuote').textContent = '—';q('#quoteTime').textContent = reason;
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
  let count = 0;
  for (const account of all) {
    const name = account.kind === 'FUND' ? 'Fundo' : (agents.get(account.ownerAgentId)?.name || account.ownerAgentId || account.id);
    const instrument = account.instrument === 'BINANCE_USDM:BTCUSDT' ? 'USD-M' : 'Legado';
    for (const position of account.portfolio.positions || []) {
      if (!Number.isFinite(position.quantity) || position.quantity === 0) continue;
      const row = node('div','');row.className = 'data-row';
      row.append(node('b',position.symbol + ' · ' + (position.quantity > 0 ? 'LONG' : 'SHORT')),node('span',Math.abs(position.quantity) + ' · ' + name));
      row.append(node('small',instrument + ' · entrada ' + money(position.averageEntry) + (account.valuationFresh === false ? ' · avaliação desatualizada' : '')));
      positions.append(row);count++;
    }
    if (account.kind !== 'FUND') {
      const row = node('div','');row.className = 'data-row';
      const label = node('span',name + ' · ' + instrument);label.append(node('small','Patrimônio ' + money(account.portfolio.equity) + (account.valuationFresh === false ? ' · desatualizado' : '')));
      label.append(node('small',outcomeLabel(account.performance)));const pnl = node('b',money(account.portfolio.equity-account.initialCash));pnl.className = account.portfolio.equity >= account.initialCash ? 'positive' : 'negative';
      row.append(label,pnl);performance.append(row);
    }
  }
  if (!count) {positions.textContent = 'Nenhuma posição aberta registrada.';positions.className='empty-state';} else positions.className='';
  if (!performance.children.length) {performance.textContent = 'Contas de avaliação ainda não configuradas.';performance.className='empty-state';} else performance.className='';
}
function openPanel(panel, title, navId) { stopPresence();
  for (const id of ['agentsPanel','financePanel','marketPanel','researchPanel','historyPanel','accessPanel']) q('#'+id).hidden = id !== panel;
  q('#workspaceTitle').textContent = title;
  for (const id of ['navOffice','navAgents','navFinance','navMarket','navResearch','navHistory','navAccess']) {
    q('#'+id).className = 'nav' + (id === navId ? ' active' : '');
    q('#'+id).setAttribute('aria-current', id === navId ? 'page' : 'false');
  }
  q('#workspaceDialog').showModal();
}
const q = selector => document.querySelector(selector);
const agents = new Map(), events = [];
let selected, profileVersion = 0, busy = false, stateVersion = 0, marketVersion = 0;
const money = value => Number.isFinite(value) ? value.toFixed(2) + ' USDT' : '—';
const date = value => new Date(value).toLocaleString();
function node(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}
async function get(url) {
  const response = await fetch(url, {cache: 'no-store', signal: typeof AbortSignal!=='undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined});
  if (!response.ok) { const error=Error(url);error.status=response.status;throw error; }
  return response.json();
}
const spriteIds = ['atlas', 'euler', 'nova', 'sentinel', 'satoshi', 'flux', 'vega', 'oracle'];
const statusLabels = {IDLE:'Disponível', RESEARCHING:'Pesquisando', BACKTESTING:'Testando hipóteses', TRADING:'Execução paper', REVIEWING_RISK:'Avaliando risco', MEETING:'Em reunião'};
const roleLabels = {atlas:'Coordenação de pesquisa', euler:'Pesquisa quantitativa', nova:'Trader paper', sentinel:'Gestão de risco', satoshi:'Pesquisa de Bitcoin', flux:'Microestrutura de mercado', vega:'Pesquisa de volatilidade', oracle:'Regimes de mercado'};
function sprite(element, id) {
  const index = spriteIds.indexOf(id);
  if (index < 0) { element.hidden = true; return; }
  element.setAttribute('style', 'background-position:' + ((index % 4) * 100 / 3) + '% ' + (index < 4 ? 0 : 100) + '%');
}
const agentViews=new Map();let presenceEnabled=true;
const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const presence=new OfficePresence.Director(()=>presenceEnabled&&!reducedMotion?.matches&&!document.hidden&&!['#profile','#workspaceDialog','#roomDialog','#auditDialog','#studyDialog'].some(id=>q(id).open));
function stopPresence(){for(const view of agentViews.values())presence.stop(view);}
function render(movingId){
 const focusedAgent=document.activeElement?.dataset?.agentId,slots=new Map();q('#agentList').replaceChildren();
 for(const [id,view] of agentViews)if(!agents.has(id)){presence.forget(view);view.button.remove();agentViews.delete(id);}
 for(const agent of agents.values()){
  let view=agentViews.get(agent.id);
  if(!view){
   const button=node('button',''),avatar=node('span',''),label=node('b',''),status=node('small',''),shadow=node('span','');
   button.className='agent';avatar.className='sprite';shadow.className='foot-shadow';avatar.setAttribute('aria-hidden','true');shadow.setAttribute('aria-hidden','true');sprite(avatar,agent.id);button.append(avatar,label,status,shadow);button.onclick=()=>profile(agent.id);
   view={button,avatar,label,status};agentViews.set(agent.id,view);
  }
  const oldRoom=view.button.dataset.room;
  const button=view.button;button.dataset.agentId=agent.id;button.dataset.status=agent.status;button.dataset.room=agent.room;view.label.textContent=agent.name;view.status.textContent=statusLabels[agent.status]||agent.status;
  button.setAttribute('aria-label',agent.name+', '+agent.room+', '+(statusLabels[agent.status]||agent.status));button.setAttribute('title',agent.lastReason||'Disponível; sem atividade registrada');
  const room=[...document.querySelectorAll('.room[data-room]')].find(element=>element.dataset.room===agent.room),host=room?.querySelector('.occupants')||q('#unmapped');
  const slot=slots.get(agent.room)||0;slots.set(agent.room,slot+1);const point=OfficePresence.floorPoint(agent.room,slot)||{x:50,y:88};
  if(button.parentElement!==host)host.append(button);button.setAttribute('style','left:'+point.x+'%;top:'+point.y+'%');
  presence.update(view,agent,slot,host);
  // Room changes use a brief arrival effect; the painted walls are not a collision map.
  if(oldRoom&&oldRoom!==agent.room&&button.animate&&presenceEnabled&&!reducedMotion?.matches){button.animate([{opacity:.25},{opacity:1}],{duration:350});}
  if(agent.id===focusedAgent)button.focus?.({preventScroll:true});
  const row=node('button',agent.name+' · '+agent.room+' · '+(statusLabels[agent.status]||agent.status));row.onclick=()=>profile(agent.id);q('#agentList').append(row);
 }
 q('#office').dataset.presence=presenceEnabled&&!reducedMotion?.matches?'on':'off';
 q('#togglePresence').textContent=reducedMotion?.matches?'Movimento reduzido':presenceEnabled?'Pausar animações':'Animar escritório';q('#togglePresence').disabled=!!reducedMotion?.matches;q('#togglePresence').setAttribute('aria-pressed',String(presenceEnabled&&!reducedMotion?.matches));
 q('#activeAgents').textContent=[...agents.values()].filter(agent=>agent.status!=='IDLE').length+' / '+agents.size;
 if(selected)renderState();if(inspectedRoom&&q('#roomDialog').open)renderRoom();
}
function renderState() {
  const agent = agents.get(selected);
  if (!agent) return;
  q('#profileTitle').textContent = agent.name;sprite(q('#profilePortrait'),agent.id);
  q('#profileState').textContent = (roleLabels[agent.id] || agent.role) + ' · ' + agent.room + ' · ' + (statusLabels[agent.status] || agent.status);
  q('#experience').textContent = `Experiência: ${agent.experience} transições registradas`;
  q('#reason').textContent = (roleLabels[agent.id] ? roleLabels[agent.id] + ' · ' : '') + (agent.lastReason || 'Nenhum motivo de atividade registrado');
  q('#updated').textContent = 'Estado atualizado pelo backend: ' + date(agent.updatedAt);
}
async function profile(id) {
  stopPresence();selected = id;
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
      row.append(node('b', memory.kind), node('p', memory.summary), node('small', date(memory.createdAt)));
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
q('#runResearch').onclick = async () => {
  const button = q('#runResearch');
  button.disabled = true;
  q('#researchActionStatus').textContent = 'Pesquisa solicitada…';
  try {
    const response = await fetch('/research/run', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({symbol: 'BTCUSDT'})});
    const run = await response.json();
    q('#researchActionStatus').textContent = run.status ? 'Resultado registrado: ' + run.status : 'A solicitação falhou. Consulte a atividade registrada.';
    refresh();
    if (selected) details();
  } catch {
    q('#researchActionStatus').textContent = 'Não foi possível acessar o laboratório.';
  } finally { button.disabled = false; }
};
function renderResearch(runs) {
  records('#researchRuns', [...runs].reverse(), run => {
    const row = node('li', '');
    row.append(node('b', run.status === 'SCREEN_PASSED' ? 'Filtro histórico aprovado' : run.status === 'REJECTED' ? 'Hipótese rejeitada' : 'Pesquisa falhou'), node('p', date(run.completedAt)));
    if (run.datasetHash) row.append(node('small', 'Evidência: ' + run.datasetHash));
    if (run.backtest) row.append(node('p', `${run.backtest.trades} operações históricas · P&L do backtest simulado ${money(run.backtest.netPnl)}`));
    return row;
  });
}
function renderAccounts(items) {
  const host = q('#accounts');
  host.replaceChildren();
  for (const account of items) {
    const row = node('li', '');
    row.append(node('b', account.kind === 'FUND' ? 'Fundo · portfólio paper oficial separado' : 'Avaliação · ' + account.ownerAgentId), node('p', 'Patrimônio: ' + money(account.portfolio.equity)), node('p', 'P&L líquido: ' + money(account.portfolio.equity - account.initialCash)), node('small', `${account.fills} fills registrados · Capital virtual inicial: ${money(account.initialCash)}`));
    host.append(row);
  }
  q('#accountScope').textContent = items.some(account => account.kind === 'EVALUATION') ? 'Capital de avaliação independente. Os saldos não são somados ao patrimônio do fundo.' : 'Contas de avaliação não configuradas. O fundo permanece separado.';
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
      states.forEach(agent => agents.set(agent.id, agent));
      render();
    }
    renderResearch(runs);renderAccounts(accounts);q('#equity').textContent = money(portfolio.equity);
    q('#pnl').textContent = money(portfolio.equity - portfolio.initialCash);
    if (initialMarketVersion === marketVersion) { q('#market').textContent = market.price ? market.symbol + ' ' + money(market.price) : 'Aguardando dados de mercado'; observeTrace('spot',market.price,market.timestamp); }
    q('#sync').textContent = 'Estado recebido às ' + new Date().toLocaleTimeString();
  } catch {
    q('#sync').textContent = 'Sistema indisponível · dados exibidos podem estar desatualizados';q('#accountScope').textContent = 'Contas indisponíveis ou desatualizadas';
  } finally { busy = false; }
}
function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/events`);
  ws.onopen = () => { q('#connection').textContent = '● Eventos conectados'; refresh(); if (selected) details(); };
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
      agents.set(event.payload.id, event.payload); render(event.payload.id);
    }
    refresh();
    if (selected) details();
  };
  ws.onerror = () => ws.close();
  ws.onclose = () => {
    q('#connection').textContent = 'Eventos desconectados · reconectando';
    setTimeout(connect, 3000);
  };
}
refresh();
setInterval(() => { refresh(); if (selected) details(); }, 5000);
connect();

let onlineBusy = false, onlineVersion = 0, halted = null, runtimeObservedAt = 0;
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
    observeTrace('mark', quote.markPrice, quote.markTime);
  } else marketUnavailable('USD-M indisponível · ordens bloqueadas');
  q('#marketV3').textContent = quote ? `BTCUSDT perpetual · bid ${money(quote.bid)} · ask ${money(quote.ask)} · mark ${money(quote.markPrice)} · funding cotado ${(quote.fundingRate * 100).toFixed(4)}% · ${market.status}. Atualizado em ${date(quote.markTime)}` : 'USD-M indisponível · ordens paper bloqueadas';
}
async function studyDetails(id) {
  q('#studyDialog').showModal();q('#studyDetails').textContent = 'Carregando…';
  try {
    const study = await get('/backtests/v2/studies/' + encodeURIComponent(id));
    const host = q('#studyDetails');host.replaceChildren();host.append(node('p', 'Estado registrado: ' + study.status));
    if (study.error) host.append(node('p', study.error));
    if (study.result) {
      host.append(node('p', 'P&L simulado fora da amostra: ' + money(study.result.netPnl)), node('p', 'Evidência: ' + study.result.datasetHash), node('p', 'Resultados históricos não aprovam operações do fundo. Cada janela começa e termina sem posições. Candles finais não usados: ' + study.result.excludedTailBars));
      for (const fold of study.result.folds) host.append(node('p', `${date(fold.testStart)} → ${date(fold.testEnd)} · ${fold.configuration?.strategy || 'SMA'} · ${fold.result.trades ?? 'indisponível'} operações históricas · P&L ${money(fold.result.netPnl)} · taxas ${money(fold.result.feesPaid)} · funding ${money(fold.result.fundingCashDelta)} · drawdown ${(fold.result.maxDrawdown * 100).toFixed(2)}% · ${fold.result.liquidations} liquidações modeladas`));
      host.append(node('p', 'Liquidação usa premissas conservadoras configuradas; as regras completas da exchange não estão modeladas.'));
    }
  } catch { q('#studyDetails').textContent = 'Estudo indisponível. Entre se o acesso for exigido.'; }
}
q('#closeStudy').onclick = () => q('#studyDialog').close();
function runtimeUnavailable() {
  runtimeObservedAt = 0;
  q('#runtimeStatus').textContent = 'Diagnóstico indisponível ou desatualizado · entre se o acesso for exigido';
  q('#runtimeDetails').replaceChildren();
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
    const results = await Promise.allSettled([get('/market/v3'), get('/finance'), get('/backtests/v2/studies'), get('/paper/perpetual/status'), get('/runtime/readiness')]);
    if (results[0].status === 'fulfilled' && version === onlineVersion) showPerpetualMarket(results[0].value);
    else if (results[0].status === 'rejected') marketUnavailable('Dados USD-M indisponíveis · preços podem estar desatualizados');
    if (results[1].status === 'fulfilled') {
      const data = results[1].value, host = q('#finance');host.replaceChildren();renderFinancialOverview(data);
      for (const account of [...(data.legacyAccounts || []), ...(data.perpetualAccounts || [])]) {
        const card = node('article', '');const net = account.portfolio.equity - account.initialCash;
        card.append(node('h3', account.kind === 'FUND' ? 'Fundo · portfólio paper separado' : 'Avaliação · ' + account.ownerAgentId), node('p', account.instrument), node('p', 'Patrimônio: ' + money(account.portfolio.equity)), node('p', 'P&L líquido: ' + money(net)), node('p', 'Taxas: ' + money(account.feesPaid)), node('p', 'Funding: ' + money(account.fundingCashDelta)), node('p', 'Drawdown máximo observado: ' + (Number.isFinite(account.maxDrawdown) ? (account.maxDrawdown * 100).toFixed(2) + '%' : 'indisponível')));
        if (account.instrument === 'BINANCE_USDM:BTCUSDT') card.append(node('p', 'Margem: ' + money(account.initialMargin)), node('small', account.valuationFresh ? 'Avaliação atual por amostragem' : 'Avaliação indisponível ou desatualizada'));
        card.append(node('p',outcomeLabel(account.performance)));renderEquitySamples(card,account);if(account.id){const browse=node('button','Navegar operações desta conta');browse.onclick=()=>openAccountAudit(account);card.append(browse);}host.append(card);
      }
    } else { q('#finance').textContent = 'Dados financeiros indisponíveis · entre se o acesso for exigido';q('#positions').textContent = 'Posições indisponíveis ou desatualizadas';q('#performance').textContent = 'Contas indisponíveis ou desatualizadas'; }
    if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) records('#studyList', [...results[2].value].reverse(), study => { const li = node('li', '');const button = node('button', `${study.status} · ${date(study.createdAt)}${Number.isFinite(study.netPnl) ? ' · P&L histórico ' + money(study.netPnl) : ''}`);button.onclick = () => studyDetails(study.id);li.append(button);return li; });
    if (results[3].status === 'fulfilled') {
      const status = results[3].value;q('#riskSummary').textContent = 'Execução ' + (status.executionEnabled ? 'habilitada' : 'desligada') + ' · Autonomia ' + (status.autonomous?.enabled ? 'habilitada' : 'desligada') + (status.halted ? ' · Novas exposições pausadas' : '');halted = status.halted;q('#haltPaper').disabled = typeof halted !== 'boolean';q('#haltPaper').textContent = halted ? 'Retomar exposições paper permitidas' : 'Pausar novas exposições paper';
      q('#onlineStatus').textContent = `Execução perpétua ${status.executionEnabled ? 'habilitada' : 'desligada'} · nova exposição ${halted ? 'pausada' : 'sujeita ao risco'} · autonomia ${status.autonomous?.enabled ? 'habilitada' : 'desligada'} · ${status.autonomous?.reason || 'estado indisponível'}. Somente avaliação independente.`;
    } else { halted = null;q('#riskSummary').textContent = 'Estado de risco indisponível';q('#haltPaper').disabled = true;q('#onlineStatus').textContent = 'Controles indisponíveis · entre se o acesso for exigido'; }
    if (results[4].status==='fulfilled' && version===onlineVersion) renderRuntime(results[4].value); else runtimeUnavailable();
  } finally { onlineBusy = false; }
}
q('#runStudy').onclick = async () => {
  const button = q('#runStudy');button.disabled = true;
  try { const response = await fetch('/backtests/v2/studies', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const result = await response.json();q('#studyActionStatus').textContent = response.ok ? 'Estudo histórico registrado: ' + result.id : result.error || 'Estudo indisponível';await refreshOnline(); }
  catch { q('#studyActionStatus').textContent = 'Não foi possível acessar o laboratório'; } finally { button.disabled = false; }
};
q('#haltPaper').onclick = async () => {
  if (typeof halted !== 'boolean') return;q('#haltPaper').disabled = true;
  try { const response = await fetch('/paper/perpetual/halt', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({halted:!halted})});if (!response.ok) throw Error();await refreshOnline(); }
  catch { q('#onlineStatus').textContent = 'A alteração falhou. Confira o estado do sistema.'; }
};
q('#loginPanel').onclick = async () => {
  try { const response = await fetch('/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:q('#accessToken').value})});q('#accessToken').value = '';q('#loginStatus').textContent = response.ok ? 'Acesso autorizado' : 'Acesso recusado';if (response.ok) { await refresh();await refreshOnline(); } }
  catch { q('#loginStatus').textContent = 'Não foi possível acessar o laboratório'; }
};
refreshOnline();setInterval(() => {refreshOnline();if (!runtimeObservedAt || Date.now()-runtimeObservedAt>15000 || runtimeObservedAt>Date.now()+5000) runtimeUnavailable();}, 5000);

q('#navOffice').onclick = () => q('#workspaceDialog').close();
q('#navAgents').onclick = () => openPanel('agentsPanel','Equipe do laboratório','navAgents');
q('#navFinance').onclick = () => openPanel('financePanel','Portfólio e contas','navFinance');
q('#navMarket').onclick = () => openPanel('marketPanel','Mercado observado','navMarket');
q('#navResearch').onclick = () => openPanel('researchPanel','Pesquisa, estudos e risco','navResearch');
q('#navAccess').onclick = () => openPanel('accessPanel','Acesso ao painel','navAccess');
q('#openControls').onclick = q('#navResearch').onclick;
q('#closeWorkspace').onclick = () => q('#workspaceDialog').close();
q('#workspaceDialog').addEventListener('close', () => {
  for (const id of ['navOffice','navAgents','navFinance','navMarket','navResearch','navHistory','navAccess']) {q('#'+id).className = 'nav' + (id === 'navOffice' ? ' active' : '');q('#'+id).setAttribute('aria-current',id === 'navOffice' ? 'page' : 'false');}
});
const eventLabels={AGENT_STATE_CHANGED:'Estado do agente',TRADE_PROPOSED:'Proposta paper',RISK_APPROVED:'Risco aprovado',RISK_REJECTED:'Risco rejeitado',PAPER_ORDER_SUBMITTED:'Ordem paper enviada',PAPER_FILL:'Fill paper',POSITION_CLOSED:'Posição encerrada',MEMORY_CREATED:'Memória registrada',RESEARCH_STARTED:'Pesquisa iniciada',RESEARCH_COMPLETED:'Pesquisa concluída',RESEARCH_FAILED:'Falha na pesquisa',BACKTEST_STARTED:'Estudo iniciado',BACKTEST_COMPLETED:'Estudo concluído',BACKTEST_FAILED:'Falha no estudo',FUNDING_SETTLED:'Funding liquidado',PAPER_LIQUIDATION:'Liquidação paper',PAPER_CONTROL_CHANGED:'Controle paper alterado',AUTONOMOUS_DECISION:'Decisão autônoma',MARKET_DATA_FAILED:'Fonte indisponível'};
let auditVersion=0,historyVersion=0,historyCursor=null,auditCursor=null,auditAccount=null,auditReturn=null,auditOpener=null;
function eventLabel(record){const p=record.payload||{};return (eventLabels[record.type]||record.type)+(record.type==='AGENT_STATE_CHANGED'?' · '+(p.name||p.id||'')+' · '+(statusLabels[p.status]||p.status||'')+' · '+(p.room||''):'');}
function sourceButton(id,received){const button=node('button','Abrir evento de origem · '+id);button.className='source-link';button.dataset.eventId=id;button.onclick=()=>showEvent(id,received);return button;}
function renderSessionEvents(){const focus=document.activeElement?.dataset?.eventId,buttons=[];q('#events').replaceChildren(...events.map(record=>{const li=node('li',''),button=node('button',date(record.occurredAt)+' · '+eventLabel(record));button.className='event-button';button.dataset.eventId=record.id;button.onclick=()=>showEvent(record.id,record);li.append(button);buttons.push(button);return li;}));buttons.find(button=>button.dataset.eventId===focus)?.focus?.({preventScroll:true});}
function outcomeCard(trade){const row=node('article','');row.className='trade-outcome';row.append(node('b',trade.symbol+' '+trade.direction+' · '+money(trade.netPnl)),node('p',date(trade.openedAt)+' → '+date(trade.closedAt)),node('small','P&L bruto '+money(trade.grossPnl)+' · taxas '+money(trade.feesPaid)+' · funding '+money(trade.fundingCashDelta)));for(const id of trade.fillEventIds||[])row.append(sourceButton(id));for(const id of trade.fundingEventIds||[]){row.append(node('small','Funding registrado'));row.append(sourceButton(id));}return row;}
function openAudit(){stopPresence();const dialog=q('#auditDialog');if(!dialog.open){auditOpener=document.activeElement;dialog.showModal();}}
function resetAudit(title,status){q('#auditTitle').textContent=title;q('#auditStatus').textContent=status;q('#auditContent').replaceChildren();q('#auditOlder').hidden=true;q('#auditOlder').disabled=true;q('#auditBack').hidden=true;}
function eventAccount(record){const p=record.payload||{};return p.accountId||p.order?.accountId||p.fill?.accountId;}
function renderEvent(record,durable){
 const host=q('#auditContent');host.replaceChildren();host.append(node('h3',eventLabel(record)),node('p','Registrado em: '+date(record.occurredAt)),node('p','ID original: '+record.id),node('small','Tipo original: '+record.type));
 const p=record.payload||{},account=eventAccount(record);if(account)host.append(node('p','Conta: '+account));if(typeof p.decision?.approved==='boolean')host.append(node('p','Decisão registrada: '+(p.decision.approved?'aprovada':'rejeitada')));if(Array.isArray(p.decision?.reasons)&&p.decision.reasons.length)host.append(node('p','Motivos registrados: '+p.decision.reasons.join(', ')));if(p.error)host.append(node('p','Falha registrada: '+p.error));
 const details=node('details',''),summary=node('summary','Dados originais do evento'),payload=node('pre',JSON.stringify(record.payload,null,2));details.append(summary,payload);host.append(details);
 q('#auditStatus').textContent=durable?'Evento confirmado no histórico gravado. Dados originais; consulta sem alterar o sistema.':'Recebido nesta sessão. Ainda não confirmado no histórico gravado; pode ser temporário.';
 configureAuditBack();
}
async function showEvent(id,received){
 const back=auditReturn;const version=++auditVersion;resetAudit('Evento de origem','Consultando histórico gravado…');auditReturn=back;configureAuditBack();openAudit();
 try{const result=await get('/audit/events/'+encodeURIComponent(id));if(version!==auditVersion)return;if(result.source!=='DURABLE_SNAPSHOT'||!result.event||result.event.id!==id)throw Error('invalid audit response');renderEvent(result.event,true);}
 catch(error){if(version!==auditVersion)return;if(error.status===404&&received?.id===id)renderEvent(received,false);else{q('#auditStatus').textContent=error.status===404?'Evento não encontrado no histórico gravado.':'Histórico indisponível. Confira o acesso e tente novamente.';}}
}
function performancePath(account){return (account.instrument==='BINANCE_USDM:BTCUSDT'?'/paper/perpetual/accounts/':'/paper/accounts/')+encodeURIComponent(account.accountId||account.id)+'/performance';}
function renderAccountAudit(result,account){
 resetAudit('Operações · '+(account.accountId||account.id),'');q('#auditStatus').textContent='Conta '+(account.accountId||account.id)+' · '+account.instrument+' · fundo e avaliação permanecem separados.';
 const host=q('#auditContent');host.append(node('p',outcomeLabel(result)),node('small','Operações abertas ficam fora da taxa de acerto. Cada evento consulta seu registro gravado.'));
 if(!result.available){host.append(node('p',result.reason||'Evidências de operações indisponíveis'));return;}
 host.append(node('p','Resultado líquido encerrado: '+money(result.summary.closedNetPnl)));
 if(!result.closedTrades.length)host.append(node('p','Nenhuma operação completa registrada nesta página.'));
 for(const trade of result.closedTrades)host.append(outcomeCard(trade));
 auditCursor=result.nextCursor||null;auditAccount=account;q('#auditOlder').hidden=!auditCursor;q('#auditOlder').disabled=!auditCursor;
 auditReturn=()=>renderAccountAudit(result,account);
}
async function openAccountAudit(account,before){
 const version=++auditVersion;auditReturn=null;auditAccount=account;resetAudit('Operações da conta','Consultando operações registradas…');openAudit();
 try{const result=await get(performancePath(account)+'?limit=25'+(before?'&before='+encodeURIComponent(before):''));if(version!==auditVersion)return;if(result.coverage!=='RECORDED_LEDGER_ONLY'||!Array.isArray(result.closedTrades)||!result.summary||typeof result.available!=='boolean')throw Error('invalid performance response');renderAccountAudit(result,account);}
 catch{if(version===auditVersion)q('#auditStatus').textContent='Operações indisponíveis. Confira o acesso e reabra a conta.';}
}
async function loadEventHistory(before){
 const version=++historyVersion,type=q('#eventType').value||'';historyCursor=null;q('#olderEvents').disabled=true;q('#historyList').replaceChildren();q('#historyStatus').textContent='Consultando histórico gravado…';
 try{const result=await get('/audit/events?limit=25'+(type?'&type='+encodeURIComponent(type):'')+(before?'&before='+encodeURIComponent(before):''));if(version!==historyVersion)return;if(result.source!=='DURABLE_SNAPSHOT'||!Array.isArray(result.events))throw Error('invalid audit response');const rows=result.events.map(record=>{const li=node('li',''),button=node('button',date(record.occurredAt)+' · '+eventLabel(record));button.className='event-button';button.onclick=()=>{auditReturn=null;showEvent(record.id);};li.append(button);return li;});q('#historyList').replaceChildren(...rows);q('#historyStatus').textContent=result.events.length?result.events.length+' eventos nesta página. Ordenação pela data original; IDs preservados.':'Nenhum evento gravado para este filtro.';historyCursor=result.nextCursor||null;q('#olderEvents').disabled=!historyCursor;}
 catch{if(version===historyVersion)q('#historyStatus').textContent='Histórico gravado indisponível. Confira o acesso e atualize.';}
}
q('#navHistory').onclick=()=>{openPanel('historyPanel','Histórico gravado','navHistory');loadEventHistory();};
q('#reloadEvents').onclick=()=>loadEventHistory();q('#eventType').onchange=()=>loadEventHistory();q('#olderEvents').onclick=()=>{if(historyCursor)loadEventHistory(historyCursor);};
q('#auditOlder').onclick=()=>{if(auditCursor&&auditAccount)openAccountAudit(auditAccount,auditCursor);};
function configureAuditBack(){if(auditReturn){q('#auditBack').hidden=false;q('#auditBack').onclick=()=>{auditVersion++;auditReturn();};}}
q('#closeAudit').onclick=()=>q('#auditDialog').close();q('#auditDialog').addEventListener('close',()=>{auditVersion++;auditReturn=null;auditAccount=null;auditCursor=null;if(auditOpener?.isConnected)auditOpener.focus?.({preventScroll:true});else if(q('#profile').open)q('#closeProfile').focus?.();else if(q('#workspaceDialog').open)q('#closeWorkspace').focus?.();else (document.querySelector('.nav.active')||q('#navOffice')).focus?.();auditOpener=null;});

let inspectedRoom=null,communicationVersion=0,communicationBusy=false,communicationReady=false;
let communications=[],seenCommunications=new Set();
const messageKinds={HYPOTHESIS:'Hipótese',BACKTEST_RESULT:'Resultado de teste',RISK_REVIEW:'Revisão de risco',EXECUTION_PLAN:'Plano de execução',PORTFOLIO_DECISION:'Decisão de portfólio',RESEARCH_FINDING:'Achado de pesquisa'};
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
 li.append(line,node('b',messageKinds[message.kind]),node('p',message.summary),node('small',date(message.createdAt)+' · '+message.id));return li;
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
function clearSpeech(){for(const view of agentViews.values()){view.speech?.remove();view.speech=null;if(view.speechTimer!==undefined)clearTimeout(view.speechTimer);view.speechTimer=undefined;}}
function showMessage(message){
 const view=agentViews.get(message.from);if(!view)return;view.speech?.remove();if(view.speechTimer!==undefined)clearTimeout(view.speechTimer);
 const speech=node('span',(messageKinds[message.kind]||message.kind)+' → '+message.to.map(id=>agents.get(id)?.name||id).join(', '));speech.className='recorded-speech';speech.setAttribute('title',message.summary+' · '+date(message.createdAt));speech.setAttribute('aria-hidden','true');view.button.append(speech);view.speech=speech;
 view.speechTimer=setTimeout(()=>{if(view.speech===speech){speech.remove();view.speech=null;view.speechTimer=undefined;}},8000);
}
async function refreshCommunications(){
 if(communicationBusy)return;communicationBusy=true;const version=++communicationVersion;
 try{
  const data=await get('/agent-messages');if(version!==communicationVersion)return;if(!Array.isArray(data))throw Error('invalid communications');
  const recent=data.slice(-20);if(recent.some(m=>typeof m.id!=='string'||!m.id||!spriteIds.includes(m.from)||!Array.isArray(m.to)||!m.to.length||m.to.some(id=>!spriteIds.includes(id))||!messageKinds[m.kind]||typeof m.summary!=='string'||!Number.isFinite(Date.parse(m.createdAt))))throw Error('invalid communication evidence');
  const initial=!communicationReady;communications=recent;
  if(!initial)for(const message of recent){const age=Date.now()-Date.parse(message.createdAt);if(!seenCommunications.has(message.id)&&age>=0&&age<=30000)showMessage(message);}
  seenCommunications=new Set(recent.map(m=>m.id));communicationReady=true;
 }catch{communications=[];communicationReady=false;clearSpeech();}
 finally{communicationBusy=false;if(inspectedRoom)renderRoom();}
}
q('#togglePresence').onclick=()=>{presenceEnabled=!presenceEnabled;stopPresence();render();};
q('#openCollaboration').onclick=()=>openRoom('Meeting Room');q('#closeRoom').onclick=()=>q('#roomDialog').close();
for(const button of document.querySelectorAll('button[data-space]'))button.onclick=()=>openRoom(button.dataset.space);
for(const id of ['#roomDialog','#profile','#workspaceDialog','#auditDialog','#studyDialog'])q(id).addEventListener('close',()=>render());
document.addEventListener?.('visibilitychange',()=>{stopPresence();render();});reducedMotion?.addEventListener?.('change',()=>{stopPresence();render();});
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
