# Resultado MOM_METADE_V1: momentum de 28 dias com metade do tamanho em 45 outras moedas

Executado em 2026-10-09T20:56:09.684Z, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo `docs/PROTOCOLO_MOM_METADE.md` (commit `2fdab2f6ff82bf4af2bbbce81cfa29ae63e0e9df`), sem mudar nenhum critério. 2,5% por posição (0,25x de exposição), 5 compradas e 5 vendidas, decisão semanal, de 01/01/2022 ao fim de out/2026 (cerca de 5 de outubro).

## Veredito: **NAO_VALIDADA** (0 de 3 grupos passam os 7 critérios)

| Grupo | Moedas usadas | Passa? | Reprovou em |
|---|---|---|---|
| 1 | 14 (fora: ICP) | não | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE |
| 2 | 15 | não | POSITIVE_PNL, BOUNDED_DRAWDOWN, POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE |
| 3 | 15 | não | POSITIVE_YEARS, DOUBLED_COSTS_POSITIVE, BOTH_HALVES_POSITIVE |

## Números (2,5% por posição; custos: taxa 0,055% e slippage 2 bps por lado)

| Grupo | Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Corr. mercado | Anos + (de 4) | 1ª metade | 2ª metade | Comprar e segurar a cesta |
|---|---|---|---|---|---|---|---|---|---|
| 1 | -14.73% | 19.1% | -0.44 | -1765 | -0.05 | 2 | -2.02% / 16.0% | -12.97% / 17.3% | -76.84% |
| 2 | -30.53% | 31.3% | -1.11 | -3296 | -0.12 | 0 | -18.58% / 19.5% | -14.67% / 16.8% | -96.52% |
| 3 | +2.88% | 10.4% | 0.12 | -59 | -0.02 | 2 | -0.57% / 7.3% | +3.47% / 10.4% | +52.41% |
| 15 originais | +26.41% | 10.8% | 0.88 | 2236 | 0.01 | 4 | +18.44% / 3.9% | +6.72% / 10.8% | +802.18% |

## Hipótese de tamanho: metade da posição dá metade da queda?

| Grupo | Queda a 5% | Queda a 2,5% | Razão das quedas | Retorno a 5% | Retorno a 2,5% | Razão dos retornos | Cabe nos 10% do motor de risco? |
|---|---|---|---|---|---|---|---|
| 1 | 36.2% | 19.1% | 0.53 | -28.83% | -14.73% | 0.51 | não |
| 2 | 53.6% | 31.3% | 0.59 | -52.50% | -30.53% | 0.58 | não |
| 3 | 20.5% | 10.4% | 0.51 | +3.90% | +2.88% | 0.74 | não |
| 15 originais | 20.5% | 10.8% | 0.53 | +57.04% | +26.41% | 0.46 | não |

## Por ano (retorno / queda máxima no ano)

| Grupo | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| 1 | -4.50% / 8.7% | +0.40% / 11.2% | -4.44% / 7.6% | +1.51% / 5.9% | -8.31% / 14.0% (parcial) |
| 2 | -9.59% / 12.6% | -6.17% / 10.9% | -9.05% / 11.3% | -3.59% / 7.2% | -6.60% / 7.7% (parcial) |
| 3 | +3.43% / 5.6% | -0.80% / 4.1% | +2.47% / 7.6% | -0.22% / 6.5% | -1.95% / 8.4% (parcial) |
| 15 originais | +4.18% / 3.9% | +13.85% / 3.9% | +1.13% / 4.5% | +7.51% / 6.6% | -1.98% / 5.1% (parcial) |

Correlação semanal entre os grupos: 1 e 2 0.12, 1 e 3 -0.02, 2 e 3 0.00; com as 15 originais: 0.10, 0.14, 0.09. Sharpe deflacionado (16 tentativas, fora do veredito): 1: 0.000; 2: 0.000; 3: 0.000; 15 originais: 0.004.

## Atividade

| Grupo | Decisões | Posições encerradas | Giro (x o capital) | Taxas | Funding (caixa) |
|---|---|---|---|---|---|
| 1 | 249 | 846 | 43 | 237 | 735 |
| 2 | 249 | 866 | 39 | 212 | 84 |
| 3 | 249 | 827 | 47 | 260 | 358 |
| 15 originais | 249 | 783 | 50 | 275 | -11 |

Moedas por grupo: **1**: RLC, ADA, DOT, CTSI, XMR, DASH, VET, ONT, TRB, COTI, ENJ, EGLD, ENS, IOST; **2**: OGN, SAND, SKL, BAT, HBAR, TRX, ETC, GALA, LPT, ZEN, COMP, DYDX, KAVA, ALICE, GRT; **3**: BNB, ATOM, GTC, CRV, ALGO, 1000SHIB, ONE, AR, AXS, MANA, RUNE, CHZ, CHR, IOTA, CELR.

Hashes dos datasets (SHA-256), grupo 1:

