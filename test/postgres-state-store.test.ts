import test from 'node:test';
import assert from 'node:assert/strict';
import {PostgresStateStore,assertAppendOnly} from '../src/infrastructure/postgres-state-store.js';
import type {StoredState} from '../src/domain/storage.js';
const state:StoredState={agents:[],memories:[{id:'m1',agentId:'nova',kind:'FAILURE',summary:'actual failure',createdAt:'2026-01-01T00:00:00Z'}],paperAccounts:[{id:'fund',kind:'FUND',ownerAgentId:null,initialCash:1000,createdAt:'2026-01-01',ledger:[]}]};
test('PostgreSQL state guards refuse history removal, modifications and capital reseeding',()=>{assert.doesNotThrow(()=>assertAppendOnly(state,structuredClone(state)));const deleted=structuredClone(state);deleted.memories=[];assert.throws(()=>assertAppendOnly(state,deleted));const rewritten=structuredClone(state);rewritten.memories[0].summary='pretend success';assert.throws(()=>assertAppendOnly(state,rewritten));const capital=structuredClone(state);capital.paperAccounts![0].initialCash=2000;assert.throws(()=>assertAppendOnly(state,capital));});
test('PostgreSQL roundtrip, single writer exclusion and transactional rejection',{skip:!process.env.TEST_DATABASE_URL},async()=>{
 const first=new PostgresStateStore(process.env.TEST_DATABASE_URL!);await first.open();
 try{assert.equal(await first.load(),null);await first.save(state);const second=new PostgresStateStore(process.env.TEST_DATABASE_URL!);await assert.rejects(second.open(),/another Trading Lab writer/);assert.deepEqual(await first.load(),state);const altered=structuredClone(state);altered.memories=[];await assert.rejects(first.save(altered));assert.deepEqual(await first.load(),state);}
 finally{await first.close();}
 const restarted=new PostgresStateStore(process.env.TEST_DATABASE_URL!);await restarted.open();try{assert.deepEqual(await restarted.load(),state);}finally{await restarted.close();}
});
