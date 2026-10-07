# Estúdio de Arte TradingLab (pedidos para o Gemini)

Lista completa das **21 imagens** que faltam para o Escritório 2.0 (`/office2`) ficar parecido com a referência aprovada. Os pedidos foram escritos para o **Gemini** e também funcionam no ChatGPT. Cada um traz o texto para gerar (em inglês, porque o gerador segue melhor as regras assim), o nome exato do arquivo e o que anexar.

## Como produzir

1. **Anexe a referência aprovada** em todo pedido: [`docs/design/references/tradinglab-office-2-approved-reference.jpg`](references/tradinglab-office-2-approved-reference.jpg).
2. **Nos personagens, anexe também a folha atual** do agente: `public/office/characters/<nome>.png` (identidade: cabelo, roupa e cores).
3. **Peça a proporção 3:2 (paisagem)**, de preferência 1536 × 1024. Se vier outro tamanho, tudo bem: a integração ajusta a escala.
4. **Fundo:** o Gemini não faz fundo transparente. Por isso os pedidos usam **fundo magenta liso `#FF00FF`**, que a integração remove por código. A exceção é a **Oracle**, que usa blazer magenta: o pedido dela usa **fundo verde puro `#00FF00`**. A cidade (skyline) é opaca, sem fundo para remover.
5. **Salve com o nome exato** indicado em cada pedido.
6. A posição e o tamanho exatos dos objetos **não precisam ser perfeitos**: a integração recorta cada objeto automaticamente. Importam:
   - a ordem;
   - o espaço vazio entre os objetos;
   - o fundo uniforme;
   - nenhuma tela com conteúdo.
7. Se o fundo vier com degradê, sombra ou outra cor, gere de novo pedindo "solid flat pure magenta #FF00FF background".

Contrato técnico completo (tamanhos finais, recortes, pontos de apoio): [`OFFICE_ASSET_REQUESTS.md`](OFFICE_ASSET_REQUESTS.md).

## P0 · sem isto a cena não muda (5)

### Cidade à noite (fundo de tudo) · `TL-O2-SKYLINE-NOITE`

| Salvar como | Formato | Anexar |
|---|---|---|
| `skyline-noite.png` | 3:2 paisagem, opaco | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px), opaque. A dense night city (Sao Paulo-like, no recognizable landmark) seen from the 30th floor, looking DOWN at about 30 degrees like the reference: rooftops and facades of skyscrapers with lit windows #ffcf6a, lit streets far below, bluish haze on the horizon, sky #0b1426 to #1a2a4a at the top. Strong detail on the LEFT, RIGHT and BOTTOM edges; the center (x 300-1236, y 230-880) will be covered by the office building, so keep it simple and darker there. No moon, no sun, no bright object in the center. No text.
```

### Ring: mesas de operação e telão · `TL-O2-PROPS-RING`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-ring.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. No floor, no ground shadow, no scenery around the objects. Every monitor or screen must be a flat plain dark navy #0e2150 with NO content. Same isometric 2:1 angle and same scale for every object: a standing person would be 90 px tall. Arrange the objects left to right, in the listed order, in one or two rows, with at least 48 px of empty transparent space between objects. Each object complete and not cut off.

Objects, in order:
1. Curved trading desk arcing toward the viewer (about 5 x 3 floor tiles), graphite top with warm LED edge, FIVE flat blank monitors on the back edge facing the viewer, keyboards.
2. Straight graphite desk (about 3 x 2 tiles) with THREE flat blank monitors on the back edge facing the viewer, keyboard and a mug.
3. Wall-mounted large screen with thin graphite frame, blank navy screen, drawn on an isometric wall plane that goes down to the right (about 4 tiles wide).
4. Black office chair seen from the front (seat facing the viewer).
5. The same black office chair seen from the back.
```

### Reunião, recepção, convivência e plantas · `TL-O2-PROPS-SALAS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-salas.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. No floor, no ground shadow, no scenery around the objects. Every monitor or screen must be a flat plain dark navy #0e2150 with NO content. Same isometric 2:1 angle and same scale for every object: a standing person would be 90 px tall. Arrange the objects left to right, in the listed order, in one or two rows, with at least 48 px of empty transparent space between objects. Each object complete and not cut off.

