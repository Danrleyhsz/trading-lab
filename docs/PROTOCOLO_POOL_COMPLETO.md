# Protocolo pré-declarado: PIT_COMPLETO_V1 (momentum de 28 dias em universo ponto no tempo, com o pool completo)

Declarado em 09/10/2026, **antes** de baixar qualquer preço das moedas novas deste pool, e registrado no Git antes da execução. A regra, o pool, a forma de escolher o universo a cada data, o tratamento de listagens e deslistagens, o tamanho, o período, os custos, os critérios e o veredito são fixos. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance USD-M. Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## A pergunta

`PIT_UNIVERSO_V1` (`docs/estudos/universo-pit-2026-10-09.md`) escolheu o universo de cada data só com informação até ela, mas dentro de um pool de 59 moedas que existem hoje e foram listadas até 11/2021. Resultado: +5,7%, Sharpe 0,23, 2 de 4 anos positivos, `NAO_VALIDADA`, e as 15 moedas originais (as que deram certo) ocupavam de 52% a 79% das vagas. Duas limitações ficaram abertas: o pool não tinha as moedas listadas depois de 11/2021 (justamente as mais líquidas de 2024 a 2026) e não tinha moedas que saíram.

Este estudo fecha o que a API pública permite: **todas** as perpétuas USDT de moeda listadas até 30/09/2025, **incluindo as que estão em processo de deslistagem** (estado `SETTLING`, 125 delas), com cada moeda entrando no universo só depois de existir há 28 dias. A pergunta: **com o pool o mais completo possível, e o universo escolhido a cada data sem olhar o futuro, o momentum de 28 dias ainda tem vantagem?**

## Regra (fixa)

- **Pool:** lista mecânica de `scripts/estudos/pool-completo-lista.ts`, registrada em `docs/estudos/pool-completo-lista-2026-10-09.json` (543 moedas: 418 em operação e 125 em liquidação): perpétuas USDT da Binance USD-M, do tipo "moeda" (não ações, índices nem commodities), em operação ou em liquidação, listadas até 30/09/2025, sem moedas-dólar. Nenhum preço ou retorno entra na lista.
- **Dados:** velas de 1 hora e funding de 04/12/2021 (ou da listagem, se posterior) até 05/10/2026 23:00 UTC. Mesmo tratamento dos estudos anteriores: horas faltantes dentro da vida da moeda viram vela parada com volume zero (contadas); funding sem preço de marcação usa a abertura da vela da hora.
- **Qualidade (regra mecânica, antes de qualquer retorno):** moeda com mais de 1% de horas preenchidas na sua vida, ou sem nenhuma vela, sai do pool. Moedas não são substituídas.
- **Elegibilidade a cada decisão:** a moeda precisa ter pelo menos **672 h de velas** (para o retorno de 28 dias e para a janela de volume) e **estar em negociação** na vela da decisão.
- **Universo a cada data (ponto no tempo):** a cada **4 decisões semanais (672 h)**, a partir da primeira decisão, escolhem-se as **30 moedas elegíveis de maior volume financeiro** dos 672 h anteriores ao fechamento da vela da decisão (volume em moeda da vela × fechamento, somado); empates por ordem alfabética do símbolo. Nas decisões semanais seguintes, só ficam as do universo que continuam em negociação.
- **Estratégia:** atratividade = retorno das últimas 672 h; compra as **5** de maior e vende as **5** de menor dentro do universo da data; **2,5% do patrimônio por posição** (exposição bruta 0,25x); decisão semanal, execução na abertura da vela seguinte; capital simulado de 10 000; empates por ordem alfabética.
- **Moeda deslistada com posição aberta:** a posição fica avaliada no último fechamento disponível e é zerada nesse preço na decisão semanal seguinte, com os custos de sempre. Isso não usa o preço de liquidação final, que a API pública de velas não traz.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real.
- **Simulador:** o enxuto de `scripts/estudos/lean-sim.ts`, conferido contra o completo em teste, e o controle (5% nas 15 moedas originais, histórico de `XSMOM_LONG_HISTORY_V1`) tem de reproduzir +55,06% e queda máxima de 8,77% (tolerância de 0,05 ponto percentual) antes de qualquer número ser calculado; se não reproduzir, o estudo para.
- **Período:** primeira decisão em 01/01/2022 00:00 UTC, até a última vela disponível (cerca de 05/10/2026).

