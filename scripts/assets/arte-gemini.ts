// Recorta as folhas geradas no Gemini (fundo chroma key) em peças com fundo transparente para o Escritório 2.0.
// Entrada: as folhas em PNG (o Gemini entrega JPEG; converta antes, por exemplo com System.Drawing no PowerShell).
// Uso:  npx tsx scripts/assets/arte-gemini.ts <pasta-das-folhas-png> [pasta-de-saída=public/office2/art]
//       npx tsx scripts/assets/arte-gemini.ts <pasta> --caixas      (só lista os objetos achados em cada folha)
//       --config=<arquivo.json> troca a configuração (padrão: arte-gemini.json, ao lado). Ex.: --config=scripts/assets/arte-gpt.json
// A configuração diz qual objeto vira qual peça, tamanho final e orientação. Folha que já vem com fundo transparente também serve.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodePng,encodePng,crop,type Rgba} from './png.js';

export interface SheetConfig {key:[number,number,number];kind:'prop'|'icon';share?:number;gap?:number;pieces:(PieceConfig|null)[]}
export interface PieceConfig {name:string;width?:number;size?:number;axis?:'i'|'j'|'none'}
export interface Manifest {version:1;props:Record<string,{file:string;width:number;height:number;axis:'i'|'j'|'none'}>;icons:Record<string,{file:string;size:number}>}

/** Fundo chroma: perto da cor-chave vira transparente; a borda perde o tom da chave (despill) e fica opaca (pixel art sem meio-tom). */
export function removeKey(img:Rgba,key:[number,number,number],cut=110):Rgba{
 const out=new Uint8Array(img.data.length),[kr,kg,kb]=key,magenta=kg<kr&&kg<kb;
 for(let p=0;p<img.width*img.height;p++){const o=p*4;let r=img.data[o],g=img.data[o+1],b=img.data[o+2];
  if(img.data[o+3]<128||Math.hypot(r-kr,g-kg,b-kb)<cut)continue; // PNG já transparente (ChatGPT) ou cor-chave
  if(magenta){const m=Math.min(r,b);if(m>g){const s=m-g;r-=s;b-=s;}}else{const m=Math.max(r,b);if(g>m)g=m;}
  out[o]=r;out[o+1]=g;out[o+2]=b;out[o+3]=255;}
 return {width:img.width,height:img.height,data:out};
}
/** Reduz por média de área com alfa pré-multiplicado (a arte do Gemini é "pixel art" desenhada em alta resolução). */
export function resize(img:Rgba,w:number,h:number):Rgba{
 const out=new Uint8Array(w*h*4),sx=img.width/w,sy=img.height/h;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=x*sx,x1=(x+1)*sx,y0=y*sy,y1=(y+1)*sy;let r=0,g=0,b=0,a=0,n=0;
  for(let yy=Math.floor(y0);yy<Math.ceil(y1);yy++)for(let xx=Math.floor(x0);xx<Math.ceil(x1);xx++){const wgt=(Math.min(xx+1,x1)-Math.max(xx,x0))*(Math.min(yy+1,y1)-Math.max(yy,y0));if(wgt<=0)continue;const o=(yy*img.width+xx)*4,al=img.data[o+3]/255*wgt;r+=img.data[o]*al;g+=img.data[o+1]*al;b+=img.data[o+2]*al;a+=al;n+=wgt;}
  const o=(y*w+x)*4;if(a>0){out[o]=Math.round(r/a);out[o+1]=Math.round(g/a);out[o+2]=Math.round(b/a);}out[o+3]=Math.round(a/n*255);}
 return {width:w,height:h,data:out};
}
type Box={x0:number;y0:number;x1:number;y1:number;n:number;ids:number[]};
export interface Found {x:number;y:number;w:number;h:number;count:number;ids:number[]}
/**
 * Objetos por componente conexo. Diferente de findObjects (que une caixas sobrepostas), dois móveis grandes cujas caixas se
 * cruzam continuam separados; só pedaços pequenos (menos de `share` do maior) são juntados ao objeto grande mais próximo.
 */
