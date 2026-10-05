# Office v3: the reference layout

On 2026-10-04 the owner declared the concept image (`Imagem do ChatGPT 2 de out. de 2026, 22_35_01.png`) the binding reference for the whole office. v3 reproduces its layout and functions. Every value comes from a received source; the concept's illustrative numbers (ETH positions, $800 capital, invented names) are not copied.

## Mapping the concept to the page

| Concept region | v3 implementation | Source |
|---|---|---|
| Header: Capital Virtual Total (% and US$) | Fund plus every independent evaluation account; the tooltip says the evaluations are not fund equity | `/finance` |
| Header: PnL Diário | Change since the UTC-day baseline the risk engine already keeps (`dailyStartEquity`), now exposed as `daily` | `/finance` |
| Header: Agentes Ativos | Agents with a non-idle recorded state or a recorded message in the last hour | `/agents`, `/agent-messages` |
| Header: Operações Abertas, Modo | Open positions across accounts; PAPER TRADING | `/finance` |
| Header: sun, date/time, Mercado | Lighting toggle, live clock, "Aberto 24/7" only while the USD-M quote is fresh | browser clock, quote |
| Left rail (9 items) | Escritório, Agentes, Portfólio, **Operações** (new), Mercado, Estratégias (studies), **Memória** (new), Relatórios (pilot timeline and history), Config (lighting, notifications, display, access) | existing read panels plus new ones |
| Wall screens | BTC/USDT, BTC PERP and ETH/USDT (price, 24h change, 1h candles; clicking opens the live chart below); funding rate; open interest (24h change and hourly candles); 24h liquidations (longs/shorts); world map lighting the open sessions (Asia, Europe, US); BNB/SOL/XRP/DOGE/ADA/AVAX 24h change | `GET /market/panorama` (new) |
| Name plates and speech bubbles | Every character has a plate. Bubbles show the latest recorded message (≤ 2 h) or a cosmetic outing | `docs/OFFICE_LIFE.md` |
| Risk Desk checklist | Five live checks | `/finance` risk |
| Meeting Room screen | Last team briefing and next decision countdown | messages |
| Nova card (right) | Docked card for any clicked agent. Tabs: Status (capital, P&L, position, entry, mark, position P&L, risk % of account, leverage), Operações (recorded fills), Estratégias (pilot study and studied strategies), Memória. "Perfil completo" opens the full evidence profile | `/finance`, account ledger, `/agents/:id/profile` |
| War Room | Equity curve, open positions, drawdown | `/finance` samples |
| Análise de Mercado | Order book depth, footprint (1-min taker delta), 24h liquidations by hour, 24h volume profile | `/market/panorama` |
| Bottom: Atividades Recentes | Recorded events (decisions, fills, risk, funding, studies) and team messages, newest first, each opening its original | `/audit/events?compact=1`, messages |
| Bottom: Posições Abertas, Performance dos Agentes | Tables, the latter with win-rate bars | `/finance` |

## Market panorama (`src/infrastructure/binance-market-panorama.ts`)

**Sources:** public Binance data only. Three WebSockets:
- spot miniTicker for 8 symbols plus 1m and 1h klines for BTC and ETH;
- USD-M `btcusdt@kline_1m`, `btcusdt@kline_1h` and `!forceOrder@arr` on `/market`;
- `btcusdt@depth20@500ms` on `/public`.

REST is slow and sequential:
- every 30 min, in order: 48 1h klines for BTC, ETH and the BTC perpetual, and 90 1m klines for BTC, ETH and the perpetual (the 1m perpetual call also feeds the taker flow);
- open interest and 300 5-minute history points every 5 min (the full hours keep the hourly history used by the triggers; each hour becomes one open-interest candle);
- 96 15m klines for the volume profile every 15 min.

**Rate limits:** 418/429 responses honour Retry-After (at least 1 min, at most 1 h) for all panorama REST calls.

## Candles e gráfico ao vivo das moedas

Todas as tendências do telão e dos monitores das mesas são candles (verde sobe, vermelho cai): BTC/USDT, BTC PERP e ETH/USDT em velas de 1 hora e o open interest em velas de 1 hora montadas com os pontos de 5 minutos (abertura, máxima, mínima e fechamento observados naquela hora). A linha azul do traçado de sessão saiu do telão.

Clicar numa tela de moeda (BTC/USDT, BTC PERP ou ETH/USDT) abre a janela do gráfico ao vivo (`public/office/coin-chart.js`):
- candles de **1m** (90 velas) ou **1h** (48 velas), com volume, último preço, máxima e mínima de 24 h e, no spot, volume de 24 h;
- passar o mouse mostra abertura, máxima, mínima, fechamento e variação do candle;
- a janela lê `GET /market/chart?symbol=BTCUSDT|ETHUSDT|BTCPERP&interval=1m|1h` a cada 2 s, só enquanto está aberta. O servidor responde com o que já recebe dos streams públicos; nenhuma chamada nova à Binance é feita por clique;
- "Ao vivo" só aparece quando chegou dado nos últimos 90 s. Sem isso, a janela mostra "Sem dado novo" ou "Indisponível" e nunca inventa candles;
- no perpétuo, a variação, a máxima e a mínima de 24 h vêm das 24 últimas velas de 1 hora e só aparecem quando as 24 existem.

