// Perfil do conjunto de velas diárias à vista (cobertura, buracos, moedas atreladas ao dólar, liquidez). Não calcula nenhum retorno de estratégia.
// Uso: npx tsx scripts/estudos/spot-diario-perfil.ts
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';

const DIR='scripts/estudos/out',DAY=86400000;
export interface SpotSeries {symbol:string;baseAsset:string;status:string;t:number[];o:number[];h:number[];l:number[];c:number[];v:number[];qv:number[];n:number[];sha256:string}
export function loadSpot(file:string):SpotSeries{
 const j=JSON.parse(readFileSync(file,'utf8')),r=j.rows as number[][];
 return {symbol:j.symbol,baseAsset:j.baseAsset,status:j.status,t:r.map(x=>x[0]),o:r.map(x=>x[1]),h:r.map(x=>x[2]),l:r.map(x=>x[3]),c:r.map(x=>x[4]),v:r.map(x=>x[5]),qv:r.map(x=>x[6]),n:r.map(x=>x[7]),sha256:j.sha256};
}
/** Atrelada ao dólar: fechamento entre 0,90 e 1,10 em pelo menos 95% dos dias (regra pelos preços, sem olhar retorno de estratégia). */
export const isPegged=(s:Pick<SpotSeries,'c'>)=>s.c.length>=30&&s.c.filter(x=>x>=0.9&&x<=1.1).length/s.c.length>=0.95;
const median=(a:number[])=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN;};
function main(){
 const files=readdirSync(DIR).filter(f=>f.startsWith('spot1d-')&&f.endsWith('.json')),all=files.map(f=>loadSpot(`${DIR}/${f}`)).filter(s=>s.t.length>0);
 const pegged=all.filter(isPegged),free=all.filter(s=>!isPegged(s));
 const gaps=free.map(s=>{let g=0;for(let i=1;i<s.t.length;i++)g+=Math.round((s.t[i]-s.t[i-1])/DAY)-1;return {symbol:s.symbol,gapDays:g,days:s.t.length};}).filter(x=>x.gapDays>0);
 const years:Record<string,{active:number;liquid:number;dead:number}>={};
 for(let y=2017;y<=2026;y++){
  const from=Date.UTC(y,0,1),to=Date.UTC(y+1,0,1);
  const act=free.filter(s=>s.t.some(t=>t>=from&&t<to));
  const liquid=act.filter(s=>{const q=s.qv.filter((_,i)=>s.t[i]>=from&&s.t[i]<to);return q.length>=60&&median(q)>=1e6;});
  years[y]={active:act.length,liquid:liquid.length,dead:act.filter(s=>s.status!=='TRADING'&&s.t.at(-1)!<Date.UTC(y+1,0,1)).length};
 }
 const report={pairs:all.length,pegged:pegged.map(s=>s.symbol),usable:free.length,trading:free.filter(s=>s.status==='TRADING').length,delisted:free.filter(s=>s.status!=='TRADING').length,
  first:new Date(Math.min(...free.map(s=>s.t[0]))).toISOString().slice(0,10),last:new Date(Math.max(...free.map(s=>s.t.at(-1)!))).toISOString().slice(0,10),
  pairsWithGaps:gaps.length,totalGapDays:gaps.reduce((a,g)=>a+g.gapDays,0),worstGaps:gaps.sort((a,b)=>b.gapDays-a.gapDays).slice(0,8),coverageByYear:years};
 writeFileSync('docs/estudos/spot-diario-perfil-2026-10-10.json',JSON.stringify(report,null,1));
 console.log(JSON.stringify({...report,pegged:report.pegged.length+' pares',worstGaps:report.worstGaps.map(g=>g.symbol+':'+g.gapDays)},null,1));
}
if(process.argv[1]?.endsWith('spot-diario-perfil.ts'))main();
