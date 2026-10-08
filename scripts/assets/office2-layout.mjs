// Planta ampliada: composição da referência, com circulação entre os conjuntos de móveis.
import fs from 'node:fs';
import vm from 'node:vm';
const file='public/office2/scene-map.json',map=JSON.parse(fs.readFileSync(file,'utf8'));
const configs={
 'terraco-norte':[0,12,0,2,[]],
 horizon:[0,12,2,9,[['i1',6],['j0',6]]],
 nexus:[0,12,10,18,[['i1',14]]],
 ring:[0,14,19,30,[['i1',25]]],
 'hall-marca':[12,19,0,5,[['j1',15]]],
 recepcao:[19,28,0,5,[['j1',23]]],
 elevadores:[28,40,0,7,[['j1',33]]],
 convivencia:[15,23,7,15,[['i0',11]]],
 backtest:[15,23,16,22,[['i1',19]]],
 'stress-lab':[25,32,7,14,[['i0',11]]],
 risk:[25,32,16,23,[['i0',19]]],
 auditoria:[34,40,8,14,[['i0',11]]],
 diagnostico:[34,40,16,23,[['i0',19]]],
 cozinha:[25,32,25,30,[['i0',27]]],
 cafe:[17,23,25,30,[['i0',27]]],
 varanda:[34,40,25,30,[['i0',27]]],
};
map.grid={i:40,j:30};
map.projection.origin={x:816,y:112};map.projection.scene={w:1920,h:1056};
map.version='OFFICE2_SCENE_MAP_V2';map.status='PLANTA AMPLIADA: referência aprovada, circulação e mobiliário calibrado';
map.note='i cresce para baixo-direita (fundo direito: hall, recepção, elevadores); j cresce para baixo-esquerda (fachada esquerda: Horizon, Nexus, Ring). Tiles fora das salas são circulação andável. Retângulos semiabertos [i0,i1) × [j0,j1). Telas ficam na parede indicada (j0 ou i0), entre os tiles from e to, sem atravessar portas.';
for(const r of map.rooms){const [i0,i1,j0,j1,doors]=configs[r.id];r.tiles={i0,i1,j0,j1};r.doors=doors.map(([side,at])=>({side,at}));
 if(r.subzones)r.subzones.forEach((s,k)=>{s.tiles={i0:k?7:0,i1:k?14:7,j0:19,j1:30};});
 if(['cafe','cozinha','varanda'].includes(r.id))r.edges.j1='guarda-corpo-vidro';
 // Portas e frentes livres; paredes de identificação ficam só atrás das áreas.
 if(r.id==='convivencia')r.edges={j0:'parede-painel',i1:'divisoria-vidro'};
 if(r.id==='backtest')r.edges={i0:'parede-painel',j0:'aberta',i1:'divisoria-vidro'};
 if(r.id==='stress-lab')r.edges={i0:'parede-painel',j0:'aberta'};
 if(r.id==='auditoria'||r.id==='diagnostico')r.edges={j0:'parede-painel',i1:'fachada-vidro'};
 if(r.id==='cafe')r.edges={j0:'parede-painel',j1:'guarda-corpo-vidro'};
}
const spans={horizon:[[0,5],[7,12]],ring:[[0,7],[7,14]],nexus:[[1,11]],backtest:[[16,22]],'stress-lab':[[25,32]],risk:[[25,32]],auditoria:[[34,40]],diagnostico:[[34,40]]};
const count={};for(const s of map.screens){const k=count[s.room]??0;count[s.room]=k+1;const [from,to]=spans[s.room][k];s.tiles={from,to};if(s.room==='backtest'){s.wall='i0';s.tiles={from:16,to:22};}if(s.room==='stress-lab'){s.wall='i0';s.tiles={from:7,to:11};}}
const props=[];
function room(id,items){for(const [asset,i,j,a,b,h,blocking] of items)props.push({asset,room:id,tile:{i,j},footprint:{a,b},h,...(blocking===false?{blocking:false}:{})});}
room('horizon',[
 ['estacao-2-monitores',1,4,3,2,36],['estacao-2-monitores',5,4,3,2,36],['estacao-2-monitores',9,4,3,2,36],
 ['armario-baixo',1,7,2,1,22],['ficus',0,2,1,1,54],['planta-alta',11,2,1,1,50],['espada',10,8,1,1,38]]);
room('nexus',[
 ['mesa-reuniao',2,13,7,4,30],['aparador',3,11,4,2,24],['planta-alta',1,11,1,1,50],['ficus',10,11,1,1,54]]);
room('ring',[
 ['mesa-curva-operacoes',1,21,5,3,40],['mesa-curva-media',8,21,4,3,40],['mesa-monitores',1,26,4,2,36],
 ['totem-logo',12,20,1,1,56],['jardineira',1,29,4,1,30],['planta-alta',10,29,1,1,50],['ficus',13,29,1,1,54],['espada',7,20,1,1,38]]);
room('hall-marca',[
 ['banco-espera',14,2,3,1,16],['planta-alta',12,1,1,1,50],['planta-baixa',18,1,1,1,24]]);
