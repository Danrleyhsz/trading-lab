# Estudo multimoedas · MULTI_ASSET_STUDY_V1

Executado em 2026-10-05T23:00:00.000Z (simulação histórica fora do servidor, dados públicos da Binance USD-M). Protocolo: `docs/PROTOCOLO_MULTIMOEDAS.md`. Tentativas no desconto de múltiplos testes: 189.

**Aprovadas: 0 de 63.** Aprovação aqui é filtro para um piloto paper, não prova de lucro.

## Leitura do resultado (registrada depois da execução, sem mudar critério)

- **Nenhuma combinação foi aprovada (0 de 63).** O critério que reprovou todas foi o Sharpe deflacionado: com 189 configurações testadas, o melhor resultado esperado só por sorte teria Sharpe anual de cerca de 4,7, e nenhuma chegou perto. O melhor caso (ZEC com SHORT_HORIZON_V1, Sharpe 3,2 e 7 de 7 janelas positivas) também teve probabilidade de sobreajuste de 0,82.
- **Padrão consistente entre moedas:** as duas famílias de tendência lenta deram lucro em 15 de 21 moedas cada uma (MULTI_DAY_TREND_V1 somou +3 096 e BREAKOUT_480_PROTECTED_V1 +4 938, em 21 contas simuladas de 10 000). A família de horizonte curto deu lucro em só 8 de 21 e somou −282: os custos comem a vantagem.
- **Ganho pequeno:** com 10% do capital por posição, o lucro típico das famílias de tendência ficou entre 1% e 9% do capital em 208 dias, bem abaixo de comprar e segurar num período em que várias moedas subiram mais de 100%.
- **Poucas operações:** a família BREAKOUT_480_PROTECTED_V1 fez de 6 a 10 operações por moeda e reprovou também no mínimo de 10.

Isso é evidência de que **tendência lenta é a família certa para continuar estudando** neste mercado, não de que ela dá lucro. Conforme o protocolo, nenhuma família é repetida com outras janelas ou parâmetros para forçar aprovação. O próximo passo precisa ser uma hipótese nova, declarada antes e testada em dados que ainda não foram vistos.

