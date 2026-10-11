// Resumo visual no topo de cada painel da barra lateral: números grandes, gráficos e ícones, com o mínimo de texto.
// Só apresenta o que a página já recebeu do servidor (contas, mensagens, panorama, registros, placar e diagnóstico);
// nunca envia ordens, tarefas ou estudos. Sem dado, o bloco fica vazio com um traço, nunca com número inventado.
(() => {
 const D=globalThis.document;if(!D)return;
 const NS='http://www.w3.org/2000/svg',UP='#22e39f',DOWN='#ff5577',DIM='#4a5a77',CYAN='#35c9ff';
 const COLORS={atlas:'#5aa7ff',satoshi:'#ffb547',oracle:'#b884ff',nova:'#ff6b81',flux:'#3ce0c8',sentinel:'#e6edf7',euler:'#ffd166',vega:'#7ee081'};
 const IDS=['atlas','satoshi','oracle','nova','flux','sentinel','euler','vega'];
 const data=globalThis.OfficePanelData??={};
 const $=s=>D.querySelector(s);
 const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const pct=(v,d=2)=>Number.isFinite(v)?(v>=0?'+':'')+fmt(v*100,d)+'%':'—';
 const usd=(v,d=2)=>Number.isFinite(v)?(v<0?'-':'')+'US$ '+fmt(Math.abs(v),d):'—';
 const big=v=>!Number.isFinite(v)?'—':Math.abs(v)>=1e9?'US$ '+fmt(v/1e9,2)+' bi':Math.abs(v)>=1e6?'US$ '+fmt(v/1e6,1)+' mi':Math.abs(v)>=1e3?'US$ '+fmt(v/1e3,1)+' mil':'US$ '+fmt(v,0);
 const tone=v=>Number.isFinite(v)&&v!==0?(v>0?'up':'down'):'';
 // Estado compartilhado do app.js (declarações de topo de scripts clássicos, sem propriedade em globalThis).
 /* global agents, communications, communicationReady, screens */
 const G={agents:()=>typeof agents!=='undefined'?agents:null,messages:()=>typeof communicationReady!=='undefined'&&communicationReady&&typeof communications!=='undefined'?communications:[],screens:()=>typeof screens!=='undefined'?screens:null};
 const nameOf=id=>G.agents()?.get?.(id)?.name||(id?id[0].toUpperCase()+id.slice(1):'—');
 function el(tag,text,cls){const n=D.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;}
 function svg(w,h,cls){const s=D.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 '+w+' '+h);s.setAttribute('preserveAspectRatio','none');s.setAttribute('aria-hidden','true');if(cls)s.setAttribute('class',cls);return s;}
 function shape(name,attrs){const s=D.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))s.setAttribute(k,String(v));return s;}

 // ---------- peças visuais ----------
 /** Número grande com rótulo curto; `cls` colore o valor (up/down). */
 function tile(label,value,{cls='',sub,icon}={}){const t=el('div',undefined,'kpi');if(icon)t.append(el('span',icon,'kpi-icon'));const body=el('div');body.append(el('small',label),el('b',value,cls));if(sub)body.append(el('span',sub.text,'kpi-sub '+(sub.cls||'')));t.append(body);return t;}
 const subOf=(text,cls)=>({text,cls});
 /** Anel de progresso (0–1) com o texto no centro. */
 function ring(fraction,center,label,color=UP){
  const box=el('div',undefined,'ring'),s=svg(64,64),r=26,c=2*Math.PI*r,f=Math.max(0,Math.min(1,fraction||0));s.setAttribute('preserveAspectRatio','xMidYMid meet');
  s.append(shape('circle',{cx:32,cy:32,r,fill:'none',stroke:'#16263f','stroke-width':7}),shape('circle',{cx:32,cy:32,r,fill:'none',stroke:color,'stroke-width':7,'stroke-linecap':'round','stroke-dasharray':(c*f)+' '+c,transform:'rotate(-90 32 32)'}));
  box.append(s,el('b',center),el('small',label));return box;
 }
 /** Barras horizontais; valores negativos crescem para a esquerda a partir do meio. */
 function bars(items,{format=v=>String(v),onClick}={}){
  const list=el('div',undefined,'hbars'),max=Math.max(1e-12,...items.map(i=>Math.abs(i.value||0))),signed=items.some(i=>i.value<0);
  for(const item of items){
   const row=el(onClick?'button':'div',undefined,'hbar'+(signed?' signed':''));if(onClick){row.type='button';row.onclick=()=>onClick(item);}
   const head=el('span',undefined,'hbar-label');if(item.agent){const face=el('span','','sprite hbar-face');globalThis.sprite?.(face,item.agent);head.append(face);}else if(item.icon)head.append(el('i',item.icon));head.append(el('span',item.label));
   const track=el('span',undefined,'hbar-track'),fill=el('span',undefined,'hbar-fill'),w=Math.abs(item.value||0)/max*(signed?50:100);
   fill.style.width=w+'%';fill.style.background=item.color||(item.value<0?DOWN:UP);if(signed)fill.style[item.value<0?'right':'left']='50%';track.append(fill);
   row.append(head,track,el('b',item.text??format(item.value),item.cls||''));list.append(row);
  }
  return list;
 }
 /** Barra dividida em partes (ex.: longs × shorts, compras × vendas). */
 function split(parts){
  const total=parts.reduce((s,p)=>s+Math.max(0,p.value||0),0),box=el('div',undefined,'split'),bar=el('div',undefined,'split-bar'),legend=el('div',undefined,'split-legend');
  for(const p of parts){const seg=el('span');seg.style.flex=String(total?Math.max(0,p.value)/total:1/parts.length);seg.style.background=total?p.color:'#16263f';bar.append(seg);const l=el('span');const dot=el('i');dot.style.background=p.color;l.append(dot,el('span',p.label),el('b',p.text??String(p.value)));legend.append(l);}
  box.append(bar,legend);return box;
 }
 /** Candles em SVG; com `ref`, uma linha tracejada de referência (ex.: capital inicial). Faixa mínima de 0,1% para
  * uma série quase parada aparecer no meio, não colada no fundo. */
 function candles(rows,w=220,h=64,{ref}={}){
  const s=svg(w,h,'mini-candles'),data=(rows||[]).filter(c=>[c.o,c.h,c.l,c.c].every(Number.isFinite));if(data.length<2){s.append(shape('line',{x1:w/2-6,x2:w/2+6,y1:h/2,y2:h/2,stroke:DIM}));return s;}
  let lo=Math.min(...data.map(c=>c.l),ref??Infinity),hi=Math.max(...data.map(c=>c.h),ref??-Infinity);const min=Math.abs(hi)*0.001;if(hi-lo<min){const mid=(hi+lo)/2;lo=mid-min/2;hi=mid+min/2;}
  const y=v=>h-3-(v-lo)/(hi-lo||1)*(h-6),step=w/data.length;
  if(Number.isFinite(ref))s.append(shape('line',{x1:0,x2:w,y1:y(ref),y2:y(ref),stroke:'#2c4466','stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke'}));
  data.forEach((c,i)=>{const x=i*step+step/2,color=c.c>=c.o?UP:DOWN;s.append(shape('line',{x1:x,x2:x,y1:y(c.h),y2:y(c.l),stroke:color,'stroke-width':1,'vector-effect':'non-scaling-stroke'}),shape('rect',{x:x-step*0.32,y:Math.min(y(c.o),y(c.c)),width:step*0.64,height:Math.max(1,Math.abs(y(c.o)-y(c.c))),fill:color}));});
  return s;
 }
 /** Candles por hora a partir de pontos {timestamp, equity} (abertura, máxima, mínima e fechamento de cada hora). */
 function hourly(points){const hours=new Map();for(const p of points||[]){const ms=typeof p.timestamp==='number'?p.timestamp:Date.parse(p.timestamp);if(!Number.isFinite(p.equity)||!Number.isFinite(ms))continue;const t=Math.floor(ms/3600000);(hours.get(t)??hours.set(t,[]).get(t)).push(p.equity);}
  return [...hours].sort((a,b)=>a[0]-b[0]).map(([t,v])=>({t:t*3600000,o:v[0],h:Math.max(...v),l:Math.min(...v),c:v.at(-1)}));}
 function face(id,cls='face'){const f=el('span','','sprite '+cls);globalThis.sprite?.(f,id);return f;}
 function card(title,...children){const c=el('section',undefined,'hero-card');if(title)c.append(el('h4',title));c.append(...children);return c;}
 function row(...children){const r=el('div',undefined,'kpi-row');r.append(...children);return r;}
 const empty=text=>el('p',text||'—','hero-empty');

 // ---------- painéis ----------
 const finance=()=>G.screens()?.state?.finance;
 const accounts=()=>finance()?.perpetualAccounts??[];
 function agentsHero(){
  const list=[...(G.agents()?.values?.()??[])],active=list.filter(a=>globalThis.OfficeActivity?.isActive(a)),now=Date.now();
  const msgs=G.messages();const count=id=>msgs.filter(m=>m.from===id&&now-Date.parse(m.createdAt)<=12*3600000).length;
  const rooms={};for(const a of list)rooms[a.room]=(rooms[a.room]||0)+1;
  const roomIcons={'Research Lab':'▤','Trading Floor':'↗','Risk Desk':'✓','Quant Lab':'⚗',Lounge:'☕','Meeting Room':'↔'};
  const chips=el('div',undefined,'chips');for(const [room,n] of Object.entries(rooms)){const c=el('span',undefined,'chip');c.append(el('i',roomIcons[room]||'•'),el('span',room),el('b',String(n)));chips.append(c);}
  return [card(null,row(ring(list.length?active.length/list.length:0,active.length+'/'+(list.length||8),'trabalhando'),chips)),
   card('Mensagens · 12 h',bars(IDS.filter(id=>list.some(a=>a.id===id)).map(id=>({label:nameOf(id),agent:id,value:count(id),color:COLORS[id]}))))];
 }
 function financeHero(){
  const acc=accounts();if(!acc.length)return [empty('Contas indisponíveis')];
  const equity=acc.reduce((s,a)=>s+a.portfolio.equity,0),initial=acc.reduce((s,a)=>s+a.initialCash,0),open=acc.filter(a=>a.portfolio.positions?.some(p=>p.quantity)).length;
  const dd=Math.max(0,...acc.map(a=>Number.isFinite(a.maxDrawdown)?a.maxDrawdown:0)),costs=acc.reduce((s,a)=>s+(a.feesPaid||0)-(a.fundingCashDelta||0),0);
  const pilot=acc.find(a=>a.id===finance()?.autonomous?.accountId)||acc.find(a=>a.ownerAgentId==='nova');
  const grid=el('div',undefined,'account-grid');
  for(const a of [...acc].sort((x,y)=>IDS.indexOf(x.ownerAgentId)-IDS.indexOf(y.ownerAgentId))){
   const net=a.portfolio.equity/a.initialCash-1,pos=a.portfolio.positions?.find(p=>p.quantity),c=el('button',undefined,'account-tile');c.type='button';c.style.setProperty('--agent',COLORS[a.ownerAgentId]||CYAN);
   c.append(face(a.ownerAgentId),el('b',nameOf(a.ownerAgentId)),el('strong',usd(a.portfolio.equity)),el('span',pct(net),'pill '+tone(net)),el('span',pos?(pos.quantity>0?'LONG':'SHORT'):'sem posição','pos '+(pos?(pos.quantity>0?'up':'down'):'')),el('small',a.fills+' fills'));
   if(globalThis.openAccountAudit)c.onclick=()=>globalThis.openAccountAudit(a);grid.append(c);
  }
  return [row(tile('Capital das avaliações',usd(equity),{icon:'◎'}),tile('P&L',usd(equity-initial),{cls:tone(equity-initial),sub:subOf(pct(initial?equity/initial-1:NaN),tone(equity-initial)),icon:'±'}),tile('Posições abertas',String(open),{icon:'⇅'}),tile('Pior drawdown',fmt(dd*100,2)+'%',{cls:dd>0?'down':'',icon:'↘'}),tile('Taxas e funding',usd(costs),{icon:'⚙'})),
   card('Equity do piloto · '+nameOf(pilot?.ownerAgentId||'nova')+' · por hora',candles(hourly([...(pilot?.hourly??[]),...(pilot?.samples??[])]).slice(-48),640,120,{ref:pilot?.initialCash})),grid];
 }
 function operationsHero(){
  const rows=data.operations;if(!rows)return [empty('Consultando registros…')];
  const fills=rows.filter(e=>e.type==='PAPER_FILL'),buys=fills.filter(e=>e.payload?.fill?.side==='BUY'),funding=rows.filter(e=>e.type==='FUNDING_SETTLED').reduce((s,e)=>s+(e.payload?.cashDelta||0),0);
  const volume=fills.reduce((s,e)=>s+Math.abs((e.payload?.fill?.quantity||0)*(e.payload?.fill?.fillPrice||0)),0),fees=fills.reduce((s,e)=>s+(e.payload?.fill?.fee||0),0);
  // Linha do tempo dos últimos 7 dias: ▲ compra, ▼ venda, ● funding.
  const W=900,H=56,end=Date.now(),start=end-7*86400000,s=svg(W,H,'op-timeline');s.setAttribute('preserveAspectRatio','none');
  for(let d=1;d<7;d++)s.append(shape('line',{x1:d*W/7,x2:d*W/7,y1:4,y2:H-4,stroke:'#13233c'}));s.append(shape('line',{x1:0,x2:W,y1:H/2,y2:H/2,stroke:'#1e3150'}));
  for(const e of rows){const t=Date.parse(e.occurredAt);if(t<start)continue;const x=(t-start)/(end-start)*W;
   if(e.type==='PAPER_FILL'){const buy=e.payload?.fill?.side==='BUY';s.append(shape('path',{d:buy?`M${x} ${H/2-16}l7 12h-14z`:`M${x} ${H/2+16}l7 -12h-14z`,fill:buy?UP:DOWN}));}
   else s.append(shape('circle',{cx:x,cy:H/2,r:3,fill:'#8fa3c4'}));}
  const days=el('div',undefined,'timeline-days');for(let d=6;d>=0;d--){const day=new Date(end-d*86400000);days.append(el('span',String(day.getDate()).padStart(2,'0')+'/'+String(day.getMonth()+1).padStart(2,'0')));}
  return [row(tile('Fills',String(fills.length),{icon:'⇄'}),tile('Compras × vendas',buys.length+' × '+(fills.length-buys.length),{icon:'⇅'}),tile('Volume',big(volume),{icon:'≋'}),tile('Taxas',usd(fees,2),{icon:'⚙'}),tile('Funding',usd(funding,4),{cls:tone(funding),icon:'%'})),
   card('7 dias · ▲ compra ▼ venda ● funding',s,days)];
 }
 function marketHero(){
  const p=globalThis.OfficeDashboard?.state?.panorama,v=globalThis.OfficeDashboard?.state?.venues;if(!p)return [empty('Contexto público indisponível')];
  const coins=el('div',undefined,'coin-tiles'),q=G.screens()?.state?.quote;
  for(const [symbol,label,icon,cls] of [['BTCUSDT','BTC/USDT','₿','btc'],['BTCPERP','BTC PERP','₿','btc perp'],['ETHUSDT','ETH/USDT','Ξ','eth']]){
   const t=p.tickers?.[symbol],rows=(p.candles?.[symbol]??[]).slice(-24),price=symbol==='BTCPERP'?q?.markPrice??rows.at(-1)?.c:t?.price,change=symbol==='BTCPERP'?(rows.length===24?rows.at(-1).c/rows[0].o-1:NaN):t?.change24h;
   const b=el('button',undefined,'coin-tile');b.type='button';b.setAttribute('aria-label','Abrir gráfico ao vivo de '+label);b.onclick=()=>globalThis.OfficeCoinChart?.open(symbol);
   const head=el('div',undefined,'coin-head');head.append(el('span',icon,'coin '+cls),el('b',label),el('span',pct(change),'pill '+tone(change)));b.append(head,el('strong',fmt(price,2)),candles(rows,240,60));coins.append(b);
  }
  const venues=v?.venues?.filter(x=>x.quote)??[],names={binance:'Binance',bybit:'Bybit',okx:'OKX',hyperliquid:'Hyperliquid'};
  const fund=card('Funding 8 h',venues.length?bars(venues.map(x=>({label:names[x.venue]||x.venue,value:x.quote.fundingRate8h,text:fmt(x.quote.fundingRate8h*100,4)+'%',color:x.quote.fundingRate8h>=0?UP:DOWN}))):empty());
  const oi=p.openInterest,oiCard=card('Open interest',el('strong',big(oi?.usd),'hero-value'),el('span',pct(oi?.change24h)+' 24h','pill '+tone(oi?.change24h)),candles(oi?.candles??[],240,54));
  const l=p.liquidations,liq=card('Liquidações 24 h',el('strong',big((l?.longs||0)+(l?.shorts||0)),'hero-value down'),split([{label:'Longs',value:l?.longs||0,text:big(l?.longs),color:DOWN},{label:'Shorts',value:l?.shorts||0,text:big(l?.shorts),color:UP}]));
  const bid=(p.book?.bids??[]).reduce((s,[,q])=>s+q,0),ask=(p.book?.asks??[]).reduce((s,[,q])=>s+q,0);
  const book=card('Livro · 20 níveis',p.book?split([{label:'Compra',value:bid,text:fmt(bid,1)+' BTC',color:UP},{label:'Venda',value:ask,text:fmt(ask,1)+' BTC',color:DOWN}]):empty());
  const heat=el('div',undefined,'heatmap');
  for(const [s,t] of Object.entries(p.tickers??{})){const c=t.change24h,a=Math.min(1,Math.abs(c||0)/0.06),cell=el('div',undefined,'heat');cell.style.background=Number.isFinite(c)?(c>=0?`rgba(34,227,159,${0.12+a*0.55})`:`rgba(255,85,119,${0.12+a*0.55})`):'#0c182c';cell.append(el('b',s.replace('USDT','')),el('span',pct(c)));heat.append(cell);}
  const grid=el('div',undefined,'hero-grid');grid.append(fund,oiCard,liq,book);
  return [coins,grid,card('24 h · moedas',heat)];
 }
 const forwardStatus={WAITING_START:['Aguardando início','⏳',''],RUNNING:['Ao vivo','●','up'],STOPPED_BY_DRAWDOWN:['Parado: queda de 15%','■','down'],COMPLETED:['12 semanas concluídas','✓',''],DATA_UNAVAILABLE:['Dados indisponíveis','!','down'],DISABLED:['Encerrado pelo dono','■','']};
 /** Acompanhamento ao vivo do momentum entre moedas (XSMOM_FORWARD_V1): só simulação, dados públicos. */
 function forwardCard(){
  const f=data.forward;if(!f)return null;
  const [label,icon,cls]=forwardStatus[f.status]||[f.status,'•',''],head=el('div',undefined,'forward-head');
  head.append(el('span',icon+' '+label,'pill '+cls),el('b','Momentum entre moedas · 28 dias · metade do tamanho'),el('small',f.verdict==='APPROVED'?'aprovado':f.verdict==='REJECTED'?'reprovado':f.verdict==='CLOSED_BY_OWNER'?'sem veredito':'em andamento'));
  const left=f.portfolio?.long??[],right=f.portfolio?.short??[],chips=(list,c)=>{const box=el('div',undefined,'coin-chips');for(const s of list)box.append(el('span',s.replace('USDT','').replace('1000',''),'coin-chip '+c));return box;};
  const ddLimit=el('div',undefined,'limit-bar'),fill=el('span');fill.style.width=Math.min(100,(f.maxDrawdown||0)/0.15*100)+'%';ddLimit.append(fill);
  const next=f.nextDecisionAt?Math.max(0,Date.parse(f.nextDecisionAt)-Date.now()):null;
  const body=row(tile('Resultado',f.returnPct===null?'—':pct(f.returnPct),{cls:tone(f.netPnl),sub:f.netPnl===null?undefined:subOf(usd(f.netPnl),tone(f.netPnl)),icon:'±'}),
   ring((f.weeksElapsed||0)/12,(f.weeksElapsed||0)+'/12','semanas',CYAN),
   tile('Queda máxima',f.maxDrawdown===null?'—':fmt(f.maxDrawdown*100,2)+'%',{icon:'↘',sub:subOf('limite 15%','')}),
   tile('Próxima decisão',next===null?'—':next<3600000?Math.round(next/60000)+' min':next<86400000?Math.round(next/3600000)+' h':Math.round(next/86400000)+' d',{icon:'◷'}));
  const portfolio=el('div',undefined,'forward-portfolio');const l=el('div'),r=el('div');l.append(el('small','▲ Comprado'),chips(left,'up'));r.append(el('small','▼ Vendido'),chips(right,'down'));portfolio.append(l,r);
  const c=card(null,head,body,ddLimit,f.curve?.length>1?candles(hourly(f.curve).reduce((days,h)=>{const d=Math.floor(h.t/86400000);const last=days.at(-1);if(last&&last.d===d){last.h=Math.max(last.h,h.h);last.l=Math.min(last.l,h.l);last.c=h.c;}else days.push({d,t:h.t,o:h.o,h:h.h,l:h.l,c:h.c});return days;},[]),640,90,{ref:10000}):empty(f.status==='WAITING_START'?'Primeira decisão: '+new Date(f.startedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'Curva disponível depois da primeira hora'));
  if(f.portfolio)c.append(portfolio);
  c.classList.add('forward-card');if(f.error)c.append(el('small','Última atualização falhou; mostrando o cálculo anterior.','hero-warn'));
  return c;
 }
 function researchHero(){
  const studies=Array.isArray(data.studies)?data.studies:[],runs=Array.isArray(data.runs)?data.runs:[],jobs=Array.isArray(data.jobs)?data.jobs:[];
  const done=studies.filter(s=>Number.isFinite(s.netPnl)),positive=done.filter(s=>s.netPnl>0).length,busy=jobs.filter(j=>j.status==='RUNNING'||j.status==='QUEUED').length;
  const auto=finance()?.autonomous;
  const out=[forwardCard(),row(tile('Estudos históricos',String(studies.length),{icon:'⚗'}),tile('Lucro × prejuízo',positive+' × '+(done.length-positive),{icon:'±'}),tile('Pesquisas',String(runs.length),{icon:'▤'}),tile('Em andamento',String(busy),{cls:busy?'up':'',icon:'⏳'}),tile('Estudo do piloto',auto?.studyId?auto.studyId.slice(0,8):'—',{sub:auto?.studyId?subOf(auto.eligible?'elegível':'não elegível',auto.eligible?'up':'down'):undefined,icon:'★'}))];
  if(runs.length)out.push(card('Pesquisas',split([{label:'Aprovadas',value:runs.filter(r=>r.status==='SCREEN_PASSED').length,color:UP},{label:'Rejeitadas',value:runs.filter(r=>r.status==='REJECTED').length,color:'#ffb547'},{label:'Falhas',value:runs.filter(r=>r.status!=='SCREEN_PASSED'&&r.status!=='REJECTED').length,color:DOWN}])));
  if(done.length)out.push(card('P&L histórico · últimos estudos',bars(done.slice(0,10).map(s=>({label:new Date(s.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' · '+(s.request?.candidateSet||s.request?.bars+' velas'),value:s.netPnl,text:usd(s.netPnl),cls:tone(s.netPnl),id:s.id})),{onClick:item=>globalThis.studyDetails?.(item.id)})));
  return out.filter(Boolean);
 }
 const kindIcons={OBSERVATION:'👁',DECISION:'⚖',FAILURE:'✖',LESSON:'✎',RESEARCH:'▤',PREDICTION:'◎',RISK:'✓'};
 function memoryHero(){
  const all=data.memoriesAll,rows=data.memories?.rows;if(!rows)return [empty('Consultando memórias…')];
  const kinds={};for(const m of rows)kinds[m.kind]=(kinds[m.kind]||0)+1;
  const per=IDS.map(id=>({id,n:(all??rows).filter(m=>m.agentId===id).length})),select=$('#memoryAgent'),chips=el('div',undefined,'agent-chips');
  for(const a of [{id:'',n:(all??rows).length},...per]){const b=el('button',undefined,'agent-chip'+((select?.value||'')===a.id?' active':''));b.type='button';if(a.id){b.append(face(a.id,'chip-face'));b.style.setProperty('--agent',COLORS[a.id]);}else b.append(el('i','✱'));b.append(el('span',a.id?nameOf(a.id):'Todos'),el('b',String(a.n)));
   b.onclick=()=>{if(!select)return;select.value=a.id;select.onchange?.();};chips.append(b);}
  return [chips,card('Por tipo',bars(Object.entries(kinds).sort((a,b)=>b[1]-a[1]).map(([k,n])=>({label:globalThis.OfficeI18n?.kind(k)||k,icon:kindIcons[k]||'•',value:n,color:CYAN}))))];
 }
 const verdicts={IN_PROGRESS:['Em andamento','⏳',''],STOPPED_BY_LOSS_LIMIT:['Parado pelo limite','■','down'],INSUFFICIENT_EVIDENCE:['Evidência insuficiente','?',''],OUTPERFORMED:['Superou as referências','▲','up'],POSITIVE_BELOW_BENCHMARK:['Positivo, abaixo do buy and hold','△','up'],UNDERPERFORMED:['Abaixo do esperado','▼','down']};
 function historyHero(){
  const r=data.report,out=[];const s=globalThis.OfficeDashboard?.state?.scorecard;
  if(r&&r.status!=='NO_DECISIONS'&&r.decisions){
   const [label,icon,cls]=verdicts[r.verdict]||[r.verdict,'•',''],min=r.protocol?.minimumClosedTrades||1;
   const v=el('div',undefined,'verdict '+cls);v.append(el('span',icon,'verdict-icon'),el('b',label));if(r.verdict==='IN_PROGRESS'&&r.provisionalVerdict)v.append(el('small','agora: '+(verdicts[r.provisionalVerdict]?.[0]||r.provisionalVerdict)));
   out.push(row(v,tile('P&L do piloto',usd(r.pnl),{cls:tone(r.pnl),icon:'±'}),ring(r.closedTrades/min,r.closedTrades+'/'+min,'operações fechadas',CYAN),tile('Fills',String(r.fills),{icon:'⇄'}),tile('Horas',String(r.hours),{icon:'◷'})),
    card('Decisões · '+r.decisions.total,split([{label:'Long',value:r.decisions.long,color:UP},{label:'Short',value:r.decisions.short,color:DOWN},{label:'Fora',value:r.decisions.flat,color:'#53627d'}])));
  }else out.push(empty(r?'Nenhuma decisão do piloto ainda':'Consultando avaliação…'));
  if(s?.scorecard?.length)out.push(card('Acerto das previsões · 24 h',bars(s.scorecard.map(c=>({label:nameOf(c.agentId),agent:c.agentId,value:c.hitRate??0,text:c.settled?Math.round(c.hitRate*100)+'% · '+c.settled:'— · '+c.pending+' aguardando',color:c.hitRate==null?DIM:c.hitRate>=0.5?UP:DOWN})))));
  return out;
 }
 function accessHero(){
  const r=data.readiness;if(!r)return [empty('Diagnóstico indisponível')];
  const items=[['Serviço',r.phase==='SERVING',{STARTING:'iniciando',SERVING:'em serviço',DRAINING:'encerrando',STOPPED:'parado'}[r.phase]||r.phase],['Banco',!!r.storage?.lastPersistedAt&&!r.storage?.failed,r.storage?.lastPersistedAt?new Date(r.storage.lastPersistedAt).toLocaleTimeString('pt-BR'):'sem gravação'],
   ['Mercado',r.market?.perpetual?.status==='HEALTHY',r.market?.perpetual?.status==='HEALTHY'?'ao vivo':'indisponível'],['Exposição paper',!!r.paper?.newExposure?.ready,r.paper?.newExposure?.ready?'liberada':'bloqueada'],['Autonomia',!!r.paper?.autonomous?.ready,r.paper?.autonomous?.ready?'pronta':'aguardando'],['IA',!!r.ai?.enabled,r.ai?.enabled?'ligada':'desligada']];
  const grid=el('div',undefined,'status-grid');for(const [label,ok,text] of items){const c=el('div',undefined,'status '+(ok?'ok':'off'));c.append(el('i'),el('small',label),el('b',text));grid.append(c);}
  return [grid];
 }
 const HEROES={agentsPanel:agentsHero,financePanel:financeHero,operationsPanel:operationsHero,marketPanel:marketHero,researchPanel:researchHero,memoryPanel:memoryHero,historyPanel:historyHero,accessPanel:accessHero};

 // ---------- montagem ----------
 /** Textos explicativos vão para um "ⓘ" recolhido no fim do painel; tabelas longas, para "Ver detalhes". */
 const DETAILS={financePanel:['#finance','#accountScope','#accounts'],marketPanel:['.quote-cards','.market-charts','#panoramaDetails','#marketV3'],historyPanel:['#reportStatus','#pilotReport','#teamScorecard'],accessPanel:['#runtimeStatus','#runtimeDetails']};
 function prepare(){
  for(const id of Object.keys(HEROES)){
   const panel=$('#'+id);if(!panel||panel.querySelector(':scope > .panel-hero'))continue;
   const hero=el('div',undefined,'panel-hero');hero.dataset.hero=id;panel.prepend(hero);
   const notes=[...panel.children].filter(n=>n.tagName==='P'&&!n.id&&!n.getAttribute('role'));
   const moved=(DETAILS[id]||[]).map(s=>panel.querySelector(s)).filter(Boolean);
   if(moved.length){const more=el('details',undefined,'panel-more');more.append(el('summary','Ver detalhes'));for(const n of moved){const prev=n.previousElementSibling;if(prev?.tagName==='H3'||prev?.tagName==='H4')more.append(prev);more.append(n);}panel.append(more);}
   if(notes.length){const info=el('details',undefined,'panel-notes');info.append(el('summary','ⓘ Como ler'));info.append(...notes);panel.append(info);}
  }
 }
 function render(){
  const dialog=$('#workspaceDialog');if(!dialog?.open)return;
  for(const [id,build] of Object.entries(HEROES)){
   const panel=$('#'+id);if(!panel||panel.hidden)continue;const hero=panel.querySelector(':scope > .panel-hero');if(!hero)continue;
   // Não redesenha embaixo do mouse para não roubar um clique ou um hover em andamento.
   if(hero.matches(':hover')&&hero.childElementCount)continue;
   try{hero.replaceChildren(...build());}catch{hero.replaceChildren(empty('Resumo indisponível'));}
  }
 }
 prepare();
 const dialog=$('#workspaceDialog');
 if(dialog){dialog.classList.add('wide-panels');new MutationObserver(()=>render()).observe(dialog,{attributes:true,attributeFilter:['open']});for(const id of Object.keys(HEROES)){const p=$('#'+id);if(p)new MutationObserver(()=>render()).observe(p,{attributes:true,attributeFilter:['hidden']});}}
 setInterval(render,3000);
 globalThis.OfficePanels=Object.freeze({render,hourly,HEROES});
})();
