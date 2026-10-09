# Protocolo pré-declarado: FATORES_V1 (três candidatas entre moedas)

Declarado em 09/10/2026, **antes** de qualquer número destas candidatas ser calculado, e registrado no Git antes da execução. Regras, universo, períodos, custos, critérios e contagem de tentativas abaixo são fixos. Uma ideia diferente (outra janela, outro número de moedas, outro tamanho, outro peso) ganha nome novo e declaração nova. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline**, com dados públicos da Binance USD-M. Não muda o piloto da Nova nem o acompanhamento de momentum (`XSMOM_FORWARD_V1`), não toca em contas e não envia ordens. Não é recomendação de investimento.

Contexto e escolha das candidatas: `docs/VARREDURA_DE_ESTRATEGIAS_2026-10-09.md`.

## Hipóteses

Mesmo molde do momentum entre moedas (`docs/PROTOCOLO_MOMENTUM_HISTORICO_LONGO.md`); muda **só o sinal** que ordena as moedas. Em cada decisão, a "atratividade" de cada moeda é calculada só com informação até o fechamento da vela da decisão; compra as 5 de maior atratividade e vende as 5 de menor.

| Código | Atratividade (maior é melhor) |
|---|---|
| `XS_CARRY_V1` | menos a média do funding das liquidações dos últimos 168 h (liquidadas até o fechamento da vela da decisão) |
| `XS_LOWVOL_V1` | menos o desvio-padrão dos retornos logarítmicos horários dos últimos 672 h (fechamentos até a vela da decisão) |
| `XS_COMPOSITE_V1` | média de três posições (0 = pior, 14 = melhor): a do retorno de 672 h, a de `XS_LOWVOL_V1` e a de `XS_CARRY_V1`, com pesos iguais |

Empates: ordem alfabética do símbolo. Nenhum parâmetro é ajustado nos dados; as janelas (168 h e 672 h) são as do momentum já declarado e as da literatura de 1 a 4 semanas.

**Controle (não conta como tentativa nova):** `XSMOM_L28` (atratividade = retorno de 672 h), simulado pelo mesmo código, para comparação direta e como teste de regressão.

## Dados e regra de carteira (iguais para todas)

- **Universo:** as 15 moedas de `XSMOM_LONG_HISTORY_V1`: ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH e BTC (perpétuos USDT).
- **Período:** primeira decisão em 01/01/2022 00:00 UTC, até a última vela disponível nos arquivos (cerca de 04/10/2026). Os dados são a junção de três blocos contíguos: o histórico longo (até 15/08/2025 06:00 UTC), o bloco `holdout` e o bloco principal de `scripts/estudos/out`. Se houver lacuna, repetição ou horário fora de ordem entre blocos, o estudo para sem calcular nada.
- **Agenda:** decisão semanal (a cada 168 h), executada na abertura da vela seguinte.
- **Carteira:** 5 compradas e 5 vendidas, 5% do patrimônio por posição (exposição bruta 0,5x), capital simulado de 10 000.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real de cada moeda.
- **Simulador:** o mesmo comportamento de `src/domain/cross-sectional-momentum.ts`, copiado para `scripts/estudos/` com um único acréscimo: o sinal de ordenação é injetado. O código do servidor **não** é alterado.
- **Teste de regressão (obrigatório, antes de calcular as candidatas):** o controle, simulado no recorte de 01/01/2022 a 15/08/2025, tem de reproduzir o resultado de `XSMOM_LONG_HISTORY_V1` (retorno de +55,1% e queda máxima de 8,8%, tolerância de 0,05 ponto percentual). Se não reproduzir, o estudo para e nada é reportado como resultado.

## Critérios (por candidata)

Todos medidos no período inteiro, com os custos acima:

1. `DATA_QUALITY`: no máximo 1% de horas preenchidas por moeda.
2. `POSITIVE_PNL`: lucro líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo 15%.
4. `POSITIVE_YEARS`: lucro positivo em pelo menos 3 dos 4 anos completos (2022, 2023, 2024 e 2025). 2026 é reportado, mas não conta.
5. `DOUBLED_COSTS_POSITIVE`: lucro líquido ainda positivo com taxa e slippage dobrados.
6. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das 15 moedas de no máximo 0,30.
7. `DEFLATED_SHARPE`: Sharpe deflacionado (Bailey e López de Prado, 2014) de pelo menos 0,9, contando **8 tentativas**: as 5 de momentum já medidas (`XSMOM_V1`, 2 variantes em 2 períodos, e `XSMOM_LONG_HISTORY_V1`) mais as 3 candidatas. A variância dos Sharpe entre as tentativas é calculada com esses 8 valores (os 5 anteriores vêm dos arquivos em `docs/estudos/`).

## Veredito (em ordem)

- **`APROVADA`:** todos os critérios, inclusive o 7.
- **`CANDIDATA_AO_VIVO`:** passa os critérios 1 a 6 e o Sharpe deflacionado é de pelo menos 0,5, mas menor que 0,9. Significa só "vale acompanhar com dados futuros", e não que funciona. Esta faixa existe porque, com 8 tentativas, a barra de 0,9 reprova até o momentum de 28 dias, que é o melhor resultado do laboratório; ela é declarada agora para não ser inventada depois de ver os números.
- **`REPROVADA`:** qualquer outro caso.

## Informação reportada, sem entrar no veredito

- Resultado por ano e queda máxima por ano; 2026 parcial.
- Comparação com o controle `XSMOM_L28` no mesmo período, e a correlação dos retornos semanais de cada candidata com os do controle (quanto mais baixa, mais ela diversifica).
- Comprar e segurar a cesta, como referência.
- Taxas, funding, giro e número de posições encerradas.
- Hash SHA-256 de cada dataset e o commit do protocolo em que o estudo rodou.

## Limites declarados antes de rodar

- **Sobreviventes:** o universo só tem moedas que ainda existem e têm histórico desde 2022 (ZEC, NEAR, UNI, FIL, e assim por diante). Isso favorece qualquer estratégia que compra moedas "que sobreviveram" e esconde moedas que morreram.
- **Dados já vistos:** os mesmos preços foram usados em outros estudos (momentum, carry, vídeos). As **regras** destas candidatas não foram vistas, mas a janela é a mesma, e a validação de verdade só vem de dados futuros.
- **Funding antigo sem preço de marcação:** preenchido pela abertura da vela de negócios da hora, como nos estudos anteriores.
- **Vendas a descoberto:** simuladas sem custo de empréstimo e sem limite de liquidez. Para moedas grandes de perpétuos isso é razoável, mas não é verdade em moedas pequenas.

## O que acontece com o resultado

- **Reprovada:** fica registrada e não é repetida com outros parâmetros para forçar aprovação.
- **`CANDIDATA_AO_VIVO` ou `APROVADA`:** o dono decide o próximo passo. Acompanhar uma candidata ao vivo exige código no servidor (muda o `backendFingerprint`) e um deploy, que só ocorre depois do veredito final do piloto atual e com aprovação do dono. Nada é ativado automaticamente, e nada muda no piloto ou no acompanhamento de momentum em curso.
- O resultado é escrito no mesmo dia da execução, com a leitura honesta, mesmo que seja negativo.
