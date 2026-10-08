import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {decodePng,crop} from '../scripts/assets/png.js';
import {normalizeCharacter,CHARACTER_FRAMES} from '../scripts/assets/personagens-gpt.js';
import {removeKey} from '../scripts/assets/arte-gemini.js';
const map=JSON.parse(readFileSync('public/office2/scene-map.json','utf8'));
function runtime(extra:Record<string,unknown>={}){const context=vm.createContext(extra);for(const f of ['iso','scene'])vm.runInContext(readFileSync('public/office2/'+f+'.js','utf8'),context);return context;}

test('F7: móveis sólidos dentro das salas, sem sobreposição, portas e pontos livres; tapete andável sob o sofá',()=>{
 const iso=runtime().Office2Iso.create(map),used=new Set<string>();
 const doors=iso.doors.flatMap((d:any)=>[d.inner,d.outer]);
 for(const p of map.props){const room=map.rooms.find((r:any)=>r.id===p.room);
  for(let i=p.tile.i;i<p.tile.i+p.footprint.a;i++)for(let j=p.tile.j;j<p.tile.j+p.footprint.b;j++){
   if(room)assert.ok(i>=room.tiles.i0&&i<room.tiles.i1&&j>=room.tiles.j0&&j<room.tiles.j1,p.asset+' fora da sala');
   else assert.equal(iso.roomAt(i,j),null,'planta de corredor dentro de sala');
   assert.ok(!doors.some((d:any)=>d.i===i&&d.j===j),'porta: '+p.asset);
   if(p.blocking===false){assert.equal(p.asset,'tapete');continue;}
   assert.ok(!map.points.some((d:any)=>d.tile.i===i&&d.tile.j===j),'ponto: '+p.asset);
   const key=i+','+j;assert.ok(!used.has(key),'sobreposição: '+key);used.add(key);
  }
 }
 assert.ok(iso.walkable(13,9),'ponto IDLE em cima do tapete continua livre');
 assert.ok(!iso.walkable(13,8),'sofá bloqueia mesmo em cima do tapete');
 for(const p of map.points.filter((p:any)=>p.kind==='WORK')){
  const d=runtime().Office2Iso.DIRS[p.facing],i=p.tile.i+d.di,j=p.tile.j+d.dj;
  assert.ok(map.props.some((prop:any)=>prop.room===p.room&&/^(mesa-|estacao-)/.test(prop.asset)&&i>=prop.tile.i&&i<prop.tile.i+prop.footprint.a&&j>=prop.tile.j&&j<prop.tile.j+prop.footprint.b),'sem mesa diante de '+p.id);
 }
 assert.equal(map.props.filter((p:any)=>p.room==='nexus'&&p.asset.startsWith('cadeira')).length,0);
});

test('F7: seis texturas opacas 512×512 e oito folhas 2×6 com pés ancorados',()=>{
 for(const name of ['piso-marmore','piso-madeira','carpete','deck','parede-ripada','parede-escura']){
  const img=decodePng(readFileSync('public/office2/art/texturas/'+name+'.png'));assert.equal(img.width,512);assert.equal(img.height,512);
  assert.ok(img.data.every((v,i)=>i%4!==3||v===255));
 }
 const frames=JSON.parse(readFileSync('public/office2/art/personagens/quadros.json','utf8'));assert.deepEqual(frames,CHARACTER_FRAMES);
 for(const id of frames.ids){const img=decodePng(readFileSync('public/office2/art/personagens/'+id+'.png'));assert.equal(img.width,1152);assert.equal(img.height,512);
  for(let row=0;row<2;row++)for(let col=0;col<6;col++){
   const part=crop(img,col*192,row*256,192,256);assert.ok(part.data.some((v,i)=>i%4===3&&v===0));
   assert.ok(part.data.slice(255*192*4).some((v,i)=>i%4===3&&v>0),`${id} ${row},${col}: pés fora da base`);
  }
 }
});

test('normalizador rejeita contagem errada e distribuição diferente de duas linhas de seis',()=>{
 const make=(counts:number[])=>{const w=120,h=50,data=new Uint8Array(w*h*4);for(let p=0;p<w*h;p++)data.set([255,0,255,255],p*4);
  counts.forEach((n,r)=>{for(let c=0;c<n;c++)for(let y=5+r*25;y<13+r*25;y++)for(let x=4+c*15;x<7+c*15;x++)data.set([35,40,50,255],(y*w+x)*4);});return {width:w,height:h,data};};
 assert.throws(()=>normalizeCharacter(make([6,5]),'atlas'),/achei 11 objetos/);
 assert.throws(()=>normalizeCharacter(make([7,5]),'atlas'),/7\+5/);
 const img=normalizeCharacter(make([6,6]),'atlas');assert.equal(img.width,1152);assert.equal(img.height,512);
});

