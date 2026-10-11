import type { AgentState } from './agents.js';
import type { DomainEvent } from './events.js';
import type { MemoryRecord } from './memory.js';
import type { AgentMessage } from './agent-messages.js';

export interface AgentActivity {
  eventId: string;
  occurredAt: string;
  state: AgentState;
}

// Only received domain events are recorded. Legacy state is never backfilled.
export class AgentActivityJournal {
  private records: AgentActivity[] = [];
  hydrate(records: AgentActivity[]) {
    this.records = structuredClone(records);
  }
  record(event: DomainEvent) {
    if (event.type !== 'AGENT_STATE_CHANGED') return;
    if (this.records.some((record) => record.eventId === event.id)) return;
    this.records.push({
      eventId: event.id,
      occurredAt: event.occurredAt,
      state: structuredClone(event.payload as AgentState),
    });
  }
  list(agentId?: string) {
    return structuredClone(this.records.filter((record) => !agentId || record.state.id === agentId));
  }
}

export function agentCareer(
  state: AgentState,
  memories: MemoryRecord[],
  messages: AgentMessage[],
  activity: AgentActivity[],
) {
  const ownMemories = memories.filter((memory) => memory.agentId === state.id);
  const ownActivity = activity.filter((record) => record.state.id === state.id);
  const ownMessages = messages.filter((message) => message.from === state.id || message.to.includes(state.id));
  const strategyIds = [
    ...new Set(
      ownMemories.flatMap((memory) => {
        const id = memory.strategyId ?? memory.metadata?.strategyId;
        return typeof id === 'string' ? [id] : [];
      }),
    ),
  ];
  return {
    agent: structuredClone(state),
    evidence: {
      observations: ownMemories.filter((memory) => memory.kind === 'OBSERVATION').length,
      decisions: ownMemories.filter((memory) => memory.kind === 'DECISION').length,
      failures: ownMemories.filter((memory) => memory.kind === 'FAILURE').length,
      lessons: ownMemories.filter((memory) => memory.kind === 'LESSON').length,
      sentMessages: ownMessages.filter((message) => message.from === state.id).length,
      recordedTransitions: ownActivity.length,
      strategyIds,
    },
    coverage: {
      activitySince: ownActivity[0]?.occurredAt ?? null,
      legacyTransitionsWithoutHistory: Math.max(0, state.experience - ownActivity.length),
      experienceBasis: 'state-transitions',
    },
    performance: {
      realizedPnl: null,
      winRate: null,
      maxDrawdown: null,
      reason: 'Individual trade attribution is not available',
    },
    memories: structuredClone(ownMemories),
    messages: structuredClone(ownMessages),
    activity: structuredClone(ownActivity),
  };
}
