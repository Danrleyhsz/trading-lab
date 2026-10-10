# Protocolo pré-declarado: BUSCA_DIARIA_V1 (regras de entrada e saída que funcionem em todas as moedas, 2017 a 2026)

Declarado em 10/10/2026, **antes** de calcular qualquer resultado de estratégia neste conjunto de dados, e registrado no Git antes da execução. Regras, parâmetros, universo, custos, critérios e veredito abaixo são fixos. Uma variação (outro parâmetro, outra janela, outro universo) ganha nome novo e declaração nova. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline** com velas diárias públicas da Binance. Não envia ordens, não usa contas, não toca em produção e não exige código no servidor nem deploy. Não é recomendação de investimento.

## O pedido do dono e como foi traduzido

Decisão de 10/10/2026: encerrar tudo o que estava rodando, esquecer os testes anteriores e procurar **uma estratégia que funcione em todas as moedas**, usando só o passado, de 2020 (e o mais antigo que existir) até 2026, sem esperar o futuro, com **queda máxima de 30% como padrão** (`docs/PADRAO_DE_RISCO.md`).

Traduzido em quatro compromissos:

1. **Conjunto de dados novo, sem viés de sobrevivência.** Velas diárias de **todos os 712 pares USDT do mercado à vista da Binance**, em operação (506) e **já retirados** (206, status `BREAK`), de 17/08/2017 a 10/10/2026. Pares atrelados ao dólar (17) saem por regra de preço. Perfil em `docs/estudos/spot-diario-perfil-2026-10-10.json`: 695 pares utilizáveis (496 em operação e 199 retirados), cobertura crescente (6 pares ativos em 2017, 21 em 2018, 84 em 2019, 193 em 2020, 306 em 2021, 343 em 2022, 376 em 2023, 423 em 2024).
2. **"Funciona em todas as moedas" vira critério de amplitude**, não só de carteira: a regra é uma só, sem ajuste por moeda, e é medida moeda por moeda além de numa carteira.
3. **Duas eras, ambas precisam passar**: 2017 a 2021 e 2022 a 2026 (regimes diferentes).
4. **Contagem honesta de tentativas.** São 5 regras novas, somadas às 22 tentativas anteriores deste laboratório (27 no total para fins de Sharpe deflacionado, que é reportado e não é o único critério). Amplitude de moedas e duas eras fazem o papel de proteção contra sorte.

## Universo ponto no tempo

Na **decisão do dia `t`** (fechamento do dia, com dados até `t`), uma moeda é **elegível** se:

- não é atrelada ao dólar (fechamento entre 0,90 e 1,10 em pelo menos 95% dos dias da série);
- tem pelo menos **90 dias de velas** (evita a primeira fase de uma listagem nova, onde já se viu reversão);
- a **mediana do volume financeiro dos últimos 30 dias** é de pelo menos **US$ 1 milhão por dia**;
- existe vela no dia seguinte (senão a moeda saiu da negociação e a posição é fechada no último fechamento).

Moedas retiradas **entram até o dia da retirada**. Dias sem vela dentro da vida da moeda (paradas de negociação) repetem o último fechamento, sem permitir operar naquele dia.

## Regras testadas (5, todas compradas ou fora; sem venda a descoberto)

Cada regra é aplicada **separadamente em cada moeda elegível**; o sinal do dia `t` usa só fechamentos até `t`; a posição vale a partir do dia `t+1` (a vela diária abre quando a anterior fecha, então a execução é ao preço do fechamento de `t`, mais custos).

| Código | Regra |
|---|---|
| `SMA20` | comprado se o fechamento fica acima da média de 20 dias |
| `SMA50` | comprado se o fechamento fica acima da média de 50 dias |
| `SMA100` | comprado se o fechamento fica acima da média de 100 dias |
| `DONCHIAN_55_20` | entra comprado quando o fechamento passa a máxima dos 55 dias anteriores; sai quando o fechamento cai abaixo da mínima dos 20 dias anteriores |
| `TSMOM90` | comprado se o retorno de 90 dias é positivo |

**Benchmarks (não contam como tentativa):** comprar e segurar a mesma cesta de moedas elegíveis (peso igual, sem timing) e BTC.

## Carteira e custos

