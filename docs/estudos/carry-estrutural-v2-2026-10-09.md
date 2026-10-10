# Resultado CARRY_ESTRUTURAL_V2: carry de funding delta-neutro com reajuste semanal

Executado em 2026-10-10T01:22:05.616Z, fora do servidor, com dados públicos da Binance (à vista e USD-M), pelo protocolo `docs/PROTOCOLO_CARRY_ESTRUTURAL_V2.md` (commit `41c8ea46d4d8deb2a9199fad5bdc7509a66416c6`), sem mudar nenhum critério. Universo ponto no tempo de 15 moedas entre as 543 perpétuas do pool com par à vista; 122 moedas entraram alguma vez, 121 utilizáveis. 01/01/2022 a 05/10/2026.

## Veredito: **NAO_VALIDADA** (reprovou em BEATS_CASH)

| Critério | Passou |
|---|---|
| DATA_QUALITY | sim |
| NO_LIQUIDATION | sim |
| POSITIVE_PNL | sim |
| BOUNDED_DRAWDOWN | sim |
| POSITIVE_YEARS | sim |
| SHARPE_ABOVE_ONE | sim |
| BEATS_CASH | não |

## Números (principal)

| Medida | Valor |
|---|---|
| Retorno no período | +14.68% |
| Retorno anualizado | +2.92% |
| Queda máxima | 2.04% |
| Anos positivos | 4 de 5 |
| Sharpe anual | 1.72 |
| Probabilidade de o Sharpe verdadeiro passar de 1,0 | 93.9% |
| Funding recebido / taxas / diferença de preços (à vista × perpétuo) | 1946 / 374 / -104 |
| Tempo investido / média de moedas | 99% / 4.66 |
| Entradas / saídas / reajustes / saídas forçadas | 69 / 64 / 1092 / 0 |
| Menor folga de margem | 38.4% |
| Liquidação | nenhuma |
| Correlação horária com a cesta do universo | -0.04 |

## Por ano (retorno / queda máxima no ano)

| | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|
| **Principal** | -1.09% / 2.04% | +4.65% / 0.76% | +6.93% / 0.86% | +1.66% / 0.35% | +1.92% / 0.27% |
| Sem reajuste (comportamento de V1) | -0.74% / 2.14% | +5.92% / 0.89% | +2.04% / 0.06% | n/d | n/d |
| Tamanho-alvo de 5% | -0.55% / 1.03% | +2.30% / 0.38% | +3.41% / 0.43% | +0.83% / 0.17% | +0.95% / 0.14% |
| Tamanho-alvo de 15% | +0.25% / 0.71% | +6.34% / 1.62% | +10.65% / 1.37% | +2.25% / 0.19% | +1.48% / 0.35% |
| Tamanho-alvo de 20% | +0.23% / 0.60% | +5.67% / 0.87% | n/d | n/d | n/d |

## Variantes (informação, fora do veredito)

| Variante | Retorno | Anualizado | Queda máx. | Sharpe | P(Sharpe>1) | Funding | Taxas | Liquidação |
|---|---|---|---|---|---|---|---|---|
| Sem reajuste (comportamento de V1) | +7.28% | +3.30% | 2.1% | 2.06 | 94% | 891 | 120 | 2024-02-29T06:00:00.000Z |
| Tamanho-alvo de 5% | +7.09% | +1.45% | 1.0% | 1.71 | 94% | 943 | 182 | nenhuma |
| Tamanho-alvo de 15% | +22.40% | +4.33% | 1.6% | 1.89 | 97% | 2830 | 462 | nenhuma |
| Tamanho-alvo de 20% | +5.92% | +2.95% | 0.9% | 1.35 | 69% | 901 | 226 | 2023-12-22T18:00:00.000Z |

