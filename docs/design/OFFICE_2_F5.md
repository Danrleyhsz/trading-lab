# Escritório 2.0: fase F5 (Horizon e entrada)

## Horizon (zona `horizon`)

- **Lógica:** `public/office2/horizon.js`.
- **Fontes (GET):** `/market/panorama`, `/market/v3` e `/market/venues`, todas dados públicos que o servidor já coleta, mais a última observação gravada do Oracle (regime) e da Vega (volatilidade) em `/agent-messages`.

| Item | O que mostra | Classe |
|---|---|---|
| 8 moedas | preço e variação em 24 h, cada uma com o próprio frescor (até 2 min) | REAL / UNKNOWN |
| BTC perpétuo | mark, funding, spread; fresco só com a cotação a menos de 15 s | REAL / UNKNOWN |
| Regime e volatilidade | da última observação gravada do Oracle e da Vega | REAL |
| Open interest | USD e variação em 24 h | REAL |
| Fluxo agressor | compra, venda e saldo de 1 minuto da última hora | REAL |
| Liquidações | comprados e vendidos na janela coberta, com o aviso de que é piso observado | REAL |
| Outras corretoras | consenso, distância da Binance e diferença de funding, com o aviso "referência: não alimenta sinal, risco nem execução do piloto" | REAL |

- **O que não aparece:** métrica sem fonte, como "baleias" ou arbitragem.
- **Telas:** `horizon-a` mostra o BTC em 48 h (fechamento horário); `horizon-b` mostra a profundidade do book (compras em azul, vendas em âmbar).

## Entrada (zonas `hall-marca`, `recepcao`, `elevadores`)

Selo PAPER TRADING, equity e posição do piloto, e o aviso de que as contas de avaliação não fazem parte do fundo.

## Conferido na prévia local

Com os dados lidos da produção (só GET), alguns minutos antes da conferência:
- os preços apareceram como "sem dado fresco", como deveriam numa cópia velha;
- regime TRENDING_UP (+2,37% da média de 240 h) e volatilidade diária de 1,05% em 24 h contra 1,64% em 7 dias;
- open interest de 8,25 bi USD;
- Binance a 2,1 bps do consenso de 4 corretoras;
- as duas telas acesas.

Correção durante a conferência: a volatilidade saía com sinal "+", como se fosse variação.

## Testes

`test/office2-horizon.test.ts` (2):
- frescor por fonte, soma do fluxo, referência das outras corretoras e a última observação de cada pesquisador;
- fonte com escopo errado vira "sem dado";
- telas só com dado.

## Estado das fases

| Fase | Situação |
|---|---|
| F1 renderizador isométrico | na `main` (#87) |
| F2 Ring | PR #88 |
| F3 Stress Lab e Backtest | PR #89 (sobre #88) |
| F4 Nexus, Diagnóstico, Auditoria, Risk | PR #90 (sobre #89) |
| F5 Horizon e entrada | este PR (sobre #90) |
| F6 integração da arte | aguarda a arte do manifesto (`OFFICE_ASSET_REQUESTS.md`) |
| F7 desempenho no notebook, celular, segurança | depois da F6 |
| F8 troca do `/office` padrão | com aprovação |
