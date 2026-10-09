# Protocolo pré-declarado: CARRY_ESTRUTURAL_V2 (carry de funding delta-neutro, com reajuste semanal e universo ponto no tempo)

Declarado em 09/10/2026, **antes** de baixar ou olhar qualquer dado à vista novo, e registrado no Git antes da execução. A regra, o universo, o reajuste, os custos, o período, os critérios e o veredito são fixos. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com dados públicos da Binance (à vista e USD-M). Não envia ordens, não usa contas, não toca no piloto nem nos acompanhamentos em curso, e não exige código no servidor nem deploy. Não é recomendação de investimento.

## Por que esta é uma estratégia diferente das reprovadas

Momentum, tendência, reversão e baixa volatilidade tentam acertar a **direção** do preço, e nenhuma sobreviveu a um teste sem viés de seleção. O carry estrutural não tenta isso: compra a moeda à vista e vende o perpétuo na mesma quantidade, a variação de preço se anula, e o retorno vem do **funding** que os compradores alavancados pagam aos vendidos. É uma fonte de retorno diferente, documentada na literatura (Schmeling, Schrimpf e Todorov, BIS WP 1087, 2023; He, Manela, Ross e von Wachter, 2022), que também mostra que o retorno encolheu com o tempo.

## O que `FUNDING_CARRY_V1` ensinou

`docs/estudos/carry-funding-2026-10-06.md`: a regra rendeu +6,6% em quase 2 anos (3,3% ao ano, queda máxima de 0,8%, Sharpe 1,78) e foi **liquidada em 22/12/2023**, porque as posições nunca eram reajustadas: com o preço da moeda subindo, o ganho ficava no à vista, que não serve de margem, e a perda aberta do perpétuo consumia o caixa. A lição registrada foi que o carry com posição longa precisa reajustar as posições. Esta versão faz isso, e só isso, além de trocar o universo (ver abaixo). V1 permanece registrado como reprovado.

## Regra (fixa)

Igual a `FUNDING_CARRY_V1`, com as duas mudanças declaradas abaixo.

- **Sinal:** soma das taxas de funding liquidadas nas últimas 168 h (7 dias), só com liquidações anteriores ao fechamento da vela da decisão.
- **Decisão:** a cada 168 h, a partir do fechamento da vela de 01/01/2022 00:00 UTC; execução na abertura da vela seguinte.
  1. **Saída:** fecha as duas pontas de uma moeda quando o sinal dela é menor ou igual a zero, ou quando o perpétuo ou o à vista sai de negociação.
  2. **Reajuste (novo):** para cada moeda que continua, leva a quantidade das duas pontas (a mesma nas duas) ao tamanho-alvo de **10% do patrimônio do momento** ao preço de fechamento da decisão. Se a moeda subiu, vende parte do à vista e recompra a mesma quantidade do perpétuo; se caiu, aumenta, desde que a regra de caixa abaixo seja cumprida. Cada reajuste paga taxas e slippage.
  3. **Entrada:** com menos de 5 moedas na carteira, entram as de maior sinal, desde que o sinal seja de pelo menos **0,105%** na semana (cerca de 5,5% ao ano) e a moeda esteja no universo da data (abaixo).
- **Tamanho:** no máximo 5 moedas; cada uma com 10% do patrimônio à vista e a mesma quantidade vendida no perpétuo.
- **Margem (idêntica à V1):** entradas e aumentos só ocorrem se, depois da compra à vista, o caixa continuar maior ou igual a **50% do valor vendido** nos perpétuos. O caixa parado não rende nada (premissa conservadora).
- **Liquidação (idêntica à V1):** a cada hora, no pior caso (máxima do perpétuo na hora): se o caixa mais o resultado aberto dos perpétuos ficar abaixo de **1%** do valor vendido, o teste registra liquidação e para. O à vista não serve de garantia; o caixa é tratado como um só (idealização: a transferência entre carteira à vista e de futuros é instantânea e gratuita).
- **Custos:** taxa à vista de 0,1%, no perpétuo de 0,055%, slippage de 2 bps em cada ponta e em cada operação (entrada, saída, reajuste), mais o funding real de cada moeda.
- **Capital simulado:** 10 000 USDT.

### Universo (novo): ponto no tempo, sem as 15 moedas escolhidas com hindsight

