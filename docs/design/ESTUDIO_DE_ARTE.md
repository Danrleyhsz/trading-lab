# Estúdio de Arte TradingLab (pedidos para o Gemini)

Lista completa das **25 imagens** que faltam para o Escritório 2.0 (`/office2`) ficar parecido com a referência aprovada. Os pedidos foram reescritos depois do primeiro teste com o Gemini (06/10/2026) para fechar cada erro que apareceu: piso extra embaixo dos móveis, sombra pintada no fundo, objetos encostados, monitores a menos e parede espelhada. Cada imagem tem no máximo 7 itens.

## Como produzir

1. **Uma conversa nova por imagem**, com o modelo Pro de imagem. Na mesma conversa o Gemini mistura o pedido anterior com o novo.
2. **Anexe a referência aprovada**: [`docs/design/references/tradinglab-office-2-approved-reference.jpg`](references/tradinglab-office-2-approved-reference.jpg). Nos personagens, anexe também a folha atual do agente como segunda imagem: `public/office/characters/<nome>.png`.
3. **Cole o texto** do pedido (em inglês, porque o gerador segue melhor as regras assim).
4. **Confira a lista** do pedido antes de salvar. Se algo falhar, mande na mesma conversa a mensagem de correção certa (no fim deste documento).
5. **Salve** na resolução máxima, com o nome exato, em `C:\Users\Danrley\Downloads\office2-arte\`. JPEG ou PNG, tanto faz. O Gemini costuma entregar 1264 × 848; a integração ajusta a escala.

O fundo é **magenta liso `#FF00FF`**, removido por código (a Oracle usa blazer magenta e por isso tem **fundo verde `#00FF00`**). A posição exata de cada objeto não importa: a integração recorta um por um. Importam a ordem, a quantidade, o espaço vazio entre os objetos, nenhum piso, nenhuma sombra e telas sem conteúdo. Objeto espelhado é invertido por código. Nos personagens, só as direções para a direita são desenhadas; as da esquerda saem espelhadas por código.

Contrato técnico completo (tamanhos finais, recortes, pontos de apoio): [`OFFICE_ASSET_REQUESTS.md`](OFFICE_ASSET_REQUESTS.md).

## P0 · sem isto a cena não muda (7)

### Cidade à noite (fundo de tudo) · `TL-O2-SKYLINE-NOITE`

> A versão gerada em 06/10 já foi aprovada e está aplicada. Só refaça se quiser outra.

