import type{MemoryRecord}from "./memory.js";import type{AgentState}from "./agents.js";
export interface StoredState{memories:MemoryRecord[];agents:AgentState[]}
export interface StateStore{load():Promise<StoredState|null>;save(state:StoredState):Promise<void>}
