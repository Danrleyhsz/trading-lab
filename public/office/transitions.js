// Original browser presentation. A received state is authoritative before any journey starts.
(() => {
  const layout = OfficeNavigation.layout;
  // Foot-center passages inspected against office-reference-v2.png; other doors fail closed.
  const doors = [
    {rooms:['Research Lab','Quant Lab'], approaches:{'Research Lab':{x:94,y:94},'Quant Lab':{x:94,y:98}}, via:[{x:33.4,y:36.32},{x:33.4,y:66.42}]},
    {rooms:['Trading Floor','Lounge'], approaches:{'Trading Floor':{x:94,y:94},Lounge:{x:94,y:98}}, via:[{x:66.9,y:36.32},{x:66.9,y:66.42}]}
  ];
  const finite = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const distance = (a,b) => Math.hypot(a.x-b.x,(a.y-b.y)*OfficeNavigation.scene.height/OfficeNavigation.scene.width);
  function world(room,point) {
    const bounds=Object.hasOwn(layout,room)?layout[room]:null;
    return bounds && finite(point) ? {x:bounds.x+point.x*bounds.w/100,y:bounds.y+point.y*bounds.h/100} : null;
  }
  function anchor(room,slot) { return world(room,OfficeNavigation.anchor(room,slot)); }
  function local(room,point) {
    const bounds=Object.hasOwn(layout,room)?layout[room]:null;
    return bounds && finite(point) ? {x:(point.x-bounds.x)*100/bounds.w,y:(point.y-bounds.y)*100/bounds.h} : null;
  }
  function samples(a,b,visit) {
    const count=Math.max(1,Math.ceil(Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y))/.5));
    for(let i=0;i<=count;i++) if(!visit({x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count})) return false;
    return true;
  }
  function compress(points) {
    const result=[];
    for(const point of points) {
      const last=result.at(-1),before=result.at(-2);
      if(last && last.x===point.x && last.y===point.y) continue;
      if(before && ((before.x===last.x && last.x===point.x)||(before.y===last.y && last.y===point.y))) result.pop();
      result.push(point);
    }
    return result;
  }
  function stationLeg(station,room) {
    if(!station || !globalThis.OfficeWorkstations?.catalog.includes(station) || station.room!==room) return null;
    const p=local(room,station.point),floor={x:Math.round(p.x/2)*2,y:OfficeNavigation.aisle(room)};
    if(!OfficeNavigation.walkable(room,floor))return null;
    return {floor,points:[station.point,world(room,{x:p.x,y:floor.y}),world(room,floor)]};
  }
  function plan(fromRoom,fromSlot,toRoom,toSlot,occupied=[],startPoint,fromStation,toStation) {
    const door=doors.find(d=>d.rooms.includes(fromRoom)&&d.rooms.includes(toRoom));
    const origin=stationLeg(fromStation,fromRoom),target=stationLeg(toStation,toRoom);
    const start=origin?.floor||OfficeNavigation.anchor(fromRoom,fromSlot),goal=target?.floor||OfficeNavigation.anchor(toRoom,toSlot);
    if(fromRoom===toRoom || !door || !start || !goal || !Array.isArray(occupied) || occupied.length>4096 || !occupied.every(finite)) return [];
    let source=start,bridge=origin?origin.points:[];
    if(origin && startPoint!==undefined && (!finite(startPoint)||distance(startPoint,origin.points[0])>.25))return [];
    if(!origin && startPoint!==undefined) {
      if(!finite(startPoint)) return [];
      const bounds=layout[fromRoom],local={x:(startPoint.x-bounds.x)*100/bounds.w,y:(startPoint.y-bounds.y)*100/bounds.h};
      source={x:Math.round(local.x/2)*2,y:Math.round(local.y/2)*2};
      const turn={x:source.x,y:local.y};
      if(!samples(local,turn,p=>OfficeNavigation.floorContains(fromRoom,p)) || !samples(turn,source,p=>OfficeNavigation.floorContains(fromRoom,p))) return [];
      bridge=[local,turn].map(p=>world(fromRoom,p));
    }
    const departure=OfficeNavigation.plan(fromRoom,source,door.approaches[fromRoom]);
    const arrival=OfficeNavigation.plan(toRoom,door.approaches[toRoom],goal);
    if(!departure.length || !arrival.length) return [];
    const via=fromRoom===door.rooms[0]?door.via:door.via.slice().reverse();
    const points=compress([...bridge,...departure.map(p=>world(fromRoom,p)),...via,...arrival.map(p=>world(toRoom,p)),...(target?target.points.slice().reverse():[])]);
    // Reserve the complete corridor; never queue old work while waiting for an actor.
    for(let i=1;i<points.length;i++) if(!samples(points[i-1],points[i],p=>!occupied.some(other=>distance(p,other)<3.6))) return [];
    return points;
  }
  function freshEvent(event,agent) {
    const age=Date.now()-Date.parse(event?.occurredAt);
    return event?.type==='AGENT_STATE_CHANGED' && typeof event.id==='string' && event.id.length>0 &&
      Number.isFinite(age) && age>=-1000 && age<=5000 && event.payload?.id===agent.id &&
      event.payload.room===agent.room && event.payload.status===agent.status;
  }
  class Director {
    constructor(allowed,stopIdle,settled) { this.allowed=allowed;this.stopIdle=stopIdle;this.settled=settled; }
    stop(entry) {
      entry.transitionGeneration=(entry.transitionGeneration||0)+1;
      entry.transitionAnimation?.cancel();entry.transitionAnimation=undefined;entry.transitionRoute=undefined;
      delete entry.button.dataset.travel;
      entry.button.dataset.pose=entry.station?'seated':entry.agent?.status==='IDLE'?'rest':'task';if(entry.station)entry.button.dataset.facing='up';
    }
    update(entry,agent,slot,{from,event,bounds,occupied=[],startPoint}={}) {
      const key=agent.room+'|'+agent.status+'|'+slot;
      if(entry.transitionKey!==key) { this.stop(entry);entry.transitionKey=key; }
      if(!this.allowed() || entry.button===document.activeElement) { this.stop(entry);return; }
      if(entry.transitionRoute) {
        if(entry.transitionRoute.some(point=>occupied.some(other=>distance(point,other)<3.6))) this.stop(entry);
        return;
      }
      if(!event || !from || from.room===agent.room || !freshEvent(event,agent)) return;
      if(!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width<=0 || bounds.height<=0 || !entry.button.animate) return;
      const route=plan(from.room,from.slot,agent.room,slot,occupied,startPoint,from.station,entry.station),destination=entry.station?.point||anchor(agent.room,slot);
      if(route.length<2) return;
      const offsets=route.map(p=>({x:(p.x-destination.x)*bounds.width/100,y:(p.y-destination.y)*bounds.height/100}));
      const length=offsets.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-offsets[i].x,p.y-offsets[i].y),0);
      const speed=Math.max(90,length/8),generation=entry.transitionGeneration;
      const reservation=[];
      for(let i=1;i<route.length;i++) samples(route[i-1],route[i],point=>{reservation.push(point);return true;});
      this.stopIdle(entry);entry.transitionRoute=reservation;entry.button.dataset.pose='walk';entry.button.dataset.travel='recorded';
      const play=index=>{
        if(generation!==entry.transitionGeneration) return;
        if(!this.allowed() || entry.button===document.activeElement) { this.stop(entry);return; }
        if(index>=offsets.length) {
          this.stop(entry);this.settled(entry);return;
        }
        const a=offsets[index-1],b=offsets[index],dx=b.x-a.x,dy=b.y-a.y;
        entry.button.dataset.facing=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
        const animation=entry.button.animate([{translate:a.x+'px '+a.y+'px'},{translate:b.x+'px '+b.y+'px'}],{duration:Math.hypot(dx,dy)/speed*1000,easing:'linear',fill:'both'});
        entry.transitionAnimation=animation;
        animation.onfinish=()=>{
          if(generation!==entry.transitionGeneration || entry.transitionAnimation!==animation) return;
          entry.transitionAnimation=undefined;
          // The next segment fills the same position; completed effects never accumulate.
          play(index+1);animation.cancel();
        };
      };
      play(1);
    }
  }
  globalThis.OfficeTransitions={world,local,anchor,plan,Director};
})();
