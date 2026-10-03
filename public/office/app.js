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
        const row=node('article','');row.className='trade-outcome';
        row.append(node('b',trade.symbol+' '+trade.direction+' · '+money(trade.netPnl)),node('p',date(trade.openedAt)+' → '+date(trade.closedAt)),node('small','P&L bruto '+money(trade.grossPnl)+' · taxas '+money(trade.feesPaid)+' · funding '+money(trade.fundingCashDelta)),node('p','Eventos de fills: '+trade.fillEventIds.join(', ')));
        if(trade.fundingEventIds.length)row.append(node('small','Funding: '+trade.fundingEventIds.join(', ')));
        group.append(row);
      }
      if(!performance.closedTrades.length)group.append(node('p','Nenhuma operação completa registrada. Posições abertas não entram na taxa de acerto.'));
    } else group.append(node('p',performance?.reason || 'Evidências indisponíveis'));
    const link=node('a','Ver auditoria de operações (JSON)');
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
function openPanel(panel, title, navId) {
  for (const id of ['agentsPanel','financePanel','marketPanel','researchPanel','accessPanel']) q('#'+id).hidden = id !== panel;
  q('#workspaceTitle').textContent = title;
  for (const id of ['navOffice','navAgents','navFinance','navMarket','navResearch','navAccess']) {
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
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw Error(url);
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
function render(movingId) { const focusedAgent = document.activeElement?.dataset?.agentId;
  const positions = new Map();
  document.querySelectorAll('.agent').forEach(button => {
    if (button.getBoundingClientRect) positions.set(button.dataset.agentId, {rect:button.getBoundingClientRect(), room:button.dataset.room});
  });
  document.querySelectorAll('.occupants').forEach(element => element.replaceChildren());
  q('#unmapped').replaceChildren();
  q('#agentList').replaceChildren();
  const slots = new Map();
  for (const agent of agents.values()) {
    const button = node('button', '');
    button.className = 'agent';button.dataset.agentId = agent.id;button.dataset.status = agent.status;button.dataset.room = agent.room;
    const avatar = node('span', '');avatar.className = 'sprite';avatar.setAttribute('aria-hidden','true');sprite(avatar, agent.id);
    button.append(avatar, node('b', agent.name), node('small', statusLabels[agent.status] || agent.status));
    button.onclick = () => profile(agent.id);
    button.setAttribute('aria-label', agent.name + ', ' + agent.room + ', ' + (statusLabels[agent.status] || agent.status));
    button.setAttribute('title', agent.lastReason || 'Nenhuma atividade registrada');
    const room = [...document.querySelectorAll('[data-room]')].find(element => element.dataset.room === agent.room);
    const slot = slots.get(agent.room) || 0;slots.set(agent.room, slot + 1);
    const x = [22, 53, 83, 22, 53, 83, 22, 53][slot % 8];
    const y = [78, 78, 78, 47, 47, 47, 29, 29][slot % 8];
    button.setAttribute('style', 'left:' + x + '%;top:' + y + '%');
    (room?.querySelector('.occupants') || q('#unmapped')).append(button);if (agent.id === focusedAgent) button.focus?.({preventScroll:true});
    const old = positions.get(agent.id);
    // Only a backend room transition animates travel; idle characters never invent work.
    if (agent.id === movingId && old && old.room !== agent.room && button.animate && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      const next = button.getBoundingClientRect();
      button.animate([{translate:(old.rect.left-next.left)+'px '+(old.rect.top-next.top)+'px'}, {translate:'0px 0px'}], {duration:500,easing:'ease-out'});
    }
    const row = node('button', agent.name + ' · ' + agent.room + ' · ' + (statusLabels[agent.status] || agent.status));
    row.onclick = () => profile(agent.id);q('#agentList').append(row);
  }
  q('#activeAgents').textContent = [...agents.values()].filter(agent => agent.status !== 'IDLE').length + ' / ' + agents.size;
  if (selected) renderState();
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
  selected = id;
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
      if (memory.confidence !== undefined) row.append(node('p', 'Confiança registrada: ' + memory.confidence));
      return row;
    });
    records('#activity', result.messages, message => {
      const row = node('li', '');
      row.append(node('b', message.kind), node('p', message.summary), node('p', `${message.from} → ${message.to.join(', ')}`), node('small', date(message.createdAt)));
      return row;
    });
    records('#history', result.activity, activity => {
      const row = node('li', '');
      row.append(node('b', `${activity.state.room} · ${activity.state.status}`), node('p', activity.state.lastReason || ''), node('small', date(activity.occurredAt)), node('p', 'Evento de origem: ' + activity.eventId));
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
    if (event.type === 'MARKET_DATA_FAILED') { onlineVersion++; marketUnavailable('USD-M indisponível · ordens paper bloqueadas'); }
    if (event.type === 'MARKET_TICK') {
      marketVersion++;
      q('#market').textContent = event.payload.symbol + ' ' + money(event.payload.price);observeTrace('spot',event.payload.price,event.payload.timestamp);
      return;
    }
    if (events.some(item => item.id === event.id)) return;
    events.unshift(event);
    events.splice(50);
    q('#events').replaceChildren(...events.map(item => node('li', date(item.occurredAt) + ' · ' + (item.type === 'AGENT_STATE_CHANGED' ? (item.payload.name + ' · ' + (statusLabels[item.payload.status] || item.payload.status) + ' · ' + item.payload.room) : item.type))));
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

let onlineBusy = false, onlineVersion = 0, halted = null;
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
async function refreshOnline() {
  if (onlineBusy) return;onlineBusy = true;const version = onlineVersion;
  try {
    const results = await Promise.allSettled([get('/market/v3'), get('/finance'), get('/backtests/v2/studies'), get('/paper/perpetual/status')]);
    if (results[0].status === 'fulfilled' && version === onlineVersion) showPerpetualMarket(results[0].value);
    else if (results[0].status === 'rejected') marketUnavailable('Dados USD-M indisponíveis · preços podem estar desatualizados');
    if (results[1].status === 'fulfilled') {
      const data = results[1].value, host = q('#finance');host.replaceChildren();renderFinancialOverview(data);
      for (const account of [...(data.legacyAccounts || []), ...(data.perpetualAccounts || [])]) {
        const card = node('article', '');const net = account.portfolio.equity - account.initialCash;
        card.append(node('h3', account.kind === 'FUND' ? 'Fundo · portfólio paper separado' : 'Avaliação · ' + account.ownerAgentId), node('p', account.instrument), node('p', 'Patrimônio: ' + money(account.portfolio.equity)), node('p', 'P&L líquido: ' + money(net)), node('p', 'Taxas: ' + money(account.feesPaid)), node('p', 'Funding: ' + money(account.fundingCashDelta)), node('p', 'Drawdown máximo observado: ' + (Number.isFinite(account.maxDrawdown) ? (account.maxDrawdown * 100).toFixed(2) + '%' : 'indisponível')));
        if (account.instrument === 'BINANCE_USDM:BTCUSDT') card.append(node('p', 'Margem: ' + money(account.initialMargin)), node('small', account.valuationFresh ? 'Avaliação atual por amostragem' : 'Avaliação indisponível ou desatualizada'));
        card.append(node('p',outcomeLabel(account.performance)));renderEquitySamples(card,account);host.append(card);
      }
    } else { q('#finance').textContent = 'Dados financeiros indisponíveis · entre se o acesso for exigido';q('#positions').textContent = 'Posições indisponíveis ou desatualizadas';q('#performance').textContent = 'Contas indisponíveis ou desatualizadas'; }
    if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) records('#studyList', [...results[2].value].reverse(), study => { const li = node('li', '');const button = node('button', `${study.status} · ${date(study.createdAt)}${Number.isFinite(study.netPnl) ? ' · P&L histórico ' + money(study.netPnl) : ''}`);button.onclick = () => studyDetails(study.id);li.append(button);return li; });
    if (results[3].status === 'fulfilled') {
      const status = results[3].value;q('#riskSummary').textContent = 'Execução ' + (status.executionEnabled ? 'habilitada' : 'desligada') + ' · Autonomia ' + (status.autonomous?.enabled ? 'habilitada' : 'desligada') + (status.halted ? ' · Novas exposições pausadas' : '');halted = status.halted;q('#haltPaper').disabled = typeof halted !== 'boolean';q('#haltPaper').textContent = halted ? 'Retomar exposições paper permitidas' : 'Pausar novas exposições paper';
      q('#onlineStatus').textContent = `Execução perpétua ${status.executionEnabled ? 'habilitada' : 'desligada'} · nova exposição ${halted ? 'pausada' : 'sujeita ao risco'} · autonomia ${status.autonomous?.enabled ? 'habilitada' : 'desligada'} · ${status.autonomous?.reason || 'estado indisponível'}. Somente avaliação independente.`;
    } else { halted = null;q('#riskSummary').textContent = 'Estado de risco indisponível';q('#haltPaper').disabled = true;q('#onlineStatus').textContent = 'Controles indisponíveis · entre se o acesso for exigido'; }
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
refreshOnline();setInterval(refreshOnline, 5000);

q('#navOffice').onclick = () => q('#workspaceDialog').close();
q('#navAgents').onclick = () => openPanel('agentsPanel','Equipe do laboratório','navAgents');
q('#navFinance').onclick = () => openPanel('financePanel','Portfólio e contas','navFinance');
q('#navMarket').onclick = () => openPanel('marketPanel','Mercado observado','navMarket');
q('#navResearch').onclick = () => openPanel('researchPanel','Pesquisa, estudos e risco','navResearch');
q('#navAccess').onclick = () => openPanel('accessPanel','Acesso ao painel','navAccess');
q('#openControls').onclick = q('#navResearch').onclick;
q('#closeWorkspace').onclick = () => q('#workspaceDialog').close();
q('#workspaceDialog').addEventListener('close', () => {
  for (const id of ['navOffice','navAgents','navFinance','navMarket','navResearch','navAccess']) {q('#'+id).className = 'nav' + (id === 'navOffice' ? ' active' : '');q('#'+id).setAttribute('aria-current',id === 'navOffice' ? 'page' : 'false');}
});