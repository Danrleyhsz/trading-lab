import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

test('panoramic scene dimensions and original bytes match authored station and room geometry',()=>{
 const c=vm.createContext({});for(const file of ['navigation','workstations'])vm.runInContext(readFileSync('public/office/'+file+'.js','utf8'),c);
 const png=readFileSync('public'+c.OfficeNavigation.scene.asset);
 assert.equal(png.readUInt32BE(16),c.OfficeNavigation.scene.width);assert.equal(png.readUInt32BE(20),c.OfficeNavigation.scene.height);
 assert.equal(createHash('sha256').update(png).digest('hex'),'3365c280485378d4e03e64d6d5f3bf1ed0225b220e32c88a0486f919710d89c2');
 for(const s of c.OfficeWorkstations.catalog){
  const r=c.OfficeNavigation.layout[s.room];assert.ok(s.point.x>=r.x&&s.point.x<=r.x+r.w);assert.ok(s.point.y>=r.y&&s.point.y<=r.y+r.h);
  assert.ok(s.cx>=0&&s.cy>=0&&s.cx+s.cw<=c.OfficeNavigation.scene.width&&s.cy+s.ch<=c.OfficeNavigation.scene.height);
  assert.ok(s.my<s.cy&&s.cy+s.ch<s.y); // monitor, chair back, then ground; source coordinates, no simulated work
 }
});
