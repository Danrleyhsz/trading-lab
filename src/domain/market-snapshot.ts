export interface MarketSnapshot {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  spreadBps: number;
  fundingRate?: number;
  openInterest?: number;
  timestamp: number;
}
export interface DerivativesMarketData {
  snapshot(symbol: string): Promise<MarketSnapshot>;
}
