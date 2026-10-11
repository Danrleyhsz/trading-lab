import { bootstrapEvaluationWallets } from './application/evaluation-wallet-bootstrap.js';
import { registerContinuousPaperPreflight } from './application/continuous-paper-preflight.js';
import { EventAudit, registerEventAudit } from './application/event-audit.js';
import { registerPilotTimeline } from './application/pilot-timeline.js';
import { registerDecisionReceipts } from './application/decision-receipt.js';
import { registerPilotParity } from './application/pilot-parity.js';
import { registerPilotReport } from './application/pilot-report.js';
import { StudyRobustnessRunner, registerStudyRobustness } from './application/study-robustness-runner.js';
import { backendFingerprint, releaseApproval } from './application/release-fingerprint.js';
import { BinanceMarketPanorama } from './infrastructure/binance-market-panorama.js';
import { ResearchJobs, registerResearchJobs } from './application/research-jobs.js';
import type { StoredState } from './domain/storage.js';
import { RuntimeReadiness, registerRuntimeReadiness } from './application/runtime-readiness.js';
import { AiAnalysis, registerAiStatus } from './application/ai-analysis.js';
import type { AiRecord } from './domain/ai-analysis.js';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { registerOfficeAssets } from './application/office-assets.js';
import { extname, join } from 'node:path';
import { EventBus } from './application/event-bus.js';
import { event } from './domain/events.js';
import { AgentRegistry } from './domain/agents.js';
import { AgentCoordinator } from './application/agent-coordinator.js';
import { AgentActivityJournal } from './domain/agent-career.js';
import { registerAgentProfiles } from './application/agent-profiles.js';
import { MemoryStore } from './domain/memory.js';
import { AgentMessageBus } from './domain/agent-messages.js';
import { AgentCollaboration } from './application/agent-collaboration.js';
import { StrategyRegistry } from './domain/strategy.js';
import { StrategyLab } from './application/strategy-lab.js';
import { HistoricalBacktester } from './domain/backtest.js';
import { ResearchRunStore } from './domain/research.js';
import { ResearchEngine } from './application/research-engine.js';
import { registerResearchRoutes } from './application/research-routes.js';
import { PerpetualStudies, registerPerpetualStudies } from './application/perpetual-studies.js';
import { PaperAccounts } from './application/paper-accounts.js';
import { registerPaperAccountRoutes } from './application/paper-account-routes.js';
import { PerpetualPaperBook, type PerpetualBookState } from './application/perpetual-paper-book.js';
import { AutonomousPerpetualCycle } from './application/autonomous-perpetual-cycle.js';
import { PilotTeamBriefing } from './application/pilot-team-briefing.js';
import { TeamPredictions, scorecard, rankMemories, PREDICTION_POLICY } from './application/team-predictions.js';
import { MarketTriggers, readingFrom, TRIGGER_POLICY } from './application/market-triggers.js';
import { CrossVenueMarket } from './infrastructure/cross-venue-market.js';
import { registerPerpetualPaperRoutes } from './application/perpetual-paper-routes.js';
import { registerAccessControl } from './application/access-control.js';
import { registerEncryptedBackup } from './application/encrypted-backup.js';
import { BACKUP_PUBLIC_KEY_PEM } from './config/backup-public-key.js';
import { BinancePublicMarketData } from './infrastructure/binance-market-data.js';
import { BinanceHistoricalData } from './infrastructure/binance-history.js';
import { BinanceDerivativesData } from './infrastructure/binance-derivatives.js';
import { BinancePerpetualHistory } from './infrastructure/binance-perpetual-history.js';
import { ForwardMomentumTracker } from './application/forward-momentum.js';
import { BybitPerpetualHistory, ResilientPerpetualHistory } from './infrastructure/bybit-perpetual-history.js';
import { BinancePerpetualMarket } from './infrastructure/binance-perpetual-market.js';
import { JsonStateStore } from './infrastructure/json-state-store.js';
import { PostgresStateStore } from './infrastructure/postgres-state-store.js';
import { z } from 'zod';
import type { MarketTick } from './domain/market.js';
const production = process.env.NODE_ENV === 'production';
if (process.env.PAPER_TRADING_ONLY === 'false') throw Error('only paper trading is supported');
if (production && !process.env.DATABASE_URL) throw Error('PostgreSQL is required in production');
const app = Fastify({
  logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'] },
});
registerAccessControl(
  app,
  process.env.APP_ACCESS_TOKEN ?? '',
  production,
  process.env.PUBLIC_ORIGIN ?? '',
  process.env.READ_ONLY_ACCESS_TOKEN ?? '',
);
app.get('/', async (_req, reply) => reply.redirect('/office2/'));
await app.register(websocket);
const store = process.env.DATABASE_URL
  ? new PostgresStateStore(process.env.DATABASE_URL, production)
  : new JsonStateStore();
