import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodePng,encodePng,mirror} from '../scripts/assets/png.js';
import {sliceSheet,findObjects,sliceAuto,cleanAlpha} from '../scripts/assets/slice-sheet.js';

test('PNG: ida e volta sem perda, e lê os PNGs reais do escritório',()=>{
 const img={width:3,height:2,data:new Uint8Array([255,0,0,255, 0,255,0,128, 0,0,255,0, 10,20,30,40, 50,60,70,80, 90,100,110,120])};
 const back=decodePng(encodePng(img));assert.equal(back.width,3);assert.deepEqual([...back.data],[...img.data]);
 const sheet=decodePng(readFileSync('public/office/characters/atlas.png'));assert.equal(sheet.width,768);assert.equal(sheet.height,512);
 assert.ok(sheet.data.some((v,i)=>i%4===3&&v===0)&&sheet.data.some((v,i)=>i%4===3&&v===255),'folha de personagem tem transparência e pixels opacos');
});

test('recorte de folha: cada célula vira uma peça aparada com ponto de apoio no chão; fundo opaco é recusado',()=>{
 // Folha 2×2 de 64 px: dois objetos, uma célula vazia e uma sem nome.
 const w=128,h=128,data=new Uint8Array(w*h*4);const paint=(x0:number,y0:number,x1:number,y1:number)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)data.set([200,120,60,255],(y*w+x)*4);};
 paint(10,20,40,60);paint(64+5,8,64+59,30);
 const pieces=sliceSheet({width:w,height:h,data},'moveis',2,2,['mesa','quadro','vazio']);
 assert.deepEqual(pieces.map(p=>p.asset.id),['moveis-mesa','moveis-quadro'],'célula vazia é pulada');
 const mesa=pieces[0].asset;assert.equal(mesa.width,30);assert.equal(mesa.height,40);assert.deepEqual(mesa.anchor,{x:15,y:40});
 assert.equal(decodePng(pieces[1].png).width,54);
 const opaque=new Uint8Array(64*64*4).fill(255);assert.throws(()=>sliceSheet({width:64,height:64,data:opaque},'x',1,1,['fundo']),/sem fundo transparente/);
 assert.throws(()=>sliceSheet({width:100,height:64,data:new Uint8Array(100*64*4)},'x',3,1,['a']),/divisíveis/);
});

test('modo automático: acha objetos fora da grade, junta partes soltas e ordena em linhas',()=>{
 const w=200,h=120,data=new Uint8Array(w*h*4);const paint=(x0:number,y0:number,x1:number,y1:number)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)data.set([90,160,80,255],(y*w+x)*4);};
 paint(120,10,150,40);paint(10,12,40,50);paint(42,14,46,20);// planta com uma folha solta a 2 px
 paint(60,70,110,110);
 const found=findObjects({width:w,height:h,data});assert.equal(found.length,3,'a folha solta junta-se à planta');
 assert.deepEqual(found.map((b:any)=>b.x),[10,120,60],'linha de cima da esquerda para a direita, depois a de baixo');
 assert.throws(()=>sliceAuto({width:w,height:h,data},'p',['a','b']),/encontrei 3 objetos/);
 assert.deepEqual(sliceAuto({width:w,height:h,data},'p',['planta','quadro','sofa']).map((p:any)=>p.asset.id),['p-planta','p-quadro','p-sofa']);
});

test('limpeza de alfa: halo fraco some e o objeto fica 100% opaco (borda dura de pixel art)',()=>{
 const img={width:3,height:1,data:new Uint8Array([10,20,30,20, 200,100,50,180, 1,2,3,254])};
 const out=cleanAlpha(img);assert.deepEqual([...out.data],[0,0,0,0, 200,100,50,255, 1,2,3,255]);assert.equal(img.data[3],20,'não altera a original');
});

test('espelho: o lado esquerdo é o direito invertido na horizontal',()=>{
 const img={width:2,height:1,data:new Uint8Array([1,2,3,255, 9,8,7,128])};
 assert.deepEqual([...mirror(img).data],[9,8,7,128, 1,2,3,255]);
});
