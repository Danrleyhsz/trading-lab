// Leitura e escrita de PNG RGBA 8 bits sem dependências (zlib do Node), só para as ferramentas de assets.
// Aceita PNG não entrelaçado, 8 bits, tipos de cor RGBA (6), RGB (2) e paleta (3, com tRNS opcional).
import {inflateSync,deflateSync} from 'node:zlib';

export interface Rgba {width:number;height:number;data:Uint8Array}
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(buf:Uint8Array){let c=0xffffffff;for(const b of buf)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}

export function decodePng(file:Uint8Array):Rgba{
 const buf=Buffer.from(file);if(!buf.subarray(0,8).equals(SIGNATURE))throw Error('não é PNG');
 let pos=8,width=0,height=0,depth=0,type=0,interlace=0;const idat:Buffer[]=[];let palette:Buffer|null=null,trns:Buffer|null=null;
 while(pos<buf.length){const len=buf.readUInt32BE(pos),kind=buf.toString('latin1',pos+4,pos+8),body=buf.subarray(pos+8,pos+8+len);pos+=12+len;
  if(kind==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);depth=body[8];type=body[9];interlace=body[12];}
  else if(kind==='PLTE')palette=body;else if(kind==='tRNS')trns=body;else if(kind==='IDAT')idat.push(body);else if(kind==='IEND')break;}
 if(depth!==8||interlace!==0||![2,3,6].includes(type))throw Error('PNG não suportado (use RGBA 8 bits, sem entrelaçamento)');
 const channels=type===6?4:type===2?3:1,stride=width*channels,raw=inflateSync(Buffer.concat(idat)),out=new Uint8Array(width*height*4);
 let prev=new Uint8Array(stride);
 for(let y=0;y<height;y++){const f=raw[y*(stride+1)],line=new Uint8Array(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
  for(let i=0;i<stride;i++){const a=i>=channels?line[i-channels]:0,b=prev[i],c=i>=channels?prev[i-channels]:0;
   const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
   line[i]=(line[i]+(f===1?a:f===2?b:f===3?(a+b)>>1:f===4?(pa<=pb&&pa<=pc?a:pb<=pc?b:c):0))&255;}
  for(let x=0;x<width;x++){const o=(y*width+x)*4;
   if(type===6){out.set(line.subarray(x*4,x*4+4),o);}
   else if(type===2){out.set(line.subarray(x*3,x*3+3),o);out[o+3]=255;}
   else{const idx=line[x];out[o]=palette![idx*3];out[o+1]=palette![idx*3+1];out[o+2]=palette![idx*3+2];out[o+3]=trns&&idx<trns.length?trns[idx]:255;}}
  prev=line;}
 return {width,height,data:out};
}
export function encodePng(img:Rgba):Buffer{
 const stride=img.width*4,raw=Buffer.alloc((stride+1)*img.height);
 for(let y=0;y<img.height;y++){raw[y*(stride+1)]=0;Buffer.from(img.data.buffer,img.data.byteOffset+y*stride,stride).copy(raw,y*(stride+1)+1);}
 const chunk=(kind:string,body:Buffer)=>{const head=Buffer.alloc(8);head.writeUInt32BE(body.length,0);head.write(kind,4,'latin1');const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4),body])),0);return Buffer.concat([head,body,crc]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(img.width,0);ihdr.writeUInt32BE(img.height,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([SIGNATURE,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
export function crop(img:Rgba,x:number,y:number,w:number,h:number):Rgba{
 const data=new Uint8Array(w*h*4);for(let r=0;r<h;r++)data.set(img.data.subarray(((y+r)*img.width+x)*4,((y+r)*img.width+x+w)*4),r*w*4);return {width:w,height:h,data};
}
/** Espelha na horizontal (gera o lado esquerdo de uma peça desenhada virada para a direita). */
export function mirror(img:Rgba):Rgba{
 const data=new Uint8Array(img.data.length);for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const s=(y*img.width+x)*4,d=(y*img.width+(img.width-1-x))*4;data.set(img.data.subarray(s,s+4),d);}return {width:img.width,height:img.height,data};
}