if (store instanceof PostgresStateStore) await store.open();
const restored = await store.load();
const runtime = new RuntimeReadiness({
  production,
  storage: store instanceof PostgresStateStore ? 'POSTGRESQL' : 'JSON_DEVELOPMENT',
  protectedAccess: !!process.env.APP_ACCESS_TOKEN,
  httpsOrigin: (process.env.PUBLIC_ORIGIN ?? '').startsWith('https://'),
  storageAvailable: () => !(store instanceof PostgresStateStore) || store.available(),
});
let durableSnapshot: StoredState | null = restored ? structuredClone(restored) : null;
let durablePersistedAt: string | null = null;
const domainEvents = structuredClone(restored?.domainEvents ?? []);
const bus = new EventBus(),
  agents = new AgentRegistry(),
  coordinator = new AgentCoordinator(agents, bus),
  memories = new MemoryStore(),
  messages = new AgentMessageBus(),
  activity = new AgentActivityJournal(),
  researchRuns = new ResearchRunStore(),
  strategies = new StrategyRegistry();
if (restored) {
  agents.hydrate(restored.agents);
  memories.hydrate(restored.memories);
  messages.hydrate(restored.agentMessages ?? []);
  activity.hydrate(restored.agentActivity ?? []);
  researchRuns.hydrate(restored.researchRuns ?? []);
  strategies.hydrate(restored.strategies ?? []);
}
const collaboration = new AgentCollaboration(messages, coordinator, memories),
  strategyLab = new StrategyLab(strategies, coordinator, memories),
  backtester = new HistoricalBacktester(),
  history = new BinanceHistoricalData(),
  derivatives = new BinanceDerivativesData();
const accounts = new PaperAccounts(
  bus,
  Number(process.env.INITIAL_PAPER_CAPITAL || 10000),
  restored?.paperAccounts ?? [],
);
const book = new PerpetualPaperBook(bus, restored?.perpetualBook),
  perpetualHistory = new BinancePerpetualHistory(),
  perpetualMarket = new BinancePerpetualMarket(),
  backend = backendFingerprint(),
  renderCommit = process.env.RENDER_GIT_COMMIT ?? '';
// Cada estudo novo grava o commit e a impressão digital do backend que o rodou (proveniência, item 3 da auditoria).
const studies = new PerpetualStudies(perpetualHistory, restored?.perpetualStudies ?? [], undefined, {
  codeCommit: /^[0-9a-f]{40}$/.test(renderCommit) ? renderCommit : null,
  backendFingerprint: backend.fingerprint,
});
const evaluationEnabled = process.env.PAPER_EVALUATION_ENABLED === 'true',
  perpetualEnabled = process.env.PERPETUAL_PAPER_ENABLED === 'true';
bootstrapEvaluationWallets(process.env, book);
if (evaluationEnabled || perpetualEnabled) {
  const capital = Number(process.env.EVALUATION_PAPER_CAPITAL);
  if (!Number.isFinite(capital) || capital <= 0) throw Error('positive EVALUATION_PAPER_CAPITAL required');
  for (const agent of agents.list()) {
    if (evaluationEnabled) accounts.ensureEvaluation(agent.id, capital);
    if (perpetualEnabled) book.ensureEvaluation(agent.id, capital);
  }
}
let durableAi: AiRecord[] = structuredClone(restored?.aiLedger ?? []);
let durableBook = book.exportState(),
  writes: Promise<unknown> = Promise.resolve(),
  persistenceError: string | null = null;
