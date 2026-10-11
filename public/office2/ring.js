// Escritório 2.0 (F2): Anel de decisão e Execução paper. Converte as fichas de decisão (DECISION_RECEIPT_V1,
// /paper/perpetual/pilot/receipts) nos 5 estágios TRADER → RISK → VALIDATOR → PAPER EXECUTION → AUDIT, e a conta paper
// do piloto na visão de execução. Só leitura e só o que foi gravado: o que não existe vira UNKNOWN, nunca "OK".
(() => {
 const ACCOUNT='evaluation:nova:usdm';
 const COLORS=Object.freeze({ok:'#22e39f',rejected:'#ff6b6b',blocked:'#ff6b6b',pending:'#ffd166',warn:'#ffd166',none:'#5f6b85',unknown:'#3a4258'});
 const side=d=>d>0?'comprado':d<0?'vendido':'fora do mercado';
 const secs=v=>v===null||v===undefined||!Number.isFinite(v)?'n/d':v<1?(v*1000).toFixed(0)+' ms':v<120?v.toFixed(1)+' s':(v/60).toFixed(1)+' min';
 const time=iso=>{const d=new Date(iso);return Number.isFinite(d.getTime())?d.toISOString().slice(0,16).replace('T',' ')+' UTC':'n/d';};
 const OUTCOME={EXECUTED:'executada',RISK_REJECTED:'rejeitada pelo risco',ENTRY_BLOCKED:'entrada bloqueada pelo ciclo',PILOT_STOPPED:'piloto parado',NO_ACTION_NEEDED:'nada a fazer',PENDING:'pendente',UNEXPLAINED:'sem explicação gravada'};
 /** Os 5 estágios de uma ficha. Cada estágio tem estado, texto e classe de verdade. */
 function stages(r){
  const actions=r.actions??[],rejected=actions.filter(a=>a.risk&&!a.risk.approved),filled=actions.filter(a=>a.fill),blocks=r.blocks??[];
  const trader={id:'trader',label:'Trader (Nova)',state:'ok',truth:'REAL',
   text:'sinal: '+side(r.proposal?.direction)+' · candle '+time(r.candleTimestamp)+' · '+secs(r.latencySeconds?.closeToDecision)+' após o fechamento',
   detail:'posição antes: '+(r.proposal?.positionBefore??'n/d')+(r.proposal?.positionSource==='FILLS'?' (reconstruída pelos fills)':'')+' · estudo '+String(r.provenance?.studyId??'n/d').slice(0,8)};
  const risk=!actions.length?{state:'none',text:'nenhuma ordem proposta'}:rejected.length?{state:'rejected',text:'rejeitada: '+[...new Set(rejected.flatMap(a=>a.risk.reasons))].join(', ')}:actions.every(a=>a.risk?.approved)?{state:'ok',text:actions.length+' ordem(ns) aprovada(s)'}:{state:'unknown',text:'resultado do risco não gravado'};
  // Desde o passo 5 o ciclo grava as checagens da decisão e da entrada; fichas antigas continuam UNKNOWN.
  const ck=r.checks,passed=list=>(list??[]).filter(c=>c.ok).length;
  const validator=blocks.length?{state:'blocked',truth:'REAL',text:'bloqueio do ciclo: '+blocks.map(b=>b.reason??'sem motivo').join(', '),detail:ck?.entry?'entrada: '+ck.entry.map(c=>c.id+(c.ok?' ok':' FALHOU')).join(' · '):undefined}
   :ck?{state:'ok',truth:'REAL',text:passed(ck.decision)+' de '+ck.decision.length+' checagens do ciclo passaram'+(ck.entry?' · entrada: '+passed(ck.entry)+' de '+ck.entry.length:''),detail:ck.decision.map(c=>c.id).join(' · ')}
   :{state:'unknown',truth:'UNKNOWN',text:'checagens do ciclo não registradas nesta decisão (gravada antes do passo 5)'};
  const execution=filled.length?{state:'ok',text:filled.length+' fill(s) paper · '+filled.map(a=>a.side+' '+a.quantity+' @ '+Number(a.fill.price).toFixed(2)).join('; ')+' · '+secs(r.latencySeconds?.decisionToFirstFill)+' após a decisão'}
   :actions.length?{state:'none',text:'sem fill (ordem não aprovada)'}:{state:'none',text:'nada a executar'};
  const audit={state:r.complete?'ok':r.outcome==='PENDING'?'pending':'warn',text:(OUTCOME[r.outcome]??r.outcome)+(r.complete?' · ficha completa':' · ficha incompleta')};
  return [trader,{id:'risk',label:'Risco (Sentinel)',truth:'REAL',...risk},{id:'validator',label:'Validador',...validator},{id:'execution',label:'Execução paper',truth:'REAL',...execution},{id:'audit',label:'Auditoria',truth:'REAL',...audit}];
 }
 /** Resumo do anel (todas as decisões retidas). */
 function summary(body){
  const s=body?.summary;if(!s)return null;
  return {decisions:s.decisions,complete:s.complete,completePct:s.completeFraction===null?null:Math.round(s.completeFraction*100),
   outcomes:Object.entries(s.byOutcome??{}).filter(([,n])=>n>0).map(([k,n])=>({label:OUTCOME[k]??k,n})),
   reasons:Object.entries(s.reasons??{}).map(([k,n])=>({label:k,n})),latency:s.closeToDecisionSeconds?{p50:secs(s.closeToDecisionSeconds.p50),p95:secs(s.closeToDecisionSeconds.p95)}:null,
   linkage:body.policy?.linkage??null};
 }
 /** Execução paper: conta do piloto e últimos fills gravados. */
 function execution(accounts,fills){
  const a=Array.isArray(accounts)?accounts.find(x=>x.id===ACCOUNT):null;if(!a)return null;
  const pos=a.portfolio?.positions?.[0]??null,equity=a.portfolio?.equity;
  return {equity,initial:a.initialCash,pnlPct:Number.isFinite(equity)&&a.initialCash?(equity/a.initialCash-1)*100:null,
   position:pos?{qty:pos.quantity,side:pos.quantity>0?'comprado':'vendido',avg:pos.averageEntry}:null,fees:a.feesPaid,funding:a.fundingCashDelta,fillCount:a.fills,
   fresh:!!a.valuationFresh,hourly:(a.hourly??[]).map(h=>h.equity).filter(Number.isFinite),
   fills:(fills??[]).map(e=>({at:e.occurredAt,side:e.payload?.fill?.side,qty:e.payload?.fill?.quantity,price:e.payload?.fill?.fillPrice,fee:e.payload?.fill?.fee})).filter(f=>f.side)};
 }
 /** Mapeia o quadrado unitário na tela inclinada (paralelogramo da parede). */
 function onScreen(ctx,inner,draw){
  const [p0,p1,,p3]=inner;ctx.save();ctx.beginPath();inner.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
  ctx.transform((p1.x-p0.x)/100,(p1.y-p0.y)/100,(p3.x-p0.x)/100,(p3.y-p0.y)/100,p0.x,p0.y);draw(ctx);ctx.restore();
 }
 /** Tela do anel: 5 blocos de estágio da decisão mais recente (cor do estado) e o desfecho embaixo. */
 function paintRing(ctx,inner,st){onScreen(ctx,inner,c=>{st.forEach((s,k)=>{c.fillStyle=COLORS[s.state]??COLORS.unknown;c.fillRect(6+k*19,22,15,34);});c.fillStyle='#5fb6ff';for(let k=0;k<4;k++)c.fillRect(21+k*19,38,4,2);c.fillStyle=COLORS[st[4].state];c.fillRect(6,68,91,8);});}
 /** Tela da execução: curva horária da equity da conta paper (sem dado, a tela continua apagada). */
 function paintExecution(ctx,inner,vm){if(!vm?.hourly?.length)return false;const v=vm.hourly.slice(-48),min=Math.min(...v),max=Math.max(...v),span=max-min||1;
  onScreen(ctx,inner,c=>{c.strokeStyle='#ffd166';c.lineWidth=2.5;c.beginPath();v.forEach((e,k)=>{const x=6+k*(88/Math.max(1,v.length-1)),y=82-((e-min)/span)*64;k?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
   c.fillStyle=vm.position?COLORS.pending:COLORS.none;c.fillRect(6,8,20,8);});return true;}
 globalThis.Office2Ring=Object.freeze({ACCOUNT,COLORS,OUTCOME,stages,summary,execution,paintRing,paintExecution,secs});
})();
