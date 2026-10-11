# Resultado BUSCA_MAIORES_V1: tendência nas 5 maiores moedas por volume, com alvo de volatilidade

Executado em 2026-10-10T12:24:08.684Z, fora do servidor, com velas diárias públicas da Binance, pelo protocolo `docs/PROTOCOLO_BUSCA_MAIORES_V1.md` (commit `f79262d73ecd1521381dbd7f366edd2293dfd791`), sem mudar nenhum critério. De 2017-08-17 a 2026-10-10. Custo de 15 bps por lado; alvo de volatilidade de 20%; células "retorno / Sharpe / queda máxima".

## Veredito por regra

| Regra | Veredito | Reprovou em |
|---|---|---|
| SMA50 | **NAO_VALIDADA** | BOUNDED_DRAWDOWN, SHARPE_BAR |
| SMA100 | **NAO_VALIDADA** | BOUNDED_DRAWDOWN, SHARPE_BAR |
| DONCHIAN_55_20 | **NAO_VALIDADA** | BOUNDED_DRAWDOWN, SHARPE_BAR |

## Carteira das 5 maiores (alvo de volatilidade de 20%)

| | Período inteiro | 2017 a 2021 | 2022 a 2026 |
|---|---|---|---|
| **5 maiores sempre compradas** (benchmark, mesma escala) | +257.8% / 0.74 / 41.9% | +192.1% / 1.21 / 34.2% | +13.0% / 0.23 / 41.2% |
| SMA50 | +539.8% / 0.98 / 38.8% | +364.3% / 1.56 / 35.2% | +37.8% / 0.41 / 32.2% |
| SMA100 | +283.8% / 0.78 / 47.1% | +195.6% / 1.20 / 22.8% | +29.5% / 0.36 / 47.1% |
| DONCHIAN_55_20 | +420.3% / 0.98 / 37.6% | +290.5% / 1.53 / 26.1% | +33.0% / 0.40 / 34.7% |

## Robustez

| Regra | Anos positivos (de 8, 2018 a 2025) | Amplitude entre membros | Custos x2 (inteiro) | Fator de escala médio | Giro diário | Custo bps/ano | Sharpe deflacionado (30) |
|---|---|---|---|---|---|---|---|
| SMA50 | 6 | 71% de 7 | +417.7% | 0.61 | 0.042 | 231 | 0.989 |
| SMA100 | 6 | 71% de 7 | +229.2% | 0.63 | 0.031 | 168 | 0.950 |
| DONCHIAN_55_20 | 6 | 71% de 7 | +388.4% | 0.74 | 0.013 | 69 | 0.988 |

## Variantes (informação, fora do veredito): período inteiro; 2017 a 2021; 2022 a 2026

