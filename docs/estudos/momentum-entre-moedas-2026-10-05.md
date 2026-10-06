# Momentum entre moedas · XSMOM_V1

Executado em 2026-10-06T00:41:45.681Z, fora do servidor, com os datasets dos estudos anteriores (hash de cada um conferido com o registrado). O P&L foi conferido por uma conta independente (sem custos: diferença abaixo de 0,5%). Protocolo: `docs/PROTOCOLO_MOMENTUM_ENTRE_MOEDAS.md` (registrado antes da execução). Compra as 5 moedas de maior retorno e vende as 5 de menor, 10% do patrimônio em cada, rebalanceando a cada 7 dias.

## Leitura do resultado (registrada depois da execução, sem mudar critério)

- **As duas variantes foram reprovadas pelo critério declarado**, principalmente pelo limite de drawdown de 15%.
- **XSMOM_L28 (28 dias) foi o melhor resultado de todos os estudos até aqui.** Lucrou nos **dois** períodos: +19,3% no mercado em queda e +17,2% no mercado em alta. A correlação com o mercado ficou perto de zero (−0,08 e 0,17), então ela não dependeu do rumo do mercado, ao contrário das estratégias de tendência. O Sharpe deflacionado foi de 0,91. Reprovou só porque a queda máxima passou do limite: 22,9% no período A e 15,8% no B.
- **XSMOM_L7 (7 dias)** lucrou muito no período A (+50,7%) e perdeu no B (−2,3%): é instável, depende do trecho.
- **Conforme o protocolo**, XSMOM_V1 está encerrada como foi declarada. O limite de drawdown não é afrouxado depois de ver o resultado.
- **O que fica para uma decisão do dono:** a estratégia de 28 dias mostrou um sinal que funcionou nos dois regimes, mas com risco acima do aceito no tamanho testado (10% por posição, exposição bruta de 1x). Qualquer passo seguinte (por exemplo, tamanho menor) é uma hipótese **nova**, escolhida depois de ver estes dados. A validação honesta dela só pode vir de dados futuros, em um piloto paper.

| Variante | Período | Retorno | Pior DD | Posições encerradas | Rebalanceamentos | Taxas | Funding | Correlação com o mercado | Sharpe anual |
|---|---|---|---|---|---|---|---|---|---|
| XSMOM_L7 | A (2025-09-12 → 2026-03-11) | +50.72% | 15.94% | 167 | 26 | 264.63 | 21.25 | 0.02 | 3.16 |
| XSMOM_L7 | B (2026-04-08 → 2026-10-05) | -2.33% | 17.15% | 184 | 26 | 213.13 | -11.35 | 0.04 | -0.04 |
| XSMOM_L28 | A (2025-09-12 → 2026-03-11) | +19.28% | 22.86% | 87 | 26 | 139.56 | 11.52 | -0.08 | 1.49 |
| XSMOM_L28 | B (2026-04-08 → 2026-10-05) | +17.18% | 15.85% | 80 | 26 | 113.02 | -46.07 | 0.17 | 1.32 |

| Variante | Sharpe anual (A+B) | Sharpe deflacionado | Resultado |
|---|---|---|---|
| XSMOM_L7 | 1.57 | 0.93 | reprovada: BOUNDED_DRAWDOWN_A, POSITIVE_PNL_B, BOUNDED_DRAWDOWN_B |
| XSMOM_L28 | 1.40 | 0.91 | reprovada: BOUNDED_DRAWDOWN_A, BOUNDED_DRAWDOWN_B |
