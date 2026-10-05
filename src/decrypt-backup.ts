// Owner-side only: opens an encrypted /ops/backup file with the private key and writes the state JSON
// for restore drills (`npm run import-state` into an EMPTY isolated database). Never run against production.
import {readFile,writeFile} from 'node:fs/promises';
import {decryptStateBackup,type EncryptedStateBackup} from './application/encrypted-backup.js';
const {BACKUP_PRIVATE_KEY_PATH:keyPath,BACKUP_FILE:input,STATE_OUTPUT_PATH:output}=process.env;
if(!keyPath||!input||!output)throw Error('BACKUP_PRIVATE_KEY_PATH, BACKUP_FILE and STATE_OUTPUT_PATH are required');
const backup=JSON.parse(await readFile(input,'utf8')) as EncryptedStateBackup;
const state=decryptStateBackup(backup,await readFile(keyPath,'utf8'));
await writeFile(output,JSON.stringify(state),{flag:'wx'});
console.log(JSON.stringify({format:backup.format,createdAt:backup.createdAt,persistedAt:backup.persistedAt,plaintextSha256:backup.plaintextSha256,keyFingerprint:backup.keyFingerprint,output}));