test('chroma dos personagens preserva violeta/verde no interior e remove a cor do fundo',()=>{
 const data=new Uint8Array(7*7*4);for(let p=0;p<49;p++)data.set([255,0,255,255],p*4);
 for(let y=1;y<6;y++)for(let x=1;x<6;x++)data.set([90,35,140,255],(y*7+x)*4);
 const keyed=removeKey({width:7,height:7,data},[255,0,255],110,true);
 assert.equal(keyed.data[3],0);assert.deepEqual([...keyed.data.slice(24*4,25*4)],[90,35,140,255]);
});

test('F7: quadro, espelho e desenho para quatro direções e três modos; folha antiga é reserva',()=>{
 const context=runtime(),iso=context.Office2Iso,modern={complete:true,naturalWidth:1152},old={complete:true,naturalWidth:100};
 const calls:any[][]=[],ctx=new Proxy({},{get:(_t,k)=>k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):(...args:unknown[])=>calls.push([k,...args]),set:()=>true});
 const scene=context.Office2Scene.create(map,iso.create(map),{characters:{vega:modern},characterFrames:CHARACTER_FRAMES});
 for(const dir of ['SE','SW','NE','NW'])for(const mode of ['idle','walk','seated']){
  const frame=iso.frameGpt(dir,mode,2);assert.equal(frame.row,['NE','NW'].includes(dir)?1:0);assert.equal(frame.col,mode==='walk'?3:mode==='seated'?5:0);assert.equal(frame.flip,['SW','NW'].includes(dir));
  calls.length=0;scene.draw(ctx,{},[{id:'vega',dir,mode,step:2,pos:{i:6,j:5}}],{},{});
  const draw=calls.find(c=>c[0]==='drawImage'&&c[1]===modern);assert.ok(draw);assert.equal(draw[2],frame.col*192);assert.equal(draw[3],frame.row*256);
  assert.equal(calls.some(c=>c[0]==='scale'&&c[1]===-1),frame.flip);
 }
 const fallback=context.Office2Scene.create(map,iso.create(map),{});calls.length=0;
 fallback.draw(ctx,{},[{id:'vega',dir:'SE',mode:'idle',pos:{i:6,j:5}}],{vega:{frames:Array(24).fill({x:0,y:0,w:10,h:20,pivotX:5})}},{vega:old});
 assert.ok(calls.some(c=>c[0]==='drawImage'&&c[1]===old));
});

test('texturas usam padrões isométricos e o cache estático também roda sem DOMMatrix/createPattern',()=>{
 const matrices:number[][]=[],calls:any[][]=[];
 const ctx=new Proxy({},{get:(_t,k)=>k==='createPattern'?()=>({setTransform(m:any){matrices.push(m.values);}}):k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):(...args:unknown[])=>calls.push([k,...args]),set:()=>true});
 class Canvas{getContext(){return ctx;}}
 class Matrix{constructor(public values:number[]) {}}
 const context=runtime({OffscreenCanvas:Canvas,DOMMatrix:Matrix}),img={complete:true,naturalWidth:512};
 const textures=Object.fromEntries(['piso-marmore','piso-madeira','carpete','deck','parede-ripada','parede-escura'].map(n=>[n,img]));
 const scene=context.Office2Scene.create(map,context.Office2Iso.create(map),{textures});scene.renderStatic();scene.draw(ctx,{},[],{},{});
 assert.ok(matrices.some(m=>m[0]===24/128&&m[1]===12/128&&m[2]===-24/128&&m[3]===12/128));
 assert.ok(matrices.some(m=>m[0]===24/64&&m[2]===-24/64));
 assert.ok(matrices.some(m=>Math.abs(m[0])===24/128&&m[2]===0&&m[3]===1));
 const bare=runtime({OffscreenCanvas:Canvas});assert.doesNotThrow(()=>bare.Office2Scene.create(map,bare.Office2Iso.create(map),{textures}).renderStatic());
});
