import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Element {
 dataset:Record<string,string>={};children:Element[]=[];attributes:Record<string,string>={};textContent='';className='';parentElement?:Element;
 animations:any[]=[];
 append(...items:Element[]){for(const item of items){item.parentElement=this;this.children.push(item);}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=undefined;}
 replaceChildren(...items:Element[]){this.children=[];this.append(...items);}
 setAttribute(name:string,value:string){this.attributes[name]=value;}
 animate(frames:any[],options:any){const animation={frames,options,cancelled:false,onfinish:null as null|(()=>void),cancel(){this.cancelled=true;}};this.animations.push(animation);return animation;}
}
function load(){
 const context=vm.createContext({document:{createElement:()=>new Element(),activeElement:null},setTimeout,clearTimeout,console});
 for(const name of ['navigation','workstations','life','screens'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),context);
 return context as any;
}
const flush=(view:any)=>{for(let i=0;i<50;i++){const a=view.button.animations.at(-1);if(!a||a.done)return;a.done=true;a.onfinish?.();}};

test('every walk stays on authored lanes and vertical passages, from every seat to every place',()=>{
 const {OfficeLife,OfficeWorkstations}=load();
 const passages=new Set(OfficeLife.passages.map((p:any)=>p.x));
 for(const seat of OfficeWorkstations.catalog)for(const place of OfficeLife.places){
  const path=OfficeLife.walk({x:seat.x,y:seat.y},place);
  assert.ok(path.length>=2,seat.id+' → '+place.id);
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i];
   assert.ok(a.x===b.x||Math.abs(a.y-b.y)<2,'no diagonal shortcut '+seat.id+' → '+place.id);
   if(Math.abs(a.y-b.y)>=2){const spur=place.to&&b.x===place.to.x&&b.y===place.to.y;assert.ok(spur||passages.has(a.x),'vertical moves only through a passage or the final spur');}
  }
  for(const p of path){assert.ok(p.x>=0&&p.x<=1852&&p.y>=0&&p.y<=849);}
 }
});

test('bubbles quote only the recorded message fields, in Portuguese',()=>{
 const {OfficeLife}=load();
 assert.equal(OfficeLife.text({from:'satoshi',kind:'RESEARCH_FINDING',summary:'x',context:{change24h:0.019742,change7d:-0.01}}),'Momentum BTC: +1,97% em 24h · -1,00% em 7d');
 assert.match(OfficeLife.text({from:'oracle',kind:'RESEARCH_FINDING',summary:'x',context:{regime:'TRENDING_UP',distanceToSma240:0.025}}),/tendência de alta \(\+2,50% vs média 240h\)/);
 assert.match(OfficeLife.text({from:'nova',kind:'EXECUTION_PLAN',summary:'x',context:{direction:0,currentQuantity:0}}),/ficar fora \(flat\)/);
 assert.equal(OfficeLife.text({from:'sentinel',kind:'RISK_REVIEW',summary:'Rejected SELL 2 BTC: DRAWDOWN_LIMIT'}),'✗ Rejeitado: venda 2 BTC · DRAWDOWN_LIMIT');
 assert.equal(OfficeLife.text({from:'euler',kind:'HYPOTHESIS',summary:'Original text kept'}),'Original text kept');
});

function director(context:any,{allowed=true,random=0}={}){
 let clock=1000000;const timers:Array<{fn:()=>void,at:number}>=[];
 const life=new context.OfficeLife.Director({allowed:()=>allowed,bounds:()=>({width:1852,height:849}),now:()=>clock,random:()=>random,schedule:(fn:()=>void,ms:number)=>{timers.push({fn,at:clock+ms});return timers.length;},cancel:(id:number)=>{timers[id-1]&&(timers[id-1].fn=()=>{});}});
 const views=new Map<string,any>();
 for(const seat of context.OfficeWorkstations.catalog){const agent=Object.freeze({id:seat.id,name:seat.id[0].toUpperCase()+seat.id.slice(1),room:seat.room,status:'IDLE'});const view={agent,station:seat,button:new Element()};views.set(seat.id,view);life.update(view);}
 return {life,views,advance:(ms:number)=>{clock+=ms;for(const t of timers.splice(0).filter(t=>t.at<=clock))t.fn();},setAllowed:(v:boolean)=>{allowed=v;}};
}

test('idle outings are cosmetic: bounded, labeled as places, never touching agent state',()=>{
 const context=load(),{life,views,advance}=director(context);
 advance(30000);life.tick();
 const away=[...views.values()].filter(v=>v.button.dataset.life==='away');
 assert.equal(away.length,3,'at most three idle outings at once');
 for(const view of away){assert.equal(view.agent.status,'IDLE');assert.equal(view.button.dataset.lifeKind,'idle');flush(view);}
 const bubble=away[0].button.children.find((c:any)=>c.className==='life-bubble');
 assert.ok(bubble);assert.equal(bubble.dataset.kind,'idle');assert.doesNotMatch(bubble.textContent,/pesquis|testando|trade|ordem|backtest/i,'an outing never claims work');
 advance(20000);for(const view of away)flush(view);
 for(const view of away){assert.equal(view.button.dataset.life,undefined);assert.equal(view.button.dataset.pose,'seated');}
 assert.equal(life.reserved.size,0,'places are released after returning');
});

