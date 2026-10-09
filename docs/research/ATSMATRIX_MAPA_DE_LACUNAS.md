# ATS-MATRIX → TradingLab: auditoria e mapa de lacunas (fase 0)

Status: só auditoria. Nenhum código de produção foi alterado nesta entrega.
Data: 06/10/2026.
Base: `main` em c4b9d38, mais o documento `docs/research/atsmatrix-tradinglab-evolution.md` (branch `research/atsmatrix-agent-architecture`).
Linha de base dos testes nessa base: `npm test` com 371 testes, 370 passam, 1 pulado, 0 falhas.

O próprio documento pede como primeira entrega "audit + gap map only". As fases 1 a 5 não foram implementadas. A seção 5 propõe a ordem e o tamanho de cada uma.

## 1. Restrição que vale para tudo

O piloto da Nova (estudo d674cb32, BREAKOUT 480 h) roda até cerca de 11/10, e as regras dele não mudam no meio do piloto.

Qualquer mudança no ciclo autônomo, no livro paper ou no risco:
- muda o `backendFingerprint`;
- exige deploy aprovado.

Mesmo uma mudança que "só registra" também cai nessa regra. Por isso a proposta separa:
- **Projeções só de leitura:** podem entrar agora, porque leem eventos já gravados.
- **Mudanças no caminho de decisão:** ficam para depois do piloto, ou para um deploy aprovado.

## 2. O que já existe

| Conceito do documento | Já existe no TradingLab | Onde |
|---|---|---|
| Ciclo TRADER → RISK → EXECUTION → AUDIT | Sim. A Nova calcula o sinal (`AUTONOMOUS_DECISION`); o livro grava `TRADE_PROPOSED` → `RISK_APPROVED` ou `RISK_REJECTED` → `PAPER_ORDER_SUBMITTED` → `PAPER_FILL`. Tudo vai num único commit durável e só é publicado depois de salvo. | `src/application/autonomous-perpetual-cycle.ts`, `src/application/perpetual-paper-book.ts` (`order`, `commit`) |
| Risco determinístico | Sim, com motivos codificados. Base: `INVALID_ORDER`, `POSITION_LIMIT`, `LOSS_LIMIT`, `LEVERAGE_LIMIT`. Perpétuo: `STALE_MARKET`, `INSTRUMENT_MISMATCH`, `KILL_SWITCH`, `DRAWDOWN_LIMIT`, `DAILY_LOSS_LIMIT`, `INITIAL_MARGIN`. Reduzir posição é sempre permitido. | `src/domain/risk.ts`, `src/domain/perpetual-risk.ts` |
| Checagens antes de decidir (papel do VALIDATOR) | A maioria já existe, espalhada pelo ciclo (ver a lista abaixo). | `autonomous-perpetual-cycle.ts` |
| Proteção contra decisão repetida ou reexecutada | Sim. O cursor do candle é salvo **antes** da execução, e um candle já processado é recusado. Também são recusados fill duplicado no restore, mark fora de ordem e funding fora de ordem. | `perpetual-paper-book.ts` (`checkpoint`, construtor, `synchronize`) |
| Proveniência | Estudo: `StudyProvenance` (commit, impressão digital, hash da configuração, simulador). Decisão: `studyDatasetHash`, `signalDatasetHash` e o próprio conjunto de candles usado. Release: `backendFingerprint`. | `perpetual-studies.ts`, `release-fingerprint.ts` |
| Auditoria durável | `/audit/events` com paginação, filtros por tipo e conta, e modo compacto. Lê só o último snapshot confirmado. | `src/application/event-audit.ts` |
| "False acceptance discovered by replay" | Sim. A paridade do piloto refaz cada decisão de três jeitos: com os candles gravados, comparando dados e com o histórico. Também confere a execução (`MATCH`, `RISK_REJECTED`, `PILOT_STOPPED`, `PROTECTION_BLOCK`, `UNEXPLAINED`). | `src/application/pilot-parity.ts` (`/paper/perpetual/pilot/parity`) |
| Latência | Parcial. Existe só "fechamento do candle → decisão" (mínimo, mediana e máximo) na paridade. | `pilot-parity.ts` (`decisionLatency`) |
| Telemetria real | Parcial. Existem `/runtime/readiness`, `/paper/perpetual/pilot/report`, `/pilot/timeline`, `/agents/scorecard` e `/agent-messages`. Tudo é derivado de estado ou eventos reais; "desconhecido" aparece como `null` ou `n/a`. | vários `*-routes.ts` |
| Handoff entre agentes | Parcial. `AgentMessageBus` registra mensagens estruturadas (`from`, `to`, `kind`, `context`) com `decisionEventId`. Tipos: `RESEARCH_FINDING`, `DEBATE`, `EXECUTION_PLAN`, `RISK_REVIEW`. Os pesquisadores são **só consultivos** (`advisoryOnly: true`). | `pilot-team-briefing.ts`, `domain/agent-messages.ts` |
| Stress Lab | Parcial. O `team-drill` repete candles reais gravados hora a hora pelo ciclo de produção, só em memória, sem banco nem corretora. Vários testes cobrem cenários adversos isolados (ver a seção 3.3). | `src/team-drill.ts`, `test/perpetual-paper-book.test.ts`, `test/autonomous-perpetual.test.ts` |
| Segurança de acesso | `APP_ACCESS_TOKEN` (32 caracteres ou mais em produção), sessão HMAC `HttpOnly` + `SameSite=Strict`, token só leitura (GET/HEAD, sem WebSocket), checagem de origem em métodos de escrita e no `/events`, limite de 10 falhas por minuto no login. | `src/application/access-control.ts` |
| Chaves de corretora | Só por variável de ambiente; o cliente demo recusa qualquer host que não seja `demo-fapi.binance.com`, e erros nunca contêm a query assinada. Nenhuma chave no frontend: não há `localStorage` nem campo de chave em `public/`. | `src/infrastructure/binance-futures-demo.ts` |