| Salvar como | Formato | Anexar |
|---|---|---|
| `skyline-noite.png` | 3:2 paisagem, opaco | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible), fully opaque.
A dense night city (Sao Paulo-like, no recognizable landmark) seen from the 30th floor, looking DOWN at about 30 degrees like the reference: rooftops and facades of skyscrapers with lit windows #ffcf6a, lit streets far below, bluish haze on the horizon, sky #0b1426 to #1a2a4a at the top.
ONE CONTINUOUS city across the WHOLE image, with the same density and lighting everywhere: NO dark band, NO darker rectangle, NO empty area, NO vertical seams (any darkening is done later by software).
NO office interior, NO window frame, NO foreground building, NO people, NO moon, NO sun, NO text.
```

**Confira antes de salvar:**

- [ ] Uma cidade contínua na imagem inteira, sem faixa escura no meio
- [ ] Sem prédio em primeiro plano, janela ou interior de escritório
- [ ] Sem lua, sol ou texto

### Ring: mesas de operação e telão · `TL-O2-PROPS-RING`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-ring.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 5 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 5 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Curved trading desk (no floor, no base slab): a long desk whose top is a gentle arc, concave side toward the viewer, about 5 tiles long and 1.5 tiles deep. Graphite #2a2f3a body, thin warm LED strip #ffd27a along the top edge. On the back edge stand EXACTLY FIVE (5) identical flat monitors side by side, all facing the viewer: count them, five. Two keyboards and two mice on the desktop. No chair.
2. Straight graphite desk (no floor, no base slab): about 3 tiles long and 1.5 tiles deep. On the back edge stand EXACTLY THREE (3) identical flat monitors facing the viewer. One keyboard, one mouse and one small mug on the desktop. No chair.
3. Wall screen: ONLY a free-standing piece of wall, a thin graphite wall panel about 4 tiles wide and 2.5 tiles tall, drawn in isometric so that its top edge slopes DOWN from upper-left to lower-right. A large blank navy screen with a thin graphite frame is mounted on it. The panel ends at its bottom edge: NO floor, NO skirting slab, NO shelf or step at its foot.
4. Black office chair seen from the FRONT, three-quarter view: seat cushion and armrests facing the viewer, five-spoke base with casters.
5. The same black office chair rotated 180 degrees, seen from the BACK: only the back side of the backrest is visible, the seat is hidden behind it, five-spoke base with casters.

Before finishing, check: exactly 5 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 5 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem
- [ ] Mesa curva com 5 monitores (conte)
- [ ] Mesa reta com 3 monitores e uma caneca
- [ ] Telão sem piso laranja embaixo
- [ ] Cadeira 5 de costas: só o encosto aparece, o assento fica escondido

### Reunião, recepção e convivência · `TL-O2-PROPS-SALAS-1`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-salas-1.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Long dark-wood meeting table (no floor, no base slab), about 5 tiles long and 2 tiles deep, four legs. NO chairs.
2. Curved light-grey reception desk (no floor, no base slab), about 4 tiles long and 2 tiles deep, warm LED strip #ffd27a under the counter, ONE monitor seen from behind (we see the back of the monitor, not the screen).
3. Beige three-seat sofa with three cushions, about 3 tiles long and 1 tile deep.
4. Beige armchair matching the sofa, 1 x 1 tile.

Before finishing, check: exactly 4 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 4 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem
- [ ] Mesa de reunião sem cadeiras
- [ ] Balcão da recepção com um monitor visto por trás

### Plantas e mesa de centro · `TL-O2-PROPS-SALAS-2`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-salas-2.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Long wooden planter box full of tropical plants, about 3 tiles long and 1 tile deep.
2. Tall plant (about 2 tiles tall) in a graphite pot, 1 x 1 tile footprint.
3. Low dark-wood coffee table, about 2 tiles long and 1 tile deep, nothing on it.
4. Small short plant in a small pot, 1 x 1 tile footprint, about half a tile tall.

Before finishing, check: exactly 4 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 4 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem
- [ ] Planta alta e planta baixa com tamanhos bem diferentes

### Stress Lab: treino e aparelho de teste · `TL-O2-PROPS-LAB-1`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-lab-1.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Graphite treadmill with a blank navy control panel, about 2 tiles long and 1 tile deep.
2. Dark red punching bag hanging from a black metal stand, 1 x 1 tile footprint, about 2 tiles tall.
3. Low dumbbell rack with six dumbbells, about 2 tiles long and 1 tile deep.
4. Compact test device: square graphite base, short graphite column and a round emitter disc on top. The emitter is OFF: dark grey, no glow. About 2 x 2 tiles footprint.

Before finishing, check: exactly 4 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 4 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem
- [ ] Aparelho de teste com o emissor apagado (sem brilho)

### Backtest, Risk e Auditoria: arquivo e servidor · `TL-O2-PROPS-LAB-2`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-lab-2.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 3 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 3 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Tall shelf with binders and archive boxes, plain spines with no letters, about 2 tiles long and 1 tile deep.
2. Row of FOUR tall graphite filing cabinets side by side, joined in one block, each with drawer handles, about 4 tiles long and 1 tile deep.
3. Tall black server rack with rows of tiny cyan #5fb6ff and amber #ffd27a LEDs, 1 x 1 tile footprint, about 2 tiles tall.

Before finishing, check: exactly 3 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 3 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem
- [ ] Lombadas das pastas lisas, sem letras
- [ ] Gaveteiro com 4 gavetas lado a lado

### Ícones dos 5 estágios do Anel de Decisão · `TL-O2-STAGE-ICONS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-estagios.png` | 3:2 paisagem, fundo magenta | nada |

```text
OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ICON SHEET with exactly 5 separate icons, in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the icon description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). Never use magenta, pink or purple inside the icons. No shadow on the background.

ICONS, left to right:
1. A clipboard with a zigzag arrow going up.
2. A shield with a small padlock in the middle.
3. A magnifying glass over a list of three ticked boxes.
4. A paper order ticket with a small gear in the corner.
5. A closed ledger book with a ribbon bookmark and a round stamp.
Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9. Draw lines instead of letters on any paper.

Before finishing, check: exactly 5 icons in the listed order, none touching; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Confira antes de salvar:**

- [ ] Exatamente 5 ícones, na ordem pedida, nenhum encostado
- [ ] Sem grade, moldura ou número desenhado
- [ ] Sem verde nem vermelho nos ícones
- [ ] Fundo magenta liso em toda a volta
- [ ] Papéis com linhas no lugar de letras

