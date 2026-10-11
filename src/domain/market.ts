export interface MarketTick {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  exchange: string;
  timestamp: number;
}
export interface MarketDataAdapter {
  connect(onTick: (tick: MarketTick) => void): Promise<void>;
  disconnect(): Promise<void>;
}