- ADAUSDT: `1b8290499979d8398f888ead422f99039dea43b5c6f85c5e2ab3095a8153995c`
- COTIUSDT: `873e8dab9d3431fd71644d9c626a7f6fa2051fedda6604b087e2a7f7a0ea1f90`
- CTSIUSDT: `80acec64f10bfafffdca160422fb2d84512ed858a428d8d6993ff45f7d590bfc`
- DASHUSDT: `bc9dcaaea2663bbd276f516c097c4946486e3029c1e0e9b98755db01ab4f1100`
- DOTUSDT: `96c4d7dd4f06e1d58dde62a8dc5731c6996fe314b2ecb9d942ff1e70bf1ab626`
- EGLDUSDT: `65128a4fd27575a04981c87cd2168106b12e84859213194b202887a6b9832612`
- ENJUSDT: `ebb55aa611701a30049d00e95c1a8e4c89529b041f91f081555bc60b4b0662c1`
- ENSUSDT: `16192f7e237ae9dbaa8ef66af733935a3868db47ac26016b08d51a3b029c3643`
- IOSTUSDT: `996a57e0c14fe9ce67cbe67ca94b7bd781079f01363e9011ef6ad11132372db8`
- ONTUSDT: `b08bafd9d2e0687e178748b2cc311e96e9339c6b56572a1f4c3e5c6b33fb5c70`
- RLCUSDT: `2a50974b715fade6ddf365cf1a424bcd21e6e51b54b11d3f91e7563e83ab62da`
- TRBUSDT: `11c3c28c2a776f4cab520565ffee42d380d52771f89dda283e0650a556774f71`
- VETUSDT: `8ed03215c75f0b2f31794df53bf6295bd6423e9d330ed2f5b7d8dccede09938c`
- XMRUSDT: `a21a12d8776de96360352a17fc47a73d8025e644d4d01ab0d8f95a39e5bce674`

## Leitura honesta

- **`NAO_VALIDADA`: nenhum dos 3 grupos passou.** Grupo 1: −14,7% (queda de 19,1%). Grupo 2: −30,5% (queda de 31,3%, zero anos positivos). Grupo 3: +2,9%, que vira prejuízo com os custos dobrados. As 15 moedas originais, no mesmo período e com o mesmo tamanho: +26,4% e queda de 10,8%. Pela regra de uso único, este tamanho de posição está encerrado neste universo, sem ajuste.
- **A hipótese de tamanho se confirmou, e é a única coisa boa aqui:** a queda máxima com 2,5% por posição ficou entre 0,51 e 0,59 da queda com 5%, nos quatro conjuntos. Metade do tamanho dá aproximadamente metade da queda. Nas 15 originais isso levou a queda a 10,8%, ainda 0,8 ponto acima dos 10% do motor de risco.
- **O número que muda a leitura de tudo o que veio antes:** a cesta passiva das 15 moedas originais subiu **+802%** neste período; as cestas dos três grupos novos fizeram **−77%, −97% e +52%**. As 15 originais foram escolhidas em 05/10/2026 (`docs/estudos/universo-2026-10-05.json`) por critérios **de hoje**: volume mediano diário de pelo menos US$ 50 milhões, spread de até 2 bps, listadas até 04/2025. Ou seja, são as moedas que **deram certo e continuam líquidas**. Montar o universo de 2022 com informação de 2026 é olhar o futuro, e isso contamina o momentum de 28 dias, o carry e a combinação em todos os testes históricos feitos até aqui, **inclusive a janela não vista de 2021**, que usou as mesmas 15 moedas. Os números anteriores continuam corretos como contas, mas a frase "melhor evidência histórica do laboratório" precisa da ressalva: era a melhor evidência dentro de um universo escolhido com hindsight.
- **Dois motivos possíveis, que estes dados não separam:** (a) viés de seleção do universo, como acima; (b) o momentum de 28 dias ser um fenômeno de moedas grandes e líquidas, com reversão nas menores. A segunda leitura é coerente com a literatura citada em `docs/VARREDURA_DE_ESTRATEGIAS_2026-10-09.md` e com o grupo 3 (as maiores do conjunto novo) ter ficado perto de zero. Na prática, os dois dizem a mesma coisa: **o resultado não generaliza para "moedas de cripto" em geral.**
- **Custos:** várias moedas novas são bem menos líquidas que as 21 medidas em `docs/MEDICAO_CUSTO_EXECUCAO.md`. Os 2 bps assumidos podem ser otimistas para elas, o que só piora o resultado.
- **Limites desta olhada:** mesmo período do calendário que as 15 originais (só testa a escolha das moedas, não o regime) e universo de sobreviventes.

## O que isto muda

- **Estado do momentum de 28 dias:** positivo no universo das 15 em 2021 e em 2022 a 2026; zero ou negativo em 45 outras moedas no mesmo tempo. Sem um universo escolhido sem olhar o futuro, ele **não está validado em dados históricos**.
- **O único teste sem este viés é o acompanhamento ao vivo** (`XSMOM_FORWARD_V1`): as 21 moedas foram fixadas em 05/10/2026, antes do período medido. Continua rodando.
- **Teste que ainda cabe no passado, e que atacaria o viés diretamente:** universo "ponto no tempo". A cada mês, escolher as 15 moedas mais líquidas pelo volume dos 30 dias **anteriores**, dentre as cerca de 60 moedas com histórico completo que o laboratório já baixou, e rodar a mesma regra. Isso tira a maior parte do olhar para o futuro (não toda: continuam fora as moedas que morreram). Exige protocolo novo, declarado antes.
