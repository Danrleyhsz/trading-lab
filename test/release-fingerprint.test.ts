import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backendFingerprint,releaseApproval} from '../src/application/release-fingerprint.js';

function tree(files:Record<string,string>){const root=mkdtempSync(join(tmpdir(),'fp-'));for(const [name,body] of Object.entries(files)){const path=join(root,name);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,body);}return root;}

test('the backend fingerprint ignores office files and line endings but tracks code and dependencies',()=>{
 const a=tree({'dist/src/index.js':'a\nb','dist/src/x/y.js':'c','package-lock.json':'{}','public/office/app.js':'one'});
 const b=tree({'dist/src/index.js':'a\r\nb','dist/src/x/y.js':'c','package-lock.json':'{}','public/office/app.js':'two'});
 const c=tree({'dist/src/index.js':'a\nb','dist/src/x/y.js':'CHANGED','package-lock.json':'{}'});
 const d=tree({'dist/src/index.js':'a\nb','dist/src/x/y.js':'c','package-lock.json':'{"v":2}'});
 assert.equal(backendFingerprint(a).fingerprint,backendFingerprint(b).fingerprint,'visual-only and CRLF differences keep the fingerprint');
 assert.notEqual(backendFingerprint(a).fingerprint,backendFingerprint(c).fingerprint);assert.notEqual(backendFingerprint(a).fingerprint,backendFingerprint(d).fingerprint);
 assert.equal(backendFingerprint(a).source,'dist');
});

test('a release is approved only by the exact commit or the exact backend fingerprint',()=>{
 const fp='f'.repeat(64),commit='a'.repeat(40);
 assert.deepEqual(releaseApproval({RENDER_GIT_COMMIT:commit,CONTINUOUS_RELEASE_COMMIT:commit},fp).by,'COMMIT');
 assert.equal(releaseApproval({RENDER_GIT_COMMIT:'b'.repeat(40),CONTINUOUS_RELEASE_COMMIT:commit,CONTINUOUS_RELEASE_BACKEND:fp},fp).by,'BACKEND_FINGERPRINT');
 assert.equal(releaseApproval({RENDER_GIT_COMMIT:'b'.repeat(40),CONTINUOUS_RELEASE_COMMIT:commit,CONTINUOUS_RELEASE_BACKEND:'e'.repeat(64)},fp).approved,false);
 assert.equal(releaseApproval({CONTINUOUS_RELEASE_BACKEND:'short'},'short').approved,false);
});
