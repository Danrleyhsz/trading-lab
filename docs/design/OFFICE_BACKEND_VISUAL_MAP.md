# Escritório 2.0: mapa backend → visual

Contrato do documento de handoff: todo estado visual é exatamente um destes quatro.

| Classe | Significado | Como aparece |
|---|---|---|
| `REAL` | derivado de evento ou estado do backend | normal |
| `STATIC` | ambiente decorativo, sem dado | normal, sem número |
| `SIMULATION` | resultado de simulação paper (laboratório de estresse, backtest) | selo "SIMULAÇÃO" + semente |
| `UNKNOWN` | sem observação atual (fonte velha, rota indisponível, dado não gravado) | tela apagada com "sem dado"; nunca um valor sorteado |

Regra de implementação: cada elemento novo carrega `data-truth="REAL|STATIC|SIMULATION|UNKNOWN"`, e um teste falha se um módulo de zona usar `Math.random` fora do movimento cosmético ou das janelas da cidade (fixas por semente).

No Escritório 2.0, cada módulo é uma **zona** da cena isométrica única (`office-scene-map.json`). Clicar numa zona dá foco 2× e abre o painel de dados (L7). As tabelas abaixo valem para as telas da zona (L4) e para o painel.

## 0. Zonas, telas e barra de cima

| Zona (`office-scene-map.json`) | Tela(s) | Painel | Classe |
|---|---|---|---|
| `horizon` | `horizon-a`, `horizon-b` | seção 3 | REAL |
| `nexus` | `nexus-grafo` | seção 4 | REAL |
| `ring` / `ring-decisao` | `ring-anel` | seção 2 | REAL (VALIDATOR em parte UNKNOWN) |
| `ring` / `ring-execucao` | `ring-execucao` | fills, posição e ordens da conta paper do piloto (`/paper/perpetual/accounts`, `/audit/events?type=PAPER_FILL`), com selo "PAPER" | REAL |
| `risk` | `risk-limites` | as 5 checagens de risco de hoje (`/finance`), kill switch (`/paper/perpetual/status` `halted`), motivos de `RISK_REJECTED`, limite de perda do piloto, exposição | REAL |
| `stress-lab` | `stress-placar` | seção 6 | SIMULATION |
| `backtest` | `backtest-estudos` | seção 7 | SIMULATION |
| `auditoria` | `auditoria-fichas` | fichas de decisão (`/paper/perpetual/pilot/receipts`) e eventos (`/audit/events`) | REAL |
| `diagnostico` | `diagnostico-linha` | seção 5 | REAL / UNKNOWN |
| `hall-marca`, `recepcao`, `elevadores` | — | visão geral: equity, P&L do dia, posições abertas, modo PAPER (`/finance`) | REAL |
| `convivencia`, `cozinha`, `cafe` | — | agentes em pausa cosmética (rotulada) | STATIC |
| `terraco-norte`, `varanda`, cidade (L0) | — | — | STATIC (o horário da cidade vem do relógio real) |
| Barra de cima | — | relógio do navegador; modo da sessão (`/auth/status`: autenticado ou só leitura); "Mercado 24/7" só com cotação fresca. **Sem "nível do trader"**: não existe no sistema. | REAL |
| Cartão "30º andar" | — | texto fixo | STATIC |

