import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
// Planta modular do Escritório 2.0 (F8): docs/design/OFFICE_2_F8_PLANTA.md.
const map=JSON.parse(readFileSync('public/office2/scene-map.json','utf8'));
function runtime(extra:Record<string,unknown>={}){const ctx=vm.createContext(extra);for(const name of ['iso','ambience','navigation-icons','scene'])vm.runInContext(readFileSync('public/office2/'+name+'.js','utf8'),ctx);return ctx;}
const inside=(t:any,i:number,j:number)=>i>=t.i0&&i<t.i1&&j>=t.j0&&j<t.j1;

test('F8: corredores V1, V2, V3, H1 e H2 são faixas retas sem nenhuma sala, e a planta tem 44×33 tiles',()=>{
 assert.deepEqual(map.grid,{i:44,j:33});
 const bands=[['V1',12,15,6,33],['V2',23,26,6,33],['V3',33,36,6,33],['H1',12,44,6,10],['H2',12,44,17,21]] as const;
 for(const [name,i0,i1,j0,j1] of bands)for(let i=i0;i<i1;i++)for(let j=j0;j<j1;j++)
  assert.ok(!map.rooms.some((r:any)=>inside(r.tiles,i,j)),`${name}: sala em ${i},${j}`);
 // salas empilhadas: a ala da esquerda e as três colunas da direita ficam alinhadas na mesma grade
 const at=(id:string)=>map.rooms.find((r:any)=>r.id===id).tiles;
 for(const ids of [['horizon','nexus','ring'],['convivencia','backtest','cafe'],['stress-lab','risk','cozinha'],['auditoria','diagnostico','varanda']])
  for(const id of ids){assert.equal(at(id).i0,at(ids[0]).i0,id);assert.equal(at(id).i1,at(ids[0]).i1,id);}
 for(const [a,b] of [['convivencia','stress-lab'],['stress-lab','auditoria'],['backtest','risk'],['risk','diagnostico'],['cafe','cozinha'],['cozinha','varanda']])assert.equal(at(a).j0,at(b).j0,a+'/'+b);
});

test('F8: cada sala declara os tipos de parede de cada lado e só usa tipos conhecidos',()=>{
 const known=new Set(['parede-painel','parede-marca','fachada-vidro','divisoria-vidro','divisoria-vidro-baixa','guarda-corpo-vidro','divisoria-baixa','aberta']);
 for(const r of map.rooms){for(const [side,type] of Object.entries(r.edges??{}))assert.ok(known.has(type as string),`${r.id}.${side}: ${type}`);
  assert.ok(r.edges?.j0||r.edges?.i0||r.edges?.i1,r.id+' sem nenhuma borda declarada');}
 // salas com tela ou placa têm parede alta maciça atrás (j0)
 for(const s of map.screens)assert.match(map.rooms.find((r:any)=>r.id===s.room).edges.j0,/^parede-/,s.id);
});

