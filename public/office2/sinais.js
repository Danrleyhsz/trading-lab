// Tela Sinais (docs/SIGNAL_FOLLOWER.md, seção 13): cola a mensagem do canal, confere, registra e mostra o resultado
// refeito com velas reais. Só simulação. Dados do usuário entram na página sempre via textContent.
(function () {
  const STATUS = {
    CLOSED: 'Fechado',
    OPEN: 'Aberto',
    PENDING: 'Aguardando entrada',
    CANCELLED_EXPIRED: 'Expirou sem entrar',
    REJECTED_INVALIDATED: 'Invalidado',
    FUTURES_SKIPPED_STOP_TOO_WIDE: 'Stop longe demais p/ futuros',
    SKIPPED_LOW_RR: 'RR baixo',
    RISK_MAX_OPEN: 'Limite de 3 abertos',
    DATA_MISSING: 'Sem dados da Binance',
    LIQUIDATED: 'Liquidado',
  };
  const FILL = { ENTRY: 'Entrada', EXIT: 'Saída', STOP: 'Stop', RUNNER_TIMEOUT: 'Runner encerrado', LIQUIDATION: 'Liquidação' };
  const KIND = { ENTRY: 'Entrada (1ª fase)', PHASE2: 'Segunda Fase', REJECTED_PARSE: 'Rejeitada' };
  const SLEEVE = { spot: 'Spot', futures: 'Futuros' };
  const BRASILIA = 3 * 3600000;

  const statusLabel = (s) => STATUS[s] || String(s);
  const pad = (n) => String(n).padStart(2, '0');
  const dec = (n, d) => n.toFixed(d).replace('.', ',');
  const signed = (n) => (n > 0 ? '+' : '') + dec(n, 2);
  /** Preços de moedas pequenas precisam de mais casas: 0,0615 não pode virar 0,06. */
  const price = (n) => {
    const text = n.toFixed(n >= 100 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 5 : 8);
    return (text.includes('.') ? text.replace(/\.?0+$/, '') : text).replace('.', ',');
  };
  const prices = (list) => (list && list.length ? list.map(price).join(' · ') : '—');
  /** "AAAA-MM-DD" de hoje no horário de Brasília (UTC-3, sem horário de verão). */
  const brasiliaToday = (now) => new Date((now === undefined ? Date.now() : now) - BRASILIA).toISOString().slice(0, 10);
  /** "DD/MM HH:MM" em Brasília a partir de um instante (ISO ou ms). */
  const brasiliaStamp = (value) => {
    const d = new Date(new Date(value).getTime() - BRASILIA);
    return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  };
  /** Hoje (ou vazio) → sem receivedAt: o servidor usa a hora da colagem. Outro dia → fim daquele dia em Brasília. */
  const receivedAtFor = (date, today) => (date && date !== today ? `${date}T23:59:00-03:00` : undefined);
  const variantKey = (v) => `${v.sleeve}:${v.runnerFraction}`;
  const variantLabel = (v) => `${SLEEVE[v.sleeve] || v.sleeve} · ${v.runnerFraction > 0 ? `Runner ${Math.round(v.runnerFraction * 100)}%` : 'Sem runner'}`;

  /** Linhas [rótulo, valor] do que o Lab entendeu da mensagem (resposta de dryRun). */
  function previewRows(p) {
    if (!p || p.kind === 'REJECTED_PARSE') return [['Motivo', (p && p.reason) || 'mensagem não reconhecida']];
    const s = p.signal || {};
    if (p.kind === 'PHASE2')
      return [
        ['Tipo', KIND.PHASE2],
        ['Moeda', s.symbol],
        ['Hora', s.time],
        ['Entrada original', price(s.originalEntry)],
        ['Leitura atual', price(s.priceAtSignal)],
        ['Suporte', price(s.support)],
        ['Alvos', prices(s.targets)],
        ['Sinal pai', p.parentId ? 'encontrado' : 'não encontrado (entra como sinal novo)'],
      ];
    return [
      ['Tipo', KIND.ENTRY],
      ['Moeda', s.symbol],
      ['Hora', s.time],
      ['Zona de entrada', `${price(s.zoneLow)} – ${price(s.zoneHigh)}`],
      ['Defesa', price(s.defense)],
      ['Parciais', prices(s.partials)],
      ['Alvos', prices(s.targets)],
      ['Convicção', s.conviction || '—'],
      ['Volatilidade', s.volatility || '—'],
      ['Risco', s.risk || '—'],
    ];
  }
  const canRegister = (p) => !!p && p.kind !== 'REJECTED_PARSE';

  /** Cartões do resumo de uma variante: { label, value, tone }. */
  function summaryCards(sum) {
    const tone = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
    return [
      { label: 'Fechados', value: String(sum.closed), tone: '' },
      { label: 'Abertos', value: String(sum.open), tone: '' },
      { label: 'Acertos', value: `${sum.wins} de ${sum.closed}`, tone: '' },
      { label: 'R total', value: signed(sum.totalR), tone: tone(sum.totalR) },
      { label: 'R médio', value: sum.averageR === null ? '—' : signed(sum.averageR), tone: sum.averageR === null ? '' : tone(sum.averageR) },
      { label: 'PnL (USDT)', value: signed(sum.pnl), tone: tone(sum.pnl) },
    ];
  }
  /** Texto de um fill: "Entrada 0,0615 · 66666,67 · 24/10 09:52". */
  const fillText = (f) => `${FILL[f.reason] || f.reason} ${price(f.price)} · qtd ${price(f.quantity)} · ${brasiliaStamp(f.time)}`;
  /** Texto do erro do servidor ao registrar/conferir. */
  function errorText(status, body) {
    const msg = body && body.error;
    if (status === 403) return 'Seguidor desligado no servidor, ligue SIGNAL_FOLLOWER_ENABLED.';
    if (status === 400 && msg === 'invalid receivedAt') return 'Data de recebimento inválida (não pode ser no futuro).';
    if (status === 400) return 'Mensagem inválida: precisa ter entre 10 e 5000 caracteres.';
    if (status === 401) return 'Sessão expirada: entre de novo.';
    return `Erro ${status} no servidor.`;
  }

  globalThis.SignalsView = {
    statusLabel, brasiliaToday, brasiliaStamp, receivedAtFor, variantKey, variantLabel,
    previewRows, canRegister, summaryCards, fillText, errorText, price,
  };
  if (typeof document === 'undefined') return;

  // ---------- tela ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  const api = async (method, url, payload) => {
    const res = await fetch(url, {
      method,
      headers: payload ? { 'content-type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    return { status: res.status, ok: res.ok, body: await res.json().catch(() => null) };
  };
  const state = { report: null, variant: 'spot:0', preview: null, busy: false };
  const sections = () => document.querySelectorAll('main > section:not(#login)');
  const setBusy = (busy) => {
    state.busy = busy;
    $('checkBtn').disabled = busy;
    $('refreshBtn').disabled = busy;
    $('saveBtn').disabled = busy || !canRegister(state.preview);
  };
  const note = (text, tone) => {
    const box = $('preview');
    box.replaceChildren();
    if (text) box.append(el('div', text, `msg ${tone || ''}`));
  };

  function showPreview(p) {
    state.preview = p;
    const box = $('preview');
    box.replaceChildren();
    const card = el('div', undefined, `msg ${canRegister(p) ? 'good' : 'bad'}`);
    card.append(el('b', canRegister(p) ? 'O Lab entendeu assim:' : 'Mensagem rejeitada'));
    const list = el('dl');
    for (const [k, v] of previewRows(p)) list.append(el('dt', k), el('dd', v === undefined ? '—' : v));
    card.append(list);
    box.append(card);
    $('saveBtn').disabled = !canRegister(p);
  }
  const receivedAt = () => receivedAtFor($('receivedDate').value, brasiliaToday());

  async function check() {
    const message = $('message').value.trim();
    if (!message) return note('Cole a mensagem primeiro.', 'bad');
    setBusy(true);
    state.preview = null;
    try {
      const r = await api('POST', '/paper/signals', { message, dryRun: true });
      if (r.status === 401) return showLogin();
      if (r.ok) showPreview(r.body);
      else note(errorText(r.status, r.body), 'bad');
    } catch {
      note('Sem conexão com o servidor.', 'bad');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const message = $('message').value.trim();
    setBusy(true);
    try {
      const payload = { message };
      const at = receivedAt();
      if (at) payload.receivedAt = at;
      const r = await api('POST', '/paper/signals', payload);
      if (r.status === 401) return showLogin();
      if (!r.ok) return note(errorText(r.status, r.body), 'bad');
      $('message').value = '';
      state.preview = null;
      note(`Registrado: ${KIND[r.body.kind] || r.body.kind}${r.body.reason ? ` (${r.body.reason})` : ''}.`, 'good');
      await refresh();
    } catch {
      note('Sem conexão com o servidor.', 'bad');
    } finally {
      setBusy(false);
    }
  }

  function renderStats(v) {
    const box = $('stats');
    box.replaceChildren();
    for (const c of summaryCards(v.summary)) {
      const card = el('div', undefined, 'stat');
      card.append(el('span', c.label, 'muted'), el('b', c.value, c.tone));
      box.append(card);
    }
  }
  function renderSignals(v) {
    const list = $('signals');
    list.replaceChildren();
    if (!v.signals.length) list.append(el('li', 'Nenhum sinal registrado ainda.', 'muted'));
    for (const s of v.signals) {
      const item = el('li');
      const lev = s.leverage ? ` · ${s.leverage}x` : '';
      item.append(el('b', `${s.symbol} · ${s.phase}ª fase · ${statusLabel(s.status)}${lev}`));
      if (s.fills.length || s.pnl) {
        const result = el('div', `R ${signed(s.r)} · PnL ${signed(s.pnl)} USDT`, s.pnl > 0 ? 'pos' : s.pnl < 0 ? 'neg' : '');
        item.append(result);
      }
      if (s.rr !== undefined) item.append(el('div', `RR calculado ${dec(s.rr, 2)}`, 'muted'));
      if (s.runnerClosedNoPhase2) item.append(el('div', 'Runner fechado: a Segunda Fase não veio a tempo.', 'muted'));
      if (s.error) item.append(el('div', s.error, 'muted'));
      for (const f of s.fills) item.append(el('div', fillText(f), 'muted'));
      list.append(item);
    }
  }
  function renderMessages(messages) {
    const list = $('messages');
    list.replaceChildren();
    if (!messages.length) list.append(el('li', 'Nenhuma mensagem registrada.', 'muted'));
    for (const m of [...messages].reverse()) {
      const item = el('li');
      const origin = m.receivedAtSource === 'OWNER' ? 'data informada por você' : 'colada na hora';
      item.append(el('b', `${KIND[m.kind] || m.kind} · ${brasiliaStamp(m.receivedAt)}`), el('div', origin, 'muted'));
      if (m.reason) item.append(el('div', `Motivo: ${m.reason}`, 'neg'));
      item.append(el('div', m.raw.split('\n')[0].slice(0, 120), 'muted'));
      list.append(item);
    }
  }
  function renderReport() {
    const r = state.report;
    if (!r) return;
    const tabs = $('tabs');
    tabs.replaceChildren();
    for (const v of r.variants) {
      const b = el('button', variantLabel(v));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(variantKey(v) === state.variant));
      b.addEventListener('click', () => {
        state.variant = variantKey(v);
        renderReport();
      });
      tabs.append(b);
    }
    const current = r.variants.find((v) => variantKey(v) === state.variant) || r.variants[0];
    if (current) {
      renderStats(current);
      renderSignals(current);
    }
    renderMessages(r.messages);
  }
  async function refresh() {
    $('reportStatus').textContent = 'Buscando velas da Binance…';
    try {
      const r = await api('GET', '/paper/signals');
      if (r.status === 401) return showLogin();
      if (!r.ok) {
        $('reportStatus').textContent = errorText(r.status, r.body);
        return;
      }
      state.report = r.body;
      renderReport();
      $('reportStatus').textContent = `Atualizado ${brasiliaStamp(r.body.generatedAt)}${r.body.enabled ? '' : ' · seguidor desligado no servidor'}`;
    } catch {
      $('reportStatus').textContent = 'Sem conexão com o servidor.';
    }
  }

  function showLogin() {
    $('login').classList.remove('hidden');
    sections().forEach((s) => s.classList.add('hidden'));
  }
  function showApp() {
    $('login').classList.add('hidden');
    sections().forEach((s) => s.classList.remove('hidden'));
  }
  async function login(event) {
    event.preventDefault();
    const status = $('loginStatus');
    try {
      const r = await api('POST', '/auth/login', { accessToken: $('accessToken').value });
      if (r.status === 401) return void (status.textContent = 'Código inválido.');
      if (r.status === 429) return void (status.textContent = 'Muitas tentativas: espere 1 minuto.');
      if (!r.ok) return void (status.textContent = `Erro ${r.status} no servidor.`);
      $('accessToken').value = '';
      status.textContent = '';
      showApp();
      await refresh();
    } catch {
      status.textContent = 'Sem conexão com o servidor.';
    }
  }

  async function start() {
    const today = brasiliaToday();
    $('receivedDate').value = today;
    $('receivedDate').max = today;
    $('loginForm').addEventListener('submit', login);
    $('checkBtn').addEventListener('click', check);
    $('saveBtn').addEventListener('click', save);
    $('refreshBtn').addEventListener('click', refresh);
    // Mudou o texto ou a data depois de conferir: precisa conferir de novo antes de registrar.
    for (const id of ['message', 'receivedDate'])
      $(id).addEventListener('input', () => {
        state.preview = null;
        $('saveBtn').disabled = true;
      });
    try {
      const auth = await api('GET', '/auth/status');
      if (auth.ok && auth.body.required && !auth.body.authenticated) return showLogin();
    } catch {
      $('reportStatus').textContent = 'Sem conexão com o servidor.';
      return;
    }
    await refresh();
  }
  start();
})();
