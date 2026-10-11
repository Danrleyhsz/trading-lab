# Resultado PIT_UNIVERSO_V1: momentum de 28 dias em universo ponto no tempo

Executado em 2026-10-09T21:16:30.712Z, fora do servidor, com dados públicos da Binance USD-M, pelo protocolo `docs/PROTOCOLO_UNIVERSO_PONTO_NO_TEMPO.md` (commit `1bbfd6a28338ac618bdf6ac266e625b17d132e30`), sem mudar nenhum critério. Pool de 59 moedas (15 originais e 44 outras); a cada 4 semanas, as 15 de maior volume financeiro dos 672 h anteriores; 5 compradas e 5 vendidas; 2,5% por posição; 01/01/2022 ao fim de out/2026.

## Veredito: **NAO_VALIDADA** (reprovou em POSITIVE_YEARS, BOTH_HALVES_POSITIVE)

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| POSITIVE_PNL | sim |
| BOUNDED_DRAWDOWN | sim |
| POSITIVE_YEARS | não |
| DOUBLED_COSTS_POSITIVE | sim |
| MARKET_NEUTRAL | sim |
| BOTH_HALVES_POSITIVE | não |

## Números (verdade: universo ponto no tempo de 15, 2,5% por posição)

| Retorno | Queda máx. | Sharpe anual | Custos x2 (USDT) | Corr. mercado | Anos + (de 4) | 1ª metade | 2ª metade | Comprar e segurar (cesta do universo) |
|---|---|---|---|---|---|---|---|---|
| +5.66% | 11.6% | 0.23 | 188 | -0.06 | 2 | +8.53% / 8.3% | -2.65% / 9.9% | -82.54% |

Com 5% por posição: +9.87%, queda máxima 22.4% (razão das quedas 0.52). Correlação semanal com as 15 originais fixas: 0.62. Sharpe deflacionado (17 tentativas, fora do veredito): 0.000. Taxas 281, funding 593, giro 51x, 249 decisões, 893 posições encerradas.

## Por ano (retorno / queda máxima no ano)

| | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| **PIT, 15 moedas** | +0.59% / 5.7% | +12.67% / 6.1% | -2.07% / 7.0% | -1.09% / 3.8% | -3.75% / 6.2% (parcial) |
| PIT com 10 moedas | +0.35% / 4.6% | +6.61% / 3.6% | -3.57% / 6.6% | +2.53% / 2.8% | -0.40% / 4.1% (parcial) |
| PIT com 20 moedas | -0.65% / 6.8% | +14.04% / 5.4% | +3.03% / 5.2% | +1.50% / 8.2% | -3.71% / 6.4% (parcial) |
| PIT com 30 moedas | +2.67% / 6.9% | +10.89% / 6.5% | +2.40% / 5.7% | +5.68% / 9.4% | -3.98% / 7.3% (parcial) |
| PIT só entre as 44 outras | -2.70% / 7.7% | +6.47% / 8.6% | +2.66% / 5.5% | +1.17% / 6.6% | -2.97% / 6.2% (parcial) |
| Universo fixo de 59 (sem filtro) | -0.37% / 8.9% | +8.18% / 10.6% | +10.19% / 7.9% | +14.32% / 9.3% | -10.75% / 16.3% (parcial) |
| 15 originais fixas (referência) | +4.18% / 3.9% | +13.85% / 3.9% | +1.13% / 4.5% | +7.51% / 6.6% | -1.98% / 5.1% (parcial) |

## Variantes (informação, fora do veredito)

| Variante | Retorno | Queda máx. | Sharpe anual | Anos + | Corr. mercado |
|---|---|---|---|---|---|
| PIT com 10 moedas | +5.35% | 8.8% | 0.24 | 3 | -0.08 |
| PIT com 20 moedas | +14.08% | 12.8% | 0.45 | 3 | -0.06 |
| PIT com 30 moedas | +18.30% | 14.9% | 0.50 | 4 | -0.06 |
| PIT só entre as 44 outras | +4.40% | 12.5% | 0.17 | 3 | -0.08 |
| Universo fixo de 59 (sem filtro) | +21.16% | 19.2% | 0.48 | 3 | -0.04 |
| 15 originais fixas (referência) | +26.41% | 10.8% | 0.88 | 4 | -0.03 |

