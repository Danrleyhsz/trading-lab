# Escritório 2.0: inventário dos assets atuais

Gerado em 06/10/2026 sobre `main` 224c430.

As medidas vêm dos próprios arquivos, não de suposição:
- dimensões e formato lidos do cabeçalho PNG;
- transparência conferida decodificando os quatro cantos (alfa 0 = transparente);
- fração opaca = pixels com alfa > 16, amostrados a cada 2 px.

As referências foram encontradas por busca do nome do arquivo em `public/`, `src/`, `scripts/`, `docs/` e `test/`. Para os personagens, a lista está limitada aos arquivos de código que carregam a imagem, porque o id do agente aparece em dezenas de arquivos que não usam a imagem.

## Resumo

| Grupo | Arquivos | Servidos ao navegador | Observação |
|---|---|---|---|
| Cena principal | `cenario-modular.png` (1852×849) | sim | fundo único da cena, montado das peças |
| Cidade | 3 faixas 1852×82 | sim | dia, entardecer e noite |
| Personagens | 8 folhas 768×512 (grade lógica 1536×1024) | sim | 24 quadros por agente |
| Retratos | `agent-sprites.png` 1774×887 | sim | lista de agentes |
| Ícones | 192×192 e 512×512 | sim | PWA |
| Peças-fonte | 88 PNG em `assets/` + `catalog.json`, `escala.json`, `cenario-modular.json` | só `cadeira-costas.png` | montadas em `scripts/assets/compor-cenario.html` |

Total: 103 PNG. Todas as 88 peças-fonte têm fundo transparente.

Achados do inventário:
- **Referência de estilo ausente:** `docs/ASSETS_MODULARES.md` manda anexar `public/office/office-reference-v2.png`, mas esse arquivo **não existe** no repositório. Os pedidos do Escritório 2.0 usam `public/office/cenario-modular.png` como referência de estilo.
- **Lista fixa de arquivos servidos:** o servidor só entrega o que está na lista de `src/application/office-assets.ts`. Toda imagem nova precisa entrar nessa lista; sem isso, ela responde 404.
- **Escala:** na cena, uma pessoa em pé tem 87 px (`escala.json`). Nas folhas-fonte, tem 175 px. Nas folhas de personagem, a célula é de 256 px, a sola fica em y = 240 e a altura de referência é 244 px.

## Arquivos servidos (`public/office/`)

