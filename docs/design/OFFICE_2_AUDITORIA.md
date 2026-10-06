# Escritório 2.0: auditoria, linha de base e fases

Status: primeira entrega do `TRADINGLAB_OFFICE_2_VISUAL_HANDOFF.md`, já com a **referência oficial aprovada em 06/10/2026**. Só documentação, mapa e um teste do mapa. Nenhum código ou arte do escritório atual foi alterado.
Data: 06/10/2026.
Base: `main` 224c430.

## 1. Referência oficial

| Item | Valor |
|---|---|
| Arquivo | `docs/design/references/tradinglab-office-2-approved-reference.jpg` |
| Origem | `C:\Users\Danrley\Downloads\tradinglab-office-2-approved-reference.jpg`, copiado sem renomear nem alterar |
| Dimensões | 1536 × 1024, JPEG (o handoff dizia 709 × 1536 em retrato; vale o arquivo) |
| sha256 | `a958874603ea5f34da1aa035dce0125dce0f9c17012b136552dc7e15298d9376` |
| Identidade | confere: cartão "30º ANDAR · TRADINGLAB HQ", áreas HORIZON, NEXUS, RING, STRESS LAB e RISK, recepção, convivência, cozinha, varanda e fachada panorâmica |
| Abre corretamente | sim (decodificada e inspecionada em 4 quadrantes em resolução cheia) |

## 2. Linha de base

| Item | Resultado |
|---|---|
| Testes (CI da `main` em 224c430, com PostgreSQL) | `npm test`: 381 de 381 |
| Testes do escritório no CI | 109 de 109 |
| Teste novo desta entrega | `test/office-scene-map.test.ts`: 4 de 4 |
| Assets atuais | 103 PNG medidos (`OFFICE_ASSET_INVENTORY.md`) |
| Cena atual | 1852 × 849, vista **3/4 frontal**, fundo único `cenario-modular.png` (2,19 MB) de 88 peças |
| Personagens | 8 folhas 6 × 4 (frente, esquerda, direita, costas) |
| Desempenho | o `scene-canvas.js` mede FPS e p95; **não medido nesta entrega** (fase F7) |

## 3. Escritório atual × os 12 módulos da referência

