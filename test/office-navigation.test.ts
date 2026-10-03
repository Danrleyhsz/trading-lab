import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function navigation(){const context=vm.createContext({});vm.runInContext(readFileSync('public/office/navigation.js','utf8'),context);return context.OfficeNavigation;}

test('room routes go around the approved lounge furniture using only cardinal floor steps',()=>{
 const api=navigation(),start={x:82,y:88},goal={x:70,y:34},original=structuredClone({start,goal}),path=api.plan('Lounge',start,goal);
 assert.ok(path.length>20);assert.deepEqual(JSON.parse(JSON.stringify(path[0])),start);assert.deepEqual(JSON.parse(JSON.stringify(path.at(-1))),goal);
 for(let i=0;i<path.length;i++){assert.equal(api.walkable('Lounge',path[i]),true);if(i)assert.equal(Math.abs(path[i].x-path[i-1].x)+Math.abs(path[i].y-path[i-1].y),2);}
 assert.equal(api.walkable('Lounge',{x:70,y:60}),false);assert.equal(api.walkable('Lounge',{x:40,y:50}),false);assert.deepEqual({start,goal},original);
});

test('occupied footprints block a narrow aisle without tunneling through people or desk masks',()=>{
 const api=navigation(),start={x:22,y:88},goal={x:82,y:88};assert.ok(api.plan('Research Lab',start,goal).length>1);
 assert.equal(api.plan('Research Lab',start,goal,[{x:52,y:90}]).length,0);assert.equal(api.plan('Research Lab',start,{x:50,y:70}).length,0);
 assert.equal(api.idleRoute('Research Lab',start,'atlas',0,[start]).length,0);
});

test('invalid geometry and unknown rooms fail without snapping a character across an obstacle',()=>{
 const api=navigation();for(const room of api.roomNames)for(let slot=0;slot<8;slot++)assert.equal(api.walkable(room,api.anchor(room,slot)),true);
 for(const goal of [{x:51,y:88},{x:100,y:88},{x:NaN,y:88},{x:52,y:0}])assert.equal(api.plan('Research Lab',{x:22,y:88},goal).length,0);
 assert.equal(api.anchor('unknown',0),null);assert.equal(api.anchor('Research Lab',-1),null);assert.equal(api.anchor('Research Lab',8),null);assert.equal(api.plan('unknown',{x:22,y:88},{x:52,y:88}).length,0);
});

test('all six furniture entries have accessible floor approaches and cosmetic routes return home',()=>{
 const api=navigation();assert.equal(api.features.length,6);const landmarkRoute=api.idleRoute('Lounge',{x:52,y:88},'oracle',2);assert.ok(landmarkRoute.length>20);assert.ok(landmarkRoute.some((p:any)=>p.x===70&&p.y===34));
 for(const feature of api.features){const start=api.anchor(feature.room,0);assert.ok(api.plan(feature.room,start,feature.approach).length);const path=api.idleRoute(feature.room,start,'atlas',1);assert.ok(path.length>2);assert.deepEqual(JSON.parse(JSON.stringify(path.at(-1))),JSON.parse(JSON.stringify(start)));for(const point of path)assert.equal(api.walkable(feature.room,point),true);}
});
