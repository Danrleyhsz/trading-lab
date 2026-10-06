# Protocolo pré-declarado: XSMOM_FORWARD_V1 (acompanhamento ao vivo)

Declarado em 06/10/2026, às 00:55 UTC, **antes** do início do acompanhamento, e registrado no Git antes da primeira decisão. Regras, universo, tamanho, prazo e critérios abaixo são fixos.

## Por que

Nos dados históricos (`docs/estudos/momentum-entre-moedas-2026-10-05.md`), o momentum entre moedas de 28 dias lucrou nos dois períodos testados: +19,3% no mercado em queda e +17,2% no mercado em alta, sem depender do rumo do mercado. Foi reprovado porque a queda máxima (22,9%) passou do limite de 15%.

Esta hipótese usa **metade do tamanho** para caber no limite de risco. Ela foi escolhida **depois** de ver aqueles dados, e por isso só pode ser validada com **dados futuros**. É isso que este acompanhamento faz.

## Regras (fixas)

- **Universo:** as mesmas 21 moedas (as 20 de `docs/estudos/universo-2026-10-05.json` mais o BTCUSDT), em perpétuos USDT da Binance USD-M.
- **Sinal:** retorno de cada moeda nas últimas 672 horas (28 dias), no fechamento da vela da decisão, só com velas fechadas.
- **Carteira:** compra as 5 moedas de maior retorno e vende as 5 de menor retorno. Cada posição vale **5%** do patrimônio do momento: 25% comprado e 25% vendido, exposição bruta de 0,5x.
- **Agenda:**
  - a primeira decisão é no fechamento da vela de **06/10/2026 02:00 UTC** (às 03:00 UTC), executada na abertura da vela seguinte;
  - depois, a cada 168 horas (semanal), no mesmo horário.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real de cada moeda.
- **Capital simulado:** 10 000 USDT.
- **Execução: só simulação**, a partir de dados públicos. Não envia ordens a nenhuma corretora e não usa as contas do piloto.

## Como é calculado

O servidor baixa os dados públicos das 21 moedas, desde 28 dias antes do início, e refaz a simulação inteira a cada hora com o simulador `src/domain/cross-sectional-momentum.ts`. Como o sinal só usa velas fechadas e a execução acontece na abertura seguinte, o resultado é o mesmo que se as ordens tivessem sido simuladas na hora de cada decisão, e qualquer pessoa pode reproduzi-lo com os mesmos dados públicos.

Se alguma moeda ficar sem dados, o acompanhamento mostra "dados indisponíveis" naquela hora, em vez de calcular com a cesta incompleta.

## Prazo e critérios

- **Duração:** 12 semanas, até a decisão de 29/12/2026 03:00 UTC. Antes disso, nenhum resultado é tratado como conclusão.
- **Parada antecipada:** se a queda máxima chegar a **15%**, o acompanhamento é encerrado e a hipótese é reprovada.
- **Aprovação, ao fim das 12 semanas:** P&L positivo depois dos custos e queda máxima abaixo de 15%. A correlação com o mercado também é registrada, para conferir se a carteira continuou neutra.

## O que acontece com o resultado

- **Reprovada:** fica registrada. A hipótese não é repetida com outro tamanho, prazo ou universo para forçar aprovação.
- **Aprovada:** o dono decide o próximo passo. As opções são um piloto no Demo Trading da Binance (`docs/TESTNET_BINANCE.md`), com ordens reais e dinheiro fictício, e depois, se for o caso, capital real pequeno com limites rígidos. Nada é ativado automaticamente.
- **O piloto atual** (BTCUSDT, estudo d674cb32) não é afetado e segue com as regras dele até o fim.
