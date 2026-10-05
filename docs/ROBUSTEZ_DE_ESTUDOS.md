# Robustez de estudos (`ROBUSTNESS_SCREEN_V2`)

V1 e V2 declaradas em 05/10/2026 (a V2 é a V1 mais o CPCV). Vale para estudos usados em pilotos que começarem **depois** do piloto atual. O piloto em andamento segue `INDEPENDENT_PAPER_SCREEN_V1`, sem mudança de regra no meio.

## Por quê

Quanto mais estratégias testamos, maior a chance de a "melhor" ser só sorte. Até hoje o registro tem 8 configurações testadas (SHORT_HORIZON_V1 e MULTI_DAY_TREND_V1), e a rodada da equipe soma mais 6.

## O que é medido

`GET /backtests/v2/studies/:id/robustness` calcula sob demanda, numa thread separada (não trava o servidor nem o piloto). O resultado aparece em Estratégias, nos detalhes do estudo.

| Medida | O que é | Exigência |
|---|---|---|
| Deflated Sharpe (Bailey e López de Prado, 2014) | Probabilidade de o Sharpe fora da amostra ser real, descontando o número de tentativas do registro, a assimetria e a curtose | ≥ 90% |
| PBO por CSCV (Bailey et al., 2017) | Em todas as 252 combinações de 10 blocos, com que frequência o melhor candidato "dentro da amostra" fica abaixo da mediana "fora da amostra" | ≤ 50% (só com 2 ou mais candidatos) |
| Caminhos positivos | Fração das combinações em que o candidato escolhido tem Sharpe positivo fora da amostra | ≥ 60% (só com 2 ou mais candidatos) |
| CPCV (López de Prado, 2018) | 10 grupos de horas seguidas, 2 de teste por vez: 45 divisões. O candidato é escolhido no treino e medido no teste. As horas de treino coladas no teste saem (purga de 1 h antes, embargo de 1% das horas, mínimo 24 h, depois). Com os testes formam-se 9 caminhos completos fora da amostra, cada um cobrindo todas as horas uma vez só | ≥ 60% dos caminhos com Sharpe positivo; sem caminhos (histórico curto), reprova |

As fórmulas foram implementadas em TypeScript a partir dos artigos, sem copiar código de terceiros.

## Resultado no estudo do piloto (d674cb32), medido em 05/10/2026

| Medida | Valor |
|---|---|
| Sharpe anual fora da amostra | 0,16, em 3 493 h |
| Sharpe esperado só por sorte, com 8 tentativas | 2,68 |
| Deflated Sharpe | **6%** (exige 90%) |
| PBO | **99%**: o melhor dentro da amostra quase sempre ficou entre os piores fora dela |
| Caminhos positivos | 71% |
| CPCV (V2) | 9 de 9 caminhos positivos, mas fracos: Sharpe anual mediano 0,52 (pior 0,09) e retorno de 0,1% a 2,4% por caminho. Embargo de 46 h. Escolhas nas 45 divisões: SMA 48/240 em 20, BREAKOUT 480 em 15, SMA 72/480 em 10 |
| Veredito | **Não passa.** Confirma com número o que já se sabia: a evidência do piloto é fraca. |

**Leitura do CPCV:** os três candidatos do estudo ficaram levemente positivos em quase todo trecho, por isso todo caminho fica acima de zero. Mas a escolha entre eles é sorte (PBO de 99%), e o ganho é pequeno demais diante do número de tentativas (Deflated Sharpe de 6%). O CPCV sozinho não aprova nada: ele mede se o processo de escolha se sustenta fora da amostra, e o Deflated Sharpe continua sendo a barra contra a sorte.

## Proteções (`BREAKOUT_480_PROTECTED_V1`)

Ideia do Freqtrade (licença GPL: só a ideia, nenhum código). São parte da configuração do estudo, então valem igualmente no backtest e no piloto ao vivo. Só impedem **abrir** posição; fechar continua sempre permitido.

- `cooldownHours: 24`: depois de encerrar uma operação, 24 h sem abrir outra.
- `maxConsecutiveLosses: 2` e `lossPauseHours: 72`: depois de 2 perdas seguidas, 72 h sem abrir.
- Pausa por drawdown (05/10/2026, disponível para estudos novos): `maxDrawdownPercent`, `drawdownLookbackHours` e `drawdownPauseHours`, sempre os três juntos. Se o resultado acumulado das operações encerradas nas últimas `drawdownLookbackHours` (contadas até a última operação) caiu do topo ao fundo `maxDrawdownPercent`% do capital ou mais, novas entradas ficam pausadas por `drawdownPauseHours` depois da última operação. Sem capital conhecido, a proteção bloqueia (nunca abre sem conseguir conferir). Complementa o limite de drawdown de 10% do risco, que é por conta e nunca é desligado.

Quando o piloto bloqueia uma entrada por proteção, o Sentinel grava uma memória de decisão com o motivo. A configuração do piloto atual não tem proteções, então nada muda para ele.

## Correção encontrada nesta rodada

O walk-forward reservava só `slowPeriod` (480 h) de aquecimento antes de cada janela de teste. Filtros com aquecimento maior (regime de 720 h do Oracle) perdiam as primeiras 240 h de cada teste. Agora o aquecimento é o maior entre o sinal e os filtros. Estudos sem filtro, como o do piloto, não mudam.
