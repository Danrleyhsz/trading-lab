import type {StoredPaperAccount} from "./paper-account.js";
import type{MemoryRecord}from "./memory.js";import type{AgentState}from "./agents.js";
import type { AgentActivity } from './agent-career.js';
import type { AgentMessage } from './agent-messages.js';
export interface StoredState{memories:MemoryRecord[];agents:AgentState[];agentActivity?:AgentActivity[];agentMessages?:AgentMessage[];paperAccounts?:StoredPaperAccount[]}
export interface StateStore{load():Promise<StoredState|null>;save(state:StoredState):Promise<void>}
