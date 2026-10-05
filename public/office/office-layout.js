// Ajustes de posição de cadeiras e destinos feitos no editor do mapa (ideia do pixel-agents: assentos e áreas como dado).
// Ficam só no navegador (localStorage) e são lidos ANTES de workstations.js e life.js montarem os catálogos.
// Só apresentação: nada vai para o servidor e nada muda trabalho, mensagens ou piloto.
(() => {
 const KEY='trading-lab.office-layout.v1',W=1852,H=849,MAX_SHIFT=400;
 const ok=p=>p&&typeof p==='object'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=W&&p.y<=H;
 /** Lê e valida: ids desconhecidos, números inválidos, fora da cena ou deslocamentos enormes são ignorados. */
 function read(){
  try{
   const raw=JSON.parse(globalThis.localStorage?.getItem(KEY)??'null');if(!raw||raw.version!==1)return {seats:{},places:{}};
   const pick=o=>Object.fromEntries(Object.entries(o&&typeof o==='object'?o:{}).filter(([id,p])=>/^[a-z-]{1,40}$/.test(id)&&ok(p)).map(([id,p])=>[id,{x:Math.round(p.x),y:Math.round(p.y)}]));
   return {seats:pick(raw.seats),places:pick(raw.places)};
  }catch{return {seats:{},places:{}};}
 }
 const current=read();
 /** Assento com o ajuste aplicado: cadeira (recorte), monitor e ponto andam juntos pelo mesmo deslocamento. */
 function seat(s){
  const o=current.seats[s.id];if(!o)return s;const dx=o.x-s.x,dy=o.y-s.y;if(Math.hypot(dx,dy)>MAX_SHIFT)return s;
  return {...s,x:o.x,y:o.y,mx:s.mx+dx,my:s.my+dy,cx:s.cx+dx,cy:s.cy+dy,moved:true};
 }
 /** Destino com o ajuste aplicado: o ponto final passa a ser o arrastado; a entrada no corredor segue o mesmo x. */
 function place(p){const o=current.places[p.id];if(!o)return p;return {...p,x:o.x,to:{x:o.x,y:o.y},moved:true};}
 function save(layout){const data={version:1,seats:layout.seats??{},places:layout.places??{},savedAt:new Date().toISOString()};try{globalThis.localStorage?.setItem(KEY,JSON.stringify(data));}catch{}return data;}
 function reset(){try{globalThis.localStorage?.removeItem(KEY);}catch{}}
 globalThis.OfficeLayout=Object.freeze({KEY,read,seat,place,save,reset,current:()=>JSON.parse(JSON.stringify(current))});
})();
