import type { DomainEvent } from '../domain/events.js';
import type { Candle } from '../domain/backtest.js';
import { HistoricalBacktester } from '../domain/backtest.js';
import type { MarketSnapshot } from '../domain/market-snapshot.js';
import type { MemoryStore } from '../domain/memory.js';
import type { AgentMessageBus } from '../domain/agent-messages.js';
import type { StrategyRegistry } from '../domain/strategy.js';
import { event } from '../domain/events.js';
import { ResearchRunStore, researchDataset, specialistFindings, type ResearchRun } from '../domain/research.js';
import type { AgentCoordinator } from './agent-coordinator.js';
import type { AgentCollaboration } from './agent-collaboration.js';
import type { StrategyLab } from './strategy-lab.js';
import type { EventBus } from './event-bus.js';

export interface ResearchSources {
  snapshot(symbol: string): Promise<MarketSnapshot>;
  candles(symbol: string, interval: string, limit: number): Promise<Candle[]>;
}
export class ResearchEngine {
  private busy = false;
  private accepting = true;
  constructor(
    private source: ResearchSources,
    private coordinator: AgentCoordinator,
    private collaboration: AgentCollaboration,
    private messages: AgentMessageBus,
    private memories: MemoryStore,
    private strategies: StrategyRegistry,
    private lab: StrategyLab,
    private backtester: HistoricalBacktester,
    readonly runs: ResearchRunStore,
    private bus: EventBus,
  ) {}
  status() {
    return { busy: this.busy, accepting: this.accepting };
  }
  stopAccepting() {
    this.accepting = false;
  }
  async run(limit = 500) {
    if (!this.accepting) throw Error('research runtime draining');
    if (this.busy || this.coordinator.registry.get('euler')?.status === 'BACKTESTING')
      throw Error('research already running');
    if (!Number.isInteger(limit) || limit < 100 || limit > 1000) throw Error('invalid research limit');
    this.busy = true;
    const id = crypto.randomUUID(),
      startedAt = new Date().toISOString();
    const started = event('RESEARCH_STARTED', { runId: id, symbol: 'BTCUSDT', interval: '1h' });
    const findings: ResearchRun['findings'] = [];
    const auditEvents: DomainEvent[] = [];
    const publish = (item: DomainEvent) => {
      auditEvents.push(structuredClone(item));
      this.bus.publish(item);
    };
    let dataset: ResearchRun['dataset'], strategyId: string | undefined;
    try {
      publish(started);
      this.coordinator.research('retrieve public BTC research evidence ' + id);
      const [snapshot, candles] = await Promise.all([
        this.source.snapshot('BTCUSDT'),
        this.source.candles('BTCUSDT', '1h', limit),
      ]);
      dataset = researchDataset(snapshot, candles);
      for (const analyst of ['satoshi', 'flux', 'vega', 'oracle'] as const)
        this.coordinator.move(
          analyst,
          'RESEARCHING',
          analyst === 'vega' ? 'Quant Lab' : analyst === 'flux' ? 'Trading Floor' : 'Research Lab',
          'analyze recorded dataset ' + dataset.hash,
        );
      for (const finding of specialistFindings(dataset)) {
        const room =
          finding.agentId === 'vega' ? 'Quant Lab' : finding.agentId === 'flux' ? 'Trading Floor' : 'Research Lab';

        findings.push(finding);
        const memory = this.memories.add({
          agentId: finding.agentId,
          kind: 'OBSERVATION',
          summary: finding.summary,
          sourceEventId: started.id,
          tags: ['research', finding.metric],
          metadata: { researchRunId: id, datasetHash: dataset.hash, symbol: 'BTCUSDT', values: finding.values },
        });
        publish(event('MEMORY_CREATED', memory));
        this.messages.send({
          from: finding.agentId,
          to: ['atlas', 'euler'],
          kind: 'RESEARCH_FINDING',
          summary: finding.summary,
          context: { researchRunId: id, datasetHash: dataset.hash, values: finding.values },
        });
        this.coordinator.move(finding.agentId, 'IDLE', room, 'measurement complete for ' + id);
      }
      this.collaboration.hypothesis('evaluate SMA crossover on recorded BTC spot history', {
        researchRunId: id,
        datasetHash: dataset.hash,
        findings: findings.map((finding) => finding.agentId),
      });
      const strategy = this.lab.propose('SMA crossover research ' + id, 'BTCUSDT');
      strategyId = strategy.id;
      this.lab.startBacktest(strategyId);
      publish(
        event('BACKTEST_STARTED', { runId: id, strategyId, datasetHash: dataset.hash, mode: 'HISTORICAL_SIMULATION' }),
      );
      const backtest = this.backtester.run(dataset.candles, {
        initialCapital: 10000,
        feeRate: 0.00055,
        slippageBps: 1,
        fastPeriod: 10,
        slowPeriod: 30,
      });
      if (Object.values(backtest).some((value) => typeof value === 'number' && !Number.isFinite(value)))
        throw Error('non-finite historical result');
      const tested = this.lab.completeBacktest(strategyId, backtest);
      const completed = event('BACKTEST_COMPLETED', {
        runId: id,
        strategyId,
        datasetHash: dataset.hash,
        mode: 'HISTORICAL_SIMULATION',
        result: backtest,
      });
      publish(completed);
      this.collaboration.backtestResult('recorded historical screen: ' + tested.status.toLowerCase(), {
        researchRunId: id,
        strategyId,
        datasetHash: dataset.hash,
        result: backtest,
      });
      this.coordinator.move('euler', 'IDLE', 'Quant Lab', 'historical screen complete for ' + id);
      const memory = this.memories.add({
        agentId: 'atlas',
        kind: tested.status === 'VALIDATED' ? 'LESSON' : 'FAILURE',
        summary: 'SMA historical screen ' + tested.status.toLowerCase() + '; no paper order submitted',
        strategyId,
        sourceEventId: completed.id,
        tags: ['research', 'historical-screen'],
        metadata: { researchRunId: id, datasetHash: dataset.hash, result: backtest },
      });
      publish(event('MEMORY_CREATED', memory));
      const finished = event('RESEARCH_COMPLETED', {
        runId: id,
        status: tested.status === 'VALIDATED' ? 'SCREEN_PASSED' : 'REJECTED',
        strategyId,
        datasetHash: dataset.hash,
      });
      const run: ResearchRun = {
        id,
        startedAt,
        completedAt: new Date().toISOString(),
        startedEventId: started.id,
        events: [...auditEvents, finished],
        status: tested.status === 'VALIDATED' ? 'SCREEN_PASSED' : 'REJECTED',
        dataset,
        findings,
        strategyId,
        backtest,
      };
      this.runs.append(run);
      this.coordinator.move('atlas', 'IDLE', 'Research Lab', 'research complete for ' + id);
      this.bus.publish(finished);
      return structuredClone(run);
    } catch (error) {
      for (const analyst of ['satoshi', 'flux', 'vega', 'oracle'] as const) {
        const state = this.coordinator.registry.get(analyst);
        if (state?.status === 'RESEARCHING')
          this.coordinator.move(analyst, 'IDLE', state.room, 'measurement failed for ' + id);
      }
      const reason = error instanceof Error ? error.message.slice(0, 1000) : 'Research failed';
      const failed = event('RESEARCH_FAILED', { runId: id, error: reason });
      publish(failed);
      if (strategyId) {
        this.strategies.setStatus(strategyId, 'REJECTED');
        this.coordinator.move('euler', 'IDLE', 'Quant Lab', 'historical task failed for ' + id);
      }
      const run: ResearchRun = {
        id,
        startedAt,
        completedAt: new Date().toISOString(),
        startedEventId: started.id,
        events: auditEvents,
        status: 'FAILED',
        dataset,
        findings,
        strategyId,
        error: reason,
      };
      const memory = this.memories.add({
        agentId: 'atlas',
        kind: 'FAILURE',
        summary: 'Research task failed: ' + reason,
        sourceEventId: failed.id,
        tags: ['research', 'data-failure'],
        metadata: { researchRunId: id },
      });
      publish(event('MEMORY_CREATED', memory));
      this.coordinator.move('atlas', 'IDLE', 'Research Lab', 'research failed for ' + id);
      this.runs.append({ ...run, events: auditEvents });
      return structuredClone(run);
    } finally {
      this.busy = false;
    }
  }
}
