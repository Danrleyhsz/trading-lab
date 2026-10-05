// Scene screens. The painted monitors show only data the page received (accounts, risk state, quotes,
// recorded messages); a screen without a fresh source says so instead of drawing a placeholder.
(() => {
 const W=1852,H=849;
 // Inner screen rectangles measured on office-reference-v2.png (scene pixels).
 const surfaces=Object.freeze([
  {id:'war-equity',x:705,y:595,w:124,h:68,title:'EQUITY · NOVA (PILOTO)'},
  {id:'war-positions',x:841,y:595,w:141,h:68,title:'POSIÇÕES ABERTAS'},
  {id:'war-drawdown',x:995,y:595,w:115,h:68,title:'DRAWDOWN'},
  {id:'analysis-book',x:1421,y:585,w:145,h:50,title:'ORDER BOOK'},
  {id:'analysis-flow',x:1583,y:585,w:148,h:50,title:'FOOTPRINT · DELTA 1 MIN'},
  {id:'analysis-liquidations',x:1421,y:643,w:145,h:47,title:'LIQUIDAÇÕES (24H)'},
  {id:'analysis-profile',x:1583,y:643,w:148,h:47,title:'VOLUME PROFILE'},
  {id:'meeting-briefing',x:1470,y:335,w:185,h:62,title:'ÚLTIMO BRIEFING DA EQUIPE'},
  {id:'risk-board',x:1558,y:111,w:160,h:71,title:'RISK DESK'},
  {id:'data-center',x:218,y:690,w:52,h:31,title:'SERVIÇO'}
 ]);
 const svgNS='http://www.w3.org/2000/svg';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const num=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const pct=(v,d=2)=>Number.isFinite(v)?(v>=0?'+':'')+num(v*100,d)+'%':'—';
 const clock=t=>new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 const span=ms=>{const m=Math.max(0,Math.round(ms/60000));return m<60?m+' min':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0');};
 function line(values,{color='#18dba0',fill=false}={}){
  if(!document.createElementNS||values.length<2)return null;
  const low=Math.min(...values),high=Math.max(...values),svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 100 30');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const points=values.map((v,i)=>(i/(values.length-1)*100).toFixed(2)+','+(28-(v-low)/(high-low||1)*26).toFixed(2)).join(' ');
  if(fill){const area=document.createElementNS(svgNS,'polygon');area.setAttribute('points','0,30 '+points+' 100,30');area.setAttribute('fill',color);area.setAttribute('opacity','.18');svg.append(area);}
  const path=document.createElementNS(svgNS,'polyline');path.setAttribute('points',points);path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','1.6');path.setAttribute('vector-effect','non-scaling-stroke');svg.append(path);return svg;
 }
 function bars(items,{height=30,colors}){
  if(!document.createElementNS||!items.length)return null;const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 100 '+height);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const max=Math.max(...items.map(i=>Math.abs(i.a)+Math.abs(i.b||0)),1e-12),w=100/items.length;
  items.forEach((item,i)=>{let y=height;for(const [value,color] of [[item.a,colors[0]],[item.b||0,colors[1]]]){const h=Math.abs(value)/max*(height-2);if(h<=0)continue;y-=h;const r=document.createElementNS(svgNS,'rect');r.setAttribute('x',String(i*w+w*0.12));r.setAttribute('width',String(w*0.76));r.setAttribute('y',String(y));r.setAttribute('height',String(h));r.setAttribute('fill',color);svg.append(r);}});
  return svg;
 }
 /** Cumulative depth: bids to the left (green), asks to the right (red). */
 function depth(book){
  if(!document.createElementNS||!book)return null;const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 100 30');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const cum=rows=>{let s=0;return rows.map(([p,q])=>[p,s+=q]);},bids=cum(book.bids),asks=cum(book.asks),low=bids.at(-1)[0],high=asks.at(-1)[0],max=Math.max(bids.at(-1)[1],asks.at(-1)[1]);
  const x=p=>(p-low)/(high-low||1)*100,y=v=>30-v/max*28;
  for(const [rows,color] of [[bids,'#22e39f'],[asks,'#ff5577']]){const pts=rows.map(([p,v])=>x(p).toFixed(2)+','+y(v).toFixed(2)),edge=x(rows[0][0]).toFixed(2);
   const area=document.createElementNS(svgNS,'polygon');area.setAttribute('points',edge+',30 '+pts.join(' ')+' '+x(rows.at(-1)[0]).toFixed(2)+',30');area.setAttribute('fill',color);area.setAttribute('opacity','.55');svg.append(area);}
  return svg;
 }
 function profileBars(profile,price){
  if(!document.createElementNS||!profile?.buckets?.length)return null;const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 100 30');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const rows=[...profile.buckets].reverse(),max=Math.max(...rows.map(b=>b.volume),1e-12),h=30/rows.length,step=rows.length>1?Math.abs(rows[0].price-rows[1].price):Infinity;
  rows.forEach((b,i)=>{const r=document.createElementNS(svgNS,'rect');r.setAttribute('x','0');r.setAttribute('y',String(i*h+h*0.12));r.setAttribute('height',String(h*0.76));r.setAttribute('width',String(b.volume/max*100));r.setAttribute('fill',Number.isFinite(price)&&Math.abs(b.price-price)<=step/2?'#ffb547':'#3d8bff');svg.append(r);});
  return svg;
 }
 const finite=a=>Array.isArray(a)?a.filter(s=>Number.isFinite(s?.equity)&&Number.isFinite(s?.timestamp)):[];
 /** Pure projections, exported for tests. */
 function equityView(account){
  if(!account||!Number.isFinite(account.portfolio?.equity)||!(account.initialCash>0))return null;
  const samples=finite(account.samples),equity=account.portfolio.equity;
  let peak=-Infinity;const drawdowns=samples.map(s=>{peak=Math.max(peak,s.equity);return s.equity/peak-1;});
  const currentPeak=Math.max(equity,...samples.map(s=>s.equity));
  return {equity,change:equity/account.initialCash-1,curve:samples.map(s=>s.equity),drawdown:equity/currentPeak-1,drawdowns,maxDrawdown:Number.isFinite(account.maxDrawdown)?account.maxDrawdown:null,fresh:account.valuationFresh!==false};
 }
 function positionsView(finance,names={},usdmMark=null){
  const rows=[];
  for(const account of [...(finance?.legacyAccounts||[]),...(finance?.perpetualAccounts||[])])for(const p of account.portfolio?.positions||[]){
   if(!Number.isFinite(p.quantity)||p.quantity===0)continue;
   const mark=account.instrument==='BINANCE_USDM:BTCUSDT'&&Number.isFinite(usdmMark)?usdmMark:null,entry=p.averageEntry;
   const move=mark&&entry>0?(mark/entry-1)*Math.sign(p.quantity):null;
   rows.push({symbol:p.symbol||'BTCUSDT',side:p.quantity>0?'LONG':'SHORT',quantity:Math.abs(p.quantity),entry,move,owner:account.kind==='FUND'?'Fundo':names[account.ownerAgentId]||account.ownerAgentId||account.id});
  }
  return rows;
 }
 function riskChecks(finance,account){
  const risk=finance?.risk,auto=finance?.autonomous;if(!risk)return [];
  const limit=Number.isFinite(auto?.maxLossFraction)?auto.maxLossFraction:null,loss=account?1-account.portfolio.equity/account.initialCash:null;
  return [
   {label:'Novas exposições liberadas',ok:risk.halted===false},
   {label:'Fonte de mercado atual',ok:risk.marketReady===true},
   {label:'Funding conciliado',ok:risk.fundingReady===true},
   {label:limit!==null?'Perda do piloto < '+num(limit*100,0)+'%':'Limite do piloto',ok:limit!==null&&loss!==null&&loss<limit},
   {label:'Gravação sem falhas',ok:risk.persistenceFailed===false}
  ];
 }
 function nextDecision(now,auto){
  if(!auto?.enabled)return {label:auto?.blockedReason?'Bloqueado: '+auto.blockedReason:'Autonomia desligada',due:null};
  if(auto.stopReason)return {label:'Piloto encerrado: '+auto.stopReason,due:null};
  const hour=3600000,due=Math.floor(now/hour)*hour+hour+60000;// closed candle plus the cycle's first quotes
  return {label:'fechamento do candle às '+clock(due-60000),due};
 }
 const briefingLines=(messages,names={})=>{
  const plan=[...(messages||[])].reverse().find(m=>m.kind==='EXECUTION_PLAN'&&m.context?.decisionEventId);if(!plan)return null;
  const same=(messages||[]).filter(m=>m.context?.decisionEventId===plan.context.decisionEventId);
  const short={satoshi:c=>'24h '+pct(c.change24h),vega:c=>'vol '+pct(c.dailyVolatility24h).replace('+',''),flux:c=>'funding '+(Number.isFinite(c.fundingRate)?num(c.fundingRate*100,4)+'%':'—'),oracle:c=>({TRENDING_UP:'alta',TRENDING_DOWN:'baixa',RANGE:'lateral'}[c.regime]||'indefinido')};
  const lines=same.filter(m=>short[m.from]).map(m=>(names[m.from]||m.from)+': '+short[m.from](m.context||{}));
  const d=plan.context.direction;lines.push((names.nova||'Nova')+': '+(d>0?'long':d<0?'short':plan.context.currentQuantity?'fechar':'ficar flat'));
  return {at:plan.createdAt,candle:plan.context.candleTimestamp,lines};
 };
 class Screens {
  constructor(office,now=()=>Date.now()){this.office=office;this.now=now;this.nodes=new Map();this.state={};}
  mount(){
   for(const s of surfaces){if(this.nodes.has(s.id))continue;const box=el('div',undefined,'live-screen');box.dataset.screen=s.id;box.setAttribute('aria-hidden','true');
    box.setAttribute('style','left:'+(s.x/W*100)+'%;top:'+(s.y/H*100)+'%;width:'+(s.w/W*100)+'%;height:'+(s.h/H*100)+'%');this.office.append(box);this.nodes.set(s.id,box);}
  }
  update(patch){Object.assign(this.state,patch);this.render();}
  fill(id,children,tone){const box=this.nodes.get(id);if(!box)return;box.replaceChildren(el('small',surfaces.find(s=>s.id===id).title,'screen-head'),...children.filter(Boolean));if(tone)box.dataset.tone=tone;else delete box.dataset.tone;}
  render(){
   if(!this.nodes.size)this.mount();
   const {finance,quote,trace=[],messages=[],names={},readiness}=this.state,now=this.now();
   const freshQuote=quote&&Number.isFinite(quote.markTime)&&now-quote.markTime<=15000;
   const nova=finance?.perpetualAccounts?.find(a=>a.id===finance?.autonomous?.accountId)||finance?.perpetualAccounts?.find(a=>a.ownerAgentId==='nova');
   const e=equityView(nova);
   if(e){this.fill('war-equity',[el('b',pct(e.change),e.change>=0?'up':'down'),el('span',num(e.equity)+' USDT'),line(e.curve,{color:e.change>=0?'#18dba0':'#ff5c7a',fill:true})],e.fresh?undefined:'stale');}
   else this.fill('war-equity',[el('span','Conta indisponível','muted')],'stale');
   if(finance){const rows=positionsView(finance,names,freshQuote?quote.markPrice:null);
    this.fill('war-positions',rows.length?rows.slice(0,4).map(r=>el('span',r.symbol.replace('USDT','')+' '+r.side+' '+num(r.quantity,3)+' · '+r.owner+(r.move!==null?' '+pct(r.move):''),r.side==='LONG'?'up':'down')):[el('span','Nenhuma posição aberta','muted'),el('small','Nova está fora do mercado (flat)')]);}
   else this.fill('war-positions',[el('span','Contas indisponíveis','muted')],'stale');
   if(e){this.fill('war-drawdown',[el('b',pct(e.drawdown),e.drawdown<0?'down':'up'),el('small','máx. observado '+(e.maxDrawdown===null?'—':num(e.maxDrawdown*100)+'%')),line(e.drawdowns.length>1?e.drawdowns:[0,0],{color:'#ff5c7a',fill:true})]);}
   else this.fill('war-drawdown',[el('span','—','muted')],'stale');
   const p=this.state.panorama;
   if(p?.book){const b=p.book,spread=(b.asks[0][0]-b.bids[0][0])/((b.asks[0][0]+b.bids[0][0])/2)*10000;this.fill('analysis-book',[el('small',num(b.bids[0][0])+' / '+num(b.asks[0][0])+' · spread '+num(spread,3)+' bps'),depth(b)]);}
   else this.fill('analysis-book',[el('span','Livro indisponível ou atrasado','muted')],'stale');
   const flow=(p?.flow||[]).slice(-40);
   if(flow.length>1){const delta=flow.reduce((s,f)=>s+f.buy-f.sell,0);this.fill('analysis-flow',[el('small','delta '+flow.length+' min: '+(delta>=0?'+':'')+num(delta,1)+' BTC',delta>=0?'up':'down'),bars(flow.map(f=>({a:Math.max(0,f.buy-f.sell),b:Math.max(0,f.sell-f.buy)})),{colors:['#22e39f','#ff5577']})]);}
   else this.fill('analysis-flow',[el('span','Fluxo indisponível','muted')],'stale');
   const liq=p?.liquidations;
   if(liq){this.fill('analysis-liquidations',[el('small','longs '+num(liq.longs/1e6,2)+' mi · shorts '+num(liq.shorts/1e6,2)+' mi'+(liq.coverageHours<23.9?' · '+num(liq.coverageHours,1)+' h observadas':'')),bars(liq.hourly.map(h=>({a:h.longs,b:h.shorts})),{colors:['#ff5577','#22e39f']})]);}
   else this.fill('analysis-liquidations',[el('span','Liquidações indisponíveis','muted')],'stale');
   if(p?.volumeProfile){this.fill('analysis-profile',[el('small','24h · faixa '+num(p.volumeProfile.buckets[0].price,0)+'–'+num(p.volumeProfile.buckets.at(-1).price,0)),profileBars(p.volumeProfile,freshQuote?quote.markPrice:NaN)]);}
   else this.fill('analysis-profile',[el('span','Perfil de volume indisponível','muted')],'stale');
   const brief=briefingLines(messages,names),next=finance?.autonomous?nextDecision(now,finance.autonomous):null;
   if(brief)this.fill('meeting-briefing',[el('small','candle '+clock(brief.candle)+(next?.due?' · próximo em '+span(next.due-now):'')),...brief.lines.map(t=>el('span',t))]);
   else this.fill('meeting-briefing',[el('span','Nenhum briefing registrado ainda','muted')]);
   const checks=riskChecks(finance,nova);
   if(checks.length)this.fill('risk-board',checks.map(c=>el('span',(c.ok?'✓ ':'✗ ')+c.label,c.ok?'up':'down')),checks.every(c=>c.ok)?undefined:'alert');
   else this.fill('risk-board',[el('span','Estado de risco indisponível','muted')],'stale');
   const stored=Date.parse(readiness?.storage?.lastPersistedAt);
   this.fill('data-center',readiness?[el('b',readiness.ready?'● ONLINE':'● ALERTA',readiness.ready?'up':'down'),el('small',Number.isFinite(stored)?'DB '+clock(stored):'DB —')]:[el('small','sem diagnóstico','muted')],readiness?.ready?undefined:'stale');
  }
 }
 globalThis.OfficeScreens=Object.freeze({surfaces,equityView,positionsView,riskChecks,nextDecision,briefingLines,Screens});
})();
