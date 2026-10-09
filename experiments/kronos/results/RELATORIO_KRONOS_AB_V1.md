# Relatório KRONOS_AB_V1 (BTC, etapa 1)

Executado em 2026-10-06T19:21:59.113Z. Só pesquisa histórica offline. Janela de avaliação: 2025-10-24T00:00:00Z a 2026-10-05T23:00:00Z, posterior a todos os pesos usados. Protocolo: `experiments/kronos/PROTOCOLO_KRONOS_AB_V1.md`.

**Decisão pela regra declarada: MANTER SÓ A BASE (sem evidência de valor incremental).**

O controle com o Kronos desligado reproduziu a base de forma idêntica: mesma trilha de auditoria e mesmo P&L.

## Resultado de operação (estratégia do piloto, mesma janela e mesmos custos)

| Braço | P&L líquido | P&L bruto | Queda máx. | Sharpe | Fator de lucro | Acerto | Operações | Giro (x capital) | P&L com custos dobrados | P&L por trimestre |
|---|---|---|---|---|---|---|---|---|---|---|
| A · base | 564.18 | 573.19 | 2.1% | 1.48 | 4.64 | 75.0% | 8 | 1.6 | 548.36 | 45 / 320 / 124 / 76 |
| B · 1h | 117.04 | 120.33 | 1.5% | 0.48 | 6.92 | 66.7% | 3 | 0.6 | 111.34 | 113 / 0 / -20 / 24 |
| B · 4h | 188.34 | 193.68 | 1.5% | 0.72 | 2.38 | 60.0% | 5 | 1.0 | 179.06 | -94 / 280 / 68 / -65 |
| C · 1h | -51.26 | -50.18 | 0.9% | -0.75 | 0.00 | 0.0% | 1 | 0.2 | -53.11 | 0 / 0 / -51 / 0 |
| C · 4h | 388.66 | 397.59 | 2.0% | 1.07 | 3.38 | 75.0% | 8 | 1.6 | 373.04 | -51 / 317 / 105 / 18 |
| B1 · 1h | 521.15 | 526.59 | 1.9% | 1.62 | 10.88 | 80.0% | 5 | 1.0 | 511.57 | 80 / 214 / 69 / 158 |
| B1 · 4h | 422.83 | 431.82 | 2.3% | 1.13 | 3.68 | 62.5% | 8 | 1.6 | 407.17 | 45 / 320 / 13 / 45 |

## Qualidade da previsão (grade diária, 24 h, sem sobreposição)

| Braço | Previsões | Acerto de direção | p (binomial) | Referência: persistência | Referência: sempre sobe | MAE / RMSE do retorno | MAE / RMSE da previsão zero | Spearman |
|---|---|---|---|---|---|---|---|---|
| B · 1h | 347 | 52.4% | 0.195 | 51.3% | 48.4% | 0.0180 / 0.0256 | 0.0162 / 0.0233 | 0.04 |
| B · 4h | 347 | 52.2% | 0.226 | 51.3% | 48.4% | 0.0186 / 0.0252 | 0.0162 / 0.0233 | 0.03 |
| C · 1h | 347 | 48.1% | 0.774 | 51.3% | 48.4% | 0.0287 / 0.0404 | 0.0162 / 0.0233 | -0.05 |
| C · 4h | 347 | 49.3% | 0.626 | 51.3% | 48.4% | 0.0226 / 0.0313 | 0.0162 / 0.0233 | -0.01 |
| B1 · 1h | 347 | 49.6% | 0.585 | 51.3% | 48.4% | 0.0198 / 0.0273 | 0.0162 / 0.0233 | 0.02 |
| B1 · 4h | 347 | 48.4% | 0.740 | 51.3% | 48.4% | 0.0227 / 0.0305 | 0.0162 / 0.0233 | -0.04 |

## Filtro de entrada, custo de cálculo e critérios

