import type { Candle } from '../domain/backtest.js';
import type { FundingSettlement } from '../domain/perpetual-backtest.js';

const MINUTE = 60000;
const HOSTS = { spot: 'https://api.binance.com/api/v3', futures: 'https://fapi.binance.com/fapi/v1' } as const;

/** Velas de 1 minuto e funding públicos da Binance numa janela [start, end], para o Seguidor de Sinais. Só leitura. */
export class BinanceSignalWindow {
  constructor(private request: typeof fetch = fetch) {}
  private async get(url: string): Promise<unknown[]> {
    const response = await this.request(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Binance HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error('invalid Binance response');
    return body;
  }
  async candles(market: 'spot' | 'futures', symbol: string, start: number, end: number): Promise<Candle[]> {
    if (!/^[A-Z0-9]{2,20}USDT$/.test(symbol)) throw new Error('invalid symbol');
    const rows: Candle[] = [];
    let cursor = start;
    while (cursor <= end) {
      const params = new URLSearchParams({
        symbol,
        interval: '1m',
        startTime: String(cursor),
        endTime: String(end),
        limit: '1000',
      });
      const page = await this.get(`${HOSTS[market]}/klines?${params}`);
      for (const raw of page) {
        if (!Array.isArray(raw) || raw.length < 6) throw new Error('invalid candle row');
        rows.push({
          timestamp: Number(raw[0]),
          open: Number(raw[1]),
          high: Number(raw[2]),
          low: Number(raw[3]),
          close: Number(raw[4]),
          volume: Number(raw[5]),
        });
      }
      if (page.length < 1000) break;
      const next = rows.at(-1)!.timestamp + MINUTE;
      if (next <= cursor) throw new Error('invalid candle pagination');
      cursor = next;
    }
    return rows;
  }
  async funding(symbol: string, start: number, end: number): Promise<FundingSettlement[]> {
    const params = new URLSearchParams({ symbol, startTime: String(start), endTime: String(end), limit: '1000' });
    // shortcut: uma página (1000 liquidações ≈ 333 dias de funding de 8h); paginar se a janela crescer.
    return (await this.get(`${HOSTS.futures}/fundingRate?${params}`)).map((raw) => {
      const row = raw as Record<string, unknown>;
      return { timestamp: Number(row.fundingTime), rate: Number(row.fundingRate), markPrice: Number(row.markPrice) };
    });
  }
}
