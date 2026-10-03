import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import type {PerpetualPaperBook,PerpetualBookState} from './perpetual-paper-book.js';
import type {AutonomousPerpetualCycle} from './autonomous-perpetual-cycle.js';
export function registerPerpetualPaperRoutes(app:FastifyInstance,book:PerpetualPaperBook,save:(state:PerpetualBookState)=>Promise<void>,enabled:boolean,cycle:AutonomousPerpetualCycle,healthy:()=>boolean){
 app.get('/paper/perpetual/accounts',async()=>book.list());app.get('/paper/perpetual/status',async()=>({...book.status(),executionEnabled:enabled,autonomous:cycle.status(),marginModel:'configured 1% maintenance and 0.5% liquidation fee; sampled quotes, not exchange parity'}));
 app.get<{Params:{id:string}}>('/paper/perpetual/accounts/:id/events',async(req,reply)=>book.ledger(req.params.id)??reply.code(404).send({error:'unknown account'}));
 const order=z.object({side:z.enum(['BUY','SELL']),quantity:z.number().finite().positive()}).strict();
 app.post<{Params:{id:string}}>('/paper/perpetual/accounts/:id/orders',async(req,reply)=>{if(!enabled)return reply.code(403).send({error:'perpetual evaluation execution disabled'});if(!healthy())return reply.code(503).send({error:'market unavailable or reconciliation pending'});const parsed=order.safeParse(req.body);if(!parsed.success)return reply.code(400).send({error:'invalid paper order'});try{return await book.propose(req.params.id,parsed.data.side,parsed.data.quantity,save);}catch(error){return reply.code(503).send({error:error instanceof Error?error.message:'paper execution unavailable'});}});
 app.post('/paper/perpetual/halt',async(req,reply)=>{const parsed=z.object({halted:z.boolean()}).strict().safeParse(req.body);if(!parsed.success)return reply.code(400).send({error:'invalid control request'});return book.halt(parsed.data.halted,save);});
}