Checagens que o ciclo já faz antes de abrir posição (o "validator" de hoje):
1. O estudo continua elegível (`screenPerpetualStudy`), verificado duas vezes: antes e depois de baixar os candles.
2. As fontes estão prontas: cotação fresca, funding reconciliado, persistência saudável e serviço admitido.
3. O conjunto de candles é válido: contínuo, alinhado, com OHLC coerente e funding em ordem (`validatePerpetualDataset`).
4. O último candle não está velho (`signal history stale` se tiver mais de 2 h).
5. O candle ainda não foi processado (cursor).
6. Os dados não são de reserva: com dados da Bybit, o piloto pode fechar, mas nunca abrir.
7. As proteções do estudo (`protectionsAllowEntry`) usam a mesma regra do backtest.
8. O risco é obrigatório em toda ordem, inclusive no fechamento.
9. O limite de perda do piloto (`PILOT_LOSS_LIMIT`) fecha a posição e aciona o kill switch.

## 3. Lacunas reais

### 3.1 Recibo de decisão (fase 1)

- **L1: a decisão e a ordem não estão ligadas por ID.**
  - `AUTONOMOUS_DECISION` tem `id`. A ordem tem `proposalId` aleatório e `strategyId`, mas não tem `decisionEventId`.
  - Hoje a paridade liga as duas por janela de tempo ("entre esta decisão e a próxima"). Funciona com uma decisão por hora, mas não é um vínculo explícito.
- **L2: bloqueios no nível do ciclo não viram evento.**
  - Dados de reserva e proteção do estudo ficam só como memória do Sentinel (`kind: DECISION`).
  - Histórico velho e falha de fonte viram exceção, com `error` no status e nova tentativa em 5 min. Nada fica no log de eventos.
  - Resultado: a métrica "stale-data rejection count" não pode ser contada de forma confiável hoje.
- **L3: não existe uma projeção "recibo" que junte tudo de uma decisão.** Hoje as partes estão espalhadas:
  - decisão, proposta, risco e fill;
  - memória do Sentinel;
  - mensagens da equipe;
  - veredito de paridade.
- **L4: a latência por estágio quase não tem informação.**
  - Proposta, risco e fill acontecem no mesmo commit em memória, então a diferença é de microssegundos e só serviria de enfeite.
  - A latência que importa é "fechamento → decisão → fill", e ela já pode ser calculada com `occurredAt`.
- **L5: o recibo não tem o commit/fingerprint do backend que decidiu.** O estudo tem; a decisão, não.

### 3.2 Validator (fase 2)