## Composição do universo: parte das 15 vagas ocupada pelas 15 moedas originais

| Ano | Atualizações | Parte das vagas |
|---|---|---|
| 2022 | 14 | 52% |
| 2023 | 13 | 59% |
| 2024 | 13 | 68% |
| 2025 | 13 | 73% |
| 2026 | 10 | 79% |

Moedas fora do pool por qualidade de dados: ICPUSDT (sem vela inicial).

Hashes dos datasets (SHA-256):

- AAVEUSDT: `5c75caf4d74efe6153c47c9e5b188cc35f34acfcf2a7e60c1f0513360e792ef9`
- AVAXUSDT: `f76076da2b7e6dffd1d7dbcbb4755a6f33891b604c09f435cda5b1e9220ee78a`
- BCHUSDT: `1ac8e19392409f0bd4869d60ed847f2710969db5085ee8ef54b2a11b0fa10309`
- BTCUSDT: `a6756b85f3d38f119f54d5463fae2e211b3b4dad70b2fe49298a767e9e51cb3f`
- DOGEUSDT: `1f6b9e3c6f93fda50693dac022547b5701f4c826746c4ea4339ba4403b82431f`
- ETHUSDT: `f6678a6d21be22ee7909269c2998aacc9557ee82d06bb4d0983fcdc0bb56a9d5`
- FILUSDT: `d6859e338f81578af9086664342fa3718e7db1053449cc9803174f96cf57602c`
- LINKUSDT: `20c32307840788975be244299dd494898d306e6d1fc7afce282354542cd9e5e6`
- LTCUSDT: `21a62f5c1ce3fbfa16ee086fff727d956e8576ff7f270bc6690fd4d9cefeed8e`
- NEARUSDT: `c4418d34590e1766b4aa28a7a874b1d2a9a5083a3eb9457e77cbf9f0692ab0c0`
- SOLUSDT: `3c74a9c67af35b5efde186d51f78f24bb4794d4ba65d23f7bde7472bb99a8c2e`
- UNIUSDT: `8ab5a79322a81874b5b65d2c80b34b9ae099b88fa8654a82c5845a2bc7cb2f3e`
- XLMUSDT: `325dec8c4f2a539e910422168d2ab9eeb8942e83f34005de1cae1032b33e1b9c`
- XRPUSDT: `e630685f5e889cb5e6b781b9e26dca8ba9dbee1028cdc752c1e8df8e5fe189f4`
- ZECUSDT: `379584390df97a543757720dab716d7809d8732f1dccabee23097f8c2a86acc8`
- RLCUSDT: `2a50974b715fade6ddf365cf1a424bcd21e6e51b54b11d3f91e7563e83ab62da`
- OGNUSDT: `d999187bb2d734d698ad74e655eb50c01423805b7c20e416f3626dcccab3a7a2`
- BNBUSDT: `2fc0c0e95cf3514fe31f1a75d79f02dfb88ddfb6ac98343d5be88cad8b183d06`
- ADAUSDT: `1b8290499979d8398f888ead422f99039dea43b5c6f85c5e2ab3095a8153995c`
- SANDUSDT: `1d242246f636faa8fbf6e47c1394a08cc5f2ecc344137d39ff8ea8a4e6dd44bd`
- ATOMUSDT: `4879ef4e67deb8ba279b755d9df955574cc92ee6c7e3c95fc53502a97024abec`
- DOTUSDT: `96c4d7dd4f06e1d58dde62a8dc5731c6996fe314b2ecb9d942ff1e70bf1ab626`
- SKLUSDT: `1bb89d5555a8a96db8f654d8e7f379e5a7d45696875eeb75cdf56b316f9206d3`
- GTCUSDT: `ba25a88d87fd3594e01409ec0c46ff4231daccb7f8f93dad7d8533f951cb6270`
- CTSIUSDT: `80acec64f10bfafffdca160422fb2d84512ed858a428d8d6993ff45f7d590bfc`
- BATUSDT: `dafacf0307d77c4764802405e1e7a7da93c521e076d02aa9b2bec24c10c5fc69`
- CRVUSDT: `76eace02e18e980e12f088d6b80633931273783f8b31d4749bc1ca2e21e0f21c`
- XMRUSDT: `a21a12d8776de96360352a17fc47a73d8025e644d4d01ab0d8f95a39e5bce674`
- HBARUSDT: `98fd4fa07529f4477085c4a6e81dd8ab9b8f345754ca0485b1a5341b499b3540`
- ALGOUSDT: `0d11bc9eca5982048559aa86298753f6582d936c6c684bb5064dea3ab3f66040`
- TRXUSDT: `9aa6d8638b7a8bb331196cf891960a275e295bfa6a33fbfb7bbcee93afdc78d0`
- 1000SHIBUSDT: `c7ad531e35c251cf13c690150be10ffac847cfe8ddadc8fdfae73f5ce0d44bb8`
- DASHUSDT: `bc9dcaaea2663bbd276f516c097c4946486e3029c1e0e9b98755db01ab4f1100`
- ETCUSDT: `cd7cf17b8cfbccbaaf4d76f22aec2500b7264d26b08331fc272431cb76b06fc2`
- ONEUSDT: `e2275e941362b8a7a332f1ce3e4689f44c5642ecb4ab46db93e99d2007dcb03d`
- VETUSDT: `8ed03215c75f0b2f31794df53bf6295bd6423e9d330ed2f5b7d8dccede09938c`
- GALAUSDT: `0cf0d66f43bfde6d4eee9b67bd72007e5895703c5b552e5e46186a33a29ae72b`
- ARUSDT: `0c3c3ce123c54e115c597b5c09288f309e52a12528c2c790c154e078f69ef332`
- ONTUSDT: `b08bafd9d2e0687e178748b2cc311e96e9339c6b56572a1f4c3e5c6b33fb5c70`
- LPTUSDT: `feb100e8ba1a24856d0cd2f140b835d1ebd9ed730cb4c5e62906e866f3b6674b`
- AXSUSDT: `50353d1378266977dd59ed4e5afe406e971689b1230fbe39de0f1e4af5aec965`
- TRBUSDT: `11c3c28c2a776f4cab520565ffee42d380d52771f89dda283e0650a556774f71`
- ZENUSDT: `1bb1847c717dcce7112597656ec6273fb9932006c56aa1cf3a3db76be14777f0`
- MANAUSDT: `6006fd1f9a2c3015fff3d44396a4e43a6152ea21dd45a882aac4a944c5940d88`
- COTIUSDT: `873e8dab9d3431fd71644d9c626a7f6fa2051fedda6604b087e2a7f7a0ea1f90`
- COMPUSDT: `47e3bc788e6520db9e476aa14a5e8699a8e5e77a2c99baa88c8eba59b94cdc76`
- RUNEUSDT: `f136148214cb4fd94cb2edd925fd96e575eccfa90dd5a27fd622dd2e7174b48b`
- ENJUSDT: `ebb55aa611701a30049d00e95c1a8e4c89529b041f91f081555bc60b4b0662c1`
- DYDXUSDT: `739b7d87e1fc2b7dac58b30a94a0b9a0e1bf152da96e405ffca566543dbc2d0c`
- CHZUSDT: `4f56ae30387a15f5ad0d837319ce02cbf5c7d7381e3a962a227292c3da743683`
- EGLDUSDT: `65128a4fd27575a04981c87cd2168106b12e84859213194b202887a6b9832612`
- KAVAUSDT: `b0af2f143eaa7b718572dca60f311d8a47edd2fd075d34b30850e17cb6613939`
- CHRUSDT: `557d60573ee81e204ce0eb060e35970171cf05d0fbf6b0ba843d3433b9a9972e`
- ENSUSDT: `16192f7e237ae9dbaa8ef66af733935a3868db47ac26016b08d51a3b029c3643`
- ALICEUSDT: `17e0e558dbaa8b2d0407777fae3ae05a55148c964d372fb0cd5f73050e4e1d90`
- IOTAUSDT: `82fe9736ca9a2f1477ee0a9b100b236a2f00e5e03309fd0b80415c333e12a391`
- IOSTUSDT: `996a57e0c14fe9ce67cbe67ca94b7bd781079f01363e9011ef6ad11132372db8`
- GRTUSDT: `95dc2f2a86335c5a39016735c97f0790657b9b9c2c60c914b1834caf74115a7f`
- CELRUSDT: `e6aa7a1b5fea2a10e20106fedeabf932531d2632e7eacd4e0319d68098815be4`

