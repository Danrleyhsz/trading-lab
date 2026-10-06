# Protocolo pré-declarado: MULTI_ASSET_STUDY_V1

Declarado em 05/10/2026, **antes** de qualquer estudo multimoedas ser executado. O universo, os conjuntos de candidatos, as janelas, os custos e os critérios abaixo são fixos. Uma ideia diferente ganha nome novo e declaração nova. Este documento não é editado para caber em um resultado.

## Por que

O piloto atual testa uma moeda (BTCUSDT) com uma estratégia lenta. Em 23 horas foram 24 decisões e nenhuma operação fechada. Nesse ritmo, chegar a uma conclusão leva meses. Este protocolo usa histórico real de várias moedas mais voláteis para separar, em minutos, as combinações de moeda e estratégia que merecem um piloto paper das que não merecem.

O resultado é **filtro**, não prova: uma combinação aprovada aqui ainda precisa passar por um piloto paper, declarado à parte e aprovado pelo dono.

## Universo (fixo)

Triagem de dados públicos da Binance USD-M feita em 05/10/2026 (`docs/estudos/universo-2026-10-05.json`). Entram os perpétuos USDT que cumprem **todos** os critérios:

- volume mediano diário (90 dias) de pelo menos US$ 50 milhões;
- spread no topo do livro de até 2 bps;
- listados até 05/04/2025 (pelo menos 18 meses de histórico);
- volatilidade diária (90 dias) de pelo menos 2,5%.

Universo resultante, do mais volátil para o menos volátil: ENAUSDT, ZECUSDT, WLDUSDT, NEARUSDT, UNIUSDT, ONDOUSDT, 1000PEPEUSDT, BCHUSDT, FILUSDT, AAVEUSDT, SUIUSDT, TAOUSDT, AVAXUSDT, LINKUSDT, XRPUSDT, XLMUSDT, DOGEUSDT, SOLUSDT, LTCUSDT e ETHUSDT.

O **BTCUSDT** roda junto como referência (controle), com as mesmas regras.

Ficaram de fora, entre outros:
- **MANAUSDT:** volume mediano de US$ 3 mi por dia e spread de 4,7 bps;
- **ADAUSDT:** spread de 3,7 bps;
- **HYPEUSDT:** listada em 05/2025;
- moedas com volatilidade de 10% a 40% ao dia e volume mediano abaixo de US$ 15 mi (por exemplo AIN, BR e MUBARAK).

## Dados

- Binance USD-M, velas de 1 hora fechadas: negócios (`/fapi/v1/klines`) e mark (`/fapi/v1/markPriceKlines`), mais o funding liquidado (`/fapi/v1/fundingRate`).
- 5000 velas terminando na última hora fechada antes da execução (cerca de 208 dias), igual ao estudo do piloto atual.
- Cada dataset tem o hash SHA-256 registrado no relatório (mesma forma canônica dos estudos do servidor).

## Conjuntos de candidatos (já declarados, sem mudança)

- `SHORT_HORIZON_V1`: SMA 10/30, 20/60 e 5/20; rompimento de 30 velas; reversão à média de 30 velas.
- `MULTI_DAY_TREND_V1`: SMA 48/240 e 72/480; rompimento de 480 velas.
- `BREAKOUT_480_PROTECTED_V1`: rompimento de 480 velas com 24 h de pausa após cada operação e 72 h após 2 perdas seguidas.

Janelas: treino de 1500 velas e teste de 500, gerando 7 janelas fora da amostra que não se sobrepõem. Em cada janela o candidato é escolhido só pelo P&L do treino.

## Custos (mais conservadores que os do BTC)

- Taxa de 0,055% por lado (taker).
- Slippage de **2 bps** por lado, igual ao maior spread aceito no universo.
- 10% do capital por posição e alavancagem 1x; manutenção de 1% e taxa de liquidação de 0,5%; capital simulado de 10 000.
- Funding real de cada moeda.

## Critério de aprovação: MULTI_ASSET_SCREEN_V1

Uma combinação (moeda × conjunto) é aprovada só se cumprir **tudo**:

1. Pelo menos 3 janelas e 10 operações fechadas fora da amostra.
2. P&L fora da amostra positivo e conciliado com a soma das janelas.
3. Nenhuma liquidação simulada.
4. Drawdown de até 15% em cada janela.
5. Sharpe deflacionado de pelo menos 0,9, com o número de tentativas igual a **todas** as configurações testadas no estudo inteiro (moedas × candidatos). Testar muitas combinações aumenta a chance de achar algo bom por acaso, e esse desconto corrige isso.
6. CPCV: pelo menos 60% dos caminhos fora da amostra com Sharpe positivo.
7. PBO (probabilidade de sobreajuste) de até 0,5.

Também são registrados, sem servir de critério: retorno de comprar e segurar a moeda no mesmo período de teste, operações por semana e funding pago.

## Execução

- Executado **uma vez**, fora do servidor de produção (máquina local, só dados públicos), para não gastar o limite de API usado pelo piloto. Script: `scripts/estudos/multimoedas.ts`.
- O relatório (`docs/estudos/multimoedas-*.json` e `.md`) guarda o hash de cada dataset, as janelas, os candidatos escolhidos e todos os resultados, aprovados e reprovados.
- Uma moeda cujo histórico vier incompleto é registrada como falha de dados, sem substituição.

## Limitações declaradas antes

- **Sobreposição com o BTC:** os conjuntos foram desenhados olhando o BTC. Nas outras moedas eles nunca foram testados nem ajustados.
- **Seleção do universo:** a triagem usa liquidez e volatilidade dos últimos 90 dias, que se sobrepõem ao período testado. Isso escolhe moedas que *estavam* voláteis, não moedas que vão dar lucro.
- **Fidelidade:** o mark é amostrado por hora e o modelo de margem é simplificado. Não é paridade com a corretora.
- **Uma janela de mercado só:** 208 dias cobrem um único regime de mercado; um bom resultado pode não se repetir.

## O que acontece com o resultado

- **Reprovadas:** ficam registradas. A família não é repetida com outras janelas, custos ou parâmetros para forçar aprovação.
- **Aprovadas:** viram candidatas a um **piloto paper paralelo**, uma conta por combinação, com um protocolo próprio, declarado antes e aprovado pelo dono. Nada é ativado automaticamente, e o piloto atual (BTCUSDT, estudo d674cb32) segue com as regras dele até o fim.