test('F8: o autor da planta valida limites, sobreposição, portas, postos, rotas e a regra das 2 fileiras atrás de parede alta',()=>{
 const run=spawnSync(process.execPath,['scripts/assets/office2-layout.mjs','--mapa'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});

test('F8: paredes com altura por tipo, montantes em cantos e batentes, e luz âmbar só nos batentes de parede alta ou vidro',()=>{
 const lib=runtime(),iso=lib.Office2Iso.create(map),scene=lib.Office2Scene.create(map,iso,{});
 const heights=new Set(scene.walls.map((w:any)=>w.h));
 assert.deepEqual([...heights].map(Number).sort((a,b)=>a-b),[30,48,72]);
 assert.ok(scene.walls.filter((w:any)=>!w.glass).every((w:any)=>w.h===72),'maciças só altas');
 // cada porta de uma borda com parede tem montante nas duas pontas
 for(const d of iso.doors){const r=map.rooms.find((x:any)=>x.id===d.room);if(!r.edges[d.side]||r.edges[d.side]==='aberta')continue;const t=r.tiles;
  const ends=d.side[0]==='j'?[[d.inner.i,d.side==='j0'?t.j0:t.j1],[d.inner.i+1,d.side==='j0'?t.j0:t.j1]]:[[d.side==='i0'?t.i0:t.i1,d.inner.j],[d.side==='i0'?t.i0:t.i1,d.inner.j+1]];
  for(const [i,j] of ends)assert.ok(scene.posts.some((p:any)=>p.i===i&&p.j===j&&p.door),`${d.room}: sem batente em ${i},${j}`);}
});

function recorder(){
 const alphas:number[]=[],stack:number[]=[],state={globalAlpha:1} as any;
 const ctx=new Proxy(state,{get:(t,k)=>k==='globalAlpha'?t.globalAlpha:k==='save'?()=>stack.push(t.globalAlpha):k==='restore'?()=>{t.globalAlpha=stack.pop()??1;}:k==='measureText'?()=>({width:20}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='fill'?()=>alphas.push(t.globalAlpha):()=>{},set:(t,k,v)=>{t[k]=v;return true;}});
 return {ctx,alphas};
}
test('F8: parede alta que esconde um agente fica translúcida; sem agente atrás, nada fica',()=>{
 const lib=runtime(),iso=lib.Office2Iso.create(map),scene=lib.Office2Scene.create(map,iso,{});
 const behind=recorder();scene.draw(behind.ctx,{},[{id:'x',pos:{i:5,j:4},dir:'NE',mode:'idle',step:0}],{},{});
 assert.ok(behind.alphas.some(a=>a<.5),'parede à frente do agente translúcida');
 const free=recorder();scene.draw(free.ctx,{},[{id:'x',pos:{i:35,j:3},dir:'NE',mode:'idle',step:0}],{},{});
 assert.ok(free.alphas.every(a=>a>=.99),'sem ninguém atrás, parede opaca');
});

test('F8: a visão geral enquadra a planta inteira, inclusive o alto das placas, em desktop e notebook',()=>{
 const lib=runtime(),iso=lib.Office2Iso.create(map),scene=lib.Office2Scene.create(map,iso,{});
 assert.ok(Number.isFinite(scene.topY));
 const left=iso.project(0,iso.H),right=iso.project(iso.W,0),bottom=iso.project(iso.W,iso.H);
 const bounds={x0:left.x-12,x1:right.x+12,y0:scene.topY-14,y1:bottom.y+24};
 for(const [vw,vh] of [[1920,864],[1366,660]]){const c=lib.Office2Iso.fit(bounds,vw,vh,2,16);
  assert.ok(c.s>=.55,`${vw}×${vh}: escala ${c.s.toFixed(2)} pequena demais`);
  for(const p of [left,right,bottom,{x:iso.project(0,0).x,y:scene.topY}]){const x=p.x*c.s+c.x,y=p.y*c.s+c.y;assert.ok(x>=0&&x<=vw&&y>=0&&y<=vh,`${vw}×${vh}: ponto fora da tela`);}}
});

test('F8: o endereço #sala abre a sala direto, e um endereço desconhecido é ignorado',async()=>{
 for(const [hash,expected] of [['#convivencia','convivencia'],['#nao-existe',undefined]]){
  const context=runtime(),nodes=new Map<string,any>();
  const node=()=>({clientWidth:1200,clientHeight:700,style:{},dataset:{},classList:{add(){},toggle(){}},append(){},replaceChildren(){},addEventListener(){},setAttribute(){},getContext(){return {};}});
  const document={hidden:false,querySelector(key:string){if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);},querySelectorAll(){return [];},createElement:node,createTextNode:node,addEventListener(){}};
  class Img{onload?:()=>void;set src(_value:string){queueMicrotask(()=>this.onload?.());}}
  Object.assign(context,{document,Image:Img,location:{hash},localStorage:{getItem(){return 'night';}},matchMedia:()=>({matches:true}),requestAnimationFrame(){},setInterval(){},addEventListener(){},performance:{now:()=>0},OfficeSpriteSheets:{},Office2Ring:{ACCOUNT:'evaluation:nova:usdm'},Office2Lab:{},Office2Ops:{},Office2Horizon:{},
   fetch:async(url:string)=>({ok:url==='/office2/scene-map.json',status:404,json:async()=>map}),
   Office2Scene:{create(){return {signs:[],topY:0,renderStatic(_s:number,_p:string,height:number){return {worldHeight:height};}};}}});
  vm.runInContext(readFileSync('public/office2/app.js','utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.Office2.state.focus?.id,expected,hash);
 }
});

test('F8: móveis com frente ficam de costas para uma parede de trás, com a orientação certa, e nada grande fica solto no meio da sala',()=>{
 // arte: frente para +i, costas para −i; espelhada, frente para +j. Logo: parede j0 → espelhado; parede i0 → sem espelho.
 const direcionais=new Set(['sofa','sofa-cinza','sofa-externo','poltrona','poltrona-externa','estacao-2-monitores','estacao-madeira','mesa-curva-operacoes','mesa-curva-media','armarios-arquivo','lockers','estante-arquivo','armario-baixo','bancada-cozinha','geladeira','parede-elevadores','rack-servidor','esteira']);
 const soltos=new Set(['tapete','mesa-centro','mesa-reuniao','mesa-reuniao-6','mesa-cafe-4','balcao-recepcao','catraca','banqueta','mesa-externa','bancada-teste']);
 for(const p of map.props.filter((p:any)=>p.room&&p.blocking!==false)){
  const t=map.rooms.find((r:any)=>r.id===p.room).tiles,{i,j}=p.tile,{a,b}=p.footprint;
  if(direcionais.has(p.asset)){assert.ok(p.wall==='j0'||p.wall==='i0',`${p.asset} (${i},${j}) sem parede declarada`);
   assert.ok((p.wall==='j0'?j-t.j0:i-t.i0)<=1,`${p.asset} (${i},${j}) longe da parede ${p.wall}`);
   if(!p.faceWall)assert.equal(Boolean(p.flip),p.wall==='j0',`${p.asset} (${i},${j}) com orientação errada para ${p.wall}`);}
  if(!soltos.has(p.asset))assert.ok(Math.min(i-t.i0,j-t.j0,t.i1-(i+a),t.j1-(j+b))<=1,`${p.asset} (${i},${j}) solto no meio de ${p.room}`);
 }
 // as telas de dados ficam acima dos móveis baixos: faixa de 22 a 70 px
 assert.match(readFileSync('public/office2/scene.js','utf8'),/bottom=22;/);
});

test('F8: nenhuma arte sai minúscula: a largura final de cada móvel é pelo menos 45% do losango da pegada',()=>{
 const manifest=JSON.parse(readFileSync('public/office2/art/manifesto.json','utf8')).props,supports=JSON.parse(readFileSync('public/office2/art/apoios.json','utf8')).supports;
 const iso=runtime().Office2Iso.create(map);
 for(const p of map.props.filter((p:any)=>p.blocking!==false)){
  const info=manifest[p.asset],place=iso.propPlacement(p,info,supports[p.asset]),largura=info.width*place.s,losango=(p.footprint.a+p.footprint.b)*24;
  assert.ok(largura>=0.45*losango,`${p.asset} (${p.tile.i},${p.tile.j}) sai a ${Math.round(largura)} px, só ${Math.round(100*largura/losango)}% do losango`);
 }
});
