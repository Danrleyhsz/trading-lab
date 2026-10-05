import {z} from 'zod';
export const PERPETUAL_INSTRUMENT='BINANCE_USDM:BTCUSDT' as const;
export const perpetualQuoteSchema=z.object({instrument:z.literal(PERPETUAL_INSTRUMENT),symbol:z.literal('BTCUSDT'),bid:z.number().finite().positive(),ask:z.number().finite().positive(),markPrice:z.number().finite().positive(),indexPrice:z.number().finite().positive(),fundingRate:z.number().finite(),nextFundingTime:z.number().int().positive(),bookTime:z.number().int().positive(),markTime:z.number().int().positive(),receivedAt:z.number().int().positive()}).refine(q=>q.bid<=q.ask,'crossed order book');
export type PerpetualQuote=z.infer<typeof perpetualQuoteSchema>;
export function freshPerpetualQuote(q:PerpetualQuote,now=Date.now()){return perpetualQuoteSchema.safeParse(q).success&&[q.bookTime,q.markTime,q.receivedAt].every(t=>now-t<=15000&&t<=now+5000)&&Math.abs(q.bookTime-q.markTime)<=15000;}
export interface FundingRecord {instrument:typeof PERPETUAL_INSTRUMENT;timestamp:number;rate:number;markPrice:number}
export function validFunding(record:FundingRecord){return record.instrument===PERPETUAL_INSTRUMENT&&Number.isSafeInteger(record.timestamp)&&record.timestamp>0&&Number.isFinite(record.rate)&&Number.isFinite(record.markPrice)&&record.markPrice>0;}