room('recepcao',[
 ['balcao-recepcao',21,1,5,3,32],['cadeira-costas',24,0,1,1,26],['ficus',19,1,1,1,54],['planta-alta',27,1,1,1,50]]);
room('elevadores',[
 ['parede-elevadores',30,0,8,1,74],['catraca',29,4,2,2,30],['catraca',32,4,2,2,30],['catraca',35,4,2,2,30],
 ['planta-alta',28,1,1,1,50],['ficus',39,1,1,1,54]]);
room('convivencia',[
 ['tapete',15,8,8,6,2,false],['jardineira',17,7,4,1,30],['sofa',17,9,4,2,28],
 ['mesa-centro',18,12,3,2,12],['poltrona',15,12,2,2,28],['poltrona',21,12,2,2,28],['luminaria-chao',22,8,1,1,52]]);
room('backtest',[
 ['estacao-2-monitores',17,17,3,2,36],['armario-baixo',21,17,1,2,24],['planta-baixa',15,17,1,1,24],['espada',22,21,1,1,38]]);
room('stress-lab',[
 ['esteira',26,9,2,2,32],['saco-pancada',30,9,1,1,56],['rack-halteres',26,12,2,1,28],['bancada-teste',29,12,2,1,30],['espada',31,7,1,1,38]]);
room('risk',[
 ['estacao-madeira',26,18,4,2,36],['estante-arquivo',30,17,1,2,50],['ficus',25,22,1,1,54],['espada',31,22,1,1,38]]);
room('auditoria',[
 ['armarios-arquivo',35,9,4,2,48],['lockers',35,12,3,2,46],['rack-servidor',39,11,1,1,56]]);
room('diagnostico',[
 ['mesa-reuniao-6',35,18,4,4,30],['planta-baixa',34,17,1,1,24],['espada',39,22,1,1,38]]);
room('cozinha',[
 ['bancada-cozinha',26,25,4,2,40],['banqueta',26,28,1,1,22],['banqueta',28,28,1,1,22],['geladeira',31,25,1,2,52]]);
room('cafe',[
 ['mesa-cafe-4',19,26,3,3,28],['samambaia',17,29,1,1,32]]);
room('varanda',[
 ['sofa-externo',34,25,4,2,26],['poltrona-externa',38,25,2,2,26],['mesa-externa',36,28,2,2,12],['jardineira-capim',34,29,2,1,26],['jardineira-capim',38,29,2,1,26]]);
room('terraco-norte',[
 ['jardineira-capim',0,0,4,1,26],['jardineira-capim',8,0,4,1,26]]);
for(const [i,j] of [[13,8],[24,7],[24,15],[33,8],[16,24],[24,24],[33,24]])props.push({asset:'planta-baixa',tile:{i,j},footprint:{a:1,b:1},h:24});
map.props=props;
for(const p of props)if(p.asset==='poltrona'&&p.tile.i===21)p.flip=true;
for(const p of props)if(p.asset==='balcao-recepcao')p.flip=true;
const homes={satoshi:[3,6],oracle:[6,6],vega:[9,6],nova:[3,24],flux:[9,24],atlas:[3,28],euler:[18,19],sentinel:[27,20]};
const leisure=[[18,11],[20,11],[18,27],[22,28],[27,27],[29,27],[35,28],[39,28]];
let n=0;for(const p of map.points){if(p.agent){const [i,j]=homes[p.agent];p.tile={i,j};p.facing='NE';}
 else if(p.kind==='SPAWN'){p.tile={i:32,j:3};}
 else{const [i,j]=leisure[n++];p.tile={i,j};const owner=map.rooms.find(r=>i>=r.tiles.i0&&i<r.tiles.i1&&j>=r.tiles.j0&&j<r.tiles.j1);p.room=owner.id;}}
const context=vm.createContext({});vm.runInContext(fs.readFileSync('public/office2/iso.js','utf8'),context);
const iso=context.Office2Iso.create(map),spawn=map.points.find(p=>p.kind==='SPAWN').tile,doors=iso.doors.flatMap(d=>[d.inner,d.outer]),taken=new Set();
for(const p of props)for(let i=p.tile.i;i<p.tile.i+p.footprint.a;i++)for(let j=p.tile.j;j<p.tile.j+p.footprint.b;j++){
 const owner=iso.roomAt(i,j);if((owner?.id??undefined)!==p.room)throw Error('fora da sala: '+p.asset);
 if(p.blocking===false)continue;
 const k=i+','+j;if(taken.has(k)||doors.some(d=>d.i===i&&d.j===j)||map.points.some(d=>d.tile.i===i&&d.tile.j===j))throw Error('sobreposição: '+p.asset+' '+k);taken.add(k);
}
for(const p of map.points)if(p.kind!=='SPAWN'&&!iso.plan(spawn,p.tile).length)throw Error('sem rota: '+p.id);
fs.writeFileSync(file,JSON.stringify(map,null,1)+'\n');console.log(`${props.length} peças; 40×30 tiles; todos os destinos acessíveis`);
