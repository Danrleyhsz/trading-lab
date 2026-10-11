# Protocolo pré-declarado: BUSCA_EVENTOS_V1 (três famílias novas, no pool completo, com barra estatística mais alta)

Declarado em 09/10/2026, **antes** de calcular qualquer número destas três famílias, e registrado no Git antes da execução. Regras, parâmetros, custos, critérios e veredito abaixo são fixos. Uma variação (outro limite, horizonte, tamanho, universo) ganha nome novo e declaração nova. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com os dados públicos da Binance USD-M já baixados (543 perpétuas, `scripts/estudos/out/pool-*.json`). Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## Contexto honesto

Todas as famílias de sinal de preço testadas até aqui (momentum, tendência, reversão, baixa volatilidade, combinação) falharam num teste sem viés de seleção; o carry delta-neutro passou o risco e reprovou no retorno (2,9% ao ano, em queda). O dono pediu para continuar buscando. Três coisas precisam ser ditas antes:

1. **Testar mais ideias nos mesmos 4,8 anos aumenta a chance de achar uma por sorte.** Foram 18 tentativas e esta rodada soma mais **3** (21). Para compensar, as famílias de eventos abaixo exigem **estatística t ≥ 3,0** na média por evento (a barra proposta por Harvey, Liu e Zhu, 2016, para fatores novos em muitos testes), e não só "lucro positivo".
2. **Os dados são os mesmos de 2022 a out/2026.** Não existe passado novo para estas ideias; a validação aqui é o mais limpo que o pool permite, não prova.
3. **Nenhum sinal de preço puro foi aprovado até agora.** Estas três famílias não são de direção de mercado: duas são eventos (listagem nova, funding extremo) e uma é carry direcional. A expectativa honesta é que a maioria reprove; o teste existe para medir.

## Família B: `NEW_LISTING_FADE_V1` (vender listagens novas)

**Hipótese:** tokens recém-lançados costumam cair depois do período inicial de entusiasmo (oferta baixa em circulação, vendas de quem recebeu de graça, liberações). Vender o perpétuo, algumas semanas depois da listagem, tem retorno esperado positivo.

- **Eventos:** cada moeda do pool cuja **primeira vela** do perpétuo é posterior a 04/12/2021 e até 31/08/2025 (as anteriores não têm listagem observada; as posteriores não têm 35 dias de dados).
- **Entrada:** vende o perpétuo na abertura da vela que fica 168 h (7 dias) depois da primeira vela.
- **Saída:** abertura da vela 672 h (28 dias) depois da entrada; ou na última vela disponível, se a moeda sair antes; ou **stop**: se o **fechamento** de alguma hora ficar em 150% ou mais do preço de entrada, fecha naquele fechamento.
- **Tamanho:** 1% do patrimônio do momento por evento, sem limite de simultâneas além de exposição bruta de 50% (acima disso, o evento é pulado e contado).
- **Custos:** taxa de 0,055% por lado; slippage de **10 bps por lado** (listagens novas são menos líquidas que as moedas medidas em `docs/MEDICAO_CUSTO_EXECUCAO.md`); funding real recebido ou pago enquanto a posição está aberta.
- **Capital simulado:** 10 000.

## Família C: `FUNDING_EXTREME_REVERSAL_V1` (reversão após funding extremo)

**Hipótese:** funding muito alto indica compradores alavancados saturados e tende a ser seguido por queda (liquidações em cascata); funding muito negativo, o contrário.

- **Eventos:** cada liquidação de funding, de qualquer moeda do pool, com taxa **≥ +0,10%** (vende) ou **≤ −0,10%** (compra) naquele período.
- **Entrada:** na abertura da hora seguinte à liquidação. Uma moeda não entra de novo enquanto já tem posição aberta.
- **Saída:** 24 h depois, ou na última vela disponível, ou **stop** quando o fechamento de uma hora fica 30% ou mais contra a posição.
- **Tamanho:** 0,5% do patrimônio por evento, exposição bruta de no máximo 50%.
- **Custos:** taxa de 0,055% por lado, slippage de **5 bps por lado**, funding real durante a posição.

## Família A: `XS_CARRY_PIT_V1` (carry entre moedas, direcional, no universo ponto no tempo)

Responde a pergunta que ficou em aberto: carry e combinação foram testados só nas 15 moedas escolhidas com hindsight.