Objects, in order:
1. Long dark-wood meeting table (about 5 x 2 tiles), no chairs.
2. Curved light-grey reception desk (about 4 x 2 tiles) with warm LED under the counter and one monitor seen from behind.
3. Beige three-seat sofa with cushions (about 3 x 1 tiles).
4. Long wooden planter full of tropical plants (about 3 x 1 tiles).
5. Beige armchair (1 x 1 tile).
6. Tall plant in a graphite pot (1 x 1 tile, tall).
7. Low dark-wood coffee table (about 2 x 1 tiles).
8. Small plant in a pot (1 x 1 tile, short).
```

### Stress Lab, Backtest, Risk e Auditoria · `TL-O2-PROPS-LAB`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-lab.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. No floor, no ground shadow, no scenery around the objects. Every monitor or screen must be a flat plain dark navy #0e2150 with NO content. Same isometric 2:1 angle and same scale for every object: a standing person would be 90 px tall. Arrange the objects left to right, in the listed order, in one or two rows, with at least 48 px of empty transparent space between objects. Each object complete and not cut off.

Objects, in order:
1. Graphite treadmill with a blank panel (about 2 x 1 tiles).
2. Dark red punching bag hanging from a stand (1 x 1 tile, tall).
3. Dumbbell rack with dumbbells (about 2 x 1 tiles).
4. Compact test device: graphite base, short column and a round emitter on top, emitter OFF (about 2 x 2 tiles).
5. Shelf with binders and archive boxes, plain spines (about 2 x 1 tiles, tall).
6. Row of four graphite filing cabinets with handles (about 4 x 1 tiles, tall).
7. Server rack with small LEDs (1 x 1 tile, tall).
```

### Ícones dos 5 estágios do Anel de Decisão · `TL-O2-STAGE-ICONS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-estagios.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | nada |

```text
Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px) divided into an invisible grid of 6 columns x 4 rows of equal square cells (do NOT draw grid lines). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. One icon per cell, centered, using only the cells listed; all other cells stay empty. Chunky pixel art with big clean pixels, so each icon can be scaled down to 64 x 64 px without blur. Keep generous empty space around every icon. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (those colors are reserved for status).

Use row 1, cells 1 to 5, in this order:
1. A clipboard with a zigzag arrow going up.
2. A shield with a small padlock.
3. A magnifying glass over a list of three ticked boxes.
4. A paper order ticket with a small gear in the corner.
5. A closed ledger book with a ribbon bookmark and a stamp.
Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9. Lines instead of letters on any paper.
```

## Personagens isométricos · corrige os bugs de direção (8)

### Atlas · `TL-O2-CHAR-ATLAS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-atlas.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de atlas |

```text
Create an ORIGINAL pixel-art character sprite sheet for ATLAS, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: tousled dark navy-black hair, warm tan skin, navy suit, pale-blue open-collar shirt, brown shoes, no glasses, no tie. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Euler · `TL-O2-CHAR-EULER`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-euler.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de euler |

```text
Create an ORIGINAL pixel-art character sprite sheet for EULER, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: brown hair, orange cap, round dark glasses, orange jacket over cream shirt, dark trousers, orange-and-white sneakers. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Flux · `TL-O2-CHAR-FLUX`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-flux.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de flux |

```text
Create an ORIGINAL pixel-art character sprite sheet for FLUX, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: man with tousled blue hair, blue eyes, royal-blue hoodie with white cords, charcoal trousers, blue-and-white sneakers. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Nova · `TL-O2-CHAR-NOVA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-nova.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de nova |

```text
Create an ORIGINAL pixel-art character sprite sheet for NOVA, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: woman with long wavy auburn-red hair, gold earrings, teal blazer over ivory blouse, black trousers and black shoes. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Oracle (fundo verde: ela usa magenta) · `TL-O2-CHAR-ORACLE`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-oracle.png` | 3:2 paisagem, fundo VERDE, grade 6 × 4 | referência aprovada + folha atual de oracle |

```text
Create an ORIGINAL pixel-art character sprite sheet for ORACLE, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: woman with long wavy purple hair, gold earrings, magenta blazer over ivory blouse, black trousers and black shoes. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE GREEN background #00FF00 filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use that bright green inside the character. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Satoshi · `TL-O2-CHAR-SATOSHI`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-satoshi.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de satoshi |

```text
Create an ORIGINAL pixel-art character sprite sheet for SATOSHI, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: man with tousled golden-blond hair, green eyes, orange hoodie with white cords, charcoal trousers, orange-and-white sneakers. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Sentinel · `TL-O2-CHAR-SENTINEL`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-sentinel.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de sentinel |

