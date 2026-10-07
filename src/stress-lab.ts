// TEST_ONLY laboratório de estresse (docs/STRESS_LAB.md). Roda o catálogo STRESS_LAB_V1 com mercado sintético, só em
// memória: nunca abre banco, nunca chama corretora, nunca toca a produção.
// Uso: [SEED=20261006] [REPORT_PATH=stress.json] npm run stress-lab
import {writeFile} from 'node:fs/promises';
import {runStressLab} from './application/stress-lab.js';

const seed=Number(process.env.SEED??20261006);
const report=await runStressLab(seed);
if(process.env.REPORT_PATH)await writeFile(process.env.REPORT_PATH,JSON.stringify(report,null,2));
for(const s of report.scenarios)console.log(`${s.survived?'OK   ':'FALHA'} ${s.id.padEnd(24)} decisões ${String(s.metrics.decisions).padStart(3)} · fills ${String(s.metrics.fills).padStart(3)} · drawdown ${(s.metrics.maxDrawdown*100).toFixed(2)}% · pior slippage ${s.metrics.worstSlippageBps??'n/a'} bps${s.invariantViolations.length?' · INVARIANTES: '+s.invariantViolations.join(', '):''}${s.expectations.filter(x=>!x.passed).map(x=>' · esperado: '+x.description).join('')}`);
console.log(`semente ${report.seed} · ${report.summary.survived}/${report.summary.scenarios} sobreviveram · violações ${report.summary.invariantViolations} · sha256 ${report.reportSha256}`);
process.exitCode=report.summary.survived===report.summary.scenarios?0:1;
