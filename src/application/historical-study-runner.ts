import { Worker } from 'node:worker_threads';
import { validatePerpetualDataset, type PerpetualConfig, type PerpetualDataset } from '../domain/perpetual-backtest.js';
import type { walkForwardPerpetual } from '../domain/perpetual-walk-forward.js';
export type HistoricalStudyResult = ReturnType<typeof walkForwardPerpetual>;
export interface HistoricalStudySimulator {
  run(
    data: PerpetualDataset,
    candidates: PerpetualConfig[],
    trainBars: number,
    testBars: number,
  ): Promise<HistoricalStudyResult>;
}
export const HISTORICAL_SIMULATION_LIMITS = Object.freeze({
  timeoutMs: 15000,
  maxOldGenerationSizeMb: 128,
  maxYoungGenerationSizeMb: 16,
  stackSizeMb: 4,
  maxBars: 5000,
  maxFundingRecords: 5000,
  maxCandidates: 5,
});
/** One calculation at a time, inside the cloud container. No broker or persistence capability is passed. */
export class HistoricalStudyRunner implements HistoricalStudySimulator {
  private active = false;
  constructor(
    private timeoutMs: number = HISTORICAL_SIMULATION_LIMITS.timeoutMs,
    private moduleURL = new URL('./perpetual-study-worker.js', import.meta.url),
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 20000) throw Error('invalid historical timeout');
    if (import.meta.url.endsWith('.ts') && moduleURL.pathname.endsWith('/perpetual-study-worker.js'))
      this.moduleURL = new URL('./perpetual-study-worker.ts', import.meta.url);
  }
  async run(
    data: PerpetualDataset,
    candidates: PerpetualConfig[],
    trainBars: number,
    testBars: number,
  ): Promise<HistoricalStudyResult> {
    if (this.active) throw Error('historical simulator busy');
    if (
      data.trade.length > HISTORICAL_SIMULATION_LIMITS.maxBars ||
      data.funding.length > HISTORICAL_SIMULATION_LIMITS.maxFundingRecords ||
      candidates.length < 1 ||
      candidates.length > HISTORICAL_SIMULATION_LIMITS.maxCandidates ||
      !Number.isInteger(trainBars) ||
      trainBars < 100 ||
      trainBars > 3000 ||
      !Number.isInteger(testBars) ||
      testBars < 50 ||
      testBars > 1000 ||
      data.trade.length < trainBars + testBars
    )
      throw Error('historical workload exceeds limits');
    const datasetHash = validatePerpetualDataset(data);
    const workerData = structuredClone({ data, candidates, trainBars, testBars });
    // Development-only loader; compiled cloud execution imports plain JS and needs no tsx dependency.
    const workerURL = this.moduleURL.pathname.endsWith('.ts')
      ? new URL(
          'data:text/javascript,' +
            encodeURIComponent(
              `import {register} from ${JSON.stringify(import.meta.resolve('tsx/esm/api'))};register();await import(${JSON.stringify(this.moduleURL.href)});`,
            ),
        )
      : this.moduleURL;
    this.active = true;
    try {
      return await new Promise<HistoricalStudyResult>((resolve, reject) => {
        const worker = new Worker(workerURL, {
          workerData,
          execArgv: [],
          env: this.moduleURL.pathname.endsWith('.ts') ? { TSX_DISABLE_CACHE: '1' } : {},
          resourceLimits: {
            maxOldGenerationSizeMb: HISTORICAL_SIMULATION_LIMITS.maxOldGenerationSizeMb,
            maxYoungGenerationSizeMb: HISTORICAL_SIMULATION_LIMITS.maxYoungGenerationSizeMb,
            stackSizeMb: HISTORICAL_SIMULATION_LIMITS.stackSizeMb,
          },
        });
        let finishing = false;
        const finish = (error?: Error, result?: HistoricalStudyResult) => {
          if (finishing) return;
          finishing = true;
          clearTimeout(deadline);
          // Join termination before releasing admission or completing a study, including timeout/error paths.
          void worker.terminate().then(
            () => {
              if (error) reject(error);
              else resolve(result!);
            },
            () => reject(Error('historical worker termination failed')),
          );
        };
        const deadline = setTimeout(() => finish(Error('historical simulation timed out')), this.timeoutMs);
        worker.once('error', () => finish(Error('historical worker failed')));
        worker.once('exit', () => {
          if (!finishing) finish(Error('historical worker exited without a result'));
        });
        worker.once('message', (message: unknown) => {
          if (
            !message ||
            typeof message !== 'object' ||
            !('ok' in message) ||
            message.ok !== true ||
            !('result' in message)
          )
            return finish(Error('historical simulation failed'));
          const result = message.result as HistoricalStudyResult;
          if (
            !result ||
            result.datasetHash !== datasetHash ||
            result.model !== 'LINEAR_PERPETUAL_WALK_FORWARD_V2' ||
            result.execution !== 'HISTORICAL_SIMULATION' ||
            result.automaticPaperApproval !== false ||
            !Array.isArray(result.folds) ||
            result.folds.length > Math.floor((workerData.data.trade.length - trainBars) / testBars) ||
            !Number.isFinite(result.finalEquity) ||
            !Number.isFinite(result.netPnl)
          )
            return finish(Error('invalid historical worker result'));
          finish(undefined, result);
        });
      });
    } finally {
      this.active = false;
    }
  }
}
