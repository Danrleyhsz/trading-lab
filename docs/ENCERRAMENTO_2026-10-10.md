# Encerramento dos acompanhamentos e processos (10/10/2026)

Decisão do dono em 10/10/2026: **encerrar todos os acompanhamentos ao vivo e processos automáticos**, manter o escritório no ar, manter o backup diário, e recomeçar a busca por estratégia só com dados históricos. Este documento registra o que foi desligado e como religar cada item.

| Item | Estado | Como religar |
|---|---|---|
| Tarefa agendada `registrador-listagens-semanal` (registrador de listagens novas) | Desligada (e a sessão em curso foi interrompida) | Painel de tarefas agendadas, ou `update_scheduled_task enabled=true` |
| Tarefas `veredito-piloto-nova-verificar` e `veredito-piloto-nova-reserva` | Desligadas | Idem |
| Registrador de listagens (`scripts/estudos/listagens-ao-vivo.ts`, livro-razão `docs/estudos/listagens-ao-vivo-registro.json`) | Parado; livro-razão vazio (nenhum evento até 10/10) | Rodar o script sob demanda; o protocolo `LISTAGEM_HEDGE_LIVE_V1` continua válido |
| Acompanhamento ao vivo do momentum (`XSMOM_FORWARD_V1`, no servidor) | **Desligado por padrão**: o instantâneo mostra `DISABLED` / `CLOSED_BY_OWNER`. Último estado lido em produção: `docs/estudos/momentum-ao-vivo-encerrado-2026-10-10.json` (1 rebalanceamento, +0,14%, queda de 1,5%, 4,3 dias de 84; **sem veredito**) | Definir `FORWARD_MOMENTUM_ENABLED=true` no Render e reiniciar; recomeça do zero com os dados públicos |
| Acompanhamento da combinação carry + momentum (`scripts/estudos/combo.ts --forward`) | Nunca chegou a ser agendado; não será iniciado | Rodar o script sob demanda |
| Piloto da Nova (`BREAKOUT_480`, produção) | Parado pela política de selo de release: o deploy deste PR muda o código do servidor sem atualizar os selos `CONTINUOUS_RELEASE_*`, e o ciclo fica `RELEASE_NOT_APPROVED` (sem nenhuma operação aberta; havia 113 h de decisões "ficar fora"). O estudo também perde a elegibilidade por regra em 11/10 20:00 UTC | Atualizar `CONTINUOUS_RELEASE_COMMIT` (e depois `CONTINUOUS_RELEASE_BACKEND`) no Render, com estudo elegível |
| Vigia `pilot-alerts` (GitHub Actions, a cada 15 min) | Desligado | `gh workflow enable pilot-alerts.yml` |
| Vigia `production-monitor` (GitHub Actions, de hora em hora) | Desligado | `gh workflow enable production-monitor.yml` |
| Backup diário criptografado `production-backup` | **Mantido** | |
| Servidor no Render (escritório, feeds públicos de mercado, persistência) | **No ar** | |

PR #94 (rascunho) continua sem merge: depende do veredito do piloto e exige os dois selos.

## Decisões posteriores (10/10/2026)

- **Carry delta-neutro:** deixado de lado. Não será levado a Demo Trading nem a código no servidor.
- **Registrador de listagens:** encerrado. Continua desligado e só volta por pedido novo do dono (rodar `scripts/estudos/listagens-ao-vivo.ts` sob demanda; o protocolo `LISTAGEM_HEDGE_LIVE_V1` continua válido).
- **Tendência nas maiores:** única execução simulada ao vivo, com rodada diária no GitHub Actions (`docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`, Emenda 1), gravando só na branch `dados/tendencia-ao-vivo`.
