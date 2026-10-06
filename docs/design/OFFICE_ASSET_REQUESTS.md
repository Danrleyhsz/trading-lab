# Escritório 2.0: manifesto de pedidos de arte

Contrato de produção para o ChatGPT, feito **depois** da auditoria (`OFFICE_2_AUDITORIA.md`), do inventário (`OFFICE_ASSET_INVENTORY.md`), do mapa backend → visual (`OFFICE_BACKEND_VISUAL_MAP.md`) e da especificação visual (`OFFICE_VISUAL_SPEC.md`).

Referência visual obrigatória: `docs/design/references/tradinglab-office-2-approved-reference.jpg`.

Resumo: **21 pedidos → 74 imagens finais**.

| Prioridade | Pedidos | Imagens finais |
|---|---|---|
| P0 | 5 | 26 |
| P1 | 14 | 46 |
| P2 | 2 | 2 |

O que **não** é pedido, porque é feito por código: pisos, paredes, vidro, guarda-corpos, fachada do prédio, faixas de LED, sombras, conteúdo das telas, rótulos e o letreiro "TRADINGLAB". Detalhes na `OFFICE_VISUAL_SPEC.md`, seção 4.

## 0. Regras para todos os pedidos

### 0.1 Tela de geração, recorte e entrega
- **Tela:** todo pedido é gerado em **1536 × 1024 px**, o tamanho que o gerador entrega. O arquivo final sai **por código**, com a regra de cada pedido. Não pedir ao gerador o tamanho final.
- **Branch:** entrega no branch **`assets/escritorio-2`**, criado a partir da `main`. Nunca na `main`.
  - `art/office2/fonte/<pedido>.png`: imagem gerada, sem alteração (sempre).
  - Arquivos finais nos destinos indicados, quando o recorte for feito por código com a regra exata. Se não for possível, entregar só a fonte; a integração recorta aqui com a mesma regra.
  - `art/office2/MANIFESTO_GERACAO.md`: o que foi gerado, as tentativas e qualquer desvio.
- **Anexar em todo pedido:** a referência aprovada. Nos pedidos de personagem, anexar também a folha atual do agente (identidade).

### 0.2 Estilo comum (começo de todo texto de geração)
> Pixel art de alta qualidade no estilo da imagem de referência anexada (escritório TradingLab no 30º andar, vista ISOMÉTRICA 2:1 de cima, à noite, interior com luz quente). Contornos escuros finos, sombreamento de 3 a 4 tons, paleta da referência: piso bege #d9cdb4, carpete escuro #2b3140, madeira #8b5a2c/#c07a3c, painéis grafite #2a2f3a/#3a404c, LED quente #ffd27a, telas azul-marinho lisas #0e2150, plantas #2c8a48/#62d07a. Sem texto, sem letras, sem números, sem logotipos, sem marcas d'água, sem pessoas.

### 0.3 Proibido em todos os pedidos
- texto, letras, números, logotipos e marca d'água (o letreiro e os rótulos são HTML/código);
- pessoas, exceto nas folhas de personagem;
- arte, logo ou nome do ATS-MATRIX, Matrix ou de outro jogo/marca;
- conteúdo nas telas: todas lisas `#0e2150`, porque o conteúdo é desenhado por código só com dado real;
- verde e vermelho de status dentro de ícones (cores reservadas ao código);
- sombra projetada no chão (feita por código);
- cenário em volta dos objetos isolados.

### 0.4 Geometria isométrica dos objetos (pedidos PROPS-*)
- **Escala final:** tile de **48 × 24** (losango 2:1), parede 72 px, pessoa em pé 45 px. **A fonte é desenhada em 2×** (tile 96 × 48, pessoa 90 px). **1 pixel de arte = 2 × 2 px**, alinhado ao retângulo. A redução final é × 0,5 por vizinho mais próximo.
- **Objeto de chão** com área ocupada de **a × b tiles** (`a` ao longo de `i`, que desce para a direita; `b` ao longo de `j`, que desce para a esquerda) e altura **h** acima do piso:
  - retângulo final = **largura (a+b)·24 × altura (a+b)·12 + h**;
  - o losango da base ocupa o pé do retângulo, com o canto de cima em **(b·24, h)**, que é o **ponto de apoio**;
  - o objeto não sai do retângulo.
