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

test('interromper um passeio no meio cancela todos os trechos e o personagem volta exatamente para a cadeira',()=>{
 const context=load(),{life,views,advance}=director(context);
 advance(30000);life.tick();
 const view=[...views.values()].find(v=>v.button.dataset.life==='away');assert.ok(view);
 // Termina só o primeiro trecho: o segundo começa e o primeiro ainda segura a posição.
 const first=view.button.animations[0];first.done=true;first.onfinish();
 assert.ok(view.button.animations.length>=2);
 life.stop(view);
 assert.ok(view.button.animations.every((a:any)=>a.cancelled),'nenhum trecho fica preso fora da cadeira');
 assert.equal(view.button.dataset.pose,'seated');assert.equal(view.button.dataset.life,undefined);
});

test('mapa de piso em grade: toda cadeira alcança todo destino, só por células andáveis e sem diagonal',()=>{
 const context=vm.createContext({document:{createElement:()=>new Element(),activeElement:null},setTimeout,clearTimeout,console,btoa,atob});
 for(const name of ['navigation','workstations','life','office-map'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),context);
 const {OfficeLife,OfficeWorkstations,OfficeMap}=context as any,grid=OfficeMap.defaultGrid(),cell=OfficeMap.CELL;
 assert.equal(OfficeMap.decode(OfficeMap.encode(grid)).join(''),grid.join(''),'codificação ida e volta');
 for(const seat of OfficeWorkstations.catalog)for(const place of OfficeLife.places){
  const target=place.to??{x:place.x,y:OfficeLife.lanes[place.lane].y},path=OfficeMap.route({x:seat.x,y:seat.y},target,grid);
  assert.ok(path.length>=2,seat.id+' → '+place.id+' sem caminho');
  for(let i=2;i<path.length-1;i++){const a=path[i-1],b=path[i];assert.ok(a.x===b.x||a.y===b.y,'diagonal em '+seat.id+' → '+place.id);
   const steps=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))/cell;for(let s=0;s<=steps;s++){const p={x:a.x+(b.x-a.x)*s/Math.max(1,steps),y:a.y+(b.y-a.y)*s/Math.max(1,steps)},c=OfficeMap.cellOf(p);assert.equal(grid[c.r*OfficeMap.COLS+c.c],1,'passou por célula bloqueada');}}
 }
 // Bloquear uma passagem obriga a usar outra; bloquear tudo deixa sem caminho (nunca atravessa parede).
 const empty=new Uint8Array(grid.length);assert.equal(OfficeMap.route({x:174,y:299},{x:1050,y:492},empty).length,0);
});

test('renderizador em canvas é opcional: padrão continua no DOM e os botões dos agentes nunca somem',()=>{
 const store=new Map<string,string>();
 const context=vm.createContext({document:{querySelector:()=>null,body:{dataset:{}}},localStorage:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v)},console});
 vm.runInContext(readFileSync('public/office/scene-canvas.js','utf8'),context);
 const {OfficeSceneCanvas}=context as any;
 assert.equal(OfficeSceneCanvas.preferred(),'dom');assert.equal(OfficeSceneCanvas.active(),false);
 OfficeSceneCanvas.set('canvas');assert.equal(store.get(OfficeSceneCanvas.KEY),'canvas','escolha fica só neste navegador');
 const css=readFileSync('public/office/v3.css','utf8'),rule=css.split('\n').find(l=>l.startsWith('body[data-renderer="canvas"] #office .agent .sprite-frame'))!;
 assert.ok(rule.includes('visibility:hidden')&&!/\.agent[,{]/.test(rule.replace('.agent .sprite-frame','')),'só a pintura é escondida; o botão continua clicável');
 assert.match(css,/#sceneCanvas\{[^}]*pointer-events:none/);
});

test('cadeiras e destinos movidos no editor: cadeira, monitor e recorte andam juntos; dado inválido é ignorado',()=>{
 const store=new Map<string,string>([['trading-lab.office-layout.v1',JSON.stringify({version:1,seats:{nova:{x:800,y:310},vega:{x:'x',y:1},intruso:{x:10,y:10},flux:{x:5000,y:300}},places:{coffee:{x:1000,y:480}}})]]);
 const context=vm.createContext({document:{createElement:()=>new Element(),activeElement:null},setTimeout,clearTimeout,console,btoa,atob,localStorage:{getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)}});
 for(const name of ['navigation','office-layout','workstations','life','office-map'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),context);
 const {OfficeWorkstations,OfficeLife,OfficeMap}=context as any;
 const nova=OfficeWorkstations.catalog.find((s:any)=>s.id==='nova');
 assert.equal(nova.x,800);assert.equal(nova.y,310);assert.equal(nova.cx,738+40);assert.equal(nova.cy,238+10);assert.equal(nova.mx,760+40);
 assert.equal(OfficeWorkstations.catalog.find((s:any)=>s.id==='vega').x,406,'número inválido é ignorado');
 assert.equal(OfficeWorkstations.catalog.find((s:any)=>s.id==='flux').x,1125,'fora da cena é ignorado');
 assert.equal(OfficeWorkstations.catalog.length,8,'id desconhecido não cria cadeira');
 const coffee=OfficeLife.places.find((p:any)=>p.id==='coffee');assert.equal(coffee.to.x,1000);assert.equal(coffee.to.y,480);
 // O piso padrão é refeito com as posições novas: a cadeira movida continua alcançando todo destino.
 const grid=OfficeMap.defaultGrid();for(const place of OfficeLife.places){const target=place.to??{x:place.x,y:OfficeLife.lanes[place.lane].y};assert.ok(OfficeMap.route({x:nova.x,y:nova.y},target,grid).length>=2,'nova → '+place.id);}
});

