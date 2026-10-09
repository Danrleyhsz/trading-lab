# Protocolo pré-declarado: HOLDOUT_2021_V1 (validação das finalistas em dados que nenhum estudo viu)

Declarado em 09/10/2026, **antes** de baixar ou olhar qualquer preço desta janela, e registrado no Git antes da execução. As finalistas, as regras, a janela, os custos e os critérios abaixo são fixos. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance USD-M. Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## Por que isto, e a decisão do dono que o motivou

O dono decidiu (09/10/2026) validar as estratégias **com o mercado passado**, sem esperar o futuro. É possível, com uma condição: o passado usado para validar tem de ser um que **nenhuma escolha nossa tenha visto**.

Todos os estudos até hoje usam 2022 a out/2026. Foram dezenas de tentativas nesses mesmos preços (momentum, carry, baixa volatilidade, composto, combinação, reversão, vídeos). Mesmo com pré-declaração, quem testa muitas ideias no mesmo trecho acaba encontrando, por acaso, as que combinam com ele. Por isso esse trecho serve para **descobrir** e **não conta mais como validação**. A combinação carry + momentum, em particular, foi escolhida depois de ver os resultados individuais nesse trecho.

Os preços de **dezembro de 2020 a dezembro de 2021** das mesmas 15 moedas existem na Binance e **não foram usados por nenhum estudo do laboratório** (o dado mais antigo que qualquer estudo baixou começa em 04/12/2021). É o único passado limpo que temos nas mesmas moedas. Ele é usado **uma vez**, para um número pequeno de finalistas, com a decisão declarada agora.

## Finalistas (3, com regras congeladas)

Regras exatamente como nos protocolos originais, com o mesmo código de `scripts/estudos/fatores-lib.ts`. **Nada é ajustado.**

| Código | Regra | Protocolo de origem |
|---|---|---|
| `XSMOM_L28` | momentum de 672 h; compra as 5 de maior retorno e vende as 5 de menor; 5% por posição; decisão semanal | `PROTOCOLO_MOMENTUM_HISTORICO_LONGO.md` |
| `XS_CARRY_V1` | menos a média do funding das últimas 168 h; 5 e 5; 5% por posição; semanal | `PROTOCOLO_FATORES_V1.md` |
| `COMBO_CARRY_MOM_V1` | os dois livros somados, 2,5% por posição em cada; posições compensadas; semanal | `PROTOCOLO_COMBO_CARRY_MOMENTUM.md` |

Por que estas três: são as que passaram a maior parte dos critérios em 2022 a 2026. O momentum reprovou só no Sharpe deflacionado (0,33); o carry passou 6 dos 7 critérios; a combinação passou o portão. As demais (baixa volatilidade, composto, reversão, momentum de 72 h) foram reprovadas em 2022 a 2026 e **não ganham segunda chance aqui**.

## Dados e janela

- **Universo:** as mesmas 15 moedas (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH, BTC). Todas estavam listadas em perpétuos USDT a partir de 16/10/2020 (data de lançamento lida na lista pública de contratos, sem olhar preço).
- **Velas e funding:** de 03/11/2020 00:00 UTC (672 h antes da primeira decisão) a 31/12/2021 23:00 UTC, velas de 1 hora e liquidações de funding. Mesmo tratamento de dados dos estudos anteriores: grade horária completa, horas faltantes viram vela parada com volume zero (contadas), funding sem preço de marcação usa a abertura da vela da hora, junção validada.
- **Primeira decisão:** 01/12/2020 00:00 UTC; decisão semanal (a cada 168 h) até a última vela com uma vela seguinte, cerca de 56 decisões.
- **Execução:** abertura da vela seguinte; capital simulado de 10 000; exposição bruta 0,5x.
- **Custos do veredito:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real, os mesmos dos estudos anteriores, para comparabilidade. **Informativo:** custo medido (taxa de 0,05% e slippage de 1 bp, `docs/MEDICAO_CUSTO_EXECUCAO.md`).
- **Qualidade dos dados:** no máximo 1% de horas preenchidas por moeda. Se alguma moeda passar disso, **o estudo para sem calcular nada** e o fato é registrado. Não se troca a moeda.

