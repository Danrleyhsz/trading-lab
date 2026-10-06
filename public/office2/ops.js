// Escritório 2.0 (F4): Nexus, Diagnóstico, Auditoria e Risk. Só leitura de rotas GET; o que o backend não grava fica
// UNKNOWN (ex.: histórico de falhas do ciclo, lacuna L2). Limites de risco vêm do código de risco (perpetual-risk.ts).
(() => {
 const AGENTS=['atlas','satoshi','oracle','nova','flux','sentinel','euler','vega'];
 const RISK_LIMITS=Object.freeze({drawdown:0.10,dailyLoss:0.05});
 const t=iso=>{const d=new Date(iso);return Number.isFinite(d.getTime())?d.toISOString().slice(11,19)+' UTC':'n/d';};
 const day=iso=>{const d=new Date(iso);return Number.isFinite(d.getTime())?d.toISOString().slice(0,16).replace('T',' ')+' UTC':'n/d';};
 /** Nexus: arestas agente → agente das últimas `limit` mensagens gravadas (opcional: só as de uma decisão). */
 function nexus(messages,decisionId=null,limit=200){
  if(!Array.isArray(messages))return null;
  const recent=messages.slice(-limit).filter(m=>!decisionId||m.context?.decisionEventId===decisionId);
  const edges=new Map();
  for(const m of recent)for(const to of m.to??[]){if(!AGENTS.includes(m.from)||!AGENTS.includes(to))continue;const k=m.from+'>'+to;const e=edges.get(k)??{from:m.from,to,count:0,kinds:new Set()};e.count++;e.kinds.add(m.kind);edges.set(k,e);}
  const active=new Set([...edges.values()].flatMap(e=>[e.from,e.to]));
  return {total:recent.length,scope:decisionId?'decisão':'últimas '+Math.min(limit,messages.length)+' mensagens',
   nodes:AGENTS.map((id,k)=>({id,angle:k/AGENTS.length*Math.PI*2-Math.PI/2,active:active.has(id)})),
   edges:[...edges.values()].map(e=>({...e,kinds:[...e.kinds]})).sort((a,b)=>b.count-a.count),
   recent:recent.slice(-10).reverse().map(m=>({at:m.createdAt,from:m.from,to:(m.to??[]).join(', '),kind:m.kind,summary:m.summary,advisory:m.context?.advisoryOnly===true}))};
 }
 /** Diagnóstico de uma decisão: linha do tempo da ficha, veredito de paridade e estado atual do serviço. */
 function diagnostics(receipt,parity,readiness,status){
  const timeline=[];
  if(receipt){
   timeline.push({at:receipt.candleTimestamp,label:'candle fechou (+1 h depois deste horário)',kind:'market'});
   timeline.push({at:receipt.decidedAt,label:'decisão gravada ('+(receipt.latencySeconds?.closeToDecision??'n/d')+' s após o fechamento)',kind:'decision'});
   for(const a of receipt.actions??[]){timeline.push({at:a.proposedAt,label:'proposta '+a.side+' '+a.quantity,kind:'proposal'});if(a.risk)timeline.push({at:a.proposedAt,label:a.risk.approved?'risco aprovou':'risco rejeitou: '+a.risk.reasons.join(', '),kind:a.risk.approved?'ok':'bad'});if(a.fill)timeline.push({at:a.fill.at,label:'fill paper @ '+Number(a.fill.price).toFixed(2),kind:'ok'});}
   for(const b of receipt.blocks??[])timeline.push({at:b.at,label:'bloqueio do ciclo: '+(b.reason??'sem motivo'),kind:'bad'});
   for(const s of receipt.stops??[])timeline.push({at:s.at,label:'piloto parado: '+(s.reason??''),kind:'bad'});
   timeline.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  }
  const row=parity?.rows?.find(r=>r.eventId===receipt?.decisionEventId)??null;
  const auto=status?.autonomous??null;
  return {timeline,
   parity:parity?{passed:parity.passed,summary:parity.summary,row:row?{verdict:row.verdict,execution:row.execution?.verdict,candles:row.candles}:null,latency:parity.decisionLatencySeconds??null}:null,
   readiness:readiness?{ready:!!readiness.ready,reasons:readiness.reasons??[],storage:readiness.storage?.kind??null,lastPersistenceFailureAt:readiness.storage?.lastPersistenceFailureAt??null,market:readiness.market?.perpetual?.status??null,newExposure:readiness.paper?.newExposure??null}:null,
   cycle:auto?{error:auto.error??null,lastAttemptFailed:!!auto.lastAttemptFailed,nextAttemptAt:auto.nextAttemptAt??null,stopReason:auto.stopReason??null,blockedReason:auto.blockedReason??null}:null,
   historyKnown:false};
 }
 /** Auditoria: fichas (completas) e eventos gravados recentes. */
 function audit(receiptsBody,events){
  const s=receiptsBody?.summary??null,list=Array.isArray(events)?events:null;
  const byType={};for(const e of list??[])byType[e.type]=(byType[e.type]??0)+1;
  return {receipts:s?{decisions:s.decisions,complete:s.complete,fraction:s.completeFraction}:null,
   events:list?list.slice(0,15).map(e=>({id:e.id,at:e.occurredAt,type:e.type,account:e.payload?.accountId??e.payload?.order?.accountId??e.payload?.fill?.accountId??null})):null,byType};
 }
 /** Risk: kill switch, distância de cada limite e rejeições do risco nas fichas. */
 function risk(accounts,status,receiptsBody){
  const a=Array.isArray(accounts)?accounts.find(x=>x.id==='evaluation:nova:usdm'):null,auto=status?.autonomous??null;
  const eq=a?.portfolio?.equity,init=a?.initialCash,start=a?.daily?.startEquity,maxLoss=auto?.maxLossFraction;
  const use=(lossFrac,limit)=>Number.isFinite(lossFrac)&&limit>0?Math.max(0,lossFrac)/limit:null;
  const pilotLoss=Number.isFinite(eq)&&init?1-eq/init:null,dailyLoss=Number.isFinite(eq)&&start?1-eq/start:null,dd=Number.isFinite(a?.maxDrawdown)?a.maxDrawdown:null;
  return {killSwitch:typeof status?.halted==='boolean'?status.halted:null,stopReason:auto?.stopReason??null,
   limits:[
    {id:'pilot-loss',label:'Limite de perda do piloto',limit:maxLoss??null,value:pilotLoss,use:maxLoss?use(pilotLoss,maxLoss):null,note:'fecha a posição e liga o kill switch; checado de hora em hora'},
    {id:'daily-loss',label:'Perda do dia (risco)',limit:RISK_LIMITS.dailyLoss,value:dailyLoss,use:use(dailyLoss,RISK_LIMITS.dailyLoss),note:'bloqueia nova exposição'},
    {id:'drawdown',label:'Maior drawdown observado',limit:RISK_LIMITS.drawdown,value:dd,use:use(dd,RISK_LIMITS.drawdown),note:'o risco bloqueia nova exposição no drawdown atual ≥ 10%; aqui é o máximo histórico da conta'}],
   rejections:Object.entries(receiptsBody?.summary?.reasons??{}).map(([k,n])=>({reason:k,n}))};
 }
 function onScreen(ctx,inner,draw){const [p0,p1,,p3]=inner;ctx.save();ctx.beginPath();inner.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
  ctx.transform((p1.x-p0.x)/100,(p1.y-p0.y)/100,(p3.x-p0.x)/100,(p3.y-p0.y)/100,p0.x,p0.y);draw(ctx);ctx.restore();}
 const pos=(n,cx,cy,r)=>({x:cx+Math.cos(n.angle)*r,y:cy+Math.sin(n.angle)*r});
 function paintNexus(ctx,inner,vm){if(!vm?.edges.length)return false;const at=new Map(vm.nodes.map(n=>[n.id,pos(n,50,50,36)]));const max=vm.edges[0].count;
  onScreen(ctx,inner,c=>{for(const e of vm.edges){const a=at.get(e.from),b=at.get(e.to);c.strokeStyle='rgba(95,182,255,'+(0.25+0.75*e.count/max)+')';c.lineWidth=1+3*e.count/max;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
   for(const n of vm.nodes){const p=at.get(n.id);c.fillStyle=n.active?'#dbe9ff':'#3a4258';c.fillRect(p.x-4,p.y-4,8,8);}});return true;}
 function paintTimeline(ctx,inner,vm){if(!vm?.timeline.length)return false;const ts=vm.timeline.map(e=>Date.parse(e.at)).filter(Number.isFinite),min=Math.min(...ts),span=Math.max(1,Math.max(...ts)-min);
  const col={market:'#5f6b85',decision:'#5fb6ff',proposal:'#ffd27a',ok:'#22e39f',bad:'#ff6b6b'};
  onScreen(ctx,inner,c=>{c.fillStyle='#26314a';c.fillRect(4,49,92,2);vm.timeline.forEach(e=>{const x=6+(Date.parse(e.at)-min)/span*86;c.fillStyle=col[e.kind]??'#5f6b85';c.fillRect(x-2.5,40,5,20);});});return true;}
 function paintAudit(ctx,inner,vm){const r=vm?.receipts;if(!r||!r.decisions)return false;const f=r.complete/r.decisions;
  onScreen(ctx,inner,c=>{c.fillStyle='#26314a';c.fillRect(6,40,88,20);c.fillStyle=f===1?'#22e39f':'#ffd166';c.fillRect(6,40,88*f,20);});return true;}
 function paintRisk(ctx,inner,vm){const rows=(vm?.limits??[]).filter(l=>l.use!==null);if(!rows.length&&vm?.killSwitch===null)return false;
  onScreen(ctx,inner,c=>{rows.forEach((l,k)=>{const u=Math.min(1,l.use);c.fillStyle='#26314a';c.fillRect(6,14+k*24,88,12);c.fillStyle=u>=1?'#ff6b6b':u>=0.6?'#ffd166':'#22e39f';c.fillRect(6,14+k*24,Math.max(1.5,88*u),12);});
   if(vm.killSwitch!==null){c.fillStyle=vm.killSwitch?'#ff6b6b':'#22e39f';c.fillRect(6,86,14,8);}});return true;}
 globalThis.Office2Ops=Object.freeze({AGENTS,RISK_LIMITS,nexus,diagnostics,audit,risk,paintNexus,paintTimeline,paintAudit,paintRisk,t,day});
})();
