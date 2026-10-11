# Protocolo pré-declarado: COMBO_CARRY_MOM_V1 (carry + momentum entre moedas)

Declarado em 09/10/2026, **antes** de qualquer número da combinação ser calculado, e registrado no Git antes da execução. Regra, universos, períodos, custos, critérios, contagem de tentativas e calendário do acompanhamento abaixo são fixos. Uma variação (outros pesos, janelas, número de moedas ou tamanho) ganha nome novo e declaração nova. Este documento não é editado para caber num resultado.

Só simulação com dados públicos da Binance USD-M. Não envia ordens, não usa contas, não toca no piloto da Nova nem no acompanhamento `XSMOM_FORWARD_V1`, e **não exige código no servidor nem deploy** (tudo roda em script offline). Não é recomendação de investimento.

## Por que esta hipótese, e o limite dela

`FATORES_V1` (`docs/estudos/fatores-v1-2026-10-09.md`) mostrou duas coisas:

- o momentum de 28 dias, que está no ar, teve queda máxima de 20,5% no período inteiro (2022 a out/2026) e enfraqueceu em 2024 e 2026;
- o carry entre moedas passou em 6 dos 7 critérios, com correlação semanal de **0,02** com o momentum, ou seja, ganha e perde em momentos diferentes.

Combinar dois sinais pouco correlacionados costuma reduzir a queda máxima sem exigir que cada um seja excelente. É essa a hipótese.

**Ela foi escolhida depois de ver os resultados individuais, nos mesmos dados.** Por isso o teste histórico abaixo é **informativo**: serve para decidir se vale acompanhar ao vivo, e **nunca conta como validação**. A validação só pode vir de dados futuros (acompanhamento ao vivo). Isso é dito antes, para não ser vendido depois como prova.

## Regra (fixa)

Uma carteira única, formada por **dois livros somados** e com as posições compensadas moeda a moeda:

- **Livro M (momentum):** atratividade = retorno das últimas 672 h (28 dias), no fechamento da vela da decisão.
- **Livro C (carry):** atratividade = menos a média do funding das liquidações dos últimos 168 h já liquidadas até o fechamento da vela da decisão (mesma definição de `XS_CARRY_V1`).
- Em cada livro: compra as **5** de maior atratividade e vende as **5** de menor, com **2,5%** do patrimônio do momento por posição.
- A posição final de cada moeda é a **soma** das posições dos dois livros. Se uma moeda é comprada num livro e vendida no outro, as posições se compensam (a quantidade líquida é menor, ou zero). Exposição bruta máxima de 0,5x, a mesma do `XSMOM_FORWARD_V1`.
- **Agenda:** decisão semanal (a cada 168 h) no fechamento da vela; execução na abertura da vela seguinte; capital simulado de 10 000.
- **Custos:** taxa de 0,055% e slippage de 2 bps por lado, sobre a quantidade **líquida** negociada, mais o funding real de cada moeda.
- **Empates:** ordem alfabética do símbolo, como nos estudos anteriores.

Simulador: o de `scripts/estudos/fatores-lib.ts`, com uma extensão para somar livros. Com um único livro, o resultado tem de ser **idêntico** ao do simulador já testado (teste automatizado), e o controle tem de reproduzir `XSMOM_LONG_HISTORY_V1` (+55,06% e 8,77%, tolerância de 0,05 ponto percentual) antes de qualquer número da combinação ser calculado; se não reproduzir, o estudo para.

## Etapa 1: replay histórico (informativo, com portão)

**Universo e período principais:** as mesmas 15 moedas de `FATORES_V1`, de 01/01/2022 a 05/10/2026, com os mesmos blocos de dados, a mesma junção validada e os mesmos custos.

**Portão para propor o acompanhamento ao vivo** (todos precisam passar, no período principal):

1. `DATA_QUALITY`: no máximo 1% de horas preenchidas por moeda.
2. `POSITIVE_PNL`: lucro líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo 15%.
4. `POSITIVE_YEARS`: lucro positivo em pelo menos 3 dos 4 anos completos (2022 a 2025); 2026 é reportado, mas não conta.
5. `DOUBLED_COSTS_POSITIVE`: lucro líquido positivo com taxa e slippage dobrados.
6. `MARKET_NEUTRAL`: valor absoluto da correlação dos retornos horários com a cesta igual das 15 moedas de no máximo 0,30.

