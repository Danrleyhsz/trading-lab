# Escritório 2.0: manifesto de pedidos de arte

Contrato de produção para o ChatGPT. Cada item pode ser gerado sem adivinhar nada. O que não estiver aqui não deve ser gerado.

Resumo: **10 pedidos** (3 P0, 6 P1, 1 P2), cada um com 1 imagem-fonte, que viram **37 imagens finais** depois do recorte.

## 0. Regras que valem para todos os pedidos

### 0.1 Tela de geração e entrega
- **Tela:** todo pedido é gerado em **1536 × 1024 px**, o tamanho que o gerador de imagens entrega.
- **Arquivo final:** é obtido **por código** (recorte, grade e redução por vizinho mais próximo), conforme a regra de cada item. Não pedir ao gerador o tamanho final.
- **Branch:** entrega no branch `assets/escritorio-2`, criado a partir da `main`. Nunca na `main`.
  - `art/office2/fonte/<nome-da-fonte>.png`: a imagem gerada, sem alteração (sempre entregar).
  - `public/office/rooms/` e `public/office/ui/`: os arquivos finais, quando o recorte for feito por código com a regra exata do item. Se não for possível, entregar só a fonte; a integração faz o recorte aqui com a mesma regra.
  - `art/office2/MANIFESTO_GERACAO.md`: o que foi criado, as tentativas e qualquer desvio (tamanho, posição, cor).

### 0.2 Referências para anexar
- **Estilo:** `public/office/cenario-modular.png` (a cena atual). O arquivo `office-reference-v2.png`, citado em `docs/ASSETS_MODULARES.md`, não existe mais.
- **Escala de pessoa:** `public/office/characters/nova.png`. Nos fundos de sala, uma pessoa em pé teria **150 px de altura** no arquivo final de 1536 × 864.

### 0.3 Estilo comum (vai no começo de todo texto de geração)
> Pixel art de alta qualidade no mesmo estilo da imagem de referência anexada (escritório de trading em pixel art, vista de cima em 3/4: vemos o tampo e a frente dos objetos, não isométrico). Contornos escuros finos, sombreamento suave em 3 a 4 tons, paleta da referência: madeira quente #c07a3c/#8b5a2c, paredes azul-ardósia #2e3b60/#3f5080, telas azul-marinho lisas #0e2150, metal grafite #1b2133, plantas #2c8a48/#62d07a, luz quente #ffd27a. Sem texto, sem letras, sem números, sem logotipos, sem marcas d'água, sem pessoas.

### 0.4 Proibido em todos os pedidos
- texto, letras, números, símbolos de moeda, logotipos e marcas d'água;
- pessoas e personagens (os agentes são desenhados por código com as folhas existentes);
- qualquer arte, logo ou nome do ATS-MATRIX ou de outro jogo/marca;
- conteúdo em telas, que devem ser lisas `#0e2150`;
- verde ou vermelho de "status" dentro dos ícones (essas cores são do código: aprovado `#22e39f`, rejeitado `#ff6b6b`);
- sombra projetada no chão em sprites transparentes (a sombra é feita por código).

### 0.5 Regra dos fundos de sala (itens com "Recorte 16:9")
- **Saída:** gerar 1536 × 1024 e recortar a faixa **y 80 a 943**, que vira o final de **1536 × 864**.
- **Margens:** os 80 px de cima e de baixo da geração podem ter qualquer coisa coerente, porque são descartados.
- **Coordenadas:** todas as posições abaixo são do **arquivo final**, com **tolerância de ±40 px**. Depois da entrega, a integração mede os retângulos reais das telas (como em `scene-quads.js`).
- **Faixa livre:** os 100 px de baixo do final (y 764 a 863) ficam só com piso liso, porque ali entram controles HTML.
- **Fundo:** opaco (PNG sem transparência). Meta de peso: ≤ 400 KB depois de otimizar.

