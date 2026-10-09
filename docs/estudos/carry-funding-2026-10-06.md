# Carry de funding · FUNDING_CARRY_V1

Executado em 2026-10-06T04:27:40.242Z, fora do servidor, com dados públicos da Binance (à vista e USD-M). Período: 01/01/2022 a 05/10/2026. Protocolo: `docs/PROTOCOLO_CARRY_FUNDING.md` (registrado antes da execução).

**Resultado: reprovada (NO_LIQUIDATION, POSITIVE_YEARS, SHARPE_ABOVE_ONE).**

| Medida | Valor |
|---|---|
| Retorno no período | +6.60% |
| Retorno anualizado | +3.29% |
| Queda máxima | 0.83% |
| Anos positivos | 2 de 2 |
| Sharpe anual | 1.78 |
| Probabilidade de o Sharpe verdadeiro passar de 1,0 | 86.3% |
| Funding recebido / taxas / diferença entre preços | 814.81 / 112.72 / -42.27 |
| Tempo investido / média de moedas | 100% / 4.76 |
| Entradas / saídas | 42 / 37 |
| Menor folga de margem | -0.4% |
| Liquidação | 2023-12-22T01:00:00.000Z |
| Correlação com o mercado | -0.05 |
| Comprar e segurar a cesta à vista (referência) | +26.98% |

| Ano | Retorno | Queda máxima no ano |
|---|---|---|
| 2022 | +1.45% | 0.36% |
| 2023 | +5.08% | 0.83% |

## Leitura do resultado

- **Reprovada pelo critério declarado.** A conta foi liquidada em 22/12/2023, então os anos de 2024 a 2026 nem chegaram a ser testados.
- **A liquidação é real, não defeito de dados.** A regra declarada nunca reajusta as moedas que continuam na carteira. No momento da liquidação, as cinco posições vinham de meses antes:

  | Moeda | Entrada | Preço no momento da liquidação |
  |---|---|---|
  | LINK | 09/2022 a 7,74 | 15,55 |
  | FIL | 06/2023 a 4,00 | 5,71 |
  | AAVE | 09/2023 a 54,57 | 102,73 |
  | ZEC | 10/2023 a 25,02 | 30,35 |
  | NEAR | 10/2023 a 1,00 | 3,82 |

  O patrimônio total seguia em alta (cerca de 10 660), porque o ganho à vista compensava a perda nos perpétuos. Mas o à vista não serve de margem, e a perda aberta nos perpétuos consumiu o caixa. Os preços daquela hora são coerentes entre à vista e perpétuo, sem pico isolado.
- **Até a liquidação, o rendimento foi baixo:**
  - +6,6% em quase 2 anos, cerca de 3,3% ao ano, com 50% do capital aplicado;
  - queda máxima de 0,8% e Sharpe de 1,78;
  - funding recebido de 815, taxas de 113 e diferença de preços de −42.

  O risco foi baixo, mas o retorno ficou abaixo de uma aplicação sem risco.
- **Lição para qualquer versão futura:** carry com posições longas precisa transferir periodicamente o ganho à vista para a margem dos perpétuos, ou reajustar as posições. Isso não foi declarado aqui, e a regra não será refeita para forçar aprovação.
- **Conexão de rede:** a primeira execução foi interrompida por uma falha de DNS durante o download. A segunda usou os mesmos arquivos já baixados e só completou a moeda que faltava, sem mudança de código.

Semanas na carteira por moeda: LINKUSDT 93, AAVEUSDT 78, UNIUSDT 64, DOGEUSDT 64, FILUSDT 42, ZECUSDT 42, BTCUSDT 27, XLMUSDT 20, NEARUSDT 15, AVAXUSDT 14, BCHUSDT 12, XRPUSDT 10, LTCUSDT 9.

Horas preenchidas por série (à vista / perpétuo): ZECUSDT 1/0, NEARUSDT 1/0, UNIUSDT 1/0, BCHUSDT 1/0, FILUSDT 1/0, AAVEUSDT 1/0, AVAXUSDT 1/0, LINKUSDT 1/0, XRPUSDT 1/0, XLMUSDT 1/0, DOGEUSDT 1/0, SOLUSDT 1/0, LTCUSDT 1/0, ETHUSDT 1/0, BTCUSDT 1/0.

Fundings sem preço de marcação na fonte (preenchidos com a abertura da vela do perpétuo): ZECUSDT 2029, NEARUSDT 2029, UNIUSDT 2029, BCHUSDT 2029, FILUSDT 2029, AAVEUSDT 2029, AVAXUSDT 2029, LINKUSDT 2029, XRPUSDT 2029, XLMUSDT 2029, DOGEUSDT 2029, SOLUSDT 2104, LTCUSDT 2029, ETHUSDT 2029, BTCUSDT 2029.

## Hashes das séries (SHA-256)

- AAVEUSDT: `c4cc2bb94ce9253bb41ea6e5c233a3803b0bcaec6c27bf2bcd47a8a5e7d160be`
- AVAXUSDT: `df5687e57d28b04c33e3b0e535f163c8bc25b947631c94f1d7bc9ab39104d0e6`
- BCHUSDT: `e0971437a2110bc4eef0c86fccc179802d8386bb98bc40ef934c27415bbe9dea`
- BTCUSDT: `0bafa7f156599cdb8dc321bc7cb3796b1febae74b5fdb11d55beceffb822c881`
- DOGEUSDT: `a5a08f31b934886e073475e1a4d8650a6fd94a4eb9ca2c8dd361250925ebf20d`
- ETHUSDT: `175101080278c420f963d2a43908b263bd2136f2fbb195333b03bb0521eb6e7a`
- FILUSDT: `0bd3306a68917383cd13554faa767764969b18a0ec3b7861ad8e3f3eb3c8ab4a`
- LINKUSDT: `7cfab1543b5d598bce5dc037a95c0049a31d29faa7640b71e579c3ccda455eba`
- LTCUSDT: `340ddde05c5af4af78b49b7ac6cfbda7c51e060db83bf5b9bae3d86a4954e1a9`
- NEARUSDT: `98f53807ed9dbb3d91db8c60c06e4a762f308f62f963e9063b6b636affdee226`
- SOLUSDT: `95547e4fc3de370ee090387581cc6476e241d84bd4499eabca8f455928328308`
- UNIUSDT: `ab23d95a4264b7f237e98068c8ca31a9fedbe322ca7f8c535e568c8729588897`
- XLMUSDT: `589ebd623f755d67652444242a7700ca841de80ed9c491c8f462c89bafec6866`
- XRPUSDT: `0aaf46ac985684de375d2c217182fc9e15b5e1b28806a780d8b20e1705a58009`
- ZECUSDT: `e3848c293ebee014af909cfa0e7d304c4ec4988bd27a77cc577aeb53a980ce90`
