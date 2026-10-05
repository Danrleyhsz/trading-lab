// Original read-only presentation of received structured-message evidence.
(() => {
 const signature=m=>JSON.stringify([m.id,m.from,m.to,m.kind,m.summary,m.createdAt]);
 function read(data,known,kinds,previous=[]){
  if(!Array.isArray(data))throw Error('invalid communications');
  const recent=data.slice(-20),ids=new Set(),old=new Map(previous.map(m=>[m.id,signature(m)]));
  for(const m of recent){
   if(!m||typeof m.id!=='string'||!m.id||!known.includes(m.from)||!Array.isArray(m.to)||!m.to.length||m.to.length>known.length||m.to.some(id=>!known.includes(id))||new Set(m.to).size!==m.to.length||!Object.hasOwn(kinds,m.kind)||typeof m.summary!=='string'||typeof m.createdAt!=='string'||!Number.isFinite(Date.parse(m.createdAt))||ids.has(m.id)||old.has(m.id)&&old.get(m.id)!==signature(m))throw Error('invalid communication evidence');
   ids.add(m.id);
  }
  return recent.map(m=>({id:m.id,from:m.from,to:[...m.to],kind:m.kind,summary:m.summary,createdAt:m.createdAt,...(m.context&&typeof m.context==='object'&&!Array.isArray(m.context)?{context:JSON.parse(JSON.stringify(m.context))}:{})}));
 }
 function links(message,positions){
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100;
  const from=positions.get(message.from);if(!valid(from))return [];
  return message.to.filter(id=>id!==message.from).flatMap(id=>{const to=positions.get(id);return valid(to)?[{from:message.from,to:id,start:from,end:to}]:[];});
 }
 globalThis.OfficeCollaboration={read,links};
})();