- Igual a `XS_CARRY_V1` (`docs/PROTOCOLO_FATORES_V1.md`): atratividade = menos a média do funding das últimas 168 h já liquidadas; compra as 5 de menor funding e vende as 5 de maior; **2,5% por posição**; decisão semanal na abertura seguinte; custos de 0,055% e 2 bps por lado.
- **Universo e dados:** exatamente os de `PIT_COMPLETO_V1` (`docs/PROTOCOLO_POOL_COMPLETO.md`): as 30 moedas de maior volume dos 672 h anteriores entre as elegíveis do pool completo, atualizado a cada 4 semanas.
- **Simulador:** o enxuto, `scripts/estudos/lean-sim.ts`.

## Critérios

**Famílias B e C (eventos):** todos precisam passar.

1. `DATA_QUALITY`: pelo menos 90% das moedas do pool com dados utilizáveis (como `PIT_COMPLETO_V1`).
2. `ENOUGH_EVENTS`: pelo menos **150** eventos executados.
3. `SIGNIFICANT_MEAN`: retorno líquido médio por evento **positivo e com t ≥ 3,0**, com erro-padrão agrupado por mês de calendário (eventos do mesmo mês não são independentes).
4. `POSITIVE_YEARS`: média por evento positiva em cada ano-calendário com pelo menos 10 eventos (2022 é reportado; não conta se tiver menos de 10).
5. `COSTS_X3`: média por evento ainda positiva com taxa e slippage multiplicados por 3.
6. `BOUNDED_DRAWDOWN`: no portfólio simulado (tamanhos acima, capital de 10 000), queda máxima de no máximo 15% e patrimônio sempre positivo.

**Família A (portfólio):** os mesmos 7 critérios de `PIT_COMPLETO_V1`: dados, lucro positivo, queda máxima ≤ 15%, 3 de 4 anos completos positivos, lucro positivo com custos dobrados, |correlação com a cesta| ≤ 0,30 e lucro positivo nas duas metades (01/01/2022 a 30/06/2024 e 01/07/2024 em diante).

## Veredito (por família)

- **`VALIDADA_HISTORICO`:** passa todos os critérios da sua família.
- **`NAO_VALIDADA`:** qualquer outro caso. Não se ajusta nenhum parâmetro depois; variações exigem nome novo e outro conjunto de dados.

`VALIDADA_HISTORICO` aqui significa só "não foi contradita neste passado, com uma barra estatística mais alta". Não autoriza nada automaticamente.

## Informação reportada, sem entrar no veredito

- por evento: média, mediana, taxa de acerto, pior e melhor evento, e a média sem o pior e o melhor 1%;
- por ano e por semestre; contribuição por moeda (as 5 maiores perdas e ganhos);
- B: variantes de entrada em 3 e 14 dias, e de saída em 14 e 56 dias (robustez, não novas tentativas); a mesma carteira com **hedge de BTC** (compra BTC no mesmo valor);
- C: só lado vendido e só lado comprado; limites de 0,05% e 0,20%; hedge de BTC;
- A: tamanho de 5% por posição; o controle de momentum no mesmo universo (`PIT_COMPLETO_V1`: −46,5%);
- hash SHA-256 dos datasets (do pool) e o commit deste protocolo.

## Limites declarados antes de rodar

- **Preços de fechamento para stops.** O pool guarda abertura, fechamento e volume; o stop é testado nos fechamentos de hora, o que é otimista contra picos dentro da hora (a venda de uma moeda que dispara pode perder mais antes do fechamento).
- **Listagens novas são o pior caso de liquidez.** 10 bps de slippage é uma suposição, não uma medida; o custo triplicado cobre parte.
- **Sobrevivência:** moedas já retiradas da lista de contratos não estão no pool. Para a família B isso é **conservador** (moedas que caíram e saíram seriam vendas lucrativas), mas as moedas em liquidação (125) estão incluídas.
- **Mesmo período do calendário:** 2022 a out/2026, de um ciclo só.
- **Vendas a descoberto** sem custo de empréstimo e sem limite de liquidez (perpétuo não exige empréstimo, mas moedas pequenas têm profundidade limitada).
- **Eventos agrupados no tempo:** em dias de estresse, muitas moedas têm funding extremo juntas (família C); o erro-padrão agrupado por mês e o limite de exposição bruta mitigam, mas o número efetivo de eventos independentes é menor que a contagem.

## Regra de uso único

Este pool é consumido, para cada família, por esta olhada. Se der `NAO_VALIDADA`, não se tenta outra versão da mesma família nele.