```text
Create an ORIGINAL pixel-art character sprite sheet for SENTINEL, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: man with swept silver-white hair, blue eyes, navy suit, white shirt, blue tie and black shoes. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

### Vega · `TL-O2-CHAR-VEGA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-vega.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + folha atual de vega |

```text
Create an ORIGINAL pixel-art character sprite sheet for VEGA, a character of an ISOMETRIC pixel-art trading office game (same style as the first attached image). Keep the identity of the second attached image exactly: woman with mint-green chin-length bob hair, gold hoop earrings, violet jacket over black top, black trousers and black shoes. Chibi proportions, crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Arrange the sprites in an invisible grid of 6 columns x 4 rows of equal cells (do NOT draw grid lines, no labels, no text). Every cell contains ONE full-body sprite of the same character at the same scale (about 70% of the cell height), horizontally centered in its cell, with the soles of the shoes on the same baseline near the bottom of the cell, never touching the cell border.

ROWS are the four ISOMETRIC DIAGONAL directions (camera from above at about 30 degrees):
row 1 = facing DOWN-RIGHT (front three-quarter view, face visible, walking toward the bottom-right),
row 2 = facing DOWN-LEFT (front three-quarter view, face visible, walking toward the bottom-left),
row 3 = facing UP-RIGHT (back three-quarter view, back of the head visible, walking toward the top-right),
row 4 = facing UP-LEFT (back three-quarter view, back of the head visible, walking toward the top-left).
COLUMNS in every row: 1 standing idle; 2 walk left-foot contact; 3 walk passing; 4 walk right-foot contact; 5 walk passing opposite; 6 seated pose with knees bent and hips lowered, NO chair drawn.

All 24 frames: identical hair, clothes, colors and size; natural alternating arms and legs; grounded shoes. Do not mirror or rotate the same pose to fake another direction. No shadow, no props, no furniture, no background.
```

## P1 · completa as salas e os ícones (6)

### Cozinha e café · `TL-O2-PROPS-COPA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-copa.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. No floor, no ground shadow, no scenery around the objects. Every monitor or screen must be a flat plain dark navy #0e2150 with NO content. Same isometric 2:1 angle and same scale for every object: a standing person would be 90 px tall. Arrange the objects left to right, in the listed order, in one or two rows, with at least 48 px of empty transparent space between objects. Each object complete and not cut off.

Objects, in order:
1. Kitchen counter with espresso machine and microwave, warm LED under the counter (about 4 x 1 tiles).
2. High wooden bar stool (1 x 1 tile).
3. Graphite fridge with dark glass door (1 x 1 tile, tall).
4. Round dark café table (about 2 x 2 tiles).
5. Black café chair (1 x 1 tile).
```

### Elevadores e catraca · `TL-O2-PROPS-LOBBY`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-lobby.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. No floor, no ground shadow, no scenery around the objects. Every monitor or screen must be a flat plain dark navy #0e2150 with NO content. Same isometric 2:1 angle and same scale for every object: a standing person would be 90 px tall. Arrange the objects left to right, in the listed order, in one or two rows, with at least 48 px of empty transparent space between objects. Each object complete and not cut off.

Objects, in order:
1. Two brushed-steel elevator doors with a vertical warm LED strip between them, drawn on an isometric wall plane that goes down to the right (about 3 tiles wide).
2. Glass-and-steel turnstile (1 x 1 tile).
```

### Emblemas das placas das zonas · `TL-O2-ZONE-EMBLEMS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `emblemas-zonas.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | nada |

```text
Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px) divided into an invisible grid of 6 columns x 4 rows of equal square cells (do NOT draw grid lines). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. One icon per cell, centered, using only the cells listed; all other cells stay empty. Chunky pixel art with big clean pixels, so each icon can be scaled down to 32 x 32 px without blur. Keep generous empty space around every icon. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (those colors are reserved for status).

Use row 1 cells 1-6 and row 2 cells 1-4, in this order:
1. Bar chart with a line, in a frame. 2. Speech bubble with three dots. 3. A ring with five marks. 4. Laboratory flask. 5. Shield. 6. Ledger book. 7. Magnifying glass over a timeline. 8. Hourglass over a grid. 9. Paper order ticket. 10. Three rising bars inside a stylized building (no text).
Colors: cyan #5fb6ff and light blue-white #dbe9ff only.
```

### Ícones de estado sobre os agentes · `TL-O2-AGENT-STATE-ICONS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-estado-agente.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | nada |

