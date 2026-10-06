# Escritório 2.0: especificação visual

Fonte de verdade visual: `docs/design/references/tradinglab-office-2-approved-reference.jpg`
- 1536 × 1024, JPEG, sha256 `a958874603ea5f34da1aa035dce0125dce0f9c17012b136552dc7e15298d9376`;
- copiada sem alteração de `Downloads/tradinglab-office-2-approved-reference.jpg` em 06/10/2026;
- verificação de identidade: tem o cartão "30º ANDAR · TRADINGLAB HQ" e as áreas HORIZON, NEXUS, RING, STRESS LAB e RISK.

Mapa de máquina: `public/office2/scene-map.json` (validado por `test/office-scene-map.test.ts`). Prévia: `docs/design/references/office-scene-map-preview.png`.

**Diferença de medida:** o handoff descreve a fonte como "709 x 1536 px, portrait", mas o arquivo confirmado pelo dono é **1536 × 1024, paisagem**. Vale o arquivo, porque a confirmação final do handoff prevalece sobre as notas anteriores.

## 1. Leitura da referência

Limites normalizados: fração de 1536 × 1024, medidos a olho na imagem, ±0,02.

| Área na referência | x | y | O que tem | Zona de produção (`public/office2/scene-map.json`) |
|---|---|---|---|---|
| Barra de navegação (Início, Horizon, Nexus, Ring, Stress Lab, Risk, Configurações, data, perfil) | 0–1 | 0–0,058 | interface | L7 HTML (não é arte) |
| Cartão "30º andar · TradingLab HQ · São Paulo" | 0,01–0,145 | 0,07–0,14 | interface | L7 HTML |
| Terraço com guarda-corpo de vidro | 0,10–0,40 | 0,06–0,30 | deck, plantas, mesa | `terraco-norte` |
| HORIZON · Inteligência de mercado | 0,20–0,50 | 0,15–0,42 | 2 mesas com monitores, parede com 6 telas (mapa-múndi, gráficos) | `horizon` |
| Parede TRADINGLAB, jardim, banco | 0,48–0,62 | 0,06–0,25 | letreiro, jardineira | `hall-marca` |
| Recepção | 0,69–0,82 | 0,18–0,31 | balcão curvo, logotipo na parede | `recepcao` |
| Elevadores e catracas | 0,85–1 | 0,15–0,42 | 2 portas de elevador, 3 catracas | `elevadores` |
| NEXUS · Comunicação & comunidade | 0,03–0,37 | 0,30–0,58 | mesa de reunião longa, parede com tela de lista | `nexus` |
| Área de convivência | 0,50–0,70 | 0,32–0,53 | sofás, mesa de centro, jardineira | `convivencia` |
| Cabine de vidro | 0,40–0,54 | 0,46–0,62 | sala pequena envidraçada, armários | `backtest` |
| STRESS LAB · Testes & performance | 0,68–0,88 | 0,31–0,53 | esteira, saco de pancada, halteres | `stress-lab` |
| Armários e sofá (sem nome) | 0,86–1 | 0,42–0,62 | fileira de armários, sofá | `auditoria` |
| RISK · Gestão de risco | 0,62–0,82 | 0,48–0,67 | mesa com 2 pessoas e monitores, estante | `risk` |
| RING · Sala de operações | 0–0,52 | 0,55–0,95 | 2 mesas curvas com muitos monitores, tela com logotipo, plantas | `ring` (subzonas `ring-decisao` e `ring-execucao`) |
| Cozinha | 0,56–0,73 | 0,62–0,78 | bancada, banquetas, cafeteira, geladeira | `cozinha` |
| Sala de reunião com telão (sem nome) | 0,77–0,98 | 0,58–0,80 | mesa longa, telão com logotipo | `diagnostico` |
| Mesas redondas | 0,53–0,63 | 0,77–0,87 | 2 mesas com cadeiras | `cafe` |
| VARANDA | 0,64–0,88 | 0,77–0,95 | sofá, mesa, jardineira, guarda-corpo | `varanda` |
| Cidade à noite | bordas | — | arranha-céus iluminados | camada L0 |

