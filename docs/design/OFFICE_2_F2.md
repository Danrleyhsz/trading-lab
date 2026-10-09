# Escritório 2.0: fase F2 (Ring: Anel de decisão e Execução paper)

A zona **Ring** do `/office2/` passa a mostrar dados reais. As outras zonas seguem como na F1.

## Anel de decisão (subzona `ring-decisao`)

- **Fonte:** `GET /paper/perpetual/pilot/receipts?limit=24`, as fichas `DECISION_RECEIPT_V1` (#84).
- **Topo do painel:**
  - quantas decisões foram gravadas e a fração com ficha completa;
  - os desfechos e os motivos;
  - p50 e p95 do tempo entre o fechamento do candle e a decisão.
- **Navegação:** pelas 24 decisões mais recentes. A mesma decisão continua aberta quando os dados atualizam.
- **Estágios:**

| Estágio | Estado | Classe |
|---|---|---|
| Trader (Nova) | direção, candle, atraso desde o fechamento, posição antes (gravada ou reconstruída pelos fills), estudo | REAL |
| Risco (Sentinel) | aprovado, rejeitado (com motivo), "nenhuma ordem proposta" ou "resultado não gravado" | REAL |
| Validador | **bloqueio do ciclo** gravado pelo Sentinel (REAL) ou **"checagens não registradas"** (UNKNOWN, lacuna L6). Nunca aparece como aprovado sem registro. | REAL / UNKNOWN |
| Execução paper | fills com preço e atraso desde a decisão, ou "nada a executar" | REAL |
| Auditoria | desfecho da ficha e se ela está completa | REAL |

- **Rodapé:** o debate da equipe aparece como consultivo, o painel avisa que a ligação decisão → ordem é por janela de tempo (L1) e há um link para a ficha completa em JSON.
- **Tela `ring-anel`:** 5 blocos com a cor do estado de cada estágio da decisão aberta.

## Execução paper (subzona `ring-execucao`)

- **Fontes:**
  - `GET /paper/perpetual/accounts`, conta `evaluation:nova:usdm`;
  - `GET /audit/events?type=PAPER_FILL&accountId=…&limit=10&compact=1`.
- **Painel:**
  - selo "PAPER · dinheiro fictício";
  - equity e variação;
  - posição, taxas, funding e número de fills;
  - frescor da avaliação;
  - últimos fills gravados.
- **Tela `ring-execucao`:** curva horária da equity. Sem pontos horários, a tela fica apagada.

## Sem dado

Cada fonte mostra o motivo:
- "sem acesso";
- "rota ainda não publicada em produção (deploy pendente)", que é o caso das fichas até o deploy do #84;
- "sem conexão";
- HTTP com o código.

A tela correspondente fica apagada (UNKNOWN).

## Conferido

- **Prévia local** com as fichas calculadas pela função real do servidor sobre os eventos do piloto lidos da produção (só GET):
  - 41 decisões, 100% completas, p50 4,3 s e p95 29,3 s;
  - última decisão "fora do mercado / nada a fazer", validador UNKNOWN;
  - execução com equity de 999,89 USDT e os 2 fills de 04/10;
  - as duas telas acesas.
- **Testes:** `test/office2-ring.test.ts` gera as fichas com a mesma `decisionReceipts` do servidor e cobre:
  - entrada executada, rejeitada pelo risco, bloqueada pelo ciclo e sem ação;
  - o validador nunca aparece "aprovado" sem registro;
  - a conta paper;
  - as telas que só desenham com dado.
