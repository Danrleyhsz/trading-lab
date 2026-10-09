# Escritório 2.0: fase F4 (Nexus, Diagnóstico, Auditoria e Risk)

Quatro zonas do `/office2/` passam a mostrar dados reais. Toda a lógica está em `public/office2/ops.js`.

| Zona | Fontes (GET) | Painel | Tela |
|---|---|---|---|
| **Nexus** | `/agent-messages` | grafo dos 8 agentes com as arestas das últimas 200 mensagens (espessura = quantidade), filtro "só a decisão aberta no Ring", ligações mais frequentes e mensagens recentes (consultivas marcadas) | grafo |
| **Diagnóstico** | ficha da decisão aberta no Ring, `/paper/perpetual/pilot/parity` (só com a zona aberta), `/runtime/readiness`, `/paper/perpetual/status` | linha do tempo da decisão; veredito de paridade dela; prontidão do serviço; erro atual do ciclo; **histórico de falhas UNKNOWN** (lacuna L2) | linha do tempo |
| **Auditoria** | fichas (`/paper/perpetual/pilot/receipts`), `/audit/events?limit=15&compact=1` | fichas completas sobre total; últimos eventos gravados; link para todos em JSON | barra de fichas completas |
| **Risk** | `/paper/perpetual/accounts`, `/paper/perpetual/status`, fichas, `/runtime/readiness` | kill switch; distância até o limite de perda do piloto, a perda do dia (5%) e o maior drawdown (10%); motivos de rejeição; se nova exposição está permitida | 3 barras + kill switch |

**Regras:**
- **Limites de risco:** os valores são os do motor de risco (`perpetual-risk.ts`). O teste confere o código-fonte para o painel não divergir.
- **Drawdown:** o "maior drawdown observado" é o máximo histórico da conta. O risco bloqueia pelo drawdown atual, e o painel diz isso.
- **Paridade:** só é buscada com o Diagnóstico aberto, porque o servidor baixa histórico. Ela é cacheada lá por 10 min e aqui no máximo a cada 2 min.

## Conferido na prévia local

Dados lidos da produção (só GET):
- **Nexus:** 200 mensagens e 16 ligações; Euler aparece apagado, porque não troca mensagens no piloto.
- **Diagnóstico:**
  - decisão das 15:00, 4,9 s após o fechamento;
  - paridade aprovada (44 decisões; esta com `DATA_DIFFERENCE`, ou seja, um candle gravado difere do histórico sem mudar a direção; execução `MATCH`);
  - serviço pronto, com a última falha de gravação às 09:06 UTC.
- **Auditoria:** 41 de 41 completas.
- **Risk:** kill switch desligado, perdas perto de 0% e nova exposição permitida.

## Testes

`test/office2-ops.test.ts` (4):
- arestas, filtro por decisão e nós apagados;
- linha do tempo em ordem, paridade da decisão e histórico sempre UNKNOWN;
- frações e distâncias de risco, com os limites conferidos no motor;
- telas só com dado.
