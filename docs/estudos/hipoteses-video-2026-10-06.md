# Hipóteses dos vídeos · VIDEO_HYPOTHESES_V1

Executado em 2026-10-06T14:41:06.289Z, fora do servidor, com dados públicos da Binance USD-M (15 moedas, 1h, 2022-01-01 a 2026-10-05). Protocolo: `docs/PROTOCOLO_HIPOTESES_VIDEO.md` (registrado antes da execução). Commit: `02e663c0502a0ba749f22b0b431dcc18dec6d97a` (árvore limpa).

Walk-forward por ano (2024, 2025, 2026 até 05/10), com treino ancorado desde 2022. 47 configurações no total, todas contadas no Sharpe deflacionado. Nenhuma hipótese é estratégia validada; o melhor resultado possível aqui é "candidata a validação adicional".

| Família | Configs | Veredito | Retorno fora da amostra | Com custos dobrados | 2024 / 2025 / 2026 | Queda máx. | Sharpe | Sharpe deflacionado | Moedas positivas | Configs estáveis | Operações | Acerto | Expectativa (USDT) | Fator de lucro |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H03_VWAP | 9 | **INCONCLUSIVA** | +0.12% | +0.11% | +0.09% / +0.00% / +0.03% | +0.05% | 1.02 | 0.00 | +40.00% | +22.22% | 10 | +80.00% | 18.26 | 3.96 |
| H04_SUPPORT_RESISTANCE | 8 | **REJEITADA** | -9.77% | -15.31% | -6.20% / -2.49% / -1.35% | +10.14% | -2.85 | 0.00 | +0.00% | +0.00% | 5594 | +32.75% | -2.45 | 0.80 |
| H02_MA_DEVIATION | 16 | **REJEITADA** | -0.15% | -0.30% | -0.17% / -0.14% / +0.16% | +1.04% | -0.12 | 0.00 | +53.33% | +12.50% | 133 | +43.61% | -1.48 | 0.95 |
| H01_FIBONACCI | 8 | **REJEITADA** | -5.52% | -8.52% | -1.18% / -4.81% / +0.45% | +8.19% | -0.71 | 0.00 | +6.67% | +0.00% | 2852 | +52.07% | -2.88 | 0.89 |
| H05_FLAG | 4 | **REJEITADA** | -1.44% | -2.56% | -0.72% / -0.42% / -0.30% | +2.25% | -0.49 | 0.00 | +26.67% | +0.00% | 1001 | +34.47% | -2.18 | 0.89 |
| H06_CALENDAR | 2 | **REJEITADA** | +0.20% | -2.02% | +0.00% / +1.09% / -0.88% | +2.61% | 0.04 | 0.00 | +33.33% | +50.00% | 1980 | +45.86% | -0.05 | 1.00 |

Referência: cesta das 15 moedas comprada com a mesma exposição (10%): +14.57%; ficar de fora: 0%.

## Configuração escolhida em cada ano (pelo treino)

- H03_VWAP: 2024 → H03B_ROLL24_K2; 2025 → H03B_SESSION_K2; 2026 → H03B_SESSION_K2
- H04_SUPPORT_RESISTANCE: 2024 → H04_P24_M1_H0.5; 2025 → H04_P24_M1_H0.5; 2026 → H04_P24_M1_H0.5
- H02_MA_DEVIATION: 2024 → H02_REVERSION_N50_VOL; 2025 → H02_REVERSION_N25_VOL; 2026 → H02_MOMENTUM_N50_VOL
- H01_FIBONACCI: 2024 → H01_N168_L0.382; 2025 → H01_N168_L0.382; 2026 → H01_N168_L0.618
- H05_FLAG: 2024 → H05_I6_D0.382; 2025 → H05_I6_D0.382; 2026 → H05_I6_D0.382
- H06_CALENDAR: 2024 → DAY_OF_WEEK; 2025 → DAY_OF_WEEK; 2026 → DAY_OF_WEEK

## H04: a taxa de acerto passada prevê o próximo reteste? (toques de 2024 em diante)

| Pivô | Sem histórico | Taxa anterior < 50% | Taxa anterior ≥ 50% |
|---|---|---|---|
| 12 velas | +62.44% (17978) | — (0) | +68.16% (30199) |
| 24 velas | +61.11% (8627) | — (0) | +66.44% (13267) |

## H06: períodos escolhidos no treino (|t| ≥ 3) e se o sinal se manteve no ano de teste

**HOUR_OF_DAY**

