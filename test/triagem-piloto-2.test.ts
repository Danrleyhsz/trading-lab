import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decidirTriagem,
  lerJsonProd,
  relatorioTriagemMd,
  TRIAGEM_PILOTO_2,
  type TriagemEstudo,
} from '../src/application/triagem-piloto-2.js';

const pedido = (set: string) => ({ bars: 5000, trainBars: 1500, testBars: 500, candidateSet: set });
const estudo = (set: string, over: Partial<TriagemEstudo> = {}): TriagemEstudo => ({
  set,
  studyId: 'id-' + set,
  datasetHash: 'h1',
  netPnl: 100,
  screen: { eligible: true, checks: [{ id: 'MINIMUM_CLOSED_TRADES', ok: true }] },
  robustez: { multipleTesting: { deflatedSharpe: 0.95, trials: 9 }, cpcv: { positivePathShare: 0.8 } },
  request: pedido(set),
  ...over,
});
const reprovaTrades = { eligible: false, checks: [{ id: 'MINIMUM_CLOSED_TRADES', ok: false }] };
const CONTROLE = 'BREAKOUT_480_CONTROL_V1',
  VEGA = 'TEAM_VEGA_VOLATILITY_V1';

test('o protocolo declarado: 2 candidatos, pedido do estudo do piloto e limiares fixos', () => {
  assert.deepEqual([...TRIAGEM_PILOTO_2.candidates], [CONTROLE, VEGA]);
  assert.deepEqual(TRIAGEM_PILOTO_2.request, { bars: 5000, trainBars: 1500, testBars: 500 });
  assert.equal(TRIAGEM_PILOTO_2.minimumDeflatedSharpe, 0.9);
  assert.equal(TRIAGEM_PILOTO_2.minimumCpcvPositivePathShare, 0.6);
});

test('o resultado esperado pelo protocolo: poucas operações reprovam os dois e o veredito é nenhum elegível', () => {
  const r = decidirTriagem([
    estudo(CONTROLE, { screen: reprovaTrades, netPnl: 83.6 }),
    estudo(VEGA, { screen: reprovaTrades, netPnl: 151.95 }),
  ]);
  assert.equal(r.veredito, 'NENHUM_ELEGIVEL');
  assert.equal(r.escolhido, null);
  assert.match(r.proximoPasso, /Não há segundo piloto/);
  assert.ok(r.linhas.every((l) => !l.elegivel && l.motivos.some((m) => m.includes('MINIMUM_CLOSED_TRADES'))));
});

test('o Vega só é elegível se passar tudo e superar o controle sobre os mesmos dados', () => {
  const forte = { multipleTesting: { deflatedSharpe: 0.97 }, cpcv: { positivePathShare: 0.8 } };
  const ok = decidirTriagem([estudo(CONTROLE, { netPnl: 80 }), estudo(VEGA, { netPnl: 150, robustez: forte })]);
  assert.equal(ok.veredito, 'ELEGIVEIS');
  assert.equal(ok.escolhido, VEGA);
  assert.match(ok.proximoPasso, /aprovação do dono/);
  const abaixo = decidirTriagem([estudo(CONTROLE, { netPnl: 200 }), estudo(VEGA, { netPnl: 150 })]);
  assert.equal(abaixo.linhas.find((l) => l.set === VEGA)!.elegivel, false);
  assert.match(abaixo.linhas.find((l) => l.set === VEGA)!.motivos.join(' '), /não supera o controle/);
  // empate não é superar
  assert.equal(
    decidirTriagem([estudo(CONTROLE, { netPnl: 150 }), estudo(VEGA, { netPnl: 150 })]).linhas.find(
      (l) => l.set === VEGA,
    )!.superaControle,
    false,
  );
});

test('robustez: exatamente 90% de Sharpe deflacionado e 60% de CPCV passam; abaixo disso reprova, com motivo', () => {
  const limite = decidirTriagem([
    estudo(CONTROLE, { robustez: { multipleTesting: { deflatedSharpe: 0.9 }, cpcv: { positivePathShare: 0.6 } } }),
    estudo(VEGA),
  ]);
  assert.equal(limite.linhas.find((l) => l.set === CONTROLE)!.robustez, true);
  const baixo = decidirTriagem([
    estudo(CONTROLE, { robustez: { multipleTesting: { deflatedSharpe: 0.0559 }, cpcv: { positivePathShare: 1 } } }),
    estudo(VEGA),
  ]);
  const c = baixo.linhas.find((l) => l.set === CONTROLE)!;
  assert.equal(c.elegivel, false);
  assert.match(c.robustezMotivo!, /5\.6%/);
  const semCpcv = decidirTriagem([
    estudo(CONTROLE, { robustez: { multipleTesting: { deflatedSharpe: 0.95 }, cpcv: { positivePathShare: 0.5 } } }),
    estudo(VEGA),
  ]);
  assert.match(semCpcv.linhas.find((l) => l.set === CONTROLE)!.robustezMotivo!, /CPCV/);
});

