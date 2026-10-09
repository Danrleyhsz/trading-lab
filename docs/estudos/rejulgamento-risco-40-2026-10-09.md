# Rejulgamento com a barra de queda máxima em 40% (09/10/2026)

A pedido do dono, a barra de queda máxima passou de **15% para 40%**. Nenhum dado foi baixado e nenhuma simulação foi refeita: a queda máxima já estava medida em cada resultado, e o rejulgamento só troca o limite desse critério e mantém todos os outros como estavam.

**Isto não é uma validação independente.** A barra foi alterada depois de ver os resultados, por uma decisão do dono sobre quanto risco aceitar. O que continua independente é só o fato de os preços de 12/2020 a 12/2021 não terem sido vistos quando as regras foram declaradas. Os demais critérios (lucro, anos positivos, custos dobrados, neutralidade de mercado, Sharpe deflacionado) não foram tocados.

| Estudo | Candidata | Queda máx. | Reprovava em (barra 15%) | Reprova em (barra 40%) | Situação a 40% |
|---|---|---|---|---|---|
| XSMOM_V1 (2 períodos de 6 meses, 10% por posição) | XSMOM_L7 | 17.2% | BOUNDED_DRAWDOWN_A, POSITIVE_PNL_B, BOUNDED_DRAWDOWN_B | POSITIVE_PNL_B | reprova (mudou) |
| XSMOM_V1 (2 períodos de 6 meses, 10% por posição) | XSMOM_L28 | 22.9% | BOUNDED_DRAWDOWN_A, BOUNDED_DRAWDOWN_B | - | passa tudo (mudou) |
| XSMOM_LONG_HISTORY_V1 (2022 a ago/2025) | XSMOM_L28 | 8.8% | DEFLATED_SHARPE | DEFLATED_SHARPE | só Sharpe deflacionado |
| FATORES_V1 (2022 a out/2026) | XSMOM_L28 | 20.5% | BOUNDED_DRAWDOWN, DEFLATED_SHARPE | DEFLATED_SHARPE | só Sharpe deflacionado (mudou) |
| FATORES_V1 (2022 a out/2026) | XS_CARRY_V1 | 14.9% | DEFLATED_SHARPE | DEFLATED_SHARPE | só Sharpe deflacionado |
| FATORES_V1 (2022 a out/2026) | XS_LOWVOL_V1 | 44.8% | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, MARKET_NEUTRAL, DEFLATED_SHARPE | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, MARKET_NEUTRAL, DEFLATED_SHARPE | reprova |
| FATORES_V1 (2022 a out/2026) | XS_COMPOSITE_V1 | 20.4% | BOUNDED_DRAWDOWN, MARKET_NEUTRAL, DEFLATED_SHARPE | MARKET_NEUTRAL, DEFLATED_SHARPE | reprova (mudou) |
| COMBO_CARRY_MOM_V1 replay (2022 a out/2026) | COMBO_CARRY_MOM_V1 | 10.4% | - | - | passa tudo |
| RAPIDO_V1 (2022 a out/2026) | XS_REV24_V1 | 66.9% | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | reprova |
| RAPIDO_V1 (2022 a out/2026) | XS_REV8_V1 | 92.0% | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | reprova |
| RAPIDO_V1 (2022 a out/2026) | XS_MOM72_V1 | 16.4% | BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | reprova (mudou) |
| RAPIDO_V1 (2022 a out/2026) | XS_CARRY72_V1 | 26.9% | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | POSITIVE_PNL, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE | reprova (mudou) |
| HOLDOUT_2021_V1 (12/2020 a 12/2021, não visto) | XSMOM_L28 | 16.0% | BOUNDED_DRAWDOWN | - | passa tudo (mudou) |
| HOLDOUT_2021_V1 (12/2020 a 12/2021, não visto) | XS_CARRY_V1 | 32.5% | BOUNDED_DRAWDOWN | - | passa tudo (mudou) |
| HOLDOUT_2021_V1 (12/2020 a 12/2021, não visto) | COMBO_CARRY_MOM_V1 | 17.4% | BOUNDED_DRAWDOWN | - | passa tudo (mudou) |

Mudaram de situação 9 das 15 linhas: XSMOM_L7 em XSMOM_V1; XSMOM_L28 em XSMOM_V1; XSMOM_L28 em FATORES_V1; XS_COMPOSITE_V1 em FATORES_V1; XS_MOM72_V1 em RAPIDO_V1; XS_CARRY72_V1 em RAPIDO_V1; XSMOM_L28 em HOLDOUT_2021_V1; XS_CARRY_V1 em HOLDOUT_2021_V1; COMBO_CARRY_MOM_V1 em HOLDOUT_2021_V1.

## Leitura honesta

- **O que mudou:** quatro resultados passam a vir sem a reprovação de queda máxima. O momentum de 28 dias em `XSMOM_V1` passa tudo (era a única reprovação dele, com posições de 10%, o dobro do tamanho atual); no `FATORES_V1` ele fica só com o Sharpe deflacionado; e as três finalistas do `HOLDOUT_2021_V1` passam tudo. O resto não muda: reversão, baixa volatilidade, composto, momentum de 72 h e carry de 72 h reprovam por lucro, estabilidade, custos ou neutralidade, não por queda.
- **A barra de 40% quase deixa de filtrar.** Com ela, só reprovam por queda máxima a baixa volatilidade (44,8%) e as reversões (67% e 92%), que já reprovavam por perder dinheiro. O que sobra de proteção são os outros critérios, em especial o **Sharpe deflacionado**, que continua reprovando o momentum (0,33 no histórico longo, contando 5 tentativas) e o carry.
- **Quadro final com 40%:**
  - **Momentum de 28 dias:** passa tudo em 2 de 3 avaliações e só o Sharpe deflacionado reprova nas outras (no histórico de 2022 a 2026, contando as tentativas). Nos dados não vistos (2021): confirmado, +33,3%, Sharpe 1,32. É a melhor evidência histórica que o laboratório tem.
  - **Combinação carry + momentum:** passa tudo, nos dois recortes. Formalmente é a única que cumpre a regra do protocolo do holdout para o rótulo "validada em dados históricos" (portão de 2022 a 2026 mais confirmação no não visto). Na prática **ela não acrescenta nada ao momentum**: nos dados não vistos teve queda maior e retorno menor. O rótulo seria correto no papel e enganoso na leitura.
  - **Carry sozinho:** passa os critérios em 2021 com queda de 32,5% e 33% das reamostragens negativas. Passar com a barra mais alta não o torna forte.
- **Consequência prática da barra de 40% que não aparece na tabela:** o motor de risco do laboratório (`docs/CONTINUOUS_PAPER_PILOT.md`) limita a queda da conta a **10%** e o piloto tem limite de perda de **3%**. Uma estratégia com queda histórica de 16% a 32% estouraria o limite de 10% no paper trading e seria parada pelo motor. Aceitar 40% na pesquisa não muda isso na execução. Para operar uma dessas estratégias, ou o tamanho da posição cai até a queda histórica caber nos 10%, ou o limite do motor de risco é alterado por decisão explícita. É a questão de tamanho de posição levantada no resultado do holdout.
