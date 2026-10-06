# Escritório 2.0: fase F3 (Stress Lab e Backtest)

As zonas **Stress Lab** e **Backtest** do `/office2/` passam a mostrar dados. Tudo nelas é **SIMULAÇÃO**, e cada painel diz isso com um selo próprio.

## Stress Lab

- **Fonte:** `public/office2/stress-report.json`, o relatório do `STRESS_LAB_V1` com semente 20261006, gerado por `REPORT_PATH=public/office2/stress-report.json npm run stress-lab`.
- **Por que arquivo estático e não rota que roda o catálogo:** a rodada leva dezenas de segundos de CPU, e rodar isso no servidor ao lado do piloto poderia atrasar decisões.
- **Garantia de atualização:** o `test/stress-lab.test.ts` confere que o `reportSha256` do arquivo é igual ao de uma rodada nova. Se o código do laboratório mudar e o arquivo não for regenerado, o teste falha.
- **Painel:**
  - selo "SIMULAÇÃO · mercado sintético · semente";
  - placar (sobreviveram, violações);
  - kill switch, pior slippage e maior drawdown;
  - os 14 cenários com a linha de métricas e, se houver, as violações e as expectativas não cumpridas;
  - aviso "sobreviver ≠ lucro";
  - os 4 achados de `docs/STRESS_LAB.md`.
- **Tela `stress-placar`:** 14 lâmpadas (2 × 7) na ordem do catálogo, verde se sobreviveu e vermelho se falhou.
- **Recusa:** um relatório sem `scope: "SIMULATION"` é recusado.

## Backtest

- **Fontes:**
  - `GET /backtests/v2/studies` (os últimos 20 estudos);
  - `GET /paper/perpetual/status`, para a triagem do estudo do piloto.
- **Painel:**
  - selo "SIMULAÇÃO HISTÓRICA · walk-forward";
  - triagem do estudo do piloto (elegível ou não, com o motivo), marcada REAL porque é o estado atual do servidor;
  - estudos com janela, conjunto de candidatos, folds e resultado líquido sobre o capital simulado de 10.000;
  - aviso "resultado de estudo histórico não é previsão nem desempenho do piloto".
- **Tela `backtest-estudos`:** barras do resultado líquido dos últimos 6 estudos (azul positivo, âmbar negativo), com marca dourada no estudo do piloto.

## Conferido

- **Prévia local** com o relatório publicado e os estudos e o status lidos da produção (só GET):
  - Stress Lab com 14 de 14 e 0 violações;
  - Backtest com 3 estudos, o do piloto (d674cb32) marcado como elegível.
- **Correção feita durante a conferência:** a lista de telas do painel mostrava "REAL" para as telas de simulação. Agora usa a classe declarada no mapa (SIMULATION).

## Testes

- `test/office2-lab.test.ts`: placar e ordem dos cenários; falha aparece como falha; relatório sem selo é recusado; estudos e triagem; telas só com dado.
- `test/stress-lab.test.ts`: o arquivo publicado bate com a rodada nova.
