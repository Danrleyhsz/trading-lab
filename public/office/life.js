// Living office. Idle agents take cosmetic walks across every room; recorded messages that are only seconds
// old make their sender walk to the recipient. Neither changes backend state, work, experience or P&L.
(() => {
 const W=1852,H=849;
 // Walkable lanes in scene pixels (feet line), authored against office-reference-v2.png: the front aisle of
 // each row and the vertical passages between rows.
 const lanes=Object.freeze({r1:{y:300,from:80,to:1720},r2:{y:544,from:90,to:1760},r3:{y:812,from:120,to:1760}});
 const passages=Object.freeze([{x:632,a:'r1',b:'r2'},{x:1267,a:'r1',b:'r2'},{x:475,a:'r2',b:'r3'},{x:1320,a:'r2',b:'r3'}]);
 // Cosmetic destinations. Labels describe a place, never work.
 const places=Object.freeze([
  {id:'coffee',lane:'r2',x:1050,to:{x:1050,y:492},facing:'up',text:'☕ Pausa para café'},
  {id:'water',lane:'r2',x:1182,to:{x:1182,y:494},facing:'up',text:'💧 Pegando água'},
  {id:'lounge-left',lane:'r2',x:790,facing:'up',text:'Descansando no lounge'},
  {id:'lounge-right',lane:'r2',x:915,facing:'up',text:'Descansando no lounge'},
  {id:'meeting-left',lane:'r2',x:1378,to:{x:1378,y:500},facing:'right',text:'Na sala de reunião'},
  {id:'meeting-right',lane:'r2',x:1748,to:{x:1748,y:500},facing:'left',text:'Na sala de reunião'},
  {id:'risk-board',lane:'r1',x:1640,to:{x:1640,y:238},facing:'up',text:'Passando pelo Risk Desk'},
  {id:'war-room-left',lane:'r3',x:830,facing:'up',text:'Olhando os telões da War Room'},
  {id:'war-room-right',lane:'r3',x:1000,facing:'up',text:'Olhando os telões da War Room'},
  {id:'analysis',lane:'r3',x:1580,facing:'up',text:'Na Análise de Mercado'},
  {id:'data-center',lane:'r3',x:160,facing:'up',text:'Visitando o Data Center'},
  {id:'stretch',lane:'r2',x:560,facing:'down',text:'🙆 Alongando'}
 ]);
 const laneOf=y=>Object.entries(lanes).reduce((best,[id,lane])=>Math.abs(lane.y-y)<Math.abs(lanes[best].y-y)?id:best,'r1');
 const clamp=(id,x)=>Math.min(lanes[id].to,Math.max(lanes[id].from,x));
 const point=(id,x)=>({x:clamp(id,x),y:lanes[id].y});
 const same=(a,b)=>Math.abs(a.x-b.x)<0.5&&Math.abs(a.y-b.y)<0.5;
 const length=path=>path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-path[i].x,p.y-path[i].y),0);
 /** Shortest lane route between two points that lie on lanes, as scene-pixel waypoints. */
 function route(from,to){
  const a=laneOf(from.y),b=laneOf(to.y),start=point(a,from.x),goal=point(b,to.x);
  if(a===b)return dedupe([start,goal]);
  const order=['r1','r2','r3'],step=order.indexOf(b)>order.indexOf(a)?1:-1,chains=[[]];
  for(let i=order.indexOf(a);i!==order.indexOf(b);i+=step){
   const options=passages.filter(p=>(p.a===order[i]&&p.b===order[i+step])||(p.b===order[i]&&p.a===order[i+step]));
   const next=[];for(const chain of chains)for(const option of options)next.push([...chain,option]);chains.splice(0,chains.length,...next);
  }
  let best=null;
  for(const chain of chains){
   const path=[start];let lane=a;
   for(const passage of chain){const other=passage.a===lane?passage.b:passage.a;path.push(point(lane,passage.x),point(other,passage.x));lane=other;}
   path.push(goal);if(!best||length(path)<length(best))best=path;
  }
  return dedupe(best);
 }
 const dedupe=path=>path.filter((p,i)=>i===0||!same(p,path[i-1]));
 /** Full walk from a seat to a place (with an optional final step off the lane). */
 function walk(home,place){
  // Com o mapa de piso (office-map.js), o caminho vem do A* sobre as células andáveis; sem ele, dos corredores.
  const target=place.to?{...place.to}:{x:place.x,y:lanes[place.lane].y},viaMap=globalThis.OfficeMap?.route(home,target);
  if(viaMap&&viaMap.length>=2)return viaMap;
  const path=route(home,{x:place.x,y:lanes[place.lane].y});if(place.to)path.push({...place.to});return dedupe(path);
 }
 const hash=id=>[...String(id)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
 const pct=(v,digits=2)=>Number.isFinite(v)?(v>=0?'+':'')+(v*100).toFixed(digits).replace('.',',')+'%':'n/d';
 const regimes={TRENDING_UP:'tendência de alta',TRENDING_DOWN:'tendência de baixa',RANGE:'lateral',UNKNOWN:'indefinido'};
 /** Portuguese text for a recorded message, built only from its own fields. */
 function text(message){
  const c=message?.context||{},s=String(message?.summary||'');
  if(message?.kind==='RESEARCH_FINDING'){
   if(message.from==='satoshi'&&'change24h' in c)return 'Momentum BTC: '+pct(c.change24h)+' em 24h · '+pct(c.change7d)+' em 7d';
   if(message.from==='vega'&&'dailyVolatility24h' in c)return 'Volatilidade diária '+pct(c.dailyVolatility24h).replace('+','')+' (24h) vs '+pct(c.dailyVolatility7d).replace('+','')+' (7d)'+(c.volatilityExpanding?' · em expansão':'');
   if(message.from==='flux'&&'fundingRate' in c)return 'Funding '+(Number.isFinite(c.fundingRate)?(c.fundingRate*100).toFixed(4).replace('.',',')+'%':'n/d')+' · spread '+(Number.isFinite(c.spreadBps)?String(c.spreadBps).replace('.',','):'n/d')+' bps';
   if(message.from==='oracle'&&c.regime)return 'Regime '+(regimes[c.regime]||c.regime)+' ('+pct(c.distanceToSma240)+' vs média 240h)';
  }
  if(message?.kind==='EXECUTION_PLAN'&&Number.isFinite(c.direction)){
   const plan=c.direction>0?'ficar comprada (long)':c.direction<0?'ficar vendida (short)':c.currentQuantity?'fechar a posição':'ficar fora (flat)';
   return 'Sinal do estudo: '+plan+' · notas da equipe são só contexto';
  }
  if(message?.kind==='RISK_REVIEW'){
   const m=s.match(/^(Approved|Rejected) (BUY|SELL) ([\d.eE-]+) BTC(?: \(notional ([\d.]+) USDT\))?(?:: (.*))?$/);
   if(m)return (m[1]==='Approved'?'✓ Aprovado: ':'✗ Rejeitado: ')+(m[2]==='BUY'?'compra ':'venda ')+m[3]+' BTC'+(m[4]?' ('+m[4]+' USDT)':'')+(m[5]?' · '+m[5]:'');
  }
  return s;
 }
 class Director {
  constructor({allowed,bounds,now=()=>Date.now(),random=Math.random,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id),maxIdle=3}){
   Object.assign(this,{allowed,bounds,now,random,schedule,cancel,maxIdle});this.views=new Map();this.reserved=new Map();
  }
  /** Called on every render. Seated agents become eligible; anything else stops its walk. */
  update(view){
   const agent=view.agent;if(!agent)return;this.views.set(agent.id,view);
   const key=agent.room+'|'+agent.status+'|'+(view.station?view.station.id:'');
   if(view.lifeKey!==key){this.stop(view);view.lifeKey=key;}
   if(!view.station||!this.allowed()){this.stop(view);return;}
   if(view.life){this.pose(view);return;}
   if(view.lifeNext===undefined)view.lifeNext=this.now()+5000+hash(agent.id)%20000;
  }
  /** Starts due idle outings; called once per second by the page. */
  tick(){
   if(!this.allowed()){for(const view of this.views.values())this.stop(view);return;}
   const away=[...this.views.values()].filter(v=>v.life?.kind==='idle').length;let started=0;
   const eligible=v=>!v.life&&v.station&&v.agent?.status==='IDLE'&&v.button!==document.activeElement&&this.now()>=v.lifeNext&&!(v.lifeHold>this.now());
   // Now and then two idle agents take a break together in the lounge (cosmetic; no conversation is claimed).
   const free=[...this.views.values()].filter(eligible);
   if(away+2<=this.maxIdle&&free.length>=2&&!this.reserved.has('lounge-left')&&!this.reserved.has('lounge-right')&&this.random()<0.3){
    const [a,b]=free.slice(0,2),left=places.find(p=>p.id==='lounge-left'),right=places.find(p=>p.id==='lounge-right');
    const name=v=>v.agent.name||v.agent.id;
    if(this.trip(a,{kind:'idle',place:{...left,facing:'right'},text:'Pausa no lounge com '+name(b),dwell:12000,speed:62}))started++;
    if(this.trip(b,{kind:'idle',place:{...right,facing:'left'},text:'Pausa no lounge com '+name(a),dwell:12000,speed:62}))started++;
   }
   for(const view of this.views.values()){
    if(away+started>=this.maxIdle)break;
    if(view.life||!view.station||view.agent?.status!=='IDLE'||view.button===document.activeElement||!(this.now()>=view.lifeNext)||view.lifeHold>this.now())continue;
    if(this.idle(view))started++;
   }
  }
  idle(view){
   const options=[...places.filter(p=>!this.reserved.has(p.id)).map(p=>({place:p,text:p.text})),
    ...[...this.views.values()].filter(o=>o!==view&&o.station&&o.agent&&!o.life).map(o=>({place:this.visitSpot(o.station,view.agent.id),text:'Visitando a mesa de '+(o.agent.name||o.agent.id),visit:o.agent.id}))].filter(o=>o.place&&!this.reserved.has(o.place.id));
   if(!options.length){view.lifeNext=this.now()+10000;return false;}
   const choice=options[Math.floor(this.random()*options.length)%options.length];
   return this.trip(view,{kind:'idle',place:choice.place,text:choice.text,dwell:7000+Math.floor(this.random()*9000),speed:62});
  }
  /** A recorded message created seconds ago: its sender walks to the first recipient that has a desk. */
  react(message,names={}){
   if(!this.allowed())return false;const view=this.views.get(message?.from);if(!view?.station)return false;
   const target=(message.to||[]).map(id=>this.views.get(id)).find(v=>v?.station&&v!==view);
   // Recipients stay at (or return to) their desks while the recorded message is delivered.
   for(const id of message.to||[]){const other=this.views.get(id);if(!other||other===view)continue;other.lifeHold=this.now()+45000;if(other.life?.kind==='idle')this.recall(other);}
   const words=text(message),title=(names[message.from]||message.from)+' → '+(message.to||[]).map(id=>names[id]||id).join(', ');
   // The trader keeps her seat: her plan is shown where she works.
   if(message.from==='nova'||!target){this.say(view,words,'real',title,15000);return true;}
   if(view.life)this.stop(view);
   const place=message.kind==='RISK_REVIEW'&&message.from==='sentinel'?places.find(p=>p.id==='risk-board'):this.visitSpot(target.station,message.id);
   if(!place||this.reserved.has(place.id)&&this.reserved.get(place.id)!==view)return this.say(view,words,'real',title,15000),true;
   return this.trip(view,{kind:'recorded',place,text:words,title,dwell:14000,speed:95,facing:message.kind==='RISK_REVIEW'?'up':undefined});
  }
  visitSpot(station,seed){
   const lane=laneOf(station.y),order=[-58,58,-112,112],start=hash(seed)%order.length;
   for(let i=0;i<order.length;i++){
    const x=clamp(lane,station.x+order[(start+i)%order.length]),id='visit:'+lane+':'+Math.round(x);
    if(!this.reserved.has(id)&&![...this.views.values()].some(v=>v.station&&Math.abs(v.station.x-x)<30&&laneOf(v.station.y)===lane))return {id,lane,x,facing:x<station.x?'right':'left'};
   }
   return null;
  }
  trip(view,{kind,place,text:words,title,dwell,speed,facing}){
   const bounds=this.bounds();if(!bounds||!(bounds.width>0)||!(bounds.height>0)||!view.button.animate)return false;
   const home={x:view.station.x,y:view.station.y},out=walk(home,place);if(out.length<2)return false;
   this.reserved.set(place.id,view);const generation=(view.lifeGeneration||0)+1;view.lifeGeneration=generation;
   view.life={kind,place,phase:'out',path:out};view.button.dataset.life='away';view.button.dataset.lifeKind=kind;view.button.dataset.pose='walk';
   const scale={x:bounds.width/W,y:bounds.height/H},offset=p=>({x:(p.x-home.x)*scale.x,y:(p.y-home.y)*scale.y});
   const legs=(path,done)=>{
    const step=i=>{
     if(generation!==view.lifeGeneration)return;
     if(!this.allowed()){this.stop(view);return;}
     if(i>=path.length){done();return;}
     const a=offset(path[i-1]),b=offset(path[i]),dx=b.x-a.x,dy=b.y-a.y;
     view.button.dataset.facing=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
     const animation=view.button.animate([{translate:a.x+'px '+a.y+'px'},{translate:b.x+'px '+b.y+'px'}],{duration:Math.max(120,Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y)/speed*1000),easing:'linear',fill:'forwards'});
     // Guarda todas as animações do passeio: cada trecho mantém a posição final até o próximo começar.
     (view.lifeAnimations??=[]).push(animation);view.lifeAnimation=animation;
     animation.onfinish=()=>{if(generation!==view.lifeGeneration)return;for(const old of view.lifeAnimations.splice(0,view.lifeAnimations.length-1))old.cancel();step(i+1);};
    };
    step(1);
   };
   const back=()=>{if(generation!==view.lifeGeneration)return;view.life.phase='back';view.button.dataset.pose='walk';this.hush(view);legs([...out].reverse(),()=>this.finish(view,generation));};view.life.back=back;
   legs(out,()=>{
    view.life.phase='there';view.button.dataset.pose='rest';view.button.dataset.facing=facing||place.facing||'up';
    this.say(view,words,kind==='idle'?'idle':'real',title,dwell);
    view.lifeTimer=this.schedule(()=>{
     if(generation!==view.lifeGeneration)return;view.lifeTimer=undefined;back();
    },dwell);
   });
   return true;
  }
  finish(view,generation){
   if(generation!==view.lifeGeneration)return;
   this.release(view);this.cancelWalk(view);view.life=undefined;
   delete view.button.dataset.life;delete view.button.dataset.lifeKind;view.button.dataset.pose='seated';view.button.dataset.facing='up';
   view.lifeNext=this.now()+25000+Math.floor(this.random()*45000);
  }
  /** Ends an idle outing early: walk back if standing at the destination, otherwise return at once. */
  recall(view){if(view.life?.phase==='there'){if(view.lifeTimer!==undefined)this.cancel(view.lifeTimer);view.lifeTimer=undefined;view.life.back();}else if(view.life?.phase==='out')this.stop(view);}
  /** Cancela todos os trechos do passeio, para o personagem voltar exatamente para a cadeira. */
  cancelWalk(view){for(const animation of view.lifeAnimations??[])animation.cancel();view.lifeAnimations=[];view.lifeAnimation?.cancel();view.lifeAnimation=undefined;}
  release(view){for(const [id,owner] of this.reserved)if(owner===view)this.reserved.delete(id);}
  pose(view){view.button.dataset.pose=view.life.phase==='there'?'rest':'walk';}
  say(view,words,kind,title,duration){
   this.hush(view);if(!words)return;const bubble=document.createElement('span');bubble.className='life-bubble';bubble.dataset.kind=kind;bubble.textContent=words;
   bubble.setAttribute('aria-hidden','true');if(title)bubble.setAttribute('title',title);view.button.append(bubble);view.lifeBubble=bubble;
   view.bubbleTimer=this.schedule(()=>{if(view.lifeBubble===bubble)this.hush(view);},duration);
  }
  hush(view){view.lifeBubble?.remove();view.lifeBubble=undefined;if(view.bubbleTimer!==undefined)this.cancel(view.bubbleTimer);view.bubbleTimer=undefined;}
  /** Immediate return to the seat (modal, focus, reduced motion, real state change). */
  stop(view){
   view.lifeGeneration=(view.lifeGeneration||0)+1;if(view.lifeTimer!==undefined)this.cancel(view.lifeTimer);view.lifeTimer=undefined;
   this.cancelWalk(view);this.release(view);this.hush(view);
   if(view.life){view.life=undefined;delete view.button.dataset.life;delete view.button.dataset.lifeKind;if(view.station){view.button.dataset.pose='seated';view.button.dataset.facing='up';}}
  }
  stopAll(){for(const view of this.views.values())this.stop(view);}
  forget(view){this.stop(view);if(view.agent)this.views.delete(view.agent.id);}
 }
 globalThis.OfficeLife=Object.freeze({scene:{width:W,height:H},lanes,passages,places,route,walk,text,Director});
})();
