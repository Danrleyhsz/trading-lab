# Relatório final: KRONOS_AB_V1 (BTC, etapa 1)

Formato pedido em `docs/KRONOS_AB_EXPERIMENT.md` ("Claude final report format"). Só pesquisa histórica offline: nenhum modelo tem autoridade de ordem, e nada aqui toca o piloto, o XSMOM_FORWARD_V1, contas ou corretora. **Sem merge e sem deploy: aguarda revisão humana.**

## Recomendação

**Manter só a base (rejeitar os braços do Kronos nesta forma).**

Nenhum braço passou em nenhum dos quatro critérios declarados antes:
- P&L líquido maior que a base;
- maior em 3 de 4 trimestres;
- maior com custos dobrados;
- acerto de direção acima do acaso com p < 0,05.

Nenhum modelo mostrou habilidade de prever a direção em 24 h:
- o acerto ficou entre 48,1% e 52,4%, com p de 0,195 a 0,774;
- o erro médio de todos foi **pior** que o de prever "zero de variação".

Não recomendo continuar pesquisa no Kronos original nem no ajuste de BTC com este uso, que é um filtro de entrada da estratégia do piloto. O CryptoMamba (D) ficou N/A nesta máquina, sem resultado a favor ou contra.

## 1. Branch, commit e arquivos

- Branch: `feat/kronos-ab`.
- Código do experimento: commit `8b17658`. Os resultados entram no commit seguinte, que traz este relatório.
- Arquivos do experimento:
  - `experiments/kronos/`: `PROTOCOLO_KRONOS_AB_V1.md` com a Emenda 1, `README.md`, `requirements.txt`, `configs/kronos_ab_v1.json`, `lib.ts`;
  - `scripts/`: `prepare.ts`, `forecast.py`, `evaluate.ts`, `test_forecast.py`;
  - `results/`: 6 arquivos de previsão, `comparison-v1.json`, `RELATORIO_KRONOS_AB_V1.md`, `data-manifest.json`.
- Mudança fora do experimento: `src/domain/perpetual-backtest.ts`.
  - Ganhou a opção `entryAdvisory`, que **só pode vetar a abertura** de posição.
  - Sem a opção, o simulador é idêntico, e o controle com o Kronos desligado reproduz a base.
- Testes: `test/kronos-experiment.test.ts` e `experiments/kronos/scripts/test_forecast.py`.

## 2. Comandos executados

```bash
npx tsx experiments/kronos/scripts/prepare.ts
```

```bash
cd experiments/kronos && HF_HUB_OFFLINE=1 HF_HUB_DISABLE_XET=1 .venv/Scripts/python scripts/forecast.py --arm B --timeframe 1h
```

O mesmo comando de previsão foi repetido para `B 4h`, `C 1h`, `C 4h`, `B1 1h` e `B1 4h`.

```bash
npx tsx experiments/kronos/scripts/evaluate.ts
```

Ambiente: Python 3.14.6, torch 2.14.1+cpu, 2 threads, sem GPU. Os pesos ficam no cache local (`experiments/kronos/.cache`, fora do Git). O download foi autorizado pelo dono.

## 3. Testes e CI

| Conjunto | Resultado |
|---|---|
| `test/kronos-experiment.test.ts` | 7 de 7 |
| `test_forecast.py` | 5 de 5 |
| Suíte completa e CI | registrados no PR, depois de atualizar o branch com a `main` |

## 4. Dados e hashes

| Item | Valor |
|---|---|
| Fonte | Binance USD-M BTCUSDT 1h (negócios) + funding; cache `carry-BTCUSDT.json`, sha256 `3af7d2fc…` |
| Velas | 41.736 de 1h e 10.434 de 4h, sem horas preenchidas |
| `btc-1h.json` | `07b248d2947b5f5c8bfe4a416897396481c3bb4f0e0a6878352496f16aa82518` |
| `btc-4h.json` | `b4adedb9d464fab6e317eedfb54eeb3794040129c37b5fffea8ca985ce4479d0` |
| `origins.json` | `9d6974f2…` (448 origens de 1h e 409 de 4h) |
| Janela de avaliação | 24/10/2025 a 05/10/2026, posterior a todos os pesos usados |