- Pool: as 543 perpétuas de `docs/estudos/pool-completo-lista-2026-10-09.json` (com as 125 em deslistagem), cada uma com par USDT à vista **ativo hoje** na Binance (lista pública do mercado à vista). Moeda de perpétuo `1000XUSDT` usa o à vista `XUSDT` com preço multiplicado por 1 000. Moeda sem par à vista sai do pool (regra mecânica, sem retorno).
- A cada **4 decisões semanais (672 h)** escolhem-se as **15 moedas de maior volume financeiro do perpétuo** nos 672 h anteriores ao fechamento da vela da decisão (volume em moeda × fechamento, somado), entre as que têm pelo menos 672 h de velas nas duas pontas. Empates por ordem alfabética. Só moedas do universo da data entram; as que já estão na carteira só saem pela regra de saída.

## Dados e período

- Velas de 1 hora (abertura, máxima, mínima, fechamento) do **à vista** e do **perpétuo** e funding, de 04/12/2021 (ou da listagem) até 05/10/2026 23:00 UTC. A primeira decisão é em 01/01/2022 00:00 UTC.
- Horas faltantes dentro da vida da série viram vela parada no último fechamento (contadas). Série com mais de 1% de horas preenchidas, ou sem velas, sai do pool antes de qualquer retorno. Funding sem preço de marcação usa a abertura da vela do perpétuo da hora, como nos estudos anteriores.
- Hash SHA-256 de cada série utilizada.

## Critérios (período inteiro, com os custos acima)

1. `DATA_QUALITY`: pelo menos 90% das moedas do universo ponto no tempo com séries utilizáveis nas duas pontas.
2. `NO_LIQUIDATION`: nenhuma liquidação.
3. `POSITIVE_PNL`: lucro líquido positivo.
4. `BOUNDED_DRAWDOWN`: queda máxima de no máximo **15%**.
5. `POSITIVE_YEARS`: lucro positivo em pelo menos 4 dos 5 anos-calendário (2022, 2023, 2024, 2025 e 2026 até 05/10).
6. `SHARPE_ABOVE_ONE`: probabilidade de pelo menos 90% de que o Sharpe anual verdadeiro seja maior que 1,0, pelo PSR sobre os retornos horários (corrigido por assimetria e curtose), como em V1.
7. `BEATS_CASH` (novo): retorno anualizado líquido, sobre o capital total, de pelo menos **4%**. O caixa não rende na simulação, então um carry que não passa disso não compensa o trabalho nem o risco de execução.

## Veredito

- **`VALIDADA_CARRY`:** passa os 7 critérios. Significa que o carry delta-neutro, com reajuste semanal e universo escolhido sem olhar o futuro, sobreviveu ao passado de 2022 a 2026 com dados públicos. É o máximo que o laboratório consegue sem mercado futuro; o passo seguinte (implementar no servidor, testar a execução real em Demo Trading) é decisão do dono e nada é ativado automaticamente.
- **`NAO_VALIDADA`:** qualquer outro caso. A regra não é refeita com outro limite, tamanho ou universo.

## Informação reportada, sem entrar no veredito

- sem o reajuste semanal (o comportamento de V1 sobre o universo novo), para mostrar o quanto o reajuste importa;
- tamanho-alvo de 5%, 15% e 20% do patrimônio por moeda (com 5 moedas, 15% e 20% usam até 75% e 100% à vista, e o critério de caixa passa a limitar);
- universo de 10 moedas;
- retorno por ano e queda máxima por ano, funding recebido, taxas, diferença de preço entre à vista e perpétuo, fração do tempo investida, média de moedas, menor folga de margem, correlação com o mercado;
- retorno de manter o capital em USDT (zero) e de comprar e segurar a cesta de moedas do universo.

## Limites declarados antes de rodar

- **Idealizações a favor do resultado:** transferência instantânea e gratuita entre carteira à vista e de futuros; execução na abertura sem fila; sem custo de saque, de rede nem de empréstimo; funding sempre liquidado ao preço de marcação informado ou à abertura da hora.
- **Moeda que perde o par à vista** (deslistagem) tem a posição fechada nos últimos preços disponíveis, o que não é exatamente o que uma corretora faria.
- **Pool com sobrevivência parcial:** moedas retiradas da lista de contratos e moedas sem par à vista ativo hoje ficam de fora; o filtro por par à vista ativo hoje não olha retorno, mas também não é ponto no tempo.
- **Carry é cíclico:** o retorno depende do apetite por alavancagem do mercado. 2022 a 2026 inclui uma queda forte, um mercado lateral e uma alta, mas é uma amostra de um ciclo.
- **Capital pequeno:** o estudo não mede o impacto de ordens grandes; as moedas do universo são as mais líquidas do pool, e o slippage de 2 bps foi medido em `docs/MEDICAO_CUSTO_EXECUCAO.md` como razoável para US$ 500 a US$ 5 mil por ordem.

## Regra de uso único

Este pool e este período são consumidos por esta olhada para o carry com esta regra. Se der `NAO_VALIDADA`, a busca por carry delta-neutro nestes dados termina.