| Regra | Variante | Período inteiro | 2017 a 2021 | 2022 a 2026 |
|---|---|---|---|---|
| SMA50 | 3 maiores | +384.4% / 0.85 / 40.9% | +277.8% / 1.39 / 40.9% | +29.0% / 0.34 / 32.2% |
| SMA50 | 10 maiores | +556.9% / 0.98 / 38.7% | +436.5% / 1.69 / 30.8% | +22.7% / 0.30 / 32.9% |
| SMA50 | alvo de 15% | +346.5% / 0.96 / 31.1% | +234.1% / 1.52 / 31.0% | +33.6% / 0.42 / 26.8% |
| SMA50 | alvo de 30% | +1060.4% / 1.02 / 51.0% | +685.4% / 1.60 / 41.4% | +47.7% / 0.43 / 44.2% |
| SMA50 | sem escala | +2750.5% / 1.02 / 58.0% | +1658.3% / 1.46 / 55.9% | +62.1% / 0.46 / 49.3% |
| SMA50 | BTC sozinho (alvo de 20%) | +879.9% / 1.20 / 43.2% | +421.1% / 1.70 / 36.2% | +88.0% / 0.71 / 40.2% |
| SMA100 | 3 maiores | +230.0% / 0.71 / 43.6% | +168.2% / 1.13 / 22.3% | +23.0% / 0.31 / 39.6% |
| SMA100 | 10 maiores | +182.5% / 0.63 / 52.8% | +226.0% / 1.30 / 22.0% | -14.0% / -0.05 / 52.3% |
| SMA100 | alvo de 15% | +206.0% / 0.79 / 38.2% | +131.0% / 1.17 / 18.0% | +32.1% / 0.42 / 38.2% |
| SMA100 | alvo de 30% | +456.7% / 0.78 / 56.2% | +342.0% / 1.24 / 30.3% | +26.0% / 0.31 / 56.2% |
| SMA100 | sem escala | +694.3% / 0.71 / 75.4% | +508.7% / 1.00 / 57.9% | +30.5% / 0.33 / 57.8% |
| SMA100 | BTC sozinho (alvo de 20%) | +576.2% / 1.08 / 34.0% | +249.3% / 1.35 / 34.0% | +93.6% / 0.79 / 27.4% |
| DONCHIAN_55_20 | 3 maiores | +320.3% / 0.86 / 38.1% | +254.3% / 1.45 / 20.1% | +18.6% / 0.28 / 32.5% |
| DONCHIAN_55_20 | 10 maiores | +399.8% / 0.97 / 25.6% | +286.8% / 1.53 / 24.3% | +29.1% / 0.38 / 21.1% |
| DONCHIAN_55_20 | alvo de 15% | +278.9% / 0.95 / 31.6% | +201.9% / 1.53 / 23.5% | +25.0% / 0.37 / 30.1% |
| DONCHIAN_55_20 | alvo de 30% | +709.4% / 1.00 / 44.0% | +443.1% / 1.47 / 29.4% | +49.5% / 0.47 / 37.7% |
| DONCHIAN_55_20 | sem escala | +1087.0% / 0.87 / 60.2% | +656.7% / 1.17 / 49.8% | +55.8% / 0.47 / 37.7% |
| DONCHIAN_55_20 | BTC sozinho (alvo de 20%) | +325.0% / 0.89 / 33.9% | +228.8% / 1.34 / 33.9% | +29.3% / 0.39 / 30.7% |

## Por ano (retorno / queda máxima; escala média e fração investida)

| Regra | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|
| SMA50 | +65.0% / 8% · 0.73 · 18% | -20.7% / 32% · 0.63 · 15% | +5.6% / 18% · 0.58 · 23% | +102.5% / 13% · 0.44 · 30% | +63.3% / 11% · 0.35 · 21% | -23.9% / 25% · 0.73 · 17% | +35.6% / 25% · 0.75 · 39% | +22.0% / 24% · 0.57 · 32% | +7.2% / 13% · 0.61 · 21% | +0.1% / 26% · 0.83 · 36% |
| SMA100 | +41.9% / 8% · 0.76 · 14% | -16.5% / 23% · 0.72 · 12% | +23.6% / 17% · 0.65 · 19% | +55.1% / 21% · 0.46 · 33% | +29.9% / 13% · 0.30 · 21% | -23.6% / 35% · 0.79 · 16% | +22.1% / 29% · 0.74 · 41% | +21.1% / 24% · 0.55 · 31% | +0.6% / 14% · 0.56 · 22% | +11.5% / 17% · 0.89 · 21% |
| DONCHIAN_55_20 | +60.4% / 8% · 0.73 · 16% | -16.9% / 23% · 0.78 · 8% | +24.7% / 7% · 0.73 · 16% | +82.2% / 19% · 0.63 · 29% | +28.8% / 11% · 0.36 · 19% | -20.2% / 25% · 0.95 · 11% | +23.6% / 20% · 0.89 · 32% | +28.0% / 23% · 0.69 · 24% | +2.9% / 12% · 0.71 · 20% | -0.1% / 17% · 0.93 · 20% |

## Membros do universo, por ano (dias como membro)

- **2017:** 
- **2018:** BTC (365 d), ETH (365 d), BNB (210 d), BCC (190 d), NEO (150 d), EOS (112 d), LTC (90 d), XRP (82 d)
- **2019:** BTC (365 d), ETH (365 d), EOS (305 d), XRP (305 d), BNB (297 d), TRX (68 d), BCHABC (60 d), LTC (60 d)
- **2020:** BTC (366 d), ETH (366 d), BNB (333 d), XRP (246 d), LINK (243 d), BCH (150 d), EOS (63 d), ADA (60 d)
- **2021:** BTC (365 d), ETH (365 d), BNB (308 d), XRP (237 d), ADA (150 d), DOGE (150 d), SOL (98 d), LINK (57 d)
- **2022:** BTC (365 d), ETH (365 d), BNB (335 d), LUNA (164 d), SOL (142 d), SHIB (82 d), XRP (73 d), ETC (60 d)
- **2023:** BTC (365 d), ETH (365 d), XRP (365 d), BNB (335 d), SOL (168 d), DOGE (137 d), APT (30 d), ARB (30 d)
- **2024:** BTC (366 d), ETH (366 d), SOL (366 d), BNB (222 d), XRP (186 d), PEPE (180 d), DOGE (114 d), WIF (30 d)
- **2025:** BTC (365 d), ETH (365 d), SOL (365 d), XRP (365 d), DOGE (186 d), PEPE (90 d), BNB (59 d), SUI (30 d)
- **2026:** BTC (282 d), ETH (282 d), SOL (282 d), XRP (252 d), ZEC (161 d), BNB (91 d), DOGE (60 d)

