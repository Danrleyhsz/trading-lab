import {readFile} from 'node:fs/promises';
import {PostgresStateStore} from './infrastructure/postgres-state-store.js';
import type {StoredState} from './domain/storage.js';
if(!process.env.DATABASE_URL||!process.env.STATE_IMPORT_PATH)throw Error('DATABASE_URL and STATE_IMPORT_PATH are required');
const store=new PostgresStateStore(process.env.DATABASE_URL,process.env.NODE_ENV==='production');
await store.open();
try{if(await store.load())throw Error('import refuses to overwrite an existing database');const state=JSON.parse(await readFile(process.env.STATE_IMPORT_PATH,'utf8')) as StoredState;if(!Array.isArray(state.agents)||!Array.isArray(state.memories))throw Error('invalid legacy state');await store.save(state);console.log('Original state imported without reassignment or inferred history');}finally{await store.close();}
