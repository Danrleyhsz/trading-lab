# Escritório 2.0: mapa backend → visual

Contrato do documento de handoff: todo estado visual é exatamente um destes quatro.

| Classe | Significado | Como aparece |
|---|---|---|
| `REAL` | derivado de evento ou estado do backend | normal |
| `STATIC` | ambiente decorativo, sem dado | normal, sem número |
| `SIMULATION` | resultado de simulação paper (laboratório de estresse, backtest) | selo "SIMULAÇÃO" + semente |
| `UNKNOWN` | sem observação atual (fonte velha, rota indisponível, dado não gravado) | tela apagada com "sem dado"; nunca um valor sorteado |

Regra de implementação: cada elemento novo carrega `data-truth="REAL|STATIC|SIMULATION|UNKNOWN"`, e um teste falha se um módulo de sala usar `Math.random` fora do movimento cosmético.

Base: `main` 224c430. As rotas `/paper/perpetual/pilot/receipts` (#84) e `npm run stress-lab` (#85) já estão na `main`, mas ainda **não foram para produção**: dependem de deploy aprovado.

## 1. Escritório principal (o que já existe, classificado)

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

## 2. Anel de Decisão (TRADER → RISK → VALIDATOR → PAPER EXECUTION → AUDIT)

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

## 3. Horizonte (sala de inteligência de mercado)

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

## 4. Comunicação (Nexus)

| Elemento | Classe | Fonte |
|---|---|---|
| Nós de agentes (8) | `REAL` | `/agents` |
| Nós de serviço: feed de mercado, triagem de estudo, motor de risco, livro paper, auditoria, briefing | `STATIC` (os nós existem no código) | arquitetura |
| Arestas agente → agente | `REAL` | `/agent-messages` (`from`, `to`, `kind`, `createdAt`) |
| Arestas serviço → agente | `REAL` | eventos (`AUTONOMOUS_DECISION` → Nova, `RISK_*` → Sentinel) em `/audit/events` |
| Filtro por decisão | `REAL` | `context.decisionEventId` das mensagens |
| Limite | — | no máximo 14 nós e as 200 mensagens mais recentes |

## 5. Diagnóstico (Collision)

| Elemento | Classe | Fonte |
|---|---|---|
| Linha do tempo da decisão escolhida | `REAL` | ficha da decisão + `/audit/events/:id` |
| Evidência (hashes, intervalo dos candles, estudo) | `REAL` | `provenance` da ficha |
| Paridade e reprodução | `REAL` | `/paper/perpetual/pilot/parity` |
| Erro e nova tentativa **atuais** do ciclo | `REAL` | `/paper/perpetual/status` (`error`, `lastAttemptFailed`, `nextAttemptAt`) |
| **Histórico** de falhas e novas tentativas | `UNKNOWN` | não gravado (lacuna L2); só a falha atual existe |
| Latência por estágio | `REAL` para fechamento → decisão → fill | a proposta, o risco e o fill são do mesmo commit, então a diferença entre eles não é mostrada como "latência" |
| Prontidão e fontes | `REAL` | `/runtime/readiness` |

## 6. Laboratório de estresse

| Elemento | Classe | Fonte |
|---|---|---|
| Cenário, semente, janela | `SIMULATION` | relatório do `STRESS_LAB_V1` |
| Violações de invariante, kill switch, pior slippage, drawdown, recuperação, bloqueios de dado velho, expectativas | `SIMULATION` | `scenarios[].metrics`, `invariantViolations`, `expectations` |
| Agentes envolvidos | `SIMULATION` (Nova e Sentinel no ciclo, Atlas no briefing) | código do laboratório |
| Bancada animada | `SIMULATION`, só enquanto um relatório está aberto | — |

**Backend que falta** (não existe hoje; fica para a implementação):
- uma rota só de leitura que devolva o último relatório; ou
- uma rota autenticada que rode o catálogo, uma execução por vez e com intervalo mínimo.

Qualquer das duas sem efeito fora da memória. Até lá, a sala pode ler um relatório JSON gerado por `npm run stress-lab`, sempre rotulado com a semente e o sha256.

## 7. Backtest Lab (dentro do Quant Lab)

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
| Fichas e laboratório não estão em produção | salas mostram "rota indisponível" (`UNKNOWN`) | deploy aprovado |
| Sem rota para o laboratório de estresse | sala lê um relatório gerado localmente | fase de implementação |
