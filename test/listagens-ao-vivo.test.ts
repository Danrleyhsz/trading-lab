import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discover,
  evaluateLive,
  LIVE,
  type CoinData,
  type ContractInfo,
  type LedgerEntry,
} from '../scripts/estudos/listagens-ao-vivo.js';

const H = 3600000,
  T = Date.UTC(2026, 9, 10, 3, 0);
const info = (symbol: string, onboard: number, over: Partial<ContractInfo> = {}): ContractInfo => ({
  symbol,
  baseAsset: symbol.replace('USDT', ''),
  quoteAsset: 'USDT',
  contractType: 'PERPETUAL',
  status: 'TRADING',
  underlyingType: 'COIN',
  onboardDate: onboard,
  ...over,
});

test('descoberta: só contratos novos cuja entrada é posterior ao instante do protocolo, sem repetir o livro-razão', () => {
  const now = T + 10 * H,
    led: LedgerEntry[] = [
      {
        symbol: 'OLDUSDT',
        baseAsset: 'OLD',
        onboardDate: new Date(T - H).toISOString(),
        firstSeenAt: new Date(T).toISOString(),
        entryTimeUtc: new Date(T + 167 * H).toISOString(),
      },
    ];
  const out = discover(
    [
      info('OLDUSDT', T - H), // já no livro-razão
      info('NEWUSDT', T - 24 * H), // entrada em T+144h: depois do instante, entra
      info('PASTUSDT', T - 200 * H), // entrada em T-32h: antes do instante, fica de fora
      info('FUTUREUSDT', now + 5 * H), // ainda não listado
      info('STOCKUSDT', T - H, { underlyingType: 'EQUITY' }),
      info('OFFUSDT', T - H, { status: 'SETTLING' }),
      info('USDCPAIR', T - H, { quoteAsset: 'USDC' }),
      info('BTCUSDT', T - H),
      info('QUARTERUSDT', T - H, { contractType: 'CURRENT_QUARTER' }),
    ],
    led,
    T,
    now,
  );
  assert.deepEqual(
    out.map((e) => e.symbol),
    ['NEWUSDT'],
  );
  assert.equal(out[0].entryTimeUtc, new Date(T - 24 * H + 168 * H).toISOString());
});

/** Moeda sintética que cai 0,5% ao dia (perde da BTC parada); candles horários a partir de `first`, até `lastClosed`. */
function raw(first: number, lastClosed: number, start = 100, drift = -0.0002, spike?: { at: number; mult: number }) {
  const out = [];
  let p = start;
  for (let t = first; t <= lastClosed; t += H) {
    const o = p;
    p = o * (1 + drift);
    const c = spike && t >= spike.at ? p * spike.mult : p;
    out.push({ t, o, h: Math.max(o, c) * 1.001, c });
  }
  return out;
}
const entry = (s: string, onboard: number): LedgerEntry => ({
  symbol: s,
  baseAsset: s,
  onboardDate: new Date(onboard).toISOString(),
  firstSeenAt: new Date(onboard).toISOString(),
  entryTimeUtc: new Date(onboard + 168 * H).toISOString(),
});

test('avaliação: espera, aberto e encerrado; abertos ficam fora das estatísticas realizadas', () => {
  const now = T + 500 * H + 30 * 60000,
    lastClosed = Math.floor(now / H) * H - H;
  const closedFirst = T - 800 * H,
    openFirst = T + 500 * H - 168 * H - 100 * H,
    waitFirst = T + 500 * H - 50 * H; // encerrado; aberto há 100 h; entra em 118 h
  const coins: CoinData[] = [
    { entry: entry('CLOSEDUSDT', closedFirst), raw: raw(closedFirst, lastClosed), funding: [], tradable: true },
    { entry: entry('OPENUSDT', openFirst), raw: raw(openFirst, lastClosed), funding: [], tradable: true },
    { entry: entry('WAITUSDT', waitFirst), raw: raw(waitFirst, lastClosed), funding: [], tradable: true },
  ];
  const btc = raw(closedFirst - 24 * H, lastClosed, 50000, 0.00005);
  const s = evaluateLive(coins, btc, [], T, now),
    by = Object.fromEntries(s.events.map((e) => [e.symbol, e]));
  assert.equal(by.CLOSEDUSDT.status, 'CLOSED_TIME');
  assert.equal(by.OPENUSDT.status, 'OPEN');
  assert.equal(by.WAITUSDT.status, 'WAITING');
  assert.equal(s.counts.closed, 1);
  assert.equal(s.counts.open, 1);
  assert.equal(s.counts.waiting, 1);
  assert.equal(by.OPENUSDT.unrealized, true);
  // A venda de uma moeda que cai rende; com BTC subindo, a perna comprada de BTC soma ao resultado.
  assert.ok(by.CLOSEDUSDT.unhedgedReturn! > 0.05 && by.CLOSEDUSDT.hedgedReturn! > by.CLOSEDUSDT.unhedgedReturn!);
  assert.equal(s.verdict, 'EM_ANDAMENTO');
  assert.equal(s.closed.events, 1);
  assert.equal(s.scope, 'FORWARD_PAPER_TRACKING_ONLY');
});

test('stop pela máxima, contrato fora de negociação e veredito por tamanho de amostra', () => {
  const now = T + 1500 * H,
    lastClosed = Math.floor(now / H) * H - H,
    first = T + 1500 * H - 400 * H;
  const spike = raw(first, lastClosed, 100, 0, { at: first + 200 * H, mult: 2.2 });
  const coins: CoinData[] = [{ entry: entry('SPIKEUSDT', first), raw: spike, funding: [], tradable: true }];
  const s = evaluateLive(coins, raw(first - 24 * H, lastClosed, 50000, 0), [], T, now),
    e = s.events[0];
  assert.equal(e.status, 'CLOSED_STOP');
  assert.ok(e.unhedgedReturn! < -0.4 && e.unhedgedReturn! > -0.7, 'retorno ' + e.unhedgedReturn);
  assert.equal(s.closed.stops, 1);
  // Contrato que saiu de negociação (tradable false) termina na última vela, com a posição fechada.
  const gone = evaluateLive(
    [{ entry: entry('GONEUSDT', first), raw: raw(first, first + 300 * H, 100, -0.0001), funding: [], tradable: false }],
    raw(first - 24 * H, lastClosed, 50000, 0),
    [],
    T,
    now,
  ).events[0];
  assert.equal(gone.status, 'CLOSED_END');
  // Muitas perdas encerradas disparam o ENCERRADO_POR_PERDA; poucas, não.
  assert.equal(LIVE.lossStopMinimumClosed, 15);
  assert.equal(LIVE.minimumClosed, 30);
});
