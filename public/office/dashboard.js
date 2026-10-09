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
 const state={venues:null,scorecard:null,panorama:null,activity:[],seenEvents:new Set(),eventsReady:false,selected:'nova',tab:'status',profiles:new Map(),ledgers:new Map(),timeline:null,positionKey:null};
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
 const coinIcons={BNBUSDT:['B','bnb'],SOLUSDT:['S','sol'],XRPUSDT:['✕','xrp'],DOGEUSDT:['Ð','doge'],ADAUSDT:['₳','ada'],AVAXUSDT:['▲','avax']};
 function wall(){
  const p=state.panorama,field=(scope,f)=>$('[data-wall="'+scope+'"] [data-field="'+f+'"]');
  for(const symbol of ['BTCUSDT','ETHUSDT']){
   const t=p?.tickers?.[symbol];field(symbol,'price').textContent=t?fmt(t.price,2):'—';
   const ch=field(symbol,'change');ch.textContent=t?pct(t.change24h):'sem dados';ch.className='delta '+(t?tone(t.change24h):'');
   if(p)candles(field(symbol,'chart'),p.candles?.[symbol]);
  }
  const qt=quote();field('funding','value').textContent=qt?fmt(qt.fundingRate*100,4)+'%':'—';
  // Diferença de funding entre corretoras (Binance, Bybit, OKX, Hyperliquid), quando disponível.
  field('funding','sub').textContent=state.venues?.fundingSpread8h!=null?'entre corretoras: '+fmt(state.venues.fundingSpread8h*100,4)+'%':qt?'próx. liquidação em '+span(qt.nextFundingTime-Date.now()):'sem cotação';
  // Telão do perpétuo USD-M: mark price (o mesmo que a Nova usa) e candles de 1 hora do perpétuo; a variação de 24 h
  // só aparece quando as 24 velas existem.
  field('BTCPERP','price').textContent=qt?fmt(qt.markPrice,2):'—';
  const perp=p?.candles?.BTCPERP??[],day=perp.slice(-24),perpChange=day.length===24?day.at(-1).c/day[0].o-1:NaN;
  const perpSub=field('BTCPERP','sub');perpSub.textContent=Number.isFinite(perpChange)?pct(perpChange):qt?'mark price':'sem cotação';perpSub.className='delta '+tone(perpChange);
  if(p)candles(field('BTCPERP','chart'),perp);
  field('funding','chart').replaceChildren();
  const oi=p?.openInterest;field('oi','value').textContent=oi?big(oi.usd):'—';const sub=field('oi','sub');sub.textContent=oi&&Number.isFinite(oi.change24h)?pct(oi.change24h)+' 24h':'';sub.className='delta '+tone(oi?.change24h);
  // Um candle por hora, montado com os pontos de 5 minutos do open interest (US$).
  if(p)candles(field('oi','chart'),oi?.candles);
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
   const card=state.scorecard?.scorecard?.find(s=>s.agentId===id);if(card)body.append(el('p','Placar das previsões (24 h): '+(card.settled?Math.round(card.hitRate*100)+'% de acerto em '+card.settled+' conferidas':'nenhuma conferida ainda')+' · '+card.pending+' aguardando · 50% equivale a cara ou coroa','dock-note'));
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
   // Memórias em destaque: recência + importância + relevância, calculadas no servidor (/agents/scorecard).
   const highlighted=state.scorecard?.highlights?.[id];const mem=highlighted?.length?highlighted:(state.profiles.get(id)?.memories||[]).slice(-6).reverse();if(!mem.length)body.append(el('p','Nenhuma memória registrada.','dock-note'));
   if(highlighted?.length)body.append(el('p','Em destaque: mais recentes, mais importantes (lições, erros) primeiro.','dock-note'));
   for(const m of mem){const r=el('div','','dock-row');r.append(el('b',OfficeI18n.kind(m.kind)),el('span',OfficeI18n.text(m.summary)),el('small',new Date(m.createdAt).toLocaleString('pt-BR')));body.append(r);}
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
 // Renderizador experimental em canvas: escolha salva só neste navegador, com medição de quadros para comparar.
 const renderer=globalThis.OfficeSceneCanvas;
 if(renderer){$('#rendererMode').value=renderer.preferred();$('#rendererMode').onchange=()=>{renderer.set($('#rendererMode').value);$('#rendererStatus').textContent=$('#rendererMode').value==='canvas'?'Personagens e cadeiras desenhados em um canvas. Cliques e leitura de tela continuam iguais.':'Personagens desenhados como elementos da página (padrão).';};}
 $('#configMeasure').onclick=async()=>{
  if(!renderer)return;const b=$('#configMeasure');b.disabled=true;$('#rendererStatus').textContent='Medindo por 3 segundos… deixe a janela visível.';
  try{const r=await renderer.measure();$('#rendererStatus').textContent=(r.mode==='canvas'?'Canvas':'Elementos da página')+': '+r.fps.toFixed(0)+' quadros/s, 95% dos quadros em até '+r.p95.toFixed(1)+' ms, '+r.longFrames+' quadro(s) acima de 50 ms'+(r.drawMs!==null?', desenho médio '+r.drawMs.toFixed(2)+' ms':'')+(r.animating?'.':' (animações paradas: compare com elas ligadas).');}
  finally{b.disabled=false;}
 };
 $('#configMapEditor').onclick=()=>{$('#workspaceDialog').close();globalThis.OfficeMapEditor?.open();};
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
   const rows=[...fills.events,...funding.events].sort((a,b)=>Date.parse(b.occurredAt)-Date.parse(a.occurredAt));OfficePanelData.operations=rows;globalThis.OfficePanels?.render();
   $('#operationsStatus').textContent=rows.length?rows.length+' registros mais recentes · clique para abrir o original.':'Nenhuma operação registrada.';
   host.replaceChildren(table(['Quando','Conta','Evento','Detalhe'],rows.map(e=>{const l=eventLine(e)||{who:'',text:e.type};return {cells:[new Date(e.occurredAt).toLocaleString('pt-BR'),name(l.who)||'—',e.type==='PAPER_FILL'?'Fill':'Funding',l.text],open:()=>showEvent(e.id)};})));}
  catch{$('#operationsStatus').textContent='Registros indisponíveis. Confira o acesso.';}
 }
 async function loadMemory(){
  const select=$('#memoryAgent');if(select.options.length<=1)for(const a of agents.values())select.append(Object.assign(el('option',a.name),{value:a.id}));
  $('#memoryStatus').textContent='Consultando memórias…';
  try{const rows=await get('/memories'+(select.value?'?agentId='+encodeURIComponent(select.value):''));if(!Array.isArray(rows))throw Error('invalid');const recent=rows.slice(-60).reverse();OfficePanelData.memories={agent:select.value,rows};if(!select.value)OfficePanelData.memoriesAll=rows;globalThis.OfficePanels?.render();
   $('#memoryStatus').textContent=rows.length+' memórias registradas'+(rows.length>60?' · mostrando as 60 mais recentes':'');
   $('#memoryList').replaceChildren(...recent.map(m=>{const li=el('li');const who=el('b',name(m.agentId));who.style.color=agentColors[m.agentId]||'';li.append(who,el('span',' · '+OfficeI18n.kind(m.kind)),el('p',OfficeI18n.text(m.summary)),el('small',new Date(m.createdAt).toLocaleString('pt-BR')));if(m.sourceEventId)li.append(sourceButton(m.sourceEventId));return li;}));}
  catch{$('#memoryStatus').textContent='Memórias indisponíveis. Confira o acesso.';}
 }
 $('#memoryAgent').onchange=loadMemory;
 function table(headers,rows){const t=el('table','','data-table'),head=el('tr');for(const h of headers)head.append(el('th',h));const thead=el('thead');thead.append(head);const body=el('tbody');for(const r of rows){const tr=el('tr');for(const c of r.cells){const td=el('td');if(c&&typeof c==='object'&&c.nodeType)td.append(c);else td.textContent=c;tr.append(td);}if(r.open){tr.tabIndex=0;tr.onclick=r.open;tr.onkeydown=e=>{if(e.key==='Enter')r.open();};}body.append(tr);}t.append(thead,body);return t;}
 globalThis.OfficeTable=table;
 const verdictLabels={IN_PROGRESS:'Em andamento',STOPPED_BY_LOSS_LIMIT:'Encerrado pelo limite de perda',INSUFFICIENT_EVIDENCE:'Evidência insuficiente',OUTPERFORMED:'Superou as referências',POSITIVE_BELOW_BENCHMARK:'Positivo, abaixo do buy and hold',UNDERPERFORMED:'Abaixo do esperado'};
 async function loadReport(){
  const host=$('#pilotReport');$('#reportStatus').textContent='Consultando avaliação…';
  try{const r=await get('/paper/perpetual/pilot/report');if(r?.scope!=='PILOT_EVALUATION')throw Error('invalid');
   OfficePanelData.report=r;globalThis.OfficePanels?.render();
   if(r.status==='NO_DECISIONS'){$('#reportStatus').textContent='Nenhuma decisão do piloto registrada ainda.';host.replaceChildren();return;}
   $('#reportStatus').textContent=r.protocol.version+' · declarado em '+r.protocol.declaredAt+' · '+r.hours+' h desde '+new Date(r.startedAt).toLocaleString('pt-BR');
   const head=el('div','','report-verdict');head.dataset.verdict=r.verdict;head.append(el('small',r.verdict==='IN_PROGRESS'?'Veredito (em andamento)':'Veredito final'),el('b',verdictLabels[r.verdict]||r.verdict));
   if(r.verdict==='IN_PROGRESS')head.append(el('span','Se terminasse agora: '+(verdictLabels[r.provisionalVerdict]||r.provisionalVerdict)));
   const grid=el('div','','dock-grid report-grid');for(const [label,value,cls] of [['P&L do piloto',signedUsd(r.pnl),tone(r.pnl)],['Decisões',r.decisions.total+' ('+r.decisions.long+' long · '+r.decisions.short+' short · '+r.decisions.flat+' flat)'],['Operações fechadas',r.closedTrades+' de '+r.protocol.minimumClosedTrades+' mínimas'],['Fills · taxas · funding',r.fills+' · '+usd(r.fees,4)+' · '+usd(r.funding,4)],['BTC no período',pct(r.benchmarks.btcReturn),tone(r.benchmarks.btcReturn)],['Buy and hold (mesma exposição)',signedUsd(r.benchmarks.buyAndHoldSameExposure),tone(r.benchmarks.buyAndHoldSameExposure)]]){const c=el('div');c.append(el('small',label),el('b',value,cls||''));grid.append(c);}
   const parity=el('div','','parity-view');parity.append(el('p','Conferindo decisões contra o histórico…','dock-note'));
   host.replaceChildren(head,grid,el('p','Próximo passo pré-declarado: '+r.nextStep,'dock-note'),el('h4','Métricas do período do piloto'),metricsView(r.metrics),el('h4','Paridade: piloto ao vivo × histórico'),parity);loadParity(parity);}
  catch{$('#reportStatus').textContent='Avaliação indisponível. Confira o acesso.';host.replaceChildren();}
 }
 // Paridade (PILOT_PARITY_V1): cada decisão refeita com os candles gravados e com o histórico baixado depois.
 async function loadParity(host){
  try{const p=await get('/paper/perpetual/pilot/parity');if(p?.scope!=='READ_ONLY_PILOT_PARITY'||!p.summary)throw Error('invalid');const s=p.summary;
   const grid=el('div','','dock-grid report-grid');
   for(const [label,value,cls] of [['Resultado',p.passed?'Aprovada':'Reprovada',p.passed?'up':'down'],['Mesma direção no histórico',(s.decisionsChecked-s.historyDifference-s.codeDifference)+' de '+s.decisionsChecked],['Candles revisados depois',s.dataDifference+' decisão(ões)'],['Execução do lado decidido',s.executionMatch+' de '+s.decisions+(s.executionExplained?' · '+s.executionExplained+' com motivo gravado':'')],['Atraso da decisão',p.decisionLatencySeconds?'mediana '+p.decisionLatencySeconds.median.toFixed(1)+' s após o fechamento':'—']]){const box=el('div');box.append(el('small',label),el('b',value,cls||''));grid.append(box);}
   const notes=[];if(s.codeDifference)notes.push(s.codeDifference+' decisão(ões) não se reproduzem com a regra atual: código ou regra mudou.');
   if(s.dataDifference)notes.push('O último candle usado pelo piloto mudou depois (a Binance ainda soma negócios nos primeiros segundos após o fechamento). '+(p.passed?'Até agora isso não mudou nenhuma direção.':'Confira as decisões com direção diferente.'));
   host.replaceChildren(grid,...notes.map(n=>el('p',n,'dock-note')));}
  catch{host.replaceChildren(el('p','Paridade indisponível agora (histórico público fora do ar ou acesso).','dock-note'));}
 }
 async function loadScorecard(){try{const s=await get('/agents/scorecard');if(s?.policy?.version)state.scorecard=s;}catch{}renderScorecard();}
 function renderScorecard(){
  const host=$('#teamScorecard');if(!host)return;const s=state.scorecard;if(!s){host.replaceChildren(el('p','Placar indisponível.','dock-note'));return;}
  const rate=v=>v===null||v===undefined?'—':Math.round(v*100)+'%';
  host.replaceChildren(table(['Pesquisador','24 h: conferidas','Acertos','Taxa','Aguardando','7 dias: taxa (conferidas)'],s.scorecard.map(c=>({cells:[name(c.agentId),String(c.settled),String(c.hits),rate(c.hitRate),String(c.pending),c.weekly?rate(c.weekly.hitRate)+' ('+c.weekly.settled+(c.weekly.pending?', '+c.weekly.pending+' aguardando':'')+')':'—']}))),el('p',s.policy.version+' · cada observação do briefing vira uma previsão para 24 h e, uma vez por dia (00:00 UTC), também para 7 dias; todas são conferidas com candles fechados. Em direção, 50% equivale a cara ou coroa. É só medição: não muda decisões.','dock-note'));
 }
 async function loadTimeline(){loadReport();loadScorecard();
  const host=$('#pilotTimeline');$('#timelineStatus').textContent='Consultando a linha do tempo…';
  try{const t=await get('/paper/perpetual/pilot/timeline?days=7');if(t?.scope!=='RECORDED_PILOT_HISTORY')throw Error('invalid');state.timeline=t;drawTimeline(host,t);}
  catch{$('#timelineStatus').textContent='Linha do tempo indisponível. Confira o acesso.';host.replaceChildren();}
 }
 function drawTimeline(host,t){
  const from=Date.parse(t.from),to=Date.parse(t.to),x=v=>(v-from)/(to-from)*1000;host.replaceChildren();
  const longs=t.decisions.filter(d=>d.direction>0).length,shorts=t.decisions.filter(d=>d.direction<0).length;
  $('#timelineStatus').textContent=t.decisions.length+' decisões ('+longs+' long · '+shorts+' short · '+(t.decisions.length-longs-shorts)+' flat) · '+(()=>{const start=t.decisions[0]?Date.parse(t.decisions[0].at):Infinity,before=t.fills.filter(f=>Date.parse(f.at)<start).length;return (t.fills.length-before)+' fills do piloto'+(before?' (+'+before+' antes do início, do teste de aceitação)':'');})()+' · '+t.funding.length+' liquidações de funding'+(t.stops.length?' · piloto encerrado: '+t.stops.map(s=>s.reason).join(', '):'');
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
 async function loadVenues(){try{const v=await get('/market/venues');if(v?.scope==='PUBLIC_CROSS_VENUE_CONTEXT_ONLY')state.venues=v;}catch{state.venues=null;}marketDetails();}
 function venuesTable(){
  const v=state.venues;if(!v)return el('p','Outras corretoras indisponíveis.','dock-note');
  const names={binance:'Binance (usada pelo piloto)',bybit:'Bybit',okx:'OKX',hyperliquid:'Hyperliquid'};
  const t=table(['Corretora','Mark price','Funding (8 h)','Open interest','Distância do consenso'],v.venues.map(x=>({cells:[names[x.venue]||x.venue,x.quote?fmt(x.quote.markPrice):'—',x.quote?fmt(x.quote.fundingRate8h*100,4)+'%'+(x.quote.fundingIntervalHours===1?' (horário x 8)':''):(x.error||'—'),x.quote?.openInterestUsd?big(x.quote.openInterestUsd):'—',x.quote&&v.consensusMark?fmt((x.quote.markPrice/v.consensusMark-1)*10000,1)+' bps':'—']})));
  const wrap=el('div');wrap.append(t,el('p','Diferença de funding: '+(v.fundingSpread8h==null?'—':fmt(v.fundingSpread8h*100,4)+'% por 8 h ('+pct(v.fundingSpreadAnnualized,1)+' ao ano, teórico)')+' · Binance vs consenso: '+(v.binanceDivergenceBps==null?'—':fmt(v.binanceDivergenceBps,1)+' bps')+'. '+v.note+' Só contexto: o piloto usa apenas a Binance.','dock-note'));return wrap;
 }
 function marketDetails(){
  const host=$('#panoramaDetails'),p=state.panorama;if(!host)return;if(!p){host.replaceChildren(el('p','Contexto público indisponível.'));return;}
  host.replaceChildren(el('h4','Funding e preço em outras corretoras'),venuesTable(),el('h4','Moedas'),table(['Ativo','Preço','24h','Máx.','Mín.','Volume (USDT)'],Object.entries(p.tickers).map(([s,t])=>({cells:[s.replace('USDT','/USDT'),fmt(t.price,t.price<10?4:2),pct(t.change24h),fmt(t.high,t.high<10?4:2),fmt(t.low,t.low<10?4:2),big(t.quoteVolume)]}))),
   el('p','Open interest BTC: '+(p.openInterest?fmt(p.openInterest.btc,0)+' BTC · '+big(p.openInterest.usd):'—')+' · Liquidações observadas: '+big((p.liquidations?.longs||0)+(p.liquidations?.shorts||0))+' ('+p.liquidations?.note+')'));
 }

 // ---------- tick ----------
 // Estados visuais ligados a fatos reais: lendo (pesquisa/risco), digitando (teste/execução) e aguardando
 // (próximo candle do piloto, estudo ou pesquisa em andamento no servidor).
 /** Esperas reais que dependem do dono, a partir do estado recebido do servidor. */
 function waitingForOwner(f){
  if(f?.risk?.halted===true)return 'aguardando você (pausado)';
  if(f?.autonomous?.stopReason)return 'aguardando você (piloto encerrado)';
  if(f?.autonomous&&!f.autonomous.enabled&&f.autonomous.blockedReason)return 'aguardando liberação';
  return null;
 }
 function activity(){
  const auto=finance()?.autonomous,jobs=screens.state.readiness?.jobs,badges={};
  if(auto?.enabled&&!auto.stopReason){const next=OfficeScreens.nextDecision(Date.now(),auto);if(next.due)badges.nova='⏳ candle das '+hhmm(next.due-60000);}
  if(jobs?.historical?.busy)badges.euler='⏳ estudo em andamento';if(jobs?.research?.busy)badges.atlas='⏳ pesquisa em andamento';
  // "Aguardando aprovação" só quando existe uma espera real pelo dono (a revisão de risco em si é instantânea).
  const waiting=waitingForOwner(finance());if(waiting)badges.sentinel='✋ '+waiting;
  for(const [id,view] of agentViews){
   const status=agents.get(id)?.status;view.button.dataset.activity=id==='sentinel'&&waiting?'waiting':status==='RESEARCHING'||status==='REVIEWING_RISK'?'reading':status==='BACKTESTING'||status==='TRADING'?'typing':'idle';
   let badge=view.button.querySelector?.('.state-badge');if(badges[id]){if(!badge){badge=el('span','','state-badge');badge.setAttribute('aria-hidden','true');view.button.append(badge);}badge.textContent=badges[id];}else badge?.remove();
  }
 }
 function paint(){activity();header();wall();
  // Monitores das mesas: só dados recebidos (panorama público, cotação da sessão, conta do piloto, mensagens registradas).
  globalThis.OfficeDeskScreens?.paint({panorama:state.panorama,finance:finance(),messages:communicationReady?communications:[]});if(!state.cardReady&&agents.has(state.selected)){state.cardReady=true;$('#agentCard').hidden=false;selectAgent(state.selected);}card();renderActivity();lighting();watchPositions();if(openGroup)fillLarge();}
 for(const b of D.querySelectorAll('.dock-tabs button'))b.onclick=()=>{state.tab=b.dataset.tab;card();};
 $('#closeCard').onclick=()=>{$('#agentCard').hidden=true;};
 $('#cardProfile').onclick=()=>profile(state.selected);
 globalThis.OfficeDashboard={selectAgent,paint,eventLine,isActive,toast,notifyEvent,state};
 notifySettings();lighting();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/office/sw.js',{scope:'/office/'}).catch(()=>{});
 setInterval(header,1000);setInterval(paint,3000);setInterval(loadPanorama,5000);setInterval(loadActivity,20000);setInterval(loadScorecard,60000);loadScorecard();setInterval(loadVenues,60000);loadVenues();
 setTimeout(paint,800);
 loadPanorama();loadActivity();
})();
