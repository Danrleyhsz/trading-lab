# Pacote de arte do Escritório 2.0 para o ChatGPT (e instruções para o Codex)

Objetivo: refazer **todas as 31 imagens** do escritório no ChatGPT para a cena ficar o mais parecida possível com a referência aprovada, e deixar o Codex integrar tudo sem erro.

- **Parte 1** — para você: como gerar e salvar cada imagem, com o texto completo de cada pedido.
- **Parte 2** — para o Codex: onde estão os arquivos, o que fazer, em que ordem, e como conferir.

Referência aprovada (anexe em TODO pedido): `docs/design/references/tradinglab-office-2-approved-reference.jpg`
(cópia no seu PC: `C:\Users\Danrley\Downloads\office2-arte\referencias\referencia-aprovada.jpg`).

> Limites que continuam valendo (regras do projeto): nenhuma tela com gráfico ou número inventado (telas sem dado ficam escuras ou só "ligadas"); nada de pessoas extras de enfeite trabalhando; sem "nível de usuário" inventado. A arte é decoração; dado só vem do sistema.

---

## Parte 1 · Como gerar no ChatGPT

1. **Uma conversa nova por imagem** (na mesma conversa o ChatGPT mistura pedidos).
2. **Anexe a referência aprovada** em todos. Nos personagens, anexe **também** a folha atual do agente como **segunda** imagem: `public/office/characters/<nome>.png` (no repositório) — você também acha cópias em `Downloads\office2-arte\referencias\personagem-atual-<nome>.png`.
3. **Cole o texto do pedido** inteiro (está em inglês porque o gerador segue melhor as regras assim).
4. **Peça 1536 × 1024 (paisagem)** — nas texturas, **1024 × 1024 (quadrado)**. Se o ChatGPT oferecer fundo transparente nos objetos, pode aceitar: o recorte aceita fundo transparente ou magenta.
5. **Confira a lista** "Confira antes de salvar". Se falhar, peça de novo na mesma conversa dizendo só o que corrigir (exemplos no fim da Parte 1).
6. **Baixe em PNG** e **salve com o nome exato** em:

   `C:\Users\Danrley\Downloads\office2-arte-gpt\`

   (pasta nova, para não misturar com as do Gemini).

### Lista das 31 imagens

| # | Arquivo | O quê | Anexar |
|---|---|---|---|
| 1 | `cidade-noite.png` | Cidade à noite (fundo em tela cheia) | referência aprovada |
| 2 | `textura-piso-marmore.png` | Piso de pedra clara polida | referência aprovada |
| 3 | `textura-piso-madeira.png` | Piso de madeira | referência aprovada |
| 4 | `textura-carpete.png` | Carpete escuro das salas de operação | referência aprovada |
| 5 | `textura-deck.png` | Deck da varanda | referência aprovada |
| 6 | `textura-parede-ripada.png` | Parede de ripas de madeira escura | referência aprovada |
| 7 | `textura-parede-escura.png` | Parede de painel grafite | referência aprovada |
| 8 | `props-ring.png` | Ring: mesas de operação, totem e cadeiras | referência aprovada |
| 9 | `props-horizon.png` | Horizon: estações de trabalho | referência aprovada |
| 10 | `props-reuniao.png` | Mesas de reunião e café | referência aprovada |
| 11 | `props-recepcao.png` | Recepção e elevadores | referência aprovada |
| 12 | `props-convivencia.png` | Área de convivência | referência aprovada |
| 13 | `props-stress.png` | Stress Lab | referência aprovada |
| 14 | `props-risk-auditoria.png` | Risk e Auditoria | referência aprovada |
| 15 | `props-cozinha-cafe.png` | Cozinha e café | referência aprovada |
| 16 | `props-varanda.png` | Varanda | referência aprovada |
| 17 | `plantas.png` | Plantas (variações) | referência aprovada |
| 18 | `icones-estagios.png` | Ícones dos 5 estágios do Anel de decisão | referência aprovada |
| 19 | `emblemas-zonas-1.png` | Emblemas das zonas (1 de 2) | referência aprovada |
| 20 | `emblemas-zonas-2.png` | Emblemas das zonas (2 de 2) | referência aprovada |
| 21 | `icones-estado-agente.png` | Ícones de estado dos agentes | referência aprovada |
| 22 | `icones-cenarios-1.png` | Cenários do Stress Lab (1 de 2) | referência aprovada |
| 23 | `icones-cenarios-2.png` | Cenários do Stress Lab (2 de 2) | referência aprovada |
| 24 | `personagem-atlas.png` | Atlas | referência aprovada (1ª) + public/office/characters/atlas.png (2ª) |
| 25 | `personagem-euler.png` | Euler | referência aprovada (1ª) + public/office/characters/euler.png (2ª) |
| 26 | `personagem-flux.png` | Flux | referência aprovada (1ª) + public/office/characters/flux.png (2ª) |
| 27 | `personagem-nova.png` | Nova | referência aprovada (1ª) + public/office/characters/nova.png (2ª) |
| 28 | `personagem-oracle.png` | Oracle (fundo VERDE) | referência aprovada (1ª) + public/office/characters/oracle.png (2ª) |
| 29 | `personagem-satoshi.png` | Satoshi | referência aprovada (1ª) + public/office/characters/satoshi.png (2ª) |
| 30 | `personagem-sentinel.png` | Sentinel | referência aprovada (1ª) + public/office/characters/sentinel.png (2ª) |
| 31 | `personagem-vega.png` | Vega | referência aprovada (1ª) + public/office/characters/vega.png (2ª) |


## Fundo

### 1. Cidade à noite (fundo em tela cheia)

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024, fully opaque.
A dense night skyline seen from the 30th floor of a skyscraper, looking slightly DOWN at about 30 degrees, exactly like the city around the building in the reference: deep blue-violet night sky (#0b1426 at the top to #1a2a4a near the horizon), many skyscrapers with thousands of small lit windows (mostly warm #ffcf6a, some cool #9fc4e8), a few red aviation lights on the tallest rooftops, faint light streaks of streets far below, soft bluish haze toward the horizon.
ONE CONTINUOUS city across the WHOLE image with the same density everywhere: NO dark band, NO empty area, NO foreground building, NO office interior, NO window frame, NO people, NO moon, NO sun, NO text. The center must look the same as the edges (software darkens the center later).
```

**Salvar como:** `cidade-noite.png`

