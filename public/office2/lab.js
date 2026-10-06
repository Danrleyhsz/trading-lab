// Escritório 2.0 (F3): Stress Lab e Backtest. Tudo aqui é SIMULAÇÃO: o Stress Lab roda o código de produção sobre
// mercado sintético (STRESS_LAB_V1, relatório com semente e sha256) e o Backtest mostra estudos históricos. Nenhum
// número vira resultado do piloto ou do mercado real.
(() => {
 const COLORS=Object.freeze({survived:'#22e39f',failed:'#ff6b6b',none:'#3a4258',pos:'#5fb6ff',neg:'#ffd166'});
 const pct=v=>Number.isFinite(v)?(v*100).toFixed(2)+'%':'n/d';
 /** Relatório do laboratório → resumo e lista de cenários (na ordem do catálogo, que é a ordem das lâmpadas). */
 function stress(report){
  if(!report||report.scope!=='SIMULATION'||!Array.isArray(report.scenarios))return null;
  const s=report.summary;
  return {seed:report.seed,sha:String(report.reportSha256??''),version:report.policy?.version??'n/d',
   headline:s.survived+' de '+s.scenarios+' cenários sobreviveram · '+s.invariantViolations+' violações de invariante',
   facts:[['Kill switch acionado',String(s.killSwitchActivations)],['Pior slippage',s.worstSlippageBps+' bps'],['Maior drawdown',pct(s.maxDrawdown)]],
   scenarios:report.scenarios.map(c=>({id:c.id,title:c.title,survived:!!c.survived,violations:c.invariantViolations??[],failed:(c.expectations??[]).filter(x=>!x.passed).map(x=>x.description),
    line:c.metrics.decisions+' decisões · '+c.metrics.fills+' fills · drawdown '+pct(c.metrics.maxDrawdown)+(c.metrics.recoveryHours===null?'':' · recuperou em '+c.metrics.recoveryHours+' h')}))};
 }
 /** Estudos históricos (/backtests/v2/studies) e a triagem do estudo do piloto (/paper/perpetual/status). */
 function studies(list,status){
  if(!Array.isArray(list))return null;
  const pilotId=status?.autonomous?.studyId??null;
  return {pilot:pilotId?{id:pilotId,eligible:status.autonomous.eligible,reason:status.autonomous.reason??null}:null,
   rows:list.map(s=>({id:s.id,short:String(s.id).slice(0,8),status:s.status,netPnl:Number.isFinite(s.netPnl)?s.netPnl:null,folds:s.folds??null,
    window:s.request?(s.request.bars+' velas · treino '+s.request.trainBars+' · teste '+s.request.testBars):'n/d',candidateSet:s.request?.candidateSet??null,
    createdAt:s.createdAt,pilot:s.id===pilotId}))};
 }
 function onScreen(ctx,inner,draw){const [p0,p1,,p3]=inner;ctx.save();ctx.beginPath();inner.forEach((p,k)=>k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();
  ctx.transform((p1.x-p0.x)/100,(p1.y-p0.y)/100,(p3.x-p0.x)/100,(p3.y-p0.y)/100,p0.x,p0.y);draw(ctx);ctx.restore();}
 /** Placar do Stress Lab: 14 lâmpadas (2 × 7) na ordem do catálogo, verde se sobreviveu, vermelho se falhou. */
 function paintStress(ctx,inner,vm){if(!vm)return false;onScreen(ctx,inner,c=>{vm.scenarios.forEach((s,k)=>{const col=k%7,row=Math.floor(k/7);c.fillStyle=s.survived?COLORS.survived:COLORS.failed;c.fillRect(5+col*13.5,18+row*36,10,26);});});return true;}
 /** Estudos: barras do resultado líquido dos últimos estudos concluídos (azul positivo, âmbar negativo). */
 function paintStudies(ctx,inner,vm){const rows=(vm?.rows??[]).filter(r=>r.netPnl!==null).slice(0,6).reverse();if(!rows.length)return false;const max=Math.max(...rows.map(r=>Math.abs(r.netPnl)))||1;
  onScreen(ctx,inner,c=>{c.fillStyle='#26314a';c.fillRect(4,49,92,1.5);rows.forEach((r,k)=>{const h=Math.max(2,Math.abs(r.netPnl)/max*40);c.fillStyle=r.netPnl>=0?COLORS.pos:COLORS.neg;c.fillRect(8+k*15,r.netPnl>=0?49-h:50.5,10,h);if(r.pilot){c.fillStyle='#ffd27a';c.fillRect(8+k*15,8,10,4);}});});return true;}
 globalThis.Office2Lab=Object.freeze({COLORS,stress,studies,paintStress,paintStudies});
})();
