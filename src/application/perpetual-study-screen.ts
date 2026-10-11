import { validTeamFilters, teamFilterWarmup, validProtections } from '../domain/perpetual-signals.js';
import { validatePerpetualDataset, type PerpetualConfig } from '../domain/perpetual-backtest.js';
import type { PerpetualStudy } from './perpetual-studies.js';

export const PAPER_SCREEN_POLICY = Object.freeze({
  version: 'INDEPENDENT_PAPER_SCREEN_V1',
  minimumFolds: 3,
  minimumTrades: 10,
  maximumDrawdown: 0.15,
  maximumAgeMs: 7 * 86400000,
  feeRate: 0.00055,
  slippageBps: 1,
  positionFraction: 0.1,
});
const hour = 3600000;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
function validConfiguration(c: PerpetualConfig | undefined, trainBars: number) {
  return (
    !!c &&
    (c.strategy === undefined || ['SMA', 'BREAKOUT', 'MEAN_REVERSION'].includes(c.strategy)) &&
    finite(c.initialCapital) &&
    c.initialCapital > 0 &&
    c.feeRate === PAPER_SCREEN_POLICY.feeRate &&
    c.slippageBps === PAPER_SCREEN_POLICY.slippageBps &&
    c.positionFraction === PAPER_SCREEN_POLICY.positionFraction &&
    c.maintenanceRate === 0.01 &&
    c.liquidationFeeRate === 0.005 &&
    Number.isSafeInteger(c.fastPeriod) &&
    c.fastPeriod >= 1 &&
    Number.isSafeInteger(c.slowPeriod) &&
    c.slowPeriod > c.fastPeriod &&
    c.slowPeriod < trainBars &&
    validTeamFilters(c.filters) &&
    teamFilterWarmup(c.filters) < trainBars &&
    validProtections(c.protections)
  );
}
/** Read-only eligibility, shared by diagnostics and the actual cycle. Never promotes a study. */
export function screenPerpetualStudy(study: PerpetualStudy | undefined, now = Date.now()) {
  const result = study?.result,
    folds = Array.isArray(result?.folds) ? result.folds : [];
  const completed = Date.parse(study?.completedAt ?? ''),
    created = Date.parse(study?.createdAt ?? '');
  const checks: Array<{ id: string; ok: boolean }> = [];
  const add = (id: string, ok: boolean) => checks.push({ id, ok });
  add(
    'COMPLETED_V2_STUDY',
    study?.status === 'COMPLETED' &&
      result?.model === 'LINEAR_PERPETUAL_WALK_FORWARD_V2' &&
      result.execution === 'HISTORICAL_SIMULATION' &&
      finite(now) &&
      finite(created) &&
      finite(completed) &&
      created <= completed &&
      completed <= now,
  );
  let sourceHash: string | null = null;
  try {
    if (study?.dataset) sourceHash = validatePerpetualDataset(study.dataset);
  } catch {
    /* Fixed check only; no raw source exception. */
  }
  add(
    'RECORDED_USDM_EVIDENCE',
    !!sourceHash && sourceHash === study?.datasetHash && sourceHash === result?.datasetHash,
  );
  const request = study?.request,
    trainBars = request?.trainBars ?? 0,
    testBars = request?.testBars ?? 0;
  const windowsValid =
    Number.isSafeInteger(trainBars) &&
    trainBars >= 100 &&
    trainBars <= 3000 &&
    Number.isSafeInteger(testBars) &&
    testBars >= 50 &&
    testBars <= 1000 &&
    Number.isSafeInteger(request?.bars) &&
    request!.bars >= 300 &&
    request!.bars <= 5000 &&
    request!.bars === study?.dataset?.trade?.length;
  const expectedFolds = windowsValid ? Math.floor((request!.bars - trainBars) / testBars) : 0;
  add(
    'NONOVERLAPPING_TEST_WINDOWS',
    windowsValid &&
      folds.length === expectedFolds &&
      folds.length > 0 &&
      folds.every((f, i) => {
        const candles = study!.dataset!.trade,
          start = trainBars + i * testBars;
        return (
          !!f &&
          f.trainStart === candles[start - trainBars]?.timestamp &&
          f.trainEnd === candles[start - 1]?.timestamp &&
          f.testStart === candles[start]?.timestamp &&
          f.testEnd === candles[start + testBars - 1]?.timestamp
        );
      }),
  );
  add('MINIMUM_TEST_FOLDS', folds.length >= PAPER_SCREEN_POLICY.minimumFolds);
  const trades = folds.reduce((sum, f) => sum + (count(f?.result?.trades) ? f.result.trades : NaN), 0);
  add('MINIMUM_CLOSED_TRADES', count(trades) && trades >= PAPER_SCREEN_POLICY.minimumTrades);
  const pnl = folds.reduce((sum, f) => sum + (finite(f?.result?.netPnl) ? f.result.netPnl : NaN), 0);
  const tolerance = 1e-8 * Math.max(1, Math.abs(pnl));
  add(
    'POSITIVE_RECONCILED_OOS_PNL',
    finite(result?.netPnl) && result.netPnl > 0 && finite(pnl) && Math.abs(result.netPnl - pnl) <= tolerance,
  );
  add(
    'NO_MODELED_LIQUIDATIONS',
    folds.length > 0 && folds.every((f) => count(f?.result?.liquidations) && f.result.liquidations === 0),
  );
  add(
    'BOUNDED_TEST_DRAWDOWN',
    folds.length > 0 &&
      folds.every(
        (f) =>
          finite(f?.result?.maxDrawdown) &&
          f.result.maxDrawdown >= 0 &&
          f.result.maxDrawdown <= PAPER_SCREEN_POLICY.maximumDrawdown,
      ),
  );
  add(
    'COMPATIBLE_SIGNAL_AND_COSTS',
    windowsValid && folds.length > 0 && folds.every((f) => validConfiguration(f?.configuration, trainBars)),
  );
  const evidenceEnd = folds.at(-1)?.testEnd,
    age = finite(evidenceEnd) && finite(now) ? now - (evidenceEnd + hour) : NaN;
  add('RECENT_CLOSED_EVIDENCE', finite(age) && age >= 0 && age <= PAPER_SCREEN_POLICY.maximumAgeMs);
  const eligible = checks.every((c) => c.ok);
  return {
    eligible,
    reason: eligible
      ? 'historical screen eligible for independent paper evaluation only'
      : checks
          .filter((c) => !c.ok)
          .map((c) => c.id)
          .join(', '),
    policyVersion: PAPER_SCREEN_POLICY.version,
    checks,
    evidence: {
      datasetHash: sourceHash,
      netPnl: finite(result?.netPnl) ? result.netPnl : null,
      folds: folds.length,
      closedTrades: finite(trades) ? trades : null,
      lastTestCandle: finite(evidenceEnd) ? evidenceEnd : null,
    },
  };
}

