# Protocolo pré-declarado: LISTAGEM_HEDGE_V1 (vender listagens novas com hedge de BTC, nas listagens de 2019 a 2021)

Declarado em 09/10/2026, **antes** de baixar qualquer preço destas moedas, e registrado no Git antes da execução. Regra, eventos, custos, critérios e veredito são fixos. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance USD-M. Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## De onde vem a hipótese e por que este teste é limpo

`BUSCA_EVENTOS_V1` (`docs/estudos/busca-eventos-2026-10-09.md`), família B, vendeu as 398 listagens de 2022 a 2025: média de +2,7% por evento (t = 0,90, não significativa), **mediana de +11,3%**, acerto de 64%, cauda esquerda pesada. Com hedge de BTC a média informativa foi de **+7,3%**: as listagens novas tendem a perder para o BTC nas semanas seguintes. Essa versão com hedge **não foi declarada antes**; nasceu olhando aquele resultado. É uma hipótese descoberta nos dados de 2022 a 2025.

As listagens de **setembro de 2019 a dezembro de 2021** (cerca de 110 moedas) nunca foram baixadas nem olhadas por nenhum estudo. Elas são eventos novos, em um período diferente (2020 foi o início da alta; 2021, o auge e a queda). Testar a regra **congelada** nelas é uma réplica, não uma nova busca. Por isso a barra estatística é a de uma réplica de hipótese única (t ≥ 2,0), e não a do t ≥ 3,0 que valia na descoberta em muitas tentativas.

## Regra (fixa)

- **Eventos:** cada perpétuo USDT de moeda da lista `docs/estudos/pool-completo-lista-2026-10-09.json` com data de listagem anterior a 04/12/2021 (exceto `BTCUSDT`, que é o hedge). O instante da listagem é o da **primeira vela** do perpétuo na API pública.
- **Entrada (venda):** abertura da vela 168 h (7 dias) depois da primeira vela. Junto, **compra o mesmo valor em BTCUSDT** (hedge), na mesma abertura.
- **Saída:** abertura da vela 672 h (28 dias) depois da entrada; ou na última vela, se a moeda sair antes; ou **stop** na ponta vendida: se a **máxima** de alguma hora chegar a 150% ou mais do preço de abertura da entrada, fecha a venda a esse nível (ou à abertura da hora, se ela já abrir acima) e **fecha também o hedge de BTC**.
- **Tamanho:** 1% do patrimônio por perna (venda da moeda e compra de BTC), exposição bruta máxima de 50%; evento pulado e contado se passar.
- **Custos:** taxa de 0,055% por lado; slippage de **10 bps por lado na moeda** e de **2 bps por lado no BTC**; funding real recebido ou pago nas duas pernas enquanto abertas.
- **Capital simulado:** 10 000. Retorno do evento = (resultado das duas pernas, depois de custos e funding) ÷ valor vendido.
- **Motor:** `simulateEvents` de `scripts/estudos/eventos.ts`, com a extensão (testada) de hedge e de stop pela máxima.

## Dados

- Velas de 1 hora (abertura, máxima, mínima, fechamento) e funding do perpétuo, da primeira vela até 35 dias e meio depois (o suficiente para entrada e saída), mais o BTC perpétuo e seu funding de 08/09/2019 a 10/01/2022.
- Horas faltantes viram vela parada no último fechamento (contadas). Moeda com mais de 1% de horas preenchidas, ou sem 840 h de velas, sai antes de qualquer retorno ser calculado.

## Critérios (todos)

1. `DATA_QUALITY`: pelo menos 90% das moedas elegíveis com dados utilizáveis.
2. `ENOUGH_EVENTS`: pelo menos **80** eventos executados (o universo disponível é de cerca de 110).
3. `SIGNIFICANT_MEAN`: retorno líquido médio por evento, **com hedge**, positivo e com **t ≥ 2,0** (erro-padrão agrupado por mês de calendário).
4. `MEDIAN_POSITIVE`: mediana por evento positiva (a assimetria à esquerda era o ponto fraco; a mediana boa era o ponto forte).
5. `POSITIVE_YEARS`: média por evento positiva em cada ano-calendário de entrada com pelo menos 10 eventos (2020 e 2021 esperados).
6. `COSTS_X3`: média por evento ainda positiva com taxa e slippage multiplicados por 3.
7. `BOUNDED_DRAWDOWN`: no portfólio simulado, queda máxima de no máximo 15% e patrimônio sempre positivo.

## Veredito

- **`VALIDADA_EM_NAO_VISTO`:** passa todos. Significa que o efeito encontrado em 2022 a 2025 também aparece em listagens que a descoberta nunca viu, com a regra congelada. Não prova lucro futuro e não autoriza nada sozinho (a venda de moedas pequenas tem riscos de execução que a simulação não cobre).
- **`NAO_VALIDADA`:** qualquer outro caso. A hipótese é encerrada, sem ajuste de entrada, saída ou hedge.

## Informação reportada, sem entrar no veredito

- sem hedge (a regra da família B, nesta amostra); só a perna de BTC; correlação do evento com o retorno do BTC;
- entrada em 3 e 14 dias; saída em 14 e 56 dias;
- por ano e por semestre; as 5 maiores perdas e ganhos por moeda; média sem o pior e o melhor 1%;
- **junção com a amostra de 2022 a 2025** (os eventos da descoberta, com hedge, pelo mesmo motor): média e t da amostra completa, para ver a imagem de 2019 a 2025. A decisão continua sendo só a da amostra nova;
- hash SHA-256 de cada série baixada e o commit deste protocolo.

## Limites declarados antes de rodar

- **Poder baixo.** Com cerca de 110 eventos e desvio-padrão por evento da ordem de 35% a 40%, um efeito verdadeiro de +7% daria t em torno de 2 (um pouco acima ou abaixo). Uma reprovação não prova que o efeito não existe; uma aprovação é indício, não prova.
- **Sobreviventes.** Só entram moedas ainda listadas ou em liquidação em 2026. Moedas listadas em 2020 e 2021 que já saíram da lista de contratos não estão. Para uma estratégia vendida em listagens novas, isso é **conservador** (as que caíram e saíram seriam vendas lucrativas).
- **Dois regimes que não se repetem.** 2020 e 2021 foram anos de alta forte. O hedge de BTC controla o movimento do mercado, mas não a rotação das moedas pequenas (muitas dispararam em 2021).
- **Liquidez em 2020 e 2021.** A profundidade do livro era menor que a de 2022 em diante. 10 bps de slippage na moeda é uma suposição; o custo triplicado cobre parte.
- **Sem custo de empréstimo ou de recompra forçada;** vendas de moedas com funding muito negativo podem pagar bastante, já contado no funding real.
- **Hedge sem beta estimado:** valor igual em BTC, sem ajustar pelo beta de cada moeda (que costuma ser maior que 1 em moedas pequenas).

## Regra de uso único

Estas listagens são consumidas por esta olhada. Se der `NAO_VALIDADA`, não se tenta outra versão (outro hedge, outro horizonte, outro tamanho) nelas.
