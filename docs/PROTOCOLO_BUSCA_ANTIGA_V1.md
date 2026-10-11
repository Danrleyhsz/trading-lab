# Protocolo pré-declarado: BUSCA_ANTIGA_V1 (a mesma regra congelada, nas maiores moedas de 2011 a 2017)

Declarado em 10/10/2026, **antes** de baixar qualquer vela desse período, e registrado no Git antes da execução. As regras, o universo, a escala de risco, os custos, os critérios e o veredito abaixo são **exatamente os de `BUSCA_MAIORES_V1`**, sem nenhum ajuste, e este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com velas diárias públicas de outras corretoras. Não envia ordens, não usa contas, não toca em produção. Não é recomendação de investimento.

## Por que existe

`BUSCA_MAIORES_V1` (`docs/estudos/busca-maiores-v1-2026-10-10.md`) deu `NAO_VALIDADA` por pouco: a tendência nas 5 maiores moedas com alvo de volatilidade de 20% foi positiva nas duas eras (Sharpe de 0,98 no período inteiro, 0,4 em 2022 a 2026), mas com queda máxima de 38% a 47% e Sharpe baixo na segunda era. A hipótese nasceu olhando os dados de `BUSCA_DIARIA_V1`, e o conjunto de dados da Binance (2017 a 2026) está consumido.

Este teste usa **um passado que nenhuma etapa desta pesquisa viu**: de setembro de 2011 a 16/08/2017, **antes** do início do conjunto da Binance (17/08/2017). Nele não existe nenhum ajuste a fazer: a regra é a que já foi testada, e o resultado só pode confirmar ou contrariar.

## Dados

| Moeda | Fonte (par em dólar) | Início dos dados |
|---|---|---|
| BTC | Bitstamp `BTC/USD` | 02/09/2011 |
| LTC, ETH, ETC, ZEC, XMR, DASH, XRP, EOS, IOTA, OMG | Bitfinex `LTCUSD`, `ETHUSD`, `ETCUSD`, `ZECUSD`, `XMRUSD`, `DSHUSD`, `XRPUSD`, `EOSUSD`, `IOTUSD`, `OMGUSD` | de 05/2013 (LTC) a 07/2017 |

- Velas diárias (UTC). O período do teste vai do início de cada série a **16/08/2017**. As velas posteriores até 31/12/2018 são baixadas **só para conferir** que a série bate com a da Binance (correlação dos retornos diários de BTC e ETH, `docs/estudos/busca-antiga-v1-2026-10-10.md`); não entram no teste.
- Volume financeiro diário = volume em moeda × fechamento (aproximação).
- Os pares e as fontes acima estão declarados **antes** de baixar; nenhum par é acrescentado nem retirado depois.

## Regras, universo, escala e custos (congelados de `BUSCA_MAIORES_V1`)

- **Regras:** `SMA50`, `SMA100`, `DONCHIAN_55_20`, compradas ou fora, mesma definição de sinal.
- **Elegibilidade:** pelo menos 90 dias de velas, mediana do volume financeiro de 30 dias de pelo menos **US$ 1 milhão por dia**, vela no dia seguinte. (Em 2011 e 2012 o BTC não atinge esse volume; o teste só começa a investir quando atinge. O BTC sem esse filtro é reportado à parte.)
- **Universo:** as 5 elegíveis de maior volume somado dos 90 dias anteriores, ranking a cada 30 dias, fatia `1 / min(5, membros elegíveis)`.
- **Escala de risco:** alvo de volatilidade de 20% ao ano sobre os retornos brutos da carteira nos 60 dias anteriores, sem alavancagem, fator 0,5 antes de 30 dias de histórico.
- **Custos:** 15 bps por lado sobre a variação de peso; sensibilidade com o dobro **e com o quádruplo (60 bps por lado)**, porque em 2012 a 2015 os spreads eram bem maiores que os de hoje.
- **Benchmark:** os mesmos membros sempre comprados, com a mesma escala e os mesmos custos.

## Critérios (todos precisam passar; a janela é a série inteira até 16/08/2017)

1. `DATA_QUALITY`: pelo menos 90% dos pares declarados com série utilizável.
2. `POSITIVE_NET`: retorno líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo **30%**.
4. `SHARPE_BAR`: Sharpe anualizado líquido de pelo menos **0,8** e maior que o do benchmark.
5. `POSITIVE_YEARS`: retorno positivo em pelo menos **2 dos 3** anos completos em que a carteira esteve elegível (**2014, 2015 e 2016**); 2013 e 2017 são parciais e reportados.
6. `COSTS_X2`: retorno líquido positivo com custos dobrados.
7. `MEMBER_BREADTH`: entre as moedas que foram membros por pelo menos 365 dias, pelo menos 60% têm retorno líquido total positivo com a regra aplicada sozinha.

## Veredito (uma olhada por regra)

- **`VALIDADA_ANTIGA`:** a regra passa os 7 critérios. Significa que a tendência nas maiores moedas, com a regra e a escala **congeladas**, também funcionou num regime nunca visto.
- **`NAO_VALIDADA`:** qualquer outro caso. A ideia é encerrada, sem ajuste.
- Se mais de uma regra passar, todas são reportadas; o Sharpe deflacionado com **33 tentativas** (as 30 anteriores mais estas 3) é reportado ao lado.

## Informação reportada, sem entrar no veredito

- BTC sozinho com cada regra, com e sem o filtro de volume, com a mesma escala (de 2011 em diante);
- resultado por ano (2011 a 2017), por 2011 a 2013, 2014 a 2015 e 2016 a 2017;
- moedas membros por ano, giro, custo em bps por ano, e o resultado com 60 bps por lado;
- a correlação das séries de BTC (Bitstamp) e ETH (Bitfinex) com as da Binance na sobreposição;
- hash SHA-256 das séries e o commit deste protocolo.

## Limites declarados antes de rodar

- **Quase só BTC.** Até 2016 há 1 a 2 moedas elegíveis (BTC desde 2013, LTC desde 2013 com liquidez baixa); de 2016 a 2017 entram ETH, ETC, XMR e ZEC por pouco tempo. Isto não testa "todas as moedas": testa a ideia de tendência nas maiores, quando só havia uma ou duas.
- **Fontes diferentes e mercados pouco líquidos.** Bitstamp e Bitfinex, spreads de 0,5% ou mais em 2013 a 2015, saques interrompidos, quebra da Mt. Gox (BTC no Bitstamp teve prêmio e desconto sobre outras corretoras). 15 bps por lado é otimista para esse período; por isso a sensibilidade de 60 bps.
- **Só 3 anos completos para o critério de anos** e poucos episódios de tendência (2013, 2014 e a alta de 2016 a 2017), então a evidência estatística é fraca mesmo se passar.
- **Eu conheço o histórico do BTC nesse período** (bolha de 2013, queda de 2014 a 2015). As regras não foram escolhidas olhando esses dados, mas a minha familiaridade não é neutra.
- **Longos períodos de caixa:** a carteira só investe quando alguma moeda tem 90 dias e volume mínimo; o retorno anualizado desse período depende de quando isso ocorre.
- **Sem venda a descoberto, sem rendimento de caixa, execução ao fechamento.**

## Regra de uso único

Estes dados e estas 3 regras congeladas são consumidos por esta olhada. Qualquer variação (outro filtro de volume, outra escala, outra regra) precisa de protocolo novo e entra na contagem de tentativas.