**Confira antes de salvar:** Cidade contínua na imagem toda, sem faixa escura · Céu azul-violeta, janelas quentes, sem prédio em primeiro plano · Sem texto


## Texturas

### 2. Piso de pedra clara polida

**Anexar:** referência aprovada

```text
STYLE: premium pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). Use the attached reference ONLY for style, palette and lighting; do NOT copy its layout, floor, walls or people.

OUTPUT: square image 1024 x 1024, fully opaque.
This is a SEAMLESS TILEABLE TEXTURE seen perfectly FLAT and FRONT-ON (orthographic, NOT isometric, NOT in perspective). Software will repeat it and skew it onto the isometric floor/walls, so:
- the left edge must continue exactly into the right edge, and the top edge into the bottom edge, with no visible seam;
- uniform lighting across the whole image: no gradient, no vignette, no spotlight, no shadows;
- no objects, no people, no text, no logos.
MATERIAL: polished warm beige marble floor (#d9cdb4 with lighter #eadfc6 and darker #c8b89a), 4 x 4 large square tiles with thin slightly darker grout lines, subtle soft veins, a gentle glossy highlight inside each tile (the same in every tile).
```

**Salvar como:** `textura-piso-marmore.png`

**Confira antes de salvar:** Vista reta (de frente), sem perspectiva · Emenda invisível: a borda da esquerda continua na da direita · Luz igual em toda a imagem, sem objeto nem texto

### 3. Piso de madeira

**Anexar:** referência aprovada

```text
STYLE: premium pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). Use the attached reference ONLY for style, palette and lighting; do NOT copy its layout, floor, walls or people.

OUTPUT: square image 1024 x 1024, fully opaque.
This is a SEAMLESS TILEABLE TEXTURE seen perfectly FLAT and FRONT-ON (orthographic, NOT isometric, NOT in perspective). Software will repeat it and skew it onto the isometric floor/walls, so:
- the left edge must continue exactly into the right edge, and the top edge into the bottom edge, with no visible seam;
- uniform lighting across the whole image: no gradient, no vignette, no spotlight, no shadows;
- no objects, no people, no text, no logos.
MATERIAL: warm brown wooden floor (#8b5a2c / #a86d36 / #6e4521), planks running horizontally, 8 planks from top to bottom, staggered joints, subtle grain.
```

**Salvar como:** `textura-piso-madeira.png`

**Confira antes de salvar:** Vista reta (de frente), sem perspectiva · Emenda invisível: a borda da esquerda continua na da direita · Luz igual em toda a imagem, sem objeto nem texto

### 4. Carpete escuro das salas de operação

**Anexar:** referência aprovada

```text
STYLE: premium pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). Use the attached reference ONLY for style, palette and lighting; do NOT copy its layout, floor, walls or people.

OUTPUT: square image 1024 x 1024, fully opaque.
This is a SEAMLESS TILEABLE TEXTURE seen perfectly FLAT and FRONT-ON (orthographic, NOT isometric, NOT in perspective). Software will repeat it and skew it onto the isometric floor/walls, so:
- the left edge must continue exactly into the right edge, and the top edge into the bottom edge, with no visible seam;
- uniform lighting across the whole image: no gradient, no vignette, no spotlight, no shadows;
- no objects, no people, no text, no logos.
MATERIAL: dark charcoal-blue office carpet tiles (#2b3140 / #353c4e), 4 x 4 square carpet tiles with very subtle alternating direction of the weave.
```

**Salvar como:** `textura-carpete.png`

**Confira antes de salvar:** Vista reta (de frente), sem perspectiva · Emenda invisível: a borda da esquerda continua na da direita · Luz igual em toda a imagem, sem objeto nem texto

### 5. Deck da varanda

**Anexar:** referência aprovada

```text
STYLE: premium pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). Use the attached reference ONLY for style, palette and lighting; do NOT copy its layout, floor, walls or people.

OUTPUT: square image 1024 x 1024, fully opaque.
This is a SEAMLESS TILEABLE TEXTURE seen perfectly FLAT and FRONT-ON (orthographic, NOT isometric, NOT in perspective). Software will repeat it and skew it onto the isometric floor/walls, so:
- the left edge must continue exactly into the right edge, and the top edge into the bottom edge, with no visible seam;
- uniform lighting across the whole image: no gradient, no vignette, no spotlight, no shadows;
- no objects, no people, no text, no logos.
MATERIAL: outdoor dark teak deck boards (#6b5440 / #7d6450 / #5a4534) running horizontally, 8 boards from top to bottom, thin dark gaps between boards, small screws.
```

**Salvar como:** `textura-deck.png`

**Confira antes de salvar:** Vista reta (de frente), sem perspectiva · Emenda invisível: a borda da esquerda continua na da direita · Luz igual em toda a imagem, sem objeto nem texto

### 6. Parede de ripas de madeira escura

**Anexar:** referência aprovada

```text
STYLE: premium pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). Use the attached reference ONLY for style, palette and lighting; do NOT copy its layout, floor, walls or people.

OUTPUT: square image 1024 x 1024, fully opaque.
This is a SEAMLESS TILEABLE TEXTURE seen perfectly FLAT and FRONT-ON (orthographic, NOT isometric, NOT in perspective). Software will repeat it and skew it onto the isometric floor/walls, so:
- the left edge must continue exactly into the right edge, and the top edge into the bottom edge, with no visible seam;
- uniform lighting across the whole image: no gradient, no vignette, no spotlight, no shadows;
- no objects, no people, no text, no logos.
MATERIAL: front view of a dark wooden slatted wall: narrow vertical walnut slats (#3a2a1f / #4a3626) with thin dark gaps (#15100c), repeating evenly across the width.
```

**Salvar como:** `textura-parede-ripada.png`

**Confira antes de salvar:** Vista reta (de frente), sem perspectiva · Emenda invisível: a borda da esquerda continua na da direita · Luz igual em toda a imagem, sem objeto nem texto

### 7. Parede de painel grafite

**Anexar:** referência aprovada

```text
STYLE: premium pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). Use the attached reference ONLY for style, palette and lighting; do NOT copy its layout, floor, walls or people.

OUTPUT: square image 1024 x 1024, fully opaque.
This is a SEAMLESS TILEABLE TEXTURE seen perfectly FLAT and FRONT-ON (orthographic, NOT isometric, NOT in perspective). Software will repeat it and skew it onto the isometric floor/walls, so:
- the left edge must continue exactly into the right edge, and the top edge into the bottom edge, with no visible seam;
- uniform lighting across the whole image: no gradient, no vignette, no spotlight, no shadows;
- no objects, no people, no text, no logos.
MATERIAL: front view of dark charcoal architectural wall panels (#1c212b / #232935) with thin darker seams every quarter of the width and a faint brushed texture.
```

