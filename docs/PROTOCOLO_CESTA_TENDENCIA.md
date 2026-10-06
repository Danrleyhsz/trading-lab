# Protocolo pré-declarado: TREND_BASKET_V1

Declarado em 05/10/2026, **depois** do estudo MULTI_ASSET_STUDY_V1 (`docs/estudos/multimoedas-2026-10-05.md`) e **antes** de qualquer execução deste teste. Este documento é registrado no Git antes de o teste rodar. Universo, regras, período e critérios abaixo são fixos.

## Hipótese

No MULTI_ASSET_STUDY_V1, as duas famílias de tendência lenta deram lucro em 15 de 21 moedas cada uma. Nenhuma moeda isolada passou no desconto de múltiplos testes, porque cada uma tinha poucas operações e o estudo testou 189 configurações.

A hipótese é: **a mesma tendência lenta, operada como uma carteira só sobre a cesta inteira, tem resultado positivo e consistente em um período que nenhum estudo viu.**

A ideia veio de olhar o resultado anterior. Por isso o teste usa **apenas dados anteriores** ao período já estudado: é a forma honesta de checar se o padrão não foi sorte daquele trecho.

## Período (dados ainda não vistos)

- 5000 velas de 1 hora da Binance USD-M que terminam **imediatamente antes** do primeiro candle do estudo anterior.
- O estudo anterior começou em 2026-03-11 15:00 UTC, então este período vai de 15/08/2025 a 11/03/2026 14:00 UTC, aproximadamente.
- Não há sobreposição com nenhum estudo já feito, nem com o piloto.

## Cesta (fixa)

As 20 moedas do universo de 05/10/2026 (`docs/estudos/universo-2026-10-05.json`) mais o BTCUSDT, 21 no total. Pesos iguais: cada moeda recebe 1/21 do capital e opera só com a sua parte. Uma moeda sem histórico completo no período é registrada como falha de dados e fica fora; o peso é dividido entre as restantes.

## Duas hipóteses, e só duas

Cada uma usa o procedimento já declarado, sem mudar nada:

1. **CESTA_TENDENCIA_SMA:** `MULTI_DAY_TREND_V1` em cada moeda (SMA 48/240, SMA 72/480 e rompimento de 480; em cada janela o candidato é escolhido só pelo P&L do treino).
2. **CESTA_ROMPIMENTO_PROTEGIDO:** `BREAKOUT_480_PROTECTED_V1` em cada moeda.

Janelas: treino de 1500 velas e teste de 500, com 7 janelas fora da amostra, iguais em todas as moedas. Custos: taxa de 0,055% e slippage de 2 bps por lado, 10% da parte da moeda por posição, alavancagem 1x e funding real. São os mesmos custos do MULTI_ASSET_STUDY_V1.

A equity da cesta, hora a hora, é a soma das equities das moedas nas horas de teste.

## Critério de aprovação: TREND_BASKET_SCREEN_V1

Cada hipótese é aprovada só se cumprir **tudo**:

1. P&L da cesta fora da amostra positivo.
2. Pelo menos 30 operações fechadas somando a cesta.
3. Drawdown máximo da cesta de até 15%.
4. Cesta positiva em pelo menos 4 das 7 janelas de teste.
5. Lucro em pelo menos 60% das moedas (13 de 21).
6. Sharpe deflacionado de pelo menos 0,9 sobre os retornos horários da cesta, contando **2 tentativas** (as duas hipóteses deste teste).

Também são registrados, sem servir de critério: o retorno de comprar e segurar a cesta no mesmo período, o funding pago e o resultado por moeda e por janela.

## O que acontece com o resultado

- **Reprovada:** fica registrada e a hipótese é encerrada. Ela não é repetida com outros parâmetros, outras moedas ou outro período para forçar aprovação.
- **Aprovada:** vira candidata a um **piloto paper paralelo da cesta**, com uma conta por moeda, e com protocolo próprio declarado antes e aprovado pelo dono. Nada é ativado automaticamente. O piloto atual (BTCUSDT, estudo d674cb32) segue com as regras dele até o fim.

## Limitações declaradas antes

- **Escolha da hipótese:** ela foi escolhida depois de ver o estudo anterior. O período novo reduz esse viés, mas não zera: o universo de moedas foi escolhido com dados recentes.
- **Correlação:** as altcoins andam juntas. Uma cesta de 21 moedas não equivale a 21 apostas independentes.
- **Regime de mercado:** são dois períodos de cerca de 208 dias. Um mercado diferente pode inverter o resultado.
- **Fidelidade:** o mark é amostrado por hora e o modelo de margem é simplificado. Não é paridade com a corretora.
