# Resultado PIT_COMPLETO_V1: momentum de 28 dias com o pool completo, em universo ponto no tempo

Executado em 2026-10-09T23:28:49.166Z, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo `docs/PROTOCOLO_POOL_COMPLETO.md` (commit `cf15e44e3250ab8c020a4e94ade2c099739204cb`), sem mudar nenhum critério. Pool de 543 moedas, 543 utilizáveis (100.0%; 418 em operação e 125 em liquidação); a cada 4 semanas, as 30 de maior volume dos 672 h anteriores entre as elegíveis; 5 compradas e 5 vendidas; 2,5% por posição; 01/01/2022 ao fim de out/2026.

## Veredito: **NAO_VALIDADA** (reprovou em POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE)

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| POSITIVE_PNL | não |
| BOUNDED_DRAWDOWN | não |
| POSITIVE_YEARS | não |
| DOUBLED_COSTS_POSITIVE | não |
| MARKET_NEUTRAL | sim |
| BOTH_HALVES_POSITIVE | não |

## Números (universo ponto no tempo de 30, 2,5% por posição)

| Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Corr. mercado | Anos + (de 4) | 1ª metade | 2ª metade | Cesta do universo (comprar e segurar) |
|---|---|---|---|---|---|---|---|---|
| -46.45% | 56.4% | -0.59 | -4906 | -0.03 | 2 | +5.43% / 10.4% | -49.21% / 56.4% | -90.92% |

Com 5% por posição: -97.56%, queda máxima 103.4% (razão das quedas 0.55). Sharpe deflacionado (18 tentativas, fora do veredito): 0.000. Taxas 329, funding -1168, giro 60x, 249 decisões, 1219 posições encerradas.

## Por ano (retorno / queda máxima no ano)

| | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| **Principal (30 moedas)** | -4.01% / 10.4% | +9.24% / 7.6% | +1.47% / 11.7% | -47.38% / 52.5% | -4.35% / 17.3% (parcial) |
| Universo de 15 moedas | +5.86% / 4.5% | +5.35% / 6.5% | -8.64% / 11.3% | +11.17% / 6.8% | -8.47% / 16.2% (parcial) |
| Universo de 60 moedas | -1.00% / 9.6% | +12.10% / 5.6% | +0.84% / 11.3% | -36.09% / 53.2% | -26.91% / 36.5% (parcial) |
| Sem as 59 moedas dos estudos anteriores | -4.46% / 10.2% | -3.03% / 10.3% | +2.23% / 8.7% | -39.56% / 53.0% | -26.51% / 31.8% (parcial) |
| Só moedas ainda em operação (418) | -7.63% / 12.7% | +11.39% / 7.2% | +5.19% / 11.4% | -49.03% / 52.6% | -6.34% / 19.3% (parcial) |
| Só moedas em liquidação (125) | -7.45% / 14.8% | -8.53% / 14.8% | +7.00% / 12.2% | +2.28% / 20.3% | -11.84% / 18.3% (parcial) |
| Só listadas até 30/11/2021 | -3.60% / 9.8% | +9.63% / 7.4% | +11.33% / 6.2% | +2.65% / 8.0% | -4.13% / 8.3% (parcial) |

## Variantes (informação, fora do veredito)

| Variante | Retorno | Queda máx. | Sharpe anual | Anos + | Corr. mercado |
|---|---|---|---|---|---|
| Universo de 15 moedas | +3.67% | 16.7% | 0.12 | 3 | -0.06 |
| Universo de 60 moedas | -47.72% | 64.8% | -0.56 | 2 | -0.02 |
| Sem as 59 moedas dos estudos anteriores | -57.93% | 65.1% | -0.80 | 1 | -0.02 |
| Só moedas ainda em operação (418) | -48.33% | 57.3% | -0.63 | 2 | -0.03 |
| Só moedas em liquidação (125) | -18.32% | 32.2% | -0.27 | 2 | -0.03 |
| Só listadas até 30/11/2021 | +15.80% | 14.4% | 0.42 | 3 | 0.00 |

## Composição do universo

| Ano | Atualizações | Moedas diferentes | Vagas nas 59 antigas | Vagas em moedas em liquidação | Vagas em listadas depois de 11/2021 |
|---|---|---|---|---|---|
| 2022 | 14 | 74 | 74% | 9% | 10% |
| 2023 | 13 | 94 | 57% | 10% | 31% |
| 2024 | 13 | 95 | 47% | 4% | 50% |
| 2025 | 13 | 112 | 45% | 3% | 55% |
| 2026 | 10 | 94 | 50% | 2% | 50% |



