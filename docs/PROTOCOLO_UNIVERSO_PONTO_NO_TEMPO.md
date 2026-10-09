# Protocolo pré-declarado: PIT_UNIVERSO_V1 (momentum de 28 dias em universo "ponto no tempo")

Declarado em 09/10/2026, **antes** de calcular qualquer número desta estratégia no universo abaixo, e registrado no Git antes da execução. A regra, o universo, a forma de escolher as moedas a cada data, o tamanho, o período, os custos, os critérios e o veredito são fixos. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance USD-M já baixados em `scripts/estudos/out`. Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## A pergunta

`MOM_METADE_V1` (`docs/estudos/mom-metade-2026-10-09.md`) mostrou que o momentum de 28 dias dá +26,4% nas 15 moedas originais e −14,7%, −30,5% e +2,9% em três grupos de outras 15, no mesmo período e com o mesmo tamanho. A cesta passiva das 15 originais subiu +802%; as dos três grupos novos, −77%, −97% e +52%. As 15 originais foram escolhidas em 05/10/2026 por critérios de hoje (volume, spread, listagem): é um universo escolhido **olhando o futuro**.

A pergunta deste estudo é: **se em cada data o universo for escolhido só com informação até aquela data (as moedas mais líquidas dos últimos 28 dias), o momentum de 28 dias ainda tem vantagem?** Se tiver, o resultado das 15 originais não era só seleção. Se não tiver, a vantagem histórica estava na escolha do universo.

## Regra (fixa)

- **Pool de moedas:** as 59 moedas com histórico completo já baixado: as 15 originais (ZEC, NEAR, UNI, BCH, FIL, AAVE, AVAX, LINK, XRP, XLM, DOGE, SOL, LTC, ETH, BTC) e as 44 de `docs/estudos/universo-outras-moedas-2026-10-09.json` (as 45 menos ICP, que saiu por falta de vela inicial no teste de qualidade). Todas listadas até 30/11/2021, com velas de 1 hora e funding desde 04/12/2021.
- **Universo a cada data (ponto no tempo):** a cada **4 decisões semanais (672 h)**, a partir da primeira decisão, escolhem-se as **15 moedas de maior volume financeiro** dos **672 h anteriores** ao fechamento da vela da decisão. Volume financeiro = soma, em cada hora, de (volume em moeda da vela × preço de fechamento da vela). Empates por ordem alfabética do símbolo. Informação de datas futuras nunca entra. A escolha vale até a próxima, e moedas que saem do universo são zeradas na decisão seguinte.
- **Estratégia:** igual ao momentum de 28 dias: atratividade = retorno das últimas 672 h no fechamento da vela da decisão; compra as **5** de maior atratividade e vende as **5** de menor **dentro do universo da data**; **2,5% do patrimônio por posição** (exposição bruta 0,25x); decisão semanal, execução na abertura da vela seguinte; capital simulado de 10 000; empates por ordem alfabética.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, mais o funding real.
- **Simulador:** o de `scripts/estudos/fatores-lib.ts`, com uma extensão que restringe, a cada decisão, as moedas elegíveis de um livro. Sem a restrição, o resultado tem de ser **idêntico** ao do simulador já testado (teste automatizado), e o controle (5% nas 15 originais) tem de reproduzir +55,06% e queda máxima de 8,77% (tolerância de 0,05 ponto percentual) antes de qualquer número ser calculado; se não reproduzir, o estudo para.
- **Período:** primeira decisão em 01/01/2022 00:00 UTC, até a última vela disponível (cerca de 05/10/2026).

## Critérios (período inteiro, com os custos acima)

1. `DATA_QUALITY`: todas as moedas do pool com no máximo 1% de horas preenchidas (as 59 já passaram no estudo anterior; verificado de novo).
2. `POSITIVE_PNL`: lucro líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo **15%**.
4. `POSITIVE_YEARS`: lucro positivo em pelo menos 3 dos 4 anos completos (2022 a 2025); 2026 reportado, não conta.
5. `DOUBLED_COSTS_POSITIVE`: lucro líquido positivo com taxa e slippage dobrados.
6. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das 59 moedas de no máximo 0,30.
7. `BOTH_HALVES_POSITIVE`: lucro líquido positivo em cada metade (01/01/2022 a 30/06/2024 e 01/07/2024 até o fim).

## Veredito

- **`VALIDADA_PONTO_NO_TEMPO`:** passa os 7 critérios. Significa que o momentum de 28 dias com 0,25x se sustenta quando o universo é escolhido sem olhar o futuro, dentro das 59 moedas. É o máximo que o laboratório consegue no passado.
- **`NAO_VALIDADA`:** qualquer outro caso. O momentum de 28 dias fica **sem validação histórica**, e o único teste restante é o acompanhamento ao vivo (`XSMOM_FORWARD_V1`). Nenhum parâmetro é ajustado depois.

## Informação reportada, sem entrar no veredito

- sensibilidade ao tamanho do universo: o mesmo estudo com **10, 20 e 30** moedas no universo (5 compradas e 5 vendidas em todos), como robustez; **não** substitui o veredito de 15;
- o mesmo estudo com 5% por posição, e a razão das quedas máximas;
- **sem pool de originais:** o universo ponto no tempo escolhido só entre as 44 outras moedas, para ver se as 15 originais carregam o resultado;
- **universo fixo de 59:** 5 compradas e 5 vendidas entre as 59 sempre, sem filtro de liquidez, como referência;
- **composição:** quantas das 15 vagas, em média e por ano, vão para as 15 originais (mostra o quanto a escolha por volume ainda favorece quem deu certo);
- resultado por ano e por metade, queda máxima por ano; 2026 parcial; correlação semanal com as 15 originais fixas;
- Sharpe anualizado e Sharpe deflacionado (17 tentativas, fora do veredito); comprar e segurar a cesta do universo de cada data;
- hash SHA-256 dos datasets e o commit deste protocolo.

## Limites declarados antes de rodar

- **O pool ainda tem olhar para o futuro:** as 59 moedas são as que **ainda existem hoje** e foram listadas até 11/2021. Moedas que morreram, e moedas listadas depois (2022 a 2026), não estão. O filtro ponto no tempo controla **quais** do pool operam a cada data, mas não a composição do pool. Por isso o variante "sem as originais" é reportado. Um universo totalmente livre de hindsight exigiria listas históricas completas, que a API pública não oferece.
- **Moedas novas ausentes:** em 2023 a 2026 estão fora moedas que passaram a ser as mais líquidas (listadas depois de 11/2021). O universo ponto no tempo desses anos é, portanto, mais "antigo" do que o real.
- **Volume financeiro aproximado:** volume em moeda × fechamento da hora, sem o volume financeiro exato da corretora.
- **Mesmo período do calendário** dos testes anteriores: o regime de mercado não é novo.
- **Custos:** moedas de menor volume entram no universo em momentos de queda de liquidez geral; o slippage de 2 bps pode ser otimista para elas. O custo dobrado cobre parte disso.
- **Vendas a descoberto** sem custo de empréstimo e sem limite de liquidez; **funding antigo sem preço de marcação** preenchido pela abertura da vela da hora.

## Regra de uso único

O pool de 59 moedas é consumido por esta olhada para o momentum com 0,25x. Se der `NAO_VALIDADA`, não se tenta outro tamanho, janela de volume ou número de moedas nele (as sensibilidades acima são informação, não nova tentativa). Qualquer ideia nova precisa de outro passado não visto.
