// Editor do mapa de piso (modo avançado, em Config). Pinta células andáveis sobre a arte do escritório,
// verifica se toda cadeira alcança todo destino e salva no navegador ou exporta em JSON.
// Enquanto o editor está aberto, os personagens ficam parados. Nada vai para o servidor.
(() => {
 const D=globalThis.document;if(!D||!globalThis.OfficeMap)return;
 const $=s=>D.querySelector(s),M=globalThis.OfficeMap;
 let grid=null,mode='paint',brush=1,canvas=null,bar=null,painting=false,dirty=false;
 const targets=()=>OfficeLife.places.map(p=>({label:p.text,point:p.to??{x:p.x,y:OfficeLife.lanes[p.lane].y}}));
 function draw(){
  if(!canvas)return;const office=$('#office').getBoundingClientRect(),ratio=globalThis.devicePixelRatio||1;
  canvas.width=Math.round(office.width*ratio);canvas.height=Math.round(office.height*ratio);
  const ctx=canvas.getContext('2d'),sx=canvas.width/M.scene.width,sy=canvas.height/M.scene.height;ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(34,227,159,.35)';for(let r=0;r<M.ROWS;r++)for(let c=0;c<M.COLS;c++)if(grid[r*M.COLS+c])ctx.fillRect(c*M.CELL*sx,r*M.CELL*sy,Math.ceil(M.CELL*sx),Math.ceil(M.CELL*sy));
  ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;for(let c=0;c<=M.COLS;c+=4){ctx.beginPath();ctx.moveTo(c*M.CELL*sx,0);ctx.lineTo(c*M.CELL*sx,canvas.height);ctx.stroke();}
  const dot=(p,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x*sx,p.y*sy,4*ratio,0,Math.PI*2);ctx.fill();};
  for(const seat of OfficeWorkstations.catalog)dot(seat,'#ffb547');for(const t of targets())dot(t.point,'#35c9ff');
 }
 function paintAt(event){
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*M.scene.width,y=(event.clientY-rect.top)/rect.height*M.scene.height,c0=M.cellOf({x,y}),half=Math.floor(brush/2);
  for(let dr=-half;dr<=half;dr++)for(let dc=-half;dc<=half;dc++){const c=c0.c+dc,r=c0.r+dr;if(c>=0&&r>=0&&c<M.COLS&&r<M.ROWS)grid[r*M.COLS+c]=mode==='paint'?1:0;}
  dirty=true;draw();
 }
 function verify(){
  let ok=0,missing=[];for(const seat of OfficeWorkstations.catalog)for(const t of targets()){if(M.route({x:seat.x,y:seat.y},t.point,grid).length>=2)ok++;else missing.push(seat.id+' → '+t.label);}
  status((missing.length?'Sem caminho em '+missing.length+' rota(s): '+missing.slice(0,4).join('; ')+(missing.length>4?'…':''):'Todas as '+ok+' rotas (cadeira → destino) têm caminho.'));
 }
 function status(text){bar.querySelector('[data-role="status"]').textContent=text;}
 function button(label,action,role){const b=D.createElement('button');b.textContent=label;b.onclick=action;if(role)b.dataset.role=role;return b;}
 function open(){
  if(canvas)return;stopPresence();D.body.dataset.editing='on';grid=new Uint8Array(M.current().grid);dirty=false;
  canvas=D.createElement('canvas');canvas.id='mapEditorCanvas';canvas.setAttribute('aria-label','Editor do mapa de piso');$('#office').append(canvas);
  canvas.onpointerdown=e=>{painting=true;canvas.setPointerCapture(e.pointerId);paintAt(e);};canvas.onpointermove=e=>{if(painting)paintAt(e);};canvas.onpointerup=()=>{painting=false;};
  canvas.oncontextmenu=e=>e.preventDefault();
  bar=D.createElement('div');bar.className='map-editor-bar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Ferramentas do editor de mapa');
  const modeBtn=button('Modo: pintar piso',()=>{mode=mode==='paint'?'erase':'paint';modeBtn.textContent=mode==='paint'?'Modo: pintar piso':'Modo: apagar piso';});
  const brushBtn=button('Pincel: 1',()=>{brush=brush===1?3:brush===3?5:1;brushBtn.textContent='Pincel: '+brush;});
  bar.append(modeBtn,brushBtn,button('Verificar rotas',verify),
   button('Salvar no navegador',()=>{M.save(grid);dirty=false;status('Mapa salvo neste navegador. Os personagens já usam o novo piso.');}),
   button('Exportar JSON',()=>{const data=JSON.stringify({version:1,cell:M.CELL,cols:M.COLS,rows:M.ROWS,grid:M.encode(grid),exportedAt:new Date().toISOString()});const a=D.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download='office-map.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);status('JSON exportado. Envie o arquivo para que o mapa vire o padrão de todos.');}),
   button('Restaurar padrão',()=>{grid=new Uint8Array(M.reset().grid);dirty=false;draw();status('Mapa padrão restaurado (corredores autorizados).');}),
   button('Fechar editor',close));
  const s=D.createElement('span');s.dataset.role='status';s.textContent='Arraste sobre o piso para pintar onde os personagens podem andar. Laranja: cadeiras; azul: destinos. Fonte atual: '+M.current().source+'.';bar.append(s);
  $('.stage').append(bar);draw();globalThis.addEventListener('resize',draw);
 }
 function close(){
  if(dirty&&!confirm('Há mudanças não salvas no mapa. Fechar mesmo assim?'))return;
  canvas?.remove();bar?.remove();canvas=null;bar=null;delete D.body.dataset.editing;globalThis.removeEventListener('resize',draw);render();
 }
 globalThis.OfficeMapEditor=Object.freeze({open,close});
})();
