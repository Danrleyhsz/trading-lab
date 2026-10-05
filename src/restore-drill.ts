// Owner-side restore drill. Downloads the newest "Production encrypted backup" artifact with the GitHub CLI,
// decrypts it in memory with the owner's private key, and checks that the snapshot is a complete, append-only,
// restorable state. Writes a JSON report. Never writes to production or to any database.
// Usage: BACKUP_PRIVATE_KEY_PATH=... [REPORT_PATH=report.json] [GH_REPO=owner/repo] npm run restore-drill
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {decryptStateBackup,type EncryptedStateBackup} from './application/encrypted-backup.js';
import {assertAppendOnly,collectEvents} from './infrastructure/postgres-state-store.js';
import type {StoredState} from './domain/storage.js';

const keyPath=process.env.BACKUP_PRIVATE_KEY_PATH,repo=process.env.GH_REPO??'Danrleyhsz/trading-lab';
if(!keyPath)throw Error('BACKUP_PRIVATE_KEY_PATH is required');
const gh=(...args:string[])=>execFileSync('gh',args,{encoding:'utf8'});
const run=JSON.parse(gh('run','list','-R',repo,'--workflow','Production encrypted backup','--status','success','--limit','1','--json','databaseId,createdAt'))[0];
if(!run)throw Error('no successful backup run found');
const dir=mkdtempSync(join(tmpdir(),'restore-drill-'));
const checks:{id:string;ok:boolean;detail?:string}[]=[];const check=(id:string,ok:boolean,detail?:string)=>checks.push({id,ok,detail});
try{
 gh('run','download',String(run.databaseId),'-R',repo,'-D',dir);
 const files:string[]=[];const walk=(d:string)=>{for(const n of readdirSync(d,{withFileTypes:true}))n.isDirectory()?walk(join(d,n.name)):files.push(join(d,n.name));};walk(dir);
 const file=files.find(f=>f.endsWith('.json'));if(!file)throw Error('artifact has no encrypted backup JSON');
 const backup=JSON.parse(readFileSync(file,'utf8')) as EncryptedStateBackup;
 const state=decryptStateBackup(backup,readFileSync(keyPath,'utf8')) as StoredState;
 check('DECRYPTS_WITH_OWNER_KEY',true,backup.keyFingerprint);
 check('CONTENT_HASH_MATCHES',true,backup.plaintextSha256);
 let appendOnly=true;try{assertAppendOnly(null,state);}catch(e){appendOnly=false;check('APPEND_ONLY_SHAPE',false,String(e));}
 if(appendOnly)check('APPEND_ONLY_SHAPE',true);
 const events=collectEvents(state);check('EVENTS_READABLE',events.length>0,events.length+' events');
 const accounts=state.perpetualBook?.accounts??[];check('EIGHT_EVALUATION_ACCOUNTS',accounts.length===8,accounts.map(a=>a.id).join(', '));
 check('FUND_ACCOUNT_PRESENT',(state.paperAccounts??[]).some(a=>a.kind==='FUND'));
 check('STUDIES_PRESENT',(state.perpetualStudies??[]).length>0,(state.perpetualStudies??[]).map(s=>s.id.slice(0,8)+':'+s.status).join(', '));
 const age=Date.now()-Date.parse(backup.persistedAt??backup.createdAt);check('BACKUP_RECENT',age>=0&&age<=36*3600000,Math.round(age/3600000)+' h old');
 const report={scope:'OWNER_RESTORE_DRILL',runAt:new Date().toISOString(),sourceRun:run.databaseId,backupCreatedAt:backup.createdAt,persistedAt:backup.persistedAt,ok:checks.every(c=>c.ok),checks,
  counts:{events:events.length,perpetualAccounts:accounts.length,studies:(state.perpetualStudies??[]).length,messages:(state.agentMessages??[]).length,memories:(state.memories??[]).length}};
 if(process.env.REPORT_PATH)writeFileSync(process.env.REPORT_PATH,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
}finally{rmSync(dir,{recursive:true,force:true});}
