# Robustez de estudos (`ROBUSTNESS_SCREEN_V1`)

Declarada em 05/10/2026. Vale para estudos usados em pilotos que começarem **depois** do piloto atual. O piloto em andamento segue `INDEPENDENT_PAPER_SCREEN_V1`, sem mudança de regra no meio.

## Por quê

Quanto mais estratégias testamos, maior a chance de a "melhor" ser só sorte. Até hoje o registro tem 8 configurações testadas (SHORT_HORIZON_V1 e MULTI_DAY_TREND_V1), e a rodada da equipe soma mais 6.

## O que é medido

`GET /backtests/v2/studies/:id/robustness` calcula sob demanda, numa thread separada (não trava o servidor nem o piloto). O resultado aparece em Estratégias, nos detalhes do estudo.

| Medida | O que é | Exigência |
|---|---|---|
| Deflated Sharpe (Bailey e López de Prado, 2014) | Probabilidade de o Sharpe fora da amostra ser real, descontando o número de tentativas do registro, a assimetria e a curtose | ≥ 90% |
| PBO por CSCV (Bailey et al., 2017) | Em todas as 252 combinações de 10 blocos, com que frequência o melhor candidato "dentro da amostra" fica abaixo da mediana "fora da amostra" | ≤ 50% (só com 2 ou mais candidatos) |
| Caminhos positivos | Fração das combinações em que o candidato escolhido tem Sharpe positivo fora da amostra | ≥ 60% (só com 2 ou mais candidatos) |

As fórmulas foram implementadas em TypeScript a partir dos artigos, sem copiar código de terceiros.

## Resultado no estudo do piloto (d674cb32), medido em 05/10/2026

| Medida | Valor |
|---|---|
| Sharpe anual fora da amostra | 0,16, em 3 493 h |
| Sharpe esperado só por sorte, com 8 tentativas | 2,68 |
| Deflated Sharpe | **6%** (exige 90%) |
| PBO | **99%**: o melhor dentro da amostra quase sempre ficou entre os piores fora dela |
| Caminhos positivos | 71% |
| Veredito | **Não passa.** Confirma com número o que já se sabia: a evidência do piloto é fraca. |

## Proteções (`BREAKOUT_480_PROTECTED_V1`)

Ideia do Freqtrade (licença GPL: só a ideia, nenhum código). São parte da configuração do estudo, então valem igualmente no backtest e no piloto ao vivo. Só impedem **abrir** posição; fechar continua sempre permitido.

- `cooldownHours: 24`: depois de encerrar uma operação, 24 h sem abrir outra.
- `maxConsecutiveLosses: 2` e `lossPauseHours: 72`: depois de 2 perdas seguidas, 72 h sem abrir.

Quando o piloto bloqueia uma entrada por proteção, o Sentinel grava uma memória de decisão com o motivo. A configuração do piloto atual não tem proteções, então nada muda para ele.

## Correção encontrada nesta rodada

O walk-forward reservava só `slowPeriod` (480 h) de aquecimento antes de cada janela de teste. Filtros com aquecimento maior (regime de 720 h do Oracle) perdiam as primeiras 240 h de cada teste. Agora o aquecimento é o maior entre o sinal e os filtros. Estudos sem filtro, como o do piloto, não mudam.