- **Objeto de parede** (na parede `j0`, que desce para a direita): paralelogramo de **n tiles** de largura e altura **h**; retângulo final **n·24 × n·12 + h**; canto superior esquerdo em (0, 0). Na parede `i0`, o código espelha na horizontal.
- **Frente para o observador:** monitores ficam na borda de trás da mesa, com a tela virada para quem olha. A cadeira e o agente ficam do lado de cá, de costas.
- **Retângulos na folha:** cada objeto vai no **retângulo de fonte** indicado (x, y, largura, altura em px da folha de 1536 × 1024). Fora dos retângulos, a folha é 100% transparente. Sem grade desenhada.

### 0.5 Folhas em grade (ícones, quadros e personagens)
- **Grade:** 1536 × 1024 dividida em **6 colunas × 4 linhas de células de 256 × 256** (coluna 1 = x 0 a 255; linha 1 = y 0 a 255). Fundo 100% transparente. Nada atravessa a borda da célula. Células sem uso ficam vazias.
- **Pixel de arte declarado:** em cada pedido, para a redução por vizinho mais próximo dar o tamanho final sem borrar.

---

## P0

### TL-O2-SKYLINE-NOITE: cidade à noite (camada L0)
| Campo | Valor |
|---|---|
| Final | `public/office/office2/cidade-noite.png`, **1536 × 864**, opaco |
| Fonte | `art/office2/fonte/skyline-noite.png` (1536 × 1024); final = faixa y 80 a 943 |
| Vista | de cima e de longe, como na referência: olhamos para baixo, a cerca de 30°, sobre uma cidade de arranha-céus vista de um 30º andar |
| Descrição | Cidade densa à noite (inspiração: São Paulo, sem marco reconhecível): topos e laterais de prédios com janelas acesas `#ffcf6a`, ruas iluminadas lá embaixo, horizonte com névoa azul. Céu `#0b1426` a `#1a2a4a` no alto. |
| Composição | o centro (x 300 a 1236, y 150 a 800 do final) fica coberto pelo prédio do escritório, então pode ser simples; detalhe forte nas bordas esquerda, direita e de baixo |
| Animação | não (o piscar das janelas é feito por código) |
| Variações | dia e entardecer em P2, com a mesma composição |
| Proibido | regra 0.3; lua, sol ou outro destaque no centro |
| Integração | L0 com paralaxe de até 16 px. Peso-meta ≤ 450 KB. |

### TL-O2-PROPS-RING: Ring (operações e execução) e telas de parede
Fonte `art/office2/fonte/props-ring.png` (1536 × 1024, transparente, regra 0.4). Finais em `public/office/office2/props/`.

| Arquivo final | a × b | h | Final (px) | Retângulo na fonte (x, y, l, a) | Apoio (final) | Descrição |
|---|---|---|---|---|---|---|
| `mesa-curva-operacoes.png` | 5 × 3 | 40 | 192 × 136 | 32, 32, 384, 272 | (72, 40) | mesa de operações em arco (concavidade para o observador), tampo grafite com LED quente na borda, **5 monitores lisos** na borda de trás virados para o observador, teclados |
| `mesa-monitores.png` | 3 × 2 | 36 | 120 × 96 | 448, 32, 240, 192 | (48, 36) | mesa reta grafite com **3 monitores lisos** na borda de trás, teclado e caneca; usada no Horizon, no Risk e no Backtest |
| `telao-parede.png` | parede, 4 tiles | 48 | 96 × 96 | 720, 32, 192, 192 | canto sup. esq. (0, 0) | telão de parede com moldura grafite fina, tela lisa; paralelogramo da parede `j0` |
| `cadeira-frente.png` | 1 × 1 | 24 | 48 × 48 | 944, 32, 96, 96 | (24, 24) | cadeira de escritório preta vista de frente (assento para o observador) |
| `cadeira-costas.png` | 1 × 1 | 24 | 48 × 48 | 1072, 32, 96, 96 | (24, 24) | a mesma cadeira vista de costas |

Prioridade **P0**. Integração: os quadriláteros dos monitores e do telão são medidos depois da entrega e gravados no mapa, como em `scene-quads.js`.

