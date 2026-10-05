// Gráfico ao vivo das telas das moedas (BTC/USDT, BTC PERP, ETH/USDT). Só lê /market/chart, que devolve os candles
// públicos que o servidor já recebe da Binance; nunca envia ordens. Sem dado novo, a janela diz que não está ao vivo.
(() => {
 const D=globalThis.document;if(!D)return;
 const NS='http://www.w3.org/2000/svg',UP='#22e39f',DOWN='#ff5577',POLL_MS=2000;
 const COINS={BTCUSDT:{name:'BTC/USDT',icon:'₿',cls:'btc',source:'Binance spot'},BTCPERP:{name:'BTC PERP · USD-M',icon:'₿',cls:'btc perp',source:'Binance perpétuo USD-M'},ETHUSDT:{name:'ETH/USDT',icon:'Ξ',cls:'eth',source:'Binance spot'}};
 const state={symbol:null,interval:'1m',data:null,timer:null,hover:null};
 const $=s=>D.querySelector(s);
 const fmt=(v,d=2)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const big=v=>!Number.isFinite(v)?'—':v>=1e9?'US$ '+fmt(v/1e9,2)+' bi':v>=1e6?'US$ '+fmt(v/1e6,1)+' mi':'US$ '+fmt(v,0);
 const pad2=n=>String(n).padStart(2,'0');
 const el=(name,attrs={},text)=>{const n=D.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};

 /** Marcas "redondas" do eixo de preço (passos 1, 2, 2,5 ou 5 × 10^k) e as casas decimais que elas pedem. */
 function niceTicks(lo,hi,count=5){
  const raw=(hi-lo)/count||Math.abs(hi)*0.001||1,mag=10**Math.floor(Math.log10(raw)),step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw);
  const decimals=Math.max(0,-Math.floor(Math.log10(step)))+(Math.round(step/mag*10)%10?1:0),ticks=[];
  for(let t=Math.ceil(lo/step)*step;t<=hi+step*1e-9;t+=step)ticks.push(Number(t.toFixed(decimals+2)));
  return {ticks,decimals:Math.min(decimals,6)};
 }
 function timeLabel(t,interval){const d=new Date(t);return interval==='1h'&&d.getHours()===0?pad2(d.getDate())+'/'+pad2(d.getMonth()+1):pad2(d.getHours())+':'+pad2(d.getMinutes());}

 // ---------- janela ----------
 function open(symbol){
  if(!COINS[symbol])return;const dialog=$('#chartDialog');if(!dialog)return;
  state.symbol=symbol;state.data=null;state.hover=null;header();draw();
  if(!dialog.open)dialog.showModal();
  clearInterval(state.timer);state.timer=setInterval(load,POLL_MS);load();
 }
 function stop(){clearInterval(state.timer);state.timer=null;state.symbol=null;}
 async function load(){
  const {symbol,interval}=state;if(!symbol)return;
  try{const r=await get('/market/chart?symbol='+symbol+'&interval='+interval);if(state.symbol!==symbol||state.interval!==interval)return;if(r?.scope!=='PUBLIC_MARKET_CONTEXT_ONLY'||!Array.isArray(r.candles))throw Error('invalid chart');state.data=r;}
  catch{if(state.symbol!==symbol||state.interval!==interval)return;state.data={error:true};}
  header();draw();
 }
 function header(){
  const coin=COINS[state.symbol];if(!coin)return;const d=state.data&&!state.data.error?state.data:null;
  $('#chartCoin').className='coin '+coin.cls;$('#chartCoin').textContent=coin.icon;$('#chartTitle').textContent=coin.name;$('#chartSource').textContent=coin.source;
  $('#chartPrice').textContent=d?fmt(d.last,2):'—';
  const ch=$('#chartChange');ch.textContent=Number.isFinite(d?.change24h)?(d.change24h>=0?'▲ ':'▼ ')+fmt(Math.abs(d.change24h*100),2)+'%':'— 24h';ch.className='chart-change '+(Number.isFinite(d?.change24h)?(d.change24h>=0?'up':'down'):'');
  const live=$('#chartLive');live.dataset.live=String(!!d?.fresh);live.textContent=d?.fresh?'Ao vivo':state.data?.error?'Indisponível':d?'Sem dado novo':'Conectando';
  for(const b of D.querySelectorAll('#chartDialog [data-interval]'))b.setAttribute('aria-pressed',String(b.dataset.interval===state.interval));
  const stats=$('#chartStats');stats.replaceChildren();
  for(const [label,value] of [['Máx 24h',fmt(d?.high24h,2)],['Mín 24h',fmt(d?.low24h,2)],['Volume 24h',d?.quoteVolume24h!=null?big(d.quoteVolume24h):null]]){if(value===null)continue;const s=D.createElement('span'),b=D.createElement('b');s.textContent=label;b.textContent=value;s.append(b);stats.append(s);}
 }

 // ---------- desenho ----------
 let layout=null;
 function draw(){
  const host=$('#chartCanvas');if(!host)return;const d=state.data,rows=d&&!d.error?d.candles:[];
  if(rows.length<2){const p=D.createElement('p');p.className='empty';p.textContent=!d?'Carregando candles…':d.error?'Gráfico indisponível agora.':'Aguardando candles da Binance.';host.replaceChildren(p);layout=null;tip(null);return;}
  const W=Math.max(320,Math.round(host.clientWidth||900)),H=Math.max(220,Math.round(host.clientHeight||420)),AX=78,BOT=24,TOP=12,volH=Math.round((H-BOT-TOP)*0.16),priceH=H-BOT-TOP-volH-8;
  const n=rows.length,step=(W-AX-8)/n,bw=Math.max(1,step*0.66);
  let lo=Math.min(...rows.map(c=>c.l)),hi=Math.max(...rows.map(c=>c.h));const margin=(hi-lo||hi*0.001)*0.06;lo-=margin;hi+=margin;
  const y=v=>TOP+(hi-v)/(hi-lo)*priceH,x=i=>4+i*step+step/2,s=el('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,'aria-hidden':'true'});
  const {ticks,decimals}=niceTicks(lo,hi,6);
  for(const t of ticks){s.append(el('line',{x1:0,x2:W-AX,y1:y(t),y2:y(t),stroke:'#13233c'}),el('text',{x:W-AX+8,y:y(t)+4},fmt(t,decimals)));}
  const every=Math.max(1,Math.round(n/7));for(let i=n-1;i>=0;i-=every){s.append(el('line',{x1:x(i),x2:x(i),y1:TOP,y2:H-BOT,stroke:'#0f1d33'}),el('text',{x:x(i),y:H-7,'text-anchor':'middle'},timeLabel(rows[i].t,state.interval)));}
  const vmax=Math.max(0,...rows.map(c=>c.v||0));
  rows.forEach((c,i)=>{
   const color=c.c>=c.o?UP:DOWN;
   if(vmax>0&&c.v){const h=c.v/vmax*volH;s.append(el('rect',{x:x(i)-bw/2,y:H-BOT-h,width:bw,height:h,fill:color,opacity:.3}));}
   s.append(el('line',{x1:x(i),x2:x(i),y1:y(c.h),y2:y(c.l),stroke:color,'stroke-width':1}));
   s.append(el('rect',{x:x(i)-bw/2,y:Math.min(y(c.o),y(c.c)),width:bw,height:Math.max(1,Math.abs(y(c.o)-y(c.c))),fill:color}));
  });
  // Linha e etiqueta do último preço, na cor do candle em formação.
  const last=rows.at(-1),lastColor=last.c>=last.o?UP:DOWN,ly=y(last.c);
  s.append(el('line',{x1:0,x2:W-AX,y1:ly,y2:ly,stroke:lastColor,'stroke-dasharray':'3 4',opacity:.8}),el('rect',{x:W-AX+2,y:ly-10,width:AX-4,height:20,rx:3,fill:lastColor}),el('text',{x:W-AX+6,y:ly+4,class:'last'},fmt(last.c,2)));
  const cross=el('g',{class:'cross'});s.append(cross);
  const hit=el('rect',{x:0,y:0,width:W-AX,height:H-BOT,fill:'transparent',class:'hit'});s.append(hit);
  hit.addEventListener('pointermove',ev=>{const r=s.getBoundingClientRect(),px=(ev.clientX-r.left)*W/r.width;const i=Math.max(0,Math.min(n-1,Math.floor((px-4)/step)));state.hover=rows[i].t;crosshair();});
  hit.addEventListener('pointerleave',()=>{state.hover=null;crosshair();});
  host.replaceChildren(s);layout={rows,x,y,W,H,AX,BOT,TOP,decimals,cross,svg:s};crosshair();
 }
 /** Mira e caixa com abertura, máxima, mínima, fechamento e variação do candle sob o cursor. */
 function crosshair(){
  if(!layout)return tip(null);const {rows,x,y,W,H,AX,BOT,TOP,cross,svg}=layout;cross.replaceChildren();
  const i=rows.findIndex(c=>c.t===state.hover);if(i<0)return tip(null);const c=rows[i];
  cross.append(el('line',{x1:x(i),x2:x(i),y1:TOP,y2:H-BOT,stroke:'#59e1ff',opacity:.55,'stroke-dasharray':'2 3'}),el('line',{x1:0,x2:W-AX,y1:y(c.c),y2:y(c.c),stroke:'#59e1ff',opacity:.35,'stroke-dasharray':'2 3'}));
  const r=svg.getBoundingClientRect(),scale=r.width/W||1;tip(c,x(i)*scale,i>rows.length*0.6);
 }
 function tip(c,left,flip){
  const box=$('#chartTip');if(!box)return;if(!c){box.hidden=true;return;}
  const d=new Date(c.t),change=c.c/c.o-1,decimals=2,row=(k,v,cls)=>{const s=D.createElement('span'),b=D.createElement('b');s.textContent=k;b.textContent=v;if(cls)b.className=cls;s.append(b);return s;};
  const head=D.createElement('small');head.textContent=pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+' '+pad2(d.getHours())+':'+pad2(d.getMinutes());
  box.replaceChildren(head,row('Abe',fmt(c.o,decimals)),row('Máx',fmt(c.h,decimals)),row('Mín',fmt(c.l,decimals)),row('Fec',fmt(c.c,decimals)),row('Var',(change>=0?'+':'')+fmt(change*100,2)+'%',change>=0?'up':'down'));
  box.hidden=false;box.style.left=flip?'auto':(left+14)+'px';box.style.right=flip?((layout.svg.getBoundingClientRect().width||0)-left+14)+'px':'auto';
 }

 // ---------- ligações ----------
 function bind(){
  const dialog=$('#chartDialog');if(!dialog)return;
  for(const screen of D.querySelectorAll('.coin-screen[data-wall]')){
   const symbol=screen.dataset.wall;if(!COINS[symbol])continue;
   screen.tabIndex=0;screen.setAttribute('role','button');screen.setAttribute('aria-label','Abrir gráfico ao vivo de '+COINS[symbol].name);
   screen.addEventListener('click',()=>open(symbol));screen.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open(symbol);}});
  }
  for(const b of dialog.querySelectorAll('[data-interval]'))b.addEventListener('click',()=>{if(state.interval===b.dataset.interval)return;state.interval=b.dataset.interval;state.data=null;state.hover=null;header();draw();load();});
  $('#closeChart').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',stop);
  globalThis.addEventListener?.('resize',()=>{if(dialog.open)draw();});
 }
 bind();
 globalThis.OfficeCoinChart=Object.freeze({open,niceTicks,timeLabel,COINS,state});
})();
