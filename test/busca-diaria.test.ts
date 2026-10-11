import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY,
  buildGrid,
  eligibility,
  positions,
  portfolio,
  stats,
  coinAlone,
  isPegged,
  halfOf,
  ELIGIBILITY,
  type SpotSeriesLike,
} from '../scripts/estudos/busca-diaria-lib.js';

const T0 = Date.UTC(2020, 0, 1);
function series(
  symbol: string,
  first: number,
  closes: number[],
  opts: { qv?: number; status?: string; skip?: number[] } = {},
): SpotSeriesLike {
  const idx = closes.map((_, i) => i).filter((i) => !(opts.skip ?? []).includes(i));
  return {
    symbol,
    baseAsset: symbol.replace('USDT', ''),
    status: opts.status ?? 'TRADING',
    t: idx.map((i) => T0 + (first + i) * DAY),
    c: idx.map((i) => closes[i]),
    h: idx.map((i) => closes[i] * 1.01),
    l: idx.map((i) => closes[i] * 0.99),
    qv: idx.map(() => opts.qv ?? 5e6),
  };
}
const up = (n: number, start = 100, g = 0.01) => Array.from({ length: n }, (_, i) => start * (1 + g) ** i);

test('grade: dias faltando repetem o último fechamento, fora da vida é NaN, retirada vira fim da série', () => {
  const g = buildGrid([series('AAAUSDT', 2, [10, 11, 12, 13], { skip: [1] })], T0, 10),
    c = g.coins[0];
  assert.equal(c.first, 2);
  assert.equal(c.last, 5);
  assert.deepEqual([c.has[2], c.has[3], c.has[4], c.has[5]], [1, 0, 1, 1]);
  assert.equal(c.c[3], 10);
  assert.ok(Number.isNaN(c.c[1]) && Number.isNaN(c.c[6]));
});

test('elegibilidade: 90 dias de história, volume mediano de 30 dias e dia seguinte existente; atrelada ao dólar fica de fora', () => {
  const days = 400,
    g = buildGrid(
      [
        series('AAAUSDT', 0, up(300)),
        series('LOWUSDT', 0, up(300), { qv: 5e5 }),
        series(
          'PEGUSDT',
          0,
          Array.from({ length: 300 }, (_, i) => 1 + 0.001 * Math.sin(i)),
        ),
      ],
      T0,
      days,
    );
  const e = g.coins.map((c) => eligibility(c, days));
  assert.equal(e[0][88], 0);
  assert.equal(e[0][89], 1);
  assert.equal(e[0][298], 1);
  assert.equal(e[0][299], 0, 'sem vela no dia seguinte: última vela não é decisão');
  assert.equal(
    e[1].reduce((a, b) => a + b, 0),
    0,
    'volume abaixo de US$ 1 mi',
  );
  assert.equal(
    e[2].reduce((a, b) => a + b, 0),
    0,
  );
  assert.ok(g.coins[2].pegged);
  assert.ok(isPegged([1, 1.01, 0.99, ...Array(40).fill(1)]));
});

test('sinais: sem olhar o futuro (mudar preços depois de t não muda a posição até t) e regras fazem o esperado', () => {
  const base = up(200),
    alt = [...base.slice(0, 150), ...base.slice(150).map((x) => x * 0.2)],
    days = 220;
  const a = buildGrid([series('AAAUSDT', 0, base)], T0, days).coins[0],
    b = buildGrid([series('AAAUSDT', 0, alt)], T0, days).coins[0];
  for (const rule of ['SMA20', 'SMA50', 'SMA100', 'DONCHIAN_55_20', 'TSMOM90'] as const) {
    const pa = positions(rule, a, days),
      pb = positions(rule, b, days);
    assert.deepEqual(
      Array.from(pa.slice(0, 150)),
      Array.from(pb.slice(0, 150)),
      rule + ' mudou no passado por causa do futuro',
    );
    assert.equal(pa[120], 1, rule + ' em tendência de alta');
  }
  // Queda forte depois de 150: todas as regras saem.
  const sma = positions('SMA20', b, days);
  assert.equal(sma[155], 0);
  assert.equal(positions('TSMOM90', b, days)[199], 0);
  const don = positions('DONCHIAN_55_20', b, days);
  assert.equal(don[170], 0);
  // Sem histórico: fora.
  assert.equal(positions('SMA100', a, days)[50], 0);
  assert.equal(positions('TSMOM90', a, days)[80], 0);
});

test('carteira: peso igual entre elegíveis, caixa quando o sinal é de venda, custo sobre a variação de peso', () => {
  const days = 300,
    g = buildGrid([series('AAAUSDT', 0, up(300, 100, 0.01)), series('BBBUSDT', 0, up(300, 100, -0.001))], T0, days);
  const elig = g.coins.map((c) => eligibility(c, days)),
    pos = [new Uint8Array(days).fill(1), new Uint8Array(days)];
  // Uma moeda sempre comprada, outra sempre fora: metade do capital investido, retorno diário = 0,5 × 1%.
  const r = portfolio(g, pos, elig, 0.002, 100, 200);
  assert.ok(Math.abs(r.returns[50] - 0.005) < 1e-9, 'retorno ' + r.returns[50]);
  assert.ok(Math.abs(r.invested[50] - 0.5) < 1e-9);
  assert.equal(r.active[50], 2);
  // O primeiro dia paga a compra (turnover 0,5 × custo); nos seguintes, nada.
  const first = portfolio(g, pos, elig, 0.002, 100, 102);
  assert.ok(Math.abs(first.returns[1] - (0.005 - 0.002 * 0.5)) < 1e-9);
  assert.ok(Math.abs(first.returns[2] - 0.005) < 1e-9);
  // Máscara: só a moeda A, peso 1.
  assert.ok(Math.abs(portfolio(g, pos, elig, 0, 100, 200, (k) => k === 0).returns[50] - 0.01) < 1e-9);
  // Estatísticas e halves.
  const s = stats([0.01, -0.02, 0.03, 0]);
  assert.ok(Math.abs(s.total - (1.01 * 0.98 * 1.03 - 1)) < 1e-12);
  assert.ok(s.maxDrawdown > 0.019 && s.maxDrawdown < 0.021);
  assert.ok([halfOf('AAAUSDT'), halfOf('BBBUSDT')].every((h) => h === 0 || h === 1));
  const alone = coinAlone(g.coins[0], pos[0], elig[0], 0.002, 0, 298);
  assert.ok(alone.total > 0 && Math.abs(alone.buyHoldTotal - alone.total) < 0.02);
  assert.equal(ELIGIBILITY.minDays, 90);
});

test('moeda retirada: posição sai no último fechamento (custo) e não gera retorno depois', () => {
  const days = 200,
    g = buildGrid(
      [series('DEADUSDT', 0, up(150, 100, 0.01), { status: 'BREAK' }), series('LIVEUSDT', 0, up(200, 100, 0.005))],
      T0,
      days,
    );
  const elig = g.coins.map((c) => eligibility(c, days)),
    pos = g.coins.map(() => new Uint8Array(days).fill(1)),
    r = portfolio(g, pos, elig, 0.002, 0, 198);
  assert.equal(elig[0][149], 0);
  assert.equal(elig[0][148], 1);
  assert.ok(r.turnover[150] > 0, 'saída da moeda retirada paga custo no dia da retirada');
  assert.equal(r.active[160], 1);
});