### TL-O2-PROPS-SALAS: móveis de reunião, recepção, convivência e plantas
Fonte `art/office2/fonte/props-salas.png`. Finais em `public/office/office2/props/`.

| Arquivo final | a × b | h | Final | Retângulo na fonte | Apoio | Descrição |
|---|---|---|---|---|---|---|
| `mesa-reuniao.png` | 5 × 2 | 16 | 168 × 100 | 32, 32, 336, 200 | (48, 16) | mesa de reunião longa de madeira escura, sem cadeiras; Nexus e Diagnóstico |
| `balcao-recepcao.png` | 4 × 2 | 28 | 144 × 100 | 400, 32, 288, 200 | (48, 28) | balcão de recepção curvo cinza-claro com LED quente embaixo, um monitor liso de costas |
| `sofa.png` | 3 × 1 | 24 | 96 × 72 | 720, 32, 192, 144 | (24, 24) | sofá de 3 lugares bege com almofadas |
| `jardineira.png` | 3 × 1 | 32 | 96 × 80 | 944, 32, 192, 160 | (24, 32) | jardineira longa de madeira com plantas tropicais |
| `poltrona.png` | 1 × 1 | 24 | 48 × 48 | 1168, 32, 96, 96 | (24, 24) | poltrona bege |
| `planta-alta.png` | 1 × 1 | 48 | 48 × 72 | 1296, 32, 96, 144 | (24, 48) | planta alta em vaso grafite |
| `mesa-centro.png` | 2 × 1 | 10 | 72 × 46 | 32, 288, 144, 92 | (24, 10) | mesa de centro baixa de madeira escura |
| `planta-baixa.png` | 1 × 1 | 20 | 48 × 44 | 208, 288, 96, 88 | (24, 20) | planta pequena em vaso |

Prioridade **P0**.

### TL-O2-PROPS-LAB: Stress Lab, Backtest, Risk e Auditoria
Fonte `art/office2/fonte/props-lab.png`. Finais em `public/office/office2/props/`.

| Arquivo final | a × b | h | Final | Retângulo na fonte | Apoio | Descrição |
|---|---|---|---|---|---|---|
| `esteira.png` | 2 × 1 | 32 | 72 × 68 | 32, 32, 144, 136 | (24, 32) | esteira de corrida grafite com painel liso |
| `saco-pancada.png` | 1 × 1 | 56 | 48 × 80 | 208, 32, 96, 160 | (24, 56) | saco de pancada vermelho-escuro pendurado num suporte |
| `rack-halteres.png` | 2 × 1 | 24 | 72 × 60 | 336, 32, 144, 120 | (24, 24) | suporte com halteres |
| `bancada-teste.png` | 2 × 2 | 32 | 96 × 80 | 512, 32, 192, 160 | (48, 32) | aparelho de teste compacto: base grafite, coluna curta e emissor redondo apagado em cima |
| `estante-arquivo.png` | 2 × 1 | 56 | 72 × 92 | 736, 32, 144, 184 | (24, 56) | estante com pastas e caixas de arquivo (lombadas lisas) |
| `armarios-arquivo.png` | 4 × 1 | 56 | 120 × 116 | 912, 32, 240, 232 | (24, 56) | fileira de 4 armários de arquivo grafite com puxadores |
| `rack-servidor.png` | 1 × 1 | 64 | 48 × 88 | 1184, 32, 96, 176 | (24, 64) | rack de servidor com LEDs pequenos (decoração estática) |

Prioridade **P0**. O `saco-pancada` pode ter vermelho-escuro `#8a2a2a`, porque é objeto e não ícone de status.

### TL-O2-STAGE-ICONS: os 5 estágios do Anel de Decisão
| Campo | Valor |
|---|---|
| Fonte | `art/office2/fonte/icones-estagios.png`, grade 256 (regra 0.5), **linha 1, colunas 1 a 5** |
| Pixel de arte | 4 × 4 px; desenho na área central de 224 × 224 da célula |
| Finais | `public/office/office2/ui/estagio-trader.png`, `estagio-risco.png`, `estagio-validador.png`, `estagio-execucao.png`, `estagio-auditoria.png`; cada célula × 0,25 → **64 × 64**, transparente |
| Descrição | 1 prancheta com seta em zigue-zague subindo. 2 escudo com cadeado pequeno. 3 lupa sobre lista de 3 caixinhas com tique. 4 ficha de ordem de papel com engrenagem pequena. 5 livro-razão fechado com fita e carimbo. |
| Paleta | grafite `#1b2133`, ciano `#5fb6ff`, dourado `#ffd27a`, creme `#f2e6c9`; sem verde e sem vermelho |
| Integração | o estado é um anel CSS em volta do ícone |

