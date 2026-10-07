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
 const TALL=72,LOW=24,RAIL=30,GLASS=48;
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
  /** Cache estático (L0 + L1) em 2× da cena lógica. */
  function renderStatic(scale=2){
   const {w,h}=map.projection.scene,cv=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w*scale,h*scale):Object.assign(document.createElement('canvas'),{width:w*scale,height:h*scale});
   const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.scale(scale,scale);
   // L0 provisório: céu e prédios por código, com janelas fixas por semente (decoração, não dado).
   const sky=images?.skyline;
   if(sky&&sky.complete&&sky.naturalWidth){
    // Arte gerada (proporção 3:2): cobre a cena 16:9 sem distorcer, alinhada embaixo (o céu de cima pode ser cortado).
    const s=Math.max(w/sky.naturalWidth,h/sky.naturalHeight),dw=sky.naturalWidth*s,dh=sky.naturalHeight*s;
    ctx.imageSmoothingEnabled=true;ctx.drawImage(sky,(w-dw)/2,h-dh,dw,dh);ctx.imageSmoothingEnabled=false;
    // Escurece o centro por código, onde fica o prédio, para a planta se destacar (a arte vem uniforme de propósito).
    const g=ctx.createRadialGradient(w/2,h*0.55,h*0.15,w/2,h*0.55,w*0.62);g.addColorStop(0,'rgba(8,12,24,0.55)');g.addColorStop(1,'rgba(8,12,24,0.08)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   }else{
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,C.sky[0]);g.addColorStop(0.6,C.sky[1]);g.addColorStop(1,C.sky[2]);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const rnd=Office2Iso.prng(30);
    for(let x=-20;x<w;x+=18+Math.floor(rnd()*26)){const bw=16+Math.floor(rnd()*34),top=120+Math.floor(rnd()*420);ctx.fillStyle=rnd()<0.5?'#101a30':'#0d1528';ctx.fillRect(x,top,bw,h-top);
     for(let y=top+6;y<h;y+=7)for(let wx=x+3;wx<x+bw-3;wx+=5)if(rnd()<0.33){ctx.fillStyle=rnd()<0.85?C.window:'#9fc4e8';ctx.fillRect(wx,y,2,3);}}
   }
   // Laje e fachada do prédio caindo abaixo da planta.
   const W=iso.W,H=iso.H,left=P(0,H),bottom=P(W,H),right=P(W,0);
   poly(ctx,[left,bottom,right,{x:right.x,y:h},{x:left.x,y:h}],C.slab);
   const rnd2=Office2Iso.prng(31);for(let k=0;k<420;k++){const t=rnd2(),onLeft=t<0.5,u=onLeft?t*2:(t-0.5)*2;const a=onLeft?left:bottom,b=onLeft?bottom:right;const x=a.x+(b.x-a.x)*u,y0=a.y+(b.y-a.y)*u+14+rnd2()*(h-a.y);if(y0<h&&rnd2()<0.5){ctx.fillStyle=rnd2()<0.8?'rgba(255,207,106,0.75)':'rgba(159,196,232,0.5)';ctx.fillRect(Math.round(x),Math.round(y0),2,3);}}
   poly(ctx,[left,bottom,{x:bottom.x,y:bottom.y+10},{x:left.x,y:left.y+10}],C.slabEdge);poly(ctx,[bottom,right,{x:right.x,y:right.y+10},{x:bottom.x,y:bottom.y+10}],'#222a3d');
   // L1: pisos por material; tiles fora das salas são circulação (piso claro).
   for(let i=0;i<W;i++)for(let j=0;j<H;j++){const r=iso.roomAt(i,j),mat=C.floor[r?.floor??'piso-claro']??C.floor['piso-claro'];
    const pts=[P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1)];poly(ctx,pts,mat[0]);
    ctx.strokeStyle=mat[1];ctx.lineWidth=0.75;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.stroke();
    if(r?.floor==='madeira'||r?.floor==='deck'){for(const f of [0.33,0.66]){const a=P(i,j+f),b=P(i+1,j+f);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
   // Subzonas com cor de destaque na borda (Anel de decisão × Execução paper).
   for(const r of map.rooms)for(const s of r.subzones??[]){const t=s.tiles;ctx.globalAlpha=0.9;poly(ctx,[P(t.i0,t.j0),P(t.i1,t.j0),P(t.i1,t.j1),P(t.i0,t.j1)],null,s.accent);ctx.globalAlpha=1;}
   return cv;
  }
  function drawWall(ctx,w){
   const a=P(w.a.i,w.a.j),b=P(w.b.i,w.b.j),at=P(w.a.i,w.a.j,w.h),bt=P(w.b.i,w.b.j,w.h);
   if(w.glass){poly(ctx,[a,b,bt,at],C.glass);ctx.strokeStyle=C.glassLine;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y);ctx.lineTo(bt.x,bt.y);ctx.stroke();
    if(w.h===RAIL){ctx.strokeStyle='rgba(255,210,122,0.55)';ctx.beginPath();ctx.moveTo(a.x,a.y-1);ctx.lineTo(b.x,b.y-1);ctx.stroke();}return;}
   poly(ctx,[a,b,bt,at],w.a.j===w.b.j?C.wall:C.wallSide);poly(ctx,[at,bt,{x:bt.x,y:bt.y-3},{x:at.x,y:at.y-3}],C.wallCap);
   if(w.h===TALL){ctx.strokeStyle=C.led;ctx.globalAlpha=0.7;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(at.x,at.y+5);ctx.lineTo(bt.x,bt.y+5);ctx.stroke();ctx.globalAlpha=1;}
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
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.translate(Math.round(cx),Math.round(base));if(flip)ctx.scale(-1,1);
    ctx.drawImage(art,-dw/2,-dh,dw,dh);ctx.restore();return;}
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
   const {w,h}=map.projection.scene;ctx.drawImage(cache,0,0,w,h);
   const items=[];
   for(const wl of wallList)items.push({key:wl.key,draw:()=>drawWall(ctx,wl)});
   for(const s of map.screens){const r=roomById.get(s.room);items.push({key:(s.tiles.to-1)+r.tiles.j0-0.4,draw:()=>drawScreen(ctx,s,screenContent?.[s.id])});}
   for(const p of map.props??[])items.push({key:iso.propDepth(p)+0.1,draw:()=>drawProp(ctx,p)});
   for(const ag of agents)items.push({key:iso.depth(ag.pos.i,ag.pos.j)+0.3,draw:()=>drawAgent(ctx,ag,sheets,charImages)});
   items.sort((x,y)=>x.key-y.key);for(const it of items)it.draw();
  }
  return {renderStatic,draw,walls:wallList};
 }
 globalThis.Office2Scene=Object.freeze({create});
})();
