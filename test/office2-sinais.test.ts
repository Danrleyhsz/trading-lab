import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Tela Sinais: só os helpers puros (a parte de DOM não roda sem `document`).
function view() {
  const c = vm.createContext({ Math, Object, Array, Number, String, JSON, Date });
  vm.runInContext(readFileSync('public/office2/sinais.js', 'utf8'), c);
  return c.SignalsView;
}
const plain = (x: unknown) => JSON.parse(JSON.stringify(x));

test('status em português para todos os estados do relatório', () => {
  const V = view();
  const expected: Record<string, string> = {
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
  for (const [k, v] of Object.entries(expected)) assert.equal(V.statusLabel(k), v);
  assert.equal(V.statusLabel('NOVO'), 'NOVO');
});

test('receivedAt: hoje (Brasília) não envia nada; outro dia vira 23:59 -03:00', () => {
  const V = view();
  const lateUtc = Date.UTC(2026, 9, 25, 1, 30); // 24/10 22:30 em Brasília
  assert.equal(V.brasiliaToday(lateUtc), '2026-10-24');
  assert.equal(V.receivedAtFor('2026-10-24', '2026-10-24'), undefined);
  assert.equal(V.receivedAtFor('', '2026-10-24'), undefined);
  assert.equal(V.receivedAtFor('2026-10-20', '2026-10-24'), '2026-10-20T23:59:00-03:00');
  assert.equal(V.brasiliaStamp('2026-10-24T12:51:00.000Z'), '24/10 09:51');
});

test('conferência: linhas de entrada, Segunda Fase e rejeição; só rejeitada bloqueia o registro', () => {
  const V = view();
  const entry = {
    kind: 'ENTRY',
    signal: { symbol: 'AIOTUSDT', time: '09:51', zoneLow: 0.0602, zoneHigh: 0.0612, defense: 0.06, partials: [0.0638, 0.0668], targets: [0.0675], conviction: 'BOA', volatility: 'EXTREMA', risk: 'ALTO' },
  };
  const rows = Object.fromEntries(plain(V.previewRows(entry)));
  assert.equal(rows['Moeda'], 'AIOTUSDT');
  assert.equal(rows['Zona de entrada'], '0,0602 – 0,0612');
  assert.equal(rows['Defesa'], '0,06');
  assert.equal(rows['Parciais'], '0,0638 · 0,0668');
  assert.equal(rows['Risco'], 'ALTO');
  const phase2 = { kind: 'PHASE2', parentId: 'x', signal: { symbol: 'AIOTUSDT', time: '09:54', originalEntry: 0.0608, priceAtSignal: 0.0678, support: 0.0621, targets: [0.0715, 0.0741] } };
  const p2 = Object.fromEntries(plain(V.previewRows(phase2)));
  assert.equal(p2['Suporte'], '0,0621');
  assert.equal(p2['Sinal pai'], 'encontrado');
  assert.match(Object.fromEntries(plain(V.previewRows({ ...phase2, parentId: undefined })))['Sinal pai'], /não encontrado/);
  const bad = { kind: 'REJECTED_PARSE', reason: 'defesa não encontrada' };
  assert.deepEqual(plain(V.previewRows(bad)), [['Motivo', 'defesa não encontrada']]);
  assert.equal(V.canRegister(entry), true);
  assert.equal(V.canRegister(phase2), true);
  assert.equal(V.canRegister(bad), false);
  assert.equal(V.canRegister(null), false);
});

test('resumo, rótulos de variante e fills formatados', () => {
  const V = view();
  const cards = plain(V.summaryCards({ closed: 3, open: 1, wins: 2, totalR: 4.5, averageR: 1.5, pnl: -12.345 }));
  assert.deepEqual(cards.map((c: any) => [c.label, c.value, c.tone]), [
    ['Fechados', '3', ''],
    ['Abertos', '1', ''],
    ['Acertos', '2 de 3', ''],
    ['R total', '+4,50', 'pos'],
    ['R médio', '+1,50', 'pos'],
    ['PnL (USDT)', '-12,35', 'neg'],
  ]);
  assert.equal(plain(V.summaryCards({ closed: 0, open: 0, wins: 0, totalR: 0, averageR: null, pnl: 0 }))[4].value, '—');
  assert.equal(V.variantLabel({ sleeve: 'futures', runnerFraction: 0.2 }), 'Futuros · Runner 20%');
  assert.equal(V.variantLabel({ sleeve: 'spot', runnerFraction: 0 }), 'Spot · Sem runner');
  assert.equal(V.fillText({ reason: 'ENTRY', price: 0.0612, quantity: 66666.67, time: Date.UTC(2026, 9, 24, 12, 52) }), 'Entrada 0,0612 · qtd 66666,67 · 24/10 09:52');
});

test('mensagens de erro do servidor ao registrar', () => {
  const V = view();
  assert.match(V.errorText(403, null), /SIGNAL_FOLLOWER_ENABLED/);
  assert.match(V.errorText(400, { error: 'invalid receivedAt' }), /futuro/);
  assert.match(V.errorText(400, { error: 'invalid message' }), /10 e 5000/);
  assert.match(V.errorText(500, null), /500/);
});

test('sinais.js não usa innerHTML nem insertAdjacentHTML', () => {
  assert.doesNotMatch(readFileSync('public/office2/sinais.js', 'utf8'), /innerHTML|insertAdjacentHTML|document\.write/);
});