Prioridade **P0**.

---

## P1

### TL-O2-PROPS-COPA: cozinha e café
Fonte `art/office2/fonte/props-copa.png`. Finais em `public/office/office2/props/`.

| Arquivo final | a × b | h | Final | Retângulo na fonte | Apoio | Descrição |
|---|---|---|---|---|---|---|
| `bancada-cozinha.png` | 4 × 1 | 40 | 120 × 100 | 32, 32, 240, 200 | (24, 40) | bancada com cafeteira expresso e micro-ondas, LED quente embaixo |
| `banqueta.png` | 1 × 1 | 20 | 48 × 44 | 304, 32, 96, 88 | (24, 20) | banqueta alta de madeira |
| `geladeira.png` | 1 × 1 | 56 | 48 × 80 | 432, 32, 96, 160 | (24, 56) | geladeira grafite com porta de vidro escura |
| `mesa-redonda.png` | 2 × 2 | 14 | 96 × 62 | 560, 32, 192, 124 | (48, 14) | mesa redonda escura |
| `cadeira-cafe.png` | 1 × 1 | 22 | 48 × 46 | 784, 32, 96, 92 | (24, 22) | cadeira de café preta |

### TL-O2-PROPS-LOBBY: elevadores e catracas
Fonte `art/office2/fonte/props-lobby.png`. Finais em `public/office/office2/props/`.

| Arquivo final | a × b | h | Final | Retângulo na fonte | Apoio | Descrição |
|---|---|---|---|---|---|---|
| `portas-elevador.png` | parede, 3 tiles | 64 | 72 × 100 | 32, 32, 144, 200 | canto sup. esq. (0, 0) | 2 portas de elevador de aço escovado com LED quente vertical entre elas, na parede `j0` |
| `catraca.png` | 1 × 1 | 28 | 48 × 52 | 208, 32, 96, 104 | (24, 28) | catraca de vidro e aço |

### TL-O2-ZONE-EMBLEMS: emblemas das placas das zonas
| Campo | Valor |
|---|---|
| Fonte | `art/office2/fonte/emblemas-zonas.png`, grade 256: linha 1 colunas 1 a 6, linha 2 colunas 1 a 4 |
| Pixel de arte | **8 × 8 px**; o desenho ocupa a célula toda (32 × 32 pixels de arte) |
| Finais | `public/office/office2/ui/zona-horizon.png`, `zona-nexus.png`, `zona-ring.png`, `zona-stress-lab.png`, `zona-risk.png`, `zona-auditoria.png`, `zona-diagnostico.png`, `zona-backtest.png`, `zona-execucao.png`, `zona-marca.png`; cada célula × 0,125 → **32 × 32**, transparente |
| Descrição (na ordem) | 1 gráfico de barras e linha numa moldura. 2 balão de conversa com 3 pontos. 3 anel com 5 marcas. 4 frasco de laboratório. 5 escudo. 6 livro-razão. 7 lupa sobre linha do tempo. 8 ampulheta sobre uma grade. 9 ficha de ordem de papel. 10 marca TradingLab: 3 barras subindo dentro de um prédio estilizado (como o ícone da referência, sem texto) |
| Paleta | ciano `#5fb6ff` e branco-azulado `#dbe9ff` sobre transparente (vão em placas escuras desenhadas por código) |

### TL-O2-AGENT-STATE-ICONS: estado sobre a cabeça dos agentes
| Campo | Valor |
|---|---|
| Fonte | `art/office2/fonte/icones-estado-agente.png`, grade 256, **linha 1, colunas 1 a 6** |
| Pixel de arte | 8 × 8 px |
| Finais | `public/office/office2/ui/estado-trabalhando.png`, `estado-aguardando.png`, `estado-bloqueado.png`, `estado-sem-dado.png`, `estado-mensagem.png`, `estado-pausa.png`; × 0,125 → **32 × 32** |
| Descrição | selo redondo (círculo de 28 pixels de arte, fundo `#0a1b33`, borda clara) com: 1 engrenagem; 2 ampulheta; 3 mão aberta levantada; 4 tomada desconectada; 5 envelope; 6 xícara de café |
| Integração | "pausa" só nos passeios cosméticos (STATIC); "sem dado" = UNKNOWN; os demais vêm de `/agents` |

