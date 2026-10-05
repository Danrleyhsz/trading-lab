// Recorded history and audit views: original events, account operations and paged event history. Read-only.
const eventLabels={AGENT_STATE_CHANGED:'Estado do agente',TRADE_PROPOSED:'Proposta paper',RISK_APPROVED:'Risco aprovado',RISK_REJECTED:'Risco rejeitado',PAPER_ORDER_SUBMITTED:'Ordem paper enviada',PAPER_FILL:'Fill paper',POSITION_CLOSED:'Posição encerrada',MEMORY_CREATED:'Memória registrada',RESEARCH_STARTED:'Pesquisa iniciada',RESEARCH_COMPLETED:'Pesquisa concluída',RESEARCH_FAILED:'Falha na pesquisa',BACKTEST_STARTED:'Estudo iniciado',BACKTEST_COMPLETED:'Estudo concluído',BACKTEST_FAILED:'Falha no estudo',FUNDING_SETTLED:'Funding liquidado',PAPER_LIQUIDATION:'Liquidação paper',PAPER_CONTROL_CHANGED:'Controle paper alterado',AUTONOMOUS_DECISION:'Decisão autônoma',MARKET_DATA_FAILED:'Fonte indisponível'};
let auditVersion=0,historyVersion=0,historyCursor=null,auditCursor=null,auditAccount=null,auditReturn=null,auditOpener=null;
function eventLabel(record){const p=record.payload||{};return (eventLabels[record.type]||record.type)+(record.type==='AGENT_STATE_CHANGED'?' · '+(p.name||p.id||'')+' · '+(statusLabels[p.status]||p.status||'')+' · '+(p.room||''):'');}
function sourceButton(id,received){const button=node('button','Abrir evento de origem · '+id);button.className='source-link';button.dataset.eventId=id;button.onclick=()=>showEvent(id,received);return button;}
function renderSessionEvents(){const focus=document.activeElement?.dataset?.eventId,buttons=[];q('#events').replaceChildren(...events.map(record=>{const li=node('li',''),button=node('button',date(record.occurredAt)+' · '+eventLabel(record));button.className='event-button';button.dataset.eventId=record.id;button.onclick=()=>showEvent(record.id,record);li.append(button);buttons.push(button);return li;}));buttons.find(button=>button.dataset.eventId===focus)?.focus?.({preventScroll:true});}
function outcomeCard(trade){const row=node('article','');row.className='trade-outcome';row.append(node('b',trade.symbol+' '+trade.direction+' · '+money(trade.netPnl)),node('p',date(trade.openedAt)+' → '+date(trade.closedAt)),node('small','P&L bruto '+money(trade.grossPnl)+' · taxas '+money(trade.feesPaid)+' · funding '+money(trade.fundingCashDelta)));for(const id of trade.fillEventIds||[])row.append(sourceButton(id));for(const id of trade.fundingEventIds||[]){row.append(node('small','Funding registrado'));row.append(sourceButton(id));}return row;}
function openAudit(){stopPresence();const dialog=q('#auditDialog');if(!dialog.open){auditOpener=document.activeElement;dialog.showModal();}}
function resetAudit(title,status){q('#auditTitle').textContent=title;q('#auditStatus').textContent=status;q('#auditContent').replaceChildren();q('#auditOlder').hidden=true;q('#auditOlder').disabled=true;q('#auditBack').hidden=true;}
function eventAccount(record){const p=record.payload||{};return p.accountId||p.order?.accountId||p.fill?.accountId;}
function renderEvent(record,durable){
 const host=q('#auditContent');host.replaceChildren();host.append(node('h3',eventLabel(record)),node('p','Registrado em: '+date(record.occurredAt)),node('p','ID original: '+record.id),node('small','Tipo original: '+record.type));
 const p=record.payload||{},account=eventAccount(record);if(account)host.append(node('p','Conta: '+account));if(typeof p.decision?.approved==='boolean')host.append(node('p','Decisão registrada: '+(p.decision.approved?'aprovada':'rejeitada')));if(Array.isArray(p.decision?.reasons)&&p.decision.reasons.length)host.append(node('p','Motivos registrados: '+p.decision.reasons.join(', ')));if(p.error)host.append(node('p','Falha registrada: '+p.error));
 const details=node('details',''),summary=node('summary','Dados originais do evento'),payload=node('pre',JSON.stringify(record.payload,null,2));details.append(summary,payload);host.append(details);
 q('#auditStatus').textContent=durable?'Evento confirmado no histórico gravado. Dados originais; consulta sem alterar o sistema.':'Recebido nesta sessão. Ainda não confirmado no histórico gravado; pode ser temporário.';
 configureAuditBack();
}
async function showEvent(id,received){
 const back=auditReturn;const version=++auditVersion;resetAudit('Evento de origem','Consultando histórico gravado…');auditReturn=back;configureAuditBack();openAudit();
 try{const result=await get('/audit/events/'+encodeURIComponent(id));if(version!==auditVersion)return;if(result.source!=='DURABLE_SNAPSHOT'||!result.event||result.event.id!==id)throw Error('invalid audit response');renderEvent(result.event,true);}
 catch(error){if(version!==auditVersion)return;if(error.status===404&&received?.id===id)renderEvent(received,false);else{q('#auditStatus').textContent=error.status===404?'Evento não encontrado no histórico gravado.':'Histórico indisponível. Confira o acesso e tente novamente.';}}
}
function performancePath(account){return (account.instrument==='BINANCE_USDM:BTCUSDT'?'/paper/perpetual/accounts/':'/paper/accounts/')+encodeURIComponent(account.accountId||account.id)+'/performance';}
function renderAccountAudit(result,account){
 resetAudit('Operações · '+(account.accountId||account.id),'');q('#auditStatus').textContent='Conta '+(account.accountId||account.id)+' · '+account.instrument+' · fundo e avaliação permanecem separados.';
 const host=q('#auditContent');host.append(node('p',outcomeLabel(result)),node('small','Operações abertas ficam fora da taxa de acerto. Cada evento consulta seu registro gravado.'));
 if(!result.available){host.append(node('p',result.reason||'Evidências de operações indisponíveis'));return;}
 host.append(node('p','Resultado líquido encerrado: '+money(result.summary.closedNetPnl)));
 if(!result.closedTrades.length)host.append(node('p','Nenhuma operação completa registrada nesta página.'));
 for(const trade of result.closedTrades)host.append(outcomeCard(trade));
 auditCursor=result.nextCursor||null;auditAccount=account;q('#auditOlder').hidden=!auditCursor;q('#auditOlder').disabled=!auditCursor;
 auditReturn=()=>renderAccountAudit(result,account);
}
async function openAccountAudit(account,before){
 const version=++auditVersion;auditReturn=null;auditAccount=account;resetAudit('Operações da conta','Consultando operações registradas…');openAudit();
 try{const result=await get(performancePath(account)+'?limit=25'+(before?'&before='+encodeURIComponent(before):''));if(version!==auditVersion)return;if(result.coverage!=='RECORDED_LEDGER_ONLY'||!Array.isArray(result.closedTrades)||!result.summary||typeof result.available!=='boolean')throw Error('invalid performance response');renderAccountAudit(result,account);}
 catch{if(version===auditVersion)q('#auditStatus').textContent='Operações indisponíveis. Confira o acesso e reabra a conta.';}
}
async function loadEventHistory(before){
 const version=++historyVersion,type=q('#eventType').value||'';historyCursor=null;q('#olderEvents').disabled=true;q('#historyList').replaceChildren();q('#historyStatus').textContent='Consultando histórico gravado…';
 try{const result=await get('/audit/events?limit=25'+(type?'&type='+encodeURIComponent(type):'')+(before?'&before='+encodeURIComponent(before):''));if(version!==historyVersion)return;if(result.source!=='DURABLE_SNAPSHOT'||!Array.isArray(result.events))throw Error('invalid audit response');const rows=result.events.map(record=>{const li=node('li',''),button=node('button',date(record.occurredAt)+' · '+eventLabel(record));button.className='event-button';button.onclick=()=>{auditReturn=null;showEvent(record.id);};li.append(button);return li;});q('#historyList').replaceChildren(...rows);q('#historyStatus').textContent=result.events.length?result.events.length+' eventos nesta página. Ordenação pela data original; IDs preservados.':'Nenhum evento gravado para este filtro.';historyCursor=result.nextCursor||null;q('#olderEvents').disabled=!historyCursor;}
 catch{if(version===historyVersion)q('#historyStatus').textContent='Histórico gravado indisponível. Confira o acesso e atualize.';}
}
q('#navHistory').onclick=()=>{openPanel('historyPanel','Relatórios · piloto e histórico gravado','navHistory');loadEventHistory();};
q('#reloadEvents').onclick=()=>loadEventHistory();q('#eventType').onchange=()=>loadEventHistory();q('#olderEvents').onclick=()=>{if(historyCursor)loadEventHistory(historyCursor);};
q('#auditOlder').onclick=()=>{if(auditCursor&&auditAccount)openAccountAudit(auditAccount,auditCursor);};
function configureAuditBack(){if(auditReturn){q('#auditBack').hidden=false;q('#auditBack').onclick=()=>{auditVersion++;auditReturn();};}}
q('#closeAudit').onclick=()=>q('#auditDialog').close();q('#auditDialog').addEventListener('close',()=>{auditVersion++;auditReturn=null;auditAccount=null;auditCursor=null;if(auditOpener?.isConnected)auditOpener.focus?.({preventScroll:true});else if(q('#profile').open)q('#closeProfile').focus?.();else if(q('#workspaceDialog').open)q('#closeWorkspace').focus?.();else (document.querySelector('.nav.active')||q('#navOffice')).focus?.();auditOpener=null;});