- **Passa o portão:** `PROPOR_ACOMPANHAMENTO`. Só significa "vale acompanhar ao vivo".
- **Não passa:** `ENCERRADA`. Fica registrada e não é repetida com outros parâmetros.

**O Sharpe deflacionado é reportado, mas não faz parte do portão.** Conta **9 tentativas** (as 8 de `FATORES_V1` mais esta) e a mesma variância de Sharpe entre tentativas. Fica fora do portão porque, escolhida depois de ver os dados, esta hipótese já não é uma tentativa limpa, e a barra é dominada por uma tentativa antiga de Sharpe 3,2 em seis meses (nem o controle passa por ela). Isso é **menos exigente** do que o `FATORES_V1`, e é dito aqui de forma explícita; não aumenta a confiança no resultado.

**Informação reportada, sem entrar no veredito:**
- resultado por ano e queda máxima por ano; 2026 parcial;
- comparação, no mesmo período, com o momentum sozinho (controle, 5% por posição) e com o carry sozinho (`XS_CARRY_V1`, 5% por posição), com queda máxima e correlação semanal entre eles;
- **verificação em outro universo:** as 21 moedas de `XSMOM_FORWARD_V1`, de 15/08/2025 a 05/10/2026 (14 meses; só dados já em cache);
- taxas, funding, giro e posições encerradas;
- hash SHA-256 dos datasets e o commit deste protocolo.

## Etapa 2: acompanhamento ao vivo (a validação)

Só ocorre se a etapa 1 der `PROPOR_ACOMPANHAMENTO`. É um **script offline**, sem código no servidor, que baixa dados públicos e refaz a simulação desde o início, como faz o rastreador do momentum.

- **Universo:** as mesmas 21 moedas de `XSMOM_FORWARD_V1` (o livro M fica idêntico ao do acompanhamento do momentum, para comparação direta).
- **Início:** primeira decisão no fechamento da vela de **13/10/2026 02:00 UTC** (execução às 03:00 UTC); depois, a cada 168 h.
- **Fim:** a decisão de **29/12/2026 03:00 UTC** (a mesma data final de `XSMOM_FORWARD_V1`, cerca de 11 semanas). Antes disso, nenhum resultado é conclusão.
- **Parada antecipada:** se a queda máxima chegar a **15%**, o acompanhamento é encerrado e a hipótese é reprovada.
- **Aprovação ao fim:** lucro líquido positivo depois dos custos e queda máxima abaixo de 15%. A correlação com o mercado, a contribuição de cada livro e a comparação com o momentum sozinho no mesmo intervalo são registradas.
- **Peso da evidência:** 11 semanas são pouco. Mesmo aprovada, a combinação continua com **evidência fraca**, e qualquer passo seguinte (por exemplo, Demo Trading da Binance) depende de decisão do dono, nunca é automático.
- **Como roda:** `npx tsx scripts/estudos/combo-forward.ts`, sob demanda, lendo só dados públicos; o resultado sai em `docs/estudos/` com o hash dos dados.

## O que acontece com o resultado

- **Reprovada ou encerrada:** fica registrada e não é repetida com outros parâmetros para forçar aprovação.
- **Aprovada no acompanhamento:** o dono decide o próximo passo. Nada é ativado automaticamente, e nada muda no piloto ou no acompanhamento de momentum em curso.
- Todos os resultados são escritos no mesmo dia da execução, com a leitura honesta, mesmo que sejam negativos.

## Limites declarados antes de rodar

- **Sobreviventes:** os 15 (e os 21) são moedas que existem hoje; isso favorece qualquer estratégia que compra moedas "que ficaram".
- **Mesmos dados:** o replay usa os mesmos preços já vistos nos estudos anteriores, e a combinação foi escolhida olhando esses resultados.
- **Vendas a descoberto** simuladas sem custo de empréstimo e sem limite de liquidez.
- **Funding antigo sem preço de marcação:** preenchido pela abertura da vela de negócios da hora, como antes.
- **Uma só combinação:** pesos iguais (2,5% e 2,5%), sem otimização. Não será testada outra proporção.
