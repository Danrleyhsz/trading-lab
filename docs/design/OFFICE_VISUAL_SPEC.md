# Escritório 2.0: especificação visual

Base: `docs/design/TRADINGLAB_OFFICE_2_VISUAL_HANDOFF.md` (branch `research/atsmatrix-agent-architecture`), inventário em `OFFICE_ASSET_INVENTORY.md` e mapa de dados em `OFFICE_BACKEND_VISUAL_MAP.md`.

## 1. Decisão de arquitetura

**O escritório principal continua sendo a cena única de 1852 × 849, e as visões novas são salas que se abrem por cima dela.**

Por quê:
- **Coordenadas espalhadas:** a cena atual tem coordenadas medidas na arte em pelo menos 10 módulos: `life.js`, `navigation.js`, `transitions.js`, `workstations.js`, `screens.js`, `scene-quads.js`, `desk-screens.js`, `office-map.js`, `scene-canvas.js` e `cenario-modular.json`. Aumentar a cena para caber 6 salas novas obrigaria a medir tudo de novo, sem ganho para quem usa.
- **O documento permite:** ele aceita "rooms, tabs, zoomable zones, monitor overlays or dedicated routes" e pede para não mostrar tudo ao mesmo tempo.
- **Carregamento sob demanda:** cada sala carrega o fundo e o código só ao abrir, então o notebook não paga pelas salas fechadas.

Desenho:
- **Visão de sala:** um painel em tela cheia (`<section class="room-view">`) com:
  - um fundo pixel-art de 1536 × 864 (16:9), escalado para caber;
  - uma camada canvas/HTML com os dados;
  - um botão "voltar ao escritório".
- **Ao abrir uma sala:** a cena principal pausa as animações (`requestAnimationFrame` parado, mesmo tratamento de aba oculta).
- **Sem sala aberta:** nada da sala fica no DOM.

## 2. Zonas do escritório principal e portas para as salas

As 6 salas e as 3 áreas de baixo continuam no lugar. Cada zona do documento recebe um lugar, e as salas novas se abrem pela zona correspondente (área clicável já existente ou nova, desenhada sobre a arte atual):

| Zona do documento | Lugar na cena atual (px da cena) | Abre |
|---|---|---|
| Market/Data | Análise de Mercado (x 1340–1834, y 564–830) | **Horizonte** |
| Research | Research Lab (x 18–634, y 90–304) | painel de pesquisa (existente) |
| Strategy / Backtest Lab | Quant Lab (x 18–612, y 312–556) | estudos (existente) e **Laboratório de Estresse** |
| Risk | Risk Desk (x 1268–1834, y 90–304) | **Anel de Decisão**, no estágio RISK |
| Validation | Meeting Room (x 1290–1834, y 312–556), onde fica o telão do briefing | **Anel de Decisão**, no estágio VALIDATOR, e **Diagnóstico** da decisão |
| Paper Execution | Trading Floor (x 648–1254, y 90–304), mesas da Nova e do Flux | **Anel de Decisão** |
| Audit/Logs | Data Center (x 18–455, y 564–830) | **Diagnóstico** |
| Stress Lab | Quant Lab (porta do lado direito, x ≈ 600) | **Laboratório de Estresse** |
| Lounge/Idle | Lounge (x 656–1246, y 312–556) e copa | **Comunicação** (onde a equipe conversa) |

O menu lateral ganha o item **Salas**, que lista as 5 salas (Anel, Horizonte, Comunicação, Diagnóstico, Laboratório). Esse é o caminho principal no celular, onde clicar na cena é pequeno demais.

## 3. Salas

Tamanho final de todo fundo de sala: **1536 × 864**. Escala: uma pessoa em pé tem **150 px**, usando as folhas de personagem existentes em 0,625 (célula de 256 → 160, sola em y 150).

### 3.1 Anel de Decisão (P0)
- **Fundo:** sala de controle com 5 consoles em ferradura e um anel no piso no centro.
- **Camada de dados:**
  - cada console mostra o estágio (ícone + estado + motivo);
  - setas no anel do piso ligam os estágios, desenhadas por código;
  - o telão do topo mostra a decisão atual: direção, candle e desfecho.
- **Interação:**
  - clicar num estágio abre os detalhes da ficha;
  - setas ← → navegam entre as últimas 24 decisões;
  - o link "ficha completa" abre o JSON da rota.