const persist = (override?: PerpetualBookState, aiOverride?: AiRecord[]) => {
  runtime.writeQueued();
  const run = async () => {
    try {
      const snapshot: StoredState = {
        aiLedger: aiOverride ?? durableAi,
        domainEvents: structuredClone(domainEvents),
        agents: agents.list(),
        memories: memories.list(),
        agentMessages: messages.list(),
        agentActivity: activity.list(),
        paperAccounts: accounts.exportState(),
        researchRuns: researchRuns.list(),
        strategies: strategies.list(),
        perpetualStudies: studies.list(),
        perpetualBook: override ?? durableBook,
      };
      await store.save(snapshot);
      durableSnapshot = snapshot;
      durablePersistedAt = new Date().toISOString();
      if (override) durableBook = structuredClone(override);
      if (aiOverride) durableAi = structuredClone(aiOverride);
      persistenceError = null;
      runtime.writeSucceeded();
    } catch (error) {
      runtime.writeFailed();
      persistenceError = 'state persistence unavailable';
      throw error;
    }
  };
  const result = writes.then(run);
  writes = result.catch(() => {});
  return result;
};
bus.subscribe((e) => {
  if (['MARKET_TICK', 'PERPETUAL_MARKET_UPDATED', 'MARKET_DATA_FAILED'].includes(e.type)) return;
  domainEvents.push(structuredClone(e));
  activity.record(e);
  queueMicrotask(() => void persist().catch((error) => app.log.error({ error }, 'state persistence failed')));
});
// Actual committed outcomes create agent memories; historical simulations never enter this path.
bus.subscribe((e) => {
  const payload = e.payload as any;
  if (!payload?.accountId?.endsWith(':usdm') && !payload?.fill?.accountId?.endsWith(':usdm')) return;
  if (e.type === 'RISK_APPROVED' || e.type === 'RISK_REJECTED') {
    coordinator.risk('deterministic USD-M risk decision ' + e.id);
    memories.add({
      agentId: 'sentinel',
      kind: e.type === 'RISK_REJECTED' ? 'FAILURE' : 'DECISION',
      summary: e.type === 'RISK_REJECTED' ? 'perpetual paper risk rejected' : 'perpetual paper risk approved',
      sourceEventId: e.id,
      metadata: { accountId: payload.accountId, reasons: payload.decision?.reasons },
    });
    coordinator.move('sentinel', 'IDLE', 'Risk Desk', 'risk decision recorded ' + e.id);
  }
  if (e.type === 'PAPER_ORDER_SUBMITTED')
    coordinator.move(payload.agentId, 'TRADING', 'Trading Floor', 'approved perpetual paper submission ' + e.id);
  if (e.type === 'PAPER_FILL') {
    memories.add({
      agentId: payload.fill.agentId,
      kind: 'DECISION',
      summary: 'perpetual paper fill recorded',
      sourceEventId: e.id,
      strategyId: payload.fill.strategyId,
      metadata: { accountId: payload.fill.accountId, fillId: payload.fill.id },
    });
    coordinator.move(payload.fill.agentId, 'IDLE', 'Trading Floor', 'perpetual paper fill recorded ' + e.id);
  }
});
const autonomousEnabled = process.env.AUTONOMOUS_PERPETUAL_ENABLED === 'true';
if (autonomousEnabled && (!perpetualEnabled || !process.env.AUTONOMOUS_STUDY_ID))
  throw Error('autonomous perpetual evaluation requires enabled accounts and explicit study ID');
// The pilot runs only on the exact release the owner approved (Render exposes the deployed commit as RENDER_GIT_COMMIT).
const pilotTeam = new PilotTeamBriefing(messages, new TeamPredictions(memories));
// A pinned backend fingerprint also approves releases that change only the office (public/) files.
const pilotPhase = process.env.CLOUD_LAUNCH_PHASE === 'CONTINUOUS_PAPER_PILOT',
  deployedCommit = process.env.RENDER_GIT_COMMIT ?? '';