test('a fresh recorded finding walks its sender to the recipient, who is held at the desk',()=>{
 const context=load(),{life,views,advance}=director(context);
 const nova=views.get('nova'),satoshi=views.get('satoshi');nova.lifeNext=0;
 advance(1000);
 assert.equal(life.react({id:'m1',from:'satoshi',to:['nova','sentinel','atlas'],kind:'RESEARCH_FINDING',summary:'x',createdAt:new Date().toISOString(),context:{change24h:0.01,change7d:0.02}},{nova:'Nova'}),true);
 assert.equal(satoshi.button.dataset.lifeKind,'recorded');assert.ok(nova.lifeHold>0);
 life.tick();assert.equal(nova.button.dataset.life,undefined,'a recipient does not leave during delivery');
 flush(satoshi);
 const bubble=satoshi.button.children.find((c:any)=>c.className==='life-bubble');
 assert.equal(bubble.dataset.kind,'real');assert.match(bubble.textContent,/Momentum BTC/);
 const last=satoshi.button.animations.at(-1).frames[1].translate.split(' ').map(parseFloat);
 assert.ok(Math.abs(last[0]-(context.OfficeWorkstations.catalog.find((s:any)=>s.id==='nova').x-satoshi.station.x))<=120,'stands beside the trader');
 // Nova's own plan is shown where she works.
 assert.equal(life.react({id:'m2',from:'nova',to:['sentinel','atlas'],kind:'EXECUTION_PLAN',summary:'x',createdAt:new Date().toISOString(),context:{direction:1,currentQuantity:0}},{}),true);
 assert.equal(nova.button.dataset.life,undefined);assert.match(nova.button.children.at(-1).textContent,/comprada/);
});

test('reduced motion, modals or focus stop every walk and return characters to their seats',()=>{
 const context=load(),h=director(context);h.advance(30000);h.life.tick();
 const away=[...h.views.values()].filter(v=>v.button.dataset.life==='away');assert.ok(away.length>0);
 h.setAllowed(false);h.life.tick();
 for(const view of away){assert.equal(view.button.dataset.life,undefined);assert.equal(view.button.dataset.pose,'seated');assert.ok(view.button.animations.every((a:any)=>a.cancelled||a.done));}
 assert.equal(h.life.react({id:'m',from:'vega',to:['nova'],kind:'RESEARCH_FINDING',summary:'x',createdAt:new Date().toISOString()}),false);
});

test('scene screens derive equity, drawdown, positions, risk checks and the next decision from received data only',()=>{
 const {OfficeScreens}=load();
 const account={id:'evaluation:nova:usdm',instrument:'BINANCE_USDM:BTCUSDT',ownerAgentId:'nova',initialCash:1000,maxDrawdown:0.02,valuationFresh:true,portfolio:{equity:990,positions:[{symbol:'BTCUSDT',quantity:0.01,averageEntry:100000}]},samples:[{equity:1000,timestamp:1},{equity:1010,timestamp:2},{equity:990,timestamp:3}]};
 const e=OfficeScreens.equityView(account);assert.equal(e.change.toFixed(4),'-0.0100');assert.equal(e.drawdown.toFixed(4),(990/1010-1).toFixed(4));assert.deepEqual(e.curve,[1000,1010,990]);
 const rows=OfficeScreens.positionsView({perpetualAccounts:[account]},{nova:'Nova'},101000);assert.equal(rows.length,1);assert.equal(rows[0].side,'LONG');assert.equal(rows[0].owner,'Nova');assert.equal(rows[0].move.toFixed(4),'0.0100');
 assert.equal(OfficeScreens.positionsView({perpetualAccounts:[account]},{},null)[0].move,null,'no move without a fresh mark');
 const checks=OfficeScreens.riskChecks({risk:{halted:false,marketReady:true,fundingReady:true,persistenceFailed:false},autonomous:{maxLossFraction:0.03}},account);
 assert.ok(checks.every((c:any)=>c.ok));assert.equal(OfficeScreens.riskChecks({},account).length,0,'no checklist without a risk source');
 const halted=OfficeScreens.riskChecks({risk:{halted:true,marketReady:true,fundingReady:true,persistenceFailed:false},autonomous:{maxLossFraction:0.03}},{...account,portfolio:{equity:960,positions:[]}});
 assert.deepEqual(halted.filter((c:any)=>!c.ok).length,2);
 const next=OfficeScreens.nextDecision(Date.UTC(2026,9,4,23,20),{enabled:true});assert.equal(next.due,Date.UTC(2026,9,5,0,1));
 assert.equal(OfficeScreens.nextDecision(0,{enabled:false}).due,null);assert.equal(OfficeScreens.nextDecision(0,{enabled:true,stopReason:'PILOT_LOSS_LIMIT'}).due,null);
 const ctx={decisionEventId:'d1',candleTimestamp:Date.UTC(2026,9,4,22)};
 const brief=OfficeScreens.briefingLines([{from:'satoshi',kind:'RESEARCH_FINDING',context:{...ctx,change24h:0.02}},{from:'nova',kind:'EXECUTION_PLAN',createdAt:'2026-10-04T23:07:29Z',context:{...ctx,direction:0,currentQuantity:0}}],{satoshi:'Satoshi',nova:'Nova'});
 assert.deepEqual(brief.lines,['Satoshi: 24h +2,00%','Nova: ficar flat']);assert.equal(OfficeScreens.briefingLines([],{}),null);
});
