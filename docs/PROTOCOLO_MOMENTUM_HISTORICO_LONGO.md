# Protocolo pré-declarado: XSMOM_LONG_HISTORY_V1

Declarado em 06/10/2026, **antes** da execução, e registrado no Git antes de o teste rodar. A regra testada é exatamente a do acompanhamento ao vivo (`docs/PROTOCOLO_ACOMPANHAMENTO_MOMENTUM.md`), sem nenhuma mudança.

## Por que

O acompanhamento ao vivo leva 12 semanas, e cada mês custa a mensalidade do servidor. Há um jeito mais rápido de juntar evidência honesta: **anos de histórico que nenhum estudo usou**.

Até aqui os testes usaram só de 15/08/2025 a 05/10/2026. Este teste usa o período **anterior**, de 01/01/2022 a 14/08/2025. São cerca de 3,6 anos, cobrindo a queda de 2022, a recuperação de 2023 e a alta de 2024. A regra foi escolhida olhando os dados de 2025 e 2026, então este período funciona como teste fora da amostra no tempo.

## Regra (idêntica à XSMOM_FORWARD_V1)

- **Sinal:** retorno de 672 horas (28 dias), no fechamento da vela da decisão, só com velas fechadas.
- **Carteira:** compra as 5 moedas de maior retorno e vende as 5 de menor retorno. Cada posição vale 5% do patrimônio (25% comprado e 25% vendido, exposição bruta de 0,5x).
- **Rebalanceamento:** a cada 168 horas, com a primeira decisão no fechamento da vela de 01/01/2022 00:00 UTC.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real de cada moeda. Capital simulado de 10 000.

## Universo (fixo)

As moedas do universo de 05/10/2026 que já negociavam como perpétuo na Binance antes de 2021 e que, portanto, têm o período inteiro. São 15: ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH e BTC (todas em USDT).

ENA, WLD, ONDO, 1000PEPE, SUI e TAO ficam de fora porque foram lançadas no meio do período. Com 15 moedas, comprar 5 e vender 5 deixa 5 de fora em cada semana.

## Dados

- Binance USD-M, velas de 1 hora (negócios) e funding liquidado, de 04/12/2021 (para ter 672 horas de aquecimento) até 15/08/2025 06:00 UTC.
- **Horas faltando** (paradas da corretora) são preenchidas com uma vela parada no último fechamento, com volume zero. O número de horas preenchidas por moeda vai no relatório. Se uma moeda tiver mais de 1% das horas preenchidas, o teste registra falha de dados para ela.
- O simulador usa só as velas de negócios e o funding. O hash SHA-256 de cada série vai no relatório.

## Critério de aprovação: XSMOM_LONG_SCREEN_V1

A regra é aprovada só se cumprir **tudo**:

1. P&L positivo no período inteiro, depois dos custos.
2. Queda máxima de até 15% no período inteiro.
3. P&L positivo em pelo menos 3 dos 4 anos-calendário (2022, 2023, 2024 e 2025 até 14/08).
4. Sharpe deflacionado de pelo menos 0,9 sobre os retornos horários, contando as **5 tentativas** já feitas com momentum entre moedas (XSMOM_L7, XSMOM_L28, a versão de metade do tamanho e as duas variantes de 7 e 28 dias de cada período). Na prática, isso é um desconto conservador.

Também são registrados, sem servir de critério: o retorno de comprar e segurar a cesta, a correlação com o mercado, as taxas, o funding e o resultado por ano.

## O que acontece com o resultado

- **Reprovada:** a família de momentum entre moedas fica sem evidência suficiente. Cabe ao dono decidir se o acompanhamento ao vivo continua (ele custa a mensalidade do servidor) ou se o serviço é suspenso.
- **Aprovada:** a evidência fica muito mais forte. O dono decide se antecipa o próximo passo (Demo Trading da Binance) em vez de esperar as 12 semanas.
- Em nenhum caso a regra é ajustada para forçar aprovação, e o acompanhamento ao vivo e o piloto atual não são alterados por este teste.