| Caminho | Formato | Dimensões (px) | Fundo transparente | Fração opaca | Folha/quadros | Servido | Referências | Uso atual | Reuso |
|---|---|---|---|---|---|---|---|---|---|
| `public/office/agent-sprites.png` | PNG RGBA 8 bits | 1774×887 | sim | 0.307 | 8 retratos em 4×2 (recortes auditados em sprites.js) | sim | public/office/app.js, public/office/style.css, src/application/office-assets.ts | retratos da lista de agentes (.sprite em style.css, 4×2 células); identidade dos 8 agentes | sim |
| `public/office/cenario-modular.png` | PNG RGBA 8 bits | 1852×849 | não (opaco) | 0.941 | — | sim | public/office/life.js, public/office/navigation.js, public/office/screens.js, public/office/style.css, public/office/sw.js, public/office/transitions.js, public/office/v3.css, src/application/office-assets.ts, scripts/assets/compor-cenario.html | fundo da cena principal (1852×849), montado por scripts/assets/compor-cenario.html a partir das peças de assets/ | modificar (recompor com as zonas novas) |
| `public/office/characters/atlas.png` | PNG RGBA 8 bits | 768×512 | sim | 0.31 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente atlas na cena (DOM ou canvas) | sim |
| `public/office/characters/euler.png` | PNG RGBA 8 bits | 768×512 | sim | 0.333 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente euler na cena (DOM ou canvas) | sim |
| `public/office/characters/flux.png` | PNG RGBA 8 bits | 768×512 | sim | 0.344 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente flux na cena (DOM ou canvas) | sim |
| `public/office/characters/nova.png` | PNG RGBA 8 bits | 768×512 | sim | 0.367 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente nova na cena (DOM ou canvas) | sim |
| `public/office/characters/oracle.png` | PNG RGBA 8 bits | 768×512 | sim | 0.407 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente oracle na cena (DOM ou canvas) | sim |
| `public/office/characters/satoshi.png` | PNG RGBA 8 bits | 768×512 | sim | 0.33 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente satoshi na cena (DOM ou canvas) | sim |
| `public/office/characters/sentinel.png` | PNG RGBA 8 bits | 768×512 | sim | 0.34 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente sentinel na cena (DOM ou canvas) | sim |
| `public/office/characters/vega.png` | PNG RGBA 8 bits | 768×512 | sim | 0.344 | grade lógica 1536×1024 armazenada em 50% (pixelScale 0.5): 6 colunas × 4 linhas = 24 quadros; linhas: frente, esquerda, direita, costas; colunas: parado, 4 de caminhada, sentado; recortes auditados em character-frames.js | sim | public/office/app.js, public/office/character-frames.js, public/office/v3.css, src/application/office-assets.ts | animação do agente vega na cena (DOM ou canvas) | sim |
| `public/office/cidade-faixa-dia.png` | PNG RGBA 8 bits | 1852×82 | não (opaco) | 1 | — | sim | public/office/v3.css, src/application/office-assets.ts | cidade atrás das janelas (dia), faixa no topo da cena | sim |
| `public/office/cidade-faixa-entardecer.png` | PNG RGBA 8 bits | 1852×82 | não (opaco) | 1 | — | sim | public/office/v3.css, src/application/office-assets.ts | cidade atrás das janelas (entardecer) | sim |
| `public/office/cidade-faixa-noite.png` | PNG RGBA 8 bits | 1852×82 | não (opaco) | 1 | — | sim | public/office/style.css, public/office/sw.js, public/office/v3.css, src/application/office-assets.ts | cidade atrás das janelas (noite) | sim |
| `public/office/icon-192.png` | PNG RGBA 8 bits | 192×192 | não (opaco) | 1 | — | sim | public/office/index.html, public/office/manifest.webmanifest, src/application/office-assets.ts | ícone do app (manifest/index.html) | sim |
| `public/office/icon-512.png` | PNG RGBA 8 bits | 512×512 | não (opaco) | 1 | — | sim | public/office/manifest.webmanifest, src/application/office-assets.ts | ícone do app (manifest) | sim |

### Peças-fonte do cenário (`public/office/assets/`)

Peças recortadas das folhas geradas (`scripts/assets/slice-sheet.ts`), na escala-fonte em que uma pessoa em pé tem 175 px. Só `cadeira-costas.png` é servida ao navegador (cadeira do canvas). As demais entram na cena pela montagem em `compor-cenario.html`. "Na cena" é o tamanho em px da cena de 1852×849, conforme `escala.json`. Âncora = ponto de apoio no chão, conforme `catalog.json`.