## Leitura honesta

- **`NAO_VALIDADA`: reprova em anos positivos e nas duas metades.** Em 4,8 anos o momentum de 28 dias com 0,25x rendeu **+5,7%** (cerca de 1,2% ao ano), Sharpe anual 0,23, queda máxima de 11,6%. Anos completos: +0,6%, +12,7%, −2,1% e −1,1% (2 de 4 positivos); segunda metade −2,7%. Com custos dobrados sobra +188 em 10 000, praticamente zero. Passou lucro positivo, queda máxima (≤ 15%) e neutralidade de mercado, que são os critérios fáceis.
- **Comparado com as 15 originais fixas** (+26,4%, Sharpe 0,88, 4 de 4 anos positivos), tirar o olhar para o futuro da escolha do universo leva embora cerca de quatro quintos do resultado (não é uma atribuição exata, mas a ordem de grandeza é essa). Isto confirma, num teste direto, o que `MOM_METADE_V1` indicava: a vantagem histórica do momentum estava, em boa parte, na escolha de moedas que deram certo.
- **E o filtro ponto no tempo ainda favorece quem deu certo.** As 15 originais ocupam em média 52% das 15 vagas em 2022, 59% em 2023, 68% em 2024, 73% em 2025 e 79% em 2026. O pool só tem moedas que existem hoje, e, ao ranquear por volume, o filtro escolhe cada vez mais as sobreviventes que cresceram. Por isso +5,7% é provavelmente um **teto**, não um piso. A variante "só entre as 44 outras" dá +4,4%, Sharpe 0,17, com 2022 e 2026 negativos.
- **Informação, não veredito (e não pode virar nova escolha nesta base):** quanto mais moedas no universo, melhor: 10 moedas +5,4%, 15 +5,7%, 20 +14,1%, 30 +18,3% (queda 14,9%, 4 de 4 anos positivos), universo fixo de 59 +21,2% (queda 19,2%, 2026 até agora −10,8%). O padrão sugere que **amplitude** (mais moedas para escolher os extremos) importa mais que o filtro de liquidez. Escolher agora N = 30 por ter dado o melhor número seria selecionar no resultado; pela regra de uso único este pool não é reutilizado para isso.
- **Limites:** mesmo período do calendário; pool de sobreviventes (e sem as moedas listadas depois de 11/2021, que são justamente as mais líquidas de 2024 a 2026); volume financeiro aproximado.

## O que isto muda

- **Momentum de 28 dias:** sem validação histórica. No universo escolhido com hindsight, Sharpe 0,88; sem hindsight (e ainda com resquício dele), Sharpe de 0,2 a 0,5. A estratégia **não está aprovada para nada**; a evidência a favor é fraca e dependente do universo.
- **Carry e combinação carry + momentum:** os dois foram validados nas mesmas 15 moedas e carregam o mesmo viés. Ficam sem validação.
- **O que ainda daria uma resposta sem olhar o futuro, no passado:** um pool **maior e mais completo**, com as perpétuas listadas de 2022 a 2025 (hoje fora) e universo ponto no tempo de 30 moedas, declarado antes, em moedas que nenhum estudo viu. Custa algumas horas de download (cerca de 100 moedas a mais). Continua sendo universo de sobreviventes, então só reduz o viés, não o elimina.
