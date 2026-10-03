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
function render() {
  document.querySelectorAll('.occupants').forEach(element => element.replaceChildren());
  q('#agentList').replaceChildren();
  for (const agent of agents.values()) {
    const button = node('button', '');
    button.className = 'agent';
    button.append(node('span', '▣'), node('b', agent.name), node('small', agent.status));
    button.onclick = () => profile(agent.id);
    button.setAttribute('aria-label', `${agent.name}, ${agent.room}, ${agent.status}`);
    const room = [...document.querySelectorAll('[data-room]')].find(element => element.dataset.room === agent.room);
    (room?.querySelector('.occupants') || q('#unmapped')).append(button);
    const row = node('button', `${agent.name} · ${agent.room} · ${agent.status}`);
    row.onclick = () => profile(agent.id);
    q('#agentList').append(row);
  }
  if (selected) renderState();
}
function renderState() {
  const agent = agents.get(selected);
  if (!agent) return;
  q('#profileTitle').textContent = agent.name;
  q('#profileState').textContent = `${agent.role} · ${agent.room} · ${agent.status}`;
  q('#experience').textContent = `Experience: ${agent.experience} recorded transitions`;
  q('#reason').textContent = (agent.specialization ? agent.specialization + ' · ' : '') + (agent.lastReason || 'No activity reason recorded');
  q('#updated').textContent = 'Backend state updated: ' + date(agent.updatedAt);
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
  if (!items.length) host.textContent = 'No records available.';
  for (const item of [...items].reverse()) host.append(renderRecord(item));
}
async function details() {
  const id = selected, version = ++profileVersion;
  if (!id) return;
  const selectors = ['#memories', '#activity', '#career', '#history'];
  selectors.forEach(selector => q(selector).textContent = 'Loading…');
  try {
    const result = await get('/agents/' + encodeURIComponent(id) + '/profile');
    if (version !== profileVersion || id !== selected) return;
    const evidence = result.evidence, coverage = result.coverage;
    q('#perpetualProfile').textContent = (result.perpetualEvaluationAccounts || []).map(a => 'Perpetual evaluation: ' + money(a.portfolio.equity - a.initialCash) + ' net P&L · funding ' + money(a.fundingCashDelta) + ' · fees ' + money(a.feesPaid) + ' · max observed drawdown ' + (a.maxDrawdown === null ? 'unavailable' : (a.maxDrawdown * 100).toFixed(2) + '%') + (a.valuationFresh ? '' : ' · valuation stale')).join(' | ');
    q('#career').textContent = `${evidence.observations} observations · ${evidence.decisions} decisions · ${evidence.failures} failures · ${evidence.lessons} lessons · ${evidence.sentMessages} sent messages. Strategies studied: ${evidence.strategyIds.length}. ${result.evaluationAccounts?.length ? 'Evaluation net P&L: ' + money(result.performance.netPnl) + '. Fees: ' + money(result.performance.feesPaid) + '. Fund excluded. Win rate and drawdown unavailable.' : 'Individual P&L, win rate and drawdown unavailable: no attributed evaluation account.'}`;
    q('#coverage').textContent = `${evidence.recordedTransitions} transitions in preserved history. ${coverage.legacyTransitionsWithoutHistory} older transitions have no detailed history. History starts: ${coverage.activitySince ? date(coverage.activitySince) : 'no recorded transitions yet'}.`;
    records('#memories', result.memories, memory => {
      const row = node('li', '');
      row.append(node('b', memory.kind), node('p', memory.summary), node('small', date(memory.createdAt)));
      const strategyId = memory.strategyId || memory.metadata?.strategyId;
      if (strategyId) row.append(node('p', 'Strategy: ' + strategyId));
      if (memory.tags?.length) row.append(node('p', memory.tags.join(' · ')));
      if (memory.confidence !== undefined) row.append(node('p', 'Recorded confidence: ' + memory.confidence));
      return row;
    });
    records('#activity', result.messages, message => {
      const row = node('li', '');
      row.append(node('b', message.kind), node('p', message.summary), node('p', `${message.from} → ${message.to.join(', ')}`), node('small', date(message.createdAt)));
      return row;
    });
    records('#history', result.activity, activity => {
      const row = node('li', '');
      row.append(node('b', `${activity.state.room} · ${activity.state.status}`), node('p', activity.state.lastReason || ''), node('small', date(activity.occurredAt)), node('p', 'Source event: ' + activity.eventId));
      return row;
    });
  } catch {
    if (version !== profileVersion || id !== selected) return;
    selectors.forEach(selector => q(selector).textContent = 'Data unavailable. Reopen to retry.');
    q('#coverage').textContent = '';
  }
}
q('#closeProfile').onclick = () => q('#profile').close();
q('#profile').addEventListener('close', () => { selected = undefined; profileVersion++; });
q('#runResearch').onclick = async () => {
  const button = q('#runResearch');
  button.disabled = true;
  q('#researchActionStatus').textContent = 'Research requested…';
  try {
    const response = await fetch('/research/run', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({symbol: 'BTCUSDT'})});
    const run = await response.json();
    q('#researchActionStatus').textContent = run.status ? 'Recorded result: ' + run.status : 'Request could not complete. See recorded activity.';
    refresh();
    if (selected) details();
  } catch {
    q('#researchActionStatus').textContent = 'Could not contact the laboratory.';
  } finally { button.disabled = false; }
};
function renderResearch(runs) {
  records('#researchRuns', [...runs].reverse(), run => {
    const row = node('li', '');
    row.append(node('b', run.status === 'SCREEN_PASSED' ? 'Historical screen passed' : run.status === 'REJECTED' ? 'Hypothesis rejected' : 'Research failed'), node('p', date(run.completedAt)));
    if (run.datasetHash) row.append(node('small', 'Evidence: ' + run.datasetHash));
    if (run.backtest) row.append(node('p', `${run.backtest.trades} historical trades · Simulated backtest P&L ${money(run.backtest.netPnl)}`));
    return row;
  });
}
function renderAccounts(items) {
  const host = q('#accounts');
  host.replaceChildren();
  for (const account of items) {
    const row = node('li', '');
    row.append(node('b', account.kind === 'FUND' ? 'Fund · separate official paper portfolio' : 'Evaluation · ' + account.ownerAgentId), node('p', 'Equity: ' + money(account.portfolio.equity)), node('p', 'Net P&L: ' + money(account.portfolio.equity - account.initialCash)), node('small', `${account.fills} recorded fills · Initial virtual capital: ${money(account.initialCash)}`));
    host.append(row);
  }
  q('#accountScope').textContent = items.some(account => account.kind === 'EVALUATION') ? 'Evaluation capital is independent. These balances are never added to fund equity.' : 'Evaluation accounts are not configured. Fund remains separate.';
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
    if (initialMarketVersion === marketVersion) q('#market').textContent = market.price ? market.symbol + ' ' + money(market.price) : 'Waiting for market data';
    q('#sync').textContent = 'Snapshot received ' + new Date().toLocaleTimeString();
  } catch {
    q('#sync').textContent = 'Backend unavailable · displayed data may be stale';q('#accountScope').textContent = 'Account data unavailable or stale';
  } finally { busy = false; }
}
function connect() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/events`);
  ws.onopen = () => { q('#connection').textContent = 'Event stream connected'; refresh(); if (selected) details(); };
  ws.onmessage = message => {
    let event;
    try { event = JSON.parse(message.data); } catch { return; }
    if (!event.id || !event.type) return;
    if (event.type === 'PERPETUAL_MARKET_UPDATED') { onlineVersion++; showPerpetualMarket({quote: event.payload, status: 'HEALTHY'}); refreshOnline(); return; }
    if (event.type === 'MARKET_DATA_FAILED') { q('#marketV3').textContent = 'USD-M market unavailable · paper orders blocked'; }
    if (event.type === 'MARKET_TICK') {
      marketVersion++;
      q('#market').textContent = event.payload.symbol + ' ' + money(event.payload.price);
      return;
    }
    if (events.some(item => item.id === event.id)) return;
    events.unshift(event);
    events.splice(50);
    q('#events').replaceChildren(...events.map(item => node('li', date(item.occurredAt) + ' · ' + item.type)));
    if (event.type === 'AGENT_STATE_CHANGED') {
      stateVersion++;
      agents.set(event.payload.id, event.payload);
      render();
    }
    refresh();
    if (selected) details();
  };
  ws.onerror = () => ws.close();
  ws.onclose = () => {
    q('#connection').textContent = 'Event stream disconnected · retrying';
    setTimeout(connect, 3000);
  };
}
refresh();
setInterval(() => { refresh(); if (selected) details(); }, 5000);
connect();

let onlineBusy = false, onlineVersion = 0, halted = null;
function showPerpetualMarket(market) {
  const quote = market.quote;
  q('#marketV3').textContent = quote ? `BTCUSDT perpetual · bid ${money(quote.bid)} · ask ${money(quote.ask)} · mark ${money(quote.markPrice)} · quoted funding ${(quote.fundingRate * 100).toFixed(4)}% · ${market.status}. Updated ${date(quote.markTime)}` : 'USD-M market unavailable · paper orders blocked';
}
async function studyDetails(id) {
  q('#studyDialog').showModal();q('#studyDetails').textContent = 'Loading…';
  try {
    const study = await get('/backtests/v2/studies/' + encodeURIComponent(id));
    const host = q('#studyDetails');host.replaceChildren();host.append(node('p', 'Recorded status: ' + study.status));
    if (study.error) host.append(node('p', study.error));
    if (study.result) {
      host.append(node('p', 'Out-of-sample simulated P&L: ' + money(study.result.netPnl)), node('p', 'Evidence: ' + study.result.datasetHash), node('p', 'Historical results do not approve fund trading. Each fold starts and ends flat. Unused tail bars: ' + study.result.excludedTailBars));
      for (const fold of study.result.folds) host.append(node('p', `${date(fold.testStart)} → ${date(fold.testEnd)} · ${fold.configuration?.strategy || 'SMA'} · ${fold.result.trades ?? 'unavailable'} historical trades · P&L ${money(fold.result.netPnl)} · fees ${money(fold.result.feesPaid)} · funding ${money(fold.result.fundingCashDelta)} · drawdown ${(fold.result.maxDrawdown * 100).toFixed(2)}% · ${fold.result.liquidations} modeled liquidations`));
      host.append(node('p', 'Liquidation uses configured conservative assumptions, not the complete rules of the exchange.'));
    }
  } catch { q('#studyDetails').textContent = 'Study unavailable. Sign in if access is required.'; }
}
q('#closeStudy').onclick = () => q('#studyDialog').close();
async function refreshOnline() {
  if (onlineBusy) return;onlineBusy = true;const version = onlineVersion;
  try {
    const results = await Promise.allSettled([get('/market/v3'), get('/finance'), get('/backtests/v2/studies'), get('/paper/perpetual/status')]);
    if (results[0].status === 'fulfilled' && version === onlineVersion) showPerpetualMarket(results[0].value);
    else if (results[0].status === 'rejected') q('#marketV3').textContent = 'USD-M data unavailable · displayed prices may be stale';
    if (results[1].status === 'fulfilled') {
      const data = results[1].value, host = q('#finance');host.replaceChildren();
      for (const account of [...(data.legacyAccounts || []), ...(data.perpetualAccounts || [])]) {
        const card = node('article', '');const net = account.portfolio.equity - account.initialCash;
        card.append(node('h3', account.kind === 'FUND' ? 'Fund · separate paper portfolio' : 'Evaluation · ' + account.ownerAgentId), node('p', account.instrument), node('p', 'Equity: ' + money(account.portfolio.equity)), node('p', 'Net P&L: ' + money(net)), node('p', 'Fees: ' + money(account.feesPaid)), node('p', 'Funding: ' + money(account.fundingCashDelta)), node('p', 'Max observed drawdown: ' + (Number.isFinite(account.maxDrawdown) ? (account.maxDrawdown * 100).toFixed(2) + '%' : 'unavailable')));
        if (account.instrument === 'BINANCE_USDM:BTCUSDT') card.append(node('p', 'Margin: ' + money(account.initialMargin)), node('small', account.valuationFresh ? 'Current sampled valuation' : 'Valuation unavailable or stale'));
        host.append(card);
      }
    } else q('#finance').textContent = 'Financial data unavailable · sign in if access is required';
    if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) records('#studyList', [...results[2].value].reverse(), study => { const li = node('li', '');const button = node('button', `${study.status} · ${date(study.createdAt)}${Number.isFinite(study.netPnl) ? ' · historical P&L ' + money(study.netPnl) : ''}`);button.onclick = () => studyDetails(study.id);li.append(button);return li; });
    if (results[3].status === 'fulfilled') {
      const status = results[3].value;halted = status.halted;q('#haltPaper').disabled = typeof halted !== 'boolean';q('#haltPaper').textContent = halted ? 'Resume permitted paper exposure' : 'Pause new paper exposure';
      q('#onlineStatus').textContent = `Perpetual execution ${status.executionEnabled ? 'enabled' : 'disabled'} · new exposure ${halted ? 'paused' : 'subject to risk'} · autonomous ${status.autonomous?.enabled ? 'enabled' : 'disabled'} · ${status.autonomous?.reason || 'status unavailable'}. Independent evaluation only.`;
    } else { halted = null;q('#haltPaper').disabled = true;q('#onlineStatus').textContent = 'Controls unavailable · sign in if access is required'; }
  } finally { onlineBusy = false; }
}
q('#runStudy').onclick = async () => {
  const button = q('#runStudy');button.disabled = true;
  try { const response = await fetch('/backtests/v2/studies', {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const result = await response.json();q('#studyActionStatus').textContent = response.ok ? 'Historical study recorded: ' + result.id : result.error || 'Study unavailable';await refreshOnline(); }
  catch { q('#studyActionStatus').textContent = 'Could not contact the laboratory'; } finally { button.disabled = false; }
};
q('#haltPaper').onclick = async () => {
  if (typeof halted !== 'boolean') return;q('#haltPaper').disabled = true;
  try { const response = await fetch('/paper/perpetual/halt', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({halted:!halted})});if (!response.ok) throw Error();await refreshOnline(); }
  catch { q('#onlineStatus').textContent = 'Control change failed. Recheck backend status.'; }
};
q('#loginPanel').onclick = async () => {
  try { const response = await fetch('/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:q('#accessToken').value})});q('#accessToken').value = '';q('#loginStatus').textContent = response.ok ? 'Signed in' : 'Access rejected';if (response.ok) { await refresh();await refreshOnline(); } }
  catch { q('#loginStatus').textContent = 'Could not contact the laboratory'; }
};
refreshOnline();setInterval(refreshOnline, 5000);