- 2024: 0 (compra, t=3.3, manteve), 1 (venda, t=-4.3, manteve), 4 (compra, t=3.5, manteve), 10 (compra, t=5.4, inverteu), 13 (venda, t=-3.6, manteve), 17 (venda, t=-3.8, inverteu), 20 (compra, t=4.7, manteve), 21 (venda, t=-5.8, inverteu), 22 (compra, t=3.8, manteve)
- 2025: 1 (venda, t=-4.3, inverteu), 3 (compra, t=4.4, manteve), 4 (compra, t=4.9, manteve), 5 (compra, t=3.2, inverteu), 10 (compra, t=3.2, inverteu), 13 (venda, t=-4.9, manteve), 20 (compra, t=4.4, inverteu), 22 (compra, t=6.0, manteve)
- 2026: 3 (compra, t=3.9, manteve), 4 (compra, t=5.8, inverteu), 13 (venda, t=-6.1, manteve), 22 (compra, t=7.7, inverteu)

**DAY_OF_WEEK**

- 2024: nenhum período passou no corte
- 2025: 6 (compra, t=3.9, manteve)
- 2026: 3 (compra, t=3.2, manteve), 6 (compra, t=4.7, manteve)

## Combinações (C01 a C03)

Não executadas: nenhum componente foi classificado como CANDIDATA (regra do documento: combinar só o que se sustenta sozinho).

Dados: ZECUSDT 0 h preenchidas, NEARUSDT 0 h preenchidas, UNIUSDT 0 h preenchidas, BCHUSDT 0 h preenchidas, FILUSDT 0 h preenchidas, AAVEUSDT 0 h preenchidas, AVAXUSDT 0 h preenchidas, LINKUSDT 0 h preenchidas, XRPUSDT 0 h preenchidas, XLMUSDT 0 h preenchidas, DOGEUSDT 0 h preenchidas, SOLUSDT 0 h preenchidas, LTCUSDT 0 h preenchidas, ETHUSDT 0 h preenchidas, BTCUSDT 0 h preenchidas.

## Leitura do resultado (V1 e emenda 1)

- **Nenhuma família foi classificada como CANDIDATA.** Por isso as combinações C01 a C03 não rodaram, como manda o documento.
- **H03 VWAP: inconclusiva só no papel.**
  - **Escolhidas:** o walk-forward escolheu as variantes de reversão com k = 2, que operaram **10 vezes em quase 3 anos** e somaram +0,12%. É estatisticamente nada; o Sharpe deflacionado é 0,00.
  - **Outras variantes:** as de regime (comprado acima e vendido abaixo do VWAP) perderam de 3% a 50%, porque o preço cruza o VWAP várias vezes por dia e as taxas consomem tudo.
  - **Estabilidade:** só 2 das 9 configurações ficaram positivas.
- **H04 suporte e resistência: reprovada nas duas versões** (V1 −9,8%; V2 −14,1%).
  - **Defeito da V1:** descartava zonas rompidas, e por isso a taxa de acerto era sempre 100%. A emenda 1 corrigiu isso antes de rodar.
  - **A estatística do vídeo tem algum valor descritivo.** Zonas que seguraram em pelo menos 50% dos retestes anteriores seguraram de novo em cerca de 65%, contra cerca de 56% nas demais (mais de 140 mil toques de 2024 em diante).
  - **Mas a vantagem não paga a operação:** stop, alvo de 2R e custos levaram a 34% de acerto e fator de lucro 0,86.
- **H02 desvio da média: reprovada** (−0,15%; 1 de 3 anos positivo). A configuração do vídeo (25, média simples, ±3%) não foi a escolhida em nenhum ano. Reversão e momentum também ficaram perto de zero ou negativos.
- **H01 Fibonacci: reprovada** (−5,5%; 2 852 operações, fator de lucro 0,89). Nenhuma das 8 configurações ficou positiva de 2024 em diante.
- **H05 bandeira: reprovada** (−1,4%; nenhum ano positivo).
- **H06 calendário: reprovada.**
  - Ficou positiva com os custos normais (+0,2%), mas negativa com custos dobrados (−2,0%).
  - Os horários escolhidos no treino mantiveram o sinal no ano seguinte em cerca de metade dos casos, que é o nível do acaso.
- **Referência:** comprar a cesta das 15 moedas com a mesma exposição de 10% rendeu +14,6% no mesmo período. Nenhuma hipótese chegou perto.

**Conclusão:** as ideias dos vídeos, traduzidas em regras objetivas e testadas com custos reais em 15 moedas e quase 3 anos fora da amostra, **não mostraram vantagem**. Isso não prova que nenhuma variação poderia funcionar. Prova que as versões razoáveis e pré-declaradas não funcionaram, e que procurar a variação que funciona é exatamente o superajuste contra o qual o documento alerta.
