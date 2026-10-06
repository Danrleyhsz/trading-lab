# Escritório 2.0: auditoria, linha de base e fases

Status: primeira entrega do `TRADINGLAB_OFFICE_2_VISUAL_HANDOFF.md`. **Só documentação.** Nenhum código ou arte do escritório foi alterado.
Data: 06/10/2026.
Base: `main` 224c430.

## 1. Linha de base

| Item | Resultado |
|---|---|
| Testes (CI da `main` em 224c430, com PostgreSQL) | `npm test`: 381 testes, 381 passam, 0 pulados |
| Testes do escritório no CI (`office*.test.js`) | 109 de 109 passam |
| Assets | 103 PNG medidos (`OFFICE_ASSET_INVENTORY.md`) |
| Cena | 1852 × 849, fundo único `cenario-modular.png` (2,19 MB) montado de 88 peças |
| Personagens | 8 folhas, 24 quadros cada (6 × 4), em DOM ou canvas opcional |
| Telas com dados | 24 telas de mesa + 10 telões, todas com dado real ou apagadas sem dado |
| Desempenho | o `scene-canvas.js` mede FPS e p95 no navegador; **não medido nesta entrega**. Medição prevista na fase F7, no notebook, com e sem salas abertas |

## 2. O escritório hoje

- **Interface:** `public/office/` tem 26 módulos JS sem framework, cada um com um papel declarado no cabeçalho ("só apresentação", "sem capacidade de execução").
- **Arquivos servidos:** o servidor só entrega os da lista fixa em `src/application/office-assets.ts`, com `nosniff` e `no-cache`.
- **Movimento dos agentes:**
  - posição e sala vêm de `/agents`;
  - a caminhada até outro agente vem de mensagem gravada;
  - os passeios cosméticos são rotulados como pausa e não mudam estado (`life.js`).
- **Telas:**
  - `screens.js` e `desk-screens.js` desenham só o que a página recebeu;
  - sem fonte fresca, a tela diz isso em vez de mostrar um gráfico de mentira.
- **Navegação:**
  - menu lateral com 9 itens;
  - 3 áreas clicáveis na cena (Data Center, War Room, Análise de Mercado);
  - diálogos para agente, tela, gráfico, auditoria, sala, pesquisa e estudo.
- **Responsivo:**
  - pontos de quebra em 600, 640, 700, 760, 1050 e 1100 px;
  - movimento reduzido respeita `prefers-reduced-motion`;
  - a animação do canvas pausa com a aba oculta.
- **Fluxo de assets:** já existe (`docs/ASSETS_MODULARES.md`):
  - folhas geradas por imagem;
  - recorte por `scripts/assets/slice-sheet.ts` (com testes);
  - catálogo, escala e montagem em `scripts/assets/compor-cenario.html`.
  - O Escritório 2.0 usa o mesmo fluxo.

O que **já cumpre** o contrato do documento:
- não há telemetria inventada;
- UNKNOWN aparece como tela apagada;
- não há chave no cliente;
- toda imagem passa por uma lista fixa.

O que **falta**:
- as 5 visões novas: Anel, Horizonte, Comunicação, Diagnóstico e Laboratório;
- marcação `REAL`, `STATIC`, `SIMULATION` ou `UNKNOWN` por elemento;
- rota para o laboratório de estresse;
- deploy das fichas de decisão.

## 3. Entregáveis desta etapa

| Documento | Conteúdo |
|---|---|
| `docs/design/OFFICE_ASSET_INVENTORY.md` | 103 PNG com caminho, formato, dimensões, transparência, fração opaca, quadros, referências, uso e reuso |
| `docs/design/OFFICE_BACKEND_VISUAL_MAP.md` | cada elemento visual atual e novo → fonte no backend e classe (`REAL`, `STATIC`, `SIMULATION`, `UNKNOWN`), mais as lacunas que limitam o visual |
| `docs/design/OFFICE_VISUAL_SPEC.md` | arquitetura (cena única + salas sob demanda), zonas, salas, estilo, desempenho, responsivo e segurança |
| `docs/design/OFFICE_ASSET_REQUESTS.md` | **manifesto de produção:** 10 pedidos (3 P0, 6 P1, 1 P2) → 37 imagens finais |
| `docs/design/TRADINGLAB_OFFICE_2_VISUAL_HANDOFF.md`, `docs/research/atsmatrix-tradinglab-evolution.md` | cópias dos documentos-base do branch `research/atsmatrix-agent-architecture`, sem alteração, para as referências funcionarem nesta branch |

## 4. Fases propostas

Cada fase é um PR, sem merge automático e com testes.

| Fase | O que entra | Depende da arte? |
|---|---|---|
| F1 | Casca de sala: `room-view`, item "Salas" no menu, áreas clicáveis nas zonas, botão voltar, pausa da cena, carregamento sob demanda; marcação `data-truth` e teste contra `Math.random` nos módulos de sala | não (fundo de cor sólida marcado "placeholder de desenvolvimento") |
| F2 | Anel de Decisão com dados: 5 estágios a partir de `/paper/perpetual/pilot/receipts`, navegação entre decisões, VALIDATOR parcialmente `UNKNOWN`, resumo | não (fica melhor com P0) |
| F3 | Laboratório de Estresse com dados: rota do relatório (só leitura do último, ou execução autenticada e única), lâmpadas, placar, selo SIMULAÇÃO | não (fica melhor com P0) |
| F4 | Comunicação (grafo de `/agent-messages`) e Diagnóstico (ficha + paridade + prontidão) | não |
| F5 | Horizonte (reaproveita os gráficos da Análise de Mercado em tamanho de sala) | não |
| F6 | Integração da arte: recorte, medição dos retângulos de tela, lista de arquivos servidos, otimização | **sim** |
| F7 | Desempenho (FPS e p95 com cada sala, no notebook), responsivo, segurança, regressão visual manual | depois de F6 |
| F8 | Documentação final: cada visão → fonte no backend | — |

Pré-requisitos de backend fora deste trabalho:
- deploy aprovado das fichas (#84);
- passo 5 do mapa ATS-MATRIX (lacunas L1, L2, L5 e L6), só depois do piloto (≈ 11/10).

## 5. Ponto de parada

Conforme o documento, o trabalho visual que depende de arte para aqui. O próximo passo do dono:
1. pedir ao ChatGPT para ler `docs/design/OFFICE_ASSET_REQUESTS.md`;
2. o ChatGPT valida o manifesto, gera a arte e entrega no branch `assets/escritorio-2`.

**Pode continuar sem a arte:** F1 a F5 inteiras, com fundos de placeholder marcados como tal. A arte entra na F6 sem mudar a lógica.