Horas de funding sem preço de marcação preenchidas pela abertura: 299513.

## Leitura honesta

- **`NAO_VALIDADA`, e de forma clara.** Com o pool completo (543 moedas, 100% utilizáveis, incluindo 125 em deslistagem) o momentum de 28 dias com 0,25x perdeu **−46,5%** em 4,8 anos, com queda máxima de **56,4%**, Sharpe −0,59 e custos dobrados em −4 906. Com 5% por posição a queda passa de 100%: em simulação o patrimônio ficaria negativo (na prática a conta seria liquidada). Reprovou em 5 dos 7 critérios; só passou qualidade de dados e neutralidade de mercado.
- **A perda é uma cauda, não um desgaste.** A primeira metade (2022 a jun/2024) deu +5,4%; a segunda, −49,2%, e quase tudo em 2025 (−47,4%). A pior semana foi a de 12/09/2025 (−52% a 5% por posição): o `MYXUSDT` estava entre as 5 mais fracas pelo retorno de 28 dias e foi vendido a US$ 1,2; em três dias foi a US$ 13,9 (confere na API pública: fechamentos diários 1,31 em 06/09, 3,49 em 07/09, 13,89 em 08/09). Uma venda de 2,5% contra um movimento de +1 034% custa 26% do patrimônio numa só posição. Outras vendas que explodiram: `SIRENUSDT` (+258%), `PIPPINUSDT` (+235%), `JELLYJELLYUSDT` (+147%), `WAVESUSDT` (+122%). De 2 490 posições, 31 perderam mais de 50% numa semana e 4 ganharam mais de 100%; a média por posição foi de −0,41% por semana.
- **Não é defeito de dado.** Os preços do `MYXUSDT` conferem com a API pública, a série não tem horas preenchidas, e os dois simuladores reproduzem o controle publicado (+55,06% e 8,77%).
- **Onde o momentum ainda se defende:** o mesmo pool restrito às moedas **listadas até 11/2021** dá +15,8%, queda de 14,4%, Sharpe 0,42 e 3 de 4 anos positivos (informativo, fora do veredito). Com as moedas novas, ou só as ainda em operação, ou só as 44 que nenhum estudo anterior tinha usado, o resultado é de −48% a −58%. O que parecia vantagem do momentum é, em boa parte, comportamento de moedas grandes e antigas; nas pequenas e novas, vender as mais fracas é vender o que pode dobrar ou multiplicar por dez em dias.
- **A "amplitude" que parecia ajudar** (30 moedas dando +18,3% em `PIT_UNIVERSO_V1`) não se sustenta quando o pool inclui moedas novas e pequenas: o universo de 60 piora para −47,7%.
- **O que a regra não tem:** nenhum limite de perda por posição, nenhum filtro de volatilidade ou de tempo de listagem. Um gestor real teria. Isso seria uma **hipótese nova** (por exemplo, excluir listagens com menos de 90 dias, ou limitar a venda de moedas muito voláteis), e este pool foi consumido pela regra de uso único; não existe mais passado não visto para validá-la, só dados já olhados.
- **Limites:** simulação sem liquidação, sem custo de empréstimo e sem limite de liquidez; preço final de deslistagem aproximado; slippage de 2 bps otimista para moedas pequenas.

## O que isto muda

- **Momentum de 28 dias com esse tamanho e esse pool: encerrado**, conforme o protocolo. Junto com `MOM_METADE_V1` e `PIT_UNIVERSO_V1`, o conjunto de testes sem olhar o futuro diz a mesma coisa: **não há vantagem de momentum entre moedas que sobreviva a um universo escolhido sem hindsight e a moedas pequenas**.
- **Carry e combinação carry + momentum:** continuam sem validação (mesmo viés das 15 moedas) e sem passado novo para testar.
- **Resumo da busca por estratégia em dados históricos:** das ideias testadas, nenhuma passou num teste sem viés de seleção. O acompanhamento ao vivo (`XSMOM_FORWARD_V1`, `COMBO_CARRY_MOM_V1`) segue como a única evidência restante, e é fraca.
