import { RiskEngine, MAX_DRAWDOWN_FRACTION, type RiskDecision } from './risk.js';
import type { PaperOrder } from './broker.js';
import type { PortfolioSnapshot } from './portfolio.js';
import { freshPerpetualQuote, type PerpetualQuote } from './perpetual-market.js';
export class PerpetualRiskEngine {
  private base = new RiskEngine({ maxPositionPct: 0.2, maxLossPct: MAX_DRAWDOWN_FRACTION, maxLeverage: 1 });
  evaluate(
    order: PaperOrder,
    portfolio: PortfolioSnapshot,
    quote: PerpetualQuote,
    controls: { halted: boolean; peakEquity: number; dailyStartEquity: number },
    now = Date.now(),
  ): RiskDecision {
    const result = this.base.evaluate(order, portfolio);
    const current = portfolio.positions.find((p) => p.symbol === order.symbol)?.quantity ?? 0;
    const projected = current + (order.side === 'BUY' ? order.quantity : -order.quantity);
    const reducing =
      current !== 0 &&
      Math.abs(projected) < Math.abs(current) &&
      (projected === 0 || Math.sign(current) === Math.sign(projected));
    const reasons = [...result.reasons];
    if (!freshPerpetualQuote(quote, now)) reasons.push('STALE_MARKET');
    if (order.symbol !== quote.symbol) reasons.push('INSTRUMENT_MISMATCH');
    if (!reducing) {
      if (controls.halted) reasons.push('KILL_SWITCH');
      if (portfolio.equity <= controls.peakEquity * (1 - MAX_DRAWDOWN_FRACTION)) reasons.push('DRAWDOWN_LIMIT');
      if (portfolio.equity <= controls.dailyStartEquity * 0.95) reasons.push('DAILY_LOSS_LIMIT');
      const margin = Math.abs(projected) * quote.markPrice;
      const fee = order.quantity * order.referencePrice * 0.00055;
      if (margin + fee > portfolio.equity) reasons.push('INITIAL_MARGIN');
    }
    return { approved: reasons.length === 0, reasons: [...new Set(reasons)], notional: result.notional };
  }
}