**Desvios declarados** (o handoff permite melhorar zoneamento e módulos):
1. **Só os 8 agentes aparecem.** A referência tem cerca de 14 pessoas: recepcionista, alguém na cozinha, gente no café. Figurantes sugeririam trabalho que não existe ("visual state must never imply a real action").
2. **Sem texto na arte.** Os nomes das zonas, o "TRADINGLAB" da parede e a barra de cima são desenhados por código ou HTML (L7).
3. **Barra de cima sem "Trader Lvl 12".** O sistema não tem nível de usuário. Mostra o modo da sessão (autenticado ou só leitura) e o relógio real.
4. **Áreas sem nome ganham função:** sala de reunião → Diagnóstico; armários → Auditoria; cabine de vidro → Backtest. O Ring se divide em Anel de Decisão (esquerda) e Execução Paper (direita), com cores de destaque diferentes.
5. **A academia do Stress Lab continua** como decoração (STATIC) e ganha um telão para o placar dos cenários (SIMULATION).
6. **Planta como losango de 32 × 24 tiles.** Os recortes da fachada da referência são simplificados, e todas as 16 áreas cabem.

## 2. Composição de produção

- **Projeção:** isométrica 2:1. O tile do piso é um losango de **48 × 24 px**. Parede de fundo com **72 px** de altura (3 tiles). Pessoa em pé: **45 px**.
- **Cena lógica:** **1536 × 864** (16:9). Fórmula: `x = 672 + (i − j)·24`, `y = 96 + (i + j)·12`.
  - A planta ocupa x 96 a 1440 e y 96 a 768.
  - As paredes do fundo sobem até y 24.
  - Abaixo de y 768 fica a fachada do prédio, caindo sobre a cidade.
- **Eixos:**
  - `i` (0 a 32) cresce para baixo-direita: fundo direito com hall, recepção e elevadores.
  - `j` (0 a 24) cresce para baixo-esquerda: fachada esquerda com Horizon, Nexus e Ring.
- **Coordenadas das zonas:** tabela `rooms` do `public/office2/scene-map.json`, em retângulos de tiles semiabertos.

| Zona | i | j | Módulo |
|---|---|---|---|
| terraco-norte | 0–9 | 0–2 | PANORAMIC_EDGE |
| horizon | 0–9 | 2–8 | MARKET_HORIZON |
| nexus | 0–9 | 8–15 | NEXUS |
| ring (decisão 0–6, execução 6–12) | 0–12 | 15–24 | DECISION_RING / PAPER_EXECUTION |
| hall-marca | 9–14 | 0–4 | MAIN_FLOOR |
| recepcao | 14–22 | 0–4 | MAIN_FLOOR |
| elevadores | 22–32 | 0–6 | MAIN_FLOOR |
| convivencia | 11–16 | 6–12 | IDLE_LOUNGE |
| backtest | 11–15 | 12–15 | BACKTEST |
| stress-lab | 18–24 | 6–11 | STRESS_LAB |
| auditoria | 26–32 | 6–12 | AUDIT_LOGS |
| risk | 18–25 | 12–17 | RISK_CONTROL |
| diagnostico | 26–32 | 13–19 | DIAGNOSTICS |
| cozinha | 18–24 | 17–21 | IDLE_LOUNGE |
| cafe | 14–18 | 18–24 | IDLE_LOUNGE |
| varanda | 24–32 | 20–24 | PANORAMIC_EDGE |

**Os 12 módulos obrigatórios têm casa:**
- MAIN TRADING FLOOR: hall, recepção e elevadores, como entrada e visão geral. O trabalho dos agentes de trading fica no Ring.
- MARKET/HORIZON, DECISION RING, RISK CONTROL, NEXUS, COLLISION/DIAGNOSTICS, STRESS LAB, BACKTEST, PAPER EXECUTION e AUDIT/LOGS: cada um com a zona da tabela acima.
- IDLE/LOUNGE: convivência, cozinha e café.
- PANORAMIC EDGE: terraço, varanda, fachada de vidro e a cidade em L0.