| Braço | Entradas consultadas / permitidas / vetadas | Previsões / rejeitadas | Segundos por previsão | Total (min) | Memória de pico (MB) | Critérios (P&L, 3 de 4 trimestres, custos dobrados, direção) |
|---|---|---|---|---|---|---|
| B · 1h | 79 / 3 / 76 | 448 / 0 | 13.28 | 99.2 | 0 | ❌ HIGHER_NET_PNL, ❌ HIGHER_IN_3_OF_4_QUARTERS, ❌ HIGHER_WITH_DOUBLED_COSTS, ❌ DIRECTION_ABOVE_CHANCE |
| B · 4h | 50 / 5 / 45 | 409 / 0 | 3.94 | 26.8 | 371 | ❌ HIGHER_NET_PNL, ❌ HIGHER_IN_3_OF_4_QUARTERS, ❌ HIGHER_WITH_DOUBLED_COSTS, ❌ DIRECTION_ABOVE_CHANCE |
| C · 1h | 96 / 1 / 95 | 448 / 0 | 52.79 | 394.1 | 912 | ❌ HIGHER_NET_PNL, ❌ HIGHER_IN_3_OF_4_QUARTERS, ❌ HIGHER_WITH_DOUBLED_COSTS, ❌ DIRECTION_ABOVE_CHANCE |
| C · 4h | 22 / 8 / 14 | 409 / 0 | 16.99 | 115.8 | 971 | ❌ HIGHER_NET_PNL, ❌ HIGHER_IN_3_OF_4_QUARTERS, ❌ HIGHER_WITH_DOUBLED_COSTS, ❌ DIRECTION_ABOVE_CHANCE |
| B1 · 1h | 36 / 5 / 31 | 448 / 0 | 3.89 | 29.0 | 350 | ❌ HIGHER_NET_PNL, ❌ HIGHER_IN_3_OF_4_QUARTERS, ❌ HIGHER_WITH_DOUBLED_COSTS, ❌ DIRECTION_ABOVE_CHANCE |
| B1 · 4h | 18 / 8 / 10 | 409 / 0 | 0.62 | 4.2 | 327 | ❌ HIGHER_NET_PNL, ❌ HIGHER_IN_3_OF_4_QUARTERS, ❌ HIGHER_WITH_DOUBLED_COSTS, ❌ DIRECTION_ABOVE_CHANCE |
| D · 1h | N/A nesta máquina: depende de mamba-ssm (CUDA/GPU NVIDIA); modelos publicados são diários | | | | | |
| D · 4h | N/A nesta máquina: depende de mamba-ssm (CUDA/GPU NVIDIA); modelos publicados são diários | | | | | |

## Classificações separadas

- Resultado ajustado ao risco (Sharpe): B1-1h > A > B1-4h > C-4h > B-4h > B-1h > C-1h
- Menor queda: C-1h > B-1h > B-4h > B1-1h > C-4h > A > B1-4h
- Trimestres positivos: A > B1-1h > B1-4h > C-4h > B-1h > B-4h > C-1h
- Menor custo de cálculo: A > B1-4h > B-4h > B1-1h > B-1h > C-4h > C-1h

## Proveniência

- Dataset (btc-1h.json): `07b248d2947b5f5c8bfe4a416897396481c3bb4f0e0a6878352496f16aa82518`
- B · 1h: NeoQuasar/Kronos-mini@f4e68697d9d5aed55cef5c96aabc3376bcad9f81, tokenizer NeoQuasar/Kronos-Tokenizer-2k@26966d0035065a0cae0ebad7af8ece35bc1fb51c, código 67b630e67f6a18c9e9be918d9b4337c960db1e9a, previsões `c0a9aee3d025f9eb36c190409b596b2bc7d7680bb8e70bd04db57c7ec771ce90`
- B · 4h: NeoQuasar/Kronos-mini@f4e68697d9d5aed55cef5c96aabc3376bcad9f81, tokenizer NeoQuasar/Kronos-Tokenizer-2k@26966d0035065a0cae0ebad7af8ece35bc1fb51c, código 67b630e67f6a18c9e9be918d9b4337c960db1e9a, previsões `94c791982a85d39555c97e11c972d29443ef00e33d5777fe7a701981a2dfa5a0`
- C · 1h: lc2004/kronos_base_model_BTCUSDT_1h_finetune@eb51e682c8194a1ba7254cc4357c75819683fbaf, tokenizer lc2004/kronos_tokenizer_base_BTCUSDT_1h_finetune@b8f1c795b80231f5bdeb69dfe71fc1542d2111fc, código 67b630e67f6a18c9e9be918d9b4337c960db1e9a, previsões `b4570ff5995ad569b42a2539a0ad2562324d3aefc77f6a0761530e922b3ca29d`
- C · 4h: lc2004/kronos_base_model_BTCUSDT_4h_finetune@e6c866f442cbeaf5bbbfab133465a71d2a1d102d, tokenizer lc2004/kronos_tokenizer_base_BTCUSDT_4h_finetune@a8e0a8984861056a0431c33494c2bb5689513e05, código 67b630e67f6a18c9e9be918d9b4337c960db1e9a, previsões `8ecd65b34432d74a064ffa89b4b7b9d5e1e488ab66de86737f21a31f71415eb9`
- B1 · 1h: NeoQuasar/Kronos-mini@f4e68697d9d5aed55cef5c96aabc3376bcad9f81, tokenizer NeoQuasar/Kronos-Tokenizer-2k@26966d0035065a0cae0ebad7af8ece35bc1fb51c, código 67b630e67f6a18c9e9be918d9b4337c960db1e9a, previsões `6462c76d6e0c5b475a7f7f0301b8a851edbaf5a06b0d68a2b00e76443c90f7e4`
- B1 · 4h: NeoQuasar/Kronos-mini@f4e68697d9d5aed55cef5c96aabc3376bcad9f81, tokenizer NeoQuasar/Kronos-Tokenizer-2k@26966d0035065a0cae0ebad7af8ece35bc1fb51c, código 67b630e67f6a18c9e9be918d9b4337c960db1e9a, previsões `850d356277c5e54aaebd6b861f758d10458cb20bf20a5780e23dab3892e6afc0`