test('monitores das mesas: sem dado fresco ficam apagados; com candles reais desenham gráfico; 3 telas por mesa',()=>{
 const used:string[]=[];
 const ctx:any=new Proxy({},{get:(t:any,k)=>k in t?t[k]:(()=>{}),set:(t:any,k,v)=>{if((k==='fillStyle'||k==='strokeStyle')&&typeof v==='string')used.push(v);t[k]=v;return true;}});
 const canvas={getContext:()=>ctx,setAttribute(){},id:'',width:0,height:0};
 const office={prepend(){}};
 const context=vm.createContext({document:{querySelector:(s:string)=>s==='#office'?office:null,createElement:()=>canvas},Date,Math,Object,Array,console});
 for(const name of ['scene-quads','desk-screens'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),context);
 const {OfficeDeskScreens}=context as any;
 assert.deepEqual(Object.keys(OfficeDeskScreens.stations()).sort(),['atlas','euler','flux','nova','oracle','satoshi','sentinel','vega'],'a mesa vazia não recebe conteúdo');
 for(const q of Object.values(OfficeDeskScreens.stations()) as any[])assert.deepEqual(Object.keys(q),['left','center','right']);
 OfficeDeskScreens.paint({panorama:null,finance:null,marks:[],messages:[]});
 assert.ok(!used.some(c=>['#22e39f','#ff6b6b','#5fb6ff','#ffd166'].includes(c)),'sem dados: nenhuma cor de gráfico, só telas apagadas');
 used.length=0;const t0=Date.UTC(2026,9,5);
 OfficeDeskScreens.paint({panorama:{candles:{BTCUSDT:Array.from({length:30},(_,i)=>({t:t0+i*3600000,o:100+i,h:102+i,l:99+i,c:i%2?101+i:99+i}))}},finance:null,marks:[],messages:[]});
 assert.ok(used.includes('#22e39f')&&used.includes('#ff6b6b'),'candles reais aparecem em verde e vermelho');
});

