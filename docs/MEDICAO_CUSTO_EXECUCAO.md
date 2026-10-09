# Custo real de execução a mercado nos perpétuos da Binance (medição de 09/10/2026)

**Pergunta:** os custos que os estudos assumem (taxa de 0,055% e slippage de 2 bps por lado, ordem a mercado) são realistas? A resposta decide se estratégias de giro alto, como o momentum de 72 h (RAPIDO_V1, bruto +70,9% e líquido +2,9%), podem ser reavaliadas com justiça.

Só dados públicos. Sem conta, sem chave, sem ordens. Script: `scripts/estudos/custo-execucao.ts`; dados brutos resumidos em `docs/estudos/custo-execucao-2026-10-09-tarde.json`.

## Como foi medido

- As 21 moedas do acompanhamento (`XSMOM_FORWARD_V1`), a cada 30 segundos, de 16:19 a 17:19 UTC de 09/10/2026: **120 amostras por moeda, 2 520 no total, nenhum erro**.
- Em cada amostra, o livro de ofertas (500 níveis) é percorrido como faria uma ordem a mercado de **US\$ 500, US\$ 5 mil e US\$ 50 mil**, na compra e na venda. O custo é a diferença, em pontos-base (bps, 1 bps = 0,01%), entre o preço médio de execução e o preço central entre a melhor compra e a melhor venda. **Inclui metade do spread.**
- US\$ 500 é o tamanho de uma posição no estudo (5% de 10 000). Nos tamanhos medidos, o livro de 500 níveis cobriu todas as ordens, em todas as moedas e amostras.

## Resultado

| | Assumido nos estudos | Medido, mediana | Medido, p90 | Medido, p99 |
|---|---|---|---|---|
| Slippage de uma ordem de US\$ 500 | 2,0 bps | **0,46 bps** | 1,05 bps | 1,66 bps |
| Slippage de uma ordem de US\$ 5 mil | 2,0 bps | **0,80 bps** | 1,97 bps | 2,83 bps |
| Slippage de uma ordem de US\$ 50 mil | 2,0 bps | **3,33 bps** | 5,42 bps | 6,90 bps |
| Spread (mediana entre as moedas) | (dentro dos 2 bps) | 0,78 bps | - | - |

**Taxa:** pelo que a Binance publica e as fontes consultadas confirmam (não consegui abrir a tabela oficial ao vivo; a taxa da conta só se vê autenticado), um usuário comum paga **0,05% de taxa de execução imediata (taker) e 0,02% de taxa de ordem limitada (maker)**, e pagar com BNB tira cerca de 10%. O laboratório usa 0,055%, ligeiramente acima do real.

