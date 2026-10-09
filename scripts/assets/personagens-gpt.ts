// Normaliza as folhas 2×6 do ChatGPT; recorta cada pose e ancora os pés na base da célula.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodePng,encodePng,type Rgba} from './png.js';
import {removeKey,objectsOf,cropMasked,resize} from './arte-gemini.js';

export const CHARACTER_IDS=['atlas','euler','flux','nova','oracle','satoshi','sentinel','vega'] as const;
export const CHARACTER_FRAMES={cell:{w:192,h:256},standingHeight:240,ids:[...CHARACTER_IDS]};
export function normalizeCharacter(source:Rgba,id:string):Rgba{
 const keyed=removeKey(source,id==='oracle'?[0,255,0]:[255,0,255],110,true);
 const {label,boxes}=objectsOf(keyed);
 const rows=[boxes.filter(b=>b.y+b.h/2<source.height/2),boxes.filter(b=>b.y+b.h/2>=source.height/2)];
 if(boxes.length!==12||rows.some(r=>r.length!==6))throw Error(`${id}: achei ${boxes.length} objetos (${rows.map(r=>r.length).join('+')}); esperado 12 em 2 linhas de 6`);
 rows.forEach(row=>row.sort((a,b)=>a.x-b.x));
 const {w:cw,h:ch}=CHARACTER_FRAMES.cell,width=cw*6,height=ch*2,data=new Uint8Array(width*height*4);
 const scale=CHARACTER_FRAMES.standingHeight/rows[0][0].h;
 rows.forEach((row,r)=>row.forEach((box,c)=>{
  const w=Math.round(box.w*scale),h=Math.round(box.h*scale);
  if(w>cw||h>ch)throw Error(`${id}: pose ${r},${c} excede a célula (${w}×${h})`);
  const part=resize(cropMasked(keyed,label,box),w,h),x=c*cw+Math.floor((cw-w)/2),y=(r+1)*ch-h;
  for(let yy=0;yy<h;yy++)data.set(part.data.subarray(yy*w*4,(yy+1)*w*4),((y+yy)*width+x)*4);
 }));
 return {width,height,data};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [src,out='public/office2/art/personagens']=process.argv.slice(2);
 if(!src)throw Error('uso: personagens-gpt.ts <pasta-das-folhas> [pasta-de-saída]');
 // Valida todas antes de gravar para não deixar metade dos personagens atualizada.
 const normalized=CHARACTER_IDS.map(id=>[id,normalizeCharacter(decodePng(readFileSync(join(src,`personagem-${id}.png`))),id)] as const);
 mkdirSync(out,{recursive:true});
 for(const [id,img] of normalized)writeFileSync(join(out,id+'.png'),encodePng(img));
 writeFileSync(join(out,'quadros.json'),JSON.stringify(CHARACTER_FRAMES,null,1)+'\n');
 console.log('8 personagens, 12 poses cada, células de 192×256 com pés alinhados');
}
