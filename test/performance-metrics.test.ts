import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceMetrics, hourlyEquity } from '../src/domain/performance-metrics.js';

const H = 3600000;
test('métricas: retorno, drawdown e duração do drawdown a partir da equity horária', () => {
  const pts = [1000, 1010, 1005, 990, 1000, 1020, 1030].map((e, i) => ({ timestamp: i * H, equity: e }));
  const m = performanceMetrics(pts, [{ netPnl: 10 }, { netPnl: -15 }, { netPnl: 40 }]);
  assert.equal(m.totalReturn!.toFixed(4), '0.0300');
  assert.equal(m.maxDrawdown!.toFixed(4), (1 - 990 / 1010).toFixed(4));
  assert.equal(m.maxDrawdownHours, 3);
  assert.equal(m.trades, 3);
  assert.equal(m.winRate!.toFixed(4), '0.6667');
  assert.equal(m.profitFactor!.toFixed(4), (50 / 15).toFixed(4));
  assert.equal(m.longestLosingStreak, 1);
  assert.ok(m.sharpe! > 0);
  assert.ok(
    m.notes.some((n) => /30 dias/.test(n)),
    'aviso de período curto',
  );
});
test('sem dados suficientes, nada é inventado', () => {
  const m = performanceMetrics([{ timestamp: 0, equity: 1000 }], []);
  assert.equal(m.totalReturn, null);
  assert.equal(m.sharpe, null);
  assert.equal(m.trades, 0);
  assert.ok(m.notes.length > 0);
  assert.equal(
    performanceMetrics([0, 1, 2].map((i) => ({ timestamp: i * H, equity: 1000 }))).sharpe,
    null,
    'equity parada: Sharpe indefinido',
  );
});
test('equity horária usa o último ponto de cada hora', () => {
  assert.deepEqual(
    hourlyEquity([
      { timestamp: 0, equity: 1 },
      { timestamp: 10, equity: 2 },
      { timestamp: H, equity: 3 },
    ]).map((p) => p.equity),
    [2, 3],
  );
});

test('expectativa por operação e variação do mercado (item 4 da auditoria)', () => {
  const pts = [1000, 1010, 1005, 990, 1000, 1020, 1030].map((e, i) => ({ timestamp: i * H, equity: e }));
  const m = performanceMetrics(pts, [{ netPnl: 10 }, { netPnl: -15 }, { netPnl: 41 }], undefined, {
    startPrice: 100,
    endPrice: 90,
  });
  assert.equal(m.expectancy, 12, 'média líquida por operação: (10 - 15 + 41) / 3');
  assert.equal(m.marketChange!.toFixed(4), '-0.1000');
  const none = performanceMetrics(pts);
  assert.equal(none.expectancy, null, 'sem operações não há expectativa');
  assert.equal(none.marketChange, null, 'sem preço de referência não há variação');
  assert.equal(
    performanceMetrics(pts, [], undefined, { startPrice: 0, endPrice: 90 }).marketChange,
    null,
    'preço inválido não vira número',
  );
  assert.equal(
    performanceMetrics([], [{ netPnl: -5 }]).expectancy,
    -5,
    'a expectativa existe mesmo sem curva de patrimônio suficiente',
  );
});
