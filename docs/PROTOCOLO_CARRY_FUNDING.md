# Protocolo pré-declarado: FUNDING_CARRY_V1

Declarado em 06/10/2026, **antes** da execução. Protocolo, simulador e script foram registrados no Git antes de qualquer dado de funding ser baixado ou olhado.

## Por que

Todas as estratégias testadas até aqui tentavam acertar a direção do preço: tendência, cesta e momentum entre moedas. O carry de funding ganha de outro jeito.

A estratégia compra a moeda à vista e vende o perpétuo na mesma quantidade. A variação de preço se anula, e o resultado vem do funding que os comprados alavancados pagam aos vendidos.

É a estratégia de cripto mais documentada na literatura:

- Schmeling, Schrimpf e Todorov, *Crypto Carry*, BIS Working Paper 1087, 2023;
- He, Manela, Ross e von Wachter, *Fundamentals of Perpetual Futures*, 2022.

Os dois trabalhos também mostram que esse retorno encolheu e oscila ao longo do tempo. Este teste mede se ainda sobra algo depois dos custos.

## Regra (fixa, sem busca de parâmetros)

- **Universo:** as mesmas 15 moedas do teste de histórico longo (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH e BTC), com o par USDT à vista da Binance e o perpétuo USDT da Binance USD-M.
- **Sinal:** a soma das taxas de funding liquidadas nas últimas 168 horas (7 dias), só com liquidações anteriores ao fechamento da vela da decisão. A soma vale para moedas com funding a cada 8 h ou a cada 4 h.
- **Decisão:** a cada 168 horas, a partir do fechamento da vela de 01/01/2022 00:00 UTC. A execução é na abertura da vela seguinte.
  1. **Saída:** fecha as duas pontas de uma moeda quando o sinal dela é menor ou igual a zero.
  2. **Entrada:** com menos de 5 moedas na carteira, entram as de maior sinal, desde que o sinal seja de pelo menos **0,105%**. Isso equivale a 0,005% a cada 8 h, cerca de 5,5% ao ano.
  3. As moedas que continuam na carteira não são reajustadas, para evitar custo à toa.
- **Tamanho:**
  - cada moeda nova recebe 10% do patrimônio do momento à vista, mais a mesma quantidade vendida no perpétuo;
  - no máximo 5 moedas, ou seja, 50% à vista e 50% vendido.
- **Margem:** uma moeda nova só entra se, depois da compra, o caixa continuar maior ou igual a 50% do valor vendido nos perpétuos. Isso limita a ponta vendida a 2x do caixa.
- **Custos:**
  - à vista: taxa de 0,1%;
  - perpétuo: taxa de 0,055%;
  - slippage de 2 bps em cada ponta, na entrada e na saída;
  - funding real de cada moeda: o vendido recebe quando a taxa é positiva e paga quando é negativa.
- **Liquidação:** a cada hora, a conta é testada no pior caso, com o preço máximo do perpétuo na hora. Se o caixa mais o resultado aberto dos perpétuos ficar abaixo de 1% do valor vendido, o teste registra liquidação e para.
- **Capital simulado:** 10 000 USDT. O caixa parado não rende nada, uma premissa conservadora.

## Dados

- **Velas de 1 hora:** à vista e do perpétuo, de 01/01/2022 00:00 a 05/10/2026 23:00 UTC. É o período mais longo disponível, e o carry nunca foi testado em nenhum trecho dele.
- **Funding:** desde 24/12/2021, para o primeiro sinal ter 7 dias.
- **Horas faltando:** viram uma vela parada no último fechamento. Se mais de 1% das horas de uma série precisar ser preenchido, o teste registra falha de dados.
- **Preço de marcação ausente:** nos fundings antigos, a Binance não informa esse preço. Nesses casos, usa a abertura da vela do perpétuo daquela hora, o mesmo critério do teste de histórico longo.
- **Hash:** o SHA-256 de cada série vai no relatório.

## Critério de aprovação: FUNDING_CARRY_SCREEN_V1

A regra é aprovada só se cumprir **tudo**:

1. Dados completos: nenhuma série com mais de 1% das horas preenchidas.
2. Nenhuma liquidação.
3. P&L positivo no período inteiro, depois dos custos.
4. Queda máxima de até 15%.
5. P&L positivo em pelo menos 4 dos 5 anos-calendário (2022, 2023, 2024, 2025 e 2026 até 05/10).
6. **Sharpe com folga:** probabilidade de pelo menos 90% de que o Sharpe anual verdadeiro seja **maior que 1,0**, pelo PSR sobre os retornos horários, corrigido por assimetria e curtose.

Sobre o critério 6:

- A regra é única, sem busca de parâmetros, e vem de uma fonte de retorno diferente das testadas antes. Por isso não há desconto por várias tentativas dentro da família.
- Em troca, a barra é exigente: não basta o Sharpe ser positivo, ele tem que superar 1,0 com confiança.
- É uma barra parecida com a que reprovou o momentum (cerca de 1,3 de benchmark).

Também são registrados, sem servir de critério:

- retorno anualizado e por ano;
- fração do tempo investida e média de moedas na carteira;
- funding recebido, taxas pagas e resultado da diferença entre os preços à vista e do perpétuo;
- menor folga de margem;
- correlação com o mercado e retorno de comprar e segurar a cesta.

## O que acontece com o resultado

- **Reprovada:** fica registrada. A regra não é refeita com outro limite, tamanho ou universo para forçar aprovação.
- **Aprovada:** o dono decide o próximo passo. O próximo passo pré-declarado seria testar a carteira combinada de momentum e carry, com protocolo próprio, registrado antes.
- **Em nenhum caso:** o piloto atual, o acompanhamento ao vivo ou o servidor são alterados por este teste. Ele roda fora do servidor e não envia ordens.