- **Carteira:** a cada dia, cada moeda elegível ocupa uma fatia igual do capital (`1 / número de moedas elegíveis`); a fatia fica investida se o sinal é comprado e em caixa (USDT, rendimento zero) se não. O retorno da carteira é a média das moedas, com **peso igual por moeda elegível** no dia.
- **Custos:** **20 bps por lado** sobre a variação de peso de cada moeda (taxa de 10 bps mais 10 bps de slippage, conservador para moedas pequenas). Sensibilidade: o dobro.
- **Retorno diário:** variação do fechamento, menos custos; anualização por 365.
- **Capital:** sem compounding de tamanho: a carteira é medida por retorno diário médio (equivale a rebalancear diariamente).

## Critérios (por regra; todos precisam passar)

Os critérios 2 a 4 e 7 são avaliados na carteira, **no período inteiro e separadamente em cada era** (17/08/2017 a 31/12/2021 e 01/01/2022 a 10/10/2026). Passar "nas duas eras" significa passar em cada uma.

1. `DATA_QUALITY`: pelo menos 90% dos pares não atrelados ao dólar com série utilizável.
2. `POSITIVE_NET`: retorno líquido total positivo depois dos custos.
3. `BOUNDED_DRAWDOWN`: queda máxima da carteira de no máximo **30%** (padrão de risco do laboratório).
4. `SHARPE_BAR`: Sharpe anualizado líquido de pelo menos **0,8** e **maior que o da cesta comprada e segura** na mesma janela.
5. `BREADTH`: entre as moedas com pelo menos 365 dias elegíveis, pelo menos **60%** têm retorno líquido total positivo aplicando a regra sozinhas.
6. `COSTS_X2`: retorno líquido positivo com custos dobrados.
7. `UNIVERSE_HALVES`: o resultado é positivo e com queda máxima de até 30% **nas duas metades aleatórias das moedas** (divisão fixa pela paridade de uma soma de verificação do símbolo).

## Veredito

- **`VALIDADA_DIARIA`:** a regra passa os 7 critérios, no período inteiro e em cada era. Significa só "funcionou, de forma ampla, nos dados disponíveis do passado, com custos conservadores".
- **`NAO_VALIDADA`:** qualquer outro caso. Não se ajusta parâmetro depois.
- Se mais de uma regra passar, **todas as aprovadas são reportadas**, sem escolher a melhor depois, e o Sharpe deflacionado com 27 tentativas é reportado ao lado.

## Informação reportada, sem entrar no veredito

- por ano: retorno, queda máxima e número médio de moedas elegíveis e investidas;
- por moeda: retorno líquido, Sharpe e queda máxima da regra e da compra e segura, e a lista das piores (para ver onde a regra falha);
- giro (turnover diário médio) e custo total em pontos-base ao ano;
- contribuição das moedas retiradas da corretora (as que acabaram em `BREAK`), como medida do que o viés de sobrevivência faria;
- BTC sozinho com a mesma regra;
- hash SHA-256 de cada série e o commit deste protocolo.

## Limites declarados antes de rodar

- **Velas diárias:** nada de execução intradiária; as regras são lentas por construção.
- **Só pares USDT à vista da Binance.** Moedas que só negociaram contra BTC ou fora da Binance não existem aqui. Em 2017 e 2018 a amostra tem poucas moedas com par em USDT (6 e 21).
- **Sobrevivência parcial:** os 206 pares retirados reduzem o viés, mas moedas que nunca foram listadas na Binance (as mais mortas) não estão. Uma moeda é listada depois de já ter crescido (viés de seleção da corretora); o corte de 90 dias mitiga só a parte inicial.
- **Só posição comprada ou fora.** Venda a descoberto só existe em perpétuos, a maioria deles de 2020 em diante, e não foi usada.
- **Custos fixos:** 20 bps por lado não captura impacto de ordens grandes nem a queda de liquidez antes de uma retirada.
- **Retirada de moeda:** a posição é fechada no último fechamento; na prática o último preço pode não ser executável.
- **Regimes:** crypto teve poucos ciclos completos (2017 a 2018, 2020 a 2022, 2023 a 2026). Cinco regras em duas eras é pouca evidência independente.
- **Eu conheço o histórico geral do mercado.** As regras foram escolhidas entre as mais usadas na literatura (tendência por média, rompimento de Donchian, momentum de série temporal), não otimizadas, mas não são "cegas" a esse conhecimento.

## Regra de uso único

Este conjunto de dados e estas 5 regras são consumidos por esta olhada. Outras regras, janelas ou universos precisam de protocolo novo e entram na contagem de tentativas.
