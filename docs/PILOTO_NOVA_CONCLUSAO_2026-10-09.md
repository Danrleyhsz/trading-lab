# Piloto da Nova: considerado concluído pelo dono em 09/10/2026

Decisão do dono, registrada em 09/10/2026: dar o piloto por concluído antes do fim da janela e partir para outras estratégias. Este documento só registra o estado e o que isso significa. Não altera nenhuma regra do piloto (`docs/PILOT_EVALUATION_PROTOCOL.md`, `PILOT_EVALUATION_V1`) nem o que está no ar.

## Estado lido em produção (09/10/2026, 16:00 UTC, relatório do piloto)

| Item | Valor |
|---|---|
| Janela | 04/10/2026 23:07 UTC a 09/10/2026 16:00 UTC (113 horas) |
| Decisões | 113: **0 compra, 0 venda, 113 ficar fora** |
| Execuções e operações encerradas | 0 e 0 |
| Resultado | 0 (patrimônio 999,89, igual ao do início) |
| Taxas e funding | 0 e 0 |
| Queda máxima observada | 0,011% |
| BTC no mesmo intervalo | −4,09% (cesta passiva na mesma exposição: −4,09 USDT) |
| Veredito provisório | `INSUFFICIENT_EVIDENCE` (menos de 3 operações encerradas) |

## Leitura honesta

- **Não foi um teste da estratégia.** O rompimento de 480 horas (20 dias) nunca disparou: o preço caiu em vez de renovar máxima. O piloto mediu paciência, não vantagem. Ficar fora enquanto o BTC caiu 4% **não é** desempenho a favor da estratégia: é só ausência de sinal.
- **É o resultado que o protocolo previa** (`INSUFFICIENT_EVIDENCE` "esperado para um rompimento de 480 horas em uma semana"). O próximo passo declarado é: **não estender automaticamente**; refazer a triagem com dados novos, incluindo os conjuntos de filtros do time, e abrir outro piloto só com um estudo elegível.
- Faltam cerca de 52 horas até o fim da janela. A chance de aparecer o terceiro, o segundo ou sequer um primeiro trade nelas é pequena; se aparecer um, o relatório final o inclui e este registro é atualizado, não reescrito.

## O que continua valendo, sem mexer em nada

- O ciclo para sozinho pela regra declarada: o estudo perde a elegibilidade por volta de 11/10/2026 20:00 UTC (idade da evidência de 7 dias). Se houver posição aberta nessa hora, ela é fechada pelo motor de risco; hoje não há nenhuma.
- Nada foi alterado em produção, e o selo de release continua o mesmo. Se o dono preferir encerrar o ciclo agora, é uma mudança de configuração em produção, que só é feita se pedida.
- O PR #94 (rascunho) segue esperando o veredito final, como combinado, porque mexe no backend.
- A triagem de estudos para o piloto seguinte (`docs/PROTOCOLO_TRIAGEM_PILOTO_2.md`) continua valendo. A Nova ou outro agente só entra em novo piloto com estudo elegível.
