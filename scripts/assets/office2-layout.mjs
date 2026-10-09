// Autor da planta do Escritório 2.0 (F8). A planta é declarada aqui, numa grade modular, e gravada em scene-map.json.
// Regras (docs/design/OFFICE_2_F8_PLANTA.md): corredores em faixas retas, salas empilhadas com parede compartilhada, paredes
// altas só onde há placa ou tela, divisórias de vidro voltadas para corredor, nada alto nas 2 fileiras atrás de parede alta.
// Uso: node scripts/assets/office2-layout.mjs [--mapa]   (--mapa imprime a planta em texto, sem gravar)
import fs from 'node:fs';
import vm from 'node:vm';
const file='public/office2/scene-map.json',map=JSON.parse(fs.readFileSync(file,'utf8'));
const W=44,H=33;
const keep=Object.fromEntries(map.rooms.map(r=>[r.id,r]));

// ---------- salas: [i0,i1,j0,j1], piso, bordas, portas ----------
// Bordas: parede-painel/parede-marca (alta, maciça), fachada-vidro (alta, externa), divisoria-vidro (48), divisoria-vidro-baixa (30),
// guarda-corpo-vidro (30), divisoria-baixa (24), aberta/ausente (sem parede). i0/j0 são as bordas de trás, i1/j1 as da frente.
const R=(tiles,floor,edges,doors=[])=>({tiles,floor,edges,doors});
const rooms={
 // faixa da frente do prédio (fundo direito): jardim, hall, recepção, elevadores
 'terraco-norte':R([0,12,0,6],'deck',{i0:'guarda-corpo-vidro',j0:'guarda-corpo-vidro'},[['i1',3]]),
 'hall-marca':R([12,21,0,6],'piso-claro',{j0:'parede-marca',i0:'divisoria-vidro-baixa',i1:'divisoria-vidro-baixa'},[['i0',3],['i1',2],['i1',3],['i1',4],['j1',14],['j1',15],['j1',16],['j1',17]]),
 recepcao:R([21,30,0,6],'piso-claro',{j0:'parede-painel',i1:'divisoria-vidro-baixa'},[['i0',2],['i0',3],['i0',4],['i1',2],['i1',3],['i1',4],['j1',24],['j1',25],['j1',26]]),
 elevadores:R([30,44,0,6],'piso-claro',{j0:'parede-painel',i1:'guarda-corpo-vidro'},[['i0',2],['i0',3],['i0',4],['j1',32],['j1',35],['j1',38],['j1',41]]),
 // ala da esquerda: Horizon, Nexus e Ring empilhados, de frente para o corredor V1
 horizon:R([0,12,6,14],'carpete-escuro',{i0:'fachada-vidro',j0:'parede-painel',i1:'divisoria-vidro-baixa'},[['i1',11]]),
 nexus:R([0,12,14,22],'piso-claro',{i0:'fachada-vidro',j0:'parede-painel',i1:'divisoria-vidro-baixa'},[['i1',18]]),
 ring:R([0,12,22,33],'carpete-escuro',{i0:'fachada-vidro',j0:'parede-painel',i1:'divisoria-vidro-baixa',j1:'guarda-corpo-vidro'},[['i1',27]]),
 // linha 1 (j 10–17): convivência, stress lab, auditoria
 convivencia:R([15,23,10,17],'madeira',{j0:'parede-painel',i0:'divisoria-vidro',i1:'divisoria-vidro-baixa',j1:'divisoria-vidro-baixa'},[['j1',19],['i1',16]]),
 'stress-lab':R([26,33,10,17],'piso-tecnico',{j0:'parede-painel',i0:'divisoria-vidro',i1:'divisoria-vidro-baixa',j1:'divisoria-vidro-baixa'},[['i0',15],['j1',29]]),
 auditoria:R([36,44,10,17],'piso-claro',{j0:'parede-painel',i0:'divisoria-vidro',i1:'guarda-corpo-vidro',j1:'divisoria-vidro-baixa'},[['i0',15],['j1',40]]),
 // linha 2 (j 21–27): backtest, risk, diagnóstico
 backtest:R([15,23,21,28],'piso-tecnico',{j0:'parede-painel',i0:'divisoria-vidro',i1:'divisoria-vidro-baixa'},[['i1',23]]),
 risk:R([26,33,21,28],'carpete-escuro',{j0:'parede-painel',i0:'divisoria-vidro',i1:'divisoria-vidro-baixa'},[['i0',24]]),
 diagnostico:R([36,44,21,28],'piso-claro',{j0:'parede-painel',i0:'divisoria-vidro',i1:'guarda-corpo-vidro'},[['i0',25]]),
 // linha 3 (j 27–32, junto da fachada): café, cozinha, varanda
 cafe:R([15,23,28,33],'madeira',{j0:'parede-painel',i0:'divisoria-vidro',i1:'divisoria-vidro-baixa',j1:'guarda-corpo-vidro'},[['i1',30]]),
 cozinha:R([26,33,28,33],'piso-claro',{j0:'parede-painel',i0:'divisoria-vidro',i1:'divisoria-vidro-baixa',j1:'guarda-corpo-vidro'},[['i0',31]]),
 varanda:R([36,44,28,33],'deck',{j0:'guarda-corpo-vidro',i0:'guarda-corpo-vidro',i1:'guarda-corpo-vidro',j1:'guarda-corpo-vidro'},[['i0',31]]),
};

