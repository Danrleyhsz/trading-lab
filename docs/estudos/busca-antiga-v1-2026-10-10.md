# Resultado BUSCA_ANTIGA_V1: a regra congelada nas maiores moedas, 2011 a 2017

Executado em 2026-10-10T12:44:18.816Z, fora do servidor, com velas diárias públicas do Bitstamp (BTC) e da Bitfinex (altcoins), pelo protocolo `docs/PROTOCOLO_BUSCA_ANTIGA_V1.md` (commit `f562184a227c2563fb8d842771332174a30e5f96`), sem mudar nenhum critério. 11 moedas com dados, de 2011-09-01 a 2017-08-16; primeira data com membro elegível: 2013-04-23. Início das séries: BTC 2011-09-01, LTC 2013-05-19, ETH 2016-03-09, ETC 2016-07-26, ZEC 2016-10-29, XMR 2016-11-30, DSH 2017-03-03, XRP 2017-05-19, EOS 2017-07-01, IOT 2017-06-12, OMG 2017-07-14. Células "retorno / Sharpe / queda máxima".

## Veredito por regra

| Regra | Veredito | Reprovou em |
|---|---|---|
| SMA50 | **NAO_VALIDADA** | BOUNDED_DRAWDOWN |
| SMA100 | **VALIDADA_ANTIGA** | - |
| DONCHIAN_55_20 | **VALIDADA_ANTIGA** | - |

## Carteira das maiores (alvo de 20% de volatilidade, 15 bps por lado)

| | Período inteiro | Custos x2 | Custos x4 (60 bps por lado) | Anos positivos (2014, 2015, 2016) | Amplitude entre membros |
|---|---|---|---|---|---|
| **Maiores sempre compradas** (benchmark) | +279.8% / 1.14 / 39.1% | | | | |
| SMA50 | +432.4% / 1.37 / 33.3% | +396.5% | +331.8% | 3 de 3 | 100% de 1 |
| SMA100 | +327.0% / 1.24 / 29.4% | +307.1% | +270.1% | 3 de 3 | 100% de 1 |
| DONCHIAN_55_20 | +306.2% / 1.25 / 26.9% | +294.3% | +271.5% | 3 de 3 | 100% de 1 |

## BTC sozinho (informação)

| Regra | Com o filtro de volume do protocolo | Sem filtro de volume (de 90 dias de histórico em diante) | BTC comprado e seguro, mesma escala, sem filtro |
|---|---|---|---|
| SMA50 | +595.2% / 1.58 / 22.1% | +3793.9% / 2.53 / 21.3% | +2414.5% / 2.28 / 39.1% |
| SMA100 | +407.5% / 1.39 / 29.4% | +2730.4% / 2.34 / 29.4% | +2414.5% / 2.28 / 39.1% |
| DONCHIAN_55_20 | +389.5% / 1.42 / 23.5% | +1850.6% / 2.34 / 23.5% | +2414.5% / 2.28 / 39.1% |

## Por ano (retorno / queda máxima · fração investida)

| Regra | 2011 | 2012 | 2013 | 2014 | 2015 | 2016 | 2017 |
|---|---|---|---|---|---|---|---|
| SMA50 | +0.0% / 0% · 0% | +0.0% / 0% · 0% | +16.9% / 33% · 11% | +25.3% / 9% · 13% | +51.4% / 15% · 33% | +65.3% / 10% · 51% | +42.6% / 15% · 23% |
| SMA100 | +0.0% / 0% · 0% | +0.0% / 0% · 0% | +36.6% / 27% · 12% | +11.2% / 9% · 12% | +16.2% / 26% · 25% | +65.6% / 10% · 44% | +43.0% / 14% · 25% |
| DONCHIAN_55_20 | +0.0% / 0% · 0% | +0.0% / 0% · 0% | +24.2% / 27% · 11% | +6.8% / 11% · 9% | +62.2% / 10% · 21% | +53.6% / 9% · 31% | +20.7% / 26% · 16% |

Sharpe deflacionado com 33 tentativas (fora do veredito): SMA50 0.998; SMA100 0.993; DONCHIAN_55_20 0.994.

## Conferência das séries contra a Binance (sobreposição até 31/12/2018)

- BTC: 501 dias em comum, correlação dos retornos diários 0.982.
- ETH: 501 dias em comum, correlação dos retornos diários 0.993.
- LTC: 383 dias em comum, correlação dos retornos diários 0.992.

Hashes das séries (SHA-256):

