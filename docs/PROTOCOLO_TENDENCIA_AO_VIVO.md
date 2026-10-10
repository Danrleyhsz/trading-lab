# Protocolo pré-declarado: TENDENCIA_MAIORES_AO_VIVO_V1 (execução simulada da tendência nas maiores moedas)

Declarado em 10/10/2026, **antes** da primeira rodada. As regras, o universo, a escala de risco, a forma de simular as ordens, o registro e a leitura abaixo são fixos. Este documento não é editado para caber num resultado; qualquer mudança vira uma emenda declarada antes da rodada seguinte.

**Só simula.** Não envia ordens, não usa contas nem chaves, só lê dados públicos da Binance. Não toca no paper trading de perpétuos, no piloto, no escritório nem no servidor, e não exige deploy. Cada linha do livro-razão é uma simulação de acompanhamento (`FORWARD_PAPER_TRACKING_ONLY`); nenhuma execução real é afirmada. Não é recomendação de investimento.

## Por que existe

`BUSCA_ANTIGA_V1` e `BUSCA_MAIORES_V1` deixaram a tendência lenta (SMA100 e Donchian 55/20) nas maiores moedas, com alvo de volatilidade de 20%, como a única família positiva em todas as eras testadas, mas fraca na última (Sharpe de cerca de 0,4, queda de 32% a 47% em 2022 a 2026). Mais pesquisa sobre os mesmos preços não responde o que falta: **quanto custa de verdade executar isso, e quanto o atraso do sinal pesa**. A pesquisa assume decisão e preço no fechamento do dia e 15 bps por lado. Esta execução simulada mede, com o livro de ofertas público e a hora real da rodada, o que a história não mostra.

**Não é um teste de retorno.** O retorno da tendência oscila por anos; algumas semanas ou poucos meses de simulação não dizem nada sobre ele. O que se mede é custo, preenchimento e atraso.

## Regra (congelada de `BUSCA_MAIORES_V1`, sem nenhuma alteração)

- **Universo:** as 5 maiores moedas por soma do volume financeiro dos 90 dias anteriores, entre os pares USDT à vista da Binance em negociação, não atrelados ao dólar, sem tokens alavancados. O ranking é refeito a cada 30 dias, contados a partir de 17/08/2017 (o mesmo calendário da pesquisa). Elegibilidade: pelo menos 90 dias de velas e mediana do volume financeiro de 30 dias de pelo menos US$ 1 milhão por dia.
- **Candidatas:** os 100 pares de maior volume de 24 h na hora da rodada. A pesquisa ranqueia todos os pares; para as 5 maiores a diferença é nula na prática, e a lista de candidatas fica registrada em cada rodada.
- **Sinal (por moeda, decidido no fechamento diário UTC, só com velas fechadas):** `SMA100` (fechamento acima da média de 100 dias) e `DONCHIAN_55_20` (compra no fechamento acima da máxima dos 55 dias anteriores; sai no fechamento abaixo da mínima dos 20 dias anteriores). Comprado ou fora; sem venda a descoberto.
- **Peso-alvo:** `escala × [1 / min(5, membros elegíveis)]` por moeda com sinal comprado. **Escala:** `min(1, 20% / volatilidade anualizada dos retornos brutos da carteira nos 60 dias anteriores)`; fator 0,5 antes de 30 dias de histórico. Sem alavancagem: a soma dos pesos não passa de 1.
- **Contas simuladas** (10 000 USDT virtuais cada, independentes): `SMA100`, `DONCHIAN_55_20` e `BENCH_5_MAIORES` (as mesmas 5 maiores sempre compradas, com a mesma escala, como referência).
- **Código:** a decisão usa as mesmas funções da pesquisa (`buildGrid`, `eligibility`, `positions`, `membership`, `scaledPortfolio`), e há teste de que os pesos ao vivo são iguais aos da série inteira e de que velas futuras não mudam a decisão.

## Execução simulada

