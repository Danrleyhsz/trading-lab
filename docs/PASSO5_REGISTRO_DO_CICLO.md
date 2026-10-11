# Passo 5: registro das checagens do ciclo (CYCLE_CHECKS_V1)

Passo 5 do mapa ATS-MATRIX (`docs/research/ATSMATRIX_MAPA_DE_LACUNAS.md`), lacunas **L1, L2, L5 e L6**.

**Nenhuma condição de decisão, risco ou execução mudou:** o ciclo só passa a gravar o que já checava. **Deploy só depois do fim do piloto atual** (cerca de 11/10), porque o código roda dentro do piloto.

## O que passa a ser gravado

| Lacuna | Antes | Agora |
|---|---|---|
| L1, ligação decisão → ordem | por janela de tempo | a ordem (e o fill, que copia a ordem) leva `decisionEventId`; a ficha liga pelo ID (`linkage: DECISION_ID`) |
| L2, bloqueios do ciclo | só memória do Sentinel | evento `AUTONOMOUS_ENTRY_CHECKED` com as checagens da entrada (`PRIMARY_DATA`, `PROTECTIONS`, `EQUITY_POSITIVE`), o desfecho (`ENTRY_SUBMITTED` / `ENTRY_BLOCKED`) e o motivo; a memória continua |
| L2, falhas do ciclo | só o erro atual no status | `AUTONOMOUS_ATTEMPT_FAILED` quando o ciclo entra em falha ou o motivo muda (uma falha repetida não inunda o log) e `AUTONOMOUS_ATTEMPT_RECOVERED` quando volta |
| L5, release por decisão | não gravada | `release: {codeCommit, backendFingerprint}` dentro de `AUTONOMOUS_DECISION` |
| L6, checagens da decisão | não gravadas | `checks` no evento de decisão: `STUDY_ELIGIBLE`, `PILOT_LOSS_LIMIT`, `NOT_HALTED`, `SOURCES_READY`, `DATASET_VALID`, `SIGNAL_FRESH` (com o atraso), `CANDLE_NOT_PROCESSED` |

As checagens da decisão estão sempre como `ok: true`, porque se alguma falhasse o ciclo não chegaria a decidir. O registro prova que elas foram feitas. O que pode falhar fica registrado nos eventos de entrada e de tentativa.

## Fichas de decisão: `DECISION_RECEIPT_V2`

- Cada ficha diz a ligação que usou: `DECISION_ID` nas decisões novas, `TIME_WINDOW` nas antigas.
- Uma ordem com ID de outra decisão nunca entra na ficha de uma decisão.
- As fichas trazem `checks`, `attempts` (falhas e recuperações na janela), `provenance.codeCommit` e `provenance.backendFingerprint`.
- Decisões gravadas antes do deploy continuam como eram: `checks: null`, release `null` e ligação por janela de tempo.

## Escritório 2.0

- **Anel de decisão:** o estágio Validador fica **REAL** quando a ficha traz as checagens ("7 de 7 checagens do ciclo passaram · entrada: 3 de 3"). O rodapé mostra a ligação por ID e a release. Fichas antigas seguem **UNKNOWN**.
- **Diagnóstico:** falhas e recuperações da janela entram na linha do tempo, e o histórico passa a ser REAL nas decisões novas.

## Testes

- `test/cycle-records.test.ts` (5):
  - checagens e release no evento de decisão;
  - ID na ordem, no fill e na checagem da entrada;
  - livro restaurável com o campo novo;
  - bloqueio por dado de reserva como evento;
  - falha repetida gera um evento só, e outra falha e a recuperação também geram;
  - ficha V2 com ligação por ID excluindo ordem de outra decisão;
  - auditoria aceitando os tipos novos.
- `test/office2-ring.test.ts`: validador REAL com checagens e UNKNOWN sem elas.
- Suíte completa: 417 testes, 416 passam, 1 pulado. A paridade do piloto e o relatório do laboratório de estresse (mesmo sha256) mostram que nenhuma decisão mudou.