| Arquivo | Dimensões (px) | Fundo transparente | Fração opaca | Âncora (x,y) | Na cena | Servido | Uso atual | Reuso |
|---|---|---|---|---|---|---|---|---|
| `arquitetura-divisoria-vidro.png` | 406×266 | sim | 0.252 | 203,266 | largura 110 | não | janelas, portas, divisórias e rodapé | sim |
| `arquitetura-janela-canto.png` | 441×411 | sim | 0.371 | 221,411 | altura 92 | não | janelas, portas, divisórias e rodapé | sim |
| `arquitetura-janela-coluna.png` | 386×400 | sim | 0.45 | 193,400 | altura 92 | não | janelas, portas, divisórias e rodapé | sim |
| `arquitetura-janela.png` | 360×326 | sim | 0.366 | 180,326 | altura 84 | não | janelas, portas, divisórias e rodapé | sim |
| `arquitetura-porta.png` | 241×389 | sim | 0.411 | 121,389 | altura 100 | não | janelas, portas, divisórias e rodapé | sim |
| `arquitetura-rodape.png` | 434×65 | sim | 0.992 | 217,65 | largura 110 | não | janelas, portas, divisórias e rodapé | sim |
| `assento-poltrona-costas.png` | 105×89 | sim | 0.802 | 53,89 | largura 56 | não | assentos de estar e reunião (vistas) | sim |
| `assento-poltrona-frente.png` | 101×102 | sim | 0.805 | 51,102 | largura 56 | não | assentos de estar e reunião (vistas) | sim |
| `assento-poltrona-lado-esq.png` | 88×102 | sim | 0.694 | 44,102 | altura 56 | não | assentos de estar e reunião (vistas) | sim |
| `assento-poltrona-lado.png` | 88×102 | sim | 0.693 | 44,102 | altura 56 | não | assentos de estar e reunião (vistas) | sim |
| `assento-reuniao-costas.png` | 79×93 | sim | 0.706 | 40,93 | altura 52 | não | assentos de estar e reunião (vistas) | sim |
| `assento-reuniao-frente.png` | 78×98 | sim | 0.705 | 39,98 | altura 52 | não | assentos de estar e reunião (vistas) | sim |
| `assento-reuniao-lado-esq.png` | 82×105 | sim | 0.418 | 41,105 | altura 52 | não | assentos de estar e reunião (vistas) | sim |
| `assento-reuniao-lado.png` | 82×105 | sim | 0.415 | 41,105 | altura 52 | não | assentos de estar e reunião (vistas) | sim |
| `assento-sofa-costas.png` | 201×90 | sim | 0.827 | 101,90 | largura 110 | não | assentos de estar e reunião (vistas) | sim |
| `assento-sofa-frente.png` | 190×95 | sim | 0.818 | 95,95 | largura 110 | não | assentos de estar e reunião (vistas) | sim |
| `assento-sofa-lado-esq.png` | 98×107 | sim | 0.73 | 49,107 | altura 56 | não | assentos de estar e reunião (vistas) | sim |
| `assento-sofa-lado.png` | 98×107 | sim | 0.729 | 49,107 | altura 56 | não | assentos de estar e reunião (vistas) | sim |
| `cadeira-banqueta.png` | 213×356 | sim | 0.522 | 107,356 | altura 56 | não | cadeiras dos agentes e da reunião | sim |
| `cadeira-costas.png` | 279×372 | sim | 0.624 | 140,372 | altura 64 | sim | cadeiras dos agentes e da reunião | sim |
| `cadeira-frente.png` | 272×380 | sim | 0.65 | 136,380 | altura 64 | não | cadeiras dos agentes e da reunião | sim |
| `cadeira-lado.png` | 223×385 | sim | 0.522 | 112,385 | altura 64 | não | cadeiras dos agentes e da reunião | sim |
| `cadeira-poltrona.png` | 333×313 | sim | 0.838 | 167,313 | largura 62 | não | cadeiras dos agentes e da reunião | sim |
| `cadeira-reuniao.png` | 229×342 | sim | 0.637 | 115,342 | altura 56 | não | cadeiras dos agentes e da reunião | sim |
| `copa-bancada-pia.png` | 507×358 | sim | 0.836 | 254,358 | largura 112 | não | copa (canto inferior esquerdo) | sim |
| `copa-bebedouro.png` | 122×400 | sim | 0.947 | 61,400 | altura 72 | não | copa (canto inferior esquerdo) | sim |
| `copa-cafeteira.png` | 218×229 | sim | 0.852 | 109,229 | largura 34 | não | copa (canto inferior esquerdo) | sim |
| `copa-geladeira.png` | 219×463 | sim | 0.981 | 110,463 | altura 92 | não | copa (canto inferior esquerdo) | sim |
| `copa-maquina-snacks.png` | 261×463 | sim | 0.962 | 131,463 | altura 92 | não | copa (canto inferior esquerdo) | sim |
| `copa-micro-ondas.png` | 250×176 | sim | 0.949 | 125,176 | largura 40 | não | copa (canto inferior esquerdo) | sim |
| `decoracao-abajur.png` | 101×177 | sim | 0.714 | 51,177 | altura 30 | não | plantas e decoração | sim |
| `decoracao-costela-de-adao.png` | 320×379 | sim | 0.64 | 160,379 | altura 66 | não | plantas e decoração | sim |
| `decoracao-estante-livros.png` | 258×406 | sim | 0.934 | 129,406 | altura 88 | não | plantas e decoração | sim |
| `decoracao-globo.png` | 133×187 | sim | 0.66 | 67,187 | altura 30 | não | plantas e decoração | sim |
| `decoracao-luminaria-chao.png` | 113×433 | sim | 0.466 | 57,433 | altura 80 | não | plantas e decoração | sim |
| `decoracao-palmeira.png` | 340×459 | sim | 0.502 | 170,459 | altura 84 | não | plantas e decoração | sim |
| `decoracao-planta-pendente.png` | 213×457 | sim | 0.423 | 107,457 | altura 72 | não | plantas e decoração | sim |
| `decoracao-quadro.png` | 264×196 | sim | 1 | 132,196 | largura 52 | não | plantas e decoração | sim |
| `decoracao-relogio.png` | 173×180 | sim | 0.778 | 87,180 | largura 26 | não | plantas e decoração | sim |
| `decoracao-suculenta.png` | 95×129 | sim | 0.732 | 48,129 | altura 20 | não | plantas e decoração | sim |
| `eletronico-impressora.png` | 325×276 | sim | 0.895 | 163,276 | largura 60 | não | telões, racks e eletrônicos | sim |
| `eletronico-notebook.png` | 304×232 | sim | 0.848 | 152,232 | largura 34 | não | telões, racks e eletrônicos | sim |
| `eletronico-painel-led.png` | 506×121 | sim | 0.986 | 253,121 | largura 120 | não | telões, racks e eletrônicos | sim |
| `eletronico-rack-servidor.png` | 241×465 | sim | 0.945 | 121,465 | altura 110 | não | telões, racks e eletrônicos | sim |
| `eletronico-telao.png` | 655×266 | sim | 0.999 | 328,266 | largura 250 | não | telões, racks e eletrônicos | sim |
| `eletronico-tv-parede.png` | 376×222 | sim | 0.997 | 188,222 | largura 110 | não | telões, racks e eletrônicos | sim |
| `estacao-gaveteiro.png` | 152×247 | sim | 0.942 | 76,247 | altura 50 | não | mesas dos agentes | sim |
| `estacao-lixeira.png` | 124×164 | sim | 0.842 | 62,164 | altura 30 | não | mesas dos agentes | sim |
| `estacao-mesa-2-monitores.png` | 427×306 | sim | 0.728 | 214,306 | largura 140 | não | mesas dos agentes | sim |
| `estacao-mesa-3-monitores.png` | 501×317 | sim | 0.708 | 251,317 | largura 165 | não | mesas dos agentes | sim |
| `estacao-mesa-em-l.png` | 596×322 | sim | 0.538 | 298,322 | largura 190 | não | mesas dos agentes | sim |
| `estacao-mesa-simples.png` | 440×225 | sim | 0.697 | 220,225 | largura 140 | não | mesas dos agentes | sim |
| `estar-mesa-centro.png` | 287×221 | sim | 0.698 | 144,221 | largura 76 | não | lounge e sala de reunião | sim |
| `estar-mesa-reuniao.png` | 698×230 | sim | 0.667 | 349,230 | largura 200 | não | lounge e sala de reunião | sim |
| `estar-poltrona.png` | 249×288 | sim | 0.821 | 125,288 | largura 58 | não | lounge e sala de reunião | sim |
| `estar-puff.png` | 127×134 | sim | 0.855 | 64,134 | largura 28 | não | lounge e sala de reunião | sim |
| `estar-sofa.png` | 690×293 | sim | 0.858 | 345,293 | largura 160 | não | lounge e sala de reunião | sim |
| `estar-tapete.png` | 473×262 | sim | 0.999 | 237,262 | largura 170 | não | lounge e sala de reunião | sim |
| `item-aparador.png` | 150×69 | sim | 0.834 | 75,69 | largura 60 | não | objetos de parede e chão | sim |
| `item-arandela.png` | 26×40 | sim | 0.754 | 13,40 | altura 14 | não | objetos de parede e chão | sim |
| `item-arquivo-aco.png` | 64×130 | sim | 0.959 | 32,130 | altura 50 | não | objetos de parede e chão | sim |
| `item-cabideiro.png` | 59×175 | sim | 0.36 | 30,175 | altura 70 | não | objetos de parede e chão | sim |
| `item-coluna.png` | 91×280 | sim | 0.88 | 46,280 | altura 120 | não | objetos de parede e chão | sim |
| `item-extintor.png` | 31×55 | sim | 0.629 | 16,55 | altura 18 | não | objetos de parede e chão | sim |
| `item-mapa-mundi.png` | 120×77 | sim | 0.999 | 60,77 | largura 48 | não | objetos de parede e chão | sim |
| `item-mural-cortica.png` | 120×81 | sim | 0.998 | 60,81 | largura 40 | não | objetos de parede e chão | sim |
| `item-planta-suporte.png` | 92×150 | sim | 0.489 | 46,150 | altura 52 | não | objetos de parede e chão | sim |
| `item-prateleira-parede.png` | 140×58 | sim | 0.605 | 70,58 | largura 46 | não | objetos de parede e chão | sim |
| `item-quadro-branco.png` | 227×175 | sim | 0.688 | 114,175 | largura 70 | não | objetos de parede e chão | sim |
| `item-vaso-galhos.png` | 76×150 | sim | 0.358 | 38,150 | altura 50 | não | objetos de parede e chão | sim |
| `mesa-bloco-notas.png` | 116×113 | sim | 0.659 | 58,113 | largura 12 | não | objetos sobre as mesas | sim |
| `mesa-calculadora.png` | 106×101 | sim | 0.747 | 53,101 | largura 11 | não | objetos sobre as mesas | sim |
| `mesa-caneca.png` | 77×117 | sim | 0.494 | 39,117 | altura 9 | não | objetos sobre as mesas | sim |
| `mesa-fone-ouvido.png` | 119×102 | sim | 0.561 | 60,102 | largura 13 | não | objetos sobre as mesas | sim |
| `mesa-garrafa-agua.png` | 49×125 | sim | 0.859 | 25,125 | altura 13 | não | objetos sobre as mesas | sim |
| `mesa-livros-empilhados.png` | 143×110 | sim | 0.747 | 72,110 | largura 15 | não | objetos sobre as mesas | sim |
| `mesa-pilha-papeis.png` | 121×88 | sim | 0.651 | 61,88 | largura 14 | não | objetos sobre as mesas | sim |
| `mesa-planta-mesa.png` | 116×119 | sim | 0.58 | 58,119 | altura 14 | não | objetos sobre as mesas | sim |
| `mesa-porta-lapis.png` | 60×107 | sim | 0.79 | 30,107 | altura 12 | não | objetos sobre as mesas | sim |
| `mesa-porta-retrato.png` | 115×99 | sim | 0.786 | 58,99 | largura 12 | não | objetos sobre as mesas | sim |
| `mesa-tablet.png` | 153×94 | sim | 0.781 | 77,94 | largura 16 | não | objetos sobre as mesas | sim |
| `mesa-telefone.png` | 146×107 | sim | 0.72 | 73,107 | largura 16 | não | objetos sobre as mesas | sim |
| `parede-canto.png` | 507×379 | sim | 0.678 | 254,379 | altura 98 | não | paredes | sim |
| `parede-curta.png` | 207×233 | sim | 0.967 | 104,233 | altura 60 | não | paredes | sim |
| `parede-fim.png` | 69×233 | sim | 0.891 | 35,233 | altura 60 | não | paredes | sim |
| `parede-janela-interna.png` | 572×233 | sim | 0.754 | 286,233 | altura 60 | não | paredes | sim |
| `parede-reta.png` | 709×233 | sim | 0.978 | 355,233 | altura 60 | não | paredes | sim |
| `parede-vao-porta.png` | 631×233 | sim | 0.839 | 316,233 | altura 60 | não | paredes | sim |

## Arquivos de dados ligados aos assets

| Arquivo | Conteúdo | Reuso |
|---|---|---|
| `public/office/assets/catalog.json` | tamanho, âncora no chão, célula na folha e fração opaca de cada peça | sim |
| `public/office/assets/escala.json` | tamanho de cada peça na cena (pessoa = 87 px) | sim; ganha entradas para as peças novas |
| `public/office/assets/cenario-modular.json` | planta da cena: janelas, pisos, paredes, corredores, telões e áreas clicáveis | modificar se a planta mudar |
| `public/office/character-frames.js` | recortes auditados das 8 folhas de personagem (sha256, cortes de coluna, pivôs) | sim |
| `public/office/sprites.js` | recortes auditados de `agent-sprites.png` | sim |
| `public/office/scene-quads.js` | cantos exatos das 24 telas das mesas e dos telões | sim |
| `docs/SPRITE_GENERATION.json` | texto usado para gerar as folhas de personagem (contrato 6 × 4) | modelo para pedidos animados |
