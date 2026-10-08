// Escritório 2.0 (F1): desenho da cena isométrica em canvas, a partir de public/office2/scene-map.json.
// L0 (cidade) e L1 (pisos) vão para um cache estático; L2 a L5 (paredes, telas, móveis, agentes) são ordenados por
// profundidade a cada quadro. Cidade e móveis usam a arte da F6 quando carregada; o desenho por código fica como reserva.
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
  const screenWalls=new Set(map.screens.map(s=>s.room));
  /** Altura e tipo de cada parede de fundo/frente, pela regra da OFFICE_VISUAL_SPEC.md (seção 4). */
  function wallSpec(room,side){
   const type=room.edges?.[side]??(side==='j0'||side==='i0'?'divisoria-baixa':null);if(!type)return null;
   const plateEdge=(side==='j0'&&room.tiles.j0===0)||(side==='i0'&&room.tiles.i0===0);
   if(type==='guarda-corpo-vidro')return {type,h:RAIL,glass:true};
   if(type==='fachada-vidro')return {type,h:side==='i1'||side==='j1'?RAIL:TALL,glass:true};
   if(type==='divisoria-vidro')return {type,h:GLASS,glass:true};
   if(type==='parede-marca'||plateEdge||(side==='j0'&&screenWalls.has(room.id)))return {type,h:TALL,glass:false};
   return {type,h:LOW,glass:false};
  }
  const doorAt=new Set(iso.doors.map(d=>d.room+':'+d.side+':'+(d.side[0]==='i'?d.inner.j:d.inner.i)));
  /** Segmentos de parede, um por tile de borda, com chave de profundidade (iso.depth da borda − 0,5). */
  const walls=[];
  for(const r of map.rooms)for(const side of ['j0','i0','j1','i1']){const w=wallSpec(r,side);if(!w)continue;const t=r.tiles;
   if(side[0]==='j'){const J=side==='j0'?t.j0:t.j1;for(let i=t.i0;i<t.i1;i++){if(doorAt.has(r.id+':'+side+':'+i))continue;walls.push({...w,a:{i,j:J},b:{i:i+1,j:J},key:i+J-0.5,room:r.id});}}
   else{const I=side==='i0'?t.i0:t.i1;for(let j=t.j0;j<t.j1;j++){if(doorAt.has(r.id+':'+side+':'+j))continue;walls.push({...w,a:{i:I,j},b:{i:I,j:j+1},key:I+j-0.5,room:r.id});}}}
  // Uma borda compartilhada entre duas salas aparece uma vez (a mais alta).
  const uniq=new Map();for(const w of walls){const k=[w.a.i,w.a.j,w.b.i,w.b.j].join(',');const prev=uniq.get(k);if(!prev||w.h>prev.h)uniq.set(k,w);}
  const wallList=[...uniq.values()];
  /**
   * Placas das zonas pintadas na parede de fundo (como na referência): painel escuro de 3+ tiles livres de tela e de porta,
   * com nome grande, subtítulo e emblema. Cada fatia de parede desenha o seu pedaço da placa, na própria profundidade.
   */
  const SIGN_H=70,HEAD=24,signAt=new Map(),headerAt=new Map(),signs=[];
  for(const r of map.rooms){if(r.outdoor||r.module==='PANORAMIC_EDGE'||r.edges?.j0==='parede-marca'||r.id==='elevadores')continue;
   const t=r.tiles,busy=new Set(map.screens.filter(s=>s.room===r.id).flatMap(s=>Array.from({length:s.tiles.to-s.tiles.from},(_,k)=>s.tiles.from+k)));
   const run=(side,lo,hi,blocked)=>{let best=null,start=null;for(let k=lo;k<=hi;k++){const ok=k<hi&&!blocked(k);if(ok&&start===null)start=k;if(!ok&&start!==null){if(!best||k-start>best.to-best.from)best={side,from:start,to:k};start=null;}}return best;};
   const seg=(side,k)=>side==='j0'?[k,t.j0,k+1,t.j0]:[t.i0,k,t.i0,k+1];
   const has=(side,k)=>{const w=uniq.get(seg(side,k).join(','));return !!w&&!w.glass;};
   let pick=run('j0',t.i0,t.i1,k=>busy.has(k)||!has('j0',k));
   if(!pick||pick.to-pick.from<3){const alt=run('i0',t.j0,t.j1,k=>!has('i0',k));if(alt&&alt.to-alt.from>=3&&(!pick||alt.to-alt.from>pick.to-pick.from))pick=alt;}
   if(!pick||pick.to-pick.from<3){
    // Parede de fundo tomada por telas: a placa vira uma faixa iluminada em cima delas (maior trecho sólido da parede j0).
    const band=run('j0',t.i0,t.i1,k=>!has('j0',k));
    if(band&&band.to-band.from>=3&&busy.size){const [title,sub]=String(r.label).split(' · ');const s={room:r.id,side:'j0',from:band.from,to:band.to,line:t.j0,title:title.toUpperCase(),sub:(sub??'').toUpperCase(),header:true};
     signs.push(s);for(let k=s.from;k<s.to;k++)headerAt.set(seg('j0',k).join(','),s);}
    continue;}
   if(pick.to-pick.from>6){const mid=Math.floor((pick.from+pick.to)/2);pick={...pick,from:mid-3,to:mid+3};}
   const [title,sub]=String(r.label).split(' · ');
   const s={room:r.id,module:r.module,side:pick.side,from:pick.from,to:pick.to,line:pick.side==='j0'?t.j0:t.i0,title:title.toUpperCase(),sub:(sub??'').toUpperCase()};
   signs.push(s);for(let k=s.from;k<s.to;k++)signAt.set(seg(s.side,k).join(','),s);}
  /** Ponto da placa: u ao longo da parede (0 = começo da leitura), z = altura. j0 lê ao longo de +i; i0 lê subindo (de j1 para j0). */
  const signPoint=(s,u,z)=>s.side==='j0'?P(s.from+u,s.line,z):P(s.line,s.to-u,z);
  /** Faixa de placa em cima das telas: de TALL até TALL+HEAD, texto numa linha só ("HORIZON · INTELIGÊNCIA DE MERCADO"). */
  function drawHeaderSlice(ctx,s,w){
   const z0=TALL,z1=TALL+HEAD,a=P(w.a.i,w.a.j,z0),b=P(w.b.i,w.b.j,z0),bt=P(w.b.i,w.b.j,z1),at=P(w.a.i,w.a.j,z1);
   ctx.save();poly(ctx,[a,b,bt,at],'#141924');ctx.beginPath();[a,b,bt,at].forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
   const o=P(s.from,s.line,z1),e=P(s.from+1,s.line,z1),ux=(e.x-o.x)/26.833,uy=(e.y-o.y)/26.833,L=(s.to-s.from)*26.833;
   ctx.transform(ux,uy,0,1,o.x,o.y);ctx.fillStyle='rgba(255,210,122,0.85)';ctx.fillRect(4,HEAD-2,L-8,1);
   const emblem=images?.emblems?.[s.room];let x0=8;if(emblem&&emblem.complete&&emblem.naturalWidth){ctx.imageSmoothingEnabled=true;ctx.drawImage(emblem,x0,3,16,16);x0+=22;}
   const txt=s.title+(s.sub?'  ·  '+s.sub:'');let f=13;ctx.font=`800 ${f}px "Segoe UI",system-ui,sans-serif`;while(f>7&&(ctx.measureText(txt)?.width??0)>L-x0-8){f-=1;ctx.font=`800 ${f}px "Segoe UI",system-ui,sans-serif`;}
   ctx.fillStyle='#f4f7ff';ctx.shadowColor='rgba(220,235,255,0.5)';ctx.shadowBlur=5;ctx.textBaseline='middle';ctx.fillText(txt,x0,HEAD/2);ctx.restore();
   ctx.strokeStyle='#0c0f16';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.stroke();
  }
  function drawSignSlice(ctx,s,w){
   const len=s.to-s.from,a=P(w.a.i,w.a.j),b=P(w.b.i,w.b.j),at=P(w.a.i,w.a.j,SIGN_H),bt=P(w.b.i,w.b.j,SIGN_H);
   ctx.save();ctx.beginPath();[a,b,bt,at].forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
   poly(ctx,[a,b,bt,at],'#141924');
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
  /** Fachada de vidro do prédio abaixo da planta: um andar a cada 46 px, um painel por tile, janelas acesas por semente (decoração). */
  function drawFacade(ctx,left,bottom,right,depth){
   const FH=46,face=(a,b,n,base,seed,shade)=>{
    const quad=[a,b,{x:b.x,y:b.y+depth},{x:a.x,y:a.y+depth}];poly(ctx,quad,base);const rnd=Office2Iso.prng(seed);
    for(let f=0;f*FH<depth;f++){const y0=12+f*FH,busy=rnd(),panes=n*3;
     ctx.strokeStyle='#2a3142';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y+y0);ctx.lineTo(b.x,b.y+y0);ctx.stroke();
     // Três vidraças por tile; cada andar tem sua própria taxa de luzes acesas (andares de escritório cheios, outros vazios).
     for(let k=0;k<panes;k++){const u0=(k+0.14)/panes,u1=(k+0.86)/panes,x0=a.x+(b.x-a.x)*u0,x1=a.x+(b.x-a.x)*u1,ya=a.y+(b.y-a.y)*u0+y0,yb=a.y+(b.y-a.y)*u1+y0,r=rnd();
      const fill=r<busy*0.55?`rgba(255,${200+Math.floor(rnd()*22)},${120+Math.floor(rnd()*40)},${(0.45+rnd()*0.4).toFixed(2)})`:r<busy*0.55+0.08?'rgba(159,196,232,0.28)':shade?'#0d1526':'#122038';
      poly(ctx,[{x:x0,y:ya+6},{x:x1,y:yb+6},{x:x1,y:yb+FH-8},{x:x0,y:ya+FH-8}],fill);}}
    // Reflexo do céu no topo do vidro e escuridão para baixo (o chão da rua some na névoa).
    const top=Math.min(a.y,b.y),g=ctx.createLinearGradient(0,top,0,top+depth);g.addColorStop(0,'rgba(120,150,200,0.10)');g.addColorStop(0.35,'rgba(8,12,24,0.15)');g.addColorStop(1,'rgba(8,12,24,0.9)');poly(ctx,quad,g);
    if(shade)poly(ctx,quad,'rgba(4,8,16,0.28)');
   };
   face(left,bottom,iso.W,'#0f192c',32,false);face(bottom,right,iso.H,'#0b1322',33,true);
   // Quina do prédio e borda da laje do 30º andar com LED quente.
   ctx.strokeStyle='rgba(159,196,232,0.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bottom.x,bottom.y);ctx.lineTo(bottom.x,bottom.y+depth);ctx.stroke();
   poly(ctx,[left,bottom,{x:bottom.x,y:bottom.y+10},{x:left.x,y:left.y+10}],C.slabEdge);poly(ctx,[bottom,right,{x:right.x,y:right.y+10},{x:bottom.x,y:bottom.y+10}],'#222a3d');
   ctx.strokeStyle='rgba(255,210,122,0.85)';ctx.beginPath();ctx.moveTo(left.x,left.y+9);ctx.lineTo(bottom.x,bottom.y+9);ctx.lineTo(right.x,right.y+9);ctx.stroke();
  }
  /** Cache estático em 2×: fachada, pisos e luz do teto. O céu e a cidade são o fundo em tela cheia (backdrop). */
  function renderStatic(scale=2){
   const {w,h}=map.projection.scene,H2=h+DROP,cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w*scale,H2*scale):Object.assign(document.createElement('canvas'),{width:w*scale,height:H2*scale});
   const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.scale(scale,scale);
   const W=iso.W,H=iso.H,left=P(0,H),bottom=P(W,H),right=P(W,0);
   drawFacade(ctx,left,bottom,right,H2-bottom.y+20);
   // L1: pisos por material; tiles fora das salas são circulação (piso claro).
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){const r=iso.roomAt(i,j),mat=C.floor[r?.floor??'piso-claro']??C.floor['piso-claro'];
    const pts=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)];poly(ctx,pts,mat[0]);
    ctx.strokeStyle=mat[1];ctx.lineWidth=0.75;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.stroke();
    if(r?.floor==='madeira'||r?.floor==='deck'){for(const f of [0.33,0.66]){const a=P(i,j+f),b=P(i+1,j+f);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
   // Subzonas com cor de destaque na borda (Anel de decisão × Execução paper).
   for(const r of map.rooms)for(const s of r.subzones??[]){const t=s.tiles;ctx.globalAlpha=0.9;poly(ctx,[P(t.i0,t.j0),P(t.i1,t.j0),P(t.i1,t.j1),P(t.i0,t.j1)],null,s.accent);ctx.globalAlpha=1;}
   // Piso claro polido: meia-luz na metade de cima de cada placa e um reflexo diagonal largo (decoração).
   ctx.globalCompositeOperation='lighter';
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){const r=iso.roomAt(i,j);if((r?.floor??'piso-claro')!=='piso-claro')continue;
    poly(ctx,[P(i,j),P(i+1,j),P(i+0.5,j+0.5)],'rgba(255,240,215,0.07)');}
   for(let k=0;k<5;k++){const a=P(4+k*6,0),b=P(4+k*6,H);const g=ctx.createLinearGradient(a.x-30,a.y,a.x+30,a.y);g.addColorStop(0,'rgba(255,245,230,0)');g.addColorStop(0.5,'rgba(255,245,230,0.035)');g.addColorStop(1,'rgba(255,245,230,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(a.x-30,a.y);ctx.lineTo(a.x+30,a.y);ctx.lineTo(b.x+30,b.y);ctx.lineTo(b.x-30,b.y);ctx.closePath();ctx.fill();}
   // Luz quente do teto: uma poça de luz por sala coberta (decoração; deixa o andar com cara de noite iluminada).
   for(const r of map.rooms){if(r.outdoor)continue;const t=r.tiles,c=P((t.i0+t.i1)/2,(t.j0+t.j1)/2),rx=((t.i1-t.i0)+(t.j1-t.j0))*12;
    const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,rx);g.addColorStop(0,'rgba(255,186,110,0.20)');g.addColorStop(0.6,'rgba(255,186,110,0.07)');g.addColorStop(1,'rgba(255,186,110,0)');
    ctx.save();ctx.translate(c.x,c.y);ctx.scale(1,0.5);ctx.translate(-c.x,-c.y);ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,rx,0,Math.PI*2);ctx.fill();ctx.restore();}
   ctx.globalCompositeOperation='source-over';
   return cv;
  }
  function drawWall(ctx,w){
   const a=P(w.a.i,w.a.j),b=P(w.b.i,w.b.j),at=P(w.a.i,w.a.j,w.h),bt=P(w.b.i,w.b.j,w.h);
   if(w.glass){poly(ctx,[a,b,bt,at],C.glass);ctx.strokeStyle=C.glassLine;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.stroke();
    // Moldura preta: montante no começo de cada vidraça e corrimão/travessa por cima (como a referência).
    ctx.strokeStyle='#0d1118';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(at.x,at.y-1);ctx.stroke();
    ctx.lineWidth=w.h===RAIL?2.2:1.6;ctx.beginPath();ctx.moveTo(at.x,at.y-1);ctx.lineTo(bt.x,bt.y-1);ctx.stroke();
    if(w.h===RAIL){ctx.strokeStyle='rgba(255,210,122,0.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y-1);ctx.lineTo(b.x,b.y-1);ctx.stroke();}return;}
   const sign=signAt.get([w.a.i,w.a.j,w.b.i,w.b.j].join(','));
   if(sign){drawSignSlice(ctx,sign,w);return;}
   poly(ctx,[a,b,bt,at],w.a.j===w.b.j?C.wall:C.wallSide);poly(ctx,[at,bt,{x:bt.x,y:bt.y-3},{x:at.x,y:at.y-3}],C.wallCap);
   // Junta entre painéis a cada tile.
   ctx.strokeStyle='rgba(10,13,20,0.55)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(at.x,at.y);ctx.stroke();
   if(w.h===TALL){ctx.strokeStyle=C.led;ctx.globalAlpha=0.7;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y+5);ctx.lineTo(bt.x,bt.y+5);ctx.stroke();ctx.globalAlpha=1;}
   const header=headerAt.get([w.a.i,w.a.j,w.b.i,w.b.j].join(','));if(header)drawHeaderSlice(ctx,header,w);
  }
  /** Tela de parede: apagada e listrada quando não há dado (UNKNOWN); o conteúdo real entra nas fases F2–F5. */
  function drawScreen(ctx,s,content){
   const r=roomById.get(s.room),J=r.tiles.j0,bottom=12;
   const pts=[P(s.tiles.from+0.15,J,bottom+s.heightPx),P(s.tiles.to-0.15,J,bottom+s.heightPx),P(s.tiles.to-0.15,J,bottom),P(s.tiles.from+0.15,J,bottom)];
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
   const art=images?.props?.[p.asset],info=images?.propInfo?.[p.asset];
   if(art&&info&&art.complete&&art.naturalWidth){const {i,j}=p.tile,{a,b}=p.footprint;
    const boxW=(a+b)*24,boxH=p.h+(a+b)*12,s=Math.min(boxW/info.width,boxH/info.height);
    const cx=(P(i,j+b).x+P(i+a,j).x)/2,base=P(i+a,j+b).y+2,dw=info.width*s,dh=info.height*s;
    const flip=(info.axis==='i'&&b>a)||(info.axis==='j'&&a>b);
    // Luz de LED do balcão no chão à frente (decoração).
    if(GLOW_FLOOR.has(p.asset)){const g=ctx.createRadialGradient(cx,base-4,2,cx,base-4,dw*0.6);g.addColorStop(0,'rgba(255,196,110,0.28)');g.addColorStop(1,'rgba(255,196,110,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(cx-dw*0.6,base-4-dw*0.3,dw*1.2,dw*0.6);ctx.restore();}
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(Math.round(cx),Math.round(base));if(flip)ctx.scale(-1,1);
    ctx.drawImage(art,-dw/2,-dh,dw,dh);ctx.restore();
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
   if(!sheet||!img||!img.complete||!img.naturalWidth)return;
   const f=Office2Iso.frame(ag.dir,ag.mode,ag.step),b=sheet.frames[f.row*6+f.col],ps=sheet.pixelScale??1,scale=map.projection.personHeightPx/(sheet.referenceHeight??b.h);
   const dw=b.w*scale,dh=b.h*scale,dx=feet.x-(b.pivotX-b.x)*scale,dy=feet.y-dh+(ag.mode==='seated'?4:0);
   ctx.globalAlpha=ag.dim?0.55:1;ctx.drawImage(img,b.x*ps,b.y*ps,b.w*ps,b.h*ps,Math.round(dx),Math.round(dy),Math.round(dw),Math.round(dh));ctx.globalAlpha=1;
  }
  /** Um quadro: cache estático + itens ordenados por profundidade. */
  function draw(ctx,cache,agents,sheets,charImages,screenContent){
   const {w,h}=map.projection.scene;ctx.drawImage(cache,0,0,w,h+DROP);
   const items=[];
   for(const wl of wallList)items.push({key:wl.key,draw:()=>drawWall(ctx,wl)});
   for(const s of map.screens){const r=roomById.get(s.room);items.push({key:(s.tiles.to-1)+r.tiles.j0-0.4,draw:()=>drawScreen(ctx,s,screenContent?.[s.id])});}
   for(const p of map.props??[])items.push({key:iso.propDepth(p)+0.1,draw:()=>drawProp(ctx,p)});
   for(const ag of agents)items.push({key:iso.depth(ag.pos.i,ag.pos.j)+0.3,draw:()=>drawAgent(ctx,ag,sheets,charImages)});
   items.sort((x,y)=>x.key-y.key);for(const it of items)it.draw();
  }
  return {renderStatic,draw,walls:wallList,signs:signs.map(s=>s.room),backdrop:createBackdrop(images)};
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
  function draw(ctx,W,H,cam,t,dpr){
   ctx.setTransform(1,0,0,1,0,0);const sky=images?.skyline;
   if(!(sky&&sky.complete&&sky.naturalWidth)){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,C.sky[0]);g.addColorStop(0.6,C.sky[1]);g.addColorStop(1,C.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return;}
   // Cobre a tela com 8% de folga; o fundo anda 4% do que a câmera anda (profundidade).
   const s=Math.max(W/sky.naturalWidth,H/sky.naturalHeight)*1.08,dw=sky.naturalWidth*s,dh=sky.naturalHeight*s;
   const px=Math.max(W-dw,Math.min(0,(W-dw)/2+cam.x*dpr*0.04)),py=Math.max(H-dh,Math.min(0,(H-dh)/2+cam.y*dpr*0.04));
   ctx.imageSmoothingEnabled=true;ctx.drawImage(sky,px,py,dw,dh);
   if(!lights)lights=sample(sky);
   const win=Math.max(2,4*s);
   for(const L of lights){const k=0.5+0.5*Math.sin(t/1000*2*Math.PI/L.period+L.phase),x=px+L.u*dw-win/2,y=py+L.v*dh-win/2;
    if(k<0.22){ctx.fillStyle=`rgba(12,18,32,${((0.22-k)/0.22*0.9).toFixed(3)})`;ctx.fillRect(x,y,win,win*1.3);}
    else if(k>0.9){ctx.fillStyle=`rgba(255,226,160,${((k-0.9)/0.1*0.6).toFixed(3)})`;ctx.fillRect(x-1,y-1,win+2,win*1.3+2);}}
   // Névoa: três manchas claras atravessando devagar.
   for(let k=0;k<3;k++){const sp=0.006+k*0.003,span=W+W*0.8,x=((t*sp*dpr+k*W*0.6)%span)-W*0.4,y=H*(0.2+k*0.14),r=W*0.32;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(150,176,220,0.07)');g.addColorStop(1,'rgba(150,176,220,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
   // Avião: cruza o alto do céu a cada 50 s, com luz vermelha piscando.
   const cyc=50000,ph=(t%cyc)/cyc;
   if(ph<0.55){const u=ph/0.55,x=-20*dpr+u*(W+40*dpr),y=H*(0.07+u*0.04),z=2*dpr;ctx.fillStyle='rgba(235,240,255,0.9)';ctx.fillRect(x,y,z,z);if(Math.floor(t/600)%2===0){ctx.fillStyle='rgba(255,70,70,0.95)';ctx.fillRect(x-5*dpr,y+dpr,z,z);}}
   // Vinheta: escurece o meio, onde fica o prédio, para a planta se destacar.
   const g=ctx.createRadialGradient(W/2,H*0.55,Math.min(W,H)*0.2,W/2,H*0.55,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(8,12,24,0.45)');g.addColorStop(1,'rgba(8,12,24,0.12)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  return {draw};
 }
 globalThis.Office2Scene=Object.freeze({create});
})();