const release = releaseApproval(process.env, backend.fingerprint);
const releasePinned = pilotPhase && release.approved;
// Plano B do piloto (desligado por padrão): Bybit quando a Binance falhar; os estudos continuam só com a Binance.
const pilotHistory = new ResilientPerpetualHistory(
  perpetualHistory,
  new BybitPerpetualHistory(),
  process.env.PERPETUAL_HISTORY_FALLBACK === 'bybit',
);
app.get('/paper/perpetual/history-source', async () => pilotHistory.status());
const cycle = new AutonomousPerpetualCycle(
  autonomousEnabled,
  process.env.AUTONOMOUS_STUDY_ID ?? '',
  studies,
  book,
  pilotHistory,
  persist,
  memories,
  bus,
  () => persist(),
  Date.now,
  () => runtime.control().ready,
  {
    blockedReason: autonomousEnabled && production && !releasePinned ? 'RELEASE_NOT_APPROVED' : null,
    maxLossFraction: process.env.PILOT_MAX_LOSS === undefined ? 0.03 : Number(process.env.PILOT_MAX_LOSS),
    settleMs: Number(process.env.CONTINUOUS_SIGNAL_SETTLE_SECONDS ?? 0) * 1000,
    onDecision: (context) => pilotTeam.brief(context),
  },
);
// Sentinel records every risk decision on the pilot account as a team message.
bus.subscribe((e) => {
  if (
    (e.type === 'RISK_APPROVED' || e.type === 'RISK_REJECTED') &&
    (e.payload as { accountId?: string })?.accountId === 'evaluation:nova:usdm' &&
    autonomousEnabled
  )
    pilotTeam.riskReview(e.type === 'RISK_APPROVED', e.payload as never);
});
registerAgentProfiles(app, agents, memories, messages, activity, accounts, book);
const eventAudit = new EventAudit(() => durableSnapshot);
registerEventAudit(app, eventAudit);
registerPilotReport(app, () => {
  const status = cycle.status(),
    id = status.accountId ?? null,
    account = book.list().find((a) => a.id === id);
  let events: ReturnType<typeof eventAudit.list> = [];
  try {
    events = eventAudit.list();
  } catch {}
  const quote = perpetualMarket.snapshot().quote;
  return {
    accountId: id,
    events,
    ledger: id ? (book.ledger(id) ?? []) : [],
    equity: account?.portfolio.equity ?? null,
    initialCash: account?.initialCash ?? null,
    maxDrawdown: account?.maxDrawdown ?? null,
    equityPoints: [...(account?.hourly ?? []), ...(account?.samples ?? [])].sort((a, b) => a.timestamp - b.timestamp),
    closedTrades: id ? (book.performance(id)?.closedTrades ?? []) : [],
    autonomous: {
      enabled: status.enabled,
      eligible: status.eligible,
      stopReason: status.stopReason,
      studyId: status.studyId,
    },
    mark: quote && Date.now() - quote.markTime <= 15000 ? quote.markPrice : null,
    now: Date.now(),
  };
});
registerPilotParity(
  app,
  () => {
    const id = cycle.status().accountId ?? null;
    let events: ReturnType<typeof eventAudit.list> = [];
    try {
      events = eventAudit.list();
    } catch {}
    return { accountId: id, events, ledger: id ? (book.ledger(id) ?? []) : [], now: Date.now() };
  },
  perpetualHistory,
);
registerDecisionReceipts(app, () => {
  const id = cycle.status().accountId ?? null;
  let events: ReturnType<typeof eventAudit.list> = [];
  try {
    events = eventAudit.list();
  } catch {}
  return {
    accountId: id,
    events,
    ledger: id ? (book.ledger(id) ?? []) : [],
    memories: memories.query(),
    messages: messages.list(),
    now: Date.now(),
  };
});
registerPilotTimeline(app, (days) => {
  const id = cycle.status().accountId ?? null,
    account = book.list().find((a) => a.id === id);
  let events: ReturnType<typeof eventAudit.list> = [];
  try {
    events = eventAudit.list();
  } catch {}
  return {
    accountId: id,
    events,
    ledger: id ? (book.ledger(id) ?? []) : [],
    hourly: account?.hourly ?? [],
    initialCash: account?.initialCash ?? null,
    now: Date.now(),
    days,
  };
});
registerEncryptedBackup(
  app,
  () => (durableSnapshot ? { state: durableSnapshot, persistedAt: durablePersistedAt } : null),
  BACKUP_PUBLIC_KEY_PEM,
);
const research = new ResearchEngine(
  {
    snapshot: (symbol) => derivatives.snapshot(symbol),
    candles: (symbol, interval, limit) => history.candles(symbol, interval, limit),
  },
  coordinator,
  collaboration,
  messages,
  memories,
  strategies,
  strategyLab,
  backtester,
  researchRuns,
  bus,
);
const researchJobs = new ResearchJobs(
  research,
  bus,
  () => persist(),
  domainEvents,
  () => studies.status().busy || agents.get('euler')?.status === 'BACKTESTING',
);
researchJobs.recover();
registerResearchJobs(app, researchJobs);
registerResearchRoutes(
  app,
  research,
  () => persist(),
  () => researchJobs.status().busy || !researchJobs.status().accepting,
);
registerPerpetualStudies(
  app,
  studies,
  () => persist(),
  coordinator,
  bus,
  () => researchJobs.status().busy,
);
// Robustez (Deflated Sharpe, PBO): só leitura, calculada sob demanda numa thread separada.
registerStudyRobustness(app, new StudyRobustnessRunner(studies));
let latest: MarketTick | null = null;
registerPaperAccountRoutes(app, accounts, {
  market: () => latest,
  memories,
  strategies,
  coordinator,
  persist: () => persist(),
  evaluationEnabled,
  bus,
  executionEnabled: process.env.LEGACY_PAPER_EXECUTION_ENABLED === 'true',
});
registerPerpetualPaperRoutes(app, book, persist, perpetualEnabled, cycle, () => readiness().paper.submission.ready);
const aiAnalysis = new AiAnalysis((ledger) => persist(undefined, ledger), durableAi);
registerAiStatus(app, aiAnalysis);
const runtimeInputs = () => ({
  spot: latest,
  perpetual: perpetualMarket.snapshot(),
  book: book.status(),
  autonomous: cycle.status(),
  research: researchJobs.status(),
  historical: studies.status(),
  ai: aiAnalysis.status(),
  legacyExecutionEnabled: process.env.LEGACY_PAPER_EXECUTION_ENABLED === 'true',
  evaluationEnabled,
  perpetualEnabled,
});
const readiness = () => runtime.snapshot(runtimeInputs());
registerRuntimeReadiness(app, runtime, runtimeInputs);
registerContinuousPaperPreflight(app, studies, readiness, Date.now, () => ({
  phase: process.env.CLOUD_LAUNCH_PHASE ?? 'FIRST_PUBLICATION',
  releasePinned,
  deployedCommit: deployedCommit || null,
  approvedBy: release.by,
  backendFingerprint: release.backendFingerprint,
}));
registerOfficeAssets(app);
app.get('/health', async (_req, reply) =>
  reply
    .code(persistenceError || (store instanceof PostgresStateStore && !store.available()) ? 503 : 200)
    .send({
      ok: !persistenceError && (!(store instanceof PostgresStateStore) || store.available()),
      mode: 'PAPER_TRADING',
      storage: store instanceof PostgresStateStore ? 'POSTGRESQL' : 'JSON_DEVELOPMENT',
      marketStatus: perpetualMarket.snapshot().status,
    }),
);
app.get('/agents', async () => agents.list());
app.get('/agent-messages', async (req) => messages.list((req.query as any).agentId));
app.get('/strategies', async () => strategies.list());
// Client-supplied alleged work/results cannot change agent history or validate a strategy.
for (const path of [
  '/agent-messages/hypothesis',
  '/agent-messages/backtest',
  '/agent-messages/risk',
  '/agent-messages/execution',
  '/strategies/:id/backtest/start',
  '/strategies/:id/backtest/complete',
])
  app.post(path, async (_req, reply) =>
    reply.code(410).send({ error: 'use server-owned research and historical studies' }),
  );
