// Monitores das mesas com dados reais (3 por mesa). Cada tela mostra só o que a página recebeu do servidor
// ou da Binance pública; sem dado fresco, a tela fica apagada (nunca um gráfico inventado). Só apresentação.
(() => {
 const D=globalThis.document;if(!D)return;
 const W=1852,H=849;
 // Telas medidas em office-reference-v2.png (cantos: sup. esq., sup. dir., inf. dir., inf. esq.; pixels da cena).
 const QUADS={
  atlas:{left:[[111,176],[146,165],[144,200],[110,204]],center:[[155,162],[188,162],[188,195],[154,196]],right:[[197,166],[233,174],[233,208],[196,196]]},
  satoshi:{left:[[292,176],[323,166],[325,199],[287,207]],center:[[331,161],[364,162],[365,198],[332,196]],right:[[375,165],[405,173],[409,209],[373,196]]},
  oracle:{left:[[462,179],[496,168],[498,199],[460,209]],center:[[504,167],[538,166],[535,198],[504,198]],right:[[547,168],[583,178],[582,210],[543,199]]},
  nova:{left:[[703,172],[736,161],[735,196],[701,206]],center:[[745,159],[778,163],[777,193],[748,191]],right:[[787,162],[820,170],[823,207],[786,197]]},
  flux:{left:[[1076,175],[1111,161],[1113,195],[1077,203]],center:[[1123,164],[1154,161],[1153,192],[1122,194]],right:[[1164,160],[1190,170],[1195,202],[1161,194]]},
  sentinel:{left:[[1382,173],[1418,161],[1419,195],[1381,200]],center:[[1427,158],[1461,159],[1461,193],[1427,192]],right:[[1475,162],[1509,171],[1510,203],[1470,194]]},
  euler:{left:[[152,408],[182,397],[181,430],[142,438]],center:[[192,395],[220,395],[220,427],[190,429]],right:[[228,398],[268,407],[268,441],[232,430]]},
  vega:{left:[[341,417],[382,397],[381,432],[340,436]],center:[[393,395],[420,396],[421,427],[390,427]],right:[[430,402],[449,409],[449,429],[431,431]]}
 };
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
 function line(values,color){return (w,h)=>{if(values.length<2)return off(w,h);const y=scale(values,h);ctx.strokeStyle=C.grid;ctx.lineWidth=1;for(let gy=h/3;gy<h;gy+=h/3){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke();}
  ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();values.forEach((v,i)=>{const x=2+i*(w-4)/(values.length-1);i?ctx.lineTo(x,y(v)):ctx.moveTo(x,y(v));});ctx.stroke();
  ctx.fillStyle=color;ctx.fillRect(w-4,y(values.at(-1))-1,2,2);};}
 function candles(rows){return (w,h)=>{if(rows.length<2)return off(w,h);const vals=rows.flatMap(c=>[c.h,c.l]),y=scale(vals,h),step=(w-4)/rows.length;
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
  if(!ensure())return;last=data;const now=Date.now(),p=data.panorama,btc=p?.candles?.BTCUSDT??[];
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
  const closes=btc.map(c=>c.c),last24=btc.slice(-24),returns=last24.slice(1).map((c,i)=>Math.abs(c.c/last24[i].c-1));
  const nova=data.finance?.perpetualAccounts?.find(a=>a.id===data.finance?.autonomous?.accountId)||data.finance?.perpetualAccounts?.find(a=>a.ownerAgentId==='nova');
  const center={
   satoshi:candles(last24),
   oracle:line(closes.slice(-120),C.gold),
   vega:bars(returns,()=>C.gold),
   flux:bars((p?.flow??[]).slice(-30).map(f=>f.buy-f.sell),v=>v>=0?C.up:C.down),
   nova:line((data.marks??[]).slice(-90),C.line),
   sentinel:checks(globalThis.OfficeScreens?.riskChecks(data.finance,nova)??[]),
   atlas:line((p?.openInterest?.history??[]).map(x=>x.usd),'#7ad7ff'),
   euler:bars((p?.liquidations?.hourly??[]).map(x=>x.shorts-x.longs),v=>v>=0?C.up:C.down)
  };
  for(const [id,q] of Object.entries(QUADS)){
   onQuad(q.left,line(closes.slice(-48),C.line));
   onQuad(q.center,center[id]);
   const act=activity(data.messages,id,now);onQuad(q.right,act.some(Boolean)?bars(act,()=>C.up):off);
  }
 }
 globalThis.OfficeDeskScreens=Object.freeze({QUADS,paint,redraw:()=>last&&paint(last)});
})();
