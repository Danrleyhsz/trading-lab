import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('public/office/index.html','utf8');
const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));

test('every element the office scripts address exists in the reference layout',()=>{
 for(const file of ['core.js','research.js','audit.js','app.js','dashboard.js','display.js','replay.js']){
  const source=readFileSync('public/office/'+file,'utf8');
  const used=new Set([...source.matchAll(/(?:q|\$)\('#([A-Za-z][\w-]*)'\)/g)].map(m=>m[1]));
  // Created at runtime by the scripts themselves.
  for(const runtime of ['handoffMap','replayBar'])used.delete(runtime);
  const missing=[...used].filter(id=>!ids.has(id));
  assert.deepEqual(missing,[],file+' references missing ids');
 }
});

test('the reference layout has the concept regions: header metrics, nine-item rail, wall screens, docked card and three tables',()=>{
 for(const id of ['capitalTotal','dailyPnl','activeAgents','openPositionCount','clockTime','marketStatus','lightingToggle','wall','office','agentCard','recentActivity','positions','performance','screenDialog','pilotTimeline','operationsList','memoryList'])assert.ok(ids.has(id),id);
 const rail=[...html.matchAll(/<button id="(nav\w+)" class="nav/g)].map(m=>m[1]);
 assert.deepEqual(rail,['navOffice','navAgents','navFinance','navOperations','navMarket','navResearch','navMemory','navHistory','navAccess']);
 for(const wall of ['BTCUSDT','BTCPERP','ETHUSDT','funding','oi','liquidations','sessions','alts'])assert.match(html,new RegExp('data-wall="'+wall+'"'));
 assert.match(html,/Capital Virtual Total/);assert.match(html,/PnL Diário/);assert.match(html,/Atividades Recentes/);assert.match(html,/Performance dos Agentes/);
});

test('the layout loads only allowlisted office assets',async()=>{
 const {registerOfficeAssets}=await import('../src/application/office-assets.js');const Fastify=(await import('fastify')).default;const app=Fastify();registerOfficeAssets(app);
 const assets=[...html.matchAll(/(?:src|href)="\/office\/([^"]+)"/g)].map(m=>m[1]).filter(name=>name!=='index.html'&&!name.startsWith('#'));
 for(const name of assets){const r=await app.inject('/office/'+name);assert.equal(r.statusCode,200,name);}
 await app.close();
});