## Personagens isométricos · corrige os bugs de direção (8)

### Atlas · `TL-O2-CHAR-ATLAS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-atlas.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de atlas (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for ATLAS, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: man with tousled dark navy-black hair, warm tan skin, navy suit, pale-blue open-collar shirt, brown shoes, no glasses, no tie. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

### Euler · `TL-O2-CHAR-EULER`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-euler.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de euler (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for EULER, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: man with brown hair, orange cap, round dark glasses, orange jacket over a cream shirt, dark trousers, orange-and-white sneakers. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

### Flux · `TL-O2-CHAR-FLUX`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-flux.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de flux (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for FLUX, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: man with tousled blue hair, blue eyes, royal-blue hoodie with white cords, charcoal trousers, blue-and-white sneakers. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

### Nova · `TL-O2-CHAR-NOVA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-nova.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de nova (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for NOVA, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: woman with long wavy auburn-red hair, gold earrings, teal blazer over an ivory blouse, black trousers and black shoes. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

### Oracle (fundo verde: ela usa magenta) · `TL-O2-CHAR-ORACLE`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-oracle.png` | 3:2 paisagem, fundo VERDE, 2 linhas × 6 | referência aprovada (primeira) + folha atual de oracle (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for ORACLE, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: woman with long wavy purple hair, gold earrings, magenta blazer over an ivory blouse, black trousers and black shoes. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure green #00FF00 over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that green color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto
- [ ] Fundo verde liso (não magenta)

### Satoshi · `TL-O2-CHAR-SATOSHI`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-satoshi.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de satoshi (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for SATOSHI, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: man with tousled golden-blond hair, green eyes, orange hoodie with white cords, charcoal trousers, orange-and-white sneakers. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

### Sentinel · `TL-O2-CHAR-SENTINEL`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-sentinel.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de sentinel (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for SENTINEL, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: man with swept silver-white hair, blue eyes, navy suit, white shirt, blue tie and black shoes. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

### Vega · `TL-O2-CHAR-VEGA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `personagem-vega.png` | 3:2 paisagem, fundo magenta, 2 linhas × 6 | referência aprovada (primeira) + folha atual de vega (segunda) |

```text
Create a pixel-art CHARACTER SPRITE SHEET for VEGA, a character of an ISOMETRIC pixel-art trading office game.
Use the FIRST attached image only for art style and camera angle. Use the SECOND attached image only for identity: woman with a mint-green chin-length bob, gold hoop earrings, violet jacket over a black top, black trousers and black shoes. Keep that identity exactly (hair, clothes, colors).
Chibi proportions (head about one third of the body height), crisp pixel clusters, limited palette, 3-4 tone shading, thin dark outline.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF over the ENTIRE image. It is a chroma key that software will delete: no gradient, no texture, no light on it, never darken it, and no shadow under the feet. Never use that magenta color inside the character.

LAYOUT: exactly 12 full-body sprites of the same character in 2 rows of 6, evenly spaced, all the same size (about 70% of the row height). In each row the soles of all shoes sit on the same horizontal line. Sprites never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view, we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view, we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible.
Do NOT draw left-facing versions (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands on the lap. Do NOT draw a chair.

Same hair, clothes, colors, proportions and size in all 12 sprites. No shadow, no floor, no props, no furniture.
Before finishing, check: exactly 12 sprites in 2 rows of 6; row 1 shows the face turned right; row 2 hides the face, turned right; no chair; flat background everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 12 desenhos: 2 linhas de 6
- [ ] Linha de cima: rosto à mostra, virado para a direita
- [ ] Linha de baixo: de costas (rosto escondido), virado para a direita
- [ ] Coluna 6 sentado, sem cadeira desenhada
- [ ] Mesmo cabelo, roupa e tamanho nos 12
- [ ] Nenhuma sombra nos pés e nenhum texto

## P1 · completa as salas e os ícones (8)

### Cozinha e café · `TL-O2-PROPS-COPA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-copa.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 5 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 5 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Kitchen counter (no floor, no base slab) with an espresso machine and a microwave on top, warm LED strip #ffd27a under the counter, about 4 tiles long and 1 tile deep.
2. High wooden bar stool, 1 x 1 tile.
3. Tall graphite fridge with a dark glass door, 1 x 1 tile footprint, about 2 tiles tall.
4. Round dark café table, about 2 x 2 tiles, nothing on it.
5. Black café chair, 1 x 1 tile.