```text
Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px) divided into an invisible grid of 6 columns x 4 rows of equal square cells (do NOT draw grid lines). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. One icon per cell, centered, using only the cells listed; all other cells stay empty. Chunky pixel art with big clean pixels, so each icon can be scaled down to 32 x 32 px without blur. Keep generous empty space around every icon. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (those colors are reserved for status).

Use row 1, cells 1 to 6. Each icon is a ROUND BADGE (dark #0a1b33 circle with a light 1-pixel rim) with a symbol inside, in cream #f2e6c9 with cyan #5fb6ff details:
1. Gear. 2. Hourglass. 3. Raised open hand. 4. Unplugged power plug with a loose cable. 5. Envelope. 6. Coffee cup with steam.
```

### Ícones dos 14 cenários do Stress Lab · `TL-O2-SCENARIO-ICONS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-cenarios.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | nada |

```text
Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px) divided into an invisible grid of 6 columns x 4 rows of equal square cells (do NOT draw grid lines). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. One icon per cell, centered, using only the cells listed; all other cells stay empty. Chunky pixel art with big clean pixels, so each icon can be scaled down to 64 x 64 px without blur. Keep generous empty space around every icon. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (those colors are reserved for status).

Use row 1 cells 1-6, row 2 cells 1-6 and row 3 cells 1-2, in this order:
1. Steady flat line with a tick. 2. Lightning bolt over a candlestick. 3. Large-amplitude zigzag wave. 4. Two vertical bars far apart with a double arrow. 5. Clock with a pause symbol. 6. Three candlesticks with a small clock. 7. Four candlesticks with a dashed gap in place of the third. 8. Cloud with a broken cable. 9. Two towers with diverging arrows. 10. Down arrow hitting a floor barrier. 11. Lever switch in the OFF position. 12. Cracked sheet of paper. 13. Two cards swapping places with arrows. 14. Circular arrow around a power symbol.
Candlesticks in cyan and cream only. Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9.
```

### Bancada de teste animada (6 quadros) · `TL-O2-STRESS-RIG-ANIM`

| Salvar como | Formato | Anexar |
|---|---|---|
| `bancada-teste-anim.png` | 3:2 paisagem, fundo magenta, grade 6 × 4 | referência aprovada + props-lab.png (objeto 4) |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view, night, warm interior lighting). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px). Solid flat PURE MAGENTA background #FF00FF filling the whole image (chroma key for later removal): no gradient, no texture, no shadow on it, and never use magenta or pink inside the objects. Invisible grid of 6 columns x 4 rows of equal cells (no grid lines). Use row 1, cells 1 to 6, as six animation frames of the SAME compact test device from the attached props sheet (graphite base, short column, round emitter on top), drawn in the SAME position and size in every frame, centered in its cell with the base on the same baseline. Only the pulse changes: frame 1 emitter faint glow; frame 2 small cyan #5fb6ff ring pulse leaving the emitter; frame 3 medium ring; frame 4 large ring; frame 5 large ring almost transparent; frame 6 identical to frame 1. No shadow, no floor, no other objects.
```

## P2 · variações da cidade (2)

### Cidade de dia · `TL-O2-SKYLINE-DIA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `skyline-dia.png` | 3:2 paisagem, opaco | skyline-noite.png (para manter a composição) |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px), opaque. EXACTLY the same city composition as the attached night image (same buildings in the same places), but at daytime: light blue sky with a few clouds, windows unlit or reflecting the sky, natural daylight. Same camera, same framing, so the two images can be swapped without any jump. No text.
```

### Cidade ao entardecer · `TL-O2-SKYLINE-ENTARDECER`

| Salvar como | Formato | Anexar |
|---|---|---|
| `skyline-entardecer.png` | 3:2 paisagem, opaco | skyline-noite.png (para manter a composição) |

```text
High-quality pixel art in the exact style of the attached reference image (TradingLab office on the 30th floor, ISOMETRIC 2:1 top-down view). Thin dark outlines, 3-4 tone shading, reference palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite panels #2a2f3a / #3a404c, warm LED strips #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a. No text, no letters, no numbers, no logos, no watermark, no people.

Landscape image in 3:2 aspect ratio (ideally 1536 x 1024 px), opaque. EXACTLY the same city composition as the attached night image (same buildings in the same places), at sunset: orange and lilac sky, some windows starting to light up. Same camera, same framing, so the images can be swapped without any jump. No text.
```