### Sobre o tamanho do universo (30)

O número **30** foi escolhido **depois** de ver, em `PIT_UNIVERSO_V1`, que o universo maior dava resultado melhor (de forma informativa, naquele pool). Não é uma escolha limpa: é informada por números já vistos. Ele é adotado como principal porque com um pool de mais de 500 moedas 15 é pouco para escolher os extremos, e o estudo anterior apontou que amplitude importa. Para não esconder isso, **15 e 60 moedas** são reportados como robustez, e o Sharpe deflacionado conta mais uma tentativa (18).

## Critérios (período inteiro, com os custos acima)

1. `DATA_QUALITY`: pelo menos 90% das moedas do pool com dados utilizáveis.
2. `POSITIVE_PNL`: lucro líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo **15%**.
4. `POSITIVE_YEARS`: lucro positivo em pelo menos 3 dos 4 anos completos (2022 a 2025); 2026 reportado, não conta.
5. `DOUBLED_COSTS_POSITIVE`: lucro líquido positivo com taxa e slippage dobrados.
6. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das moedas elegíveis a cada hora de no máximo 0,30 (aproximada pelo retorno médio das moedas do universo vigente).
7. `BOTH_HALVES_POSITIVE`: lucro líquido positivo em cada metade (01/01/2022 a 30/06/2024 e 01/07/2024 até o fim).

## Veredito

- **`VALIDADA_POOL_COMPLETO`:** passa os 7 critérios. Significa que o momentum de 28 dias com 0,25x se sustenta quando o universo é escolhido sem olhar o futuro e o pool inclui moedas novas e moedas em deslistagem. É o máximo que o laboratório consegue no passado com dados públicos.
- **`NAO_VALIDADA`:** qualquer outro caso. O momentum de 28 dias fica **sem validação histórica** de forma definitiva para este laboratório; a busca por variantes de momentum com esses dados termina. Nenhum parâmetro é ajustado depois.

## Informação reportada, sem entrar no veredito

- universo de **15** e de **60** moedas (5 e 5 em todos);
- 5% por posição e a razão das quedas máximas;
- **sem as 59 moedas dos estudos anteriores** (só moedas que nenhum estudo tinha usado), para ver se o resultado depende das antigas;
- contribuição por tipo: parte do resultado vinda de moedas em liquidação e de moedas listadas depois de 2021;
- composição: quantas moedas diferentes entram no universo por ano e parte das vagas nas 15 originais;
- resultado por ano e por metade, queda máxima por ano; 2026 parcial;
- Sharpe anualizado e Sharpe deflacionado (18 tentativas, fora do veredito); comprar e segurar a cesta do universo;
- hash SHA-256 de cada dataset e o commit deste protocolo.

## Limites declarados antes de rodar

- **Ainda há sobrevivência:** moedas que a Binance já removeu totalmente da lista de contratos e moedas listadas depois de 30/09/2025 não entram. As 125 em liquidação melhoram muito o quadro, mas o pool não é a história completa do mercado.
- **Moedas em liquidação:** muitas perderam preço e liquidez antes de sair. Tê-las no pool é a correção do viés de sobrevivência (o momentum vende justamente as que caem), mas o preço final de liquidação não está nas velas e o tratamento descrito acima é uma aproximação. Operar de verdade essas moedas, perto da saída, seria mais difícil e mais caro do que a simulação supõe.
- **Liquidez e custos:** moedas pequenas têm spread maior; 2 bps de slippage é otimista para elas. O custo dobrado cobre parte disso. O volume financeiro é aproximado (volume em moeda × fechamento).
- **Vendas a descoberto** sem custo de empréstimo e sem limite de liquidez. Para moedas pequenas isso é mais irreal do que para as grandes.
- **Funding antigo sem preço de marcação:** preenchido pela abertura da vela da hora, como antes.
- **Mesmo período do calendário** dos testes anteriores: o regime de mercado não é novo.

## Regra de uso único

Este pool é consumido por esta olhada para o momentum com 0,25x. Se der `NAO_VALIDADA`, não se tenta outro tamanho, janela, número de moedas ou cadência nele (as robustezes acima são informação, não nova tentativa).
