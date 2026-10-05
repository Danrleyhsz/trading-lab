// Mapa de piso do escritório em grade (ideia do pixel-agents: piso, assentos e áreas editáveis em JSON).
// Cada célula de 8 px da cena é "andável" ou não. Os personagens procuram caminho (A*, só na horizontal e na
// vertical) por células andáveis. O mapa padrão é gerado dos corredores autorizados (life.js); o editor
// (map-editor.js) permite pintar mais piso e salva no navegador. Só apresentação: nada vai para o servidor.
(() => {
 const W=1852,H=849,CELL=8,COLS=Math.ceil(W/CELL),ROWS=Math.ceil(H/CELL),KEY='trading-lab.office-map.v1';
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const cellOf=p=>({c:clamp(Math.floor(p.x/CELL),0,COLS-1),r:clamp(Math.floor(p.y/CELL),0,ROWS-1)});
 const center=(c,r)=>({x:c*CELL+CELL/2,y:r*CELL+CELL/2});
 const index=(c,r)=>r*COLS+c;
 /** Piso padrão: exatamente os corredores, passagens, trechos finais dos destinos e ligações das cadeiras. */
 function defaultGrid(){
  const g=new Uint8Array(COLS*ROWS),L=globalThis.OfficeLife;if(!L)return g;
  const hline=(r,c0,c1)=>{for(let c=Math.min(c0,c1);c<=Math.max(c0,c1);c++)g[index(c,r)]=1;};
  const vline=(c,r0,r1)=>{for(let r=Math.min(r0,r1);r<=Math.max(r0,r1);r++)g[index(c,r)]=1;};
  const laneRow=id=>cellOf({x:0,y:L.lanes[id].y}).r;
  for(const [id,lane] of Object.entries(L.lanes))hline(laneRow(id),cellOf({x:lane.from,y:0}).c,cellOf({x:lane.to,y:0}).c);
  for(const p of L.passages)vline(cellOf({x:p.x,y:0}).c,laneRow(p.a),laneRow(p.b));
  for(const place of L.places)if(place.to){const a=cellOf({x:place.x,y:L.lanes[place.lane].y}),b=cellOf(place.to);vline(a.c,a.r,b.r);hline(b.r,a.c,b.c);}
  for(const seat of globalThis.OfficeWorkstations?.catalog??[]){const s=cellOf(seat),lane=Object.keys(L.lanes).reduce((best,id)=>Math.abs(L.lanes[id].y-seat.y)<Math.abs(L.lanes[best].y-seat.y)?id:best,'r1');vline(s.c,s.r,laneRow(lane));}
  return g;
 }
 // Codificação compacta: 1 bit por célula, em base64 (cerca de 4 KB).
 function encode(g){let s='';for(let i=0;i<g.length;i+=8){let byte=0;for(let b=0;b<8;b++)byte|=(g[i+b]?1:0)<<b;s+=String.fromCharCode(byte);}return btoa(s);}
 function decode(text){const bin=atob(text),g=new Uint8Array(COLS*ROWS);for(let i=0;i<g.length;i++)g[i]=(bin.charCodeAt(i>>3)>>(i&7))&1;return g;}
 let cached=null;
 function current(){
  if(cached)return cached;
  try{const saved=JSON.parse(globalThis.localStorage?.getItem(KEY)??'null');if(saved&&saved.version===1&&saved.cell===CELL&&saved.cols===COLS&&saved.rows===ROWS&&typeof saved.grid==='string'){cached={grid:decode(saved.grid),source:'navegador'};return cached;}}catch{}
  cached={grid:defaultGrid(),source:'padrão'};return cached;
 }
 function save(grid){const data={version:1,cell:CELL,cols:COLS,rows:ROWS,grid:encode(grid),savedAt:new Date().toISOString()};try{globalThis.localStorage?.setItem(KEY,JSON.stringify(data));}catch{}cached={grid,source:'navegador'};return data;}
 function reset(){try{globalThis.localStorage?.removeItem(KEY);}catch{}cached=null;return current();}
 /** Célula andável mais próxima (até 3 células), para encaixar cadeiras e destinos que caem na borda. */
 function snap(g,p){const s=cellOf(p);for(let d=0;d<=3;d++)for(let dr=-d;dr<=d;dr++)for(let dc=-d;dc<=d;dc++){const c=s.c+dc,r=s.r+dr;if(c>=0&&r>=0&&c<COLS&&r<ROWS&&g[index(c,r)])return {c,r};}return null;}
 /** Caminho A* (4 vizinhos) de `from` até `to`. Devolve pontos nas curvas, começando e terminando nos pontos exatos. */
 function route(from,to,g=current().grid){
  const a=snap(g,from),b=snap(g,to);if(!a||!b)return [];
  const start=index(a.c,a.r),goal=index(b.c,b.r),came=new Int32Array(COLS*ROWS).fill(-1),cost=new Float64Array(COLS*ROWS).fill(Infinity);
  const h=i=>Math.abs((i%COLS)-b.c)+Math.abs(Math.floor(i/COLS)-b.r);
  const open=[[h(start),start]];cost[start]=0;came[start]=start;
  while(open.length){
   let best=0;for(let i=1;i<open.length;i++)if(open[i][0]<open[best][0])best=i;const [,cur]=open.splice(best,1)[0];
   if(cur===goal)break;const c=cur%COLS,r=Math.floor(cur/COLS);
   for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr;if(nc<0||nr<0||nc>=COLS||nr>=ROWS)continue;const n=index(nc,nr);if(!g[n])continue;
    // Pequena penalidade em curva: caminhos com menos esquinas parecem mais naturais.
    const prev=came[cur]===cur?null:came[cur],turn=prev!==null&&((cur-prev)!==(n-cur))?0.4:0;const next=cost[cur]+1+turn;
    if(next<cost[n]){cost[n]=next;came[n]=cur;open.push([next+h(n),n]);}}
  }
  if(came[goal]<0)return [];
  const cells=[];for(let i=goal;;i=came[i]){cells.push(i);if(i===start)break;}cells.reverse();
  const pts=cells.map(i=>center(i%COLS,Math.floor(i/COLS)));
  const corners=pts.filter((p,i)=>i===0||i===pts.length-1||!((pts[i-1].x===p.x&&pts[i+1].x===p.x)||(pts[i-1].y===p.y&&pts[i+1].y===p.y)));
  return [{x:from.x,y:from.y},...corners,{x:to.x,y:to.y}].filter((p,i,arr)=>i===0||p.x!==arr[i-1].x||p.y!==arr[i-1].y);
 }
 globalThis.OfficeMap=Object.freeze({scene:{width:W,height:H},CELL,COLS,ROWS,KEY,cellOf,center,defaultGrid,current,save,reset,route,encode,decode,invalidate:()=>{cached=null;}});
})();
