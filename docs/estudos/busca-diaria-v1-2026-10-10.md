# Resultado BUSCA_DIARIA_V1: regras compradas-ou-fora por moeda, velas diárias à vista, 2017 a 2026

Executado em 2026-10-10T12:03:01.486Z, fora do servidor, com velas diárias públicas da Binance, pelo protocolo `docs/PROTOCOLO_BUSCA_DIARIA_V1.md` (commit `71904acf9c283030ec198e24265e4895e213d645`), sem mudar nenhum critério. 712 pares USDT, 695 não atrelados ao dólar (199 já retirados da corretora), de 2017-08-17 a 2026-10-10. Custo de 20 bps por lado; células "retorno / Sharpe / queda máxima".

## Veredito por regra

| Regra | Veredito | Reprovou em |
|---|---|---|
| SMA20 | **NAO_VALIDADA** | POSITIVE_NET, BOUNDED_DRAWDOWN, SHARPE_BAR, BREADTH, COSTS_X2, UNIVERSE_HALVES |
| SMA50 | **NAO_VALIDADA** | POSITIVE_NET, BOUNDED_DRAWDOWN, SHARPE_BAR, BREADTH, COSTS_X2, UNIVERSE_HALVES |
| SMA100 | **NAO_VALIDADA** | POSITIVE_NET, BOUNDED_DRAWDOWN, SHARPE_BAR, BREADTH, COSTS_X2, UNIVERSE_HALVES |
| DONCHIAN_55_20 | **NAO_VALIDADA** | POSITIVE_NET, BOUNDED_DRAWDOWN, SHARPE_BAR, BREADTH, COSTS_X2, UNIVERSE_HALVES |
| TSMOM90 | **NAO_VALIDADA** | POSITIVE_NET, BOUNDED_DRAWDOWN, SHARPE_BAR, BREADTH, COSTS_X2, UNIVERSE_HALVES |

## Carteira (peso igual entre moedas elegíveis; fora do mercado quando o sinal é de venda)

| | Período inteiro | 2017 a 2021 | 2022 a 2026 |
|---|---|---|---|
| **Cesta comprada e segura** (benchmark) | +67.6% / 0.51 / 94.5% | +1537.5% / 1.15 / 89.9% | -90.2% / -0.28 / 93.3% |
| BTC comprado e seguro | +1154.5% / 0.75 / 83.2% | +601.6% / 0.97 / 83.2% | +72.8% / 0.48 / 67.0% |
| SMA20 | +2342.7% / 0.95 / 71.4% | +4156.7% / 1.73 / 48.5% | -43.7% / -0.15 / 71.4% |
| SMA50 | +3803.4% / 1.05 / 63.9% | +4910.0% / 1.75 / 54.3% | -22.8% / 0.02 / 63.9% |
| SMA100 | +1177.1% / 0.80 / 68.9% | +2021.8% / 1.40 / 47.1% | -40.3% / -0.15 / 67.9% |
| DONCHIAN_55_20 | +1791.3% / 0.96 / 52.6% | +1895.9% / 1.49 / 50.1% | -6.0% / 0.08 / 52.6% |
| TSMOM90 | +741.2% / 0.70 / 69.8% | +1235.0% / 1.19 / 64.7% | -37.9% / -0.10 / 64.2% |

## Robustez

| Regra | Amplitude (moedas com retorno líquido > 0) | Venceu comprar e segurar (por moeda) | Custos x2 (inteiro) | Metade A / metade B | Só moedas em operação | BTC sozinho | Sharpe deflacionado (27 tentativas) |
|---|---|---|---|---|---|---|---|
| SMA20 | 24% de 428 | 85% | +1034.2% | +1185.6% / +2125.4% | +1973.0% / 0.97 / 71.3% | +893.2% / 0.79 / 69.3% | 0.985 |
| SMA50 | 30% de 428 | 90% | +2397.7% | +1101.8% / +4006.0% | +3675.1% / 1.10 / 63.4% | +4336.0% / 1.15 / 64.8% | 0.993 |
| SMA100 | 24% de 428 | 86% | +835.9% | +419.5% / +1425.1% | +1179.5% / 0.84 / 67.2% | +2378.3% / 1.00 / 64.8% | 0.948 |
| DONCHIAN_55_20 | 32% de 428 | 89% | +1612.4% | +408.9% / +2150.2% | +1528.6% / 0.99 / 52.1% | +1119.8% / 0.86 / 59.1% | 0.987 |
| TSMOM90 | 21% de 428 | 84% | +520.8% | +145.2% / +1056.6% | +673.3% / 0.70 / 66.4% | +936.3% / 0.77 / 66.9% | 0.898 |

