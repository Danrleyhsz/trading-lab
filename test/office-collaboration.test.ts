import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function api(){const c=vm.createContext({});vm.runInContext(readFileSync('public/office/collaboration.js','utf8'),c);return c.OfficeCollaboration;}
const known=['atlas','euler','sentinel'],kinds={HYPOTHESIS:'Hypothesis'},message={id:'fixture-original',from:'atlas',to:['euler'],kind:'HYPOTHESIS',summary:'<script>text only</script>',createdAt:'2026-01-01T00:00:00Z'};
test('collaboration keeps bounded original messages and copied recipients without inventing missing context',()=>{
 const a=api(),data=Array.from({length:25},(_,i)=>({...message,id:'fixture-'+i,to:['euler']}));const rows=a.read(data,known,kinds);assert.equal(rows.length,20);assert.equal(rows[0].id,'fixture-5');assert.equal(rows[19].id,'fixture-24');assert.equal(rows[0].summary,message.summary);rows[0].to.push('sentinel');assert.deepEqual(data[5].to,['euler']);assert.equal(rows[0].context,undefined);
});
test('duplicate, rewritten, unknown or malformed collaboration evidence fails closed',()=>{
 const a=api();for(const row of [null,{...message,from:'invented'},{...message,to:['euler','euler']},{...message,kind:'toString'},{...message,createdAt:'invalid'}])assert.throws(()=>a.read([row],known,kinds));assert.throws(()=>a.read([message,message],known,kinds));assert.throws(()=>a.read([{...message,summary:'rewritten'}],known,kinds,[message]));assert.equal(a.read([message],known,kinds,[message]).length,1);
});
test('links require both actual finite visible participant positions and never fabricate a missing destination',()=>{
 const a=api(),positions=new Map([['atlas',{x:10,y:20}],['euler',{x:80,y:90}]]);let links=a.links({...message,to:['euler','sentinel','atlas']},positions);assert.equal(links.length,1);assert.equal(links[0].from,'atlas');assert.equal(links[0].to,'euler');assert.equal(links[0].end.x,80);positions.set('euler',{x:NaN,y:90});assert.equal(a.links(message,positions).length,0);positions.set('atlas',{x:-1,y:20});assert.equal(a.links(message,positions).length,0);
});
