import type {FastifyInstance} from 'fastify';
import type {DomainEvent} from '../domain/events.js';

const DAY=86400000;
export interface TimelineInput {accountId:string|null;events:DomainEvent[];ledger:DomainEvent[];hourly:{timestamp:number;equity:number}[];initialCash:number|null;now:number;days:number}
/**
 * Compact pilot history for the office: hourly decisions, fills, funding and hourly equity of the pilot account.
 * Built only from recorded events and the account's own equity points; no interpolation.
 */
export function pilotTimeline({accountId,events,ledger,hourly,initialCash,now,days}:TimelineInput){
 const since=now-days*DAY,time=(e:DomainEvent)=>Date.parse(e.occurredAt);
 const decisions=events.filter(e=>e.type==='AUTONOMOUS_DECISION'&&(e.payload as {accountId?:string})?.accountId===accountId&&time(e)>=since)
  .map(e=>{const p=e.payload as {candleTimestamp:number;direction:number;studyId:string};return {eventId:e.id,at:e.occurredAt,candleTimestamp:p.candleTimestamp,direction:p.direction,studyId:p.studyId};})
  .sort((a,b)=>a.candleTimestamp-b.candleTimestamp);
 const fills=ledger.filter(e=>e.type==='PAPER_FILL'&&time(e)>=since).map(e=>{const f=(e.payload as {fill:{side:string;quantity:number;fillPrice:number;fee:number}}).fill;return {eventId:e.id,at:e.occurredAt,side:f.side,quantity:f.quantity,price:f.fillPrice,fee:f.fee};});
 const funding=ledger.filter(e=>e.type==='FUNDING_SETTLED'&&time(e)>=since).map(e=>({eventId:e.id,at:e.occurredAt,cashDelta:(e.payload as {cashDelta:number}).cashDelta}));
 const stops=events.filter(e=>e.type==='AUTONOMOUS_PILOT_STOPPED'&&time(e)>=since).map(e=>({eventId:e.id,at:e.occurredAt,reason:(e.payload as {reason?:string}).reason??null}));
 return {scope:'RECORDED_PILOT_HISTORY' as const,accountId,initialCash,from:new Date(since).toISOString(),to:new Date(now).toISOString(),
  decisions,fills,funding,stops,equity:hourly.filter(h=>h.timestamp>=since),
  coverage:'Pontos horários de equity são registrados a partir de 05/10/2026; antes disso há só decisões e fills.'};
}
export function registerPilotTimeline(app:FastifyInstance,input:(days:number)=>TimelineInput){
 app.get('/paper/perpetual/pilot/timeline',async(req,reply)=>{
  const days=Number((req.query as {days?:string}).days??7);
  if(!Number.isInteger(days)||days<1||days>14)return reply.code(400).send({error:'days must be an integer from 1 to 14'});
  return pilotTimeline(input(days));
 });
}
