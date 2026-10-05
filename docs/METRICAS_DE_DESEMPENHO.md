# Métricas de desempenho (estilo quantstats)

Item 5 da pesquisa de projetos abertos. Só a ideia do quantstats; implementação própria em
`src/domain/performance-metrics.ts`, sem dependência nova.

## Entrada

- Equity ao longo do tempo, agrupada por hora (último ponto de cada hora).
- Resultado líquido de cada operação encerrada (opcional).
- Horas com posição aberta (opcional, para o tempo no mercado).

## Métricas

| Métrica | Como é calculada |
|---|---|
| Retorno total | equity final ÷ inicial − 1 |
| Retorno anualizado | (1 + total) ^ (1 ano ÷ período) − 1 |
| Volatilidade anualizada | desvio dos retornos horários × √(24 × 365) |
| Sharpe | média ÷ desvio dos retornos horários × √(24 × 365), taxa livre de risco zero |
| Sortino | igual ao Sharpe, mas só com o desvio dos retornos negativos |
| Calmar | retorno anualizado ÷ maior drawdown |
| Maior drawdown | maior queda a partir de um topo, e quantas horas ficou abaixo dele |
| Tempo no mercado | horas com posição ÷ horas do período |
| Operações | quantidade, taxa de acerto, fator de lucro, média de ganho e de perda, melhor, pior e maior sequência de perdas |

## Regras de honestidade

- Menos de 3 horas de equity: métricas de retorno ficam `null`, com o motivo.
- Menos de 30 dias: aviso de que os valores anualizados são instáveis e servem só de referência.
- Sem operações perdedoras: fator de lucro indefinido (não vira "infinito").
- Nada é estimado ou preenchido quando falta dado.

## Onde aparece

- Relatório do piloto (`/paper/perpetual/pilot/report`): `metrics`, calculado desde o início do piloto.
- Robustez dos estudos (`/backtests/v2/studies/:id/robustness`): `metrics` calculado só nas janelas fora da
  amostra (OOS) do walk-forward, junto com Sharpe deflacionado e PBO (`ROBUSTEZ_DE_ESTUDOS.md`).
- No escritório: grade de métricas no relatório do piloto e na seção de robustez da Pesquisa.

Testes: `test/performance-metrics.test.ts`.
