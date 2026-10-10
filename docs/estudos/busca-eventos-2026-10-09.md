# Resultado BUSCA_EVENTOS_V1: três famílias novas no pool completo

Executado em 2026-10-10T02:25:45.329Z, fora do servidor, com dados públicos da Binance USD-M já baixados, pelo protocolo `docs/PROTOCOLO_BUSCA_EVENTOS_V1.md` (commit `be464c958660270562981428ee64c82dcdd4e32c`), sem mudar nenhum critério. Pool: 543 perpétuas utilizáveis.

| Família | Veredito |
|---|---|
| B · NEW_LISTING_FADE_V1 (vender listagens novas) | **NAO_VALIDADA** |
| C · FUNDING_EXTREME_REVERSAL_V1 (reverter funding extremo) | **NAO_VALIDADA** |
| A · XS_CARRY_PIT_V1 (carry direcional, universo ponto no tempo) | **NAO_VALIDADA** |

## Família B · vender listagens novas (entrada 7 dias depois da listagem, saída em 28 dias, 1% por evento, stop em +50%)

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| ENOUGH_EVENTS | sim |
| SIGNIFICANT_MEAN | não |
| POSITIVE_YEARS | não |
| COSTS_X3 | sim |
| BOUNDED_DRAWDOWN | sim |

| Medida | Valor |
|---|---|
| Eventos executados (pulados por limite de exposição) | 398 (0) |
| Média líquida por evento (t agrupado por mês) | +2.72% (t = 0.90, 41 meses) |
| Mediana / taxa de acerto | +11.25% / 64% |
| Pior / melhor evento | -156.20% / +85.37% |
| Média sem o pior e o melhor 1% | +3.03% |
| Média com custos x3 | +2.11% |
| Stops acionados | 92 |
| Funding médio por evento (em dinheiro) | -0.02 |
| Carteira simulada: retorno / queda máx. / patrimônio mínimo | +10.44% / 11.0% / 9650 |
| Média por evento com hedge de BTC (sem funding do BTC) | +7.34% |

Por ano: 2021: 1 eventos, +57.72%; 2022: 21 eventos, +17.68%; 2023: 93 eventos, -0.88%; 2024: 129 eventos, -0.81%; 2025: 154 eventos, +5.45%.

| Variante | Eventos | Média | t | Mediana | Média x3 | Carteira | Queda máx. |
|---|---|---|---|---|---|---|---|
| Entrada em 3 dias | 402 | +4.14% | 1.09 | +14.20% | +3.54% | +16.76% | 9.9% |
| Entrada em 14 dias | 393 | +1.12% | 0.32 | +8.27% | +0.50% | +3.33% | 13.4% |
| Saída em 14 dias | 398 | +3.47% | 1.43 | +10.31% | +2.87% | +14.32% | 7.0% |
| Saída em 56 dias | 398 | +3.15% | 0.83 | +14.86% | +2.54% | +10.92% | 17.1% |

Maiores perdas por moeda: TUT -171, CYBER -125, AIO -91, IP -88, BANK -88. Maiores ganhos: ZEREBRO 88, MUBARAK 87, ZKJ 86, AI16Z 84, VINE 83 (em USDT, sobre 10 000).

## Família C · reverter funding extremo (±0,10%, 24 h, 0,5% por evento, stop em 30%)

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| ENOUGH_EVENTS | sim |
| SIGNIFICANT_MEAN | não |
| POSITIVE_YEARS | não |
| COSTS_X3 | não |
| BOUNDED_DRAWDOWN | sim |

| Medida | Valor |
|---|---|
| Eventos executados (pulados por limite de exposição) | 13327 (151) |
| Média líquida por evento (t agrupado por mês) | +0.25% (t = 1.28, 58 meses) |
| Mediana / taxa de acerto | -0.74% / 45% |
| Pior / melhor evento | -139.52% / +478.76% |
| Média sem o pior e o melhor 1% | -0.17% |
| Média com custos x3 | -0.17% |
| Stops acionados | 306 |
| Funding médio por evento (em dinheiro) | 0.53 |
| Carteira simulada: retorno / queda máx. / patrimônio mínimo | +17.25% / 10.5% / 9873 |
| Média por evento com hedge de BTC (sem funding do BTC) | +0.11% |

Por ano: 2022: 1051 eventos, +0.88%; 2023: 927 eventos, +0.32%; 2024: 1653 eventos, +0.36%; 2025: 5371 eventos, +0.38%; 2026: 4325 eventos, -0.12%.

| Variante | Eventos | Média | t | Mediana | Média x3 | Carteira | Queda máx. |
|---|---|---|---|---|---|---|---|
| Só vendas (funding alto) | 2551 | +0.05% | 0.23 | +0.95% | -0.37% | +0.55% | 8.3% |
| Só compras (funding muito negativo) | 10918 | +0.31% | 1.25 | -1.13% | -0.11% | +17.53% | 12.2% |
| Limite de ±0,05% | 32552 | -0.03% | -0.30 | -0.34% | -0.45% | -6.58% | 20.9% |
| Limite de ±0,20% | 6068 | +0.55% | 1.61 | -1.46% | +0.13% | +17.66% | 8.1% |