| Módulo | Hoje | Lacuna |
|---|---|---|
| Main trading floor | Trading Floor (Nova, Flux) | vira o Ring; o hall é a visão geral |
| Market / Horizon | Análise de Mercado (4 telões reais) | zona própria com mesas e 2 telões |
| Decision Ring | não existe; fichas de decisão já na `main` (#84) | zona + painel novos |
| Risk control | Risk Desk (quadro de 5 checagens) | zona com kill switch, motivos e limites |
| Nexus | só a lista de mensagens | grafo novo |
| Collision / Diagnostics | Data Center (prontidão) | linha do tempo da decisão |
| Stress Lab | não existe; laboratório na `main` (#85), sem rota | zona + rota de leitura |
| Backtest | painel de estudos | zona própria |
| Paper execution | War Room (equity, posições) | subzona separada da análise |
| Audit / logs | diálogo de auditoria | zona própria |
| Idle / lounge | Lounge e copa (passeio cosmético rotulado) | convivência, cozinha, café, varanda |
| Panoramic edge | faixa de cidade 1852 × 82 | cidade em L0 + fachada de vidro + terraço e varanda |

A diferença maior não é de módulo, é de **câmera**: a referência é isométrica 2:1, e nenhuma peça 3/4 atual serve nela.

## 4. Entregáveis

| Documento | Conteúdo |
|---|---|
| `OFFICE_VISUAL_SPEC.md` | leitura da referência (limites normalizados), desvios declarados, composição isométrica, zonas em tiles, áreas andáveis e bloqueadas, camadas L0 a L7, ordem de profundidade, câmera e escala, notebook e celular, áreas clicáveis, pontos de trabalho e lazer, montagem de telas, exterior, paleta, reuso |
| `public/office2/scene-map.json` + `references/office-scene-map-preview.png` | planta de máquina: 16 áreas, portas, 8 postos, 8 pontos de lazer, chegada, 10 telas; prévia desenhada a partir do JSON |
| `OFFICE_ASSET_INVENTORY.md` | 103 PNG medidos, com a decisão de reuso atualizada para a vista isométrica |
| `OFFICE_BACKEND_VISUAL_MAP.md` | zona → telas → painel → fonte → REAL, STATIC, SIMULATION ou UNKNOWN; barra de cima sem "nível do trader" |
| `OFFICE_ASSET_REQUESTS.md` | **manifesto**: 21 pedidos (5 P0, 14 P1, 2 P2) → 74 imagens finais, com conferência de completude |
| `references/tradinglab-office-2-approved-reference.jpg` | referência oficial |

## 5. Revisão contra a seção da referência oficial

| Exigência do handoff | Feito? |
|---|---|
| Copiar a referência para o caminho canônico, sem substituir | sim (seção 1) |
| Visão isométrica geral, legível, 30º andar, cidade panorâmica, identidade pixel-art | sim (`OFFICE_VISUAL_SPEC.md`, seções 2 a 8) |
| Não achatar em dashboard, não trocar por cidade cripto, não esticar a imagem, não gravar texto ao vivo na arte | sim (texto só em L7, arte sem texto, composição 16:9 própria) |
| Lugar explícito para os 12 módulos | sim; conferido pelo teste do mapa |
| Contrato de camadas L0 a L7 | sim (`OFFICE_VISUAL_SPEC.md`, seção 4) |
| Auditoria antes dos pedidos (renderizador, assets, dimensões, alfa, escala, câmera, quadros, navegação, pontos de quebra, fontes de dados, classes, comparação com os 12 módulos) | sim (este documento, inventário e mapa backend) |
| Especificação com todos os itens pedidos | sim |
| Mapa de máquina só depois de conferir a arquitetura | sim; marcado como PROPOSTA, para a F1 conferir no compositor |
| Conferência de completude respondida | sim (fim do manifesto) |
| Corrigir pedidos faltantes, duplicados ou ambíguos | os 5 fundos de sala da versão anterior saíram; os móveis ganharam retângulo e ponto de apoio exatos |

## 6. Fases propostas

Cada fase é um PR, sem merge automático e com testes.

| Fase | O que entra | Depende da arte? |
|---|---|---|
| F1 | Renderizador isométrico: projeção, casca por código (L1 e L2), grade andável e A*, agentes com as folhas atuais mapeadas, foco 2× por zona, barra de cima, marcação `data-truth`. Rota `/office2` ao lado do escritório atual (rollback = continuar no `/office`). | não (móveis como blocos marcados "placeholder de desenvolvimento") |
| F2 | Ring: Anel de Decisão (fichas #84) e Execução paper | não |
| F3 | Stress Lab (rota de leitura do relatório) e Backtest | não |
| F4 | Nexus, Diagnóstico, Auditoria, Risk | não |
| F5 | Horizon (gráficos atuais em telas de zona) | não |
| F6 | Integração da arte P0 e P1: recorte, medição de quadriláteros, lista de arquivos servidos | **sim** |
| F7 | Desempenho no notebook (FPS e p95), celular, segurança, revisão visual | depois da F6 |
| F8 | Troca do `/office` padrão para o 2.0 (com aprovação) e documentação final | — |

Pré-requisitos de backend fora deste trabalho:
- deploy aprovado das fichas (#84);
- passo 5 do mapa ATS-MATRIX (L1, L2, L5, L6), depois do piloto (≈ 11/10).

## 7. Ponto de parada

O trabalho que depende de arte para aqui. O próximo passo do dono:
1. pedir ao ChatGPT para ler `docs/design/OFFICE_ASSET_REQUESTS.md`, com a referência em `docs/design/references/`;
2. o ChatGPT entrega no branch `assets/escritorio-2`.

**Pode continuar sem a arte:** F1 a F5, com móveis em placeholder marcado.
