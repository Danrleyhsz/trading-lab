import type { FastifyInstance } from 'fastify';
import type { PerpetualStudies } from './perpetual-studies.js';
import type { RuntimeReadiness } from './runtime-readiness.js';
import { PAPER_SCREEN_POLICY } from './perpetual-study-screen.js';
import { MAX_DRAWDOWN_FRACTION } from '../domain/risk.js';

type Diagnosis = ReturnType<RuntimeReadiness['snapshot']>;
/** No save, source retrieval, environment mutation, strategy selection or execution capability. */
export interface PilotRelease {
  phase: string;
  releasePinned: boolean;
  deployedCommit: string | null;
  approvedBy?: 'COMMIT' | 'BACKEND_FINGERPRINT' | null;
  backendFingerprint?: string;
}
export function continuousPaperPreflight(
  studies: PerpetualStudies,
  diagnosis: Diagnosis,
  now = Date.now(),
  release: PilotRelease = { phase: 'FIRST_PUBLICATION', releasePinned: false, deployedCommit: null },
) {
  const selectedId = diagnosis.paper.autonomousStudyId;
  const recent = studies.summaries().map((s) => s.id);
  // Include the explicitly configured original even if it is outside the recent window.
  const ids = selectedId && !recent.includes(selectedId) ? [selectedId, ...recent] : recent;
  const screenings = ids.map((id) => ({ studyId: id, configured: id === selectedId, ...studies.screen(id, now) }));
  const selected = screenings.find((s) => s.configured);
  const reasons = [...diagnosis.paper.newExposure.reasons];
  if (!selectedId) reasons.push('EXPLICIT_STUDY_REQUIRED');
  else if (!selected?.eligible) reasons.push('CONFIGURED_STUDY_NOT_ELIGIBLE');
  if (diagnosis.jobs.historical.persistenceFailed) reasons.push('HISTORICAL_PERSISTENCE_FAILED');
  if (diagnosis.ai.enabled || diagnosis.ai.providerConfigured) reasons.push('PAID_AI_OUTSIDE_ROLLOUT');
  if (diagnosis.jobs.autonomousBusy) reasons.push('AUTONOMOUS_BUSY');
  return {
    scope: 'READ_ONLY_CONTINUOUS_PREFLIGHT',
    observedAt: new Date(now).toISOString(),
    policy: PAPER_SCREEN_POLICY,
    accountId: 'evaluation:nova:usdm',
    configuredStudyId: selectedId,
    cycleEnabled: !diagnosis.paper.autonomous.reasons.includes('AUTONOMOUS_DISABLED'),
    // Backups and alerts run outside the service (scheduled GitHub workflows); the runtime reports them as not observable.
    // The release review is observable: the pilot phase must run the exact pinned commit.
    runtimePrerequisites: { ready: reasons.length === 0, reasons },
    activationReady: release.phase === 'CONTINUOUS_PAPER_PILOT' && release.releasePinned && reasons.length === 0,
    release,
    unverified: [
      'AUTOMATIC_OFF_PROVIDER_BACKUP',
      'EXTERNAL_FAILURE_ALERTS',
      ...(release.releasePinned ? [] : ['CONTINUOUS_RELEASE_REVIEW']),
    ],
    limits: {
      instrument: 'BINANCE_USDM:BTCUSDT',
      signalInterval: '1h',
      positionFraction: 0.1,
      maxPositionFraction: 0.2,
      maxLeverage: 1,
      maxObservedDrawdown: MAX_DRAWDOWN_FRACTION,
      maxDailyLoss: 0.05,
      fundIsTarget: false,
      paidAiEnabled: diagnosis.ai.enabled,
      recoveryPolicy: 'AT_MOST_ONCE_ATTEMPT',
    },
    studies: screenings,
    limitations: [
      'SCREEN_IS_NOT_RISK_APPROVAL',
      'NO_AUTOMATIC_STUDY_SELECTION',
      'EXTERNAL_OPERATIONAL_ACCEPTANCE_REQUIRED',
      'NO_ACTIVATION_CAPABILITY',
    ],
  };
}
export function registerContinuousPaperPreflight(
  app: FastifyInstance,
  studies: PerpetualStudies,
  diagnosis: () => Diagnosis,
  now: () => number = Date.now,
  release?: () => PilotRelease,
) {
  app.get('/paper/perpetual/preflight', async () => continuousPaperPreflight(studies, diagnosis(), now(), release?.()));
}
