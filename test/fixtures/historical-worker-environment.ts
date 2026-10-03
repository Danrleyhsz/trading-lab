import {parentPort,workerData} from 'node:worker_threads';
import {walkForwardPerpetual} from '../../src/domain/perpetual-walk-forward.js';
// Test-only environment inspection; never print the inherited value.
if(Object.keys(process.env).some(key=>key!=='TSX_DISABLE_CACHE'))throw Error('unexpected inherited environment');
parentPort!.postMessage({ok:true,result:walkForwardPerpetual(workerData.data,workerData.candidates,workerData.trainBars,workerData.testBars)});