Base: `main` 224c430. As rotas `/paper/perpetual/pilot/receipts` (#84) e `npm run stress-lab` (#85) já estão na `main`, mas ainda **não foram para produção**: dependem de deploy aprovado.

## 1. Escritório atual (vista 3/4, segue no ar até a troca)

| Elemento | Classe | Fonte | Arquivo |
|---|---|---|---|
| Fundo da cena, cidade dia/entardecer/noite | `STATIC` (a cidade troca pelo relógio do navegador) | — | `cenario-modular.png`, `v3.css` |
| Posição de cada agente na mesa | `REAL` | `/agents` (sala e estado gravados) | `workstations.js`, `presence.js` |
| Caminhada até outro agente | `REAL` | mensagem gravada há poucos segundos em `/agent-messages` | `life.js` |
| Passeio cosmético (café, água) | `STATIC`, sempre rotulado como pausa | nenhuma; não muda estado, trabalho, experiência ou P&L | `life.js` |
| Balões de fala | `REAL` (última mensagem ≤ 2 h) ou rótulo cosmético | `/agent-messages` | `life.js`, `app.js` |
| 24 telas das mesas | `REAL` ou `UNKNOWN` (apagada sem dado fresco) | `/finance`, `/market/*`, Binance pública | `desk-screens.js` |
| Telões War Room (equity, posições, drawdown) | `REAL` | `/finance` | `screens.js` |
| Telões Análise de Mercado (book, footprint, liquidações, volume profile) | `REAL` | `/market/panorama` (WebSockets públicos da Binance) | `screens.js` |
| Telão da reunião (último briefing) | `REAL` | `/agent-messages` | `screens.js` |
| Quadro do Risk Desk (5 checagens) | `REAL` | `/finance` risk | `screens.js` |
| Telinha do Data Center (serviço) | `REAL` | `/runtime/readiness` | `screens.js` |
| Replay do dia | `REAL` (regravação de eventos com a hora original) | `/audit/events`, `/agent-messages` | `replay.js` |

## 2. Anel de Decisão: zona `ring-decisao` (TRADER → RISK → VALIDATOR → PAPER EXECUTION → AUDIT)

Fonte principal: `GET /paper/perpetual/pilot/receipts` (ficha de cada decisão, `DECISION_RECEIPT_V1`).

| Estágio | Classe | Campo da ficha / evento | O que o estágio mostra |
|---|---|---|---|
| TRADER (Nova) | `REAL` | `AUTONOMOUS_DECISION`: `proposal.direction`, `positionBefore`, `provenance.studyId`, `latencySeconds.closeToDecision` | direção, estudo, candle e atraso desde o fechamento |
| RISK (Sentinel) | `REAL` | `actions[].risk` (`approved`, `reasons`) | aprovado ou rejeitado, com o motivo codificado |
| VALIDATOR | `REAL` só para bloqueios gravados (`blocks[]`: `BACKUP_DATA`, proteção); `UNKNOWN` para as demais checagens | memória do Sentinel ligada à decisão | as 9 checagens do ciclo ainda **não são gravadas** (lacuna L6, passo 5 do mapa ATS-MATRIX). O estágio mostra "checagens não registradas" em vez de um "OK" inventado |
| PAPER EXECUTION | `REAL` | `actions[].fill`, `latencySeconds.decisionToFirstFill` | fill, preço, taxa e latência |
| AUDIT | `REAL` | `outcome`, `complete` | desfecho e link para `/paper/perpetual/pilot/receipts/:id` |

Resumo do anel (rodapé): `summary.completeFraction`, `byOutcome`, `reasons`, p50/p95 de latência. Tudo `REAL`.

A discordância do "validador" vem de duas fontes, e o rótulo diz qual é:
- **Debate da equipe (`DEBATE_V1`):** consultivo, rotulado "opinião da equipe, não veta".
- **Paridade do piloto (`/paper/perpetual/pilot/parity`):** rotulado "replay".

Pontos que ficam declarados no próprio visual:
- a ligação decisão ↔ ordem é por janela de tempo (L1);
- o estágio VALIDATOR fica parcialmente `UNKNOWN` até o passo 5;
- não existe validador que vete. O anel não pode sugerir que existe.

## 3. Horizon: zona `horizon`

| Elemento | Classe | Fonte |
|---|---|---|
| Símbolos, preço, variação 24 h, candles 1 h/1 min | `REAL` | `/market/v3`, `/market/chart`, `/market/latest` |
| Book (profundidade 20), footprint, liquidações 24 h, volume profile | `REAL` | `/market/panorama` |
| Funding e open interest | `REAL` | `/market/panorama`, `/paper/perpetual/status` |
| Funding e mark em outras corretoras | `REAL`, rotulado "referência, não alimenta o piloto" | `/market/venues` |
| Regime e tendência (Oracle), volatilidade (Vega) | `REAL` | contexto das mensagens `RESEARCH_FINDING` da hora (`/agent-messages`) |
| Evidência do sinal (estudo, configuração, último candle) | `REAL` | `/paper/perpetual/status`, ficha da decisão |
| Frescor de cada fonte | `REAL` | `receivedAt` de cada fonte; acima do limite vira `UNKNOWN` |
| "Baleias", arbitragem, fluxo de ordens além do footprint | **não mostrar**: não há fonte | — |

## 4. Nexus: zona `nexus`

| Elemento | Classe | Fonte |
|---|---|---|
| Nós de agentes (8) | `REAL` | `/agents` |
| Nós de serviço: feed de mercado, triagem de estudo, motor de risco, livro paper, auditoria, briefing | `STATIC` (os nós existem no código) | arquitetura |
| Arestas agente → agente | `REAL` | `/agent-messages` (`from`, `to`, `kind`, `createdAt`) |
| Arestas serviço → agente | `REAL` | eventos (`AUTONOMOUS_DECISION` → Nova, `RISK_*` → Sentinel) em `/audit/events` |
| Filtro por decisão | `REAL` | `context.decisionEventId` das mensagens |
| Limite | — | no máximo 14 nós e as 200 mensagens mais recentes |

## 5. Diagnóstico (Collision): zona `diagnostico`

| Elemento | Classe | Fonte |
|---|---|---|
| Linha do tempo da decisão escolhida | `REAL` | ficha da decisão + `/audit/events/:id` |
| Evidência (hashes, intervalo dos candles, estudo) | `REAL` | `provenance` da ficha |
| Paridade e reprodução | `REAL` | `/paper/perpetual/pilot/parity` |
| Erro e nova tentativa **atuais** do ciclo | `REAL` | `/paper/perpetual/status` (`error`, `lastAttemptFailed`, `nextAttemptAt`) |
| **Histórico** de falhas e novas tentativas | `UNKNOWN` | não gravado (lacuna L2); só a falha atual existe |
| Latência por estágio | `REAL` para fechamento → decisão → fill | a proposta, o risco e o fill são do mesmo commit, então a diferença entre eles não é mostrada como "latência" |
| Prontidão e fontes | `REAL` | `/runtime/readiness` |

## 6. Stress Lab: zona `stress-lab`

| Elemento | Classe | Fonte |
|---|---|---|
| Cenário, semente, janela | `SIMULATION` | relatório do `STRESS_LAB_V1` |
| Violações de invariante, kill switch, pior slippage, drawdown, recuperação, bloqueios de dado velho, expectativas | `SIMULATION` | `scenarios[].metrics`, `invariantViolations`, `expectations` |
| Agentes envolvidos | `SIMULATION` (Nova e Sentinel no ciclo, Atlas no briefing) | código do laboratório |
| Bancada animada | `SIMULATION`, só enquanto um relatório está aberto | — |
| Esteira, saco de pancada, halteres | `STATIC` (decoração da referência) | — |

**Backend que falta** (não existe hoje; fica para a implementação):
- uma rota só de leitura que devolva o último relatório; ou
- uma rota autenticada que rode o catálogo, uma execução por vez e com intervalo mínimo.

Qualquer das duas sem efeito fora da memória. Até lá, a zona pode ler um relatório JSON gerado por `npm run stress-lab`, sempre rotulado com a semente e o sha256.

## 7. Backtest: zona `backtest`

| Elemento | Classe | Fonte |
|---|---|---|
| Estudos, folds, robustez, proveniência | `SIMULATION` (histórico) | `/backtests/v2/studies`, `/research/jobs` |
| Triagem do estudo do piloto | `REAL` | `/paper/perpetual/status` (`eligible`, `reason`) |

## 8. Lacunas do backend que limitam o visual

| Lacuna | Efeito no visual | Quando fecha |
|---|---|---|
| L1: ordem ligada à decisão por janela de tempo | o anel avisa "ligação por horário" | passo 5 do mapa ATS-MATRIX, depois do piloto |
| L2: bloqueios do ciclo não viram evento | histórico de falhas fica `UNKNOWN` | passo 5 |
| L5: sem impressão digital por decisão | proveniência sem o commit do backend | passo 5 |
| L6: checagens não registradas | VALIDATOR parcialmente `UNKNOWN` | passo 5 |
| Fichas e laboratório não estão em produção | zonas mostram "rota indisponível" (`UNKNOWN`) | deploy aprovado |
| Sem rota para o laboratório de estresse | a zona lê um relatório gerado localmente | fase de implementação |