## Barra lateral: resumo visual

Cada painel da barra lateral abre com um resumo visual no topo (`public/office/panels.js`). São números grandes, gráficos e ícones; os textos explicativos ficam recolhidos em "ⓘ Como ler" e as tabelas longas em "Ver detalhes":

| Painel | Resumo |
|---|---|
| Equipe | anel de agentes trabalhando, salas ocupadas, mensagens por agente nas últimas 12 h |
| Portfólio | capital, P&L, posições abertas, pior drawdown, taxas e funding; equity do piloto em candles por hora com a linha do capital inicial; um card por conta (clique abre a auditoria) |
| Operações | fills, compras × vendas, volume, taxas, funding e linha do tempo de 7 dias |
| Mercado | BTC/USDT, BTC PERP e ETH/USDT com candles (clique abre o gráfico ao vivo), funding por corretora, open interest, liquidações, livro e mapa de calor das moedas |
| Estratégias | estudos, lucro × prejuízo, pesquisas aprovadas/rejeitadas/falhas e P&L histórico por estudo (clique abre o estudo) |
| Memória | agentes como filtros clicáveis e memórias por tipo |
| Relatórios | veredito do piloto, P&L, operações fechadas contra o mínimo, decisões long/short/fora e acerto das previsões |
| Config | semáforo do serviço (banco, mercado, exposição, autonomia, IA) e preferências em cards |

O resumo só usa o que a página já recebeu (contas, mensagens, panorama, registros, placar e diagnóstico). Sem dado, o bloco mostra um traço, nunca um número inventado.

**Use:** the panorama is screen context only (`scope: PUBLIC_MARKET_CONTEXT_ONLY`). It never feeds signals, risk or execution.

**Liquidations:** totals are observed lower bounds. Binance streams at most one liquidation per symbol per second, and coverage starts at the last restart. The screen shows "desde HH:MM" until 24 h are covered.

## Pilot timeline (`GET /paper/perpetual/pilot/timeline?days=7`)

It returns the pilot account's recorded decisions, fills, funding and stop events, plus hourly equity. The paper book now keeps the last equity of each hour for 8 days (`hourly`, an additive field; older snapshots simply lack it). Relatórios draws:
- the equity line against the initial capital;
- one colour band per hourly decision (long, short, flat);
- fill markers.

## Other requested improvements

- **Lighting by the real clock:** day 07–17, dusk 17–19 and 05–07, night otherwise. The art is a night scene; day and dusk tint the windows and the room. The sun button or Config overrides it, stored in the browser only.
- **Trade highlight and notifications:**
  - A new recorded fill highlights the agent for 20 s and shows a toast with the resulting position.
  - Pilot stops and risk rejections also show a toast.
  - Browser notifications are opt-in in Config and use the Notification permission.
- **Full screen:** the War Room and Análise de Mercado plates and screens open an enlarged view, with a link to the detailed panel.
- **Mobile (≤ 760 px):**
  - scrollable header metrics;
  - swipeable wall-screen carousel;
  - horizontally scrollable scene;
  - card and tables stacked;
  - bottom tab bar.
- **Lighter characters:** the eight directional sheets are delivered at half resolution: 18 MB down to 3.8 MB. They are still displayed at ≤ 122 px tall. Frame metadata stays in the audited source coordinates (`pixelScale: 0.5`).

## Art

No new pixel art was required. `office-reference-v2.png` was generated from this same concept. The concept's extra elements (wall screens, plates, bubbles, cards, tables) are DOM layers drawn over or around it, so they show live data instead of baked-in numbers.

## Second round (2026-10-05)

- **Pilot evaluation in Relatórios.** It shows the verdict under `PILOT_EVALUATION_V1`: "Em andamento" plus "se terminasse agora". It also shows decisions, closed trades against the minimum, costs, BTC over the period, same-exposure buy and hold, and the pre-declared next step. See docs/PILOT_EVALUATION_PROTOCOL.md.
- **Team hypotheses in Estratégias.** A selector runs any pre-declared set with the pilot study's request (5 000 h, 1 500 train, 500 test). Running a study remains an owner action. See docs/RESEARCH_PROTOCOL_TEAM_FILTERS.md.
- **"Replay do dia".** It replays the last 24 h of recorded messages and events, one moment every 9 s, with the original time on screen. Walks and bubbles come from the same records; nothing is written.
- **Daytime art.** `office-day.png` is generated from the night scene by `tools/dayart.ps1`: window glass becomes sky and skyline in daylight, and the room gets a mild warm lift. The day phase uses it; dusk and night keep the original.
- **More life, still truthful:**
  - Two idle agents sometimes take a break together in the lounge; the bubble names the place and the colleague, never a conversation.
  - Seated agents with a real non-idle status type at their desk; idle agents never do.
- **Portuguese view of recorded English texts.** `i18n.js` translates the display only (memories, briefing summaries). Records stay unchanged.
- **Installable app (PWA).**
  - `manifest.webmanifest`, `icon-192.png` and `icon-512.png`.
  - `sw.js` caches only static `/office/` files: code network-first, images cache-first. Account, market and event data always come from the network.
- **Smaller `app.js`.** Shared helpers moved to `core.js`, research, studies and preflight to `research.js`, and history and audit to `audit.js`. Load order is core → … → research → audit → app.
