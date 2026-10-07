# Momentum entre moedas no histórico longo · XSMOM_LONG_HISTORY_V1

Executado em 2026-10-06T01:52:37.728Z, fora do servidor, com dados públicos da Binance USD-M. Período: 01/01/2022 a 15/08/2025 (nunca usado antes). Regra idêntica à do acompanhamento ao vivo (28 dias, 5% por posição). Protocolo: `docs/PROTOCOLO_MOMENTUM_HISTORICO_LONGO.md` (registrado antes da execução).

**Resultado: reprovada (DEFLATED_SHARPE).**

| Medida | Valor |
|---|---|
| Retorno no período | +55.06% |
| Queda máxima | 8.77% |
| Anos positivos | 4 de 4 |
| Sharpe anual | 1.13 |
| Sharpe deflacionado (5 tentativas) | 0.33 |
| Correlação com o mercado | -0.01 |
| Comprar e segurar a cesta (referência) | +16.77% |
| Taxas / funding | 441.24 / -39.31 |
| Rebalanceamentos / posições encerradas | 189 / 580 |

| Ano | Retorno | Queda máxima no ano |
|---|---|---|
| 2022 | +8.33% | 7.57% |
| 2023 | +29.22% | 7.58% |
| 2024 | +1.69% | 8.77% |
| 2025 | +8.93% | 4.41% |

## Leitura do resultado

- **Reprovada pelo critério declarado.** Quatro dos cinco critérios passaram: lucro de +55,1% em 3,6 anos, queda máxima de 8,8%, os 4 anos positivos e correlação de −0,01 com o mercado. O Sharpe deflacionado ficou em 0,33, abaixo do mínimo de 0,9.
- **Por que o Sharpe deflacionado reprovou.** O Sharpe anual de 1,13 é bom, mas os testes anteriores de momentum entre moedas tiveram Sharpes muito diferentes entre si, de períodos curtos. Com essa dispersão, o melhor de 5 tentativas feitas só por sorte já chegaria perto de 1,3. O resultado não supera esse nível com confiança.
- **O critério não é afrouxado depois de ver o resultado.**
- **Conferência independente.** Um cálculo separado, direto dos preços (semanas fechadas, custos aproximados, sem funding), deu +56,4%, contra +55,1% da simulação. A diferença vem do funding (−39) e do ajuste de tamanho.
- **Ajustes de dados antes do primeiro resultado.** A primeira execução parou antes de calcular qualquer número, por dois limites de dados:
  1. O validador do servidor aceita no máximo 10 000 velas. O estudo passou a usar 40 000, e o padrão do servidor não mudou.
  2. A Binance não informa o preço de marcação nos fundings antigos. Esses fundings usam a abertura da vela de negócios da hora.
  
  Nenhuma regra ou critério mudou.
- **O que isso significa.** A regra não perdeu dinheiro em nenhum ano do histórico longo e teve risco baixo, mas a evidência estatística ainda não basta para descartar sorte. O acompanhamento ao vivo (XSMOM_FORWARD_V1) continua sendo a validação. Cabe ao dono decidir se ele continua rodando, já que custa a mensalidade do servidor.

Horas preenchidas por moeda (paradas da corretora): ZECUSDT 0, NEARUSDT 0, UNIUSDT 0, BCHUSDT 0, FILUSDT 0, AAVEUSDT 0, AVAXUSDT 0, LINKUSDT 0, XRPUSDT 0, XLMUSDT 0, DOGEUSDT 0, SOLUSDT 0, LTCUSDT 0, ETHUSDT 0, BTCUSDT 0.

Fundings sem preço de marcação na fonte (preenchidos com a abertura da vela de negócios da hora): ZECUSDT 2089, NEARUSDT 2089, UNIUSDT 2089, BCHUSDT 2089, FILUSDT 2089, AAVEUSDT 2089, AVAXUSDT 2089, LINKUSDT 2089, XRPUSDT 2089, XLMUSDT 2089, DOGEUSDT 2089, SOLUSDT 2164, LTCUSDT 2089, ETHUSDT 2089, BTCUSDT 2089.

Hashes dos datasets (SHA-256):

- AAVEUSDT: `663073775edb6ddc4824e0d3c4b394ec737791f2ce3fce82de4c9621824913cf`
- AVAXUSDT: `dacad6e7085481eba7c9330736c291c1a6a283aa4986e091a85039c78de2b3c6`
- BCHUSDT: `1f73c2dc04d56c8e4dca12ecf143edf3dbc4c33db87540d390bc29b988afc2bb`
- BTCUSDT: `cb4262a96403d009b48ab7b1b997d74e02925a7286c0a92cc8aa6802299d5051`
- DOGEUSDT: `7805152af1d115093ad21fbe7e84c00c1991d2281f9cc2314c2c3dc117c1765c`
- ETHUSDT: `35d21914372a519f668b333c7208924b8c6f6c3c9f330d296346dff602d479c0`
- FILUSDT: `b21f89557311e94e83c18fa985075f2bc2f3184407f1b6ea88c5de2da8428878`
- LINKUSDT: `84fdf8b6e5dca58b131e5e26200df33f3e77a495eaa6698c5e17c1f45b4394d1`
- LTCUSDT: `aa85d632cd3eb13b472dbfceeab9d2fdf511878ebec48d06ab026b9bd157d7a4`
- NEARUSDT: `f2800d13286bec1d9d7f991a32693c0cace4288f97be988b660bc9014641d342`
- SOLUSDT: `eadbe30c30dbf698401ba20a30d48643749eacae56bf9e8b71d752961e2ace71`
- UNIUSDT: `0b074e7e8b88572ec04667d206eec9bad26774af78a23951c7c0c02b1c709237`
- XLMUSDT: `7af8f48428b27cab2b9ac8bd50c40c0a8622b5791690c165e40c71660b7a0ef5`
- XRPUSDT: `7ce378f1dfe61cfd8586f17afa3e83fff011a68ddad37d8f689566f4632a1853`
- ZECUSDT: `4d95daf599b2c9ab09a6f1ba10e3b21b2f5caf75ef7fe35b53447061505fa1a4`