- **Agentes:** Nova no console TRADER e Sentinel no RISK, sentados (coluna 6 da folha). Ficam parados; não andam por enfeite.
- **Estados de cada console:**
  - aprovado: verde `#22e39f`;
  - rejeitado ou bloqueado: vermelho `#ff6b6b`;
  - pendente: âmbar `#ffd166`;
  - sem dado ou não registrado: grafite listrado.

### 3.2 Laboratório de Estresse (P0)
- **Fundo:** laboratório com câmara de teste de vidro no centro, painel de 14 lâmpadas (2 × 7) na parede esquerda e telão de placar na direita.
- **Camada de dados:**
  - cada lâmpada é um cenário (verde = sobreviveu, vermelho = falhou, grafite = não rodado);
  - o telão mostra o placar;
  - a câmara mostra a bancada animada, **só enquanto um relatório está aberto**.
- **Selo fixo:** "SIMULAÇÃO · semente N · sha256 …" em todo o painel.

### 3.3 Horizonte (P1)
- **Fundo:** sala de mercado com 6 telões (3 × 2) e uma mesa de analista.
- **Dados:** os gráficos do mapa (seção 3 do `OFFICE_BACKEND_VISUAL_MAP.md`), cada um com o frescor da fonte.

### 3.4 Comunicação (P1)
- **Fundo:** sala com mesa holográfica escura no centro, onde o grafo é desenhado em canvas.
- **Dados:**
  - nós com retrato (recorte de `agent-sprites.png`) e ícones de serviço;
  - arestas com espessura pelo número de mensagens.

### 3.5 Diagnóstico (P2)
- **Fundo:** sala de servidores com um telão grande.
- **Dados:** principalmente HTML (linha do tempo, evidência, paridade). O fundo é opcional; sem ele, a sala usa a cor de fundo do tema.

## 4. Estilo

- **Mesma identidade da arte atual:**
  - pixel art, vista 3/4 de cima;
  - contornos escuros finos;
  - sombreamento de 3 a 4 tons;
  - paleta de `docs/ASSETS_MODULARES.md`: madeira `#c07a3c`/`#8b5a2c`, parede `#2e3b60`/`#3f5080`, tela `#0e2150`, metal `#1b2133`, plantas `#2c8a48`/`#62d07a`, luz `#ffd27a`.
- **Telas sempre apagadas e lisas** (`#0e2150`) nos fundos: o conteúdo é desenhado por cima.
- **Sem texto, números, logotipos ou pessoas** nas imagens. Rótulos são HTML.
- **Sem cópia de arte, logo ou marca do ATS-MATRIX** ou de qualquer jogo.
- **Ícones:**
  - grade de pixel visível (1 pixel de arte = 4 px na folha, reduzidos para 1 px por vizinho mais próximo);
  - legíveis a 32–64 px.

## 5. Desempenho (a medir, não supor)

- **Carregamento:** fundos de sala sob demanda, sem cache no service worker até a sala ser aberta uma vez.
- **Peso:** meta ≤ 400 KB por fundo de sala (PNG otimizado). O `cenario-modular.png` atual tem 2,19 MB.
- **Animação:** só a bancada do laboratório (8 FPS) e as setas do anel. Tudo pausa com a aba oculta ou `prefers-reduced-motion`.
- **Grafo:** no máximo 14 nós e 200 arestas.
- **Medição:** o `scene-canvas.js` já tem medição de FPS e p95. A fase de desempenho repete essa medição com cada sala aberta, no notebook.

## 6. Responsivo

- **Prioridade:** desktop/notebook (decisão de 05/10/2026).
- **Notebook:**
  - a sala ocupa a área da cena;
  - painéis laterais de detalhe à direita a partir de 1100 px;
  - abaixo disso, os detalhes ficam embaixo.
- **Celular** (< 760 px, mesmo ponto de quebra do `v3.css`):
  - a sala mostra o fundo como faixa de 16:9 no topo;
  - os dados vêm em lista;
  - o anel vira uma lista vertical de 5 estágios.
- O celular continua utilizável, mas sem trabalho dedicado antes do desktop estar pronto.

## 7. Segurança

- **Acesso:** as salas só leem rotas GET que já exigem autenticação, e o token só leitura serve.
- **O que o cliente nunca recebe:** chaves, segredos ou configuração sensível.
- **Laboratório:** se rodar no servidor, exige o token completo e checagem de origem, uma execução por vez, sem efeito fora da memória.
- **Arquivos novos:** toda imagem nova entra na lista fixa de `src/application/office-assets.ts`, com `nosniff`.
