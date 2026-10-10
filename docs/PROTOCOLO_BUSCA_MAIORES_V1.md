# Protocolo pré-declarado: BUSCA_MAIORES_V1 (tendência nas maiores moedas por volume, com risco alvo de volatilidade)

Declarado em 10/10/2026, **antes** de calcular qualquer número deste teste, e registrado no Git antes da execução. Regras, universo, escala de risco, custos, critérios e veredito abaixo são fixos. Uma variação ganha nome novo e declaração nova. Este documento não é editado para caber num resultado.

Só pesquisa histórica **offline**, com as velas diárias à vista já baixadas (`docs/PROTOCOLO_BUSCA_DIARIA_V1.md`, 712 pares USDT, 206 retirados, 2017 a 2026). Não envia ordens, não usa contas, não toca em produção. Não é recomendação de investimento.

## De onde vem

`BUSCA_DIARIA_V1` mostrou que regras de tendência **por moeda, numa cesta ampla**, não passam nas duas eras (2017 a 2021 e 2022 a 2026): a segunda era perde, a queda máxima fica em 52% a 71%, e só 21% a 32% das moedas dão retorno positivo sozinhas. Em informação, fora do veredito, a mesma tendência **no BTC sozinho** melhorou o resultado (SMA100 em 2022 a 2026: +158% com queda de 37%, contra +73% e queda de 67% de comprar e segurar). Esta é a hipótese **que nasceu dessa leitura**, e é declarada assim: não é uma ideia independente dos dados, é uma restrição de universo e de tamanho feita depois de ver onde a tendência funcionou.

## Regras testadas (3, compradas ou fora)

Idênticas às de `BUSCA_DIARIA_V1`, mesmas definições de sinal (fechamento do dia `t`, posição a partir de `t+1`):

| Código | Regra |
|---|---|
| `SMA50` | comprado se o fechamento fica acima da média de 50 dias |
| `SMA100` | comprado se o fechamento fica acima da média de 100 dias |
| `DONCHIAN_55_20` | entra comprado quando o fechamento passa a máxima dos 55 dias anteriores; sai quando cai abaixo da mínima dos 20 dias anteriores |

(`SMA20` e `TSMOM90` ficam de fora: eram as que mais giravam e as piores em 2022 a 2026.)

## Universo: as 5 maiores por volume, ponto no tempo

- **Elegibilidade** (como em `BUSCA_DIARIA_V1`): não atrelada ao dólar, pelo menos 90 dias de velas, mediana do volume financeiro de 30 dias de pelo menos US$ 1 milhão por dia, vela existente no dia seguinte.
- **Ranking:** a cada **30 dias** (dias múltiplos de 30 desde 17/08/2017), as **5 moedas elegíveis de maior volume financeiro somado dos 90 dias anteriores** viram os membros do universo até o próximo ranking. Se um membro for retirado da corretora, sai e sua fatia fica em caixa até o próximo ranking. Antes de haver 5 moedas elegíveis, usam-se as que existem.
- **Peso:** cada membro tem fatia `1 / min(5, número de membros elegíveis)`; fatia investida se o sinal é comprado, caixa (USDT, rendimento zero) se não.

## Escala de risco (única, declarada)

- **Alvo de volatilidade de 20% ao ano**, sem alavancagem: o fator de escala do dia `t` é `min(1, 0,20 / (volatilidade anualizada dos retornos brutos da própria carteira nos últimos 60 dias))`, usando só dias até `t`. Antes de 30 dias de histórico da carteira, o fator é 0,5.
- Os retornos brutos usados para estimar a volatilidade são os da carteira **antes da escala e antes dos custos**.
- A escala existe para a queda máxima caber nos 30% do padrão do laboratório; o valor de 20% foi escolhido por convenção (uma queda de 30% corresponde, grosso modo, a algumas vezes a volatilidade anual), **não** ajustado nos dados.

## Custos

**15 bps por lado** sobre a variação de peso de cada moeda (taxa à vista de 10 bps mais 5 bps de slippage; para as maiores moedas o slippage medido é bem menor, `docs/MEDICAO_CUSTO_EXECUCAO.md`). As mudanças de peso causadas pela escala de risco também pagam custo. Sensibilidade: o dobro.

## Benchmark

As mesmas 5 maiores, **sempre compradas**, com a mesma escala de risco e os mesmos custos (isola o valor do sinal de tendência).

## Critérios (por regra; todos precisam passar)

Avaliados no período inteiro (17/08/2017 a 10/10/2026) **e** em cada era (até 31/12/2021 e de 01/01/2022 em diante).

1. `DATA_QUALITY`: 90% dos pares com série utilizável.
2. `POSITIVE_NET`: retorno líquido positivo.
3. `BOUNDED_DRAWDOWN`: queda máxima de no máximo **30%**.
4. `SHARPE_BAR`: Sharpe anualizado líquido de pelo menos **0,8** e **maior que o do benchmark** na mesma janela.
5. `POSITIVE_YEARS`: retorno positivo em pelo menos **6 dos 8** anos-calendário completos de 2018 a 2025.
6. `COSTS_X2`: retorno líquido positivo com custos dobrados.
7. `MEMBER_BREADTH`: entre as moedas que foram membros por pelo menos 365 dias, pelo menos **60%** têm retorno líquido total positivo com a regra aplicada sozinha nos dias em que foram membros.

## Veredito

- **`VALIDADA_MAIORES`:** passa os 7 critérios, no período inteiro e em cada era. Significa só "funcionou nos dados disponíveis, nas maiores moedas, com risco alvo".
- **`NAO_VALIDADA`:** qualquer outro caso, sem ajuste depois. Se mais de uma regra passar, todas são reportadas, sem escolher a melhor.

## Informação reportada, sem entrar no veredito

- universo de **3** e de **10** moedas (robustez, não nova tentativa);
- alvo de volatilidade de **15%** e **30%**, e **sem escala** (para ver o risco bruto);
- BTC sozinho com cada regra e a mesma escala;
- por ano: retorno, queda máxima, fator de escala médio e fração investida;
- quais moedas foram membros e por quanto tempo; giro e custo em bps por ano;
- Sharpe deflacionado com **30** tentativas (as 27 anteriores mais estas 3);
- hash SHA-256 das séries e o commit deste protocolo.

## Limites declarados antes de rodar

- **A hipótese foi escolhida olhando os dados.** A restrição às maiores moedas e a escala de risco nasceram do que se viu em `BUSCA_DIARIA_V1`; o teste confirma ou não a ideia, mas não é uma réplica independente. Não existe passado não visto neste conjunto de dados.
- **Poucas moedas e poucos ciclos.** O universo tem 5 moedas e a história tem 3 ciclos (2017 a 2018, 2020 a 2022, 2023 a 2026); a era 2017 a 2021 tem 1 a 9 moedas elegíveis até 2019.
- **Escala de risco com estimativa de volatilidade** pode atrasar nas viradas bruscas: um dia de queda de 30% acontece antes de a escala reagir.
- **Sobrevivência:** moedas nunca listadas na Binance não existem aqui; as maiores por volume tendem a ser as que sobreviveram, e o ranking ponto no tempo mitiga só parte disso.
- **Caixa sem rendimento, só posição comprada, execução ao fechamento** (a vela diária abre quando a anterior fecha), custos fixos.

## Regra de uso único

Este conjunto de dados e estas 3 regras no universo de 5 moedas são consumidos por esta olhada. Outras regras, outro número de moedas ou outra escala de risco precisam de protocolo novo.