Maiores perdas por moeda: BROCCOLIF3B -166, TAC -128, LA -117, AXL -116, ESPORTS -115. Maiores ganhos: LSK 349, M 272, ALPACA 263, SYN 200, FUN 168.

## Família A · carry direcional entre moedas, universo ponto no tempo de 30 (2,5% por posição)

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| POSITIVE_PNL | não |
| BOUNDED_DRAWDOWN | não |
| POSITIVE_YEARS | não |
| DOUBLED_COSTS_POSITIVE | não |
| MARKET_NEUTRAL | sim |
| BOTH_HALVES_POSITIVE | não |

| Medida | Valor |
|---|---|
| Retorno / queda máxima | -37.83% / 62.5% |
| Sharpe anual / anos positivos (de 4) | -0.43 / 2 |
| Com custos dobrados (USDT) | -4082 |
| Correlação com a cesta do universo | -0.06 |
| Primeira / segunda metade (USDT) | 1443 / -5226 |
| Taxas / funding em caixa | 356 / 1556 |
| Com 5% por posição | -101.76% (queda 104.9%) |
| Controle: momentum no mesmo universo (`PIT_COMPLETO_V1`) | -46.45% |

| | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| Carry direcional | -0.90% / 8.2% | +9.19% / 5.7% | +17.41% / 6.5% | -51.98% / 62.5% | +1.90% / 14.5% (parcial) |

## Leitura honesta

- **As três famílias ficam `NAO_VALIDADA`.** Nenhuma passou a barra de t ≥ 3,0 (ou os 7 critérios, no caso do carry).
- **B · vender listagens novas.** 398 eventos de 2022 a 2025. Média líquida de **+2,7% por evento** em 28 dias, mas com **t = 0,90** (não significativa), e a distribuição é assimétrica: **mediana de +11,3%**, taxa de acerto de 64%, e uma cauda esquerda pesada (pior evento −156% do valor vendido; 92 stops). Por ano: +17,7% (21 eventos em 2022), −0,9% (93 em 2023), −0,8% (129 em 2024) e +5,5% (154 em 2025). A carteira simulada com 1% por evento rendeu +10,4% em quatro anos com queda máxima de 11%, e continua positiva com custos triplicados (+2,1% por evento). Reprovou em `SIGNIFICANT_MEAN` e `POSITIVE_YEARS`.
- **O padrão existe, mas é fraco e arriscado.** A maioria das listagens cai depois dos primeiros dias, e é por isso que a mediana é boa; a média é puxada para baixo por poucas que disparam (TUT, CYBER, AIO, IP, BANK estão entre as maiores perdas) e pelo stop em fechamento horário, que deixa passar picos dentro da hora. Com hedge de BTC (comprando BTC no mesmo valor, sem contar o funding do BTC), a média por evento sobe para **+7,3%**: boa parte do prejuízo de 2023 e 2024 era a alta do mercado. Isto é informativo e não conta no veredito.
- **C · reverter funding extremo.** 13 327 eventos. Média líquida de **+0,25%** em 24 h, **t = 1,28**, mediana −0,74%, acerto de 45%; com custos triplicados vira −0,17%. O lado vendido (funding muito alto) é indistinguível de zero (t = 0,23); o lado comprado (funding muito negativo) rende +0,31% por evento, mas com mediana negativa. Em 2026 a média é negativa. Reprovou em significância, anos e custos.
- **A · carry direcional no universo ponto no tempo.** **−37,8%**, queda máxima de 62,5%, Sharpe −0,43; com 5% por posição o patrimônio vai a zero. É o mesmo mecanismo do momentum: vender moedas com funding muito alto, que são as que estão disparando, e levar squeezes (as maiores perdas vêm de moedas pequenas e novas). **Carry direcional e combinação carry + momentum ficam encerrados.**
- **Estado após 21 tentativas:** nenhuma família de sinal de preço ou de eventos nos dados de 2022 a 2026 passa uma barra estatística razoável. O que existe é um **padrão de listagens novas** com mediana boa e cauda ruim (e um prêmio vs. BTC de cerca de 7% por evento, informativo), e o **carry delta-neutro** de baixo risco e retorno baixo.
- **Limites:** stops em fechamento horário; slippage de 10 bps para listagens novas é suposição; eventos agrupados no tempo (há 21 de 2022 contra 154 de 2025); mesmo período do calendário.

## O que ainda daria uma resposta nova

- **Listagens de 2020 e 2021:** os dados de listagem anteriores a 12/2021 nunca foram usados (cerca de 110 eventos: 66 em 2020 e 45 em 2021). Uma versão da família B com hedge de BTC pode ser declarada antes e testada nelas, que são eventos **não vistos**. O poder é baixo (cerca de 110 eventos), então só passaria com um efeito grande, mas é a única forma de dar a esta ideia um passado limpo.
