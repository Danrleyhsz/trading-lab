import type {Candle} from './backtest.js';
import type {PerpetualConfig} from './perpetual-backtest.js';
export function perpetualDirection(closed:Candle[],config:PerpetualConfig,currentQuantity=0){if(closed.length<config.slowPeriod)throw Error('insufficient signal history');const last=closed.at(-1)!.close;const window=closed.slice(-config.slowPeriod);const mean=window.reduce((sum,c)=>sum+c.close,0)/window.length;
 if(config.strategy==='BREAKOUT'){const prior=closed.slice(-config.slowPeriod-1,-1);return last>Math.max(...prior.map(c=>c.high))?1:last<Math.min(...prior.map(c=>c.low))?-1:Math.sign(currentQuantity);}
 if(config.strategy==='MEAN_REVERSION'){const sd=Math.sqrt(window.reduce((sum,c)=>sum+(c.close-mean)**2,0)/window.length);const z=sd?(last-mean)/sd:0;return z>1.5?-1:z< -1.5?1:0;}
 const fast=closed.slice(-config.fastPeriod).reduce((sum,c)=>sum+c.close,0)/config.fastPeriod;return Math.sign(fast-mean);
}