- **L6: as checagens existem, mas não são registradas como lista.** O recibo não consegue dizer "passou nas checagens 1 a 9", só que não houve erro. Falta registrar quais checagens rodaram e qual foi o resultado de cada uma.
- **L7: não há conferência entre corretoras antes de decidir.**
  - `CrossVenueMarket` coleta Bybit, OKX e Hyperliquid, mas por desenho "nunca alimenta sinal, risco ou execução".
  - Usar a divergência Binance × outras como bloqueio seria **uma regra nova do piloto**. Ela só pode entrar pré-declarada num próximo piloto, nunca no atual.
- **Não proponho criar um segundo "validador" paralelo ao risco.** O documento diz "prefer extending existing domain events/stores over creating parallel systems". Hoje o validador é o conjunto de checagens do ciclo mais o risco, e o que falta é registrá-las (L6), não duplicá-las.

### 3.3 Stress Lab (fase 3)

Cenários da lista do documento e cobertura atual:

| Cenário | Cobertura atual |
|---|---|
| Movimento brusco do BTC | Teste: a liquidação é aprovada pelo risco, com o custo de liquidação |
| Cotação velha / dados atrasados | Teste: o risco rejeita `STALE_MARKET`; a reconciliação é bloqueada |
| Funding pendente | Teste: sem fluxo de caixa inventado |
| Queda do provedor | Teste: a falha da fonte se recupera no mesmo candle, sem fill repetido |
| Reinício no meio da execução | Teste: o candle salvo não é reexecutado |
| Kill switch / drawdown | Teste: o halt impede exposição nova e permite reduzir |
| Escrita durável falhou | Teste: nada é exposto e as propostas seguintes são bloqueadas |
| Fill duplicado / atribuição falsa no restore | Teste |
| Candle faltando / snapshot malformado | Só no `validatePerpetualDataset` (lança erro); não há teste de ponta a ponta pelo ciclo |
| Spread alargado / slippage anormal | **Não coberto.** O broker paper preenche no bid/ask da cotação + 1 bp fixo de slippage (`PaperBroker`); não há cenário de spread extremo |
| Divergência Binance × Bybit | **Não coberto** (ver L7) |
| Sequência de stops / limite de perda do piloto | Parcial: `PILOT_LOSS_LIMIT` existe; não há cenário de perdas seguidas até o limite |
| Eventos duplicados ou fora de ordem | Parcial: mark fora de ordem e candle repetido são recusados; não há cenário reunido |

- **L8: os cenários existem como testes soltos.** Não há catálogo com semente, relatório legível por máquina nem placar (cenários tentados e sobrevividos, violações de invariante, bloqueios corretos).
- **L9: faltam três cenários.** Spread extremo, divergência entre corretoras e sequência de perdas até `PILOT_LOSS_LIMIT` passando pelo ciclo.

### 3.4 Telemetria (fase 4)

- **L10: não há agregado de contadores.** Faltam decisões, aceitas e rejeitadas por motivo, bloqueios de dados, falhas de provedor (`MARKET_DATA_FAILED` já existe como evento), kill switch, e p50/p95 de fechamento → decisão. Tudo pode ser uma projeção só de leitura sobre `EventAudit.list()`, sem estado novo.
- **L11: os contadores de bloqueio do ciclo dependem de L2.** Antes de L2, a telemetria precisa dizer "não medido" em vez de mostrar zero.

### 3.5 Segurança (seção 5 do documento)

