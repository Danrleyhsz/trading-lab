import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {generateKeyPairSync} from 'node:crypto';
import {decryptStateBackup,encryptStateBackup,registerEncryptedBackup} from '../src/application/encrypted-backup.js';
import {registerAccessControl} from '../src/application/access-control.js';
import {BACKUP_PUBLIC_KEY_PEM,BACKUP_PUBLIC_KEY_FINGERPRINT} from '../src/config/backup-public-key.js';
const pair=(bits:number)=>generateKeyPairSync('rsa',{modulusLength:bits,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const owner=pair(3072),other=pair(3072);
const state={TEST_ONLY:true,perpetualBook:{accounts:[{id:'evaluation:nova:usdm',marker:'TEST_ONLY_PLAINTEXT_MARKER'}]}};

test('encrypted backup round-trips only with the owner key and rejects tampering',()=>{
 const backup=encryptStateBackup(state,owner.publicKey,'2026-10-04T00:00:00.000Z');
 assert.doesNotMatch(JSON.stringify(backup),/TEST_ONLY_PLAINTEXT_MARKER|evaluation:nova/);
 assert.deepEqual(decryptStateBackup(backup,owner.privateKey),state);
 assert.throws(()=>decryptStateBackup(backup,other.privateKey));
 const flipped=Buffer.from(backup.ciphertext,'base64');flipped[0]^=1;
 assert.throws(()=>decryptStateBackup({...backup,ciphertext:flipped.toString('base64')},owner.privateKey));
 assert.throws(()=>decryptStateBackup({...backup,plaintextSha256:'0'.repeat(64)},owner.privateKey));
 assert.throws(()=>encryptStateBackup(state,pair(2048).publicKey),/at least 3072/);
});

test('bundled owner public key is a 4096-bit RSA key with the recorded fingerprint',()=>{
 assert.equal(encryptStateBackup({},BACKUP_PUBLIC_KEY_PEM).keyFingerprint,BACKUP_PUBLIC_KEY_FINGERPRINT);
 assert.doesNotMatch(BACKUP_PUBLIC_KEY_PEM,/PRIVATE/);
});

test('backup endpoint serves ciphertext to the read-only monitor, never plaintext or writes',async()=>{
 const token='test-only-access-code-at-least-32-characters',reader='test-only-read-only-monitor-token-32-chars-min';
 let current:{state:unknown;persistedAt:string|null}|null=null;
 const app=Fastify();registerAccessControl(app,token,true,'https://example.test',reader);registerEncryptedBackup(app,()=>current,owner.publicKey);
 try{
  assert.equal((await app.inject('/ops/backup')).statusCode,401);
  assert.equal((await app.inject({url:'/ops/backup',headers:{authorization:'Bearer '+reader}})).statusCode,503);
  current={state,persistedAt:'2026-10-04T00:00:00.000Z'};
  const response=await app.inject({url:'/ops/backup',headers:{authorization:'Bearer '+reader}});
  assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'no-store');assert.doesNotMatch(response.body,/TEST_ONLY_PLAINTEXT_MARKER/);
  assert.deepEqual(decryptStateBackup(response.json(),owner.privateKey),state);
  assert.equal((await app.inject({method:'POST',url:'/ops/backup',headers:{authorization:'Bearer '+reader}})).statusCode,403);
 }finally{await app.close();}
});
