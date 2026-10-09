// Aplica a TRIAGEM_PILOTO_2_V1 (docs/PROTOCOLO_TRIAGEM_PILOTO_2.md) a dois estudos já criados em produção. Só leitura, sem rede.
// Uso, depois que o dono criar os estudos (controle e Vega) e a robustez de cada um estiver calculada:
//   cd work && MSYS_NO_PATHCONV=1 node prod-read.mjs /backtests/v2/studies/<id-controle> --full > controle.json
//   cd work && MSYS_NO_PATHCONV=1 node prod-read.mjs /backtests/v2/studies/<id-vega> --full > vega.json
//   (o mesmo com /robustness no fim, para controle-robustez.json e vega-robustez.json)
//   npx tsx scripts/estudos/triagem-piloto-2.ts --controle=controle.json --vega=vega.json \
//     --controle-robustez=controle-robustez.json --vega-robustez=vega-robustez.json [--saida=docs/estudos/triagem-piloto-2-AAAA-MM-DD]
// Os arquivos podem ter o código HTTP antes do JSON (saída do prod-read). Nenhum critério é escolhido aqui: veja src/application/triagem-piloto-2.ts.
import {readFileSync,writeFileSync} from 'node:fs';
import {walkForwardPerpetual} from '../../src/domain/perpetual-walk-forward.js';
import {studyCandidates,type PerpetualStudy} from '../../src/application/perpetual-studies.js';
import {screenPerpetualStudy} from '../../src/application/perpetual-study-screen.js';
import {decidirTriagem,lerJsonProd,relatorioTriagemMd,TRIAGEM_PILOTO_2,type TriagemEstudo} from '../../src/application/triagem-piloto-2.js';

const arg=(name:string)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
const ler=(name:string)=>{const f=arg(name);if(!f)throw Error(`faltou --${name}=arquivo`);return lerJsonProd(readFileSync(f,'utf8'));};

function paraEstudo(study:PerpetualStudy,robustez:any):TriagemEstudo{
 const screen=screenPerpetualStudy(study,Date.now());
 return {set:study.request?.candidateSet??'SHORT_HORIZON_V1',studyId:study.id,datasetHash:study.datasetHash??study.result?.datasetHash??null,netPnl:study.result?.netPnl??null,
  screen:{eligible:screen.eligible,checks:screen.checks},robustez:robustez?.status==='READY'?robustez.result:null,request:study.request??null};
}
const controle=ler('controle') as PerpetualStudy,vega=ler('vega') as PerpetualStudy;
const estudos=[paraEstudo(controle,ler('controle-robustez')),paraEstudo(vega,ler('vega-robustez'))];
// Controle sobre os mesmos dados do Vega: se as horas viraram entre os dois pedidos, refaz o controle sobre o conjunto do Vega.
let refeito:Record<string,number>|undefined;
if(estudos[0].datasetHash!==estudos[1].datasetHash&&vega.dataset&&vega.request){
 refeito={[estudos[1].set]:walkForwardPerpetual(vega.dataset,studyCandidates('BREAKOUT_480_CONTROL_V1'),vega.request.trainBars,vega.request.testBars).netPnl};
}
const resultado=decidirTriagem(estudos,refeito);
const saida=arg('saida'),data=new Date().toISOString().slice(0,10);
console.log(relatorioTriagemMd(resultado,data));
if(saida){writeFileSync(saida+'.md',relatorioTriagemMd(resultado,data));writeFileSync(saida+'.json',JSON.stringify({protocolo:TRIAGEM_PILOTO_2,resultado,refeito:refeito??null},null,2));console.log('gravado em '+saida+'.md/.json');}