### 0.6 Regra das folhas de ícones e quadros (itens com "Grade 256")
- **Grade:** tela 1536 × 1024 dividida em **6 colunas × 4 linhas de células de 256 × 256** (coluna 1 = x 0 a 255; linha 1 = y 0 a 255). Fundo 100% transparente (RGBA). Nada atravessa a borda da célula. Sem linhas de grade desenhadas.
- **Células sem uso:** ficam vazias e transparentes.
- **Grade de pixel declarada:** cada pixel de arte é um bloco quadrado de N × N px da imagem, alinhado à célula. A redução final por vizinho mais próximo dá o tamanho final sem borrar.

---

## P0

### TL-O2-RING-ROOM-001: fundo do Anel de Decisão
| Campo | Valor |
|---|---|
| Arquivo final | `sala-anel-decisao.png` |
| Destino | `public/office/rooms/sala-anel-decisao.png` (fonte: `art/office2/fonte/sala-anel-decisao-1536x1024.png`) |
| Módulo | Anel de Decisão (`OFFICE_VISUAL_SPEC.md` 3.1) |
| Tela | geração 1536 × 1024 → final **1536 × 864** (recorte 16:9, regra 0.5) |
| Fundo transparente | não |
| Vista | 3/4 de cima, igual à cena atual; pessoa em pé = 150 px |
| Descrição | Sala de controle de operações paper. Parede do fundo azul-ardósia. Cinco consoles iguais de madeira e grafite em ferradura aberta para o observador, cada um com **um** monitor de frente para o observador, tela lisa. No piso do centro, um anel embutido de metal dourado discreto (só o contorno), visto em perspectiva. No alto da parede do fundo, um telão largo de tela lisa. Duas plantas altas nos cantos do fundo. |
| Posições (final, ±40 px) | telão: x 418 a 1118, y 60 a 220. Telas dos consoles (≈ 170 × 100 cada), centros em (250, 470), (520, 380), (768, 350), (1016, 380), (1286, 470). Na frente de cada console, 70 px de piso livre (o agente sentado é desenhado ali). Anel do piso: elipse centrada em (768, 650), cerca de 520 × 200. Dentro do anel, piso liso. |
| Composição | nada entre os consoles e o anel; faixa de baixo (y 764 a 863) só piso |
| Paleta | regra 0.3; o anel em `#ffd27a` com 60% de brilho |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4; cadeiras na frente dos consoles; setas, conectores ou cabos no anel (as setas são desenhadas por código) |
| Prioridade | **P0** |
| Integração | entra na lista de `office-assets.ts`; a integração mede os 5 quadriláteros de tela e o telão. Consoles da esquerda para a direita = TRADER, RISK, VALIDATOR, PAPER EXECUTION, AUDIT. |
| Referência | `public/office/cenario-modular.png` (estilo), `public/office/assets/estacao-mesa-simples.png` (mesa), `public/office/assets/eletronico-telao.png` (telão) |