Semanas na carteira por moeda: LINKUSDT 172, DOGEUSDT 166, SUSHIUSDT 123, CFXUSDT 114, TRBUSDT 80, BTCUSDT 79, ETHUSDT 52, PUMPUSDT 44, 1000LUNCUSDT 30, LTCUSDT 29, BOMEUSDT 28, XPLUSDT 26, SUIUSDT 23, CRVUSDT 22, PAXGUSDT 22, STOUSDT 22, NEARUSDT 16, MANAUSDT 15, AVAXUSDT 14, SOLUSDT 13, XRPUSDT 10, CHZUSDT 8, 1000BONKUSDT 7, 1000SHIBUSDT 5, APEUSDT 5, ENAUSDT 5, GALAUSDT 4, ZROUSDT 4, TRUMPUSDT 3, SANDUSDT 2, ADAUSDT 2, TRXUSDT 2, PEOPLEUSDT 2, PNUTUSDT 2, ZECUSDT 2, ETCUSDT 1, 1000PEPEUSDT 1, AUCTIONUSDT 1.

Moedas fora por qualidade ou falta de dados (1): FTT (17.61% de horas preenchidas).

## Hashes das séries (SHA-256, à vista e perpétuo)

- 1000BONKUSDT: `9c1599266465437ccdedf7974b6094c4277e9ac9c90a076f923e44bd69545a3c`
- 1000FLOKIUSDT: `c7f5dcafdd99b829146757de348c53913f4dac8acd0dd77afeb254e48e215dad`
- 1000LUNCUSDT: `975e7522e261ae8fd3ab45c7321047fe24ea130c1bfd5a3f7363efed6e1b9280`
- 1000PEPEUSDT: `b9a90d7d767ebecb5daf065a273d1951bc505d1ca90f8b175ee3d8497a1d4fcd`
- 1000SHIBUSDT: `57c3590126defe5de6bee97ddab1478d322923a86a7903aa92ecc5d96b144faa`
- AAVEUSDT: `8935894725f5258e8e71a7696c0cc19132527ffc93a44a812813de2a84033711`
- ACEUSDT: `35d96a8144018e2641bc414007edff88caa2f203ae70f0bd1cb71b8bc9cd9cb8`
- ADAUSDT: `472bc298a704036a6068905581014f80cb50b1e13b0cc7984fa8177a10bcb1eb`
- APEUSDT: `68cb5532b8e57b88b86dbaa5d72c525f65dddd0565539a5b4489798b9ce9864b`
- API3USDT: `b6d2161871b67eac361aa49545fb2f6ed1fcd06e977f6d0f72827b9674691c1b`
- APTUSDT: `7b0bf649c1a5ad287173d45c379e862fd5876d1681e31df2af7278d00dfd6f25`
- ARBUSDT: `0ed3e7614f5a655819c1a3b3043675cb0e02d0d7043b3810c81cc7d396d1431a`
- ARKUSDT: `066e18c3d738801bb97e27aaf7abe2907fbbf29866d4633b5629c62eca4773cb`
- ARPAUSDT: `c8a91507f0dd1f427a38e92715a9494a52d81aff2d1a9a480337e5c5a45a7c2a`
- ASTERUSDT: `b78f65ffd86e0ef16ccb596a410520103b520f560724d83fa4d6f2c4b0f0b74e`
- ATOMUSDT: `bfe3659163214954d61d9e4fe65d09ee9af6cb436ac55458d499c444e0858ff0`
- AUCTIONUSDT: `6e9d2986ce5ea4c5b4831dfcc73229526aa5f99cfd011548293cbc73048e95db`
- AVAXUSDT: `3a0509932268b66ec36521af1f930e69f9f98200c6132aca48b2e90121495a6e`
- AXSUSDT: `139a94c1f2246ca06e8a60b36dcef7b8137be30ec877f79f2ceabaf72e53862d`
- BANDUSDT: `19321c3c94863773fbbcc0b54a6d5a68966e279407e3abc82a49c5be0890cf2c`
- BANKUSDT: `70da0942592958d9f04f7db172d27ec7062e84aa8f754adb84c07f9cb5b171c4`
- BBUSDT: `2e60b83f5d087d1a5c01a63d505d7de16ef71b659728164ee56063c1d2422b8d`
- BCHUSDT: `323f84c38517e7ade69ae45b8d981ea72623595bee2aa8bb41024d604e735a26`
- BELUSDT: `09a9e2090b3e2243c8bae9fcc7bf6caa5c0785ceb5692200d3840827ddb886a5`
- BIGTIMEUSDT: `8c6c7b8fed17e744933f95e17b89eccd32188c8d44899e09f62ef1ad89282b4c`
- BIOUSDT: `48ea06a3d66f15eaee4d32af94da75e178247f39bd2b42ed5e5efa1e8cd84142`
- BLURUSDT: `ebcf089406665b2689dbf8aaf45bf9fb9e341dd91f35244bae0dbe2be64d3240`
- BNBUSDT: `4495178afea3bc47fc4652cd4bc7b6edc476a63f855c456b503a5246ad9c4e25`
- BNTUSDT: `98a71cd6f58b695baa82353aecfd1f6221d7c21690653d8fe0e3b80b8b67a399`
- BOMEUSDT: `8a039bd1939c7623bd4c2788c82ed0814c5fd4d8498c374b71407098139734b7`
- BTCUSDT: `533aedc6c0fdb0d5544ab1dc466cb072071c9b7ce14247c38ca49d8956cc3b4e`
- CFXUSDT: `07f7fa20ee25e3aff0005b04aa146d6ee3bbdfc0350452794fe04d7044142868`
- CHZUSDT: `e34c058da6a421e75377ef2f93f06068ec07e7691e64e0ec5310f2e673c806ae`
- COMPUSDT: `44a6e6bfb83546c833d92a558ea12cdc706127c869b52d41d29e32b0d4bc9b7a`
- COTIUSDT: `845d201413f1be64f58530b4ab7810adb399cd78a7c7b6ca08f4c61dbb54bce8`
- CRVUSDT: `2e551b0a1e2c85f470de297d32fe45e729652039e4210ebc527afb94a17726c6`
- DASHUSDT: `f9f950436caa43482a29ca2f0e9ce88d151e5934926e014b8718feafc7785c38`
- DEXEUSDT: `f5527424700bdda4005fcdd165619aab31210f04c6bed1872b7035d21e787c5b`
- DOGEUSDT: `1b73115f578bc4e68ed4e2c08406c54d07e2ec718194c8245a8dda4e3d185dc3`
- DOGSUSDT: `a64a22971fc1e54293c106f2c75c74c4a8cf1107e3815d19862a4895385ddd9e`
- DOTUSDT: `2b21b7c9ea0944ae65b617cbe1149f0367ba87c0e482bf334103ce84df1ff578`
- DYDXUSDT: `b70c638b1857eab719cba2a1c8eb23948e45c3c237a2342124dda83c6566c8c6`
- ENAUSDT: `fb444da4ce915edd4cc3f33ea8ee58ee0cac7ade4b12ddf1a5fe6d9dba2ef126`
- ENSUSDT: `4e04db4a2a7b66dce18e3516afc740ad76b8358f068a62dcbf235b62fd45ae24`
- ETCUSDT: `79e4aadfb83e77fd68a74a38345e95e45f8dee62d36c50e3025e0a7b1a996776`
- ETHFIUSDT: `d5ef49c45ce1184121c3ec8353a6f1be697dbb95cd7ef1de59cc9eb86e2665ee`
- ETHUSDT: `3075e5cc513fb6802fe23f6b9e1e8d9e7a809c525d6808b81377f6322f23c599`
- FETUSDT: `b86b42e624bed6d695aab5f0516e642b67c38cf51d6e6a54b02bbcc4599c4df7`
- FILUSDT: `7d4defe2a948f6196e2074f904bbe5c46a8cf48014688d3c03d2d3ea5b886cfd`
- GALAUSDT: `3421fed426538a76e2a4bf1dbaa6751d6844448ee0d0fe37a6d209e592e2fcec`
- GASUSDT: `a91b764ab18650cb71c73f0a983b5d5fafc9ebfa917a56a5feeebf59f65cffb1`
- GMTUSDT: `b08335484387be2067de940125c214f2fac710492c4489bb8b9b1e9743e9ad62`
- HBARUSDT: `51a871e5e2df9d56070a92b7cccd8c1ce83152f3d2df8d108de98d66906b02ae`
- HYPERUSDT: `d3aa155624283ba31cf19d52ec12e18f440b3133b1b8a252adcd24a81ccbcb78`
- HYPEUSDT: `7c840552cc2ad97b289eb38d74c944eabd627171bc019d5be962e3e60cb3ebf5`
- IDUSDT: `9f1cbcb5b7955f29e7430516a012f9146fd367f25f615550180cf61f11b8d73f`
- INJUSDT: `25a64020a14c5d972be86daf351ae6c020569691481e2213228a95c0952f0200`
- IOUSDT: `822c47a9f9af58536ef73d41af477d88b1a4fa839a4441c9908db01ed0870628`
- JUPUSDT: `95abf45a7a40ddef39b853afa6bb6c5936cb0fc5a01f78363ad4a7fe1eb7ee8d`
- KAITOUSDT: `3449c3e2540a7c800c16a94ee9fb0a9ff10e8d9a3ee7a816685c8fda72244217`
- KNCUSDT: `0b16dde25347882cedd778f53d0940e6c10edbf090d2ce6222a8bd49215e74fa`
- LAYERUSDT: `70ce58abf398b4263ae857f44df3ecc7a40012951cc4c51d7eb3322fdefce558`
- LDOUSDT: `87ed358be2fe7692f828e0f97b008604b830c8bc6e76f604fe264f7742a49dad`
- LINKUSDT: `8453271096da7bcb510fb0840d36a0818ecf326b54b5ff2b1f37195045b82a4a`
- LPTUSDT: `b86f1ca940dd56cc690a4474fa8e08f1c014a09867e48a9a6b99277dbd59b852`
- LSKUSDT: `06ed5aac90c34b42be3347f93d5a87e9545101e1d152ae51e597fc68aa49aad5`
- LTCUSDT: `7e61b2e0c986dad1e4f52f42ac2f739a9d1d5b136656021a27bb5b1fa400626e`
- MANAUSDT: `5c1a690831f4ea402a6f70222c168f3f11cd93cdf6b6b2b4c019e8d012acebb0`
- MANTAUSDT: `32d089a5bb8a19532353b236ad560697b2629da0c2f52eff8ec316adcf0892a4`
- MASKUSDT: `dd3e7ac8748fc37cc7fac117bcd7bd7eba475cdad8c32a31522227baa7c4ae97`
- MEMEUSDT: `1aaa85f507ed93a08e191beabb287e4f433aa0ff09a479ccb3881f0413494f42`
- MTLUSDT: `62e362a3dd7c3a52929aefeeacb91963790a24bdac438c0fea536f26bb5d71c4`
- NEARUSDT: `543726e6017a5e2fb1ea07d60f3f3e3769840279f5e792dd9aa692a6aca730db`
- NEIROUSDT: `6e81033d56d0550829bfeb4b979b42395d03a5973f8ade0b5349cf393b98c39f`
- NOTUSDT: `9246880f8e99f4772d9fe73ae382e7a6ad9eeb58edfb61f116a45c546689bcae`
- OGNUSDT: `7afb4c937d2cef998cc8ebc6efb8f6c31d741d241a144d6cea2ca8cb7cee7370`
- ONDOUSDT: `77718f59062521e01c4ee3109e5221d3dbbc5e1e34790ffa3d065c8c4f896f15`
- ONEUSDT: `ae7963e1ac72d80351b1a658c496ee684bc763f82c86e445d08a6169e143aef5`
- ONTUSDT: `1cacefa7b08103099e53ac19aa4a08de26ce5c7ad9d6bbdb5a7dec8ff17ac48d`
- OPUSDT: `c4b2e4fbe41e54003d7add83cc33d53a5ca17ec1beb2e56b4e6e90652dda1fc3`
- ORCAUSDT: `c87a6844587d0e7841981e60cc188b23534dbd68085d58fdc28f1dc9dbc68f42`
- ORDIUSDT: `a60bfc3a44a97cf23fc015298774ea8537db5145ef7c42b1b1b511075d76a005`
- PAXGUSDT: `625c01cd8f2da71999688fd56c32f3bc4b34a9c43f88b4867000ea7531255bd6`
- PENGUUSDT: `002f69c4ab968523b0b0b685a5ec09406d7c680bb5ed913848f0d9ce2a0e665b`
- PEOPLEUSDT: `aea5b45c67d86513dfff9900425dd6ad3a63ae971f740c623207dbfb49144530`
- PNUTUSDT: `8fe7e5783967bc23a2c6ca62fc26c3e4801e18ca5678f38df5103b4c3a6a8ecb`
- PUMPUSDT: `df9d1e42ac0119b81e4afefb9c0669c77b897b8086b221f43771c3503c71f57b`
- QNTUSDT: `022608b76f1f66f84db4ea2c5a8a6235e930cd6ec1c114b8c5dc5341ab72c1d0`
- RSRUSDT: `3a180fa60f008679bbdb24728848edc2f6487681403c84191b94cd689da917d5`
- RUNEUSDT: `01744ebc6f40edc7fa2f90c1745a1db64763d02ab59cf12d70f3d055777e9b26`
- RVNUSDT: `3afc2b0cb27e635922366da25746d820ba8292a497dd582d7e567cfed510382b`
- SANDUSDT: `862ea54e0d8fb3634e5ea2cbd8fb8f63bea81b1034a82a7d10ac0e4f9ec4e031`
- SEIUSDT: `053e15ab069f71507055bb454a74624ea6d8ff655bfb9acfda0f161447ed1fdd`
- SOLUSDT: `ab22c77bf45a8544dc31a8c1ed3623e7a89694eeb2401bfb1bf7395f39e3df0a`
- SOMIUSDT: `99fc38f19041c8e4f6438c6ff1c78472dbeacda67c22aeacc6de2a43b2b035ee`
- SPKUSDT: `2df546b34f84ad8aed261072d8424b21fd7f4773726a802e92eecfb766a0976e`
- STOUSDT: `ab0d90b39c94d610b11ff3378c5b4f84b776b3d24b39a30aac43bb3702466347`
- STXUSDT: `56c5fd3a81112fbc3958359fa96e45245e8f5106ffca0baca18b508fd45bce0b`
- SUIUSDT: `6e290e40bf093dd7c93863e855a0c9c91bf2b88e664d6097c24cccff75b75014`
- SUSHIUSDT: `dc63360b2bc3ae4d98f6cfc01eb534584ac7f8b0dc5350a258db15b31edb1e03`
- SYNUSDT: `954871c5c43626c03b7f226bb5d2ca830611cab8a5957b16186d19711968e13f`
- TAOUSDT: `b2f96b6ef4c25dced8d7de3f824ab8cf21709c3f403a006c34ce7adace84936b`
- TIAUSDT: `58bb911d9435e43ef4fc2b4b422e6ffa2b70e8bc6922420157fc191d916c79cb`
- TNSRUSDT: `d8f5886cc2c282f41260abd0beaf8647d789e19b78519951e6946f68dfd18410`
- TRBUSDT: `9c37259bc7f54eb3298cfc1d02d711ad8e7b51b882f31d129902fcd819cd4514`
- TRUMPUSDT: `1bbd7a85e20ec5f6a2bf4f6d9708be2183b0187cd3d8b48a3ae2848462431df5`
- TRXUSDT: `0c4a72c96d52090c79d84ca6efc445e222e2babdfa7ab1acc21867f9037667a2`
- TURBOUSDT: `5ca1129c7752b78499f29e001a64c87037b5ebf5d832095cb0231f004e172064`
- TUTUSDT: `10b7ba69253fa09d412c27403c1ca29ca54a9a2a772bd99f63877d78d3b19874`
- UNIUSDT: `f286effad383fa43c07bade287db32c3d3c06300a24f99862da06ec94aa24136`
- VIRTUALUSDT: `793986f45f9afa787e8fbbf8e8f84a99e63217b0edf41e53536fc46981eb207c`
- WCTUSDT: `a118f9cb5ed4930d31f8b24bb534ca5bf1c0ff40fdf88140bb62918606caf1cc`
- WIFUSDT: `edbc4c83cf58b9c1dcfa0f01a6274b61b5a2444a34c87cc012c04eeac89da90b`
- WLDUSDT: `61c01dfaaa8104b223f3fc8893a117fc7441564dadaee7e75f160574e263a194`
- WLFIUSDT: `b7a3910f4eab357b2c8f4b3f8e2c3b66c108024e06824477074537b6fbe3b8de`
- XLMUSDT: `ea4d5d40b5f96d47bba4d002f6794dda348ac903e43d13e4a61d8f316bd3e5c3`
- XPLUSDT: `1f01f7726b6241d8fc2515b0f64ed6e485965bf9e0960662dc3153abce08b750`
- XRPUSDT: `21bc4bf046116a3ac7763eea0a1a9ed02c323e10da8df35cc7bd2e0a714af1c6`
- ZECUSDT: `03fb5299bf6dc5118b3f5d716a1a99dfe29c59ce9517aabd433cee0378371eb9`
- ZILUSDT: `32ce7148e6b417c68142622bf3c582ba5de8954c6963a55d4a80d220ec9049c6`
- ZROUSDT: `109069f03a66d2dea6603ac3f952c0469f8a0ef30c0483ca05243753f7c651e3`

