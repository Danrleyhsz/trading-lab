# Tendência nas maiores, execução simulada · TENDENCIA_MAIORES_AO_VIVO_V1

Última rodada: **17** em 2026-10-25T04:31:49.354Z (dia decidido 2026-10-24, negociou, atraso de 4.5 h). Protocolo: `docs/PROTOCOLO_TENDENCIA_AO_VIVO.md`. Simulação com dados públicos; não há ordem real nem conta. Sem veredito de retorno: o objetivo é medir fill, custo e atraso.

Membros do universo (5 maiores por volume): BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT, ZECUSDT.

| Conta | Patrimônio (USDT) | Retorno | Queda atual | Escala | Posições |
|---|---|---|---|---|---|
| SMA100 | 9854.91 | -1.45% | -2.34% | 0.36 | BTCUSDT 0.0087791, ETHUSDT 0.30258, SOLUSDT 6.9811, XRPUSDT 545.72, ZECUSDT 0.58815 |
| DONCHIAN_55_20 | 9871.79 | -1.28% | -1.71% | 0.44 | BTCUSDT 0.010634, ETHUSDT 0.36355, SOLUSDT 8.3879 |
| BENCH_5_MAIORES | 9861.99 | -1.38% | -2.22% | 0.36 | BTCUSDT 0.0087854, ETHUSDT 0.30279, SOLUSDT 6.9862, XRPUSDT 546.11, ZECUSDT 0.58857 |

## Custo e atraso medidos (todas as ordens simuladas)

Referência da pesquisa: 15 bps por lado (taxa e slippage), com decisão e preço no fechamento do dia. Aqui o preço é o do livro na hora da rodada.

| Conta | Ordens | Taxa (bps) | Slippage do livro (bps) | Atraso até a execução (bps) | Total vs fechamento (bps) | Ordens não preenchidas por inteiro |
|---|---|---|---|---|---|---|
| SMA100 | 33 | 10.0 | 0.2 | -14.0 | -3.8 | 0 |
| DONCHIAN_55_20 | 22 | 10.0 | 0.2 | -8.8 | 1.4 | 0 |
| BENCH_5_MAIORES | 37 | 10.0 | 0.2 | -12.9 | -2.7 | 0 |

Dias decididos: 16; dias perdidos por falta de rodada: 0; rodadas: 17.