Fontes: [Finder](https://www.finder.com/binance-futures-fees), [Binance (artigo de suporte sobre taxas)](https://www.binance.com/pt/support/articles/360033544231).

### Custo por lado, em bps, para uma ordem de US\$ 500

| | Assumido | Medido (típico) | Medido (pior 10%) |
|---|---|---|---|
| Taxa (taker) | 5,5 | 5,0 | 5,0 |
| Slippage | 2,0 | 0,5 | 1,0 |
| **Total por lado** | **7,5** | **5,5** | **6,0** |

Uma ida e volta custa cerca de **11 a 12 bps** (contra 15 assumidos). **Os estudos eram cerca de 25% pessimistas nos custos para posições deste tamanho. A taxa é 90% do custo; o slippage é pequeno.**

## Por moeda (bps; mediana / p90)

| Moeda | Spread (mediana) | US$ 500: mediana / p90 | US$ 5 mil: mediana / p90 | US$ 50 mil: mediana / p90 |
|---|---|---|---|---|
| BTC | 0,01 | 0,01 / 0,01 | 0,01 / 0,01 | 0,01 / 0,01 |
| ETH | 0,04 | 0,02 / 0,02 | 0,02 / 0,02 | 0,02 / 0,02 |
| ZEC | 0,08 | 0,04 / 0,12 | 0,04 / 0,66 | 1,47 / 2,20 |
| 1000PEPE | 0,26 | 0,13 / 0,58 | 0,57 / 1,77 | 3,40 / 4,39 |
| TAO | 0,36 | 0,18 / 0,87 | 1,26 / 2,13 | 4,20 / 4,99 |
| BCH | 0,36 | 0,18 / 0,57 | 0,86 / 1,62 | 3,93 / 5,17 |
| ENA | 0,47 | 0,23 / 0,62 | 1,19 / 2,13 | 4,80 / 6,26 |
| XLM | 0,52 | 0,26 / 0,76 | 1,33 / 2,13 | 4,06 / 4,92 |
| AAVE | 0,59 | 0,30 / 0,89 | 1,48 / 2,20 | 5,98 / 7,07 |
| XRP | 0,72 | 0,36 / 0,36 | 0,36 / 0,36 | 0,51 / 1,21 |
| LINK | 0,78 | 0,39 / 0,50 | 0,86 / 1,63 | 3,03 / 4,00 |
| SOL | 0,91 | 0,46 / 0,46 | 0,46 / 0,46 | 0,46 / 0,73 |
| FIL | 0,93 | 0,46 / 1,27 | 1,86 / 2,69 | 5,02 / 6,07 |
| SUI | 0,94 | 0,47 / 0,47 | 0,47 / 1,32 | 2,16 / 3,11 |
| AVAX | 0,98 | 0,49 / 0,69 | 1,01 / 1,83 | 3,61 / 4,52 |
| DOGE | 1,18 | 0,59 / 0,59 | 0,59 / 0,71 | 1,06 / 1,94 |
| UNI | 1,36 | 0,68 / 0,68 | 0,81 / 1,59 | 3,63 / 4,67 |
| LTC | 1,57 | 0,79 / 0,79 | 0,79 / 2,07 | 3,55 / 4,62 |
| WLD | 2,02 | 1,01 / 1,02 | 1,13 / 2,42 | 4,62 / 5,59 |
| ONDO | 2,10 | 1,05 / 1,05 | 1,08 / 2,70 | 5,29 / 6,52 |
| NEAR | 2,11 | 1,06 / 1,06 | 1,06 / 1,71 | 2,80 / 4,09 |

As moedas mais baratas de operar são BTC, ETH e ZEC (menos de 0,1 bps de mediana para US$ 500); as mais caras para uma ordem de US\$ 500 são NEAR, ONDO e WLD (cerca de 1 bps de mediana, quase só spread).

## O que esta medição não mostra (limites)

- **Uma hora de uma tarde de sexta-feira, fora de horário de liquidação e de notícia.** Em momentos de estresse o spread abre e o livro afina; o pior caso medido para US\$ 500 foi 3,1 bps (NEAR), mas a hora medida foi calma. Uma coleta no fechamento das 00:00 UTC (quando as decisões diárias seriam executadas) e uma em dia agitado dariam uma faixa mais honesta.
- **Preço de referência diferente do simulado.** O simulador executa no preço de abertura da vela da hora, mais o slippage. Na prática a ordem a mercado executa no melhor preço do livro naquele instante, que pode estar longe da abertura da vela. Essa diferença não é medida aqui e pode compensar a folga.
- **Ordens limitadas (maker) não foram medidas.** A taxa seria 3 bps menor por lado (0,02% contra 0,05%), que é a maior alavanca de custo que existe. Mas se a ordem é preenchida, quando e contra quem (seleção adversa: as ordens que enchem são as que o preço atravessa a seu desfavor) só se mede enviando ordens de verdade, em demo ou com dinheiro. Dados públicos de livro não respondem isso.
- **Tamanho:** o laboratório opera US\$ 100 a US\$ 500 por posição. Em US\$ 50 mil o custo sobe para cerca de 3 a 5 bps de slippage, e a conta de uma estratégia de giro alto piora.

## Conclusão

Os custos assumidos eram conservadores para o tamanho do laboratório, mas por pouco: a execução real custa cerca de **75% do que o simulador cobrava**, não metade e muito menos zero. Isso **não transforma** as estratégias de decisão rápida:

- Estimativa de ordem de grandeza (extrapolação linear dos resultados já publicados, **não é um teste**): com 5,5 a 6 bps por lado em vez de 7,5, o momentum de 72 h passaria de +2,9% para algo entre +10% e +15% em 4,8 anos, e ainda perderia com o custo dobrado. Os critérios de anos positivos e das duas metades continuariam sem passar, porque o problema dele é a instabilidade, não só o custo.
- O que mudaria a conta de fato é a **taxa de maker** (cerca de 3 bps por lado de economia). Isso exige medir, com ordens de verdade em conta de teste (Demo Trading da Binance), quantas ordens limitadas são preenchidas e com que preço. Decisão do dono; nada foi enviado.
- Se alguma estratégia rápida for reavaliada, o protocolo novo deve declarar este custo medido (taxa taker de 0,05% e slippage de 1 bps, pior 10% do tamanho de US\$ 500) e manter o teste com custo dobrado. Reavaliar sem isso, só para o momentum de 72 h passar, seria forçar aprovação.