### TL-O2-STRESS-ROOM-001: fundo do Laboratório de Estresse
| Campo | Valor |
|---|---|
| Arquivo final | `sala-laboratorio-estresse.png` |
| Destino | `public/office/rooms/sala-laboratorio-estresse.png` (fonte: `art/office2/fonte/sala-laboratorio-estresse-1536x1024.png`) |
| Módulo | Laboratório de Estresse (`OFFICE_VISUAL_SPEC.md` 3.2) |
| Tela | geração 1536 × 1024 → final **1536 × 864** (regra 0.5) |
| Fundo transparente | não |
| Vista | 3/4 de cima; pessoa em pé = 150 px |
| Descrição | Laboratório de testes de um escritório de trading. **Esquerda da parede do fundo:** painel grafite com **14 lâmpadas quadradas apagadas** (vidro escuro liso) em **2 colunas × 7 linhas**. **Direita da parede do fundo:** telão largo de tela lisa. **Centro do piso:** câmara de teste de vidro transparente com moldura metálica grafite e, dentro dela, um pedestal baixo vazio. Faixa de piso amarela e preta (listras de segurança, sem texto) contornando a câmara. **Frente à direita:** bancada de trabalho com notebook de tela lisa. |
| Posições (final, ±40 px) | painel de lâmpadas: x 80 a 360, y 70 a 520 (cada lâmpada ≈ 100 × 44). Telão: x 1000 a 1460, y 70 a 330. Câmara: centro (720, 540), ≈ 520 × 360. Topo do pedestal: centro (720, 650), ≈ 220 × 50 (a bancada animada fica em cima, base em y 650). Bancada: x 1100 a 1400, y 560 a 760. |
| Composição | vidro da câmara transparente o bastante para ver o pedestal; faixa de baixo livre |
| Paleta | regra 0.3; listras amarelo `#ffd166` e grafite `#1b2133` |
| Animação | não (a animação é o TL-O2-STRESS-RIG-ANIM-001) |
| Variações | não |
| Proibido | regra 0.4; objetos dentro da câmara além do pedestal; lâmpadas acesas ou coloridas (a cor de cada uma é desenhada por código) |
| Prioridade | **P0** |
| Integração | a integração mede as 14 lâmpadas (ordem: coluna 1 de cima para baixo, depois coluna 2), o telão e o ponto de base do pedestal. Lâmpadas na ordem do catálogo `STRESS_SCENARIOS`. |
| Referência | `public/office/cenario-modular.png`, `public/office/assets/eletronico-rack-servidor.png` (metal e LEDs), `public/office/assets/arquitetura-divisoria-vidro.png` (vidro) |

### TL-O2-STAGE-ICONS-001: ícones dos 5 estágios do anel
| Campo | Valor |
|---|---|
| Arquivo da fonte | `art/office2/fonte/icones-estagios-1536x1024.png` |
| Arquivos finais | `public/office/ui/estagio-trader.png`, `estagio-risco.png`, `estagio-validador.png`, `estagio-execucao.png`, `estagio-auditoria.png` |
| Módulo | Anel de Decisão (consoles, ficha), Nexus (legenda) |
| Tela | 1536 × 1024, **grade 256** (regra 0.6), **linha 1, colunas 1 a 5**; o resto vazio |
| Grade de pixel | 1 pixel de arte = **4 × 4 px**; desenho dentro da área central de 224 × 224 de cada célula (margem de 16 px) |
| Final | cada célula 256 × 256 reduzida por vizinho mais próximo × 0,25 → **64 × 64** |
| Fundo transparente | sim |
| Vista | frontal, ícone plano com leve volume (estilo item de inventário de RPG) |
| Descrição (células 1 a 5) | 1 **trader**: prancheta com uma seta em zigue-zague subindo. 2 **risco**: escudo com um cadeado pequeno. 3 **validador**: lupa sobre uma lista de 3 caixinhas marcadas com tique. 4 **execução**: ficha de ordem de papel com uma engrenagem pequena no canto. 5 **auditoria**: livro-razão fechado com fita marcadora e um carimbo. |
| Composição | ícone centrado, contorno escuro `#1b2133` de 1 pixel de arte, silhueta reconhecível a 32 px |
| Paleta | grafite `#1b2133`, ciano `#5fb6ff`, dourado `#ffd27a`, papel creme `#f2e6c9`; **sem verde e sem vermelho** |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4; letras nos papéis (usar linhas) |
| Prioridade | **P0** |
| Integração | o estado (verde, vermelho, âmbar, grafite) é um anel CSS em volta do ícone |
| Referência | nenhuma de arte; estilo da regra 0.3 |

---

## P1