## 3. Áreas andáveis e bloqueadas

- **Andável:**
  - os tiles de circulação (fora das salas), num total de 154, dos quais 136 se alcançam a partir dos elevadores;
  - o interior das salas, menos a área ocupada pelos móveis.
- **Bloqueado:**
  - paredes (bordas `edges` de cada sala);
  - área ocupada pelos móveis (o campo `footprint` de cada peça, tabela da seção 6);
  - os 18 tiles de circulação que não se alcançam, que viram jardineiras.
- **Portas:** só pelas portas da lista `doors` de cada sala. O validador confere que toda porta dá para a circulação ou para outra sala e que todas as 16 áreas se alcançam a partir de `chegada`.
- **Caminhos:** A* em 4 direções na grade de tiles, como o `office-map.js` faz hoje com células de 8 px.

## 4. Camadas e ordem de desenho

| Camada | Conteúdo | Feito por |
|---|---|---|
| L0 | cidade à noite (dia e entardecer depois), com leve paralaxe ao mover a câmera | **arte** (TL-O2-SKYLINE) |
| L1 | casca: laje, fachada do prédio caindo, pisos por material (`floor`) | **código**: losangos com padrão pixel por material, cores da seção 8 |
| L2 | paredes de fundo (`j0` e `i0` de cada sala) com 72 px; paredes da frente cortadas a 12 px (vista em corte, como na referência); vidro e guarda-corpo translúcidos | **código** |
| L3 | móveis e objetos | **arte** (folhas TL-O2-PROPS-*) |
| L4 | telas, monitores e áreas clicáveis | telas: **código**, nos quadriláteros de `screens`; molduras: arte |
| L5 | agentes e caminhadas | **arte** (folhas de personagem) |
| L6 | efeitos e estados: anel de estado, ícone sobre a cabeça, brilho de tela | ícones: **arte**; brilho: código |
| L7 | rótulos das zonas, barra de cima, cartão do andar, painéis, métricas | **HTML/canvas** |

- **Profundidade:** L3 e L5 são ordenados juntos pela soma `i + j` do canto da frente da área ocupada. Em empate, ganha o `i` maior.
- **Valores ao vivo:** nunca ficam numa PNG estática; só em L4 ou L7.

## 5. Câmera, escala e comportamento por tela

- **Visão geral** (padrão, como a referência): a cena inteira cabe na área útil. No notebook de 1366 × 768 a escala fica perto de 0,85, com `image-rendering: pixelated`.
- **Foco na zona:** clicar numa zona (ou no item da barra) faz zoom de **2×**, sempre inteiro, para os pixels ficarem iguais, centrado no retângulo da zona. O painel de dados da zona abre à direita (L7) e a tecla Esc volta à visão geral. A barra de cima tem Início, Horizon, Nexus, Ring, Stress Lab e Risk, como na referência, mais o menu "Mais" com Execução, Auditoria, Diagnóstico e Backtest.
- **Desktop e notebook** (prioridade, decisão de 05/10/2026): cena + painel à direita a partir de 1100 px. Entre 760 e 1100 px, o painel fica embaixo.
- **Celular** (< 760 px): a visão geral fica como imagem rolável na horizontal, e a barra vira uma lista de zonas. Tocar numa zona abre só o painel de dados (sem zoom na cena).

## 6. Pontos de montagem, de trabalho e de lazer

Tudo isto vem do `public/office2/scene-map.json`:

| Tipo | Itens |
|---|---|
| Trabalho (`WORK`) | nova e atlas no Anel de decisão; flux na Execução paper; satoshi, oracle e vega no Horizon; sentinel no Risk; euler no Backtest |
| Lazer (`IDLE`) | 2 no sofá da convivência, 2 no café, 2 na cozinha, 2 na varanda (só passeio cosmético, rotulado como pausa) |
| Chegada (`SPAWN`) | elevadores |
| Telas (`screens`) | Horizon 2 (8 tiles), Nexus 1, Ring 2 (anel e execução), Stress Lab 1, Auditoria 1, Risk 1, Diagnóstico 1, Backtest 1; parede `j0` da sala, 48 px de altura |
| Áreas clicáveis | o losango de cada sala; cada tela; cada agente |

