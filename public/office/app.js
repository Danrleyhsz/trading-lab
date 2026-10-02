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
    const [states, portfolio, market, accounts] = await Promise.all([get('/agents'), get('/portfolio'), get('/market/latest'), get('/paper/accounts')]);
    // A snapshot requested before a stream event must not move an agent back.
    if (initialStateVersion === stateVersion) {
      agents.clear();
      states.forEach(agent => agents.set(agent.id, agent));
      render();
    }
    renderAccounts(accounts);q('#equity').textContent = money(portfolio.equity);
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