### TL-O2-HORIZON-ROOM-001: fundo do Horizonte (sala de mercado)
| Campo | Valor |
|---|---|
| Arquivo final | `public/office/rooms/sala-horizonte.png` (fonte: `art/office2/fonte/sala-horizonte-1536x1024.png`) |
| Módulo | Horizonte (`OFFICE_VISUAL_SPEC.md` 3.3) |
| Tela | 1536 × 1024 → final **1536 × 864** (regra 0.5) |
| Fundo transparente | não |
| Vista | 3/4 de cima; pessoa em pé = 150 px |
| Descrição | Sala de inteligência de mercado. Parede do fundo com **6 telões lisos em 3 colunas × 2 linhas**, molduras finas grafite. Na frente, uma mesa de analista em arco com **3 monitores lisos**. Luz fria das telas no piso, poucas plantas. |
| Posições (final, ±40 px) | telões (≈ 400 × 190): colunas x 118 a 518, 568 a 968, 1018 a 1418; linhas y 60 a 250 e 280 a 470. Mesa: centro (768, 650), ≈ 520 de largura, com os 3 monitores virados para o fundo (vemos o verso escuro e liso). |
| Composição | faixa de baixo livre |
| Paleta | regra 0.3 |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4; gráficos, mapas ou números nas telas |
| Prioridade | **P1** |
| Integração | a integração mede os 6 telões; ordem: linha 1 da esquerda para a direita, depois linha 2 |
| Referência | `public/office/cenario-modular.png` (área Análise de Mercado, x 1340 a 1834, y 564 a 830) |

### TL-O2-NEXUS-ROOM-001: fundo da Comunicação
| Campo | Valor |
|---|---|
| Arquivo final | `public/office/rooms/sala-comunicacao.png` (fonte: `art/office2/fonte/sala-comunicacao-1536x1024.png`) |
| Módulo | Comunicação / Nexus (`OFFICE_VISUAL_SPEC.md` 3.4) |
| Tela | 1536 × 1024 → final **1536 × 864** (regra 0.5) |
| Fundo transparente | não |
| Vista | 3/4 de cima; pessoa em pé = 150 px |
| Descrição | Sala de comunicação da equipe. No centro, uma **mesa holográfica larga** com tampo escuro liso `#0b1530` e uma borda fina ciano apagada. Nas paredes laterais, painéis de comutação com cabos organizados e luzes apagadas. Parede do fundo com janelas pequenas (vidro escuro, sem cidade). |
| Posições (final, ±40 px) | tampo da mesa: x 318 a 1218, y 330 a 700 (é onde o grafo é desenhado); nada sobre o tampo |
| Composição | o tampo é a maior área lisa da imagem; faixa de baixo livre |
| Paleta | regra 0.3, com mais azul-escuro |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4; hologramas, linhas, pontos ou desenhos sobre o tampo |
| Prioridade | **P1** |
| Integração | a integração mede o quadrilátero do tampo |
| Referência | `public/office/cenario-modular.png` |

### TL-O2-SERVICE-ICONS-001: ícones dos serviços (nós do Nexus)
| Campo | Valor |
|---|---|
| Arquivo da fonte | `art/office2/fonte/icones-servicos-1536x1024.png` |
| Arquivos finais | `public/office/ui/servico-feed-mercado.png`, `servico-triagem-estudo.png`, `servico-motor-risco.png`, `servico-livro-paper.png`, `servico-auditoria.png`, `servico-briefing.png` |
| Módulo | Nexus (nós de serviço), Diagnóstico |
| Tela | 1536 × 1024, **grade 256**, **linha 1, colunas 1 a 6** |
| Grade de pixel | 1 pixel de arte = 4 × 4 px; área central de 224 × 224 |
| Final | × 0,25 por vizinho mais próximo → **64 × 64** cada |
| Fundo transparente | sim |
| Vista | frontal, ícone plano com leve volume |
| Descrição (células 1 a 6) | 1 antena com 3 arcos de sinal. 2 funil com 3 bolinhas entrando e 1 saindo. 3 mostrador de medidor com ponteiro. 4 livro-razão aberto com uma folha solta. 5 caixa de arquivo morto com etiqueta lisa. 6 dois balões de conversa sobrepostos (sem texto dentro). |
| Paleta | igual à do TL-O2-STAGE-ICONS-001; sem verde e sem vermelho |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4 |
| Prioridade | **P1** |
| Integração | nós do grafo em 48 px (redução CSS a partir de 64, `image-rendering: pixelated`) |
| Referência | `art/office2/fonte/icones-estagios-1536x1024.png` (mesmo traço), depois de entregue |

