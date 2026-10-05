// "Replay do dia": replays the last 24 hours of recorded messages and events in the office, hour by hour.
// It only re-shows original records (with their original time on screen); nothing is written anywhere.
(() => {
 const D=globalThis.document;if(!D)return;
 const $=s=>D.querySelector(s),DAY=86400000,STEP_MS=9000;
 let run=null;
 function bar(){
  let host=$('#replayBar');if(host)return host;
  host=D.createElement('div');host.id='replayBar';host.className='replay-bar';host.setAttribute('role','status');
  const label=D.createElement('b'),progress=D.createElement('span'),stop=D.createElement('button');progress.className='replay-progress';stop.textContent='Parar replay';stop.onclick=()=>finish('Replay interrompido.');
  host.append(label,progress,stop);$('.scene-scroll').append(host);return host;
 }
 async function load(){
  const messages=await get('/agent-messages');if(!Array.isArray(messages))throw Error('invalid messages');
  const events=[];let cursor=null;
  for(let page=0;page<6;page++){
   const result=await get('/audit/events?limit=100&compact=1'+(cursor?'&before='+encodeURIComponent(cursor):''));if(result?.source!=='DURABLE_SNAPSHOT'||!Array.isArray(result.events))throw Error('invalid events');
   events.push(...result.events);cursor=result.nextCursor;if(!cursor||Date.parse(result.events.at(-1)?.occurredAt)<Date.now()-DAY)break;
  }
  const since=Date.now()-DAY,items=[
   ...messages.filter(m=>Date.parse(m.createdAt)>=since).map(m=>({at:Date.parse(m.createdAt),kind:'message',record:m,group:m.context?.decisionEventId||m.createdAt.slice(0,16)})),
   ...events.filter(e=>Date.parse(e.occurredAt)>=since&&['PAPER_FILL','AUTONOMOUS_DECISION','RISK_APPROVED','RISK_REJECTED','FUNDING_SETTLED','AUTONOMOUS_PILOT_STOPPED','BACKTEST_COMPLETED','RESEARCH_COMPLETED'].includes(e.type)).map(e=>({at:Date.parse(e.occurredAt),kind:'event',record:e,group:e.type==='AUTONOMOUS_DECISION'?e.id:e.occurredAt.slice(0,16)}))
  ].sort((a,b)=>a.at-b.at);
  // Decision events join the briefing messages that carry their id.
  const groups=new Map();for(const item of items){const key=item.group;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  return [...groups.values()].sort((a,b)=>a[0].at-b[0].at);
 }
 function play(groups,index){
  if(!run||run.groups!==groups)return;
  if(index>=groups.length){finish('Replay concluído: '+groups.length+' momentos das últimas 24 h.');return;}
  if(!motionAllowed()){finish('Replay pausado: animações desligadas ou painel aberto.');return;}
  const group=groups[index],when=new Date(group[0].at);
  bar().firstChild.textContent='REPLAY · '+when.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' · '+(index+1)+'/'+groups.length;
  bar().children[1].setAttribute('style','--done:'+Math.round((index+1)/groups.length*100));
  group.forEach((item,i)=>setTimeout(()=>{
   if(!run||run.groups!==groups)return;
   if(item.kind==='message')life.react(item.record,Object.fromEntries([...agents.values()].map(a=>[a.id,a.name])));
   else{const line=OfficeDashboard.eventLine(item.record);if(line)OfficeDashboard.toast('['+when.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'] '+(agents.get(line.who)?.name||line.who||'')+' '+line.text,item.record.type==='PAPER_FILL'?'trade':'info');}
  },i*450));
  run.timer=setTimeout(()=>play(groups,index+1),STEP_MS);
 }
 function finish(message){if(run?.timer)clearTimeout(run.timer);run=null;$('#replayBar')?.remove();$('#replayDay').textContent='Replay do dia';if(message)OfficeDashboard.toast(message);}
 $('#replayDay').onclick=async()=>{
  if(run){finish('Replay interrompido.');return;}
  if(!motionAllowed()){OfficeDashboard.toast('Ative as animações para ver o replay.','alert');return;}
  $('#replayDay').textContent='Carregando…';
  try{const groups=await load();if(!groups.length){finish('Nenhum registro nas últimas 24 h.');return;}run={groups};$('#replayDay').textContent='Parar replay';play(groups,0);}
  catch{finish('Replay indisponível. Confira o acesso.');}
 };
 globalThis.OfficeReplay=Object.freeze({stop:()=>finish()});
})();