export function objectsOf(img:Rgba,share=0.06):{label:Int32Array;boxes:Found[]}{
 const {width:w,height:h,data}=img,label=new Int32Array(w*h).fill(-1),comps:Box[]=[];
 for(let p=0;p<w*h;p++){if(label[p]>=0||data[p*4+3]<128)continue;const id=comps.length,b={x0:w,y0:h,x1:-1,y1:-1,n:0,ids:[id]},stack=[p];label[p]=id;
  while(stack.length){const q=stack.pop()!,x=q%w,y=(q/w)|0;b.n++;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const r=ny*w+nx;if(label[r]<0&&data[r*4+3]>=128){label[r]=id;stack.push(r);}}}
  comps.push(b);}
 const max=Math.max(0,...comps.map(c=>c.n)),big=comps.filter(c=>c.n>=max*share).map(c=>({...c,ids:[...c.ids]})),dust=Math.max(4,max*0.0005);
 const gapTo=(a:Box,b:Box)=>Math.hypot(Math.max(0,a.x0-b.x1,b.x0-a.x1),Math.max(0,a.y0-b.y1,b.y0-a.y1));
 for(const c of comps){if(c.n>=max*share||c.n<dust)continue;let best=big[0],d=Infinity;for(const b of big){const g=gapTo(c,b);if(g<d){d=g;best=b;}}
  if(best&&d<=Math.max(8,Math.max(w,h)*0.03)){best.x0=Math.min(best.x0,c.x0);best.y0=Math.min(best.y0,c.y0);best.x1=Math.max(best.x1,c.x1);best.y1=Math.max(best.y1,c.y1);best.n+=c.n;best.ids.push(...c.ids);}}
 big.sort((a,b)=>a.y0-b.y0);const rows:Box[][]=[];
 for(const b of big){const c=(b.y0+b.y1)/2,row=rows.find(r=>c>=r[0].y0&&c<=r[0].y1);row?row.push(b):rows.push([b]);}
 return {label,boxes:rows.flatMap(r=>r.sort((a,b)=>a.x0-b.x0)).map(b=>({x:b.x0,y:b.y0,w:b.x1-b.x0+1,h:b.y1-b.y0+1,count:b.n,ids:b.ids}))};
}
/** Recorte só com os pixels do próprio objeto: o canto de um vizinho que entra na caixa fica transparente. */
export function cropMasked(img:Rgba,label:Int32Array,b:Found):Rgba{
 const keep=new Set(b.ids),part=crop(img,b.x,b.y,b.w,b.h);
 for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const l=label[(b.y+y)*img.width+b.x+x];if(!keep.has(l))part.data[(y*b.w+x)*4+3]=0;}
 return part;
}
/** Ícones têm partes soltas (pontos, setas): caixas a menos de `gap` px uma da outra viram um ícone só. */
export function mergeClose(boxes:Found[],gap:number){
 const list=boxes.map(b=>({...b}));let changed=true;
 while(changed){changed=false;for(let i=0;i<list.length&&!changed;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];
  const dx=Math.max(0,a.x-(b.x+b.w),b.x-(a.x+a.w)),dy=Math.max(0,a.y-(b.y+b.h),b.y-(a.y+a.h));
  if(dx<gap&&dy<gap){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);list[i]={x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y,count:a.count+b.count,ids:[...a.ids,...b.ids]};list.splice(j,1);changed=true;break;}}}
 list.sort((a,b)=>a.y-b.y);const rows:typeof list[]=[];
 for(const b of list){const c=b.y+b.h/2,row=rows.find(r=>c>=r[0].y&&c<=r[0].y+r[0].h);row?row.push(b):rows.push([b]);}
 return rows.flatMap(r=>r.sort((a,b)=>a.x-b.x));
}
export function boxesOf(img:Rgba,cfg:SheetConfig){
 const keyed=removeKey(img,cfg.key),{label,boxes}=objectsOf(keyed,cfg.share??0.06);
 return {keyed,label,boxes:cfg.kind==='icon'?mergeClose(boxes,Math.round((cfg.gap??30)*img.width/2752)):boxes};
}
if(process.argv[1]?.endsWith('arte-gemini.ts')){
 const here=dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2),cfgArg=args.find(a=>a.startsWith('--config=')),[src,outArg]=args.filter(a=>!a.startsWith('--config='));
 if(!src)throw Error('uso: arte-gemini.ts <pasta-das-folhas-png> [pasta-de-saída | --caixas]');
 const config=JSON.parse(readFileSync(cfgArg?cfgArg.slice(9):join(here,'arte-gemini.json'),'utf8')) as Record<string,SheetConfig>;
 const onlyBoxes=outArg==='--caixas',out=onlyBoxes?'':outArg??'public/office2/art';
 const manifest:Manifest={version:1,props:{},icons:{}};
 for(const [sheet,cfg] of Object.entries(config)){
  const img=decodePng(readFileSync(join(src,sheet+'.png'))),{keyed,label,boxes}=boxesOf(img,cfg);
  if(onlyBoxes){console.log(sheet,img.width+'x'+img.height,boxes.map((b,k)=>k+':'+b.w+'x'+b.h+'@'+b.x+','+b.y).join('  '));continue;}
  if(boxes.length!==cfg.pieces.length)throw Error(`${sheet}: achei ${boxes.length} objetos, a configuração tem ${cfg.pieces.length}`);
  boxes.forEach((b,k)=>{const piece=cfg.pieces[k];if(!piece)return;if(!/^[a-z0-9-]{1,40}$/.test(piece.name))throw Error('nome inválido: '+piece.name);
   const part=cropMasked(keyed,label,b);
   if(cfg.kind==='prop'){const w=piece.width!,h=Math.round(b.h*w/b.w),file='props/'+piece.name+'.png';mkdirSync(join(out,'props'),{recursive:true});
    writeFileSync(join(out,file),encodePng(resize(part,w,h)));manifest.props[piece.name]={file,width:w,height:h,axis:piece.axis??'none'};}
   else{const s=piece.size!,side=Math.max(b.w,b.h),sq=new Uint8Array(side*side*4),ox=(side-b.w)>>1,oy=(side-b.h)>>1;
    for(let y=0;y<b.h;y++)sq.set(part.data.subarray(y*b.w*4,(y+1)*b.w*4),((y+oy)*side+ox)*4);
    const file='icones/'+piece.name+'.png';mkdirSync(join(out,'icones'),{recursive:true});
    writeFileSync(join(out,file),encodePng(resize({width:side,height:side,data:sq},s,s)));manifest.icons[piece.name]={file,size:s};}
  });
 }
 if(!onlyBoxes){writeFileSync(join(out,'manifesto.json'),JSON.stringify(manifest,null,1)+'\n');console.log(Object.keys(manifest.props).length+' peças, '+Object.keys(manifest.icons).length+' ícones');}
}
