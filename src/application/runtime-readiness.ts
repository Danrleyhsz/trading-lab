import type { FastifyInstance } from 'fastify';
import type { MarketTick } from '../domain/market.js';
import { freshPerpetualQuote, type PerpetualQuote } from '../domain/perpetual-market.js';
import type { PerpetualPaperBook } from './perpetual-paper-book.js';
import type { AutonomousPerpetualCycle } from './autonomous-perpetual-cycle.js';
import type { PerpetualStudies } from './perpetual-studies.js';
import type { ResearchEngine } from './research-engine.js';
import type { AiAnalysis } from './ai-analysis.js';
export interface RuntimeConfiguration {
    production: boolean;
    storage: 'POSTGRESQL' | 'JSON_DEVELOPMENT';
    protectedAccess: boolean;
    httpsOrigin: boolean;
    storageAvailable: () => boolean;
}
export interface RuntimeInputs {
    spot: MarketTick | null;
    perpetual: {
        status: string;
        quote: PerpetualQuote | null;
        consecutiveFailures: number;
    };
    book: ReturnType<PerpetualPaperBook['status']>;
    autonomous: ReturnType<AutonomousPerpetualCycle['status']>;
    research: ReturnType<ResearchEngine['status']>;
    historical: ReturnType<PerpetualStudies['status']>;
    ai: ReturnType<AiAnalysis['status']>;
    legacyExecutionEnabled: boolean;
    evaluationEnabled: boolean;
    perpetualEnabled: boolean;
}
const gate = (reasons: string[]) => ({ ready: reasons.length === 0, reasons });
export class RuntimeReadiness {
    private phase: 'STARTING' | 'SERVING' | 'DRAINING' | 'STOPPED' = 'STARTING';
    private startedAt: number;
    private lastPersistedAt: number | null = null;
    private lastPersistenceFailureAt: number | null = null;
    private persistenceFailed = false;
    private pendingWrites = 0;
    private config: RuntimeConfiguration;
    constructor(config: RuntimeConfiguration, private now: () => number = Date.now) { this.config = { ...config }; this.startedAt = now(); }
    serving() { if (this.phase !== 'STARTING')
        throw Error('runtime cannot resume after draining'); this.phase = 'SERVING'; }
    draining() { if (this.phase !== 'STOPPED')
        this.phase = 'DRAINING'; }
    stopped() { this.phase = 'STOPPED'; }
    isDraining() { return this.phase === 'DRAINING' || this.phase === 'STOPPED'; }
    writeQueued() { this.pendingWrites++; }
    writeSucceeded() { this.finishWrite(); this.lastPersistedAt = this.now(); this.persistenceFailed = false; }
    writeFailed() { this.finishWrite(); this.lastPersistenceFailureAt = this.now(); this.persistenceFailed = true; }
    private finishWrite() { if (this.pendingWrites <= 0)
        throw Error('unmatched persistence observation'); this.pendingWrites--; }
    control() {
        const now = this.now(), clockHealthy = Number.isFinite(now) && now >= this.startedAt && now >= Math.max(this.lastPersistedAt ?? 0, this.lastPersistenceFailureAt ?? 0);
        const available = this.config.storageAvailable();
        const reasons: string[] = [];
        if (this.phase !== 'SERVING')
            reasons.push('RUNTIME_' + this.phase);
        if (!clockHealthy)
            reasons.push('CLOCK_ROLLBACK');
        if (!available)
            reasons.push('STORAGE_UNAVAILABLE');
        if (this.persistenceFailed)
            reasons.push('PERSISTENCE_FAILED');
        if (this.lastPersistedAt === null)
            reasons.push('INITIAL_PERSISTENCE_PENDING');
        if (this.config.production && this.config.storage !== 'POSTGRESQL')
            reasons.push('PRODUCTION_POSTGRESQL_REQUIRED');
        if (this.config.production && !this.config.protectedAccess)
            reasons.push('PRODUCTION_ACCESS_REQUIRED');
        if (this.config.production && !this.config.httpsOrigin)
            reasons.push('PRODUCTION_HTTPS_REQUIRED');
        return { mode: 'PAPER_TRADING' as const, phase: this.phase, startedAt: new Date(this.startedAt).toISOString(), uptimeMs: Math.max(0, now - this.startedAt), clockHealthy, ...gate(reasons), environment: this.config.production ? 'PRODUCTION' : 'DEVELOPMENT', storage: { kind: this.config.storage, available, persistenceFailed: this.persistenceFailed, pendingWrites: this.pendingWrites, lastPersistedAt: this.lastPersistedAt === null ? null : new Date(this.lastPersistedAt).toISOString(), lastPersistenceFailureAt: this.lastPersistenceFailureAt === null ? null : new Date(this.lastPersistenceFailureAt).toISOString() }, access: { protected: this.config.protectedAccess, httpsOrigin: this.config.httpsOrigin } };
    }
    snapshot(input: RuntimeInputs) {
        const control = this.control(), now = this.now(), spot = input.spot, quote = input.perpetual.quote;
        const spotFresh = !!spot && spot.symbol === 'BTCUSDT' && Number.isFinite(spot.price) && spot.price > 0 && Number.isFinite(spot.timestamp) && spot.timestamp <= now + 5000 && now - spot.timestamp <= 60000;
        const perpetualFresh = !!quote && freshPerpetualQuote(quote, now);
        const marketReady = perpetualFresh && input.perpetual.status === 'HEALTHY';
        const submission = [...control.reasons];
        if (!input.perpetualEnabled)
            submission.push('PERPETUAL_EXECUTION_DISABLED');
        if (!marketReady)
            submission.push('PERPETUAL_SOURCE_UNAVAILABLE');
        if (!input.book.marketReady)
            submission.push('BOOK_QUOTE_NOT_READY');
        if (input.book.persistenceFailed)
            submission.push('BOOK_PERSISTENCE_FAILED');
        if (!input.book.fundingReady)
            submission.push('FUNDING_RECONCILIATION_PENDING');
        const exposure = [...submission];
        if (input.book.halted)
            exposure.push('NEW_EXPOSURE_HALTED');
        if (input.book.accountCount === 0)
            exposure.push('NO_INDEPENDENT_ACCOUNTS');
        const autonomous = [...exposure];
        if (!input.autonomous.enabled)
            autonomous.push('AUTONOMOUS_DISABLED');
        if (!input.autonomous.eligible)
            autonomous.push('STUDY_NOT_ELIGIBLE');
        if (!input.book.autonomousAccountExists)
            autonomous.push('NOVA_ACCOUNT_UNAVAILABLE');
        if (input.autonomous.busy)
            autonomous.push('AUTONOMOUS_BUSY');
        const legacy = [...control.reasons];
        if (!input.legacyExecutionEnabled)
            legacy.push('LEGACY_EXECUTION_DISABLED');
        if (!spotFresh)
            legacy.push('SPOT_QUOTE_NOT_READY');
        return { observedAt: new Date(now).toISOString(), ...control, controlPlaneReady: control.ready, hostingVerification: 'NOT_PERFORMED_BY_RUNTIME', singleWriterRequired: true,
            market: { spot: { status: spotFresh ? 'HEALTHY' : 'UNAVAILABLE', receivedAt: spot?.timestamp ?? null, timestampKind: 'LOCAL_RECEIPT', freshnessLimitMs: 60000 }, perpetual: { status: marketReady ? 'HEALTHY' : 'UNAVAILABLE', fresh: perpetualFresh, bookTime: quote?.bookTime ?? null, markTime: quote?.markTime ?? null, receivedAt: quote?.receivedAt ?? null, consecutiveFailures: input.perpetual.consecutiveFailures, freshnessLimitMs: 15000 } },
            paper: { riskApprovalRequired: true, evaluationCapitalIncludedInFund: false, submission: gate(submission), newExposure: gate(exposure), autonomous: gate(autonomous), legacySubmission: gate(legacy), evaluationEnabled: input.evaluationEnabled, accountCount: input.book.accountCount, halted: input.book.halted, funding: { ready: input.book.fundingReady, cursor: input.book.fundingCursor, expectedTime: input.book.expectedFundingTime }, autonomousStudyId: input.autonomous.studyId, lastProcessedCandle: input.autonomous.lastProcessedCandle, autonomousLastAttemptFailed: !!input.autonomous.error },
            jobs: { research: { ...input.research }, historical: { ...input.historical }, autonomousBusy: input.autonomous.busy },
            ai: { enabled: input.ai.enabled, providerConfigured: input.ai.providerConfigured, persistenceBlocked: input.ai.persistenceBlocked, auditRecords: input.ai.auditRecords, heldMicrousd: input.ai.global.heldMicrousd, executionAuthority: false },
            limitations: ['READINESS_IS_NOT_RISK_APPROVAL', 'STORAGE_AVAILABILITY_IS_NOT_A_FRESH_DATABASE_PROBE', 'CLOUD_HOST_AND_BACKUPS_NOT_VERIFIED'] };
    }
}
export function registerRuntimeReadiness(app: FastifyInstance, runtime: RuntimeReadiness, inputs: () => RuntimeInputs) {
    app.get('/health/live', async () => ({ ok: true, mode: 'PAPER_TRADING' }));
    app.get('/health/ready', async (_req, reply) => { const ready = runtime.control().ready; return reply.code(ready ? 200 : 503).send({ ok: ready, mode: 'PAPER_TRADING' }); });
    app.get('/runtime/readiness', async () => runtime.snapshot(inputs()));
    app.addHook('onRequest', async (req, reply) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.url.split('?')[0] !== '/auth/login' && !runtime.control().ready)
        return reply.code(503).send({ error: 'runtime not ready for mutations' }); });
}
