import {readFileSync,writeFileSync} from 'node:fs';
import {decodePng} from './png.js';
// Mede os contatos inferiores da silhueta, em vez de assumir que o centro da imagem é o apoio.
// A caixa em coordenadas do piso permite conter os pés dentro da ocupação declarada no mapa.
const manifest=JSON.parse(readFileSync('public/office2/art/manifesto.json','utf8'));
const supports:Record<string,unknown>={};
for(const [name,info] of Object.entries<any>(manifest.props)){
 const img=decodePng(readFileSync('public/office2/art/'+info.file)),points:number[][]=[];
 for(let x=0;x<img.width;x++)for(let y=img.height-1;y>=img.height*.68;y--){
  if(img.data[(y*img.width+x)*4+3]>=160){points.push([x+.5,y+1]);break;}
 }
 if(points.length<3)throw Error('apoio insuficiente: '+name);
 const is=points.map(([x,y])=>x/48+y/24),js=points.map(([x,y])=>y/24-x/48);
 const i0=Math.min(...is),i1=Math.max(...is),j0=Math.min(...js),j1=Math.max(...js);
 supports[name]={i0,i1,j0,j1,cx:((i0+i1)-(j0+j1))*12,cy:((i0+i1)+(j0+j1))*6,contacts:points};
}
writeFileSync('public/office2/art/apoios.json',JSON.stringify({version:1,tile:{w:48,h:24},supports})+'\n');
console.log(Object.keys(supports).length+' apoios calibrados');
