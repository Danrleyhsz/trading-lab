import test from 'node:test';
import assert from 'node:assert/strict';
import {rejudge} from '../scripts/estudos/rejulgamento-risco-40.js';

test('rejulgamento só troca o limite de queda máxima e mantém os outros critérios',()=>{
 // Queda de 16% passa na barra de 40%; a reprovação por Sharpe deflacionado continua.
 assert.deepEqual(rejudge(['BOUNDED_DRAWDOWN','DEFLATED_SHARPE'],0.16),['DEFLATED_SHARPE']);
 // Queda acima de 40% continua reprovando.
 assert.deepEqual(rejudge(['BOUNDED_DRAWDOWN','POSITIVE_PNL'],0.448),['BOUNDED_DRAWDOWN','POSITIVE_PNL']);
 // Critérios por período usam a queda do próprio período.
 assert.deepEqual(rejudge(['BOUNDED_DRAWDOWN_A','POSITIVE_PNL_B','BOUNDED_DRAWDOWN_B'],0.5,{A:0.159,B:0.45}),['POSITIVE_PNL_B','BOUNDED_DRAWDOWN_B']);
 // Sem reprovação, nada muda; a lista de entrada não é alterada.
 const input=['BOUNDED_DRAWDOWN'];rejudge(input,0.1);assert.deepEqual(input,['BOUNDED_DRAWDOWN']);assert.deepEqual(rejudge([],0.1),[]);
});
