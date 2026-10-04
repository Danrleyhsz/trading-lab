import {AGENT_IDS} from '../domain/agents.js';
import type {PerpetualPaperBook} from './perpetual-paper-book.js';

// Allocation is independent of all execution flags; existing wallets are never reseeded.
export function evaluationWalletCapital(env: NodeJS.ProcessEnv): number | null {
    if (env.EVALUATION_WALLETS_ENABLED === undefined || env.EVALUATION_WALLETS_ENABLED === 'false') return null;
    if (env.EVALUATION_WALLETS_ENABLED !== 'true') throw Error('invalid evaluation wallet flag');
    const capital = Number(env.EVALUATION_PAPER_CAPITAL);
    if (!Number.isFinite(capital) || capital <= 0) throw Error('positive evaluation wallet capital required');
    return capital;
}
export function bootstrapEvaluationWallets(env: NodeJS.ProcessEnv, book: PerpetualPaperBook) {
    const capital = evaluationWalletCapital(env);
    if (capital === null) return;
    for (const owner of AGENT_IDS) book.ensureEvaluation(owner, capital);
}