// Placar da equipe: taxa de acerto das previsões conferidas e memórias em destaque de cada agente.
app.get('/agents/scorecard', async () => {
  const all = memories.query();
  return {
    policy: PREDICTION_POLICY,
    scorecard: scorecard(all),
    highlights: Object.fromEntries(
      ['atlas', 'satoshi', 'oracle', 'nova', 'flux', 'sentinel', 'euler', 'vega'].map((id) => [
        id,
        rankMemories(
          all.filter((m) => m.agentId === id),
          Date.now(),
        ).map((r) => ({ ...r.memory, score: Number(r.score.toFixed(3)) })),
      ]),
    ),
  };
});
app.get('/memories', async (req) => memories.query(req.query as any));
app.get('/market/latest', async () => latest ?? { status: 'waiting' });
app.get('/market/:symbol/snapshot', async (req) => derivatives.snapshot((req.params as { symbol: string }).symbol));
app.get('/market/v3', async () => perpetualMarket.snapshot());
const panorama = new BinanceMarketPanorama();
app.get('/market/panorama', async () => panorama.snapshot());
// Gráfico ao vivo das telas das moedas (BTCUSDT, ETHUSDT, BTCPERP; 1m ou 1h): só leitura do que o panorama já recebe.
app.get('/market/chart', async (req, reply) => {
  const { symbol, interval } = req.query as { symbol?: string; interval?: string };
  return panorama.chart(String(symbol), String(interval)) ?? reply.code(400).send({ error: 'unsupported chart' });
});
// Gatilhos fora do normal (P5/P95): só mensagens e memórias para a equipe; nunca sinal, risco ou execução.
// Outras corretoras (Bybit, OKX, Hyperliquid): só leitura, para comparar funding e conferir o preço da Binance.
const venues = new CrossVenueMarket(() => {
  const q = perpetualMarket.snapshot().quote;
  return q ? { markPrice: q.markPrice, fundingRate: q.fundingRate, markTime: q.markTime } : null;
});
venues.start();
app.get('/market/venues', async () => venues.snapshot());
const triggers = new MarketTriggers(
  () => readingFrom(panorama.snapshot(), perpetualMarket.snapshot().quote?.fundingRate ?? null, venues.snapshot()),
  messages,
  memories,
);
const triggerTimer = setInterval(() => {
  try {
    triggers.sample();
  } catch {
    /* amostra perdida não afeta nada */
  }
}, TRIGGER_POLICY.sampleMinutes * 60000);
app.get('/market/triggers', async () => triggers.status());
const legacyBacktestRequest = z
  .object({
    symbol: z.literal('BTCUSDT').default('BTCUSDT'),
    interval: z.literal('1h').default('1h'),
    limit: z.number().int().min(100).max(1000).default(500),
    initialCapital: z.number().finite().positive().default(10000),
    feeRate: z.number().finite().min(0).max(0.1).default(0.00055),
    slippageBps: z.number().finite().min(0).max(100).default(1),
    fastPeriod: z.number().int().min(1).max(100).default(10),
    slowPeriod: z.number().int().min(2).max(200).default(30),
  })
  .strict()
  .refine((v) => v.slowPeriod > v.fastPeriod && v.limit > v.slowPeriod);