**Salvar como:** `textura-parede-escura.png`

**Confira antes de salvar:** Vista reta (de frente), sem perspectiva · Emenda invisível: a borda da esquerda continua na da direita · Luz igual em toda a imagem, sem objeto nem texto


## Móveis e objetos

### 8. Ring: mesas de operação, totem e cadeiras

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 5 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 5 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Large curved trading desk (no floor, no base): a long desk whose top is a gentle arc, concave side toward the viewer, about 5 floor tiles long. Graphite body, warm LED strip #ffd27a along the top edge, EXACTLY FIVE (5) identical monitors side by side on the back edge, all facing the viewer (count them: five), two keyboards and two mice. No chair.
2. Medium curved trading desk, same style, about 3.5 tiles long, EXACTLY THREE (3) monitors on the back edge facing the viewer, one keyboard, one mouse. No chair.
3. Standing display totem: a slim dark graphite vertical panel (about as tall as a person) with a glowing white logo made of four vertical bars of rising height (a simple bar-chart symbol, no letters), soft white glow.
4. Black ergonomic office chair seen from the BACK (only the mesh backrest visible, seat hidden), five-spoke chrome base with casters.
5. The same black office chair seen from the FRONT three-quarter view (seat cushion and armrests visible), five-spoke chrome base with casters.

Before finishing, check: exactly 5 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-ring.png`

**Confira antes de salvar:** Exatamente 5 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 9. Horizon: estações de trabalho

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 3 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 3 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Straight workstation desk (about 3 tiles long, 1.5 deep) in dark wood and graphite, THREE monitors side by side on the back edge facing the viewer, keyboard, mouse, small desk lamp. No chair.
2. Compact workstation desk (about 2 tiles long) with TWO monitors facing the viewer, keyboard, mouse, a mug. No chair.
3. Low dark-wood side cabinet (about 2 tiles long, knee-high) with closed doors and a small plant on top.

Before finishing, check: exactly 3 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-horizon.png`

**Confira antes de salvar:** Exatamente 3 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 10. Mesas de reunião e café

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Long dark-wood meeting table (about 5 tiles long, 2 deep) WITH EIGHT black office chairs around it (three on each long side, one at each end), all chairs tucked toward the table. A few closed laptops and notebooks on the table (no screens visible).
2. Medium dark-wood meeting table (about 4 tiles long) WITH SIX black office chairs around it (three on each long side).
3. Round dark café table (about 1.5 tiles wide) WITH FOUR black café chairs around it.
4. Low dark-wood credenza (about 3 tiles long, waist-high) with closed doors, two small plants on top.

Before finishing, check: exactly 4 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-reuniao.png`

**Confira antes de salvar:** Exatamente 4 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 11. Recepção e elevadores

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Curved reception desk in light beige stone (#e2d6bf) with a warm LED strip #ffd27a glowing under the counter edge, one monitor seen from behind on the desk, a small plant at one end. No letters on it.
2. Waiting bench in dark wood with black metal legs (about 2 tiles long), no backrest.
3. Elevator wall: ONLY a free-standing piece of dark graphite wall about 3 tiles wide and as tall as 1.6 people, with two closed brushed-steel elevator doors and a vertical warm LED strip between them. It rises to the right like the other long objects. NO floor or skirting slab at its foot.
4. Turnstile gate: graphite steel posts with solid-looking light blue-grey (#cfe3f0) glass flaps (never pink, never transparent).

Before finishing, check: exactly 4 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-recepcao.png`

**Confira antes de salvar:** Exatamente 4 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 12. Área de convivência

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 5 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 5 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Beige three-seat sofa with plump cushions and dark wooden feet (about 3 tiles long).
2. Matching beige armchair (1 tile).
3. Low dark-wood coffee table (about 2 tiles long) with a small bowl of green plants on it.
4. Large flat rectangular rug in warm brown and cream (about 4 tiles long, 3 deep), completely flat, seen in isometric.
5. Slim black floor lamp with a warm glowing fabric shade (as tall as a person).

Before finishing, check: exactly 5 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-convivencia.png`

**Confira antes de salvar:** Exatamente 5 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 13. Stress Lab

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Graphite treadmill with a blank navy control panel (about 2 tiles long).
2. Bright red punching bag hanging from a black metal stand (as tall as 1.3 people).
3. Low black dumbbell rack with six dumbbells (about 2 tiles long).
4. Compact test device: square graphite base, short graphite column and a round emitter disc on top; the emitter is OFF (dark grey, no glow). About 2 x 2 tiles.

Before finishing, check: exactly 4 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-stress.png`

