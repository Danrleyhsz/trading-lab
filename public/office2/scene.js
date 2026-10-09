// Escritório 2.0 (F1): desenho da cena isométrica em canvas, a partir de public/office2/scene-map.json.
// L0 (cidade) e L1 (pisos) vão para um cache estático; L2 a L5 (paredes, telas, móveis, agentes) são ordenados por
// profundidade a cada quadro. A arte F7 usa PNGs do ChatGPT; o desenho por código fica como reserva.
// Só apresentação: telas sem dado ficam apagadas (nunca um gráfico inventado).
(() => {
 const C=Object.freeze({
  sky:['#0b1426','#14213b','#1a2a4a'],window:'#ffcf6a',slab:'#141b2b',slabEdge:'#2a3348',
  floor:{'piso-claro':['#d9cdb4','#c8b89a'],'carpete-escuro':['#2b3140','#353c4e'],madeira:['#8b5a2c','#a86d36'],'piso-tecnico':['#3a404c','#454c5a'],deck:['#6b5440','#7d6450']},
  wall:'#2a2f3a',wallSide:'#22262f',wallCap:'#3a404c',led:'#ffd27a',glass:'rgba(159,196,232,0.22)',glassLine:'rgba(219,233,255,0.55)',
  screenOff:'#0a1630',screenStripe:'#141f3c',screenFrame:'#1b2133',
  prop:{top:'#8d93a3',left:'#5f6575',right:'#4a4f5d',line:'#1b2133'},plant:{top:'#62d07a',left:'#2c8a48',right:'#24703b'},
 });
 const TALL=72,LOW=24,RAIL=30,GLASS=48,DROP=720;
 const GLOW_SCREEN=new Set(['mesa-monitores','mesa-curva-operacoes']),GLOW_FLOOR=new Set(['balcao-recepcao','bancada-cozinha']);
 function create(map,iso,images){
  const P=(i,j,h=0)=>iso.project(i,j,h);
  const roomById=new Map(map.rooms.map(r=>[r.id,r]));
  const poly=(ctx,pts,fill,stroke)=>{ctx.beginPath();pts.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}};
  const patternCache=new WeakMap();
  function texturePattern(ctx,name,wallAxis){
   const img=images?.textures?.[name];
   if(!img?.complete||!img.naturalWidth||typeof ctx.createPattern!=='function'||typeof DOMMatrix==='undefined')return null;
   let patterns=patternCache.get(ctx);if(!patterns){patterns=new Map();patternCache.set(ctx,patterns);}
   const key=name+':'+(wallAxis??'floor');if(patterns.has(key))return patterns.get(key);
   const pattern=ctx.createPattern(img,'repeat');if(!pattern||typeof pattern.setTransform!=='function')return null;
   const T=img.naturalWidth/(['piso-madeira','deck'].includes(name)?8:4),{origin,tile}=map.projection,hw=tile.w/2,hh=tile.h/2;
   const matrix=wallAxis?[wallAxis==='i'?hw/T:-hw/T,hh/T,0,1,origin.x,origin.y-TALL]:[hw/T,hh/T,-hw/T,hh/T,origin.x,origin.y];
   pattern.setTransform(new DOMMatrix(matrix));patterns.set(key,pattern);return pattern;
  }
  const FLOOR_TEXTURE={'piso-claro':'piso-marmore',madeira:'piso-madeira','carpete-escuro':'carpete','piso-tecnico':'carpete',deck:'deck'};
  function wallTexture(ctx,w){return texturePattern(ctx,signAt.has([w.a.i,w.a.j,w.b.i,w.b.j].join(','))||w.room==='hall-marca'?'parede-ripada':'parede-escura',w.a.j===w.b.j?'i':'j');}
  /** Altura e tipo de cada borda declarada na planta (cada sala diz o tipo de parede de cada lado; sem tipo, não há parede). */
  const EDGE={'parede-painel':{h:TALL,glass:false},'parede-marca':{h:TALL,glass:false},'fachada-vidro':{h:TALL,glass:true},'divisoria-vidro':{h:GLASS,glass:true},
   'divisoria-vidro-baixa':{h:RAIL,glass:true},'guarda-corpo-vidro':{h:RAIL,glass:true},'divisoria-baixa':{h:LOW,glass:false}};
  function wallSpec(room,side){const type=room.edges?.[side],spec=type&&EDGE[type];return spec?{type,...spec}:null;}
  const doorAt=new Set(iso.doors.map(d=>d.room+':'+d.side+':'+(d.side[0]==='i'?d.inner.j:d.inner.i)));
  /** Segmentos de parede, um por tile de borda, com chave de profundidade (iso.depth da borda − 0,5). */
  const walls=[];
  for(const r of map.rooms)for(const side of ['j0','i0','j1','i1']){const w=wallSpec(r,side);if(!w)continue;const t=r.tiles;
   if(side[0]==='j'){const J=side==='j0'?t.j0:t.j1;for(let i=t.i0;i<t.i1;i++){if(doorAt.has(r.id+':'+side+':'+i))continue;walls.push({...w,a:{i,j:J},b:{i:i+1,j:J},key:i+J-0.5,room:r.id});}}
   else{const I=side==='i0'?t.i0:t.i1;for(let j=t.j0;j<t.j1;j++){if(doorAt.has(r.id+':'+side+':'+j))continue;walls.push({...w,a:{i:I,j},b:{i:I,j:j+1},key:I+j-0.5,room:r.id});}}}
  // Uma borda compartilhada entre duas salas aparece uma vez (a mais alta).
  const uniq=new Map();for(const w of walls){const k=[w.a.i,w.a.j,w.b.i,w.b.j].join(',');const prev=uniq.get(k);if(!prev||w.h>prev.h)uniq.set(k,w);}
  const wallList=[...uniq.values()];
  // Uma porta abre também o trecho da parede da sala vizinha na mesma borda.
  for(const d of iso.doors){const a=d.inner,b=d.outer;
   const segment=a.i===b.i?[a.i,Math.max(a.j,b.j),a.i+1,Math.max(a.j,b.j)]:[Math.max(a.i,b.i),a.j,Math.max(a.i,b.i),a.j+1];
   uniq.delete(segment.join(','));
  }
  wallList.splice(0,wallList.length,...uniq.values());
  /** Montantes: coluna escura em cada ponta livre de parede, em cada canto e nos dois lados de cada porta (luz âmbar no batente). */
  const posts=new Map();
  const addPost=(i,j,h,room,tag,door)=>{const k=i+','+j,p=posts.get(k)??{i,j,room,h:0,heights:new Set(),tags:new Set(),n:0,door:false};
   p.h=Math.max(p.h,h);p.heights.add(h);p.tags.add(tag);p.n+=1;p.door=p.door||!!door;posts.set(k,p);};
  for(const w of wallList){const tag=w.a.j===w.b.j?'i':'j';addPost(w.a.i,w.a.j,w.h,w.room,tag);addPost(w.b.i,w.b.j,w.h,w.room,tag);}
  for(const d of iso.doors){const r=roomById.get(d.room),spec=wallSpec(r,d.side);if(!spec)continue;const t=r.tiles;
   const [pa,pb]=d.side[0]==='j'?[[d.inner.i,d.side==='j0'?t.j0:t.j1],[d.inner.i+1,d.side==='j0'?t.j0:t.j1]]:[[d.side==='i0'?t.i0:t.i1,d.inner.j],[d.side==='i0'?t.i0:t.i1,d.inner.j+1]];
   addPost(pa[0],pa[1],spec.h,d.room,'door',true);addPost(pb[0],pb[1],spec.h,d.room,'door',true);}
  const postList=[...posts.values()].filter(p=>p.door||p.n===1||p.tags.size>1||p.heights.size>1);
  function drawPost(ctx,p){
   const b=P(p.i,p.j),t=P(p.i,p.j,p.h);ctx.fillStyle='#0a0e16';ctx.fillRect(b.x-1.7,t.y-2.5,3.4,b.y-t.y+2.5);
   ctx.fillStyle='rgba(120,135,160,0.55)';ctx.fillRect(b.x-1.7,t.y-2.5,1,b.y-t.y+2.5);
   if(p.door&&p.h>=GLASS){ctx.fillStyle='rgba(255,208,128,0.95)';ctx.fillRect(b.x+1.7,t.y+3,1.2,b.y-t.y-6);
    ctx.fillStyle='rgba(255,190,100,0.10)';ctx.fillRect(b.x+2.9,t.y+3,4,b.y-t.y-6);}
  }
  /**
   * Placas das zonas pintadas na parede de fundo (como na referência): painel escuro de 3+ tiles livres de tela e de porta,
   * com nome grande, subtítulo e emblema. Cada fatia de parede desenha o seu pedaço da placa, na própria profundidade.
   */
  const SIGN_H=70,HEAD=24,signAt=new Map(),headerAt=new Map(),signs=[];
  for(const r of map.rooms){if(r.outdoor||r.module==='PANORAMIC_EDGE'||r.id==='elevadores')continue;
   const t=r.tiles,busyFor=side=>new Set(map.screens.filter(s=>s.room===r.id&&s.wall===side).flatMap(s=>Array.from({length:s.tiles.to-s.tiles.from},(_,k)=>s.tiles.from+k))),busy=busyFor('j0'),busyI=busyFor('i0');
   const run=(side,lo,hi,blocked)=>{let best=null,start=null;for(let k=lo;k<=hi;k++){const ok=k<hi&&!blocked(k);if(ok&&start===null)start=k;if(!ok&&start!==null){if(!best||k-start>best.to-best.from)best={side,from:start,to:k};start=null;}}return best;};
   const seg=(side,k)=>side==='j0'?[k,t.j0,k+1,t.j0]:[t.i0,k,t.i0,k+1];
   const has=(side,k)=>{const w=uniq.get(seg(side,k).join(','));return !!w&&!w.glass&&w.h>=TALL;};
   let pick=run('j0',t.i0,t.i1,k=>busy.has(k)||!has('j0',k));
   if(!pick||pick.to-pick.from<3){const alt=run('i0',t.j0,t.j1,k=>busyI.has(k)||!has('i0',k));if(alt&&alt.to-alt.from>=3&&(!pick||alt.to-alt.from>pick.to-pick.from))pick=alt;}
   if(!pick||pick.to-pick.from<3){
    // Parede de fundo tomada por telas: a placa vira uma faixa iluminada em cima delas (maior trecho sólido da parede j0).
    const side=busy.size?'j0':busyI.size?'i0':null;
    const band=side&&run(side,side==='j0'?t.i0:t.j0,side==='j0'?t.i1:t.j1,k=>!has(side,k));
    if(band&&band.to-band.from>=3){const [title,sub]=String(r.label).split(' · ');const s={room:r.id,side,from:band.from,to:band.to,line:side==='j0'?t.j0:t.i0,title:title.toUpperCase(),sub:(sub??'').toUpperCase(),header:true};
     signs.push(s);for(let k=s.from;k<s.to;k++)headerAt.set(seg(side,k).join(','),s);}
    continue;}
   if(pick.to-pick.from>6){const mid=Math.floor((pick.from+pick.to)/2);pick={...pick,from:mid-3,to:mid+3};}
   const [title,sub]=r.id==='hall-marca'?['TRADINGLAB','']:String(r.label).split(' · ');
   const s={room:r.id,module:r.module,side:pick.side,from:pick.from,to:pick.to,line:pick.side==='j0'?t.j0:t.i0,title:title.toUpperCase(),sub:(sub??'').toUpperCase(),header:r.id==='cozinha'};
   signs.push(s);for(let k=s.from;k<s.to;k++)(s.header?headerAt:signAt).set(seg(s.side,k).join(','),s);}
  /** Ponto da placa: u ao longo da parede (0 = começo da leitura), z = altura. j0 lê ao longo de +i; i0 lê subindo (de j1 para j0). */
  const signPoint=(s,u,z)=>s.side==='j0'?P(s.from+u,s.line,z):P(s.line,s.to-u,z);
  /** Faixa de placa em cima das telas: de TALL até TALL+HEAD, texto numa linha só ("HORIZON · INTELIGÊNCIA DE MERCADO"). */
  function drawHeaderSlice(ctx,s,w){
   const z0=TALL,z1=TALL+HEAD,a=P(w.a.i,w.a.j,z0),b=P(w.b.i,w.b.j,z0),bt=P(w.b.i,w.b.j,z1),at=P(w.a.i,w.a.j,z1);
   ctx.save();poly(ctx,[a,b,bt,at],'#141924');ctx.beginPath();[a,b,bt,at].forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
   const o=signPoint(s,0,z1),e=signPoint(s,1,z1),ux=(e.x-o.x)/26.833,uy=(e.y-o.y)/26.833,L=(s.to-s.from)*26.833;
   ctx.transform(ux,uy,0,1,o.x,o.y);ctx.fillStyle='rgba(255,210,122,0.85)';ctx.fillRect(4,HEAD-2,L-8,1);
   const emblem=images?.emblems?.[s.room];let x0=8;if(emblem&&emblem.complete&&emblem.naturalWidth){ctx.imageSmoothingEnabled=true;ctx.drawImage(emblem,x0,3,16,16);x0+=22;}
   const txt=s.title+(s.sub?'  ·  '+s.sub:'');let f=13;ctx.font=`800 ${f}px "Segoe UI",system-ui,sans-serif`;while(f>7&&(ctx.measureText(txt)?.width??0)>L-x0-8){f-=1;ctx.font=`800 ${f}px "Segoe UI",system-ui,sans-serif`;}
   ctx.fillStyle='#f4f7ff';ctx.shadowColor='rgba(220,235,255,0.5)';ctx.shadowBlur=5;ctx.textBaseline='middle';ctx.fillText(txt,x0,HEAD/2);ctx.restore();
   ctx.strokeStyle='#0c0f16';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.stroke();
  }
  function drawSignSlice(ctx,s,w){
   const len=s.to-s.from,a=P(w.a.i,w.a.j),b=P(w.b.i,w.b.j),at=P(w.a.i,w.a.j,SIGN_H),bt=P(w.b.i,w.b.j,SIGN_H);
   ctx.save();ctx.beginPath();[a,b,bt,at].forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
   poly(ctx,[a,b,bt,at],wallTexture(ctx,w)??'#141924');poly(ctx,[a,b,bt,at],'rgba(20,25,36,0.55)');
   // Texto num plano inclinado: eixo x ao longo da parede (26,8 px por tile), eixo y vertical.
   const o=signPoint(s,0,SIGN_H),e=signPoint(s,1,SIGN_H),ux=(e.x-o.x)/26.833,uy=(e.y-o.y)/26.833,L=len*26.833;
   ctx.transform(ux,uy,0,1,o.x,o.y);
   ctx.fillStyle='rgba(255,210,122,0.85)';ctx.fillRect(4,3,L-8,1.2);
   const emblem=images?.emblems?.[s.room];let x0=10;
   if(emblem&&emblem.complete&&emblem.naturalWidth){ctx.imageSmoothingEnabled=true;ctx.drawImage(emblem,x0,16,24,24);x0+=30;}
   const fit=(txt,size,max,weight)=>{let f=size;ctx.font=`${weight} ${f}px "Segoe UI",system-ui,sans-serif`;while(f>7&&(ctx.measureText(txt)?.width??0)>max){f-=1;ctx.font=`${weight} ${f}px "Segoe UI",system-ui,sans-serif`;}return f;};
   ctx.textBaseline='alphabetic';ctx.shadowColor='rgba(220,235,255,0.55)';ctx.shadowBlur=6;ctx.fillStyle='#f4f7ff';
   const tf=fit(s.title,20,L-x0-8,800);ctx.fillText(s.title,x0,18+tf);ctx.shadowBlur=0;
   if(s.sub){ctx.fillStyle='#b9c6dd';fit(s.sub,9,L-x0-8,700);ctx.fillText(s.sub,x0,18+tf+13);}
   ctx.restore();
   ctx.strokeStyle='#0c0f16';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.stroke();
  }
  /** Fachada arquitetônica: módulos de vidro largos, lajes, reflexos e interiores, com geometria da planta. */
  function drawFacade(ctx,left,bottom,right,depth,phase){
   const palette=globalThis.Office2Ambience?.palette[phase]??{glass:'#142b47',reflection:'#4a78a9',warm:.64},FH=52;
   const face=(a,b,n,seed,shade)=>{
    const quad=[a,b,{x:b.x,y:b.y+depth},{x:a.x,y:a.y+depth}],rnd=Office2Iso.prng(seed),bays=Math.ceil(n/2);
    poly(ctx,quad,palette.glass);
    const reflection=images?.skylines?.[phase]??images?.skyline;
    if(reflection?.complete&&reflection.naturalWidth){ctx.save();ctx.clip();ctx.globalAlpha=.16;ctx.drawImage(reflection,Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),depth+Math.abs(b.y-a.y));ctx.restore();}
    for(let f=0;f*FH<depth;f++){
     const y0=14+f*FH;
     for(let k=0;k<bays;k++){
      const u0=(k+.06)/bays,u1=(k+.94)/bays,x0=a.x+(b.x-a.x)*u0,x1=a.x+(b.x-a.x)*u1;
      const ya=a.y+(b.y-a.y)*u0+y0,yb=a.y+(b.y-a.y)*u1+y0,r=rnd();
      const pane=[{x:x0,y:ya},{x:x1,y:yb},{x:x1,y:yb+FH-7},{x:x0,y:ya+FH-7}];
      const g=ctx.createLinearGradient(x0,ya,x1,yb+FH);g.addColorStop(0,palette.reflection);g.addColorStop(.34,palette.glass);g.addColorStop(.72,shade?'#14233b':'#284766');g.addColorStop(1,palette.glass);poly(ctx,pane,g);
      if(r<palette.warm){
       const top=Math.min(ya,yb),wg=ctx.createLinearGradient(0,top,0,top+FH+Math.abs(yb-ya));wg.addColorStop(0,'rgba(255,228,172,.66)');wg.addColorStop(.55,'rgba(255,186,106,.44)');wg.addColorStop(1,'rgba(255,148,66,.26)');poly(ctx,pane,wg);
       // luz de teto no alto da vidraça e bancada escura ao fundo (decoração determinística; sem pessoas)
       poly(ctx,[{x:x0+2,y:ya+3},{x:x1-2,y:yb+3},{x:x1-2,y:yb+5},{x:x0+2,y:ya+5}],'rgba(255,248,226,.8)');
       poly(ctx,[{x:x0+2,y:ya+FH-17},{x:x1-2,y:yb+FH-17},{x:x1-2,y:yb+FH-9},{x:x0+2,y:ya+FH-9}],'rgba(44,24,12,.5)');
      }else if(r<palette.warm+.16)poly(ctx,pane,'rgba(176,210,255,.2)');
      const xm=(x0+x1)/2,ym=(ya+yb)/2;
      ctx.strokeStyle='rgba(151,185,207,.36)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(xm,ym);ctx.lineTo(xm,ym+FH-7);ctx.stroke();
      ctx.strokeStyle='rgba(194,217,230,.32)';ctx.beginPath();ctx.moveTo(x0+1,ya+2);ctx.lineTo(x1-1,yb+2);ctx.stroke();
     }
     poly(ctx,[{x:a.x,y:a.y+y0-5},{x:b.x,y:b.y+y0-5},{x:b.x,y:b.y+y0},{x:a.x,y:a.y+y0}],shade?'#223247':'#3d5066');
     ctx.strokeStyle='rgba(255,206,130,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y+y0+.5);ctx.lineTo(b.x,b.y+y0+.5);ctx.stroke();
    }
    // Reflexos verticais do entorno conservam a perspectiva e não são janelas estreitas repetidas.
    for(let k=0;k<5;k++){const u=(k+.35)/5,v=u+.025;poly(ctx,[{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u},{x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v},{x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v+depth},{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u+depth}],'rgba(187,217,237,.08)');}
    if(shade)poly(ctx,quad,'rgba(5,15,32,.17)');
    const top=Math.min(a.y,b.y),fog=ctx.createLinearGradient(0,top,0,top+depth);fog.addColorStop(0,'rgba(7,16,30,0)');fog.addColorStop(1,'rgba(7,16,30,.82)');poly(ctx,quad,fog);
   };
   face(left,bottom,iso.W,32,false);face(bottom,right,iso.H,33,true);
   poly(ctx,[left,bottom,{x:bottom.x,y:bottom.y+10},{x:left.x,y:left.y+10}],'#52657c');
   poly(ctx,[bottom,right,{x:right.x,y:right.y+10},{x:bottom.x,y:bottom.y+10}],'#344b65');
   ctx.strokeStyle='rgba(215,230,245,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bottom.x,bottom.y+10);ctx.lineTo(bottom.x,bottom.y+depth);ctx.stroke();
   ctx.strokeStyle='rgba(255,210,122,.85)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left.x,left.y+8);ctx.lineTo(bottom.x,bottom.y+8);ctx.lineTo(right.x,right.y+8);ctx.stroke();
  }
  /** Cache estático em 2×: fachada, pisos e luz do teto. O céu e a cidade são o fundo em tela cheia (backdrop). */
  function renderStatic(scale=2,phase='night',height=0){
   const {w,h}=map.projection.scene,H2=Math.max(h+DROP,height),cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w*scale,H2*scale):Object.assign(document.createElement('canvas'),{width:w*scale,height:H2*scale});
   cv.worldHeight=H2;
   const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.scale(scale,scale);
   const W=iso.W,H=iso.H,left=P(0,H),bottom=P(W,H),right=P(W,0);
   drawFacade(ctx,left,bottom,right,H2-bottom.y+20,phase);
   // L1: pisos por material; tiles fora das salas são circulação (piso claro).
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){const r=iso.roomAt(i,j),mat=C.floor[r?.floor??'piso-claro']??C.floor['piso-claro'];
    const pts=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)],texture=texturePattern(ctx,FLOOR_TEXTURE[r?.floor??'piso-claro']);poly(ctx,pts,texture??mat[0]);
    if(texture)continue;
    ctx.strokeStyle=mat[1];ctx.lineWidth=0.75;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.stroke();
    if(r?.floor==='madeira'||r?.floor==='deck'){for(const f of [0.33,0.66]){const a=P(i,j+f),b=P(i+1,j+f);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
   // Subzonas com cor de destaque na borda (Anel de decisão × Execução paper).
   for(const r of map.rooms)for(const s of r.subzones??[]){const t=s.tiles;ctx.globalAlpha=0.9;poly(ctx,[P(t.i0,t.j0),P(t.i1,t.j0),P(t.i1,t.j1),P(t.i0,t.j1)],null,s.accent);ctx.globalAlpha=1;}
   // Corredores: tom quente por cima do mármore; junto de cada parede alta maciça, sombra suave no chão da sala.
   ctx.globalCompositeOperation='multiply';
   for(let i=0;i<W;i++)for(let j=0;j<H;j++)if(!iso.roomAt(i,j)){const c=[P(i-.02,j-.02),P(i+1.02,j-.02),P(i+1.02,j+1.02),P(i-.02,j+1.02)];poly(ctx,c,'#e9cda2');}
   ctx.globalCompositeOperation='source-over';
   for(const w of wallList){if(w.glass||w.h<TALL)continue;const alongI=w.a.j===w.b.j;
    for(const [d,al] of [[.45,.22],[.9,.12],[1.4,.06]]){const q=alongI?[P(w.a.i,w.a.j),P(w.b.i,w.b.j),P(w.b.i,w.b.j+d),P(w.a.i,w.a.j+d)]:[P(w.a.i,w.a.j),P(w.b.i,w.b.j),P(w.b.i+d,w.b.j),P(w.a.i+d,w.a.j)];poly(ctx,q,'rgba(6,8,16,'+al+')');}}
   // Piso claro polido: meia-luz na metade de cima de cada placa e um reflexo diagonal largo (decoração).
   ctx.globalCompositeOperation='lighter';
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){const r=iso.roomAt(i,j);if((r?.floor??'piso-claro')!=='piso-claro')continue;
    poly(ctx,[P(i,j),P(i+1,j),P(i+0.5,j+0.5)],'rgba(255,240,215,0.07)');}
   for(let k=0;k<5;k++){const a=P(4+k*6,0),b=P(4+k*6,H);const g=ctx.createLinearGradient(a.x-30,a.y,a.x+30,a.y);g.addColorStop(0,'rgba(255,245,230,0)');g.addColorStop(0.5,'rgba(255,245,230,0.035)');g.addColorStop(1,'rgba(255,245,230,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(a.x-30,a.y);ctx.lineTo(a.x+30,a.y);ctx.lineTo(b.x+30,b.y);ctx.lineTo(b.x-30,b.y);ctx.closePath();ctx.fill();}
   // Luminárias de teto nos corredores: retículo regular de focos de luz quente.
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){if(iso.roomAt(i,j)||i%5!==2||j%5!==3)continue;const c=P(i+.5,j+.5),r=46;
    const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,r);g.addColorStop(0,'rgba(255,214,160,0.20)');g.addColorStop(1,'rgba(255,214,160,0)');
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(1,0.5);ctx.translate(-c.x,-c.y);ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
   // Luz quente do teto: uma poça de luz por sala coberta (decoração; deixa o andar com cara de noite iluminada).
   for(const r of map.rooms){if(r.outdoor)continue;const t=r.tiles,c=P((t.i0+t.i1)/2,(t.j0+t.j1)/2),rx=((t.i1-t.i0)+(t.j1-t.j0))*12;
    const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,rx);g.addColorStop(0,'rgba(255,186,110,0.20)');g.addColorStop(0.6,'rgba(255,186,110,0.07)');g.addColorStop(1,'rgba(255,186,110,0)');
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(1,0.5);ctx.translate(-c.x,-c.y);ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,rx,0,Math.PI*2);ctx.fill();ctx.restore();}
   ctx.globalCompositeOperation='source-over';
   return cv;
  }
  /** Vidro: película azulada com brilho diagonal, montantes pretos a cada tile, travessa grossa em cima e rodapé escuro. */
  function drawGlass(ctx,w,a,b,at,bt){
   poly(ctx,[a,b,bt,at],'rgba(135,188,240,0.13)');
   poly(ctx,[at,bt,P(w.b.i,w.b.j,w.h*.62),P(w.a.i,w.a.j,w.h*.62)],'rgba(175,215,255,0.10)');
   // brilho: faixa diagonal fina em cada vidraça
   const u0=.18,u1=.34,lerp=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
   poly(ctx,[lerp(a,b,u0),lerp(a,b,u1),lerp(at,bt,u1),lerp(at,bt,u0)],'rgba(235,246,255,0.10)');
   const foot=P(w.a.i,w.a.j,4),footB=P(w.b.i,w.b.j,4);
   poly(ctx,[a,b,footB,foot],'#0d1118');
   ctx.strokeStyle='#0d1118';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(at.x,at.y-1);ctx.stroke();
   ctx.lineWidth=w.h===RAIL?2.6:2;ctx.beginPath();ctx.moveTo(at.x,at.y-1);ctx.lineTo(bt.x,bt.y-1);ctx.stroke();
   ctx.strokeStyle='rgba(205,225,245,0.5)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(at.x,at.y-2.2);ctx.lineTo(bt.x,bt.y-2.2);ctx.stroke();
   if(w.h===RAIL){ctx.strokeStyle='rgba(255,210,122,0.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y-4.5);ctx.lineTo(b.x,b.y-4.5);ctx.stroke();}
  }
  function drawWall(ctx,w){
   const a=P(w.a.i,w.a.j),b=P(w.b.i,w.b.j),at=P(w.a.i,w.a.j,w.h),bt=P(w.b.i,w.b.j,w.h);
   if(w.glass){drawGlass(ctx,w,a,b,at,bt);return;}
   const alongI=w.a.j===w.b.j,sign=signAt.get([w.a.i,w.a.j,w.b.i,w.b.j].join(','));
   if(sign){drawSignSlice(ctx,sign,w);}
   else{
    const texture=wallTexture(ctx,w);poly(ctx,[a,b,bt,at],texture??(alongI?C.wall:C.wallSide));
    if(texture&&!alongI)poly(ctx,[a,b,bt,at],'rgba(10,14,22,0.25)');
    // rodapé escuro e junta entre painéis a cada tile
    poly(ctx,[a,b,P(w.b.i,w.b.j,5),P(w.a.i,w.a.j,5)],'rgba(6,8,13,0.55)');
    ctx.strokeStyle='rgba(10,13,20,0.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(at.x,at.y);ctx.stroke();
    if(w.h===TALL){ctx.strokeStyle=C.led;ctx.globalAlpha=0.7;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y+5);ctx.lineTo(bt.x,bt.y+5);ctx.stroke();ctx.globalAlpha=1;}
   }
   // tampo da parede: faixa clara com fio de luz por cima
   poly(ctx,[at,bt,{x:bt.x,y:bt.y-3},{x:at.x,y:at.y-3}],C.wallCap);
   ctx.strokeStyle='rgba(205,215,232,0.45)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(at.x,at.y-3);ctx.lineTo(bt.x,bt.y-3);ctx.stroke();
   const header=headerAt.get([w.a.i,w.a.j,w.b.i,w.b.j].join(','));if(header)drawHeaderSlice(ctx,header,w);
  }
  /** Tela de parede: apagada e listrada quando não há dado (UNKNOWN); o conteúdo real entra nas fases F2–F5. */
  function drawScreen(ctx,s,content){
   const r=roomById.get(s.room),J=r.tiles.j0,I=r.tiles.i0,bottom=12;
   const pts=s.wall==='i0'?[P(I,s.tiles.to-.15,bottom+s.heightPx),P(I,s.tiles.from+.15,bottom+s.heightPx),P(I,s.tiles.from+.15,bottom),P(I,s.tiles.to-.15,bottom)]:[P(s.tiles.from+0.15,J,bottom+s.heightPx),P(s.tiles.to-0.15,J,bottom+s.heightPx),P(s.tiles.to-0.15,J,bottom),P(s.tiles.from+0.15,J,bottom)];
   poly(ctx,pts,C.screenFrame);const inner=pts.map((p,k)=>({x:p.x+(k===0||k===3?2:-2),y:p.y+(k<2?2:-2)}));poly(ctx,inner,C.screenOff);
   // Conteúdo real desenhado por cima; se a função disser que não há dado (false), a tela volta a ficar apagada.
   if(content&&content(ctx,inner)!==false)return;
   ctx.save();ctx.beginPath();inner.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();ctx.strokeStyle=C.screenStripe;ctx.lineWidth=2;
   const minX=Math.min(...inner.map(p=>p.x)),maxX=Math.max(...inner.map(p=>p.x)),minY=Math.min(...inner.map(p=>p.y)),maxY=Math.max(...inner.map(p=>p.y));
   for(let x=minX-60;x<maxX;x+=6){ctx.beginPath();ctx.moveTo(x,maxY);ctx.lineTo(x+60,minY);ctx.stroke();}ctx.restore();
  }
  /**
   * Móvel: arte do manifesto (public/office2/art/manifesto.json) quando carregada; senão o bloco provisório.
   * A arte cabe na caixa do mapa: largura do losango da área ocupada e altura `h` mais o losango; fica centrada e apoiada
   * no canto da frente. Arte com eixo longo em i ou j é espelhada quando o móvel do mapa corre no outro eixo.
   */
  function drawProp(ctx,p){
   if(p.blocking===false){
    // Peças de chão usam o losango completo; os apoios inferiores de uma peça alta não se aplicam a um tapete.
    const {i,j}=p.tile,{a,b}=p.footprint,pad=.18,pts=[P(i+pad,j+pad),P(i+a-pad,j+pad),P(i+a-pad,j+b-pad),P(i+pad,j+b-pad)];
    ctx.save();poly(ctx,pts,'#b98d52');ctx.clip();
    const art=images?.props?.[p.asset];if(art?.complete&&art.naturalWidth){const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);ctx.drawImage(art,Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));}
    ctx.restore();poly(ctx,pts,null,'#ead7a7');
    poly(ctx,[P(i+.4,j+.4),P(i+a-.4,j+.4),P(i+a-.4,j+b-.4),P(i+.4,j+b-.4)],null,'#ead7a7');return;
   }
   const art=images?.props?.[p.asset],info=images?.propInfo?.[p.asset];
   if(art&&info&&art.complete&&art.naturalWidth){const {i,j}=p.tile,{a,b}=p.footprint;
    const place=iso.propPlacement(p,info,images?.supports?.[p.asset]),{s,flip}=place;
    const cx=place.x,base=place.y,dw=info.width*s,dh=info.height*s;
    // Luz de LED do balcão no chão à frente (decoração).
    if(GLOW_FLOOR.has(p.asset)){const g=ctx.createRadialGradient(cx,base-4,2,cx,base-4,dw*0.6);g.addColorStop(0,'rgba(255,196,110,0.28)');g.addColorStop(1,'rgba(255,196,110,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(cx-dw*0.6,base-4-dw*0.3,dw*1.2,dw*0.6);ctx.restore();}
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(cx,base);if(flip)ctx.scale(-1,1);
    ctx.drawImage(art,place.dx,place.dy,dw,dh);ctx.restore();
    // Monitores ligados, sem conteúdo: só o brilho azulado da tela (decoração; nenhum gráfico inventado).
    if(GLOW_SCREEN.has(p.asset)){const y=base-dh*0.78,g=ctx.createRadialGradient(cx,y,2,cx,y,dw*0.55);g.addColorStop(0,'rgba(95,182,255,0.26)');g.addColorStop(1,'rgba(95,182,255,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(cx-dw*0.55,y-dw*0.3,dw*1.1,dw*0.6);ctx.restore();}
    return;}
   const {i,j}=p.tile,{a,b}=p.footprint,h=p.h,plant=p.asset.startsWith('planta')||p.asset==='jardineira',c=plant?C.plant:C.prop;
   const pad=0.08,i0=i+pad,j0=j+pad,i1=i+a-pad,j1=j+b-pad;
   poly(ctx,[P(i0,j1),P(i1,j1),P(i1,j1,h),P(i0,j1,h)],c.left,C.prop.line);
   poly(ctx,[P(i1,j0),P(i1,j1),P(i1,j1,h),P(i1,j0,h)],c.right,C.prop.line);
   poly(ctx,[P(i0,j0,h),P(i1,j0,h),P(i1,j1,h),P(i0,j1,h)],c.top,C.prop.line);
  }
  /** Agente: quadro da folha atual (pixelScale 0,5), pés no centro do tile; sombra feita por código. */
  function drawAgent(ctx,ag,sheets,charImages){
   const sheet=sheets?.[ag.id],img=charImages?.[ag.id];const feet=P(ag.pos.i+0.5,ag.pos.j+0.5);
   ctx.fillStyle='rgba(8,11,23,0.35)';ctx.beginPath();ctx.ellipse(feet.x,feet.y,9,4,0,0,Math.PI*2);ctx.fill();
   const modern=images?.characters?.[ag.id],frames=images?.characterFrames;
   if(modern?.complete&&modern.naturalWidth&&frames){
    const f=Office2Iso.frameGpt(ag.dir,ag.mode,ag.step),{w,h}=frames.cell,scale=map.projection.personHeightPx/frames.standingHeight;
    ctx.save();ctx.globalAlpha*=ag.dim?0.55:1;ctx.translate(feet.x,feet.y);if(f.flip)ctx.scale(-1,1);ctx.imageSmoothingEnabled=true;
    ctx.drawImage(modern,f.col*w,f.row*h,w,h,-w*scale/2,-h*scale,w*scale,h*scale);ctx.restore();return;
   }
   if(!sheet||!img||!img.complete||!img.naturalWidth)return;
   const f=Office2Iso.frame(ag.dir,ag.mode,ag.step),b=sheet.frames[f.row*6+f.col],ps=sheet.pixelScale??1,scale=map.projection.personHeightPx/(sheet.referenceHeight??b.h);
   const dw=b.w*scale,dh=b.h*scale,dx=feet.x-(b.pivotX-b.x)*scale,dy=feet.y-dh+(ag.mode==='seated'?4:0);
   ctx.save();ctx.globalAlpha*=ag.dim?0.55:1;ctx.drawImage(img,b.x*ps,b.y*ps,b.w*ps,b.h*ps,Math.round(dx),Math.round(dy),Math.round(dw),Math.round(dh));ctx.restore();
  }
  /** Um quadro: cache estático + itens ordenados por profundidade. */
  function draw(ctx,cache,agents,sheets,charImages,screenContent,focus=null,oldCache=null,progress=1){
   const {w,h}=map.projection.scene;ctx.drawImage(cache,0,0,w,cache.worldHeight??h+DROP);if(oldCache){ctx.save();ctx.globalAlpha=1-progress;ctx.drawImage(oldCache,0,0,w,oldCache.worldHeight??h+DROP);ctx.restore();}
   const items=[];
   const seen=[];for(const ag of agents){const f=ag.visual??P(ag.pos.i+.5,ag.pos.j+.5);seen.push({key:iso.depth(ag.pos.i,ag.pos.j)+.3,x0:f.x-16,x1:f.x+16,y0:f.y-52,y1:f.y+6});}
   const covers=(x0,x1,y0,y1,key)=>seen.some(r=>key>r.key&&x1>r.x0&&x0<r.x1&&y1>r.y0&&y0<r.y1);
   for(const wl of wallList){const a=P(wl.a.i,wl.a.j),b=P(wl.b.i,wl.b.j),top=P(wl.a.i,wl.a.j,wl.h).y,bt=P(wl.b.i,wl.b.j,wl.h).y;
    const fade=!wl.glass&&covers(Math.min(a.x,b.x),Math.max(a.x,b.x),Math.min(top,bt),Math.max(a.y,b.y),wl.key);
    items.push({key:wl.key,room:wl.room,wall:true,fade,draw:()=>drawWall(ctx,wl)});}
   for(const pt of postList)items.push({key:pt.i+pt.j-.4,room:pt.room,wall:true,draw:()=>drawPost(ctx,pt)});
   for(const s of map.screens){const r=roomById.get(s.room);items.push({key:(s.tiles.to-1)+(s.wall==='i0'?r.tiles.i0:r.tiles.j0)-0.4,room:s.room,wall:true,draw:()=>drawScreen(ctx,s,screenContent?.[s.id])});}
   // Tapetes ficam no chão, antes de toda a mobília, e não bloqueiam a circulação.
   for(const p of map.props??[])if(p.blocking===false)drawProp(ctx,p);else items.push({key:iso.propDepth(p)+0.1,room:p.room,draw:()=>drawProp(ctx,p)});
   // Cadeiras dos postos são decoração sobre tiles andáveis, com os mesmos apoios das peças normais.
   for(const p of map.points.filter(p=>p.kind==='WORK'))items.push({key:iso.depth(p.tile.i,p.tile.j)+.2,room:p.room,draw:()=>drawProp(ctx,{asset:'cadeira-costas',tile:p.tile,footprint:{a:1,b:1},h:26})});
   for(const ag of agents)items.push({key:iso.depth(ag.pos.i,ag.pos.j)+0.3,room:iso.roomAt(Math.round(ag.pos.i),Math.round(ag.pos.j))?.id,draw:()=>drawAgent(ctx,ag,sheets,charImages)});
   items.sort((x,y)=>x.key-y.key);for(const it of items){if(focus&&it.wall&&it.room!==focus)continue;ctx.save();if(focus&&it.room!==focus)ctx.globalAlpha=.22;if(it.fade)ctx.globalAlpha*=.3;it.draw();ctx.restore();}
  }
  const topY=Math.min(...wallList.map(w=>P(w.a.i,w.a.j,w.h+HEAD).y));
  return {renderStatic,draw,topY,walls:wallList,posts:postList.map(p=>({i:p.i,j:p.j,h:p.h,door:p.door})),signs:signs.map(s=>s.room),backdrop:createBackdrop(images)};
 }
 /**
  * Fundo em tela cheia, em coordenadas de tela: a cidade gerada cobre toda a área (sem faixas pretas), com paralaxe leve.
  * "Vida" decorativa por semente e relógio, nunca dado: janelas da própria arte que apagam e acendem devagar, névoa passando
  * e um avião cruzando o céu de tempos em tempos.
  */
 function createBackdrop(images){
  let lights=null;
  const canvasOf=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
  /** Janelas acesas da arte (pixels quentes e claros), lidas uma vez numa cópia reduzida. */
  function sample(img){
   const cw=316,ch=Math.round(cw*img.naturalHeight/img.naturalWidth),cv=canvasOf(cw,ch),x=cv.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,cw,ch);
   let d;try{d=x.getImageData(0,0,cw,ch).data;}catch{return [];}
   const cand=[];for(let y=0;y<ch;y++)for(let i=0;i<cw;i++){const o=(y*cw+i)*4;if(d[o]>175&&d[o+1]>125&&d[o]>d[o+2]+60)cand.push([(i+0.5)/cw,(y+0.5)/ch]);}
   const rnd=Office2Iso.prng(40),out=[];for(let k=0;k<Math.min(260,cand.length);k++){const p=cand[Math.floor(rnd()*cand.length)];out.push({u:p[0],v:p[1],phase:rnd()*Math.PI*2,period:6+rnd()*18});}
   return out;
  }
  function draw(ctx,W,H,cam,t,dpr,phase='night',transition){
   ctx.setTransform(1,0,0,1,0,0);const sky=images?.skylines?.[phase]??images?.skyline;
   if(!(sky&&sky.complete&&sky.naturalWidth)){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,C.sky[0]);g.addColorStop(0.6,C.sky[1]);g.addColorStop(1,C.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return;}
   // Cobre a tela com 8% de folga; o fundo anda 4% do que a câmera anda (profundidade).
   const s=Math.max(W/sky.naturalWidth,H/sky.naturalHeight)*1.08,dw=sky.naturalWidth*s,dh=sky.naturalHeight*s;
   const px=Math.max(W-dw,Math.min(0,(W-dw)/2+cam.x*dpr*0.04)),py=Math.max(H-dh,Math.min(0,(H-dh)/2+cam.y*dpr*0.04));
   ctx.imageSmoothingEnabled=true;ctx.drawImage(sky,px,py,dw,dh);
   if(transition){const old=images?.skylines?.[transition.from];if(old?.complete&&old.naturalWidth){ctx.globalAlpha=1-transition.progress;ctx.drawImage(old,px,py,dw,dh);ctx.globalAlpha=1;}}
   if(!lights&&images?.skyline?.complete&&images.skyline.naturalWidth)lights=sample(images.skyline);
   const win=Math.max(2,4*s);
   for(const L of phase==='night'?(lights??[]):[]){const k=0.5+0.5*Math.sin(t/1000*2*Math.PI/L.period+L.phase),x=px+L.u*dw-win/2,y=py+L.v*dh-win/2;
    if(k<0.22){ctx.fillStyle=`rgba(12,18,32,${((0.22-k)/0.22*0.9).toFixed(3)})`;ctx.fillRect(x,y,win,win*1.3);}
    else if(k>0.9){ctx.fillStyle=`rgba(255,226,160,${((k-0.9)/0.1*0.6).toFixed(3)})`;ctx.fillRect(x-1,y-1,win+2,win*1.3+2);}}
   // Névoa: três manchas claras atravessando devagar.
   for(let k=0;k<3;k++){const sp=0.006+k*0.003,span=W+W*0.8,x=((t*sp*dpr+k*W*0.6)%span)-W*0.4,y=H*(0.2+k*0.14),r=W*0.32;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(150,176,220,0.07)');g.addColorStop(1,'rgba(150,176,220,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
   // Avião: cruza o alto do céu a cada 50 s, com luz vermelha piscando.
   const cyc=50000,ph=(t%cyc)/cyc;
   if(ph<0.55){const u=ph/0.55,x=-20*dpr+u*(W+40*dpr),y=H*(0.07+u*0.04),z=2*dpr;ctx.fillStyle='rgba(235,240,255,0.9)';ctx.fillRect(x,y,z,z);if(Math.floor(t/600)%2===0){ctx.fillStyle='rgba(255,70,70,0.95)';ctx.fillRect(x-5*dpr,y+dpr,z,z);}}
   // Vinheta: escurece o meio, onde fica o prédio, para a planta se destacar.
   const g=ctx.createRadialGradient(W/2,H*0.55,Math.min(W,H)*0.2,W/2,H*0.55,Math.max(W,H)*0.75);g.addColorStop(0,phase==='night'?'rgba(8,12,24,.24)':'rgba(8,12,24,.08)');g.addColorStop(1,'rgba(8,12,24,.06)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  return {draw};
 }
 globalThis.Office2Scene=Object.freeze({create});
})();