## BTC sozinho com cada regra, por era (informação)

| Regra | Período inteiro | 2017 a 2021 | 2022 a 2026 |
|---|---|---|---|
| SMA20 | +893.2% / 0.79 / 69.3% | +777.3% / 1.20 / 56.2% | +13.2% / 0.24 / 50.4% |
| SMA50 | +4336.0% / 1.15 / 64.8% | +1792.8% / 1.50 / 64.8% | +134.4% / 0.70 / 51.7% |
| SMA100 | +2378.3% / 1.00 / 64.8% | +862.3% / 1.20 / 64.8% | +157.6% / 0.77 / 37.2% |
| DONCHIAN_55_20 | +1119.8% / 0.86 / 59.1% | +908.4% / 1.26 / 59.1% | +21.0% / 0.28 / 32.5% |
| TSMOM90 | +936.3% / 0.77 / 66.9% | +418.2% / 0.93 / 66.9% | +100.0% / 0.60 / 35.1% |

## Por ano (retorno / queda máxima; moedas elegíveis em média e fração investida)

| Regra | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|
| SMA20 | +90.9% / 18% · 1 · 42% | -29.0% / 45% · 9 · 4% | +35.2% / 27% · 20 · 2% | +144.6% / 24% · 48 · 1% | +798.6% / 37% · 200 · 0% | -39.9% / 44% · 234 · 0% | +48.8% / 41% · 201 · 0% | +37.7% / 40% · 309 · 0% | -54.5% / 56% · 281 · 0% | -3.0% / 30% · 153 · 0% |
| SMA50 | +122.4% / 24% · 1 · 50% | -27.9% / 47% · 9 · 3% | +25.3% / 27% · 20 · 2% | +111.6% / 34% · 48 · 1% | +1058.0% / 33% · 200 · 0% | -38.2% / 43% · 234 · 0% | +69.6% / 41% · 201 · 0% | +11.7% / 42% · 309 · 0% | -33.6% / 38% · 281 · 0% | -4.9% / 29% · 153 · 0% |
| SMA100 | +68.1% / 24% · 1 · 39% | -25.2% / 47% · 9 · 2% | +41.5% / 27% · 20 · 2% | +35.3% / 43% · 48 · 1% | +770.1% / 41% · 200 · 0% | -41.7% / 42% · 234 · 0% | +52.7% / 38% · 201 · 0% | +13.6% / 41% · 309 · 0% | -41.4% / 45% · 281 · 0% | -5.0% / 25% · 153 · 0% |
| DONCHIAN_55_20 | +116.4% / 24% · 1 · 47% | -28.5% / 49% · 9 · 1% | +12.6% / 23% · 20 · 1% | +57.9% / 31% · 48 · 1% | +618.8% / 30% · 200 · 0% | -26.8% / 27% · 234 · 0% | +46.3% / 24% · 201 · 0% | +12.6% / 30% · 309 · 0% | -24.2% / 26% · 281 · 0% | -2.0% / 17% · 153 · 0% |
| TSMOM90 | +113.0% / 24% · 1 · 49% | -35.2% / 55% · 9 · 3% | +20.1% / 36% · 20 · 2% | -9.1% / 54% · 48 · 1% | +768.7% / 55% · 200 · 0% | -44.4% / 44% · 234 · 0% | +39.3% / 31% · 201 · 0% | +30.3% / 40% · 309 · 0% | -38.0% / 43% · 281 · 0% | -7.3% / 23% · 153 · 0% |

## Atividade e piores moedas

