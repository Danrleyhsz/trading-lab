// Monitores das mesas com dados reais (3 por mesa). Cada tela mostra só o que a página recebeu do servidor
// ou da Binance pública; sem dado fresco, a tela fica apagada (nunca um gráfico inventado). Só apresentação.
(() => {
 const D=globalThis.document;if(!D)return;
 const W=1852,H=849;
 // Telas das 8 mesas no cenário (scene-quads.js); a mesa vazia do Trading Floor não tem agente e fica apagada.
 const stations=()=>Object.fromEntries(Object.entries(globalThis.OfficeSceneQuads?.desk()??{}).filter(([id])=>id!=='trading-empty'));
 const C={bg:'#0a1b33',grid:'#12294a',line:'#5fb6ff',up:'#22e39f',down:'#ff6b6b',gold:'#ffd166',dim:'#16304f'};
 let canvas=null,ctx=null,last=null;
 function ensure(){
  const office=D.querySelector('#office');if(!office)return false;if(canvas)return true;
  canvas=D.createElement('canvas');canvas.id='deskScreens';canvas.width=W;canvas.height=H;canvas.setAttribute('aria-hidden','true');ctx=canvas.getContext('2d');
  const lighting=D.querySelector('#lighting');lighting?lighting.after(canvas):office.prepend(canvas);return true;
 }
 /** Desenha `draw(w,h)` num retângulo w×h mapeado (afim) para o quadrilátero da tela, recortado nele. */
 function onQuad(q,draw){
  const [tl,tr,,bl]=q,w=Math.max(8,Math.round(Math.hypot(tr[0]-tl[0],tr[1]-tl[1]))),h=Math.max(8,Math.round(Math.hypot(bl[0]-tl[0],bl[1]-tl[1])));
  ctx.save();ctx.beginPath();q.forEach(([x,y],i)=>i?ctx.lineTo(x+.5,y+.5):ctx.moveTo(x+.5,y+.5));ctx.closePath();ctx.clip();
  ctx.setTransform((tr[0]-tl[0])/w,(tr[1]-tl[1])/w,(bl[0]-tl[0])/h,(bl[1]-tl[1])/h,tl[0]+.5,tl[1]+.5);
  ctx.fillStyle=C.bg;ctx.fillRect(-1,-1,w+2,h+2);draw(w,h);ctx.restore();
 }
 const scale=(values,h,pad=3)=>{const lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||1;return v=>pad+(h-2*pad)*(1-(v-lo)/span);};
 // Todas as tendências em candles (verde sobe, vermelho cai), sobre linhas de grade discretas.
 function candles(rows){return (w,h)=>{if(rows.length<2)return off(w,h);const vals=rows.flatMap(c=>[c.h,c.l]),y=scale(vals,h),step=(w-4)/rows.length;
  ctx.fillStyle=C.grid;for(let gy=h/3;gy<h-1;gy+=h/3)ctx.fillRect(0,Math.round(gy),w,1);
  rows.forEach((c,i)=>{const x=2+i*step,up=c.c>=c.o;ctx.fillStyle=up?C.up:C.down;ctx.fillRect(x+step/2-.5,y(c.h),1,Math.max(1,y(c.l)-y(c.h)));ctx.fillRect(x+.5,Math.min(y(c.o),y(c.c)),Math.max(1,step-1),Math.max(1,Math.abs(y(c.o)-y(c.c))));});};}
 function bars(items,colorOf){return (w,h)=>{if(!items.length)return off(w,h);const max=Math.max(...items.map(v=>Math.abs(v)))||1,step=(w-4)/items.length,mid=items.some(v=>v<0)?h/2:h-2;
  items.forEach((v,i)=>{const len=Math.abs(v)/max*(mid-2);ctx.fillStyle=colorOf(v);ctx.fillRect(2+i*step,v>=0?mid-len:mid,Math.max(1,step-1),Math.max(1,len));});};}
 function checks(list){return (w,h)=>{if(!list.length)return off(w,h);const cols=2,rows=Math.ceil(list.length/cols),cw=(w-6)/cols,ch=(h-6)/rows;
  list.forEach((c,i)=>{ctx.fillStyle=c.ok?C.up:C.down;ctx.fillRect(3+(i%cols)*cw+1,3+Math.floor(i/cols)*ch+1,cw-3,ch-3);});};}
 /** Tela sem dado fresco: apagada, com um traço discreto. */
 function off(w,h){ctx.fillStyle='#071223';ctx.fillRect(-1,-1,w+2,h+2);ctx.fillStyle=C.dim;ctx.fillRect(w/2-4,h/2,8,1);}
 /** Mensagens registradas do agente nas últimas 12 h, por hora (atividade real da equipe). */
 function activity(messages,id,now){const out=Array(12).fill(0);for(const m of messages??[]){if(m.from!==id)continue;const age=(now-Date.parse(m.createdAt))/3600000;if(age>=0&&age<12)out[11-Math.floor(age)]++;}return out;}
 function paint(data){
  if(!ensure())return;last=data;const now=Date.now(),p=data.panorama,btc=p?.candles?.BTCUSDT??[],eth=p?.candles?.ETHUSDT??[],perp=p?.candles?.BTCPERP??[];
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
  const last24=btc.slice(-24),returns=last24.slice(1).map((c,i)=>Math.abs(c.c/last24[i].c-1));
  const nova=data.finance?.perpetualAccounts?.find(a=>a.id===data.finance?.autonomous?.accountId)||data.finance?.perpetualAccounts?.find(a=>a.ownerAgentId==='nova');
  const center={
   satoshi:candles(last24),
   oracle:candles(eth.slice(-24)),
   vega:bars(returns,()=>C.gold),
   flux:bars((p?.flow??[]).slice(-30).map(f=>f.buy-f.sell),v=>v>=0?C.up:C.down),
   nova:candles(perp.slice(-24)),
   sentinel:checks(globalThis.OfficeScreens?.riskChecks(data.finance,nova)??[]),
   atlas:candles(p?.openInterest?.candles??[]),
   euler:bars((p?.liquidations?.hourly??[]).map(x=>x.shorts-x.longs),v=>v>=0?C.up:C.down)
  };
  for(const [id,q] of Object.entries(stations())){
   onQuad(q.left,candles(btc.slice(-16)));
   onQuad(q.center,center[id]);
   const act=activity(data.messages,id,now);onQuad(q.right,act.some(Boolean)?bars(act,()=>C.up):off);
  }
 }
 globalThis.OfficeDeskScreens=Object.freeze({stations,paint,redraw:()=>last&&paint(last)});
})();
