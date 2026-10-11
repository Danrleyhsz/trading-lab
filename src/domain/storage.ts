import type { AiRecord } from './ai-analysis.js';
import type { DomainEvent } from './events.js';
import type { PerpetualBookState } from '../application/perpetual-paper-book.js';
import type { PerpetualStudy } from '../application/perpetual-studies.js';
import type { ResearchRun } from './research.js';
import type { Strategy } from './strategy.js';
import type { StoredPaperAccount } from './paper-account.js';
import type { MemoryRecord } from './memory.js';
import type { AgentState } from './agents.js';
import type { AgentActivity } from './agent-career.js';
import type { AgentMessage } from './agent-messages.js';
export interface StoredState {
  aiLedger?: AiRecord[];
  domainEvents?: DomainEvent[];
  memories: MemoryRecord[];
  agents: AgentState[];
  agentActivity?: AgentActivity[];
  agentMessages?: AgentMessage[];
  paperAccounts?: StoredPaperAccount[];
  researchRuns?: ResearchRun[];
  strategies?: Strategy[];
  perpetualStudies?: PerpetualStudy[];
  perpetualBook?: PerpetualBookState;
}
export interface StateStore {
  load(): Promise<StoredState | null>;
  save(state: StoredState): Promise<void>;
}
