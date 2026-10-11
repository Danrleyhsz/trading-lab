import { validatePerpetualDataset, type PerpetualDataset } from '../../src/domain/perpetual-backtest.js';
import type { PerpetualStudy } from '../../src/application/perpetual-studies.js';
/** Synthetic eligibility fixture only; never saved in product state or posted to a product API. */
export function eligibleStudyFixture(now: number): PerpetualStudy {
  const hour = 3600000,
    closed = Math.floor(now / hour) * hour - hour;
  const trade = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: closed - (999 - i) * hour,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    volume: 1,
  }));
  const dataset: PerpetualDataset = {
    instrument: 'BINANCE_USDM:BTCUSDT',
    trade,
    mark: structuredClone(trade),
    funding: [],
  };
  const configuration = {
    initialCapital: 10000,
    feeRate: 0.00055,
    slippageBps: 1,
    maintenanceRate: 0.01,
    liquidationFeeRate: 0.005,
    positionFraction: 0.1,
    fastPeriod: 10,
    slowPeriod: 30,
  };
  const datasetHash = validatePerpetualDataset(dataset);
  return {
    id: 'controlled-study',
    status: 'COMPLETED',
    createdAt: new Date(now).toISOString(),
    completedAt: new Date(now).toISOString(),
    request: { bars: 1000, trainBars: 400, testBars: 100 },
    dataset,
    datasetHash,
    result: {
      model: 'LINEAR_PERPETUAL_WALK_FORWARD_V2',
      execution: 'HISTORICAL_SIMULATION',
      datasetHash,
      netPnl: 100,
      folds: Array.from({ length: 6 }, (_, i) => {
        const start = 400 + i * 100;
        return {
          trainStart: trade[start - 400].timestamp,
          trainEnd: trade[start - 1].timestamp,
          testStart: trade[start].timestamp,
          testEnd: trade[start + 99].timestamp,
          configuration,
          result: { trades: 4, netPnl: 100 / 6, liquidations: 0, maxDrawdown: 0.02 },
        };
      }),
    },
  } as unknown as PerpetualStudy;
}
