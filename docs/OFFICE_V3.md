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
| Wall screens | BTC/USDT and ETH/USDT (price, 24h change, 1h candles); funding rate; open interest (24h change and curve); 24h liquidations (longs/shorts); world map lighting the open sessions (Asia, Europe, US); BNB/SOL/XRP/DOGE/ADA/AVAX 24h change | `GET /market/panorama` (new) |
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
- spot miniTicker for 8 symbols plus 1h klines for BTC and ETH;
- USD-M `btcusdt@kline_1m` and `!forceOrder@arr` on `/market`;
- `btcusdt@depth20@500ms` on `/public`.

REST is slow and sequential:
- 48 1h klines per coin every 30 min;
- 60 1m klines once at start;
- open interest and its 24h history every 5 min;
- 96 15m klines for the volume profile every 15 min.

**Rate limits:** 418/429 responses honour Retry-After (at least 1 min, at most 1 h) for all panorama REST calls.

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
