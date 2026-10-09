/**
 * Decisão da triagem TRIAGEM_PILOTO_2_V1 (docs/PROTOCOLO_TRIAGEM_PILOTO_2.md), só leitura e sem rede.
 * Os critérios são os do protocolo, declarados antes de qualquer estudo; este arquivo só os aplica, não os escolhe.
 * A varredura de cada estudo (`screenPerpetualStudy`) e a robustez vêm de fora; aqui entra apenas a regra de decisão.
 */
export const TRIAGEM_PILOTO_2={version:'TRIAGEM_PILOTO_2_V1',declaredAt:'2026-10-09',candidates:['BREAKOUT_480_CONTROL_V1','TEAM_VEGA_VOLATILITY_V1'],
 request:{bars:5000,trainBars:1500,testBars:500},minimumDeflatedSharpe:0.9,minimumCpcvPositivePathShare:0.6} as const;
export type TriagemSet=typeof TRIAGEM_PILOTO_2.candidates[number];

export interface TriagemEstudo {
 set:string;studyId:string;datasetHash:string|null;netPnl:number|null;
 /** Resultado de `screenPerpetualStudy` (INDEPENDENT_PAPER_SCREEN_V1). */
 screen:{eligible:boolean;checks:{id:string;ok:boolean}[]};
 /** Corpo `result` de GET /backtests/v2/studies/:id/robustness (ROBUSTNESS_SCREEN_V2); null se ainda não calculado. */
 robustez:{multipleTesting?:{deflatedSharpe?:number|null;trials?:number};cpcv?:{positivePathShare?:number|null};overfitting?:{pbo?:number|null}}|null;
 /** Pedido do estudo, para conferir que é o declarado. */
 request:{bars?:number;trainBars?:number;testBars?:number;candidateSet?:string}|null;
}
export interface TriagemLinha {
 set:string;studyId:string;pedidoDeclarado:boolean;triagemPiloto:boolean;falhasTriagem:string[];
 deflatedSharpe:number|null;cpcv:number|null;robustez:boolean|null;robustezMotivo:string|null;
 /** Só para os candidatos que não são o controle. */
 superaControle:boolean|null;superaMotivo:string|null;elegivel:boolean;motivos:string[];
}
export interface TriagemResultado {
 protocolo:string;veredito:'NENHUM_ELEGIVEL'|'ELEGIVEIS'|'INCOMPLETA';linhas:TriagemLinha[];escolhido:string|null;avisos:string[];proximoPasso:string;
}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const P=TRIAGEM_PILOTO_2;

/**
 * `netPnlControleMesmosDados`: lucro do controle sobre o conjunto de dados do estudo comparado. Quando os dois estudos têm o mesmo
 * `datasetHash` é o do próprio estudo de controle; quando diferem (uma hora virou entre os pedidos), quem chama refaz o controle
 * sobre os dados do outro (replay offline) e passa o valor aqui.
 */
