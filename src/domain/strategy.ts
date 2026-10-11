export type StrategyStatus = 'DRAFT' | 'BACKTESTING' | 'VALIDATED' | 'REJECTED';
export interface Strategy {
  id: string;
  name: string;
  symbol: string;
  status: StrategyStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  trades: number;
  netPnl: number;
  maxDrawdown: number;
}
export class StrategyRegistry {
  private items = new Map<string, Strategy>();
  hydrate(items: Strategy[]) {
    this.items = new Map(items.map((item) => [item.id, structuredClone(item)]));
  }
  create(name: string, symbol: string, createdBy = 'atlas') {
    const now = new Date().toISOString(),
      s = {
        id: crypto.randomUUID(),
        name,
        symbol,
        status: 'DRAFT' as const,
        createdBy,
        createdAt: now,
        updatedAt: now,
        trades: 0,
        netPnl: 0,
        maxDrawdown: 0,
      };
    this.items.set(s.id, s);
    return { ...s };
  }
  get(id: string) {
    const item = this.items.get(id);
    return item ? structuredClone(item) : undefined;
  }
  list() {
    return [...this.items.values()].map((x) => ({ ...x }));
  }
  setStatus(id: string, status: StrategyStatus) {
    const s = this.items.get(id);
    if (!s) throw new Error('unknown strategy');
    const n = { ...s, status, updatedAt: new Date().toISOString() };
    this.items.set(id, n);
    return { ...n };
  }
  recordBacktest(id: string, result: { trades: number; netPnl: number; maxDrawdown: number }) {
    const s = this.get(id);
    if (!s) throw new Error('unknown strategy');
    const status = result.trades >= 10 && result.netPnl > 0 && result.maxDrawdown <= 0.15 ? 'VALIDATED' : 'REJECTED';
    const n = { ...s, ...result, status: status as StrategyStatus, updatedAt: new Date().toISOString() };
    this.items.set(id, n);
    return { ...n };
  }
}
