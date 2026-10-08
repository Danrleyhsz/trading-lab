// Escritório 2.0 (F1): geometria isométrica pura, sem DOM. Projeção 2:1, grade andável, rotas A* que só atravessam
// paredes pelas portas declaradas, ordem de profundidade e escolha de quadro dos personagens.
// Só apresentação: nada aqui lê ou muda estado do backend. Roda no navegador e nos testes (vm).
(() => {
 const DIRS=Object.freeze({SE:{di:1,dj:0},NW:{di:-1,dj:0},SW:{di:0,dj:1},NE:{di:0,dj:-1}});
 /** PRNG determinístico (mulberry32): decoração e passeios cosméticos são iguais a cada carga, nunca sorteio de dado. */
 function prng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 function create(map){
  const W=map.grid.i,H=map.grid.j,{tile,origin}=map.projection,hw=tile.w/2,hh=tile.h/2;
  const project=(i,j,h=0)=>({x:origin.x+(i-j)*hw,y:origin.y+(i+j)*hh-h});
  const unproject=(x,y)=>{const a=(x-origin.x)/hw,b=(y-origin.y)/hh;return {i:(a+b)/2,j:(b-a)/2};};
  const inside=(t,i,j)=>i>=t.i0&&i<t.i1&&j>=t.j0&&j<t.j1;
  const owner=new Array(W*H).fill(null),blocked=new Array(W*H).fill(false),key=(i,j)=>j*W+i,onPlate=(i,j)=>i>=0&&j>=0&&i<W&&j<H;
  for(const r of map.rooms)for(let i=r.tiles.i0;i<r.tiles.i1;i++)for(let j=r.tiles.j0;j<r.tiles.j1;j++)owner[key(i,j)]=r.id;
  for(const p of map.props??[]){if(p.blocking===false)continue;for(let i=p.tile.i;i<p.tile.i+p.footprint.a;i++)for(let j=p.tile.j;j<p.tile.j+p.footprint.b;j++)if(onPlate(i,j))blocked[key(i,j)]=true;}
  // Portas: par (tile interno, tile externo); atravessar a borda de uma sala só por um desses pares.
  const doors=new Set(),doorList=[];
  for(const r of map.rooms)for(const d of r.doors??[]){const t=r.tiles;
   const [a,b]=d.side==='i0'?[[t.i0,d.at],[t.i0-1,d.at]]:d.side==='i1'?[[t.i1-1,d.at],[t.i1,d.at]]:d.side==='j0'?[[d.at,t.j0],[d.at,t.j0-1]]:[[d.at,t.j1-1],[d.at,t.j1]];
   doors.add(a+'|'+b);doors.add(b+'|'+a);doorList.push({room:r.id,side:d.side,inner:{i:a[0],j:a[1]},outer:{i:b[0],j:b[1]}});}
  const roomAt=(i,j)=>onPlate(i,j)?map.rooms.find(r=>r.id===owner[key(i,j)])??null:null;
  const walkable=(i,j)=>onPlate(i,j)&&!blocked[key(i,j)];
  const canStep=(a,b)=>walkable(b.i,b.j)&&(owner[key(a.i,a.j)]===owner[key(b.i,b.j)]||doors.has(a.i+','+a.j+'|'+b.i+','+b.j));
  /** A* em 4 direções; `occupied` são tiles com gente parada. Devolve [] se não há caminho. */
  function plan(from,to,occupied=[]){
   if(!walkable(from.i,from.j)||!walkable(to.i,to.j))return [];
   const busy=new Set(occupied.map(p=>key(p.i,p.j)));busy.delete(key(to.i,to.j));busy.delete(key(from.i,from.j));
   const open=[{i:from.i,j:from.j,g:0,f:Math.abs(to.i-from.i)+Math.abs(to.j-from.j)}],came=new Map(),cost=new Map([[key(from.i,from.j),0]]);
   while(open.length){
    let best=0;for(let k=1;k<open.length;k++)if(open[k].f<open[best].f||(open[k].f===open[best].f&&open[k].g>open[best].g))best=k;
    const cur=open.splice(best,1)[0];
    if(cur.i===to.i&&cur.j===to.j){const path=[{i:cur.i,j:cur.j}];let k=key(cur.i,cur.j);while(came.has(k)){const p=came.get(k);path.unshift({i:p.i,j:p.j});k=key(p.i,p.j);}return path;}
    for(const d of Object.values(DIRS)){const n={i:cur.i+d.di,j:cur.j+d.dj};if(!canStep(cur,n)||busy.has(key(n.i,n.j)))continue;
     const g=cur.g+1,k=key(n.i,n.j);if(g>=(cost.get(k)??Infinity))continue;cost.set(k,g);came.set(k,{i:cur.i,j:cur.j});open.push({...n,g,f:g+Math.abs(to.i-n.i)+Math.abs(to.j-n.j)});}
   }
   return [];
  }
  /** Direção de tela entre dois tiles vizinhos. */
  const direction=(a,b)=>b.i>a.i?'SE':b.i<a.i?'NW':b.j>a.j?'SW':'NE';
  /** Ordem de profundidade: maior soma i+j fica na frente; móveis usam o canto da frente da área ocupada. */
  const depth=(i,j)=>i+j;
  const propDepth=p=>depth(p.tile.i+p.footprint.a-1,p.tile.j+p.footprint.b-1);
  /** Apoios medidos na silhueta: escala uniforme, contatos contidos no piso e margem em todos os lados. */
  function propPlacement(p,info,support){
   const {i,j}=p.tile,{a,b}=p.footprint,flip=p.flip??((info.axis==='i'&&b>a)||(info.axis==='j'&&a>b));
   const center=project(i+a/2,j+b/2),pad=.18;
   if(!support){const s=Math.min((a+b-2*pad)*hw/info.width,(p.h+(a+b)*hh)/info.height);return {s,flip,x:center.x,y:project(i+a-pad,j+b-pad).y,dx:-info.width*s/2,dy:-info.height*s};}
   const A=flip?support.j1-support.j0:support.i1-support.i0,B=flip?support.i1-support.i0:support.j1-support.j0;
   const s=Math.min((a-2*pad)/Math.max(.01,A),(b-2*pad)/Math.max(.01,B),(p.h+(a+b)*hh)/info.height);
   return {s,flip,x:center.x,y:center.y,dx:-support.cx*s,dy:-support.cy*s};
  }
  return {W,H,project,unproject,roomAt,walkable,canStep,plan,direction,depth,propDepth,doors:doorList,
   propPlacement,
   tileAt:(x,y)=>{const t=unproject(x,y),i=Math.floor(t.i),j=Math.floor(t.j);return onPlate(i,j)?{i,j}:null;}};
 }
 /**
  * Quadro da folha atual (6 colunas × 4 linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada,
  * sentado) para a câmera isométrica, até as folhas isométricas chegarem (OFFICE_VISUAL_SPEC.md, seção 9).
  */
 function frame(dir,mode,step=0){
  const front=dir==='SE'||dir==='SW';
  if(mode==='walk')return {row:dir==='SE'?2:dir==='SW'?1:3,col:1+(step%4)};
  if(mode==='seated')return {row:front?0:3,col:5};
  return {row:front?0:3,col:0};
 }
 /** Folha F7: frente SE, costas NE; as duas diagonais à esquerda são espelhadas em torno dos pés. */
 function frameGpt(dir,mode,step=0){return {row:dir==='NE'||dir==='NW'?1:0,col:mode==='walk'?1+(step%4):mode==='seated'?5:0,flip:dir==='SW'||dir==='NW'};}
 /** Enquadra todos os cantos com margens, inclusive ao abrir o painel em uma tela pequena. */
 function fit(bounds,width,height,maxScale=3,pad=24){
  const s=Math.max(.01,Math.min(maxScale,Math.max(1,width-pad*2)/(bounds.x1-bounds.x0),Math.max(1,height-pad*2)/(bounds.y1-bounds.y0)));
  return {s,x:width/2-(bounds.x0+bounds.x1)*s/2,y:height/2-(bounds.y0+bounds.y1)*s/2};
 }
 globalThis.Office2Iso=Object.freeze({create,frame,frameGpt,prng,DIRS,fit});
})();
