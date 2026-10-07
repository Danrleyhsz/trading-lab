import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import Fastify from 'fastify';
import {registerOfficeAssets} from '../src/application/office-assets.js';
import {decodePng} from '../scripts/assets/png.js';
import {removeKey,objectsOf,cropMasked,mergeClose,resize} from '../scripts/assets/arte-gemini.js';

const map=JSON.parse(readFileSync('public/office2/scene-map.json','utf8'));
const manifest=JSON.parse(readFileSync('public/office2/art/manifesto.json','utf8'));
const report=JSON.parse(readFileSync('public/office2/stress-report.json','utf8'));

test('arte F6: todo móvel do mapa tem peça no manifesto, todo arquivo existe e é PNG com transparência',()=>{
 for(const asset of new Set(map.props.map((p:any)=>p.asset)))assert.ok(manifest.props[asset as string],'sem arte: '+asset);
 for(const [name,info] of Object.entries<any>({...manifest.props,...manifest.icons})){
  const file='public/office2/art/'+info.file;assert.ok(existsSync(file),'falta '+file);
  const img=decodePng(readFileSync(file));assert.ok(img.data.some((v,i)=>i%4===3&&v===0),name+' sem fundo transparente');
  assert.ok(img.data.some((v,i)=>i%4===3&&v===255),name+' vazio');}
 for(const p of Object.values<any>(manifest.props))assert.ok(['i','j','none'].includes(p.axis));
});

test('arte F6: ícone para os 5 estágios do Anel e para os 14 cenários do Stress Lab, pelo id',()=>{
 for(const s of ['trader','risk','validator','execution','audit'])assert.ok(manifest.icons['estagio-'+s],'estágio '+s);
 assert.equal(report.scenarios.length,14);
 for(const c of report.scenarios)assert.ok(manifest.icons['cenario-'+String(c.id).toLowerCase().replace(/_/g,'-')],'cenário '+c.id);
});

test('/office2/art serve só PNG de nome simples em props/ e icones/, e o manifesto; o resto é 404',async()=>{
 const app=Fastify();registerOfficeAssets(app);
 try{
  for(const [p,type] of [['/office2/art/manifesto.json','application/json'],['/office2/art/props/sofa.png','image/png'],['/office2/art/icones/estagio-risk.png','image/png'],['/office2/art/cidade-noite.jpg','image/jpeg']]){
   const r=await app.inject(p);assert.equal(r.statusCode,200,p);assert.match(String(r.headers['content-type']),new RegExp('^'+type));assert.equal(r.headers['x-content-type-options'],'nosniff');}
  for(const p of ['/office2/art/props/nao-existe.png','/office2/art/props/..%2F..%2F..%2F.env','/office2/art/props/%2e%2e%2f%2e%2e%2fapp.js','/office2/art/props/Sofa.png','/office2/art/outros/sofa.png','/office2/art/props/sofa.svg'])
   assert.equal((await app.inject(p)).statusCode,404,p);
 }finally{await app.close();}
});

test('recorte chroma: fundo magenta some, borda perde o tom magenta, objetos cruzados continuam separados e o vizinho não entra no recorte',()=>{
 const w=40,h=20,data=new Uint8Array(w*h*4);
 const put=(x:number,y:number,c:number[])=>{data.set([...c,255],(y*w+x)*4);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)put(x,y,[252,4,252]);
 // Objeto A: L grande à esquerda; objeto B: bloco à direita que entra na caixa de A; pedaço solto pequeno perto de B.
 for(let y=2;y<18;y++)for(let x=2;x<6;x++)put(x,y,[40,40,60]);for(let y=14;y<18;y++)for(let x=6;x<20;x++)put(x,y,[40,40,60]);
 for(let y=2;y<12;y++)for(let x=10;x<24;x++)put(x,y,[200,120,40]);for(let y=4;y<7;y++)for(let x=26;x<28;x++)put(x,y,[200,120,40]);
 put(6,2,[150,40,140]); // borda roxa (mistura com o fundo) colada em A
 const keyed=removeKey({width:w,height:h,data},[252,4,252]);
 assert.equal(keyed.data[3],0,'fundo transparente');
 const o=(6+2*w)*4;assert.ok(Math.min(keyed.data[o],keyed.data[o+2])<=keyed.data[o+1],'despill tirou o magenta da borda');
 const {label,boxes}=objectsOf(keyed);assert.equal(boxes.length,2,'dois objetos, o pedaço solto vai para o mais próximo');
 const b=boxes.find(x=>x.x>=10)!;assert.equal(b.x+b.w-1,27,'pedaço solto juntado ao bloco B');
 const a=boxes.find(x=>x.x<10)!,part=cropMasked(keyed,label,a);
 assert.equal(part.data[((3)*a.w+(12-a.x))*4+3],0,'pixel de B dentro da caixa de A fica transparente');
 assert.equal(mergeClose(boxes,50).length,1);
 const small=resize(keyed,20,10);assert.equal(small.width,20);assert.ok(small.data.some((v,i)=>i%4===3&&v>0));
});
