// Prepara os dados canônicos e as origens do KRONOS_AB_V1 a partir do cache já baixado pelo estudo de carry
// (scripts/estudos/out/carry-BTCUSDT.json; se faltar, rode antes: npx tsx scripts/estudos/carry.ts).
// Uso (na raiz do repositório): npx tsx experiments/kronos/scripts/prepare.ts
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import type {Candle} from '../../../src/domain/backtest.js';
import {HOUR,aggregateFourHour,breakoutEntryBars,dailyGridOrigins,originFor,sha256} from '../lib.ts';

const cfg=JSON.parse(readFileSync('experiments/kronos/configs/kronos_ab_v1.json','utf8'));
const first=Date.parse(cfg.dataset.firstBar),last=Date.parse(cfg.dataset.lastBar),from=Date.parse(cfg.window.firstEntryBar);
const cache=JSON.parse(readFileSync('scripts/estudos/out/carry-BTCUSDT.json','utf8'));
// Mesma grade do estudo de carry: horas faltando viram vela parada no último fechamento (contadas no manifesto).
const byHour=new Map<number,Candle>(cache.perp.map((c:Candle)=>[c.timestamp,c]));const hourly:Candle[]=[];let filled=0,prev:Candle|undefined;
for(let t=first;t<=last;t+=HOUR){const c=byHour.get(t);if(c){hourly.push(c);prev=c;}else{filled++;hourly.push({timestamp:t,open:prev!.close,high:prev!.close,low:prev!.close,close:prev!.close,volume:0});}}
const funding=cache.funding.filter((f:{timestamp:number})=>f.timestamp>=first&&f.timestamp<last+HOUR);
const four=aggregateFourHour(hourly);
// Mesmo recorte que a avaliação entrega ao simulador: começa slowPeriod horas antes da janela.
const warm=from-cfg.baseline.config.slowPeriod*HOUR;
const entries=breakoutEntryBars(hourly.filter(c=>c.timestamp>=warm),cfg.baseline.config.slowPeriod,from,last);
const origins:Record<'1h'|'4h',number[]>={'1h':[],'4h':[]};
for(const tf of ['1h','4h'] as const)origins[tf]=[...new Set([...entries.map(e=>originFor(tf,e.timestamp)),...dailyGridOrigins(tf,from,last)])].sort((a,b)=>a-b);
mkdirSync('experiments/kronos/data',{recursive:true});
const files={'btc-1h.json':JSON.stringify({instrument:'BINANCE_USDM:BTCUSDT',interval:'1h',candles:hourly,funding}),'btc-4h.json':JSON.stringify({instrument:'BINANCE_USDM:BTCUSDT',interval:'4h',candles:four}),'origins.json':JSON.stringify(origins)};
for(const [name,body] of Object.entries(files))writeFileSync('experiments/kronos/data/'+name,body);
const manifest={version:cfg.version,source:cfg.dataset.source,sourceCacheSha256:sha256(readFileSync('scripts/estudos/out/carry-BTCUSDT.json','utf8')),filledHours:filled,
 bars1h:hourly.length,bars4h:four.length,entryCandidates:entries.length,origins:{'1h':origins['1h'].length,'4h':origins['4h'].length},
 sha256:Object.fromEntries(Object.entries(files).map(([n,b])=>[n,sha256(b)]))};
writeFileSync('experiments/kronos/results/data-manifest.json',JSON.stringify(manifest,null,1));
console.log(JSON.stringify(manifest));