## Leitura honesta

- **As três regras ficam `NAO_VALIDADA`, mas por pouco e só em dois critérios.** Passaram lucro nas três janelas, 6 de 8 anos positivos, custos dobrados positivos e amplitude de 71% entre os membros (5 de 7 moedas). Reprovaram em **queda máxima** (37,6% a 47,1% no período inteiro, contra o limite de 30%; em 2022 a 2026, 32% a 47%) e em **Sharpe** (0,36 a 0,41 em 2022 a 2026, contra a barra de 0,8; `SMA100` fica em 0,78 no período inteiro).
- **A tendência acrescenta valor em cima das mesmas moedas com a mesma escala de risco.** Em 2022 a 2026 as 5 maiores sempre compradas dão +13% (Sharpe 0,23, queda de 41%); as regras dão +30% a +38% (Sharpe 0,36 a 0,41, queda de 32% a 47%). No período inteiro: +258% (Sharpe 0,74) contra +284% a +540% (Sharpe 0,78 a 0,98). É a primeira configuração do laboratório que é positiva nas duas eras com custos dobrados.
- **A segunda era é fraca em termos absolutos:** cerca de 6% a 8% ao ano, com Sharpe de 0,4, e as regras perdem entre 20% e 24% em 2022 (inclui o colapso da LUNA, que foi membro por 164 dias) e 17% a 21% em 2018. O resultado forte vem de 2017 a 2021 (Sharpe de 1,2 a 1,6), que inclui o ciclo de 2020 e 2021.
- **O alvo de volatilidade de 20% não segura a queda em 30%.** A estimativa de volatilidade chega depois das viradas bruscas; sem escala a queda é de 58% a 75%, com escala de 38% a 47%. Fica no relatório (informação, fora do veredito) que alvos de 15% levam `SMA50` e Donchian a quedas de 31,1% e 31,6%. **Não escolho isso agora:** seria ajustar o parâmetro depois de ver o resultado, e este conjunto de dados está consumido.
- **BTC sozinho com a mesma escala (informação):** `SMA100` dá +576% no período inteiro, Sharpe 1,08, queda de 34%; em 2022 a 2026, +94%, Sharpe 0,79, queda de 27%. É o resultado mais próximo de passar em tudo, mas é uma moeda só, não "todas as moedas".
- **Universo:** 3, 5 e 10 moedas dão resultados parecidos (a variação entre 5 e 10 é pequena), então a escolha de N = 5 não é a causa. Os membros são, no tempo, BTC, ETH, BNB, XRP, SOL, LINK, DOGE, ADA e as moedas da vez (LUNA em 2022, PEPE e WIF em 2024).
- **Sharpe deflacionado (30 tentativas):** 0,95 a 0,99, alto por causa da primeira era; não conta no veredito.

## O que isto muda

- **Pelo padrão declarado (30% de queda e Sharpe de 0,8 nas duas eras), nenhuma regra está validada.** O que sobra é um candidato com evidência de qualidade diferente das anteriores: **tendência nas maiores moedas, com risco alvo de volatilidade**, positivo nas duas eras, mas com queda máxima de 38% a 47% e Sharpe baixo em 2022 a 2026.
- **O que daria uma resposta nova sem esperar o futuro:** história mais antiga que esta. O BTC existe em outras corretoras desde 2011 (e ETH, LTC e XRP desde 2015 a 2017), então a mesma regra congelada pode ser testada em **2011 a 2017**, um regime nunca visto por nenhuma etapa desta pesquisa. É uma moeda (ou poucas), não "todas as moedas", mas é a única forma de validar a ideia de tendência nas maiores sem reaproveitar os mesmos dados. Exige protocolo declarado antes e um download pequeno (poucos milhares de velas diárias).
