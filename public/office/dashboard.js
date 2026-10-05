// Office v3 dashboard (reference layout). Reads only data the page already receives or public read endpoints;
// it never submits orders, jobs or studies. Loaded after app.js and uses its helpers (q, node, get, agents…).
(() => {
 const D=globalThis.document;if(!D)return;
 const $=selector=>D.querySelector(selector);
 const svgNS='http://www.w3.org/2000/svg',HOUR=3600000;
 const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const pct=(v,d=2)=>Number.isFinite(v)?(v>=0?'+':'')+fmt(v*100,d)+'%':'—';
 const usd=(v,d=2)=>Number.isFinite(v)?(v<0?'-':'')+'US$ '+fmt(Math.abs(v),d):'—';
 const signedUsd=v=>Number.isFinite(v)?(v>=0?'+':'-')+'US$ '+fmt(Math.abs(v)):'—';
 const big=v=>!Number.isFinite(v)?'—':Math.abs(v)>=1e9?'US$ '+fmt(v/1e9,2)+' bi':Math.abs(v)>=1e6?'US$ '+fmt(v/1e6,1)+' mi':Math.abs(v)>=1e3?'US$ '+fmt(v/1e3,1)+' mil':'US$ '+fmt(v,0);
 const hhmm=t=>new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 const tone=v=>Number.isFinite(v)?(v>=0?'up':'down'):'';
 const el=(tag,text,cls)=>{const n=D.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
 const svg=(w,h)=>{if(!D.createElementNS)return null;const s=D.createElementNS(svgNS,'svg');s.setAttribute('viewBox','0 0 '+w+' '+h);s.setAttribute('preserveAspectRatio','none');s.setAttribute('aria-hidden','true');return s;};
 const shape=(name,attrs)=>{const s=D.createElementNS(svgNS,name);for(const [k,v] of Object.entries(attrs))s.setAttribute(k,String(v));return s;};
 const store={get:(key,fallback)=>{try{return globalThis.localStorage?.getItem(key)??fallback;}catch{return fallback;}},set:(key,value)=>{try{globalThis.localStorage?.setItem(key,value);}catch{}}};
 const state={panorama:null,activity:[],seenEvents:new Set(),eventsReady:false,selected:'nova',tab:'status',profiles:new Map(),ledgers:new Map(),timeline:null,positionKey:null};
 const finance=()=>screens.state.finance,quote=()=>{const q=screens.state.quote;return q&&Date.now()-q.markTime<=15000?q:null;};
 const name=id=>agents.get(id)?.name||id;
 const accountOf=id=>finance()?.perpetualAccounts?.find(a=>a.ownerAgentId===id);
 const recentFrom=id=>communicationReady?[...communications].reverse().find(m=>m.from===id&&Date.now()-Date.parse(m.createdAt)<=65*60000):null;
 /** An agent counts as active with a non-idle recorded state or a recorded message in the last hour. */
 const isActive=agent=>agent.status!=='IDLE'||!!recentFrom(agent.id);
 globalThis.OfficeActivity={isActive};

 // ---------- header ----------
 function header(){
  const now=new Date();$('#clockDate').textContent=now.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}).replace('.','').toUpperCase();
  $('#clockTime').textContent=now.toLocaleTimeString('pt-BR');
  const live=!!quote();$('#marketStatus').textContent=live?'Aberto 24/7':'Sem cotação';$('#marketDot').dataset.state=live?'on':'off';
  const f=finance();if(!f){for(const id of ['#capitalTotal','#dailyPnl'])$(id).textContent='—';return;}
  const accounts=[...(f.legacyAccounts||[]),...(f.perpetualAccounts||[])].filter(a=>Number.isFinite(a.portfolio?.equity)&&a.initialCash>0);
  const equity=accounts.reduce((s,a)=>s+a.portfolio.equity,0),initial=accounts.reduce((s,a)=>s+a.initialCash,0);
  $('#capitalTotal').textContent=usd(equity);setDelta('#capitalChange',initial?equity/initial-1:NaN,pct);setDelta('#capitalChangeUsd',equity-initial,signedUsd);
  const daily=(f.perpetualAccounts||[]).filter(a=>a.daily&&Number.isFinite(a.daily.startEquity)&&a.daily.startEquity>0);
  const start=daily.reduce((s,a)=>s+a.daily.startEquity,0),end=daily.reduce((s,a)=>s+a.portfolio.equity,0);
  $('#dailyPnl').textContent=daily.length?pct(end/start-1):'—';$('#dailyPnl').className=daily.length?tone(end-start):'';setDelta('#dailyPnlUsd',daily.length?end-start:NaN,signedUsd);
 }
 function setDelta(id,value,format){const n=$(id);n.textContent=Number.isFinite(value)?format(value):'';n.className='delta '+tone(value);}

 // ---------- wall screens ----------
 const land=['.....########...####......#####..........##.....','..###########..#####.....###.#################..','..##############.......#######################...','....############......##########################','......##########.....###########################.','.......########.....####..###############.#......','........######......######################.......','.........####......###########.###.####..........','...........##......###########..##..##...........','............##.....##########....................','.............#####...#######........#####........','.............######...######........######......','.............#######..######.............##......','.............#######..#####............####......','..............#####...#####.#.........######.....','..............####....###.............######.....','..............###......................###....#..','..............##..............................#..','..............#..................................','................................................'];
 const sessions=[{label:'Ásia',cols:[31,47],open:h=>h<9||h>=23},{label:'Europa',cols:[19,30],open:h=>h>=7&&h<16},{label:'EUA',cols:[0,18],open:h=>h>=13.5&&h<20}];
 function worldMap(host){
  if(host.dataset.drawn)return;const s=svg(480,200);if(!s)return;host.dataset.drawn='1';
  land.forEach((row,r)=>[...row].forEach((c,col)=>{if(c==='#')s.append(shape('circle',{cx:col*10+5,cy:r*10+5,r:3.2,'data-col':col}));}));host.append(s);
 }
 function paintSessions(host){
  const h=new Date().getUTCHours()+new Date().getUTCMinutes()/60,open=sessions.filter(x=>x.open(h));
  for(const dot of host.querySelectorAll?.('circle')||[]){const col=Number(dot.getAttribute('data-col'));dot.setAttribute('class',open.some(x=>col>=x.cols[0]&&col<=x.cols[1])?'lit':'');}
  return open.map(x=>x.label);
 }
 function candles(host,rows){
  host.replaceChildren();const data=(rows||[]).slice(-36);const s=svg(360,100);if(!s||data.length<2)return;
  const low=Math.min(...data.map(c=>c.l)),high=Math.max(...data.map(c=>c.h)),y=v=>96-(v-low)/(high-low||1)*92,w=360/data.length;
  data.forEach((c,i)=>{const up=c.c>=c.o,x=i*w+w/2,color=up?'#22e39f':'#ff5577';s.append(shape('line',{x1:x,x2:x,y1:y(c.h),y2:y(c.l),stroke:color,'stroke-width':1.2}));s.append(shape('rect',{x:x-w*0.32,y:Math.min(y(c.o),y(c.c)),width:w*0.64,height:Math.max(1.5,Math.abs(y(c.o)-y(c.c))),fill:color}));});
  host.append(s);
 }
 function spark(host,values,color='#35c9ff'){
  host.replaceChildren();const s=svg(200,60);if(!s||values.length<2)return;
  const low=Math.min(...values),high=Math.max(...values),pts=values.map((v,i)=>(i/(values.length-1)*200).toFixed(1)+','+(56-(v-low)/(high-low||1)*52).toFixed(1)).join(' ');
  s.append(shape('polyline',{points:pts,fill:'none',stroke:color,'stroke-width':2,'vector-effect':'non-scaling-stroke'}));host.append(s);
 }
 const coinIcons={BNBUSDT:['B','bnb'],SOLUSDT:['S','sol'],XRPUSDT:['✕','xrp'],DOGEUSDT:['Ð','doge'],ADAUSDT:['₳','ada'],AVAXUSDT:['▲','avax']};
 function wall(){
  const p=state.panorama,field=(scope,f)=>$('[data-wall="'+scope+'"] [data-field="'+f+'"]');
  for(const symbol of ['BTCUSDT','ETHUSDT']){
   const t=p?.tickers?.[symbol];field(symbol,'price').textContent=t?fmt(t.price,2):'—';
   const ch=field(symbol,'change');ch.textContent=t?pct(t.change24h):'sem dados';ch.className='delta '+(t?tone(t.change24h):'');
   if(p)candles(field(symbol,'chart'),p.candles?.[symbol]);
  }
  const qt=quote();field('funding','value').textContent=qt?fmt(qt.fundingRate*100,4)+'%':'—';
  field('funding','sub').textContent=qt?'próx. liquidação em '+span(qt.nextFundingTime-Date.now()):'sem cotação';
  spark(field('funding','chart'),traces.mark.map(x=>x.price).slice(-60));
  const oi=p?.openInterest;field('oi','value').textContent=oi?big(oi.usd):'—';const sub=field('oi','sub');sub.textContent=oi&&Number.isFinite(oi.change24h)?pct(oi.change24h)+' 24h':'';sub.className='delta '+tone(oi?.change24h);
  spark(field('oi','chart'),(oi?.history||[]).map(h=>h.usd),'#7ad7ff');
  const l=p?.liquidations;field('liquidations','value').textContent=l?big(l.longs+l.shorts):'—';
  field('liquidations','longs').textContent=l?'Longs: '+big(l.longs):'';field('liquidations','shorts').textContent=l?'Shorts: '+big(l.shorts)+(l.coverageHours<23.9?' · desde '+hhmm(Date.parse(l.since)):''):'';
  const map=field('sessions','map');worldMap(map);const open=paintSessions(map);field('sessions','label').textContent=open.length?'Abertas: '+open.join(' · '):'Sessões fechadas';
  const list=field('alts','list');list.replaceChildren(...Object.entries(coinIcons).map(([s,[icon,cls]])=>{const t=p?.tickers?.[s],li=el('li');li.append(el('span',icon,'coin '+cls),el('b',s.replace('USDT','')),el('span',t?pct(t.change24h):'—','delta '+(t?tone(t.change24h):'')));return li;}));
  for(const node of D.querySelectorAll('.wall-screen'))node.dataset.stale=p?'false':'true';
 }
 const span=ms=>{const m=Math.max(0,Math.round(ms/60000));return m<60?m+' min':Math.floor(m/60)+'h'+String(m%60).padStart(2,'0');};
 async function loadPanorama(){try{const p=await get('/market/panorama');if(p?.scope!=='PUBLIC_MARKET_CONTEXT_ONLY')throw Error('invalid panorama');state.panorama=p;screens.update({panorama:p});}catch{state.panorama=null;screens.update({panorama:null});}wall();marketDetails();}

 // ---------- docked agent card ----------
 function selectAgent(id){if(!agents.has(id))return;state.selected=id;state.tab='status';$('#agentCard').hidden=false;card();loadProfile(id);}
 async function loadProfile(id){try{const p=await get('/agents/'+encodeURIComponent(id)+'/profile');state.profiles.set(id,p);}catch{}const account=accountOf(id);if(account){try{state.ledgers.set(id,await get('/paper/perpetual/accounts/'+encodeURIComponent(account.id)+'/events'));}catch{}}if(state.selected===id)card();}
 function card(){
  const host=$('#agentCard'),id=state.selected,agent=agents.get(id);if(host.hidden||!agent)return;
  sprite($('#cardPortrait'),id);$('#cardName').textContent=agent.name;$('#cardRole').textContent=roleLabels[id]||agent.role||'';
  const active=isActive(agent);$('#cardStatus').textContent=(active?'● ':'○ ')+(agent.status!=='IDLE'?statusLabels[agent.status]:active?'Trabalhando':'Disponível');$('#cardStatus').dataset.active=String(active);
  const last=communicationReady?[...communications].reverse().find(m=>m.from===id):null;
  $('#cardQuote').textContent=last?'“'+(OfficeLife.text(last)||last.summary)+'” · '+hhmm(Date.parse(last.createdAt)):agent.lastReason?'“'+agent.lastReason+'”':'Nenhuma mensagem registrada.';
  for(const b of D.querySelectorAll('.dock-tabs button'))b.setAttribute('aria-selected',String(b.dataset.tab===state.tab));
  const body=$('#cardBody');body.replaceChildren();const a=accountOf(id),q=quote();
  if(state.tab==='status'){
   const pos=a?.portfolio?.positions?.find(p=>p.quantity),mark=q?.markPrice,notional=pos&&mark?Math.abs(pos.quantity)*mark:0,move=pos&&mark?(mark/pos.averageEntry-1)*Math.sign(pos.quantity):null;
   const cells=[['Capital Virtual',a?usd(a.portfolio.equity):'—'],['P&L',a?pct(a.portfolio.equity/a.initialCash-1):'—',a?tone(a.portfolio.equity-a.initialCash):''],
    ['Posição Atual',pos?'BTC-PERP '+(pos.quantity>0?'LONG':'SHORT'):'Sem posição',pos?(pos.quantity>0?'up':'down'):''],['Entrada',pos?fmt(pos.averageEntry):'—'],
    ['Preço Atual',mark?fmt(mark):'—'],['P&L da Posição',move!==null?pct(move):'—',tone(move)],
    ['Risco da Posição',a&&pos?fmt(notional/a.portfolio.equity*100,1)+'% da carteira':'—'],['Alavancagem',a&&pos?fmt(notional/a.portfolio.equity,2)+'x':'0x']];
   const grid=el('div',undefined,'dock-grid');for(const [label,value,cls] of cells){const c=el('div');c.append(el('small',label),el('b',value,cls||''));grid.append(c);}body.append(grid);
   const auto=finance()?.autonomous;if(id==='nova'&&auto){const next=OfficeScreens.nextDecision(Date.now(),auto);body.append(el('p',auto.enabled?'Piloto ativo · próxima decisão em '+(next.due?span(next.due-Date.now()):'—')+' · limite de perda '+fmt((auto.maxLossFraction||0)*100,0)+'%':'Piloto: '+next.label,'dock-note'));}
   if(!a)body.append(el('p','Sem conta de avaliação atribuída.','dock-note'));
  } else if(state.tab==='trades'){
   const fills=(state.ledgers.get(id)||[]).filter(e=>e.type==='PAPER_FILL').slice(-8).reverse();
   if(!fills.length)body.append(el('p','Nenhuma operação registrada nesta conta.','dock-note'));
   for(const e of fills){const f=e.payload.fill,row=el('button','','dock-row');row.append(el('b',(f.side==='BUY'?'Compra ':'Venda ')+fmt(f.quantity,4)+' BTC',f.side==='BUY'?'up':'down'),el('span','a '+fmt(f.fillPrice)),el('small',new Date(e.occurredAt).toLocaleString('pt-BR')));row.onclick=()=>showEvent(e.id);body.append(row);}
   if(a)body.append(el('p',a.fills+' fills · taxas '+usd(a.feesPaid)+' · funding '+usd(a.fundingCashDelta),'dock-note'));
  } else if(state.tab==='strategies'){
   const auto=finance()?.autonomous;if(id==='nova'&&auto?.studyId){const b=el('button','','dock-row');b.append(el('b','Estudo do piloto · '+auto.studyId.slice(0,8)),el('span',auto.eligible?'Elegível na triagem':'Não elegível'),el('small',auto.reason||''));b.onclick=()=>studyDetails(auto.studyId);body.append(b);}
   const ids=state.profiles.get(id)?.evidence?.strategyIds||[];for(const s of ids.slice(-6))body.append(el('p','Estratégia estudada: '+s,'dock-note'));
   if(!ids.length&&!(id==='nova'&&auto?.studyId))body.append(el('p','Nenhuma estratégia registrada para este agente.','dock-note'));
  } else {
   const mem=(state.profiles.get(id)?.memories||[]).slice(-6).reverse();if(!mem.length)body.append(el('p','Nenhuma memória registrada.','dock-note'));
   for(const m of mem){const r=el('div','','dock-row');r.append(el('b',m.kind),el('span',m.summary),el('small',new Date(m.createdAt).toLocaleString('pt-BR')));body.append(r);}
  }
 }

 // ---------- bottom panels: recent activity ----------
 const agentColors={atlas:'#5aa7ff',satoshi:'#ffb547',oracle:'#b884ff',nova:'#ff6b81',flux:'#3ce0c8',sentinel:'#e6edf7',euler:'#ffd166',vega:'#7ee081'};
 function eventLine(e){
  const p=e.payload||{},owner=String(p.accountId||p.order?.accountId||p.fill?.accountId||'').split(':')[1];
  switch(e.type){
   case 'AUTONOMOUS_DECISION':return {who:'nova',text:'decidiu no candle das '+hhmm(p.candleTimestamp)+': '+(p.direction>0?'ficar comprada':p.direction<0?'ficar vendida':'ficar fora (flat)')};
   case 'PAPER_FILL':return {who:owner||'nova',text:(p.fill?.side==='BUY'?'comprou ':'vendeu ')+fmt(p.fill?.quantity,4)+' BTC a '+fmt(p.fill?.fillPrice),cls:p.fill?.side==='BUY'?'up':'down'};
   case 'RISK_APPROVED':return {who:'sentinel',text:'aprovou ordem paper de '+name(owner||'nova')};
   case 'RISK_REJECTED':return {who:'sentinel',text:'rejeitou ordem: '+((p.decision?.reasons||[]).join(', ')||'limites'),cls:'down'};
   case 'FUNDING_SETTLED':return {who:owner,text:'funding liquidado '+usd(p.cashDelta,4)};
   case 'AUTONOMOUS_PILOT_STOPPED':return {who:'nova',text:'piloto encerrado: '+(p.reason||''),cls:'down'};
   case 'AGENT_STATE_CHANGED':return {who:p.id,text:(statusLabels[p.status]||p.status)+' · '+(p.room||'')};
   case 'BACKTEST_COMPLETED':case 'BACKTEST_FAILED':case 'RESEARCH_COMPLETED':case 'RESEARCH_FAILED':return {who:e.type.startsWith('BACKTEST')?'euler':'atlas',text:eventLabel(e)};
   default:return null;
  }
 }
 function renderActivity(){
  const rows=[...state.activity.map(e=>{const l=eventLine(e);return l&&{at:Date.parse(e.occurredAt),id:e.id,...l,open:()=>showEvent(e.id)};}).filter(Boolean),
   ...(communicationReady?communications:[]).map(m=>({at:Date.parse(m.createdAt),id:m.id,who:m.from,text:OfficeLife.text(m)||m.summary,open:()=>selectAgent(m.from)}))]
   .sort((a,b)=>b.at-a.at).slice(0,30);
  const host=$('#recentActivity');
  if(!rows.length){host.replaceChildren(el('li','Nenhum registro ainda.','empty-state'));return;}
  host.replaceChildren(...rows.map(r=>{const li=el('li'),b=el('button','','activity-row');const dot=el('span','','dot');dot.style.background=agentColors[r.who]||'#8aa';b.append(dot,el('time',hhmm(r.at)));const who=el('b',name(r.who)||'Sistema');who.style.color=agentColors[r.who]||'#cfe';b.append(who,el('span',r.text,r.cls||''));b.onclick=r.open;b.title=new Date(r.at).toLocaleString('pt-BR')+' · '+r.id;li.append(b);return li;}));
 }
 async function loadActivity(){
  try{const page=await get('/audit/events?limit=40&compact=1');if(page?.source!=='DURABLE_SNAPSHOT'||!Array.isArray(page.events))throw Error('invalid');
   const fresh=page.events.filter(e=>!state.seenEvents.has(e.id));if(state.eventsReady)for(const e of fresh.reverse())notifyEvent(e);
   for(const e of page.events)state.seenEvents.add(e.id);state.eventsReady=true;state.activity=page.events.filter(e=>!['MARKET_TICK','PERPETUAL_MARKET_UPDATED'].includes(e.type));}catch{}
  renderActivity();
 }

 // ---------- notifications ----------
 function toast(text,kind='info'){const t=el('div',text,'toast');t.dataset.kind=kind;$('#toasts').append(t);setTimeout(()=>t.remove(),9000);}
 function notifyEvent(e){
  if(e.type==='PAPER_FILL'){const l=eventLine(e),who=name(l.who);const pos=(accountOf(l.who)?.portfolio?.positions||[]).find(p=>p.quantity);
   const text=who+' '+(pos?(pos.quantity>0?'está comprada (LONG) ':'está vendida (SHORT) ')+fmt(Math.abs(pos.quantity),4)+' BTC':'fechou a posição')+' · '+l.text;
   highlight(l.who);toast(text,'trade');browserNotice('Operação paper · '+who,text);}
  else if(e.type==='AUTONOMOUS_PILOT_STOPPED'||e.type==='RISK_REJECTED'){const l=eventLine(e);toast(name(l.who)+' '+l.text,'alert');browserNotice('Trading Lab',name(l.who)+' '+l.text);}
 }
 function highlight(id){const view=agentViews.get(id);if(!view)return;view.button.dataset.alert='trade';setTimeout(()=>{delete view.button.dataset.alert;},20000);}
 function browserNotice(title,body){if(store.get('trading-lab.notify.v1','off')!=='on'||typeof Notification==='undefined'||Notification.permission!=='granted')return;try{new Notification(title,{body,tag:'trading-lab'});}catch{}}
 function watchPositions(){
  const f=finance();if(!f)return;const key=JSON.stringify((f.perpetualAccounts||[]).map(a=>[a.id,(a.portfolio.positions||[]).map(p=>[p.symbol,p.quantity])]));
  if(state.positionKey!==null&&key!==state.positionKey)loadActivity();state.positionKey=key;
 }

 // ---------- lighting ----------
 const phases=['auto','day','dusk','night'],phaseLabels={auto:'automática pelo horário',day:'dia',dusk:'entardecer',night:'noite'},phaseIcons={day:'☀',dusk:'🌇',night:'☾'};
 function phaseNow(){const mode=store.get('trading-lab.lighting.v1','auto');if(mode!=='auto'&&phases.includes(mode))return {mode,phase:mode};const h=new Date().getHours();return {mode:'auto',phase:h>=7&&h<17?'day':(h>=17&&h<19)||(h>=5&&h<7)?'dusk':'night'};}
 function lighting(){const {mode,phase}=phaseNow();$('#lighting').dataset.phase=phase;$('#office').dataset.lighting=phase;const b=$('#lightingToggle');b.firstElementChild.textContent=phaseIcons[phase];b.setAttribute('aria-label','Iluminação do escritório: '+phaseLabels[mode]);b.title='Iluminação: '+phaseLabels[mode]+(mode==='auto'?' ('+phaseLabels[phase]+')':'')+' · clique para trocar';$('#lightingMode').value=mode;}
 $('#lightingToggle').onclick=()=>{const {mode}=phaseNow();store.set('trading-lab.lighting.v1',phases[(phases.indexOf(mode)+1)%phases.length]);lighting();};
 $('#lightingMode').onchange=()=>{store.set('trading-lab.lighting.v1',$('#lightingMode').value);lighting();};
 $('#configNotifications').onclick=async()=>{
  if(typeof Notification==='undefined'){$('#notificationStatus').textContent='Este navegador não oferece notificações.';return;}
  const on=store.get('trading-lab.notify.v1','off')==='on';if(on){store.set('trading-lab.notify.v1','off');notifySettings();return;}
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();store.set('trading-lab.notify.v1',permission==='granted'?'on':'off');notifySettings();
 };
 function notifySettings(){const on=store.get('trading-lab.notify.v1','off')==='on';$('#configNotifications').textContent=on?'Desativar notificações do navegador':'Ativar notificações do navegador';$('#notificationStatus').textContent=on?'Avisos de operações e paradas do piloto chegam mesmo com a aba em segundo plano.':'Avisos aparecem só dentro da página.';}
 $('#configDisplay').onclick=()=>{$('#workspaceDialog').close();$('#displayDialog').showModal();};

 // ---------- enlarged screens ----------
 const groups={war:{title:'War Room · capital do piloto',ids:['war-equity','war-positions','war-drawdown'],note:'Equity, posições e drawdown das contas recebidas.',panel:['financePanel','War Room · capital e portfólio','navFinance']},
  analysis:{title:'Análise de mercado · BTC USD-M',ids:['analysis-book','analysis-flow','analysis-liquidations','analysis-profile'],note:'Contexto público da Binance; não alimenta sinais nem risco.',panel:['marketPanel','Observatório · mercado recebido','navMarket']}};
 let openGroup=null;
 function enlarge(key){openGroup=key;const g=groups[key];$('#screenTitle').textContent=g.title;$('#screenNote').textContent=g.note;fillLarge();if(!$('#screenDialog').open){stopPresence();$('#screenDialog').showModal();}}
 function fillLarge(){if(!openGroup)return;$('#screenGrid').replaceChildren(...groups[openGroup].ids.map(id=>{const live=D.querySelector('[data-screen="'+id+'"]');const copy=live?live.cloneNode(true):el('div','Indisponível');copy.removeAttribute?.('style');copy.className='live-screen large';return copy;}));}
 $('#closeScreen').onclick=()=>$('#screenDialog').close();$('#screenDialog').addEventListener('close',()=>{openGroup=null;globalThis.render?.();});
 $('#screenDetails').onclick=()=>{const [panel,title,nav]=groups[openGroup||'war'].panel;$('#screenDialog').close();openPanel(panel,title,nav);};
 $('#sceneWarRoom').onclick=()=>enlarge('war');$('#sceneMarketAnalysis').onclick=()=>enlarge('analysis');
 for(const b of D.querySelectorAll('[data-scene-screen]')){const id=b.dataset.sceneScreen;if(id.startsWith('war-'))b.onclick=()=>enlarge('war');else if(id.startsWith('market-'))b.onclick=()=>enlarge('analysis');}

 // ---------- extra panels ----------
 const panelIds=['navOffice','navAgents','navFinance','navOperations','navMarket','navResearch','navMemory','navHistory','navAccess'];
 function markNav(active){for(const id of panelIds){$('#'+id).className='nav'+(id===active?' active':'');$('#'+id).setAttribute('aria-current',id===active?'page':'false');}}
 function showPanel(panel,title,nav){openPanel(panel,title,nav);for(const id of ['operationsPanel','memoryPanel'])$('#'+id).hidden=id!==panel;markNav(nav);}
 $('#navOperations').onclick=async()=>{showPanel('operationsPanel','Operações','navOperations');await loadOperations();};
 $('#navMemory').onclick=async()=>{showPanel('memoryPanel','Memória','navMemory');await loadMemory();};
 const historyOpen=$('#navHistory').onclick;$('#navHistory').onclick=()=>{historyOpen?.();markNav('navHistory');loadTimeline();};
 $('#workspaceDialog').addEventListener('close',()=>markNav('navOffice'));
 async function loadOperations(){
  const host=$('#operationsList');$('#operationsStatus').textContent='Consultando registros…';
  try{const [fills,funding]=await Promise.all([get('/audit/events?type=PAPER_FILL&limit=50&compact=1'),get('/audit/events?type=FUNDING_SETTLED&limit=25&compact=1')]);
   const rows=[...fills.events,...funding.events].sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));
   $('#operationsStatus').textContent=rows.length?rows.length+' registros mais recentes · clique para abrir o original.':'Nenhuma operação registrada.';
   host.replaceChildren(table(['Quando','Conta','Evento','Detalhe'],rows.map(e=>{const l=eventLine(e)||{who:'',text:e.type};return {cells:[new Date(e.occurredAt).toLocaleString('pt-BR'),name(l.who)||'—',e.type==='PAPER_FILL'?'Fill':'Funding',l.text],open:()=>showEvent(e.id)};})));}
  catch{$('#operationsStatus').textContent='Registros indisponíveis. Confira o acesso.';}
 }
 async function loadMemory(){
  const select=$('#memoryAgent');if(select.options.length<=1)for(const a of agents.values())select.append(Object.assign(el('option',a.name),{value:a.id}));
  $('#memoryStatus').textContent='Consultando memórias…';
  try{const rows=await get('/memories'+(select.value?'?agentId='+encodeURIComponent(select.value):''));if(!Array.isArray(rows))throw Error('invalid');const recent=rows.slice(-60).reverse();
   $('#memoryStatus').textContent=rows.length+' memórias registradas'+(rows.length>60?' · mostrando as 60 mais recentes':'');
   $('#memoryList').replaceChildren(...recent.map(m=>{const li=el('li');const who=el('b',name(m.agentId));who.style.color=agentColors[m.agentId]||'';li.append(who,el('span',' · '+m.kind),el('p',m.summary),el('small',new Date(m.createdAt).toLocaleString('pt-BR')));if(m.sourceEventId)li.append(sourceButton(m.sourceEventId));return li;}));}
  catch{$('#memoryStatus').textContent='Memórias indisponíveis. Confira o acesso.';}
 }
 $('#memoryAgent').onchange=loadMemory;
 function table(headers,rows){const t=el('table','','data-table'),head=el('tr');for(const h of headers)head.append(el('th',h));const thead=el('thead');thead.append(head);const body=el('tbody');for(const r of rows){const tr=el('tr');for(const c of r.cells){const td=el('td');if(c&&typeof c==='object'&&c.nodeType)td.append(c);else td.textContent=c;tr.append(td);}if(r.open){tr.tabIndex=0;tr.onclick=r.open;tr.onkeydown=e=>{if(e.key==='Enter')r.open();};}body.append(tr);}t.append(thead,body);return t;}
 globalThis.OfficeTable=table;
 async function loadTimeline(){
  const host=$('#pilotTimeline');$('#timelineStatus').textContent='Consultando a linha do tempo…';
  try{const t=await get('/paper/perpetual/pilot/timeline?days=7');if(t?.scope!=='RECORDED_PILOT_HISTORY')throw Error('invalid');state.timeline=t;drawTimeline(host,t);}
  catch{$('#timelineStatus').textContent='Linha do tempo indisponível. Confira o acesso.';host.replaceChildren();}
 }
 function drawTimeline(host,t){
  const from=Date.parse(t.from),to=Date.parse(t.to),x=v=>(v-from)/(to-from)*1000;host.replaceChildren();
  const longs=t.decisions.filter(d=>d.direction>0).length,shorts=t.decisions.filter(d=>d.direction<0).length;
  $('#timelineStatus').textContent=t.decisions.length+' decisões ('+longs+' long · '+shorts+' short · '+(t.decisions.length-longs-shorts)+' flat) · '+t.fills.length+' fills · '+t.funding.length+' liquidações de funding'+(t.stops.length?' · piloto encerrado: '+t.stops.map(s=>s.reason).join(', '):'');
  const s=svg(1000,220);if(!s)return;s.setAttribute('role','img');s.setAttribute('aria-label','Linha do tempo do piloto nos últimos 7 dias');
  for(let d=0;d<=7;d++){const at=from+d*86400000;s.append(shape('line',{x1:x(at),x2:x(at),y1:0,y2:220,stroke:'#1d3150','stroke-width':1}));}
  const eq=t.equity.map(p=>p.equity);if(eq.length>1){const base=t.initialCash??eq[0],pad=Math.max((Math.max(...eq,base)-Math.min(...eq,base))*0.1,base*0.002),lo=Math.min(...eq,base)-pad,hi=Math.max(...eq,base)+pad,y=v=>150-(v-lo)/(hi-lo||1)*130;
   if(t.initialCash)s.append(shape('line',{x1:0,x2:1000,y1:y(t.initialCash),y2:y(t.initialCash),stroke:'#4b6a8f','stroke-dasharray':'6 6'}));
   s.append(shape('polyline',{points:t.equity.map(p=>x(p.timestamp).toFixed(1)+','+y(p.equity).toFixed(1)).join(' '),fill:'none',stroke:'#35c9ff','stroke-width':2.5,'vector-effect':'non-scaling-stroke'}));}
  for(const d of t.decisions)s.append(shape('rect',{x:x(d.candleTimestamp+HOUR),y:170,width:Math.max(1.5,1000/168-1),height:18,fill:d.direction>0?'#22e39f':d.direction<0?'#ff5577':'#46607f'}));
  for(const f of t.fills){const fx=x(Date.parse(f.at));s.append(shape('path',{d:f.side==='BUY'?`M${fx} 192 l6 12 h-12z`:`M${fx} 216 l6 -12 h-12z`,fill:f.side==='BUY'?'#22e39f':'#ff5577'}));}
  host.append(s);const legend=el('p','Linha azul: equity horária da conta do piloto (tracejado = capital inicial). Faixa: decisão de cada hora (verde long, vermelho short, cinza flat). Triângulos: fills. '+t.coverage,'dock-note');host.append(legend);
 }

 // ---------- market panel details ----------
 function marketDetails(){
  const host=$('#panoramaDetails'),p=state.panorama;if(!host)return;if(!p){host.replaceChildren(el('p','Contexto público indisponível.'));return;}
  host.replaceChildren(table(['Ativo','Preço','24h','Máx.','Mín.','Volume (USDT)'],Object.entries(p.tickers).map(([s,t])=>({cells:[s.replace('USDT','/USDT'),fmt(t.price,t.price<10?4:2),pct(t.change24h),fmt(t.high,t.high<10?4:2),fmt(t.low,t.low<10?4:2),big(t.quoteVolume)]}))),
   el('p','Open interest BTC: '+(p.openInterest?fmt(p.openInterest.btc,0)+' BTC · '+big(p.openInterest.usd):'—')+' · Liquidações observadas: '+big((p.liquidations?.longs||0)+(p.liquidations?.shorts||0))+' ('+p.liquidations?.note+')'));
 }

 // ---------- tick ----------
 function paint(){header();wall();if(!state.cardReady&&agents.has(state.selected)){state.cardReady=true;$('#agentCard').hidden=false;selectAgent(state.selected);}card();renderActivity();lighting();watchPositions();if(openGroup)fillLarge();}
 for(const b of D.querySelectorAll('.dock-tabs button'))b.onclick=()=>{state.tab=b.dataset.tab;card();};
 $('#closeCard').onclick=()=>{$('#agentCard').hidden=true;};
 $('#cardProfile').onclick=()=>profile(state.selected);
 globalThis.OfficeDashboard={selectAgent,paint,eventLine,isActive,toast,notifyEvent,state};
 notifySettings();lighting();
 setInterval(header,1000);setInterval(paint,3000);setInterval(loadPanorama,5000);setInterval(loadActivity,20000);
 setTimeout(paint,800);
 loadPanorama();loadActivity();
})();