Before finishing, check: exactly 5 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 5 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem

### Elevadores e catraca · `TL-O2-PROPS-LOBBY`

| Salvar como | Formato | Anexar |
|---|---|---|
| `props-lobby.png` | 3:2 paisagem, fundo magenta | referência aprovada |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ASSET SHEET of 2 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES (these are the usual mistakes; do not make them):
1. NO floor, NO platform, NO base slab, NO rug, NO carpet, NO tiles under or around any object. The legs, feet or bottom edge of each object touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse, no dark or purple patch under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 2 objects listed below, each exactly once, left to right in the listed order (use a second row below only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text: do NOT write the list numbers, labels, letters, digits or logos anywhere.
6. Never use magenta, pink or purple inside the objects.
7. Every screen or monitor is a flat plain dark navy #0e2150 rectangle with a thin frame: NO content, NO charts, NO reflection, NO glow.
8. Same isometric angle, same orientation and same scale for all objects (one floor tile is about 64 px wide; a chair is about 1 tile).

OBJECTS, left to right:
1. Elevator wall: ONLY a free-standing piece of wall about 3 tiles wide and 2.5 tiles tall, drawn in isometric so that its top edge slopes DOWN from upper-left to lower-right, with two closed brushed-steel elevator doors and a vertical warm LED strip #ffd27a between them. NO floor, NO skirting slab at its foot.
2. Glass-and-steel turnstile gate, 1 x 1 tile.

Before finishing, check: exactly 2 separate objects, none touching; pure flat magenta everywhere else; no floor or base under anything; no shadow on the background; no text or numbers; every screen plain navy.
```

**Confira antes de salvar:**

- [ ] Exatamente 2 objetos, na ordem pedida, nenhum encostado no outro
- [ ] Nenhum piso, tapete ou base embaixo dos objetos
- [ ] Nenhuma sombra no fundo (nem mancha roxa ou escura)
- [ ] Fundo magenta liso em toda a volta
- [ ] Telas lisas azul-marinho, sem gráfico nem texto
- [ ] Nenhum número ou texto na imagem
- [ ] Parede dos elevadores sem piso embaixo

### Emblemas das zonas (1 de 2) · `TL-O2-ZONE-EMBLEMS-1`

| Salvar como | Formato | Anexar |
|---|---|---|
| `emblemas-zonas-1.png` | 3:2 paisagem, fundo magenta | nada |

```text
OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ICON SHEET with exactly 5 separate icons, in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the icon description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, still readable when shrunk to 32 x 32 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). Never use magenta, pink or purple inside the icons. No shadow on the background.

ICONS, left to right:
1. Bar chart with a line over it, inside a square frame.
2. Speech bubble with three dots.
3. A ring with five small marks around it.
4. Laboratory flask.
5. Shield.
Colors: ONLY cyan #5fb6ff and light blue-white #dbe9ff.

Before finishing, check: exactly 5 icons in the listed order, none touching; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Confira antes de salvar:**

- [ ] Exatamente 5 ícones, na ordem pedida, nenhum encostado
- [ ] Sem grade, moldura ou número desenhado
- [ ] Sem verde nem vermelho nos ícones
- [ ] Fundo magenta liso em toda a volta
- [ ] Só ciano e azul-claro

### Emblemas das zonas (2 de 2) · `TL-O2-ZONE-EMBLEMS-2`

| Salvar como | Formato | Anexar |
|---|---|---|
| `emblemas-zonas-2.png` | 3:2 paisagem, fundo magenta | nada |

```text
OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ICON SHEET with exactly 5 separate icons, in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the icon description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, still readable when shrunk to 32 x 32 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). Never use magenta, pink or purple inside the icons. No shadow on the background.

ICONS, left to right:
1. Ledger book.
2. Magnifying glass over a timeline.
3. Hourglass over a small grid.
4. Paper order ticket.
5. Three rising bars inside a stylized building, no text.
Colors: ONLY cyan #5fb6ff and light blue-white #dbe9ff.

Before finishing, check: exactly 5 icons in the listed order, none touching; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Confira antes de salvar:**

- [ ] Exatamente 5 ícones, na ordem pedida, nenhum encostado
- [ ] Sem grade, moldura ou número desenhado
- [ ] Sem verde nem vermelho nos ícones
- [ ] Fundo magenta liso em toda a volta
- [ ] Só ciano e azul-claro

### Ícones de estado sobre os agentes · `TL-O2-AGENT-STATE-ICONS`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-estado-agente.png` | 3:2 paisagem, fundo magenta | nada |