### TL-O2-AGENT-STATE-ICONS-001: ícones de estado sobre a cabeça dos agentes
| Campo | Valor |
|---|---|
| Arquivo da fonte | `art/office2/fonte/icones-estado-agente-1536x1024.png` |
| Arquivos finais | `public/office/ui/estado-trabalhando.png`, `estado-aguardando.png`, `estado-bloqueado.png`, `estado-sem-dado.png`, `estado-mensagem.png`, `estado-pausa.png` |
| Módulo | escritório principal (sobre os agentes) e salas |
| Tela | 1536 × 1024, **grade 256**, **linha 1, colunas 1 a 6** |
| Grade de pixel | 1 pixel de arte = **8 × 8 px**; o desenho ocupa toda a célula (32 × 32 pixels de arte) |
| Final | × 0,125 por vizinho mais próximo → **32 × 32** cada |
| Fundo transparente | sim, fora de um selo redondo |
| Descrição | Cada ícone é um **selo redondo** (círculo de 28 pixels de arte, fundo `#0a1b33`, borda clara de 1 pixel de arte) com um símbolo dentro. 1 engrenagem. 2 ampulheta. 3 mão aberta levantada. 4 tomada desconectada com o fio solto. 5 envelope. 6 xícara de café com vapor. |
| Paleta | símbolo em creme `#f2e6c9` com detalhe ciano `#5fb6ff`; sem verde e sem vermelho |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4 |
| Prioridade | **P1** |
| Integração | "pausa" só aparece nos passeios cosméticos (classe `STATIC`); "sem dado" é o estado `UNKNOWN`; os demais vêm de `/agents` |
| Referência | nenhuma |

### TL-O2-SCENARIO-ICONS-001: ícones dos 14 cenários do laboratório
| Campo | Valor |
|---|---|
| Arquivo da fonte | `art/office2/fonte/icones-cenarios-1536x1024.png` |
| Arquivos finais | `public/office/ui/cenario-<id>.png`, com `<id>` = BASELINE, ABRUPT_MOVE, VOLATILITY_SPIKE, SPREAD_WIDENING, STALE_QUOTE, STALE_CANDLES, MISSING_CANDLE, PROVIDER_OUTAGE, BACKUP_VENUE_DIVERGENCE, LOSS_LIMIT, KILL_SWITCH, MALFORMED_SNAPSHOT, DUPLICATE_OUT_OF_ORDER, RESTART em minúsculas com hífen (ex.: `cenario-abrupt-move.png`) |
| Módulo | Laboratório de Estresse (lista de cenários, painel de lâmpadas) |
| Tela | 1536 × 1024, **grade 256**: linha 1 colunas 1 a 6, linha 2 colunas 1 a 6, linha 3 colunas 1 a 2, **na ordem dos ids acima** |
| Grade de pixel | 1 pixel de arte = 4 × 4 px; área central de 224 × 224 |
| Final | × 0,25 → **64 × 64** cada |
| Fundo transparente | sim |
| Descrição (na ordem) | 1 linha reta e estável com um tique. 2 raio sobre um candle. 3 onda em zigue-zague de grande amplitude. 4 duas barras verticais afastadas com seta dupla entre elas. 5 relógio com o símbolo de pausa. 6 três candles com um relógio pequeno. 7 fileira de 4 candles com uma lacuna tracejada no lugar do terceiro. 8 nuvem com um cabo partido. 9 duas torres com setas divergindo. 10 seta para baixo batendo numa barreira no chão. 11 alavanca de interruptor na posição desligada. 12 folha de papel rachada. 13 duas fichas sobrepostas com setas trocando de lugar. 14 seta circular em volta de um símbolo de liga/desliga. |
| Paleta | igual à do TL-O2-STAGE-ICONS-001; **candles em ciano e creme** (sem verde e sem vermelho) |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4 |
| Prioridade | **P1** |
| Integração | o nome do arquivo segue o id do cenário em `src/application/stress-lab.ts` |
| Referência | `art/office2/fonte/icones-estagios-1536x1024.png`, depois de entregue |