test('pedido diferente do declarado, estudo fora dos candidatos e estudos faltando não aprovam nada', () => {
  const outroPedido = decidirTriagem([
    estudo(CONTROLE, { request: { ...pedido(CONTROLE), bars: 3000 } }),
    estudo(VEGA),
  ]);
  assert.equal(outroPedido.linhas.find((l) => l.set === CONTROLE)!.elegivel, false);
  assert.match(outroPedido.linhas.find((l) => l.set === CONTROLE)!.motivos.join(' '), /pedido diferente/);
  const fora = decidirTriagem([estudo(CONTROLE), estudo(VEGA), estudo('TEAM_ORACLE_REGIME_V1')]);
  assert.equal(fora.linhas.length, 2);
  assert.ok(fora.avisos.some((a) => a.includes('TEAM_ORACLE_REGIME_V1')));
  const faltando = decidirTriagem([estudo(CONTROLE)]);
  assert.equal(faltando.veredito, 'INCOMPLETA');
  assert.equal(faltando.escolhido, null, 'com estudo faltando não se escolhe nada, mesmo que o outro passe');
  assert.ok(faltando.avisos.some((a) => a.includes(VEGA)));
  const semRobustez = decidirTriagem([estudo(CONTROLE, { robustez: null }), estudo(VEGA, { robustez: null })]);
  assert.equal(semRobustez.veredito, 'INCOMPLETA');
});

test('dados diferentes entre os dois estudos: sem o controle refeito, o Vega não é comparado; com ele, sim', () => {
  const controle = estudo(CONTROLE, { datasetHash: 'a', netPnl: 80 }),
    vega = estudo(VEGA, { datasetHash: 'b', netPnl: 150 });
  const sem = decidirTriagem([controle, vega]);
  assert.equal(sem.linhas.find((l) => l.set === VEGA)!.elegivel, false);
  assert.ok(sem.avisos.some((a) => a.includes('conjuntos de dados diferentes')));
  const com = decidirTriagem(
    [
      controle,
      estudo(VEGA, {
        datasetHash: 'b',
        netPnl: 150,
        robustez: { multipleTesting: { deflatedSharpe: 0.97 }, cpcv: { positivePathShare: 0.8 } },
      }),
    ],
    { [VEGA]: 120 },
  );
  assert.equal(com.linhas.find((l) => l.set === VEGA)!.elegivel, true);
  assert.equal(com.escolhido, VEGA);
  assert.equal(
    decidirTriagem([controle, vega], { [VEGA]: 160 }).linhas.find((l) => l.set === VEGA)!.elegivel,
    false,
    'o controle refeito é a régua',
  );
});

test('em empate de Sharpe deflacionado fica o controle; com dois elegíveis escolhe o de maior Sharpe deflacionado; o relatório sai em Markdown e o JSON do prod-read é lido com o código HTTP', () => {
  const r = decidirTriagem([
    estudo(CONTROLE, { robustez: { multipleTesting: { deflatedSharpe: 0.92 }, cpcv: { positivePathShare: 0.7 } } }),
    estudo(VEGA, {
      netPnl: 150,
      robustez: { multipleTesting: { deflatedSharpe: 0.97 }, cpcv: { positivePathShare: 0.9 } },
    }),
  ]);
  assert.equal(r.escolhido, VEGA);
  assert.equal(
    decidirTriagem([estudo(CONTROLE), estudo(VEGA, { netPnl: 150 })]).escolhido,
    CONTROLE,
    'empate: o controle',
  );
  const md = relatorioTriagemMd(r, '2026-10-12');
  assert.match(md, /Veredito: ELEGIVEIS \(TEAM_VEGA_VOLATILITY_V1\)/);
  assert.match(
    md,
    /\| TEAM_VEGA_VOLATILITY_V1 \| id-TEAM_VEGA_VOLATILITY_V1 \| sim \| passa \| 97\.0% \| 90\.0% \| sim \| \*\*sim\*\* \|/,
  );
  assert.deepEqual(lerJsonProd('200 {"a":1}'), { a: 1 });
  assert.deepEqual(lerJsonProd('[1,2]'), [1, 2]);
  assert.throws(() => lerJsonProd('sem json'), /sem JSON/);
});
