// Renderização dos personagens e cadeiras em canvas (experimental, opcional em Config).
// Ideia do pixel-agents/PixiJS: desenhar a cena em um único canvas em vez de dezenas de elementos animados.
// Usamos Canvas 2D nativo (sem biblioteca): são 8 personagens e poucas cadeiras, e não há dependência nova.
// Os botões dos agentes continuam no DOM (clique, foco, leitor de tela, balões); só a pintura muda de lugar.
// A posição de cada quadro vem do próprio DOM, então rotas, poses e direção continuam em life.js/presence.js.
(() => {
 const D=globalThis.document;if(!D)return;
 const KEY='trading-lab.renderer.v1',WALK_MS=140;
 const $=s=>D.querySelector(s);
 const images=new Map();
 const image=src=>{if(!images.has(src)){const i=new Image();i.decoding='async';i.src=src;images.set(src,i);}return images.get(src);};
 const ready=i=>i.complete&&i.naturalWidth>0;
 let canvas=null,ctx=null,frame=0,lastDraw=0,stats=null;
 const preferred=()=>{try{return globalThis.localStorage?.getItem(KEY)==='canvas'?'canvas':'dom';}catch{return 'dom';}};
 const reduced=()=>D.body?.dataset?.motion!=='on'&&globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const chairImage=()=>image(globalThis.OfficeSceneQuads?.CHAIR.src??'/office/assets/cadeira-costas.png');
 /** Coluna da folha de sprites para a pose atual (mesma regra do CSS: 0 parado, 1-4 andando, 5 sentado). */
 function column(agent,now){
  if(agent.dataset.pose==='seated')return 5;
  const animating=$('#office')?.dataset.presence==='on'&&!reduced();
  return agent.dataset.pose==='walk'&&animating?1+Math.floor(now/WALK_MS)%4:0;
 }
 function drawAgent(agent,origin,now){
  const sprite=agent.querySelector('.sprite[data-rig="directional"]');if(!sprite||agent.hidden)return;
  const id=sprite.dataset.sprite,sheet=globalThis.OfficeSpriteSheets?.[id],facing=agent.dataset.facing||'down';
  const row=Math.max(0,globalThis.OfficeSprites?.directions.indexOf(facing)??0),col=column(agent,now);
  const target=sprite.querySelector('.sprite-frame[data-direction="'+facing+'"][data-frame="'+col+'"]');
  const img=image('/office/characters/'+id+'.png');if(!sheet||!target||!ready(img))return;
  const r=target.getBoundingClientRect();if(r.width<1||r.height<1)return;
  const b=sheet.frames[row*6+col],ratio=canvas.width/origin.width;
  const style=getComputedStyle(agent);ctx.globalAlpha=Number(style.opacity)||1;
  // Sombra igual à do DOM; brilho azul no hover e dourado em alerta de operação.
  const glow=agent.dataset.alert==='trade'?'#ffd166':agent.matches(':hover')?'#43c5ff':null;
  ctx.shadowColor=glow??'#080b17aa';ctx.shadowBlur=(glow?6:2)*ratio;ctx.shadowOffsetY=glow?0:2*ratio;
  ctx.drawImage(img,b.x,b.y,b.w,b.h,(r.left-origin.left)*ratio,(r.top-origin.top)*ratio,r.width*ratio,r.height*ratio);
  ctx.shadowColor='transparent';ctx.globalAlpha=1;
 }
 /** Cadeira das estações: a peça cadeira-costas desenhada inteira no retângulo do elemento (mesma do DOM). */
 function drawChair(chair,origin,piece){
  const r=chair.getBoundingClientRect();if(r.width<1)return;const ratio=canvas.width/origin.width;
  ctx.drawImage(piece,(r.left-origin.left)*ratio,(r.top-origin.top)*ratio,r.width*ratio,r.height*ratio);
 }
 function draw(now){
  // Enquanto as imagens não carregam, o DOM continua pintando e o canvas fica vazio (nada aparece duplicado).
  const office=$('#office');if(!canvas||!office||D.body.dataset.renderer!=='canvas')return;
  const origin=office.getBoundingClientRect(),dpr=globalThis.devicePixelRatio||1;
  const w=Math.round(origin.width*dpr),h=Math.round(origin.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
  const agents=[...office.querySelectorAll('.agent')],away=a=>a.dataset.life==='away';
  // Ordem igual à do DOM: agentes no lugar (camada 3), cadeiras (4), agentes andando pelo escritório (7).
  for(const a of agents)if(!away(a))drawAgent(a,origin,now);
  const piece=chairImage();if(ready(piece))for(const chair of office.querySelectorAll('.station-chair'))drawChair(chair,origin,piece);
  for(const a of agents)if(away(a))drawAgent(a,origin,now);
 }
 function loop(now){
  frame=0;if(!canvas)return;
  // Parado (animações desligadas ou aba oculta): redesenha 4 vezes por segundo, o suficiente para mudanças de estado.
  const moving=$('#office')?.dataset.presence==='on'&&!D.hidden;
  if(moving||now-lastDraw>250){const t=performance.now();draw(now);lastDraw=now;if(stats)stats.draw.push(performance.now()-t);}
  frame=requestAnimationFrame(loop);
 }
 function enable(){
  if(canvas)return;const office=$('#office');if(!office)return;
  canvas=D.createElement('canvas');canvas.id='sceneCanvas';canvas.setAttribute('aria-hidden','true');ctx=canvas.getContext('2d');
  office.append(canvas);
  // Só esconde a pintura do DOM depois que as imagens carregarem, para nunca deixar a cena vazia.
  const needed=[chairImage(),...Object.keys(globalThis.OfficeSpriteSheets??{}).map(id=>image('/office/characters/'+id+'.png'))];
  const loaded=i=>new Promise(res=>{if(i.complete)res();else{i.addEventListener('load',res,{once:true});i.addEventListener('error',res,{once:true});}});
  Promise.all(needed.map(loaded)).then(()=>{if(canvas&&needed.every(ready))D.body.dataset.renderer='canvas';});
  frame=requestAnimationFrame(loop);
 }
 function disable(){if(frame)cancelAnimationFrame(frame);frame=0;canvas?.remove();canvas=null;ctx=null;delete D.body.dataset.renderer;}
 function set(mode){try{globalThis.localStorage?.setItem(KEY,mode);}catch{}mode==='canvas'?enable():disable();}
 /** Mede o ritmo de quadros por alguns segundos no modo atual (sem enviar nada a lugar nenhum). */
 function measure(ms=3000){
  return new Promise(resolve=>{
   const intervals=[];stats={draw:[]};let previous=null;const end=performance.now()+ms;
   const tick=now=>{if(previous!==null)intervals.push(now-previous);previous=now;if(now<end){requestAnimationFrame(tick);return;}
    const sorted=[...intervals].sort((a,b)=>a-b),avg=intervals.reduce((s,v)=>s+v,0)/Math.max(1,intervals.length);
    const drawAvg=stats.draw.length?stats.draw.reduce((s,v)=>s+v,0)/stats.draw.length:null;stats=null;
    resolve({mode:canvas?'canvas':'dom',fps:avg>0?1000/avg:0,p95:sorted[Math.floor(sorted.length*0.95)]??0,longFrames:intervals.filter(v=>v>50).length,drawMs:drawAvg,
     animating:$('#office')?.dataset.presence==='on'});};
   requestAnimationFrame(tick);
  });
 }
 globalThis.OfficeSceneCanvas=Object.freeze({KEY,preferred,set,enable,disable,measure,redraw:()=>draw(performance.now()),active:()=>!!canvas});
 if(preferred()==='canvas')enable();
})();
