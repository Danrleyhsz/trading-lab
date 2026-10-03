export type AgentId='atlas'|'euler'|'nova'|'sentinel'|'satoshi'|'flux'|'vega'|'oracle';
export type AgentStatus='IDLE'|'RESEARCHING'|'BACKTESTING'|'TRADING'|'REVIEWING_RISK'|'MEETING';
export interface AgentState {id:AgentId;name:string;role:string;room:string;status:AgentStatus;experience:number;lastReason?:string;updatedAt:string;specialization?:string}
const seed:Record<AgentId,Omit<AgentState,'updatedAt'>>={
 atlas:{id:'atlas',name:'Atlas',role:'Head of Research',room:'Research Lab',status:'IDLE',experience:0,specialization:'Research coordination and hypothesis provenance'},
 euler:{id:'euler',name:'Euler',role:'Quant',room:'Quant Lab',status:'IDLE',experience:0,specialization:'Historical strategy testing and validation'},
 nova:{id:'nova',name:'Nova',role:'Trader',room:'Trading Floor',status:'IDLE',experience:0,specialization:'Attributed paper execution under deterministic risk'},
 sentinel:{id:'sentinel',name:'Sentinel',role:'Risk Manager',room:'Risk Desk',status:'IDLE',experience:0,specialization:'Deterministic proposal risk review'},
 satoshi:{id:'satoshi',name:'Satoshi',role:'Bitcoin Researcher',room:'Research Lab',status:'IDLE',experience:0,specialization:'Bitcoin price momentum from observed market history'},
 flux:{id:'flux',name:'Flux',role:'Market Microstructure Researcher',room:'Trading Floor',status:'IDLE',experience:0,specialization:'Observed spread, funding and open interest'},
 vega:{id:'vega',name:'Vega',role:'Volatility Researcher',room:'Quant Lab',status:'IDLE',experience:0,specialization:'Realized volatility from historical price returns'},
 oracle:{id:'oracle',name:'Oracle',role:'Market Regime Researcher',room:'Research Lab',status:'IDLE',experience:0,specialization:'Evidence-based market-regime classification'},
};
export const AGENT_IDS=Object.freeze(Object.keys(seed) as AgentId[]);
export class AgentRegistry {
 private states=new Map<AgentId,AgentState>(Object.entries(seed).map(([id,state])=>[id as AgentId,{...state,updatedAt:new Date().toISOString()}]));
 hydrate(states:AgentState[]){for(const state of states)this.states.set(state.id,{...state,specialization:state.specialization??seed[state.id]?.specialization})}
 list(){return [...this.states.values()].map(state=>({...state}))}
 get(id:AgentId){const state=this.states.get(id);return state?{...state}:undefined}
 transition(id:AgentId,status:AgentStatus,room:string,reason:string){
  const state=this.states.get(id);if(!state)throw Error('unknown agent');
  const next={...state,status,room,lastReason:reason,experience:state.experience+1,updatedAt:new Date().toISOString()};
  this.states.set(id,next);return {...next};
 }
}