// ---------- telas (j0): de/até em tiles ao longo da parede ----------
const screens={'horizon-a':[1,5],'horizon-b':[7,11],'nexus-grafo':[2,10],'ring-anel':[1,6],'ring-execucao':[7,11],'stress-placar':[27,32],'backtest-estudos':[16,22],'risk-limites':[27,32],'auditoria-fichas':[37,43],'diagnostico-linha':[37,43]};

// ---------- móveis: [asset, i, j, a, b, h, opções] ----------
const props=[];
function room(id,items){for(const [asset,i,j,a,b,h,opt] of items)props.push({asset,room:id,tile:{i,j},footprint:{a,b},h,...(opt??{})});}
const NB={blocking:false},FLIP={flip:true};
room('terraco-norte',[
 ['jardineira-capim',1,0,4,1,26],['jardineira-capim',7,0,4,1,26],['jardineira-capim',0,1,1,2,26],
 ['sofa-externo',4,1,4,2,26],['poltrona-externa',8,1,2,2,26],['planta-alta',11,0,1,1,50]]);
room('hall-marca',[
 ['tapete',14,2,7,3,2,NB],['banco-espera',14,0,3,1,16],['banco-espera',17,0,3,1,16],['planta-alta',12,0,1,1,50],['ficus',20,0,1,1,54],
 ['totem-logo',16,3,1,1,56],['luminaria-chao',13,4,1,1,52],['planta-baixa',19,4,1,1,24]]);
room('recepcao',[
 ['balcao-recepcao',23,2,5,3,32,FLIP],['cadeira-costas',25,1,1,1,26],['ficus',21,0,1,1,54],['planta-alta',29,0,1,1,50],['planta-baixa',22,5,1,1,24],['planta-baixa',28,5,1,1,24]]);
room('elevadores',[
 ['parede-elevadores',33,0,8,1,74],['catraca',33,3,2,2,30],['catraca',36,3,2,2,30],['catraca',39,3,2,2,30],
 ['planta-alta',31,0,1,1,50],['ficus',43,0,1,1,54],['planta-baixa',42,5,1,1,24],['planta-baixa',30,5,1,1,24]]);
room('horizon',[
 ['estacao-2-monitores',1,8,3,2,36],['estacao-2-monitores',5,8,3,2,36],['estacao-2-monitores',9,8,3,2,36],
 ['armario-baixo',0,6,2,1,22],['ficus',11,6,1,1,54],['planta-alta',0,10,1,1,50],['espada',11,10,1,1,38]]);
room('nexus',[
 ['mesa-reuniao',3,15,7,4,30],['armario-baixo',1,14,2,1,22],['armario-baixo',9,14,2,1,22],['planta-alta',0,14,1,1,50],['ficus',11,14,1,1,54],['planta-baixa',1,18,1,1,24],['samambaia',10,18,1,1,32]]);
