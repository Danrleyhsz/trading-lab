// Original Trading Lab presentation code. Cosmetic motion has no backend capability.
(() => {
 const rooms=new Set(['Research Lab','Trading Floor','Risk Desk','Quant Lab','Lounge','Meeting Room']);
 const hash=id=>[...id].reduce((sum,c)=>sum*31+c.charCodeAt(0),7)>>>0;
 function floorPoint(room,slot){
  if(!rooms.has(room))return null;
  const x=room==='Lounge'?[51,83,65,43,74,59,89,47]:[22,53,83,14,42,70,33,63];
  return {x:x[slot%8],y:88+(slot>2?3:0)};
 }
 function idlePath(room,slot,id,width,height){
  const point=floorPoint(room,slot);if(!point||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
  // Authored front-floor lanes stay below desks/chairs and inside the actual room.
  const direction=hash(id)%2?1:-1,dx=direction*width*0.04,dy=height*0.012;
  return [{x:0,y:0},{x:dx,y:dy},{x:dx,y:dy},{x:0,y:0}];
 }
 class Director {
  constructor(allowed){this.allowed=allowed;}
  stop(entry){entry.generation=(entry.generation||0)+1;if(entry.timer!==undefined)clearTimeout(entry.timer);entry.timer=undefined;entry.animation?.cancel();entry.animation=undefined;entry.button.dataset.pose='rest';}
  update(entry,agent,slot,host){
   const key=agent.room+'|'+agent.status+'|'+slot;
   if(entry.key!==key){this.stop(entry);entry.key=key;}
   entry.agent=agent;entry.slot=slot;entry.host=host;
   if(!this.allowed()){this.stop(entry);return;}
   if(agent.status!=='IDLE'||!rooms.has(agent.room)){entry.button.dataset.pose=agent.status==='IDLE'?'rest':'task';return;}
   if(entry.timer!==undefined||entry.animation)return;
   const generation=entry.generation||0;
   entry.timer=setTimeout(()=>{
    if(generation!==entry.generation)return;entry.timer=undefined;
    if(!this.allowed()||entry.agent.status!=='IDLE'||entry.button===document.activeElement)return;
    const bounds=entry.host.getBoundingClientRect?.();if(!bounds||!entry.button.animate)return;
    const points=idlePath(entry.agent.room,entry.slot,entry.agent.id,bounds.width,bounds.height);if(!points.length)return;
    entry.button.dataset.pose='walk';entry.button.dataset.facing=points[1].x<0?'left':'right';
    const animation=entry.button.animate(points.map((p,i)=>({translate:p.x+'px '+p.y+'px',offset:[0,.42,.58,1][i]})),{duration:2600,easing:'linear'});entry.animation=animation;
    animation.onfinish=()=>{if(generation!==entry.generation)return;entry.animation=undefined;entry.button.dataset.pose='rest';this.update(entry,entry.agent,entry.slot,entry.host);};
   },1700+hash(agent.id)%5400);
  }
 }
 globalThis.OfficePresence={floorPoint,idlePath,Director};
})();
