# Dados públicos de outras corretoras (contexto, não sinal)

Item 4 da pesquisa de projetos abertos. Ideia do ccxt (dados unificados de várias corretoras) e da arbitragem de
funding do Hummingbot, com adaptadores próprios e pequenos para não aumentar a imagem do servidor.

## O que é lido

Arquivo: `src/infrastructure/cross-venue-market.ts`. Só APIs públicas, sem chave, sem conta, só leitura.

| Corretora | Dados | Observação |
|---|---|---|
| Binance USD-M | mark price e funding | vem do fluxo que o piloto já usa; aceito só se tiver até 15 s |
| Bybit | mark, funding, open interest | `v5/market/tickers` (linear BTCUSDT) |
| OKX | mark e funding | `public/funding-rate` e `public/mark-price` (BTC-USDT-SWAP) |
| Hyperliquid | mark, funding, open interest | funding é por hora e aparece multiplicado por 8 para comparar |

- Atualiza a cada 5 minutos. Cotação com mais de 15 minutos é descartada.
- HTTP 418, 429 ou 403 pausa aquela corretora pelo `retry-after` (mínimo 1 min, máximo 1 h).
- Falha em uma corretora não afeta as outras; o erro aparece na tabela.

## O que é calculado

`GET /market/venues` devolve, com `scope: PUBLIC_CROSS_VENUE_CONTEXT_ONLY`:

- `fundingSpread8h`: maior menos menor funding (8 h) entre as corretoras com dado válido.
- `fundingSpreadAnnualized`: o mesmo × 3 × 365. É teórico: sem custos, sem execução.
- `consensusMark`: mediana do mark das outras corretoras (sem a Binance).
- `binanceDivergenceBps`: distância do mark da Binance para esse consenso, em pontos-base.

## Onde aparece

- Painel Mercado: tabela por corretora (mark, funding 8 h, open interest, situação).
- Telão de funding na parede: linha "entre corretoras" com o spread.
- Gatilhos de mercado (`MARKET_TRIGGERS_V1`): duas métricas novas, com a mesma regra de percentil P5/P95,
  amostras a cada 15 min, mínimo de 24 h e espera de 6 h entre avisos:
  - spread de funding → Flux;
  - divergência da Binance → Sentinel, com cópia para Nova e Atlas.

## O que não muda

- Nunca alimenta sinal, risco ou execução. O piloto continua usando só a cotação USD-M da Binance e as regras
  pré-declaradas do estudo em curso.
- Nenhuma ordem, nenhuma chave, nenhuma conta em outra corretora.

Testes: `test/cross-venue-market.test.ts` (conversão do funding horário, consenso, divergência e pausa após 429).
