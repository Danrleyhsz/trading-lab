# Protocolo pré-declarado: MOM_METADE_V1 (momentum de 28 dias com metade do tamanho, validado em outras moedas)

Declarado em 09/10/2026, **antes** de baixar qualquer preço das moedas abaixo, e registrado no Git antes da execução. A regra, o tamanho, o universo, o período, os custos, os critérios e o veredito são fixos. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance USD-M. Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## O que é testado e por quê

O momentum de 28 dias (`XSMOM_L28`) foi a melhor estratégia histórica do laboratório: positivo em 2022 a 2026 e nos dados não vistos de 12/2020 a 12/2021 (`HOLDOUT_2021_V1`: +33,3%, Sharpe 1,32). O que o impediu de ser confirmado foi só a queda máxima (16,0% contra a barra de 15%), e o motor de risco do laboratório pára uma conta em 10% de queda. A queda cresce com o tamanho da posição. Esta versão **reduz as posições à metade** para encaixar no risco, e pergunta se o sinal se sustenta em moedas que ninguém usou.

**Hipótese de tamanho, dita antes:** a queda máxima com 2,5% por posição deve ficar perto de metade da queda com 5%, e o retorno perto de metade. Isso é medido e reportado, não é critério.

## Regra (fixa)

Igual ao `XSMOM_L28`, com um único campo diferente:

- atratividade = retorno das últimas 672 h (28 dias), no fechamento da vela da decisão; compra as **5** de maior retorno e vende as **5** de menor, **2,5% do patrimônio do momento por posição** (antes 5%); exposição bruta máxima de **0,25x**;
- decisão semanal (a cada 168 h), executada na abertura da vela seguinte; capital simulado de 10 000; empates por ordem alfabética do símbolo;
- custos: taxa de 0,055% e slippage de 2 bps por lado, mais o funding real;
- simulador: o de `scripts/estudos/fatores-lib.ts`, o mesmo do estudo anterior. O controle (5% nas 15 moedas originais) tem de reproduzir +55,06% e queda máxima de 8,77% (tolerância de 0,05 ponto percentual) antes de qualquer número ser calculado; se não reproduzir, o estudo para.

## Universo: 45 outras moedas, em 3 grupos de 15

Escolhido por **regra mecânica, sem olhar nenhum preço histórico nem variação de preço** (`scripts/estudos/universo-outras-moedas.ts`, resultado em `docs/estudos/universo-outras-moedas-2026-10-09.json`):

1. perpétuos USDT da Binance USD-M em operação hoje, do tipo "moeda" (não ações, índices nem commodities), listados até 30/11/2021 (para ter o histórico completo desde dezembro de 2021), sem moedas-dólar;
2. **fora** as 15 moedas já usadas (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH, BTC);
3. das 71 que sobraram, as **45 de maior volume de 24 horas** na hora da declaração;
4. divididas em 3 grupos de 15 por rodízio de volume (a 1ª, a 2ª e a 3ª maiores vão para os grupos 1, 2 e 3; depois repete), para os grupos terem liquidez parecida.

Cada grupo é uma réplica independente da pergunta "a mesma regra, em 15 moedas diferentes":

- **Grupo 1:** RLC, ADA, DOT, CTSI, XMR, ICP, DASH, VET, ONT, TRB, COTI, ENJ, EGLD, ENS, IOST
- **Grupo 2:** OGN, SAND, SKL, BAT, HBAR, TRX, ETC, GALA, LPT, ZEN, COMP, DYDX, KAVA, ALICE, GRT
- **Grupo 3:** BNB, ATOM, GTC, CRV, ALGO, 1000SHIB, ONE, AR, AXS, MANA, RUNE, CHZ, CHR, IOTA, CELR


## Dados e período

- Velas de 1 hora e liquidações de funding de **04/12/2021** (672 h antes da primeira decisão) até a última vela disponível (cerca de 05/10/2026). Primeira decisão em **01/01/2022 00:00 UTC**.
- Mesmo tratamento de dados dos estudos anteriores: grade horária completa, horas faltantes viram vela parada com volume zero (contadas), funding sem preço de marcação usa a abertura da vela da hora, junção validada.
- **Qualidade (regra mecânica, antes de qualquer retorno):** uma moeda com mais de 1% de horas preenchidas é retirada do grupo; o grupo precisa de pelo menos 12 moedas utilizáveis, senão conta como não aprovado. Moedas não são substituídas.