### TL-O2-STRESS-RIG-ANIM-001: bancada de teste animada (só durante simulação)
| Campo | Valor |
|---|---|
| Arquivo da fonte | `art/office2/fonte/bancada-teste-1536x1024.png` |
| Arquivo final | `public/office/rooms/bancada-teste-anim.png` (tira horizontal) |
| Módulo | Laboratório de Estresse, dentro da câmara |
| Tela | 1536 × 1024, **grade 256**, **linha 1, colunas 1 a 6** = quadros 1 a 6 |
| Quadros | 6 quadros; em cada célula o aparelho fica **na mesma posição**, com a base centrada em x = 128 e apoiada em y = 240 da célula, ocupando cerca de 140 × 150 |
| Final | cada célula × 0,5 por vizinho mais próximo → quadro de **128 × 128**; tira de **768 × 128** com os quadros 1 a 6 da esquerda para a direita |
| Animação | sim: **8 FPS**, repete 1 → 6; parada (quadro 1) com a aba oculta ou com `prefers-reduced-motion` |
| Fundo transparente | sim |
| Vista | 3/4 de cima, mesma da sala |
| Descrição | Aparelho de teste compacto: base de metal grafite, coluna curta e um emissor redondo em cima. 1 emissor com brilho fraco. 2 anel de pulso ciano pequeno saindo do emissor. 3 anel médio. 4 anel grande. 5 anel grande quase transparente. 6 igual ao 1. O aparelho é idêntico nos 6 quadros; só o pulso muda. |
| Paleta | grafite `#1b2133`, ciano `#5fb6ff` no pulso, dourado `#ffd27a` no emissor |
| Variações | não |
| Proibido | regra 0.4; deslocar ou redimensionar o aparelho entre quadros |
| Prioridade | **P1** |
| Integração | desenhado em canvas com a base no ponto do pedestal (TL-O2-STRESS-ROOM-001, (720, 650)); classe `SIMULATION`, só com um relatório aberto |
| Referência | `docs/SPRITE_GENERATION.json` (mesmo contrato de grade e âncora das folhas de personagem) |

---

## P2

### TL-O2-DIAG-ROOM-001: fundo do Diagnóstico
| Campo | Valor |
|---|---|
| Arquivo final | `public/office/rooms/sala-diagnostico.png` (fonte: `art/office2/fonte/sala-diagnostico-1536x1024.png`) |
| Módulo | Diagnóstico (`OFFICE_VISUAL_SPEC.md` 3.5); opcional, porque a sala funciona sem fundo |
| Tela | 1536 × 1024 → final **1536 × 864** (regra 0.5) |
| Fundo transparente | não |
| Vista | 3/4 de cima; pessoa em pé = 150 px |
| Descrição | Sala de diagnóstico ao lado do data center. Um **telão muito grande** de tela lisa na parede do fundo. Racks de servidor nas laterais com LEDs verdes e azuis pequenos (decoração estática). Piso técnico cinza. |
| Posições (final, ±40 px) | telão: x 218 a 1318, y 60 a 520. Racks: x 0 a 200 e x 1336 a 1536, sem cobrir o telão. |
| Composição | faixa de baixo livre |
| Paleta | regra 0.3 |
| Animação | não |
| Variações | não |
| Proibido | regra 0.4; conteúdo no telão |
| Prioridade | **P2** |
| Integração | a integração mede o telão |
| Referência | `public/office/assets/eletronico-rack-servidor.png`, `public/office/cenario-modular.png` (Data Center) |

---

## Contagem

| Prioridade | Pedidos | Arquivos finais |
|---|---|---|
| P0 | 3 (2 fundos de sala + 5 ícones de estágio) | 7 |
| P1 | 6 (2 fundos, 6 serviços, 6 estados, 14 cenários, 1 animação) | 29 |
| P2 | 1 (1 fundo) | 1 |
| **Total** | **10** | **37 imagens finais** + 10 imagens-fonte |
