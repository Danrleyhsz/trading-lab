# Protocolo pré-declarado: TRIAGEM_PILOTO_2_V1

Declarado em 09/10/2026, **antes de qualquer estudo desta triagem ser executado**, e registrado no Git antes da primeira rodada. Candidatos, pedido, critérios e ordem de decisão abaixo são fixos. Uma ideia diferente ganha nome novo e declaração nova; este documento não é editado para caber num resultado.

Só pesquisa. Não muda o piloto em curso (`PILOT_EVALUATION_V1`), não é recomendação de investimento e não usa dinheiro real.

## Por que agora

O piloto da Nova (estudo `d674cb32`, BREAKOUT 480 h em BTCUSDT) tem, em 09/10/2026 às 00:57 UTC, 98 decisões, todas "ficar fora", 0 operações e P&L do piloto igual a 0, com o BTC −5,3% no período. O veredito provisório é `INSUFFICIENT_EVIDENCE`. O próximo passo pré-declarado em `docs/PILOT_EVALUATION_PROTOCOL.md` é **refazer a triagem com dados recentes, incluindo os conjuntos da equipe, e só iniciar outro piloto com um estudo elegível.**

Medido em 09/10/2026, o próprio estudo do piloto **não passaria** na triagem de robustez (`ROBUSTNESS_SCREEN_V2`): Sharpe deflacionado 6% (exige 90%) e PBO 99% (exige no máximo 50%), com 8 tentativas no registro. A triagem existe para não repetir isso: escolher o próximo estudo por critério, e não por falta de alternativa.

## O que a triagem decide

Uma única pergunta: **existe algum estudo elegível para um segundo piloto paper?** "Nenhum" é um resultado válido e é o mais provável (ver "Expectativa declarada"). Não há prazo para encontrar um.

## Candidatos (fechados: 2 estudos)

Todos já existem no código, nenhum é ideia nova.

| Estudo | Conjunto | Por que entra |
|---|---|---|
| 1 | `BREAKOUT_480_CONTROL_V1` | Controle: o sinal do piloto atual, sem filtro. Serve de régua para os outros dois. |
| 2 | `TEAM_VEGA_VOLATILITY_V1` | Única hipótese da equipe que ficou acima do controle no replay offline corrigido (+151,95 contra +83,60). |

**Ficam de fora, de propósito:**
- `TEAM_ORACLE_REGIME_V1`: no replay corrigido deu resultado idêntico ao controle (o regime de 30 dias não vetou nada).
- `TEAM_SATOSHI_MOMENTUM_V1`: idêntico ao controle (um rompimento já tem momentum de 24 h positivo).
- `TEAM_COMBINED_V1`: idêntico ao Vega, porque os outros dois filtros não mudam nada.
- `BREAKOUT_480_PROTECTED_V1`: já foi medido em BTCUSDT no estudo multimoedas (`docs/estudos/multimoedas-2026-10-05.md`): 7 operações, reprovado por `MINIMUM_TRADES` e `DEFLATED_SHARPE`. Rodar de novo sobre quase os mesmos dados repetiria o resultado.
- `SHORT_HORIZON_V1` e `MULTI_DAY_TREND_V1`: o primeiro está reprovado e preservado como falha; o segundo é o estudo do piloto atual e já está medido.
- Estudos multimoedas, cesta de tendência, momentum entre moedas, carry de funding e hipóteses de vídeo: já têm veredito próprio em `docs/estudos/` e usam outro universo ou simulador.

**Por que só 2:** o registro de tentativas conta as **configurações diferentes** dos estudos concluídos (hoje 8). Cada configuração nova **eleva a barra do Sharpe deflacionado**. O controle não acrescenta nenhuma (é idêntico ao candidato BREAKOUT 480 do `MULTI_DAY_TREND_V1`); o Vega acrescenta 1, para 9. Rodar variantes que se sabe serem iguais ao controle, ou já medidas, só aumentaria a barra sem informação nova.

## Pedido e dados (iguais para os dois)

