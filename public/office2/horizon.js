// Escritório 2.0 (F5): Horizon, inteligência de mercado. Só dados públicos que o servidor já coleta (/market/panorama,
// /market/v3, /market/venues) e as observações gravadas da equipe. Nada de métrica sem fonte (ex.: "baleias", arbitragem).
// Outras corretoras são referência: não alimentam sinal, risco nem execução do piloto.
(() => {
 const MAX_AGE_MS=Object.freeze({ticker:120000,quote:15000,oi:600000,venues:900000});
 const pct=v=>Number.isFinite(v)?(v>=0?'+':'')+(v*100).toFixed(2)+'%':'n/d';
 const usd=v=>!Number.isFinite(v)?'n/d':v>=1e9?(v/1e9).toFixed(2)+' bi':v>=1e6?(v/1e6).toFixed(1)+' mi':v.toFixed(0);
 const fresh=(time,now,max)=>Number.isFinite(time)&&now-time<=max;
 /** Última observação gravada de um pesquisador (contexto das mensagens RESEARCH_FINDING). */
 function lastFinding(messages,from){if(!Array.isArray(messages))return null;for(let k=messages.length-1;k>=0;k--){const m=messages[k];if(m.from===from&&m.kind==='RESEARCH_FINDING')return {at:m.createdAt,summary:m.summary,context:m.context??{}};}return null;}
 function horizon(panorama,v3,venues,messages,now){
  const p=panorama&&panorama.scope==='PUBLIC_MARKET_CONTEXT_ONLY'?panorama:null,q=v3?.quote??null,v=venues&&venues.scope==='PUBLIC_CROSS_VENUE_CONTEXT_ONLY'?venues:null;
  const tickers=p?Object.entries(p.tickers??{}).map(([symbol,t])=>({symbol,price:t.price,change:t.change24h,fresh:!!t.fresh&&fresh(t.time,now,MAX_AGE_MS.ticker)})):[];
  const btc=(p?.candles?.BTCUSDT??[]).map(c=>c.c).filter(Number.isFinite);
  const flow=(p?.flow??[]).reduce((a,f)=>({buy:a.buy+(f.buy??0),sell:a.sell+(f.sell??0)}),{buy:0,sell:0});
  const oracle=lastFinding(messages,'oracle'),vega=lastFinding(messages,'vega');
  return {
   tickers,btc48h:btc,
   perp:q?{mark:q.markPrice,index:q.indexPrice,funding:q.fundingRate,nextFunding:q.nextFundingTime,spreadBps:Number.isFinite(q.ask)&&Number.isFinite(q.bid)?(q.ask-q.bid)/((q.ask+q.bid)/2)*10000:null,fresh:v3?.status==='HEALTHY'&&fresh(q.markTime,now,MAX_AGE_MS.quote)}:null,
   oi:p?.openInterest?{usd:p.openInterest.usd,change:p.openInterest.change24h,fresh:!!p.openInterest.fresh}:null,
   liquidations:p?.liquidations?{longs:p.liquidations.longs,shorts:p.liquidations.shorts,hours:p.liquidations.coverageHours,note:'piso observado: a Binance transmite no máximo uma liquidação por símbolo por segundo'}:null,
   flow:p?.flow?.length?{minutes:p.flow.length,buy:flow.buy,sell:flow.sell,delta:flow.buy-flow.sell}:null,
   book:p?.book?{bids:p.book.bids??[],asks:p.book.asks??[],time:p.book.time}:null,
   venues:v?{consensus:v.consensusMark,divergenceBps:v.binanceDivergenceBps,fundingSpread8h:v.fundingSpread8h,count:(v.venues??[]).filter(x=>x.quote).length,note:'referência: não alimenta sinal, risco nem execução do piloto'}:null,
   regime:oracle?{at:oracle.at,regime:oracle.context.regime??null,distance:oracle.context.distanceToSma240??null}:null,
   volatility:vega?{at:vega.at,d24:vega.context.dailyVolatility24h??null,d7:vega.context.dailyVolatility7d??null,expanding:vega.context.volatilityExpanding??null}:null,
   errors:p?.errors?.length??0};
 }
 function onScreen(ctx,inner,draw){const [p0,p1,,p3]=inner;ctx.save();ctx.beginPath();inner.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
  ctx.transform((p1.x-p0.x)/100,(p1.y-p0.y)/100,(p3.x-p0.x)/100,(p3.y-p0.y)/100,p0.x,p0.y);draw(ctx);ctx.restore();}
 /** BTC 48 h (fechamento horário). */
 function paintPrice(ctx,inner,vm){const v=vm?.btc48h??[];if(v.length<2)return false;const min=Math.min(...v),max=Math.max(...v),span=max-min||1;
  onScreen(ctx,inner,c=>{c.strokeStyle='#5fb6ff';c.lineWidth=2.5;c.beginPath();v.forEach((e,k)=>{const x=5+k*(90/(v.length-1)),y=88-((e-min)/span)*72;k?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();});return true;}
 /** Profundidade do book (compras à esquerda em azul, vendas à direita em âmbar). */
 function paintBook(ctx,inner,vm){const b=vm?.book;if(!b?.bids?.length||!b?.asks?.length)return false;const cum=a=>{let s=0;return a.slice(0,20).map(([,q])=>s+=q);};const bids=cum(b.bids),asks=cum(b.asks),max=Math.max(bids.at(-1),asks.at(-1))||1;
  onScreen(ctx,inner,c=>{bids.forEach((q,k)=>{const h=q/max*76;c.fillStyle='#5fb6ff';c.fillRect(48-(k+1)*2.2,90-h,2,h);});asks.forEach((q,k)=>{const h=q/max*76;c.fillStyle='#ffd166';c.fillRect(52+k*2.2,90-h,2,h);});});return true;}
 globalThis.Office2Horizon=Object.freeze({MAX_AGE_MS,horizon,paintPrice,paintBook,pct,usd,lastFinding});
})();
