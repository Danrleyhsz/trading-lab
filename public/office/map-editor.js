// Editor do mapa do escritório (modo avançado, em Config). Pinta células andáveis sobre a arte, move cadeiras e
// destinos, verifica se toda cadeira alcança todo destino e salva no navegador ou exporta em JSON.
// Enquanto o editor está aberto, os personagens ficam parados. Nada vai para o servidor.
(() => {
 const D=globalThis.document;if(!D||!globalThis.OfficeMap)return;
 const $=s=>D.querySelector(s),M=globalThis.OfficeMap,L=globalThis.OfficeLayout;
 const MODES=['paint','erase','move'],MODE_LABEL={paint:'Modo: pintar piso',erase:'Modo: apagar piso',move:'Modo: mover cadeiras e destinos'};
 let grid=null,mode='paint',brush=1,canvas=null,bar=null,painting=false,dirty=false,layoutDirty=false,dragging=null,layout=null,seats=null,places=null;
 const placePoint=p=>p.to??{x:p.x,y:OfficeLife.lanes[p.lane].y};
 function positions(){
  seats=Object.fromEntries(OfficeWorkstations.catalog.map(s=>[s.id,{x:s.x,y:s.y}]));
  places=Object.fromEntries(OfficeLife.places.map(p=>[p.id,{...placePoint(p),label:p.text}]));
 }
 function draw(){
  if(!canvas)return;const office=$('#office').getBoundingClientRect(),ratio=globalThis.devicePixelRatio||1;
  canvas.width=Math.round(office.width*ratio);canvas.height=Math.round(office.height*ratio);
  const ctx=canvas.getContext('2d'),sx=canvas.width/M.scene.width,sy=canvas.height/M.scene.height;ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(34,227,159,.35)';for(let r=0;r<M.ROWS;r++)for(let c=0;c<M.COLS;c++)if(grid[r*M.COLS+c])ctx.fillRect(c*M.CELL*sx,r*M.CELL*sy,Math.ceil(M.CELL*sx),Math.ceil(M.CELL*sy));
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;for(let c=0;c<=M.COLS;c+=4){ctx.beginPath();ctx.moveTo(c*M.CELL*sx,0);ctx.lineTo(c*M.CELL*sx,canvas.height);ctx.stroke();}
  const dot=(p,color,label)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x*sx,p.y*sy,(mode==='move'?6:4)*ratio,0,Math.PI*2);ctx.fill();
   if(mode==='move'&&label){ctx.font=(10*ratio)+'px system-ui';ctx.fillStyle='#fff';ctx.fillText(label,p.x*sx+8*ratio,p.y*sy-6*ratio);}};
  for(const [id,p] of Object.entries(seats))dot(p,'#ffb547',id);for(const p of Object.values(places))dot(p,'#35c9ff',p.label);
 }
 const scenePoint=event=>{const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width*M.scene.width,y:(event.clientY-rect.top)/rect.height*M.scene.height};};
 function paintAt(event){
  const c0=M.cellOf(scenePoint(event)),half=Math.floor(brush/2);
  for(let dr=-half;dr<=half;dr++)for(let dc=-half;dc<=half;dc++){const c=c0.c+dc,r=c0.r+dr;if(c>=0&&r>=0&&c<M.COLS&&r<M.ROWS)grid[r*M.COLS+c]=mode==='paint'?1:0;}
  dirty=true;draw();
 }
 /** Marcador mais próximo do toque (até 16 px da cena), para arrastar. */
 function pick(p){let best=null,dist=16;for(const [kind,map] of [['seats',seats],['places',places]])for(const [id,q] of Object.entries(map)){const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dist){dist=d;best={kind,id};}}return best;}
 function moveTo(event){
  const p=scenePoint(event),target=dragging.kind==='seats'?seats[dragging.id]:places[dragging.id];
  target.x=Math.round(Math.min(M.scene.width,Math.max(0,p.x)));target.y=Math.round(Math.min(M.scene.height,Math.max(0,p.y)));
  layout[dragging.kind][dragging.id]={x:target.x,y:target.y};layoutDirty=true;draw();
 }
 function verify(){
  let ok=0;const missing=[];for(const [id,seat] of Object.entries(seats))for(const t of Object.values(places)){if(M.route(seat,t,grid).length>=2)ok++;else missing.push(id+' → '+t.label);}
  status(missing.length?'Sem caminho em '+missing.length+' rota(s): '+missing.slice(0,4).join('; ')+(missing.length>4?'…':''):'Todas as '+ok+' rotas (cadeira → destino) têm caminho.');
 }
 function status(text){bar.querySelector('[data-role="status"]').textContent=text;}
 function button(label,action,role){const b=D.createElement('button');b.textContent=label;b.onclick=action;if(role)b.dataset.role=role;return b;}
 function save(){
  M.save(grid);dirty=false;
  if(layoutDirty&&L){L.save(layout);layoutDirty=false;status('Mapa e posições salvos neste navegador. Recarregando para aplicar as cadeiras e destinos…');setTimeout(()=>globalThis.location.reload(),1200);return;}
  status('Mapa salvo neste navegador. Os personagens já usam o novo piso.');
 }
 function open(){
  if(canvas)return;stopPresence();D.body.dataset.editing='on';grid=new Uint8Array(M.current().grid);dirty=false;layoutDirty=false;
  layout=L?.current()??{seats:{},places:{}};positions();
  canvas=D.createElement('canvas');canvas.id='mapEditorCanvas';canvas.setAttribute('aria-label','Editor do mapa de piso');$('#office').append(canvas);
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);if(mode==='move'){dragging=pick(scenePoint(e));if(dragging)moveTo(e);return;}painting=true;paintAt(e);};
  canvas.onpointermove=e=>{if(dragging)moveTo(e);else if(painting)paintAt(e);};canvas.onpointerup=()=>{painting=false;dragging=null;};
  canvas.oncontextmenu=e=>e.preventDefault();
  bar=D.createElement('div');bar.className='map-editor-bar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Ferramentas do editor de mapa');
  const modeBtn=button(MODE_LABEL.paint,()=>{mode=MODES[(MODES.indexOf(mode)+1)%MODES.length];modeBtn.textContent=MODE_LABEL[mode];draw();
   if(mode==='move')status('Arraste os pontos laranja (cadeiras) e azuis (destinos). A cadeira desenhada é recortada da arte no novo lugar.');});
  const brushBtn=button('Pincel: 1',()=>{brush=brush===1?3:brush===3?5:1;brushBtn.textContent='Pincel: '+brush;});
  bar.append(modeBtn,brushBtn,button('Verificar rotas',verify),button('Salvar no navegador',save),
   button('Exportar JSON',()=>{const data=JSON.stringify({version:2,cell:M.CELL,cols:M.COLS,rows:M.ROWS,grid:M.encode(grid),layout,exportedAt:new Date().toISOString()});const a=D.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='office-map.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);status('JSON exportado (piso, cadeiras e destinos). Envie o arquivo para que vire o padrão de todos.');}),
   button('Restaurar padrão',()=>{const hadLayout=Object.keys(layout.seats).length+Object.keys(layout.places).length>0;grid=new Uint8Array(M.reset().grid);dirty=false;
    if(hadLayout&&L){L.reset();status('Padrão restaurado. Recarregando para devolver cadeiras e destinos ao lugar original…');setTimeout(()=>globalThis.location.reload(),1200);return;}draw();status('Mapa padrão restaurado (corredores autorizados).');}),
   button('Fechar editor',close));
  const s=D.createElement('span');s.dataset.role='status';s.textContent='Arraste sobre o piso para pintar onde os personagens podem andar. Laranja: cadeiras; azul: destinos. Fonte atual: '+M.current().source+'.';bar.append(s);
  $('.stage').append(bar);draw();globalThis.addEventListener('resize',draw);
 }
 function close(){
  if((dirty||layoutDirty)&&!confirm('Há mudanças não salvas no mapa. Fechar mesmo assim?'))return;
  canvas?.remove();bar?.remove();canvas=null;bar=null;delete D.body.dataset.editing;globalThis.removeEventListener('resize',draw);render();
 }
 globalThis.OfficeMapEditor=Object.freeze({open,close});
})();
