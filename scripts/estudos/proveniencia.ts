// Proveniência dos estudos offline (docs/FREQTRADE_FREQAI_AUDIT.md, item 3): cada relatório em docs/estudos registra o
// commit que o gerou e se havia alterações não commitadas. Um relatório gerado com a árvore suja não é reproduzível só
// pelo commit, e isso fica escrito nele.
import {execFileSync} from 'node:child_process';

export interface ScriptProvenance {version:'SCRIPT_PROVENANCE_V1';script:string;codeCommit:string|null;workingTreeClean:boolean|null;uncommittedFiles:string[];node:string}
const git=(args:string[])=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
export function scriptProvenance(script:string):ScriptProvenance{
 let codeCommit:string|null=null,changed:string[]|null=null;
 try{const head=git(['rev-parse','HEAD']);codeCommit=/^[0-9a-f]{40}$/.test(head)?head:null;}catch{/* fora de um repositório git: fica nulo, nunca inventado */}
 try{changed=git(['status','--porcelain','--untracked-files=normal']).split('\n').filter(Boolean).map(l=>l.slice(3));}catch{changed=null;}
 return {version:'SCRIPT_PROVENANCE_V1',script,codeCommit,workingTreeClean:changed===null?null:changed.length===0,uncommittedFiles:(changed??[]).slice(0,50),node:process.version};
}