| Moeda | Conjunto | P&L fora da amostra (10 000) | Retorno | Comprar e segurar | Operações | Janelas positivas | Pior DD | Sharpe deflac. | CPCV + | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|
| ZECUSDT | SHORT_HORIZON_V1 | 1630.61 | +16.3% | +127.8% | 124 | 7/7 | 3.2% | 0.17 | 89% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| NEARUSDT | BREAKOUT_480_PROTECTED_V1 | 953.26 | +9.5% | +215.2% | 8 | 4/7 | 4.1% | 0.04 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| SOLUSDT | MULTI_DAY_TREND_V1 | 694.10 | +6.9% | +27.0% | 22 | 6/7 | 1.5% | 0.14 | 22% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| SUIUSDT | BREAKOUT_480_PROTECTED_V1 | 655.16 | +6.6% | -2.5% | 6 | 3/7 | 2.1% | 0.07 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| ENAUSDT | BREAKOUT_480_PROTECTED_V1 | 649.73 | +6.5% | +102.5% | 6 | 4/7 | 3.4% | 0.02 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| AVAXUSDT | BREAKOUT_480_PROTECTED_V1 | 568.57 | +5.7% | +10.7% | 6 | 4/7 | 1.8% | 0.06 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| NEARUSDT | MULTI_DAY_TREND_V1 | 541.26 | +5.4% | +215.2% | 18 | 3/7 | 7.8% | 0.01 | 100% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| AAVEUSDT | SHORT_HORIZON_V1 | 537.20 | +5.4% | +87.7% | 121 | 6/7 | 1.9% | 0.03 | 100% | reprovada: DEFLATED_SHARPE |
| SOLUSDT | BREAKOUT_480_PROTECTED_V1 | 530.62 | +5.3% | +27.0% | 7 | 5/7 | 2.1% | 0.10 | 0% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| BCHUSDT | SHORT_HORIZON_V1 | 503.23 | +5.0% | -28.2% | 135 | 4/7 | 3.1% | 0.02 | 100% | reprovada: DEFLATED_SHARPE |
| ETHUSDT | BREAKOUT_480_PROTECTED_V1 | 500.65 | +5.0% | +18.4% | 7 | 5/7 | 1.7% | 0.13 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| AVAXUSDT | MULTI_DAY_TREND_V1 | 486.22 | +4.9% | +10.7% | 11 | 3/7 | 1.8% | 0.04 | 100% | reprovada: DEFLATED_SHARPE |
| WLDUSDT | BREAKOUT_480_PROTECTED_V1 | 446.59 | +4.5% | +109.2% | 7 | 5/7 | 4.3% | 0.01 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| AAVEUSDT | BREAKOUT_480_PROTECTED_V1 | 368.05 | +3.7% | +87.7% | 7 | 4/7 | 3.5% | 0.02 | 0% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| UNIUSDT | MULTI_DAY_TREND_V1 | 363.73 | +3.6% | +138.2% | 19 | 4/7 | 4.8% | 0.01 | 100% | reprovada: DEFLATED_SHARPE |
| SUIUSDT | MULTI_DAY_TREND_V1 | 356.50 | +3.6% | -2.5% | 19 | 4/7 | 2.8% | 0.01 | 100% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| DOGEUSDT | MULTI_DAY_TREND_V1 | 356.34 | +3.6% | -13.9% | 15 | 5/7 | 2.1% | 0.02 | 100% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| XRPUSDT | MULTI_DAY_TREND_V1 | 352.83 | +3.5% | +4.3% | 18 | 4/7 | 2.3% | 0.02 | 44% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| ETHUSDT | MULTI_DAY_TREND_V1 | 323.84 | +3.2% | +18.4% | 14 | 5/7 | 1.8% | 0.04 | 100% | reprovada: DEFLATED_SHARPE |
| ZECUSDT | MULTI_DAY_TREND_V1 | 312.28 | +3.1% | +127.8% | 13 | 4/7 | 4.9% | 0.01 | 89% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| NEARUSDT | SHORT_HORIZON_V1 | 308.22 | +3.1% | +215.2% | 150 | 3/7 | 5.8% | 0.01 | 100% | reprovada: DEFLATED_SHARPE |
| DOGEUSDT | BREAKOUT_480_PROTECTED_V1 | 261.65 | +2.6% | -13.9% | 7 | 3/7 | 2.0% | 0.02 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| ZECUSDT | BREAKOUT_480_PROTECTED_V1 | 250.84 | +2.5% | +127.8% | 7 | 3/7 | 4.9% | 0.01 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| LINKUSDT | MULTI_DAY_TREND_V1 | 247.93 | +2.5% | +33.6% | 16 | 4/7 | 2.2% | 0.01 | 67% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| BCHUSDT | MULTI_DAY_TREND_V1 | 225.15 | +2.3% | -28.2% | 16 | 3/7 | 2.9% | 0.01 | 67% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| LTCUSDT | BREAKOUT_480_PROTECTED_V1 | 214.89 | +2.1% | +20.4% | 7 | 4/7 | 1.7% | 0.01 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| FILUSDT | SHORT_HORIZON_V1 | 209.20 | +2.1% | +6.1% | 180 | 3/7 | 4.8% | 0.01 | 0% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| XRPUSDT | SHORT_HORIZON_V1 | 201.58 | +2.0% | +4.3% | 131 | 4/7 | 2.8% | 0.01 | 44% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| UNIUSDT | BREAKOUT_480_PROTECTED_V1 | 160.55 | +1.6% | +138.2% | 8 | 4/7 | 4.1% | 0.00 | 0% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| BTCUSDT | BREAKOUT_480_PROTECTED_V1 | 127.93 | +1.3% | +6.0% | 7 | 3/7 | 1.2% | 0.01 | 100% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE |
| ENAUSDT | MULTI_DAY_TREND_V1 | 124.53 | +1.2% | +102.5% | 12 | 3/7 | 5.6% | 0.00 | 100% | reprovada: DEFLATED_SHARPE |
| BTCUSDT | MULTI_DAY_TREND_V1 | 99.88 | +1.0% | +6.0% | 20 | 3/7 | 1.4% | 0.01 | 100% | reprovada: DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| 1000PEPEUSDT | BREAKOUT_480_PROTECTED_V1 | 77.90 | +0.8% | +5.4% | 8 | 3/7 | 2.9% | 0.00 | 0% | reprovada: MINIMUM_TRADES, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| WLDUSDT | MULTI_DAY_TREND_V1 | 76.57 | +0.8% | +109.2% | 15 | 4/7 | 6.9% | 0.00 | 33% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| AAVEUSDT | MULTI_DAY_TREND_V1 | 67.88 | +0.7% | +87.7% | 18 | 4/7 | 3.6% | 0.00 | 22% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| WLDUSDT | SHORT_HORIZON_V1 | 50.51 | +0.5% | +109.2% | 86 | 4/7 | 7.4% | 0.00 | 11% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| BCHUSDT | BREAKOUT_480_PROTECTED_V1 | 46.20 | +0.5% | -28.2% | 10 | 3/7 | 3.5% | 0.00 | 0% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| ETHUSDT | SHORT_HORIZON_V1 | 2.77 | +0.0% | +18.4% | 153 | 3/7 | 1.7% | 0.00 | 0% | reprovada: DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| 1000PEPEUSDT | MULTI_DAY_TREND_V1 | -0.81 | -0.0% | +5.4% | 23 | 4/7 | 4.0% | 0.00 | 89% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| AVAXUSDT | SHORT_HORIZON_V1 | -3.66 | -0.0% | +10.7% | 261 | 4/7 | 4.2% | 0.00 | 0% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| SOLUSDT | SHORT_HORIZON_V1 | -6.15 | -0.1% | +27.0% | 112 | 4/7 | 2.9% | 0.00 | 22% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| LINKUSDT | BREAKOUT_480_PROTECTED_V1 | -9.74 | -0.1% | +33.6% | 8 | 4/7 | 3.7% | 0.00 | 100% | reprovada: MINIMUM_TRADES, POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| LTCUSDT | SHORT_HORIZON_V1 | -55.50 | -0.6% | +20.4% | 175 | 3/7 | 2.4% | 0.00 | 56% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| LTCUSDT | MULTI_DAY_TREND_V1 | -86.42 | -0.9% | +20.4% | 15 | 2/7 | 1.7% | 0.00 | 100% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, PROBABILITY_OF_OVERFITTING |
| FILUSDT | BREAKOUT_480_PROTECTED_V1 | -86.84 | -0.9% | +6.1% | 7 | 4/7 | 3.3% | 0.00 | 100% | reprovada: MINIMUM_TRADES, POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| XRPUSDT | BREAKOUT_480_PROTECTED_V1 | -130.52 | -1.3% | +4.3% | 8 | 2/7 | 2.1% | 0.00 | 100% | reprovada: MINIMUM_TRADES, POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| FILUSDT | MULTI_DAY_TREND_V1 | -147.10 | -1.5% | +6.1% | 13 | 4/7 | 2.7% | 0.00 | 100% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| TAOUSDT | BREAKOUT_480_PROTECTED_V1 | -155.05 | -1.6% | -2.0% | 7 | 4/7 | 4.7% | 0.00 | 0% | reprovada: MINIMUM_TRADES, POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| SUIUSDT | SHORT_HORIZON_V1 | -160.08 | -1.6% | -2.5% | 183 | 2/7 | 3.4% | 0.00 | 56% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| XLMUSDT | MULTI_DAY_TREND_V1 | -175.03 | -1.8% | +31.7% | 26 | 3/7 | 4.7% | 0.00 | 44% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| XLMUSDT | SHORT_HORIZON_V1 | -191.82 | -1.9% | +31.7% | 112 | 3/7 | 4.4% | 0.00 | 22% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| UNIUSDT | SHORT_HORIZON_V1 | -192.98 | -1.9% | +138.2% | 102 | 4/7 | 6.4% | 0.00 | 100% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| XLMUSDT | BREAKOUT_480_PROTECTED_V1 | -219.26 | -2.2% | +31.7% | 8 | 2/7 | 3.4% | 0.00 | 0% | reprovada: MINIMUM_TRADES, POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| ONDOUSDT | BREAKOUT_480_PROTECTED_V1 | -273.47 | -2.7% | +24.3% | 6 | 2/7 | 3.6% | 0.00 | 0% | reprovada: MINIMUM_TRADES, POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| LINKUSDT | SHORT_HORIZON_V1 | -275.53 | -2.8% | +33.6% | 189 | 3/7 | 3.0% | 0.00 | 44% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS |
| ONDOUSDT | MULTI_DAY_TREND_V1 | -283.87 | -2.8% | +24.3% | 14 | 3/7 | 4.4% | 0.00 | 0% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| TAOUSDT | SHORT_HORIZON_V1 | -379.52 | -3.8% | -2.0% | 197 | 3/7 | 3.7% | 0.00 | 0% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| BTCUSDT | SHORT_HORIZON_V1 | -391.93 | -3.9% | +6.0% | 165 | 3/7 | 1.9% | 0.00 | 67% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| ONDOUSDT | SHORT_HORIZON_V1 | -413.10 | -4.1% | +24.3% | 173 | 1/7 | 4.4% | 0.00 | 0% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| DOGEUSDT | SHORT_HORIZON_V1 | -478.26 | -4.8% | -13.9% | 150 | 1/7 | 3.2% | 0.00 | 0% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |
| 1000PEPEUSDT | SHORT_HORIZON_V1 | -508.27 | -5.1% | +5.4% | 138 | 2/7 | 4.4% | 0.00 | 67% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| ENAUSDT | SHORT_HORIZON_V1 | -668.26 | -6.7% | +102.5% | 163 | 3/7 | 7.6% | 0.00 | 100% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE |
| TAOUSDT | MULTI_DAY_TREND_V1 | -839.96 | -8.4% | -2.0% | 21 | 1/7 | 5.1% | 0.00 | 22% | reprovada: POSITIVE_OOS_PNL, DEFLATED_SHARPE, CPCV_POSITIVE_PATHS, PROBABILITY_OF_OVERFITTING |