app.post('/backtests/sma', async (req, reply) => {
  const parsed = legacyBacktestRequest.safeParse(req.body ?? {});
  if (!parsed.success) return reply.code(400).send({ error: 'invalid legacy backtest request' });
  const cfg = parsed.data;
  return backtester.run(await history.candles(cfg.symbol, cfg.interval, cfg.limit), cfg);
});
app.post('/strategies', async (_req, reply) => reply.code(410).send({ error: 'use server-owned research hypotheses' }));
app.get('/portfolio', async () => accounts.snapshot('fund')!.portfolio);
// ?series=none omits the minute/hourly equity series (about 0.6 MB) for frequent polling.
app.get('/finance', async (req) => ({
  legacyAccounts: accounts
    .list()
    .map((a) => ({
      ...a,
      instrument: 'LEGACY_PAPER_V1',
      netPnl: a.portfolio.equity - a.initialCash,
      winRate: null,
      maxDrawdown: null,
    })),
  perpetualAccounts:
    (req.query as { series?: string }).series === 'none'
      ? book.list().map(({ samples: _samples, hourly: _hourly, ...account }) => ({ ...account, seriesOmitted: true }))
      : book.list(),
  fundAccountId: 'fund',
  evaluationCapitalIncludedInFund: false,
  risk: book.status(),
  autonomous: cycle.status(),
}));
app.get('/events', { websocket: true }, (socket) => {
  const unsubscribe = bus.subscribe((e) => {
    if (socket.readyState === 1)
      try {
        socket.send(JSON.stringify(e));
      } catch (error) {
        app.log.warn({ error }, 'office delivery failed');
      }
  });
  socket.on('close', unsubscribe);
});
// No restored visual task is treated as still running in the new process.
for (const agent of agents.list())
  if (agent.status !== 'IDLE')
    coordinator.move(agent.id, 'IDLE', agent.room, 'runtime restarted; unfinished task outcome was not inferred');
