// Escritório 2.0 (F1): câmera, foco por zona, barra de cima, agentes e painel. Dados só de rotas GET autenticadas;
// sem dado, o elemento diz "sem dado" (UNKNOWN). Passeios de agentes em pausa são cosméticos e rotulados (STATIC).
(() => {
 const D=globalThis.document;if(!D)return;
 const $=s=>D.querySelector(s),el=(tag,cls,text)=>{const n=D.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
 // Fonte prevista e fase de cada módulo (OFFICE_BACKEND_VISUAL_MAP.md). Na F1 os painéis ainda não leem esses dados.
 const MODULES={
  MAIN_FLOOR:{name:'Entrada e visão geral',phase:'F1',truth:'REAL',sources:['/finance (equity, P&L do dia, posições)']},
  MARKET_HORIZON:{name:'Horizon · inteligência de mercado',phase:'F5',truth:'REAL',sources:['/market/v3','/market/panorama','/market/venues (referência)']},
  DECISION_RING:{name:'Anel de decisão',phase:'F2',truth:'REAL',sources:['/paper/perpetual/pilot/receipts (fichas de decisão)']},
  PAPER_EXECUTION:{name:'Execução paper',phase:'F2',truth:'REAL',sources:['/paper/perpetual/accounts','/audit/events?type=PAPER_FILL']},
  RISK_CONTROL:{name:'Gestão de risco',phase:'F4',truth:'REAL',sources:['/finance (checagens)','/paper/perpetual/status (kill switch)']},
  NEXUS:{name:'Nexus · comunicação',phase:'F4',truth:'REAL',sources:['/agent-messages','/agents']},
  DIAGNOSTICS:{name:'Diagnóstico · linha do tempo',phase:'F4',truth:'REAL',sources:['/paper/perpetual/pilot/parity','/runtime/readiness']},
  STRESS_LAB:{name:'Stress Lab · testes',phase:'F3',truth:'SIMULATION',sources:['relatório STRESS_LAB_V1 (rota de leitura na F3)']},
  BACKTEST:{name:'Backtest · experimentos',phase:'F3',truth:'SIMULATION',sources:['/backtests/v2/studies']},
  AUDIT_LOGS:{name:'Auditoria · registros',phase:'F4',truth:'REAL',sources:['/paper/perpetual/pilot/receipts','/audit/events']},
  IDLE_LOUNGE:{name:'Lazer',phase:'F1',truth:'STATIC',sources:['passeios cosméticos rotulados']},
  PANORAMIC_EDGE:{name:'Borda panorâmica',phase:'F1',truth:'STATIC',sources:['decoração']},
 };
 const STATUS={IDLE:'parado',RESEARCHING:'pesquisando',BACKTESTING:'testando',TRADING:'operando (paper)',REVIEWING_RISK:'revisando risco',MEETING:'em reunião'};
 const state={map:null,iso:null,scene:null,cache:null,agents:new Map(),session:null,market:null,focus:null,camera:{x:0,y:0,s:1},target:null,anim:null,hidden:false};
 const viewport=$('#viewport'),canvas=$('#scene'),ctx=canvas.getContext('2d'),labels=$('#labels'),panel=$('#panel');
 const loadImage=src=>{const img=new Image();img.decoding='async';img.src=src;return img;};
 const charImages={},images={props:{}};
 async function get(path){try{const r=await fetch(path,{credentials:'same-origin',headers:{accept:'application/json'}});if(!r.ok)return {ok:false,status:r.status};return {ok:true,body:await r.json()};}catch{return {ok:false,status:0};}}
 const why=res=>res.status===401||res.status===403?'sem acesso (entre pelo escritório atual)':res.status===404?'rota ainda não publicada em produção (deploy pendente)':res.status===0?'sem conexão':'indisponível (HTTP '+res.status+')';

 // ---------- F2: Anel de decisão e Execução paper ----------
 const R=globalThis.Office2Ring;
 state.ring={receipts:null,accounts:null,fills:null,index:0,at:0};
 async function fetchRing(){
  const [receipts,accounts,fills]=await Promise.all([get('/paper/perpetual/pilot/receipts?limit=24'),get('/paper/perpetual/accounts'),get('/audit/events?type=PAPER_FILL&accountId='+encodeURIComponent(R.ACCOUNT)+'&limit=10&compact=1')]);
  const prev=state.ring.receipts?.ok?state.ring.receipts.body.receipts[state.ring.index]?.decisionEventId:null;
  Object.assign(state.ring,{receipts,accounts,fills,at:Date.now()});
  // Mantém a mesma decisão aberta depois de atualizar (se ainda estiver na lista).
  const list=receipts.ok?receipts.body.receipts:[];const k=prev?list.findIndex(r=>r.decisionEventId===prev):-1;state.ring.index=k>=0?k:0;
 }
 const currentReceipt=()=>state.ring.receipts?.ok?state.ring.receipts.body.receipts[state.ring.index]??null:null;
 const executionView=()=>state.ring.accounts?.ok?R.execution(state.ring.accounts.body,state.ring.fills?.ok?state.ring.fills.body.events:[]):null;
 /** Conteúdo das telas com dado; sem dado a tela fica apagada (o desenho padrão é UNKNOWN). */
 function screenContent(){
  const out={},r=currentReceipt(),vm=executionView();
  if(r){const st=R.stages(r);out['ring-anel']=(c,inner)=>R.paintRing(c,inner,st);}
  if(vm?.hourly?.length)out['ring-execucao']=(c,inner)=>R.paintExecution(c,inner,vm);
  const lab=stressView(),st=studiesView();
  if(lab)out['stress-placar']=(c,inner)=>L.paintStress(c,inner,lab);
  if(st?.rows.some(r=>r.netPnl!==null))out['backtest-estudos']=(c,inner)=>L.paintStudies(c,inner,st);
  const nx=nexusView(),dg=diagView(),au=auditView(),rk=riskView();
  if(nx?.edges.length)out['nexus-grafo']=(c,inner)=>O.paintNexus(c,inner,nx);
  if(dg?.timeline.length)out['diagnostico-linha']=(c,inner)=>O.paintTimeline(c,inner,dg);
  if(au?.receipts?.decisions)out['auditoria-fichas']=(c,inner)=>O.paintAudit(c,inner,au);
  if(rk&&(rk.killSwitch!==null||rk.limits.some(l=>l.use!==null)))out['risk-limites']=(c,inner)=>O.paintRisk(c,inner,rk);
  const hz=horizonView();
  if(hz?.btc48h.length>1)out['horizon-a']=(c,inner)=>H.paintPrice(c,inner,hz);
  if(hz?.book?.bids.length)out['horizon-b']=(c,inner)=>H.paintBook(c,inner,hz);
  return out;
 }
 // ---------- F3: Stress Lab e Backtest (SIMULAÇÃO) ----------
 const L=globalThis.Office2Lab;
 state.lab={report:null,studies:null,status:null};
 async function fetchLab(){
  // Relatório estático do STRESS_LAB_V1 (gerado por npm run stress-lab; o teste confere que bate com uma rodada nova).
  if(!state.lab.report?.ok)state.lab.report=await get('/office2/stress-report.json');
  state.lab.studies=await get('/backtests/v2/studies');
 }
 const stressView=()=>state.lab.report?.ok?L.stress(state.lab.report.body):null;
 const studiesView=()=>state.lab.studies?.ok?L.studies(state.lab.studies.body,state.lab.status?.ok?state.lab.status.body:null):null;
 // ---------- F4: Nexus, Diagnóstico, Auditoria, Risk ----------
 const O=globalThis.Office2Ops;
 state.ops={messages:null,readiness:null,events:null,parity:null,parityAt:0,onlyDecision:false};
 async function fetchOps(){
  const [messages,readiness,events]=await Promise.all([get('/agent-messages'),get('/runtime/readiness'),get('/audit/events?limit=15&compact=1')]);Object.assign(state.ops,{messages,readiness,events});
  // A paridade baixa histórico no servidor (que guarda em cache por 10 min): só busca com o Diagnóstico aberto.
  if(state.focus?.module==='DIAGNOSTICS'&&Date.now()-state.ops.parityAt>120000){state.ops.parityAt=Date.now();state.ops.parity=await get('/paper/perpetual/pilot/parity');}
 }
 const nexusView=()=>state.ops.messages?.ok?O.nexus(state.ops.messages.body,state.ops.onlyDecision?currentReceipt()?.decisionEventId??null:null):null;
 const diagView=()=>O.diagnostics(currentReceipt(),state.ops.parity?.ok?state.ops.parity.body:null,state.ops.readiness?.ok?state.ops.readiness.body:null,state.lab.status?.ok?state.lab.status.body:null);
 const auditView=()=>O.audit(state.ring.receipts?.ok?state.ring.receipts.body:null,state.ops.events?.ok?state.ops.events.body.events:null);
 const riskView=()=>O.risk(state.ring.accounts?.ok?state.ring.accounts.body:null,state.lab.status?.ok?state.lab.status.body:null,state.ring.receipts?.ok?state.ring.receipts.body:null);
 const pctTxt=v=>v===null||v===undefined||!Number.isFinite(v)?'n/d':(v*100).toFixed(2)+'%';
 function decisionNav(box){const res=state.ring.receipts;if(!res?.ok||!res.body.receipts.length)return;const list=res.body.receipts,nav=el('div','ring-nav');
  nav.append(Object.assign(el('button','ghost','← anterior'),{type:'button',disabled:state.ring.index>=list.length-1,onclick:()=>{state.ring.index++;renderPanel();}}),
   el('span','','decisão '+(state.ring.index+1)+' de '+list.length+' (a mesma aberta no Ring)'),
   Object.assign(el('button','ghost','mais recente →'),{type:'button',disabled:state.ring.index===0,onclick:()=>{state.ring.index--;renderPanel();}}));box.append(nav);}
 // ---------- F5: Horizon (mercado) ----------
 const H=globalThis.Office2Horizon;
 state.mkt={panorama:null,v3:null,venues:null};
 async function fetchMarket(){const [panorama,v3,venues]=await Promise.all([get('/market/panorama'),get('/market/v3'),get('/market/venues')]);Object.assign(state.mkt,{panorama,v3,venues});}
 const horizonView=()=>(state.mkt.panorama?.ok||state.mkt.v3?.ok)?H.horizon(state.mkt.panorama?.ok?state.mkt.panorama.body:null,state.mkt.v3?.ok?state.mkt.v3.body:null,state.mkt.venues?.ok?state.mkt.venues.body:null,state.ops.messages?.ok?state.ops.messages.body:null,Date.now()):null;
 const simSeal=text=>{const n=el('span','sim-seal',text);n.dataset.truth='SIMULATION';return n;};
 const truthChip=t=>{const c=el('span','truth',t);c.dataset.truth=t;return c;};
 const PANELS={
  DECISION_RING(box){
   const res=state.ring.receipts;
   if(!res){box.append(el('p','muted','Carregando fichas…'));return;}
   if(!res.ok){box.append(truthChip('UNKNOWN'),el('p','muted','Fichas de decisão: '+why(res)+'.'));return;}
   const sum=R.summary(res.body),list=res.body.receipts;
   if(sum){const p=el('p','muted',sum.decisions+' decisões gravadas · '+(sum.completePct===null?'n/d':sum.completePct+'%')+' com ficha completa'+(sum.latency?' · fechamento → decisão p50 '+sum.latency.p50+', p95 '+sum.latency.p95:''));box.append(truthChip('REAL'),p);
    if(sum.outcomes.length)box.append(el('p','muted','Desfechos: '+sum.outcomes.map(o=>o.label+' '+o.n).join(' · ')));
    if(sum.reasons.length)box.append(el('p','muted','Motivos: '+sum.reasons.map(o=>o.label+' '+o.n).join(' · ')));}
   if(!list.length){box.append(el('p','muted','Nenhuma decisão retida no servidor.'));return;}
   const r=list[state.ring.index],nav=el('div','ring-nav');
   const older=Object.assign(el('button','ghost','← anterior'),{type:'button',disabled:state.ring.index>=list.length-1,onclick:()=>{state.ring.index++;renderPanel();}});
   const newer=Object.assign(el('button','ghost','mais recente →'),{type:'button',disabled:state.ring.index===0,onclick:()=>{state.ring.index--;renderPanel();}});
   nav.append(older,el('span','',(state.ring.index+1)+' de '+list.length+' mais recentes'),newer);box.append(nav);
   const ol=el('ol','stages');
   for(const s of R.stages(r)){const li=el('li','stage');li.dataset.state=s.state;li.dataset.truth=s.truth;const head=el('div','stage-head');head.append(el('b','',s.label),truthChip(s.truth));li.append(head,el('span','',s.text));if(s.detail)li.append(el('small','',s.detail));ol.append(li);}
   box.append(ol);
   if(r.team?.length)box.append(el('p','muted','Equipe ('+r.team.length+' mensagens, consultivas): '+r.team.filter(m=>m.kind==='DEBATE').map(m=>m.summary).join(' ').slice(0,220)));
   box.append(el('p','muted','Ligação decisão → ordem por janela de tempo (lacuna L1); sem impressão digital do backend por decisão (L5).'));
   const a=el('a','',' ficha completa (JSON)');a.href='/paper/perpetual/pilot/receipts/'+encodeURIComponent(r.decisionEventId);a.target='_blank';a.rel='noopener';box.append(a);
  },
  STRESS_LAB(box){
   const res=state.lab.report;if(!res){box.append(el('p','muted','Carregando relatório…'));return;}
   const vm=stressView();if(!vm){box.append(truthChip('UNKNOWN'),el('p','muted','Relatório do laboratório: '+(res.ok?'formato inesperado':why(res))+'.'));return;}
   box.append(simSeal('SIMULAÇÃO · mercado sintético · semente '+vm.seed),el('p','',vm.headline));
   const dl=el('dl','facts');for(const [k,v] of vm.facts)dl.append(el('dt','',k),el('dd','',v));box.append(dl);
   const ol=el('ol','scenarios');for(const c of vm.scenarios){const li=el('li','stage');li.dataset.state=c.survived?'ok':'rejected';li.dataset.truth='SIMULATION';const head=el('div','stage-head');head.append(el('b','',c.title),el('span','muted',c.survived?'sobreviveu':'falhou'));li.append(head,el('small','',c.id+' · '+c.line));
    for(const v of c.violations)li.append(el('small','bad','invariante: '+v));for(const x of c.failed)li.append(el('small','bad','esperado: '+x));ol.append(li);}box.append(ol);
   box.append(el('p','muted','Sobreviver = manter os invariantes e os controles de risco, não ter lucro. Os preços são sintéticos: nada aqui é resultado do piloto ou do mercado. '+vm.version+' · sha256 '+vm.sha.slice(0,12)+'…'));
   const ul=el('ul');for(const t of ['O risco não tem limite de spread (entradas com spread de 2% pagam ~101 bps).','O limite de perda do piloto é checado de hora em hora: num salto de uma hora a perda passa do limite (4,35% contra 3%).','A divergência entre corretoras não é detectada (lacuna L7); só vale “dado de reserva nunca abre posição”.','Kill switch com posição aberta mantém a posição; ele só impede abrir ou aumentar.'])ul.append(el('li','',t));box.append(el('p','muted','Achados documentados (docs/STRESS_LAB.md):'),ul);
  },
  BACKTEST(box){
   const res=state.lab.studies;if(!res){box.append(el('p','muted','Carregando estudos…'));return;}
   if(!res.ok){box.append(truthChip('UNKNOWN'),el('p','muted','Estudos: '+why(res)+'.'));return;}
   const vm=studiesView();box.append(simSeal('SIMULAÇÃO HISTÓRICA · walk-forward'));
   if(vm.pilot){const p=el('p','','Estudo do piloto '+vm.pilot.id.slice(0,8)+': '+(vm.pilot.eligible?'elegível na triagem':'não elegível')+(vm.pilot.reason?' ('+vm.pilot.reason+')':''));p.dataset.truth='REAL';box.append(p);}else box.append(el('p','muted','Triagem do estudo do piloto: '+(state.lab.status?.ok?'sem estudo configurado':why(state.lab.status??{status:0}))+'.'));
   if(!vm.rows.length){box.append(el('p','muted','Nenhum estudo gravado.'));return;}
   const ul=el('ul','studies');for(const r of vm.rows){const li=el('li','',r.short+(r.pilot?' (piloto)':'')+' · '+r.status+' · '+r.window+(r.candidateSet?' · '+r.candidateSet:'')+' · '+r.folds+' folds · líquido '+(r.netPnl===null?'n/d':(r.netPnl>=0?'+':'')+r.netPnl.toFixed(2)+' (capital simulado de 10.000)'));li.dataset.truth='SIMULATION';ul.append(li);}box.append(ul);
   box.append(el('p','muted','Resultado de estudo histórico não é previsão nem desempenho do piloto.'));
  },
  MARKET_HORIZON(box){
   const vm=horizonView();if(!vm){box.append(truthChip('UNKNOWN'),el('p','muted','Mercado: '+why(state.mkt.panorama??{status:0})+'.'));return;}
   box.append(truthChip('REAL'),el('p','muted','Dados públicos da Binance coletados pelo servidor. Nada aqui é sinal de entrada.'));
   if(vm.tickers.length){const dl=el('dl','facts');for(const t of vm.tickers){const dd=el('dd','',Number(t.price).toLocaleString('pt-BR',{maximumFractionDigits:4})+' · '+H.pct(t.change)+(t.fresh?'':' · sem dado fresco'));dd.dataset.truth=t.fresh?'REAL':'UNKNOWN';dl.append(el('dt','',t.symbol.replace('USDT','')),dd);}box.append(dl);}
   if(vm.perp){const p=vm.perp;box.append(el('p','','BTC perpétuo: mark '+Number(p.mark).toFixed(1)+' · funding '+(p.funding*100).toFixed(4)+'% · spread '+(p.spreadBps===null?'n/d':p.spreadBps.toFixed(2)+' bps')+(p.fresh?'':' · cotação sem dado fresco')));}
   if(vm.regime||vm.volatility){const parts=[];if(vm.regime)parts.push('regime '+(vm.regime.regime??'n/d')+' ('+H.pct(vm.regime.distance)+' da média de 240 h, Oracle)');if(vm.volatility)const vol=v=>Number.isFinite(v)?(v*100).toFixed(2)+'%':'n/d';parts.push('volatilidade diária '+vol(vm.volatility.d24)+' em 24 h contra '+vol(vm.volatility.d7)+' em 7 dias'+(vm.volatility.expanding?', em expansão':'')+' (Vega)');box.append(el('p','',parts.join(' · ')));}
   if(vm.oi)box.append(el('p','','Open interest: '+H.usd(vm.oi.usd)+' USD · '+H.pct(vm.oi.change)+' em 24 h'+(vm.oi.fresh?'':' · sem dado fresco')));
   if(vm.flow)box.append(el('p','','Fluxo agressor (últimos '+vm.flow.minutes+' min): compra '+vm.flow.buy.toFixed(1)+' BTC · venda '+vm.flow.sell.toFixed(1)+' BTC · saldo '+(vm.flow.delta>=0?'+':'')+vm.flow.delta.toFixed(1)));
   if(vm.liquidations)box.append(el('p','','Liquidações em '+vm.liquidations.hours.toFixed(1)+' h: comprados '+H.usd(vm.liquidations.longs)+' · vendidos '+H.usd(vm.liquidations.shorts)+' USD'),el('small','muted',vm.liquidations.note));
   if(vm.venues){const n=el('p','','Outras corretoras ('+vm.venues.count+'): consenso '+Number(vm.venues.consensus).toFixed(1)+' · Binance a '+Number(vm.venues.divergenceBps).toFixed(1)+' bps · diferença de funding '+(vm.venues.fundingSpread8h*100).toFixed(4)+'% por 8 h');box.append(n,el('small','muted',vm.venues.note));}
   if(vm.errors)box.append(el('p','muted',vm.errors+' fonte(s) do panorama com erro agora.'));
  },
  MAIN_FLOOR(box){
   const vm=executionView();box.append(el('span','paper-seal','PAPER TRADING'));
   if(!vm){box.append(truthChip('UNKNOWN'),el('p','muted','Conta do piloto: '+why(state.ring.accounts??{status:0})+'.'));return;}
   box.append(truthChip(vm.fresh?'REAL':'UNKNOWN'),el('p','','Piloto (Nova): equity '+(Number.isFinite(vm.equity)?vm.equity.toFixed(2)+' USDT':'n/d')+(vm.pnlPct===null?'':' ('+(vm.pnlPct>=0?'+':'')+vm.pnlPct.toFixed(2)+'%)')+' · '+(vm.position?vm.position.side+' '+vm.position.qty+' BTC':'sem posição')));
   box.append(el('p','muted','Dinheiro fictício. As contas de avaliação dos outros agentes não fazem parte do fundo.'));
  },
  NEXUS(box){
   const res=state.ops.messages;if(!res){box.append(el('p','muted','Carregando mensagens…'));return;}
   if(!res.ok){box.append(truthChip('UNKNOWN'),el('p','muted','Mensagens: '+why(res)+'.'));return;}
   const vm=nexusView();box.append(truthChip('REAL'),el('p','muted',vm.total+' mensagens ('+vm.scope+') · '+vm.edges.length+' ligações entre agentes'));
   box.append(Object.assign(el('button','ghost',state.ops.onlyDecision?'mostrar todas as mensagens':'só a decisão aberta no Ring'),{type:'button',onclick:()=>{state.ops.onlyDecision=!state.ops.onlyDecision;renderPanel();}}));
   const cv=Object.assign(D.createElement('canvas'),{width:300,height:300,className:'graph'}),g=cv.getContext('2d');g.fillStyle='#0a1630';g.fillRect(0,0,300,300);
   if(O.paintNexus(g,[{x:0,y:0},{x:300,y:0},{x:300,y:300},{x:0,y:300}],vm)){g.fillStyle='#93a1bb';g.font='12px system-ui';for(const n of vm.nodes)g.fillText(n.id,150+Math.cos(n.angle)*108-18,150+Math.sin(n.angle)*108+(Math.sin(n.angle)>0?22:-12));box.append(cv);}
   else box.append(el('p','muted','Nenhuma troca entre agentes neste recorte.'));
   const ul=el('ul','studies');for(const e of vm.edges.slice(0,8))ul.append(el('li','',e.from+' → '+e.to+' · '+e.count+' ('+e.kinds.join(', ')+')'));box.append(ul);
   const ol=el('ul','studies');for(const m of vm.recent){const li=el('li','',O.day(m.at)+' · '+m.from+' → '+m.to+' · '+m.kind+(m.advisory?' (consultiva)':'')+': '+String(m.summary).slice(0,140));li.dataset.truth='REAL';ol.append(li);}
   box.append(el('p','muted','Mensagens recentes:'),ol);
  },
  DIAGNOSTICS(box){
   decisionNav(box);const vm=diagView();
   if(!vm.timeline.length)box.append(truthChip('UNKNOWN'),el('p','muted','Sem ficha de decisão: '+(state.ring.receipts?.ok?'nenhuma decisão retida':why(state.ring.receipts??{status:0}))+'.'));
   else{box.append(truthChip('REAL'));const ol=el('ol','stages');for(const e of vm.timeline){const li=el('li','stage');li.dataset.state=e.kind==='ok'?'ok':e.kind==='bad'?'rejected':e.kind==='proposal'?'pending':'none';li.append(el('b','',O.t(e.at)),el('span','',e.label));ol.append(li);}box.append(ol);}
   if(vm.parity){const p=vm.parity;box.append(el('p','','Paridade (replay): '+(p.passed?'aprovada':'com diferenças')+(p.row?' · esta decisão: '+p.row.verdict+', execução '+p.row.execution:' · decisão fora do histórico conferido')+(p.latency?' · latência p50 '+p.latency.median+' s':'')));}
   else box.append(el('p','muted','Paridade: '+(state.ops.parity?why(state.ops.parity):'buscando (o servidor baixa o histórico; pode levar alguns segundos)')+'.'));
   if(vm.readiness){const r=vm.readiness;box.append(el('p','','Serviço: '+(r.ready?'pronto':'não pronto: '+r.reasons.join(', '))+' · armazenamento '+(r.storage??'n/d')+' · mercado perpétuo '+(r.market??'n/d')+(r.lastPersistenceFailureAt?' · última falha de gravação '+O.day(r.lastPersistenceFailureAt):'')));}
   else box.append(el('p','muted','Prontidão: '+why(state.ops.readiness??{status:0})+'.'));
   if(vm.cycle){const c=vm.cycle;box.append(el('p','','Ciclo do piloto agora: '+(c.error?'erro: '+c.error:'sem erro')+(c.lastAttemptFailed?' · última tentativa falhou':'')+(c.stopReason?' · parado: '+c.stopReason:'')));}
   const h=el('p','muted','Histórico de falhas e novas tentativas: não gravado (lacuna L2); só o estado atual existe.');h.dataset.truth='UNKNOWN';box.append(h);
  },
  AUDIT_LOGS(box){
   const vm=auditView();
   if(vm.receipts)box.append(truthChip('REAL'),el('p','',vm.receipts.complete+' de '+vm.receipts.decisions+' decisões com ficha completa ('+pctTxt(vm.receipts.fraction)+')'));
   else box.append(truthChip('UNKNOWN'),el('p','muted','Fichas: '+why(state.ring.receipts??{status:0})+'.'));
   if(vm.events){const ul=el('ul','studies');for(const e of vm.events){const li=el('li','',O.day(e.at)+' · '+e.type+(e.account?' · '+e.account:''));li.dataset.truth='REAL';ul.append(li);}
    box.append(el('p','muted','Eventos gravados mais recentes (snapshot durável):'),ul);const a=el('a','','todos os eventos (JSON)');a.href='/audit/events?limit=100&compact=1';a.target='_blank';a.rel='noopener';box.append(a);}
   else box.append(el('p','muted','Eventos: '+why(state.ops.events??{status:0})+'.'));
  },
  RISK_CONTROL(box){
   const vm=riskView();
   if(vm.killSwitch===null&&!vm.limits.some(l=>l.value!==null)){box.append(truthChip('UNKNOWN'),el('p','muted','Estado de risco: '+why(state.lab.status??{status:0})+'.'));return;}
   box.append(truthChip('REAL'),el('p','','Kill switch: '+(vm.killSwitch===null?'sem dado':vm.killSwitch?'LIGADO (nova exposição bloqueada)':'desligado')+(vm.stopReason?' · piloto parado: '+vm.stopReason:'')));
   const ol=el('ol','stages');
   for(const l of vm.limits){const li=el('li','stage');li.dataset.state=l.use===null?'unknown':l.use>=1?'rejected':l.use>=0.6?'pending':'ok';li.dataset.truth=l.use===null?'UNKNOWN':'REAL';
    const bar=el('div','meter'),fill=el('span');fill.style.width=Math.min(100,(l.use??0)*100)+'%';bar.append(fill);
    li.append(el('b','',l.label),el('span','','atual '+pctTxt(l.value)+' · limite '+pctTxt(l.limit)+(l.use===null?'':' · '+Math.round(l.use*100)+'% do limite')),bar,el('small','',l.note));ol.append(li);}
   box.append(ol,el('p','muted',vm.rejections.length?'Motivos nas fichas: '+vm.rejections.map(r=>r.reason+' '+r.n).join(' · '):'Nenhuma rejeição ou bloqueio nas fichas retidas.'));
   const ready=state.ops.readiness?.ok?state.ops.readiness.body.paper?.newExposure:null;if(ready)box.append(el('p','','Nova exposição: '+(ready.ready?'permitida pelo serviço':'bloqueada: '+ready.reasons.join(', '))));
  },
  PAPER_EXECUTION(box){
   const res=state.ring.accounts;
   if(!res){box.append(el('p','muted','Carregando conta paper…'));return;}
   if(!res.ok){box.append(truthChip('UNKNOWN'),el('p','muted','Conta paper: '+why(res)+'.'));return;}
   const vm=executionView();if(!vm){box.append(truthChip('UNKNOWN'),el('p','muted','Conta do piloto ('+R.ACCOUNT+') não encontrada.'));return;}
   const money=v=>Number.isFinite(v)?v.toFixed(2)+' USDT':'n/d';
   box.append(el('span','paper-seal','PAPER · dinheiro fictício'),truthChip(vm.fresh?'REAL':'UNKNOWN'));
   const dl=el('dl','facts');const row=(k,v)=>dl.append(el('dt','',k),el('dd','',v));
   row('Equity',money(vm.equity)+(vm.pnlPct===null?'':' ('+(vm.pnlPct>=0?'+':'')+vm.pnlPct.toFixed(2)+'%)'));
   row('Posição',vm.position?vm.position.side+' '+vm.position.qty+' BTC @ '+Number(vm.position.avg).toFixed(2):'sem posição');
   row('Taxas pagas',money(vm.fees));row('Funding',money(vm.funding));row('Fills',String(vm.fillCount??'n/d'));
   row('Avaliação',vm.fresh?'cotação fresca':'cotação sem dado fresco');box.append(dl);
   if(state.ring.fills?.ok&&vm.fills.length){const ul=el('ul');for(const f of vm.fills)ul.append(el('li','',new Date(f.at).toISOString().slice(0,16).replace('T',' ')+' · '+f.side+' '+f.qty+' @ '+Number(f.price).toFixed(2)+' · taxa '+Number(f.fee).toFixed(4)));box.append(el('p','muted','Últimos fills gravados:'),ul);}
   else box.append(el('p','muted',state.ring.fills?.ok?'Nenhum fill gravado.':'Fills: '+why(state.ring.fills)+'.'));
  },
 };

 // ---------- câmera ----------
 function overview(){const {w,h}=state.map.projection.scene,vw=viewport.clientWidth,vh=viewport.clientHeight,s=Math.min(vw/w,vh/h);return {s,x:(vw-w*s)/2,y:(vh-h*s)/2};}
 function roomCamera(room){
  const t=room.tiles,pts=[[t.i0,t.j0],[t.i1,t.j0],[t.i1,t.j1],[t.i0,t.j1]].map(([i,j])=>state.iso.project(i,j));
  const cx=(Math.min(...pts.map(p=>p.x))+Math.max(...pts.map(p=>p.x)))/2,cy=(Math.min(...pts.map(p=>p.y))+Math.max(...pts.map(p=>p.y)))/2-24;
  const vw=viewport.clientWidth,vh=viewport.clientHeight,s=vw<900?Math.max(1,Math.floor(overview().s*2)):2;return {s,x:vw/2-cx*s,y:vh/2-cy*s};
 }
 function moveCamera(to){if(reduced){state.camera=to;return;}const from={...state.camera},start=performance.now();state.anim={from,to,start};}
 function stepCamera(now){const a=state.anim;if(!a)return;const t=Math.min(1,(now-a.start)/320),e=1-Math.pow(1-t,3);
  state.camera={s:a.from.s+(a.to.s-a.from.s)*e,x:a.from.x+(a.to.x-a.from.x)*e,y:a.from.y+(a.to.y-a.from.y)*e};if(t>=1)state.anim=null;}
 function resize(){const dpr=globalThis.devicePixelRatio||1;canvas.width=Math.round(viewport.clientWidth*dpr);canvas.height=Math.round(viewport.clientHeight*dpr);canvas.style.width=viewport.clientWidth+'px';canvas.style.height=viewport.clientHeight+'px';
  state.camera=state.focus?roomCamera(state.focus):overview();state.anim=null;}

 // ---------- zonas ----------
 function focusRoom(room){
  state.focus=room;moveCamera(room?roomCamera(room):overview());
  for(const b of D.querySelectorAll('[data-room]'))b.setAttribute('aria-current',String(!!room&&b.dataset.room===room.id));
  renderPanel();
  if(room?.module==='DIAGNOSTICS'&&Date.now()-state.ops.parityAt>120000)fetchOps().then(renderPanel);
 }
 function renderPanel(){
  panel.replaceChildren();const room=state.focus;panel.hidden=!room;if(!room)return;
  const mods=[room.module,...(room.subzones??[]).map(s=>s.module)].filter((m,k,a)=>a.indexOf(m)===k);
  const head=el('header');head.append(el('h2','',room.label),Object.assign(el('button','ghost','Visão geral'),{type:'button',onclick:()=>focusRoom(null)}));panel.append(head);
  for(const m of mods){const info=MODULES[m];const box=el('section','module');box.append(el('h3','',info.name));
   if(PANELS[m]){PANELS[m](box);panel.append(box);continue;}
   const chip=el('span','truth',info.truth);chip.dataset.truth=info.truth;box.append(chip);
   const list=el('ul');for(const s of info.sources)list.append(el('li','',s));box.append(el('p','muted','Fonte prevista:'),list);
   box.append(el('p','muted',info.phase==='F1'?'Sem painel de dados: área de ambiente.':'Painel com dados entra na fase '+info.phase+'. Até lá, as telas desta zona ficam apagadas (sem dado).'));panel.append(box);}
  const screens=state.map.screens.filter(s=>s.room===room.id);
  if(screens.length){const box=el('section','module');box.append(el('h3','','Telas'));const ul=el('ul');for(const s of screens){const live=!!screenContent()[s.id];const li=el('li','',s.id+' · ');const t=live?s.truth:'UNKNOWN',chip=el('span','truth',t);chip.dataset.truth=t;li.append(chip,D.createTextNode(live?' com dado':' sem dado (fase '+MODULES[s.module].phase+')'));ul.append(li);}box.append(ul);panel.append(box);}
  const here=[...state.agents.values()].filter(a=>state.iso.roomAt(Math.round(a.pos.i),Math.round(a.pos.j))?.id===room.id);
  const box=el('section','module');box.append(el('h3','','Agentes aqui'));
  if(!state.agentsReal)box.append(el('p','muted','Sem dado de agentes (sem acesso ou rota indisponível).'));
  else if(!here.length)box.append(el('p','muted','Nenhum agente nesta zona agora.'));
  else{const ul=el('ul');for(const a of here){const li=el('li','',a.name+' · '+(a.pause?'pausa (cosmético)':STATUS[a.status]??a.status));li.dataset.truth=a.pause?'STATIC':'REAL';ul.append(li);}box.append(ul);}
  panel.append(box);
 }

 // ---------- agentes ----------
 const workPoint=id=>state.map.points.find(p=>p.agent===id);
 function syncAgents(list){
  const seen=new Set();
  for(const a of list){const wp=workPoint(a.id);if(!wp)continue;seen.add(a.id);
   let ag=state.agents.get(a.id);
   if(!ag){const rnd=Office2Iso.prng([...a.id].reduce((s,c)=>s*31+c.charCodeAt(0),7));ag={id:a.id,name:a.name,rnd,pos:{...wp.tile},home:wp,dir:wp.facing,mode:'idle',step:0,path:[],pause:null,nextPause:performance.now()+20000+rnd()*40000};state.agents.set(a.id,ag);ag.plate=el('div','plate');labels.append(ag.plate);}
   ag.name=a.name;ag.status=a.status;ag.reason=a.lastReason;
  }
  for(const [id,ag] of state.agents)if(!seen.has(id)){ag.plate.remove();state.agents.delete(id);}
 }
 function occupied(except){return [...state.agents.values()].filter(a=>a!==except).map(a=>({i:Math.round(a.pos.i),j:Math.round(a.pos.j)}));}
 function walkTo(ag,goal){const from={i:Math.round(ag.pos.i),j:Math.round(ag.pos.j)};const path=state.iso.plan(from,goal,occupied(ag));if(path.length>1){ag.path=path.slice(1);ag.mode='walk';ag.legStart=performance.now();ag.legFrom={...from};return true;}return false;}
 const idlePoints=()=>state.map.points.filter(p=>p.kind==='IDLE');
 function tickAgent(ag,now){
  const atHome=Math.round(ag.pos.i)===ag.home.tile.i&&Math.round(ag.pos.j)===ag.home.tile.j&&!ag.path.length;
  // Trabalho real (status ≠ IDLE): sentado no posto, sem passeio.
  if(ag.status!=='IDLE'){if(!atHome&&!ag.path.length)walkTo(ag,ag.home.tile);else if(atHome){ag.mode='seated';ag.dir=ag.home.facing;ag.pause=null;}}
  else if(!reduced&&!ag.path.length){
   if(ag.pause&&now>ag.pause.until){ag.pause=null;walkTo(ag,ag.home.tile);ag.nextPause=now+40000+ag.rnd()*60000;}
   else if(!ag.pause&&atHome&&now>ag.nextPause){const free=idlePoints().filter(p=>!occupied(ag).some(o=>o.i===p.tile.i&&o.j===p.tile.j));const pick=free[Math.floor(ag.rnd()*free.length)];
    if(pick&&walkTo(ag,pick.tile))ag.pause={point:pick.id,until:Infinity};else ag.nextPause=now+30000;}
   else if(atHome){ag.mode='idle';ag.dir=ag.home.facing;}
  }
  if(ag.path.length){const next=ag.path[0],t=Math.min(1,(now-ag.legStart)/400);ag.dir=state.iso.direction(ag.legFrom,next);ag.mode='walk';ag.step=Math.floor(now/125);
   ag.pos={i:ag.legFrom.i+(next.i-ag.legFrom.i)*t,j:ag.legFrom.j+(next.j-ag.legFrom.j)*t};
   if(t>=1){ag.path.shift();ag.legFrom={...next};ag.legStart=now;if(!ag.path.length){ag.mode='idle';if(ag.pause&&ag.pause.until===Infinity)ag.pause.until=now+20000+ag.rnd()*20000;}}}
 }
 function placePlate(ag){ag.plate.hidden=tiny();const c=state.camera,p=state.iso.project(ag.pos.i+0.5,ag.pos.j+0.5,state.map.projection.personHeightPx+10);
  ag.plate.style.transform=`translate(${Math.round(p.x*c.s+c.x)}px,${Math.round(p.y*c.s+c.y)}px) translate(-50%,-100%)`;
  const label=ag.name+(ag.pause?' · pausa':'');if(ag.plate.textContent!==label)ag.plate.textContent=label;ag.plate.dataset.truth=ag.pause?'STATIC':'REAL';}

 // ---------- rótulos das zonas (L7) ----------
 const zoneLabels=[];
 function buildZoneLabels(){for(const r of state.map.rooms){if(r.module==='PANORAMIC_EDGE'&&r.outdoor&&r.id==='terraco-norte')continue;const n=el('button','zone-label',r.label);n.type='button';n.dataset.truth='STATIC';n.onclick=()=>focusRoom(r);labels.append(n);
   const brand=r.edges?.j0==='parede-marca';if(brand){const b=el('div','brand','TRADINGLAB');b.dataset.truth='STATIC';labels.append(b);zoneLabels.push({node:b,room:r,brand:true});}
   zoneLabels.push({node:n,room:r});}}
 // Abaixo de 0,45 (celular na visão geral) os rótulos se sobrepõem: some o texto e a navegação fica na barra.
const tiny=()=>state.camera.s<0.45;
function placeZoneLabels(){const c=state.camera;for(const z of zoneLabels){z.node.hidden=tiny();const t=z.room.tiles,mid=state.iso.project((t.i0+t.i1)/2,t.j0,z.brand?56:80);z.node.style.transform=`translate(${Math.round(mid.x*c.s+c.x)}px,${Math.round(mid.y*c.s+c.y)}px) translate(-50%,-100%)`;z.node.style.fontSize=Math.max(10,Math.min(16,11*c.s))+'px';}}

 // ---------- barra de cima ----------
 function clock(){const now=new Date();$('#clockDate').textContent=now.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});$('#clockTime').textContent=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
 function chip(node,text,truth){node.textContent=text;node.dataset.truth=truth;}
 async function refresh(){
  const auth=await get('/auth/status');
  if(!auth.ok)chip($('#session'),'sessão: sem dado','UNKNOWN');else chip($('#session'),auth.body.authenticated?'acesso completo':auth.body.required?'sem acesso: entrar pelo escritório atual':'acesso aberto (desenvolvimento)',auth.body.authenticated||!auth.body.required?'REAL':'UNKNOWN');
  const agents=await get('/agents');
  state.agentsReal=agents.ok&&Array.isArray(agents.body);
  if(state.agentsReal)syncAgents(agents.body);else syncAgents([]);
  $('#agentsStatus').hidden=state.agentsReal;
  const status=await get('/paper/perpetual/status');state.lab.status=status;
  if(status.ok)chip($('#market'),status.body.marketReady?'mercado 24/7 · cotação fresca':'cotação sem dado fresco',status.body.marketReady?'REAL':'UNKNOWN');else chip($('#market'),'mercado: sem dado','UNKNOWN');
  await Promise.all([fetchRing(),fetchLab(),fetchOps(),fetchMarket()]);
  if(state.focus)renderPanel();
 }

 // ---------- laço ----------
 function frame(now){
  if(state.hidden)return;stepCamera(now);
  for(const ag of state.agents.values())tickAgent(ag,now);
  const dpr=globalThis.devicePixelRatio||1,c=state.camera;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0b1426';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.imageSmoothingEnabled=false;ctx.setTransform(c.s*dpr,0,0,c.s*dpr,c.x*dpr,c.y*dpr);
  state.scene.draw(ctx,state.cache,[...state.agents.values()],globalThis.OfficeSpriteSheets,charImages,screenContent());
  for(const ag of state.agents.values())placePlate(ag);placeZoneLabels();
  requestAnimationFrame(frame);
 }
 function onClick(ev){const r=canvas.getBoundingClientRect(),c=state.camera,x=(ev.clientX-r.left-c.x)/c.s,y=(ev.clientY-r.top-c.y)/c.s;const t=state.iso.tileAt(x,y);const room=t&&state.iso.roomAt(t.i,t.j);if(room)focusRoom(room);else if(state.focus)focusRoom(null);}

 async function start(){
  const res=await get('/office2/scene-map.json');if(!res.ok){$('#agentsStatus').hidden=false;$('#agentsStatus').textContent='Mapa da cena indisponível.';return;}
  state.map=res.body;state.iso=Office2Iso.create(state.map);
  for(const id of Object.keys(globalThis.OfficeSpriteSheets??{}))charImages[id]=loadImage('/office/characters/'+id+'.png');
  state.scene=Office2Scene.create(state.map,state.iso,images);state.cache=state.scene.renderStatic(2);
  buildZoneLabels();resize();
  for(const b of D.querySelectorAll('[data-room]'))b.addEventListener('click',()=>{const id=b.dataset.room;focusRoom(id?state.map.rooms.find(r=>r.id===id):null);});
  $('#moreZones').addEventListener('change',e=>{const r=state.map.rooms.find(x=>x.id===e.target.value);if(r)focusRoom(r);e.target.value='';});
  canvas.addEventListener('click',onClick);
  D.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.focus)focusRoom(null);});
  // O painel abre e fecha ao lado da cena: o tamanho da área da cena é observado, não só o da janela.
  if(globalThis.ResizeObserver)new ResizeObserver(()=>resize()).observe(viewport);else globalThis.addEventListener('resize',resize);
  D.addEventListener('visibilitychange',()=>{state.hidden=D.hidden;if(!D.hidden)requestAnimationFrame(frame);});
  clock();setInterval(clock,15000);await refresh();setInterval(refresh,15000);
  requestAnimationFrame(frame);
 }
 globalThis.Office2={state,focusRoom,MODULES};
 start();
})();