- **Quando:** uma rodada por dia, sob demanda, depois do fechamento diário (00:00 UTC). A rodada decide o **último dia fechado**. Um dia sem rodada fica registrado como dia perdido, e a rodada seguinte decide só o último dia (isso mede o atraso real do sinal). Uma segunda rodada no mesmo dia só marca a mercado.
- **Preço de execução:** a mercado, contra o livro de ofertas público (100 níveis) na hora da rodada, **não** o fechamento do dia. A compra sobe pelas ofertas de venda, a venda desce pelas ofertas de compra. A parte não preenchida por falta de profundidade é registrada.
- **Taxa:** 0,10% por ordem (taxa taker padrão do à vista), sem desconto por BNB.
- **Ordens:** vendas primeiro, depois compras. Ordem de menos de US$ 10 não é enviada e fica registrada como `MIN_NOTIONAL`. Quantidades fracionárias: o passo de lote da corretora não é simulado.
- **Parada:** queda de 30% desde o pico da conta (padrão do laboratório, `docs/PADRAO_DE_RISCO.md`) zera a posição e encerra a conta.
- **Marcação:** patrimônio a preço médio entre melhor compra e melhor venda na hora da rodada.

## O que é medido, por ordem

| Medida | Definição |
|---|---|
| Taxa (bps) | 0,10% do valor |
| Slippage do livro (bps) | preço médio de execução contra o preço médio do livro na hora, no sentido da ordem |
| Atraso até a execução (bps) | preço médio do livro na hora contra o fechamento do dia decidido, no sentido da ordem |
| Total contra o fechamento (bps) | preço médio de execução contra o fechamento do dia decidido, mais a taxa |
| Preenchimento | ordem preenchida por inteiro ou não |

## Registro (trilha de auditoria)

- **Livro-razão:** `docs/estudos/tendencia-ao-vivo-registro.json`, encadeado por SHA-256: cada rodada guarda o hash da anterior, e qualquer edição ou remoção quebra a cadeia (o script recusa continuar). Cada rodada registra a decisão (membros, sinais, escala, pesos-alvo), as ordens simuladas com preço do livro e fechamento, o estado das contas e o hash dos dados de entrada.
- **Resumo:** `docs/estudos/tendencia-ao-vivo.md`, regerado a cada rodada. A história fica no Git.
- **Como roda:** `npx tsx scripts/estudos/tendencia-ao-vivo.ts` (`--dry` mostra sem gravar). Nenhuma tarefa agendada é criada por este protocolo; se o dono quiser rodar todo dia, é decisão separada.

## Leitura (sem veredito de retorno)

Declarada antes de rodar, para não se escolher a régua depois:

- **`EM_ANDAMENTO`:** menos de **30 dias decididos** ou menos de **20 ordens** na conta. Nada é dito.
- Com pelo menos 30 dias decididos e 20 ordens, o custo médio total contra o fechamento, por ordem, de cada conta é lido assim:
  - **até 15 bps:** dentro do pressuposto da pesquisa;
  - **de 15 a 30 bps:** acima do pressuposto, mas dentro dos custos dobrados que a pesquisa também testou (as regras seguiram positivas);
  - **acima de 30 bps:** pior que os custos dobrados da pesquisa; a execução real comeria o que a história mostrou.
- Também é lido: fração de ordens não preenchidas por inteiro, dias perdidos e atraso médio entre o fechamento e a rodada.
- **Nenhuma leitura autoriza dinheiro real, deploy ou paper trading no servidor sozinha.** Qualquer passo seguinte é decisão do dono, com protocolo próprio.

## Limites declarados antes de rodar

- **Livro num instante:** o preenchimento é o do livro na hora da rodada, sem fila, sem latência e sem impacto no mercado. Vale para ordens de poucos milhares de dólares em moedas líquidas, não para tamanhos maiores.
- **Conta pequena:** 10 000 USDT virtuais por conta medem o custo de ordens pequenas; o custo de tamanho real não se extrapola.
- **Um instante por dia, um regime, poucos dias:** sem inferência de retorno, e as três contas olham os mesmos mercados (não são amostras independentes).
- **Passo de lote e filtros da corretora** não são simulados (só o valor mínimo de US$ 10).
- **Rodada manual:** dias sem rodada deslocam o sinal; isso é registrado, não corrigido.
- **Dados:** velas públicas da Binance (1 000 dias por moeda); a primeira data da série de cada moeda pode ser posterior ao seu início real, o que só afeta o estado inicial do Donchian.
- **O caixa parado rende zero**, sem imposto, sem custo de transferência.