**Confira antes de salvar:** Exatamente 4 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 14. Risk e Auditoria

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 6 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 6 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Workstation desk with a warm light-wood top and black legs (about 3 tiles long), TWO monitors facing the viewer, keyboard, mouse. No chair.
2. Tall dark bookshelf with colorful binders and archive boxes, plain spines with no letters (about 2 tiles long).
3. Wall of lockers: a row of six tall light-wood (#c9a77a) locker doors with small metal handles, joined in one block (about 3 tiles long).
4. Row of FOUR tall graphite filing cabinets side by side, joined in one block, each with drawer handles (about 4 tiles long).
5. Tall black server rack with rows of tiny cyan and amber LEDs (1 tile, taller than a person).
6. Grey two-seat fabric sofa with dark legs (about 2 tiles long).

Before finishing, check: exactly 6 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-risk-auditoria.png`

**Confira antes de salvar:** Exatamente 6 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 15. Cozinha e café

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 5 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 5 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Kitchen counter (about 4 tiles long) with a dark lower cabinet, warm wood top, an espresso machine and a microwave on top, warm LED strip #ffd27a glowing under the countertop.
2. High bar stool with a dark wooden round seat and black metal legs (1 tile).
3. Tall graphite fridge with a dark glass door showing a few bottles inside (1 tile, a little taller than a person).
4. Round dark café table on a single pedestal (about 1.5 tiles), nothing on it.
5. Black café chair with a curved back (1 tile).

Before finishing, check: exactly 5 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-cozinha-cafe.png`

**Confira antes de salvar:** Exatamente 5 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 16. Varanda

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 4 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 4 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Dark charcoal outdoor lounge sofa with grey cushions (about 3 tiles long).
2. Low outdoor coffee table in dark teak (about 2 tiles long).
3. Matching dark outdoor armchair with grey cushion (1 tile).
4. Long low planter box in dark teak full of ornamental grasses and small shrubs (about 3 tiles long).

Before finishing, check: exactly 4 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `props-varanda.png`

**Confira antes de salvar:** Exatamente 4 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto

### 17. Plantas (variações)

**Anexar:** referência aprovada

```text
STYLE: premium isometric pixel art in the EXACT style of the attached reference image (the TradingLab office on the 30th floor at night). Crisp chunky pixel clusters, thin dark outlines, 3-4 tone shading, warm golden interior light (#ffcf8a), dark graphite architecture (#1c212b / #2a2f3a), warm wood (#8b5a2c / #b07a45), beige polished stone (#d9cdb4), cool blue screen glow (#5fb6ff), lush green plants (#2c8a48 / #62d07a). ISOMETRIC 2:1 camera (about 30 degrees from above), exactly the same angle as the reference. Use the attached reference ONLY for style, palette, lighting and camera angle; do NOT copy its layout, floor, walls or people.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ASSET SHEET of exactly 6 separate objects, NOT a scene. Each object floats alone on the magenta background.

STRICT RULES:
1. NO floor, NO platform, NO base slab, NO tiles under or around any object. Legs, feet and bottom edges touch the magenta directly.
2. NO shadow of any kind on the background: no drop shadow, no contact shadow, no dark ellipse under objects.
3. Objects never touch or overlap: at least 100 px of pure magenta between any two objects and at least 60 px from every image edge.
4. Draw exactly the 6 objects listed below, each exactly ONCE, left to right in the listed order (use a second row only if they do not fit). No extra objects, no duplicates, no decorations.
5. No text anywhere: no list numbers, labels, letters, digits or logos (except where an object description asks for a logo shape).
6. Every monitor or screen is a flat dark navy #0e2150 rectangle with a thin frame and a soft blue glow on its edge: NO charts, NO numbers, NO content.
7. ORIENTATION (very important): every LONG object is drawn with its long side running from the LOWER-LEFT up to the UPPER-RIGHT of the image (rising to the right), with its front facing the viewer toward the lower-right, like the desks and sofas along the left-hand walls of the reference. Round, square or symmetric objects may face the viewer directly.
8. SCALE: a standing office worker in this style would be about 180 px tall in this image. Draw every object at its real size relative to that worker (an office chair reaches the hip, a desk top the waist, a fridge is a little taller than the worker). Same scale for all objects.

OBJECTS, left to right:
1. Tall indoor palm (areca) in a matte black cylindrical pot, as tall as a person.
2. Bushy fern in a white round pot, knee-high.
3. Small leafy plant in a small grey pot, ankle-high.
4. Snake plant (sansevieria) in a tall square black pot, hip-high.
5. Fiddle-leaf fig tree in a black pot, taller than a person.
6. Long rectangular planter box in warm wood full of lush tropical plants (about 3 tiles long), rising to the right.

Before finishing, check: exactly 6 separate objects in the listed order, none touching; pure flat magenta everywhere else; no floor or base; no shadow on the background; no text; long objects rising to the right; every screen plain navy.
```

**Salvar como:** `plantas.png`

**Confira antes de salvar:** Exatamente 6 objetos, na ordem, nenhum encostado · Sem piso, sem base, sem sombra no fundo · Objetos compridos subindo para a direita · Telas azul-marinho sem conteúdo; nenhum texto


## Ícones

### 18. Ícones dos 5 estágios do Anel de decisão

**Anexar:** referência aprovada

```text
OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ICON SHEET with exactly 5 separate icons in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges. Each icon is one separate drawing; icons never touch or merge.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, matching the attached reference's palette, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). No shadow on the background.

ICONS, left to right:
1. A clipboard with a zigzag arrow going up.
2. A shield with a small padlock in the middle.
3. A magnifying glass over a list of three ticked boxes.
4. A paper order ticket with a small gear in the corner.
5. A closed ledger book with a ribbon bookmark and a round stamp.
Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9. Draw lines instead of letters on any paper.

Before finishing, check: exactly 5 icons in the listed order, none touching or merged; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Salvar como:** `icones-estagios.png`

**Confira antes de salvar:** Exatamente 5 ícones, na ordem, separados · Sem grade, moldura, número ou texto · Sem verde nem vermelho

### 19. Emblemas das zonas (1 de 2)

**Anexar:** referência aprovada

```text
OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ICON SHEET with exactly 5 separate icons in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges. Each icon is one separate drawing; icons never touch or merge.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, matching the attached reference's palette, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). No shadow on the background.

ICONS, left to right:
1. Bar chart with a line over it, inside a square frame.
2. Speech bubble with three dots.
3. A ring with five small marks around it.
4. Laboratory flask.
5. Shield.
Colors: ONLY cyan #5fb6ff and light blue-white #dbe9ff, dark outline.

Before finishing, check: exactly 5 icons in the listed order, none touching or merged; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Salvar como:** `emblemas-zonas-1.png`

**Confira antes de salvar:** Exatamente 5 ícones, na ordem, separados · Sem grade, moldura, número ou texto · Sem verde nem vermelho

### 20. Emblemas das zonas (2 de 2)

**Anexar:** referência aprovada

```text
OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ICON SHEET with exactly 5 separate icons in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges. Each icon is one separate drawing; icons never touch or merge.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, matching the attached reference's palette, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). No shadow on the background.

ICONS, left to right:
1. Ledger book.
2. Magnifying glass over a timeline.
3. Hourglass over a small grid.
4. Paper order ticket.
5. Three rising bars inside a stylized building, no text.
Colors: ONLY cyan #5fb6ff and light blue-white #dbe9ff, dark outline.

Before finishing, check: exactly 5 icons in the listed order, none touching or merged; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Salvar como:** `emblemas-zonas-2.png`

**Confira antes de salvar:** Exatamente 5 ícones, na ordem, separados · Sem grade, moldura, número ou texto · Sem verde nem vermelho

### 21. Ícones de estado dos agentes

**Anexar:** referência aprovada

```text
OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ICON SHEET with exactly 6 separate icons in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges. Each icon is one separate drawing; icons never touch or merge.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, matching the attached reference's palette, still readable when shrunk to 32 x 32 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). No shadow on the background.

ICONS, left to right:
1. Gear.
2. Hourglass.
3. Raised open hand.
4. Unplugged power plug with a loose cable.
5. Envelope.
6. Coffee cup with steam.
Each icon is a ROUND BADGE: a dark #0a1b33 circle with a light 1-pixel rim, with the symbol inside in cream #f2e6c9 with cyan #5fb6ff details.

Before finishing, check: exactly 6 icons in the listed order, none touching or merged; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Salvar como:** `icones-estado-agente.png`

**Confira antes de salvar:** Exatamente 6 ícones, na ordem, separados · Sem grade, moldura, número ou texto · Sem verde nem vermelho

### 22. Cenários do Stress Lab (1 de 2)

**Anexar:** referência aprovada

```text
OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ICON SHEET with exactly 7 separate icons in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges. Each icon is one separate drawing; icons never touch or merge.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, matching the attached reference's palette, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). No shadow on the background.

ICONS, left to right:
1. A steady flat horizontal line with a small tick mark.
2. A lightning bolt over a candlestick.
3. A large zigzag wave.
4. Two vertical bars far apart with a double arrow between them.
5. A clock with a pause symbol.
6. ONLY three candlesticks side by side with a small clock above them.
7. A DIFFERENT separate icon: four candlesticks in a row where the third is missing and replaced by a dashed empty outline.
Candlesticks in cyan and cream only. Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9.

Before finishing, check: exactly 7 icons in the listed order, none touching or merged; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Salvar como:** `icones-cenarios-1.png`

**Confira antes de salvar:** Exatamente 7 ícones, na ordem, separados · Sem grade, moldura, número ou texto · Sem verde nem vermelho

### 23. Cenários do Stress Lab (2 de 2)

**Anexar:** referência aprovada

```text
OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta anywhere inside the drawings.
This is a GAME ICON SHEET with exactly 7 separate icons in ONE horizontal row, evenly spaced, all the same size (each about 180 px wide), with at least 60 px of pure magenta between icons and around the edges. Each icon is one separate drawing; icons never touch or merge.
No grid lines, no cells, no frames, no tiles or circles behind the icons (unless the description asks for one), no labels, no numbers, no text.
Style: chunky pixel art with big clean pixels, matching the attached reference's palette, still readable when shrunk to 64 x 64 px. Flat front view with slight volume, like an RPG inventory item. Dark outline #1b2133. Do NOT use green or red (reserved for status colors). No shadow on the background.

ICONS, left to right:
1. A cloud with a broken cable.
2. Two towers with arrows pointing away from each other.
3. A down arrow hitting a floor barrier.
4. A lever switch in the OFF position.
5. A cracked sheet of paper.
6. Two cards swapping places with curved arrows.
7. A circular arrow around a power symbol.
Colors: graphite #1b2133, cyan #5fb6ff, gold #ffd27a, cream #f2e6c9.

Before finishing, check: exactly 7 icons in the listed order, none touching or merged; pure flat magenta everywhere else; no grid, no frames, no text or numbers.
```

**Salvar como:** `icones-cenarios-2.png`

**Confira antes de salvar:** Exatamente 7 ícones, na ordem, separados · Sem grade, moldura, número ou texto · Sem verde nem vermelho


## Personagens

### 24. Atlas

**Anexar:** referência aprovada (1ª) + public/office/characters/atlas.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for ATLAS, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: man with tousled dark navy-black hair, warm tan skin, navy suit, pale-blue open-collar shirt, brown shoes, no glasses, no tie. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-atlas.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### 25. Euler

**Anexar:** referência aprovada (1ª) + public/office/characters/euler.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for EULER, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: man with brown hair, orange cap, round dark glasses, orange jacket over a cream shirt, dark trousers, orange-and-white sneakers. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-euler.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### 26. Flux

**Anexar:** referência aprovada (1ª) + public/office/characters/flux.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for FLUX, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: man with tousled blue hair, blue eyes, royal-blue hoodie with white cords, charcoal trousers, blue-and-white sneakers. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-flux.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### 27. Nova

**Anexar:** referência aprovada (1ª) + public/office/characters/nova.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for NOVA, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: woman with long wavy auburn-red hair, gold earrings, teal blazer over an ivory blouse, black trousers and black shoes. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-nova.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### 28. Oracle (fundo VERDE)

**Anexar:** referência aprovada (1ª) + public/office/characters/oracle.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for ORACLE, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: woman with long wavy purple hair, gold earrings, magenta blazer over an ivory blouse, black trousers and black shoes. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure green #00FF00, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use that bright green anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-oracle.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo verde liso

### 29. Satoshi

**Anexar:** referência aprovada (1ª) + public/office/characters/satoshi.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for SATOSHI, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: man with tousled golden-blond hair, green eyes, orange hoodie with white cords, charcoal trousers, orange-and-white sneakers. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-satoshi.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### 30. Sentinel

**Anexar:** referência aprovada (1ª) + public/office/characters/sentinel.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for SENTINEL, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: man with swept silver-white hair, blue eyes, navy suit, white shirt, blue tie and black shoes. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-sentinel.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### 31. Vega

**Anexar:** referência aprovada (1ª) + public/office/characters/vega.png (2ª)

```text
Create a pixel-art CHARACTER SPRITE SHEET for VEGA, an office worker of the TradingLab isometric pixel-art office.
Use the FIRST attached image (the office reference) for the art style, proportions and camera angle: draw the character exactly like the small office workers seen in that image (chibi proportions, about 2.5 heads tall, crisp pixel clusters, thin dark outline, 3-4 tone shading, warm night lighting).
Use the SECOND attached image only for the identity: woman with a mint-green chin-length bob, gold hoop earrings, violet jacket over a black top, black trousers and black shoes. Keep this identity exactly the same (hair, clothes, colors) in every drawing.

OUTPUT: landscape image 1536 x 1024.
BACKGROUND: one solid flat color, pure magenta #FF00FF, over the ENTIRE image (it is a chroma key that software will delete). No gradient, no vignette, no texture, no noise, no light on it, never darken or tint it. Never use magenta, pink or purple anywhere inside the drawings. No shadow under the feet.

LAYOUT: exactly 12 separate full-body drawings of the SAME character (head to shoes), in 2 rows of 6, evenly spaced, all the same size (the standing ones about 360 px tall). In each row the soles of all shoes sit on the same horizontal line. Drawings never touch each other or the image edges. No grid lines, no labels, no numbers, no text.

ROW 1 (top) = facing DOWN-RIGHT: front three-quarter view; we see the FACE and the front of the body, turned toward the bottom-right corner of the image.
ROW 2 (bottom) = facing UP-RIGHT: back three-quarter view; we see the BACK of the head and the back of the body, turned toward the top-right corner. The face is NOT visible in this row.
Do NOT draw any left-facing version (software mirrors them).

COLUMNS, the same in both rows, left to right:
1. Standing still, arms relaxed.
2. Walking: left foot forward touching the ground, right arm forward.
3. Walking: legs passing each other, mid-step.
4. Walking: right foot forward touching the ground, left arm forward.
5. Walking: legs passing each other again.
6. Seated as if on an invisible office chair: hips lowered, thighs horizontal, knees bent at 90 degrees, hands forward as if typing on a desk. Do NOT draw a chair or desk.

Identical hair, clothes, colors, proportions and size in all 12 drawings. No props, no furniture, no floor, no shadow.
Before finishing, check: exactly 12 drawings in 2 rows of 6; row 1 shows the face turned to the right; row 2 hides the face, turned to the right; column 6 seated with no chair; flat background everywhere else; no text.
```

**Salvar como:** `personagem-vega.png`

**Confira antes de salvar:** 12 desenhos: 2 linhas de 6 · Linha de cima com rosto, virado para a direita; de baixo de costas · Coluna 6 sentado sem cadeira · Mesma roupa, cabelo e tamanho nos 12 · Fundo magenta liso

### Mensagens de correção (cole na mesma conversa)

- Piso/base: `Redo the same image, identical in everything else, but remove every floor, platform, base or tile under the objects; they stand directly on the flat background.`
- Sombra: `Redo the same image, identical in everything else, with NO shadow at all on the background.`
- Encostados: `Redo the same image, identical in everything else, with at least 100 px of empty background between any two objects.`
- Quantidade/duplicado: `Redo the same image. Draw exactly the listed objects, each only once, in the listed order. Count them.`
- Texto: `Redo the same image, identical in everything else, with no text, letters, numbers or labels anywhere.`
- Orientação: `Redo the same image so that every long object has its long side rising from the lower-left to the upper-right, front facing the lower-right.`
- Tela com gráfico: `Redo the same image; every screen must be a plain dark navy rectangle with a soft blue edge glow, no content.`
- Personagem virado errado: `Redo the sheet: top row faces the bottom-right with the face visible; bottom row faces the top-right showing only the back of the head; nobody faces left.`
- Textura com emenda: `Redo the texture so it tiles seamlessly: the left edge must continue into the right edge and the top into the bottom, with flat even lighting.`

---

## Parte 2 · Instruções para o Codex (cole esta parte inteira para ele)

Você vai integrar a arte nova do Escritório 2.0 (`/office2`). Leia e siga **tudo**, na ordem. Não pule conferências.

### 0. Regras do projeto (obrigatórias)
- Leia `AGENTS.md`. Paper trading apenas; nunca credenciais no repositório; nada de dado, fill, P&L ou trabalho de agente inventado.
- Em `public/office2/*.js`: **proibido `Math.random`** (há teste). Aleatoriedade só com `Office2Iso.prng(semente)`.
- Telas: só desenham dado real; sem dado ficam apagadas. Não desenhe gráfico/número decorativo em tela nenhuma.
- **Não faça merge nem deploy.** Abra PR e pare. O usuário aprova.
- Commits e PR em português, mensagens explicando o porquê.

### 1. Branch
- Base: `feat/escritorio-2-f6` (contém o recortador `scripts/assets/arte-gemini.ts`, a config `scripts/assets/arte-gpt.json`, o manifesto e os testes da arte). Se essa branch já tiver sido mergeada em `main`, use `main`.
- Crie `feat/escritorio-2-f7-arte-gpt`.

### 2. Arquivos de entrada
- Pasta: `C:\Users\Danrley\Downloads\office2-arte-gpt\` com os 31 arquivos da tabela da Parte 1 (nomes exatos).
- Confira antes de tudo: todos existem? Liste os que faltam e **pare** se faltar algum de móveis/ícones (texturas e personagens podem vir depois, em PRs separados).
- Não copie os originais para o repositório (são grandes). Só os recortes vão para `public/office2/art/`.

### 3. Converter para PNG (se algum vier JPEG/WebP)
O recortador lê PNG. No PowerShell:
```powershell
$src='C:\Users\Danrley\Downloads\office2-arte-gpt'; $png="$env:TEMP\office2-gpt-png"; New-Item -ItemType Directory -Force $png | Out-Null
Add-Type -AssemblyName System.Drawing
Get-ChildItem $src -File | ForEach-Object { $i=[System.Drawing.Image]::FromFile($_.FullName); $i.Save((Join-Path $png ($_.BaseName+'.png')),[System.Drawing.Imaging.ImageFormat]::Png); $i.Dispose() }
```
(WebP não abre no System.Drawing: peça ao usuário para baixar em PNG.)

### 4. Contar os objetos de cada folha (antes de gerar)
```
npx tsx scripts/assets/arte-gemini.ts "%TEMP%\office2-gpt-png" --caixas --config=scripts/assets/arte-gpt.json
```
Para cada folha, o número de objetos achados tem que ser **igual** ao número de `pieces` em `scripts/assets/arte-gpt.json`:

| Folha | Peças esperadas (ordem: linha de cima da esquerda para a direita, depois a de baixo) |
|---|---|
| `props-ring` | 5: mesa-curva-operacoes, mesa-curva-media, totem-logo, cadeira-costas, cadeira-frente |
| `props-horizon` | 3: mesa-monitores, estacao-2-monitores, armario-baixo |
| `props-reuniao` | 4: mesa-reuniao, mesa-reuniao-6, mesa-cafe-4, aparador |
| `props-recepcao` | 4: balcao-recepcao, banco-espera, parede-elevadores, catraca |
| `props-convivencia` | 5: sofa, poltrona, mesa-centro, tapete, luminaria-chao |
| `props-stress` | 4: esteira, saco-pancada, rack-halteres, bancada-teste |
| `props-risk-auditoria` | 6: estacao-madeira, estante-arquivo, lockers, armarios-arquivo, rack-servidor, sofa-cinza |
| `props-cozinha-cafe` | 5: bancada-cozinha, banqueta, geladeira, mesa-redonda, cadeira-cafe |
| `props-varanda` | 4: sofa-externo, mesa-externa, poltrona-externa, jardineira-capim |
| `plantas` | 6: planta-alta, samambaia, planta-baixa, espada, ficus, jardineira |
| `icones-estagios` | 5: estagio-trader, estagio-risk, estagio-validator, estagio-execution, estagio-audit |
| `emblemas-zonas-1` | 5: zona-horizon, zona-nexus, zona-ring, zona-lab, zona-risk |
| `emblemas-zonas-2` | 5: zona-auditoria, zona-diagnostico, zona-backtest, zona-ordens, zona-marca |
| `icones-estado-agente` | 6: estado-trabalhando, estado-aguardando, estado-bloqueado, estado-desconectado, estado-mensagem, estado-pausa |
| `icones-cenarios-1` | 7: cenario-baseline, cenario-abrupt-move, cenario-volatility-spike, cenario-spread-widening, cenario-stale-quote, cenario-stale-candles, cenario-missing-candle |
| `icones-cenarios-2` | 7: cenario-provider-outage, cenario-backup-venue-divergence, cenario-loss-limit, cenario-kill-switch, cenario-malformed-snapshot, cenario-duplicate-out-of-order, cenario-restart |

Se a contagem não bater:
- **Objeto a mais** (duplicado): coloque `null` na posição dele em `pieces` (ele é ignorado).
- **Partes de um objeto separadas** (ícone com pedaços soltos): aumente `"gap"` daquela folha (ex.: 40 → 60).
- **Dois objetos grudados**: não tente separar à mão; peça ao usuário para gerar de novo com a mensagem "Encostados".
- **Objeto errado/faltando**: peça ao usuário para refazer aquela folha. **Nunca** dê a um objeto o nome de outro.

Confirme visualmente: gere os recortes numa pasta temporária e monte um mosaico (System.Drawing) para olhar cada peça com o nome. Confira principalmente a ORDEM e a ORIENTAÇÃO (compridos "subindo para a direita" ⇒ `axis:"j"`; se uma peça vier "descendo para a direita", troque o `axis` dela para `"i"`; redondos/simétricos `"none"`).

### 5. Gerar os recortes no projeto
```
npx tsx scripts/assets/arte-gemini.ts "%TEMP%\office2-gpt-png" public/office2/art --config=scripts/assets/arte-gpt.json
```
- Isso regrava `public/office2/art/manifesto.json` só com o que está na config (a config já cobre todos os móveis e ícones). Apague antes `public/office2/art/props` e `public/office2/art/icones` para não sobrar peça velha.
- O `width` da config é só a resolução de saída (2× do tamanho na cena); o tamanho real na cena vem da caixa do móvel no mapa (largura do losango e altura `h`), em `drawProp` (`public/office2/scene.js`).

### 6. Mobiliar o mapa (`public/office2/scene-map.json`, lista `props`)
Cada item: `{"asset":"<nome do manifesto>","room":"<sala>","tile":{"i":..,"j":..},"footprint":{"a":..,"b":..},"h":..}`. `a` = tiles no eixo i, `b` = no eixo j. O espelhamento é automático pelo `axis` da peça.

Regras (os testes cobram):
- Todo `asset` usado tem que existir no manifesto.
- A área do móvel fica **dentro da sala** (`room.tiles`), **não** cobre porta (`Office2Iso.create(map).doors`) nem tile de `points` (WORK/IDLE/SPAWN).
- Mantenha as rotas: o teste "rotas A*" exige caminho da chegada a todo ponto. Rode os testes depois de cada sala.
- Ponto `WORK` é onde o agente senta: **não** ponha móvel nesse tile; a mesa com monitores fica logo à frente dele, do lado para onde ele olha (campo `facing` do ponto).

Tamanhos sugeridos (footprint a×b na orientação "comprido em j"; vire para b×a quando o móvel correr em i):

| Peça | a×b | h |
|---|---|---|
| mesa-curva-operacoes | 3×5 | 40 |
| mesa-curva-media | 2×4 | 40 |
| totem-logo | 1×1 | 56 |
| cadeira-costas / cadeira-frente / cadeira-cafe | 1×1 | 24 |
| mesa-monitores | 2×3 | 36 |
| estacao-2-monitores | 2×2 | 36 |
| estacao-madeira | 2×3 | 36 |
| armario-baixo | 1×2 | 20 |
| mesa-reuniao (8 cadeiras) | 3×5 | 28 |
| mesa-reuniao-6 | 3×4 | 28 |
| mesa-cafe-4 | 2×2 | 24 |
| aparador | 1×3 | 22 |
| balcao-recepcao | 2×4 | 28 |
| banco-espera | 1×2 | 14 |
| parede-elevadores | 1×3 | 72 |
| catraca | 1×1 | 28 |
| sofa | 1×3 | 24 |
| poltrona | 1×1 | 24 |
| mesa-centro | 1×2 | 10 |
| tapete | 3×4 | 2 |
| luminaria-chao | 1×1 | 56 |
| esteira | 1×2 | 32 |
| saco-pancada | 1×1 | 56 |
| rack-halteres | 1×2 | 24 |
| bancada-teste | 2×2 | 32 |
| estante-arquivo | 1×2 | 56 |
| lockers | 1×3 | 56 |
| armarios-arquivo | 1×4 | 56 |
| rack-servidor | 1×1 | 64 |
| sofa-cinza | 1×2 | 24 |
| bancada-cozinha | 1×4 | 40 |
| banqueta | 1×1 | 20 |
| geladeira | 1×1 | 56 |
| mesa-redonda | 2×2 | 14 |
| sofa-externo | 1×3 | 22 |
| mesa-externa | 1×2 | 10 |
| poltrona-externa | 1×1 | 22 |
| jardineira-capim / jardineira | 1×3 | 28 / 32 |
| planta-alta / ficus | 1×1 | 48 / 60 |
| samambaia / espada / planta-baixa | 1×1 | 32 / 40 / 20 |

O que pôr em cada sala (como na referência; ajuste à planta):
- **horizon**: 3 a 4 `mesa-monitores`/`estacao-2-monitores` com uma `cadeira-costas` diante de cada uma (exceto onde há ponto WORK), 1 `armario-baixo`, 3 plantas.
- **nexus**: `mesa-reuniao` (já com 8 cadeiras; **remova** as cadeiras soltas que existem hoje em volta), 1 `aparador`, 3 plantas.
- **ring**: a `mesa-curva-operacoes` e uma `mesa-curva-media` (no lugar das atuais), `cadeira-costas` nas mesas sem ponto WORK, `totem-logo` num canto, 1 `jardineira`, 3 plantas.
- **hall-marca**: `banco-espera`, 1 `aparador`, 3 plantas.
- **recepcao**: `balcao-recepcao`, `cadeira-costas` atrás dele, 2 plantas.
- **elevadores**: `parede-elevadores` encostada na parede do fundo, 3 `catraca`, 2 plantas.
- **convivencia**: `tapete` (desenhe-o primeiro: `h` 2), `sofa`, 2 `poltrona`, `mesa-centro`, `jardineira`, `luminaria-chao`.
- **backtest** (sala de vidro): `estacao-2-monitores` + `cadeira-costas`, `armario-baixo`, 1 planta.
- **stress-lab**: `esteira`, `saco-pancada`, `rack-halteres`, `bancada-teste`, 1 planta.
- **risk**: 2 `estacao-madeira` com `cadeira-costas` (respeite o ponto WORK do Sentinel), `estante-arquivo`, 2 plantas.
- **auditoria**: `lockers`, `armarios-arquivo`, `rack-servidor`, `sofa-cinza`, 1 planta.
- **diagnostico**: `mesa-reuniao-6`, 2 plantas.
- **cozinha**: `bancada-cozinha`, 4 `banqueta` na frente dela, `geladeira`, 1 planta.
- **cafe**: 1 ou 2 `mesa-cafe-4`, 2 plantas.
- **varanda**: `sofa-externo`, `poltrona-externa`, `mesa-externa`, 2 `jardineira-capim`.
- Corredores (fora das salas): plantas em cantos, sem bloquear passagem.
Meta: perto de 110 móveis no total (hoje são 47).

### 7. Texturas de piso e parede (`public/office2/scene.js`)
- Salve as 6 texturas em `public/office2/art/texturas/<nome>.png` (reduza para 512×512 com média de área; pode usar `resize` de `scripts/assets/arte-gemini.ts`).
- Liberar na rota: em `src/application/office-assets.ts` troque a expressão `officeTwoArt` para aceitar `art/(props|icones|texturas|personagens)/<nome>.png` e acrescente casos no teste `test/office2-arte.test.ts`.
- Carregamento (`public/office2/app.js`): carregar as texturas e, **quando todas carregarem**, refazer `state.cache=state.scene.renderStatic(2)`.
- Pisos em `renderStatic`: por sala, `room.floor` → textura: `piso-claro`→marmore, `madeira`→madeira, `carpete-escuro`→carpete, `piso-tecnico`→carpete, `deck`→deck; fora das salas → marmore. Use `ctx.createPattern(img,'repeat')` com `pattern.setTransform(new DOMMatrix([24/T, 12/T, -24/T, 12/T, origin.x, origin.y]))`, onde `T` = pixels da textura por tile (marmore e carpete: 1/4 da largura da textura; madeira e deck: 1/8), e preencha o losango de cada tile com esse padrão. Mantenha as cores atuais como reserva quando a textura não carregou. **Não** apague o brilho e a luz quente que já existem por cima.
- Paredes em `drawWall`: paredes sólidas usam `textura-parede-escura`; as paredes com placa (`signAt`) e as do hall usam `textura-parede-ripada`. Parede ao longo de i (`w.a.j===w.b.j`): matriz `[24/T, 12/T, 0, 1, a.x, a.y]`; ao longo de j: `[-24/T, 12/T, 0, 1, a.x, a.y]` (T = pixels por tile da textura de parede, ex. 1/4 da largura). Escureça um pouco a face ao longo de j (`C.wallSide`) por cima.
- O teste "o desenho roda sem DOM real" usa um contexto falso: proteja `createPattern`/`DOMMatrix` (se não existirem, use a cor). Rode-o.

### 8. Personagens (só quando as 8 folhas estiverem aprovadas pelo usuário)
Formato novo: 2 linhas × 6 colunas, linha 0 = de frente virado para baixo-direita (SE), linha 1 = de costas virado para cima-direita (NE); colunas: 0 parado, 1–4 andando, 5 sentado. As direções SW e NW são o espelho de SE e NE.
1. Crie `scripts/assets/personagens-gpt.ts`: para cada `personagem-<id>.png`, use `removeKey` (magenta `[255,0,255]`; **oracle: verde `[0,255,0]`**) e `objectsOf` de `arte-gemini.ts`; exija exatamente 12 objetos em 2 linhas de 6 (se não, erro com o número achado); recorte cada um (`cropMasked`) e monte uma folha normalizada `public/office2/art/personagens/<id>.png` com células de 192×256, cada desenho reduzido para a mesma escala (altura do desenho parado = 240 px), centrado na horizontal e com os **pés na base** da célula; grave `public/office2/art/personagens/quadros.json` com `{"cell":{"w":192,"h":256},"standingHeight":240,"ids":[...]}`.
2. Em `scene.js` (`drawAgent`): se existir a folha nova do agente carregada, use-a: linha = `dir==='NE'||dir==='NW'?1:0`; coluna = parado 0, andando `1+(step%4)`, sentado 5; espelhe na horizontal (`ctx.scale(-1,1)` em volta dos pés) quando `dir==='SW'||dir==='NW'`; escala = `personHeightPx / standingHeight`; pés no centro do tile (como hoje). Sem a folha nova, continua a antiga (`OfficeSpriteSheets`).
3. Testes novos: o script falha com contagem errada; a escolha de linha/coluna/espelho para as 4 direções e 3 modos.

### 9. Conferir antes do PR
- `npx tsc --noEmit -p .` sem erro; `node --check` em todo `public/office2/*.js`; `npm test` inteiro verde.
- Rode a prévia (`.claude/preview-office2.ts`, porta 4310) e veja `/office2/` em **1920×940** e **1366×768**: nada de faixa preta, placas legíveis, móveis no chão (não flutuando), nenhum móvel em cima de porta, agentes chegando às mesas.
- Tire as duas capturas e anexe ao PR.

### 10. Entrega
- Commits pequenos (recortes; mapa; texturas; personagens), mensagens em português.
- PR para a base usada no passo 1, título "Escritório 2.0 · arte do ChatGPT (F7)". No corpo: o que mudou, contagem de peças por folha, o que ficou de fora e por quê, capturas.
- **Não faça merge nem deploy.** Avise o usuário que o PR está pronto.
