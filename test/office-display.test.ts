import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup(saved:string|null=null,denied=false){
 const nodes=new Map<string,any>(),writes:Array<[string,string]>=[],events:string[]=[];
 const q=(id:string)=>{if(!nodes.has(id))nodes.set(id,{style:{setProperty(this:Record<string,unknown>,name:string,value:string){this[name]=value}},value:'',disabled:false,textContent:'',open:false,focusCount:0,attributes:{},listeners:{},setAttribute(name:string,value:string){this.attributes[name]=value},addEventListener(name:string,fn:()=>void){this.listeners[name]=fn},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()},focus(){this.focusCount++}});return nodes.get(id);};
 const body={dataset:{}};const context=vm.createContext({document:{body,querySelector:q},localStorage:{getItem(){if(denied)throw Error('TEST_ONLY storage denied');return saved},setItem(key:string,value:string){if(denied)throw Error('TEST_ONLY storage denied');writes.push([key,value])}},window:{dispatchEvent(e:{type:string}){events.push(e.type)}},Event:class{constructor(readonly type:string){}},fetch(){throw Error('display preferences must not access backend')}});
 vm.runInContext(readFileSync('public/office/navigation.js','utf8'),context);
 vm.runInContext(readFileSync('public/office/display.js','utf8'),context);
 return {body:body as {dataset:Record<string,string>},q,writes,events};
}
test('default overview and invalid persisted preferences never introduce unbounded scene sizes',()=>{
 for(const saved of [null,'not json','{"mode":"100","resolution":1e300}','{"mode":"script","resolution":1536}','{"mode":"125","resolution":-1}']){
  const h=setup(saved);assert.equal(h.body.dataset.view,'fit');assert.equal(h.q('#office').style['--office-width'],'100%');assert.equal(h.q('#viewResolution').disabled,true);assert.equal(h.writes.length,0);
 }
});
test('explicit scene scale/resolution persists only validated presentation values and reprojects current geometry',()=>{
 const h=setup('{"mode":"75","resolution":1280,"token":"TEST_ONLY ignored extra field"}');
 assert.equal(h.body.dataset.view,'75');assert.equal(h.q('#office').style['--office-width'],'960px');
 h.q('#viewResolution').value='1920';h.q('#viewResolution').onchange();assert.equal(h.q('#office').style['--office-width'],'1440px');
 assert.deepEqual(JSON.parse(h.writes[0]![1]),{mode:'75',resolution:1920,layout:'auto'});assert.ok(h.events.every(type=>type==='resize'));
 h.q('#viewLayout').value='reference';h.q('#viewLayout').onchange();assert.equal(h.body.dataset.layout,'reference');assert.equal(JSON.parse(h.writes.at(-1)![1]).layout,'reference');
 h.q('#viewScale').value='fit';h.q('#viewScale').onchange();assert.equal(h.body.dataset.view,'fit');assert.equal(h.q('#viewResolution').disabled,true);
 h.q('#resetDisplay').onclick();assert.deepEqual(JSON.parse(h.writes.at(-1)![1]),{mode:'fit',resolution:1852,layout:'auto'});
});
test('storage denial keeps controls, dialog close focus and read-only communication access usable',()=>{
 const h=setup(null,true);h.q('#openDisplay').onclick();assert.equal(h.q('#displayDialog').open,true);
 h.q('#viewScale').value='50';h.q('#viewScale').onchange();assert.equal(h.body.dataset.view,'50');
 h.q('#closeDisplay').onclick();assert.equal(h.q('#displayDialog').open,false);assert.equal(h.q('#openDisplay').focusCount,1);
 h.q('#toggleTeamFeed').onclick();assert.equal(h.body.dataset.teamFeed,'on');assert.equal(h.q('#toggleTeamFeed').attributes['aria-expanded'],'true');
 h.q('#toggleTeamFeed').onclick();assert.equal(h.body.dataset.teamFeed,'off');assert.equal(h.writes.length,0);
});
