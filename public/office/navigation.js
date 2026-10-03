// Original Trading Lab browser geometry. No market, agent-work or persistence capability.
(() => {
 const scene=Object.freeze({width:1852,height:849,asset:'/office/office-reference-v2.png'});
 const layout=Object.freeze({
  'Research Lab':{x:2,y:10,w:30,h:28,floorY:94},'Trading Floor':{x:34,y:10,w:33,h:28,floorY:94},'Risk Desk':{x:69,y:10,w:29,h:28,floorY:94},
  'Quant Lab':{x:2,y:38,w:30,h:29,floorY:98},Lounge:{x:34,y:38,w:33,h:29,floorY:98},'Meeting Room':{x:69,y:38,w:29,h:29,floorY:98}
 });
 const features=[
  {id:'library',room:'Research Lab',label:'Biblioteca de pesquisas',icon:'▤',x:14,y:20,approach:{x:22,y:94}},
  {id:'terminal',room:'Trading Floor',label:'Terminal de mercado',icon:'↗',x:50,y:35,approach:{x:52,y:94}},
  {id:'risk-board',room:'Risk Desk',label:'Quadro de risco',icon:'✓',x:67,y:26,approach:{x:70,y:94}},
  {id:'quant-servers',room:'Quant Lab',label:'Bancada de estudos históricos',icon:'⚗',x:64,y:23,approach:{x:70,y:98}},
  {id:'coffee',room:'Lounge',label:'Café e convivência',icon:'☕',x:86,y:28,approach:{x:90,y:98}},
  {id:'meeting-table',room:'Meeting Room',label:'Mesa de colaboração',icon:'↔',x:49,y:56,approach:{x:52,y:98}}
 ];
 const roomNames=features.map(f=>f.room);
 // Percent coordinates match the approved scene's existing room overlays. Footprint masks,
 // not sprite rectangles: desks/chairs/sofas/cabinets stay outside the allowed floor.
 const maps=Object.fromEntries(roomNames.map(room=>[room,{areas:[{x:8,y:layout[room].floorY-2,w:88,h:2}],obstacles:[]}]));
 const aisle=room=>Object.hasOwn(layout,room)?layout[room].floorY:null;
 const inside=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
 const onGrid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=4&&p.x<=96&&p.y>=4&&p.y<=98&&p.x%2===0&&p.y%2===0;
 function floorContains(room,p){const map=Object.hasOwn(maps,room)?maps[room]:null;return !!map&&!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&map.areas.some(r=>inside(p,r))&&!map.obstacles.some(r=>inside(p,r));}
 function walkable(room,p,occupied=[]){return onGrid(p)&&floorContains(room,p)&&!occupied.some(o=>Math.hypot(p.x-o.x,p.y-o.y)<12);}
 function anchor(room,slot){if(!maps[room]||!Number.isInteger(slot)||slot<0||slot>7)return null;const xs=room==='Lounge'?[52,82,64,42,74,58,90,46]:[22,52,82,14,42,70,32,62],point={x:xs[slot],y:aisle(room)};return walkable(room,point)?point:null;}
 function plan(room,start,goal,occupied=[]){
  if(!walkable(room,start,occupied)||!walkable(room,goal,occupied))return [];
  const key=p=>p.x+','+p.y,queue=[{x:start.x,y:start.y}],parents=new Map([[key(start),null]]);let found=null;
  for(let i=0;i<queue.length&&i<2304;i++){
   const point=queue[i];if(key(point)===key(goal)){found=point;break;}
   for(const [dx,dy] of [[2,0],[0,2],[-2,0],[0,-2]]){const next={x:point.x+dx,y:point.y+dy},id=key(next);if(!parents.has(id)&&walkable(room,next,occupied)){parents.set(id,point);queue.push(next);}}
  }
  if(!found)return [];const path=[];for(let point=found;point;point=parents.get(key(point)))path.push(point);return path.reverse();
 }
 function idleRoute(room,start,id,cycle=0,occupied=[]){
  if(!walkable(room,start,occupied))return [];const seed=[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7),sign=(seed+cycle)%2?1:-1;
  const y=aisle(room),feature=features.find(f=>f.room===room),goals=[{x:start.x+sign*12,y},{x:start.x-sign*12,y},{x:start.x+sign*8,y:y-2},feature?.approach].filter(Boolean);if(cycle%3===2&&feature)goals.unshift(feature.approach);
  for(const goal of goals){const path=plan(room,start,goal,occupied);if(path.length>1)return [...path,...path.slice(0,-1).reverse()];}return [];
 }
 globalThis.OfficeNavigation={scene,layout,aisle,features,roomNames,floorContains,walkable,anchor,plan,idleRoute};
})();
