# Protocolo pré-declarado: DCA_BTC_ETH_AO_VIVO_V1 (compra mensal, execução simulada)

Declarado em 23/10/2026, **antes** da primeira rodada. As regras abaixo são fixas; qualquer mudança vira uma emenda declarada antes da rodada seguinte.

**Só simula.** Não envia ordens, não usa contas nem chaves, só lê dados públicos da Binance. Não toca no paper trading de perpétuos, no piloto, no escritório nem no servidor, e não exige deploy. Cada linha do livro-razão é uma simulação de acompanhamento (`FORWARD_PAPER_TRACKING_ONLY`). Não é recomendação de investimento.

## Por que existe

Um backtest de 23/10/2026 (velas diárias da Binance à vista, fev/2019 a out/2026, 15 bps por lado) mostrou que comprar todo mês ficou em primeiro ou perto do primeiro em BTC e ETH, e que pausar as compras abaixo da média de 200 dias não melhorou o resultado de forma consistente. Esta execução simulada acompanha as duas versões ao vivo, ao lado da tendência já em `PROTOCOLO_TENDENCIA_AO_VIVO.md`, medindo o preço real de compra contra o livro de ofertas.

**Não é um teste de retorno.** Meses de simulação não dizem nada sobre o retorno de anos.

## Regra

- **Moedas:** BTCUSDT e ETHUSDT, à vista. Sem venda, sem alavancagem.
- **Aporte:** 100 USDT virtuais por mês calendário UTC por conta, 50 USDT para cada moeda. O aporte entra na primeira rodada de cada mês; um mês sem nenhuma rodada perde o aporte e fica registrado.
- **Contas simuladas (independentes):**
  - `DCA_SIMPLES`: compra todo o caixa de cada moeda na rodada em que ele existir.
  - `DCA_PAUSA_SMA200`: compra o caixa de uma moeda só se o último fechamento diário fechado estiver acima da média dos 200 fechamentos diários fechados; senão guarda o caixa daquela moeda e compra tudo na primeira rodada em que voltar acima.
- **Execução:** uma rodada por dia, depois do fechamento diário UTC, a mercado contra o livro público (100 níveis), taxa de 0,10%. Compra abaixo de 10 USDT não é enviada (`MIN_NOTIONAL`) e o caixa fica guardado. Quantidades fracionárias.
- **Marcação:** a preço médio do livro na hora da rodada.

## Registro

Livro-razão `docs/estudos/dca-ao-vivo-registro.json`, só de acréscimo, cada rodada com o hash da anterior (a mesma cadeia da tendência ao vivo). Resumo regerado em `docs/estudos/dca-ao-vivo.md`. Ambos ficam no branch de dados `dados/dca-ao-vivo`, nunca na main.

## Leitura

Valor da carteira contra total aportado, por conta, e custo medido por ordem (taxa, slippage do livro e diferença contra o fechamento do dia). Sem veredito de retorno antes de anos de dados.