### TL-O2-SCENARIO-ICONS: os 14 cenários do Stress Lab
| Campo | Valor |
|---|---|
| Fonte | `art/office2/fonte/icones-cenarios.png`, grade 256: linha 1 colunas 1 a 6, linha 2 colunas 1 a 6, linha 3 colunas 1 a 2 |
| Pixel de arte | 4 × 4 px, área central de 224 × 224 |
| Finais | `public/office/office2/ui/cenario-<id>.png` × 0,25 → **64 × 64**. Ids na ordem: baseline, abrupt-move, volatility-spike, spread-widening, stale-quote, stale-candles, missing-candle, provider-outage, backup-venue-divergence, loss-limit, kill-switch, malformed-snapshot, duplicate-out-of-order, restart (iguais a `STRESS_SCENARIOS` em `src/application/stress-lab.ts`) |
| Descrição (na ordem) | 1 linha estável com tique. 2 raio sobre candle. 3 onda de grande amplitude. 4 duas barras afastadas com seta dupla. 5 relógio com símbolo de pausa. 6 três candles com relógio pequeno. 7 quatro candles com lacuna tracejada no terceiro. 8 nuvem com cabo partido. 9 duas torres com setas divergindo. 10 seta para baixo batendo numa barreira. 11 alavanca desligada. 12 folha rachada. 13 duas fichas trocando de lugar. 14 seta circular em volta de liga/desliga |
| Paleta | igual à dos estágios; candles em ciano e creme |

### TL-O2-STRESS-RIG-ANIM: bancada de teste animada (só durante simulação)
| Campo | Valor |
|---|---|
| Fonte | `art/office2/fonte/bancada-teste-anim.png`, grade 256, **linha 1, colunas 1 a 6** = quadros 1 a 6 |
| Quadro | em cada célula, o mesmo aparelho de `bancada-teste.png` (anexar), desenhado em 2× no retângulo **x 32 a 223, y 64 a 223** da célula (192 × 160), na mesma posição em todos os quadros |
| Final | `public/office/office2/props/bancada-teste-anim.png`: cada retângulo × 0,5 → quadro de **96 × 80**, numa tira horizontal de **576 × 80** |
| Animação | 8 FPS, repete 1 → 6. 1 emissor com brilho fraco; 2 a 4 anel de pulso ciano crescendo; 5 anel quase transparente; 6 igual ao 1. Fica parada no quadro 1 com a aba oculta ou com `prefers-reduced-motion`. |
| Integração | substitui `bancada-teste.png` no mesmo ponto de apoio, só com um relatório SIMULATION aberto |

### TL-O2-CHAR-<agente>: folhas isométricas dos 8 agentes (8 pedidos)
Um pedido por agente: atlas, euler, flux, nova, oracle, satoshi, sentinel, vega.

| Campo | Valor |
|---|---|
| Fonte | `art/office2/fonte/personagem-<agente>.png`, grade 256 (regra 0.5): **6 colunas × 4 linhas, todas usadas** |
| Identidade | anexar `public/office/characters/<agente>.png`: mesmo cabelo, roupa, paleta e proporção chibi; só a câmera muda |
| Linhas | 1 **frente-direita** (SE, olhando para baixo-direita); 2 **frente-esquerda** (SW); 3 **costas-direita** (NE, de costas, indo para cima-direita); 4 **costas-esquerda** (NW) |
| Colunas | 1 parado; 2 a 5 ciclo de caminhada de 4 quadros (contato do pé esquerdo, passagem, contato do pé direito, passagem oposta); 6 sentado, joelhos dobrados, sem cadeira |
| Âncora | em cada célula, x = 128 e sola em y = 240; figura de cerca de 96 × 180, inteira dentro da célula, mesma escala nos 24 quadros |
| Pixel de arte | 4 × 4 px |
| Final | `public/office/office2/characters/<agente>.png`, folha × 0,25 → **384 × 256** (células de 64 × 64; pessoa ≈ 45 px) |
| Animação | caminhada a 8 FPS (colunas 2 a 5); parado e sentado são quadros únicos |
| Proibido | regra 0.3; sombra; cadeira; inclinar ou esticar a mesma pose para fingir outra direção |
| Integração | até a entrega, a F1 usa as folhas atuais com mapeamento diagonal (`OFFICE_VISUAL_SPEC.md`, seção 9) |

