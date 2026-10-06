# Protocolo pré-declarado: XSMOM_V1 (momentum entre moedas)

Declarado em 05/10/2026, depois dos estudos MULTI_ASSET_STUDY_V1 e TREND_BASKET_V1 e **antes** de qualquer execução deste teste. Este documento é registrado no Git antes de o teste rodar. Universo, regras, períodos e critérios abaixo são fixos.

## Por que esta hipótese

As estratégias de tendência em uma moeda só dependeram do rumo do mercado: lucraram no trecho de alta e ficaram no zero no trecho de queda (`docs/estudos/cesta-tendencia-2026-10-05.md`).

O momentum entre moedas (*cross-sectional momentum*) não aposta no rumo do mercado. Ele **compra as moedas que mais subiram e vende as que mais caíram, no mesmo valor**. Se o mercado inteiro sobe ou cai, as duas pontas se compensam; o que dá lucro é a diferença entre as vencedoras e as perdedoras continuar. Há estudos acadêmicos que relatam esse efeito em criptomoedas. Isso é uma hipótese a testar, não uma garantia.

## Universo e dados (fixos)

- **Moedas:** as mesmas 21 de antes (as 20 do universo de 05/10/2026 mais o BTCUSDT).
- **Dados:** Binance USD-M, velas de 1 hora (negócios) e funding liquidado de cada moeda.
- **Períodos:** os **dois** já baixados, cada um com 5000 velas.
  - **Período A:** 15/08/2025 a 11/03/2026 (mercado em queda).
  - **Período B:** 11/03/2026 a 05/10/2026 (mercado em alta).

A hipótese só é aprovada se funcionar **nos dois**.

## Regras (fixas)

- **Rebalanceamento:** a cada 168 horas (semanal), começando na hora 672 de cada período, para que as duas variantes tenham o mesmo histórico de aquecimento.
- **Sinal:** retorno de cada moeda nas últimas L horas, medido no fechamento da vela da decisão. Só usa velas já fechadas.
- **Carteira:** compra as **5 moedas de maior retorno** e vende as **5 de menor retorno**. Cada posição vale 10% do patrimônio do momento, o que dá 50% comprado e 50% vendido (exposição bruta de 1x). As outras 11 moedas ficam fora.
- **Execução:** na abertura da vela seguinte à decisão. Só negocia a diferença entre a posição atual e a nova.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado sobre o valor negociado, mais o funding real de cada moeda (posição comprada paga funding positivo; vendida recebe).
- **Duas variantes, e só duas:**
  - **XSMOM_L7:** L = 168 horas (7 dias).
  - **XSMOM_L28:** L = 672 horas (28 dias).

## Critério de aprovação: XSMOM_SCREEN_V1

Cada variante é aprovada só se cumprir **tudo**:

1. P&L positivo no período A **e** no período B.
2. Pelo menos 30 posições encerradas em cada período.
3. Drawdown máximo de até 15% em cada período.
4. Sharpe deflacionado de pelo menos 0,9 sobre os retornos horários dos dois períodos juntos, contando **2 tentativas** (as duas variantes).

Também são registrados, sem servir de critério: a correlação com a cesta comprada (para conferir se a carteira ficou neutra ao mercado), o giro, as taxas e o funding.

## O que acontece com o resultado

- **Reprovada:** fica registrada e a hipótese é encerrada. Ela não é repetida com outros prazos, número de moedas ou períodos para forçar aprovação.
- **Aprovada:** vira candidata a um piloto paper da carteira, com protocolo próprio declarado antes e aprovado pelo dono. Nada é ativado automaticamente. O piloto atual (BTCUSDT, estudo d674cb32) segue com as regras dele até o fim.

## Limitações declaradas antes

- **Dados já usados:** os dois períodos já foram usados em estudos de outras hipóteses. Nenhum parâmetro desta hipótese foi ajustado neles, mas não são dados virgens.
- **Universo recente:** as moedas foram escolhidas com liquidez e volatilidade recentes, o que pode favorecer quem sobreviveu.
- **Lado vendido:** em um mercado real, vender a descoberto pode custar mais quando a moeda está muito procurada para short. O funding cobre parte disso; o resto não está modelado.
- **Simulação simplificada:** o preço de marcação é o fechamento de cada hora e não há liquidação por posição; a margem de 1x da carteira inteira é tratada como suficiente.
