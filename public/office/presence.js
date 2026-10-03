// Original Trading Lab presentation code. Cosmetic motion has no backend capability.
(() => {
 const hash=id=>[...id].reduce((sum,c)=>sum*31+c.charCodeAt(0),7)>>>0;
 const floorPoint=(room,slot)=>OfficeNavigation.anchor(room,slot);
 function idlePath(room,slot,id,width,height,cycle=0,occupied=[]){
  const start=floorPoint(room,slot);if(!start||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
  return OfficeNavigation.idleRoute(room,start,id,cycle,occupied).map(p=>({x:(p.x-start.x)*width/100,y:(p.y-start.y)*height/100}));
 }
 class Director {
  constructor(allowed){this.allowed=allowed;this.entries=new Map();}
  stop(entry){entry.generation=(entry.generation||0)+1;if(entry.timer!==undefined)clearTimeout(entry.timer);entry.timer=undefined;entry.animation?.cancel();entry.animation=undefined;entry.route=undefined;entry.button.dataset.pose='rest';entry.button.dataset.navigation='rest';}
  forget(entry){this.stop(entry);this.entries.delete(entry.agent?.id);}
  update(entry,agent,slot,host){
   const key=agent.room+'|'+agent.status+'|'+slot;
   if(entry.key!==key){this.stop(entry);entry.key=key;}
   entry.agent=agent;entry.slot=slot;entry.host=host;this.entries.set(agent.id,entry);
   if(!this.allowed()){this.stop(entry);return;}
   if(entry.transitionRoute)return;
   if(agent.status!=='IDLE'||!floorPoint(agent.room,slot)){entry.button.dataset.pose=agent.status==='IDLE'?'rest':'task';return;}
   if(entry.timer!==undefined||entry.animation)return;
   const generation=entry.generation||0;
   entry.timer=setTimeout(()=>{
    if(generation!==entry.generation)return;entry.timer=undefined;
    if(!this.allowed()||entry.agent.status!=='IDLE'||entry.button===document.activeElement)return;
    const bounds=entry.host.getBoundingClientRect?.();if(!bounds||!entry.button.animate||bounds.width<=0||bounds.height<=0)return;
    const start=floorPoint(entry.agent.room,entry.slot),occupied=[];
    for(const other of this.entries.values())if(other!==entry){
     if(other.transitionRoute)occupied.push(...other.transitionRoute.map(p=>OfficeTransitions.local(entry.agent.room,p)).filter(p=>OfficeNavigation.floorContains(entry.agent.room,p)));
     else if(other.agent.room===entry.agent.room){const anchor=floorPoint(other.agent.room,other.slot);if(other.route)occupied.push(...other.route);else if(anchor)occupied.push(anchor);}
    }
    const route=OfficeNavigation.idleRoute(entry.agent.room,start,entry.agent.id,entry.cycle||0,occupied);entry.cycle=(entry.cycle||0)+1;
    if(route.length<2){entry.button.dataset.navigation='waiting';return;}
    entry.route=route;entry.button.dataset.pose='walk';entry.button.dataset.navigation='walking';
    const offsets=route.map(p=>({x:(p.x-start.x)*bounds.width/100,y:(p.y-start.y)*bounds.height/100}));
    const play=index=>{
     if(generation!==entry.generation)return;
     if(!this.allowed()||entry.agent.status!=='IDLE'){this.stop(entry);return;}
     if(index>=offsets.length){entry.animation=undefined;entry.route=undefined;entry.button.dataset.pose='rest';entry.button.dataset.navigation='rest';this.update(entry,entry.agent,entry.slot,entry.host);return;}
     const from=offsets[index-1],to=offsets[index],dx=to.x-from.x,dy=to.y-from.y;
     entry.button.dataset.facing=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
     const animation=entry.button.animate([{translate:from.x+'px '+from.y+'px'},{translate:to.x+'px '+to.y+'px'}],{duration:Math.max(100,Math.hypot(dx,dy)/30*1000),easing:'linear'});entry.animation=animation;
     animation.onfinish=()=>{if(generation!==entry.generation)return;entry.animation=undefined;play(index+1);};
    };
    play(1);
   },1700+hash(agent.id)%5400);
  }
 }
 globalThis.OfficePresence={floorPoint,idlePath,Director};
})();