Na F1, o compositor desenha o mapa e mede cada tela e cada móvel. Qualquer ajuste de tile volta para o JSON e passa no teste.

## 7. Exterior e vidro

- **Cidade:** a cidade noturna (L0) preenche as bordas, como na referência. Dia, entardecer e noite trocam pelo relógio real, como as faixas de cidade de hoje.
- **Fachada e guarda-corpos:** vidro `#9fc4e8` a 25% de opacidade, com 2 reflexos diagonais e montante grafite a cada 2 tiles. Faixa de LED quente `#ffd27a` na base dos guarda-corpos.
- **Prédio abaixo da laje:** fachada escura com janelas acesas aleatórias **fixas por semente**. É decoração STATIC, não dado.

## 8. Paleta e luz (medidas na referência)

| Uso | Cor |
|---|---|
| Céu e cidade | `#0b1426` a `#1a2a4a`, janelas `#ffcf6a` |
| Piso claro | `#d9cdb4` / `#c8b89a` (rejunte) |
| Carpete escuro (Horizon, Ring, Risk) | `#2b3140` / `#353c4e` |
| Madeira (convivência) | `#8b5a2c` / `#c07a3c` |
| Piso técnico (Stress Lab, Backtest) | `#3a404c` com placas `#454c5a` |
| Deck externo | `#6b5440` |
| Paredes | painel grafite `#2a2f3a` / `#3a404c`, LED quente `#ffd27a` |
| Telas | `#0e2150`, brilho `#5fb6ff` |
| Plantas | `#2c8a48` / `#62d07a` |
| Estados (só código) | aprovado `#22e39f`, rejeitado `#ff6b6b`, pendente `#ffd166`, sem dado: grafite listrado |

Luz: interior quente, exterior frio. Cada tela acesa projeta um brilho ciano no chão, e só quando tem dado (REAL). Sem dado, a tela fica apagada.

## 9. Reuso e substituição

| Atual | Decisão |
|---|---|
| `cenario-modular.png` e as 88 peças 3/4 de `assets/` | **substituir na cena 2.0**, porque a perspectiva não combina com a isométrica. **Mantidas** para o escritório atual seguir funcionando até a troca (rollback). |
| Faixas de cidade 1852 × 82 | substituir por TL-O2-SKYLINE (outro formato) |
| 8 folhas de personagem (frente, esquerda, direita, costas) | **reusar na F1** com mapeamento diagonal (`Office2Iso.frame`): parado olhando para SE/SW usa a frente e para NE/NW usa as costas; caminhando, SE usa o perfil direito, SW o perfil esquerdo e NE/NW as costas; sentado usa a coluna 6 da frente (SE/SW) ou das costas (NE/NW). **Substituir na P1** por folhas isométricas (TL-O2-CHAR-*). |
| `agent-sprites.png` | reusar (retratos nos painéis) |
| Ícones do app | reusar |
| Lógica de telas com dado real (`screens.js`, `desk-screens.js`) | reusar a regra; trocar os retângulos pelos `screens` do mapa |
| `office-map.js` (A*), `life.js` (passeio cosmético), `presence.js` | reusar a lógica, com grade em tiles isométricos |

## 10. Segurança e desempenho

- **Dados:** só rotas GET autenticadas. Nada de chave ou configuração sensível no cliente. Toda imagem nova entra na lista fixa de `src/application/office-assets.ts`.
- **Desempenho:**
  - meta de 60 FPS na visão geral no notebook, medida com o medidor que já existe no `scene-canvas.js`;
  - L0 a L3 desenhadas uma vez num canvas fora da tela e redesenhadas só ao mudar zoom ou tamanho;
  - por quadro, só L5 e L6;
  - animações pausam com a aba oculta e respeitam `prefers-reduced-motion`.