room('ring',[
 ['mesa-curva-operacoes',1,25,5,3,40],['mesa-curva-media',7,25,4,3,40],['mesa-monitores',1,30,4,2,36],
 ['totem-logo',11,25,1,1,56],['jardineira',6,32,4,1,30],['planta-alta',11,29,1,1,50],['ficus',0,32,1,1,54],['espada',6,22,1,1,38],['poltrona',8,30,2,2,28],['samambaia',11,22,1,1,32]]);
room('convivencia',[
 ['tapete',15,11,8,5,2,NB],['jardineira',17,10,4,1,30],['sofa',17,11,4,2,28],['mesa-centro',18,14,3,2,12],['poltrona',15,13,2,2,28],['poltrona',21,13,2,2,28],
 ['luminaria-chao',22,11,1,1,52],['planta-alta',15,10,1,1,50],['planta-baixa',22,10,1,1,24]]);
room('stress-lab',[
 ['esteira',27,11,2,2,32],['saco-pancada',31,11,1,1,56],['rack-halteres',27,14,2,1,28],['bancada-teste',30,14,2,1,30],['espada',32,10,1,1,38],['planta-baixa',26,10,1,1,24]]);
room('auditoria',[
 ['armarios-arquivo',37,11,4,2,48],['lockers',37,14,3,2,46],['rack-servidor',43,11,1,1,56],['planta-baixa',36,10,1,1,24],['espada',43,16,1,1,38],['estante-arquivo',41,14,1,2,50],['estante-arquivo',42,14,1,2,50]]);
room('backtest',[
 ['estacao-2-monitores',17,22,3,2,36],['armario-baixo',21,22,1,2,24],['planta-baixa',15,21,1,1,24],['espada',22,21,1,1,38],['planta-alta',15,24,1,1,50]]);
room('risk',[
 ['estacao-madeira',27,22,4,2,36],['estante-arquivo',32,22,1,2,50],['ficus',26,21,1,1,54],['espada',32,21,1,1,38]]);
room('diagnostico',[
 ['mesa-reuniao-6',38,21,4,4,30],['planta-baixa',36,21,1,1,24],['espada',43,21,1,1,38]]);
room('cafe',[
 ['mesa-cafe-4',18,29,3,3,28],['samambaia',15,28,1,1,32],['sofa-cinza',15,31,3,1,28],['planta-baixa',22,32,1,1,24]]);
room('cozinha',[
 ['bancada-cozinha',27,28,4,2,40],['banqueta',27,30,1,1,22],['banqueta',29,30,1,1,22],['geladeira',32,28,1,2,52],['planta-baixa',26,32,1,1,24]]);
room('varanda',[
 ['jardineira-capim',36,28,4,1,26],['jardineira-capim',40,28,4,1,26],['sofa-externo',37,29,4,2,26],['poltrona-externa',41,29,2,2,26],['mesa-externa',38,31,2,1,12],['planta-alta',43,29,1,1,50]]);
// plantas soltas nos corredores (fileira de trás das faixas H, fora das portas)
for(const [i,j,a] of [[13,6,'planta-alta'],[19,6,'planta-baixa'],[22,6,'planta-alta'],[28,6,'planta-baixa'],[43,6,'planta-alta'],[34,6,'planta-baixa'],[13,17,'planta-alta'],[24,17,'planta-baixa'],[34,17,'planta-alta'],[43,17,'planta-baixa'],[13,32,'planta-alta'],[24,32,'planta-baixa'],[34,32,'planta-baixa']])
 props.push({asset:a,tile:{i,j},footprint:{a:1,b:1},h:a==='planta-alta'?50:24});

// ---------- pontos: postos de trabalho, lazer e chegada ----------
const homes={satoshi:['horizon',2,10],oracle:['horizon',6,10],vega:['horizon',10,10],nova:['ring',3,28],flux:['ring',9,28],atlas:['ring',3,32],euler:['backtest',18,24],sentinel:['risk',28,24]};
const leisure=[['sofa-1','convivencia',18,13],['sofa-2','convivencia',20,13],['cafe-1','cafe',17,30],['cafe-2','cafe',21,30],['copa-1','cozinha',28,31],['copa-2','cozinha',30,31],['varanda-1','varanda',37,31],['varanda-2','varanda',42,31]];
const points=[
 ...Object.entries(homes).map(([agent,[r,i,j]])=>({id:agent,room:r,tile:{i,j},kind:'WORK',agent,facing:'NE'})),
 ...leisure.map(([id,r,i,j])=>({id,room:r,tile:{i,j},kind:'IDLE'})),
 {id:'chegada',room:'elevadores',tile:{i:36,j:2},kind:'SPAWN'}];