| Regra | Giro diário médio (soma dos pesos negociados) | Custo em bps ao ano | 5 piores moedas (retorno da regra / comprar e segurar) |
|---|---|---|---|
| SMA20 | 0.115 | 838 | QUICK -100.0%/-100.0%, VIDT -99.8%/-100.0%, C98 -98.3%/-99.1%, IRIS -97.7%/-95.7%, BNX -96.7%/-94.5% |
| SMA50 | 0.067 | 488 | QUICK -100.0%/-100.0%, VIDT -99.7%/-100.0%, STRAX -98.4%/-99.4%, SFP -97.4%/-82.4%, ONG -95.5%/-90.4% |
| SMA100 | 0.047 | 340 | QUICK -100.0%/-100.0%, VIDT -99.8%/-100.0%, SFP -98.6%/-82.4%, UNFI -97.6%/-93.8%, HARD -97.5%/-99.3% |
| DONCHIAN_55_20 | 0.015 | 109 | STRAX -99.3%/-99.4%, VIDT -97.5%/-100.0%, DEGO -96.4%/-99.8%, BAKE -95.7%/-96.4%, BEL -93.9%/-95.3% |
| TSMOM90 | 0.045 | 332 | QUICK -100.0%/-100.0%, SUN -100.0%/-100.0%, VIDT -98.4%/-100.0%, STRAX -98.1%/-99.4%, KNC -96.5%/-78.8% |

## Leitura honesta

- **As cinco regras ficam `NAO_VALIDADA`, pelos mesmos motivos.** Em 2017 a 2021 todas rendem muito (cesta comprada e segura: +1 538%; regras: +1 235% a +4 910%, Sharpe de 1,2 a 1,8); em 2022 a 2026 todas perdem (−6% a −44%), e a cesta comprada e segura perde −90%. Reprovam por retorno negativo na segunda era, queda máxima de 52% a 71% (o padrão é 30%), Sharpe abaixo de 0,8 na segunda era, custos dobrados negativos na segunda era e amplitude de moedas de 21% a 32%.
- **"Funciona em todas as moedas": não.** Aplicada sozinha em cada moeda (428 moedas com pelo menos 365 dias elegíveis), a regra termina com retorno líquido positivo em só **21% a 32%** delas. O número que tranquiliza é outro: a regra supera comprar e segurar em **84% a 90%** das moedas, porque a maioria das moedas termina perto de zero (199 pares já foram retirados) e estar fora delas é o que salva. Tendência reduz perda; não cria retorno onde a moeda só cai.
- **O resultado de 2017 a 2021 é uma mania, não uma estratégia.** Só 2021 deu +620% a +1 060% na carteira de peso igual de 200 moedas, e a carteira de 2017 a 2021 tem 1 a 200 moedas elegíveis (1 em 2017, 48 em 2020). Rebalancear todo dia entre moedas de volatilidade enorme com custo de 20 bps captura um prêmio de rebalanceamento que depende de fills que moedas pequenas em alta não dão. Ler esse número como retorno alcançável seria enganoso.
- **Custos:** de 109 bps ao ano (rompimento de Donchian) a 838 bps ao ano (média de 20 dias). O rompimento é a regra que menos gira e que menos perdeu em 2022 a 2026 (−6%).
- **Sobrevivência:** a carteira só com as moedas ainda em operação dá resultados parecidos aos da carteira completa (por exemplo, SMA50: +3 675% contra +3 803%), então os 199 pares retirados não alteram a história por si; o que muda o resultado é a era.
- **BTC sozinho com cada regra (informação, fora do veredito):** a tendência melhora o BTC em quase tudo. Período inteiro, SMA50: +4 336%, Sharpe 1,15 (BTC comprado e seguro: +1 155%, Sharpe 0,75). Em 2022 a 2026, SMA100: +158%, Sharpe 0,77, queda de 37%; SMA50: +134%, Sharpe 0,70, queda de 52%; comprar e segurar: +73%, Sharpe 0,48, queda de 67%. Ainda assim, só `SMA100` e Donchian ficam perto de 30% de queda, e só na segunda era.
- **Sharpe deflacionado (27 tentativas):** de 0,90 a 0,99, alto por causa da primeira era; não conta no veredito e não muda o fato de a segunda era ser negativa.

## O que isto muda

- **Não existe, neste conjunto de dados, uma regra única de entrada e saída que funcione em todas as moedas e passe nas duas eras com queda máxima de 30%.** O que existe é um padrão mais estreito: **tendência em poucas moedas grandes, com posição reduzida**.
- **Próximo teste que decorre disto, e que precisa de protocolo novo e entra na contagem de tentativas (28 a 30):** universo ponto no tempo das N moedas de maior volume (por exemplo, as 3 a 10 maiores), regras SMA50/SMA100 e Donchian, tamanho reduzido para caber nos 30% de queda, avaliado nas duas eras. Os dados já estão baixados. Fica para declarar antes de rodar, não foi feito aqui.