```text
OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ICON SHEET with exactly 6 separate icons, in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the icon description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, still readable when shrunk to 32 x 32 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). Never use magenta, pink or purple inside the icons. No shadow on the background.

ICONS, left to right:
1. Gear.
2. Hourglass.
3. Raised open hand.
4. Unplugged power plug with a loose cable.
5. Envelope.
6. Coffee cup with steam.
Each icon is a ROUND BADGE: a dark #0a1b33 circle with a light 1-pixel rim, with the symbol inside in cream #f2e6c9 with cyan #5fb6ff details.

Before finishing, check: exactly 6 icons in the listed order, none touching; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Confira antes de salvar:**

- [ ] Exatamente 6 ícones, na ordem pedida, nenhum encostado
- [ ] Sem grade, moldura ou número desenhado
- [ ] Sem verde nem vermelho nos ícones
- [ ] Fundo magenta liso em toda a volta
- [ ] Cada ícone dentro de um círculo escuro com borda clara

### Ícones dos cenários do Stress Lab (1 de 2) · `TL-O2-SCENARIO-ICONS-1`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-cenarios-1.png` | 3:2 paisagem, fundo magenta | nada |

```text
OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ICON SHEET with exactly 7 separate icons, in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the icon description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). Never use magenta, pink or purple inside the icons. No shadow on the background.

ICONS, left to right:
1. Steady flat line with a tick mark.
2. Lightning bolt over a candlestick.
3. Large zigzag wave.
4. Two vertical bars far apart with a double arrow between them.
5. Clock with a pause symbol.
6. Three candlesticks with a small clock.
7. Four candlesticks with a dashed empty gap in place of the third.
Candlesticks in cyan and cream only. Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9.

Before finishing, check: exactly 7 icons in the listed order, none touching; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Confira antes de salvar:**

- [ ] Exatamente 7 ícones, na ordem pedida, nenhum encostado
- [ ] Sem grade, moldura ou número desenhado
- [ ] Sem verde nem vermelho nos ícones
- [ ] Fundo magenta liso em toda a volta
- [ ] Velas só em ciano e creme

### Ícones dos cenários do Stress Lab (2 de 2) · `TL-O2-SCENARIO-ICONS-2`

| Salvar como | Formato | Anexar |
|---|---|---|
| `icones-cenarios-2.png` | 3:2 paisagem, fundo magenta | nada |

```text
OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a GAME ICON SHEET with exactly 7 separate icons, in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the icon description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). Never use magenta, pink or purple inside the icons. No shadow on the background.

ICONS, left to right:
1. Cloud with a broken cable.
2. Two towers with arrows pointing away from each other.
3. Down arrow hitting a floor barrier.
4. Lever switch in the OFF position.
5. Cracked sheet of paper.
6. Two cards swapping places with curved arrows.
7. Circular arrow around a power symbol.
Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9.

Before finishing, check: exactly 7 icons in the listed order, none touching; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Confira antes de salvar:**

- [ ] Exatamente 7 ícones, na ordem pedida, nenhum encostado
- [ ] Sem grade, moldura ou número desenhado
- [ ] Sem verde nem vermelho nos ícones
- [ ] Fundo magenta liso em toda a volta

### Bancada de teste animada (6 quadros) · `TL-O2-STRESS-RIG-ANIM`

| Salvar como | Formato | Anexar |
|---|---|---|
| `bancada-teste-anim.png` | 3:2 paisagem, fundo magenta | referência aprovada + props-lab-1.png (objeto 4) |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above), night, warm interior lighting. Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible).
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image. It is a chroma key that software will delete, so: no gradient, no vignette, no texture, no noise, no light on it, and never darken or tint it anywhere.
This is a 6-frame ANIMATION STRIP: exactly 6 frames in ONE horizontal row, evenly spaced, at least 60 px of pure magenta between frames. No grid lines, no frames drawn, no numbers, no text.
Every frame shows the SAME compact test device from the second attached image (square graphite base, short column, round emitter disc on top) with IDENTICAL size, position, angle and colors. NO floor, NO base slab, NO shadow.
Only the pulse changes:
frame 1: emitter with a faint cyan glow, no ring;
frame 2: a small thin cyan #5fb6ff ring just leaving the emitter;
frame 3: a medium ring;
frame 4: a large ring;
frame 5: the large ring, almost faded;
frame 6: exactly the same as frame 1.