// ---------- monta o mapa ----------
map.version='OFFICE2_SCENE_MAP_V3';
map.status='PLANTA MODULAR F8: corredores retos, salas empilhadas, divisórias de vidro e mobiliário alinhado';
map.note='i cresce para baixo-direita; j cresce para baixo-esquerda. Fundo direito (j0): jardim, hall, recepção e elevadores; fundo esquerdo (i0): Horizon, Nexus e Ring. Corredores: V1 (i 12–15), V2 (i 23–26), V3 (i 33–36), H1 (j 6–10), H2 (j 17–21). Retângulos semiabertos [i0,i1) × [j0,j1). Telas ficam na parede j0, entre os tiles from e to.';
map.grid={i:W,j:H};
map.projection.origin={x:840,y:112};map.projection.scene={w:1920,h:1056};
map.rooms=map.rooms.map(r=>{const c=rooms[r.id];if(!c)throw Error('sala sem planta: '+r.id);
 const [i0,i1,j0,j1]=c.tiles,out={...r,tiles:{i0,i1,j0,j1},floor:c.floor,edges:c.edges,doors:c.doors.map(([side,at])=>({side,at}))};
 if(r.subzones)out.subzones=r.subzones.map((s,k)=>({...s,tiles:{i0:k?7:0,i1:k?12:7,j0:22,j1:32}}));
 if(r.id==='terraco-norte')out.label='Jardim externo';
 return out;});
for(const id of Object.keys(rooms))if(!keep[id])throw Error('sala nova sem metadados: '+id);
map.screens=map.screens.map(s=>{const t=screens[s.id];if(!t)throw Error('tela sem posição: '+s.id);return {...s,wall:'j0',tiles:{from:t[0],to:t[1]}};});
map.props=props;
map.points=points;
// um posto de trabalho enfrenta a mesa (ou estação) logo à frente
for(const p of map.points)if(p.kind==='SPAWN')p.facing=undefined;

// ---------- validação ----------
const context=vm.createContext({});vm.runInContext(fs.readFileSync('public/office2/iso.js','utf8'),context);
const iso=context.Office2Iso.create(map),errors=[],roomById=new Map(map.rooms.map(r=>[r.id,r]));
const at=(i,j)=>iso.roomAt(i,j)?.id??null;
for(const r of map.rooms){const t=r.tiles;if(t.i0<0||t.j0<0||t.i1>W||t.j1>H)errors.push('sala fora da planta: '+r.id);}
const doorTiles=iso.doors.flatMap(d=>[d.inner,d.outer]),taken=new Map();
for(const p of props){
 for(let i=p.tile.i;i<p.tile.i+p.footprint.a;i++)for(let j=p.tile.j;j<p.tile.j+p.footprint.b;j++){
  if(i<0||j<0||i>=W||j>=H){errors.push('fora da planta: '+p.asset);continue;}
  if((at(i,j)??undefined)!==p.room&&p.room)errors.push(`${p.asset} (${i},${j}) fora de ${p.room}, está em ${at(i,j)}`);
  if(!p.room&&at(i,j))errors.push(`${p.asset} (${i},${j}) de corredor dentro de ${at(i,j)}`);
  if(p.blocking===false)continue;
  const k=i+','+j;if(taken.has(k))errors.push(`sobreposição ${p.asset} × ${taken.get(k)} em ${k}`);taken.set(k,p.asset);
  if(doorTiles.some(d=>d.i===i&&d.j===j))errors.push(`${p.asset} tapa porta em ${k}`);
  if(map.points.some(d=>d.tile.i===i&&d.tile.j===j))errors.push(`${p.asset} sobre ponto em ${k}`);
 }
 if(!p.room&&p.blocking!==false)p.room=undefined;
}
for(const p of map.points)if(!iso.walkable(p.tile.i,p.tile.j))errors.push('ponto bloqueado: '+p.id);
for(const p of map.points.filter(p=>p.kind==='WORK')){const d=context.Office2Iso.DIRS[p.facing],i=p.tile.i+d.di,j=p.tile.j+d.dj;
 if(!props.some(q=>q.room===p.room&&/^(mesa-|estacao-)/.test(q.asset)&&i>=q.tile.i&&i<q.tile.i+q.footprint.a&&j>=q.tile.j&&j<q.tile.j+q.footprint.b))errors.push('sem mesa diante de '+p.id);}