## Critérios (por finalista, na janela inteira)

1. `DATA_QUALITY`: como acima.
2. `POSITIVE_PNL`: lucro líquido positivo com os custos do veredito.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo 15%.
4. `DOUBLED_COSTS_POSITIVE`: lucro líquido positivo com taxa e slippage dobrados.
5. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das 15 moedas de no máximo 0,30.

Os critérios de anos positivos e de Sharpe deflacionado não se aplicam: a janela tem 13 meses e uma única tentativa por finalista.

## Veredito (em ordem)

- **`CONFIRMADA_NO_PASSADO`:** passa os 5 critérios. Significa **"não foi contradita por dados que nunca tinha visto"**.
- **`NAO_CONFIRMADA`:** qualquer outro caso. A estratégia é encerrada, **sem ajuste de parâmetro e sem nova olhada nesta janela**. A lição fica registrada.

## O que cada resultado autoriza

- Uma finalista que passou o portão de 2022 a 2026 **e** foi `CONFIRMADA_NO_PASSADO` ganha o rótulo **"validada em dados históricos"**. Isso é o máximo que o laboratório consegue sem mercado futuro. O próximo passo (por exemplo, medir a execução real em Demo Trading, ou paper trading no servidor) continua sendo decisão do dono. Nada é ativado automaticamente.
- O rótulo **não** é prova de lucro futuro e não tem valor para dinheiro real sem mais camadas (execução medida, limites de risco, operação pequena).

## Informação reportada, sem entrar no veredito

- resultado por trimestre e por metade (dezembro a junho, julho a dezembro), queda máxima por período;
- comparação com os números de 2022 a 2026 de cada finalista, e com comprar e segurar a cesta (que em 2021 subiu muito);
- correlação semanal entre as três finalistas;
- as mesmas medidas com o custo medido, e com o dobro dele;
- **intervalo de reamostragem:** 10 000 reamostragens de blocos de 4 semanas dos retornos semanais de cada finalista, com semente fixa, e a fração das reamostragens com retorno total negativo. Serve só para mostrar o poder do teste, que é baixo com cerca de 56 decisões;
- hash SHA-256 de cada dataset e o commit deste protocolo.

## Regra de uso único

A janela de 12/2020 a 12/2021 é consumida por esta olhada. Qualquer ideia nova, no futuro, precisa de **outro** passado não visto (por exemplo, outras moedas em 2022 a 2026, ou o trecho de 2019 a 11/2020 com menos moedas), declarado antes. Esta janela não serve para novas triagens.

## Limites declarados antes de rodar

- **Pouco poder:** 13 meses e cerca de 56 decisões semanais. Uma estratégia com Sharpe verdadeiro moderado pode perder aqui por acaso, e uma sem vantagem pode passar. `CONFIRMADA_NO_PASSADO` é "não foi contradita", não "provada".
- **Um só regime:** 2021 foi uma alta forte com uma queda brusca em maio; muitas moedas subiram várias vezes. Estratégias vendidas em moedas fracas sofrem nesse tipo de ambiente. Isso é um teste de estresse, não uma amostra típica.
- **Sobreviventes:** as 15 moedas existem hoje; moedas que morreram em 2021 não estão. Favorece o resultado.
- **Custos de 2021:** a liquidez de 2020 e 2021 era menor que a de hoje, então o custo real daquela época era provavelmente maior que os 2 bps. O custo do veredito é o dos estudos anteriores, o dobro cobre parte disso.
- **Vendas a descoberto** sem custo de empréstimo e sem limite de liquidez.
- **Funding antigo sem preço de marcação:** preenchido pela abertura da vela da hora, como antes.
- **Mesmo código e mesma ideia:** as finalistas foram escolhidas olhando 2022 a 2026. Se passarem aqui, o resultado é independente nos preços, mas não na ideia.
