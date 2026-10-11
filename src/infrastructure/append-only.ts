import { isDeepStrictEqual } from 'node:util';
import { assertPerpetualContinuation } from '../domain/perpetual-continuation.js';
import { assertHistoricalStudiesAppendOnly } from './historical-study-guard.js';
import { assertAiAppendOnly } from '../domain/ai-analysis.js';
import type { StoredState } from '../domain/storage.js';
import type { DomainEvent } from '../domain/events.js';
// Regras de "o histórico só cresce". Ficam fora do store do PostgreSQL (que carrega o pacote pg) para que o store de
// JSON (desenvolvimento e testes) rode exatamente as mesmas checagens: o que falha em produção também falha nos testes.
const equal = (a: unknown, b: unknown) =>
  isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
export function collectEvents(state: StoredState): DomainEvent[] {
  const map = new Map<string, DomainEvent>();
  for (const e of [
    ...(state.domainEvents ?? []),
    ...(state.paperAccounts ?? []).flatMap((a) => a.ledger),
    ...(state.perpetualBook?.accounts ?? []).flatMap((a) => a.ledger),
    ...(state.researchRuns ?? []).flatMap((r) => r.events),
  ]) {
    const previous = map.get(e.id);
    if (previous && !equal(previous, e)) throw Error('conflicting event IDs');
    map.set(e.id, e);
  }
  return [...map.values()];
}
function prefix(previous: unknown[], next: unknown[]) {
  if (next.length < previous.length || previous.some((item, i) => !equal(item, next[i])))
    throw Error('historical record deletion or rewrite rejected');
}
export function assertAppendOnly(previous: StoredState | null, next: StoredState) {
  assertAiAppendOnly(previous?.aiLedger, next.aiLedger);
  assertHistoricalStudiesAppendOnly(previous?.perpetualStudies, next.perpetualStudies);
  assertPerpetualContinuation(previous?.perpetualBook, next.perpetualBook);
  if (!previous) return;
  prefix(previous.domainEvents ?? [], next.domainEvents ?? []);
  prefix(previous.memories, next.memories);
  prefix(previous.agentMessages ?? [], next.agentMessages ?? []);
  prefix(previous.agentActivity ?? [], next.agentActivity ?? []);
  for (const account of previous.paperAccounts ?? []) {
    const current = next.paperAccounts?.find((a) => a.id === account.id);
    if (!current || current.initialCash !== account.initialCash)
      throw Error('account deletion or endowment rewrite rejected');
    prefix(account.ledger, current.ledger);
  }
  for (const run of previous.researchRuns ?? []) {
    const current = next.researchRuns?.find((r) => r.id === run.id);
    if (!current || !equal(current, run)) throw Error('research evidence rewrite rejected');
  }
}
