# Teste da cesta de tendência · TREND_BASKET_V1

> **Correção de cálculo antes do resultado final:** a primeira execução somou a equity das moedas por instante exato, e a simulação grava vários pontos por hora em instantes que variam entre moedas. Isso contou moedas duas vezes em algumas horas e deixou outras de fora, gerando números impossíveis (+80% com queda de 93%). A curva passou a usar o último ponto de cada hora, o mesmo critério de `hourlyReturns`, e o script confere que o P&L da cesta é a média das moedas. Regras, dados e critérios não mudaram.

Executado em 2026-10-06T00:27:32.196Z, fora do servidor, com dados públicos da Binance USD-M. Período não visto: as 5000 velas de 1 hora terminadas em 2026-03-11T14:00:00.000Z. Protocolo: `docs/PROTOCOLO_CESTA_TENDENCIA.md` (registrado antes da execução).

## Leitura do resultado (registrada depois da execução, sem mudar critério)

- **As duas hipóteses foram reprovadas.** No período não visto (15/08/2025 a 11/03/2026), a cesta de tendência ficou praticamente no zero: −0,22% (SMA) e −0,13% (rompimento protegido). Lucro em só 8 e 10 de 21 moedas, e positiva em só 2 e 3 de 7 janelas.
- **O padrão do estudo anterior não se repetiu.** Lá, a tendência lenta lucrou em 15 de 21 moedas num mercado de alta. Aqui, num mercado de queda (comprar e segurar a cesta perdeu 46,3%), ela não lucrou. O que pareceu vantagem era, ao menos em boa parte, o regime de alta daquele trecho.
- **O que funcionou:** a estratégia protegeu o capital. Enquanto a cesta caiu 46%, o pior drawdown foi de 2,8%, sem nenhuma liquidação. Proteção não é lucro, mas é um comportamento útil.
- **Conforme o protocolo:** a hipótese TREND_BASKET_V1 está encerrada e não será repetida com outros parâmetros, moedas ou períodos para forçar aprovação.

| Hipótese | P&L (10 000) | Retorno | Comprar e segurar a cesta | Operações | Pior DD | Janelas + | Moedas + | Sharpe anual | Sharpe deflac. | Resultado |
|---|---|---|---|---|---|---|---|---|---|---|
| CESTA_TENDENCIA_SMA (MULTI_DAY_TREND_V1) | -21.72 | -0.22% | -46.33% | 369 | 2.71% | 2/7 | 8/21 | -0.11 | 0.47 | reprovada: POSITIVE_BASKET_PNL, POSITIVE_FOLDS, BREADTH, DEFLATED_SHARPE |
| CESTA_ROMPIMENTO_PROTEGIDO (BREAKOUT_480_PROTECTED_V1) | -12.67 | -0.13% | -46.33% | 152 | 2.78% | 3/7 | 10/21 | -0.07 | 0.48 | reprovada: POSITIVE_BASKET_PNL, POSITIVE_FOLDS, BREADTH, DEFLATED_SHARPE |

## CESTA_TENDENCIA_SMA: por janela e por moeda

janela 1: +0.82% · janela 2: -0.20% · janela 3: -0.73% · janela 4: -0.82% · janela 5: -0.43% · janela 6: +1.91% · janela 7: -0.76%

| Moeda | Retorno | Comprar e segurar | Operações |
|---|---|---|---|
| ZECUSDT | +20.59% | -2.79% | 13 |
| ONDOUSDT | +7.40% | -65.07% | 9 |
| WLDUSDT | +2.94% | -60.61% | 17 |
| UNIUSDT | +2.71% | -38.44% | 17 |
| AVAXUSDT | +2.41% | -54.06% | 18 |
| BTCUSDT | +1.62% | -35.05% | 13 |
| 1000PEPEUSDT | +1.56% | -51.96% | 19 |
| TAOUSDT | +1.07% | -50.06% | 17 |
| ETHUSDT | -0.05% | -47.18% | 21 |
| NEARUSDT | -0.22% | -41.94% | 12 |
| SUIUSDT | -0.56% | -62.41% | 19 |
| XLMUSDT | -1.67% | -49.21% | 20 |
| BCHUSDT | -2.61% | -11.00% | 17 |
| DOGEUSDT | -2.77% | -50.95% | 21 |
| LINKUSDT | -3.12% | -48.77% | 16 |
| XRPUSDT | -3.16% | -40.79% | 22 |
| LTCUSDT | -4.28% | -40.30% | 20 |
| AAVEUSDT | -4.73% | -52.54% | 20 |
| FILUSDT | -5.95% | -41.40% | 16 |
| SOLUSDT | -6.31% | -54.29% | 25 |
| ENAUSDT | -9.43% | -74.17% | 17 |