- **L12: não há cabeçalhos de segurança globais.** Não há CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` nem HSTS. Só os arquivos do escritório recebem `X-Content-Type-Options: nosniff`. O documento pede reforçar isso antes de qualquer integração sensível.
- **L13: o limite de requisições existe só no login** (10 falhas por minuto, contador global por processo). Não há limite por rota de escrita. Para o uso atual, com um único dono e token, é aceitável; não é "production-grade" para várias contas.
- Atende ao documento hoje:
  - chaves só no servidor;
  - token só leitura sem WebSocket;
  - rotas de escrita com autenticação e origem;
  - fronteira paper/demo que falha fechada;
  - nenhum segredo nos erros.
- O documento fala em contas de corretora de usuários no futuro (vários donos). Isso **não existe** e não faz parte desta proposta.

### 3.6 O que não importar (confirmado)

O TradingLab já evita tudo da seção 3 do documento:
- não há telemetria inventada;
- não há chave no navegador;
- não há execução real.

A identidade pixel-art do escritório fica como está.

## 4. Conflitos com invariantes

- **Fases 1 e 2 dentro do caminho de decisão** (L1, L2, L5, L6): mudam código que o piloto executa. Isso não muda as decisões, mas muda os eventos gravados e a impressão digital. **Conflito com o piloto em andamento.** Solução: implementar e testar agora num PR, e só fazer o deploy depois do fim do piloto (cerca de 11/10) ou com aprovação explícita.
- **L7 (divergência como bloqueio):** é regra nova de entrada, então só entra pré-declarada num piloto novo.
- **Fase 5 (escritório):** o foco atual é desktop, e o documento pede telemetria real antes. Fica por último.

## 5. Sequência mínima proposta (uma PR por passo, sem merge automático)

| Passo | Lacunas | O que muda | Toca o piloto? | Tamanho |
|---|---|---|---|---|
| 1. Projeção do recibo | L3, L4 | `decisionReceipt(eventId)` só de leitura: junta decisão, proposta, risco e fill (por janela de tempo, como a paridade), memória do Sentinel, mensagens da equipe e veredito de paridade. Latência: fechamento → decisão → fill. Rota GET. Testes com decisão aceita, rejeitada pelo risco, bloqueada por proteção e com dados de reserva. | Não (só leitura) | Pequeno |
| 2. Stress Lab determinístico | L8, L9 | `src/stress-lab.ts` (script, como o `team-drill`): catálogo com semente, só em memória, relatório JSON com invariantes (nenhuma exposição nova com dado velho, halt ou reserva; reduzir sempre permitido; nenhum fill duplicado; caixa reconciliado). Inclui os três cenários faltantes. | Não (fora do servidor) | Médio |
| 3. Contadores de telemetria | L10, L11 | Projeção GET sobre os eventos, com "não medido" onde depende de L2. | Não (só leitura) | Pequeno |
| 4. Cabeçalhos de segurança | L12 | Hook com CSP compatível com o escritório (scripts e estilos próprios), `frame-ancestors 'none'`, `Referrer-Policy`, HSTS em produção. Testes nas rotas. | Muda o servidor, não a decisão | Pequeno |
| 5. Vínculo e registro no ciclo | L1, L2, L5, L6 | `decisionEventId` opcional na ordem. Eventos `AUTONOMOUS_ENTRY_BLOCKED` (reserva, proteção, histórico velho, falha de fonte). Fingerprint na decisão. Lista de checagens no evento de decisão. O recibo passa a usar o ID em vez da janela de tempo. | **Sim**: deploy só depois do piloto ou com aprovação | Médio |
| 6. Divergência entre corretoras | L7 | Pré-declarar como regra de um próximo piloto, com teste no Stress Lab primeiro. | Piloto novo | Pequeno |
| 7. Visualização no escritório | fase 5 | Só depois de 1, 3 e 5 estarem em produção. | Não | Médio |
| — | L13 | Limite por rota de escrita só se houver mais de um usuário. Fica registrado, sem implementação agora. | — | — |

Recomendação: começar pelos passos 1 e 2, que não tocam o piloto e respondem ao objetivo do documento ("correctness and observability, not appearance"). O passo 5 fica pronto em PR e entra no deploy junto com o fim do piloto.

## 6. Critérios de sucesso do documento × como medir aqui

| Critério | Como medir no TradingLab | Disponível |
|---|---|---|
| % de decisões com recibo completo | Recibos com decisão + desfecho (fill, rejeição ou bloqueio explicado) ÷ decisões | Passo 1 (janela de tempo) / passo 5 (por ID) |
| % rejeitadas por motivo válido | `RISK_REJECTED` por motivo + bloqueios do ciclo | Risco: hoje; ciclo: passo 5 |
| Discordância do validador | Discordância da equipe consultiva no `DEBATE_V1` (já gravada). Não existe validador que vete. | Hoje, como contexto |
| Aceitação falsa achada por replay | `pilot-parity`: `CODE_DIFFERENCE`, `HISTORY_DIFFERENCE`, `UNEXPLAINED` | Hoje |
| p50/p95 de latência | Fechamento → decisão (hoje: mínimo, mediana e máximo) | Passo 3 |
| Recuperação depois de falha injetada | Stress Lab | Passo 2 |
| Violações de invariante (meta zero) | Stress Lab + paridade | Passo 2 |
| Reprodutibilidade do stress | Mesma semente → mesmo hash do relatório | Passo 2 |
