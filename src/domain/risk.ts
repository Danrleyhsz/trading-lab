import type { PaperOrder } from './broker.js';
import type { PortfolioSnapshot } from './portfolio.js';
export interface RiskLimits {
  maxPositionPct: number;
  maxLossPct: number;
  maxLeverage: number;
}
/** Queda máxima padrão do laboratório desde 10/10/2026 (docs/PADRAO_DE_RISCO.md): vale para os testes e para o motor de risco do paper trading de perpétuos. */
export const MAX_DRAWDOWN_FRACTION = 0.3;
export interface RiskDecision {
  approved: boolean;
  reasons: string[];
  notional: number;
}
export class RiskEngine {
  constructor(private limits: RiskLimits = { maxPositionPct: 0.2, maxLossPct: 0.05, maxLeverage: 1 }) {}
  evaluate(order: PaperOrder, portfolio: PortfolioSnapshot): RiskDecision {
    const notional = order.quantity * order.referencePrice,
      reasons: string[] = [];
    if (
      !Number.isFinite(order.quantity) ||
      !Number.isFinite(order.referencePrice) ||
      order.quantity <= 0 ||
      order.referencePrice <= 0 ||
      !['BUY', 'SELL'].includes(order.side) ||
      !order.symbol
    )
      reasons.push('INVALID_ORDER');
    const current = portfolio.positions.find((position) => position.symbol === order.symbol);
    const projectedQuantity = (current?.quantity ?? 0) + (order.side === 'BUY' ? order.quantity : -order.quantity);
    const reducing =
      !!current &&
      Math.abs(projectedQuantity) < Math.abs(current.quantity) &&
      (projectedQuantity === 0 || Math.sign(projectedQuantity) === Math.sign(current.quantity));
    if (!Number.isFinite(portfolio.equity) || (!reducing && portfolio.equity <= 0)) reasons.push('INVALID_EQUITY');
    const projectedNotional = Math.abs(projectedQuantity * order.referencePrice);
    if (!reducing && projectedNotional > portfolio.equity * this.limits.maxPositionPct) reasons.push('POSITION_LIMIT');
    if (!reducing && portfolio.equity <= portfolio.initialCash * (1 - this.limits.maxLossPct))
      reasons.push('LOSS_LIMIT');
    const gross =
      portfolio.positions
        .filter((position) => position.symbol !== order.symbol)
        .reduce((sum, position) => sum + Math.abs(position.quantity * position.averageEntry), 0) + projectedNotional;
    if (!reducing && gross > portfolio.equity * this.limits.maxLeverage) reasons.push('LEVERAGE_LIMIT');
    return { approved: reasons.length === 0, reasons, notional };
  }
}
