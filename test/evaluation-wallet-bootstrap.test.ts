import test from 'node:test';
import assert from 'node:assert/strict';
import {bootstrapEvaluationWallets,evaluationWalletCapital} from '../src/application/evaluation-wallet-bootstrap.js';
import {PerpetualPaperBook} from '../src/application/perpetual-paper-book.js';
import {EventBus} from '../src/application/event-bus.js';
import {checkCloudConfiguration} from '../src/application/cloud-launch.js';

test('wallet allocation is opt-in, leaves execution flags unchanged and restores without reseeding',()=>{
 const bus=new EventBus(),events:unknown[]=[];bus.subscribe(e=>events.push(e));const book=new PerpetualPaperBook(bus);
 bootstrapEvaluationWallets({},book);assert.equal(book.status().accountCount,0);
 const env={EVALUATION_WALLETS_ENABLED:'true',EVALUATION_PAPER_CAPITAL:'1000',PERPETUAL_PAPER_ENABLED:'false',PAPER_EVALUATION_ENABLED:'false',AUTONOMOUS_PERPETUAL_ENABLED:'false',LEGACY_PAPER_EXECUTION_ENABLED:'false'};
 const before=structuredClone(env);bootstrapEvaluationWallets(env,book);assert.deepEqual(env,before);assert.equal(book.status().accountCount,8);assert.equal(events.length,0);
 const state=book.exportState();assert.ok(state.accounts.every(a=>a.initialCash===1000&&a.ledger.length===0&&a.samples.length===0));assert.ok(state.accounts.every(a=>a.id!=='fund'));
 const restored=new PerpetualPaperBook(bus,state);bootstrapEvaluationWallets({...env,EVALUATION_PAPER_CAPITAL:'5000'},restored);assert.deepEqual(restored.exportState(),state);
 for(const key of ['PERPETUAL_PAPER_ENABLED','PAPER_EVALUATION_ENABLED','AUTONOMOUS_PERPETUAL_ENABLED','LEGACY_PAPER_EXECUTION_ENABLED'])assert.equal(checkCloudConfiguration(env).find(c=>c.id===key+'_MUST_BE_FALSE')?.ok,true);
});
test('invalid wallet allocation fails before creating accounts and cannot bypass launch execution gates',()=>{
 for(const capital of ['', '0','-1','NaN','Infinity']){const env={EVALUATION_WALLETS_ENABLED:'true',EVALUATION_PAPER_CAPITAL:capital},book=new PerpetualPaperBook(new EventBus());assert.throws(()=>bootstrapEvaluationWallets(env,book));assert.equal(book.status().accountCount,0);assert.equal(checkCloudConfiguration(env).find(c=>c.id==='VALID_INDEPENDENT_WALLET_ALLOCATION')?.ok,false);}
 assert.throws(()=>evaluationWalletCapital({EVALUATION_WALLETS_ENABLED:'yes'}));
 assert.equal(checkCloudConfiguration({EVALUATION_WALLETS_ENABLED:'true',EVALUATION_PAPER_CAPITAL:'1000',PERPETUAL_PAPER_ENABLED:'true'}).find(c=>c.id==='PERPETUAL_PAPER_ENABLED_MUST_BE_FALSE')?.ok,false);
});
