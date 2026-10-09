# Resultado COMBO_CARRY_MOM_V1: replay histórico (informativo)

Executado em 2026-10-09T15:39:42.068Z, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo `docs/PROTOCOLO_COMBO_CARRY_MOMENTUM.md` (commit `6a98ad3c55c95f137ef5989c4d34b39bdfb60808`), sem mudar nenhum critério. Este replay **não valida** a hipótese (ela foi escolhida depois de ver os resultados individuais, nos mesmos dados): só decide se vale acompanhar ao vivo.

**Teste de regressão do controle:** +55.06% contra +55.06% esperado, queda máxima 8.77% contra 8.77%: conferiu.

## Portão: **PROPOR_ACOMPANHAMENTO**

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| POSITIVE_PNL | sim |
| BOUNDED_DRAWDOWN | sim |
| POSITIVE_YEARS | sim |
| DOUBLED_COSTS_POSITIVE | sim |
| MARKET_NEUTRAL | sim |

## Combinação (2,5% por posição em cada livro) contra cada livro sozinho (5% por posição), 15 moedas, 2022 a out/2026

| | Retorno | Queda máx. | Sharpe anual | Anos + |
|---|---|---|---|---|
| **Combinação** | +52.43% | 10.44% | 1.22 | 4 de 4 |
| Momentum sozinho | +57.04% | 20.53% | 0.88 | 4 de 4 |
| Carry sozinho | +38.77% | 14.91% | 0.73 | 4 de 4 |

Com custos dobrados, a combinação rende 4428. Correlação horária com o mercado: -0.02. Correlação semanal: combinação com momentum 0.78, combinação com carry 0.65, momentum com carry 0.02. Cada livro a 2,5%: momentum +26.41%, carry +18.51%.

## Por ano (retorno / queda máxima no ano)

| | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| Combinação | +4.80% / 5.4% | +17.84% / 3.8% | +10.65% / 6.0% | +9.79% / 6.9% | +1.60% / 4.6% (parcial) |
| Momentum sozinho | +8.33% / 7.6% | +29.22% / 7.6% | +1.69% / 8.8% | +15.11% / 12.9% | -4.16% / 10.0% (parcial) |
| Carry sozinho | +0.13% / 10.2% | +6.24% / 10.4% | +18.82% / 7.7% | +3.10% / 13.1% | +6.49% / 8.2% (parcial) |

## Outro universo (informativo): 21 moedas do acompanhamento, 2025-09-12 a 2026-10-05

| | Retorno | Queda máx. | Sharpe anual |
|---|---|---|---|
| Combinação | +16.52% | 8.63% | 1.71 |
| Momentum sozinho | +18.32% | 12.72% | 1.27 |
| Carry sozinho | +12.94% | 7.19% | 1.11 |

Sharpe deflacionado da combinação (reportado, **fora do portão**, 9 tentativas): 0.112. Taxas 515, funding 649, giro 93.6x o capital, 249 rebalanceamentos, 945 posições encerradas. Comprar e segurar a cesta: +802.18% (universo de sobreviventes).

Hashes dos datasets (SHA-256):

- AAVEUSDT: `5c75caf4d74efe6153c47c9e5b188cc35f34acfcf2a7e60c1f0513360e792ef9`
- AVAXUSDT: `f76076da2b7e6dffd1d7dbcbb4755a6f33891b604c09f435cda5b1e9220ee78a`
- BCHUSDT: `1ac8e19392409f0bd4869d60ed847f2710969db5085ee8ef54b2a11b0fa10309`
- BTCUSDT: `a6756b85f3d38f119f54d5463fae2e211b3b4dad70b2fe49298a767e9e51cb3f`
- DOGEUSDT: `1f6b9e3c6f93fda50693dac022547b5701f4c826746c4ea4339ba4403b82431f`
- ETHUSDT: `f6678a6d21be22ee7909269c2998aacc9557ee82d06bb4d0983fcdc0bb56a9d5`
- FILUSDT: `d6859e338f81578af9086664342fa3718e7db1053449cc9803174f96cf57602c`
- LINKUSDT: `20c32307840788975be244299dd494898d306e6d1fc7afce282354542cd9e5e6`
- LTCUSDT: `21a62f5c1ce3fbfa16ee086fff727d956e8576ff7f270bc6690fd4d9cefeed8e`
- NEARUSDT: `c4418d34590e1766b4aa28a7a874b1d2a9a5083a3eb9457e77cbf9f0692ab0c0`
- SOLUSDT: `3c74a9c67af35b5efde186d51f78f24bb4794d4ba65d23f7bde7472bb99a8c2e`
- UNIUSDT: `8ab5a79322a81874b5b65d2c80b34b9ae099b88fa8654a82c5845a2bc7cb2f3e`
- XLMUSDT: `325dec8c4f2a539e910422168d2ab9eeb8942e83f34005de1cae1032b33e1b9c`
- XRPUSDT: `e630685f5e889cb5e6b781b9e26dca8ba9dbee1028cdc752c1e8df8e5fe189f4`
- ZECUSDT: `379584390df97a543757720dab716d7809d8732f1dccabee23097f8c2a86acc8`

## Leitura honesta

- **Passou no portão, e o portão é só "vale acompanhar".** Os seis critérios deram sim. Isso não valida nada: a combinação foi escolhida depois de ver os resultados individuais, nos mesmos preços.
- **O que a combinação mudou, nos números:** queda máxima de 10,4%, contra 20,5% do momentum sozinho, com retorno parecido (+52,4% contra +57,0%) e Sharpe anual de 1,22 contra 0,88. Os quatro anos completos ficaram positivos, e o pior ano foi +4,8% (2022). Em 2026 (parcial), enquanto o momentum sozinho está em −4,2%, a combinação está em +1,6%. Era essa a hipótese: dois sinais que erram em momentos diferentes (correlação semanal de 0,02) suavizam a curva.
- **Verificação em outro universo (21 moedas, 12/09/2025 a 05/10/2026, cerca de 13 meses; a janela do protocolo começa em 15/08, mas as primeiras 672 h são só o histórico para o sinal de momentum):** o mesmo padrão, com queda máxima de 8,6% contra 12,7%. É informativa e repete em boa parte os mesmos preços do período principal.
- **Sharpe deflacionado: 0,112.** Longe de qualquer barra. Fora do portão por decisão pré-declarada, mas diz que, contando as 9 tentativas, o resultado ainda cabe no acaso. Não aumenta a confiança.
- **Giro alto:** 93,6 vezes o capital em 4,8 anos. As taxas somaram 515 e o resultado seguiu positivo com custos dobrados (+4 428), mas é o ponto mais sensível a uma piora de execução real.
- **Limites que continuam valendo:** universo de sobreviventes (comprar e segurar a cesta rendeu +802%, então a vantagem em relação a isso é nenhuma; esta é uma estratégia de mercado neutro, não concorrente da cesta), vendas a descoberto sem custo de empréstimo, mesmos dados vistos em estudos anteriores.
- **Próximo passo, conforme o protocolo:** acompanhamento ao vivo por `npx tsx scripts/estudos/combo.ts --forward`, com a primeira decisão no fechamento da vela de 13/10/2026 02:00 UTC (execução 03:00), 11 semanas, parada em 15% de queda máxima. Até lá o script responde "aguardando o início". Onze semanas dão evidência fraca mesmo se aprovar.
