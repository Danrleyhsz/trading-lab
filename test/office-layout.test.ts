import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('public/office/index.html','utf8');
const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));

test('every element the office scripts address exists in the reference layout',()=>{
 for(const file of ['core.js','research.js','audit.js','app.js','dashboard.js','display.js','replay.js','coin-chart.js']){
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

test('telas das moedas: telão só com candles e o clique abre o gráfico ao vivo, que apenas lê /market/chart',()=>{
 const dash=readFileSync('public/office/dashboard.js','utf8'),chart=readFileSync('public/office/coin-chart.js','utf8');
 assert.doesNotMatch(dash,/function spark/,'a linha azul saiu do telão');
 assert.match(dash,/candles\(field\('BTCPERP','chart'\),perp\)/);assert.match(dash,/candles\(field\('oi','chart'\),oi\?\.candles\)/);
 assert.match(chart,/get\('\/market\/chart\?symbol='/);assert.doesNotMatch(chart,/fetch\(|POST|\/orders|\/jobs/,'a janela só lê dados públicos');
 for(const id of ['chartDialog','chartCanvas','chartTip','chartLive','closeChart'])assert.ok(ids.has(id),id);
 assert.match(html,/data-interval="1m"[^>]*aria-pressed="true"/);assert.match(html,/data-interval="1h"/);
 const ctx=vm.createContext({document:{querySelector:()=>null,querySelectorAll:()=>[]}});vm.runInContext(chart,ctx);const C=(ctx as any).OfficeCoinChart;
 assert.equal(Object.keys(C.COINS).join(),'BTCUSDT,BTCPERP,ETHUSDT');
 // Marcas redondas do eixo de preço: passo 50 no BTC, 1 no ETH, 0,25 com duas casas.
 let t=C.niceTicks(85500,85760,6);assert.equal(t.ticks.join(),'85500,85550,85600,85650,85700,85750');assert.equal(t.decimals,0);
 t=C.niceTicks(2707.6,2712.4,6);assert.equal(t.ticks.join(),'2708,2709,2710,2711,2712');
 t=C.niceTicks(0,1,4);assert.equal(t.ticks.join(),'0,0.25,0.5,0.75,1');assert.equal(t.decimals,2);
 assert.equal(C.timeLabel(new Date(2026,9,5,0,0).getTime(),'1h'),'05/10','meia-noite no gráfico de 1 h mostra a data');
 assert.equal(C.timeLabel(new Date(2026,9,5,14,7).getTime(),'1m'),'14:07');
});

test('barra lateral: cada painel ganha um resumo visual que só lê dados recebidos e agrupa equity por hora',()=>{
 const source=readFileSync('public/office/panels.js','utf8');
 assert.doesNotMatch(source,/fetch\(|method:|\/orders|\/jobs|POST/,'os resumos não buscam nem enviam nada: usam o que a página já recebeu');
 const ctx=vm.createContext({document:{querySelector:()=>null,querySelectorAll:()=>[]},setInterval:()=>0});vm.runInContext(source,ctx);const P=(ctx as any).OfficePanels;
 for(const id of Object.keys(P.HEROES))assert.ok(ids.has(id),id+' existe no layout');
 assert.equal(Object.keys(P.HEROES).length,8,'os 8 painéis da barra lateral');
 const t0=Date.UTC(2026,9,5,10);
 assert.equal(JSON.stringify(P.hourly([{timestamp:t0,equity:1000},{timestamp:t0+600000,equity:1004},{timestamp:t0+1200000,equity:998},{timestamp:new Date(t0+3600000).toISOString(),equity:1001},{timestamp:t0+3700000,equity:NaN}])),
  JSON.stringify([{t:t0,o:1000,h:1004,l:998,c:998},{t:t0+3600000,o:1001,h:1001,l:1001,c:1001}]));
 for(const id of ['configDisplay','lightingMode','configNotifications','configMapEditor','rendererMode','configMeasure','rendererStatus','notificationStatus'])assert.ok(ids.has(id),id+' continua no Config');
});
