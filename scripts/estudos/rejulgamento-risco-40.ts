// Rejulgamento dos estudos já feitos com a barra de queda máxima em 40% em vez de 15% (decisão do dono em 09/10/2026).
// Não baixa dados nem simula de novo: a queda máxima já está medida em cada resultado; só o critério muda de lugar.
// Uso: npx tsx scripts/estudos/rejulgamento-risco-40.ts
import {readFileSync,writeFileSync} from 'node:fs';

export const BAR_OLD=0.15,BAR_NEW=0.40;
export interface Row {study:string;candidate:string;maxDrawdown:number;periodDrawdowns?:Record<string,number>;failedOld:string[]}
/** Mantém as reprovações que não são de queda máxima e as de queda máxima que continuam acima da nova barra. */
export function rejudge(failed:string[],maxDrawdown:number,periodDrawdowns:Record<string,number>={},bar=BAR_NEW):string[]{
 return failed.filter(f=>{
  if(!f.startsWith('BOUNDED_DRAWDOWN'))return true;
  const suffix=f.slice('BOUNDED_DRAWDOWN_'.length),dd=periodDrawdowns[suffix]??maxDrawdown;
  return dd>bar;
 });
}
const read=(f:string)=>JSON.parse(readFileSync('docs/estudos/'+f,'utf8'));
export function collect():Row[]{
 const rows:Row[]=[],v1=read('momentum-entre-moedas-2026-10-05.json'),long=read('momentum-historico-longo-2026-10-06.json'),fat=read('fatores-v1-2026-10-09.json'),combo=read('combo-carry-mom-replay-2026-10-09.json'),rap=read('rapido-v1-2026-10-09.json'),hold=read('holdout-2021-2026-10-09.json');
 for(const [k,v] of Object.entries<any>(v1.variants)){const dd=Object.fromEntries(Object.entries<any>(v.periods).map(([p,x])=>[p,x.maxDrawdown]));rows.push({study:'XSMOM_V1 (2 períodos de 6 meses, 10% por posição)',candidate:k,maxDrawdown:Math.max(...Object.values<number>(dd)),periodDrawdowns:dd,failedOld:v.failed});}
 rows.push({study:'XSMOM_LONG_HISTORY_V1 (2022 a ago/2025)',candidate:'XSMOM_L28',maxDrawdown:long.maxDrawdown,failedOld:long.failed});
 for(const r of fat.results)rows.push({study:'FATORES_V1 (2022 a out/2026)',candidate:r.id,maxDrawdown:r.maxDrawdown,failedOld:r.failed});
 rows.push({study:'COMBO_CARRY_MOM_V1 replay (2022 a out/2026)',candidate:'COMBO_CARRY_MOM_V1',maxDrawdown:combo.blend.maxDrawdown,failedOld:combo.failed});
 for(const r of rap.results)rows.push({study:'RAPIDO_V1 (2022 a out/2026)',candidate:r.id,maxDrawdown:r.maxDrawdown,failedOld:r.failed});
 for(const r of hold.results)rows.push({study:'HOLDOUT_2021_V1 (12/2020 a 12/2021, não visto)',candidate:r.id,maxDrawdown:r.maxDrawdown,failedOld:r.failed});
 return rows;
}
const pctf=(v:number)=>(v*100).toFixed(1)+'%';
function main(){
 const rows=collect().map(r=>({...r,failedNew:rejudge(r.failedOld,r.maxDrawdown,r.periodDrawdowns)})),changed=rows.filter(r=>r.failedOld.length!==r.failedNew.length);
 const status=(f:string[])=>f.length===0?'passa tudo':f.every(x=>x==='DEFLATED_SHARPE')?'só Sharpe deflacionado':'reprova';
 const report={rule:{from:BAR_OLD,to:BAR_NEW,decidedBy:'owner',decidedAt:'2026-10-09',postHoc:true},runAt:new Date().toISOString(),rows};
 writeFileSync('docs/estudos/rejulgamento-risco-40-2026-10-09.json',JSON.stringify(report,null,1));
 const md=['# Rejulgamento com a barra de queda máxima em 40% (09/10/2026)','',
  'A pedido do dono, a barra de queda máxima passou de **15% para 40%**. Nenhum dado foi baixado e nenhuma simulação foi refeita: a queda máxima já estava medida em cada resultado, e o rejulgamento só troca o limite desse critério e mantém todos os outros como estavam.','',
  '**Isto não é uma validação independente.** A barra foi alterada depois de ver os resultados, por uma decisão do dono sobre quanto risco aceitar. O que continua independente é só o fato de os preços de 12/2020 a 12/2021 não terem sido vistos quando as regras foram declaradas. Os demais critérios (lucro, anos positivos, custos dobrados, neutralidade de mercado, Sharpe deflacionado) não foram tocados.','',
  '| Estudo | Candidata | Queda máx. | Reprovava em (barra 15%) | Reprova em (barra 40%) | Situação a 40% |','|---|---|---|---|---|---|',
  ...rows.map(r=>`| ${r.study} | ${r.candidate} | ${pctf(r.maxDrawdown)} | ${r.failedOld.join(', ')||'-'} | ${r.failedNew.join(', ')||'-'} | ${status(r.failedNew)}${r.failedOld.length!==r.failedNew.length?' (mudou)':''} |`),'',
  `Mudaram de situação ${changed.length} das ${rows.length} linhas: ${changed.map(r=>r.candidate+' em '+r.study.split(' ')[0]).join('; ')||'nenhuma'}.`].join('\n')+'\n';
 writeFileSync('docs/estudos/rejulgamento-risco-40-2026-10-09.md',md);
 for(const r of rows)console.log(r.candidate.padEnd(20),r.study.split(' ')[0].padEnd(24),pctf(r.maxDrawdown).padStart(6),'|',status(r.failedOld).padEnd(26),'->',status(r.failedNew));
}
if(process.argv[1]?.endsWith('rejulgamento-risco-40.ts'))main();