## Critérios (por grupo, período inteiro, com os custos acima)

1. `DATA_QUALITY`: o grupo tem pelo menos 12 moedas utilizáveis.
2. `POSITIVE_PNL`: lucro líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo **15%** (a barra original do laboratório; esta versão existe justamente para caber nela e, idealmente, nos 10% do motor de risco, que são reportados à parte).
4. `POSITIVE_YEARS`: lucro positivo em pelo menos 3 dos 4 anos completos (2022 a 2025); 2026 é reportado, não conta.
5. `DOUBLED_COSTS_POSITIVE`: lucro líquido positivo com taxa e slippage dobrados.
6. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das moedas do grupo de no máximo 0,30.
7. `BOTH_HALVES_POSITIVE`: lucro líquido positivo em cada metade (01/01/2022 a 30/06/2024 e 01/07/2024 até o fim).

## Veredito

- **`VALIDADA_EM_OUTRAS_MOEDAS`:** pelo menos **2 dos 3 grupos** passam os 7 critérios **e** o terceiro tem lucro líquido positivo.
- **`NAO_VALIDADA`:** qualquer outro caso. A estratégia com esse tamanho é encerrada, sem ajuste de janela, número de moedas ou tamanho, e sem nova olhada neste universo.

## O que o veredito autoriza

`VALIDADA_EM_OUTRAS_MOEDAS` significa que o momentum de 28 dias com 0,25x de exposição se sustentou em dados históricos de dois tipos que não foram usados para escolhê-lo (o período de 2021 nas 15 moedas, e outras 45 moedas em 2022 a 2026). É o máximo que o laboratório consegue sem mercado futuro. **Não autoriza nada sozinho**: implementar a estratégia no paper trading do servidor muda o backend (muda o selo de release e exige deploy) e é decisão do dono.

## Informação reportada, sem entrar no veredito

- o mesmo estudo com 5% por posição em cada grupo, e a razão entre as quedas máximas (a hipótese de tamanho);
- as 15 moedas originais com 2,5% (referência);
- fração dos grupos com queda máxima de até 10% (o limite do motor de risco);
- resultado por ano e por metade, queda máxima por ano; 2026 parcial;
- correlação semanal entre os três grupos e com as 15 moedas originais;
- Sharpe anualizado e Sharpe deflacionado por grupo (3 tentativas novas além das já feitas; não faz parte do veredito);
- comprar e segurar a cesta de cada grupo, como referência;
- hash SHA-256 de cada dataset e o commit deste protocolo.

## Regra de uso único

O universo de outras moedas é consumido por esta olhada para o momentum. Se der `NAO_VALIDADA`, não se tenta outro tamanho nele. Qualquer ideia nova precisa de outro passado não visto (por exemplo, 09/2019 a 11/2020 com poucas moedas).

## Limites declarados antes de rodar

- **Mesmo período do calendário:** estas moedas viveram o mesmo mercado de 2022 a 2026 que as 15 originais, e moedas de cripto andam muito juntas. O teste mostra que as 15 não eram uma escolha de sorte; **não** mostra que o resultado vale em outro regime de mercado (isso é o que 12/2020 a 12/2021 já mediu, só para as 15).
- **Sobreviventes:** só entram moedas que ainda operam hoje. Moedas que caíram e saíram não estão. Para o momentum, que vende as mais fracas, isso provavelmente **subestima** o lado vendido (as que morreram seriam vendas lucrativas), mas a direção do efeito é incerta.
- **Liquidez e custos:** várias dessas moedas são menos líquidas que as 21 medidas em `docs/MEDICAO_CUSTO_EXECUCAO.md`; os 2 bps de slippage podem ser otimistas para elas. O custo dobrado cobre parte disso.
- **Volume de 24 horas na declaração** é um critério ruidoso para ordenar liquidez; foi escolhido por ser objetivo e não depender de retorno.
- **Vendas a descoberto** sem custo de empréstimo e sem limite de liquidez.
- **Funding antigo sem preço de marcação:** preenchido pela abertura da vela da hora, como antes.
