import {parentPort,workerData} from 'node:worker_threads';
import {computeStudyRobustness,type RobustnessInput} from './study-robustness.js';
// Thread separada: os backtests da robustez não travam o servidor nem o ciclo do piloto.
if(!parentPort)throw Error('o worker de robustez precisa de um processo pai');
try{parentPort.postMessage({ok:true,result:computeStudyRobustness(workerData as RobustnessInput)});}
catch{parentPort.postMessage({ok:false});}
