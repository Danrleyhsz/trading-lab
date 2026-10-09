# Protocolo pré-declarado: RAPIDO_V1 (estratégias entre moedas com decisões diárias ou a cada 8 horas)

Declarado em 09/10/2026, **antes** de qualquer número destas candidatas ser calculado, e registrado no Git antes da execução. Regras, universo, períodos, custos, critérios e contagem de tentativas abaixo são fixos. Uma variação (outra janela, outra cadência, outro número de moedas ou tamanho) ganha nome novo e declaração nova. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance USD-M. Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## O que o dono pediu e como foi traduzido

Pedido: testar outras estratégias, em menos tempo, com **mais entradas e saídas** e sem demorar para decidir. Tradução:

- **Mais decisões por unidade de tempo:** em vez de uma decisão por semana, uma por dia ou uma a cada 8 horas. Cada decisão abre e fecha posições em 10 moedas, então o número de entradas e saídas sobe de dezenas por ano para centenas ou milhares.
- **Verdade sobre "menos tempo":** o período do **teste histórico continua longo** (de 2022 até hoje), porque período curto engana, e foi assim que as estratégias de vídeo pareceram boas. O que fica mais rápido é o **acompanhamento ao vivo**: com decisões diárias há cerca de 20 decisões em 3 semanas (contra 1 por semana). Isso dá um sinal antes, **não uma conclusão**.

## O risco principal, dito antes

Cada vez que a carteira gira, paga taxa e slippage. Com os custos deste laboratório (0,055% de taxa e 2 bps de slippage por lado), trocar a carteira inteira todos os dias custa até cerca de 27% ao ano sobre o patrimônio (teto; quando parte das posições se repete, é menos), e a cada 8 horas o teto é o triplo. A estratégia precisa render isso **antes** dos custos só para empatar. `SHORT_HORIZON_V1` e `VIDEO_HYPOTHESES_V1` já morreram por isso. A expectativa honesta é que a maioria destas candidatas reprove nos custos; o teste existe para medir **quanto** os custos comem, e o resultado sem custos é reportado para isso.

## Hipóteses (4 tentativas)

Mesmo molde do `FATORES_V1` (mesmo simulador, `scripts/estudos/fatores-lib.ts`); mudam o **sinal** e a **cadência**. Em cada decisão, a atratividade de cada moeda usa só informação até o fechamento da vela da decisão; compra as 5 de maior atratividade e vende as 5 de menor, com 5% do patrimônio por posição.

| Código | Atratividade (maior é melhor) | Decisão |
|---|---|---|
| `XS_REV24_V1` | menos o retorno das últimas 24 h (reversão de curto prazo) | a cada 24 h |
| `XS_REV8_V1` | menos o retorno das últimas 8 h | a cada 8 h |
| `XS_MOM72_V1` | retorno das últimas 72 h (momentum de curto prazo) | a cada 24 h |
| `XS_CARRY72_V1` | menos a média do funding das liquidações dos últimos 72 h, liquidadas até o fechamento da vela da decisão | a cada 24 h |

Empates: ordem alfabética do símbolo. Nenhum parâmetro é ajustado nos dados; as janelas são múltiplos simples do dia e do ciclo de funding de 8 h.

**Controle (não conta como tentativa):** `XSMOM_L28` (retorno de 672 h, decisão semanal), usado como teste de regressão.

## Dados e regra de carteira

- **Universo:** as 15 moedas de `FATORES_V1` (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH, BTC), os mesmos blocos de dados e a mesma junção validada.
- **Período:** primeira decisão em 01/01/2022 00:00 UTC, até a última vela disponível (cerca de 05/10/2026).
- **Execução:** na abertura da vela seguinte à decisão. Capital simulado de 10 000. Exposição bruta 0,5x.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real de cada moeda.
- **Teste de regressão (obrigatório, antes de qualquer candidata):** o controle tem de reproduzir +55,06% e queda máxima de 8,77% no recorte de `XSMOM_LONG_HISTORY_V1` (tolerância de 0,05 ponto percentual). Se não reproduzir, o estudo para.

## Critérios (por candidata, período inteiro, com os custos acima)

1. `DATA_QUALITY`: no máximo 1% de horas preenchidas por moeda.
2. `POSITIVE_PNL`: lucro líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo 15%.
4. `POSITIVE_YEARS`: lucro positivo em pelo menos 3 dos 4 anos completos (2022 a 2025); 2026 é reportado, não conta.
5. `DOUBLED_COSTS_POSITIVE`: lucro líquido positivo com taxa e slippage dobrados.
6. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das 15 moedas de no máximo 0,30.
7. `BOTH_HALVES_POSITIVE`: lucro líquido positivo **em cada metade**: de 01/01/2022 a 30/06/2024 e de 01/07/2024 até o fim. Este critério é novo e existe porque, com muitas decisões, um resultado total positivo pode vir só de um trecho.

## Veredito

- **`PROPOR_ACOMPANHAMENTO`:** passa os 7 critérios. Só significa "vale acompanhar ao vivo".
- **`ENCERRADA`:** qualquer outro caso. Fica registrada e não é repetida com outros parâmetros.

## Informação reportada, sem entrar no veredito

- **Resultado antes de custos** (taxa e slippage zerados, funding mantido) e o custo total pago, para mostrar quanto da vantagem bruta os custos comem;
- número de decisões, de posições encerradas e giro;
- resultado por ano e por metade, queda máxima por ano; 2026 parcial;
- comparação com o controle `XSMOM_L28` e correlação semanal com ele e com a combinação `COMBO_CARRY_MOM_V1`;
- Sharpe deflacionado com **13 tentativas** (as 9 anteriores mais estas 4), variância entre tentativas igual à de `FATORES_V1`; **não faz parte do veredito**, como na combinação, e se aprovar com Sharpe deflacionado baixo isso é dito;
- hash SHA-256 dos datasets e o commit deste protocolo.

## Se alguma candidata passar

O acompanhamento ao vivo (21 moedas, decisões na cadência da candidata, parada antecipada por queda máxima, mínimo de 3 semanas) será **declarado em protocolo próprio, antes de começar**. Três semanas são o mínimo para olhar, não para concluir; mesmo aprovada, a evidência continua fraca e o passo seguinte depende do dono.

## Limites declarados antes de rodar

- **Sobreviventes:** o universo só tem moedas que existem hoje.
- **Mesmos preços:** os dados foram usados em outros estudos; as regras destas candidatas não foram vistas, mas a validação de verdade só vem de dados futuros.
- **Execução simplificada:** ordens a mercado na abertura da vela seguinte, sem fila, sem rejeição, sem impacto no preço. Em cadência de 8 horas isso favorece o resultado; é um limite a mais.
- **Vendas a descoberto** sem custo de empréstimo e sem limite de liquidez.
- **Funding antigo sem preço de marcação:** preenchido pela abertura da vela de negócios da hora, como antes.
- **Quatro tentativas, ponto final:** nenhuma outra cadência, janela ou tamanho será testada depois de ver o resultado.