## 5. Modelos (revisões fixadas)

| Braço | Modelo | Tokenizer | Amostragem |
|---|---|---|---|
| B (Kronos original) | `NeoQuasar/Kronos-mini@f4e68697` | `NeoQuasar/Kronos-Tokenizer-2k@26966d00` | T 1, top-p 0,9, 5 caminhos |
| C · 1h (ajuste BTC) | `lc2004/kronos_base_model_BTCUSDT_1h_finetune@eb51e682` | `…_1h_finetune@b8f1c795` | 1 caminho (Emenda 1) |
| C · 4h (ajuste BTC) | `lc2004/kronos_base_model_BTCUSDT_4h_finetune@e6c866f4` | `…_4h_finetune@a8e0a898` | 1 caminho (Emenda 1) |
| B1 (sensibilidade) | o mesmo do B | o mesmo do B | 1 caminho; **fora da decisão** |

- Código do Kronos: `67b630e6`.
- Semente por origem: hora mod 2.147.483.647.
- O hash de cada arquivo de previsão está em `results/RELATORIO_KRONOS_AB_V1.md`.

## 6. Base, braços e diferença

Estratégia do piloto (BREAKOUT 480 h, 10% do capital, taxa de 0,055%, slippage de 1 bp, capital simulado de 10.000), mesma janela e mesmos custos:

| Braço | P&L líquido | Diferença para a base | Bruto | Queda máx. | Sharpe | Fator de lucro | Operações | Giro | Custos dobrados |
|---|---|---|---|---|---|---|---|---|---|
| **A · base** | **564,18** | — | 573,19 | 2,1% | 1,48 | 4,64 | 8 | 1,6× | 548,36 |
| B · 1h | 117,04 | −447,14 | 120,33 | 1,5% | 0,48 | 6,92 | 3 | 0,6× | 111,34 |
| B · 4h | 188,34 | −375,84 | 193,68 | 1,5% | 0,72 | 2,38 | 5 | 1,0× | 179,06 |
| C · 1h | −51,26 | −615,44 | −50,18 | 0,9% | −0,75 | 0,00 | 1 | 0,2× | −53,11 |
| C · 4h | 388,66 | −175,52 | 397,59 | 2,0% | 1,07 | 3,38 | 8 | 1,6× | 373,04 |
| B1 · 1h (sensib.) | 521,15 | −43,03 | 526,59 | 1,9% | 1,62 | 10,88 | 5 | 1,0× | 511,57 |
| B1 · 4h (sensib.) | 422,83 | −141,35 | 431,82 | 2,3% | 1,13 | 3,68 | 8 | 1,6× | 407,17 |

Qualidade da previsão: grade diária de 24 h sem sobreposição, 347 previsões por braço.

| Braço | Acerto de direção | p | MAE do retorno | MAE da previsão zero | Spearman |
|---|---|---|---|---|---|
| B · 1h | 52,4% | 0,195 | 0,0180 | 0,0162 | 0,04 |
| B · 4h | 52,2% | 0,226 | 0,0186 | 0,0162 | 0,03 |
| C · 1h | 48,1% | 0,774 | 0,0287 | 0,0162 | −0,05 |
| C · 4h | 49,3% | 0,626 | 0,0226 | 0,0162 | −0,01 |
| B1 · 1h | 49,6% | 0,585 | 0,0198 | 0,0162 | 0,02 |
| B1 · 4h | 48,4% | 0,740 | 0,0227 | 0,0162 | −0,04 |

Para comparar, a persistência acertaria 51,3%, e "sempre sobe" acertaria 48,4%.

Custo de cálculo:

| Braço | Segundos por previsão | Pico de memória |
|---|---|---|
| B · 1h | 13,3 | 0 MB registrado, por erro de medição (ver limites) |
| B · 4h | 3,9 | 371 MB |
| C · 1h | 52,8 | 912 MB |
| C · 4h | 17,0 | 971 MB |
| B1 · 1h | 3,9 | 350 MB |
| B1 · 4h | 0,6 | 327 MB |

A base não tem custo de modelo.

