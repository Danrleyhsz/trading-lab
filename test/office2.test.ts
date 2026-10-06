import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import Fastify from 'fastify';
import {registerOfficeAssets} from '../src/application/office-assets.js';
import {registerAccessControl} from '../src/application/access-control.js';

// Escritório 2.0, fase F1 (docs/design/OFFICE_2_AUDITORIA.md): renderizador isométrico em /office2, ao lado do atual.
const map=JSON.parse(readFileSync('public/office2/scene-map.json','utf8'));
function iso(){const context=vm.createContext({Math,Object,Array,Set,Map,Number,String,JSON});vm.runInContext(readFileSync('public/office2/iso.js','utf8'),context);return context.Office2Iso;}

test('/office2 serve só a lista fixa, com nosniff, e a página não exige login (como o /office); os dados continuam protegidos',async()=>{
 const app=Fastify();registerAccessControl(app,'test-only-access-code-at-least-32-characters',true,'https://example.test');registerOfficeAssets(app);app.get('/agents',async()=>[]);
 try{
  for(const [name,type] of [['','text/html'],['index.html','text/html'],['style.css','text/css'],['iso.js','application/javascript'],['scene.js','application/javascript'],['app.js','application/javascript'],['scene-map.json','application/json']]){
   const r=await app.inject('/office2/'+name);assert.equal(r.statusCode,200,name);assert.match(String(r.headers['content-type']),new RegExp('^'+type));assert.equal(r.headers['x-content-type-options'],'nosniff');}
  assert.deepEqual(JSON.parse((await app.inject('/office2/scene-map.json')).body),map);
  for(const p of ['/office2/../../.env','/office2/..%2F..%2F.env','/office2/%2e%2e/%2e%2e/.env'])assert.notEqual((await app.inject(p)).statusCode,200,p);assert.equal((await app.inject('/office2/private.json')).statusCode,404);
  assert.equal((await app.inject('/office2')).statusCode,302);
  assert.equal((await app.inject('/agents')).statusCode,401);
 }finally{await app.close();}
});

test('rotas A* levam da chegada a cada posto e ponto de lazer, em passos de 1 tile, sem atravessar móvel nem parede fora de porta',()=>{
 const api=iso().create(map),spawn=map.points.find((p:any)=>p.kind==='SPAWN').tile;
 for(const p of map.points.filter((p:any)=>p.kind!=='SPAWN')){
  const path=api.plan(spawn,p.tile);assert.ok(path.length>1,'sem rota até '+p.id);
  assert.deepEqual({...path[0]},spawn);assert.deepEqual({...path.at(-1)},p.tile);
  for(let k=1;k<path.length;k++){assert.equal(Math.abs(path[k].i-path[k-1].i)+Math.abs(path[k].j-path[k-1].j),1);assert.ok(api.canStep(path[k-1],path[k]),p.id+' passo proibido');}
 }
 // Uma pessoa parada no caminho bloqueia o tile; destino em móvel ou fora da planta não tem rota.
 const desk=map.props.find((p:any)=>p.room==='risk'&&p.asset==='mesa-monitores');
 assert.deepEqual([...api.plan(spawn,desk.tile)],[]);assert.deepEqual([...api.plan(spawn,{i:99,j:0})],[]);
 // Atravessar a parede entre Horizon e Nexus sem porta é proibido.
 assert.equal(api.canStep({i:3,j:7},{i:3,j:8}),false);
});

test('projeção e quadros: tile volta do pixel, e a folha atual é usada com a regra declarada para as 4 diagonais',()=>{
 const lib=iso(),api=lib.create(map);
 for(const [i,j] of [[0,0],[5,17],[31,23]]){const p=api.project(i+0.5,j+0.5);assert.deepEqual({...api.tileAt(p.x,p.y)},{i,j});}
 assert.equal(api.direction({i:1,j:1},{i:2,j:1}),'SE');assert.equal(api.direction({i:1,j:1},{i:1,j:0}),'NE');
 assert.deepEqual({...lib.frame('SE','walk',5)},{row:2,col:2});assert.deepEqual({...lib.frame('SW','walk',0)},{row:1,col:1});
 assert.deepEqual({...lib.frame('NE','walk',3)},{row:3,col:4});assert.deepEqual({...lib.frame('NE','seated')},{row:3,col:5});assert.deepEqual({...lib.frame('SW','idle')},{row:0,col:0});
 const a=lib.prng(7),b=lib.prng(7);assert.deepEqual([a(),a(),a()],[b(),b(),b()]);
});

test('o desenho roda sem DOM real: paredes por tile, telas apagadas e móveis provisórios ordenados por profundidade',()=>{
 const calls:string[]=[];const ctx=new Proxy({},{get:(_t,k)=>typeof k==='string'&&['fillStyle','strokeStyle','lineWidth','globalAlpha','imageSmoothingEnabled'].includes(k)?undefined:(...args:unknown[])=>{calls.push(String(k));return k==='createLinearGradient'?{addColorStop(){}}:undefined;},set:()=>true});
 const context=vm.createContext({Math,Object,Array,Set,Map,Number,String,JSON,Infinity});vm.runInContext(readFileSync('public/office2/iso.js','utf8'),context);vm.runInContext(readFileSync('public/office2/scene.js','utf8'),context);
 const api=context.Office2Iso.create(map),scene=context.Office2Scene.create(map,api,{});
 assert.ok(scene.walls.length>100);
 scene.draw(ctx,{},[{id:'nova',pos:{i:3,j:19},dir:'NE',mode:'seated',step:0}],{},{});
 assert.ok(calls.includes('drawImage')&&calls.filter(c=>c==='fill').length>map.props.length);
});

test('contrato de verdade: nada sorteado nos módulos do 2.0, legenda com as 4 classes e os 12 módulos com fonte e fase',()=>{
 for(const f of readdirSync('public/office2').filter(f=>f.endsWith('.js')))assert.ok(!readFileSync('public/office2/'+f,'utf8').includes('Math.random'),f);
 const html=readFileSync('public/office2/index.html','utf8');for(const t of ['REAL','STATIC','SIMULATION','UNKNOWN'])assert.ok(html.includes('data-truth="'+t+'"'),t);
 const app=readFileSync('public/office2/app.js','utf8');
 for(const m of ['MAIN_FLOOR','MARKET_HORIZON','DECISION_RING','RISK_CONTROL','NEXUS','DIAGNOSTICS','STRESS_LAB','BACKTEST','PAPER_EXECUTION','AUDIT_LOGS','IDLE_LOUNGE','PANORAMIC_EDGE'])assert.match(app,new RegExp(m+':\\{name:'),m);
 // Sem dado de agentes, nenhum agente é desenhado (o banner diz isso).
 assert.match(app,/if\(state\.agentsReal\)syncAgents\(agents\.body\);else syncAgents\(\[\]\);/);
});