## Leitura honesta

- **`NAO_VALIDADA`, reprovada só em `BEATS_CASH`.** Os seis critérios de risco e de consistência passaram: nenhuma liquidação, queda máxima de **2,0%**, 4 de 5 anos positivos, Sharpe 1,72 com 93,9% de probabilidade de passar de 1,0, correlação de −0,04 com o mercado. O que reprovou foi o retorno: **+14,7% em 4,8 anos, 2,9% ao ano**, abaixo dos 4% declarados.
- **É o perfil de risco mais limpo que o laboratório já mediu num universo sem hindsight**, e a primeira estratégia que passa os critérios de risco em teste ponto no tempo. Mas o retorno é pequeno e **vem encolhendo**: 2023 +4,7%, 2024 +6,9%, 2025 +1,7% e 2026 (9 meses) +1,9%, ou seja, cerca de 2% ao ano nos últimos 21 meses. É o que a literatura aponta para o carry (BIS WP 1087): o prêmio caiu com o tempo.
- **O reajuste semanal é o que impede a liquidação, como previsto.** Sem ele (o comportamento de V1) a conta é liquidada em 29/02/2024. Com ele, 1 092 reajustes ao longo do período e a menor folga de margem foi de 38%.
- **Tamanho:** com 15% por moeda o resultado seria +22,4% (4,3% ao ano, 5 de 5 anos positivos, probabilidade de Sharpe > 1 de 97%), que passaria no `BEATS_CASH`. Mas (a) é uma variante informativa e escolhê-la agora, depois de ver, seria selecionar pelo resultado; (b) a menor folga de margem nela foi de **7%**, e com **20%** a conta é liquidada em 22/12/2023 (a mesma data de V1). Passar a barra de retorno exige encostar no precipício da liquidação, e o resultado se parece muito com `FUNDING_CARRY_V1`.
- **O limite de 4% foi uma escolha minha, declarada antes, com caixa rendendo zero na simulação.** Com metade do capital parada em USDT rendendo algo perto de 4% (rendimento de um fundo de caixa), o retorno total subiria cerca de 2 pontos ao ano, ficando perto de 5%. Se essa renda do caixa existe na prática, e se vale a pena o risco operacional (corretora, custódia à vista, interface, mudança de regime do funding), é decisão do dono. O veredito pré-declarado não muda.
- **O que o teste deixou de fora, e isso favorece o resultado:** `FTTUSDT` saiu do universo por ter 17,6% das horas preenchidas (as paradas de negociação da FTX em 11/2022). A regra de qualidade tirou do teste justamente o evento de falência de corretora, que um carry real teria sofrido. Também são idealizações a transferência instantânea e gratuita entre carteiras, a ausência de custo de saque ou empréstimo e a execução na abertura da vela.
- **Limites do pool:** só moedas com par à vista ativo hoje (330 das 543); moedas que perderam o par à vista ficam fora.

## O que isto muda

- **Carry delta-neutro:** o teste não aprova nem recomenda. Ele mostra uma estratégia **de risco baixo e retorno baixo e decrescente**, que não bate o limite que eu mesmo declarei. A busca por variantes nestes dados termina, pela regra de uso único.
- **Sobre a busca em geral:** momentum, tendência, reversão e baixa volatilidade não passaram em teste sem viés; o carry passa o risco e falha no retorno. Nenhuma estratégia do laboratório tem hoje validação que justifique dinheiro real.
- **Passo seguinte possível, que é do dono:** medir a execução real do carry em Demo Trading da Binance (preenchimento, funding efetivo, custo do à vista) antes de qualquer julgamento de que 2% a 3% ao ano justificam o trabalho. Exigiria código no servidor (muda o selo de release e pede deploy).
