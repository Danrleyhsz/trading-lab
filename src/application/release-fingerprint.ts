import {createHash} from 'node:crypto';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join,relative,sep} from 'node:path';

/**
 * Fingerprint of the code that can trade: the compiled backend (dist/src, or src when running from source) plus
 * the dependency lockfile. Office files under public/ are excluded, so a visual-only release keeps the same value.
 * Line endings are normalized so a Windows build and the Linux container agree.
 */
export function backendFingerprint(root=process.cwd()){
 const code=existsSync(join(root,'dist','src'))?join(root,'dist','src'):join(root,'src');
 const files:string[]=[];const walk=(dir:string)=>{for(const name of readdirSync(dir).sort()){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else if(/\.(js|ts)$/.test(name)&&!name.endsWith('.d.ts'))files.push(path);}};walk(code);
 const hash=createHash('sha256');
 for(const path of [...files,join(root,'package-lock.json')].filter(existsSync)){hash.update(relative(code,path).split(sep).join('/')+'\n');hash.update(readFileSync(path,'utf8').replace(/\r\n/g,'\n'));hash.update('\n\0');}
 return {fingerprint:hash.digest('hex'),source:code.endsWith(join('dist','src'))?'dist':'src',files:files.length};
}
/** The pilot may run when the owner pinned this exact commit, or this exact backend fingerprint. */
export function releaseApproval(env:NodeJS.ProcessEnv,fingerprint:string){
 const commit=env.RENDER_GIT_COMMIT??'',pinnedCommit=/^[0-9a-f]{40}$/.test(commit)&&env.CONTINUOUS_RELEASE_COMMIT===commit;
 const pinnedBackend=/^[0-9a-f]{64}$/.test(env.CONTINUOUS_RELEASE_BACKEND??'')&&env.CONTINUOUS_RELEASE_BACKEND===fingerprint;
 return {approved:pinnedCommit||pinnedBackend,by:pinnedCommit?'COMMIT' as const:pinnedBackend?'BACKEND_FINGERPRINT' as const:null,deployedCommit:commit||null,backendFingerprint:fingerprint};
}