await persist();
const legacyMarket = new BinancePublicMarketData(process.env.MARKET_SYMBOL?.toLowerCase() || 'btcusdt');
await legacyMarket.connect((t) => {
  latest = t;
  accounts.mark(t.symbol, t.price);
  bus.publish(event('MARKET_TICK', t));
});
// Read-only wall-screen context; never feeds signals, risk or execution.
void panorama.start().catch(() => {});
// Acompanhamento ao vivo do momentum entre moedas (XSMOM_FORWARD_V1): só simulação com dados públicos; nunca envia ordens.
const forwardMomentum = new ForwardMomentumTracker(
  new BinancePerpetualHistory(),
  Date.now,
  process.env.FORWARD_MOMENTUM_ENABLED === 'true',
);
forwardMomentum.start(); // encerrado pelo dono em 10/10/2026: só liga com FORWARD_MOMENTUM_ENABLED=true
app.get('/paper/momentum/forward', async () => forwardMomentum.snapshot());
await perpetualMarket.start(
  async (quote) => {
    if (runtime.isDraining()) return;
    const settlements =
      quote.markTime > book.cursor() && book.fundingDue(quote.markTime)
        ? await perpetualMarket.funding(book.cursor() + 1, quote.markTime)
        : [];
    await book.synchronize(quote, settlements, persist);
    bus.publish(event('PERPETUAL_MARKET_UPDATED', quote));
    if (!runtime.isDraining())
      await cycle
        .onMarket()
        .catch((error) => app.log.warn({ error }, 'autonomous pilot attempt failed; retry deferred'));
  },
  (error) => {
    app.log.warn({ error }, 'USD-M reconciliation unavailable');
    bus.publish(event('MARKET_DATA_FAILED', { instrument: 'BINANCE_USDM:BTCUSDT', error: error.message }));
  },
);
app.addHook('preClose', async () => {
  runtime.draining();
  researchJobs.stopAccepting();
  research.stopAccepting();
  studies.stopAccepting();
});
app.addHook('onClose', async () => {
  forwardMomentum.stop();
  await researchJobs.drain();
  await perpetualMarket.stop();
  await panorama.stop();
  clearInterval(triggerTimer);
  venues.stop();
  await legacyMarket.disconnect();
  await studies.drain();
  await writes;
  if (store instanceof PostgresStateStore) await store.close();
  runtime.stopped();
});
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => {
    if (closing) return;
    closing = true;
    runtime.draining();
    const deadline = setTimeout(() => {
      app.log.error('shutdown grace expired; incomplete durable studies restore as interrupted');
      process.exit(1);
    }, 30000);
    void app
      .close()
      .then(() => {
        clearTimeout(deadline);
        process.exit(0);
      })
      .catch((error) => {
        clearTimeout(deadline);
        app.log.error({ error }, 'shutdown failed');
        process.exit(1);
      });
  });
await app.listen({ port: Number(process.env.PORT || 3000), host: '0.0.0.0' });
runtime.serving();
