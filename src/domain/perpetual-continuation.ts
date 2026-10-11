import { isDeepStrictEqual } from 'node:util';
import type { PerpetualBookState } from '../application/perpetual-paper-book.js';

const equal = (a: unknown, b: unknown) =>
  isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
export function assertPerpetualContinuation(
  previous: PerpetualBookState | undefined,
  next: PerpetualBookState | undefined,
) {
  if (!next) {
    if (previous) throw Error('perpetual continuation removal rejected');
    return;
  }
  if (!Number.isSafeInteger(next.fundingCursor) || next.fundingCursor <= 0) throw Error('invalid funding cursor');
  if (
    next.expectedFundingTime !== undefined &&
    (!Number.isSafeInteger(next.expectedFundingTime) || next.expectedFundingTime <= 0)
  )
    throw Error('invalid expected funding time');
  if (
    next.autonomousCursor !== undefined &&
    (!Number.isSafeInteger(next.autonomousCursor) ||
      next.autonomousCursor <= 0 ||
      next.autonomousCursor % 3600000 !== 0)
  )
    throw Error('invalid autonomous cursor');
  if (!previous) return;
  if (next.fundingCursor < previous.fundingCursor) throw Error('funding cursor rollback rejected');
  if (
    previous.autonomousCursor !== undefined &&
    (next.autonomousCursor === undefined || next.autonomousCursor < previous.autonomousCursor)
  )
    throw Error('autonomous cursor rollback rejected');
  for (const account of previous.accounts) {
    const current = next.accounts.find((a) => a.id === account.id);
    if (
      !current ||
      current.ownerAgentId !== account.ownerAgentId ||
      current.initialCash !== account.initialCash ||
      current.createdAt !== account.createdAt
    )
      throw Error('perpetual account rewrite rejected');
    if (current.ledger.length < account.ledger.length || account.ledger.some((e, i) => !equal(e, current.ledger[i])))
      throw Error('perpetual historical record deletion or rewrite rejected');
  }
}