---

## P2

### TL-O2-SKYLINE-DIA e TL-O2-SKYLINE-ENTARDECER
| Campo | Valor |
|---|---|
| Finais | `public/office/office2/cidade-dia.png` e `cidade-entardecer.png`, **1536 × 864**, opacos (faixa y 80 a 943 da geração) |
| Descrição | **a mesma composição** de `cidade-noite.png` (anexar como referência de composição), com céu de dia (azul claro, nuvens) ou de entardecer (laranja e lilás), janelas apagadas ou meio acesas |
| Integração | troca pelo relógio real, sem pular de posição |

---

## Conferência de completude (segunda passada)

| Pergunta do handoff | Resposta |
|---|---|
| Toda zona tem a estrutura completa? | Sim. Piso, parede, vidro, guarda-corpo e fachada são feitos por código para todas as 16 áreas do `office-scene-map.json`; não dependem de arte. |
| Todo módulo interativo tem telas e móveis? | Horizon: `mesa-monitores` ×2 + `telao-parede` ×2. Nexus: `mesa-reuniao` + `cadeira-*` + `telao-parede`. Ring: `mesa-curva-operacoes` ×2 + `telao-parede` ×2. Risk: `mesa-monitores` + `estante-arquivo` + `telao-parede`. Stress Lab: `esteira`, `saco-pancada`, `rack-halteres`, `bancada-teste` (+ animação) + `telao-parede`. Backtest: `mesa-monitores` + `telao-parede`. Auditoria: `armarios-arquivo` + `rack-servidor` + `telao-parede`. Diagnóstico: `mesa-reuniao` + `telao-parede`. Recepção: `balcao-recepcao`. Elevadores: `portas-elevador` + `catraca`. Lazer: `sofa`, `poltrona`, `mesa-centro`, `jardineira`, `bancada-cozinha`, `banqueta`, `geladeira`, `mesa-redonda`, `cadeira-cafe`, plantas. |
| Todo estado de agente tem sprite? | Parado, caminhando (4 quadros) e sentado, nas 4 diagonais: TL-O2-CHAR-* (P1), com as folhas atuais mapeadas até lá. Trabalhando, aguardando, bloqueado, sem dado, mensagem e pausa: TL-O2-AGENT-STATE-ICONS. |
| Transições, portas e bordas de caminho? | As portas são vãos na parede (código) e as rotas são A* na grade do mapa; não precisam de arte. Elevadores e catracas são o ponto de chegada. |
| Fundo e exterior? | TL-O2-SKYLINE-NOITE (P0); dia e entardecer (P2). A fachada do prédio é feita por código. |
| Status e efeitos? | Estados dos estágios: ícones P0 + anel CSS. Estados dos agentes: P1. Cenários: P1. Brilho de tela e pulso de LED: código. |
| Precisa de variante para notebook ou celular? | Não. Os mesmos arquivos, com zoom inteiro (1× e 2×). No celular a cena vira imagem rolável e os painéis são HTML. |
| Algum asset duplica um existente? | Não. As peças 3/4 atuais têm outra perspectiva e não servem na cena isométrica; ficam para o escritório atual (rollback). Os retratos (`agent-sprites.png`) e os ícones do app são reusados e não são pedidos. |
| Dimensões e nomes executáveis sem adivinhar? | Sim. Todo objeto tem área ocupada, altura, tamanho final, retângulo exato na fonte e ponto de apoio. Toda folha em grade tem célula, pixel de arte e fator de redução. Toda imagem tem nome e destino finais. |

Itens que saíram desde a versão anterior deste manifesto: os 5 fundos de sala 1536 × 864 (Anel, Laboratório, Horizonte, Comunicação, Diagnóstico). Com a referência aprovada, os módulos vivem dentro da cena isométrica única, com foco por zoom, e não em salas separadas.