const spawn=map.points.find(p=>p.kind==='SPAWN').tile;
for(const p of map.points)if(p.kind!=='SPAWN'&&!iso.plan(spawn,p.tile).length)errors.push('sem rota até '+p.id);
for(const r of map.rooms){const t=r.tiles;let free=0;for(let i=t.i0;i<t.i1;i++)for(let j=t.j0;j<t.j1;j++)if(iso.walkable(i,j))free++;if(free<(t.i1-t.i0)*(t.j1-t.j0)*0.35)errors.push('sala apertada: '+r.id+' ('+free+' tiles livres)');}
// fileiras atrás de parede alta (sombra): nada alto ali
const tallBehind=[];
for(const r of map.rooms){const t=r.tiles,e=r.edges;if(e.j0&&/parede/.test(e.j0))tallBehind.push({axis:'j',line:t.j0,from:t.i0,to:t.i1,room:r.id});}
for(const w of tallBehind)for(const p of props.filter(p=>p.blocking!==false)){
 if(!(p.tile.i<w.to&&p.tile.i+p.footprint.a>w.from)||p.tile.j+p.footprint.b>w.line)continue;
 const d=w.line-(p.tile.j+p.footprint.b-1+0.75),hidden=Math.max(0,72-24*d);
 if(d<3.2&&p.h-hidden<0.65*p.h)errors.push(`${p.asset} (${p.tile.i},${p.tile.j}) fica atrás da parede alta de ${w.room} (d=${d.toFixed(2)}, h=${p.h})`);}

if(process.argv.includes('--mapa')||errors.length){
 const grid=Array.from({length:H},()=>Array(W).fill(' '));
 for(const r of map.rooms){const t=r.tiles,ch=r.id[0].toUpperCase();for(let i=t.i0;i<t.i1;i++)for(let j=t.j0;j<t.j1;j++)grid[j][i]=(r.floor==='deck'?'.':' ');}
 for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(!at(i,j))grid[j][i]=':';
 for(const p of props){const ch=p.blocking===false?'~':p.asset.startsWith('planta')||['ficus','espada','samambaia','jardineira','jardineira-capim'].includes(p.asset)?'*':'#';
  for(let i=p.tile.i;i<p.tile.i+p.footprint.a;i++)for(let j=p.tile.j;j<p.tile.j+p.footprint.b;j++)if(grid[j]?.[i]!==undefined&&(ch!=='~'||grid[j][i]===' '||grid[j][i]==='.'))grid[j][i]=ch;}
 for(const d of iso.doors){grid[d.inner.j][d.inner.i]='D';}
 for(const p of map.points)grid[p.tile.j][p.tile.i]=p.kind==='WORK'?'A':p.kind==='SPAWN'?'S':'o';
 // contorno: letra da sala nos cantos
 for(const r of map.rooms){const t=r.tiles;grid[t.j0][t.i0]=grid[t.j0][t.i0]==='#'||grid[t.j0][t.i0]==='*'?grid[t.j0][t.i0]:r.id[0].toUpperCase();}
 console.log('    '+Array.from({length:W},(_,i)=>i%10).join(''));
 grid.forEach((row,j)=>console.log(String(j).padStart(3)+' '+row.join('')));
}
if(errors.length){console.error('\n'+errors.length+' problemas:\n - '+errors.join('\n - '));process.exit(1);}
if(!process.argv.includes('--mapa')){fs.writeFileSync(file,JSON.stringify(map,null,1)+'\n');console.log(`${props.length} peças; ${W}×${H} tiles; ${map.rooms.length} salas; todos os destinos acessíveis`);}
