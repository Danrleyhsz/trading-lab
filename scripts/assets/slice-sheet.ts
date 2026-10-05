// Recorta uma folha de assets gerada (grade fixa, fundo transparente) em peças individuais com catálogo.
// Uso: npx tsx scripts/assets/slice-sheet.ts <folha.png> <prefixo> <colunas|auto> <linhas> <nome1,nome2,...> [pasta-saída]
// Cada célula vira <prefixo>-<nome>.png, recortada no conteúdo visível, e o catálogo registra tamanho e o ponto de
// apoio no chão (centro da base). Células vazias são puladas; células com fundo opaco são recusadas.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {decodePng,encodePng,crop,mirror,type Rgba} from './png.js';

export interface SlicedAsset {id:string;file:string;width:number;height:number;anchor:{x:number;y:number};cell:{col:number;row:number};opaqueShare:number}
const ALPHA_MIN=16;
/**
 * Borda dura de pixel art: o gerador deixa um halo fraco (alfa baixo) em volta dos objetos e o próprio objeto quase
 * opaco (até 254). Abaixo do limiar vira transparente (e sem cor); acima vira 100% opaco. Devolve uma cópia.
 */
export function cleanAlpha(img:Rgba,threshold=96):Rgba{
 const data=img.data.slice();for(let i=3;i<data.length;i+=4){if(data[i]<threshold){data[i-3]=data[i-2]=data[i-1]=data[i]=0;}else data[i]=255;}
 return {width:img.width,height:img.height,data};
}
/** Caixa do conteúdo visível (alfa ≥ 16) dentro de uma região, ou null se vazia. */
export function contentBox(img:Rgba,x0:number,y0:number,w:number,h:number){
 let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1,count=0;
 for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)if(img.data[(y*img.width+x)*4+3]>=ALPHA_MIN){count++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
 return count?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count}:null;
}
export function sliceSheet(img:Rgba,prefix:string,cols:number,rows:number,names:string[]){
 if(!(cols>0&&rows>0)||img.width%cols||img.height%rows)throw Error('a folha precisa ter largura e altura divisíveis pela grade');
 const cw=img.width/cols,ch=img.height/rows,out:{asset:SlicedAsset;png:Buffer}[]=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const name=names[row*cols+col];if(!name)continue;
  if(!/^[a-z0-9-]{1,40}$/.test(name))throw Error('nome inválido: '+name);
  const box=contentBox(img,col*cw,row*ch,cw,ch);if(!box)continue;
  const opaqueShare=box.count/(cw*ch);
  // Uma célula quase toda opaca indica fundo não removido: melhor recusar do que recortar errado.
  if(opaqueShare>0.97)throw Error(`célula ${name} sem fundo transparente`);
  const piece=crop(img,box.x,box.y,box.w,box.h);
  out.push({asset:{id:prefix+'-'+name,file:prefix+'-'+name+'.png',width:box.w,height:box.h,anchor:{x:Math.round(box.w/2),y:box.h},cell:{col,row},opaqueShare:Number(opaqueShare.toFixed(3))},png:encodePng(piece)});
 }
 return out;
}
/**
 * Modo automático: acha cada objeto como um grupo de pixels visíveis ligados (vizinhança de 8), junta grupos cujas
 * caixas ficam a até `gap` px (partes soltas do mesmo objeto) e ordena em linhas, de cima para baixo e da esquerda
 * para a direita. Útil porque o gerador de imagens nem sempre respeita a grade pedida.
 */