test('cenário oficial: cadeira apoiada no agente, áreas clicáveis no formato das telas, peças existentes e nenhum móvel nas rotas',()=>{
 const qctx=vm.createContext({});vm.runInContext(readFileSync('public/office/scene-quads.js','utf8'),qctx);const Q=(qctx as any).OfficeSceneQuads;
 assert.deepEqual({...Q.chairRect({x:174,y:299})},{x:150,y:243,w:48,h:64},'cadeira apoiada no ponto do agente');
 // A área clicável envolve a tela e o polígono segue os 4 cantos (tela inclinada da esquerda da mesa da Nova).
 const attrs:Record<string,string>={},classes:string[]=[];const button:any={setAttribute:(k:string,v:string)=>{attrs[k]=v;},classList:{add:(c:string)=>classes.push(c)}};
 const left=Q.desk().nova.left;assert.equal(Q.place(button,left),true);assert.ok(classes.includes('quad-hit'));
 const xs=left.map((p:number[])=>p[0]),ys=left.map((p:number[])=>p[1]);
 assert.match(attrs.style,new RegExp('^left:'+(Math.min(...xs)/1852*100).toString().slice(0,6)));
 assert.equal(Object.keys(Q.desk()).sort().join(),['atlas','euler','flux','nova','oracle','satoshi','sentinel','trading-empty','vega'].join(),'8 mesas + a mesa vazia do Trading Floor');
 assert.equal(JSON.stringify(Q.rect([705,595,124,68])),'[[705,595],[829,595],[829,663],[705,663]]','telões usam o retângulo exato de screens.js');
 // Layout: toda peça existe no catálogo e tem escala.
 const L=JSON.parse(readFileSync('public/office/assets/cenario-modular.json','utf8')),cat=JSON.parse(readFileSync('public/office/assets/catalog.json','utf8')),esc=JSON.parse(readFileSync('public/office/assets/escala.json','utf8'));
 for(const o of L.objetos)assert.ok(cat[o.id]&&esc[o.id],'peça sem catálogo ou escala: '+o.id);
 // Nenhum móvel no chão cruza as rotas dos personagens (corredores horizontais e passagens verticais).
 const ctx=vm.createContext({document:{createElement:()=>new Element(),activeElement:null},setTimeout,clearTimeout,console});
 for(const name of ['navigation','workstations','life'])vm.runInContext(readFileSync('public/office/'+name+'.js','utf8'),ctx);
 const {OfficeLife}=ctx as any;
 const size=(id:string)=>{const e=esc[id],p=cat[id];const s=e.w?e.w/p.width:e.h/p.height;return {w:p.width*s,h:p.height*s};};
 for(const o of L.objetos){if(o.chao||o.parede||o.fit||o.z!==undefined)continue;const s=size(o.id),x0=o.x-s.w/2,x1=o.x+s.w/2,foot0=o.base-10;
  for(const [id,lane] of Object.entries(OfficeLife.lanes) as [string,any][])if(lane.y>foot0&&lane.y<o.base+2&&x1>lane.from&&x0<lane.to)assert.fail(o.id+' em x '+o.x+' cruza a rota '+id);
  for(const p of OfficeLife.passages){const ya=OfficeLife.lanes[p.a].y,yb=OfficeLife.lanes[p.b].y;if(p.x>x0&&p.x<x1&&o.base>Math.min(ya,yb)&&foot0<Math.max(ya,yb))assert.fail(o.id+' bloqueia a passagem x '+p.x);}
 }
 const css=readFileSync('public/office/v3.css','utf8');assert.match(css,/#office\{background-image:url\('\/office\/cenario-modular\.png'\)/);assert.doesNotMatch(css+readFileSync('public/office/style.css','utf8'),/office-reference-v2|office-day\.png|data-cenario/,'arte antiga removida');
 const assets=readFileSync('src/application/office-assets.ts','utf8');for(const f of ['scene-quads.js','cenario-modular.png','cidade-faixa-dia.png','cidade-faixa-entardecer.png','cidade-faixa-noite.png','assets/cadeira-costas.png'])assert.ok(assets.includes("'"+f+"'"),'arquivo liberado: '+f);
});

test('objetos clicáveis no cenário oficial ficam sobre a própria peça (estante, relógio, rack, cafeteira e mesa)',()=>{
 const qctx=vm.createContext({});vm.runInContext(readFileSync('public/office/scene-quads.js','utf8'),qctx);const Q=(qctx as any).OfficeSceneQuads;
 const layout=JSON.parse(readFileSync('public/office/assets/cenario-modular.json','utf8')),scale=JSON.parse(readFileSync('public/office/assets/escala.json','utf8')),catalog=JSON.parse(readFileSync('public/office/assets/catalog.json','utf8'));
 const pieces=catalog.pecas??catalog.pieces??catalog,piece=(id:string)=>Array.isArray(pieces)?pieces.find((p:any)=>p.id===id):pieces[id];
 // Caixa da peça no cenário: x no centro, base embaixo, tamanho de escala.json mantendo a proporção do recorte.
 const box=(o:any)=>{const p=piece(o.id),s=scale[o.id],w=s.w??s.h*p.width/p.height,h=s.h??s.w*p.height/p.width;return [o.x-w/2,o.base-h,w,h];};
 const expected:Record<string,[string,number]>={library:['decoracao-estante-livros',58],terminal:['decoracao-relogio',947],'quant-servers':['eletronico-rack-servidor',560],coffee:['copa-cafeteira',1030],'meeting-table':['estar-mesa-reuniao',1565]};
 const nav=vm.createContext({});vm.runInContext(readFileSync('public/office/navigation.js','utf8'),nav);const features=(nav as any).OfficeNavigation.features.map((f:any)=>f.id);
 assert.equal([...Object.keys(Q.FEATURE),...Q.SCREEN_FEATURES].sort().join(),[...features].sort().join(),'todo objeto da navegação tem área no cenário (ou já é um telão)');
 for(const [id,[pieceId,x]] of Object.entries(expected)){
  const o=layout.objetos.find((item:any)=>item.id===pieceId&&item.x===x);assert.ok(o,pieceId+' x'+x+' existe no cenário');
  const [bx,by,bw,bh]=box(o),points=Q.feature(id),xs=points.map((p:number[])=>p[0]),ys=points.map((p:number[])=>p[1]);
  assert.ok(Math.min(...xs)>=bx-1.5&&Math.max(...xs)<=bx+bw+1.5&&Math.min(...ys)>=by-1.5&&Math.max(...ys)<=by+bh+1.5,id+' fica dentro da peça');
  assert.ok((Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))>=bw*bh*0.6,id+' cobre a peça, não só um ponto');
 }
 assert.equal(Q.feature('risk-board'),null,'o quadro de risco já é o telão risk-wall');
 assert.match(readFileSync('public/office/navigation.js','utf8'),/id:'terminal',room:'Trading Floor',label:'Relógio do mercado'/);
});