## CESTA_ROMPIMENTO_PROTEGIDO: por janela e por moeda

janela 1: +0.61% · janela 2: -0.23% · janela 3: +0.27% · janela 4: -1.29% · janela 5: -0.69% · janela 6: +1.58% · janela 7: -0.37%

| Moeda | Retorno | Comprar e segurar | Operações |
|---|---|---|---|
| ZECUSDT | +8.05% | -2.79% | 7 |
| SUIUSDT | +4.88% | -62.41% | 6 |
| UNIUSDT | +3.14% | -38.44% | 6 |
| ENAUSDT | +2.37% | -74.17% | 8 |
| BTCUSDT | +1.50% | -35.05% | 7 |
| 1000PEPEUSDT | +0.78% | -51.96% | 8 |
| XLMUSDT | +0.67% | -49.21% | 7 |
| ONDOUSDT | +0.61% | -65.07% | 7 |
| DOGEUSDT | +0.26% | -50.95% | 7 |
| AVAXUSDT | +0.05% | -54.06% | 8 |
| XRPUSDT | -0.25% | -40.79% | 7 |
| ETHUSDT | -0.29% | -47.18% | 8 |
| SOLUSDT | -0.73% | -54.29% | 8 |
| LINKUSDT | -1.11% | -48.77% | 8 |
| TAOUSDT | -1.16% | -50.06% | 6 |
| NEARUSDT | -1.25% | -41.94% | 8 |
| BCHUSDT | -1.55% | -11.00% | 7 |
| LTCUSDT | -1.65% | -40.30% | 7 |
| FILUSDT | -1.75% | -41.40% | 7 |
| AAVEUSDT | -3.06% | -52.54% | 6 |
| WLDUSDT | -12.17% | -60.61% | 9 |

Hashes dos datasets (SHA-256):

- ENAUSDT: `a880fb5b4fbdd7ce7d777ba533ca4d702e89841d2b7269f5488e888de40fbe79`
- ZECUSDT: `a101d4ad59fb0b2799bcf97fbdeb4fe9e516208aa89e318ada807d8b2e9b2e2d`
- WLDUSDT: `44f9a1da20e4f0e7f983d49fe80df2feb0ab56c0248293331e282c675a496fde`
- NEARUSDT: `1a31cf45c57e978d45730cc17358a792447261ed47b9f440d1756fd600d61b35`
- UNIUSDT: `50e528290adca8543ed59d796c10b4179a001dc26d4265c3d1659f6c157538f3`
- ONDOUSDT: `28f74a093653d2ea1c45b7a060d788774e68f96746a1f57fd1a4e6d32dc8029a`
- 1000PEPEUSDT: `abadccdc9eac71a5edb2b802807c8d9680cb6cd6148db768b674aa5e8a00142f`
- BCHUSDT: `576a3350704b9c574db0319f0f0853761c39e12c35d81fa56852eea6a74693fe`
- FILUSDT: `d8896cc0eaa04fe02308c89d782af969e72a544719a01c5741c852adf8156f40`
- AAVEUSDT: `0a32203e69b0ccb6e60fa206c6eeeba6959eeefaacd63fb920130c65b8991679`
- SUIUSDT: `4afbbb2e38159fc90362ac7e14382753092d7961b4dac1d26badb1e81d7e0446`
- TAOUSDT: `ec243f6fecadc24f4eef4514a9e17e01f50eaf894824c564df304b8179b3bb9e`
- AVAXUSDT: `9edce2aaf2d52e234b01655a070b0d0cc8b00a820e0083e0946d29063d19350f`
- LINKUSDT: `5e5ce4e1609d15701ea1d11b6daf13708ac04e5e5dd91f1de9ea0865206cebf3`
- XRPUSDT: `f2e61c0a63e3c530e4ca25b426125004561341ba3658e588c70c1009b1533a29`
- XLMUSDT: `24b97b4f7951c2f9d1b0de4e2754dc3453cb1e6c71306fa536c360fe1c062760`
- DOGEUSDT: `576e3e6eb2f27219b2d1e907e367e134b779147c98fcb40deba7a12b7dac7a25`
- SOLUSDT: `84658e671e5afd6009d97bb9a8bd6d9c5a9eea96fccf6419a72e3771caeb947e`
- LTCUSDT: `3513ae21497dbad85d4a8136a32db67c932193f1d9874ebcc6ccb50745fd6b6b`
- ETHUSDT: `4fb4e6e4e59449cc145eaba2368eb56d48f7d8cc20b0e1995c3013b04d189ed9`
- BTCUSDT: `7a834fa5c7e2fdfcee4a2820eef21f97b15e5e8b6bbff80e92f1e00c30da1fd2`
