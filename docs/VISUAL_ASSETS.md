# Pixel Office assets and visual verification

Mode: built-in ImageGen; no external image API, account or private key. Originals are retained in the generator output directory.

## Production assets

- public/office/office-scene.png: six-room, top-down pixel-art office background (1536 × 1024), derived from the user-approved visual reference.
- public/office/agent-sprites.png: transparent 4 × 2 character atlas, ordered Atlas/Euler/Nova/Sentinel, then Satoshi/Flux/Vega/Oracle.
- Raster art is decoration only. Quotes, charts, status labels, people placement, profiles, positions and financial figures are separate HTML/JS projections of real backend state. No reference-image financial figures or invented activity were imported.
- The atlas contains one neutral pose per agent. The living-office increment permits cosmetic idle breathing and short local floor-lane movement, without asserting work or changing actual room/status. Real room changes use an arrival fade; full directional frames and collision-aware paths remain future work. Pause and reduced motion are respected.

## Scene art direction

Use the supplied trading-office reference as STYLE AND ARCHITECTURE inspiration. Produce a detailed production pixel-art office background, not a dashboard mockup. No people, words, labels, numbers, charts or financial figures. Six rooms in a two-row, three-column floor plan: Research Lab upper left, Trading Floor upper middle, Risk Desk upper right, Quant Lab lower left, Lounge lower middle, Meeting Room lower right. Night city windows, warm wood floors, navy walls, cyan and amber lighting, desks and blank dark monitors, books, plants, server racks, coffee facilities, couches and conference table. Keep clear floor areas for interactive character overlays. Landscape 3:2.

The displayed application implements all labels, overlays, data and interactions separately.

## Final character prompt

Create a production sprite atlas for the pixel art trading-office game represented by reference image 1. TRANSPARENT BACKGROUND, no scenery, no text or numbers. Eight distinct charming pixel art chibi adult office agents, full body, standing neutral idle poses, three-quarter front view. Crisp handcrafted pixel-art shapes, coherent scale and lighting, high detail at game sprite scale, dark outline. Strict evenly spaced GRID 4 columns by 2 rows; each sprite centered in its own equal rectangular cell, generous empty padding, no sprite crosses a cell boundary. ALL eight agents the SAME SIZE, feet on the same baseline within their cell. Top row LEFT TO RIGHT: 1 Atlas, black hair, navy blazer, pale blue shirt; 2 Euler, orange cap, amber cardigan, glasses; 3 Nova, long auburn/red hair, teal jacket; 4 Sentinel, short silver hair, dark navy suit. Bottom row LEFT TO RIGHT: 5 Satoshi, blond hair, orange hoodie; 6 Flux, dark blue hair, royal blue hoodie; 7 Vega, mint green bob haircut, violet jacket; 8 Oracle, purple hair, magenta cardigan. Faces friendly but composed. No floating icons, labels, devices, speech bubbles, shadows outside each sprite, financial numbers, or action claims. Render as a clean 4x2 RGBA transparent game sprite sheet. Landscape aspect ratio 2:1. Preserve reference pixel-art aesthetic and warm/cool palette.

Reference for this prompt: the generated office scene.

## Browser review

Desktop full-page capture and mobile 390px review completed against an isolated development preview with real public market quotes. All agents were genuinely idle, no evaluations configured, no trades or research results manufactured for visual review. The virtual fund had its configured development endowment, not the reference image's figures.

Desktop agent click displayed actual role, room, transition count and empty preserved history/memories. Mobile roster reached all eight agents without requiring a tiny map click. Browser viewport was restored afterwards. The preview is development verification only; the intended runtime remains cloud-only.

## Known visual scope

The six-room scene follows the reference aesthetic, rather than copying its extra market-analysis rooms or unsupported ETH/order-book panels. There is no claim of live exchange-tier liquidation parity, agent AI integration or production deployment from the artwork.

Validation: typecheck, build and 69-test suite completed; 68 passed locally and the PostgreSQL integration case requires the CI PostgreSQL service. JavaScript syntax and binary asset routes passed. Desktop and mobile browser review completed.

## Living-office visual scope, 2026-10-03
The approved scene/atlas are retained. Character elements survive refresh; all six room entrances open actual occupants and existing functions. Meeting Room displays original messages/participants. CSS idle/walk/task effects use the existing neutral atlas; they are not a new multi-frame sprite pack. Paths remain authored short front-floor lanes within the received actual room. No collision map, wall-crossing route or fictitious coffee/conversation/work event is claimed. Review OPEN_SOURCE_RESEARCH.md for licensing and LIVING_OFFICE_DESIGN.md for the next movement/interaction increment.
## Room-local navigation and furniture, 2026-10-03
The same scene/atlas now support authored foot masks and longer collision-aware local routes. Character footprints/peer routes are reserved conservatively; no sprite-pixel/physics or global cross-room guarantee is claimed. Six small accessible object markers open actual product views and have room-dialog alternatives. Object hit areas take priority over overlapping sprites; the market terminal is positioned away from initial characters. No imported/re-generated artwork or multi-frame directional atlas was added. See OFFICE_NAVIGATION.md.