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

## Plano B do piloto: Bybit quando a Binance bloquear (05/10/2026)

Item 8a da pesquisa. Serve para o caso do HTTP 418 que já aconteceu: a Binance bloqueia o IP do servidor e o piloto
fica sem candles para decidir.

- `BybitPerpetualHistory`: candles de 1 h, candles de mark e funding públicos do BTCUSDT linear da Bybit.
  - O dataset sai com instrumento próprio, `BYBIT_LINEAR:BTCUSDT`, então nunca se confunde com dados da Binance na
    auditoria nem nos hashes de evidência.
  - A Bybit não informa o mark da liquidação de funding; usamos a abertura do candle de mark daquela hora.
- `ResilientPerpetualHistory`: tenta a Binance e, se ela falhar, usa a Bybit.
  - Só com `PERPETUAL_HISTORY_FALLBACK=bybit` no Render. Desligado por padrão, e não deve ser ligado no piloto em curso.
  - `GET /paper/perpetual/history-source` mostra se a reserva está ligada, quantas vezes foi usada e o último motivo.
- Só o ciclo do piloto usa a reserva. Os estudos continuam sempre só com a Binance.
- **Regra de segurança:** com dados de reserva o piloto pode fechar ou reduzir posição, mas nunca abre.
  - Quando o sinal mandaria abrir, o Sentinel grava "entrada adiada: sinal calculado com dados de reserva".
  - A decisão grava os candles usados, com o instrumento, para a auditoria e a paridade.

### Por que só fechar

Medido em 05/10/2026 com as últimas 1 000 horas:

- **Preço:** o fechamento de 1 h da Bybit difere do da Binance em 0,5 ponto-base na mediana (95% até 1,6; máximo 4,6).
- **Regra do piloto** (BREAKOUT 480): a mesma direção em 516 de 518 horas.
- **Onde diverge:** as 2 divergências (15/09 e 21/09, às 14:00 UTC) caíram justamente em horas de rompimento, que é
  quando a regra abre posição.

Para manter o piloto vivo e fechar posição numa queda da Binance, a reserva basta. Para abrir posição, a diferença
entre corretoras pode decidir o rompimento, então o piloto espera a Binance voltar.

Testes: `test/bybit-history.test.ts`:

- paginação, alinhamento de mark e funding e instrumento próprio;
- a reserva só entra quando ligada e quando a Binance falha;
- com dados de reserva o piloto fecha, mas não abre.