Before finishing, check: exactly 6 frames; identical device in all of them; only the ring changes; pure flat magenta everywhere else; no text.
```

**Confira antes de salvar:**

- [ ] 6 quadros numa linha, aparelho idêntico em todos
- [ ] Só o anel ciano muda de tamanho
- [ ] Quadro 6 igual ao quadro 1
- [ ] Sem piso, sem sombra, fundo magenta liso

## P2 · variações da cidade (2)

### Cidade de dia · `TL-O2-SKYLINE-DIA`

| Salvar como | Formato | Anexar |
|---|---|---|
| `skyline-dia.png` | 3:2 paisagem, opaco | skyline-noite.png (para manter a composição) |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above). Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible), fully opaque.
EXACTLY the same city composition as the attached night image: same buildings in the same places, same camera, same framing, so the two images can be swapped without any jump. Only the time changes: daytime, light blue sky with a few clouds, windows unlit or reflecting the sky, natural daylight.
NO dark band, NO office interior, NO foreground building, NO text.
```

**Confira antes de salvar:**

- [ ] Mesmos prédios nos mesmos lugares da versão noturna
- [ ] Céu azul claro, sem faixa escura, sem texto

### Cidade ao entardecer · `TL-O2-SKYLINE-ENTARDECER`

| Salvar como | Formato | Anexar |
|---|---|---|
| `skyline-entardecer.png` | 3:2 paisagem, opaco | skyline-noite.png (para manter a composição) |

```text
High-quality pixel art in the exact style of the attached reference image: TradingLab office on the 30th floor, ISOMETRIC 2:1 view (camera about 30 degrees from above). Thin dark outlines, crisp pixel clusters, 3-4 tone shading. Palette: beige floor #d9cdb4, dark carpet #2b3140, wood #8b5a2c / #c07a3c, graphite #2a2f3a / #3a404c, warm LED #ffd27a, flat navy screens #0e2150, plants #2c8a48 / #62d07a.
Use the attached reference ONLY for style, palette and camera angle. Do NOT copy its floor, walls, rooms, layout or people.

OUTPUT: landscape image, 3:2 aspect ratio (1536 x 1024 if possible), fully opaque.
EXACTLY the same city composition as the attached night image: same buildings in the same places, same camera, same framing, so the images can be swapped without any jump. Only the time changes: sunset, orange and lilac sky, some windows starting to light up.
NO dark band, NO office interior, NO foreground building, NO text.
```

**Confira antes de salvar:**

- [ ] Mesmos prédios nos mesmos lugares da versão noturna
- [ ] Céu laranja e lilás, sem faixa escura, sem texto

## Mensagens de correção

Mande na mesma conversa quando a imagem vier com um destes problemas. Dá para juntar duas ou três numa mensagem só.

**Veio piso, tapete ou base embaixo**

```text
Redo the same image, identical in everything else, but REMOVE every floor, platform, base slab, rug or tile under the objects. The objects must stand directly on the flat magenta background.
```

**Veio sombra no fundo**

```text
Redo the same image, identical in everything else, but with NO shadow at all on the background: no dark or purple patch under any object. The background must be one flat pure magenta #FF00FF everywhere.
```

**Objetos encostados**

```text
Redo the same image, identical in everything else, but move the objects apart: at least 100 px of empty flat magenta between any two objects, and nothing touching the image edges.
```

**Quantidade errada**

```text
Redo the same image. Count carefully: there must be exactly the number of items listed, in the listed order. Check every count written in the request (for example the number of monitors on each desk).
```

**Veio texto ou número**

```text
Redo the same image, identical in everything else, but remove every text, number, letter and label. Nothing written anywhere.
```

**Fundo com degradê ou outra cor**

```text
Redo the same image, identical in everything else, but the background must be ONE solid flat pure magenta #FF00FF (or pure green #00FF00 for Oracle) over the entire image: no gradient, no vignette, no texture, no light.
```

**Tela com conteúdo**

```text
Redo the same image, identical in everything else, but every screen and monitor must be a flat plain dark navy #0e2150: no charts, no text, no reflection, no glow.
```

**Personagem: direção errada**

```text
Redo the same sheet. Top row: the character faces the bottom-right corner and we see the face. Bottom row: the character faces the top-right corner and we see the back of the head, never the face. No sprite faces left.
```

**Personagem mudou de visual**

```text
Redo the same sheet keeping the identity of the second attached image exactly in all 12 sprites: same hair, same clothes, same colors, same size.
```

