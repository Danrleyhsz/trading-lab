export type Side = 'BUY' | 'SELL';
export interface PaperOrder {
  symbol: string;
  side: Side;
  quantity: number;
  referencePrice: number;
  instrument?: 'BINANCE_USDM:BTCUSDT';
  accountId?: string;
  agentId?: string;
  strategyId?: string;
  proposalId?: string;
}
export interface PaperFill extends PaperOrder {
  id: string;
  fillPrice: number;
  fee: number;
  filledAt: string;
}
export interface Broker {
  submit(order: PaperOrder): Promise<PaperFill>;
}
export class PaperBroker implements Broker {
  constructor(
    private feeRate = 0.00055,
    private slippageBps = 1,
  ) {}
  async submit(order: PaperOrder) {
    if (
      !Number.isFinite(order.quantity) ||
      !Number.isFinite(order.referencePrice) ||
      order.quantity <= 0 ||
      order.referencePrice <= 0 ||
      !['BUY', 'SELL'].includes(order.side)
    )
      throw new Error('invalid order');
    const direction = order.side === 'BUY' ? 1 : -1;
    const fillPrice = order.referencePrice * (1 + (direction * this.slippageBps) / 10000);
    return {
      id: crypto.randomUUID(),
      ...order,
      fillPrice,
      fee: fillPrice * order.quantity * this.feeRate,
      filledAt: new Date().toISOString(),
    };
  }
}
