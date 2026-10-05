// Research Lab and Quant Lab panels: research jobs and runs, historical studies and the continuous-cycle preflight.
// Requests here only read evidence or register owner-initiated jobs; nothing executes orders.
q('#runResearch').onclick = async () => {
  const button = q('#runResearch');
  button.disabled = true;
  q('#researchActionStatus').textContent = 'Pesquisa solicitada…';
  try {
    const response = await fetch('/research/jobs', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({symbol: 'BTCUSDT'})});
    const run = await response.json();
    q('#researchActionStatus').textContent = response.status === 202 ? 'Solicitação registrada: ' + run.id + '. Consulte o estado e o resultado abaixo.' : 'Solicitação recusada ou indisponível. Consulte as tarefas registradas antes de tentar novamente.';
    await refreshOnline();
    refresh();
    if (selected) details();
  } catch {
    q('#researchActionStatus').textContent = 'Confirmação indisponível. Consulte as tarefas antes de solicitar novamente; a solicitação pode ter sido registrada.';
  } finally { button.disabled = false; }
};
function renderResearchJobs(jobs) {
  const focusedJob=document.activeElement?.dataset?.researchJobId;
  const host=q('#researchJobs');host.replaceChildren();
  const labels={QUEUED:'Solicitação registrada',RUNNING:'Em execução · estado registrado',COMPLETED:'Concluída',FAILED:'Falhou',INTERRUPTED:'Interrompida por reinício'};
  const validId=id=>typeof id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if(!Array.isArray(jobs)||jobs.length>20||jobs.some(j=>!j||!validId(j.id)||!Object.hasOwn(labels,j.status)||!Number.isInteger(j.limit)||j.limit<100||j.limit>1000||!Number.isFinite(Date.parse(j.updatedAt))||j.runId&&!validId(j.runId))){host.append(node('li','Tarefas indisponíveis · consulte novamente após restabelecer o acesso.'));return;}
  if(!jobs.length){host.append(node('li','Nenhuma tarefa de pesquisa registrada.'));return;}
  for(const job of jobs){const card=node('li','');card.className='research-job';card.dataset.status=job.status;
    card.append(node('b',labels[job.status]),node('small','Tarefa '+job.id),node('p',job.limit+' candles solicitados · '+date(job.updatedAt)));
    if(job.reason)card.append(node('p',job.reason==='RUNTIME_RESTARTED'?'Sem retomada automática. Revise a evidência antes de uma nova solicitação.':'Falha registrada. Nenhum resultado positivo é presumido.'));
    if(job.runId){const button=node('button','Abrir resultado original');button.dataset.researchJobId=job.id;button.onclick=()=>researchDetails(job.runId);card.append(button);host.append(card);if(focusedJob===job.id)button.focus();}else host.append(card);
  }
}
function renderResearch(runs) {
  records('#researchRuns', [...runs].reverse(), run => {
    const row = node('li', '');
    row.append(node('b', run.status === 'SCREEN_PASSED' ? 'Filtro histórico aprovado' : run.status === 'REJECTED' ? 'Hipótese rejeitada' : 'Pesquisa falhou'), node('p', date(run.completedAt)));
    if (run.datasetHash) row.append(node('small', 'Evidência: ' + run.datasetHash));
    if (run.backtest) {
      row.append(node('p', `${run.backtest.trades} operações históricas · P&L do backtest simulado ${money(run.backtest.netPnl)}`));
      row.append(node('small',run.backtest.model==='SPOT_SMA_NEXT_OPEN_V2'?'Modelo registrado: sinal fechado → abertura seguinte · taxas de entrada e saída incluídas':'Simulação anterior: modelo e custos não versionados neste registro'));
      if(Number.isFinite(run.backtest.feesPaid))row.append(node('small','Taxas históricas registradas: '+money(run.backtest.feesPaid)));
    }
    const button = node('button', 'Abrir pesquisa e evidências');
    button.dataset.researchId = run.id;
    button.onclick = () => researchDetails(run.id);
    row.append(button);
    return row;
  });
}
let researchDetailVersion = 0, researchOpener = null;
async function researchDetails(id) {
  stopPresence();
  const version = ++researchDetailVersion, dialog = q('#researchDialog');
  if (!dialog.open) { researchOpener = document.activeElement; dialog.showModal(); }
  q('#researchDetails').replaceChildren();
  q('#researchDetailStatus').textContent = 'Consultando pesquisa registrada…';
  try {
    const run = await get('/research/runs/' + encodeURIComponent(id));
    if (version !== researchDetailVersion || !dialog.open) return;
    if (run?.id !== id || !['SCREEN_PASSED','REJECTED','FAILED'].includes(run.status) || !Array.isArray(run.findings) || run.findings.length > 8 || !Array.isArray(run.events) || run.events.length > 100 || !Number.isFinite(Date.parse(run.startedAt)) || !Number.isFinite(Date.parse(run.completedAt))) throw Error('invalid research evidence');
    const host = q('#researchDetails');
    host.append(node('p', 'ID: ' + run.id), node('p', 'Resultado registrado: ' + run.status), node('p', 'Execução: ' + date(run.startedAt) + ' → ' + date(run.completedAt)), node('p', 'Pesquisa histórica concluída; não representa tarefa atual, ordem paper ou P&L das contas.'));
    if (run.error) host.append(node('p', 'Falha registrada: ' + String(run.error).slice(0,1000)));
    if (run.dataset) {
      const d = run.dataset;
      if (d.symbol !== 'BTCUSDT' || d.interval !== '1h' || d.historyMarket !== 'BINANCE_SPOT' || d.snapshotMarket !== 'BINANCE_USDM' || !/^[a-f0-9]{64}$/.test(d.hash) || !Array.isArray(d.candles) || d.candles.length < 64 || d.candles.length > 1000 || !Number.isFinite(Date.parse(d.retrievedAt))) throw Error('invalid dataset evidence');
      host.append(node('h3', 'Fontes registradas'), node('p', 'Candles: BINANCE_SPOT · contexto: BINANCE_USDM · BTCUSDT · 1h'), node('p', 'Coleta: ' + date(d.retrievedAt)), node('p', d.candles.length + ' candles fechados · ' + date(d.candles[0].timestamp) + ' → ' + date(d.candles.at(-1).timestamp)), node('p', 'SHA-256 registrado: ' + d.hash));
    } else host.append(node('p', 'Dataset não disponível neste registro; não inferimos evidências.'));
    host.append(node('h3', 'Observações dos especialistas'));
    for (const finding of run.findings) {
      host.append(node('p', String(finding.agentId) + ' · ' + String(finding.metric)), node('p', String(finding.summary)), node('pre', JSON.stringify(finding.values,null,2)));
    }
    if (!run.findings.length) host.append(node('p', 'Nenhuma observação registrada.'));
    if (run.backtest) {
      host.append(node('h3', 'Backtest histórico'), node('p', 'Resultado in-sample: não é validação fora da amostra nem autorização de operação.'), node('p', run.backtest.model || 'Modelo antigo não versionado'), node('pre', JSON.stringify(run.backtest,null,2)));
    }
    if (run.strategyId) host.append(node('p', 'Estratégia registrada: ' + run.strategyId));
    host.append(node('h3', 'Eventos de origem'));
    for (const record of run.events) {
      if (typeof record?.id !== 'string' || typeof record?.type !== 'string') throw Error('invalid event evidence');
      host.append(node('p', record.type + ' · ' + record.id), sourceButton(record.id));
    }
    q('#researchDetailStatus').textContent = 'Registro retornado pela API. Eventos podem ser consultados separadamente no histórico gravado.';
  } catch {
    if (version !== researchDetailVersion || !dialog.open) return;
    q('#researchDetails').replaceChildren();
    q('#researchDetailStatus').textContent = 'Pesquisa indisponível ou evidência inválida. Confira o acesso e tente novamente.';
  }
}
q('#closeResearch').onclick = () => q('#researchDialog').close();
q('#researchDialog').addEventListener('close', () => {
  researchDetailVersion++; q('#researchDetails').replaceChildren();
  if (researchOpener?.isConnected) researchOpener.focus();
  else if(q('#workspaceDialog').open) q('#closeWorkspace').focus();
  else q('#navResearch').focus();
  researchOpener = null; render();
});
// Robustez (Deflated Sharpe e PBO): calculada no servidor numa thread separada; enquanto calcula, tenta de novo.
async function loadRobustness(id,host,attempt){
  if(!q('#studyDialog').open)return;
  try{
    const response=await fetch('/backtests/v2/studies/'+encodeURIComponent(id)+'/robustness',{cache:'no-store'});const entry=await response.json();
    if(entry.status==='COMPUTING'||entry.status==='BUSY'){host.replaceChildren(node('p','Calculando robustez (vários backtests)… '+(attempt?'('+attempt*4+' s)':'')));if(attempt<30)setTimeout(()=>loadRobustness(id,host,attempt+1),4000);return;}
    if(entry.status!=='READY')throw Error('indisponível');
    const r=entry.result,pct=v=>v===null||v===undefined||!Number.isFinite(v)?'—':(v*100).toFixed(1).replace('.',',')+'%',num=v=>Number.isFinite(v)?v.toFixed(2).replace('.',','):'—';
    const labels={DEFLATED_SHARPE:'Deflated Sharpe ≥ '+pct(r.policy.minimumDeflatedSharpe),PROBABILITY_OF_OVERFITTING:'Probabilidade de overfitting (PBO) ≤ '+pct(r.policy.maximumPbo),POSITIVE_OUT_OF_SAMPLE_PATHS:'Caminhos fora da amostra positivos ≥ '+pct(r.policy.minimumPositivePathShare)};
    host.replaceChildren(node('p',r.eligible?'Passa na triagem de robustez.':'Não passa na triagem de robustez.'),
      node('p','Sharpe anual fora da amostra: '+num(r.outOfSample.sharpeAnnualized)+' em '+r.outOfSample.hours+' h · esperado só por sorte com '+r.multipleTesting.trials+' tentativas: '+num(r.multipleTesting.benchmarkSharpeAnnualized)),
      node('p','Deflated Sharpe: '+pct(r.multipleTesting.deflatedSharpe)+' · PBO: '+pct(r.overfitting.pbo)+(r.overfitting.note?' ('+r.overfitting.note+')':'')+' · caminhos positivos: '+pct(r.overfitting.positivePathShare)));
    const list=node('ul','');for(const c of r.checks)list.append(node('li',(c.ok?'✓ ':'✗ ')+(labels[c.id]||c.id)+' · valor '+(c.id==='DEFLATED_SHARPE'||c.id==='PROBABILITY_OF_OVERFITTING'||c.id==='POSITIVE_OUT_OF_SAMPLE_PATHS'?pct(c.value):c.value)));host.append(list,node('h4','Métricas fora da amostra'),metricsView(r.metrics),node('small','Vale para pilotos que começarem depois do atual. O piloto em andamento segue as regras declaradas antes do início.'));
  }catch{host.replaceChildren(node('p','Robustez indisponível. Confira o acesso e reabra o estudo.'));}
}
async function studyDetails(id) {
  q('#studyDialog').showModal();q('#studyDetails').textContent = 'Carregando…';
  try {
    const study = await get('/backtests/v2/studies/' + encodeURIComponent(id));
    const host = q('#studyDetails');host.replaceChildren();host.append(node('p', 'Estado registrado: ' + study.status));
    if (study.error) host.append(node('p', study.error));
    if (study.result) {
      host.append(node('p', 'P&L simulado fora da amostra: ' + money(study.result.netPnl)), node('p', 'Evidência: ' + study.result.datasetHash), node('p', 'Resultados históricos não aprovam operações do fundo. Cada janela começa e termina sem posições. Candles finais não usados: ' + study.result.excludedTailBars));
      for (const fold of study.result.folds) host.append(node('p', `${date(fold.testStart)} → ${date(fold.testEnd)} · ${fold.configuration?.strategy || 'SMA'} · ${fold.result.trades ?? 'indisponível'} operações históricas · P&L ${money(fold.result.netPnl)} · taxas ${money(fold.result.feesPaid)} · funding ${money(fold.result.fundingCashDelta)} · drawdown ${(fold.result.maxDrawdown * 100).toFixed(2)}% · ${fold.result.liquidations} liquidações modeladas`));
      host.append(node('p', 'Liquidação usa premissas conservadoras configuradas; as regras completas da exchange não estão modeladas.'));
      const robust=node('section','');robust.className='robustness';host.append(node('h3','Robustez · ROBUSTNESS_SCREEN_V1'),robust);loadRobustness(id,robust,0);
    }
  } catch { q('#studyDetails').textContent = 'Estudo indisponível. Entre se o acesso for exigido.'; }
}
q('#closeStudy').onclick = () => q('#studyDialog').close();
const screenCheckLabels={COMPLETED_V2_STUDY:'Estudo V2 concluído, com data válida',RECORDED_USDM_EVIDENCE:'Dataset USD-M e hashes conferidos',NONOVERLAPPING_TEST_WINDOWS:'Janelas fora da amostra sem sobreposição',MINIMUM_TEST_FOLDS:'Pelo menos 3 janelas de teste',MINIMUM_CLOSED_TRADES:'Pelo menos 10 operações históricas encerradas',POSITIVE_RECONCILED_OOS_PNL:'P&L fora da amostra positivo e reconciliado',NO_MODELED_LIQUIDATIONS:'Nenhuma liquidação modelada',BOUNDED_TEST_DRAWDOWN:'Drawdown por janela entre 0 e 15%',COMPATIBLE_SIGNAL_AND_COSTS:'Sinal e custos compatíveis com o paper',RECENT_CLOSED_EVIDENCE:'Evidência fechada com até 7 dias'};
function preflightUnavailable(){preflightObservedAt=0;q('#preflightStatus').textContent='Diagnóstico do ciclo indisponível ou desatualizado.';q('#continuousPreflight').replaceChildren();}
function renderPreflight(data){
  const observed=Date.parse(data?.observedAt), checks=Object.keys(screenCheckLabels);
  const validStudy=s=>s&&typeof s.studyId==='string'&&s.studyId.length>0&&typeof s.eligible==='boolean'&&typeof s.configured==='boolean'&&s.configured===(s.studyId===data.configuredStudyId)&&s.evidence&&(s.evidence.netPnl===null||Number.isFinite(s.evidence.netPnl))&&Array.isArray(s.checks)&&s.checks.length===checks.length&&s.checks.every(c=>c&&checks.includes(c.id)&&typeof c.ok==='boolean')&&new Set(s.checks.map(c=>c.id)).size===checks.length&&s.eligible===s.checks.every(c=>c.ok);
  if(data?.scope!=='READ_ONLY_CONTINUOUS_PREFLIGHT'||!Number.isFinite(observed)||Date.now()-observed>15000||observed>Date.now()+5000||typeof data.activationReady!=="boolean"||(data.activationReady&&!(data.cycleEnabled===true&&data.runtimePrerequisites?.ready===true&&typeof data.configuredStudyId==="string"))||typeof data.cycleEnabled!=='boolean'||!(data.configuredStudyId===null||typeof data.configuredStudyId==='string')||!Array.isArray(data.studies)||data.studies.length>21||data.studies.some(s=>!validStudy(s))||new Set(data.studies.map(s=>s.studyId)).size!==data.studies.length||!Array.isArray(data.unverified)||!data.runtimePrerequisites||typeof data.runtimePrerequisites.ready!=='boolean'||!Array.isArray(data.runtimePrerequisites.reasons)) {preflightUnavailable();return;}
  preflightObservedAt=observed;const host=q('#continuousPreflight'), focusedStudy=document.activeElement?.dataset?.preflightStudy;host.replaceChildren();
  q('#preflightStatus').textContent='Ciclo '+(data.cycleEnabled?'configurado como habilitado':'desligado')+' · '+(data.configuredStudyId?'estudo explicitamente configurado':'nenhum estudo selecionado')+(data.activationReady?' · piloto ativo, release aprovada'+(data.release?.approvedBy==='BACKEND_FINGERPRINT'?' pela impressão do backend':' pelo commit')+(data.release?.backendFingerprint?' · backend '+String(data.release.backendFingerprint).slice(0,12):'')+'.':' · ativação exige aceitação operacional externa.');
  const blockers={EXPLICIT_STUDY_REQUIRED:'Escolher explicitamente um estudo elegível',CONFIGURED_STUDY_NOT_ELIGIBLE:'O estudo configurado não passa na triagem',NEW_EXPOSURE_HALTED:'Novas exposições pausadas',PERPETUAL_EXECUTION_DISABLED:'Execução paper desligada',HISTORICAL_PERSISTENCE_FAILED:'Gravação de estudo falhou',PERPETUAL_SOURCE_UNAVAILABLE:'Fonte de mercado indisponível',FUNDING_RECONCILIATION_PENDING:'Funding aguardando conciliação'};
  for(const reason of data.runtimePrerequisites.reasons)host.append(node('p',blockers[reason]||'Bloqueio operacional: '+reason));
  const external={AUTOMATIC_OFF_PROVIDER_BACKUP:'Backup automático fora do provedor',EXTERNAL_FAILURE_ALERTS:'Alertas externos de falhas',CONTINUOUS_RELEASE_REVIEW:'Revisão da release contínua'};
  for(const item of data.unverified)host.append(node('p','Aceitação externa pendente: '+(external[item]||item)));
  if(!data.studies.length)host.append(node('p','Nenhum estudo registrado para triagem.'));
  for(const study of data.studies){
    const card=node('article','');card.className='lab-card';card.append(node('h4',study.eligible?'Elegível para avaliação paper, sujeito aos demais controles':'Não elegível para ciclo contínuo'),node('small',study.studyId+(study.configured?' · configurado':'')),node('p','P&L histórico fora da amostra: '+money(study.evidence.netPnl)));
    const criteria=node('details',''),list=node('ul','');criteria.append(node('summary','Conferir critérios · '+study.checks.filter(c=>!c.ok).length+' pendentes'));for(const check of study.checks)list.append(node('li',(check.ok?'✓ ':'Pendente: ')+screenCheckLabels[check.id]));criteria.append(list);card.append(criteria);
    const detail=node('button','Abrir evidência original');detail.dataset.preflightStudy=study.studyId;detail.onclick=()=>studyDetails(study.studyId);card.append(detail);host.append(card);if(focusedStudy===study.studyId)detail.focus();
  }
}
q('#runStudy').onclick = async () => {
  const button = q('#runStudy');button.disabled = true;
  try { const set=q('#studySet')?.value||'',body=set?JSON.stringify({bars:5000,trainBars:1500,testBars:500,candidateSet:set}):'{}';
  const response = await fetch('/backtests/v2/studies', {method:'POST',headers:{'Content-Type':'application/json'},body});const result = await response.json();q('#studyActionStatus').textContent = response.ok ? 'Estudo histórico registrado: ' + result.id : result.error || 'Estudo indisponível';await refreshOnline(); }
  catch { q('#studyActionStatus').textContent = 'Não foi possível acessar o laboratório'; } finally { button.disabled = false; }
};