- BTC: `4f2a403883014e180c9b71ab672f6d85934db044ab1a09320ad9cdd388b752e7`
- LTC: `b0c6deb21cf0b4b4a315f150c50da7f6aa4732fd8e33ffac9dfdd42144a689d4`
- ETH: `3755d473265e1fb8d5b417a7b839b04cda757105b38cbcea2d3f28d56e4b2ace`
- ETC: `4a5de6cf891e95a3995a8d8c2fb7dbb3d82c98837a8e88adc98d2b04113c4485`
- ZEC: `8384f90db166f8389558994817895dd1ef51328315daa1aee8f877be53790509`
- XMR: `e4a8dbc1f549a3596f80d62ac5a2462f22e0c8644b765ac092403a9ff0bd4d16`
- DSH: `24ece94a08875c6a16e338169b1586cb78ffe3d13d10a00112b1b88126e2e96d`
- XRP: `438939bddfe3812fa3dae87cdd0009ef23f86a3c6e05d3cb2600f705a4ebecfb`
- EOS: `c91f15cb971096d5645981b04f158f868495e34beacdca5b0b7f07b5ad4485ee`
- IOT: `fa1d4fde2a9f2d84020aa9d4e9c7fe90acf56da4c7094c71fcf472b24e8946be`
- OMG: `c93e3cbf9aacae80d1ac755b39c36ee5f83cf3326d2a260fba063b2aef34079c`

## Leitura honesta

- **Duas das três regras passam os 7 critérios declarados** (`SMA100` e `DONCHIAN_55_20`: `VALIDADA_ANTIGA`); `SMA50` reprova só na queda máxima (33,3%, contra 30%). Resultados do período inteiro, com a regra, a escala e os custos congelados: `SMA100` +327%, Sharpe 1,24, queda de 29,4%; Donchian +306%, Sharpe 1,25, queda de 26,9%. Positivas em 2014, 2015 e 2016, e ainda positivas com custos de 60 bps por lado (+270% a +272%).
- **O que isso valida, e o que não valida.** A "amplitude entre membros" é de **1 moeda**: o BTC. Nesse período só o BTC teve 365 dias de elegibilidade com volume de pelo menos US$ 1 milhão por dia; LTC, ETH, ETC, ZEC e XMR entraram por pouco tempo. Portanto isto valida a ideia de **tendência no BTC (e em quem era grande ao lado dele)**, não "todas as moedas". O critério de amplitude passou de forma trivial.
- **Foi um regime muito favorável a tendência:** o BTC foi de cerca de US$ 13 (abril de 2013) a US$ 4 400 (agosto de 2017), com a bolha de 2013, a queda de 2014 a 2015 e a alta de 2016. Comprar e segurar o BTC com a mesma escala deu +2 414% e Sharpe 2,28 (sem o filtro de volume), e a tendência não o superou em retorno; reduziu a queda (de 39% para 22% a 29%). Ler +300% como retorno futuro seria enganoso.
- **Sem o filtro de volume** o BTC desde 2011 dá +1 851% a +3 794% (Sharpe 2,3 a 2,5), números que incluem 2011 a 2013, quando o mercado tinha spreads de 1% ou mais e pouca profundidade: não são alcançáveis, e ficam só como informação.
- **O quadro completo, as três eras da mesma regra congelada** (Sharpe e queda máxima, mesma escala de risco e custos): 2013 a 2017: `SMA100` 1,24 / 29%, Donchian 1,25 / 27%. 2017 a 2021 (`BUSCA_MAIORES_V1`, 5 maiores): `SMA100` 1,20 / 23%, Donchian 1,53 / 26%. **2022 a 2026: `SMA100` 0,36 / 47%, Donchian 0,40 / 35%.** A tendência funcionou muito de 2013 a 2021 e foi fraca na última era; o que se vê hoje é um Sharpe de 0,4, cerca de 6% a 8% ao ano.
- **As séries conferem:** retorno diário de BTC (Bitstamp), ETH e LTC (Bitfinex) tem correlação de 0,98 a 0,99 com os pares da Binance na sobreposição de 2017 a 2018. Os dados são confiáveis para este uso.
- **Sharpe deflacionado (33 tentativas):** 0,99; não conta no veredito e não corrige a concentração em um ativo e em um ciclo.

## O que isto muda

- **Estado final da pesquisa de tendência, em frases:** a tendência (média de 100 dias ou rompimento de 55 dias) nas maiores moedas é a única família do laboratório com resultado positivo em todas as eras testadas, **validada pelo critério declarado em 2013 a 2017, não validada por pouco em 2017 a 2026**, e fraca na última era. Não funciona "em todas as moedas": só nas poucas que dominam o volume.
- **O que ela entrega, em ordem de grandeza realista (hoje):** um Sharpe de 0,4 a 0,8, quedas de 30% a 47% com a escala de 20%, e retornos de 6% a 15% ao ano, muito dependentes de haver ou não uma tendência forte. Em dinheiro de verdade, isso exige execução à vista (sem alavancagem), custo de cerca de 15 bps por lado e disciplina diária (o sinal é diário).
- **Pelo método:** com 33 tentativas e um só ativo efetivo nos dados antigos, `VALIDADA_ANTIGA` é indício moderado, não prova. O próximo passo coerente já não é mais pesquisa de sinal, e sim decidir se uma regra lenta de tendência em BTC e ETH com risco alvo merece **execução simulada ao vivo e medida de custo real** (Demo Trading), o que exigiria código no servidor (selo de release e deploy), decisão do dono.
