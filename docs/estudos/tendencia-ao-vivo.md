# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **12** em 2026-10-20T04:40:32.930Z (dia decidido 2026-10-19, negociou, atraso de 4.7 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9862.82 | -1.37% | -2.26% | 0.32 | BTCUSDT 0.0075942, ETHUSDT 0.25878, SOLUSDT 5.9507, XRPUSDT 477.96, ZECUSDT 0.54633 |
| DONCHIAN_55_20 | 9924.29 | -0.76% | -1.19% | 0.40 | BTCUSDT 0.0096966, ETHUSDT 0.32901, SOLUSDT 7.5023 |
| BENCH_5_MAIORES | 9869.75 | -1.30% | -2.14% | 0.32 | BTCUSDT 0.0076476, ETHUSDT 0.26020, SOLUSDT 5.9667, XRPUSDT 480.64, ZECUSDT 0.54672 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 22 | 10.0 | 0.2 | -20.2 | -10.0 | 0 |
| DONCHIAN_55_20 | 13 | 10.0 | 0.2 | -20.6 | -10.4 | 0 |
| BENCH_5_MAIORES | 26 | 10.0 | 0.2 | -17.7 | -7.5 | 0 |

Dias decididos: 11; dias perdidos por falta de rodada: 0; rodadas: 12.
