import type { EventBus } from './event-bus.js';
import { event } from '../domain/events.js';
import { AgentRegistry, type AgentId, type AgentStatus } from '../domain/agents.js';
export class AgentCoordinator {
  constructor(
    readonly registry: AgentRegistry,
    private bus: EventBus,
  ) {}
  move(id: AgentId, status: AgentStatus, room: string, reason: string) {
    const state = this.registry.transition(id, status, room, reason);
    this.bus.publish(event('AGENT_STATE_CHANGED', state));
    return state;
  }
  research(reason = 'market review') {
    return this.move('atlas', 'RESEARCHING', 'Research Lab', reason);
  }
  backtest(reason = 'strategy validation') {
    return this.move('euler', 'BACKTESTING', 'Quant Lab', reason);
  }
  trade(reason = 'paper execution') {
    return this.move('nova', 'TRADING', 'Trading Floor', reason);
  }
  risk(reason = 'trade review') {
    return this.move('sentinel', 'REVIEWING_RISK', 'Risk Desk', reason);
  }
}
