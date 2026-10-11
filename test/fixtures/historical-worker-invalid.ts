import { parentPort } from 'node:worker_threads';
parentPort!.postMessage({
  ok: true,
  result: {
    model: 'LINEAR_PERPETUAL_WALK_FORWARD_V2',
    execution: 'HISTORICAL_SIMULATION',
    datasetHash: 'invented',
    finalEquity: 10000,
    netPnl: 0,
    folds: [],
    automaticPaperApproval: true,
  },
});