Hashes dos datasets (SHA-256, forma canônica dos estudos):

- ENAUSDT: `dfb0930d2129bd5c5ca8e5fe9df1ac270b3d7611b77f68c98c6bcc2059287e17`
- ZECUSDT: `2ad1108b140a5b4fca99580d23055a2cde2046ab400bbb4a174c0e0ffdb06061`
- WLDUSDT: `e3bcc70ba8e38caa240d4a90dd7eb2059645ce60c66b96aa3e89d5af849cc074`
- NEARUSDT: `26abfa8b369893ec14377e274fc27efc9fe059885c7d301475e72ccc0f276ad8`
- UNIUSDT: `8ce14fd96ef5fb639c51bc627d0240f0c664df873591e885916f3064fc34473e`
- ONDOUSDT: `3db1863dacbad2982f50d9c0edb99276261aee0d8f3ae110ae3af1af3f20c5e9`
- 1000PEPEUSDT: `ce84be9a2b009ebb244547d5b78933861167f7a8a3348fee4711a925008ad8c6`
- BCHUSDT: `9c7ead4de1f2b07b638ca0b71fd9904abdb05044e6ace6a6f0e99df6a1ecec73`
- FILUSDT: `4721636fc5e6e6b3d9043fd2792a25ae79c973bba197a9215e7899b7ae3e59ef`
- AAVEUSDT: `f0390f01a8a97792e4d12f650c3113d00bede07f3f9ffbd9d7739e9abc089005`
- SUIUSDT: `4c2e3f09a997bc4ec87a94bd6e5c3a66b883b6e5be4ac4482296b1e46ec5866b`
- TAOUSDT: `4196b9178859381573e2e3118c658e98c5dd1ac86f66f8447ffbe9eb7cf762ee`
- AVAXUSDT: `beb72a055423e637c6b5b8d70ed59583880bdee1856c0399b125c35722e6d173`
- LINKUSDT: `e43ba54a685fa1fd8a69ba46384cd251e4dd34d2ff557da012ff4d2291271db6`
- XRPUSDT: `5f0122fab817e29e954951934f78cdbb3baba194b1deae9b624767a43d9e7cac`
- XLMUSDT: `de65d1792fdb7bbd133b26e1c5af15d3535018a3fa620be997d353444af33efc`
- DOGEUSDT: `ed41c2f5a16d36b865a37f2dabda5020df4c9f06523bc846def1c20328cb763d`
- SOLUSDT: `5a82fb9ae9f8a89d1b02bd372e7c46400d9e9f85a630cae127159adf03fbf623`
- LTCUSDT: `18a1b84e4b3cb2ceaf7ab1e1f33082d56b20475cfa9cb3b4ec8ba83085c1de83`
- ETHUSDT: `aa4164353b6a3427c215391c7cd88a087bfb0cb2fe91ba8eb3d289dcb279d416`
- BTCUSDT: `b96052d5511ebc0c2f1b43dd7fd981ac7d9c18e799e2a95e426007705405f754`
