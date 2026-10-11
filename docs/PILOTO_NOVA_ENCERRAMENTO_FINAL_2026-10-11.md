# Piloto da Nova: encerramento formal (11/10/2026)

Decisão do dono em 11/10/2026, tomada depois de ver o PR #94 e a lista de pendências. Este documento só registra o estado e o que a decisão significa. Não altera nenhuma regra do piloto (`docs/PILOT_EVALUATION_PROTOCOL.md`, `PILOT_EVALUATION_V1`) nem o que está no ar.

## Decisões

| Item | Decisão |
|---|---|
| Piloto da Nova (estudo `d674cb32`, BREAKOUT 480 h, BTCUSDT) | **Encerrado formalmente.** Veredito final: `INSUFFICIENT_EVIDENCE`. |
| Triagem do piloto 2 (`docs/PROTOCOLO_TRIAGEM_PILOTO_2.md`) | **Não será executada.** Não há segundo piloto. |
| Vigias `production-monitor` e `pilot-alerts` | **Seguem desligados** até haver um novo piloto. |
| PR #94 (registro das checagens do ciclo, `CYCLE_CHECKS_V1`) | **Integrado** na `main` em 11/10/2026 (merge `3ca8856`), a pedido do dono, sem esperar as 20:00 UTC, **sem deploy**. |

## Estado final do piloto

Números do último relatório lido em produção (09/10/2026 16:00 UTC), que são também os do momento da parada em 10/10/2026, quando o ciclo passou a `RELEASE_NOT_APPROVED` (ver `docs/ENCERRAMENTO_2026-10-10.md`):

| Item | Valor |
|---|---|
| Decisões | 113: 0 compra, 0 venda, 113 "ficar fora" |
| Execuções e operações encerradas | 0 e 0 |
| Resultado | 0 (patrimônio 999,89, igual ao do início) |
| Veredito | `INSUFFICIENT_EVIDENCE` (menos de 3 operações encerradas) |

- **Não foi um teste da estratégia.** O rompimento de 480 horas nunca disparou. O piloto mediu paciência, não vantagem (leitura já registrada em `docs/PILOTO_NOVA_CONCLUSAO_2026-10-09.md`).
- **Nada mais pode mudar o resultado.** O ciclo está parado pelo selo de release desde 10/10 e o estudo perde a elegibilidade por regra em 11/10 20:00 UTC; sem posição aberta, sem decisões novas.
- Este registro não leu a produção de novo: usa os números já documentados. Se um relatório final for gerado, ele é anexado, não substitui este texto.

## O que significa não rodar a triagem 2

- Nenhum estudo novo é criado em produção, e nenhum limiar, pedido ou candidato do protocolo muda. O protocolo continua declarado e válido se o dono pedir a triagem no futuro.
- Qualquer nova hipótese de estratégia precisa de protocolo próprio, declarado antes de rodar (regra já vigente).
- Consistente com o foco declarado em 10/10/2026: execução, risco e auditoria, em vez de novos sinais de preço.

## O que continua ligado

- Servidor no Render (escritório, feeds públicos de mercado, persistência) e backup diário (`production-backup`).
- Execução simulada da tendência nas maiores, com rodada diária no GitHub Actions (`docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`).

## Para religar um piloto no futuro

Só com estudo elegível e aprovação explícita do dono. Os selos `CONTINUOUS_RELEASE_COMMIT` e `CONTINUOUS_RELEASE_BACKEND` não foram atualizados e continuam apontando para releases antigos de propósito (o `backendFingerprint` mudou várias vezes desde 10/10). Os passos de deploy estão em `docs/PASSO5_REGISTRO_DO_CICLO.md` e em `docs/CONTINUOUS_PAPER_PILOT.md`.
