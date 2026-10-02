import type{MemoryRecord}from "./memory.js";import type{AgentState}from "./agents.js";
import type { AgentActivity } from './agent-career.js';
import type { AgentMessage } from './agent-messages.js';
export interface StoredState{memories:MemoryRecord[];agents:AgentState[];agentActivity?:AgentActivity[];agentMessages?:AgentMessage[]}
export interface StateStore{load():Promise<StoredState|null>;save(state:StoredState):Promise<void>}
