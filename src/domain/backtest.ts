export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface BacktestConfig {
  initialCapital: number;
  feeRate: number;
  slippageBps: number;
  fastPeriod: number;
  slowPeriod: number;
}
export interface BacktestResult {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  // Legacy names: positive/negative closed trade NET outcomes including both fees.
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  netPnl: number;
  returnPct: number;
  maxDrawdown: number;
  finalEquity: number;
  // Optional for old stored results: never infer or recalculate their model/costs.
  model?: 'SPOT_SMA_NEXT_OPEN_V2';
  configuration?: BacktestConfig;
  feesPaid?: number;
}
export class HistoricalBacktester {
  run(candles: Candle[], cfg: BacktestConfig): BacktestResult {
    if (
      !Number.isFinite(cfg.initialCapital) ||
      cfg.initialCapital <= 0 ||
      !Number.isFinite(cfg.feeRate) ||
      cfg.feeRate < 0 ||
      cfg.feeRate >= 1 ||
      !Number.isFinite(cfg.slippageBps) ||
      cfg.slippageBps < 0 ||
      cfg.slippageBps >= 10000 ||
      !Number.isInteger(cfg.fastPeriod) ||
      cfg.fastPeriod < 1 ||
      !Number.isInteger(cfg.slowPeriod) ||
      cfg.slowPeriod <= cfg.fastPeriod
    )
      throw Error('invalid backtest configuration');
    if (candles.length < cfg.slowPeriod + 2) throw Error('insufficient candles');
    for (const [i, candle] of candles.entries()) {
      if (
        !Number.isFinite(candle.timestamp) ||
        candle.timestamp < 0 ||
        [candle.open, candle.high, candle.low, candle.close].some((p) => !Number.isFinite(p) || p <= 0) ||
        !Number.isFinite(candle.volume) ||
        candle.volume < 0 ||
        candle.low > Math.min(candle.open, candle.close) ||
        candle.high < Math.max(candle.open, candle.close) ||
        (i > 0 && candle.timestamp <= candles[i - 1]!.timestamp)
      )
        throw Error('invalid historical candle');
    }
    let cash = cfg.initialCapital,
      quantity = 0,
      entryCash = 0,
      trades = 0,
      wins = 0,
      losses = 0;
    let profit = 0,
      loss = 0,
      feesPaid = 0,
      peak = cash,
      maxDrawdown = 0;
    const checked = (value: number) => {
      if (!Number.isFinite(value)) throw Error('non-finite historical result');
      return value;
    };
    const mark = (price: number) => {
      const equity = checked(cash + quantity * price);
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, checked((peak - equity) / peak));
    };
    const sma = (i: number, n: number) =>
      checked(candles.slice(i - n + 1, i + 1).reduce((sum, c) => sum + c.close, 0) / n);
    const close = (price: number) => {
      const fill = checked(price * (1 - cfg.slippageBps / 10000));
      if (fill <= 0) throw Error('invalid historical fill');
      const proceeds = checked(quantity * fill),
        fee = checked(proceeds * cfg.feeRate);
      cash = checked(cash + proceeds - fee);
      feesPaid = checked(feesPaid + fee);
      const net = checked(cash - entryCash);
      trades++;
      if (net > 0) {
        wins++;
        profit = checked(profit + net);
      } else {
        losses++;
        loss = checked(loss - net);
      }
      quantity = 0;
      entryCash = 0;
      mark(price);
    };
    // Two completed observations form a crossover; execute at the NEXT candle's open.
    for (let i = cfg.slowPeriod + 1; i < candles.length; i++) {
      const candle = candles[i]!;
      mark(candle.open);
      const beforeFast = sma(i - 2, cfg.fastPeriod),
        beforeSlow = sma(i - 2, cfg.slowPeriod);
      const fast = sma(i - 1, cfg.fastPeriod),
        slow = sma(i - 1, cfg.slowPeriod);
      if (quantity === 0 && cash > 0 && beforeFast <= beforeSlow && fast > slow) {
        const fill = checked(candle.open * (1 + cfg.slippageBps / 10000));
        const amount = checked(cash / checked(fill * (1 + cfg.feeRate)));
        if (amount <= 0) throw Error('invalid historical position size');
        // Entry fees are reserved inside available cash, without implicit borrowing.
        const notional = checked(amount * fill),
          fee = checked(notional * cfg.feeRate);
        entryCash = cash;
        quantity = amount;
        cash = 0;
        feesPaid = checked(feesPaid + fee);
      } else if (quantity > 0 && beforeFast >= beforeSlow && fast < slow) close(candle.open);
      mark(candle.close);
    }
    // Explicit end-of-window closing assumption: retain costs and final drawdown.
    if (quantity > 0) close(candles.at(-1)!.close);
    const netPnl = checked(cash - cfg.initialCapital);
    return {
      trades,
      wins,
      losses,
      winRate: trades ? wins / trades : 0,
      grossProfit: profit,
      grossLoss: loss,
      profitFactor: loss ? checked(profit / loss) : null,
      netPnl,
      returnPct: checked(netPnl / cfg.initialCapital),
      maxDrawdown,
      finalEquity: cash,
      feesPaid,
      model: 'SPOT_SMA_NEXT_OPEN_V2',
      configuration: { ...cfg },
    };
  }
}
