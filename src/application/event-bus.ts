import type { DomainEvent } from '../domain/events.js';
export class EventBus {
  private listeners = new Set<(e: DomainEvent) => void>();
  publish(e: DomainEvent) {
    for (const l of this.listeners) l(e);
  }
  subscribe(l: (e: DomainEvent) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}
