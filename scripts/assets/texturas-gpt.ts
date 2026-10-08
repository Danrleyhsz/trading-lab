// Prepara as texturas em 512×512 por média de área e preserva a cidade em PNG separado.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';
import {decodePng,encodePng} from './png.js';
import {resize} from './arte-gemini.js';
const [src,out='public/office2/art']=process.argv.slice(2);
if(!src)throw Error('uso: texturas-gpt.ts <pasta-das-folhas> [pasta-de-saída]');
mkdirSync(join(out,'texturas'),{recursive:true});
for(const name of ['piso-marmore','piso-madeira','carpete','deck','parede-ripada','parede-escura']){
 const img=decodePng(readFileSync(join(src,'textura-'+name+'.png')));
 writeFileSync(join(out,'texturas',name+'.png'),encodePng(resize(img,512,512)));
}
copyFileSync(join(src,'cidade-noite.png'),join(out,'cidade-noite.png'));
console.log('6 texturas de 512×512 e cidade em PNG');