export function findObjects(img:Rgba,gap=6,minArea=40){
 const {width:w,height:h,data}=img,label=new Int32Array(w*h).fill(-1),boxes:{x0:number;y0:number;x1:number;y1:number;n:number}[]=[];
 for(let p=0;p<w*h;p++){if(label[p]>=0||data[p*4+3]<ALPHA_MIN)continue;const id=boxes.length,b={x0:w,y0:h,x1:-1,y1:-1,n:0},stack=[p];label[p]=id;
  while(stack.length){const q=stack.pop()!,x=q%w,y=(q/w)|0;b.n++;if(x<b.x0)b.x0=x;if(x>b.x1)b.x1=x;if(y<b.y0)b.y0=y;if(y>b.y1)b.y1=y;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const r=ny*w+nx;if(label[r]<0&&data[r*4+3]>=ALPHA_MIN){label[r]=id;stack.push(r);}}}
  boxes.push(b);}
 let merged=boxes.slice();let changed=true;
 while(changed){changed=false;outer:for(let i=0;i<merged.length;i++)for(let j=i+1;j<merged.length;j++){const a=merged[i],b=merged[j];
  if(a.x0-gap<=b.x1&&b.x0-gap<=a.x1&&a.y0-gap<=b.y1&&b.y0-gap<=a.y1){merged[i]={x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1),n:a.n+b.n};merged.splice(j,1);changed=true;break outer;}}}
 merged=merged.filter(b=>b.n>=minArea);
 // Linhas: objetos cujo centro vertical cai dentro da faixa do primeiro objeto da linha.
 merged.sort((a,b)=>a.y0-b.y0);const rows:typeof merged[]=[];
 for(const b of merged){const row=rows.find(r=>{const c=(b.y0+b.y1)/2;return c>=r[0].y0&&c<=r[0].y1;});row?row.push(b):rows.push([b]);}
 return rows.flatMap(r=>r.sort((a,b)=>a.x0-b.x0)).map(b=>({x:b.x0,y:b.y0,w:b.x1-b.x0+1,h:b.y1-b.y0+1,count:b.n}));
}
export function sliceAuto(img:Rgba,prefix:string,names:string[]){
 const found=findObjects(img);if(found.length!==names.length)throw Error(`encontrei ${found.length} objetos, mas há ${names.length} nomes; confira a folha`);
 return found.map((box,i)=>{const name=names[i];if(!/^[a-z0-9-]{1,40}$/.test(name))throw Error('nome inválido: '+name);
  return {asset:{id:prefix+'-'+name,file:prefix+'-'+name+'.png',width:box.w,height:box.h,anchor:{x:Math.round(box.w/2),y:box.h},cell:{col:i,row:0},opaqueShare:Number((box.count/(box.w*box.h)).toFixed(3))},png:encodePng(crop(img,box.x,box.y,box.w,box.h))};});
}
if(process.argv[1]?.endsWith('slice-sheet.ts')){
 const [file,prefix,cols,rows,list,dir='public/office/assets']=process.argv.slice(2);
 if(!file||!prefix||!cols||!rows||!list)throw Error('uso: slice-sheet.ts <folha.png> <prefixo> <colunas> <linhas> <nomes,separados> [pasta]');
 // colunas=auto: acha os objetos sozinho (linhas é ignorado).
 const sheet=cleanAlpha(decodePng(readFileSync(file))),pieces=cols==='auto'?sliceAuto(sheet,prefix,list.split(',')):sliceSheet(sheet,prefix,Number(cols),Number(rows),list.split(','));
 // Peças '-lado' (viradas para a direita) ganham a versão '-lado-esq' espelhada.
 for(const p of [...pieces])if(p.asset.id.endsWith('-lado')){const id=p.asset.id+'-esq';pieces.push({asset:{...p.asset,id,file:id+'.png'},png:encodePng(mirror(decodePng(p.png)))});}
 mkdirSync(dir,{recursive:true});for(const p of pieces)writeFileSync(join(dir,p.asset.file),p.png);
 const catalogFile=join(dir,'catalog.json');let catalog:Record<string,SlicedAsset>={};try{catalog=JSON.parse(readFileSync(catalogFile,'utf8'));}catch{}
 for(const p of pieces)catalog[p.asset.id]=p.asset;writeFileSync(catalogFile,JSON.stringify(catalog,null,1)+'\n');
 console.log(pieces.length+' peças recortadas em '+dir+': '+pieces.map(p=>p.asset.id+' '+p.asset.width+'x'+p.asset.height).join(', '));
}