export function decidirTriagem(estudos:TriagemEstudo[],netPnlControleMesmosDados?:Record<string,number>):TriagemResultado {
 const avisos:string[]=[];
 const controle=estudos.find(e=>e.set==='BREAKOUT_480_CONTROL_V1');
 const faltam=P.candidates.filter(c=>!estudos.some(e=>e.set===c));
 const linhas:TriagemLinha[]=estudos.filter(e=>(P.candidates as readonly string[]).includes(e.set)).map(e=>{
  const pedidoDeclarado=!!e.request&&e.request.bars===P.request.bars&&e.request.trainBars===P.request.trainBars&&e.request.testBars===P.request.testBars&&e.request.candidateSet===e.set;
  const falhas=e.screen.checks.filter(c=>!c.ok).map(c=>c.id);
  const ds=e.robustez?.multipleTesting?.deflatedSharpe,cp=e.robustez?.cpcv?.positivePathShare;
  let robustez:boolean|null=null,robustezMotivo:string|null=null;
  if(!e.robustez){robustezMotivo='robustez ainda não calculada';}
  else if(!finite(ds)||!finite(cp)){robustez=false;robustezMotivo='robustez sem Sharpe deflacionado ou CPCV';}
  else{robustez=ds>=P.minimumDeflatedSharpe&&cp>=P.minimumCpcvPositivePathShare;
   if(!robustez)robustezMotivo=[ds<P.minimumDeflatedSharpe?`Sharpe deflacionado ${(ds*100).toFixed(1)}% (exige ${P.minimumDeflatedSharpe*100}%)`:'',cp<P.minimumCpcvPositivePathShare?`CPCV com ${(cp*100).toFixed(0)}% de caminhos positivos (exige ${P.minimumCpcvPositivePathShare*100}%)`:''].filter(Boolean).join('; ');}
  let superaControle:boolean|null=null,superaMotivo:string|null=null;
  if(e.set!=='BREAKOUT_480_CONTROL_V1'){
   const ref=netPnlControleMesmosDados?.[e.set]??(controle&&controle.datasetHash!==null&&controle.datasetHash===e.datasetHash?controle.netPnl:undefined);
   if(!finite(ref)||!finite(e.netPnl)){superaControle=false;superaMotivo='sem o controle sobre os mesmos dados (refazer o controle sobre o conjunto deste estudo)';}
   else{superaControle=e.netPnl>ref;superaMotivo=superaControle?null:`lucro ${e.netPnl.toFixed(2)} não supera o controle ${ref.toFixed(2)} sobre os mesmos dados`;}
  }
  const motivos:string[]=[];
  if(!pedidoDeclarado)motivos.push('pedido diferente do declarado');
  if(!e.screen.eligible)motivos.push('triagem do piloto: '+falhas.join(', '));
  if(robustez!==true)motivos.push('robustez: '+(robustezMotivo??'não passou'));
  if(superaControle===false)motivos.push('controle: '+superaMotivo);
  return {set:e.set,studyId:e.studyId,pedidoDeclarado,triagemPiloto:e.screen.eligible,falhasTriagem:falhas,deflatedSharpe:finite(ds)?ds:null,cpcv:finite(cp)?cp:null,robustez,robustezMotivo,superaControle,superaMotivo,
   elegivel:pedidoDeclarado&&e.screen.eligible&&robustez===true&&superaControle!==false,motivos};
 });
 for(const e of estudos)if(!(P.candidates as readonly string[]).includes(e.set))avisos.push(`estudo ${e.studyId} (${e.set}) fora dos candidatos declarados: ignorado`);
 if(controle&&estudos.some(e=>e.set!=='BREAKOUT_480_CONTROL_V1'&&e.datasetHash!==controle.datasetHash)&&!netPnlControleMesmosDados)
  avisos.push('os estudos têm conjuntos de dados diferentes; o controle precisa ser refeito sobre os dados do outro antes de comparar');
 const incompleta=faltam.length>0||linhas.some(l=>l.robustez===null);
 const elegiveis=linhas.filter(l=>l.elegivel);
 // Maior Sharpe deflacionado; em empate fica o primeiro da ordem declarada (o controle, a opção mais simples). Com estudo faltando não se escolhe nada.
 const escolhido=!incompleta&&elegiveis.length?elegiveis.reduce((a,b)=>(b.deflatedSharpe??-1)>(a.deflatedSharpe??-1)?b:a).set:null;
 const veredito=incompleta?'INCOMPLETA':elegiveis.length?'ELEGIVEIS':'NENHUM_ELEGIVEL';
 if(faltam.length)avisos.push('faltam estudos: '+faltam.join(', '));
 const proximoPasso=veredito==='ELEGIVEIS'
  ?`Preparar o piloto 2 com ${escolhido} (espera de candle de 60 s, relatório corrigido) e pedir a aprovação do dono; nada começa sem ela.`
  :veredito==='INCOMPLETA'?'Completar os estudos e a robustez declarados antes de decidir.'
  :'Não há segundo piloto. Registrar a lição em docs/estudos/triagem-piloto-2-<data>.md; qualquer hipótese nova precisa de protocolo próprio, declarado antes.';
 return {protocolo:P.version,veredito,linhas,escolhido,avisos,proximoPasso};
}

/** Lê JSON aceitando o código HTTP antes do corpo (formato da saída do prod-read). */
export function lerJsonProd(texto:string):any{const i=texto.search(/[{[]/);if(i<0)throw Error('arquivo sem JSON');return JSON.parse(texto.slice(i));}
const pct=(v:number|null)=>v===null?'n/d':(v*100).toFixed(1)+'%';
export function relatorioTriagemMd(r:TriagemResultado,data:string):string{
 const cabecalho=`# Resultado TRIAGEM_PILOTO_2_V1\n\nExecutada em ${data}, pelos critérios do protocolo \`docs/PROTOCOLO_TRIAGEM_PILOTO_2.md\` (declarado em ${P.declaredAt}), sem mudar nenhum.\n\n**Veredito: ${r.veredito}${r.escolhido?` (${r.escolhido})`:''}.**\n\n`;
 const tabela='| Conjunto | Estudo | Pedido declarado | Triagem do piloto | Sharpe deflacionado | CPCV | Supera o controle | Elegível |\n|---|---|---|---|---|---|---|---|\n'+
  r.linhas.map(l=>`| ${l.set} | ${l.studyId} | ${l.pedidoDeclarado?'sim':'não'} | ${l.triagemPiloto?'passa':'reprova'} | ${pct(l.deflatedSharpe)} | ${pct(l.cpcv)} | ${l.superaControle===null?'(controle)':l.superaControle?'sim':'não'} | ${l.elegivel?'**sim**':'não'} |`).join('\n');
 const porque='\n\n## Por que\n'+r.linhas.map(l=>`- **${l.set}:** ${l.elegivel?'passou em tudo.':l.motivos.join(' | ')}`).join('\n')+'\n';
 const avisos=r.avisos.length?'\n## Avisos\n'+r.avisos.map(a=>'- '+a).join('\n')+'\n':'';
 return cabecalho+tabela+porque+avisos+'\n## Próximo passo (pelo protocolo)\n'+r.proximoPasso+'\n';
}