**Leitura:**
- **O filtro só funciona vetando.** O Kronos vetou a maioria das entradas que a base faria: 76 de 79 no B-1h e 95 de 96 no C-1h. Com isso o P&L encolhe, e o filtro não escolhe melhor as entradas.
- **Um mecanismo visível:** depois de rompimentos, o Kronos tende a prever reversão, de cerca de −2,4% no B. Isso contradiz a estratégia de rompimento, sem acertar mais do que o acaso.
- **O B1-1h teve Sharpe maior (1,62 contra 1,48):**
  - ganhou menos dinheiro (521 contra 564);
  - é braço de sensibilidade, fora da decisão por declaração prévia;
  - o acerto de direção dele (49,6%) não difere do acaso.
- Não é sinal de habilidade.

## 7. Robustez (lista do `docs/KRONOS_AB_EXPERIMENT.md`)

| # | Checagem | Situação |
|---|---|---|
| 1 | Avaliação cronológica | Janela única posterior a todos os pesos, com resultado por trimestre. O filtro é fixo, sem calibração, então não há reajuste por janela. |
| 2 | Regimes | Só por trimestre. Não houve separação explícita de regime (limite). |
| 3 | Custos acima da base | Taxa de 0,11% e slippage de 5 bps em todos os braços. Nenhum supera a base. |
| 4 | Kronos desligado reproduz a base | Sim: mesma trilha de auditoria e mesmo P&L (teste e avaliação). |
| 5 | Determinismo | Teste com mesma semente → mesma previsão. Evidência a mais: 326 origens do B1-1h calculadas duas vezes por acidente deram resultados idênticos (seção 8). |
| 6 | Dados ausentes ou inválidos | Teste `test_rejects_invalid_input`. |
| 7 | Modelo indisponível falha fechado | Teste `test_unavailable_model_fails_closed` (saída 2, `MODEL_UNAVAILABLE`). |
| 8 | Vazamento | O contexto termina na origem, velas futuras não mudam a previsão, e a previsão consultada termina antes da execução (testes Python e TS). |
| 9 | Nenhum evento de corretora ou ordem | Teste de isolamento: o código não importa corretora, contas, ordens nem credenciais. |

## 8. Limites conhecidos e incidentes

- **CryptoMamba (D):** N/A. Depende de `mamba-ssm` (CUDA/GPU NVIDIA), e os modelos publicados são diários. Nada foi adaptado para preencher a tabela.
- **Emenda 1:** declarada antes de qualquer previsão do braço C. O C e a sensibilidade B1 usam 1 caminho por custo de cálculo (o C leva cerca de 50 s por previsão em CPU).
- **Pico de memória do B-1h registrado como 0:** foi um erro de medição, corrigido antes dos outros braços. O sistema operacional mediu cerca de 385 MB durante a rodada.
- **Uma previsão de teste de velocidade** foi feita antes da rodada oficial, fora dos arquivos de resultado.
- **Rodadas duplicadas do B1:**
  - **O que aconteceu:** quando a sessão anterior encerrou, o laço que encadeava as rodadas continuou vivo, e um novo encadeamento também começou o B1. As duas cópias gravaram no mesmo arquivo: 653 linhas para 330 origens, e 6 linhas para 3 origens no B1-4h.
  - **Conferência:** todas as 326 duplicatas eram **idênticas** (mesma previsão, mesma semente).
  - **Correção:** as duas cadeias foram paradas, cada arquivo ficou com uma linha por origem (a primeira) e o B1 rodou de novo uma única vez, completando 448 e 409.
  - **Efeitos:** os arquivos B e C nunca tiveram duplicata. Os tempos por previsão do B1-1h incluem o período com as duas cópias concorrendo pela CPU.
- **Dependência entre previsões:** são sobrepostas na grade de 1h, e a qualidade de direção usa a grade diária sem sobreposição para não inflar a amostra.
- **Escopo:** um ativo (BTC), uma estratégia (a do piloto) e um uso (filtro de entrada). Isso não diz nada sobre o Kronos em outros usos ou outros ativos.

## 9. Kronos mostrou valor incremental?

**Não.** Pela regra declarada, nenhum braço supera a base em P&L, em trimestres, com custos dobrados nem em direção. A recomendação é **rejeitar** e manter a base. Um próximo experimento só faz sentido com outra hipótese, declarada antes; não ajustar este até dar lucro.
