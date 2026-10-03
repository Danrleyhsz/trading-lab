import { parentPort, workerData } from 'node:worker_threads';
import { walkForwardPerpetual } from '../domain/perpetual-walk-forward.js';
import type { PerpetualConfig, PerpetualDataset } from '../domain/perpetual-backtest.js';
if (!parentPort)
    throw Error('historical worker requires a parent');
const input = workerData as {
    data: PerpetualDataset;
    candidates: PerpetualConfig[];
    trainBars: number;
    testBars: number;
};
try {
    const result = walkForwardPerpetual(input.data, input.candidates, input.trainBars, input.testBars);
    parentPort.postMessage({ ok: true, result });
}
catch {
    // The parent retains the dataset and failure; no provider/environment/stack details leave the worker.
    parentPort.postMessage({ ok: false });
}
