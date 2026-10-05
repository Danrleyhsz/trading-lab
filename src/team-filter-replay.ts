// TEST_ONLY offline replay of the pre-declared team filter sets on a recorded study dataset. No database, no
// exchange, no production access. The production study runner remains the only authority for paper eligibility.
// Usage: STUDY_FILE=study.json [REPORT_PATH=report.json] npx tsx src/team-filter-replay.ts
import {readFile,writeFile} from 'node:fs/promises';
import {walkForwardPerpetual} from './domain/perpetual-walk-forward.js';
import {STUDY_CANDIDATE_SETS,studyCandidates,type PerpetualStudy,type StudyCandidateSet} from './application/perpetual-studies.js';
import {screenPerpetualStudy} from './application/perpetual-study-screen.js';

const study=JSON.parse(await readFile(process.env.STUDY_FILE??'','utf8')) as PerpetualStudy;
if(!study.dataset||!study.request)throw Error('STUDY_FILE must be a full study record with its dataset');
const sets=(Object.keys(STUDY_CANDIDATE_SETS) as StudyCandidateSet[]).filter(s=>s==='BREAKOUT_480_CONTROL_V1'||s.startsWith('TEAM_'));
const rows=[];
for(const set of sets){
 const result=walkForwardPerpetual(study.dataset,studyCandidates(set),study.request.trainBars,study.request.testBars);
 // Screen as if completed when the source study completed, so evidence age matches the original run.
 const screen=screenPerpetualStudy({...study,id:'TEST_ONLY-'+set,request:{...study.request,candidateSet:set},result,status:'COMPLETED'},Date.parse(study.completedAt??study.createdAt));
 const folds=result.folds.map(f=>({pnl:f.result.netPnl,trades:f.result.trades,dd:f.result.maxDrawdown}));
 rows.push({set,netPnl:result.netPnl,trades:folds.reduce((s,f)=>s+(f.trades??0),0),worstFoldDrawdown:Math.max(...folds.map(f=>f.dd)),losingFolds:folds.filter(f=>f.pnl<0).length,folds,eligible:screen.eligible,failedChecks:screen.checks.filter(c=>!c.ok).map(c=>c.id)});
}
const control=rows.find(r=>r.set==='BREAKOUT_480_CONTROL_V1')!;
const report={scope:'TEST_ONLY_OFFLINE_TEAM_FILTER_REPLAY',sourceStudy:study.id,datasetHash:study.result?.datasetHash,window:{from:new Date(study.dataset.trade[0].timestamp).toISOString(),to:new Date(study.dataset.trade.at(-1)!.timestamp).toISOString()},request:study.request,
 rows:rows.map(r=>({...r,beatsControl:r.set!==control.set&&r.netPnl>control.netPnl}))};
if(process.env.REPORT_PATH)await writeFile(process.env.REPORT_PATH,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.rows.map(r=>({set:r.set,netPnl:Number(r.netPnl.toFixed(2)),trades:r.trades,losingFolds:r.losingFolds,worstDD:Number((r.worstFoldDrawdown*100).toFixed(2)),eligible:r.eligible,beatsControl:r.beatsControl,failed:r.failedChecks})),null,1));
