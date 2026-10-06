import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Mapa da cena isométrica do Escritório 2.0 (public/office2/scene-map.json): proposta de planta conferida aqui
// antes de qualquer renderização. Só lê o JSON; não toca o escritório atual.
interface Tiles {i0:number;i1:number;j0:number;j1:number}
interface Room {id:string;module:string;tiles:Tiles;doors?:{side:'i0'|'i1'|'j0'|'j1';at:number}[];subzones?:{module:string;tiles:Tiles}[]}
const map=JSON.parse(readFileSync('public/office2/scene-map.json','utf8')) as {grid:{i:number;j:number};projection:{tile:{w:number;h:number};origin:{x:number;y:number};scene:{w:number;h:number};wallHeight:number};
 rooms:Room[];points:{id:string;room:string;tile:{i:number;j:number};kind:string;agent?:string}[];screens:{id:string;room:string;wall:string;tiles:{from:number;to:number};truth:string}[]};
const W=map.grid.i,H=map.grid.j,inside=(t:Tiles,i:number,j:number)=>i>=t.i0&&i<t.i1&&j>=t.j0&&j<t.j1;

test('as salas ficam dentro da planta, sem sobreposição, e os 12 módulos do handoff têm casa',()=>{
 const owner=new Map<string,string>();
 for(const r of map.rooms){
  assert.ok(r.tiles.i0>=0&&r.tiles.j0>=0&&r.tiles.i1<=W&&r.tiles.j1<=H&&r.tiles.i0<r.tiles.i1&&r.tiles.j0<r.tiles.j1,r.id);
  for(let i=r.tiles.i0;i<r.tiles.i1;i++)for(let j=r.tiles.j0;j<r.tiles.j1;j++){assert.ok(!owner.has(i+','+j),`${r.id} sobrepõe ${owner.get(i+','+j)}`);owner.set(i+','+j,r.id);}
  for(const s of r.subzones??[])assert.ok(s.tiles.i0>=r.tiles.i0&&s.tiles.i1<=r.tiles.i1&&s.tiles.j0>=r.tiles.j0&&s.tiles.j1<=r.tiles.j1,r.id+' subzona');
 }
 const present=new Set(map.rooms.flatMap(r=>[r.module,...(r.subzones??[]).map(s=>s.module)]));
 for(const m of ['MAIN_FLOOR','MARKET_HORIZON','DECISION_RING','RISK_CONTROL','NEXUS','DIAGNOSTICS','STRESS_LAB','BACKTEST','PAPER_EXECUTION','AUDIT_LOGS','IDLE_LOUNGE','PANORAMIC_EDGE'])assert.ok(present.has(m),m);
});

test('todas as salas se alcançam a partir da chegada, só pelas portas declaradas',()=>{
 const owner=(i:number,j:number)=>map.rooms.find(r=>inside(r.tiles,i,j))?.id??null;
 const doors=map.rooms.flatMap(r=>(r.doors??[]).map(d=>{const t=r.tiles;
  const [inner,outer]=d.side==='i0'?[[t.i0,d.at],[t.i0-1,d.at]]:d.side==='i1'?[[t.i1-1,d.at],[t.i1,d.at]]:d.side==='j0'?[[d.at,t.j0],[d.at,t.j0-1]]:[[d.at,t.j1-1],[d.at,t.j1]];
  assert.ok(inside(t,inner[0],inner[1]),`porta fora do lado em ${r.id}`);assert.ok(outer[0]>=0&&outer[1]>=0&&outer[0]<W&&outer[1]<H,`porta para fora da planta em ${r.id}`);
  return {room:r.id,outer,outerOwner:owner(outer[0],outer[1])};}));
 const reached=new Set<string>(),seen=new Set<string>(),queue:number[][]=[];
 const visit=(id:string)=>{if(reached.has(id))return;reached.add(id);for(const d of doors){if(d.room===id){if(d.outerOwner===null)queue.push(d.outer);else visit(d.outerOwner);}if(d.outerOwner===id)visit(d.room);}};
 visit(map.points.find(p=>p.kind==='SPAWN')!.room);
 while(queue.length){const [i,j]=queue.pop()!;if(i<0||j<0||i>=W||j>=H||seen.has(i+','+j)||owner(i,j)!==null)continue;seen.add(i+','+j);
  for(const d of doors)if(d.outer[0]===i&&d.outer[1]===j)visit(d.room);queue.push([i+1,j],[i-1,j],[i,j+1],[i,j-1]);}
 assert.deepEqual(map.rooms.map(r=>r.id).filter(id=>!reached.has(id)),[]);
});

test('os 8 agentes têm posto de trabalho, os pontos ficam dentro das salas e as telas cabem nas paredes',()=>{
 const room=(id:string)=>map.rooms.find(r=>r.id===id)!;
 assert.deepEqual(map.points.filter(p=>p.agent).map(p=>p.agent).sort(),['atlas','euler','flux','nova','oracle','satoshi','sentinel','vega']);
 for(const p of map.points)assert.ok(inside(room(p.room).tiles,p.tile.i,p.tile.j),p.id);
 for(const s of map.screens){const t=room(s.room).tiles;assert.equal(s.wall,'j0');assert.ok(s.tiles.from>=t.i0&&s.tiles.to<=t.i1&&s.tiles.from<s.tiles.to,s.id);assert.ok(['REAL','SIMULATION'].includes(s.truth),s.id);}
});

test('a projeção 2:1 coloca a planta inteira dentro da cena de 1536 × 864, com espaço para as paredes',()=>{
 const {tile,origin,scene,wallHeight}=map.projection,at=(i:number,j:number)=>({x:origin.x+(i-j)*tile.w/2,y:origin.y+(i+j)*tile.h/2});
 assert.equal(tile.w,tile.h*2);
 const corners=[at(0,0),at(W,0),at(W,H),at(0,H)];
 for(const c of corners)assert.ok(c.x>=0&&c.x<=scene.w&&c.y>=0&&c.y<=scene.h,JSON.stringify(c));
 assert.ok(at(0,0).y-wallHeight>=0,'parede do fundo cabe acima da laje');
});

test('móveis ficam dentro da sala, sem sobreposição, sem ocupar posto, ponto de lazer ou porta',()=>{
 const props=(map as any).props as {asset:string;room:string;tile:{i:number;j:number};footprint:{a:number;b:number};h:number}[];
 const room=(id:string)=>map.rooms.find(r=>r.id===id)!,taken=new Set<string>();
 for(const p of props){assert.ok(p.h>0&&p.footprint.a>0&&p.footprint.b>0,p.asset);
  for(let i=p.tile.i;i<p.tile.i+p.footprint.a;i++)for(let j=p.tile.j;j<p.tile.j+p.footprint.b;j++){assert.ok(inside(room(p.room).tiles,i,j),p.asset+' fora de '+p.room);assert.ok(!taken.has(i+','+j),'sobreposição em '+i+','+j);taken.add(i+','+j);}}
 for(const pt of map.points)assert.ok(!taken.has(pt.tile.i+','+pt.tile.j),pt.id);
 for(const r of map.rooms)for(const d of r.doors??[]){const t=r.tiles,a=d.side==='i0'?[t.i0,d.at]:d.side==='i1'?[t.i1-1,d.at]:d.side==='j0'?[d.at,t.j0]:[d.at,t.j1-1];assert.ok(!taken.has(a.join(',')),'porta de '+r.id);}
});