`{"bars":5000,"trainBars":1500,"testBars":500,"candidateSet":"<conjunto>"}`, executado em produção pelo corredor oficial de estudos, o mesmo do estudo do piloto. As 5 000 horas mais recentes de BTCUSDT perpétuo da Binance USD-M, com funding real e os custos do protocolo (taxa 0,055%, derrapagem 1 bp, 10% de posição).

Os dados de uma rodada nova cobrem cerca de **5 dias a mais** que os do `d674cb32`; a janela é quase a mesma. Por isso **a triagem não é uma amostra nova**: ela confirma ou desfaz o resultado antigo com o acréscimo das últimas semanas e, em particular, de um período em que o BTC caiu. Isso é dito antes, para não ser vendido depois como evidência independente.

**Quando:** depois que o relatório do piloto trouxer o **veredito final** (o estudo perde a elegibilidade por volta de 11/10/2026 às 20:00 UTC). Os estudos são **criados pelo dono**, com sessão autenticada; o assistente só lê os resultados. Cada estudo registra a data, o `datasetHash` e o commit/fingerprint do release em que rodou.

## Critérios de aceite (todos, por estudo)

1. Passa `INDEPENDENT_PAPER_SCREEN_V1` sem nenhuma mudança (inclui o mínimo de 10 operações, 3 janelas, queda máxima de 15% e idade da evidência).
2. Passa `ROBUSTNESS_SCREEN_V2`: Sharpe deflacionado de pelo menos 90%, contando as tentativas do registro **com estes 2 estudos incluídos**, e CPCV com pelo menos 60% dos caminhos positivos. Nos conjuntos de um candidato só, o PBO e os caminhos por CSCV não se aplicam, como no protocolo de robustez.
3. Para o estudo 2 (Vega): lucro líquido fora da amostra **acima do controle (estudo 1) rodado sobre o mesmo conjunto de dados**.

## Ordem de decisão

| Resultado | Próximo passo |
|---|---|
| Nenhum estudo elegível | **Não há segundo piloto.** Registrar a lição em `docs/estudos/triagem-piloto-2-<data>.md`. Qualquer nova hipótese precisa de protocolo próprio, declarado antes. |
| Um ou mais elegíveis | Escolher o de maior Sharpe deflacionado entre os elegíveis. Preparar o piloto 2 (abaixo) e **pedir aprovação do dono**; nada começa sem ela. |

## Expectativa declarada

**Probabilidade alta de nenhum estudo passar.** No replay offline corrigido de 05/10/2026, o controle fez 8 operações e o Vega 7, ambos abaixo do mínimo de 10 do critério 1, e o conjunto de proteções fez 7 em BTCUSDT. Um BREAKOUT de 480 horas em um ativo gera poucas operações em 5 000 horas, e a janela só cresce 5 dias. Se isso se confirmar, o resultado correto é "nenhum", e **os limiares não são afrouxados depois**.

## Regras da triagem

- Limiares, pedido e candidatos não mudam depois de ver qualquer resultado.
- Todos os estudos entram no registro, inclusive os reprovados, e nada é apagado ou reescrito.
- Nenhum filtro ou proteção é acrescentado a um piloto em curso.
- O resultado é escrito com a leitura honesta, mesmo que seja negativo, no mesmo dia da execução.

## Se houver um estudo elegível: preparar o piloto 2

Só depois da aprovação do dono, em uma única mudança de release:
- **Espera do candle:** o PR #64 (`CONTINUOUS_SIGNAL_SETTLE_SECONDS`), com **60 s**, declarado junto com o estudo novo. Padrão 0, para não alterar nenhum piloto em curso.
- **Estudo:** novo `AUTONOMOUS_STUDY_ID`, no mesmo formato de configuração do piloto 1.
- **Avaliação:** o mesmo `PILOT_EVALUATION_V1` (3 operações fechadas no mínimo, limite de perda de 3%), com o ponto de partida já corrigido (#103).
- **Deploy:** muda o backend, então `CONTINUOUS_RELEASE_COMMIT` primeiro (Save, rebuild e deploy) e `CONTINUOUS_RELEASE_BACKEND` depois (Save apenas).