/** Only immutable completed records may reuse static source checks; clock gates are always recomputed. */
export function studyScreenAtTime(study: PerpetualStudy, screen: ReturnType<typeof screenPerpetualStudy>, now: number) {
  const output = structuredClone(screen),
    completed = Date.parse(study.completedAt ?? ''),
    created = Date.parse(study.createdAt ?? '');
  const folds = Array.isArray(study.result?.folds) ? study.result.folds : [];
  const last = folds.at(-1)?.testEnd,
    age = finite(last) && finite(now) ? now - (last + hour) : NaN;
  for (const check of output.checks) {
    if (check.id === 'COMPLETED_V2_STUDY')
      check.ok =
        study.status === 'COMPLETED' &&
        study.result?.model === 'LINEAR_PERPETUAL_WALK_FORWARD_V2' &&
        study.result.execution === 'HISTORICAL_SIMULATION' &&
        finite(now) &&
        finite(created) &&
        finite(completed) &&
        created <= completed &&
        completed <= now;
    if (check.id === 'RECENT_CLOSED_EVIDENCE')
      check.ok = finite(age) && age >= 0 && age <= PAPER_SCREEN_POLICY.maximumAgeMs;
  }
  output.eligible = output.checks.every((c) => c.ok);
  output.reason = output.eligible
    ? 'historical screen eligible for independent paper evaluation only'
    : output.checks
        .filter((c) => !c.ok)
        .map((c) => c.id)
        .join(', ');
  return output;
}
